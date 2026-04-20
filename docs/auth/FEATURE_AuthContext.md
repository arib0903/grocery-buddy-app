# FEATURE: Auth Context + Navigation Gate

> **Phase:** 2
> **Domain:** auth
> **Status:** draft
> **Depends on:** FEATURE_CognitoService (service layer must exist first)

---

## Background

The Cognito service layer handles raw auth operations, but the app needs React-level state management to: (a) know whether the user is authenticated, (b) persist and provide the current user's identity to all screens, (c) gate navigation so unauthenticated users only see login/signup, and (d) restore sessions on app relaunch without re-prompting for credentials. This is the bridge between the service layer and the UI.

---

## Goal

Provide an `AuthProvider` context that manages authentication state, gates navigation between auth and app screens, and automatically restores sessions on launch.

---

## Scope

### In scope

- [x] `AuthProvider` context with `isAuthenticated`, `isLoading`, `userId`, `idToken`, `userProfile` state
- [x] `login()`, `logout()`, `refreshSession()` methods exposed via context
- [x] On-mount session restoration: read SecureStore → validate → refresh if needed → set state
- [x] Navigation gate in `_layout.tsx`: loading spinner → auth screens → app screens
- [x] Provider nesting order: `AuthProvider > HouseholdProvider > ListProvider > SessionProvider > Stack`
- [x] Add `HouseholdProvider` to nesting now (empty wrapper, needed for Phase 5)

### Non-goals

- Login/signup screen UI — that's FEATURE_LoginSignUpVerify
- Household routing ("no household" screen) — that's Phase 5, not Phase 2
- Token attachment to AppSync requests — that's Phase 3 (GraphQL client setup)
- Automatic token refresh on 401 response — that's Phase 3

---

## Open Questions

- [ ] Should `AuthProvider` expose the raw `idToken` to children, or should it only be accessible internally (for future GraphQL client use)? Leaning toward exposing it — the GraphQL client in Phase 3 will need to read it.
- [ ] Loading state on mount: show a blank screen, a splash screen, or a spinner? This is a UI decision — need your input.

---

## Data Changes

### New entities / fields

- None. Auth state is ephemeral (React state + SecureStore). No DynamoDB writes.

### Modified entities / fields

- None.

### Reference

- `UserProfile` type already defined in `lib/types.ts`
- Token flow described in `docs/iam-cognito.md` § 2 (tokens) and § 3 (storage, refresh)

---

## API Surface

### No GraphQL mutations / queries

Auth context only calls the Cognito service layer, not AppSync. `getMe` (which creates/fetches UserProfile in DynamoDB) is Phase 3.

### Context interface

```typescript
interface AuthContextType {
  isLoading: boolean; // true during initial session restore
  isAuthenticated: boolean; // true after successful login or session restore
  userId: string | null; // Cognito sub claim
  idToken: string | null; // JWT for future AppSync requests
  userProfile: {
    // parsed from JWT claims
    email: string;
    displayName: string;
  } | null;
  login(email: string, password: string): Promise<void>;
  logout(): Promise<void>;
}
```

### Request / response examples

**`login("user@example.com", "P@ssw0rd!")`**

```json
// Success: context state updates
{
  "isAuthenticated": true,
  "userId": "a1b2c3d4-...",
  "idToken": "eyJ...",
  "userProfile": { "email": "user@example.com", "displayName": "Jane" }
}
```

```json
// Error: propagated from CognitoAuthService
{ "error": "Incorrect username or password." }

// Error: user not confirmed
{ "error": "User is not confirmed." }
```

---

## Implementation

### New files

| File                        | Purpose                                                                                                           |
| --------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `lib/state/authContext.tsx` | `AuthProvider` + `useAuth()` hook. Manages auth state, wraps CognitoAuthService calls, restores session on mount. |

### Modified files

| File              | Change                                                                                                                                                                                                                     |
| ----------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `app/_layout.tsx` | Wrap entire app in `<AuthProvider>`. Add `<HouseholdProvider>` in correct nesting position. Add navigation gate: if `isLoading` → loading screen; if `!isAuthenticated` → show only auth screens; else → show app screens. |

