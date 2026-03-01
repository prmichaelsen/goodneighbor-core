// src/adapter/types.ts
// Framework-agnostic REST adapter types

export interface AdapterRequest {
  method: string;
  path: string;
  params: Record<string, string>;
  body: unknown;
  userId: string;
  query?: Record<string, string>;
}

export interface AdapterResponse {
  status: number;
  body: unknown;
  headers?: Record<string, string>;
}

export type RouteHandler = (req: AdapterRequest) => Promise<AdapterResponse>;

export interface Route {
  method: string;
  path: string;
  handler: RouteHandler;
}
