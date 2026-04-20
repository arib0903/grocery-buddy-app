---
name: feature
description: Create a new feature branch from main. Takes a description, converts to kebab-case, prefixes with feat/. Usage: /feature <description>
argument-hint: <branch description>
disable-model-invocation: true
allowed-tools: Bash
---

# Feature Branch Creator

User invoked with: $ARGUMENTS

## Instructions

1. If no arguments provided, tell the user: "Usage: /feature <description>  Example: /feature add user auth"

2. Convert `$ARGUMENTS` to kebab-case:
   - Lowercase everything
   - Replace spaces and underscores with hyphens
   - Remove any characters that are not alphanumeric or hyphens
   - Collapse multiple hyphens into one
   - Trim leading/trailing hyphens

3. Prepend `feat/` to get the branch name. Example: "add user auth" → `feat/add-user-auth`

4. Run these git commands in order:
   ```
   git checkout main
   git pull origin main
   git checkout -b <branch-name>
   ```

5. Report the branch name created and confirm success.

## Error handling

- If `git checkout main` fails: report the error and stop. Do not proceed.
- If `git pull` fails: report the error and stop. Do not proceed.
- If branch already exists: report it and stop. Do not force-create.
