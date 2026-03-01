import { createSvcClient } from './index';
import type { SvcClient } from './index';

// Mock guard to prevent browser check in Node test env
jest.mock('../../guard', () => ({
  assertServerSide: jest.fn(),
}));

// Mock fetch globally
const mockFetch = jest.fn();
global.fetch = mockFetch;

describe('createSvcClient', () => {
  const config = {
    baseUrl: 'https://api.example.com',
    getAuthToken: async () => 'test-token',
  };

  it('returns an object with all 6 resource properties', () => {
    const client = createSvcClient(config);
    expect(client.posts).toBeDefined();
    expect(client.profiles).toBeDefined();
    expect(client.feeds).toBeDefined();
    expect(client.comments).toBeDefined();
    expect(client.search).toBeDefined();
    expect(client.auth).toBeDefined();
  });

  it('resources have expected methods', () => {
    const client = createSvcClient(config);
    // Posts
    expect(typeof client.posts.create).toBe('function');
    expect(typeof client.posts.get).toBe('function');
    expect(typeof client.posts.delete).toBe('function');
    // Profiles
    expect(typeof client.profiles.get).toBe('function');
    expect(typeof client.profiles.update).toBe('function');
    expect(typeof client.profiles.search).toBe('function');
    // Feeds
    expect(typeof client.feeds.create).toBe('function');
    expect(typeof client.feeds.get).toBe('function');
    expect(typeof client.feeds.follow).toBe('function');
    expect(typeof client.feeds.unfollow).toBe('function');
    expect(typeof client.feeds.submit).toBe('function');
    // Comments
    expect(typeof client.comments.create).toBe('function');
    expect(typeof client.comments.list).toBe('function');
    expect(typeof client.comments.delete).toBe('function');
    // Search
    expect(typeof client.search.search).toBe('function');
    // Auth
    expect(typeof client.auth.verifySession).toBe('function');
  });

  it('calls assertServerSide on creation', () => {
    const { assertServerSide } = require('../../guard');
    (assertServerSide as jest.Mock).mockClear();
    createSvcClient(config);
    expect(assertServerSide).toHaveBeenCalledTimes(1);
  });

  it('satisfies SvcClient interface', () => {
    const client: SvcClient = createSvcClient(config);
    expect(client).toBeDefined();
  });
});
