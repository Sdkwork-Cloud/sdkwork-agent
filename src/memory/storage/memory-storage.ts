/**
 * 内存存储适配器
 * 
 * 特点：
 * - 超高性能（纳秒级访问）
 * - 数据不持久化
 * - 适合工作记忆和短期记忆
 * - 支持LRU缓存淘汰
 * 
 * @module MemoryStorage
 * @version 1.0.0
 */

import {
  StorageAdapter,
  StorageConfig,
  MemoryItem,
  StorageQueryOptions,
  SemanticQueryOptions,
  StorageQueryResult,
  StorageStats,
  BatchOperationResult,
  StorageTier,
} from './storage-adapter.js';

/**
 * 内存存储配置
 */
export interface MemoryStorageConfig extends StorageConfig {
  options: {
    /** 最大条目数 */
    maxEntries?: number;
    /** 启用LRU淘汰 */
    enableLRU?: boolean;
    /** 默认TTL（毫秒） */
    defaultTTL?: number;
    /** 自动清理间隔（毫秒） */
    cleanupInterval?: number;
    /** 预分配大小 */
    initialCapacity?: number;
  };
}

/**
 * 带访问信息的记忆条目
 */
interface MemoryEntryWithAccess extends MemoryItem {
  /** 内部访问计数（用于LRU） */
  _accessCount: number;
  /** 内部最后访问时间 */
  _lastAccessedInternal: number;
  /** 过期时间 */
  _expiresAt?: number;
}

/**
 * 内存存储适配器
 */
export class MemoryStorageAdapter extends StorageAdapter {
  private storage = new Map<string, MemoryEntryWithAccess>();
  private maxEntries: number;
  private enableLRU: boolean;
  private defaultTTL?: number;
  private cleanupTimer?: NodeJS.Timeout;
  private queryCache = new Map<string, { results: StorageQueryResult[]; timestamp: number }>();
  private readonly queryCacheTTL = 5000; // 5秒

  constructor(config: MemoryStorageConfig) {
    super(config);
    
    const opts = config.options;
    this.maxEntries = opts.maxEntries || 10000;
    this.enableLRU = opts.enableLRU !== false;
    this.defaultTTL = opts.defaultTTL;

    // 启动自动清理
    if (opts.cleanupInterval && opts.cleanupInterval > 0) {
      this.cleanupTimer = setInterval(() => {
        this.cleanupExpired();
      }, opts.cleanupInterval);
    }
  }

  // --------------------------------------------------------------------------
  // 生命周期
  // --------------------------------------------------------------------------

  async initialize(): Promise<void> {
    this.initialized = true;
    this.logger.info('Memory storage initialized', { maxEntries: this.maxEntries });
  }

