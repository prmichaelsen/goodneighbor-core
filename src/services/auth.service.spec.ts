import { AuthService } from './auth.service';
import type { CustomClaims } from '../types/auth.types';

function createMockVerify(decoded: Record<string, unknown> = {}) {
  return jest.fn().mockResolvedValue({
    uid: 'user-1',
    email: 'test@example.com',
    email_verified: true,
    name: 'Test User',
    picture: 'https://example.com/avatar.jpg',
    auth_time: Math.floor(Date.now() / 1000) - 60, // 1 minute ago
    isOwnerOf: ['goodneighbor'],
    isOverseerOf: [],
    ...decoded,
  });
}

function createService(decodedOverrides: Record<string, unknown> = {}) {
  const mockVerify = createMockVerify(decodedOverrides);
  const service = new AuthService({
    authConfig: { sessionDurationDays: 14 },
    appConfig: { env: 'development', appName: 'goodneighbor', appUrl: 'https://goodneighbor.com' },
    verifySessionCookie: mockVerify,
  });
  return { service, mockVerify };
}

describe('AuthService', () => {
  describe('verifySession', () => {
    it('should return ServerUser on valid session', async () => {
      const { service } = createService();
      const result = await service.verifySession('valid-cookie');
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.uid).toBe('user-1');
        expect(result.value.email).toBe('test@example.com');
        expect(result.value.emailVerified).toBe(true);
        expect(result.value.displayName).toBe('Test User');
        expect(result.value.customClaims.isOwnerOf).toEqual(['goodneighbor']);
      }
    });

    it('should call verifySessionCookie with revocation checking', async () => {
      const { service, mockVerify } = createService();
      await service.verifySession('test-cookie');
      expect(mockVerify).toHaveBeenCalledWith('test-cookie', true);
    });

    it('should return UnauthorizedError for expired session', async () => {
      const expiredAuthTime = Math.floor(Date.now() / 1000) - (15 * 24 * 60 * 60); // 15 days ago
      const { service } = createService({ auth_time: expiredAuthTime });
      const result = await service.verifySession('expired-cookie');
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.message).toBe('Session expired');
      }
    });

    it('should return UnauthorizedError for invalid cookie', async () => {
      const mockVerify = jest.fn().mockRejectedValue(new Error('auth/session-cookie-revoked'));
      const service = new AuthService({
        authConfig: { sessionDurationDays: 14 },
        appConfig: { env: 'development', appName: 'goodneighbor', appUrl: 'https://goodneighbor.com' },
        verifySessionCookie: mockVerify,
      });
      const result = await service.verifySession('invalid-cookie');
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.message).toBe('Invalid session cookie');
      }
    });

    it('should handle missing optional fields gracefully', async () => {
      const { service } = createService({
        name: undefined,
        picture: undefined,
        email: undefined,
        email_verified: undefined,
        isOwnerOf: undefined,
        isOverseerOf: undefined,
      });
      const result = await service.verifySession('cookie');
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.email).toBe('');
        expect(result.value.emailVerified).toBe(false);
        expect(result.value.displayName).toBeUndefined();
        expect(result.value.customClaims.isOwnerOf).toEqual([]);
        expect(result.value.customClaims.isOverseerOf).toEqual([]);
      }
    });
  });

  describe('isOwner', () => {
    it('should return true when appName is in isOwnerOf', () => {
      const { service } = createService();
      const claims: CustomClaims = { isOwnerOf: ['goodneighbor', 'other-app'] };
      expect(service.isOwner(claims, 'goodneighbor')).toBe(true);
    });

    it('should return false when appName is not in isOwnerOf', () => {
      const { service } = createService();
      const claims: CustomClaims = { isOwnerOf: ['other-app'] };
      expect(service.isOwner(claims, 'goodneighbor')).toBe(false);
    });

    it('should return false when isOwnerOf is undefined', () => {
      const { service } = createService();
      const claims: CustomClaims = {};
      expect(service.isOwner(claims, 'goodneighbor')).toBe(false);
    });

    it('should return false when isOwnerOf is empty', () => {
      const { service } = createService();
      const claims: CustomClaims = { isOwnerOf: [] };
      expect(service.isOwner(claims, 'goodneighbor')).toBe(false);
    });
  });

  describe('isOverseer', () => {
    it('should return true when appName is in isOverseerOf', () => {
      const { service } = createService();
      const claims: CustomClaims = { isOverseerOf: ['goodneighbor'] };
      expect(service.isOverseer(claims, 'goodneighbor')).toBe(true);
    });

    it('should return false when appName is not in isOverseerOf', () => {
      const { service } = createService();
      const claims: CustomClaims = { isOverseerOf: ['other'] };
      expect(service.isOverseer(claims, 'goodneighbor')).toBe(false);
    });

    it('should return false when isOverseerOf is undefined', () => {
      const { service } = createService();
      const claims: CustomClaims = {};
      expect(service.isOverseer(claims, 'goodneighbor')).toBe(false);
    });
  });

  describe('requireOwner', () => {
    it('should return ServerUser when user is owner', async () => {
      const { service } = createService();
      const result = await service.requireOwner('valid-cookie');
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.uid).toBe('user-1');
      }
    });

    it('should return ForbiddenError when user is not owner', async () => {
      const { service } = createService({ isOwnerOf: [] });
      const result = await service.requireOwner('valid-cookie');
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toBeInstanceOf(Error);
        expect(result.error.message).toBe('User is not an owner');
      }
    });

    it('should return UnauthorizedError for invalid session', async () => {
      const mockVerify = jest.fn().mockRejectedValue(new Error('invalid'));
      const service = new AuthService({
        authConfig: { sessionDurationDays: 14 },
        appConfig: { env: 'development', appName: 'goodneighbor', appUrl: 'https://goodneighbor.com' },
        verifySessionCookie: mockVerify,
      });
      const result = await service.requireOwner('bad-cookie');
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.message).toBe('Invalid session cookie');
      }
    });
  });
});
