// src/config/firebase.ts
// Firebase Admin SDK singleton initialization.

import * as admin from 'firebase-admin';
import type { FirebaseConfig } from './schema';

/** Cached Firebase app instance (singleton). */
let firebaseApp: admin.app.App | null = null;

/**
 * Initializes Firebase Admin SDK as a singleton.
 * Parses the service account key from JSON string.
 * Safe to call multiple times -- returns the existing app on subsequent calls.
 *
 * @param config - Firebase configuration with serviceAccountKey JSON string
 * @returns Firebase Admin app instance
 * @throws Error if serviceAccountKey is not valid JSON
 */
export function initializeFirebase(config: FirebaseConfig): admin.app.App {
  if (firebaseApp) {
    return firebaseApp;
  }

  if (admin.apps.length > 0) {
    firebaseApp = admin.app();
    return firebaseApp;
  }

  const serviceAccount = JSON.parse(config.serviceAccountKey);

  firebaseApp = admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });

  return firebaseApp;
}

/** Returns a Firebase Auth instance. Initializes Firebase if needed. */
export function getAuth(config: FirebaseConfig): admin.auth.Auth {
  return initializeFirebase(config).auth();
}

/** Returns a Firestore instance. Initializes Firebase if needed. */
export function getFirestore(config: FirebaseConfig): admin.firestore.Firestore {
  return initializeFirebase(config).firestore();
}

/** Returns a Firebase Storage instance. Initializes Firebase if needed. */
export function getStorage(config: FirebaseConfig): admin.storage.Storage {
  return initializeFirebase(config).storage();
}

/**
 * Resets the cached Firebase app instance.
 * Only for use in tests to ensure clean state between test runs.
 * WARNING: Do not call in production code.
 */
export function resetFirebaseForTesting(): void {
  firebaseApp = null;
}
