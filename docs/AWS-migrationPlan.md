# AWS Migration Plan — Grocery Buddy

## Context

The app is 100% client-side in-memory. All services (list, session, household) use local React Context implementations. The target architecture is fully documented in `docs/data-model.md`, `docs/iam-cognito.md`, and `docs/voice-parser-prompt.md`. The service layer is already abstracted behind interfaces, making swapping to AppSync implementations a low-risk operation per domain. This plan migrates feature-by-feature with a runnable, testable state after each phase.

---

## Pre-Conditions (Read Before Starting)

- Source of truth for DynamoDB keys, access patterns, and transactions: `docs/data-model.md`
- Source of truth for IAM roles and trust chain: `docs/iam-cognito.md`
- Source of truth for voice prompt and output schema: `docs/voice-parser-prompt.md`
- Architecture decisions and gotchas: `CLAUDE.md`

---

## Phase 1 — AWS Infrastructure Provisioning (Console Only, No Code)

**Goal:** All AWS resources exist. Nothing is wired yet.

### Order matters — create in this sequence:

1. **DynamoDB** — `grocery-buddy-table` in `us-east-1`, on-demand billing, PK=`PK (String)`, SK=`SK (String)`. After active, add GSI `inviteCode-index` (PK=`inviteCode`, Projection=ALL). Wait for GSI to reach ACTIVE status.

2. **IAM Role: `grocery-buddy-lambda-role`** — Trust: `lambda.amazonaws.com`. Permissions:
   - `dynamodb:GetItem/PutItem/UpdateItem/DeleteItem/Query/BatchWriteItem` on table + `table/index/*`
   - `bedrock:InvokeModel` on `arn:aws:bedrock:us-east-1::foundation-model/amazon.nova-lite-v1:0`
   - CloudWatch Logs: `CreateLogGroup/CreateLogStream/PutLogEvents`

3. **IAM Role: `grocery-buddy-appsync-role`** — Trust: `appsync.amazonaws.com`. Permission: `lambda:InvokeFunction` on `arn:aws:lambda:us-east-1:ACCOUNT:function:grocery-buddy-resolver`

4. **Lambda: `grocery-buddy-resolver`** — Runtime Node.js 22.x, arch arm64, 256 MB, 15s timeout, role=`grocery-buddy-lambda-role`. Handler body is a stub (log event, return null).

5. **Cognito User Pool: `grocery-buddy-user-pool`** — Sign-in: email (case-insensitive). Required attributes: `email`, `name`. Email verification required (code, not link). App client `grocery-buddy-app-client`: NO client secret, auth flows: `USER_SRP_AUTH` + `ALLOW_REFRESH_TOKEN_AUTH`. Do NOT enable `USER_PASSWORD_AUTH` — it sends the password in plaintext over the wire.

6. **AppSync API: `grocery-buddy-api`** — Auth: Amazon Cognito User Pools → `grocery-buddy-user-pool`, default action ALLOW. Schema not deployed yet.

**Verify:** DynamoDB table ACTIVE + GSI ACTIVE, Lambda exists with correct role, Cognito pool has app client with no secret, AppSync API exists.

---

## Phase 2 — Cognito + Auth Client Integration

**Goal:** Users can sign up, verify email, log in, receive JWT, and resume sessions. App routes to a "no household" screen post-login if `householdId` is null.

### New dependencies
```
npm install amazon-cognito-identity-js
```
No Amplify. Uses `amazon-cognito-identity-js` directly per `docs/iam-cognito.md §3`.

### New/modified files

| File | Action |
|------|--------|
| `lib/config/cognito.ts` | NEW — exports `CognitoUserPool` instance constructed from `EXPO_PUBLIC_COGNITO_USER_POOL_ID` + `EXPO_PUBLIC_COGNITO_CLIENT_ID` |
| `lib/api/authService.ts` | NEW — `IAuthService` interface + `CognitoAuthService` implementation using `amazon-cognito-identity-js` directly: `authenticateUser` (SRP flow), `signUp`, `confirmSignUp`, `forgotPassword`, `confirmForgotPassword`, `signOut`, `getCurrentSession` (reads SecureStore, refreshes if needed) |
| `lib/state/authContext.tsx` | NEW — Manages `isAuthenticated`, `idToken`, `userId`, `userProfile`. On mount: reads `idToken` from SecureStore → validates expiry → refreshes via `REFRESH_TOKEN_AUTH` if needed → sets state. |
| `app/_layout.tsx` | MODIFY — Add `<AuthProvider>` as outermost wrapper. Auth gate: loading screen → login → home. Add `<HouseholdProvider>` (needed in Phase 5, add now to get the nesting right). |
| `app/login.tsx` | MODIFY — Wire existing UI to `authContext.login()`. Add link to signup. |
| `app/signup.tsx` | NEW — Name + email + password form |
| `app/verify-email.tsx` | NEW — 6-digit code input |
| `app/forgot-password.tsx` | NEW — Email input |
| `app/reset-password.tsx` | NEW — Code + new password |

