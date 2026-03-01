// src/web/helpers.spec.ts

import { webTryCatch } from './helpers';
import { NotFoundError } from '../errors/app-errors';

describe('webTryCatch', () => {
  it('should return Ok on success', async () => {
    const result = await webTryCatch(async () => 'hello');

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toBe('hello');
    }
  });

  it('should return Ok with complex values', async () => {
    const data = { id: '1', name: 'Test' };
    const result = await webTryCatch(async () => data);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toEqual(data);
    }
  });

  it('should return Err with WebSDKError on AppError', async () => {
    const result = await webTryCatch(async () => {
      throw new NotFoundError('Post', 'post-123');
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('NOT_FOUND');
      expect(result.error.message).toBe('Post not found: post-123');
    }
  });

  it('should return Err with WebSDKError on plain Error', async () => {
    const result = await webTryCatch(async () => {
      throw new Error('Oops');
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('UNKNOWN_ERROR');
      expect(result.error.message).toBe('Oops');
    }
  });

  it('should return Err with WebSDKError on non-Error throw', async () => {
    const result = await webTryCatch(async () => {
      throw 'string throw';
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('UNKNOWN_ERROR');
      expect(result.error.message).toBe('string throw');
    }
  });
});
