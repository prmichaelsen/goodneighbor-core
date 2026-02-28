import { AlgoliaFilters, createFilter, createPostFilter, createUserPostFilter } from './algolia-filters';

describe('AlgoliaFilters', () => {
  describe('empty state', () => {
    it('should return empty string for new instance', () => {
      expect(AlgoliaFilters.create().getFilter()).toBe('');
    });

    it('should report isEmpty as true for new instance', () => {
      expect(AlgoliaFilters.create().isEmpty()).toBe(true);
    });
  });

  describe('addAnd', () => {
    it('should produce a single AND condition', () => {
      const filter = AlgoliaFilters.create().addAnd('type:post').getFilter();
      expect(filter).toBe('type:post');
    });

    it('should join multiple AND conditions', () => {
      const filter = AlgoliaFilters.create()
        .addAnd('type:post')
        .addAnd('isPublic:true')
        .getFilter();
      expect(filter).toBe('type:post AND isPublic:true');
    });
  });

  describe('addAnds', () => {
    it('should add multiple AND conditions at once', () => {
      const filter = AlgoliaFilters.create()
        .addAnds(['type:post', 'isPublic:true'])
        .getFilter();
      expect(filter).toBe('type:post AND isPublic:true');
    });
  });

  describe('addOrGroup', () => {
    it('should produce an OR group in parentheses', () => {
      const filter = AlgoliaFilters.create()
        .addOrGroup(['type:post', 'type:feed'])
        .getFilter();
      expect(filter).toBe('(type:post OR type:feed)');
    });

    it('should not add parentheses for single-condition group', () => {
      const filter = AlgoliaFilters.create()
        .addOrGroup(['type:post'])
        .getFilter();
      expect(filter).toBe('type:post');
    });

    it('should not add anything for empty array', () => {
      const filter = AlgoliaFilters.create()
        .addOrGroup([])
        .getFilter();
      expect(filter).toBe('');
    });
  });

  describe('addOr and newOrGroup', () => {
    it('should build OR conditions incrementally', () => {
      const filter = AlgoliaFilters.create()
        .addOr('type:post')
        .addOr('type:feed')
        .getFilter();
      expect(filter).toBe('(type:post OR type:feed)');
    });

    it('should separate OR groups with AND', () => {
      const filter = AlgoliaFilters.create()
        .addOr('type:post')
        .addOr('type:feed')
        .newOrGroup()
        .addOr('refs.hasViewer:"@public"')
        .addOr('refs.hasViewer:"@uid:abc123"')
        .getFilter();
      expect(filter).toBe(
        '(type:post OR type:feed) AND (refs.hasViewer:"@public" OR refs.hasViewer:"@uid:abc123")'
      );
    });
  });

  describe('addUserPermissions', () => {
    it('should add refs.hasViewer OR group with @public and @uid: format', () => {
      const filter = AlgoliaFilters.create()
        .addUserPermissions('abc123')
        .getFilter();
      expect(filter).toBe(
        '(refs.hasViewer:"@public" OR refs.hasViewer:"@uid:abc123")'
      );
    });
  });

  describe('addType', () => {
    it('should add type as AND condition', () => {
      const filter = AlgoliaFilters.create()
        .addType('post')
        .getFilter();
      expect(filter).toBe('type:post');
    });
  });

  describe('addOrType', () => {
    it('should add type to current OR group', () => {
      const filter = AlgoliaFilters.create()
        .addOrType('post')
        .addOrType('feed')
        .getFilter();
      expect(filter).toBe('(type:post OR type:feed)');
    });
  });

  describe('addFeeds', () => {
    it('should add feed IDs as OR group', () => {
      const filter = AlgoliaFilters.create()
        .addFeeds(['feed-1', 'feed-2'])
        .getFilter();
      expect(filter).toBe('(feedId:feed-1 OR feedId:feed-2)');
    });

    it('should not add anything for empty feed array', () => {
      const filter = AlgoliaFilters.create()
        .addFeeds([])
        .getFilter();
      expect(filter).toBe('');
    });
  });

  describe('addTags', () => {
    it('should add tags as OR group with refs.hasTag', () => {
      const filter = AlgoliaFilters.create()
        .addTags(['safety', 'alert'])
        .getFilter();
      expect(filter).toBe('(refs.hasTag:"safety" OR refs.hasTag:"alert")');
    });

    it('should not add anything for empty tags array', () => {
      const filter = AlgoliaFilters.create()
        .addTags([])
        .getFilter();
      expect(filter).toBe('');
    });
  });

  describe('complex filter combinations', () => {
    it('should build type + user permissions filter', () => {
      const filter = AlgoliaFilters.create()
        .addType('post')
        .addUserPermissions('user123')
        .getFilter();
      expect(filter).toBe(
        'type:post AND (refs.hasViewer:"@public" OR refs.hasViewer:"@uid:user123")'
      );
    });

    it('should build multi-type + permissions + tags filter', () => {
      const filter = AlgoliaFilters.create()
        .addOrType('post')
        .addOrType('feed')
        .newOrGroup()
        .addUserPermissions('user123')
        .addTags(['safety'])
        .getFilter();
      expect(filter).toContain('(type:post OR type:feed)');
      expect(filter).toContain('refs.hasViewer:"@public"');
      expect(filter).toContain('refs.hasTag:"safety"');
    });
  });

  describe('static factories', () => {
    it('create() should return empty instance', () => {
      expect(AlgoliaFilters.create().isEmpty()).toBe(true);
    });

    it('fromString() should wrap existing filter as AND condition', () => {
      const filters = AlgoliaFilters.fromString('type:post');
      expect(filters.getFilter()).toBe('type:post');
      expect(filters.isEmpty()).toBe(false);
    });

    it('fromString() with additional conditions', () => {
      const filters = AlgoliaFilters.fromString('type:post')
        .addUserPermissions('user123');
      expect(filters.getFilter()).toBe(
        'type:post AND (refs.hasViewer:"@public" OR refs.hasViewer:"@uid:user123")'
      );
    });

    it('fromString() with empty string returns empty instance', () => {
      expect(AlgoliaFilters.fromString('').isEmpty()).toBe(true);
    });

    it('fromString() with whitespace-only string returns empty instance', () => {
      expect(AlgoliaFilters.fromString('   ').isEmpty()).toBe(true);
    });
  });

  describe('reset', () => {
    it('should clear all state', () => {
      const filters = AlgoliaFilters.create()
        .addType('post')
        .addUserPermissions('user1');
      expect(filters.isEmpty()).toBe(false);
      filters.reset();
      expect(filters.isEmpty()).toBe(true);
      expect(filters.getFilter()).toBe('');
    });
  });

  describe('clone', () => {
    it('should produce an independent copy', () => {
      const original = AlgoliaFilters.create().addType('post');
      const copy = original.clone();

      copy.addUserPermissions('user1');

      expect(original.getFilter()).toBe('type:post');
      expect(copy.getFilter()).toContain('refs.hasViewer');
    });
  });

  describe('convenience factories', () => {
    it('createFilter() should return empty builder', () => {
      expect(createFilter().isEmpty()).toBe(true);
    });

    it('createPostFilter() should return type:post', () => {
      expect(createPostFilter().getFilter()).toBe('type:post');
    });

    it('createUserPostFilter() should return type + permissions', () => {
      const filter = createUserPostFilter('user1').getFilter();
      expect(filter).toBe(
        'type:post AND (refs.hasViewer:"@public" OR refs.hasViewer:"@uid:user1")'
      );
    });
  });
});