**Provider nesting order in `_layout.tsx`:**
```
<AuthProvider>
  <HouseholdProvider>
    <ListProvider>
      <SessionProvider>
        <Stack>
```

### Env vars to add
```
EXPO_PUBLIC_COGNITO_USER_POOL_ID=us-east-1_XXXXXXXXX
EXPO_PUBLIC_COGNITO_CLIENT_ID=<app_client_id>
```

### Verify
1. Sign up with real email → receive code → verify → login → home (still local data)
2. Kill and relaunch → home directly (session resumed)
3. Log out → login screen
4. Cognito console → Users → user appears as CONFIRMED

---

## Phase 3 — AppSync Schema + Lambda Skeleton + `getMe`

**Goal:** GraphQL schema deployed, Lambda routes operations, `getMe` creates/fetches UserProfile in DynamoDB. App calls `getMe` on every login.

### New dependency
```
npm install aws-appsync-auth-link aws-appsync-subscribe-link @apollo/client graphql
```
Uses raw AppSync HTTP/WebSocket client — no Amplify. `idToken` from SecureStore is attached as `Authorization` header per `docs/iam-cognito.md §3`.

### AWS steps
1. Deploy GraphQL schema from `docs/data-model.md` into AppSync schema editor
2. Create AppSync data source: type=Lambda, function=`grocery-buddy-resolver`, role=`grocery-buddy-appsync-role`
3. Attach Lambda data source to **all** Query/Mutation/Subscription fields (pass-through request template, `$ctx.result` response template)

### Lambda structure
```
lambda/
  index.js           ← router: switch(event.info.fieldName)
  handlers/
    getMe.js         ← only handler implemented in Phase 3
  lib/
    dynamo.js        ← DynamoDB DocumentClient singleton
    ids.js           ← UUID gen, key builders (e.g. userKey(id) → {PK, SK})
    membership.js    ← assertMembership(householdId, userId) → throws NOT_AUTHORIZED
```

**Lambda router default case (required):** The full GraphQL schema is deployed in Phase 3 but most handlers are not yet implemented. The `switch(event.info.fieldName)` default case must return an explicit `NOT_IMPLEMENTED` error, not `null`. Returning `null` for non-nullable GraphQL fields causes a confusing AppSync type error that looks like a Lambda bug.

```javascript
default:
  throw new Error(`NOT_IMPLEMENTED: ${event.info.fieldName}`);
```

**`getMe` logic:**
1. `userId` = `event.identity.sub`
2. DynamoDB `GetItem` `PK=USER#<userId>`, `SK=PROFILE#<userId>`
3. If exists → return; if not → `PutItem` new UserProfile with `householdId: null`, return it

**`membership.js` (used Phase 4+):**
- `GetItem` `PK=HOUSEHOLD#<id>`, `SK=MEMBER#<userId>` — throws if missing

### New app files

| File | Action |
|------|--------|
| `lib/api/graphqlClient.ts` | NEW — AppSync client configured with `EXPO_PUBLIC_APPSYNC_ENDPOINT`. Reads `idToken` from SecureStore before each request and sets `Authorization: <token>` header. No Amplify. |
| `lib/state/authContext.tsx` | MODIFY — After signIn, call `getMe`. Set `needsHousehold: true` if `householdId` is null. Store `userProfile` in context. Expose `getIdToken(): Promise<string>` method (not just a stored string value) — the GraphQL client must call this method per-request so it can refresh transparently rather than read a potentially-stale token from state. |

**Apollo InMemoryCache merge policies (required before Phase 4 client work):** Apollo's default cache behavior completely replaces an array field when new data arrives. `GroceryList.items` and `ShoppingSession.items` require explicit `merge` functions so that `addItem` / `addItemToSession` mutations append to the existing array instead of overwriting it. Without this, mutations will appear to succeed but the UI will not update correctly. Confirmed: Apollo Client official docs on cache field behavior. Configure in `graphqlClient.ts` when setting up `InMemoryCache`.

