# Task 11: Content Categorization & Validation

**Milestone**: [M3 - Content Processing & Entity Builders](../../milestones/milestone-3-content-processing.md)
**Estimated Time**: 3 hours
**Dependencies**: Task 10 (content extraction functions), Task 1 (Result type, ValidationError)
**Status**: Not Started

---

## Objective

Implement three functions that complete the content processing layer:

1. `categorizePost(content)` -- classifies post content into one of five categories ("safety", "events", "recommendations", "lost_found", "general") based on keyword matching.
2. `validatePostContent(dto)` -- validates a post creation DTO against business rules (content length limits, media constraints), returning `Result<ValidatedPost, ValidationError>`.
3. `processPostContent(dto)` -- the pipeline function that combines all extraction (from Task 10) and categorization into a single `ProcessedContent` result.

---

## Context

Content categorization and validation sit between raw text input and entity creation. When a user submits a new post, the flow is:

```
CreatePostDto -> validatePostContent() -> processPostContent() -> buildPostRefs() -> createPostEntity()
```

The `categorizePost` function classifies content for discovery and feed routing. Categories map to content themes in the goodneighbor platform:
- **safety**: Alerts, warnings, crime reports, suspicious activity
- **events**: Local events, meetups, gatherings
- **recommendations**: Business recommendations, service suggestions
- **lost_found**: Lost pets, found items, missing person reports
- **general**: Default category for unclassified content

The `validatePostContent` function enforces business rules before any processing occurs, returning a typed `Result` to avoid exception-based error handling.

The `processPostContent` function is the orchestrator that calls the extraction functions (Task 10) and categorization, packaging all results into a single `ProcessedContent` object.

---

## Steps

### 1. Define supporting types

Add the following types either in the content-processing module or in the types directory:

```typescript
// Types for content processing

export type PostCategory = "safety" | "events" | "recommendations" | "lost_found" | "general";

export interface ProcessedContent {
  hashtags: string[];
  mentions: string[];
  urls: string[];
  category: PostCategory;
}

export interface ValidatedPost {
  title: string;
  content: string;
  isPublic: boolean;
  media?: string[];
}

export interface CreatePostDto {
  title: string;
  content: string;
  isPublic: boolean;
  media?: string[];
}
```

### 2. Implement categorizePost

Add `categorizePost` to `src/lib/content-processing.ts`. Use keyword dictionaries for each category. The function scans the content for keywords and returns the first matching category, with "general" as the fallback.

```typescript
const CATEGORY_KEYWORDS: Record<Exclude<PostCategory, "general">, string[]> = {
  safety: [
    "safety", "alert", "warning", "danger", "crime", "suspicious",
    "emergency", "theft", "break-in", "break in", "stolen", "robbery",
    "fire", "flood", "evacuation", "scam", "fraud",
  ],
  events: [
    "event", "meetup", "meet up", "gathering", "party", "festival",
    "concert", "workshop", "seminar", "class", "meeting", "potluck",
    "block party", "open house", "yard sale", "garage sale",
  ],
  recommendations: [
    "recommend", "recommendation", "suggest", "suggestion",
    "best", "favorite", "favourite", "looking for", "anyone know",
    "plumber", "electrician", "contractor", "restaurant", "dentist",
    "mechanic", "landscaper", "babysitter", "tutor",
  ],
  lost_found: [
    "lost", "found", "missing", "reward", "last seen",
    "lost dog", "lost cat", "lost pet", "found dog", "found cat",
    "found pet", "missing person", "have you seen",
  ],
};

/**
 * Categorize post content based on keyword matching.
 * Scans content against keyword dictionaries for each category.
 * Returns "general" if no category keywords are matched.
 */
export function categorizePost(content: string): PostCategory {
  if (!content || content.trim().length === 0) {
    return "general";
  }

  const lowerContent = content.toLowerCase();

  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    for (const keyword of keywords) {
      if (lowerContent.includes(keyword)) {
        return category as PostCategory;
      }
    }
  }

  return "general";
}
```

### 3. Implement validatePostContent

Add `validatePostContent` to `src/lib/content-processing.ts`. This function validates the DTO fields and returns a `Result` type.

