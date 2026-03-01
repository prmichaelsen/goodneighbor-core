// src/app/index.ts
// AppClient factory — use-case-oriented REST client

import { HttpClient } from '../clients/http.js';
import type { HttpClientConfig } from '../clients/http.js';
import { assertServerSide } from '../clients/guard.js';
import { ContentOperations } from './content.js';
import { ProfileOperations } from './profiles.js';
import { DiscoveryOperations } from './discovery.js';

export interface AppClient {
  content: ContentOperations;
  profiles: ProfileOperations;
  discovery: DiscoveryOperations;
}

/**
 * Create a use-case-oriented client that composes multiple REST calls.
 * Server-side only — throws in browser environments.
 */
export function createAppClient(config: HttpClientConfig): AppClient {
  assertServerSide();

  const http = new HttpClient(config);

  return {
    content: new ContentOperations(http),
    profiles: new ProfileOperations(http),
    discovery: new DiscoveryOperations(http),
  };
}

export { ContentOperations } from './content.js';
export { ProfileOperations } from './profiles.js';
export { DiscoveryOperations } from './discovery.js';
