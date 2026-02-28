// src/services/search.service.ts
// SearchService wraps Algolia with permission filtering, Result-based errors,
// and non-blocking indexing.

import type { Result } from '../types/result.types';
import { ok, err } from '../types/result.types';
import type { AlgoliaSearchParams, SearchResponse } from '../types/search.types';
import { ExternalServiceError } from '../errors/app-errors';
import { AlgoliaFilters } from '../lib/algolia-filters';
import { ALGOLIA_INDEX_SETTINGS } from '../lib/algolia-index-settings';

/**
 * Default attributes always retrieved in search results.
 */
export const DEFAULT_ATTRIBUTES_TO_RETRIEVE = [
  'id', 'name', 'objectID', 'type', 'subtype', 'title',
  'search', 'refs', 'tags', 'authorId', 'author',
  'timestamps.createdAt', 'timestamps.updatedAt',
  'stats.likers', 'stats.comments', 'stats.sharers',
  'stats.views', 'stats.followers',
  'properties.displayName', 'properties.mainContent',
  'properties.tags', 'properties.mentions',
];

export interface ISearchService {
  search(
    params: AlgoliaSearchParams,
    userId?: string,
  ): Promise<Result<SearchResponse, ExternalServiceError>>;

  indexDocument(
    document: Record<string, unknown>,
    objectID: string,
  ): Promise<Result<void, ExternalServiceError>>;

  indexDocuments(
    documents: Array<Record<string, unknown> & { objectID: string }>,
  ): Promise<Result<void, ExternalServiceError>>;

  updateDocument(
    objectID: string,
    updates: Record<string, unknown>,
  ): Promise<Result<void, ExternalServiceError>>;

  deleteDocument(
    objectID: string,
  ): Promise<Result<void, ExternalServiceError>>;

  deleteDocuments(
    objectIDs: string[],
  ): Promise<Result<void, ExternalServiceError>>;

  initializeIndex(): Promise<Result<void, ExternalServiceError>>;
}

export interface SearchServiceDependencies {
  /** Algolia search client (read-only queries) */
  searchClient: {
    searchSingleIndex(params: { indexName: string; searchParams?: Record<string, unknown> }): Promise<Record<string, unknown>>;
  };
  /** Algolia admin client (index management, write operations) */
  adminClient: {
    saveObject(params: { indexName: string; body: Record<string, unknown> }): Promise<unknown>;
    saveObjects(params: { indexName: string; objects: Array<Record<string, unknown>> }): Promise<unknown>;
    partialUpdateObject(params: { indexName: string; objectID: string; attributesToUpdate: Record<string, unknown> }): Promise<unknown>;
    deleteObject(params: { indexName: string; objectID: string }): Promise<unknown>;
    deleteObjects(params: { indexName: string; objectIDs: string[] }): Promise<unknown>;
    setSettings(params: { indexName: string; indexSettings: Record<string, unknown> }): Promise<unknown>;
  };
  indexName: string;
  logger?: {
    error(message: string, context?: Record<string, unknown>): void;
    warn(message: string, context?: Record<string, unknown>): void;
  };
}

export class SearchService implements ISearchService {
  private searchClient: SearchServiceDependencies['searchClient'];
  private adminClient: SearchServiceDependencies['adminClient'];
  private indexName: string;
  private logger: SearchServiceDependencies['logger'];

  constructor(deps: SearchServiceDependencies) {
    this.searchClient = deps.searchClient;
    this.adminClient = deps.adminClient;
    this.indexName = deps.indexName;
    this.logger = deps.logger;
  }

