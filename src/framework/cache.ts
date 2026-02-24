/**
 * Cache Abstraction Layer - 缓存抽象层
 *
 * 提供统一的缓存接口和多种实现
 * - 内存缓存
 * - LRU 缓存
 * - 分层缓存
 * - 缓存装饰器
 *
 * @module Framework/Cache
 * @version 1.0.0
 */

import { createLogger, type ILogger } from '../utils/logger.js';

export interface CacheEntry<T = unknown> {
  value: T;
  createdAt: number;
  expiresAt?: number;
  tags?: string[];
  metadata?: Record<string, unknown>;
}

export interface CacheStats {
  hits: number;
  misses: number;
  sets: number;
  deletes: number;
  evictions: number;
  size: number;
  hitRate: number;
}

export interface CacheConfig {
  name: string;
  defaultTTL?: number;
  maxSize?: number;
  enableStats?: boolean;
  logger?: ILogger;
}

export interface CacheProvider {
  readonly name: string;
  get<T>(key: string): Promise<T | undefined>;
  set<T>(key: string, value: T, ttl?: number): Promise<void>;
  has(key: string): Promise<boolean>;
  delete(key: string): Promise<boolean>;
  clear(): Promise<void>;
  size(): Promise<number>;
  keys(): Promise<string[]>;
  getOrSet<T>(key: string, factory: () => Promise<T>, ttl?: number): Promise<T>;
}

export abstract class BaseCache implements CacheProvider {
  abstract readonly name: string;
  abstract get<T>(key: string): Promise<T | undefined>;
  abstract set<T>(key: string, value: T, ttl?: number): Promise<void>;
  abstract has(key: string): Promise<boolean>;
  abstract delete(key: string): Promise<boolean>;
  abstract clear(): Promise<void>;
  abstract size(): Promise<number>;
  abstract keys(): Promise<string[]>;

  async getOrSet<T>(
    key: string,
    factory: () => Promise<T>,
    ttl?: number
  ): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== undefined) {
      return cached;
    }
    const value = await factory();
    await this.set(key, value, ttl);
    return value;
  }

  async getMany<T>(keys: string[]): Promise<Map<string, T | undefined>> {
    const result = new Map<string, T | undefined>();
    for (const key of keys) {
      result.set(key, await this.get<T>(key));
    }
    return result;
  }

  async setMany<T>(entries: Array<[string, T]>, ttl?: number): Promise<void> {
    for (const [key, value] of entries) {
      await this.set(key, value, ttl);
    }
  }

  async deleteMany(keys: string[]): Promise<number> {
    let count = 0;
    for (const key of keys) {
      if (await this.delete(key)) {
        count++;
      }
    }
    return count;
  }
}

export class MemoryCache extends BaseCache {
  readonly name: string;
  private cache: Map<string, CacheEntry> = new Map();
  private config: Required<Omit<CacheConfig, 'logger'>> & { logger?: ILogger };
  private logger: ILogger;
  private stats = {
    hits: 0,
    misses: 0,
    sets: 0,
    deletes: 0,
    evictions: 0,
  };
  private cleanupTimer?: ReturnType<typeof setInterval>;

  constructor(config: CacheConfig) {
    super();
    this.name = config.name;
    this.config = {
      name: config.name,
      defaultTTL: config.defaultTTL ?? 0,
      maxSize: config.maxSize ?? 1000,
      enableStats: config.enableStats ?? true,
      logger: config.logger,
    };
    this.logger = config.logger ?? createLogger({ name: `Cache:${config.name}` });

    if (this.config.defaultTTL > 0) {
      this.cleanupTimer = setInterval(() => this.cleanup(), Math.min(this.config.defaultTTL * 1000, 60000));
    }
  }

  async get<T>(key: string): Promise<T | undefined> {
    const entry = this.cache.get(key);

    if (!entry) {
      this.stats.misses++;
      return undefined;
    }

    if (entry.expiresAt && Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      this.stats.misses++;
      this.stats.evictions++;
      return undefined;
    }

    this.stats.hits++;
    return entry.value as T;
  }

  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    if (this.cache.size >= this.config.maxSize) {
      this.evictOldest();
    }

