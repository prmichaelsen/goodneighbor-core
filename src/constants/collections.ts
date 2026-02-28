// src/constants/collections.ts
// Firestore collection path constants for goodneighbor

/**
 * Firestore collection path constants for goodneighbor.
 * All 27 goodneighbor-scoped collections, grouped by category.
 *
 * Cleanbook collections are intentionally excluded:
 * - No clean appointment collections
 * - No Guesty integration collections
 * - No Mellow integration collections
 * - No daily digest collections
 * - No property management collections
 */
export const COLLECTIONS = {
  // -- Profile (4) --
  /** Public profile data (displayName, username, bio, avatarUrl, etc.) */
  PUBLIC_PROFILES: 'goodneighbor/collections/public-profiles',
  /** Private profile data (email, phone, preferences) */
  PRIVATE_PROFILES: 'goodneighbor/collections/private-profiles',
  /** Profile board widget configurations */
  PROFILE_BOARDS: 'goodneighbor/collections/profile-boards',
  /** Base user records */
  USERS: 'goodneighbor/collections/users',

  // -- Auth (2) --
  /** Password reset tokens */
  PASSWORD_RESETS: 'goodneighbor/collections/password-resets',
  /** Email verification tokens */
  EMAIL_VERIFICATIONS: 'goodneighbor/collections/email-verifications',

  // -- Content (4) --
  /** Unified search collection (all content entities: posts, feeds, comments, submissions) */
  SEARCH: 'goodneighbor.search',
  /** Mapping from DB document IDs to search entity IDs */
  SEARCH_DB_ID_MAPPINGS: 'goodneighbor/collections/search-id-mappings',
  /** Comments on posts */
  POST_COMMENTS: 'goodneighbor/collections/post-comments',
  /** Replies to comments */
  COMMENT_REPLIES: 'goodneighbor/collections/comment-replies',

  // -- Relationships (4) --
  /** Feed submission records (post submitted to feed for moderation) */
  FEED_SUBMISSIONS: 'goodneighbor/collections/feed-submissions',
  /** Feed follower records */
  FEED_FOLLOWERS: 'goodneighbor/collections/feed-followers',
  /** Feed moderator records */
  FEED_MODERATORS: 'goodneighbor/collections/feed-moderators',
  /** User vote records (likes, upvotes, etc.) */
  USER_VOTES: 'goodneighbor/collections/user-votes',

  // -- Store (5) --
  /** Product listings */
  PRODUCTS: 'goodneighbor/collections/products',
  /** Store configuration and settings */
  STORE_SETTINGS: 'goodneighbor/collections/store-settings',
  /** Order records */
  ORDERS: 'goodneighbor/collections/orders',
  /** Shopping cart records */
  CARTS: 'goodneighbor/collections/carts',
  /** User shipping/billing addresses */
  ADDRESSES: 'goodneighbor/collections/addresses',

  // -- System (8) --
  /** Application-wide settings */
  SYSTEM_SETTINGS: 'goodneighbor/collections/system-settings',
  /** Webhook event logs */
  WEBHOOK_EVENTS: 'goodneighbor/collections/webhook-events',
  /** Debug email captures (for testing email sending) */
  DEBUG_EMAILS: 'goodneighbor/collections/debug-emails',
  /** Chat session records */
  CHAT_SESSIONS: 'goodneighbor/collections/chat-sessions',
  /** Chat message records */
  CHAT_MESSAGES: 'goodneighbor/collections/chat-messages',
  /** Waitlist invitation codes */
  WAITLIST_CODES: 'goodneighbor/collections/waitlist-codes',
  /** Editor content and draft storage */
  EDITOR: 'goodneighbor/collections/editor',
} as const;

/**
 * Type for any valid collection path.
 * Useful for functions that accept a collection name parameter.
 */
export type CollectionPath = typeof COLLECTIONS[keyof typeof COLLECTIONS];

/**
 * Category groupings for documentation and tooling.
 */
export const COLLECTION_CATEGORIES = {
  PROFILE: [
    COLLECTIONS.PUBLIC_PROFILES,
    COLLECTIONS.PRIVATE_PROFILES,
    COLLECTIONS.PROFILE_BOARDS,
    COLLECTIONS.USERS,
  ],
  AUTH: [
    COLLECTIONS.PASSWORD_RESETS,
    COLLECTIONS.EMAIL_VERIFICATIONS,
  ],
  CONTENT: [
    COLLECTIONS.SEARCH,
    COLLECTIONS.SEARCH_DB_ID_MAPPINGS,
    COLLECTIONS.POST_COMMENTS,
    COLLECTIONS.COMMENT_REPLIES,
  ],
  RELATIONSHIPS: [
    COLLECTIONS.FEED_SUBMISSIONS,
    COLLECTIONS.FEED_FOLLOWERS,
    COLLECTIONS.FEED_MODERATORS,
    COLLECTIONS.USER_VOTES,
  ],
  STORE: [
    COLLECTIONS.PRODUCTS,
    COLLECTIONS.STORE_SETTINGS,
    COLLECTIONS.ORDERS,
    COLLECTIONS.CARTS,
    COLLECTIONS.ADDRESSES,
  ],
  SYSTEM: [
    COLLECTIONS.SYSTEM_SETTINGS,
    COLLECTIONS.WEBHOOK_EVENTS,
    COLLECTIONS.DEBUG_EMAILS,
    COLLECTIONS.CHAT_SESSIONS,
    COLLECTIONS.CHAT_MESSAGES,
    COLLECTIONS.WAITLIST_CODES,
    COLLECTIONS.EDITOR,
  ],
} as const;
