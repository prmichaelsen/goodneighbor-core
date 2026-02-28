// src/config/loader.ts
// Loads and validates application configuration from environment variables.

import { GoodNeighborConfigSchema, type GoodNeighborConfig } from './schema';

/**
 * Loads and validates application configuration from environment variables.
 *
 * Maps the following environment variables to the GoodNeighborConfig shape:
 *   NODE_ENV -> app.env
 *   APP_NAME -> app.appName
 *   APP_URL -> app.appUrl
 *   FIREBASE_ADMIN_SERVICE_ACCOUNT_KEY -> firebase.serviceAccountKey
 *   ALGOLIA_APPLICATION_ID -> algolia.appId
 *   ALGOLIA_ADMIN_API_KEY -> algolia.adminApiKey
 *   ALGOLIA_SEARCH_API_KEY -> algolia.searchApiKey
 *   ALGOLIA_INDEX_NAME -> algolia.indexName
 *   MANDRILL_API_KEY -> email.mandrillApiKey
 *   SUPPORT_EMAIL -> email.supportEmail
 *   EMAIL_FROM_NAME -> email.fromName
 *   SESSION_DURATION_DAYS -> auth.sessionDurationDays (parsed as integer)
 *
 * @param envOverrides - Optional overrides for environment variables (useful for testing)
 * @returns Validated GoodNeighborConfig
 * @throws ZodError if required variables are missing or validation fails
 */
export function loadConfig(
  envOverrides?: Partial<Record<string, string>>,
): GoodNeighborConfig {
  const env = { ...process.env, ...envOverrides };

  // Only pass NODE_ENV if it's a recognized value; otherwise let the Zod default apply.
  // This avoids conflicts with frameworks that set NODE_ENV to values like "test".
  const VALID_ENVS = ['development', 'staging', 'production'];
  const nodeEnv = env.NODE_ENV && VALID_ENVS.includes(env.NODE_ENV)
    ? env.NODE_ENV
    : undefined;

  const raw = {
    app: {
      env: nodeEnv,
      appName: env.APP_NAME,
      appUrl: env.APP_URL,
    },
    firebase: {
      serviceAccountKey: env.FIREBASE_ADMIN_SERVICE_ACCOUNT_KEY,
    },
    algolia: {
      appId: env.ALGOLIA_APPLICATION_ID,
      adminApiKey: env.ALGOLIA_ADMIN_API_KEY,
      searchApiKey: env.ALGOLIA_SEARCH_API_KEY,
      indexName: env.ALGOLIA_INDEX_NAME,
    },
    email: {
      mandrillApiKey: env.MANDRILL_API_KEY,
      supportEmail: env.SUPPORT_EMAIL,
      fromName: env.EMAIL_FROM_NAME,
    },
    auth: {
      sessionDurationDays: env.SESSION_DURATION_DAYS
        ? parseInt(env.SESSION_DURATION_DAYS, 10)
        : undefined,
    },
  };

  return GoodNeighborConfigSchema.parse(raw);
}

/**
 * Returns a valid GoodNeighborConfig with hardcoded test values.
 * Requires no environment variables.
 */
export function loadTestConfig(): GoodNeighborConfig {
  return GoodNeighborConfigSchema.parse({
    app: {
      env: 'development',
      appName: 'goodneighbor-test',
      appUrl: 'http://localhost:3000',
    },
    firebase: {
      serviceAccountKey: '{"type":"service_account","project_id":"test-project"}',
    },
    algolia: {
      appId: 'test-app-id',
      adminApiKey: 'test-admin-key',
      searchApiKey: 'test-search-key',
      indexName: 'goodneighbor_test',
    },
    email: {
      supportEmail: 'test@example.com',
    },
    auth: {
      sessionDurationDays: 1,
    },
  });
}
