// src/types/content-entity.types.ts
// Three-tier refs hierarchy, entity interfaces, and supporting types

import { Timestamps } from './utils.types';

// ─── Type Discriminators ─────────────────────────────────────────────────

/**
 * Search entity type discriminator.
 * Identifies the kind of entity stored in the goodneighbor.search collection.
 */
export type SearchEntityType = 'post' | 'feed' | 'comment' | 'feed_submission';

/**
 * Feed subtype discriminator.
 */
export type FeedSubtype = 'user' | 'feed' | 'dynamic' | 'list' | 'board';

/**
 * Feed submission status.
 */
export type FeedSubmissionStatus = 'pending' | 'approved' | 'rejected' | 'auto_approved';

// ─── Refs Hierarchy ──────────────────────────────────────────────────────

/**
 * Base refs for any searchable entity.
 * Controls ownership, visibility, and permission grants.
 * All user-scoped values use the @uid:{firebaseUid} format.
 * The @public token grants visibility to all users.
 *
 * 6 arrays total.
 */
export interface SearchEntityRefs {
  hasOwner: string[];
  hasViewer: string[];
  hasEditPermissions: string[];
  hasArchivePermissions: string[];
  hasUpdateViewersPermissions: string[];
  hasConfigurePropertiesPermissions: string[];
}

/**
 * Refs for content entities (posts, comments, reviews).
 * Extends SearchEntityRefs with social interaction and content association arrays.
 *
 * Adds 23 arrays on top of SearchEntityRefs (6), for 29 total.
 */
export interface ContentEntityRefs extends SearchEntityRefs {
  hasFollower: string[];
  hasSharer: string[];
  hasTag: string[];
  hasMention: string[];
  hasLiker: string[];
  hasSecretLiker: string[];
  hasAnonymousLiker: string[];
  hasReviewer: string[];
  hasCreator: string[];
  hasBeenViewedBy: string[];
  hasFlair: string[];
  hasSupporter: string[];
  hasComments: string[];
  hasCommenter: string[];
  hasQuote: string[];
  hasQuoter: string[];
  hasAnnotation: string[];
  hasAnnotator: string[];
  hasRepost: string[];
  hasReposter: string[];
  hasAuthor: string[];
  hasCollaborator: string[];
  hasRelated: string[];
}

/**
 * Refs for feed entities.
 * Extends ContentEntityRefs with moderation, membership, and submission arrays.
 *
 * Adds 7 arrays on top of ContentEntityRefs (29), for 36 total.
 */
export interface FeedEntityRefs extends ContentEntityRefs {
  hasModerator: string[];
  hasMember: string[];
  hasApprover: string[];
  hasSubmitPermissions: string[];
  hasConfigureBehaviorPermissions: string[];
  hasSubmission: string[];
  hasRejected: string[];
}

// ─── Entity Interfaces ───────────────────────────────────────────────────

/**
 * Base entity stored in the goodneighbor.search Firestore collection.
 * All searchable entities share this minimal shape.
 */
export interface SearchEntity {
  id: string;
  type: SearchEntityType;
  name: string;
}

/**
 * Content entity properties common to posts, feeds, and other content types.
 */
export interface ContentEntityProperties {
  displayName: string;
  mainContent: string;
  tags: string[];
  mentions: string[];
}

/**
 * Statistics counters for a content entity.
 * Updated atomically via Firestore increment operations.
 */
export interface EntityStats {
  viewers: number;
  followers: number;
  sharers: number;
  likers: number;
  comments: number;
  views: number;
  reposts: number;
  quotes: number;
  annotations: number;
  tags: number;
}

/**
 * Full content entity with refs, stats, properties, and metadata.
 * Extends SearchEntity with the full content model.
 */
export interface ContentEntity extends SearchEntity {
  search: string;
  refs: ContentEntityRefs;
  isPublic: boolean;
  isPublished: boolean;
  timestamps: Timestamps;
  metadata: Record<string, any>;
  stats: EntityStats;
  properties: ContentEntityProperties;
}

// ─── Concrete Entity Types ───────────────────────────────────────────────

/**
 * Post entity as stored in Firestore.
 * Type discriminator is "post".
 */
export interface DbPost extends ContentEntity {
  type: 'post';
}

/**
 * Feed-specific content properties.
 */
export interface FeedProperties extends ContentEntityProperties {
  rules: string[];
}

/**
 * Feed behavior configuration.
 * Controls how content is submitted, approved, and aggregated within a feed.
 */
export interface FeedBehavior {
  submissionModels: string[];
  approvalModels: string[];
  aggregationRules?: AggregationRule[];
  ownershipModels: string[];
  automatedRules: string[];
  contentModel: string[];
  flair: string[];
}

/**
 * Aggregation rule for feed content organization.
 */
export interface AggregationRule {
  [key: string]: any;
}

/**
 * Feed entity as stored in Firestore.
 * Type discriminator is "feed".
 * Uses FeedEntityRefs (the most permissive refs tier) for moderation support.
 */
export interface DbFeed extends ContentEntity {
  type: 'feed';
  subtype: FeedSubtype;
  parentFeed?: string;
  childrenFeeds: string[];
  refs: FeedEntityRefs;
  properties: FeedProperties;
  behavior: FeedBehavior;
}

/**
 * Feed submission entity as stored in Firestore.
 * Represents a post submitted to a feed for moderation review.
 * Type discriminator is "feed_submission".
 */
export interface DbFeedSubmission extends SearchEntity {
  type: 'feed_submission';
  feedId: string;
  postId: string;
  createdBy: string;
  status: FeedSubmissionStatus;
  submittedAt: string;
  reviewedAt?: string;
  reviewedBy?: string;
  autoApproveReason?: string;
  rejectionReason?: string;
}
