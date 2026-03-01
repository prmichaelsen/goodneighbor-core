// src/services/feed.service.ts
// FeedService handles feed lifecycle, follow/unfollow, and submissions.

import type { Result } from '../types/result.types';
import { ok, err } from '../types/result.types';
import type { CreateFeedDto } from '../types/feed.types';
import type { DbFeed, DbFeedSubmission } from '../types/content-entity.types';
import { NotFoundError, ForbiddenError, ExternalServiceError } from '../errors/app-errors';
import { createFeedEntity } from '../lib/creators/feed-creators';
import { COLLECTIONS } from '../constants/collections';
import type { ISearchService } from './search.service';
import {
  setDocument,
  getDocument,
  updateDocument,
  FieldValue,
} from '@prmichaelsen/firebase-admin-sdk-v8';

export interface FeedServiceDeps {
  searchService: ISearchService;
  logger?: {
    error(message: string, context?: Record<string, unknown>): void;
  };
}

export class FeedService {
  private searchService: ISearchService;
  private logger: FeedServiceDeps['logger'];

  constructor(deps: FeedServiceDeps) {
    this.searchService = deps.searchService;
    this.logger = deps.logger;
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

  async followFeed(
    feedId: string,
    userId: string,
  ): Promise<Result<void, NotFoundError | ExternalServiceError>> {
    try {
      const doc = await getDocument(COLLECTIONS.SEARCH, feedId);
      if (!doc) {
        return err(new NotFoundError('Feed', feedId));
      }

      const userSemId = `@uid:${userId}`;
      await updateDocument(COLLECTIONS.SEARCH, feedId, {
        'refs.hasFollower': FieldValue.arrayUnion(userSemId),
        'stats.followers': FieldValue.increment(1),
      });
      return ok(undefined);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Firestore update failed';
      return err(new ExternalServiceError('Firestore', message));
    }
  }

  async unfollowFeed(
    feedId: string,
    userId: string,
  ): Promise<Result<void, NotFoundError | ExternalServiceError>> {
    try {
      const doc = await getDocument(COLLECTIONS.SEARCH, feedId);
      if (!doc) {
        return err(new NotFoundError('Feed', feedId));
      }

      const userSemId = `@uid:${userId}`;
      await updateDocument(COLLECTIONS.SEARCH, feedId, {
        'refs.hasFollower': FieldValue.arrayRemove(userSemId),
        'stats.followers': FieldValue.increment(-1),
      });
      return ok(undefined);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Firestore update failed';
      return err(new ExternalServiceError('Firestore', message));
    }
  }

  async submitToFeed(
    feedId: string,
    postId: string,
    userId: string,
  ): Promise<Result<DbFeedSubmission, NotFoundError | ForbiddenError | ExternalServiceError>> {
    try {
      const doc = await getDocument(COLLECTIONS.SEARCH, feedId);
      if (!doc) {
        return err(new NotFoundError('Feed', feedId));
      }

      const feed = doc as unknown as DbFeed;
      if (feed.type !== 'feed') {
        return err(new NotFoundError('Feed', feedId));
      }

      const userSemId = `@uid:${userId}`;
      const hasPermission =
        feed.refs.hasSubmitPermissions.includes('@public') ||
        feed.refs.hasSubmitPermissions.includes(userSemId);

      if (!hasPermission) {
        return err(new ForbiddenError('User does not have submit permissions for this feed'));
      }

      const submissionId = crypto.randomUUID();
      const now = new Date().toISOString();

      const submission: DbFeedSubmission = {
        id: submissionId,
        type: 'feed_submission',
        name: '',
        feedId,
        postId,
        createdBy: userSemId,
        status: 'pending',
        submittedAt: now,
      };

      await setDocument(COLLECTIONS.FEED_SUBMISSIONS, submissionId, submission as Record<string, any>);

      // Update feed refs with submission
      await updateDocument(COLLECTIONS.SEARCH, feedId, {
        'refs.hasSubmission': FieldValue.arrayUnion(submissionId),
      });

      return ok(submission);
    } catch (error) {
      if (error instanceof Error && (error as any).kind) {
        throw error; // Re-throw app errors
      }
      const message = error instanceof Error ? error.message : 'Firestore write failed';
      return err(new ExternalServiceError('Firestore', message));
    }
  }
}
