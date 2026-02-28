# Task 20: ProfileService

**Milestone**: [M5 - Core Services](../../milestones/milestone-5-core-services.md)
**Estimated Time**: 5 hours
**Dependencies**: Task 3 (profile types), Task 8 (Firebase init)
**Status**: Not Started

---

## Objective

Implement ProfileService for public/private profile CRUD and profile board management. The service handles three distinct Firestore collections: PUBLIC_PROFILES for user-facing profile data, PRIVATE_PROFILES for sensitive user data, and PROFILE_BOARDS for customizable profile boards with 17 widget types. Additionally, implement `searchUsers(query)` using Firestore prefix queries on username and displayName fields, deduplicating results by userId.

---

## Context

The goodneighbor app has a rich profile system with public-facing profiles (visible to anyone), private profiles (visible only to the user), and customizable profile boards that users can configure with various widgets to display on their profile page. Profile boards support 17 widget types including text, image, links, social media, location, and custom content.

Profiles are stored in separate Firestore collections (not in the unified `goodneighbor.search` collection). This is because profiles have different access patterns and lifecycle than content entities -- they are not searchable via Algolia and do not use the ContentEntityRefs permission model.

User search within this service uses Firestore prefix matching, not Algolia. This is appropriate because user search is a simple prefix-based lookup (autocomplete-style) that does not need full-text search capabilities.

---

## Steps

### 1. Create ProfileService Class

Create `src/services/profile.service.ts`. The constructor accepts a Firestore instance.

```typescript
import { Firestore } from "firebase-admin/firestore";

interface ProfileServiceDeps {
  firestore: Firestore;
}

export class ProfileService extends BaseService {
  private firestore: Firestore;

  constructor(deps: ProfileServiceDeps) {
    super();
    this.firestore = deps.firestore;
  }
}
```

### 2. Implement Public Profile Methods

**getPublicProfile(username)**:
Query `COLLECTIONS.PUBLIC_PROFILES` where `username == username`. Return `NotFoundError` if no document matches.

```typescript
async getPublicProfile(username: string): Promise<Result<PublicProfile, NotFoundError>> {
  const snapshot = await this.firestore
    .collection(COLLECTIONS.PUBLIC_PROFILES)
    .where("username", "==", username)
    .limit(1)
    .get();

  if (snapshot.empty) {
    return err(new NotFoundError(`Profile not found for username: ${username}`));
  }

  const doc = snapshot.docs[0];
  return ok({ id: doc.id, ...doc.data() } as PublicProfile);
}
```

**updatePublicProfile(userId, data)**:
Validate the update data (username format, bio length, etc.). Write to `COLLECTIONS.PUBLIC_PROFILES` using the userId as the document ID. Use Firestore `update()` for partial updates.

```typescript
async updatePublicProfile(
  userId: string,
  data: Partial<PublicProfile>
): Promise<Result<PublicProfile, ValidationError>> {
  // Validate input
  if (data.username && !/^[a-zA-Z0-9_]{3,30}$/.test(data.username)) {
    return err(new ValidationError("Username must be 3-30 alphanumeric characters or underscores"));
  }

  const docRef = this.firestore.collection(COLLECTIONS.PUBLIC_PROFILES).doc(userId);
  const updateData = { ...data, updatedAt: new Date().toISOString() };
  await docRef.update(updateData);

  const updated = await docRef.get();
  return ok({ id: updated.id, ...updated.data() } as PublicProfile);
}
```

### 3. Implement Private Profile Methods

**getPrivateProfile(userId)**:
Read directly from `COLLECTIONS.PRIVATE_PROFILES` using userId as document ID. Return `NotFoundError` if document does not exist.

**updatePrivateProfile(userId, data)**:
Validate input, then update using `update()`. Private profiles contain email, phone, preferences.

### 4. Implement Profile Board Methods

**getProfileBoard(userId)**:
Read from `COLLECTIONS.PROFILE_BOARDS` using userId as document ID. The board document contains an array of widgets, each with a `type` field from the 17 supported widget types.

**createDefaultBoard(userId)**:
Check if a board already exists. If it does, return `ConflictError`. Otherwise, create a board with a default set of widgets.

```typescript
async createDefaultBoard(userId: string): Promise<Result<ProfileBoard, ConflictError>> {
  const docRef = this.firestore.collection(COLLECTIONS.PROFILE_BOARDS).doc(userId);
  const existing = await docRef.get();

  if (existing.exists) {
    return err(new ConflictError("Profile board already exists for this user"));
  }

  const defaultBoard: ProfileBoard = {
    userId,
    widgets: [],
    layout: "single-column",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  await docRef.set(defaultBoard);
  return ok(defaultBoard);
}
```

**updateBoard(userId, data)**:
Validate widget configurations against the 17 supported widget types. Each widget has a `type` discriminator and type-specific configuration fields. Reject unknown widget types with `ValidationError`.

The 17 widget types to validate:
1. text
2. image
3. gallery
4. video
5. link
6. links-list
7. social-links
8. location-map
9. contact-info
10. bio
11. skills
12. experience
13. education
14. certifications
15. recommendations
16. custom-html
17. embed

