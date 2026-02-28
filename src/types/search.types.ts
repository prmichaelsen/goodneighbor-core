// src/types/search.types.ts

import { SearchEntityType } from './content-entity.types';

/**
 * Parameters for an Algolia search query.
 * Maps to Algolia's SearchParams with goodneighbor-specific filters.
 */
export interface AlgoliaSearchParams {
  query: string;
  page?: number;
  hitsPerPage?: number;
  filters?: string;
  facetFilters?: string[][];
  attributesToRetrieve?: string[];
  attributesToHighlight?: string[];
  highlightPreTag?: string;
  highlightPostTag?: string;
  aroundLatLng?: string;
  aroundRadius?: number;
  typoTolerance?: boolean | 'min' | 'strict';
}

/**
 * Search response wrapper.
 */
export interface SearchResponse<T = SearchResultItem> {
  hits: T[];
  nbHits: number;
  page: number;
  nbPages: number;
  hitsPerPage: number;
  processingTimeMS: number;
  query: string;
  facets?: Record<string, Record<string, number>>;
}

/**
 * Individual search result hit.
 */
export interface SearchResultItem {
  objectID: string;
  type: SearchEntityType;
  name: string;
  search: string;
  isPublic: boolean;
  timestamps: {
    createdAt: string;
    updatedAt: string;
  };
  _highlightResult?: Record<string, HighlightResult>;
}

export interface HighlightResult {
  value: string;
  matchLevel: 'none' | 'partial' | 'full';
  matchedWords: string[];
}

/**
 * Goodneighbor-specific search filter options.
 * Used to build Algolia facetFilters from user context and query params.
 */
export interface SearchFilterOptions {
  userId?: string;
  entityTypes?: SearchEntityType[];
  tags?: string[];
  isPublic?: boolean;
  feedId?: string;
}
