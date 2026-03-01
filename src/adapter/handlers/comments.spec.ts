import { createComment, listComments, deleteComment } from './comments';
import { ok, err } from '../../types/result.types';
import { ValidationError } from '../../errors/app-errors';
import type { AdapterRequest } from '../types';

function mockCommentService() {
  return { createComment: jest.fn(), getComments: jest.fn() };
}

function makeReq(overrides: Partial<AdapterRequest> = {}): AdapterRequest {
  return { method: 'POST', path: '/', params: {}, body: undefined, userId: 'user1', ...overrides };
}

describe('comments handlers', () => {
  it('createComment returns 201', async () => {
    const svc = mockCommentService();
    svc.createComment.mockResolvedValue(ok({ id: 'c1' }));
    const handler = createComment(svc as any);
    const res = await handler(makeReq({ body: { postId: 'p1', content: 'Nice!' } }));
    expect(res.status).toBe(201);
    expect(svc.createComment).toHaveBeenCalledWith('p1', 'Nice!', 'user1');
  });

  it('createComment returns 400 on validation error', async () => {
    const svc = mockCommentService();
    svc.createComment.mockResolvedValue(err(new ValidationError('Content required')));
    const handler = createComment(svc as any);
    const res = await handler(makeReq({ body: { postId: 'p1', content: '' } }));
    expect(res.status).toBe(400);
  });

  it('listComments returns 200 with pagination', async () => {
    const svc = mockCommentService();
    svc.getComments.mockResolvedValue(ok({ items: [{ id: 'c1' }], total: 1 }));
    const handler = listComments(svc as any);
    const res = await handler(makeReq({
      params: { id: 'p1' },
      query: { cursor: 'abc', limit: '5' },
    }));
    expect(res.status).toBe(200);
    expect(svc.getComments).toHaveBeenCalledWith('p1', { cursor: 'abc', limit: 5 });
  });

  it('deleteComment returns 501 not implemented', async () => {
    const handler = deleteComment();
    const res = await handler(makeReq({ params: { id: 'c1' } }));
    expect(res.status).toBe(501);
  });
});
