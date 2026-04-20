# Data Model — Grocery Buddy

Source of truth for the DynamoDB table design, TypeScript types, GraphQL schema, and authorization rules.
All sections must stay in sync. If one changes, update the others.

---

## Table of Contents

1. [DynamoDB Table](#1-dynamodb-table)
2. [TypeScript Type Changes](#2-typescript-type-changes)
3. [GraphQL Schema](#3-graphql-schema)
4. [Authorization Rules](#4-authorization-rules)
5. [ID Format & Invite Code Generation](#5-id-format--invite-code-generation)
6. [Auth Flow](#6-auth-flow)

---

## 1. DynamoDB Table

**Table name:** `grocery-buddy-table`
**Region:** `us-east-1`
**Billing:** On-demand (PAY_PER_REQUEST)
**Primary key:** Composite — `PK` (partition key, String) + `SK` (sort key, String)

### 1a. Entity Map

| Entity | PK | SK | entityType |
|---|---|---|---|
| UserProfile | `USER#<userId>` | `PROFILE#<userId>` | `PROFILE` |
| Household | `HOUSEHOLD#<householdId>` | `METADATA` | `HOUSEHOLD` |
| HouseholdMember | `HOUSEHOLD#<householdId>` | `MEMBER#<userId>` | `MEMBER` |
| GroceryList | `HOUSEHOLD#<householdId>` | `LIST#<listId>` | `LIST` |
| GroceryItem | `HOUSEHOLD#<householdId>` | `ITEM#<listId>#<itemId>` | `ITEM` |
| ShoppingSession | `HOUSEHOLD#<householdId>` | `SESSION#<sessionId>` | `SESSION` |
| SessionItem | `HOUSEHOLD#<householdId>` | `SITEM#<sessionId>#<itemId>` | `SITEM` |

**Why `HOUSEHOLD#` as PK for lists/items/sessions:**
Lists are shared across all household members. All household-scoped data lives in the same
partition so any authenticated member can query it with a single key condition.
`UserProfile` stays `USER#`-scoped — it is personal, not shared.

---

### 1b. UserProfile

Created automatically on first login if it does not already exist (get-or-create in Lambda).
Populated from Cognito JWT claims — client never sends `userId` or `email` directly.

```
PK           String    USER#<userId>
SK           String    PROFILE#<userId>
entityType   String    "PROFILE"
userId       String    <userId>             — Cognito sub (UUID)
email        String    from Cognito JWT
displayName  String    from Cognito name attribute (set at sign-up)
householdId  String    nullable — null until Create/Join Household is completed
createdAt    String    ISO 8601
updatedAt    String    ISO 8601
```

---

### 1c. Household

```
PK           String    HOUSEHOLD#<householdId>
SK           String    METADATA
entityType   String    "HOUSEHOLD"
householdId  String    <householdId>
name         String    e.g. "Smith Family", "Roommates"
inviteCode   String    8-char alphanumeric, human-readable — see section 5
createdBy    String    <userId> of the member who created the household
createdAt    String    ISO 8601
```

---

### 1d. HouseholdMember

One row per user per household. Used by Lambda to verify membership and role
before any household-scoped operation. See section 4 for enforcement rules.

```
PK           String    HOUSEHOLD#<householdId>
SK           String    MEMBER#<userId>
entityType   String    "MEMBER"
userId       String    <userId>
role         String    "OWNER" | "MEMBER"
joinedAt     String    ISO 8601
```

---

### 1e. GroceryList

```
PK           String    HOUSEHOLD#<householdId>
SK           String    LIST#<listId>
entityType   String    "LIST"
id           String    <listId>             — bare UUID, no prefix
householdId  String    <householdId>
name         String    e.g. "Weekly Groceries"
store        String    e.g. "Costco"
createdAt    String    ISO 8601
updatedAt    String    ISO 8601
```

---

### 1f. GroceryItem

Stored as separate rows so individual items can be added, updated, or deleted
without rewriting the entire list object. See section 1k for cascading delete requirement.

```
PK           String    HOUSEHOLD#<householdId>
SK           String    ITEM#<listId>#<itemId>
entityType   String    "ITEM"
id           String    <itemId>
listId       String    <listId>
householdId  String    <householdId>
name         String    lowercase, singular — normalized by voice parser or client
quantity     Number    nullable
unit         String    nullable — canonical: "lb", "oz", "gal", "pack", etc.
category     String    nullable — "produce", "dairy", "meat", "pantry", etc.
notes        String    nullable — brands, descriptors, parser corrections
createdAt    String    ISO 8601
updatedAt    String    ISO 8601
```

---

### 1g. ShoppingSession

```
PK           String    HOUSEHOLD#<householdId>
SK           String    SESSION#<sessionId>
entityType   String    "SESSION"
id           String    <sessionId>
householdId  String    <householdId>
listId       String    <listId>             — the blueprint this was snapshotted from
createdAt    String    ISO 8601
completedAt  String    ISO 8601 | null      — null means in-progress
```

---

### 1h. SessionItem

Stored as separate rows for the same reason as GroceryItem.

The most frequent operation during a shopping trip is `toggleSessionItem`. With separate
rows this is one `UpdateItem` (`SET completed = :val`) on the exact row. Embedding items
in the session would require a read-modify-write cycle on the highest-frequency path
because DynamoDB list updates require a positional index, not a field value lookup.

```
PK           String    HOUSEHOLD#<householdId>
SK           String    SITEM#<sessionId>#<itemId>
entityType   String    "SITEM"
itemId       String    <itemId>             — references GroceryItem.id or "manual-<id>"
sessionId    String    <sessionId>
householdId  String    <householdId>
name         String    snapshot at session creation time
quantity     Number    nullable — snapshot
unit         String    nullable — snapshot
category     String    nullable — snapshot
completed    Boolean   whether picked up on this trip
```

---

### 1i. Global Secondary Index (GSI)

**GSI name:** `inviteCode-index`
**GSI PK:** `inviteCode` (String)
**Projection:** ALL

Purpose: allows Lambda to look up a Household by its invite code when a user calls
`joinHousehold(inviteCode)`. Without this, joining would require a full table scan.

No other GSIs are needed — all other access patterns are covered by the composite
key structure.

---

### 1j. Access Patterns

| Pattern | Operation | Key Condition |
|---|---|---|
| Get user profile | GetItem | `PK = USER#<userId>`, `SK = PROFILE#<userId>` |
| Get household metadata | GetItem | `PK = HOUSEHOLD#<householdId>`, `SK = METADATA` |
| Get household by invite code | GSI Query | `inviteCode = <code>` |
| All members of a household | Query | `PK = HOUSEHOLD#<householdId>`, SK `begins_with MEMBER#` |
| Check if user is a member | GetItem | `PK = HOUSEHOLD#<householdId>`, `SK = MEMBER#<userId>` |
| All lists in a household | Query | `PK = HOUSEHOLD#<householdId>`, SK `begins_with LIST#` |
| Single list | GetItem | `PK = HOUSEHOLD#<householdId>`, `SK = LIST#<listId>` |
| All items for a list | Query | `PK = HOUSEHOLD#<householdId>`, SK `begins_with ITEM#<listId>#` |
| Single item | GetItem | `PK = HOUSEHOLD#<householdId>`, `SK = ITEM#<listId>#<itemId>` |
| All sessions in a household | Query | `PK = HOUSEHOLD#<householdId>`, SK `begins_with SESSION#` |
| Single session | GetItem | `PK = HOUSEHOLD#<householdId>`, `SK = SESSION#<sessionId>` |
| All items in a session | Query | `PK = HOUSEHOLD#<householdId>`, SK `begins_with SITEM#<sessionId>#` |
| Single session item | GetItem | `PK = HOUSEHOLD#<householdId>`, `SK = SITEM#<sessionId>#<itemId>` |

---

### 1k. Transaction Requirements

Two operations write to multiple entities that must succeed or fail atomically.
Use DynamoDB `TransactWriteItems` for both.

**`createHousehold`** — three writes in one transaction:
1. `PutItem` — Household METADATA row
2. `PutItem` — HouseholdMember row (role: OWNER)
3. `UpdateItem` — UserProfile: set `householdId` with `ConditionExpression: attribute_not_exists(householdId) OR householdId = :null`

The condition on write 3 prevents a retry or double-tap from creating a second household and silently overwriting `UserProfile.householdId`. If the condition fails, the transaction rolls back and the handler returns an error. Without this guard, the user ends up pointing to a new empty household while all previously-created lists remain orphaned under the original `HOUSEHOLD#` partition.

**`joinHousehold`** — two writes in one transaction:
1. `PutItem` — HouseholdMember row (role: MEMBER)
2. `UpdateItem` — UserProfile: set `householdId`

If implemented as separate writes instead of a transaction, a partial failure leaves
the UserProfile and HouseholdMember rows inconsistent — the user appears to belong
to a household that cannot find them as a member.

---

### 1l. Cascading Delete Requirements

DynamoDB has no cascading deletes. Lambda must handle these explicitly using
`BatchWriteItem` after querying the dependent rows.

**`deleteGroceryList(listId)`:**
1. Query all `ITEM#<listId>#` rows → `BatchWriteItem` to delete (25-item chunks)
2. Query all `SESSION#` rows under `HOUSEHOLD#<householdId>` (begins_with `SESSION#`) → filter by `listId` attribute in Lambda → for each matching session:
   a. Query all `SITEM#<sessionId>#` rows → `BatchWriteItem` to delete (25-item chunks)
   b. `DeleteItem` the `SESSION#<sessionId>` row
3. Delete the `LIST#<listId>` row

**Note on step 2:** No `listId-index` GSI exists on sessions. Lambda must query all sessions in the household partition and filter by `listId` in application code. This is a full-partition scan for sessions. Acceptable at MVP scale (households have few sessions). A `listId-index` GSI would be required at scale.

**`deleteSession(sessionId)`:**
1. Query all `SITEM#<sessionId>#` rows → `BatchWriteItem` to delete (25-item chunks)
2. Delete the `SESSION#<sessionId>` row

Skipping step 1 in any of the above cases leaves orphaned rows that are never cleaned up,
wasting storage and potentially leaking data if IDs are ever reused.

---

## 2. TypeScript Type Changes (`lib/types.ts`)

### New types to add

```typescript
export interface UserProfile {
  userId: string;
  email: string;
  displayName: string;
  householdId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Household {
  id: string;
  name: string;
  inviteCode: string;
  createdBy: string;
  members: HouseholdMember[];
  createdAt: string;
}

export interface HouseholdMember {
  userId: string;
  displayName: string;
  role: 'OWNER' | 'MEMBER';
  joinedAt: string;
}
```

### GroceryItem — changes from current

| Field | Before | After | Reason |
|---|---|---|---|
| `quantity` | `string \| undefined` | `number \| null` | Voice parser outputs `number \| null`; aligns with DynamoDB Number type |
| `unit` | — missing | `string \| null` | Voice parser outputs unit; needed for display and storage |
| `notes` | — missing | `string \| null` | Voice parser outputs notes (brands, descriptors) |
| `updatedAt` | — missing | `string` | Items are editable; need to track last modified time |
| `price` | `number \| undefined` | removed | Not used anywhere in the codebase |
| `addedBy` | `string \| undefined` | removed | Not used anywhere in the codebase |

### SessionItem — changes from current

| Field | Before | After | Reason |
|---|---|---|---|
| `quantity` | `string \| undefined` | `number \| null` | Snapshot of GroceryItem.quantity; must match |
| `unit` | — missing | `string \| null` | Snapshot of GroceryItem.unit |

### No changes to

- `GroceryList` — shape is correct; `items` array is removed at the DynamoDB layer
  (items are queried separately) but the TypeScript type keeps it for the client's
  assembled in-memory view
- `ShoppingSession` — shape is correct
- `Store` — not stored in DynamoDB (client-side constant list)

---

## 3. GraphQL Schema

```graphql
# ─────────────────────────────────────────────
# AUTH
# Default auth mode: AMAZON_COGNITO_USER_POOLS
# All operations require a valid Cognito JWT.
# Unauthenticated requests are rejected by AppSync before Lambda is invoked.
# Lambda additionally enforces household membership and role. See section 4.
# ─────────────────────────────────────────────

# ─────────────────────────────────────────────
# ENUMS
# ─────────────────────────────────────────────

enum HouseholdRole {
  OWNER
  MEMBER
}

enum VoiceIntent {
  ADD_ITEM
  REMOVE_ITEM
  CHECK_OFF
  UNCHECK
  CREATE_SPACE
}

# ─────────────────────────────────────────────
# TYPES
# ─────────────────────────────────────────────

type UserProfile {
  userId: ID!
  email: String!
  displayName: String!
  householdId: ID            # null until user creates or joins a household
  createdAt: AWSDateTime!
  updatedAt: AWSDateTime!
}

type Household {
  id: ID!
  name: String!
  inviteCode: String!        # 8-char human-readable code — see section 5
  createdBy: ID!
  members: [HouseholdMember!]!
  createdAt: AWSDateTime!
}

type HouseholdMember {
  userId: ID!
  displayName: String!
  role: HouseholdRole!
  joinedAt: AWSDateTime!
}

type GroceryList {
  id: ID!
  householdId: ID!
  name: String!
  store: String!
  items: [GroceryItem!]!    # assembled by Lambda from separate DynamoDB ITEM# rows
  createdAt: AWSDateTime!
  updatedAt: AWSDateTime!
}

type GroceryItem {
  id: ID!
  listId: ID!
  name: String!
  quantity: Float
  unit: String
  category: String
  notes: String
  createdAt: AWSDateTime!
  updatedAt: AWSDateTime!
}

type ShoppingSession {
  id: ID!
  householdId: ID!
  listId: ID!
  items: [SessionItem!]!    # assembled by Lambda from separate DynamoDB SITEM# rows
  createdAt: AWSDateTime!
  completedAt: AWSDateTime
}

type SessionItem {
  itemId: ID!
  name: String!
  quantity: Float
  unit: String
  category: String
  completed: Boolean!
}

# Returned by parseVoiceIntent.
# Lambda executes the parsed actions against DynamoDB and returns the affected
# state so the client can update without a follow-up re-fetch.
type VoiceParseResult {
  actions: [VoiceAction!]!        # parsed actions from Bedrock (for client logging)
  updatedList: GroceryList        # set if ADD_ITEM / REMOVE_ITEM ran on a list
  updatedSession: ShoppingSession # set if any intent ran on an active session
  createdList: GroceryList        # set if CREATE_SPACE created a new list
}

type VoiceAction {
  intent: VoiceIntent!
  items: [VoiceActionItem!]!
  space: String
}

type VoiceActionItem {
  name: String!
  quantity: Float
  unit: String
  notes: String
  categoryHint: String
}

# Returned by delete mutations so AppSync subscriptions can filter by householdId.
# AppSync requires subscription return type = mutation return type exactly.
# A scalar (ID!) has no fields to filter on — subscriptions cannot filter by householdId
# if the mutation returns ID!. Confirmed: AWS AppSync developer docs.
type DeletedEntity {
  id: ID!
  householdId: ID!
}

# ─────────────────────────────────────────────
# INPUTS
# ─────────────────────────────────────────────

input AddItemInput {
  name: String!
  quantity: Float
  unit: String
  category: String
  notes: String
}

input UpdateItemInput {
  name: String
  quantity: Float
  unit: String
  category: String
  notes: String
}

# ─────────────────────────────────────────────
# QUERIES
# ─────────────────────────────────────────────

type Query {
  # Returns the authenticated user's profile.
  # Lambda performs get-or-create: if no profile exists, one is written from JWT claims.
  getMe: UserProfile

  # Returns the authenticated user's household with all members.
  # Null if the user has not yet created or joined a household.
  getMyHousehold: Household

  # Returns all lists in the user's household, each with items assembled.
  listGroceryLists: [GroceryList!]!

  # Returns a single list by ID. Null if not found or user is not a household member.
  getGroceryList(id: ID!): GroceryList

  # Returns all sessions in the user's household (active + completed).
  listShoppingSessions: [ShoppingSession!]!

  # Returns a single session by ID. Null if not found or user is not a household member.
  getShoppingSession(id: ID!): ShoppingSession
}

# ─────────────────────────────────────────────
# MUTATIONS
# ─────────────────────────────────────────────

type Mutation {
  # ── Profile ────────────────────────────────

  updateProfile(displayName: String!): UserProfile!

  # ── Household ──────────────────────────────

  # Creates a new household and sets the caller as OWNER.
  # Uses TransactWriteItems: Household row + HouseholdMember row + UserProfile.householdId.
  createHousehold(name: String!): Household!

  # Joins an existing household by invite code.
  # Uses TransactWriteItems: HouseholdMember row + UserProfile.householdId.
  joinHousehold(inviteCode: String!): Household!

  # Generates a new invite code for the household. OWNER only.
  regenerateInviteCode: Household!

  # ── List CRUD ──────────────────────────────

  createGroceryList(name: String!, store: String!): GroceryList!
  updateGroceryList(id: ID!, name: String, store: String): GroceryList!

  # Deletes the list, all its GroceryItem rows, and all Sessions + SessionItems for this list.
  # Returns DeletedEntity (not ID!) so the onListDeleted subscription can filter by householdId.
  # See section 1l for full cascade requirements.
  deleteGroceryList(id: ID!): DeletedEntity!

  # ── Item CRUD ──────────────────────────────

  addItem(listId: ID!, input: AddItemInput!): GroceryItem!
  updateItem(listId: ID!, itemId: ID!, input: UpdateItemInput!): GroceryItem!
  deleteItem(listId: ID!, itemId: ID!): ID!

  # ── Shopping Session ───────────────────────

  # Snapshots the list's current items into a new session as separate SITEM# rows.
  startShoppingSession(listId: ID!): ShoppingSession!

  # Flips one session item's completed state. Single UpdateItem — no read required.
  toggleSessionItem(sessionId: ID!, itemId: ID!): SessionItem!

  # Adds a manually-entered item to an in-progress session. Blueprint list untouched.
  addItemToSession(sessionId: ID!, input: AddItemInput!): SessionItem!

  # Syncs newly-added blueprint items into an active session.
  # Lambda diffs ITEM# rows against SITEM# rows and writes any missing ones.
  resyncSession(sessionId: ID!): ShoppingSession!

  # Stamps completedAt on the session.
  completeSession(sessionId: ID!): ShoppingSession!

  # Deletes the session and all its SessionItem rows (BatchWriteItem). See section 1l.
  # Returns DeletedEntity (not ID!) so the onSessionDeleted subscription can filter by householdId.
  deleteSession(sessionId: ID!): DeletedEntity!

  # ── Voice ──────────────────────────────────

  # Sends a raw transcript to Lambda → Bedrock Nova Lite → DynamoDB.
  # listId: provide when operating on a blueprint list.
  # sessionId: provide when operating during an active shopping session.
  # At least one must be provided — Lambda validates and returns an error if neither is.
  parseVoiceIntent(
    transcript: String!
    listId: ID
    sessionId: ID
  ): VoiceParseResult!
}

# ─────────────────────────────────────────────
# SUBSCRIPTIONS
# ─────────────────────────────────────────────
# AppSync subscriptions enable real-time sync across household members —
# the primary reason AppSync was chosen over API Gateway (see CLAUDE.md).

type Subscription {
  # Fires when any list in the household is created or updated.
  # Delete events use onListDeleted — they cannot share this subscription because
  # AppSync requires subscription return type to exactly match mutation return type,
  # and deleteGroceryList returns DeletedEntity, not GroceryList. (AWS AppSync docs confirmed.)
  onListUpdated(householdId: ID!): GroceryList
    @aws_subscribe(mutations: ["createGroceryList", "updateGroceryList"])

  # Fires when a list is deleted. Client removes the list by id from local state.
  onListDeleted(householdId: ID!): DeletedEntity
    @aws_subscribe(mutations: ["deleteGroceryList"])

  # Fires when a session item is toggled or added.
  # Enables real-time shared shopping — two members see each other's checkoffs live.
  onSessionItemToggled(sessionId: ID!): ShoppingSession
    @aws_subscribe(mutations: ["toggleSessionItem", "addItemToSession"])

  # Fires when a session is deleted. Client removes the session from local state.
  onSessionDeleted(householdId: ID!): DeletedEntity
    @aws_subscribe(mutations: ["deleteSession"])
}
```

---

## 4. Authorization Rules

### Layer 1 — AppSync (JWT Validation)

AppSync is configured with `AMAZON_COGNITO_USER_POOLS` as the default auth mode.
Every request must carry a valid, unexpired Cognito JWT in the `Authorization` header.
Requests without a valid token are rejected at the AppSync layer — Lambda is never invoked.

AppSync validates: token signature, expiry, and issuer (Cognito User Pool URL).
AppSync does NOT validate whether the user owns the resource — that is Lambda's job.

### Layer 2 — Lambda (Ownership & Membership Enforcement)

Lambda extracts `userId` from `event.identity.sub` (injected by AppSync from the JWT).
The client never sends `userId` — it is always derived server-side.

**For user-scoped operations** (`getMe`, `updateProfile`):
Lambda uses `userId` directly as the DynamoDB PK (`USER#<userId>`). No additional check needed.

**For household-scoped operations** (all list/item/session reads and writes):
Lambda must perform a membership check before every operation:
```
GetItem(PK = HOUSEHOLD#<householdId>, SK = MEMBER#<userId>)
```
If the item does not exist → return authorization error. Do not proceed.
This ensures a user cannot access another household's data by guessing IDs.

Lambda derives `householdId` by reading `UserProfile.householdId` — it is never
accepted from the client.

### Layer 3 — Role Enforcement (OWNER vs MEMBER)

| Operation | Required Role |
|---|---|
| `createGroceryList` | MEMBER or OWNER |
| `updateGroceryList` | MEMBER or OWNER |
| `deleteGroceryList` | MEMBER or OWNER |
| `addItem` / `updateItem` / `deleteItem` | MEMBER or OWNER |
| `startShoppingSession` | MEMBER or OWNER |
| `toggleSessionItem` / `addItemToSession` | MEMBER or OWNER |
| `completeSession` / `deleteSession` | MEMBER or OWNER |
| `parseVoiceIntent` | MEMBER or OWNER |
| `regenerateInviteCode` | **OWNER only** |
| `updateProfile` | self only (no role required) |

Lambda reads the `role` field from the `HouseholdMember` row retrieved during the
membership check — no extra read is needed since the check already fetches the row.

---

## 5. ID Format & Invite Code Generation

### Entity IDs

All entity IDs (`listId`, `itemId`, `sessionId`, `householdId`) are bare UUIDs (v4).
The `USER#` / `HOUSEHOLD#` / `LIST#` / `ITEM#` / `SESSION#` / `SITEM#` prefixes
exist only in `PK` and `SK` to enable single-table key conditions. They are never
surfaced to the client.

`userId` is the Cognito `sub` (UUID), set by Cognito at sign-up. Lambda reads it
from the JWT — never from the client request body.

### Invite Code Generation

Invite codes are 8 characters, drawn from an unambiguous alphabet:
```
ABCDEFGHJKLMNPQRSTUVWXYZ23456789
```
Excluded characters: `0` (vs `O`), `1` (vs `I` and `l`), `O`, `I` — to avoid
transcription errors when codes are read aloud or hand-typed.

This gives 32^8 ≈ 1.1 trillion combinations. Collision probability is negligible
but Lambda handles it:

1. Generate candidate code
2. Query `inviteCode-index` GSI for the code
3. If a match exists → regenerate (loop, max 5 attempts)
4. Write Household row with the unique code

Invite codes are permanent but rotatable via `regenerateInviteCode` (OWNER only).
Rotation replaces the code on the Household row and updates the GSI.

---

## 6. Auth Flow

### Sign-Up

```
User fills in: Full Name, Email, Password (+ optional Phone)
  ↓
Cognito creates account → sends verification email
  ↓
User verifies email
  ↓
User logs in → Cognito issues JWT (sub, email, name in claims)
  ↓
App calls getMe → Lambda get-or-create UserProfile
  (first login: writes UserProfile row from JWT claims, householdId: null)
  ↓
UserProfile.householdId is null → app routes to Create/Join Household screen
  ↓
User creates or joins household → Lambda TransactWriteItems (see section 1k)
  ↓
App routes to home screen
```

### Subsequent Logins

```
User logs in → Cognito issues JWT
  ↓
App calls getMe → Lambda reads existing UserProfile (householdId is set)
  ↓
App routes directly to home screen
```

### Social Login (Post-MVP)

Cognito natively supports Google and Apple as federated IdPs. When added:
- The JWT interface is identical — `sub`, `email`, `name` are still in claims
- Lambda's get-or-create profile flow works unchanged
- No schema changes required

The only addition is configuring the IdP in the Cognito User Pool console and
updating the login screen to handle OAuth redirects.

### Forgot Password

Handled entirely by Cognito — no Lambda or DynamoDB involvement.
Cognito sends a reset code to the user's email. Client calls Cognito's
`confirmForgotPassword` with the code and new password.
