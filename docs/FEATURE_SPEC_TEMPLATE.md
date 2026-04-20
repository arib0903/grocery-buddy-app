# FEATURE: [Short Name]

> **Phase:** [Migration plan phase #]
> **Domain:** [auth | infrastructure | lists | households | sessions | voice]
> **Status:** [draft | approved | in-progress | done]
> **Depends on:** [list feature specs this requires to be done first]

---

## Background

Why does this feature need to exist? What problem does it solve or what gap does it close?

---

## Goal

One sentence: what does this feature accomplish for the user or system?

---

## Scope

### In scope

- [ ] Bullet list of what this feature includes

### Non-goals

- Things that could reasonably be goals but are explicitly excluded, and why

---

## Open Questions

- [ ] Any unresolved decisions that could change the design (mark resolved with ~~strikethrough~~)

---

## Data Changes

### New entities / fields

- Entity, field, type, why

### Modified entities / fields

- Entity.field: old → new, why

### Reference

- Link to `data-model.md` section if applicable

---

## API Surface

### New mutations / queries

```graphql
# Paste exact GraphQL operations this feature adds
```

### Modified mutations / queries

- What changed and why

### Request / response examples

For each new mutation or query, show one concrete example:

**`mutationName`**

```graphql
# Sample call with actual parameter values
```

```json
// Sample success response
```

```json
// Non-obvious error response (if applicable)
```

---

## Implementation

### New files

| File              | Purpose              |
| ----------------- | -------------------- |
| `path/to/file.ts` | One-line description |

### Modified files

| File              | Change               |
| ----------------- | -------------------- |
| `path/to/file.ts` | What changes and why |

### Follows existing patterns

- Which service interface, key builder, context pattern, or Lambda handler convention this feature should match (e.g. "same shape as `listService.ts`", "uses `ids.js` key builders")

---

## Alternatives Considered

| Option                 | Why it lost                                           |
| ---------------------- | ----------------------------------------------------- |
| [Alternative approach] | [Trade-off that made it worse than the chosen design] |

---

## Risks & Cross-cutting Concerns

- **[Risk name]** — What could go wrong and how it's mitigated
- Consider: auth/token edge cases, offline behavior, DynamoDB throttling, cascade-delete correctness, data consistency

---

## Acceptance Criteria

> Each criterion must be independently verifiable. Write them so a tester
> with no context can confirm pass/fail.

1. **[Criterion name]** — Expected behavior in one sentence.
2. **[Criterion name]** — Expected behavior in one sentence.

---

## Test Plan

### Unit tests

- What to test, which file, key assertions

### Integration tests

- What to test end-to-end

### Manual verification

- Step-by-step instructions to verify on device/simulator

---

## Notes

Anything else: edge cases, gotchas discovered during implementation, links to related specs.
