// src/lib/algolia-filters.ts
// Fluent builder for constructing Algolia filter strings.
// Enforces Algolia's constraint: only (OR group) AND (OR group) AND condition.

type FilterPart =
  | { kind: 'or_group'; conditions: string[] }
  | { kind: 'and'; condition: string };

export class AlgoliaFilters {
  private parts: FilterPart[] = [];
  private currentOrGroup: string[] = [];

  /**
   * Start a new OR group. Flushes the current OR group (if non-empty)
   * and begins a new one.
   */
  newOrGroup(): this {
    this.flushCurrentOrGroup();
    return this;
  }

  /**
   * Add a condition to the current OR group.
   */
  addOr(condition: string): this {
    this.currentOrGroup.push(condition);
    return this;
  }

  /**
   * Add a complete OR group as an array of conditions.
   * Flushes any current OR group first.
   */
  addOrGroup(conditions: string[]): this {
    this.flushCurrentOrGroup();
    if (conditions.length > 0) {
      this.parts.push({ kind: 'or_group', conditions: [...conditions] });
    }
    return this;
  }

  /**
   * Add a standalone AND condition.
   */
  addAnd(condition: string): this {
    this.flushCurrentOrGroup();
    this.parts.push({ kind: 'and', condition });
    return this;
  }

  /**
   * Add multiple standalone AND conditions.
   */
  addAnds(conditions: string[]): this {
    this.flushCurrentOrGroup();
    for (const c of conditions) {
      this.parts.push({ kind: 'and', condition: c });
    }
    return this;
  }

  /**
   * Build the final Algolia filter string.
   * Single-condition OR groups omit parentheses.
   */
  getFilter(): string {
    this.flushCurrentOrGroup();

    const segments: string[] = [];

    for (const part of this.parts) {
      if (part.kind === 'and') {
        segments.push(part.condition);
      } else {
        if (part.conditions.length === 1) {
          segments.push(part.conditions[0]);
        } else if (part.conditions.length > 1) {
          segments.push(`(${part.conditions.join(' OR ')})`);
        }
      }
    }

    return segments.join(' AND ');
  }

  isEmpty(): boolean {
    return this.parts.length === 0 && this.currentOrGroup.length === 0;
  }

  reset(): this {
    this.parts = [];
    this.currentOrGroup = [];
    return this;
  }

  clone(): AlgoliaFilters {
    const copy = new AlgoliaFilters();
    copy.parts = this.parts.map(p =>
      p.kind === 'and'
        ? { ...p }
        : { kind: 'or_group' as const, conditions: [...p.conditions] }
    );
    copy.currentOrGroup = [...this.currentOrGroup];
    return copy;
  }

  // --- Convenience methods ---

  /**
   * Add user permission filter.
   * Creates an OR group: refs.hasViewer:"@public" OR refs.hasViewer:"@uid:{userId}"
   */
  addUserPermissions(userId: string): this {
    this.addOrGroup([
      `refs.hasViewer:"@public"`,
      `refs.hasViewer:"@uid:${userId}"`,
    ]);
    return this;
  }

  /**
   * Add an entity type filter as an AND condition.
   */
  addType(type: string): this {
    this.addAnd(`type:${type}`);
    return this;
  }

  /**
   * Add an entity type to the current OR group.
   */
  addOrType(type: string): this {
    this.addOr(`type:${type}`);
    return this;
  }

  /**
   * Add feed ID filters as an OR group.
   */
  addFeeds(feedIds: string[]): this {
    if (feedIds.length > 0) {
      this.addOrGroup(feedIds.map(id => `feedId:${id}`));
    }
    return this;
  }

  /**
   * Add tag filters as an OR group.
   */
  addTags(tags: string[]): this {
    if (tags.length > 0) {
      this.addOrGroup(tags.map(tag => `refs.hasTag:"${tag}"`));
    }
    return this;
  }

  // --- Static factories ---

  static create(): AlgoliaFilters {
    return new AlgoliaFilters();
  }

  /**
   * Create from an existing filter string.
   * The string is added as a single AND condition (not parsed).
   */
  static fromString(filterString: string): AlgoliaFilters {
    const instance = new AlgoliaFilters();
    if (filterString && filterString.trim().length > 0) {
      instance.addAnd(filterString.trim());
    }
    return instance;
  }

  private flushCurrentOrGroup(): void {
    if (this.currentOrGroup.length > 0) {
      this.parts.push({ kind: 'or_group', conditions: [...this.currentOrGroup] });
      this.currentOrGroup = [];
    }
  }
}

export const createFilter = () => AlgoliaFilters.create();
export const createPostFilter = () => AlgoliaFilters.create().addType('post');
export const createUserPostFilter = (userId: string) =>
  AlgoliaFilters.create().addType('post').addUserPermissions(userId);
