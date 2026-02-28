// src/types/pagination.types.ts

/**
 * Options for paginated queries.
 */
export interface PaginationOptions {
  page?: number;
  limit?: number;
  cursor?: string;
  sortBy?: string;
  sortDirection?: 'asc' | 'desc';
}

/**
 * Paginated result wrapper.
 * Generic over the item type T.
 */
export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  nextCursor?: string;
}

/**
 * Default pagination values.
 */
export const DEFAULT_PAGE = 1;
export const DEFAULT_LIMIT = 20;
export const MAX_LIMIT = 100;
