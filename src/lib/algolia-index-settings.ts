// src/lib/algolia-index-settings.ts
// Algolia index configuration for the goodneighbor_search index.

export const ALGOLIA_INDEX_SETTINGS = {
  searchableAttributes: [
    'search',
    'properties.mainContent',
    'properties.displayName',
  ],

  attributesForFaceting: [
    'type',
    'name',
    'subtype',
    'parentId',
    'threadRootId',
    'refs.hasViewer',
    'refs.hasOwner',
    'refs.hasSubject',
    'refs.hasFollower',
    'refs.hasModerator',
    'refs.hasTag',
    'refs.hasMention',
    'refs.hasLiker',
    'isPublic',
  ],

  customRanking: [
    'desc(createdAt)',
    'desc(metrics.views)',
    'desc(followerCount)',
  ],

  attributesToRetrieve: [
    'id', 'name', 'type', 'subtype',
    'properties.content', 'properties.displayName',
    'createdAt', 'updatedAt',
    'stats', 'isPublic', '_geoloc',
  ],

  attributesToHighlight: [
    'search', 'name',
    'properties.mainContent',
    'properties.displayName',
  ],

  attributesToSnippet: [
    'content:50',
    'search:30',
  ],

  hitsPerPage: 20,
  maxValuesPerFacet: 100,

  typoTolerance: true as const,
  minWordSizefor1Typo: 4,
  minWordSizefor2Typos: 8,

  enableRules: true as const,
} as const;
