/**
 * 统一记忆管理器
 * 
 * 完美整合多种存储方式，提供统一的记忆管理接口：
 * - 多存储后端协调
 * - 智能层级管理
 * - 自动数据迁移
 * - 统一查询接口
 * - 灵活配置系统
 * 
 * @module UnifiedMemoryManager
 * @version 1.0.0
 * @architecture Multi-Tier Unified Memory Architecture
 */

import { EventEmitter } from '../../utils/event-emitter.js';
import { Logger, createLogger } from '../../utils/logger.js';
import {
  StorageAdapter,
  StorageConfig,
  MemoryItem,
  StorageTier,
  MemoryType,
  StorageQueryOptions,
  SemanticQueryOptions,
  StorageQueryResult,
  StorageStats,
  BatchOperationResult,
  MemoryMetadata,
  StorageEvent,
} from './storage-adapter.js';
import { MemoryStorageAdapter } from './memory-storage.js';
import { FileStorageAdapter } from './file-storage.js';
import { VectorStorageAdapter } from './vector-storage.js';

// ============================================================================
// 配置类型
// ============================================================================

/**
 * 层级存储映射配置
 */
export interface TierStorageMapping {
  /** 工作记忆存储 */
  working: string;
  /** 短期记忆存储 */
  short_term: string;
  /** 长期记忆存储 */
  long_term: string;
  /** 归档记忆存储 */
  archival?: string;
}

/**
 * 层级容量配置
 */
export interface TierCapacityConfig {
  /** 最大条目数 */
  maxEntries: number;
  /** 最大token数（估算） */
  maxTokens?: number;
  /** 自动迁移阈值 */
  migrationThreshold: number;
  /** 默认TTL（毫秒） */
  defaultTTL?: number;
}

/**
 * 统一记忆管理器配置
 */
export interface UnifiedMemoryManagerConfig {
  /** 管理器名称 */
  name: string;
  /** 存储配置列表 */
  storages: StorageConfig[];
  /** 层级到存储的映射 */
  tierMapping: TierStorageMapping;
  /** 层级容量配置 */
  tierCapacities: Record<StorageTier, TierCapacityConfig>;
  /** 自动迁移间隔（毫秒） */
  autoMigrationInterval?: number;
  /** 启用压缩 */
  enableCompression?: boolean;
  /** 压缩阈值 */
  compressionThreshold?: number;
  /** 启用向量化 */
  enableVectorization?: boolean;
  /** 向量维度 */
  vectorDimension?: number;
  /** 日志配置 */
  logger?: Logger;
}

/**
 * 记忆操作选项
 */
export interface MemoryOperationOptions {
  /** 指定存储层级 */
  tier?: StorageTier;
  /** 指定存储名称 */
  storage?: string;
  /** 是否同步到所有存储 */
  syncAll?: boolean;
  /** 是否生成向量 */
  generateEmbedding?: boolean;
  /** 自定义元数据 */
  metadata?: Partial<MemoryMetadata>;
}

/**
 * 记忆检索选项
 */
export interface MemoryRetrievalOptions extends StorageQueryOptions {
  /** 检索策略 */
  strategy?: 'exact' | 'semantic' | 'hybrid';
  /** 查询向量（语义检索时使用） */
  queryEmbedding?: number[];
  /** 跨层级检索 */
  crossTier?: boolean;
  /** 融合权重 */
  fusionWeights?: {
    semantic?: number;
    recency?: number;
    importance?: number;
  };
}

/**
 * 记忆迁移结果
 */
export interface MigrationResult {
  /** 迁移的条目数 */
  migratedCount: number;
  /** 从哪个层级 */
  fromTier: StorageTier;
  /** 到哪个层级 */
  toTier: StorageTier;
  /** 迁移的条目ID */
  migratedIds: string[];
}

// ============================================================================
// Embedding生成器
// ============================================================================

/**
 * 简单的Embedding生成器
 * 实际应用中应该使用LLM服务
 */
