# IAM & Cognito — Grocery Buddy

## 1. Principals vs Resources

| Entity | Principal? | Why |
|--------|-----------|-----|
| Lambda | Yes | Executes code, calls other services |
| AppSync | Yes | Invokes Lambda resolvers |
| DynamoDB | No | Receives requests, never initiates |
| Bedrock | No | Responds to calls, never initiates |

Test: Can it authenticate to AWS and take an action? Yes → principal. No → resource.

---

## 2. Cognito User Pool

**Purpose:** Sign-up, login, JWT issuance. No Identity Pool — client never calls AWS directly.

### Pool Configuration

| Setting | Value |
|---|---|
| Region | `us-east-1` |
| Required attributes | `email`, `name` |
| Email verification | Required (enables forgot-password flow) |
| Self-service sign-up | Enabled |

`name` maps to `displayName` in UserProfile. Lambda reads it from the JWT on first login
to populate the UserProfile row — client never sends it as a field.

### App Client

Mobile apps cannot securely store a client secret — any secret embedded in an app binary
can be extracted. The App Client must be configured as a **public client**:

| Setting | Value |
|---|---|
| Client secret | None (public client) |
| Auth flows enabled | `USER_SRP_AUTH`, `REFRESH_TOKEN_AUTH` |
| Auth flows disabled | `USER_PASSWORD_AUTH` (sends password in plaintext — never enable for mobile) |

`USER_SRP_AUTH` uses the Secure Remote Password protocol: the password is never sent over
the wire. It is the correct flow for mobile clients.

### Tokens

Cognito issues three tokens on successful authentication. Only two are used:

| Token | Used by | Expiry (default) | Purpose |
|---|---|---|---|
| **ID token** | AppSync (Authorization header) | 1 hour | Contains identity claims; what AppSync validates |
| **Refresh token** | Client only | 30 days | Silently renews ID token without re-login |
| Access token | Not used | 1 hour | Scope-based API access — not needed in this architecture |

**AppSync validates the ID token, not the Access token.** This is a common mistake.
The Access token contains OAuth scopes; the ID token contains the user's identity claims
that Lambda needs (`sub`, `email`, `name`).

### JWT Claims Lambda Reads

Lambda receives these from `event.identity` (injected by AppSync after JWT validation):

| Claim | Field in event.identity | Used for |
|---|---|---|
| `sub` | `event.identity.sub` | userId — PK for UserProfile, membership checks |
| `email` | `event.identity.claims.email` | Stored in UserProfile on first login |
| `name` | `event.identity.claims.name` | Stored as displayName in UserProfile on first login |

Lambda **never** accepts `userId` from the client request body. It is always derived
server-side from the validated JWT.

---

## 3. Client Auth (No Amplify)

CLAUDE.md prohibits Amplify. Use `amazon-cognito-identity-js` directly.

### Library

```
amazon-cognito-identity-js
```

### Sign-In Flow

```
1. Instantiate CognitoUserPool({ UserPoolId, ClientId })
2. Instantiate CognitoUser({ Username: email, Pool })
3. cognitoUser.authenticateUser(
     new AuthenticationDetails({ Username: email, Password }),
     { onSuccess: (session) => { ... }, onFailure: ... }
   )
   — Uses USER_SRP_AUTH internally — password never leaves device in plaintext
4. session.getIdToken().getJwtToken()   → store as ID token
   session.getRefreshToken().getToken() → store as refresh token
```

### Token Storage

Store both tokens in **Expo SecureStore** — not AsyncStorage (unencrypted).

```typescript
await SecureStore.setItemAsync('idToken', idToken);
await SecureStore.setItemAsync('refreshToken', refreshToken);
```

### Attaching Token to AppSync Requests

Every GraphQL request must include the ID token in the Authorization header:

```
Authorization: <ID token JWT>
```

Configure the AppSync client to read the token from SecureStore before each request.
Do not cache the token in memory across requests without expiry checking.

### Silent Token Refresh

ID tokens expire after 1 hour. Refresh silently before attaching to a request:

```typescript
// Pseudocode — check expiry, refresh if needed
const session = await cognitoUser.getSession();
if (session.isValid()) {
  return session.getIdToken().getJwtToken();
} else {
  const newSession = await refreshSession(refreshToken);
  return newSession.getIdToken().getJwtToken();
}
```

`refreshSession` calls Cognito's `REFRESH_TOKEN_AUTH` flow. If the refresh token has also
expired (>30 days), the user must log in again — route to the login screen.

---

## 4. AppSync Authorization Configuration

| Setting | Value |
|---|---|
| Default authorization mode | `AMAZON_COGNITO_USER_POOLS` |
| User Pool ID | (set in AppSync console at provisioning time) |
| AWS Region | `us-east-1` |
| Default action | `DENY` — unauthenticated requests are rejected before Lambda is invoked |

### How AppSync Validates the JWT

AppSync fetches the User Pool's **JWKS** (JSON Web Key Set) endpoint — a public URL
at `https://cognito-idp.us-east-1.amazonaws.com/<UserPoolId>/.well-known/jwks.json`.
No IAM permission is required for this step. AppSync validates:

