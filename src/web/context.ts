// src/web/context.ts
// WebSDKContext — dependency bundle for server-side use-case functions

import type { ServiceContainer } from '../container';

/**
 * Dependency context for web use-case functions.
 * Bundles a ServiceContainer with the authenticated user's ID.
 */
export interface WebSDKContext {
  container: ServiceContainer;
  userId: string;
}

/**
 * Create a WebSDKContext for executing use-case functions.
 */
export function createWebSDKContext(
  container: ServiceContainer,
  userId: string,
): WebSDKContext {
  return { container, userId };
}
