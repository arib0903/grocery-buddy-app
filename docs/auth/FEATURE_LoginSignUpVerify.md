# FEATURE: Login, Sign Up & Email Verification Screens

> **Phase:** 2
> **Domain:** auth
> **Status:** draft
> **Depends on:** FEATURE_CognitoService, FEATURE_AuthContext

---

## Background

The service layer and state management are in place, but users have no way to interact with them. The core auth happy path — sign up with email, verify the account, and log in — needs screens. The existing `login.tsx` has UI elements but zero auth integration. This feature wires the login screen and creates the signup + verification screens that complete the onboarding flow.

---

## Goal

Allow new users to create an account (name + email + password), verify their email with a 6-digit code, and log in — with all three screens wired to the auth context and Cognito service.

---

## Scope

### In scope

- [x] Wire existing `app/login.tsx` to `authContext.login()`
- [x] Error display on login (wrong password, user not confirmed, network error)
- [x] Link from login to signup screen
- [x] `app/signup.tsx` — name, email, password form with validation
- [x] `app/verify-email.tsx` — 6-digit code input, resend code option
- [x] Navigation flow: signup → verify-email → login (after verification) → home
- [x] Inline validation: email format, password minimum requirements, name not empty
- [x] Loading states on all submit buttons during async operations

### Non-goals

- Social login (Google/Apple buttons) — post-MVP, buttons exist in login.tsx but remain unwired
- Forgot password / reset password — separate feature spec
- Custom password policy beyond Cognito defaults — use whatever Cognito enforces
- Biometric login (FaceID/TouchID) — post-MVP

---

## Open Questions

- [ ] Password requirements: should we show Cognito's default rules (8 chars, uppercase, lowercase, number, special char) upfront, or let Cognito reject and surface the error? Showing rules upfront is better UX.
- [ ] After email verification, should the app auto-login or require the user to manually log in? Auto-login is smoother but adds complexity (need to hold credentials in memory during verification flow).
- [ ] Should the verify-email screen accept the email as a route param, or should the user re-enter it? Route param is cleaner.

---

## Data Changes

### New entities / fields

- None. Cognito manages user records. App state is handled by authContext.

### Modified entities / fields

- None.

### Reference

- Cognito sign-up attributes: `docs/iam-cognito.md` § 2 (email, name required)
- `name` maps to `displayName` in UserProfile: `docs/iam-cognito.md` § 2

---

## API Surface

### No new GraphQL mutations / queries

These screens call `authContext.login()` and `CognitoAuthService.signUp()` / `confirmSignUp()` — no AppSync involvement.

### Screen → service call mapping

| Screen             | User action          | Service call                                              |
| ------------------ | -------------------- | --------------------------------------------------------- |
| `login.tsx`        | Tap "Sign In"        | `authContext.login(email, password)`                      |
| `signup.tsx`       | Tap "Create Account" | `CognitoAuthService.signUp(email, password, displayName)` |
| `verify-email.tsx` | Tap "Verify"         | `CognitoAuthService.confirmSignUp(email, code)`           |
| `verify-email.tsx` | Tap "Resend Code"    | `CognitoAuthService.resendConfirmationCode(email)`        |

### Request / response examples

**Login error states the UI must handle:**

```json
// Wrong credentials
{ "code": "NotAuthorizedException", "message": "Incorrect username or password." }

// Unconfirmed user
{ "code": "UserNotConfirmedException", "message": "User is not confirmed." }

// User doesn't exist
{ "code": "UserNotFoundException", "message": "User does not exist." }
```

**Sign up error states:**

```json
// Email already registered
{ "code": "UsernameExistsException", "message": "An account with the given email already exists." }

// Weak password
{ "code": "InvalidPasswordException", "message": "Password did not conform with policy: ..." }
```

---

## Implementation

### New files

| File                   | Purpose                                                                                                                                     |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `app/signup.tsx`       | Sign-up form: name, email, password fields. Calls `CognitoAuthService.signUp()`. On success, navigates to verify-email with email as param. |
| `app/verify-email.tsx` | 6-digit code input. Calls `CognitoAuthService.confirmSignUp()`. On success, navigates to login. Includes resend code button.                |

### Modified files

