// src/web/helpers.ts
// Use-case helper that wraps async service calls in Result<T, WebSDKError>

import type { Result } from '../types';
import type { WebSDKError } from './error';
import { toWebSDKError } from './error';

/**
 * Execute an async function and return its result wrapped in Result<T, WebSDKError>.
 * Catches any thrown errors and converts them via toWebSDKError.
 */
export async function webTryCatch<T>(
  fn: () => Promise<T>,
): Promise<Result<T, WebSDKError>> {
  try {
    const value = await fn();
    return { ok: true, value };
  } catch (err) {
    return { ok: false, error: toWebSDKError(err) };
  }
}