### 5. Implement searchUsers

Perform two parallel Firestore prefix queries -- one on `username` and one on `displayName` -- then deduplicate by userId.

```typescript
async searchUsers(query: string, limit: number = 20): Promise<Result<PublicProfile[], ValidationError>> {
  if (!query || query.trim().length < 2) {
    return err(new ValidationError("Search query must be at least 2 characters"));
  }

  const normalizedQuery = query.toLowerCase().trim();
  const endQuery = normalizedQuery + "\uf8ff";

  const [usernameSnap, displayNameSnap] = await Promise.all([
    this.firestore
      .collection(COLLECTIONS.PUBLIC_PROFILES)
      .where("username", ">=", normalizedQuery)
      .where("username", "<=", endQuery)
      .limit(limit)
      .get(),
    this.firestore
      .collection(COLLECTIONS.PUBLIC_PROFILES)
      .where("displayNameLower", ">=", normalizedQuery)
      .where("displayNameLower", "<=", endQuery)
      .limit(limit)
      .get(),
  ]);

  // Deduplicate by document ID (userId)
  const profileMap = new Map<string, PublicProfile>();
  for (const doc of [...usernameSnap.docs, ...displayNameSnap.docs]) {
    if (!profileMap.has(doc.id)) {
      profileMap.set(doc.id, { id: doc.id, ...doc.data() } as PublicProfile);
    }
  }

  const results = Array.from(profileMap.values()).slice(0, limit);
  return ok(results);
}
```

### 6. Write Unit Tests

Create `src/services/profile.service.spec.ts` with the following test cases:

- **getPublicProfile found**: Mock Firestore query returning a document. Verify PublicProfile returned.
- **getPublicProfile not found**: Mock Firestore query returning empty snapshot. Verify NotFoundError.
- **updatePublicProfile valid**: Mock Firestore update and get. Verify updated profile returned.
- **updatePublicProfile invalid username**: Provide username with special characters. Verify ValidationError.
- **getPrivateProfile found/not found**: Same pattern as public profile tests.
- **updatePrivateProfile valid**: Verify update writes to PRIVATE_PROFILES collection.
- **getProfileBoard found/not found**: Verify reads from PROFILE_BOARDS collection.
- **createDefaultBoard success**: Mock non-existing board. Verify default board created with set().
- **createDefaultBoard conflict**: Mock existing board. Verify ConflictError.
- **updateBoard valid widgets**: Provide valid widget configurations. Verify update succeeds.
- **updateBoard invalid widget type**: Provide unknown widget type. Verify ValidationError.
- **searchUsers success**: Mock both prefix queries returning results. Verify deduplication by userId.
- **searchUsers short query**: Provide single-character query. Verify ValidationError.
- **searchUsers no results**: Mock empty snapshots. Verify empty array returned.

---

## Verification

- [ ] `getPublicProfile` queries by username field (not document ID) and returns `Result<PublicProfile, NotFoundError>`
- [ ] `updatePublicProfile` validates username format (3-30 alphanumeric/underscore characters)
- [ ] `getPrivateProfile` reads by userId (document ID) from PRIVATE_PROFILES collection
- [ ] `getProfileBoard` reads from PROFILE_BOARDS collection
- [ ] `createDefaultBoard` checks for existing board and returns ConflictError if one exists
- [ ] `updateBoard` validates all 17 widget types and rejects unknown types
- [ ] `searchUsers` performs two parallel prefix queries (username and displayName)
- [ ] `searchUsers` uses `>= query` and `<= query + \uf8ff` for Firestore prefix matching
- [ ] `searchUsers` deduplicates results by userId (document ID)
- [ ] `searchUsers` requires minimum 2-character query
- [ ] All methods use correct Firestore collection constants from COLLECTIONS
- [ ] All fallible methods return Result<T, E> types
- [ ] All tests pass with mocked Firestore

---

## Expected Output

**File Structure**:
```
src/services/
├── profile.service.ts       # ProfileService class with 8 methods
└── profile.service.spec.ts  # 14+ test cases covering all paths
```

**Key Files Created**:
- `profile.service.ts`: ProfileService with public/private profile CRUD, board management, user search
- `profile.service.spec.ts`: Unit tests with mocked Firestore

---

## Notes

- Public profiles are queried by `username` field (not document ID) because usernames are the public-facing identifier while document IDs use Firebase UIDs.
- The `displayNameLower` field used in searchUsers assumes profiles store a lowercased version of displayName for case-insensitive search. This should be set when creating/updating profiles.
- Profile boards support 17 widget types. Each widget type has a different configuration shape, making this a discriminated union validation problem. Consider using Zod schemas for widget validation if the complexity warrants it.
- User search is intentionally a Firestore prefix query, not Algolia. This is simpler, lower-latency for autocomplete, and avoids indexing profile data in Algolia.
- The `\uf8ff` character is a high Unicode code point used by Firestore for prefix range queries. It is a standard pattern in the Firebase documentation.

---

**Next Task**: [Task 21: FeedService](./task-21-feed-service.md)
**Related Design Docs**: [goodneighbor-core design](../../design/local.goodneighbor-core.md)
**Estimated Completion Date**: TBD
