// src/services/profile.service.ts
// ProfileService handles public/private profile CRUD and profile board management.

import type { Result } from '../types/result.types';
import { ok, err } from '../types/result.types';
import type { PublicProfile, PrivateProfile, ProfileFormData } from '../types/profile.types';
import type { ProfileBoard, BoardLayout } from '../types/profile-board.types';
import { NotFoundError, ValidationError, ConflictError, ExternalServiceError } from '../errors/app-errors';
import { COLLECTIONS } from '../constants/collections';
import {
  setDocument,
  getDocument,
  updateDocument,
  queryDocuments,
} from '@prmichaelsen/firebase-admin-sdk-v8';

const USERNAME_REGEX = /^[a-zA-Z0-9_]{3,30}$/;

export interface ProfileServiceDeps {
  logger?: {
    error(message: string, context?: Record<string, unknown>): void;
  };
}

export class ProfileService {
  private logger: ProfileServiceDeps['logger'];

  constructor(deps: ProfileServiceDeps = {}) {
    this.logger = deps.logger;
  }

  async getPublicProfile(
    username: string,
  ): Promise<Result<PublicProfile, NotFoundError | ExternalServiceError>> {
    try {
      const results = await queryDocuments(COLLECTIONS.PUBLIC_PROFILES, {
        where: [{ field: 'username', op: '==', value: username }],
        limit: 1,
      });
      if (results.length === 0) {
        return err(new NotFoundError('PublicProfile', username));
      }
      return ok({ ...results[0].data, uid: results[0].id } as unknown as PublicProfile);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Firestore query failed';
      return err(new ExternalServiceError('Firestore', message));
    }
  }

  async getPublicProfileById(
    userId: string,
  ): Promise<Result<PublicProfile, NotFoundError | ExternalServiceError>> {
    try {
      const doc = await getDocument(COLLECTIONS.PUBLIC_PROFILES, userId);
      if (!doc) {
        return err(new NotFoundError('PublicProfile', userId));
      }
      return ok({ ...doc, uid: userId } as unknown as PublicProfile);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Firestore read failed';
      return err(new ExternalServiceError('Firestore', message));
    }
  }

  async updatePublicProfile(
    userId: string,
    data: ProfileFormData,
  ): Promise<Result<void, ValidationError | ExternalServiceError>> {
    if (data.username && !USERNAME_REGEX.test(data.username)) {
      return err(new ValidationError(
        'Username must be 3-30 alphanumeric characters or underscores',
        { username: ['invalid format'] },
      ));
    }

    try {
      const updates: Record<string, any> = { ...data, updatedAt: new Date().toISOString() };
      await updateDocument(COLLECTIONS.PUBLIC_PROFILES, userId, updates);
      return ok(undefined);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Firestore update failed';
      return err(new ExternalServiceError('Firestore', message));
    }
  }

  async getPrivateProfile(
    userId: string,
  ): Promise<Result<PrivateProfile, NotFoundError | ExternalServiceError>> {
    try {
      const doc = await getDocument(COLLECTIONS.PRIVATE_PROFILES, userId);
      if (!doc) {
        return err(new NotFoundError('PrivateProfile', userId));
      }
      return ok({ ...doc, uid: userId } as unknown as PrivateProfile);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Firestore read failed';
      return err(new ExternalServiceError('Firestore', message));
    }
  }

  async updatePrivateProfile(
    userId: string,
    data: Partial<PrivateProfile>,
  ): Promise<Result<void, ExternalServiceError>> {
    try {
      const updates: Record<string, any> = { ...data, updatedAt: new Date().toISOString() };
      delete updates.uid;
      await updateDocument(COLLECTIONS.PRIVATE_PROFILES, userId, updates);
      return ok(undefined);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Firestore update failed';
      return err(new ExternalServiceError('Firestore', message));
    }
  }

  async getProfileBoard(
    userId: string,
  ): Promise<Result<ProfileBoard, NotFoundError | ExternalServiceError>> {
    try {
      const doc = await getDocument(COLLECTIONS.PROFILE_BOARDS, userId);
      if (!doc) {
        return err(new NotFoundError('ProfileBoard', userId));
      }
      return ok({ ...doc, uid: userId } as unknown as ProfileBoard);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Firestore read failed';
      return err(new ExternalServiceError('Firestore', message));
    }
  }

  async createDefaultBoard(
    userId: string,
  ): Promise<Result<ProfileBoard, ConflictError | ExternalServiceError>> {
    try {
      const existing = await getDocument(COLLECTIONS.PROFILE_BOARDS, userId);
      if (existing) {
        return err(new ConflictError('Profile board already exists', { userId }));
      }

      const defaultBoard: ProfileBoard = {
        uid: userId,
        widgets: [],
        layout: { columns: 2, gap: 16 },
        updatedAt: new Date().toISOString(),
      };

      await setDocument(COLLECTIONS.PROFILE_BOARDS, userId, defaultBoard as Record<string, any>);
      return ok(defaultBoard);
    } catch (error) {
      if (error instanceof Error && error.message.includes('already exists')) {
        return err(new ConflictError('Profile board already exists', { userId }));
      }
      const message = error instanceof Error ? error.message : 'Firestore write failed';
      return err(new ExternalServiceError('Firestore', message));
    }
  }

  async updateBoard(
    userId: string,
    data: Partial<Pick<ProfileBoard, 'widgets' | 'layout'>>,
  ): Promise<Result<void, NotFoundError | ExternalServiceError>> {
    try {
      const existing = await getDocument(COLLECTIONS.PROFILE_BOARDS, userId);
      if (!existing) {
        return err(new NotFoundError('ProfileBoard', userId));
      }

      const updates: Record<string, any> = {
        ...data,
        updatedAt: new Date().toISOString(),
      };
      await updateDocument(COLLECTIONS.PROFILE_BOARDS, userId, updates);
      return ok(undefined);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Firestore update failed';
      return err(new ExternalServiceError('Firestore', message));
    }
  }

  async searchUsers(
    query: string,
    limit: number = 10,
  ): Promise<Result<PublicProfile[], ExternalServiceError>> {
    try {
      const [byUsername, byDisplayName] = await Promise.all([
        queryDocuments(COLLECTIONS.PUBLIC_PROFILES, {
          where: [
            { field: 'username', op: '>=', value: query },
            { field: 'username', op: '<=', value: query + '\uf8ff' },
          ],
          limit,
        }),
        queryDocuments(COLLECTIONS.PUBLIC_PROFILES, {
          where: [
            { field: 'displayName', op: '>=', value: query },
            { field: 'displayName', op: '<=', value: query + '\uf8ff' },
          ],
          limit,
        }),
      ]);

      // Deduplicate by ID
      const seen = new Set<string>();
      const profiles: PublicProfile[] = [];
      for (const result of [...byUsername, ...byDisplayName]) {
        if (!seen.has(result.id)) {
          seen.add(result.id);
          profiles.push({ ...result.data, uid: result.id } as unknown as PublicProfile);
        }
      }

      return ok(profiles.slice(0, limit));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Firestore query failed';
      return err(new ExternalServiceError('Firestore', message));
    }
  }
}
