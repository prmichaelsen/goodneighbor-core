// src/web/error.spec.ts

import { toWebSDKError, type WebSDKError } from './error';
import { NotFoundError, ValidationError, ExternalServiceError, InternalError } from '../errors/app-errors';

describe('toWebSDKError', () => {
  describe('with AppError subclasses', () => {
    it('should convert NotFoundError', () => {
      const err = new NotFoundError('Post', 'post-123');
      const result = toWebSDKError(err);

      expect(result.code).toBe('NOT_FOUND');
      expect(result.message).toBe('Post not found: post-123');
      expect(result.details).toEqual({ resource: 'Post', id: 'post-123' });
    });

    it('should convert ValidationError', () => {
      const err = new ValidationError('Invalid input', { title: ['required'] });
      const result = toWebSDKError(err);

      expect(result.code).toBe('VALIDATION_ERROR');
      expect(result.message).toBe('Invalid input');
      expect(result.details).toEqual({ fields: { title: ['required'] } });
    });

    it('should convert ExternalServiceError', () => {
      const err = new ExternalServiceError('Algolia', 'Search failed');
      const result = toWebSDKError(err);

      expect(result.code).toBe('EXTERNAL_SERVICE_ERROR');
      expect(result.message).toBe('Search failed');
      expect(result.details).toEqual({ service: 'Algolia' });
    });

    it('should omit details when context is empty', () => {
      const err = new InternalError('Something went wrong');
      const result = toWebSDKError(err);

      expect(result.code).toBe('INTERNAL_ERROR');
      expect(result.message).toBe('Something went wrong');
      expect(result.details).toBeUndefined();
    });
  });

  describe('with plain Error', () => {
    it('should wrap with UNKNOWN_ERROR code', () => {
      const err = new Error('Something broke');
      const result = toWebSDKError(err);

      expect(result.code).toBe('UNKNOWN_ERROR');
      expect(result.message).toBe('Something broke');
      expect(result.details).toBeUndefined();
    });
  });

  describe('with non-Error values', () => {
    it('should convert string to WebSDKError', () => {
      const result = toWebSDKError('string error');

      expect(result.code).toBe('UNKNOWN_ERROR');
      expect(result.message).toBe('string error');
    });

    it('should convert number to WebSDKError', () => {
      const result = toWebSDKError(42);

      expect(result.code).toBe('UNKNOWN_ERROR');
      expect(result.message).toBe('42');
    });

    it('should convert null to WebSDKError', () => {
      const result = toWebSDKError(null);

      expect(result.code).toBe('UNKNOWN_ERROR');
      expect(result.message).toBe('null');
    });
  });
});
