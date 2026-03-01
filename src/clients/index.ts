// src/clients/index.ts
// Client SDK barrel export

export { createSvcClient } from './svc/v1/index.js';
export type {
  SvcClient,
  HttpClientConfig,
  SdkResponse,
  SdkError,
  PostsResource,
  ProfilesResource,
  FeedsResource,
  CommentsResource,
  SearchResource,
  AuthResource,
  VerifySessionResult,
} from './svc/v1/index.js';

export { HttpClient } from './http.js';
export type { RequestOptions } from './http.js';
export { createSuccess, createError, fromHttpResponse, mapStatusToCode } from './response.js';
export { assertServerSide } from './guard.js';