    const effectiveTTL = ttl ?? this.config.defaultTTL;
    const entry: CacheEntry<T> = {
      value,
      createdAt: Date.now(),
      expiresAt: effectiveTTL > 0 ? Date.now() + effectiveTTL * 1000 : undefined,
    };

    this.cache.set(key, entry as CacheEntry);
    this.stats.sets++;
  }

  async has(key: string): Promise<boolean> {
    const entry = this.cache.get(key);
    if (!entry) return false;

    if (entry.expiresAt && Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  async delete(key: string): Promise<boolean> {
    const result = this.cache.delete(key);
    if (result) {
      this.stats.deletes++;
    }
    return result;
  }

  async clear(): Promise<void> {
    this.cache.clear();
    this.logger.debug('Cache cleared');
  }

  async size(): Promise<number> {
    return this.cache.size;
  }

  async keys(): Promise<string[]> {
    return Array.from(this.cache.keys());
  }

  getStats(): CacheStats {
    const total = this.stats.hits + this.stats.misses;
    return {
      ...this.stats,
      size: this.cache.size,
      hitRate: total > 0 ? this.stats.hits / total : 0,
    };
  }

  resetStats(): void {
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      evictions: 0,
    };
  }

  destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }
    this.cache.clear();
  }

  private evictOldest(): void {
    let oldest: { key: string; createdAt: number } | null = null;

    for (const [key, entry] of this.cache) {
      if (!oldest || entry.createdAt < oldest.createdAt) {
        oldest = { key, createdAt: entry.createdAt };
      }
    }

    if (oldest) {
      this.cache.delete(oldest.key);
      this.stats.evictions++;
    }
  }

  private cleanup(): void {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, entry] of this.cache) {
      if (entry.expiresAt && now > entry.expiresAt) {
        this.cache.delete(key);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      this.stats.evictions += cleaned;
      this.logger.debug(`Cleaned up ${cleaned} expired entries`);
    }
  }
}

export class LRUCache extends BaseCache {
  readonly name: string;
  private cache: Map<string, CacheEntry> = new Map();
  private accessOrder: string[] = [];
  private config: Required<Omit<CacheConfig, 'logger'>> & { logger?: ILogger };
  private logger: ILogger;
  private stats = {
    hits: 0,
    misses: 0,
    sets: 0,
    deletes: 0,
    evictions: 0,
  };

  constructor(config: CacheConfig) {
    super();
    this.name = config.name;
    this.config = {
      name: config.name,
      defaultTTL: config.defaultTTL ?? 0,
      maxSize: config.maxSize ?? 1000,
      enableStats: config.enableStats ?? true,
      logger: config.logger,
    };
    this.logger = config.logger ?? createLogger({ name: `LRUCache:${config.name}` });
  }

  async get<T>(key: string): Promise<T | undefined> {
    const entry = this.cache.get(key);

    if (!entry) {
      this.stats.misses++;
      return undefined;
    }

    if (entry.expiresAt && Date.now() > entry.expiresAt) {
      await this.delete(key);
      this.stats.misses++;
      return undefined;
    }

    this.updateAccessOrder(key);
    this.stats.hits++;
    return entry.value as T;
  }

  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    if (this.cache.has(key)) {
      this.removeFromAccessOrder(key);
    } else if (this.cache.size >= this.config.maxSize) {
      this.evictLRU();
    }

    const effectiveTTL = ttl ?? this.config.defaultTTL;
    const entry: CacheEntry<T> = {
      value,
      createdAt: Date.now(),
      expiresAt: effectiveTTL > 0 ? Date.now() + effectiveTTL * 1000 : undefined,
    };

