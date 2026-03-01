// src/web/context.spec.ts

import { createWebSDKContext, type WebSDKContext } from './context';
import { ServiceContainer } from '../container';

describe('WebSDKContext', () => {
  it('should create a context with container and userId', () => {
    const container = new ServiceContainer();
    const ctx = createWebSDKContext(container, 'user-123');

    expect(ctx.container).toBe(container);
    expect(ctx.userId).toBe('user-123');
  });

  it('should satisfy the WebSDKContext interface', () => {
    const container = new ServiceContainer();
    const ctx: WebSDKContext = createWebSDKContext(container, 'abc');

    expect(ctx).toHaveProperty('container');
    expect(ctx).toHaveProperty('userId');
  });
});
