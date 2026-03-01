// src/config/firebase.ts
// Firebase initialization using @prmichaelsen/firebase-admin-sdk-v8 (edge-compatible REST API).

import { initializeApp, clearConfig } from '@prmichaelsen/firebase-admin-sdk-v8';
import type { FirebaseConfig } from './schema';

/**
 * Initializes the Firebase Admin SDK v8 for edge runtimes.
 * Parses the service account key JSON and configures the SDK globally.
 *
 * @param config - Firebase configuration with serviceAccountKey JSON string
 * @throws Error if serviceAccountKey is not valid JSON
 */
export function initializeFirebase(config: FirebaseConfig): void {
  const serviceAccount = JSON.parse(config.serviceAccountKey);

  initializeApp({
    serviceAccount,
    projectId: serviceAccount.project_id,
  });
}

/**
 * Resets the Firebase SDK config.
 * Only for use in tests to ensure clean state between test runs.
 */
export function resetFirebaseForTesting(): void {
  clearConfig();
}
