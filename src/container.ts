// src/container.ts
// ServiceContainer with lazy singleton registration and typed resolution.

import type { GoodNeighborConfig } from './config/schema';
import { initializeFirebase } from './config/firebase';
import { createAlgoliaAdminClient, createAlgoliaSearchClient } from './config/algolia';
import { SearchService } from './services/search.service';
import { AuthService } from './services/auth.service';
import { ContentService } from './services/content.service';
import { ProfileService } from './services/profile.service';
import { FeedService } from './services/feed.service';
import { CommentService } from './services/comment.service';
import { NotificationService } from './services/notification.service';
import { translate, formatDate, hasKey, getKeys } from './i18n/utils';

export const SERVICE_NAMES = {
  AUTH: 'authService',
  CONTENT: 'contentService',
  SEARCH: 'searchService',
  PROFILE: 'profileService',
  FEED: 'feedService',
  COMMENT: 'commentService',
  NOTIFICATION: 'notificationService',
  I18N: 'i18nService',
} as const;

export type ServiceName = typeof SERVICE_NAMES[keyof typeof SERVICE_NAMES];

export interface I18nServiceInterface {
  translate: typeof translate;
  formatDate: typeof formatDate;
  hasKey: typeof hasKey;
  getKeys: typeof getKeys;
}

export interface ServiceMap {
  [SERVICE_NAMES.AUTH]: AuthService;
  [SERVICE_NAMES.CONTENT]: ContentService;
  [SERVICE_NAMES.SEARCH]: SearchService;
  [SERVICE_NAMES.PROFILE]: ProfileService;
  [SERVICE_NAMES.FEED]: FeedService;
  [SERVICE_NAMES.COMMENT]: CommentService;
  [SERVICE_NAMES.NOTIFICATION]: NotificationService;
  [SERVICE_NAMES.I18N]: I18nServiceInterface;
}

export class ServiceContainer {
  private factories = new Map<string, () => unknown>();
  private instances = new Map<string, unknown>();

  registerSingleton<T>(name: string, factory: () => T): void {
    this.factories.set(name, factory);
  }

  resolve<K extends keyof ServiceMap>(name: K): ServiceMap[K];
  resolve<T = unknown>(name: string): T;
  resolve(name: string): unknown {
    if (this.instances.has(name)) {
      return this.instances.get(name);
    }

    const factory = this.factories.get(name);
    if (!factory) {
      throw new Error(`Service not registered: ${name}`);
    }

    const instance = factory();
    this.instances.set(name, instance);
    return instance;
  }

  has(name: string): boolean {
    return this.factories.has(name);
  }
}

/**
 * Create and wire a ServiceContainer with all 8 services.
 * Firebase and Algolia clients are initialized eagerly.
 * Services are registered as lazy singletons.
 */
export function createServiceContainer(config: GoodNeighborConfig): ServiceContainer {
  const container = new ServiceContainer();

  // Eager infrastructure initialization
  initializeFirebase(config.firebase);
  const algoliaAdmin = createAlgoliaAdminClient(config.algolia);
  const algoliaSearch = createAlgoliaSearchClient(config.algolia);

  // Register services (lazy singletons)
  container.registerSingleton(SERVICE_NAMES.SEARCH, () =>
    new SearchService({
      searchClient: algoliaSearch as any,
      adminClient: algoliaAdmin as any,
      indexName: config.algolia.indexName,
    }),
  );

  container.registerSingleton(SERVICE_NAMES.AUTH, () =>
    new AuthService({
      authConfig: config.auth,
      appConfig: config.app,
    }),
  );

  container.registerSingleton(SERVICE_NAMES.CONTENT, () =>
    new ContentService({
      searchService: container.resolve(SERVICE_NAMES.SEARCH),
    }),
  );

  container.registerSingleton(SERVICE_NAMES.PROFILE, () =>
    new ProfileService(),
  );

  container.registerSingleton(SERVICE_NAMES.FEED, () =>
    new FeedService({
      searchService: container.resolve(SERVICE_NAMES.SEARCH),
    }),
  );

  container.registerSingleton(SERVICE_NAMES.COMMENT, () =>
    new CommentService(),
  );

  container.registerSingleton(SERVICE_NAMES.NOTIFICATION, () =>
    new NotificationService({
      emailConfig: config.email,
    }),
  );

  container.registerSingleton(SERVICE_NAMES.I18N, () => ({
    translate,
    formatDate,
    hasKey,
    getKeys,
  }));

  return container;
}