```typescript
import { ok, err, Result } from '../types/result.types';
import { ValidationError } from '../errors/app-errors';

const MAX_CONTENT_LENGTH = 10000;
const MAX_TITLE_LENGTH = 200;
const MAX_MEDIA_ITEMS = 10;

/**
 * Validate a post creation DTO against business rules.
 * Checks content length, title length, and media item count.
 * Returns Result<ValidatedPost, ValidationError>.
 */
export function validatePostContent(dto: CreatePostDto): Result<ValidatedPost, ValidationError> {
  if (!dto.content || dto.content.trim().length === 0) {
    return err(new ValidationError('Post content is required'));
  }

  if (dto.content.length > MAX_CONTENT_LENGTH) {
    return err(new ValidationError(
      `Post content exceeds maximum length of ${MAX_CONTENT_LENGTH} characters`
    ));
  }

  if (dto.title && dto.title.length > MAX_TITLE_LENGTH) {
    return err(new ValidationError(
      `Post title exceeds maximum length of ${MAX_TITLE_LENGTH} characters`
    ));
  }

  if (dto.media && dto.media.length > MAX_MEDIA_ITEMS) {
    return err(new ValidationError(
      `Post exceeds maximum of ${MAX_MEDIA_ITEMS} media items`
    ));
  }

  return ok({
    title: dto.title || '',
    content: dto.content.trim(),
    isPublic: dto.isPublic,
    media: dto.media,
  });
}
```

### 4. Implement processPostContent

Add `processPostContent` to `src/lib/content-processing.ts`. This function orchestrates the extraction functions from Task 10 and the categorization from this task.

```typescript
/**
 * Process post content through the full extraction and categorization pipeline.
 * Extracts hashtags, mentions, and URLs, then categorizes the content.
 * Returns a ProcessedContent object with all extracted data.
 */
export function processPostContent(dto: CreatePostDto): ProcessedContent {
  const fullText = [dto.title, dto.content].filter(Boolean).join(' ');

  return {
    hashtags: extractHashtags(fullText),
    mentions: extractMentions(fullText),
    urls: extractUrls(fullText),
    category: categorizePost(fullText),
  };
}
```

### 5. Write tests for categorization

Add tests to `src/lib/content-processing.spec.ts`:

```typescript
describe('categorizePost', () => {
  it('should categorize safety content', () => {
    expect(categorizePost('Safety alert: suspicious activity on Main St')).toBe('safety');
  });

  it('should categorize events content', () => {
    expect(categorizePost('Join us for a block party this Saturday!')).toBe('events');
  });

  it('should categorize recommendations content', () => {
    expect(categorizePost('Can anyone recommend a good plumber?')).toBe('recommendations');
  });

  it('should categorize lost_found content', () => {
    expect(categorizePost('Lost dog: brown labrador, last seen near the park')).toBe('lost_found');
  });

  it('should return general for unclassified content', () => {
    expect(categorizePost('Beautiful sunset this evening')).toBe('general');
  });

  it('should return general for empty content', () => {
    expect(categorizePost('')).toBe('general');
  });

  it('should be case-insensitive', () => {
    expect(categorizePost('SAFETY ALERT')).toBe('safety');
  });
});
```

### 6. Write tests for validation

```typescript
describe('validatePostContent', () => {
  it('should accept valid post content', () => {
    const result = validatePostContent({
      title: 'Test Post',
      content: 'Hello world',
      isPublic: true,
    });
    expect(result.ok).toBe(true);
  });

  it('should reject empty content', () => {
    const result = validatePostContent({
      title: 'Test',
      content: '',
      isPublic: true,
    });
    expect(result.ok).toBe(false);
  });

  it('should reject content exceeding max length', () => {
    const result = validatePostContent({
      title: 'Test',
      content: 'a'.repeat(10001),
      isPublic: true,
    });
    expect(result.ok).toBe(false);
  });

  it('should reject too many media items', () => {
    const result = validatePostContent({
      title: 'Test',
      content: 'Hello',
      isPublic: true,
      media: Array(11).fill('https://example.com/image.jpg'),
    });
    expect(result.ok).toBe(false);
  });

  it('should reject title exceeding max length', () => {
    const result = validatePostContent({
      title: 'a'.repeat(201),
      content: 'Hello',
      isPublic: true,
    });
    expect(result.ok).toBe(false);
  });
});
```

### 7. Write tests for processPostContent pipeline

