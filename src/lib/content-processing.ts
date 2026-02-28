// src/lib/content-processing.ts
// Content extraction, categorization, validation, and processing pipeline.

import type { Result } from '../types/result.types';
import { ok, err } from '../types/result.types';
import { ValidationError } from '../errors/app-errors';
import type { CreatePostDto } from '../types/post.types';

// ─── Types ──────────────────────────────────────────────────────────────────

export type PostCategory = 'safety' | 'events' | 'recommendations' | 'lost_found' | 'general';

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
  media?: CreatePostDto['media'];
}

// ─── Constants ──────────────────────────────────────────────────────────────

export const MAX_CONTENT_LENGTH = 10000;
export const MAX_TITLE_LENGTH = 200;
export const MAX_MEDIA_ITEMS = 10;

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

// ─── Categorization ─────────────────────────────────────────────────────────

const CATEGORY_KEYWORDS: Record<Exclude<PostCategory, 'general'>, string[]> = {
  safety: [
    'safety', 'alert', 'warning', 'danger', 'crime', 'suspicious',
    'emergency', 'theft', 'break-in', 'break in', 'stolen', 'robbery',
    'fire', 'flood', 'evacuation', 'scam', 'fraud',
  ],
  events: [
    'event', 'meetup', 'meet up', 'gathering', 'party', 'festival',
    'concert', 'workshop', 'seminar', 'class', 'meeting', 'potluck',
    'block party', 'open house', 'yard sale', 'garage sale',
  ],
  recommendations: [
    'recommend', 'recommendation', 'suggest', 'suggestion',
    'best', 'favorite', 'favourite', 'looking for', 'anyone know',
    'plumber', 'electrician', 'contractor', 'restaurant', 'dentist',
    'mechanic', 'landscaper', 'babysitter', 'tutor',
  ],
  lost_found: [
    'lost', 'found', 'missing', 'reward', 'last seen',
    'lost dog', 'lost cat', 'lost pet', 'found dog', 'found cat',
    'found pet', 'missing person', 'have you seen',
  ],
};

/**
 * Categorize post content based on keyword matching.
 * Returns "general" if no category keywords are matched.
 */
export function categorizePost(content: string): PostCategory {
  if (!content || content.trim().length === 0) {
    return 'general';
  }

  const lowerContent = content.toLowerCase();

  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    for (const keyword of keywords) {
      if (lowerContent.includes(keyword)) {
        return category as PostCategory;
      }
    }
  }

  return 'general';
}

// ─── Validation ─────────────────────────────────────────────────────────────

/**
 * Validate a post creation DTO against business rules.
 * Returns Result<ValidatedPost, ValidationError>.
 */
export function validatePostContent(dto: CreatePostDto): Result<ValidatedPost, ValidationError> {
  if (!dto.content || dto.content.trim().length === 0) {
    return err(new ValidationError('Post content is required'));
  }

  if (dto.content.length > MAX_CONTENT_LENGTH) {
    return err(new ValidationError(
      `Post content exceeds maximum length of ${MAX_CONTENT_LENGTH} characters`,
    ));
  }

  if (dto.title && dto.title.length > MAX_TITLE_LENGTH) {
    return err(new ValidationError(
      `Post title exceeds maximum length of ${MAX_TITLE_LENGTH} characters`,
    ));
  }

  if (dto.media && dto.media.length > MAX_MEDIA_ITEMS) {
    return err(new ValidationError(
      `Post exceeds maximum of ${MAX_MEDIA_ITEMS} media items`,
    ));
  }

  return ok({
    title: dto.title || '',
    content: dto.content.trim(),
    isPublic: dto.isPublic ?? true,
    media: dto.media,
  });
}

// ─── Pipeline ───────────────────────────────────────────────────────────────

/**
 * Process post content through the full extraction and categorization pipeline.
 * Extracts hashtags, mentions, and URLs, then categorizes the content.
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
