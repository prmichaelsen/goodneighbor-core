import {
  initializeFirebase,
  resetFirebaseForTesting,
} from './firebase';
import type { FirebaseConfig } from './schema';

jest.mock('@prmichaelsen/firebase-admin-sdk-v8', () => ({
  initializeApp: jest.fn(),
  clearConfig: jest.fn(),
}));

describe('Firebase Initialization (v8 edge SDK)', () => {
  const testConfig: FirebaseConfig = {
    serviceAccountKey: '{"type":"service_account","project_id":"test-project","private_key":"key","client_email":"test@test.iam.gserviceaccount.com","token_uri":"https://oauth2.googleapis.com/token"}',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('initializeFirebase', () => {
    it('should call initializeApp with parsed service account', () => {
      const sdk = require('@prmichaelsen/firebase-admin-sdk-v8');
      initializeFirebase(testConfig);
      expect(sdk.initializeApp).toHaveBeenCalledTimes(1);
      const call = sdk.initializeApp.mock.calls[0][0];
      expect(call.projectId).toBe('test-project');
      expect(call.serviceAccount.type).toBe('service_account');
    });

    it('should throw on invalid JSON serviceAccountKey', () => {
      expect(() => initializeFirebase({
        serviceAccountKey: 'not-json',
      })).toThrow();
    });
  });

  describe('resetFirebaseForTesting', () => {
    it('should call clearConfig', () => {
      const sdk = require('@prmichaelsen/firebase-admin-sdk-v8');
      resetFirebaseForTesting();
      expect(sdk.clearConfig).toHaveBeenCalledTimes(1);
    });
  });
});