### Env vars to add
```
EXPO_PUBLIC_APPSYNC_ENDPOINT=https://xxxxxxxxxx.appsync-api.us-east-1.amazonaws.com/graphql
```

### Verify
1. Login → CloudWatch Logs shows `getMe` invocation with correct `userId`
2. DynamoDB: `USER#<userId>` row exists with `householdId: null`
3. Login again → Lambda does `GetItem`, no duplicate write
4. Manually set `householdId` in DynamoDB → next login returns it

---

## Phase 4 — Core CRUD: Lists + Items

> **Prerequisite:** Phase 5 (Household + Membership) must be complete before Phase 4 verify steps can run. Lists are partitioned under `HOUSEHOLD#<householdId>` — that value only exists in `UserProfile` after a user creates or joins a household. Phase 4 Lambda handlers read `UserProfile.householdId` on every operation; it will be null until Phase 5 is done.

**Goal:** `LocalListService` replaced by `AppSyncListService`. Lists and items persist in DynamoDB.

### Interface change (all services go async)
Modify `lib/api/listService.ts` — all methods return `Promise<T>`. Update `LocalListService` to return `Promise.resolve(...)` for local testing.

### New Lambda handlers
`handlers/listGroceryLists.js`, `handlers/getGroceryList.js`, `handlers/createGroceryList.js`, `handlers/updateGroceryList.js`, `handlers/deleteGroceryList.js`, `handlers/addItem.js`, `handlers/updateItem.js`, `handlers/deleteItem.js`

**Key details:**
- Every handler reads UserProfile → extracts `householdId` → calls `assertMembership`
- `deleteGroceryList`: (1) query `ITEM#<listId>#` (begins_with), BatchWrite delete in 25-item chunks; (2) query all `SESSION#` rows under household, filter by `listId` in Lambda — for each match, query + BatchWrite delete its `SITEM#` rows then DeleteItem the SESSION row; (3) delete LIST row. No `listId-index` GSI exists — step 2 scans all household sessions. See `data-model.md §1l`.
- `addItem/updateItem`: also bump `updatedAt` on the parent LIST row
- `deleteItemByName`: not a GraphQL mutation — keep as client-side: call `getGroceryList`, find by name, call `deleteItem` (used only by voice in Phase 7, where it will be replaced)

### New app files

| File | Action |
|------|--------|
| `lib/api/graphql/listOperations.ts` | NEW — GraphQL query/mutation strings for list domain |
| `lib/api/appSyncListService.ts` | NEW — Implements `IListService` using `graphqlClient` |
| `lib/state/listContext.tsx` | MODIFY — Swap to `AppSyncListService`, add `isLoading`/`error` state, `await` all calls, load lists from server on mount |

### Verify
1. Create list → DynamoDB `LIST#` row appears under correct `HOUSEHOLD#`
2. Add 3 items → 3 `ITEM#` rows appear
3. Kill/relaunch → lists and items persist
4. Delete item → DynamoDB row gone
5. Delete list → LIST row AND all ITEM rows deleted (cascade test)

---

## Phase 5 — Household + Membership Flows

**Goal:** `LocalHouseholdService` replaced by `AppSyncHouseholdService`. Create/join household works end-to-end with DynamoDB atomic writes.

### New Lambda handlers
`handlers/createHousehold.js`, `handlers/joinHousehold.js`, `handlers/getMyHousehold.js`, `handlers/regenerateInviteCode.js`

**Key details:**
- `createHousehold`: generate invite code (8 chars, unambiguous alphabet `23456789ABCDEFGHJKLMNPQRSTUVWXYZ`), query `inviteCode-index` GSI for uniqueness (max 5 attempts), then `TransactWriteItems`: Household METADATA + HouseholdMember (role=OWNER) + UserProfile SET `householdId`
- `joinHousehold`: query `inviteCode-index` → check not already member → `TransactWriteItems`: HouseholdMember (role=MEMBER) + UserProfile SET `householdId`
- `regenerateInviteCode`: assert role=OWNER, generate new code, `UpdateItem` METADATA row
- All household-scoped operations: `assertMembership` before executing

### New app files