export class EmbeddingGenerator {
  private dimension: number;

  constructor(dimension: number = 384) {
    this.dimension = dimension;
  }

  /**
   * 生成文本的embedding
   */
  generate(text: string): number[] {
    const embedding = new Array(this.dimension).fill(0);
    
    // 简化的embedding生成：使用字符哈希
    const normalizedText = text.toLowerCase().trim();
    
    for (let i = 0; i < normalizedText.length; i++) {
      const charCode = normalizedText.charCodeAt(i);
      const index = charCode % this.dimension;
      embedding[index] += 1;
    }

    // L2归一化
    const norm = Math.sqrt(embedding.reduce((sum, v) => sum + v * v, 0));
    if (norm > 0) {
      return embedding.map(v => v / norm);
    }

    return embedding;
  }

  /**
   * 批量生成embedding
   */
  generateBatch(texts: string[]): number[][] {
    return texts.map(text => this.generate(text));
  }
}

// ============================================================================
// 统一记忆管理器
// ============================================================================

export class UnifiedMemoryManager extends EventEmitter {
  private config: Required<UnifiedMemoryManagerConfig>;
  private logger: Logger;
  private storages = new Map<string, StorageAdapter>();
  private tierToStorage = new Map<StorageTier, StorageAdapter>();
  private embeddingGenerator?: EmbeddingGenerator;
  private migrationTimer?: NodeJS.Timeout;

  constructor(config: UnifiedMemoryManagerConfig) {
    super();

    this.config = {
      name: config.name,
      storages: config.storages,
      tierMapping: config.tierMapping,
      tierCapacities: config.tierCapacities,
      autoMigrationInterval: config.autoMigrationInterval || 60000,
      enableCompression: config.enableCompression ?? true,
      compressionThreshold: config.compressionThreshold || 1000,
      enableVectorization: config.enableVectorization ?? true,
      vectorDimension: config.vectorDimension || 384,
      logger: config.logger || createLogger({ name: 'UnifiedMemoryManager' }),
    };

    this.logger = this.config.logger;

    // 初始化embedding生成器
    if (this.config.enableVectorization) {
      this.embeddingGenerator = new EmbeddingGenerator(this.config.vectorDimension);
    }
  }

  // --------------------------------------------------------------------------
  // 生命周期
  // --------------------------------------------------------------------------

  /**
   * 初始化管理器
   */
  async initialize(): Promise<void> {
    this.logger.info('Initializing Unified Memory Manager', { name: this.config.name });

    // 初始化所有存储
    for (const storageConfig of this.config.storages) {
      if (!storageConfig.enabled) continue;

      let storage: StorageAdapter;

      switch (storageConfig.type) {
        case 'memory':
          storage = new MemoryStorageAdapter(storageConfig as import('./memory-storage').MemoryStorageConfig);
          break;
        case 'file':
          storage = new FileStorageAdapter(storageConfig as import('./file-storage').FileStorageConfig);
          break;
        case 'vector':
          storage = new VectorStorageAdapter(storageConfig as import('./vector-storage').VectorStorageConfig);
          break;
        default:
          this.logger.warn(`Unknown storage type: ${storageConfig.type}`);
          continue;
      }

      await storage.initialize();
      this.storages.set(storageConfig.name, storage);

      // 绑定层级
      this.bindTierToStorage(storageConfig.name);

      this.logger.info(`Storage initialized: ${storageConfig.name} (${storageConfig.type})`);
    }

    // 启动自动迁移
    if (this.config.autoMigrationInterval > 0) {
      this.migrationTimer = setInterval(() => {
        this.performAutoMigration();
      }, this.config.autoMigrationInterval);
    }

    this.emit('initialized', { name: this.config.name });
    this.logger.info('Unified Memory Manager initialized');
  }

