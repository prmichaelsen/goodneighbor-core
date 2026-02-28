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
