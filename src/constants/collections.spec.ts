import { COLLECTIONS, COLLECTION_CATEGORIES } from './collections';
import type { CollectionPath } from './collections';

describe('Firestore Collection Constants', () => {
  it('should define exactly 26 collection paths', () => {
    const paths = Object.values(COLLECTIONS);
    expect(paths).toHaveLength(26);
  });

  it('should have all paths starting with "goodneighbor"', () => {
    const paths = Object.values(COLLECTIONS);
    for (const path of paths) {
      expect(path).toMatch(/^goodneighbor/);
    }
  });

  it('should not contain any cleanbook collection paths', () => {
    const paths = Object.values(COLLECTIONS);
    const cleanBookTerms = ['clean', 'guesty', 'mellow', 'appointment', 'property', 'digest', 'manager'];
    for (const path of paths) {
      for (const term of cleanBookTerms) {
        expect(path.toLowerCase()).not.toContain(term);
      }
    }
  });

  it('should have SEARCH collection using dot notation', () => {
    expect(COLLECTIONS.SEARCH).toBe('goodneighbor.search');
  });

  it('should have all non-SEARCH paths using subcollection notation', () => {
    const paths = Object.entries(COLLECTIONS)
      .filter(([key]) => key !== 'SEARCH')
      .map(([, value]) => value);
    for (const path of paths) {
      expect(path).toMatch(/^goodneighbor\/collections\//);
    }
  });

  it('should have category counts summing to total', () => {
    const categoryTotal = Object.values(COLLECTION_CATEGORIES)
      .reduce((sum, paths) => sum + paths.length, 0);
    expect(categoryTotal).toBe(Object.keys(COLLECTIONS).length);
  });

  it('should have all unique paths (no duplicates)', () => {
    const paths = Object.values(COLLECTIONS);
    const uniquePaths = new Set(paths);
    expect(uniquePaths.size).toBe(paths.length);
  });

  it('should have correct category groupings', () => {
    expect(COLLECTION_CATEGORIES.PROFILE).toHaveLength(4);
    expect(COLLECTION_CATEGORIES.AUTH).toHaveLength(2);
    expect(COLLECTION_CATEGORIES.CONTENT).toHaveLength(4);
    expect(COLLECTION_CATEGORIES.RELATIONSHIPS).toHaveLength(4);
    expect(COLLECTION_CATEGORIES.STORE).toHaveLength(5);
    expect(COLLECTION_CATEGORIES.SYSTEM).toHaveLength(7);
  });

  it('should support CollectionPath type narrowing', () => {
    const path: CollectionPath = COLLECTIONS.SEARCH;
    expect(path).toBe('goodneighbor.search');
  });
});
