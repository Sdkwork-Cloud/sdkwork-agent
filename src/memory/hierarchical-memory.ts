/**
 * MemGPT 风格的分层记忆系统
 *
 * 实现三级记忆架构：
 * 1. 工作记忆 (Working Memory) - 当前上下文，有限的 token 预算
 * 2. 短期记忆 (Short-term Memory) - 最近的事件和对话
 * 3. 长期记忆 (Long-term Memory) - 持久化的知识和经验
 *
 * 核心机制：
 * - 自动摘要：当工作记忆溢出时，自动总结并归档到长期记忆
 * - 智能检索：基于相关性从长期记忆中检索信息到工作记忆
 * - 事件驱动：重要事件自动提升到短期记忆
 *
 * 参考：
 * - MemGPT: Towards LLMs as Operating Systems (Packer et al., 2023)
 * - https://github.com/cpacker/MemGPT
 *
 * @memory Hierarchical Memory
 * @version 1.0.0
 * @advanced
 */

import { EventEmitter } from '../utils/event-emitter.js';
import { Logger, createLogger } from '../utils/logger.js';
import type { 
  MemoryStore, 
  Memory, 
  MemoryQuery, 
  MemorySearchResult,
  MemoryType,
  MemorySource
} from '../core/domain/memory.js';

/**
 * 记忆条目
 */
export interface MemoryEntry {
  id: string;
  content: string;
  timestamp: number;
  importance: number; // 0-1，重要性评分
  embedding?: number[];
  metadata?: {
    source?: string;
    type?: 'conversation' | 'fact' | 'event' | 'reflection';
    tags?: string[];
    accessCount?: number;
    lastAccessed?: number;
  };
}

/**
 * 记忆层级配置
 */
export interface MemoryTierConfig {
  /** 最大条目数 */
  maxEntries: number;
  /** 最大 token 数（估算） */
  maxTokens: number;
  /** 保留策略 */
  evictionPolicy: 'lru' | 'fifo' | 'importance';
  /** 自动摘要阈值 */
  summarizationThreshold?: number;
}

/**
 * 分层记忆配置
 */
export interface HierarchicalMemoryConfig {
  workingMemory: MemoryTierConfig;
  shortTermMemory: MemoryTierConfig;
  longTermMemory: MemoryTierConfig;
  /** 自动归档间隔 (ms) */
  autoArchiveInterval?: number;
  /** 相似度阈值 */
  similarityThreshold?: number;
}

/**
 * 记忆检索结果
 */
export interface MemoryRetrievalResult {
  entry: MemoryEntry;
  relevance: number;
  tier: 'working' | 'shortTerm' | 'longTerm';
}

/**
 * 记忆统计
 */
export interface MemoryStats {
  working: { count: number; tokens: number };
  shortTerm: { count: number; tokens: number };
  longTerm: { count: number; tokens: number };
  totalAccesses: number;
  cacheHitRate: number;
}

/**
 * 默认配置
 */
const DEFAULT_CONFIG: HierarchicalMemoryConfig = {
  workingMemory: {
    maxEntries: 10,
    maxTokens: 4000,
    evictionPolicy: 'importance',
  },
  shortTermMemory: {
    maxEntries: 100,
    maxTokens: 20000,
    evictionPolicy: 'lru',
    summarizationThreshold: 50,
  },
  longTermMemory: {
    maxEntries: 10000,
    maxTokens: 1000000,
    evictionPolicy: 'importance',
  },
  autoArchiveInterval: 60000, // 1分钟
  similarityThreshold: 0.7,
};

/**
 * 估算文本的 token 数（简化版）
 */
function estimateTokens(text: string): number {
  // 粗略估算：英文约 0.75 tokens/字，中文约 2 tokens/字
  // 这里使用简单的字符数 / 4
  return Math.ceil(text.length / 4);
}

/**
 * 分层记忆系统
 * 实现 MemoryStore 接口以支持作为 Agent 记忆存储
 */
