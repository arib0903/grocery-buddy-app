# FEATURE: Voice Command Pipeline

> **Phase:** Pre-migration (local-only, client-side)
> **Domain:** voice
> **Status:** done
> **Depends on:** List CRUD (listContext), Shopping Sessions (sessionContext)

---

## Background

Typing grocery items one-by-one is slow, especially mid-shopping-trip. The app's core differentiator is voice: the user speaks naturally ("add two pounds of chicken and a dozen eggs") and the app parses that into structured list mutations. This feature implements the full pipeline from microphone tap to confirmed list/session changes.

---

## Goal

Enable users to speak grocery commands that are converted to structured actions (add, remove, check off, uncheck) and applied to lists or shopping sessions after confirmation.

---

## Scope

### In scope

- [x] On-device speech-to-text via `expo-speech-recognition`
- [x] OpenAI-powered intent parsing using a published prompt
- [x] Confirmation alert showing parsed actions before applying
- [x] Blueprint mode: ADD_ITEM and REMOVE_ITEM on list templates
- [x] Shopping mode: ADD_ITEM, REMOVE_ITEM, CHECK_OFF, UNCHECK on sessions
- [x] Simple fallback parser for ADD_ITEM (comma/and splitting, deduplication)
- [x] Graceful degradation: on parse failure, transcript populates manual input field
- [x] FloatingMicButton UI component shared across screens
- [x] Voice status display (listening indicator, parsing indicator, error banner)

### Non-goals

- CREATE_SPACE intent execution — type is defined but not wired to any screen action
- Offline OpenAI parsing — requires network; fallback is manual input only
- Streaming/partial parsing — entire transcript is sent after speech ends
- Voice activation without button tap ("Hey Grocery Buddy") — always requires mic tap
- Post-MVP intents (QUERY_LIST, QUERY_LEFT, QUERY_FIND, SWITCH_SPACE) — not implemented

---

## Open Questions

- ~~Should the fallback parser (`parseVoiceAddItems`) be used automatically when OpenAI fails, or should the transcript just populate manual input?~~ — Resolved: transcript goes to manual input; fallback parser exists but is not auto-invoked by the pipeline
- [ ] When migrating to AWS (Phase 7), will parsing move to Lambda + Bedrock? If so, `parseVoiceIntentWithOpenAI.ts` will be replaced by an AppSync mutation

---

## Data Changes

### New entities / fields

- None — voice does not create new entity types. It produces `VoiceAction[]` which are translated into existing `GroceryItem` and `SessionItem` mutations.

### Modified entities / fields

- None directly. Voice actions call existing context mutations (`addItemToList`, `deleteItemByName`, `addItemToSession`, `removeItemFromSession`, `setSessionItemCompleted`).

### Reference

- Voice output schema matches `docs/voice-parser-prompt.md` § Output Schema
- Item fields map to `GroceryItem` in `docs/data-model.md` § 1f

---

## API Surface

### External API call (OpenAI)

```
POST https://api.openai.com/v1/responses
Authorization: Bearer <EXPO_PUBLIC_OPEN_AI_KEY>
```

### Request / response examples

**`parseVoiceIntentWithOpenAI("add two pounds of chicken and a dozen eggs")`**

```json
// Request body
{
  "prompt": {
    "id": "pmpt_69da56d71d68819687417939ff93307b00d2ae1dcfb56b69",
    "version": "1"
  },
  "input": [
    { "role": "user", "content": "add two pounds of chicken and a dozen eggs" }
  ]
}
```

```json
// Success response (parsed from output[].content[].text)
{
  "actions": [
    {
      "intent": "ADD_ITEM",
      "items": [
        {
          "name": "chicken",
          "quantity": 2,
          "unit": "lb",
          "notes": null,
          "categoryHint": "meat"
        },
        {
          "name": "egg",
          "quantity": 12,
          "unit": null,
          "notes": null,
          "categoryHint": "dairy"
        }
      ],
      "space": null
    }
  ]
}
```