| File            | Change                                                                                                                                                                                         |
| --------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `app/login.tsx` | Wire "Sign In" button to `authContext.login()`. Show error messages from Cognito. Wire "Sign Up" link to navigate to `/signup`. Handle `UserNotConfirmedException` by routing to verify-email. |

### Follows existing patterns

- Screen files follow existing Expo Router file-based routing (`app/login.tsx` already exists as the pattern)
- Error display should match the existing UI style in `login.tsx` (the info box pattern)
- Form state management: local `useState` per field — consistent with how `create-list/index.tsx` handles form inputs

---

## Alternatives Considered

| Option                              | Why it lost                                                                                                                                         |
| ----------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| Single multi-step auth screen       | Harder to deep-link, harder to test independently, increases file complexity. Separate screens per step is simpler and matches Expo Router's model. |
| OTP-style email login (no password) | Cognito doesn't natively support passwordless email OTP without custom Lambda triggers. Adds infrastructure complexity for MVP.                     |
| Skip email verification for MVP     | Cognito requires it for forgot-password flow to work. Skipping now means password recovery breaks later.                                            |

---

## Risks & Cross-cutting Concerns

- **Cognito error codes are inconsistent** — Some errors come as `code` + `message`, others as plain strings. The UI must normalize these for display.
- **`UserNotConfirmedException` on login** — If a user signs up but doesn't verify, then tries to log in, Cognito throws this specific error. The login screen must catch it and route to verify-email, not show a generic error.
- **Email case sensitivity** — Cognito is configured as case-insensitive for email, but the app should lowercase email before sending to avoid edge cases.
- **Navigation after verification** — If we route to login after verification, the user has to re-enter credentials. If we auto-login, we must hold the password in memory during the verify flow. Both have trade-offs.
- **Keyboard handling** — Forms with multiple inputs on mobile need proper keyboard avoidance and "next" field focus behavior. Test on both iOS and Android.

---

## Acceptance Criteria

1. **Login happy path** — Enter valid credentials → tap Sign In → app navigates to home screen.
2. **Login error: wrong password** — Enter wrong password → error message appears below form, no navigation.
3. **Login error: unconfirmed user** — Enter credentials for unconfirmed user → app navigates to verify-email screen with email pre-filled.
4. **Sign up happy path** — Enter name, email, password → tap Create Account → navigates to verify-email screen. Cognito console shows user as UNCONFIRMED.
5. **Sign up error: existing email** — Enter already-registered email → error message appears.
6. **Verify email happy path** — Enter correct 6-digit code → user becomes CONFIRMED in Cognito → app navigates to login screen.
7. **Verify email: wrong code** — Enter wrong code → error message appears, user can retry.
8. **Resend code** — Tap "Resend Code" on verify-email → new code sent to email → success feedback shown.
9. **Sign Up link** — Login screen "Sign Up" link navigates to signup screen.
10. **Loading states** — All submit buttons show loading indicator during async operations and are disabled to prevent double-taps.

---

## Test Plan

### Unit tests

- `__tests__/login.test.tsx` (optional — screen tests are lower priority than service tests):
  - Mock `useAuth().login()` → verify it's called with correct email/password on button press
  - Mock login throwing `UserNotConfirmedException` → verify navigation to verify-email

### Integration tests

- Not feasible without live Cognito. Covered by manual verification.

### Manual verification

1. Open app (logged out) → login screen appears
2. Tap "Sign Up" → signup screen appears
3. Fill name + email + password → tap "Create Account" → verify-email screen appears
4. Check email inbox → enter 6-digit code → tap Verify → login screen appears
5. Enter credentials → tap Sign In → home screen appears
6. Log out → try logging in with wrong password → error shown
7. Try signing up with same email → "already exists" error shown
8. On verify-email, tap "Resend Code" → new code arrives in email

---

## Notes

- The existing `login.tsx` has Google/Apple social login buttons. Leave them visible but non-functional (disabled or showing "coming soon" on tap). Do not remove them.
- Cognito's `name` attribute is set during `signUp` — it is NOT editable from the client after that without a separate `updateUserAttributes` call. This is fine for MVP.
- The verify-email screen should also handle the case where a user navigates to it directly (e.g., after app kill during verification flow). The email should either come from a route param or be manually entered.
