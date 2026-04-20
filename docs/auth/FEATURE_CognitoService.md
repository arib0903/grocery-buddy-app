# FEATURE: Cognito Service Layer

> **Phase:** 2
> **Domain:** auth
> **Status:** draft
> **Depends on:** Phase 1 infrastructure provisioned (Cognito User Pool + App Client exist in AWS console)

---

## Background

The app needs to authenticate users against AWS Cognito without using Amplify. Before any screens or state management can work, we need a service layer that wraps `amazon-cognito-identity-js` and exposes a clean interface for all auth operations. This is the foundation every other auth feature depends on.

---

## Goal

Provide a testable, interface-driven service that handles all Cognito interactions — signup, verification, login (SRP), token refresh, password recovery, and signout — so that the rest of the app never touches Cognito internals directly.

---

## Scope

### In scope

- [x] Install `amazon-cognito-identity-js` and `expo-secure-store`
- [x] Cognito pool configuration module reading from env vars
- [x] `IAuthService` interface with all auth operations
- [x] `CognitoAuthService` implementation using SRP auth flow
- [x] Token storage in Expo SecureStore (idToken + refreshToken)
- [x] Silent token refresh via `REFRESH_TOKEN_AUTH` flow
- [x] Session restoration (read stored tokens, check expiry, refresh if needed)

### Non-goals

- UI screens — no React components in this feature
- Auth state management (React Context) — that's a separate feature spec
- Social login (Google/Apple) — post-MVP
- `USER_PASSWORD_AUTH` flow — sends password in plaintext, explicitly prohibited per `docs/iam-cognito.md`

---

## Open Questions

- [ ] Should `getCurrentSession` return the full `CognitoUserSession` or just the extracted `idToken` string? Leaning toward returning `{ idToken, userId, email, displayName }` — a parsed shape the context can use directly without knowing Cognito internals.
- [ ] Do we need `expo-secure-store` as a separate dependency or does the Expo SDK already include it? Verify before installing.

---

## Data Changes

### New entities / fields

- None. This feature operates on Cognito tokens, not app data.

### Modified entities / fields

- None.

### Reference

- `docs/iam-cognito.md` § 2 (Pool config, App Client, token types)
- `docs/iam-cognito.md` § 3 (Client auth flow, SRP, token storage, refresh)

---

## API Surface

### No GraphQL mutations / queries

This feature only talks to Cognito endpoints, not AppSync.

### Service interface

```typescript
interface IAuthService {
  signUp(email: string, password: string, displayName: string): Promise<void>;
  confirmSignUp(email: string, code: string): Promise<void>;
  resendConfirmationCode(email: string): Promise<void>;
  signIn(email: string, password: string): Promise<AuthSession>;
  signOut(): Promise<void>;
  forgotPassword(email: string): Promise<void>;
  confirmForgotPassword(
    email: string,
    code: string,
    newPassword: string,
  ): Promise<void>;
  getCurrentSession(): Promise<AuthSession | null>;
}

interface AuthSession {
  idToken: string;
  userId: string; // from JWT sub claim
  email: string; // from JWT email claim
  displayName: string; // from JWT name claim
}
```

### Request / response examples

**`signIn("user@example.com", "P@ssw0rd!")`**

```json
// Success
{
  "idToken": "eyJraWQiOiJ...",
  "userId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "email": "user@example.com",
  "displayName": "Jane Smith"
}
```

```json
// Error: wrong credentials
{ "error": "Incorrect username or password." }

// Error: user not confirmed
{ "error": "User is not confirmed." }
```

---

## Token Extraction & Storage

Cognito issues three tokens on successful `authenticateUser`. The service must handle each deliberately:

### What `authenticateUser` returns

`onSuccess` receives a `CognitoUserSession` object. Extract tokens from it:

```
session.getIdToken().getJwtToken()      → JWT string (used by AppSync)
session.getAccessToken().getJwtToken()  → JWT string (NOT used — see below)
session.getRefreshToken().getToken()    → opaque string (used for silent refresh)
```

