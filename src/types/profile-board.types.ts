// src/types/profile-board.types.ts

/**
 * Profile board system.
 * Each user has a customizable profile board composed of typed widgets.
 */

export interface ProfileBoard {
  uid: string;
  widgets: BoardWidget[];
  layout: BoardLayout;
  updatedAt: string;
}

export interface BoardLayout {
  columns: number;
  gap: number;
}

/**
 * Widget type discriminator.
 * Each widget type has its own configuration interface.
 */
export type WidgetType =
  | 'bio'
  | 'links'
  | 'image_gallery'
  | 'featured_post'
  | 'pinned_posts'
  | 'recent_activity'
  | 'followers'
  | 'following'
  | 'feeds'
  | 'badges'
  | 'stats'
  | 'location_map'
  | 'custom_html'
  | 'social_links'
  | 'skills'
  | 'availability'
  | 'contact_form';

export interface BaseWidget {
  id: string;
  type: WidgetType;
  title: string;
  visible: boolean;
  order: number;
  config: WidgetConfig;
}

/**
 * Union of all widget configuration types.
 */
export type WidgetConfig =
  | BioWidgetConfig
  | LinksWidgetConfig
  | ImageGalleryWidgetConfig
  | FeaturedPostWidgetConfig
  | PinnedPostsWidgetConfig
  | RecentActivityWidgetConfig
  | FollowersWidgetConfig
  | FollowingWidgetConfig
  | FeedsWidgetConfig
  | BadgesWidgetConfig
  | StatsWidgetConfig
  | LocationMapWidgetConfig
  | CustomHtmlWidgetConfig
  | SocialLinksWidgetConfig
  | SkillsWidgetConfig
  | AvailabilityWidgetConfig
  | ContactFormWidgetConfig;

export type BoardWidget = BaseWidget;

// -- Widget Configuration Types (17 total) --

export interface BioWidgetConfig {
  maxLength?: number;
  showAvatar?: boolean;
}

export interface LinksWidgetConfig {
  maxLinks?: number;
  links: Array<{ label: string; url: string; icon?: string }>;
}

export interface ImageGalleryWidgetConfig {
  maxImages?: number;
  layout: 'grid' | 'carousel' | 'masonry';
  images: Array<{ url: string; caption?: string }>;
}

export interface FeaturedPostWidgetConfig {
  postId: string;
  showPreview: boolean;
}

export interface PinnedPostsWidgetConfig {
  maxPosts: number;
  postIds: string[];
}

export interface RecentActivityWidgetConfig {
  maxItems: number;
  activityTypes: string[];
}

export interface FollowersWidgetConfig {
  maxDisplay: number;
  showCount: boolean;
}

export interface FollowingWidgetConfig {
  maxDisplay: number;
  showCount: boolean;
}

export interface FeedsWidgetConfig {
  maxDisplay: number;
  feedIds: string[];
}

export interface BadgesWidgetConfig {
  showAll: boolean;
  badgeIds: string[];
}

export interface StatsWidgetConfig {
  metrics: string[];
  showChart: boolean;
}

export interface LocationMapWidgetConfig {
  showMap: boolean;
  zoomLevel: number;
}

export interface CustomHtmlWidgetConfig {
  html: string;
  sanitize: boolean;
}

export interface SocialLinksWidgetConfig {
  platforms: Array<{ platform: string; url: string }>;
}

export interface SkillsWidgetConfig {
  skills: Array<{ name: string; level?: number }>;
  maxDisplay: number;
}

export interface AvailabilityWidgetConfig {
  status: 'available' | 'busy' | 'away' | 'offline';
  message?: string;
  schedule?: Record<string, { start: string; end: string }>;
}

export interface ContactFormWidgetConfig {
  fields: Array<{ name: string; type: 'text' | 'email' | 'textarea'; required: boolean }>;
  recipientEmail: string;
}
