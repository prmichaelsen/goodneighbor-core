// src/config/schema.ts
// Zod config schemas for goodneighbor-core

import { z } from 'zod';

// ─── Section Schemas ─────────────────────────────────────────────────────

/**
 * Application-level configuration.
 * Controls environment mode, app identity, and base URL.
 */
export const AppConfigSchema = z.object({
  env: z.enum(['development', 'staging', 'production']).default('development'),
  appName: z.string().default('goodneighbor'),
  appUrl: z.string().url(),
});

/**
 * Firebase Admin SDK configuration.
 * The serviceAccountKey is a JSON string containing the Firebase service account credentials.
 */
export const FirebaseConfigSchema = z.object({
  serviceAccountKey: z.string().min(1, 'FIREBASE_ADMIN_SERVICE_ACCOUNT_KEY is required'),
});

/**
 * Algolia search client configuration.
 * Supports both admin (write) and search (read-only) API keys.
 */
export const AlgoliaConfigSchema = z.object({
  appId: z.string().min(1, 'ALGOLIA_APPLICATION_ID is required'),
  adminApiKey: z.string().min(1, 'ALGOLIA_ADMIN_API_KEY is required'),
  searchApiKey: z.string().min(1, 'ALGOLIA_SEARCH_API_KEY is required'),
  indexName: z.string().default('goodneighbor_search'),
});

/**
 * Email (Mandrill) configuration.
 * The mandrillApiKey is optional -- when absent, email sending falls back to debug capture.
 */
export const EmailConfigSchema = z.object({
  mandrillApiKey: z.string().optional(),
  supportEmail: z.string().email().default('support@goodneighbor.com'),
  fromName: z.string().default('Good Neighbor'),
});

/**
 * Authentication configuration.
 * Controls session behavior for Firebase Auth.
 */
export const AuthConfigSchema = z.object({
  sessionDurationDays: z.number().int().min(1).max(30).default(14),
});

/**
 * Composite configuration schema combining all sections.
 * Validated at startup via loadConfig().
 */
export const GoodNeighborConfigSchema = z.object({
  app: AppConfigSchema,
  firebase: FirebaseConfigSchema,
  algolia: AlgoliaConfigSchema,
  email: EmailConfigSchema,
  auth: AuthConfigSchema,
});

// ─── Inferred TypeScript Types ───────────────────────────────────────────

/** Full application configuration */
export type GoodNeighborConfig = z.infer<typeof GoodNeighborConfigSchema>;

/** Application-level config section */
export type AppConfig = z.infer<typeof AppConfigSchema>;

/** Firebase config section */
export type FirebaseConfig = z.infer<typeof FirebaseConfigSchema>;

/** Algolia config section */
export type AlgoliaConfig = z.infer<typeof AlgoliaConfigSchema>;

/** Email config section */
export type EmailConfig = z.infer<typeof EmailConfigSchema>;

/** Auth config section */
export type AuthConfig = z.infer<typeof AuthConfigSchema>;
