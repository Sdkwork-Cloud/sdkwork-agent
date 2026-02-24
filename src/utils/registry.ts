export interface RegistryItem {
  id: string;
  name?: string;
}

export interface RegistryOptions<T extends RegistryItem> {
  caseSensitive?: boolean;
  allowOverwrite?: boolean;
  onRegister?: (item: T) => void;
  onUnregister?: (id: string) => void;
}

export class BaseRegistry<T extends RegistryItem> {
  protected items: Map<string, T> = new Map();
  protected aliases: Map<string, string> = new Map();
  protected options: RegistryOptions<T>;

  constructor(options: RegistryOptions<T> = {}) {
    this.options = {
      caseSensitive: false,
      allowOverwrite: false,
      ...options,
    };
  }

  protected normalizeKey(key: string): string {
    return this.options.caseSensitive ? key : key.toLowerCase();
  }

  register(item: T): this {
    const key = this.normalizeKey(item.id);
    
    if (!this.options.allowOverwrite && this.items.has(key)) {
      throw new Error(`Item with id '${item.id}' already registered`);
    }
    
    this.items.set(key, item);
    this.options.onRegister?.(item);
    return this;
  }

  registerAlias(id: string, alias: string): this {
    const normalizedId = this.normalizeKey(id);
    const normalizedAlias = this.normalizeKey(alias);
    
    if (!this.items.has(normalizedId)) {
      throw new Error(`Cannot create alias: item '${id}' not found`);
    }
    
    this.aliases.set(normalizedAlias, normalizedId);
    return this;
  }

  unregister(id: string): boolean {
    const key = this.normalizeKey(id);
    const existed = this.items.delete(key);
    
    if (existed) {
      for (const [alias, targetId] of this.aliases) {
        if (targetId === key) {
          this.aliases.delete(alias);
        }
      }
      this.options.onUnregister?.(id);
    }
    
    return existed;
  }

  get(id: string): T | undefined {
    const key = this.normalizeKey(id);
    
    if (this.items.has(key)) {
      return this.items.get(key);
    }
    
    const aliasTarget = this.aliases.get(key);
    if (aliasTarget) {
      return this.items.get(aliasTarget);
    }
    
    return undefined;
  }

  has(id: string): boolean {
    const key = this.normalizeKey(id);
    return this.items.has(key) || this.aliases.has(key);
  }

  list(): T[] {
    return Array.from(this.items.values());
  }

  listIds(): string[] {
    return Array.from(this.items.keys());
  }

  listAliases(): Map<string, string> {
    return new Map(this.aliases);
  }

  clear(): void {
    this.items.clear();
    this.aliases.clear();
  }

  get size(): number {
    return this.items.size;
  }

  forEach(callback: (item: T, id: string) => void): void {
    this.items.forEach((item, id) => callback(item, id));
  }

  find(predicate: (item: T) => boolean): T | undefined {
    for (const item of this.items.values()) {
      if (predicate(item)) return item;
    }
    return undefined;
  }

  filter(predicate: (item: T) => boolean): T[] {
    const result: T[] = [];
    for (const item of this.items.values()) {
      if (predicate(item)) result.push(item);
    }
    return result;
  }

  map<R>(mapper: (item: T) => R): R[] {
    const result: R[] = [];
    for (const item of this.items.values()) {
      result.push(mapper(item));
    }
    return result;
  }

  reduce<R>(reducer: (acc: R, item: T) => R, initial: R): R {
    let acc = initial;
    for (const item of this.items.values()) {
      acc = reducer(acc, item);
    }
    return acc;
  }

  [Symbol.iterator](): Iterator<T> {
    return this.items.values()[Symbol.iterator]();
  }

  entries(): IterableIterator<[string, T]> {
    return this.items.entries();
  }

  keys(): IterableIterator<string> {
    return this.items.keys();
  }

  values(): IterableIterator<T> {
    return this.items.values();
  }
}

export function createRegistry<T extends RegistryItem>(options?: RegistryOptions<T>): BaseRegistry<T> {
  return new BaseRegistry<T>(options);
}
