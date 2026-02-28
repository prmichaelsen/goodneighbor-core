import {
  ok,
  err,
  isOk,
  isErr,
  mapOk,
  mapErr,
  andThen,
  getOrElse,
  tryCatch,
  tryCatchAsync,
  Result,
} from './result.types';

describe('Result type', () => {
  describe('ok()', () => {
    it('should create Ok result with value', () => {
      const result = ok(42);
      expect(result.ok).toBe(true);
      expect(result.value).toBe(42);
    });

    it('should work with complex objects', () => {
      const result = ok({ name: 'test', count: 3 });
      expect(result.ok).toBe(true);
      expect(result.value).toEqual({ name: 'test', count: 3 });
    });
  });

  describe('err()', () => {
    it('should create Err result with error', () => {
      const result = err(new Error('something failed'));
      expect(result.ok).toBe(false);
      expect(result.error.message).toBe('something failed');
    });

    it('should work with string errors', () => {
      const result = err('not found');
      expect(result.ok).toBe(false);
      expect(result.error).toBe('not found');
    });
  });

  describe('isOk() / isErr()', () => {
    it('should correctly identify Ok results', () => {
      const result = ok(42);
      expect(isOk(result)).toBe(true);
      expect(isErr(result)).toBe(false);
    });

    it('should correctly identify Err results', () => {
      const result = err(new Error('fail'));
      expect(isOk(result)).toBe(false);
      expect(isErr(result)).toBe(true);
    });
  });

  describe('mapOk()', () => {
    it('should transform Ok value', () => {
      const result: Result<number, string> = ok(5);
      const mapped = mapOk(result, (v: number) => v * 2);
      expect(isOk(mapped) && mapped.value).toBe(10);
    });

    it('should pass Err through unchanged', () => {
      const result: Result<number, string> = err('fail');
      const mapped = mapOk(result, (v: number) => v * 2);
      expect(isErr(mapped) && mapped.error).toBe('fail');
    });
  });

  describe('mapErr()', () => {
    it('should transform Err value', () => {
      const result: Result<number, string> = err('fail');
      const mapped = mapErr(result, (e: string) => new Error(e));
      expect(isErr(mapped) && mapped.error.message).toBe('fail');
    });

    it('should pass Ok through unchanged', () => {
      const result: Result<number, string> = ok(5);
      const mapped = mapErr(result, (e: string) => new Error(e));
      expect(isOk(mapped) && mapped.value).toBe(5);
    });
  });

  describe('andThen()', () => {
    it('should chain successful operations', () => {
      const result: Result<number, string> = ok(5);
      const chained = andThen(result, (v: number) => ok(v.toString()));
      expect(isOk(chained) && chained.value).toBe('5');
    });

    it('should short-circuit on error', () => {
      const result: Result<number, string> = err('first error');
      const chained = andThen(result, (v: number) => ok(v.toString()));
      expect(isErr(chained) && chained.error).toBe('first error');
    });

    it('should propagate errors from chained function', () => {
      const result: Result<number, string> = ok(5);
      const chained = andThen(result, () => err('second error'));
      expect(isErr(chained) && chained.error).toBe('second error');
    });
  });

  describe('getOrElse()', () => {
    it('should return value for Ok', () => {
      expect(getOrElse(ok(42), 0)).toBe(42);
    });

    it('should return default for Err', () => {
      expect(getOrElse(err('fail'), 0)).toBe(0);
    });
  });

  describe('tryCatch()', () => {
    it('should return Ok for successful function', () => {
      const result = tryCatch(
        () => JSON.parse('{"a":1}'),
        (e) => e as Error
      );
      expect(isOk(result) && result.value).toEqual({ a: 1 });
    });

    it('should return Err for throwing function', () => {
      const result = tryCatch(
        () => JSON.parse('invalid json'),
        (e) => (e as Error).message
      );
      expect(isErr(result)).toBe(true);
    });
  });

  describe('tryCatchAsync()', () => {
    it('should return Ok for successful async function', async () => {
      const result = await tryCatchAsync(
        async () => 42,
        (e) => e as Error
      );
      expect(isOk(result) && result.value).toBe(42);
    });

    it('should return Err for rejected async function', async () => {
      const result = await tryCatchAsync(
        async () => { throw new Error('async fail'); },
        (e) => (e as Error).message
      );
      expect(isErr(result) && result.error).toBe('async fail');
    });
  });
});