  async close(): Promise<void> {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }
    this.storage.clear();
    this.queryCache.clear();
    this.initialized = false;
    this.logger.info('Memory storage closed');
  }

  // --------------------------------------------------------------------------
  // CRUD操作
  // --------------------------------------------------------------------------

  async store(item: MemoryItem): Promise<void> {
    // 检查容量，执行LRU淘汰
    if (this.storage.size >= this.maxEntries && this.enableLRU) {
      this.evictLRU();
    }

    const entry: MemoryEntryWithAccess = {
      ...item,
      _accessCount: 0,
      _lastAccessedInternal: Date.now(),
    };

    // 设置过期时间
    if (item.ttl) {
      entry._expiresAt = Date.now() + item.ttl;
    } else if (this.defaultTTL) {
      entry._expiresAt = Date.now() + this.defaultTTL;
    }

    this.storage.set(item.id, entry);
    this.updateStats('add', item);
    this.invalidateQueryCache();
    this.emitEvent('item:stored', { id: item.id });
  }

  async storeBatch(items: MemoryItem[]): Promise<BatchOperationResult> {
    const startTime = Date.now();
    const succeeded: string[] = [];
    const failed: Array<{ id: string; error: string }> = [];

    for (const item of items) {
      try {
        await this.store(item);
        succeeded.push(item.id);
      } catch (error) {
        failed.push({ id: item.id, error: (error as Error).message });
      }
    }

    return {
      succeeded,
      failed,
      duration: Date.now() - startTime,
    };
  }

  async retrieve(id: string): Promise<MemoryItem | null> {
    const entry = this.storage.get(id);
    
    if (!entry) {
      return null;
    }

    // 检查是否过期
    if (entry._expiresAt && Date.now() > entry._expiresAt) {
      this.storage.delete(id);
      this.updateStats('remove', entry);
      return null;
    }

    // 更新访问信息
    entry._accessCount++;
    entry._lastAccessedInternal = Date.now();
    entry.accessCount++;
    entry.lastAccessed = Date.now();

    return this.stripInternalFields(entry);
  }

  async retrieveBatch(ids: string[]): Promise<MemoryItem[]> {
    const results: MemoryItem[] = [];
    
    for (const id of ids) {
      const item = await this.retrieve(id);
      if (item) {
        results.push(item);
      }
    }

    return results;
  }

  async query(options: StorageQueryOptions): Promise<StorageQueryResult[]> {
    const cacheKey = this.generateQueryCacheKey(options);
    const cached = this.queryCache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < this.queryCacheTTL) {
      return cached.results;
    }

    const {
      tier,
      type,
      tags,
      timeRange,
      importanceThreshold = 0,
      limit = 100,
      offset = 0,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = options;

    let results: StorageQueryResult[] = [];

    for (const entry of this.storage.values()) {
      // 检查过期
      if (entry._expiresAt && Date.now() > entry._expiresAt) {
        continue;
      }

      // 层级过滤
      if (tier) {
        const tiers = Array.isArray(tier) ? tier : [tier];
        if (!tiers.includes(entry.tier)) continue;
      }

      // 类型过滤
      if (type) {
        const types = Array.isArray(type) ? type : [type];
        if (!types.includes(entry.type)) continue;
      }

      // 标签过滤
      if (tags && tags.length > 0) {
        if (!entry.metadata.tags?.some(tag => tags.includes(tag))) continue;
      }

      // 时间范围过滤
      if (timeRange) {
        if (timeRange.start && entry.createdAt < timeRange.start) continue;
        if (timeRange.end && entry.createdAt > timeRange.end) continue;
      }

      // 重要性过滤
      if (entry.importance < importanceThreshold) continue;

      // 计算得分
      const score = this.calculateScore(entry, options);

      results.push({
        item: this.stripInternalFields(entry),
        score,
        importanceScore: entry.importance,
        recencyScore: this.calculateRecencyScore(entry.createdAt),
      });
    }

    // 排序
    results = this.sortResults(results, sortBy, sortOrder);

    // 分页
    results = results.slice(offset, offset + limit);

    // 缓存结果
    this.queryCache.set(cacheKey, { results, timestamp: Date.now() });

    return results;
  }

  async semanticQuery(options: SemanticQueryOptions): Promise<StorageQueryResult[]> {
    const { queryEmbedding, similarityThreshold = 0.7, vectorWeight = 0.7, textWeight = 0.3 } = options;

    // 先获取候选集
    const candidates = await this.query({ ...options, limit: options.limit ? options.limit * 2 : 100 });

    const results: StorageQueryResult[] = [];

    for (const candidate of candidates) {
      const entry = this.storage.get(candidate.item.id);
      if (!entry || !entry.embedding) continue;

      // 计算向量相似度
      const similarity = this.cosineSimilarity(queryEmbedding, entry.embedding);

      if (similarity < similarityThreshold) continue;

      // 融合分数
      const textScore = candidate.score;
      const fusedScore = similarity * vectorWeight + textScore * textWeight;

      results.push({
        item: this.stripInternalFields(entry),
        score: fusedScore,
        similarityScore: similarity,
        recencyScore: candidate.recencyScore,
        importanceScore: candidate.importanceScore,
      });
    }

    // 按融合分数排序
    results.sort((a, b) => b.score - a.score);

    return results.slice(0, options.limit || 10);
  }

  async update(id: string, updates: Partial<MemoryItem>): Promise<MemoryItem | null> {
    const entry = this.storage.get(id);
    if (!entry) return null;

    // 应用更新
    Object.assign(entry, updates, { updatedAt: Date.now() });
    entry._lastAccessedInternal = Date.now();

    this.invalidateQueryCache();
    this.emitEvent('item:updated', { id });

    return this.stripInternalFields(entry);
  }

  async delete(id: string): Promise<boolean> {
    const entry = this.storage.get(id);
    if (!entry) return false;

    this.storage.delete(id);
    this.updateStats('remove', entry);
    this.invalidateQueryCache();
    this.emitEvent('item:deleted', { id });

    return true;
  }

  async deleteBatch(ids: string[]): Promise<BatchOperationResult> {
    const startTime = Date.now();
    const succeeded: string[] = [];
    const failed: Array<{ id: string; error: string }> = [];

    for (const id of ids) {
      const success = await this.delete(id);
      if (success) {
        succeeded.push(id);
      } else {
        failed.push({ id, error: 'Not found' });
      }
    }

    return {
      succeeded,
      failed,
      duration: Date.now() - startTime,
    };
  }

  async deleteByQuery(options: StorageQueryOptions): Promise<number> {
    const toDelete = await this.query(options);
    let count = 0;

    for (const result of toDelete) {
      if (await this.delete(result.item.id)) {
        count++;
      }
    }

    return count;
  }

  // --------------------------------------------------------------------------
  // 管理操作
  // --------------------------------------------------------------------------

  async clear(): Promise<void> {
    const count = this.storage.size;
    this.storage.clear();
    this.queryCache.clear();
    
    // 重置统计
    this.stats = {
      totalCount: 0,
      tierCounts: { working: 0, short_term: 0, long_term: 0, archival: 0 },
      typeCounts: {} as Record<string, number>,
      totalSize: 0,
      averageItemSize: 0,
    };

    this.emitEvent('storage:cleared', { count });
  }

  async flush(): Promise<void> {
    // 内存存储不需要flush
    this.emitEvent('storage:flushed');
  }

  async getStats(): Promise<StorageStats> {
    let totalSize = 0;
    
    for (const entry of this.storage.values()) {
      totalSize += JSON.stringify(entry).length * 2; // 粗略估算
    }

    return {
      ...this.stats,
      totalSize,
      averageItemSize: this.stats.totalCount > 0 ? totalSize / this.stats.totalCount : 0,
      cacheHitRate: 0, // 内存存储不需要缓存命中率
    };
  }

  async healthCheck(): Promise<{ healthy: boolean; message?: string }> {
    const usage = this.storage.size / this.maxEntries;
    
    if (usage > 0.95) {
      return { healthy: false, message: `Storage nearly full: ${(usage * 100).toFixed(1)}%` };
    }
    
    if (usage > 0.8) {
      return { healthy: true, message: `Storage usage high: ${(usage * 100).toFixed(1)}%` };
    }

    return { healthy: true };
  }

  // --------------------------------------------------------------------------
  // 私有方法
  // --------------------------------------------------------------------------

  private stripInternalFields(entry: MemoryEntryWithAccess): MemoryItem {
    const { _accessCount, _lastAccessedInternal, _expiresAt, ...item } = entry;
    return item;
  }

  private evictLRU(): void {
    let lruEntry: MemoryEntryWithAccess | undefined;
    let lruTime = Infinity;

    for (const entry of this.storage.values()) {
      if (entry._lastAccessedInternal < lruTime) {
        lruTime = entry._lastAccessedInternal;
        lruEntry = entry;
      }
    }

    if (lruEntry) {
      this.storage.delete(lruEntry.id);
      this.updateStats('remove', lruEntry);
      this.logger.debug('LRU eviction', { id: lruEntry.id });
    }
  }

  private cleanupExpired(): void {
    const now = Date.now();
    const toDelete: string[] = [];

    for (const [id, entry] of this.storage) {
      if (entry._expiresAt && now > entry._expiresAt) {
        toDelete.push(id);
      }
    }

    for (const id of toDelete) {
      const entry = this.storage.get(id);
      this.storage.delete(id);
      if (entry) {
        this.updateStats('remove', entry);
      }
    }

    if (toDelete.length > 0) {
      this.logger.debug('Cleaned up expired entries', { count: toDelete.length });
    }
  }

  private calculateScore(entry: MemoryEntryWithAccess, options: StorageQueryOptions): number {
    // 基础分：重要性
    let score = entry.importance * 0.4;

    // 时效性
    const age = Date.now() - entry.createdAt;
    const recency = Math.exp(-age / (24 * 60 * 60 * 1000)); // 24小时衰减
    score += recency * 0.3;

    // 访问频率
    const frequency = Math.min(entry.accessCount / 100, 1);
    score += frequency * 0.2;

    // 访问热度（内部）
    const heat = Math.min(entry._accessCount / 50, 1);
    score += heat * 0.1;

    return score;
  }

  private calculateRecencyScore(timestamp: number): number {
    const age = Date.now() - timestamp;
    return Math.exp(-age / (24 * 60 * 60 * 1000));
  }

  private sortResults(
    results: StorageQueryResult[],
    sortBy: string,
    sortOrder: 'asc' | 'desc'
  ): StorageQueryResult[] {
    const multiplier = sortOrder === 'asc' ? 1 : -1;

    return results.sort((a, b) => {
      let comparison = 0;

      switch (sortBy) {
        case 'createdAt':
          comparison = a.item.createdAt - b.item.createdAt;
          break;
        case 'lastAccessed':
          comparison = a.item.lastAccessed - b.item.lastAccessed;
          break;
        case 'importance':
          comparison = a.item.importance - b.item.importance;
          break;
        case 'accessCount':
          comparison = a.item.accessCount - b.item.accessCount;
          break;
        default:
          comparison = a.score - b.score;
      }

      return comparison * multiplier;
    });
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) return 0;

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    if (normA === 0 || normB === 0) return 0;

    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  private generateQueryCacheKey(options: StorageQueryOptions): string {
    return JSON.stringify(options);
  }

  private invalidateQueryCache(): void {
    this.queryCache.clear();
  }
}

/**
 * 创建内存存储适配器
 */
export function createMemoryStorage(config: Partial<Omit<MemoryStorageConfig, 'type'>> = {}): MemoryStorageAdapter {
  return new MemoryStorageAdapter({
    type: 'memory',
    name: config.name || 'memory',
    enabled: config.enabled ?? true,
    priority: config.priority ?? 1,
    options: config.options || {},
    serialization: config.serialization,
    compression: config.compression,
    encryption: config.encryption,
  });
}
