import { resultToResponse } from './result-mapper';
import { ok, err } from '../types/result.types';
import { ValidationError, NotFoundError, UnauthorizedError, ForbiddenError, ExternalServiceError } from '../errors/app-errors';

describe('resultToResponse', () => {
  it('maps ok result to success status with value body', () => {
    const result = ok({ id: '1', title: 'Hello' });
    const response = resultToResponse(result);
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ id: '1', title: 'Hello' });
  });

  it('uses custom success status', () => {
    const result = ok({ id: '1' });
    const response = resultToResponse(result, 201);
    expect(response.status).toBe(201);
  });

  it('maps ok void result to null body', () => {
    const result = ok(undefined);
    const response = resultToResponse(result as any, 204);
    expect(response.status).toBe(204);
    expect(response.body).toBeNull();
  });

  it('maps validation error to 400', () => {
    const result = err(new ValidationError('Invalid input'));
    const response = resultToResponse(result);
    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({ error: 'VALIDATION_ERROR', message: 'Invalid input' });
  });

  it('maps not_found error to 404', () => {
    const result = err(new NotFoundError('Post', 'p1'));
    const response = resultToResponse(result);
    expect(response.status).toBe(404);
    expect(response.body).toMatchObject({ error: 'NOT_FOUND' });
  });

  it('maps unauthorized error to 401', () => {
    const result = err(new UnauthorizedError('Bad session'));
    const response = resultToResponse(result);
    expect(response.status).toBe(401);
  });

  it('maps forbidden error to 403', () => {
    const result = err(new ForbiddenError('Not allowed'));
    const response = resultToResponse(result);
    expect(response.status).toBe(403);
  });

  it('maps external_service error to 502', () => {
    const result = err(new ExternalServiceError('firestore', 'DB down'));
    const response = resultToResponse(result);
    expect(response.status).toBe(502);
  });

  it('includes context when present', () => {
    const result = err(new ValidationError('Bad field', { email: ['Invalid format'] }));
    const response = resultToResponse(result);
    expect((response.body as any).context).toEqual({ fields: { email: ['Invalid format'] } });
  });
});
