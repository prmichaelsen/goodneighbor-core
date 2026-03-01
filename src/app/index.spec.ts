// src/app/index.spec.ts

import { createAppClient } from './index';
import { ContentOperations } from './content';
import { ProfileOperations } from './profiles';
import { DiscoveryOperations } from './discovery';

describe('createAppClient', () => {
  it('should create client with all operation groups', () => {
    const client = createAppClient({ baseUrl: 'http://localhost:3000' });

    expect(client.content).toBeInstanceOf(ContentOperations);
    expect(client.profiles).toBeInstanceOf(ProfileOperations);
    expect(client.discovery).toBeInstanceOf(DiscoveryOperations);
  });

  it('should throw in browser environment', () => {
    (globalThis as any).window = {};
    try {
      expect(() => createAppClient({ baseUrl: 'http://localhost:3000' })).toThrow(
        'server-side only',
      );
    } finally {
      delete (globalThis as any).window;
    }
  });
});
