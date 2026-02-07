/**
 * Memory Manager - 统一记忆管理器
 *
 * 设计原则：
 * 1. 分层记忆架构 - 工作记忆/短期记忆/长期记忆
 * 2. 自动记忆压缩 - 防止记忆膨胀
 * 3. 智能记忆检索 - 语义搜索 + 时间衰减
 * 4. 记忆持久化 - 支持多种存储后端
 *
 * @module MemoryManager
 * @version 2.0.0
 */

import { EventEmitter } from '../utils/event-emitter.js';

// ============================================================================
// 核心类型定义
// ============================================================================

/**
 * 日志接口
 */
export type Logger = import('../utils/logger').ILogger;

/**
 * 记忆层级
 */
export type MemoryTier = 'working' | 'short-term' | 'long-term';

/**
 * 记忆条目
 */
export interface MemoryEntry {
  /** 唯一ID */
  id: string;
  /** 记忆内容 */
  content: string;
  /** 记忆层级 */
  tier: MemoryTier;
  /** 创建时间 */
  createdAt: Date;
  /** 最后访问时间 */
  lastAccessedAt: Date;
  /** 访问次数 */
  accessCount: number;
  /** 重要性评分 (0-1) */
  importance: number;
  /** 元数据 */
  metadata?: Record<string, unknown>;
  /** 嵌入向量 */
  embedding?: number[];
}

/**
 * 记忆查询选项
 */
export interface MemoryQuery {
  /** 查询文本 */
  query: string;
  /** 记忆层级 */
  tier?: MemoryTier;
  /** 最大结果数 */
  limit?: number;
  /** 时间范围 */
  timeRange?: { start: Date; end: Date };
  /** 最小重要性 */
  minImportance?: number;
}

/**
 * 记忆搜索结果
 */
export interface MemorySearchResult {
  /** 记忆条目 */
  entry: MemoryEntry;
  /** 相似度分数 */
  score: number;
  /** 搜索类型 */
  matchType: 'semantic' | 'keyword' | 'temporal';
}

/**
 * 记忆管理器配置
 */
export interface MemoryManagerConfig {
  /** 工作记忆容量 */
  workingMemoryCapacity?: number;
  /** 短期记忆容量 */
  shortTermCapacity?: number;
  /** 长期记忆容量 */
  longTermCapacity?: number;
  /** 自动压缩阈值 */
  compressionThreshold?: number;
  /** 时间衰减因子 */
  decayFactor?: number;
  /** 日志器 */
  logger?: Logger;
}

/**
 * 记忆统计
 */
export interface MemoryStats {
  /** 总记忆数 */
  totalCount: number;
  /** 各层级记忆数 */
  tierCounts: Record<MemoryTier, number>;
  /** 总存储大小 (bytes) */
  totalSize: number;
  /** 平均重要性 */
  avgImportance: number;
  /** 记忆命中率 */
  hitRate: number;
}

// ============================================================================
// 记忆管理器实现
// ============================================================================

export class MemoryManager extends EventEmitter {
  private config: Required<MemoryManagerConfig>;
  private logger: Logger;
  
  // 三层记忆存储
  private workingMemory: Map<string, MemoryEntry> = new Map();
  private shortTermMemory: Map<string, MemoryEntry> = new Map();
  private longTermMemory: Map<string, MemoryEntry> = new Map();
  
  // 访问统计
  private accessLog: Array<{ id: string; timestamp: number }> = [];
  private hitCount = 0;
  private totalAccessCount = 0;

  constructor(config: MemoryManagerConfig = {}) {
    super();
    this.config = {
      workingMemoryCapacity: 10,
      shortTermCapacity: 100,
      longTermCapacity: 10000,
      compressionThreshold: 0.8,
      decayFactor: 0.95,
      logger: this.createDefaultLogger(),
      ...config,
    };
    this.logger = this.config.logger;
  }

  // ============================================================================
  // 核心操作
  // ============================================================================

  /**
   * 添加记忆
   */
  async add(content: string, options: {
    tier?: MemoryTier;
    importance?: number;
    metadata?: Record<string, unknown>;
    embedding?: number[];
  } = {}): Promise<MemoryEntry> {
    const entry: MemoryEntry = {
      id: this.generateId(),
      content,
      tier: options.tier || 'short-term',
      createdAt: new Date(),
      lastAccessedAt: new Date(),
      accessCount: 0,
      importance: options.importance ?? 0.5,
      metadata: options.metadata,
      embedding: options.embedding,
    };

    // 根据层级存储
    this.storeInTier(entry);

    // 检查是否需要压缩
    await this.checkAndCompress();

    this.emit('memory:added', { entry });
    this.logger.debug(`Memory added: ${entry.id} (${entry.tier})`);

    return entry;
  }

