// src/adapter/handlers/health.spec.ts

import { healthCheck, versionCheck } from './health';
import type { AdapterRequest } from '../types';

describe('Health Handlers', () => {
  const mockRequest: AdapterRequest = {
    method: 'GET',
    path: '/health',
    params: {},
    body: {},
    userId: '',
  };

  describe('healthCheck()', () => {
    it('should return status ok with timestamp', async () => {
      const handler = healthCheck();
      const now = new Date();
      jest.spyOn(global, 'Date').mockImplementation(() => now as any);

      const result = await handler(mockRequest);

      expect(result.status).toBe(200);
      expect(result.body).toEqual({
        status: 'ok',
        timestamp: now.toISOString(),
      });

      jest.restoreAllMocks();
    });

    it('should return a valid ISO timestamp', async () => {
      const handler = healthCheck();
      const result = await handler(mockRequest);
      const body = result.body as { status: string; timestamp: string };

      expect(result.status).toBe(200);
      expect(body.status).toBe('ok');
      expect(() => new Date(body.timestamp)).not.toThrow();
    });
  });

  describe('versionCheck()', () => {
    it('should return version and environment', async () => {
      const handler = versionCheck('0.2.0', 'production');
      const result = await handler(mockRequest);

      expect(result.status).toBe(200);
      expect(result.body).toEqual({
        version: '0.2.0',
        environment: 'production',
      });
    });

    it('should use provided values', async () => {
      const handler = versionCheck('1.0.0', 'staging');
      const result = await handler(mockRequest);
      const body = result.body as { version: string; environment: string };

      expect(body.version).toBe('1.0.0');
      expect(body.environment).toBe('staging');
    });
  });
});