1. Token signature (against JWKS public keys)
2. Token expiry (`exp` claim)
3. Issuer (`iss` = Cognito User Pool URL)

If any check fails → request rejected, Lambda never runs.

### What Lambda Receives

After AppSync validates the JWT, it injects the user identity into `event.identity`:

```json
{
  "sub": "<userId>",
  "issuer": "https://cognito-idp.us-east-1.amazonaws.com/<UserPoolId>",
  "claims": {
    "sub": "<userId>",
    "email": "user@example.com",
    "name": "Jane Smith"
  }
}
```

Lambda reads `event.identity.sub` as the authoritative userId. The AppSync role is used
**only** for invoking Lambda — it plays no role in JWT validation.

---

## 5. IAM Roles

### AppSync Role

- **Trust:** `appsync.amazonaws.com`
- **Permission:** `lambda:InvokeFunction` on `arn:aws:lambda:us-east-1:ACCOUNT:function:grocery-buddy-resolver`

### Lambda Execution Role

- **Trust:** `lambda.amazonaws.com`

**DynamoDB permissions:**

All 7 actions are required. Tracing every access pattern in data-model.md §1j and every
GraphQL mutation — missing any one will produce a runtime `AccessDeniedException`.

```
dynamodb:GetItem
dynamodb:PutItem
dynamodb:UpdateItem
dynamodb:DeleteItem
dynamodb:Query
dynamodb:BatchWriteItem
dynamodb:TransactWriteItems
```

Why each is needed:

| Action | Operations that require it |
|---|---|
| `GetItem` | Membership check (every household-scoped request), UserProfile get, single entity lookups |
| `PutItem` | Create Household, HouseholdMember, GroceryList, GroceryItem, ShoppingSession, SessionItem |
| `UpdateItem` | updateProfile, updateGroceryList, updateItem, toggleSessionItem, completeSession, set householdId |
| `DeleteItem` | deleteItem (single row), METADATA row on deleteGroceryList, SESSION row on deleteSession |
| `Query` | listGroceryLists, listShoppingSessions, all items for a list, all sessions, all session items |
| `BatchWriteItem` | Cascading deletes: deleteGroceryList → ITEM# rows, deleteSession → SITEM# rows |
| `TransactWriteItems` | createHousehold (3-write tx), joinHousehold (2-write tx) |

**Resource ARNs — both are required:**

```
arn:aws:dynamodb:us-east-1:ACCOUNT:table/grocery-buddy-table
arn:aws:dynamodb:us-east-1:ACCOUNT:table/grocery-buddy-table/index/inviteCode-index
```

The table ARN alone is insufficient. The GSI ARN is required for `joinHousehold` and
`regenerateInviteCode` — both query the `inviteCode-index` GSI. Omitting it causes
`AccessDeniedException` on GSI queries even when the table ARN is present.

**Bedrock:**

```
bedrock:InvokeModel
```

Resource: `arn:aws:bedrock:us-east-1::foundation-model/amazon.nova-lite-v1:0`

**CloudWatch Logs:**

```
logs:CreateLogGroup
logs:CreateLogStream
logs:PutLogEvents
```

Resource: `arn:aws:logs:us-east-1:ACCOUNT:*`

---

## 6. Trust Chain

```
Mobile App (React Native / Expo)
    │
    │  1. USER_SRP_AUTH (amazon-cognito-identity-js)
    ▼
Cognito User Pool
    │  Verifies credentials, issues ID token + refresh token
    │
    │  2. Client stores tokens in Expo SecureStore
    │     ID token expires: 1 hour
    │     Refresh token expires: 30 days
    │
    │  3. Client attaches ID token to every GraphQL request
    │     Authorization: <ID token JWT>
    ▼
AppSync
    │  4. Fetches JWKS from Cognito User Pool public endpoint (no IAM needed)
    │     Validates: signature, expiry, issuer
    │     Rejects unauthenticated / expired requests — Lambda never runs
    │
    │  5. Injects event.identity.sub (userId) into Lambda event
    │     Assumes AppSync IAM role → STS issues creds → invokes Lambda
    ▼
Lambda (grocery-buddy-resolver)
    │  6. Reads userId from event.identity.sub (never from client body)
    │     Checks household membership: GetItem(HOUSEHOLD#<id>, MEMBER#<userId>)
    │     Returns auth error if row not found
    │
    │  7. Executes operation under Lambda execution role
    ├──────────────────────────────────┐
    ▼                                  ▼
DynamoDB (grocery-buddy-table)    Bedrock Nova Lite
(resource — responds only)        (resource — responds only)


Token Refresh Path (silent, no user action):
Mobile App → REFRESH_TOKEN_AUTH → Cognito → new ID token → SecureStore
If refresh token expired (>30 days) → route to login screen
```

---

## 7. Policy Approach

Identity-based policies only (single AWS account, no public resources). Resource-based
policies are only needed for cross-account access or public S3 assets — neither applies here.

No customer-managed KMS keys needed for MVP. DynamoDB encryption at rest uses the
default AWS-owned key.