```json
// Error: missing API key
{ "error": "OpenAI API key not configured. Add EXPO_PUBLIC_OPEN_AI_KEY to grocery-buddy/.env and restart the dev server." }

// Error: invalid response shape
{ "error": "OpenAI response missing actions array." }

// Error: HTTP failure
{ "error": "OpenAI request failed (429): rate limit exceeded" }
```

### No GraphQL mutations / queries

Voice is entirely client-side in the current phase. It calls existing listContext/sessionContext methods which are also client-side (local state).

---

## Implementation

### New files

| File                                      | Purpose                                                                                                                           |
| ----------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `lib/voice/intentTypes.ts`                | TypeScript types matching OpenAI output schema: `VoiceIntent`, `VoiceItem`, `VoiceAction`, `VoiceActionsResult`                   |
| `lib/voice/parseVoiceIntentWithOpenAI.ts` | Sends transcript to OpenAI published prompt, validates response shape, returns typed `VoiceActionsResult`                         |
| `lib/voice/parseVoiceAddItems.ts`         | Simple fallback parser: strips command prefixes, splits by comma/and, deduplicates, returns `ParsedVoiceItem[]`                   |
| `lib/voice/useVoiceToText.ts`             | Low-level hook wrapping `expo-speech-recognition`: manages permission, start/stop, emits exactly one final transcript per session |
| `lib/voice/useVoiceCommands.ts`           | Generic pipeline hook: receives transcript → parses via OpenAI → optional transform → confirmation alert → calls `onApply`        |
| `lib/voice/useBlueprintVoiceCommands.ts`  | List-editing wrapper: filters to ADD_ITEM/REMOVE_ITEM, translates to `listContext` mutations                                      |
| `lib/voice/useShoppingVoiceCommands.ts`   | Shopping wrapper: supports all 4 intents, translates to `sessionContext` mutations                                                |
| `components/common/FloatingMicButton.tsx` | FAB component: mic/stop icon, color states (green/red/gray), shared by both screens                                               |
| `__tests__/parseVoiceAddItems.test.ts`    | Unit tests for fallback parser                                                                                                    |

### Modified files

| File                    | Change                                                                                                            |
| ----------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `app/list/[id].tsx`     | Added `useBlueprintVoiceCommands` hook, FloatingMicButton, voice status card, error banner, fallback manual input |
| `app/shopping/[id].tsx` | Added `useShoppingVoiceCommands` hook, FloatingMicButton, voice status card, error banner                         |

### Follows existing patterns

- Context wrapper hooks (`useBlueprintVoiceCommands`, `useShoppingVoiceCommands`) follow the same thin-wrapper pattern as screen-level hooks — pull context, translate, delegate
- `useVoiceToText` uses the same ref-based callback pattern as other hooks to avoid stale closures
- `intentTypes.ts` mirrors the structure of `lib/types.ts` — interfaces per entity, exported individually

---

## Alternatives Considered

| Option                                 | Why it lost                                                                                                                                           |
| -------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| Whisper + S3 (cloud STT)               | Higher latency, cloud cost per request, requires Lambda round-trip for transcription. On-device STT via `expo-speech-recognition` is free and faster. |
| `@react-native-voice/voice`            | Was the original library. Migrated to `expo-speech-recognition` for better Expo SDK compatibility and config plugin support. See CLAUDE.md gotchas.   |
| Inline system prompt in code           | Harder to iterate on prompt without code deploys. Published prompt in OpenAI dashboard allows prompt edits without app changes.                       |
| Auto-apply without confirmation        | Risk of misheard commands silently mutating data. Confirmation alert is critical for trust — user sees parsed actions before anything changes.        |
| Fallback parser as automatic secondary | Would apply only ADD_ITEM on failure, masking the parse error. Current approach (populate manual input) is more transparent and lets the user decide. |

---

## Risks & Cross-cutting Concerns