  /**
   * 检索记忆
   */
  async retrieve(query: MemoryQuery): Promise<MemorySearchResult[]> {
    this.totalAccessCount++;

    const results: MemorySearchResult[] = [];
    const queryLower = query.query.toLowerCase();

    // 1. 工作记忆优先搜索
    if (!query.tier || query.tier === 'working') {
      for (const entry of this.workingMemory.values()) {
        const score = this.calculateRelevance(entry, queryLower);
        if (score > 0) {
          results.push({ entry, score: score * 1.5, matchType: 'semantic' }); // 工作记忆加权
          this.updateAccessStats(entry);
        }
      }
    }

    // 2. 短期记忆搜索
    if (!query.tier || query.tier === 'short-term') {
      for (const entry of this.shortTermMemory.values()) {
        const score = this.calculateRelevance(entry, queryLower);
        if (score > 0) {
          results.push({ entry, score, matchType: 'semantic' });
          this.updateAccessStats(entry);
        }
      }
    }

    // 3. 长期记忆搜索
    if (!query.tier || query.tier === 'long-term') {
      for (const entry of this.longTermMemory.values()) {
        const score = this.calculateRelevance(entry, queryLower);
        if (score > 0) {
          results.push({ entry, score: score * 0.8, matchType: 'semantic' }); // 长期记忆降权
          this.updateAccessStats(entry);
        }
      }
    }

    // 排序并限制结果
    results.sort((a, b) => b.score - a.score);
    const limit = query.limit ?? 10;
    const finalResults = results.slice(0, limit);

    if (finalResults.length > 0) {
      this.hitCount++;
    }

    this.emit('memory:retrieved', { query, results: finalResults });
    return finalResults;
  }

  /**
   * 更新记忆
   */
  async update(id: string, updates: Partial<Omit<MemoryEntry, 'id'>>): Promise<MemoryEntry | null> {
    const entry = this.findEntry(id);
    if (!entry) return null;

    Object.assign(entry, updates, { lastAccessedAt: new Date() });
    
    this.emit('memory:updated', { entry });
    return entry;
  }

  /**
   * 删除记忆
   */
  async delete(id: string): Promise<boolean> {
    const deleted = 
      this.workingMemory.delete(id) ||
      this.shortTermMemory.delete(id) ||
      this.longTermMemory.delete(id);

    if (deleted) {
      this.emit('memory:deleted', { id });
    }

    return deleted;
  }

  /**
   * 记忆晋升/降级
   */
  async promote(id: string, targetTier: MemoryTier): Promise<boolean> {
    const entry = this.findEntry(id);
    if (!entry) return false;

    // 从原层级移除
    this.removeFromTier(entry);

    // 更新层级
    entry.tier = targetTier;
    entry.lastAccessedAt = new Date();

    // 存储到新层级
    this.storeInTier(entry);

    this.emit('memory:promoted', { entry, from: entry.tier, to: targetTier });
    return true;
  }

  /**
   * 获取统计信息
   */
  getStats(): MemoryStats {
    const workingCount = this.workingMemory.size;
    const shortTermCount = this.shortTermMemory.size;
    const longTermCount = this.longTermMemory.size;
    const totalCount = workingCount + shortTermCount + longTermCount;

    let totalSize = 0;
    let totalImportance = 0;

    for (const entry of this.getAllEntries()) {
      totalSize += entry.content.length * 2; // 粗略估计
      totalImportance += entry.importance;
    }

    return {
      totalCount,
      tierCounts: {
        working: workingCount,
        'short-term': shortTermCount,
        'long-term': longTermCount,
      },
      totalSize,
      avgImportance: totalCount > 0 ? totalImportance / totalCount : 0,
      hitRate: this.totalAccessCount > 0 ? this.hitCount / this.totalAccessCount : 0,
    };
  }

  /**
   * 清空所有记忆
   */
  async clear(): Promise<void> {
    this.workingMemory.clear();
    this.shortTermMemory.clear();
    this.longTermMemory.clear();
    this.accessLog = [];
    this.hitCount = 0;
    this.totalAccessCount = 0;

    this.emit('memory:cleared');
  }

  // ============================================================================
  // 私有方法
  // ============================================================================

