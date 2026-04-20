# Grocery Buddy

Voice-driven grocery list app. User speaks → on-device STT → LLM parses intent + items → DynamoDB → UI.

## Stack

React Native (Expo SDK ~54), `expo-speech-recognition`, AWS AppSync (GraphQL), Cognito User Pool, Lambda, Bedrock Nova Lite, DynamoDB.

## Architecture

```
User speaks → expo-speech-recognition (on-device STT) → raw text
→ AppSync mutation (Cognito JWT) → Lambda resolver
→ Bedrock Nova Lite → structured JSON { actions: [{ intent, items, space }] }
→ Lambda writes to DynamoDB → response to client
```

- Auth: Cognito User Pool only (JWT → AppSync validates). No Identity Pool — client never calls AWS directly.
- DynamoDB single-table: `USER#<userId>` + `LIST#<listId>` or `ITEM#<listId>#<itemId>` as PK/SK.
- Voice pipeline was originally Whisper + S3 — switched to on-device STT for lower latency and zero cloud cost.

## Key Design Decisions

- Nova Lite over frontier models: this is structured extraction, not reasoning. Cheap, fast, sufficient.
- AppSync over API Gateway: needed real-time subscriptions for future shared lists.
- DynamoDB over RDS: avoids Lambda connection pooling problem.
- Unified `actions` array output from LLM — client always iterates the same shape regardless of single or multi-intent.

## MVP Intents

`ADD_ITEM`, `REMOVE_ITEM`, `CHECK_OFF`, `UNCHECK`, `CREATE_SPACE`

Post-MVP: `QUERY_LIST`, `QUERY_LEFT`, `QUERY_FIND`, `SWITCH_SPACE`

## Commands

- `npx expo start --dev-client`: Start dev server
- `npx expo run:ios` / `npx expo run:android`: Native builds

## Important Notes

- `expo-speech-recognition` requires native modules — won't work in Expo Go, needs dev client or bare workflow.
- iOS/Android permissions are injected automatically by the config plugin in `app.json` — do not add them manually to Info.plist or AndroidManifest.xml.
- Lambda temperature for Bedrock calls: low (~0.1–0.3) for deterministic parsing.
- Always validate LLM JSON output conforms to actions schema before writing to DynamoDB.
- Fallback to manual text input if voice recognition or LLM parsing fails.

## Docs

- See @docs/voice-parser-prompt.md for the full Bedrock system prompt, output schema, normalization rules, edge cases, and few-shot examples.
- See @docs/iam-cognito.md for IAM roles, trust/permission policies, Cognito auth flow, and the full trust chain diagram.

## DynamoDB Design Standard

For any DynamoDB schema decision, justify it by tracing the most frequent **read** operation and the most frequent **write** operation through to the actual DynamoDB call.

A design that requires a read-modify-write cycle on a high-frequency path is wrong regardless of other apparent benefits (simplicity, fewer rows, single-call reads). Do not propose or accept embedding as a justification for "read as a unit" without first confirming that individual mutations on embedded elements can be done without a preceding read.

## Planning & Architecture Protocol

When answering any planning, architectural, or implementation question, follow these steps in order. Do not skip or reorder.

1. **Load context** — Read CLAUDE.md and every `@docs/` source of truth in `.claude/rules/workflow.md` before forming any opinion.
2. **Check inconsistencies** (line 32) — If anything in the docs appears broken, contradictory, or at odds with what is being implemented, raise it before answering. Do not scaffold against a design that looks wrong.
3. **Verify with official sources** (line 34) — For any infrastructure, database, or library claim, use WebSearch/WebFetch to check official docs (AWS, Apollo, Expo, etc.) before stating it. State the source URL explicitly. If the tool is unavailable, flag the recommendation as unverified. Never rely on general knowledge alone.
4. **Validate against grocery-buddy** (line 33) — Every tradeoff must map to this app's actual scale, stack, and access patterns. Generic tradeoffs that do not apply here get cut.
5. **Ground the recommendation** (line 35) — What does this app need + what do authoritative sources say at this scale + what is being consciously accepted or rejected.
6. **Flag architecture conflicts first** (line 36) — If implementation is pushing against the architecture, raise the architectural question before giving an implementation answer.
7. **Plan-first** — Present files to create/modify, expected outcome, open questions. Wait for Arib's approval before writing any code.

