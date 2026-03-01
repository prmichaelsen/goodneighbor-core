import { createSuccess, createError, fromHttpResponse, mapStatusToCode } from './response';
import type { SdkError, SdkResponse } from './response';

describe('response', () => {
  describe('createSuccess', () => {
    it('returns data and null error', () => {
      const result = createSuccess({ id: '1', name: 'test' });
      expect(result.data).toEqual({ id: '1', name: 'test' });
      expect(result.error).toBeNull();
    });

    it('throwOnError returns data', () => {
      const result = createSuccess('hello');
      expect(result.throwOnError()).toBe('hello');
    });
  });

  describe('createError', () => {
    const sdkError: SdkError = {
      code: 'not_found',
      message: 'Not found',
      status: 404,
    };

    it('returns null data and error', () => {
      const result = createError(sdkError);
      expect(result.data).toBeNull();
      expect(result.error).toEqual(sdkError);
    });

    it('throwOnError throws the error', () => {
      const result = createError(sdkError);
      expect(() => result.throwOnError()).toThrow();
      try {
        result.throwOnError();
      } catch (e) {
        expect(e).toBe(sdkError);
      }
    });
  });

  describe('fromHttpResponse', () => {
    function mockResponse(status: number, body?: unknown, ok?: boolean): Response {
      const isOk = ok ?? (status >= 200 && status < 300);
      return {
        ok: isOk,
        status,
        statusText: `Status ${status}`,
        json: () => Promise.resolve(body),
      } as Response;
    }

    it('maps 200 to success with parsed JSON', async () => {
      const res = mockResponse(200, { id: '1' });
      const result = await fromHttpResponse<{ id: string }>(res);
      expect(result.data).toEqual({ id: '1' });
      expect(result.error).toBeNull();
    });

    it('maps 204 No Content to success with undefined data', async () => {
      const res = mockResponse(204, undefined);
      const result = await fromHttpResponse<void>(res);
      expect(result.data).toBeUndefined();
      expect(result.error).toBeNull();
    });

    it('maps 404 to not_found error', async () => {
      const res = mockResponse(404, { message: 'Post not found' });
      const result = await fromHttpResponse(res);
      expect(result.data).toBeNull();
      expect(result.error).toEqual({
        code: 'not_found',
        message: 'Post not found',
        status: 404,
      });
    });

    it('maps 500 to internal error', async () => {
      const res = mockResponse(500, { error: 'Server crash' });
      const result = await fromHttpResponse(res);
      expect(result.error!.code).toBe('internal');
      expect(result.error!.message).toBe('Server crash');
    });

    it('handles non-JSON error bodies', async () => {
      const res = {
        ok: false,
        status: 502,
        statusText: 'Bad Gateway',
        json: () => Promise.reject(new Error('not JSON')),
      } as Response;
      const result = await fromHttpResponse(res);
      expect(result.error!.code).toBe('bad_gateway');
      expect(result.error!.message).toBe('Bad Gateway');
    });

    it('includes context when present in error body', async () => {
      const res = mockResponse(400, {
        message: 'Invalid',
        context: { field: 'email' },
      });
      const result = await fromHttpResponse(res);
      expect(result.error!.context).toEqual({ field: 'email' });
    });
  });

  describe('mapStatusToCode', () => {
    it.each([
      [400, 'bad_request'],
      [401, 'unauthorized'],
      [403, 'forbidden'],
      [404, 'not_found'],
      [409, 'conflict'],
      [422, 'validation'],
      [429, 'rate_limited'],
      [500, 'internal'],
      [502, 'bad_gateway'],
      [503, 'service_unavailable'],
    ])('maps %d to %s', (status, expected) => {
      expect(mapStatusToCode(status)).toBe(expected);
    });

    it('falls back to http_NNN for unmapped statuses', () => {
      expect(mapStatusToCode(418)).toBe('http_418');
    });
  });
});