### Which tokens are stored and why

| Token             | Stored in SecureStore? | Key            | Purpose                                                                                                                                                             |
| ----------------- | ---------------------- | -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **ID token**      | Yes                    | `idToken`      | Attached as `Authorization` header on every AppSync request. Contains identity claims (`sub`, `email`, `name`). Expires in 1 hour.                                  |
| **Refresh token** | Yes                    | `refreshToken` | Used by `getCurrentSession()` to silently obtain a new ID token when the current one expires. Expires in 30 days.                                                   |
| **Access token**  | **No**                 | —              | Contains OAuth scopes, not identity claims. Not used anywhere in this architecture (AppSync validates the ID token, not the Access token). Intentionally discarded. |

### How `AuthSession` fields are populated

The `userId`, `email`, and `displayName` fields in `AuthSession` are decoded from the **ID token's JWT payload** — not from a separate API call:

```
idToken payload (base64-decoded):
{
  "sub": "a1b2c3d4-..."        → AuthSession.userId
  "email": "user@example.com"  → AuthSession.email
  "name": "Jane Smith"         → AuthSession.displayName
  ...
}
```

Extraction approach: `session.getIdToken().decodePayload()` returns the claims as a plain object. Do **not** manually base64-decode — the library provides this method.

### Silent refresh flow

When `getCurrentSession()` finds an expired ID token but a valid refresh token in SecureStore:

1. Instantiate `CognitoUser` with the stored username
2. Call `cognitoUser.refreshSession(refreshToken, callback)`
3. `onSuccess` receives a new `CognitoUserSession` with fresh ID + Access tokens
4. Store the new `idToken` in SecureStore (refresh token remains unchanged)
5. Return a new `AuthSession` with updated claims

If the refresh token is also expired (>30 days), `refreshSession` fails → return `null` → user must re-login.

### Why the Access token is not stored

AppSync is configured with `AMAZON_COGNITO_USER_POOLS` authorization, which validates the **ID token**. The Access token is designed for OAuth scope-based APIs (e.g., API Gateway with resource servers) — not applicable here. Storing it would be unnecessary SecureStore usage and a larger surface for token leakage. See `docs/iam-cognito.md` § 2.

---

## Implementation

### New files

| File                     | Purpose                                                                                                            |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------ |
| `lib/config/cognito.ts`  | Exports `CognitoUserPool` instance from `EXPO_PUBLIC_COGNITO_USER_POOL_ID` + `EXPO_PUBLIC_COGNITO_CLIENT_ID`       |
| `lib/api/authService.ts` | `IAuthService` interface + `CognitoAuthService` class implementing all operations via `amazon-cognito-identity-js` |
| `.env.example`           | Documents required env vars: `EXPO_PUBLIC_COGNITO_USER_POOL_ID`, `EXPO_PUBLIC_COGNITO_CLIENT_ID`                   |

### Modified files

| File           | Change                                                |
| -------------- | ----------------------------------------------------- |
| `package.json` | Add `amazon-cognito-identity-js`, `expo-secure-store` |

### Follows existing patterns

- Interface + implementation split mirrors `lib/api/listService.ts` (`IListService` + `LocalListService`)
- Config module mirrors how other constants live under `constants/` — but Cognito config is runtime (env vars), so it gets its own `lib/config/` directory

---

## Alternatives Considered

| Option                                       | Why it lost                                                                                                                                              |
| -------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AWS Amplify Auth                             | Explicitly prohibited in CLAUDE.md. Brings massive dependency tree, opinionated config, and hidden IAM assumptions.                                      |
| `@aws-sdk/client-cognito-identity-provider`  | Lower-level than needed. Would require manually implementing SRP protocol. `amazon-cognito-identity-js` handles SRP natively.                            |
| Store tokens in AsyncStorage                 | Unencrypted. Expo SecureStore uses Keychain (iOS) / Keystore (Android). Required for JWT storage per security best practices.                            |
| Return raw `CognitoUserSession` from service | Leaks Cognito internals into the rest of the app. Returning a parsed `AuthSession` shape keeps the boundary clean and makes swapping providers possible. |

