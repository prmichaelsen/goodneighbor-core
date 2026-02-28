import {
  extractHashtags,
  extractMentions,
  extractUrls,
  categorizePost,
  validatePostContent,
  processPostContent,
} from './content-processing';

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

  it('should return empty array for whitespace-only input', () => {
    expect(extractHashtags('   ')).toEqual([]);
  });

  it('should return empty array for text without hashtags', () => {
    expect(extractHashtags('just some regular text')).toEqual([]);
  });

  it('should handle hashtags at start of line', () => {
    expect(extractHashtags('#first word')).toEqual(['first']);
  });

  it('should handle multiple hashtags in a row', () => {
    expect(extractHashtags('#one #two #three')).toEqual(['one', 'two', 'three']);
  });
});

describe('extractMentions', () => {
  it('should extract simple mentions', () => {
    expect(extractMentions('@alice @bob')).toEqual(['alice', 'bob']);
  });

  it('should deduplicate mentions', () => {
    expect(extractMentions('@alice @alice')).toEqual(['alice']);
  });

  it('should preserve original casing', () => {
    expect(extractMentions('@Alice @BOB')).toEqual(['Alice', 'BOB']);
  });

  it('should return empty array for empty input', () => {
    expect(extractMentions('')).toEqual([]);
  });

  it('should return empty array for whitespace-only input', () => {
    expect(extractMentions('   ')).toEqual([]);
  });

  it('should not match email addresses', () => {
    expect(extractMentions('email user@example.com')).toEqual([]);
  });

  it('should handle mentions at start of text', () => {
    expect(extractMentions('@alice said hello')).toEqual(['alice']);
  });

  it('should handle hyphenated usernames', () => {
    expect(extractMentions('@jane-doe')).toEqual(['jane-doe']);
  });
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

  it('should strip trailing period', () => {
    expect(extractUrls('visit https://example.com.')).toEqual(['https://example.com']);
  });

  it('should strip trailing comma', () => {
    expect(extractUrls('see https://example.com, then')).toEqual(['https://example.com']);
  });

  it('should handle URLs with paths', () => {
    expect(extractUrls('https://example.com/path/to/page')).toEqual(['https://example.com/path/to/page']);
  });

  it('should handle URLs with query params', () => {
    expect(extractUrls('https://example.com?q=test&page=1')).toEqual(['https://example.com?q=test&page=1']);
  });

  it('should return empty array for empty input', () => {
    expect(extractUrls('')).toEqual([]);
  });

  it('should return empty array for whitespace-only input', () => {
    expect(extractUrls('   ')).toEqual([]);
  });

  it('should deduplicate URLs', () => {
    expect(extractUrls('https://a.com https://a.com')).toEqual(['https://a.com']);
  });
});

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
      media: Array(11).fill({ url: 'https://example.com/image.jpg', type: 'image' }),
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

  it('should trim content in validated result', () => {
    const result = validatePostContent({
      title: 'Test',
      content: '  Hello world  ',
      isPublic: true,
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.content).toBe('Hello world');
    }
  });
});

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
