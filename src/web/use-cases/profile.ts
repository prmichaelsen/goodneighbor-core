// src/web/use-cases/profile.ts
// Compound profile workflows

import type { Result } from '../../types';
import type { PublicProfile, ProfileFormData } from '../../types/profile.types';
import type { ProfileBoard } from '../../types/profile-board.types';
import { SERVICE_NAMES } from '../../container';
import type { WebSDKContext } from '../context';
import type { WebSDKError } from '../error';
import { toWebSDKError } from '../error';

/**
 * Set up a user's profile: update public profile data and ensure a default board exists.
 * The board creation silently succeeds if the board already exists (conflict is ok).
 */
export async function setupProfile(
  ctx: WebSDKContext,
  input: ProfileFormData,
): Promise<Result<void, WebSDKError>> {
  const profileService = ctx.container.resolve(SERVICE_NAMES.PROFILE);

  // Step 1: Update public profile
  const updateResult = await profileService.updatePublicProfile(ctx.userId, input);
  if (!updateResult.ok) {
    return { ok: false, error: toWebSDKError(updateResult.error) };
  }

  // Step 2: Ensure default board exists (ignore conflict — means board already exists)
  const boardResult = await profileService.createDefaultBoard(ctx.userId);
  if (!boardResult.ok && boardResult.error.kind !== 'conflict') {
    return { ok: false, error: toWebSDKError(boardResult.error) };
  }

  return { ok: true, value: undefined };
}

/**
 * View a user's profile: fetch public profile and profile board in parallel.
 */
export async function viewProfile(
  ctx: WebSDKContext,
  targetUid: string,
): Promise<Result<{ profile: PublicProfile; board: ProfileBoard | null }, WebSDKError>> {
  const profileService = ctx.container.resolve(SERVICE_NAMES.PROFILE);

  // Fetch profile and board in parallel
  const [profileResult, boardResult] = await Promise.all([
    profileService.getPublicProfileById(targetUid),
    profileService.getProfileBoard(targetUid),
  ]);

  // Profile is required — fail if not found
  if (!profileResult.ok) {
    return { ok: false, error: toWebSDKError(profileResult.error) };
  }

  // Board is optional — return null if not found
  const board = boardResult.ok ? boardResult.value : null;

  return { ok: true, value: { profile: profileResult.value, board } };
}