  private storeInTier(entry: MemoryEntry): void {
    switch (entry.tier) {
      case 'working':
        this.workingMemory.set(entry.id, entry);
        break;
      case 'short-term':
        this.shortTermMemory.set(entry.id, entry);
        break;
      case 'long-term':
        this.longTermMemory.set(entry.id, entry);
        break;
    }
  }

  private removeFromTier(entry: MemoryEntry): void {
    switch (entry.tier) {
      case 'working':
        this.workingMemory.delete(entry.id);
        break;
      case 'short-term':
        this.shortTermMemory.delete(entry.id);
        break;
      case 'long-term':
        this.longTermMemory.delete(entry.id);
        break;
    }
  }

  private findEntry(id: string): MemoryEntry | undefined {
    return (
      this.workingMemory.get(id) ||
      this.shortTermMemory.get(id) ||
      this.longTermMemory.get(id)
    );
  }

  private getAllEntries(): MemoryEntry[] {
    return [
      ...this.workingMemory.values(),
      ...this.shortTermMemory.values(),
      ...this.longTermMemory.values(),
    ];
  }

  private calculateRelevance(entry: MemoryEntry, query: string): number {
    // 1. 关键词匹配
    const contentLower = entry.content.toLowerCase();
    const keywordScore = contentLower.includes(query) ? 0.5 : 0;

    // 2. 时间衰减
    const age = Date.now() - entry.createdAt.getTime();
    const maxAge = 30 * 24 * 60 * 60 * 1000; // 30天
    const timeScore = Math.max(0, 1 - age / maxAge) * 0.3;

    // 3. 重要性
    const importanceScore = entry.importance * 0.2;

    return keywordScore + timeScore + importanceScore;
  }

  private updateAccessStats(entry: MemoryEntry): void {
    entry.accessCount++;
    entry.lastAccessedAt = new Date();
    
    this.accessLog.push({ id: entry.id, timestamp: Date.now() });
    
    // 清理旧日志
    const cutoff = Date.now() - 60 * 60 * 1000; // 1小时
    this.accessLog = this.accessLog.filter(log => log.timestamp > cutoff);
  }

  private async checkAndCompress(): Promise<void> {
    // 检查各层级是否超过容量
    if (this.workingMemory.size > this.config.workingMemoryCapacity) {
      await this.compressTier('working');
    }
    
    if (this.shortTermMemory.size > this.config.shortTermCapacity) {
      await this.compressTier('short-term');
    }
    
    if (this.longTermMemory.size > this.config.longTermCapacity) {
      await this.compressTier('long-term');
    }
  }

  private async compressTier(tier: MemoryTier): Promise<void> {
    let sourceMap: Map<string, MemoryEntry>;
    let targetTier: MemoryTier;

    switch (tier) {
      case 'working':
        sourceMap = this.workingMemory;
        targetTier = 'short-term';
        break;
      case 'short-term':
        sourceMap = this.shortTermMemory;
        targetTier = 'long-term';
        break;
      case 'long-term':
        // 长期记忆满了，删除最不重要的
        await this.compressLongTerm();
        return;
    }

    // 按访问频率和重要性排序
    const entries = Array.from(sourceMap.values());
    entries.sort((a, b) => {
      const scoreA = a.accessCount * a.importance;
      const scoreB = b.accessCount * b.importance;
      return scoreA - scoreB;
    });

    // 将最不重要的记忆降级
    const toDemote = entries.slice(0, Math.floor(entries.length * 0.2));
    for (const entry of toDemote) {
      await this.promote(entry.id, targetTier);
    }

    this.logger.info(`Compressed ${tier} memory: ${toDemote.length} entries demoted to ${targetTier}`);
  }

  private async compressLongTerm(): Promise<void> {
    const entries = Array.from(this.longTermMemory.values());
    
    // 按重要性 + 访问频率排序
    entries.sort((a, b) => {
      const scoreA = a.accessCount * a.importance;
      const scoreB = b.accessCount * b.importance;
      return scoreA - scoreB;
    });

    // 删除最不重要的 10%
    const toDelete = entries.slice(0, Math.floor(entries.length * 0.1));
    for (const entry of toDelete) {
      this.longTermMemory.delete(entry.id);
    }

    this.logger.info(`Compressed long-term memory: ${toDelete.length} entries deleted`);
  }

  private generateId(): string {
    return `mem-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  }

  private createDefaultLogger(): Logger {
    return {
      debug: () => {},
      info: () => {},
      warn: console.warn,
      error: console.error,
    };
  }
}

/**
 * 创建记忆管理器
 */
export function createMemoryManager(config?: MemoryManagerConfig): MemoryManager {
  return new MemoryManager(config);
}

// Types are already exported above
