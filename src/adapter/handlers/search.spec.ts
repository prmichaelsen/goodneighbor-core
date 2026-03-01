import { searchEntities } from './search';
import { ok } from '../../types/result.types';
import type { AdapterRequest } from '../types';

function mockSearchService() {
  return { search: jest.fn() };
}

function makeReq(overrides: Partial<AdapterRequest> = {}): AdapterRequest {
  return { method: 'POST', path: '/', params: {}, body: undefined, userId: 'user1', ...overrides };
}

describe('search handler', () => {
  it('returns 200 with search results', async () => {
    const svc = mockSearchService();
    svc.search.mockResolvedValue(ok({ hits: [{ objectID: '1' }], nbHits: 1 }));
    const handler = searchEntities(svc as any);
    const res = await handler(makeReq({ body: { query: 'hello' } }));
    expect(res.status).toBe(200);
    expect(svc.search).toHaveBeenCalledWith({ query: 'hello' }, 'user1');
  });
});