  async search(
    params: AlgoliaSearchParams,
    userId?: string,
  ): Promise<Result<SearchResponse, ExternalServiceError>> {
    try {
      const attributesToRetrieve = [
        ...new Set([
          ...DEFAULT_ATTRIBUTES_TO_RETRIEVE,
          ...(params.attributesToRetrieve || []),
        ]),
      ];

      let filterBuilder: AlgoliaFilters;
      if (params.filters) {
        filterBuilder = AlgoliaFilters.fromString(params.filters);
      } else {
        filterBuilder = AlgoliaFilters.create();
      }

      if (userId) {
        filterBuilder.addUserPermissions(userId);
      } else {
        filterBuilder.addAnd('refs.hasViewer:"@public"');
      }

      const filters = filterBuilder.getFilter();

      const searchParams: Record<string, unknown> = {
        ...params,
        query: undefined,
        filters,
        attributesToRetrieve,
      };

      const response = await this.searchClient.searchSingleIndex({
        indexName: this.indexName,
        searchParams: { ...searchParams, query: params.query },
      }) as Record<string, unknown>;

      return ok({
        hits: (response.hits as SearchResponse['hits']) || [],
        nbHits: (response.nbHits as number) || 0,
        page: (response.page as number) || 0,
        nbPages: (response.nbPages as number) || 0,
        hitsPerPage: (response.hitsPerPage as number) || 20,
        processingTimeMS: (response.processingTimeMS as number) || 0,
        query: (response.query as string) || '',
        facets: response.facets as Record<string, Record<string, number>> | undefined,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown search error';
      return err(new ExternalServiceError('Algolia', `search failed: ${message}`));
    }
  }

  async indexDocument(
    document: Record<string, unknown>,
    objectID: string,
  ): Promise<Result<void, ExternalServiceError>> {
    try {
      await this.adminClient.saveObject({
        indexName: this.indexName,
        body: { ...document, objectID },
      });
      return ok(undefined);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown indexing error';
      this.logger?.error('Failed to index document', { objectID, error: message });
      return err(new ExternalServiceError('Algolia', `indexDocument failed: ${message}`));
    }
  }

  async indexDocuments(
    documents: Array<Record<string, unknown> & { objectID: string }>,
  ): Promise<Result<void, ExternalServiceError>> {
    try {
      await this.adminClient.saveObjects({
        indexName: this.indexName,
        objects: documents,
      });
      return ok(undefined);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown batch indexing error';
      this.logger?.error('Failed to batch index documents', {
        count: documents.length,
        error: message,
      });
      return err(new ExternalServiceError('Algolia', `indexDocuments failed: ${message}`));
    }
  }

  async updateDocument(
    objectID: string,
    updates: Record<string, unknown>,
  ): Promise<Result<void, ExternalServiceError>> {
    try {
      await this.adminClient.partialUpdateObject({
        indexName: this.indexName,
        objectID,
        attributesToUpdate: updates,
      });
      return ok(undefined);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown update error';
      this.logger?.error('Failed to update document', { objectID, error: message });
      return err(new ExternalServiceError('Algolia', `updateDocument failed: ${message}`));
    }
  }

  async deleteDocument(
    objectID: string,
  ): Promise<Result<void, ExternalServiceError>> {
    try {
      await this.adminClient.deleteObject({
        indexName: this.indexName,
        objectID,
      });
      return ok(undefined);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown deletion error';
      this.logger?.error('Failed to delete document', { objectID, error: message });
      return err(new ExternalServiceError('Algolia', `deleteDocument failed: ${message}`));
    }
  }

  async deleteDocuments(
    objectIDs: string[],
  ): Promise<Result<void, ExternalServiceError>> {
    try {
      await this.adminClient.deleteObjects({
        indexName: this.indexName,
        objectIDs,
      });
      return ok(undefined);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown batch deletion error';
      this.logger?.error('Failed to batch delete documents', {
        count: objectIDs.length,
        error: message,
      });
      return err(new ExternalServiceError('Algolia', `deleteDocuments failed: ${message}`));
    }
  }

  async initializeIndex(): Promise<Result<void, ExternalServiceError>> {
    try {
      await this.adminClient.setSettings({
        indexName: this.indexName,
        indexSettings: { ...ALGOLIA_INDEX_SETTINGS },
      });
      return ok(undefined);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown configuration error';
      this.logger?.error('Failed to initialize Algolia index', {
        indexName: this.indexName,
        error: message,
      });
      return err(new ExternalServiceError('Algolia', `initializeIndex failed: ${message}`));
    }
  }
}