  /**
   * 关闭管理器
   */
  async close(): Promise<void> {
    this.logger.info('Closing Unified Memory Manager');

    if (this.migrationTimer) {
      clearInterval(this.migrationTimer);
    }

    // 关闭所有存储
    for (const [name, storage] of this.storages) {
      await storage.close();
      this.logger.info(`Storage closed: ${name}`);
    }

    this.storages.clear();
    this.tierToStorage.clear();

    this.emit('closed');
    this.logger.info('Unified Memory Manager closed');
  }

  // --------------------------------------------------------------------------
  // 核心操作
  // --------------------------------------------------------------------------

  /**
   * 存储记忆
   */
  async store(
    content: string,
    type: MemoryType,
    options: MemoryOperationOptions = {}
  ): Promise<MemoryItem> {
    const tier = options.tier || 'short_term';
    const storage = options.storage 
      ? this.storages.get(options.storage)
      : this.tierToStorage.get(tier);

    if (!storage) {
      throw new Error(`No storage available for tier: ${tier}`);
    }

    // 生成embedding
    let embedding: number[] | undefined;
    if (options.generateEmbedding !== false && this.embeddingGenerator) {
      embedding = this.embeddingGenerator.generate(content);
    }

    const item: MemoryItem = {
      id: this.generateId(),
      content,
      embedding,
      tier,
      type,
      importance: this.calculateImportance(content, type),
      createdAt: Date.now(),
      lastAccessed: Date.now(),
      accessCount: 0,
      metadata: {
        ...options.metadata,
      },
    };

    // 存储到主存储
    await storage.store(item);

    // 如果需要同步到所有存储
    if (options.syncAll) {
      for (const [name, s] of this.storages) {
        if (s !== storage) {
          await s.store({ ...item, id: `${item.id}@${name}` });
        }
      }
    }

    // 检查是否需要迁移
    await this.checkAndMigrate(tier);

    this.emit('memory:stored', { item });
    return item;
  }

  /**
   * 批量存储记忆
   */
  async storeBatch(
    items: Array<{ content: string; type: MemoryType; options?: MemoryOperationOptions }>
  ): Promise<MemoryItem[]> {
    const results: MemoryItem[] = [];

    for (const { content, type, options } of items) {
      const item = await this.store(content, type, options);
      results.push(item);
    }

    return results;
  }

  /**
   * 检索记忆
   */
  async retrieve(id: string, storageName?: string): Promise<MemoryItem | null> {
    // 如果指定了存储，直接查询
    if (storageName) {
      const storage = this.storages.get(storageName);
      return storage ? storage.retrieve(id) : null;
    }

    // 否则遍历所有存储
    for (const storage of this.storages.values()) {
      const item = await storage.retrieve(id);
      if (item) return item;
    }

    return null;
  }

  /**
   * 搜索记忆
   */
  async search(query: string, options: MemoryRetrievalOptions = {}): Promise<StorageQueryResult[]> {
    const strategy = options.strategy || 'hybrid';
    const limit = options.limit || 10;

    let results: StorageQueryResult[] = [];

    if (strategy === 'semantic' || strategy === 'hybrid') {
      // 生成查询embedding
      const queryEmbedding = options.queryEmbedding || this.embeddingGenerator?.generate(query);

      if (queryEmbedding) {
        // 查找向量存储
        for (const storage of this.storages.values()) {
          if (storage instanceof VectorStorageAdapter) {
            const semanticResults = await storage.semanticQuery({
              ...options,
              queryEmbedding,
              limit: limit * 2,
            });
            results.push(...semanticResults);
          }
        }
      }
    }

    if (strategy === 'exact' || strategy === 'hybrid') {
      // 文本搜索
      for (const storage of this.storages.values()) {
        const textResults = await storage.query({
          ...options,
          limit: limit * 2,
        });
        results.push(...textResults);
      }
    }

    // 去重
    const seen = new Set<string>();
    results = results.filter(r => {
      if (seen.has(r.item.id)) return false;
      seen.add(r.item.id);
      return true;
    });

    // 融合排序
    results = this.fuseAndRankResults(results, query, options);

    return results.slice(0, limit);
  }

