# Task 10: Content Extraction Functions

**Milestone**: [M3 - Content Processing & Entity Builders](../../milestones/milestone-3-content-processing.md)
**Estimated Time**: 3 hours
**Dependencies**: Task 1 (common types for Result type)
**Status**: Not Started

---

## Objective

Implement the three content extraction functions that parse structured data from freeform post text: `extractHashtags(text)`, `extractMentions(text)`, and `extractUrls(text)`. Each function takes a string input and returns a deduplicated string array of extracted items. These functions form the first stage of the content processing pipeline used when creating posts.

---

## Context

When a user creates a post in goodneighbor, the raw text content is processed to extract hashtags (for tagging/categorization), mentions (for user notifications and refs population), and URLs (for link previews and metadata). These extraction results feed into `processPostContent()` (Task 11), which in turn feeds into `buildPostRefs()` (Task 12) to populate the refs arrays that drive the permission model and Algolia search.

The extracted hashtags end up in `refs.hasTag`, extracted mentions (after UID resolution) end up in `refs.hasMention`, and all three are stored in the `ProcessedContent` object for downstream use.

These are pure functions with no side effects, making them straightforward to implement and test.

---

## Steps

### 1. Create the content-processing module

Create `src/lib/content-processing.ts`. This file will hold all content processing functions (extraction, categorization, validation, and the pipeline). This task covers only the extraction functions.

```typescript
// src/lib/content-processing.ts

/**
 * Extract hashtags from text content.
 * Matches #word patterns, excluding markdown headers (##).
 * Returns deduplicated lowercase hashtag strings without the # prefix.
 */
export function extractHashtags(text: string): string[] {
  // Implementation here
}

/**
 * Extract @mentions from text content.
 * Matches @word patterns.
 * Returns deduplicated mention strings without the @ prefix.
 */
export function extractMentions(text: string): string[] {
  // Implementation here
}

/**
 * Extract URLs from text content.
 * Matches http://, https://, and www. patterns.
 * Returns deduplicated URL strings.
 */
export function extractUrls(text: string): string[] {
  // Implementation here
}
```

### 2. Implement extractHashtags

Use a regex that matches `#` followed by word characters (letters, digits, underscores, hyphens), but not when preceded by another `#` (to avoid matching markdown headers like `## Heading`).

```typescript
export function extractHashtags(text: string): string[] {
  if (!text || text.trim().length === 0) {
    return [];
  }
  // Match #word but not ##word (markdown headers)
  // (?<![#\w]) ensures # is not preceded by another # or word char
  const regex = /(?<![#\w])#([\w][\w-]*)/g;
  const matches: string[] = [];
  let match: RegExpExecArray | null;
  while ((match = regex.exec(text)) !== null) {
    matches.push(match[1].toLowerCase());
  }
  // Deduplicate
  return [...new Set(matches)];
}
```

Key behaviors:
- Returns tags without the `#` prefix
- Converts to lowercase for consistency
- Deduplicates results
- Ignores `##` markdown header syntax
- Supports hyphenated tags like `#lost-and-found`
- Returns empty array for empty/null-like input

### 3. Implement extractMentions

Use a regex that matches `@` followed by word characters.

```typescript
export function extractMentions(text: string): string[] {
  if (!text || text.trim().length === 0) {
    return [];
  }
  // Match @word patterns
  const regex = /(?<!\w)@([\w][\w-]*)/g;
  const matches: string[] = [];
  let match: RegExpExecArray | null;
  while ((match = regex.exec(text)) !== null) {
    matches.push(match[1]);
  }
  // Deduplicate
  return [...new Set(matches)];
}
```

Key behaviors:
- Returns mentions without the `@` prefix
- Preserves original casing (usernames are case-sensitive for display)
- Deduplicates results
- Does not resolve to UIDs (that is done at a higher level when building refs)

### 4. Implement extractUrls

Use a regex that matches common URL patterns: `http://`, `https://`, and `www.` prefixes.

```typescript
export function extractUrls(text: string): string[] {
  if (!text || text.trim().length === 0) {
    return [];
  }
  // Match http://, https://, and www. URLs
  const regex = /(?:https?:\/\/|www\.)[^\s<>\"')\]]+/gi;
  const matches: string[] = [];
  let match: RegExpExecArray | null;
  while ((match = regex.exec(text)) !== null) {
    // Clean trailing punctuation that is likely not part of the URL
    let url = match[0].replace(/[.,;:!?)]+$/, '');
    matches.push(url);
  }
  // Deduplicate
  return [...new Set(matches)];
}
```

Key behaviors:
- Returns full URL strings (including protocol)
- Handles http and https
- Handles www. prefix without protocol
- Strips trailing punctuation that is not part of the URL
- Deduplicates results

### 5. Handle edge cases

Ensure all three functions handle:
- Empty string input: return `[]`
- Whitespace-only input: return `[]`
- No matches: return `[]`
- Duplicate items: return deduplicated array
- Special characters adjacent to patterns: only match valid patterns
- Multiple patterns in a single text: return all matches

### 6. Write comprehensive tests

Create `src/lib/content-processing.spec.ts` with tests for all three functions.

