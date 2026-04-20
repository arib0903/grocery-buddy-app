# FEATURE: Password Recovery (Forgot + Reset)

> **Phase:** 2
> **Domain:** auth
> **Status:** draft
> **Depends on:** FEATURE_CognitoService, FEATURE_AuthContext, FEATURE_LoginSignUpVerify (login screen must exist for "Forgot Password" link)

---

## Background

Users forget passwords. Without a recovery flow, a forgotten password means a permanently locked account. Cognito supports email-based password recovery out of the box (send code → enter code + new password). This feature adds the two screens that complete that flow, accessible from the login screen.

---

## Goal

Allow users to reset their password via email verification code, accessible from the login screen's "Forgot Password" link.

---

## Scope

### In scope

- [x] `app/forgot-password.tsx` — email input, triggers Cognito forgot-password code
- [x] `app/reset-password.tsx` — code + new password input, confirms password reset
- [x] Navigation: login → forgot-password → reset-password → login
- [x] Wire "Forgot Password" link on login screen
- [x] Error handling for invalid email, wrong code, weak password
- [x] Loading states on submit buttons

### Non-goals

- Changing password while logged in (profile settings) — post-MVP
- Password expiry / forced rotation — not applicable for Cognito User Pools
- Rate limiting on code requests — handled by Cognito server-side, not client

---

## Open Questions

- ~~Should forgot-password and reset-password be one screen with two steps, or two separate screens?~~ — Resolved: two screens. Consistent with signup → verify-email pattern, easier to test independently.

---

## Data Changes

### New entities / fields

- None. Password reset is handled entirely by Cognito.

### Modified entities / fields

- None.

### Reference

- `docs/iam-cognito.md` § 2 — email verification is required, which enables forgot-password flow

---

## API Surface

### No GraphQL mutations / queries

### Screen → service call mapping

| Screen                | User action          | Service call                                                         |
| --------------------- | -------------------- | -------------------------------------------------------------------- |
| `forgot-password.tsx` | Tap "Send Code"      | `CognitoAuthService.forgotPassword(email)`                           |
| `reset-password.tsx`  | Tap "Reset Password" | `CognitoAuthService.confirmForgotPassword(email, code, newPassword)` |

### Request / response examples

**`forgotPassword("user@example.com")`**

```json
// Success: Cognito sends code to email
{
  "CodeDeliveryDetails": {
    "Destination": "u***@e***.com",
    "DeliveryMedium": "EMAIL"
  }
}
```

```json
// Error: user doesn't exist
{ "code": "UserNotFoundException", "message": "User does not exist." }

// Error: unconfirmed user
{ "code": "InvalidParameterException", "message": "Cannot reset password for the user as there is no registered/verified email." }
```

**`confirmForgotPassword("user@example.com", "123456", "NewP@ss1")`**

```json
// Error: wrong code
{ "code": "CodeMismatchException", "message": "Invalid verification code provided, please try again." }

// Error: code expired
{ "code": "ExpiredCodeException", "message": "Invalid code provided, please request a code again." }

// Error: weak password
{ "code": "InvalidPasswordException", "message": "Password did not conform with policy: ..." }
```

---

## Implementation

### New files

| File                      | Purpose                                                                                                                                                 |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `app/forgot-password.tsx` | Email input form. Calls `CognitoAuthService.forgotPassword()`. On success, navigates to reset-password with email as route param.                       |
| `app/reset-password.tsx`  | Code + new password + confirm password form. Calls `CognitoAuthService.confirmForgotPassword()`. On success, navigates to login with a success message. |

### Modified files

| File            | Change                                                        |
| --------------- | ------------------------------------------------------------- |
| `app/login.tsx` | Wire "Forgot Password" link to navigate to `/forgot-password` |

### Follows existing patterns

- Same screen structure as `signup.tsx` and `verify-email.tsx` — form fields, submit button, error display, loading state
- Navigation via `router.push()` / `router.replace()` consistent with other auth screens
- Email passed as route param between screens, same pattern as signup → verify-email

---

## Alternatives Considered

| Option                             | Why it lost                                                                                                                                                      |
| ---------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| In-app password reset without code | Cognito doesn't support this for forgot-password. Code-based verification is the only flow.                                                                      |
| Magic link instead of code         | Cognito supports this via custom email templates with links, but handling deep links on mobile adds complexity. Code input is simpler and more reliable for MVP. |
| Skip password recovery for MVP     | Leaves users permanently locked out. Unacceptable even for MVP — it's the #1 support request for auth-gated apps.                                                |

---

## Risks & Cross-cutting Concerns

- **Unconfirmed users can't reset password** — If a user signed up but never verified their email, `forgotPassword()` fails. The error message should guide them to verify their email first (or resend the signup verification code).
- **Code expiry** — Cognito codes expire (configurable, default varies). If the user takes too long, they get `ExpiredCodeException`. The UI should suggest requesting a new code.
- **Password confirmation mismatch** — The reset-password screen should have a "confirm new password" field with client-side match validation before calling Cognito.
- **Navigation back-stack** — After successful password reset, the user should land on login with the forgot-password and reset-password screens removed from the back stack (use `router.replace`, not `router.push`).

---

## Acceptance Criteria

1. **Forgot password link** — Login screen "Forgot Password" link navigates to forgot-password screen.
2. **Send code happy path** — Enter registered email → tap "Send Code" → navigates to reset-password screen. Code arrives in email inbox.
3. **Send code error: unknown email** — Enter unregistered email → error message shown.
4. **Reset password happy path** — Enter correct code + new password + confirm password → tap "Reset Password" → navigates to login screen. User can log in with new password.
5. **Reset error: wrong code** — Enter wrong code → error message shown, user can retry.
6. **Reset error: expired code** — Enter expired code → error suggests requesting a new code.
7. **Reset error: weak password** — Enter password that doesn't meet policy → error shown with requirements.
8. **Password confirmation mismatch** — Mismatched password fields → client-side error before any Cognito call.
9. **Loading states** — Submit buttons show loading indicator and are disabled during async operations.
10. **Clean back-stack** — After successful reset, pressing back from login does NOT return to reset-password screen.

---

## Test Plan

### Unit tests

- Minimal — these are thin screen components. Service layer is already tested in FEATURE_CognitoService.
- Optional: mock `forgotPassword()` → verify navigation to reset-password on success

### Integration tests

- Not feasible without live Cognito.

### Manual verification

1. Login screen → tap "Forgot Password" → forgot-password screen appears
2. Enter registered email → tap "Send Code" → reset-password screen appears, code arrives in email
3. Enter code + new password → tap "Reset Password" → login screen appears
4. Log in with new password → success
5. Try old password → "Incorrect username or password" error
6. On reset-password, enter wrong code → error shown
7. On forgot-password, enter unregistered email → error shown
8. After successful reset, press back → does NOT go to reset-password screen

---

## Notes

- Cognito's forgot-password flow requires email verification to be enabled on the User Pool. This is already specified in Phase 1 provisioning and `docs/iam-cognito.md`.
- The `forgotPassword` and `confirmForgotPassword` methods are already defined in the `IAuthService` interface from FEATURE_CognitoService. This feature only adds the screens that call them.
- Consider adding a "Password must contain..." hint below the new password field on the reset-password screen. This avoids a round-trip to Cognito just to get a policy error.
