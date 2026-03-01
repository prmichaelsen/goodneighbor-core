// src/services/content.service.ts
// ContentService orchestrates content processing, Firestore persistence, and Algolia indexing.

import type { Result } from '../types/result.types';
import { ok, err } from '../types/result.types';
import type { CreatePostDto, PostViewModel } from '../types/post.types';
import type { CreateFeedDto, FeedViewModel } from '../types/feed.types';
import type { DbPost, DbFeed } from '../types/content-entity.types';
import { ValidationError, NotFoundError, ExternalServiceError } from '../errors/app-errors';
import { validatePostContent, processPostContent } from '../lib/content-processing';
import { createPostEntity } from '../lib/creators/post-creators';
import { createFeedEntity } from '../lib/creators/feed-creators';
import { mapDbPostToViewModel } from '../lib/mappers/post-mappers';
import type { UserContext } from '../lib/mappers/post-mappers';
import { mapDbFeedToViewModel } from '../lib/mappers/feed-mappers';
import { COLLECTIONS } from '../constants/collections';
import type { ISearchService } from './search.service';
import { setDocument, getDocument } from '@prmichaelsen/firebase-admin-sdk-v8';

export interface ContentServiceDeps {
  searchService: ISearchService;
  logger?: {
    error(message: string, context?: Record<string, unknown>): void;
  };
}

export class ContentService {
  private searchService: ISearchService;
  private logger: ContentServiceDeps['logger'];

  constructor(deps: ContentServiceDeps) {
    this.searchService = deps.searchService;
    this.logger = deps.logger;
  }

  async createPost(
    dto: CreatePostDto,
    userId: string,
  ): Promise<Result<DbPost, ValidationError | ExternalServiceError>> {
    const validationResult = validatePostContent(dto);
    if (!validationResult.ok) {
      return err(validationResult.error);
    }

    const processed = processPostContent(dto);
    const entity = createPostEntity(dto, userId, processed);
    const id = crypto.randomUUID();
    entity.id = id;

    try {
      await setDocument(COLLECTIONS.SEARCH, id, entity as Record<string, any>);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Firestore write failed';
      return err(new ExternalServiceError('Firestore', message));
    }

    // Non-blocking Algolia indexing
    this.searchService
      .indexDocument(entity as unknown as Record<string, unknown>, id)
      .catch((error) => {
        this.logger?.error('Non-blocking Algolia indexing failed', { id, error: String(error) });
      });

    return ok(entity);
  }

  async createFeed(
    dto: CreateFeedDto,
    userId: string,
  ): Promise<Result<DbFeed, ExternalServiceError>> {
    const entity = createFeedEntity(dto, userId);
    const id = crypto.randomUUID();
    entity.id = id;

    try {
      await setDocument(COLLECTIONS.SEARCH, id, entity as Record<string, any>);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Firestore write failed';
      return err(new ExternalServiceError('Firestore', message));
    }

    // Non-blocking Algolia indexing
    this.searchService
      .indexDocument(entity as unknown as Record<string, unknown>, id)
      .catch((error) => {
        this.logger?.error('Non-blocking Algolia indexing failed', { id, error: String(error) });
      });

    return ok(entity);
  }

  async getPost(postId: string): Promise<Result<DbPost, NotFoundError | ExternalServiceError>> {
    try {
      const doc = await getDocument(COLLECTIONS.SEARCH, postId);
      if (!doc) {
        return err(new NotFoundError('Post', postId));
      }
      const data = doc as unknown as DbPost;
      if (data.type !== 'post') {
        return err(new NotFoundError('Post', postId));
      }
      return ok({ ...data, id: postId });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Firestore read failed';
      return err(new ExternalServiceError('Firestore', message));
    }
  }

  async getFeed(feedId: string): Promise<Result<DbFeed, NotFoundError | ExternalServiceError>> {
    try {
      const doc = await getDocument(COLLECTIONS.SEARCH, feedId);
      if (!doc) {
        return err(new NotFoundError('Feed', feedId));
      }
      const data = doc as unknown as DbFeed;
      if (data.type !== 'feed') {
        return err(new NotFoundError('Feed', feedId));
      }
      return ok({ ...data, id: feedId });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Firestore read failed';
      return err(new ExternalServiceError('Firestore', message));
    }
  }

  mapPostToViewModel(dbPost: DbPost, userContext: UserContext | null): PostViewModel {
    return mapDbPostToViewModel(dbPost, userContext);
  }

  mapFeedToViewModel(dbFeed: DbFeed, userContext: UserContext | null): FeedViewModel {
    return mapDbFeedToViewModel(dbFeed, userContext);
  }
}