```typescript
// src/lib/content-processing.spec.ts
import { extractHashtags, extractMentions, extractUrls } from './content-processing';

describe('extractHashtags', () => {
  it('should extract simple hashtags', () => {
    expect(extractHashtags('#hello #world')).toEqual(['hello', 'world']);
  });

  it('should handle hyphenated hashtags', () => {
    expect(extractHashtags('#lost-and-found')).toEqual(['lost-and-found']);
  });

  it('should ignore markdown headers', () => {
    expect(extractHashtags('## Heading\n#realtag')).toEqual(['realtag']);
  });

  it('should deduplicate hashtags', () => {
    expect(extractHashtags('#hello #hello')).toEqual(['hello']);
  });

  it('should return lowercase', () => {
    expect(extractHashtags('#Hello #WORLD')).toEqual(['hello', 'world']);
  });

  it('should return empty array for empty input', () => {
    expect(extractHashtags('')).toEqual([]);
  });

  it('should return empty array for text without hashtags', () => {
    expect(extractHashtags('just some regular text')).toEqual([]);
  });
});

describe('extractMentions', () => {
  it('should extract simple mentions', () => {
    expect(extractMentions('@alice @bob')).toEqual(['alice', 'bob']);
  });

  it('should deduplicate mentions', () => {
    expect(extractMentions('@alice @alice')).toEqual(['alice']);
  });

  it('should return empty array for empty input', () => {
    expect(extractMentions('')).toEqual([]);
  });

  // ... additional tests
});

describe('extractUrls', () => {
  it('should extract https URLs', () => {
    expect(extractUrls('visit https://example.com')).toEqual(['https://example.com']);
  });

  it('should extract http URLs', () => {
    expect(extractUrls('visit http://example.com')).toEqual(['http://example.com']);
  });

  it('should extract www URLs', () => {
    expect(extractUrls('visit www.example.com')).toEqual(['www.example.com']);
  });

  it('should handle multiple URLs', () => {
    const text = 'see https://a.com and https://b.com';
    expect(extractUrls(text)).toEqual(['https://a.com', 'https://b.com']);
  });

  it('should strip trailing punctuation', () => {
    expect(extractUrls('visit https://example.com.')).toEqual(['https://example.com']);
  });

  it('should return empty array for empty input', () => {
    expect(extractUrls('')).toEqual([]);
  });

  // ... additional tests
});
```

---

## Verification

- [ ] `extractHashtags("#hello #world")` returns `["hello", "world"]`
- [ ] `extractHashtags("#hello-world")` returns `["hello-world"]`
- [ ] `extractHashtags("## Heading")` returns `[]` (ignores markdown headers)
- [ ] `extractHashtags("#Hello #HELLO")` returns `["hello"]` (lowercase, deduped)
- [ ] `extractHashtags("")` returns `[]`
- [ ] `extractMentions("@alice @bob")` returns `["alice", "bob"]`
- [ ] `extractMentions("@alice @alice")` returns `["alice"]` (deduped)
- [ ] `extractMentions("")` returns `[]`
- [ ] `extractUrls("https://example.com")` returns `["https://example.com"]`
- [ ] `extractUrls("http://example.com")` returns `["http://example.com"]`
- [ ] `extractUrls("www.example.com")` returns `["www.example.com"]`
- [ ] `extractUrls("visit https://example.com.")` strips trailing period
- [ ] `extractUrls("")` returns `[]`
- [ ] All tests pass (`npm test`)
- [ ] File compiles without TypeScript errors (`npm run typecheck`)

---

## Expected Output

**File Structure**:
```
src/lib/
├── content-processing.ts        # Three extraction functions
└── content-processing.spec.ts   # Tests for all three functions
```

**Key Files Created**:
- `src/lib/content-processing.ts`: Contains `extractHashtags`, `extractMentions`, `extractUrls` exports
- `src/lib/content-processing.spec.ts`: Comprehensive test suite covering normal cases, edge cases, and deduplication

---

## Common Issues and Solutions

### Issue 1: Markdown headers matched as hashtags
**Symptom**: `extractHashtags("## Heading")` returns `["Heading"]`
**Solution**: Use a negative lookbehind `(?<!#)` or `(?<![#\w])` in the regex to ensure `#` is not preceded by another `#`.

### Issue 2: Email addresses matched as mentions
**Symptom**: `extractMentions("email user@example.com")` returns `["example"]`
**Solution**: Use a negative lookbehind `(?<!\w)` to ensure `@` is not preceded by a word character, which would indicate an email address.

### Issue 3: URLs with trailing punctuation
**Symptom**: `extractUrls("see https://example.com.")` returns `["https://example.com."]`
**Solution**: Strip common trailing punctuation characters (`.`, `,`, `;`, `:`, `!`, `)`) from matched URLs.

---

## Resources

- [MDN Regular Expressions Guide](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_expressions): JavaScript regex syntax reference
- `agent/design/local.content-entity-model.md`: Shows how extracted hashtags and mentions map to refs arrays

---

## Notes

- These extraction functions return raw strings. The `@username` mentions are NOT resolved to Firebase UIDs here -- that resolution happens at a higher level (in the API route or content service) before calling `buildPostRefs()`.
- Hashtags are lowercased for consistency in refs.hasTag and Algolia faceting. Mentions preserve casing since usernames may be case-sensitive.
- The regex patterns should be kept simple and maintainable. Extremely complex URL parsing is not needed -- the goal is to extract obvious URLs from user-authored text, not to validate URL syntax.
- This file will be extended in Task 11 with `categorizePost`, `validatePostContent`, and `processPostContent`.

---

**Next Task**: [Task 11: Content Categorization & Validation](./task-11-categorization-validation.md)
**Related Design Docs**: [Content Entity Model](../../design/local.content-entity-model.md)
**Estimated Completion Date**: TBD
