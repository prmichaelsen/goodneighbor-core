// src/web/use-cases/discovery.ts
// User discovery workflows

import type { Result } from '../../types';
import type { PublicProfile } from '../../types/profile.types';
import { SERVICE_NAMES } from '../../container';
import type { WebSDKContext } from '../context';
import type { WebSDKError } from '../error';
import { toWebSDKError } from '../error';

/**
 * Discover users by searching profiles.
 * Wraps ProfileService.searchUsers with WebSDKError handling.
 */
export async function discoverUsers(
  ctx: WebSDKContext,
  input: { query: string; limit?: number },
): Promise<Result<{ profiles: PublicProfile[] }, WebSDKError>> {
  const profileService = ctx.container.resolve(SERVICE_NAMES.PROFILE);

  const result = await profileService.searchUsers(input.query, input.limit);
  if (!result.ok) {
    return { ok: false, error: toWebSDKError(result.error) };
  }

  return { ok: true, value: { profiles: result.value } };
}
