// src/adapter/handlers/profiles.ts
// Profile route handlers

import type { ProfileService } from '../../services/profile.service';
import type { AdapterRequest, AdapterResponse, RouteHandler } from '../types';
import { resultToResponse } from '../result-mapper';
import type { ProfileFormData } from '../../types/profile.types';

export function getProfile(service: ProfileService): RouteHandler {
  return async (req: AdapterRequest): Promise<AdapterResponse> => {
    const result = await service.getPublicProfile(req.params.uid);
    return resultToResponse(result);
  };
}

export function updateProfile(service: ProfileService): RouteHandler {
  return async (req: AdapterRequest): Promise<AdapterResponse> => {
    const data = req.body as ProfileFormData;
    const result = await service.updatePublicProfile(req.params.uid, data);
    return resultToResponse(result);
  };
}

export function searchProfiles(service: ProfileService): RouteHandler {
  return async (req: AdapterRequest): Promise<AdapterResponse> => {
    const { query, limit } = req.body as { query: string; limit?: number };
    const result = await service.searchUsers(query, limit);
    return resultToResponse(result);
  };
}
