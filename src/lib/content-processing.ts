// src/lib/content-processing.ts
// Content extraction, categorization, validation, and processing pipeline.

/**
 * Extract hashtags from text content.
 * Matches #word patterns, excluding markdown headers (##).
 * Returns deduplicated lowercase hashtag strings without the # prefix.
 */
export function extractHashtags(text: string): string[] {
  if (!text || text.trim().length === 0) {
    return [];
  }
  // Match #word but not ##word (markdown headers)
  const regex = /(?<![#\w])#([\w][\w-]*)/g;
  const matches: string[] = [];
  let match: RegExpExecArray | null;
  while ((match = regex.exec(text)) !== null) {
    matches.push(match[1].toLowerCase());
  }
  return [...new Set(matches)];
}

/**
 * Extract @mentions from text content.
 * Matches @word patterns, excluding email addresses.
 * Returns deduplicated mention strings without the @ prefix.
 */
export function extractMentions(text: string): string[] {
  if (!text || text.trim().length === 0) {
    return [];
  }
  const regex = /(?<!\w)@([\w][\w-]*)/g;
  const matches: string[] = [];
  let match: RegExpExecArray | null;
  while ((match = regex.exec(text)) !== null) {
    matches.push(match[1]);
  }
  return [...new Set(matches)];
}

/**
 * Extract URLs from text content.
 * Matches http://, https://, and www. patterns.
 * Returns deduplicated URL strings.
 */
export function extractUrls(text: string): string[] {
  if (!text || text.trim().length === 0) {
    return [];
  }
  const regex = /(?:https?:\/\/|www\.)[^\s<>"')\]]+/gi;
  const matches: string[] = [];
  let match: RegExpExecArray | null;
  while ((match = regex.exec(text)) !== null) {
    const url = match[0].replace(/[.,;:!?)]+$/, '');
    matches.push(url);
  }
  return [...new Set(matches)];
}
