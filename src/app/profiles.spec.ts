// src/app/profiles.spec.ts

import { ProfileOperations } from './profiles';
import { createSuccess, createError } from '../clients/response';

function createMockHttp() {
  return { request: jest.fn() };
}

describe('ProfileOperations', () => {
  describe('setupProfile', () => {
    it('should update profile via PUT', async () => {
      const http = createMockHttp();
      const ops = new ProfileOperations(http as any);
      const mockProfile = { uid: 'user-1', displayName: 'John' };

      http.request.mockResolvedValueOnce(createSuccess(mockProfile));

      const result = await ops.setupProfile('user-1', { displayName: 'John' });

      expect(result.error).toBeNull();
      expect(result.data).toEqual(mockProfile);
      expect(http.request).toHaveBeenCalledWith('PUT', '/api/v1/profiles/user-1', {
        body: { displayName: 'John' },
        userId: 'user-1',
      });
    });

    it('should return error on failure', async () => {
      const http = createMockHttp();
      const ops = new ProfileOperations(http as any);

      http.request.mockResolvedValueOnce(
        createError({ code: 'validation', message: 'Invalid', status: 400 }),
      );

      const result = await ops.setupProfile('user-1', { username: '!!!' });

      expect(result.error).not.toBeNull();
      expect(result.error!.code).toBe('validation');
    });
  });

  describe('viewProfile', () => {
    it('should fetch and wrap profile', async () => {
      const http = createMockHttp();
      const ops = new ProfileOperations(http as any);
      const mockProfile = { uid: 'target', displayName: 'Jane' };

      http.request.mockResolvedValueOnce(createSuccess(mockProfile));

      const result = await ops.viewProfile('user-1', 'target');

      expect(result.error).toBeNull();
      expect(result.data).toEqual({ profile: mockProfile });
      expect(http.request).toHaveBeenCalledWith('GET', '/api/v1/profiles/target', {
        userId: 'user-1',
      });
    });

    it('should return error if profile not found', async () => {
      const http = createMockHttp();
      const ops = new ProfileOperations(http as any);

      http.request.mockResolvedValueOnce(
        createError({ code: 'not_found', message: 'Not found', status: 404 }),
      );

      const result = await ops.viewProfile('user-1', 'target');

      expect(result.error).not.toBeNull();
      expect(result.error!.code).toBe('not_found');
    });
  });
});
