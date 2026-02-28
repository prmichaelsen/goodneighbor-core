import {
  initializeFirebase,
  getAuth,
  getFirestore,
  getStorage,
  resetFirebaseForTesting,
} from './firebase';
import type { FirebaseConfig } from './schema';

// Mock firebase-admin
jest.mock('firebase-admin', () => {
  const mockAuth = { verifySessionCookie: jest.fn() };
  const mockFirestore = { collection: jest.fn() };
  const mockStorage = { bucket: jest.fn() };

  const mockApp = {
    auth: jest.fn(() => mockAuth),
    firestore: jest.fn(() => mockFirestore),
    storage: jest.fn(() => mockStorage),
  };

  return {
    apps: [] as any[],
    app: jest.fn(() => mockApp),
    initializeApp: jest.fn(() => {
      const mod = require('firebase-admin');
      mod.apps.push(mockApp);
      return mockApp;
    }),
    credential: {
      cert: jest.fn((serviceAccount: any) => serviceAccount),
    },
  };
});

describe('Firebase Admin Initialization', () => {
  const testConfig: FirebaseConfig = {
    serviceAccountKey: '{"type":"service_account","project_id":"test"}',
  };

  beforeEach(() => {
    resetFirebaseForTesting();
    const admin = require('firebase-admin');
    admin.apps.length = 0;
    jest.clearAllMocks();
  });

  describe('initializeFirebase', () => {
    it('should initialize Firebase app on first call', () => {
      const admin = require('firebase-admin');
      const app = initializeFirebase(testConfig);
      expect(admin.initializeApp).toHaveBeenCalledTimes(1);
      expect(admin.credential.cert).toHaveBeenCalledWith({
        type: 'service_account',
        project_id: 'test',
      });
      expect(app).toBeDefined();
    });

    it('should return same app on subsequent calls (singleton)', () => {
      const app1 = initializeFirebase(testConfig);
      const admin = require('firebase-admin');
      admin.initializeApp.mockClear();

      const app2 = initializeFirebase(testConfig);
      expect(admin.initializeApp).not.toHaveBeenCalled();
      expect(app2).toBe(app1);
    });

    it('should throw on invalid JSON serviceAccountKey', () => {
      expect(() => initializeFirebase({
        serviceAccountKey: 'not-json',
      })).toThrow();
    });
  });

  describe('getAuth', () => {
    it('should return Firebase Auth instance', () => {
      const auth = getAuth(testConfig);
      expect(auth).toBeDefined();
      expect(auth.verifySessionCookie).toBeDefined();
    });
  });

  describe('getFirestore', () => {
    it('should return Firestore instance', () => {
      const firestore = getFirestore(testConfig);
      expect(firestore).toBeDefined();
      expect(firestore.collection).toBeDefined();
    });
  });

  describe('getStorage', () => {
    it('should return Storage instance', () => {
      const storage = getStorage(testConfig);
      expect(storage).toBeDefined();
      expect(storage.bucket).toBeDefined();
    });
  });
});