```typescript
describe('processPostContent', () => {
  it('should return complete ProcessedContent', () => {
    const result = processPostContent({
      title: 'Safety Alert #alert',
      content: 'Warning about theft on Main St @alice https://example.com',
      isPublic: true,
    });

    expect(result.hashtags).toEqual(['alert']);
    expect(result.mentions).toEqual(['alice']);
    expect(result.urls).toEqual(['https://example.com']);
    expect(result.category).toBe('safety');
  });

  it('should combine title and content for extraction', () => {
    const result = processPostContent({
      title: '#title-tag',
      content: '#body-tag',
      isPublic: true,
    });

    expect(result.hashtags).toContain('title-tag');
    expect(result.hashtags).toContain('body-tag');
  });

  it('should handle content with no extractable items', () => {
    const result = processPostContent({
      title: 'Just a post',
      content: 'Nothing special here',
      isPublic: false,
    });

    expect(result.hashtags).toEqual([]);
    expect(result.mentions).toEqual([]);
    expect(result.urls).toEqual([]);
    expect(result.category).toBe('general');
  });
});
```

---

## Verification

- [ ] `categorizePost("Safety alert on Main St")` returns `"safety"`
- [ ] `categorizePost("Block party this Saturday")` returns `"events"`
- [ ] `categorizePost("Recommend a good plumber?")` returns `"recommendations"`
- [ ] `categorizePost("Lost dog near the park")` returns `"lost_found"`
- [ ] `categorizePost("Beautiful sunset")` returns `"general"`
- [ ] `categorizePost("")` returns `"general"`
- [ ] `categorizePost` is case-insensitive
- [ ] `validatePostContent` accepts valid content and returns `ok` result
- [ ] `validatePostContent` rejects empty content with `ValidationError`
- [ ] `validatePostContent` rejects content exceeding 10000 characters
- [ ] `validatePostContent` rejects title exceeding 200 characters
- [ ] `validatePostContent` rejects more than 10 media items
- [ ] `processPostContent` returns `ProcessedContent` with hashtags, mentions, urls, and category
- [ ] `processPostContent` combines title and content for extraction
- [ ] All tests pass (`npm test`)
- [ ] File compiles without TypeScript errors (`npm run typecheck`)

---

## Expected Output

**File Structure**:
```
src/lib/
├── content-processing.ts        # Now includes categorizePost, validatePostContent, processPostContent
└── content-processing.spec.ts   # Extended with categorization, validation, and pipeline tests
```

**Key Exports Added**:
- `categorizePost(content: string): PostCategory`
- `validatePostContent(dto: CreatePostDto): Result<ValidatedPost, ValidationError>`
- `processPostContent(dto: CreatePostDto): ProcessedContent`
- `PostCategory` type
- `ProcessedContent` interface
- `ValidatedPost` interface

---

## Common Issues and Solutions

### Issue 1: Category priority conflicts
**Symptom**: A post about "lost dog event" could match both "lost_found" and "events"
**Solution**: Categories are checked in order (safety, events, recommendations, lost_found, general). The first match wins. Safety takes highest priority as it is the most actionable category. This matches the existing goodneighbor behavior.

### Issue 2: Result type import path
**Symptom**: Cannot find module for Result type
**Solution**: Ensure the Result type from Task 1 is exported from `src/types/result.types.ts` and the import path is correct.

### Issue 3: Validation constants too restrictive or permissive
**Symptom**: Valid posts are rejected or invalid posts are accepted
**Solution**: The constants (MAX_CONTENT_LENGTH=10000, MAX_TITLE_LENGTH=200, MAX_MEDIA_ITEMS=10) should match the existing goodneighbor app limits. Adjust if the source app uses different values.

---

## Resources

- `agent/design/local.goodneighbor-core.md`: Content processing pipeline overview
- `agent/design/local.content-entity-model.md`: How processed content maps to entity fields

---

## Notes

- The keyword dictionaries for categorization are intentionally simple. Keyword-based classification is the existing approach in goodneighbor. A more sophisticated NLP-based approach could be added later without changing the function signature.
- `processPostContent` concatenates title and content before processing. This ensures hashtags in the title are also extracted.
- The `CreatePostDto` type used here should match the one defined in Task 3 (post.types.ts). If it differs, update the import.
- Validation limits (MAX_CONTENT_LENGTH, MAX_TITLE_LENGTH, MAX_MEDIA_ITEMS) should be exported as constants so they can be referenced in error messages and client-side validation.

---

**Next Task**: [Task 12: Post Creators](./task-12-post-creators.md)
**Related Design Docs**: [Content Entity Model](../../design/local.content-entity-model.md), [Good Neighbor Core](../../design/local.goodneighbor-core.md)
**Estimated Completion Date**: TBD
