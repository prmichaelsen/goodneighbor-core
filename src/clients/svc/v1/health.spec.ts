// src/clients/svc/v1/health.spec.ts

import { createHealthResource, type HealthResource } from './health';

describe('HealthResource', () => {
  const mockHttp = {
    request: jest.fn(),
  };

  let health: HealthResource;

  beforeEach(() => {
    jest.clearAllMocks();
    health = createHealthResource(mockHttp as any);
  });

  describe('check()', () => {
    it('should call GET /health', async () => {
      const response = { data: { status: 'ok', timestamp: '2026-03-01T00:00:00.000Z' }, error: null };
      mockHttp.request.mockResolvedValue(response);

      const result = await health.check();

      expect(mockHttp.request).toHaveBeenCalledWith('GET', '/health', {});
      expect(result).toEqual(response);
    });
  });

  describe('version()', () => {
    it('should call GET /version', async () => {
      const response = { data: { version: '0.2.0', environment: 'production' }, error: null };
      mockHttp.request.mockResolvedValue(response);

      const result = await health.version();

      expect(mockHttp.request).toHaveBeenCalledWith('GET', '/version', {});
      expect(result).toEqual(response);
    });
  });
});
