import { ProfileService } from './profile.service';
import { COLLECTIONS } from '../constants/collections';

jest.mock('@prmichaelsen/firebase-admin-sdk-v8', () => ({
  setDocument: jest.fn(),
  getDocument: jest.fn(),
  updateDocument: jest.fn(),
  queryDocuments: jest.fn(),
}));

const sdk = require('@prmichaelsen/firebase-admin-sdk-v8');

function createService() {
  return new ProfileService({ logger: { error: jest.fn() } });
}

describe('ProfileService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    sdk.setDocument.mockResolvedValue(undefined);
    sdk.getDocument.mockResolvedValue(null);
    sdk.updateDocument.mockResolvedValue(undefined);
    sdk.queryDocuments.mockResolvedValue([]);
  });

  describe('getPublicProfile', () => {
    it('should return profile when found by username', async () => {
      sdk.queryDocuments.mockResolvedValue([
        { id: 'user-1', data: { username: 'testuser', displayName: 'Test' } },
      ]);
      const service = createService();
      const result = await service.getPublicProfile('testuser');
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.uid).toBe('user-1');
        expect(result.value.username).toBe('testuser');
      }
    });

    it('should return NotFoundError when username not found', async () => {
      sdk.queryDocuments.mockResolvedValue([]);
      const service = createService();
      const result = await service.getPublicProfile('missing');
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.message).toContain('not found');
      }
    });

    it('should query PUBLIC_PROFILES with username filter', async () => {
      sdk.queryDocuments.mockResolvedValue([]);
      const service = createService();
      await service.getPublicProfile('testuser');
      expect(sdk.queryDocuments).toHaveBeenCalledWith(
        COLLECTIONS.PUBLIC_PROFILES,
        expect.objectContaining({
          where: [{ field: 'username', op: '==', value: 'testuser' }],
        }),
      );
    });
  });

  describe('getPublicProfileById', () => {
    it('should return profile by user ID', async () => {
      sdk.getDocument.mockResolvedValue({ username: 'test', displayName: 'Test' });
      const service = createService();
      const result = await service.getPublicProfileById('user-1');
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.uid).toBe('user-1');
      }
    });

    it('should return NotFoundError when not found', async () => {
      sdk.getDocument.mockResolvedValue(null);
      const service = createService();
      const result = await service.getPublicProfileById('missing');
      expect(result.ok).toBe(false);
    });
  });

  describe('updatePublicProfile', () => {
    it('should update profile data', async () => {
      const service = createService();
      const result = await service.updatePublicProfile('user-1', { displayName: 'New Name' });
      expect(result.ok).toBe(true);
      expect(sdk.updateDocument).toHaveBeenCalledWith(
        COLLECTIONS.PUBLIC_PROFILES,
        'user-1',
        expect.objectContaining({ displayName: 'New Name' }),
      );
    });

    it('should reject invalid username format', async () => {
      const service = createService();
      const result = await service.updatePublicProfile('user-1', { username: 'ab' }); // too short
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.message).toContain('Username');
      }
    });

    it('should reject username with special characters', async () => {
      const service = createService();
      const result = await service.updatePublicProfile('user-1', { username: 'test@user!' });
      expect(result.ok).toBe(false);
    });

    it('should accept valid username', async () => {
      const service = createService();
      const result = await service.updatePublicProfile('user-1', { username: 'valid_user_123' });
      expect(result.ok).toBe(true);
    });
  });

  describe('getPrivateProfile', () => {
    it('should return private profile by user ID', async () => {
      sdk.getDocument.mockResolvedValue({ email: 'test@example.com' });
      const service = createService();
      const result = await service.getPrivateProfile('user-1');
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.email).toBe('test@example.com');
      }
    });

    it('should return NotFoundError when not found', async () => {
      sdk.getDocument.mockResolvedValue(null);
      const service = createService();
      const result = await service.getPrivateProfile('missing');
      expect(result.ok).toBe(false);
    });
  });

  describe('updatePrivateProfile', () => {
    it('should update private profile data', async () => {
      const service = createService();
      const result = await service.updatePrivateProfile('user-1', { phone: '555-1234' } as any);
      expect(result.ok).toBe(true);
      expect(sdk.updateDocument).toHaveBeenCalledWith(
        COLLECTIONS.PRIVATE_PROFILES,
        'user-1',
        expect.objectContaining({ phone: '555-1234' }),
      );
    });
  });

  describe('getProfileBoard', () => {
    it('should return profile board', async () => {
      sdk.getDocument.mockResolvedValue({ widgets: [], layout: { columns: 2, gap: 16 } });
      const service = createService();
      const result = await service.getProfileBoard('user-1');
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.uid).toBe('user-1');
        expect(result.value.widgets).toEqual([]);
      }
    });

    it('should return NotFoundError when board not found', async () => {
      sdk.getDocument.mockResolvedValue(null);
      const service = createService();
      const result = await service.getProfileBoard('missing');
      expect(result.ok).toBe(false);
    });
  });

  describe('createDefaultBoard', () => {
    it('should create a default board with empty widgets', async () => {
      sdk.getDocument.mockResolvedValue(null);
      const service = createService();
      const result = await service.createDefaultBoard('user-1');
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.uid).toBe('user-1');
        expect(result.value.widgets).toEqual([]);
        expect(result.value.layout).toEqual({ columns: 2, gap: 16 });
      }
    });

    it('should return ConflictError if board already exists', async () => {
      sdk.getDocument.mockResolvedValue({ widgets: [] });
      const service = createService();
      const result = await service.createDefaultBoard('user-1');
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.message).toContain('already exists');
      }
    });

    it('should write to PROFILE_BOARDS collection', async () => {
      sdk.getDocument.mockResolvedValue(null);
      const service = createService();
      await service.createDefaultBoard('user-1');
      expect(sdk.setDocument).toHaveBeenCalledWith(
        COLLECTIONS.PROFILE_BOARDS,
        'user-1',
        expect.objectContaining({ uid: 'user-1', widgets: [] }),
      );
    });
  });

  describe('updateBoard', () => {
    it('should update board widgets', async () => {
      sdk.getDocument.mockResolvedValue({ widgets: [], layout: { columns: 2, gap: 16 } });
      const service = createService();
      const result = await service.updateBoard('user-1', { widgets: [] });
      expect(result.ok).toBe(true);
    });

    it('should return NotFoundError if board does not exist', async () => {
      sdk.getDocument.mockResolvedValue(null);
      const service = createService();
      const result = await service.updateBoard('missing', { widgets: [] });
      expect(result.ok).toBe(false);
    });
  });

  describe('searchUsers', () => {
    it('should search by username and displayName prefix', async () => {
      sdk.queryDocuments
        .mockResolvedValueOnce([{ id: 'u1', data: { username: 'john', displayName: 'John' } }])
        .mockResolvedValueOnce([{ id: 'u2', data: { username: 'jane', displayName: 'John D' } }]);
      const service = createService();
      const result = await service.searchUsers('John');
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toHaveLength(2);
      }
    });

    it('should deduplicate results by ID', async () => {
      sdk.queryDocuments
        .mockResolvedValueOnce([{ id: 'u1', data: { username: 'john' } }])
        .mockResolvedValueOnce([{ id: 'u1', data: { username: 'john' } }]);
      const service = createService();
      const result = await service.searchUsers('john');
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toHaveLength(1);
      }
    });

    it('should respect limit parameter', async () => {
      const results = Array.from({ length: 5 }, (_, i) => ({
        id: `u${i}`, data: { username: `user${i}` },
      }));
      sdk.queryDocuments.mockResolvedValue(results);
      const service = createService();
      const result = await service.searchUsers('user', 3);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.length).toBeLessThanOrEqual(3);
      }
    });

    it('should return ExternalServiceError on failure', async () => {
      sdk.queryDocuments.mockRejectedValue(new Error('query failed'));
      const service = createService();
      const result = await service.searchUsers('test');
      expect(result.ok).toBe(false);
    });
  });
});