## Constraints

- Do not suggest or reference Amplify in any form. Project uses raw AppSync SDK / AWS SDK directly.

## Gotchas

- Migrated from `@react-native-voice/voice` to `expo-speech-recognition`. Migration was contained entirely to `lib/voice/useVoiceToText.ts` — public hook API is unchanged.
- DynamoDB schema: Claude initially proposed embedding `SessionItem` inside `ShoppingSession` ("read as a unit"). Arib challenged it by applying the same separation reasoning used for `GroceryItem`. Tracing `toggleSessionItem` to its actual DynamoDB call exposed the flaw — embedding requires a read-modify-write cycle on the highest-frequency path because DynamoDB list updates use positional index, not field value. Correct design is separate rows for all four entities. See `DynamoDB Design Standard` above and `docs/data-model.md` section 1d.
- Household is a first-class entity — not a string field on UserProfile. Originally proposed `UserProfile.householdName: string`; Figma revealed Household has its own Create/Join flow with invite codes. This cascaded into a full schema change: all list/item/session PKs switched from `USER#<userId>` to `HOUSEHOLD#<householdId>`. Any schema work touching shared data must account for household partitioning upfront.
- GraphQL schema must be diffed against `listContext.tsx` and `sessionContext.tsx` before finalizing. `resyncSession` existed in the frontend context but was missing from the first schema draft — only caught by cross-referencing existing context files. Always verify every context function has a corresponding mutation or query in the schema.
- DynamoDB has no cascading deletes — Lambda must handle them explicitly. Deleting a Household must also delete all Members, Lists, Items, Sessions, and SessionItems. Deleting a List must delete all its Items and active Sessions (and their SessionItems). Orphaned rows will accumulate silently if Lambda doesn't clean them up.
- Invite code uniqueness requires a GSI. Codes can't be validated as unique via the main table alone (PK is `HOUSEHOLD#<id>`). A GSI with `inviteCode` as partition key is required for collision detection before writing. Max 5 generation attempts; return error if all collide. See `docs/data-model.md` section 5.
- AppSync subscription return type must exactly match mutation return type — confirmed by AWS AppSync docs. `deleteGroceryList` and `deleteSession` return `DeletedEntity!` (not `ID!`) so delete subscriptions can filter by `householdId`. Delete events use separate subscriptions (`onListDeleted`, `onSessionDeleted`) — they cannot share `onListUpdated`/`onSessionItemToggled` because those expect `GroceryList`/`ShoppingSession`. See `docs/data-model.md` section 3.
- `deleteGroceryList` must cascade to Sessions and SessionItems — not just Items. No `listId-index` GSI exists on sessions. Lambda must query all `SESSION#` rows under the household partition and filter by `listId` in application code before deleting. See `docs/data-model.md` section 1l.
- `createHousehold` double-tap/retry risk — a second call creates a new household and overwrites `UserProfile.householdId`, orphaning all lists under the original household. Prevented by `ConditionExpression: attribute_not_exists(householdId) OR householdId = :null` on the `UpdateItem` write inside the TransactWriteItems call. See `docs/data-model.md` section 1k.
- Apollo InMemoryCache default behavior replaces array fields entirely — confirmed by Apollo official docs. `GroceryList.items` and `ShoppingSession.items` each require a custom `merge` function in `InMemoryCache` config so `addItem`/`addItemToSession` mutations append to the cached array instead of overwriting it. Must be set up before Phase 4 client work or mutations will silently fail to update the UI.
- Phase 5 (Household) must be completed before Phase 4 (Lists + Items) end-to-end verification can pass. Lists are partitioned under `HOUSEHOLD#<householdId>` — that value only exists in `UserProfile` after household creation. Phase 4 Lambda reads `UserProfile.householdId` on every operation; it will be null until Phase 5 runs. See `docs/AWS-migrationPlan.md` Phase 4 prerequisite note.
- Every household-scoped Lambda operation costs 2 extra DynamoDB reads: `getProfile(userId)` to resolve `householdId`, then `getMember(householdId, userId)` for the membership check. This triples the DynamoDB cost on `toggleSessionItem` — designed as 1 `UpdateItem`, actual cost is 3 calls. Accepted tradeoff for MVP: Lambda cannot trust `householdId` from the client. See `docs/CRUD-flows.md`.
