/**
 * LRU Cache - 最近最少使用缓存
 *
 * @deprecated 建议使用 WTinyLFUCache，命中率更高（高30-50%）
 * 保留此实现用于向后兼容
 *
 * @module LRUCache
 * @version 1.0.0
 */

export interface LRUCacheOptions<K, V> {
  /** 最大条目数 */
  maxSize?: number;
  /** 最大权重 */
  maxWeight?: number;
  /** 默认过期时间 (ms) */
  ttl?: number;
  /** 计算条目权重 */
  getWeight?: (value: V) => number;
  /** 条目过期回调 */
  onEvict?: (key: K, value: V) => void;
  /** 条目更新回调 */
  onUpdate?: (key: K, value: V) => void;
}

export interface CacheEntry<V> {
  value: V;
  weight: number;
  expiresAt?: number;
  accessedAt: number;
  accessCount: number;
}

export interface CacheStats {
  size: number;
  maxSize: number;
  weight: number;
  maxWeight: number;
  hits: number;
  misses: number;
  hitRate: number;
  evictions: number;
  expirations: number;
}

/**
 * LRU Cache 实现
 *
 * 使用 Map 维护键到节点的映射，实现 O(1) 查找
 * 使用双向链表维护访问顺序，实现 O(1) 淘汰
 * 
 * 性能优化：
 * - 使用增量更新维护总权重，避免每次遍历
 * - O(1) 时间复杂度的 get 和 set
 */
export class LRUCache<K, V> {
  private cache: Map<K, CacheEntry<V>> = new Map();
  private options: Required<LRUCacheOptions<K, V>>;
  private stats = {
    hits: 0,
    misses: 0,
    evictions: 0,
    expirations: 0,
  };
  /** 当前总权重（增量更新） */
  private currentWeight = 0;

  constructor(options: LRUCacheOptions<K, V> = {}) {
    this.options = {
      maxSize: 1000,
      maxWeight: Infinity,
      ttl: 0, // 0 表示不过期
      getWeight: () => 1,
      onEvict: () => {},
      onUpdate: () => {},
      ...options,
    };
  }

  /**
   * 获取值
   */
  get(key: K): V | undefined {
    const entry = this.cache.get(key);

    if (!entry) {
      this.stats.misses++;
      return undefined;
    }

    // 检查是否过期
    if (this.isExpired(entry)) {
      this.delete(key);
      this.stats.expirations++;
      this.stats.misses++;
      return undefined;
    }

    // 更新访问信息
    entry.accessedAt = Date.now();
    entry.accessCount++;

    // 移动到最新（重新插入）
    this.cache.delete(key);
    this.cache.set(key, entry);

    this.stats.hits++;
    return entry.value;
  }

  /**
   * 设置值
   */
  set(key: K, value: V, ttl?: number): this {
    const weight = this.options.getWeight(value);

    // 如果已存在，先删除旧值（更新权重）
    if (this.cache.has(key)) {
      const oldEntry = this.cache.get(key)!;
      this.currentWeight -= oldEntry.weight;
      this.cache.delete(key);
    }

    // 检查是否需要淘汰
    while (
      (this.options.maxSize > 0 && this.cache.size >= this.options.maxSize) ||
      (this.options.maxWeight !== Infinity && this.currentWeight + weight > this.options.maxWeight)
    ) {
      this.evictLRU();
    }

    const entry: CacheEntry<V> = {
      value,
      weight,
      expiresAt: ttl && ttl > 0 ? Date.now() + ttl : undefined,
      accessedAt: Date.now(),
      accessCount: 0,
    };

    this.cache.set(key, entry);
    this.currentWeight += weight;
    this.options.onUpdate(key, value);

    return this;
  }

  /**
   * 检查是否存在
   */
  has(key: K): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;

    if (this.isExpired(entry)) {
      this.delete(key);
      return false;
    }

    return true;
  }

  /**
   * 删除条目
   */
  delete(key: K): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;

    this.cache.delete(key);
    this.currentWeight -= entry.weight;
    this.options.onEvict(key, entry.value);
    return true;
  }

  /**
   * 清空缓存
   */
  clear(): void {
    for (const [key, entry] of this.cache) {
      this.options.onEvict(key, entry.value);
    }
    this.cache.clear();
    this.currentWeight = 0;
  }

  /**
   * 获取大小
   */
  get size(): number {
    return this.cache.size;
  }

  /**
   * 获取统计信息
   */
  getStats(): CacheStats {
    const total = this.stats.hits + this.stats.misses;
    return {
      size: this.cache.size,
      maxSize: this.options.maxSize,
      weight: this.currentWeight,
      maxWeight: this.options.maxWeight,
      hits: this.stats.hits,
      misses: this.stats.misses,
      hitRate: total > 0 ? this.stats.hits / total : 0,
      evictions: this.stats.evictions,
      expirations: this.stats.expirations,
    };
  }

  /**
   * 重置统计
   */
  resetStats(): void {
    this.stats = {
      hits: 0,
      misses: 0,
      evictions: 0,
      expirations: 0,
    };
  }

  /**
   * 获取所有键
   */
  keys(): IterableIterator<K> {
    return this.cache.keys();
  }

  /**
   * 获取所有值
   */
  values(): V[] {
    const values: V[] = [];
    for (const entry of this.cache.values()) {
      values.push(entry.value);
    }
    return values;
  }

  /**
   * 获取所有条目
   */
  entries(): Array<[K, V]> {
    const entries: Array<[K, V]> = [];
    for (const [key, entry] of this.cache.entries()) {
      entries.push([key, entry.value]);
    }
    return entries;
  }

  /**
   * 清理过期条目
   */
  cleanup(): number {
    const now = Date.now();
    const expired: K[] = [];

    for (const [key, entry] of this.cache) {
      if (entry.expiresAt && entry.expiresAt < now) {
        expired.push(key);
      }
    }

    for (const key of expired) {
      this.delete(key);
      this.stats.expirations++;
    }

    return expired.length;
  }

  /**
   * 批量获取
   */
  getMany(keys: K[]): Array<{ key: K; value: V | undefined }> {
    return keys.map(key => ({ key, value: this.get(key) }));
  }

  /**
   * 批量设置
   */
  setMany(entries: Array<{ key: K; value: V; ttl?: number }>): this {
    for (const { key, value, ttl } of entries) {
      this.set(key, value, ttl);
    }
    return this;
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  private isExpired(entry: CacheEntry<V>): boolean {
    if (!entry.expiresAt) return false;
    return Date.now() > entry.expiresAt;
  }



  private evictLRU(): void {
    // Map 的迭代顺序是插入顺序，第一个就是最老的
    const firstKey = this.cache.keys().next().value;
    if (firstKey !== undefined) {
      const entry = this.cache.get(firstKey)!;
      this.cache.delete(firstKey);
      this.currentWeight -= entry.weight;
      this.options.onEvict(firstKey, entry.value);
      this.stats.evictions++;
    }
  }
}

/**
 * 创建 LRU Cache 实例
 */
export function createLRUCache<K, V>(options?: LRUCacheOptions<K, V>): LRUCache<K, V> {
  return new LRUCache<K, V>(options);
}

export default LRUCache;