    this.cache.set(key, entry as CacheEntry);
    this.accessOrder.push(key);
    this.stats.sets++;
  }

  async has(key: string): Promise<boolean> {
    const entry = this.cache.get(key);
    if (!entry) return false;

    if (entry.expiresAt && Date.now() > entry.expiresAt) {
      await this.delete(key);
      return false;
    }

    return true;
  }

  async delete(key: string): Promise<boolean> {
    const result = this.cache.delete(key);
    if (result) {
      this.removeFromAccessOrder(key);
      this.stats.deletes++;
    }
    return result;
  }

  async clear(): Promise<void> {
    this.cache.clear();
    this.accessOrder = [];
    this.logger.debug('Cache cleared');
  }

  async size(): Promise<number> {
    return this.cache.size;
  }

  async keys(): Promise<string[]> {
    return [...this.accessOrder];
  }

  getStats(): CacheStats {
    const total = this.stats.hits + this.stats.misses;
    return {
      ...this.stats,
      size: this.cache.size,
      hitRate: total > 0 ? this.stats.hits / total : 0,
    };
  }

  private updateAccessOrder(key: string): void {
    this.removeFromAccessOrder(key);
    this.accessOrder.push(key);
  }

  private removeFromAccessOrder(key: string): void {
    const index = this.accessOrder.indexOf(key);
    if (index !== -1) {
      this.accessOrder.splice(index, 1);
    }
  }

  private evictLRU(): void {
    if (this.accessOrder.length > 0) {
      const lruKey = this.accessOrder.shift()!;
      this.cache.delete(lruKey);
      this.stats.evictions++;
    }
  }
}

export class TieredCache extends BaseCache {
  readonly name: string;
  private layers: { cache: CacheProvider; priority: number }[];
  private logger: ILogger;

  constructor(name: string, layers: { cache: CacheProvider; priority: number }[], logger?: ILogger) {
    super();
    this.name = name;
    this.layers = [...layers].sort((a, b) => a.priority - b.priority);
    this.logger = logger ?? createLogger({ name: `TieredCache:${name}` });
  }

  async get<T>(key: string): Promise<T | undefined> {
    for (const { cache } of this.layers) {
      const value = await cache.get<T>(key);
      if (value !== undefined) {
        return value;
      }
    }
    return undefined;
  }

  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    for (const { cache } of this.layers) {
      await cache.set(key, value, ttl);
    }
  }

  async has(key: string): Promise<boolean> {
    for (const { cache } of this.layers) {
      if (await cache.has(key)) {
        return true;
      }
    }
    return false;
  }

  async delete(key: string): Promise<boolean> {
    let deleted = false;
    for (const { cache } of this.layers) {
      if (await cache.delete(key)) {
        deleted = true;
      }
    }
    return deleted;
  }

  async clear(): Promise<void> {
    for (const { cache } of this.layers) {
      await cache.clear();
    }
  }

  async size(): Promise<number> {
    const sizes = await Promise.all(this.layers.map(l => l.cache.size()));
    return Math.max(...sizes);
  }

  async keys(): Promise<string[]> {
    const allKeys = new Set<string>();
    for (const { cache } of this.layers) {
      for (const key of await cache.keys()) {
        allKeys.add(key);
      }
    }
    return Array.from(allKeys);
  }

  addLayer(cache: CacheProvider, priority: number): void {
    this.layers.push({ cache, priority });
    this.layers.sort((a, b) => a.priority - b.priority);
  }

  removeLayer(name: string): boolean {
    const index = this.layers.findIndex(l => l.cache.name === name);
    if (index !== -1) {
      this.layers.splice(index, 1);
      return true;
    }
    return false;
  }
}

export function cacheDecorator<T extends unknown[], R>(
  cache: CacheProvider,
  keyGenerator: (...args: T) => string,
  ttl?: number
) {
  return function (
    _target: unknown,
    _propertyKey: string,
    descriptor: TypedPropertyDescriptor<(...args: T) => Promise<R>>
  ): TypedPropertyDescriptor<(...args: T) => Promise<R>> {
    const originalMethod = descriptor.value!;

    descriptor.value = async function (...args: T): Promise<R> {
      const key = keyGenerator(...args);
      return cache.getOrSet(key, () => originalMethod.apply(this, args), ttl);
    };

    return descriptor;
  };
}

export function createMemoryCache(config: CacheConfig): MemoryCache {
  return new MemoryCache(config);
}

export function createLRUCache(config: CacheConfig): LRUCache {
  return new LRUCache(config);
}

export function createTieredCache(
  name: string,
  layers: { cache: CacheProvider; priority: number }[],
  logger?: ILogger
): TieredCache {
  return new TieredCache(name, layers, logger);
}
