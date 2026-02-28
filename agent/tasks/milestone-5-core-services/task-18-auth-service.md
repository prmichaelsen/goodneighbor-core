# Task 18: AuthService

**Milestone**: [M5 - Core Services](../../milestones/milestone-5-core-services.md)
**Estimated Time**: 3 hours
**Dependencies**: Task 5 (error hierarchy), Task 8 (Firebase init)
**Status**: Not Started

---

## Objective

Implement AuthService that wraps Firebase Admin SDK for session verification and role checking. The service provides four methods: `verifySession(sessionCookie)` to verify Firebase session cookies and return a `ServerUser`, `isOwner(claims, appName)` and `isOverseer(claims, appName)` to check custom claim arrays, and `requireOwner(session)` to combine session verification with ownership enforcement. All fallible methods return `Result<T, E>` discriminated unions.

---

## Context

The goodneighbor Next.js app currently handles authentication in `lib/auth-server.ts` with direct Firebase Admin SDK calls scattered across API routes. AuthService centralizes this logic into a single injectable service. The service depends on Firebase Admin Auth (from M2 Task 8) and AuthConfig (from M2 Task 6) for the session duration setting.

Custom claims in goodneighbor use arrays `isOwnerOf` and `isOverseerOf` on the decoded token to track which apps a user owns or oversees. The `appName` parameter (typically `"goodneighbor"`) is checked against these arrays.

The session cookie verification uses `auth.verifySessionCookie(cookie, true)` where the second parameter enables revocation checking. The cookie's expiry is also validated against `SESSION_DURATION_DAYS` from AuthConfig.

---

## Steps

### 1. Create AuthService Class

Create `src/services/auth.service.ts` extending BaseService. The constructor accepts a Firebase Auth instance and an AuthConfig object.

```typescript
import { Auth } from "firebase-admin/auth";

interface AuthServiceDeps {
  auth: Auth;
  config: AuthConfig;
}

export class AuthService extends BaseService {
  private auth: Auth;
  private config: AuthConfig;

  constructor(deps: AuthServiceDeps) {
    super();
    this.auth = deps.auth;
    this.config = deps.config;
  }
}
```

### 2. Implement verifySession

Call `this.auth.verifySessionCookie(sessionCookie, true)` to verify the cookie with revocation checking enabled. On success, extract the decoded token fields into a `ServerUser` object. On failure (expired, revoked, malformed), catch the Firebase auth error and return `err(new UnauthorizedError(...))`.

The decoded token contains:
- `uid` -- Firebase UID
- `email` -- user email
- `displayName` -- display name (may be undefined)
- `isOwnerOf` -- custom claim array of app names
- `isOverseerOf` -- custom claim array of app names

Validate that the session has not exceeded `SESSION_DURATION_DAYS` by comparing `auth_time` from the decoded token against the current time.

```typescript
async verifySession(sessionCookie: string): Promise<Result<ServerUser, UnauthorizedError>> {
  try {
    const decoded = await this.auth.verifySessionCookie(sessionCookie, true);
    const sessionDurationMs = this.config.sessionDurationDays * 24 * 60 * 60 * 1000;
    const authTimeMs = decoded.auth_time * 1000;

    if (Date.now() - authTimeMs > sessionDurationMs) {
      return err(new UnauthorizedError("Session expired"));
    }

    const serverUser: ServerUser = {
      uid: decoded.uid,
      email: decoded.email ?? "",
      displayName: decoded.name ?? "",
      claims: {
        isOwnerOf: decoded.isOwnerOf ?? [],
        isOverseerOf: decoded.isOverseerOf ?? [],
      },
    };
    return ok(serverUser);
  } catch (error) {
    return err(new UnauthorizedError("Invalid session cookie"));
  }
}
```

### 3. Implement isOwner and isOverseer

Pure synchronous methods that check whether a given `appName` exists in the user's custom claims arrays.

```typescript
isOwner(claims: CustomClaims, appName: string): boolean {
  return Array.isArray(claims.isOwnerOf) && claims.isOwnerOf.includes(appName);
}

isOverseer(claims: CustomClaims, appName: string): boolean {
  return Array.isArray(claims.isOverseerOf) && claims.isOverseerOf.includes(appName);
}
```

