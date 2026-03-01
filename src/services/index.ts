// src/services/index.ts

export type { ISearchService, SearchServiceDependencies } from './search.service';
export { SearchService, DEFAULT_ATTRIBUTES_TO_RETRIEVE } from './search.service';

export type { AuthServiceDeps } from './auth.service';
export { AuthService } from './auth.service';

export type { ContentServiceDeps } from './content.service';
export { ContentService } from './content.service';

export type { ProfileServiceDeps } from './profile.service';
export { ProfileService } from './profile.service';

export type { FeedServiceDeps } from './feed.service';
export { FeedService } from './feed.service';

export type { CommentServiceDeps } from './comment.service';
export { CommentService } from './comment.service';