- **OpenAI availability** — If OpenAI is down or rate-limited, voice parsing fails entirely. Mitigated by graceful fallback to manual input with the raw transcript preserved.
- **API key exposure** — `EXPO_PUBLIC_OPEN_AI_KEY` is embedded in the client bundle. Acceptable for dev/MVP; must move to server-side (Lambda + Bedrock) before production per AWS-migrationPlan Phase 7.
- **Microphone permission denial** — If user denies permission, `startListening()` shows an alert and returns without error. Voice button remains visible but non-functional.
- **Duplicate transcript emission** — Both `isFinal` result and `end` event can fire. `hasEmittedTranscriptRef` guard ensures exactly one emission per session.
- **Stacked confirmation alerts** — Multiple rapid mic taps could stack alerts. `isVoiceAlertOpenRef` guard prevents this.
- **Stale callback references** — `onApplyRef` and `onTranscriptRef` patterns keep callbacks current without re-registering native listeners.

---

## Acceptance Criteria

1. **Mic tap starts listening** — Tapping the FloatingMicButton transitions it to red/stop state and begins on-device speech recognition.
2. **Transcript displayed in real-time** — Interim recognition results appear in the voice status card as the user speaks.
3. **OpenAI parsing produces structured actions** — After speech ends, the transcript is sent to OpenAI and returns a valid `VoiceActionsResult` with correct intent/items/space fields.
4. **Confirmation alert shown** — User sees "I heard: <transcript>" with a human-readable summary of parsed actions and Cancel/Apply buttons.
5. **Apply mutates correct context** — In blueprint mode, ADD_ITEM calls `addItemToList`, REMOVE_ITEM calls `deleteItemByName`. In shopping mode, all four intents map to their respective session mutations.
6. **Blueprint filters non-applicable intents** — CHECK_OFF, UNCHECK, and CREATE_SPACE actions are silently filtered out before the confirmation alert in list editing mode.
7. **Parse failure falls back to manual input** — If OpenAI call fails, the raw transcript populates the manual name input field and an error alert is shown.
8. **Permission denial handled gracefully** — Denying microphone permission shows an informative alert without crashing.
9. **No duplicate emissions** — Rapid mic interactions or overlapping native events produce exactly one parse attempt per listen session.

---

## Test Plan

### Unit tests

- `__tests__/parseVoiceAddItems.test.ts` — Tests fallback parser:
  - Extracts items from comma-separated and "and"-separated input
  - Strips command prefixes ("add", "please add", "can you get")
  - Removes articles ("a", "an", "the", "some")
  - Deduplicates items (case-insensitive)
  - Returns empty array for blank/whitespace input

### Integration tests

- Not yet implemented. Future candidates:
  - Mock `parseVoiceIntentWithOpenAI` → verify `useBlueprintVoiceCommands` calls correct listContext methods
  - Mock `parseVoiceIntentWithOpenAI` → verify `useShoppingVoiceCommands` calls correct sessionContext methods
  - Verify `transformActions` filter removes CHECK_OFF/UNCHECK in blueprint mode

### Manual verification

1. Open a list → tap mic → speak "add milk and bread" → confirm alert shows "Add: milk, bread" → tap Apply → items appear in list
2. Open a shopping session → tap mic → speak "check off the eggs" → confirm alert shows "Check off: egg" → tap Apply → item marked completed
3. Open a list → tap mic → speak "check off milk" → confirm alert should NOT appear (filtered out in blueprint mode)
4. Kill network → tap mic → speak anything → error alert appears → transcript populates manual input field
5. Deny microphone permission → tap mic → informative alert appears, no crash

---

## Notes

- The OpenAI prompt is managed as a published prompt (ID: `pmpt_69da56d71d68819687417939ff93307b00d2ae1dcfb56b69`). Edit in the OpenAI dashboard, not in code. `docs/voice-parser-prompt.md` is a reference snapshot only.
- `expo-speech-recognition` requires a dev client or bare workflow — will not work in Expo Go. This is documented in CLAUDE.md.
- The migration from `@react-native-voice/voice` to `expo-speech-recognition` was contained entirely to `useVoiceToText.ts` — the public hook API was unchanged. Documented in CLAUDE.md gotchas.
- When AWS migration reaches voice (Phase 7 in migration plan), `parseVoiceIntentWithOpenAI.ts` will be replaced by an AppSync mutation that routes to Lambda → Bedrock Nova Lite. The hook layer (`useVoiceCommands`, `useBlueprintVoiceCommands`, `useShoppingVoiceCommands`) should remain unchanged — only the parse function swaps.