export class HierarchicalMemory extends EventEmitter implements MemoryStore {
  private config: HierarchicalMemoryConfig;
  private logger: Logger;

  // 三级记忆存储
  private workingMemory: Map<string, MemoryEntry> = new Map();
  private shortTermMemory: Map<string, MemoryEntry> = new Map();
  private longTermMemory: Map<string, MemoryEntry> = new Map();

  // 访问统计
  private accessStats: Map<string, { count: number; lastAccessed: number }> = new Map();
  private totalAccesses = 0;
  private cacheHits = 0;

  // 自动归档定时器
  private archiveTimer?: NodeJS.Timeout;

  constructor(config: Partial<HierarchicalMemoryConfig> = {}) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.logger = createLogger({ name: 'HierarchicalMemory' });

    // 启动自动归档
    this.startAutoArchive();
  }

  /**
   * 添加记忆到工作记忆
   */
  add(entry: Omit<MemoryEntry, 'id' | 'timestamp'> & { id?: string }): MemoryEntry {
    const fullEntry: MemoryEntry = {
      ...entry,
      id: entry.id || this.generateId(),
      timestamp: Date.now(),
      metadata: {
        accessCount: 0,
        lastAccessed: Date.now(),
        ...entry.metadata,
      },
    };

    // 检查工作记忆是否已满
    if (this.isTierFull('working')) {
      this.evictFromWorkingMemory();
    }

    this.workingMemory.set(fullEntry.id, fullEntry);
    this.accessStats.set(fullEntry.id, { count: 0, lastAccessed: Date.now() });

    this.emit('memoryAdded', { entry: fullEntry, tier: 'working' });
    this.logger.debug(`Added to working memory: ${fullEntry.id}`);

    return fullEntry;
  }

  /**
   * 检索记忆（跨层级）- 原有方法，用于内部搜索
   */
  retrieveMemories(query: string, options: {
    k?: number;
    threshold?: number;
    tiers?: ('working' | 'shortTerm' | 'longTerm')[];
  } = {}): MemoryRetrievalResult[] {
    const { k = 5, threshold = this.config.similarityThreshold ?? 0.7, tiers = ['working', 'shortTerm', 'longTerm'] } = options;

    this.totalAccesses++;
    const results: MemoryRetrievalResult[] = [];

    // 从各层级检索
    for (const tier of tiers) {
      const tierResults = this.searchTier(tier, query, k);
      results.push(...tierResults);
    }

    // 按相关性排序
    results.sort((a, b) => b.relevance - a.relevance);

    // 提升高频访问的记忆到工作记忆
    for (const result of results.slice(0, 3)) {
      if (result.tier !== 'working' && result.relevance > threshold) {
        this.promoteToWorkingMemory(result.entry.id);
      }
      this.updateAccessStats(result.entry.id);
    }

    return results.slice(0, k);
  }

  /**
   * 在指定层级搜索
   */
  private searchTier(
    tier: 'working' | 'shortTerm' | 'longTerm',
    query: string,
    k: number
  ): MemoryRetrievalResult[] {
    const store = this.getStore(tier);
    const results: MemoryRetrievalResult[] = [];

    // 简单的文本匹配（实际应使用向量相似度）
    const queryLower = query.toLowerCase();
    const queryTerms = queryLower.split(/\s+/);

    for (const entry of store.values()) {
      const contentLower = entry.content.toLowerCase();

      // 计算相关性分数
      let relevance = 0;

      // 词频匹配
      for (const term of queryTerms) {
        if (contentLower.includes(term)) {
          relevance += 0.3;
        }
      }

      // 重要性加成
      relevance += entry.importance * 0.3;

      // 时效性加成（越新越高）
      const age = Date.now() - entry.timestamp;
      const recency = Math.exp(-age / (24 * 60 * 60 * 1000)); // 24小时衰减
      relevance += recency * 0.2;

      // 访问频率加成
      const stats = this.accessStats.get(entry.id);
      if (stats) {
        const frequency = Math.min(stats.count / 10, 1); // 最多贡献 0.2
        relevance += frequency * 0.2;
      }

      if (relevance > 0) {
        results.push({ entry, relevance, tier });
      }
    }

    return results.sort((a, b) => b.relevance - a.relevance).slice(0, k);
  }

  /**
   * 归档工作记忆到短期记忆
   */
  private archiveWorkingMemory(): void {
    const entries = Array.from(this.workingMemory.values());

    // 按重要性排序，保留最重要的
    entries.sort((a, b) => b.importance - a.importance);

    const toArchive = entries.slice(this.config.workingMemory.maxEntries / 2);

    for (const entry of toArchive) {
      // 如果短期记忆也满了，先归档到长期记忆
      if (this.isTierFull('shortTerm')) {
        this.archiveShortTermMemory();
      }

      // 移动到短期记忆
      this.workingMemory.delete(entry.id);
      this.shortTermMemory.set(entry.id, entry);

      this.emit('memoryArchived', { entry, from: 'working', to: 'shortTerm' });
      this.logger.debug(`Archived to short-term: ${entry.id}`);
    }
  }

  /**
   * 归档短期记忆到长期记忆
   */
  private archiveShortTermMemory(): void {
    const entries = Array.from(this.shortTermMemory.values());

    // 按 LRU 排序
    entries.sort((a, b) => {
      const statsA = this.accessStats.get(a.id);
      const statsB = this.accessStats.get(b.id);
      return (statsA?.lastAccessed || 0) - (statsB?.lastAccessed || 0);
    });

    const toArchive = entries.slice(0, Math.ceil(entries.length * 0.2));

    for (const entry of toArchive) {
      // 摘要处理（如果内容较长）
      let content = entry.content;
      if (estimateTokens(content) > (this.config.shortTermMemory.summarizationThreshold || 50)) {
        content = this.summarize(content);
      }

      // 如果长期记忆满了，删除最不重要的
      if (this.isTierFull('longTerm')) {
        this.evictFromLongTermMemory();
      }

      const archivedEntry: MemoryEntry = {
        ...entry,
        content,
        metadata: {
          ...entry.metadata,
          type: 'reflection',
        },
      };

      this.shortTermMemory.delete(entry.id);
      this.longTermMemory.set(entry.id, archivedEntry);

      this.emit('memoryArchived', { entry: archivedEntry, from: 'shortTerm', to: 'longTerm' });
      this.logger.debug(`Archived to long-term: ${entry.id}`);
    }
  }

  /**
   * 摘要生成（简化版）
   */
  private summarize(content: string): string {
    // 实际应使用 LLM 生成摘要
    // 这里使用简单的截断 + 提示
    const sentences = content.split(/[.!?。！？]/);
    const keySentences = sentences.slice(0, 3); // 取前3句
    return keySentences.join('. ') + '... [summarized]';
  }

  /**
   * 从工作记忆驱逐
   */
  private evictFromWorkingMemory(): void {
    const entries = Array.from(this.workingMemory.values());

    // 按策略选择驱逐目标
    let toEvict: MemoryEntry;

    switch (this.config.workingMemory.evictionPolicy) {
      case 'lru':
        entries.sort((a, b) => {
          const statsA = this.accessStats.get(a.id);
          const statsB = this.accessStats.get(b.id);
          return (statsA?.lastAccessed || 0) - (statsB?.lastAccessed || 0);
        });
        toEvict = entries[0];
        break;
      case 'fifo':
        entries.sort((a, b) => a.timestamp - b.timestamp);
        toEvict = entries[0];
        break;
      case 'importance':
      default:
        entries.sort((a, b) => a.importance - b.importance);
        toEvict = entries[0];
        break;
    }

    if (toEvict) {
      this.workingMemory.delete(toEvict.id);
      this.emit('memoryEvicted', { entry: toEvict, tier: 'working' });
    }
  }

  /**
   * 从长期记忆驱逐
   */
  private evictFromLongTermMemory(): void {
    const entries = Array.from(this.longTermMemory.values());

    // 长期记忆使用重要性策略
    entries.sort((a, b) => a.importance - b.importance);

    const toEvict = entries[0];
    if (toEvict) {
      this.longTermMemory.delete(toEvict.id);
      this.accessStats.delete(toEvict.id);
      this.emit('memoryEvicted', { entry: toEvict, tier: 'longTerm' });
    }
  }

  /**
   * 提升到工作记忆
   */
  private promoteToWorkingMemory(id: string): void {
    let entry: MemoryEntry | undefined;

    // 从短期或长期记忆中查找
    entry = this.shortTermMemory.get(id) || this.longTermMemory.get(id);

    if (entry) {
      // 检查工作记忆是否已满
      if (this.isTierFull('working')) {
        this.evictFromWorkingMemory();
      }

      // 从原层级删除
      this.shortTermMemory.delete(id);
      this.longTermMemory.delete(id);

      // 添加到工作记忆
      this.workingMemory.set(id, entry);
      this.emit('memoryPromoted', { entry, to: 'working' });
      this.logger.debug(`Promoted to working memory: ${id}`);
    }
  }

  /**
   * 更新访问统计
   */
  private updateAccessStats(id: string): void {
    const stats = this.accessStats.get(id);
    if (stats) {
      stats.count++;
      stats.lastAccessed = Date.now();
      this.cacheHits++;
    }
  }

  /**
   * 检查层级是否已满
   */
  private isTierFull(tier: 'working' | 'shortTerm' | 'longTerm'): boolean {
    const store = this.getStore(tier);
    const config = this.config[`${tier}Memory`];

    // 检查条目数
    if (store.size >= config.maxEntries) {
      return true;
    }

    // 检查 token 数
    let totalTokens = 0;
    for (const entry of store.values()) {
      totalTokens += estimateTokens(entry.content);
      if (totalTokens >= config.maxTokens) {
        return true;
      }
    }

    return false;
  }

  /**
   * 获取存储
   */
  private getStore(tier: 'working' | 'shortTerm' | 'longTerm'): Map<string, MemoryEntry> {
    switch (tier) {
      case 'working':
        return this.workingMemory;
      case 'shortTerm':
        return this.shortTermMemory;
      case 'longTerm':
        return this.longTermMemory;
    }
  }

  /**
   * 启动自动归档
   */
  private startAutoArchive(): void {
    if (this.archiveTimer) {
      clearInterval(this.archiveTimer);
    }

    this.archiveTimer = setInterval(() => {
      this.archiveWorkingMemory();
    }, this.config.autoArchiveInterval);
  }

  /**
   * 停止自动归档
   */
  stopAutoArchive(): void {
    if (this.archiveTimer) {
      clearInterval(this.archiveTimer);
      this.archiveTimer = undefined;
    }
  }

  /**
   * 获取统计信息
   */
  getStats(): MemoryStats {
    const calculateTierStats = (store: Map<string, MemoryEntry>) => {
      let tokens = 0;
      for (const entry of store.values()) {
        tokens += estimateTokens(entry.content);
      }
      return { count: store.size, tokens };
    };

    return {
      working: calculateTierStats(this.workingMemory),
      shortTerm: calculateTierStats(this.shortTermMemory),
      longTerm: calculateTierStats(this.longTermMemory),
      totalAccesses: this.totalAccesses,
      cacheHitRate: this.totalAccesses > 0 ? this.cacheHits / this.totalAccesses : 0,
    };
  }

  /**
   * 生成唯一 ID
   */
  private generateId(): string {
    return `mem_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 销毁
   */
  destroy(): void {
    this.stopAutoArchive();
    this.workingMemory.clear();
    this.shortTermMemory.clear();
    this.longTermMemory.clear();
    this.accessStats.clear();
    this.removeAllListeners();
  }

  // ============================================================================
  // MemoryStore 接口实现
  // ============================================================================

  /**
   * 存储记忆
   * 将 Memory 转换为 MemoryEntry 并添加到工作记忆
   */
  async store(memory: Memory): Promise<void> {
    const entry: MemoryEntry = {
      id: memory.id,
      content: memory.content,
      timestamp: memory.timestamp,
      importance: memory.score || 0.5,
      embedding: memory.embedding,
      metadata: {
        source: memory.source,
        type: this.mapMemoryTypeToEntryType(memory.type),
        tags: memory.metadata?.tags,
        accessCount: 0,
        lastAccessed: Date.now(),
      },
    };

    // 检查工作记忆是否已满
    if (this.isTierFull('working')) {
      this.evictFromWorkingMemory();
    }

    this.workingMemory.set(entry.id, entry);
    this.accessStats.set(entry.id, { count: 0, lastAccessed: Date.now() });

    this.emit('memoryAdded', { entry, tier: 'working' });
  }

  /**
   * 检索记忆
   */
  async retrieve(id: string): Promise<Memory | undefined> {
    // 从所有层级查找
    let entry = this.workingMemory.get(id);
    let tier: 'working' | 'shortTerm' | 'longTerm' = 'working';

    if (!entry) {
      entry = this.shortTermMemory.get(id);
      tier = 'shortTerm';
    }
    if (!entry) {
      entry = this.longTermMemory.get(id);
      tier = 'longTerm';
    }

    if (!entry) return undefined;

    // 更新访问统计
    this.updateAccessStats(id);

    return this.entryToMemory(entry, tier);
  }

  /**
   * 搜索记忆
   */
  async search(query: MemoryQuery): Promise<MemorySearchResult[]> {
    const results = this.retrieveMemories(query.content, {
      k: query.limit || 10,
      threshold: query.threshold,
    });

    return results.map(result => ({
      memory: this.entryToMemory(result.entry, result.tier),
      score: result.relevance,
      relevance: result.relevance,
    }));
  }

  /**
   * 删除记忆
   */
  async delete(id: string): Promise<void> {
    const deleted = 
      this.workingMemory.delete(id) ||
      this.shortTermMemory.delete(id) ||
      this.longTermMemory.delete(id);

    if (deleted) {
      this.accessStats.delete(id);
      this.emit('memoryDeleted', { id });
    }
  }

  /**
   * 清空所有记忆 (MemoryStore 接口)
   */
  async clear(): Promise<void> {
    this.workingMemory.clear();
    this.shortTermMemory.clear();
    this.longTermMemory.clear();
    this.accessStats.clear();
    this.totalAccesses = 0;
    this.cacheHits = 0;
    this.emit('memoryCleared');
  }

  // ============================================================================
  // 辅助方法
  // ============================================================================

  private mapMemoryTypeToEntryType(type: MemoryType): 'conversation' | 'fact' | 'event' | 'reflection' {
    const mapping: Record<MemoryType, 'conversation' | 'fact' | 'event' | 'reflection'> = {
      episodic: 'event',
      semantic: 'fact',
      procedural: 'reflection',
    };
    return mapping[type] || 'fact';
  }

  private mapEntryTypeToMemoryType(type: string): MemoryType {
    const mapping: Record<string, MemoryType> = {
      event: 'episodic',
      fact: 'semantic',
      reflection: 'procedural',
      conversation: 'episodic',
    };
    return mapping[type] || 'semantic';
  }

  private entryToMemory(entry: MemoryEntry, tier: 'working' | 'shortTerm' | 'longTerm'): Memory {
    return {
      id: entry.id,
      content: entry.content,
      type: this.mapEntryTypeToMemoryType(entry.metadata?.type || 'fact'),
      source: (entry.metadata?.source as MemorySource) || 'system',
      metadata: {
        tags: entry.metadata?.tags,
        tier,
        accessCount: entry.metadata?.accessCount,
      },
      timestamp: entry.timestamp,
      score: entry.importance,
      embedding: entry.embedding,
    };
  }
}

/**
 * 创建分层记忆系统
 */
export function createHierarchicalMemory(config?: Partial<HierarchicalMemoryConfig>): HierarchicalMemory {
  return new HierarchicalMemory(config);
}
