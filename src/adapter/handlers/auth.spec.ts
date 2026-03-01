import { verifySession } from './auth';
import { ok, err } from '../../types/result.types';
import { UnauthorizedError } from '../../errors/app-errors';
import type { AdapterRequest } from '../types';

function mockAuthService() {
  return { verifySession: jest.fn() };
}

function makeReq(overrides: Partial<AdapterRequest> = {}): AdapterRequest {
  return { method: 'POST', path: '/', params: {}, body: undefined, userId: 'user1', ...overrides };
}

describe('auth handler', () => {
  it('returns 200 on valid session', async () => {
    const svc = mockAuthService();
    svc.verifySession.mockResolvedValue(ok({ uid: 'u1', claims: {} }));
    const handler = verifySession(svc as any);
    const res = await handler(makeReq({ body: { sessionCookie: 'cookie123' } }));
    expect(res.status).toBe(200);
    expect(svc.verifySession).toHaveBeenCalledWith('cookie123');
  });

  it('returns 401 on invalid session', async () => {
    const svc = mockAuthService();
    svc.verifySession.mockResolvedValue(err(new UnauthorizedError('Invalid session')));
    const handler = verifySession(svc as any);
    const res = await handler(makeReq({ body: { sessionCookie: 'bad' } }));
    expect(res.status).toBe(401);
  });
});
