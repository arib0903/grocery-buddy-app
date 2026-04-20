---
name: upload
description: Stage all changes, analyze diff, generate a Conventional Commits message, commit, and push to current branch. Usage: /upload
disable-model-invocation: true
allowed-tools: Bash
---

# Upload (Stage → Commit → Push)

## Instructions

Run these steps in order. Stop and report on any failure.

### 1. Check current state

```bash
git status
git branch --show-current
```

Report the current branch. If there are no changes to commit (clean working tree), tell the user and stop.

### 2. Stage all changes

```bash
git add -A
```

### 3. Analyze the diff

```bash
git diff --cached
```

Read the staged diff carefully. Use it to write the commit message in step 4.

### 4. Generate commit message

Follow Conventional Commits format:

```
<type>(<scope>): <imperative summary>

<optional body — only when "why" isn't obvious from the summary>
```

- **Types:** `feat`, `fix`, `refactor`, `perf`, `docs`, `test`, `chore`, `build`, `ci`, `style`, `revert`
- **Scope:** optional, use the primary module/directory affected
- **Subject:** imperative mood ("add", "fix", "remove" — not "added"), ≤50 chars, no trailing period
- **Body:** only when the why needs explanation. Keep it tight.

### 5. Commit

```bash
git commit -m "<message>"
```

Use a heredoc if the message has a body:

```bash
git commit -m "$(cat <<'EOF'
feat(auth): add token refresh on 401

Prevents silent session expiry by intercepting 401s
and attempting a token refresh before failing.
EOF
)"
```

### 6. Push

```bash
git push origin <current-branch>
```

If the branch has no upstream yet, use:

```bash
git push -u origin <current-branch>
```

### 7. Report

Show:
- Branch pushed to
- Commit hash (short)
- Commit message used
- Files changed count

## Error handling

- If `git add` fails: report and stop.
- If `git commit` fails (e.g. pre-commit hook): report the exact error. Do not use `--no-verify`. Fix the underlying issue if possible, then retry.
- If `git push` fails: report the exact error. Do not force push.
