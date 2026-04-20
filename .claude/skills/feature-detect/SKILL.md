---
name: feature-detect
description: Auto-detects when user expresses intent to build, implement OR TEST something new and offers to create a feature branch. Triggers on phrases like "I want to build", "let's implement", "I need to add", "let's add", "I'm going to create", etc.
disable-model-invocation: false
allowed-tools: Bash
---

# Feature Branch Auto-Detector

## Trigger Conditions

Activate when user expresses intent to start new work. Examples:

- "I want to build X"
- "let's implement X"
- "I need to add X"
- "let's add X"
- "I'm going to create X"
- "can we build X"
- "next feature is X"
- "start working on X"
- "I want to test X"
- "lets test X"

Do NOT trigger on:

- Discussing existing code
- Asking questions about architecture
- Reviewing or debugging

## Instructions

When triggered:

1. **Ask for confirmation first.** Do not create anything without user approval.

   Ask: "Want me to create a feature branch for this? If yes, what should I call it?"

2. **Wait for user response.**
   - If user says no or dismisses: drop it, continue with their original request.
   - If user confirms and provides a name: proceed to step 3.
   - If user confirms but gives no name: create one yourself with the context of what is going to be built and go step 3

3. **Convert the provided name to kebab-case:**
   - Lowercase everything
   - Replace spaces and underscores with hyphens
   - Remove any characters that are not alphanumeric or hyphens
   - Collapse multiple hyphens into one
   - Trim leading/trailing hyphens
   - Prepend `feat/`

4. **Run these git commands in order:**

   ```
   git checkout main
   git pull origin main
   git checkout -b <branch-name>
   ```

5. **Report** the branch created and confirm, then continue with the user's original request.

## Error handling

- If `git checkout main` fails: report error, stop, do not proceed.
- If `git pull` fails: report error, stop, do not proceed.
- If branch already exists: report it, stop, do not force-create.