  /**
   * 语义搜索
   */
  async semanticSearch(
    query: string,
    options: Omit<MemoryRetrievalOptions, 'strategy' | 'queryEmbedding'> = {}
  ): Promise<StorageQueryResult[]> {
    const queryEmbedding = this.embeddingGenerator?.generate(query);
    
    if (!queryEmbedding) {
      throw new Error('Embedding generator not available');
    }

    return this.search(query, { ...options, strategy: 'semantic', queryEmbedding });
  }

  /**
   * 更新记忆
   */
  async update(id: string, updates: Partial<MemoryItem>): Promise<MemoryItem | null> {
    // 找到记忆所在的存储
    for (const storage of this.storages.values()) {
      const item = await storage.retrieve(id);
      if (item) {
        const updated = await storage.update(id, updates);
        if (updated) {
          this.emit('memory:updated', { item: updated });
        }
        return updated;
      }
    }

    return null;
  }

  /**
   * 删除记忆
   */
  async delete(id: string): Promise<boolean> {
    for (const storage of this.storages.values()) {
      const success = await storage.delete(id);
      if (success) {
        this.emit('memory:deleted', { id });
        return true;
      }
    }

    return false;
  }

  /**
   * 批量删除
   */
  async deleteBatch(ids: string[]): Promise<BatchOperationResult> {
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
      duration: 0, // 简化处理
    };
  }

  // --------------------------------------------------------------------------
  // 层级管理
  // --------------------------------------------------------------------------

  /**
   * 迁移记忆到指定层级
   */
  async migrateToTier(id: string, targetTier: StorageTier): Promise<boolean> {
    // 找到记忆
    let sourceItem: MemoryItem | null = null;
    let sourceStorage: StorageAdapter | null = null;

    for (const storage of this.storages.values()) {
      const item = await storage.retrieve(id);
      if (item) {
        sourceItem = item;
        sourceStorage = storage;
        break;
      }
    }

    if (!sourceItem || !sourceStorage) {
      return false;
    }

    const targetStorage = this.tierToStorage.get(targetTier);
    if (!targetStorage) {
      throw new Error(`No storage configured for tier: ${targetTier}`);
    }

    if (sourceStorage === targetStorage) {
      // 只需要更新tier字段
      await sourceStorage.update(id, { tier: targetTier });
      return true;
    }

    // 迁移到新存储
    const migratedItem: MemoryItem = {
      ...sourceItem,
      tier: targetTier,
      lastAccessed: Date.now(),
    };

    await targetStorage.store(migratedItem);
    await sourceStorage.delete(id);

    this.emit('memory:migrated', { item: migratedItem, fromTier: sourceItem.tier, toTier: targetTier });
    return true;
  }

  /**
   * 提升记忆到工作记忆
   */
  async promoteToWorking(id: string): Promise<boolean> {
    return this.migrateToTier(id, 'working');
  }

  /**
   * 归档记忆
   */
  async archive(id: string): Promise<boolean> {
    return this.migrateToTier(id, 'archival');
  }

  // --------------------------------------------------------------------------
  // 统计与监控
  // --------------------------------------------------------------------------

  /**
   * 获取所有存储的统计信息
   */
  async getStats(): Promise<Record<string, StorageStats>> {
    const stats: Record<string, StorageStats> = {};

    for (const [name, storage] of this.storages) {
      stats[name] = await storage.getStats();
    }

    return stats;
  }

  /**
   * 获取整体统计
   */
  async getOverallStats(): Promise<{
    totalItems: number;
    byTier: Record<StorageTier, number>;
    byType: Record<MemoryType, number>;
    totalSize: number;
  }> {
    const allStats = await this.getStats();

    let totalItems = 0;
    const byTier: Record<StorageTier, number> = { working: 0, short_term: 0, long_term: 0, archival: 0 };
    const byType: Partial<Record<MemoryType, number>> = {};
    let totalSize = 0;

    for (const stats of Object.values(allStats)) {
      totalItems += stats.totalCount;
      totalSize += stats.totalSize;

      for (const [tier, count] of Object.entries(stats.tierCounts)) {
        byTier[tier as StorageTier] += count;
      }

      for (const [type, count] of Object.entries(stats.typeCounts)) {
        byType[type as MemoryType] = (byType[type as MemoryType] || 0) + count;
      }
    }

    return {
      totalItems,
      byTier,
      byType: byType as Record<MemoryType, number>,
      totalSize,
    };
  }

  /**
   * 健康检查
   */
  async healthCheck(): Promise<Record<string, { healthy: boolean; message?: string }>> {
    const results: Record<string, { healthy: boolean; message?: string }> = {};

    for (const [name, storage] of this.storages) {
      results[name] = await storage.healthCheck();
    }

    return results;
  }

  // --------------------------------------------------------------------------
  // 私有方法
  // --------------------------------------------------------------------------

  private bindTierToStorage(storageName: string): void {
    const storage = this.storages.get(storageName);
    if (!storage) return;

    // 查找该存储绑定的层级
    for (const [tier, mappedStorage] of Object.entries(this.config.tierMapping)) {
      if (mappedStorage === storageName) {
        this.tierToStorage.set(tier as StorageTier, storage);
      }
    }
  }

  private generateId(): string {
    return `mem_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private calculateImportance(content: string, type: MemoryType): number {
    let baseImportance = 0.5;

    // 根据类型调整
    switch (type) {
      case 'preference':
        baseImportance = 0.9;
        break;
      case 'error':
        baseImportance = 0.8;
        break;
      case 'feedback':
        baseImportance = 0.7;
        break;
      case 'skill_usage':
        baseImportance = 0.6;
        break;
      case 'fact':
        baseImportance = 0.5;
        break;
      case 'context':
        baseImportance = 0.4;
        break;
      case 'parameter':
        baseImportance = 0.3;
        break;
    }

    // 根据内容长度微调
    const lengthBonus = Math.min(content.length / 1000, 0.1);

    // 根据关键词调整
    const highImportanceKeywords = ['important', 'critical', 'must', 'always', 'never', 'error', 'bug'];
    const hasHighImportance = highImportanceKeywords.some(kw =>
      content.toLowerCase().includes(kw)
    );
    const keywordBonus = hasHighImportance ? 0.1 : 0;

    return Math.min(baseImportance + lengthBonus + keywordBonus, 1.0);
  }

  private async checkAndMigrate(tier: StorageTier): Promise<void> {
    const storage = this.tierToStorage.get(tier);
    if (!storage) return;

    const capacity = this.config.tierCapacities[tier];
    const stats = await storage.getStats();

    if (stats.totalCount >= capacity.migrationThreshold) {
      await this.performMigration(tier);
    }
  }

  private async performMigration(fromTier: StorageTier): Promise<MigrationResult> {
    const tiers: StorageTier[] = ['working', 'short_term', 'long_term', 'archival'];
    const fromIndex = tiers.indexOf(fromTier);
    const toTier = tiers[fromIndex + 1];

    if (!toTier) {
      // 已经是最底层，删除最不重要的
      return this.evictLeastImportant(fromTier);
    }

    const fromStorage = this.tierToStorage.get(fromTier);
    const toStorage = this.tierToStorage.get(toTier);

    if (!fromStorage || !toStorage) {
      return { migratedCount: 0, fromTier, toTier, migratedIds: [] };
    }

    // 获取要迁移的条目（重要性最低的20%）
    const candidates = await fromStorage.query({
      tier: fromTier,
      limit: 100,
      sortBy: 'importance',
      sortOrder: 'asc',
    });

    const toMigrate = candidates.slice(0, Math.ceil(candidates.length * 0.2));
    const migratedIds: string[] = [];

    for (const result of toMigrate) {
      const success = await this.migrateToTier(result.item.id, toTier);
      if (success) {
        migratedIds.push(result.item.id);
      }
    }

    const result: MigrationResult = {
      migratedCount: migratedIds.length,
      fromTier,
      toTier,
      migratedIds,
    };

    this.emit('migration:completed', result);
    return result;
  }

  private async evictLeastImportant(tier: StorageTier): Promise<MigrationResult> {
    const storage = this.tierToStorage.get(tier);
    if (!storage) {
      return { migratedCount: 0, fromTier: tier, toTier: tier, migratedIds: [] };
    }

    // 获取最不重要的条目
    const candidates = await storage.query({
      tier,
      limit: 10,
      sortBy: 'importance',
      sortOrder: 'asc',
    });

    const evictedIds: string[] = [];

    for (const result of candidates) {
      if (result.item.importance < 0.3) {
        await storage.delete(result.item.id);
        evictedIds.push(result.item.id);
      }
    }

    return {
      migratedCount: evictedIds.length,
      fromTier: tier,
      toTier: tier,
      migratedIds: evictedIds,
    };
  }

  private async performAutoMigration(): Promise<void> {
    const tiers: StorageTier[] = ['working', 'short_term', 'long_term'];

    for (const tier of tiers) {
      await this.checkAndMigrate(tier);
    }
  }

  private fuseAndRankResults(
    results: StorageQueryResult[],
    query: string,
    options: MemoryRetrievalOptions
  ): StorageQueryResult[] {
    const weights = options.fusionWeights || {
      semantic: 0.5,
      recency: 0.3,
      importance: 0.2,
    };

    // 计算融合分数
    for (const result of results) {
      const semanticScore = result.similarityScore || result.score;
      const recencyScore = result.recencyScore || this.calculateRecencyScore(result.item.createdAt);
      const importanceScore = result.importanceScore || result.item.importance;

      result.score =
        semanticScore * (weights.semantic || 0.5) +
        recencyScore * (weights.recency || 0.3) +
        importanceScore * (weights.importance || 0.2);
    }

    // 排序
    return results.sort((a, b) => b.score - a.score);
  }

  private calculateRecencyScore(timestamp: number): number {
    const age = Date.now() - timestamp;
    return Math.exp(-age / (24 * 60 * 60 * 1000)); // 24小时衰减
  }
}

// ============================================================================
// 工厂函数
// ============================================================================

/**
 * 创建统一记忆管理器
 */
export function createUnifiedMemoryManager(
  config: Partial<UnifiedMemoryManagerConfig> & { name: string }
): UnifiedMemoryManager {
  const defaultConfig: UnifiedMemoryManagerConfig = {
    name: config.name,
    storages: config.storages || [
      {
        type: 'memory',
        name: 'working-memory',
        enabled: true,
        priority: 1,
        options: { maxEntries: 100 },
      },
      {
        type: 'file',
        name: 'long-term-memory',
        enabled: true,
        priority: 2,
        options: { dataDir: './data/memory' },
      },
    ],
    tierMapping: config.tierMapping || {
      working: 'working-memory',
      short_term: 'working-memory',
      long_term: 'long-term-memory',
    },
    tierCapacities: config.tierCapacities || {
      working: { maxEntries: 100, migrationThreshold: 80 },
      short_term: { maxEntries: 1000, migrationThreshold: 800 },
      long_term: { maxEntries: 10000, migrationThreshold: 9000 },
      archival: { maxEntries: 100000, migrationThreshold: 95000 },
    },
    autoMigrationInterval: config.autoMigrationInterval ?? 60000,
    enableCompression: config.enableCompression ?? true,
    enableVectorization: config.enableVectorization ?? true,
    vectorDimension: config.vectorDimension ?? 384,
    logger: config.logger,
  };

  return new UnifiedMemoryManager(defaultConfig);
}

// ============================================================================
// 导出
// ============================================================================

// Types are exported from index.ts
