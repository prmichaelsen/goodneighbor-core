// src/adapter/handlers/auth.ts
// Auth route handler

import type { AuthService } from '../../services/auth.service';
import type { AdapterRequest, AdapterResponse, RouteHandler } from '../types';
import { resultToResponse } from '../result-mapper';

export function verifySession(service: AuthService): RouteHandler {
  return async (req: AdapterRequest): Promise<AdapterResponse> => {
    const { sessionCookie } = req.body as { sessionCookie: string };
    const result = await service.verifySession(sessionCookie);
    return resultToResponse(result);
  };
}
