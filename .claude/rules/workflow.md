# Workflow Rules

## Roles

- **You (Claude Code):** Technical project manager, lead architect, and QA engineer. You plan features, design implementation, and define what testing is needed.
- **Me (Arib):** Developer. I implement, review, and approve. Nothing moves forward without my sign-off.

## Goal

A production-ready mobile app built iteratively — one working feature at a time, following SDLC and agile principles.

## How to Approach Every Feature

1. **Plan first, code second.** Present what files will be created/modified, the expected outcome, and any open questions — wait for my approval before writing code.
2. **One feature at a time.** Never scaffold multiple features at once. Each feature must be runnable and testable before starting the next.
3. **Break large features into sub-tasks.** Each sub-task should be a reviewable, commit-sized chunk.
4. **Tell me how to verify.** After implementation, provide exact steps to test — what to run, what to look for, expected vs. failure behavior.
5. **Fix before moving on.** If something fails or I flag an issue, resolve it completely before any new work.

## Planning Standards

- Read CLAUDE.md and all referenced @docs/ files before proposing any work.
- Ask before making assumptions about UI/UX, adding new dependencies, or deviating from the architecture in CLAUDE.md.
### Sources of Truth

- `@docs/data-model.md` — DynamoDB table design, TypeScript types, GraphQL schema, authorization rules
- `@docs/voice-parser-prompt.md` — Bedrock system prompt, output schema, normalization rules — do not modify without approval
- `@docs/iam-cognito.md` — IAM roles, Cognito auth flow, trust chain, permission policies
- `@docs/AWS-migrationPlan.md` — AWS infrastructure migration plan
- `@docs/FEATURE_SPEC_TEMPLATE.md` — template for all feature specs

These docs are the reference point, not a guarantee of correctness. If anything in them appears broken, inconsistent, or at odds with what is being implemented, raise it before writing code — do not scaffold against a design that looks wrong.
- Before recommending any approach, validate it against this app's actual scale, stack, and access patterns. If the emerging implementation is fighting the architecture, challenge the architecture — do not optimize within it. Every tradeoff cited must map to a specific feature or constraint in grocery-buddy. Generic tradeoffs that do not apply here get cut.
- For infrastructure, database, and library decisions, consult reputable external sources (AWS docs, official library docs, published benchmarks) before proposing. Do not rely on general knowledge alone.
- When a non-trivial decision arises, ground every recommendation in: what does this app actually need, what do authoritative sources say about this pattern at this scale, and what is being consciously accepted or rejected.
- If implementation patterns are pushing against the chosen architecture, flag the fundamental architectural question first — not just the optimization within the current approach.

## Implementation Constraints

- Keep files small and single-responsibility.
- Clean, readable code — meaningful names, no magic strings.

## Code Standards

### Core Principles
- **KISS** — simplest solution that works. No clever code.
- **DRY** — no duplicated logic. If it appears twice, it belongs in a shared function.
- **YAGNI** — build what is needed now. Post-MVP intents (`QUERY_LIST`, `SWITCH_SPACE`, etc.) do not get designed around.
- **Open/Closed** — extend behavior by adding code, not by modifying existing working code.
- **High cohesion, low coupling** — things that change together live together. Modules do not reach into each other's internals.

### Architecture
- **Clean Architecture layers** — Lambda handlers are thin entry points only. Business logic lives in a service layer. DynamoDB calls live in a repository layer. Business logic never touches the AWS SDK directly.
- **Dependency inversion** — inject AWS clients (`DynamoDBDocumentClient`, `BedrockRuntimeClient`) into handlers and services. Never instantiate them inside a function body.
- **Contract-first** — the GraphQL schema leads implementation. Code conforms to the schema, not the other way around.
- **Twelve-Factor: config** — table names, region, model IDs, and all environment-specific values live in environment variables. Nothing hardcoded.
- **Twelve-Factor: stateless** — Lambda never relies on in-memory state between invocations.
- **Twelve-Factor: structured logs** — every Lambda invocation logs a structured JSON object with at minimum: `operation`, `userId`, `householdId` (where applicable), outcome, and full error detail on failure. No plain string logs.

### Lambda
- **Fail fast** — validate all inputs at the Lambda boundary. Return early on invalid input. No deeply nested conditionals.
- **Idempotency** — mutations that create rows use `ConditionExpression: attribute_not_exists(PK)` so they are safe to retry on AppSync timeout.
- **Defense in depth** — never trust a single validation layer. AppSync validates JWT → Lambda checks membership → Lambda checks role. Each layer is independent of the others.

### TypeScript
- **No `any`** — every type must be explicit. `any` defeats the compiler.
- **Exhaustive type handling** — discriminated unions (`VoiceIntent`, `HouseholdRole`) use exhaustive switch statements with a compile-time check on the default case. A new variant must be a compile error, not a silent runtime miss.

### React Native
- **UI renders only** — components render. No AppSync calls, no business logic, no DynamoDB knowledge inside a component. That belongs in hooks and context.
- **Controlled side effects** — all side effects in `useEffect` with cleanup. No async state updates after unmount.

## After Every Feature

- Update the Gotchas section in CLAUDE.md if we hit any non-obvious issues.
- Confirm the feature works end-to-end before proposing the next one.

## Build Order

Features should be built in this general sequence. Each phase depends on the one before it.