### Follows existing patterns

- Context + hook pattern matches `lib/state/listContext.tsx` (`ListProvider` + `useLists()`)
- Provider nesting in `_layout.tsx` follows the same wrapper pattern already used for `ListProvider` + `SessionProvider`

---

## Alternatives Considered

| Option                                  | Why it lost                                                                                                                                                                                    |
| --------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Store auth state in Zustand/Redux       | Adds a state management dependency for one concern. React Context is sufficient for auth state (infrequent updates, small shape). Consistent with existing listContext/sessionContext pattern. |
| Navigation gate via middleware/redirect | Expo Router supports redirects, but a conditional render in `_layout.tsx` is simpler, more explicit, and doesn't fight the router's stack model.                                               |
| Delay `HouseholdProvider` until Phase 5 | Migration plan says to add it now to get nesting right. Avoids a disruptive provider reordering later. It's an empty wrapper until Phase 5.                                                    |

---

## Risks & Cross-cutting Concerns

- **Flash of wrong screen on launch** — If session restore is slow, user might briefly see login before being routed to home. The `isLoading` state with a loading screen prevents this.
- **Token expiry during active use** — If user leaves app open for >1hr, the idToken expires. This feature doesn't handle mid-use refresh (that's Phase 3 when GraphQL client is added). For now, the token goes stale until next `getCurrentSession()` call.
- **Provider ordering matters** — `HouseholdProvider` must be inside `AuthProvider` because it will eventually need `userId` from auth context. `ListProvider` must be inside `HouseholdProvider` because lists are scoped to households. Wrong order = context access errors.
- **Logout must clear all state** — `logout()` must call `signOut()` (clears SecureStore) AND reset context state. If either is missed, the app can get into a half-logged-out state.

---

## Acceptance Criteria

1. **Session restore on launch** — App launches → shows loading state → if valid session exists, transitions to home screen without login prompt.
2. **Auth gate blocks unauthenticated access** — When no session exists, only login/signup/verify/forgot-password screens are accessible. Navigating to `/` redirects to login.
3. **Login updates context** — After `login()`, `isAuthenticated` is true, `userId` and `userProfile` are populated, and the app navigates to home.
4. **Logout clears everything** — After `logout()`, `isAuthenticated` is false, all user state is null, tokens are removed from SecureStore, and app shows login screen.
5. **Provider nesting correct** — Provider order is `Auth > Household > List > Session > Stack`. No context access errors.
6. **Loading state prevents flash** — During session restore, user never briefly sees login screen then gets redirected to home.
7. **Expired token triggers re-login** — If both idToken AND refreshToken are expired (>30 days), `getCurrentSession()` returns null and user sees login screen.

---

## Test Plan

### Unit tests

- `__tests__/authContext.test.ts`:
  - Mock `CognitoAuthService.getCurrentSession()` returning valid session → verify `isAuthenticated` is true after mount
  - Mock `getCurrentSession()` returning null → verify `isAuthenticated` is false
  - Mock `login()` → verify context state updates correctly
  - Mock `signOut()` → verify all state resets to initial values

### Integration tests

- Not feasible without live Cognito. Covered by manual verification.

### Manual verification

1. Fresh install (no stored tokens) → app shows login screen
2. Log in with valid credentials → app navigates to home, shows correct user info
3. Kill app completely → relaunch → app goes to home without login prompt
4. Tap logout → app returns to login screen
5. Try to navigate to home URL directly while logged out → stays on login screen
6. Wait >1hr or manually clear idToken from SecureStore → relaunch → app refreshes silently and goes to home (refresh token still valid)

---

## Notes

- `HouseholdProvider` is added in this feature but remains a passthrough wrapper. It will be wired in Phase 5.
- The `idToken` exposed in context will be consumed by the GraphQL client in Phase 3. Until then, it's stored but unused outside of session validation.
- Navigation gate approach: Expo Router's `<Stack>` can conditionally render different screen sets based on auth state. This is the recommended pattern from Expo's auth docs.