| File | Action |
|------|--------|
| `lib/api/graphql/householdOperations.ts` | NEW — GraphQL strings for household domain |
| `lib/api/appSyncHouseholdService.ts` | NEW — Implements `IHouseholdService` (remove `currentUser` param; Lambda reads from JWT) |
| `lib/state/householdContext.tsx` | MODIFY — Swap to `AppSyncHouseholdService`, async interface, load household on `householdId` change |
| `app/household-setup.tsx` | NEW — Two sections: Create (name input) and Join (8-char code input). On success, route to home. |

### Verify
1. New user logs in → `household-setup` screen appears
2. Create household → DynamoDB: METADATA + MEMBER + UserProfile all written atomically
3. Second user joins by code → MEMBER row written, UserProfile updated
4. OWNER regenerates code → old code fails, new code works
5. Both users see same (empty) list screen

---

## Phase 6 — Shopping Sessions

**Goal:** `LocalSessionService` replaced by `AppSyncSessionService`. Sessions and session items persist in DynamoDB.

### New Lambda handlers
`handlers/startShoppingSession.js`, `handlers/toggleSessionItem.js`, `handlers/addItemToSession.js`, `handlers/resyncSession.js`, `handlers/completeSession.js`, `handlers/deleteSession.js`, `handlers/listShoppingSessions.js`, `handlers/getShoppingSession.js`

**Key details:**
- `startShoppingSession`: query all `ITEM#<listId>#` rows → BatchWrite `SITEM#<sessionId>#<itemId>` rows (25-item chunks) + PutItem SESSION row
- `toggleSessionItem`: single `UpdateItem` `SET completed = NOT completed` — no pre-read needed
- `resyncSession`: diff existing `SITEM#` rows vs current `ITEM#` rows → BatchWrite new items only. Lambda fetches the list itself — **remove the `list` parameter from the client call**
- `deleteSession`: query `SITEM#<sessionId>#` → BatchDelete → DeleteItem SESSION row

### New app files

| File | Action |
|------|--------|
| `lib/api/graphql/sessionOperations.ts` | NEW — GraphQL strings for session domain |
| `lib/api/appSyncSessionService.ts` | NEW — Implements `ISessionService` |
| `lib/state/sessionContext.tsx` | MODIFY — Swap to `AppSyncSessionService` |
| `app/shopping/[id].tsx` | MODIFY — Remove `list` arg from `resyncSession` call |

### Verify
1. Start session → SESSION row + all SITEM rows in DynamoDB
2. Toggle item → SITEM `completed` flips on each tap
3. Add manual item during shopping → new SITEM row
4. Add item to blueprint after session started → resync → new SITEM row appears
5. Complete session → `completedAt` set on SESSION row
6. Delete session → SESSION row AND all SITEM rows deleted

---

## Phase 7 — Voice Pipeline Migration (OpenAI → Bedrock)

**Goal:** Remove `EXPO_PUBLIC_OPEN_AI_KEY`. Voice goes: `expo-speech-recognition` → AppSync `parseVoiceIntent` mutation → Lambda → Bedrock Nova Lite → DynamoDB writes → response with updated state.

### New Lambda handler: `handlers/parseVoiceIntent.js`
1. Assert membership
2. Validate: at least one of `listId` or `sessionId` provided
3. Call Bedrock Nova Lite with system prompt from `docs/voice-parser-prompt.md` (embed as constant, temperature: 0.1, maxTokens: 1024)
4. Parse response from `output.message.content[0].text`
5. Execute parsed actions against DynamoDB (reuse same logic as existing handlers)
6. Return `VoiceParseResult`: `{ actions, updatedList?, updatedSession?, createdList? }`

**Bedrock call shape:**
```javascript
body: JSON.stringify({
  system: [{ text: SYSTEM_PROMPT }],
  messages: [{ role: "user", content: [{ text: transcript }] }],
  inferenceConfig: { temperature: 0.1, maxTokens: 1024 }
})
```

**Gotcha:** Ensure Bedrock model access is requested/approved in AWS console for `amazon.nova-lite-v1:0` in `us-east-1` before deploying.

### New/modified app files

| File | Action |
|------|--------|
| `lib/api/graphql/voiceOperations.ts` | NEW — `parseVoiceIntent` mutation string |
| `lib/voice/useVoiceCommands.ts` | MODIFY — Replace `parseVoiceIntentWithOpenAI` call with AppSync mutation. Accept `onResult(VoiceParseResult)` callback to update context from mutation response (avoids double-write). |
| `lib/voice/useBlueprintVoiceCommands.ts` | MODIFY — Implement `onResult` instead of `onApply` |
| `lib/voice/useShoppingVoiceCommands.ts` | MODIFY — Implement `onResult` instead of `onApply` |
| `.env` | REMOVE `EXPO_PUBLIC_OPEN_AI_KEY` |