### 4. Implement requireOwner

Chains `verifySession` with an ownership check. First verifies the session cookie, then checks if the user is an owner of the configured app name. Returns `ForbiddenError` if the user is authenticated but not an owner.

```typescript
async requireOwner(sessionCookie: string): Promise<Result<ServerUser, UnauthorizedError | ForbiddenError>> {
  const sessionResult = await this.verifySession(sessionCookie);
  if (!sessionResult.ok) {
    return sessionResult;
  }

  const user = sessionResult.value;
  if (!this.isOwner(user.claims, this.config.appName)) {
    return err(new ForbiddenError("User is not an owner"));
  }

  return ok(user);
}
```

### 5. Write Unit Tests

Create `src/services/auth.service.spec.ts` with the following test cases:

- **verifySession success**: Mock `auth.verifySessionCookie` to return a valid decoded token. Verify the returned ServerUser has correct uid, email, displayName, and claims.
- **verifySession expired session**: Mock the decoded token with an `auth_time` older than SESSION_DURATION_DAYS. Verify UnauthorizedError is returned.
- **verifySession invalid cookie**: Mock `auth.verifySessionCookie` to throw. Verify UnauthorizedError is returned.
- **verifySession revoked session**: Mock to throw a Firebase auth/session-cookie-revoked error. Verify UnauthorizedError.
- **isOwner returns true**: Provide claims with `isOwnerOf: ["goodneighbor"]` and check with appName `"goodneighbor"`.
- **isOwner returns false**: Provide claims without the app name.
- **isOwner handles undefined claims**: Provide claims with `isOwnerOf: undefined`. Verify no crash, returns false.
- **isOverseer returns true/false**: Same pattern as isOwner tests.
- **requireOwner success**: Mock valid session + owner claims. Verify ServerUser returned.
- **requireOwner not owner**: Mock valid session but no owner claims. Verify ForbiddenError.
- **requireOwner invalid session**: Mock invalid cookie. Verify UnauthorizedError.

---

## Verification

- [ ] `verifySession` returns `Result<ServerUser, UnauthorizedError>` on both success and failure paths
- [ ] `verifySession` calls `auth.verifySessionCookie(cookie, true)` with revocation checking enabled
- [ ] `verifySession` checks `auth_time` against `SESSION_DURATION_DAYS` and returns UnauthorizedError for expired sessions
- [ ] `isOwner` correctly checks `claims.isOwnerOf` array for the given app name
- [ ] `isOverseer` correctly checks `claims.isOverseerOf` array for the given app name
- [ ] `isOwner` and `isOverseer` handle undefined/null claims arrays without throwing
- [ ] `requireOwner` returns ForbiddenError (not UnauthorizedError) when user is authenticated but not an owner
- [ ] AuthService constructor accepts Firebase Auth instance and AuthConfig via dependency injection
- [ ] All tests pass with mocked Firebase Auth (no real Firebase needed)
- [ ] No secrets or tokens are logged in error messages

---

## Expected Output

**File Structure**:
```
src/services/
├── auth.service.ts          # AuthService class with 4 methods
└── auth.service.spec.ts     # 11+ test cases covering all paths
```

**Key Files Created**:
- `auth.service.ts`: AuthService class extending BaseService with verifySession, isOwner, isOverseer, requireOwner
- `auth.service.spec.ts`: Unit tests with mocked Firebase Auth instance

---

## Notes

- The `auth.verifySessionCookie(cookie, true)` second parameter (`true`) enables revocation checking, which is important for security but requires the check against Firebase servers.
- Custom claims (`isOwnerOf`, `isOverseerOf`) are set via Firebase Admin SDK `auth.setCustomUserClaims()` from the goodneighbor admin panel. They are arrays of app name strings.
- The `ServerUser` type should be imported from `src/types/auth.types.ts` (Task 3).
- The `UnauthorizedError` and `ForbiddenError` should be imported from `src/errors/` (Task 5).
- `SESSION_DURATION_DAYS` default is 14 days (from M2 AuthConfig).

---

**Next Task**: [Task 19: ContentService](./task-19-content-service.md)
**Related Design Docs**: [goodneighbor-core design](../../design/local.goodneighbor-core.md)
**Estimated Completion Date**: TBD
