// src/adapter/index.ts
// REST adapter barrel export

export { createRoutes } from './routes';
export type { AdapterRequest, AdapterResponse, RouteHandler, Route } from './types';
export { resultToResponse } from './result-mapper';
