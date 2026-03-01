import { CommentService } from './comment.service';
import { COLLECTIONS } from '../constants/collections';

jest.mock('@prmichaelsen/firebase-admin-sdk-v8', () => ({
  setDocument: jest.fn(),
  getDocument: jest.fn(),
  queryDocuments: jest.fn(),
  batchWrite: jest.fn(),
  FieldValue: {
    arrayUnion: jest.fn((...args: any[]) => ({ _type: 'arrayUnion', values: args })),
    arrayRemove: jest.fn((...args: any[]) => ({ _type: 'arrayRemove', values: args })),
    increment: jest.fn((n: number) => ({ _type: 'increment', value: n })),
  },
}));

const sdk = require('@prmichaelsen/firebase-admin-sdk-v8');

function createService() {
  return new CommentService({ logger: { error: jest.fn() } });
}

describe('CommentService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    sdk.setDocument.mockResolvedValue(undefined);
    sdk.getDocument.mockResolvedValue(null);
    sdk.queryDocuments.mockResolvedValue([]);
    sdk.batchWrite.mockResolvedValue({ results: [] });
  });

  describe('createComment', () => {
    it('should create a comment and update parent post', async () => {
      sdk.getDocument.mockResolvedValue({ type: 'post', id: 'post-1' });
      const service = createService();
      const result = await service.createComment('post-1', 'Great post!', 'user-1');
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.postId).toBe('post-1');
        expect(result.value.content).toBe('Great post!');
        expect(result.value.authorId).toBe('user-1');
      }
    });

    it('should use batchWrite for atomic comment creation + parent update', async () => {
      sdk.getDocument.mockResolvedValue({ type: 'post', id: 'post-1' });
      const service = createService();
      await service.createComment('post-1', 'Nice!', 'user-1');
      expect(sdk.batchWrite).toHaveBeenCalledWith([
        expect.objectContaining({
          type: 'set',
          collectionPath: COLLECTIONS.POST_COMMENTS,
        }),
        expect.objectContaining({
          type: 'update',
          collectionPath: COLLECTIONS.SEARCH,
          documentId: 'post-1',
        }),
      ]);
    });

    it('should update parent refs with comment ID and commenter', async () => {
      sdk.getDocument.mockResolvedValue({ type: 'post', id: 'post-1' });
      const service = createService();
      await service.createComment('post-1', 'Comment', 'user-1');
      const batchOps = sdk.batchWrite.mock.calls[0][0];
      const updateOp = batchOps[1];
      expect(updateOp.data['refs.hasCommenter']).toEqual(
        expect.objectContaining({ _type: 'arrayUnion', values: ['@uid:user-1'] }),
      );
      expect(updateOp.data['stats.comments']).toEqual(
        expect.objectContaining({ _type: 'increment', value: 1 }),
      );
    });

    it('should return ValidationError for empty content', async () => {
      const service = createService();
      const result = await service.createComment('post-1', '', 'user-1');
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.message).toContain('required');
      }
    });

    it('should return ValidationError for content exceeding max length', async () => {
      const service = createService();
      const longContent = 'a'.repeat(5001);
      const result = await service.createComment('post-1', longContent, 'user-1');
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.message).toContain('maximum length');
      }
    });

    it('should return NotFoundError when post does not exist', async () => {
      sdk.getDocument.mockResolvedValue(null);
      const service = createService();
      const result = await service.createComment('missing', 'Comment', 'user-1');
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.message).toContain('not found');
      }
    });

    it('should return ExternalServiceError on Firestore failure', async () => {
      sdk.getDocument.mockResolvedValue({ type: 'post' });
      sdk.batchWrite.mockRejectedValue(new Error('batch failed'));
      const service = createService();
      const result = await service.createComment('post-1', 'Comment', 'user-1');
      expect(result.ok).toBe(false);
    });
  });

  describe('getComments', () => {
    it('should return paginated comments', async () => {
      const mockComments = [
        { id: 'c1', data: { postId: 'p1', content: 'First', timestamps: { createdAt: '2024-01-02' } } },
        { id: 'c2', data: { postId: 'p1', content: 'Second', timestamps: { createdAt: '2024-01-01' } } },
      ];
      sdk.queryDocuments.mockResolvedValue(mockComments);
      const service = createService();
      const result = await service.getComments('p1');
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.items).toHaveLength(2);
        expect(result.value.hasNextPage).toBe(false);
      }
    });

    it('should detect hasNextPage when more results exist', async () => {
      // Default limit is 20, so return 21 items to trigger hasNextPage
      const mockComments = Array.from({ length: 21 }, (_, i) => ({
        id: `c${i}`,
        data: { postId: 'p1', content: `Comment ${i}`, timestamps: { createdAt: `2024-01-${String(i + 1).padStart(2, '0')}` } },
      }));
      sdk.queryDocuments.mockResolvedValue(mockComments);
      const service = createService();
      const result = await service.getComments('p1');
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.items).toHaveLength(20);
        expect(result.value.hasNextPage).toBe(true);
        expect(result.value.nextCursor).toBeTruthy();
      }
    });

    it('should pass cursor as startAfter', async () => {
      sdk.queryDocuments.mockResolvedValue([]);
      const service = createService();
      await service.getComments('p1', { cursor: '2024-01-15' });
      expect(sdk.queryDocuments).toHaveBeenCalledWith(
        COLLECTIONS.POST_COMMENTS,
        expect.objectContaining({
          startAfter: ['2024-01-15'],
        }),
      );
    });

    it('should respect custom limit', async () => {
      sdk.queryDocuments.mockResolvedValue([]);
      const service = createService();
      await service.getComments('p1', { limit: 5 });
      expect(sdk.queryDocuments).toHaveBeenCalledWith(
        COLLECTIONS.POST_COMMENTS,
        expect.objectContaining({ limit: 6 }), // limit + 1
      );
    });

    it('should cap limit at MAX_LIMIT', async () => {
      sdk.queryDocuments.mockResolvedValue([]);
      const service = createService();
      await service.getComments('p1', { limit: 200 });
      expect(sdk.queryDocuments).toHaveBeenCalledWith(
        COLLECTIONS.POST_COMMENTS,
        expect.objectContaining({ limit: 101 }), // MAX_LIMIT(100) + 1
      );
    });
  });

  describe('createReply', () => {
    it('should create a reply and update parent comment', async () => {
      sdk.getDocument.mockResolvedValue({ id: 'c1', postId: 'p1', content: 'Parent' });
      const service = createService();
      const result = await service.createReply('c1', 'Reply text', 'user-1');
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.commentId).toBe('c1');
        expect(result.value.content).toBe('Reply text');
      }
    });

    it('should use batchWrite for atomic reply + parent update', async () => {
      sdk.getDocument.mockResolvedValue({ id: 'c1', postId: 'p1' });
      const service = createService();
      await service.createReply('c1', 'Reply', 'user-1');
      expect(sdk.batchWrite).toHaveBeenCalledWith([
        expect.objectContaining({
          type: 'set',
          collectionPath: COLLECTIONS.COMMENT_REPLIES,
        }),
        expect.objectContaining({
          type: 'update',
          collectionPath: COLLECTIONS.POST_COMMENTS,
          documentId: 'c1',
          data: expect.objectContaining({
            replyCount: expect.objectContaining({ _type: 'increment', value: 1 }),
          }),
        }),
      ]);
    });

    it('should return ValidationError for empty reply', async () => {
      const service = createService();
      const result = await service.createReply('c1', '', 'user-1');
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.message).toContain('required');
      }
    });

    it('should return NotFoundError when comment does not exist', async () => {
      sdk.getDocument.mockResolvedValue(null);
      const service = createService();
      const result = await service.createReply('missing', 'Reply', 'user-1');
      expect(result.ok).toBe(false);
    });
  });
});