`parseVoiceIntentWithOpenAI.ts` can be deleted once the migration is verified.

### Verify
1. Say "Add two pounds of chicken breast" → check CloudWatch for Bedrock call + DynamoDB write → item appears in app
2. In shopping mode, say "Check off the chicken breast" → SITEM `completed: true`
3. Remove OpenAI key from `.env` → voice still works

---

## Phase 8 — Real-Time Subscriptions

**Goal:** Household members see each other's edits live. List mutations broadcast via `onListUpdated`. Session toggles broadcast via `onSessionItemToggled`.

### AppSync subscription filtering
- `onListUpdated(householdId)`: fires on create/update — filter by `householdId` in mutation response
- `onListDeleted(householdId)`: fires on delete — returns `DeletedEntity { id, householdId }` — client removes list by `id`
- `onSessionItemToggled(sessionId)`: fires on toggle/add — filter by `sessionId` in session mutation response
- `onSessionDeleted(householdId)`: fires on delete — returns `DeletedEntity { id, householdId }` — client removes session by `id`

Delete subscriptions are separate from update subscriptions because AppSync requires subscription return type to exactly match mutation return type. `deleteGroceryList` and `deleteSession` return `DeletedEntity`, not `GroceryList`/`ShoppingSession`. (Confirmed: AWS AppSync docs.)

No Lambda changes needed — `@aws_subscribe` directive handles fan-out.

### New/modified app files

| File | Action |
|------|--------|
| `lib/api/graphql/subscriptionOperations.ts` | NEW — `ON_LIST_UPDATED`, `ON_LIST_DELETED`, `ON_SESSION_ITEM_TOGGLED`, `ON_SESSION_DELETED` subscription strings |
| `lib/state/listContext.tsx` | MODIFY — Open `onListUpdated` + `onListDeleted` subscriptions after initial load; cleanup in `useEffect` return |
| `app/shopping/[id].tsx` | MODIFY — Open `onSessionItemToggled` + `onSessionDeleted` subscriptions while screen is mounted |

**Gotcha — subscription reconnect:** Long-lived WebSocket connections drop on app background. Add an `AppState` listener that re-subscribes when foregrounded.

### Verify
1. Two devices/simulators in same household
2. Device A adds item → Device B sees it within ~2s
3. Device A toggles session item → Device B sees it checked off
4. Background Device B for 2 min → foreground → Device A change still propagates

---

## Critical Files Reference

| File | Why Critical |
|------|-------------|
| `lib/api/listService.ts` | Interface goes async first — every downstream service depends on this contract |
| `lib/state/listContext.tsx` | Service injection point + Phase 8 subscription open/close |
| `app/_layout.tsx` | Auth gate logic + provider nesting order (must be correct before Phase 5) |
| `lib/voice/useVoiceCommands.ts` | Central voice orchestrator — Phase 7 `onApply→onResult` change propagates to both blueprint and shopping voice hooks |
| `docs/data-model.md` | DynamoDB key patterns, transactions, cascade rules, full GraphQL schema |
| `docs/iam-cognito.md` | IAM policies, trust chain, Cognito config |
| `docs/voice-parser-prompt.md` | Bedrock system prompt (embed as-is in Lambda handler) |

---

## Phase Dependency Order

```
Phase 1 (Infrastructure) ──→ all phases depend on this

Phase 2 (Cognito/Auth)
  └──→ Phase 3 (AppSync needs JWT)

Phase 3 (AppSync skeleton + getMe)
  └──→ Phase 4 (lists need householdId from UserProfile)
  └──→ Phase 5 (membership check infrastructure built here)

Phase 5 (Household flows)  ←── must be usable before Phase 4 is production-ready
Phase 4 (Lists + Items)
  └──→ Phase 6 (sessions snapshot list items)
  └──→ Phase 7 (voice mutations against lists)

Phase 6 (Sessions)
  └──→ Phase 7 (voice CHECK_OFF/UNCHECK against sessions)
  └──→ Phase 8 (session subscriptions)

Phase 8 (Subscriptions)
  └── Phase 4 complete (list mutation payloads need householdId)
  └── Phase 6 complete (session mutation payloads need sessionId)
```
