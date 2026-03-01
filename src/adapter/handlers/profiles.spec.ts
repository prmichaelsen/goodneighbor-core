import { getProfile, updateProfile, searchProfiles } from './profiles';
import { ok, err } from '../../types/result.types';
import { NotFoundError, ValidationError } from '../../errors/app-errors';
import type { AdapterRequest } from '../types';

function mockProfileService() {
  return {
    getPublicProfile: jest.fn(),
    updatePublicProfile: jest.fn(),
    searchUsers: jest.fn(),
  };
}

function makeReq(overrides: Partial<AdapterRequest> = {}): AdapterRequest {
  return {
    method: 'GET',
    path: '/api/v1/profiles/u1',
    params: {},
    body: undefined,
    userId: 'user1',
    ...overrides,
  };
}

describe('profiles handlers', () => {
  it('getProfile returns 200 on success', async () => {
    const svc = mockProfileService();
    svc.getPublicProfile.mockResolvedValue(ok({ uid: 'u1', username: 'john' }));
    const handler = getProfile(svc as any);
    const res = await handler(makeReq({ params: { uid: 'u1' } }));
    expect(res.status).toBe(200);
    expect((res.body as any).username).toBe('john');
  });

  it('getProfile returns 404 when not found', async () => {
    const svc = mockProfileService();
    svc.getPublicProfile.mockResolvedValue(err(new NotFoundError('Profile', 'missing')));
    const handler = getProfile(svc as any);
    const res = await handler(makeReq({ params: { uid: 'missing' } }));
    expect(res.status).toBe(404);
  });

  it('updateProfile returns 200 on success', async () => {
    const svc = mockProfileService();
    svc.updatePublicProfile.mockResolvedValue(ok(undefined));
    const handler = updateProfile(svc as any);
    const res = await handler(makeReq({ params: { uid: 'u1' }, body: { displayName: 'New' } }));
    expect(res.status).toBe(200);
  });

  it('searchProfiles returns 200 with results', async () => {
    const svc = mockProfileService();
    svc.searchUsers.mockResolvedValue(ok([{ uid: 'u1' }, { uid: 'u2' }]));
    const handler = searchProfiles(svc as any);
    const res = await handler(makeReq({ body: { query: 'john', limit: 5 } }));
    expect(res.status).toBe(200);
    expect((res.body as any[]).length).toBe(2);
  });
});
