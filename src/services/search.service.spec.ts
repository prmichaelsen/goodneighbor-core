import { SearchService } from './search.service';
import { ALGOLIA_INDEX_SETTINGS } from '../lib/algolia-index-settings';

function createMockClients() {
  const mockSearchClient = {
    searchSingleIndex: jest.fn().mockResolvedValue({
      hits: [],
      nbHits: 0,
      page: 0,
      nbPages: 0,
      hitsPerPage: 20,
      processingTimeMS: 1,
      query: '',
    }),
  };
  const mockAdminClient = {
    saveObject: jest.fn().mockResolvedValue({}),
    saveObjects: jest.fn().mockResolvedValue({}),
    partialUpdateObject: jest.fn().mockResolvedValue({}),
    deleteObject: jest.fn().mockResolvedValue({}),
    deleteObjects: jest.fn().mockResolvedValue({}),
    setSettings: jest.fn().mockResolvedValue({}),
  };
  const mockLogger = { error: jest.fn(), warn: jest.fn() };
  return { mockSearchClient, mockAdminClient, mockLogger };
}

describe('SearchService', () => {
  let mockSearchClient: ReturnType<typeof createMockClients>['mockSearchClient'];
  let mockAdminClient: ReturnType<typeof createMockClients>['mockAdminClient'];
  let mockLogger: ReturnType<typeof createMockClients>['mockLogger'];
  let service: SearchService;

  beforeEach(() => {
    ({ mockSearchClient, mockAdminClient, mockLogger } = createMockClients());
    service = new SearchService({
      searchClient: mockSearchClient,
      adminClient: mockAdminClient,
      indexName: 'test_index',
      logger: mockLogger,
    });
  });

  describe('search', () => {
    it('should inject user permission filter', async () => {
      await service.search({ query: 'test' }, 'user123');

      const call = mockSearchClient.searchSingleIndex.mock.calls[0][0];
      expect(call.indexName).toBe('test_index');
      expect(call.searchParams.filters).toContain('refs.hasViewer:"@public"');
      expect(call.searchParams.filters).toContain('refs.hasViewer:"@uid:user123"');
    });

    it('should restrict to public content when no userId', async () => {
      await service.search({ query: 'test' });

      const call = mockSearchClient.searchSingleIndex.mock.calls[0][0];
      expect(call.searchParams.filters).toContain('refs.hasViewer:"@public"');
      expect(call.searchParams.filters).not.toContain('@uid:');
    });

    it('should merge default attributes', async () => {
      await service.search({ query: 'test' }, 'user1');

      const call = mockSearchClient.searchSingleIndex.mock.calls[0][0];
      expect(call.searchParams.attributesToRetrieve).toContain('id');
      expect(call.searchParams.attributesToRetrieve).toContain('type');
      expect(call.searchParams.attributesToRetrieve).toContain('properties.displayName');
    });

    it('should merge caller attributes with defaults', async () => {
      await service.search({
        query: 'test',
        attributesToRetrieve: ['custom.field'],
      }, 'user1');

      const call = mockSearchClient.searchSingleIndex.mock.calls[0][0];
      expect(call.searchParams.attributesToRetrieve).toContain('custom.field');
      expect(call.searchParams.attributesToRetrieve).toContain('id');
    });

    it('should deduplicate attributes', async () => {
      await service.search({
        query: 'test',
        attributesToRetrieve: ['id', 'type'],
      }, 'user1');

      const call = mockSearchClient.searchSingleIndex.mock.calls[0][0];
      const attrs = call.searchParams.attributesToRetrieve as string[];
      const idCount = attrs.filter((a: string) => a === 'id').length;
      expect(idCount).toBe(1);
    });

    it('should preserve existing filters', async () => {
      await service.search({
        query: 'test',
        filters: 'type:post',
      }, 'user1');

      const call = mockSearchClient.searchSingleIndex.mock.calls[0][0];
      expect(call.searchParams.filters).toContain('type:post');
      expect(call.searchParams.filters).toContain('refs.hasViewer');
    });

    it('should return ok result on success', async () => {
      const result = await service.search({ query: 'test' }, 'user1');
      expect(result.ok).toBe(true);
    });

    it('should return search response fields', async () => {
      mockSearchClient.searchSingleIndex.mockResolvedValue({
        hits: [{ objectID: '1', type: 'post' }],
        nbHits: 1,
        page: 0,
        nbPages: 1,
        hitsPerPage: 20,
        processingTimeMS: 5,
        query: 'test',
      });

      const result = await service.search({ query: 'test' }, 'user1');
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.hits).toHaveLength(1);
        expect(result.value.nbHits).toBe(1);
        expect(result.value.processingTimeMS).toBe(5);
      }
    });

    it('should return err result on Algolia failure', async () => {
      mockSearchClient.searchSingleIndex.mockRejectedValue(new Error('Network error'));
      const result = await service.search({ query: 'test' }, 'user1');
      expect(result.ok).toBe(false);
    });

    it('should pass the query to Algolia', async () => {
      await service.search({ query: 'hello world' }, 'user1');

      const call = mockSearchClient.searchSingleIndex.mock.calls[0][0];
      expect(call.searchParams.query).toBe('hello world');
    });
  });

  describe('indexDocument', () => {
    it('should call saveObject with objectID', async () => {
      await service.indexDocument({ title: 'Test' }, 'doc-1');

      expect(mockAdminClient.saveObject).toHaveBeenCalledWith({
        indexName: 'test_index',
        body: { title: 'Test', objectID: 'doc-1' },
      });
    });

    it('should return ok on success', async () => {
      const result = await service.indexDocument({ title: 'Test' }, 'doc-1');
      expect(result.ok).toBe(true);
    });

    it('should catch errors and log them', async () => {
      mockAdminClient.saveObject.mockRejectedValue(new Error('Index error'));
      const result = await service.indexDocument({ title: 'Test' }, 'doc-1');

      expect(result.ok).toBe(false);
      expect(mockLogger.error).toHaveBeenCalled();
    });

    it('should not throw on error', async () => {
      mockAdminClient.saveObject.mockRejectedValue(new Error('Index error'));
      await expect(
        service.indexDocument({ title: 'Test' }, 'doc-1')
      ).resolves.toBeDefined();
    });
  });

  describe('indexDocuments', () => {
    it('should call saveObjects with documents', async () => {
      const docs = [
        { objectID: 'doc-1', title: 'A' },
        { objectID: 'doc-2', title: 'B' },
      ];
      await service.indexDocuments(docs);

      expect(mockAdminClient.saveObjects).toHaveBeenCalledWith({
        indexName: 'test_index',
        objects: docs,
      });
    });

    it('should return ok on success', async () => {
      const result = await service.indexDocuments([{ objectID: 'doc-1', title: 'A' }]);
      expect(result.ok).toBe(true);
    });

    it('should catch and log errors', async () => {
      mockAdminClient.saveObjects.mockRejectedValue(new Error('Batch error'));
      const result = await service.indexDocuments([{ objectID: 'doc-1' }]);
      expect(result.ok).toBe(false);
      expect(mockLogger.error).toHaveBeenCalled();
    });
  });

  describe('updateDocument', () => {
    it('should call partialUpdateObject', async () => {
      await service.updateDocument('doc-1', { title: 'Updated' });

      expect(mockAdminClient.partialUpdateObject).toHaveBeenCalledWith({
        indexName: 'test_index',
        objectID: 'doc-1',
        attributesToUpdate: { title: 'Updated' },
      });
    });

    it('should return ok on success', async () => {
      const result = await service.updateDocument('doc-1', { title: 'Updated' });
      expect(result.ok).toBe(true);
    });

    it('should catch and log errors', async () => {
      mockAdminClient.partialUpdateObject.mockRejectedValue(new Error('Update error'));
      const result = await service.updateDocument('doc-1', { title: 'X' });
      expect(result.ok).toBe(false);
      expect(mockLogger.error).toHaveBeenCalled();
    });
  });

  describe('deleteDocument', () => {
    it('should call deleteObject with objectID', async () => {
      await service.deleteDocument('doc-1');
      expect(mockAdminClient.deleteObject).toHaveBeenCalledWith({
        indexName: 'test_index',
        objectID: 'doc-1',
      });
    });

    it('should return ok on success', async () => {
      const result = await service.deleteDocument('doc-1');
      expect(result.ok).toBe(true);
    });

    it('should catch and log errors', async () => {
      mockAdminClient.deleteObject.mockRejectedValue(new Error('Delete error'));
      const result = await service.deleteDocument('doc-1');
      expect(result.ok).toBe(false);
      expect(mockLogger.error).toHaveBeenCalled();
    });
  });

  describe('deleteDocuments', () => {
    it('should call deleteObjects with objectIDs', async () => {
      await service.deleteDocuments(['doc-1', 'doc-2']);
      expect(mockAdminClient.deleteObjects).toHaveBeenCalledWith({
        indexName: 'test_index',
        objectIDs: ['doc-1', 'doc-2'],
      });
    });

    it('should return ok on success', async () => {
      const result = await service.deleteDocuments(['doc-1']);
      expect(result.ok).toBe(true);
    });

    it('should catch and log errors', async () => {
      mockAdminClient.deleteObjects.mockRejectedValue(new Error('Batch delete error'));
      const result = await service.deleteDocuments(['doc-1']);
      expect(result.ok).toBe(false);
      expect(mockLogger.error).toHaveBeenCalled();
    });
  });

  describe('initializeIndex', () => {
    it('should call setSettings with the index configuration', async () => {
      await service.initializeIndex();

      expect(mockAdminClient.setSettings).toHaveBeenCalledTimes(1);
      const call = mockAdminClient.setSettings.mock.calls[0][0];
      expect(call.indexName).toBe('test_index');

      const settings = call.indexSettings;
      expect(settings.searchableAttributes).toEqual([
        'search',
        'properties.mainContent',
        'properties.displayName',
      ]);
    });

    it('should include all refs.* facets for permission filtering', async () => {
      await service.initializeIndex();

      const settings = mockAdminClient.setSettings.mock.calls[0][0].indexSettings;
      const facets = settings.attributesForFaceting;

      expect(facets).toContain('refs.hasViewer');
      expect(facets).toContain('refs.hasOwner');
      expect(facets).toContain('refs.hasSubject');
      expect(facets).toContain('refs.hasFollower');
      expect(facets).toContain('refs.hasModerator');
      expect(facets).toContain('refs.hasTag');
      expect(facets).toContain('refs.hasMention');
      expect(facets).toContain('refs.hasLiker');
    });

    it('should include type and isPublic in facets', async () => {
      await service.initializeIndex();

      const settings = mockAdminClient.setSettings.mock.calls[0][0].indexSettings;
      expect(settings.attributesForFaceting).toContain('type');
      expect(settings.attributesForFaceting).toContain('isPublic');
    });

    it('should include comment threading facets', async () => {
      await service.initializeIndex();

      const settings = mockAdminClient.setSettings.mock.calls[0][0].indexSettings;
      expect(settings.attributesForFaceting).toContain('parentId');
      expect(settings.attributesForFaceting).toContain('threadRootId');
    });

    it('should set custom ranking with recency first', async () => {
      await service.initializeIndex();

      const settings = mockAdminClient.setSettings.mock.calls[0][0].indexSettings;
      expect(settings.customRanking[0]).toBe('desc(createdAt)');
    });

    it('should configure typo tolerance', async () => {
      await service.initializeIndex();

      const settings = mockAdminClient.setSettings.mock.calls[0][0].indexSettings;
      expect(settings.typoTolerance).toBe(true);
      expect(settings.minWordSizefor1Typo).toBe(4);
      expect(settings.minWordSizefor2Typos).toBe(8);
    });

    it('should set pagination defaults', async () => {
      await service.initializeIndex();

      const settings = mockAdminClient.setSettings.mock.calls[0][0].indexSettings;
      expect(settings.hitsPerPage).toBe(20);
      expect(settings.maxValuesPerFacet).toBe(100);
    });

    it('should configure highlighting', async () => {
      await service.initializeIndex();

      const settings = mockAdminClient.setSettings.mock.calls[0][0].indexSettings;
      expect(settings.attributesToHighlight).toContain('search');
      expect(settings.attributesToHighlight).toContain('properties.mainContent');
      expect(settings.attributesToHighlight).toContain('properties.displayName');
    });

    it('should configure snippets', async () => {
      await service.initializeIndex();

      const settings = mockAdminClient.setSettings.mock.calls[0][0].indexSettings;
      expect(settings.attributesToSnippet).toContain('content:50');
      expect(settings.attributesToSnippet).toContain('search:30');
    });

    it('should return ok on success', async () => {
      const result = await service.initializeIndex();
      expect(result.ok).toBe(true);
    });

    it('should return err on Algolia failure', async () => {
      mockAdminClient.setSettings.mockRejectedValue(new Error('Config error'));
      const result = await service.initializeIndex();
      expect(result.ok).toBe(false);
    });

    it('should log error on failure', async () => {
      mockAdminClient.setSettings.mockRejectedValue(new Error('Config error'));
      await service.initializeIndex();
      expect(mockLogger.error).toHaveBeenCalled();
    });
  });

  describe('without logger', () => {
    it('should not throw when logger is not provided', async () => {
      const serviceNoLogger = new SearchService({
        searchClient: mockSearchClient,
        adminClient: mockAdminClient,
        indexName: 'test_index',
      });
      mockAdminClient.saveObject.mockRejectedValue(new Error('fail'));
      const result = await serviceNoLogger.indexDocument({ title: 'X' }, 'doc-1');
      expect(result.ok).toBe(false);
    });
  });
});

