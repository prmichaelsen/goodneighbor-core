// src/adapter/handlers/search.ts
// Search route handler

import type { ISearchService } from '../../services/search.service';
import type { AdapterRequest, AdapterResponse, RouteHandler } from '../types';
import { resultToResponse } from '../result-mapper';
import type { AlgoliaSearchParams } from '../../types/search.types';

export function searchEntities(service: ISearchService): RouteHandler {
  return async (req: AdapterRequest): Promise<AdapterResponse> => {
    const params = req.body as AlgoliaSearchParams;
    const result = await service.search(params, req.userId);
    return resultToResponse(result);
  };
}