---

## Risks & Cross-cutting Concerns

- **`amazon-cognito-identity-js` uses callbacks, not promises** — Every Cognito method uses `onSuccess`/`onFailure` callbacks. The service must wrap each in a Promise. Incorrect wrapping can swallow errors.
- **SRP flow complexity** — `authenticateUser` with `AuthenticationDetails` + `CognitoUser` has a specific instantiation order. Getting it wrong produces cryptic errors.
- **Token refresh race condition** — If multiple parts of the app call `getCurrentSession()` simultaneously while the token is expired, we could fire multiple refresh requests. Consider adding a mutex/promise deduplication.
- **SecureStore size limits** — Expo SecureStore has a 2KB value limit on some platforms. JWTs can be large. Verify that Cognito ID tokens fit within this limit; if not, consider splitting storage.
- **Env vars missing at runtime** — If `.env` is not configured, the app should fail fast with a clear error, not silently produce null tokens.

---

## Acceptance Criteria

1. **Pool instantiation** — `CognitoUserPool` is constructed successfully when valid env vars are present. Throws a clear error when env vars are missing.
2. **Sign up** — `signUp()` calls Cognito and returns without error for valid email/password/name. Cognito User Pool shows user in UNCONFIRMED state.
3. **Confirm sign up** — `confirmSignUp()` with correct 6-digit code transitions user to CONFIRMED in Cognito.
4. **Sign in (SRP)** — `signIn()` returns an `AuthSession` with valid `idToken`, `userId`, `email`, and `displayName`. Password is never sent in plaintext.
5. **Token persistence** — After `signIn()`, `idToken` and `refreshToken` are stored in Expo SecureStore.
6. **Session restore** — `getCurrentSession()` reads tokens from SecureStore, validates expiry, and returns `AuthSession` without re-prompting for credentials.
7. **Silent refresh** — When the stored `idToken` is expired but `refreshToken` is valid, `getCurrentSession()` refreshes silently and returns a new valid `AuthSession`.
8. **Sign out** — `signOut()` clears all tokens from SecureStore and invalidates the local Cognito session.
9. **Forgot password** — `forgotPassword()` triggers Cognito to send a verification code to the user's email.
10. **Reset password** — `confirmForgotPassword()` with correct code sets the new password and user can sign in with it.

---

## Test Plan

### Unit tests

- `__tests__/authService.test.ts`:
  - Mock `amazon-cognito-identity-js` — verify `signUp` calls `CognitoUserPool.signUp` with correct params
  - Mock `authenticateUser` — verify SRP flow returns parsed `AuthSession`
  - Mock SecureStore — verify tokens are stored on sign-in and cleared on sign-out
  - Verify `getCurrentSession` returns null when no stored tokens exist
  - Verify `getCurrentSession` triggers refresh when idToken is expired

### Integration tests

- Not feasible without a live Cognito pool. Covered by manual verification.

### Manual verification

1. Add real Cognito pool credentials to `.env` → app starts without error
2. Call `signUp()` → check Cognito console for UNCONFIRMED user
3. Call `confirmSignUp()` with email code → user transitions to CONFIRMED
4. Call `signIn()` → receives `AuthSession` with valid JWT
5. Kill app → relaunch → call `getCurrentSession()` → returns session without login prompt
6. Wait >1hr (or manually expire token) → `getCurrentSession()` refreshes silently

---

## Notes

- `amazon-cognito-identity-js` is a standalone package — it does NOT require Amplify despite being in the `@aws-amplify` GitHub org historically. Verify the import path is `amazon-cognito-identity-js`, not `@aws-amplify/auth`.
- The `name` attribute in Cognito maps to `displayName` in our `UserProfile` type. Lambda reads it from `event.identity.claims.name` — the service layer must include it during `signUp` as a custom attribute.
- `USER_PASSWORD_AUTH` must never be enabled on the App Client. The service must use `USER_SRP_AUTH` exclusively. See `docs/iam-cognito.md` § 2.