describe('ALGOLIA_INDEX_SETTINGS', () => {
  it('should have all required top-level settings keys', () => {
    const requiredKeys = [
      'searchableAttributes',
      'attributesForFaceting',
      'customRanking',
      'attributesToRetrieve',
      'attributesToHighlight',
      'attributesToSnippet',
      'hitsPerPage',
      'maxValuesPerFacet',
      'typoTolerance',
      'minWordSizefor1Typo',
      'minWordSizefor2Typos',
      'enableRules',
    ];

    for (const key of requiredKeys) {
      expect(ALGOLIA_INDEX_SETTINGS).toHaveProperty(key);
    }
  });

  it('should have exactly 3 searchable attributes', () => {
    expect(ALGOLIA_INDEX_SETTINGS.searchableAttributes).toHaveLength(3);
  });

  it('should have searchable attributes in priority order', () => {
    const attrs = ALGOLIA_INDEX_SETTINGS.searchableAttributes;
    expect(attrs[0]).toBe('search');
    expect(attrs[1]).toBe('properties.mainContent');
    expect(attrs[2]).toBe('properties.displayName');
  });

  it('should have at least 14 facetable attributes', () => {
    expect(ALGOLIA_INDEX_SETTINGS.attributesForFaceting.length).toBeGreaterThanOrEqual(14);
  });
});
