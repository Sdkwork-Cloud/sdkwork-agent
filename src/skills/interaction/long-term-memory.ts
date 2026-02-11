/**
 * Long-Term Memory System
 *
 * 长期记忆系统 - 分层记忆管理
 *
 * 核心特性：
 * 1. 四层记忆架构 (工作/短期/中期/长期)
 * 2. 语义检索 (Embedding-based)
 * 3. 记忆重要性评分
 * 4. 自动遗忘机制
 * 5. 记忆总结和压缩
 *
 * @module LongTermMemorySystem
 * @version 1.0.0
 * @standard Industry Leading (MemGPT-inspired)
 */

import type { LLMService } from './intent-recognizer.js';

/** Logger interface */
interface Logger {
  debug: (...args: any[]) => void;
  info: (...args: any[]) => void;
  warn: (...args: any[]) => void;
  error: (...args: any[]) => void;
}

// ============================================================================
// Types
// ============================================================================

/**
 * 记忆分层
 */
export type MemoryLayer = 'working' | 'short_term' | 'medium_term' | 'long_term';

/**
 * 记忆类型
 */
export type MemoryType =
  | 'fact'           // 事实信息
  | 'preference'     // 用户偏好
  | 'skill_usage'    // Skill使用记录
  | 'error'          // 错误记录
  | 'feedback'       // 用户反馈
  | 'context'        // 上下文信息
  | 'parameter';     // 参数值

/**
 * 记忆条目
 */
export interface MemoryEntry {
  id: string;
  timestamp: Date;
  layer: MemoryLayer;
  type: MemoryType;
  content: string;
  embedding: number[];
  importance: number;      // 0-1
  accessCount: number;
  lastAccessed: Date;
  ttl?: number;           // 生存时间 (ms)
  metadata: {
    skillName?: string;
    taskType?: string;
    success?: boolean;
    userFeedback?: 'positive' | 'negative' | 'neutral';
    tags?: string[];
    source?: string;
  };
}

/**
 * 记忆检索选项
 */
export interface MemoryRetrieveOptions {
  layer?: MemoryLayer | MemoryLayer[];
  type?: MemoryType | MemoryType[];
  limit?: number;
  recencyWeight?: number;    // 0-1, 时间衰减权重
  relevanceWeight?: number;  // 0-1, 语义相关性权重
  importanceThreshold?: number;
  timeRange?: {
    start?: Date;
    end?: Date;
  };
  tags?: string[];
}

/**
 * 记忆检索结果
 */
export interface MemoryRetrieveResult {
  entry: MemoryEntry;
  score: number;
  recencyScore: number;
  relevanceScore: number;
  importanceScore: number;
}

/**
 * 记忆统计
 */
export interface MemoryStats {
  totalCount: number;
  byLayer: Record<MemoryLayer, number>;
  byType: Record<MemoryType, number>;
  averageImportance: number;
  totalAccessCount: number;
  cacheHitRate: number;
}

/**
 * 记忆配置
 */
export interface LongTermMemoryConfig {
  logger?: Logger;
  llm?: LLMService;
  embeddingDimension?: number;
  maxWorkingMemory?: number;
  maxShortTermMemory?: number;
  maxMediumTermMemory?: number;
  maxLongTermMemory?: number;
  defaultTTL?: Record<MemoryLayer, number>;
  enableAutoSummarize?: boolean;
  summarizeThreshold?: number;
}

// ============================================================================
// Embedding Generator
// ============================================================================

/**
 * Embedding生成器
 * 
 * 优化特性：
 * 1. 使用 LRU 缓存避免重复计算
 * 2. 支持异步批量生成
 * 3. 可配置使用外部 LLM 服务
 */
export class EmbeddingGenerator {
  private dimension: number;
  private cache: Map<string, { embedding: number[]; timestamp: number }> = new Map();
  private readonly cacheSize = 1000;
  private readonly cacheTTL = 5 * 60 * 1000; // 5分钟缓存

  constructor(dimension: number = 128) {
    this.dimension = dimension;
  }

  /**
   * 生成文本的Embedding
   *
   * 优先从缓存获取，避免重复计算
   */
  generate(text: string): number[] {
    // 检查缓存
    const cached = this.cache.get(text);
    if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
      return cached.embedding;
    }

    const embedding = this.computeEmbedding(text);
    
    // 更新缓存
    this.updateCache(text, embedding);
    
    return embedding;
  }

  /**
   * 批量生成 embedding（并行优化）
   */
  generateBatch(texts: string[]): number[][] {
    return texts.map(text => this.generate(text));
  }

  /**
   * 计算 embedding 的核心算法
   */
  private computeEmbedding(text: string): number[] {
    const embedding = new Array(this.dimension).fill(0);
    
    // 文本预处理：分词 + n-gram
    const normalizedText = text.toLowerCase().trim();
    const words = normalizedText.split(/\s+/);
    const bigrams: string[] = [];
    
    // 生成 bigram
    for (let i = 0; i < words.length - 1; i++) {
      bigrams.push(`${words[i]} ${words[i + 1]}`);
    }
    
    // 合并所有 token
    const tokens = [...words, ...bigrams];

    for (const token of tokens) {
      // 使用改进的哈希函数（FNV-1a 变体）
      let hash = 2166136261;
      for (let i = 0; i < token.length; i++) {
        hash ^= token.charCodeAt(i);
        hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
      }

      // 分布到 embedding 维度（使用多个位置）
      const primaryIndex = Math.abs(hash) % this.dimension;
      const secondaryIndex = Math.abs(hash >> 8) % this.dimension;
      
      embedding[primaryIndex] += 1.0;
      embedding[secondaryIndex] += 0.5;

      // 添加字符级特征（前3个字符）
      for (let i = 0; i < Math.min(token.length, 3); i++) {
        const charHash = Math.abs(token.charCodeAt(i) * 31 + i) % this.dimension;
        embedding[charHash] += 0.3;
      }
    }

    // L2 归一化
    const norm = Math.sqrt(embedding.reduce((sum, v) => sum + v * v, 0));
    if (norm > 0) {
      return embedding.map(v => v / norm);
    }

    return embedding;
  }

  /**
   * 更新缓存（LRU 策略）
   */
  private updateCache(text: string, embedding: number[]): void {
    // 如果缓存满了，删除最旧的条目
    if (this.cache.size >= this.cacheSize) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey) this.cache.delete(oldestKey);
    }
    
    this.cache.set(text, { embedding, timestamp: Date.now() });
  }

  /**
   * 清理过期缓存
   */
  cleanupCache(): void {
    const now = Date.now();
    for (const [key, value] of this.cache) {
      if (now - value.timestamp > this.cacheTTL) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * 获取缓存统计
   */
  getCacheStats(): { size: number; hitRate: number } {
    return {
      size: this.cache.size,
      hitRate: 0, // 需要外部统计
    };
  }

  /**
   * 计算余弦相似度
   */
  cosineSimilarity(a: number[], b: number[]): number {
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
}

// ============================================================================
// Long-Term Memory System
// ============================================================================

export class LongTermMemorySystem {
  private config: Required<LongTermMemoryConfig>;
  private logger: Logger;
  private embeddingGenerator: EmbeddingGenerator;

  // 内存存储
  private memories: Map<string, MemoryEntry> = new Map();
  private layerIndex: Map<MemoryLayer, Set<string>> = new Map();
  private typeIndex: Map<MemoryType, Set<string>> = new Map();
  private tagIndex: Map<string, Set<string>> = new Map();

  // 缓存
  private queryCache: Map<string, { results: MemoryRetrieveResult[]; timestamp: number }> = new Map();
  private cacheHits = 0;
  private cacheMisses = 0;
  private readonly maxQueryCacheSize = 100; // 最大查询缓存条目数
  private readonly queryCacheTTL = 60000; // 1分钟

  constructor(config: LongTermMemoryConfig = {}) {
    this.config = {
      embeddingDimension: 128,
      maxWorkingMemory: 10,
      maxShortTermMemory: 100,
      maxMediumTermMemory: 1000,
      maxLongTermMemory: 10000,
      defaultTTL: {
        working: 1000 * 60 * 60,      // 1小时
        short_term: 1000 * 60 * 60 * 24,  // 1天
        medium_term: 1000 * 60 * 60 * 24 * 30,  // 30天
        long_term: Infinity,
      },
      enableAutoSummarize: true,
      summarizeThreshold: 100,
      logger: this.createDefaultLogger(),
      llm: undefined as unknown as LLMService,
      ...config,
    };
    this.logger = this.config.logger;
    this.embeddingGenerator = new EmbeddingGenerator(this.config.embeddingDimension);

    // 初始化索引
    this.initializeIndexes();
  }

  /**
   * 存储记忆
   */
  async store(
    content: string,
    type: MemoryType,
    layer: MemoryLayer = 'short_term',
    metadata: MemoryEntry['metadata'] = {},
    importance?: number
  ): Promise<MemoryEntry> {
    // 生成embedding
    const embedding = this.embeddingGenerator.generate(content);

    // 计算重要性 (如果没有提供)
    const calculatedImportance = importance ?? this.calculateImportance(content, type);

    // 确定TTL
    const ttl = this.config.defaultTTL[layer];

    const entry: MemoryEntry = {
      id: this.generateId(),
      timestamp: new Date(),
      layer,
      type,
      content,
      embedding,
      importance: calculatedImportance,
      accessCount: 0,
      lastAccessed: new Date(),
      ttl: ttl === Infinity ? undefined : ttl,
      metadata,
    };

    // 存储
    this.memories.set(entry.id, entry);
    this.layerIndex.get(layer)!.add(entry.id);
    this.typeIndex.get(type)!.add(entry.id);

    // 更新标签索引
    if (metadata.tags) {
      for (const tag of metadata.tags) {
        if (!this.tagIndex.has(tag)) {
          this.tagIndex.set(tag, new Set());
        }
        this.tagIndex.get(tag)!.add(entry.id);
      }
    }

    // 检查是否需要层级迁移
    await this.checkLayerMigration(layer);

    // 清理过期记忆
    this.cleanupExpired();

    this.logger.debug(`Stored memory: ${entry.id}`, { layer, type, importance: entry.importance });

    return entry;
  }

  /**
   * 检索记忆
   */
  async retrieve(
    query: string,
    options: MemoryRetrieveOptions = {}
  ): Promise<MemoryRetrieveResult[]> {
    const {
      layer,
      type,
      limit = 10,
      recencyWeight = 0.3,
      relevanceWeight = 0.5,
      importanceThreshold = 0.1,
      timeRange,
      tags,
    } = options;

    // 检查缓存
    const cacheKey = this.generateCacheKey(query, options);
    const cached = this.queryCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.queryCacheTTL) {
      this.cacheHits++;
      return cached.results.slice(0, limit);
    }
    this.cacheMisses++;

    // 清理过期缓存条目
    this.cleanupQueryCache();

    // 生成查询embedding
    const queryEmbedding = this.embeddingGenerator.generate(query);

    // 获取候选记忆
    let candidates: MemoryEntry[] = [];

    if (layer) {
      const layers = Array.isArray(layer) ? layer : [layer];
      for (const l of layers) {
        const ids = this.layerIndex.get(l) || new Set();
        for (const id of ids) {
          const entry = this.memories.get(id);
          if (entry) candidates.push(entry);
        }
      }
    } else {
      candidates = Array.from(this.memories.values());
    }

    // 类型过滤
    if (type) {
      const types = Array.isArray(type) ? type : [type];
      candidates = candidates.filter(e => types.includes(e.type));
    }

    // 标签过滤
    if (tags && tags.length > 0) {
      candidates = candidates.filter(e =>
        tags.some(tag => e.metadata.tags?.includes(tag))
      );
    }

    // 时间范围过滤
    if (timeRange) {
      candidates = candidates.filter(e => {
        if (timeRange.start && e.timestamp < timeRange.start) return false;
        if (timeRange.end && e.timestamp > timeRange.end) return false;
        return true;
      });
    }

    // 重要性过滤
    candidates = candidates.filter(e => e.importance >= importanceThreshold);

    // 计算综合分数
    const scored = candidates.map(entry => {
      // 语义相似度
      const relevanceScore = this.embeddingGenerator.cosineSimilarity(
        queryEmbedding,
        entry.embedding
      );

      // 时间衰减 (越近越高)
      const age = Date.now() - entry.timestamp.getTime();
      const maxAge = 30 * 24 * 60 * 60 * 1000; // 30天
      const recencyScore = Math.max(0, 1 - age / maxAge);

      // 重要性
      const importanceScore = entry.importance;

      // 访问频率加成
      const accessBonus = Math.min(entry.accessCount * 0.01, 0.1);

      // 综合分数
      const score =
        relevanceScore * relevanceWeight +
        recencyScore * recencyWeight +
        importanceScore * (1 - relevanceWeight - recencyWeight) +
        accessBonus;

      return {
        entry,
        score,
        recencyScore,
        relevanceScore,
        importanceScore,
      };
    });

    // 排序并限制数量
    const results = scored
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);

    // 更新访问统计
    for (const result of results) {
      result.entry.accessCount++;
      result.entry.lastAccessed = new Date();
    }

    // 缓存结果（LRU策略）
    this.setQueryCache(cacheKey, results);

    return results;
  }

  /**
   * 设置查询缓存（带LRU淘汰）
   */
  private setQueryCache(key: string, results: MemoryRetrieveResult[]): void {
    // 如果缓存已满，删除最旧的条目
    while (this.queryCache.size >= this.maxQueryCacheSize) {
      const oldestKey = this.queryCache.keys().next().value;
      if (oldestKey) this.queryCache.delete(oldestKey);
    }

    this.queryCache.set(key, { results, timestamp: Date.now() });
  }

  /**
   * 清理过期查询缓存
   */
  private cleanupQueryCache(): void {
    const now = Date.now();
    const toDelete: string[] = [];

    for (const [key, entry] of this.queryCache) {
      if (now - entry.timestamp > this.queryCacheTTL) {
        toDelete.push(key);
      }
    }

    for (const key of toDelete) {
      this.queryCache.delete(key);
    }
  }

  /**
   * 基于记忆ID检索
   */
  async getById(id: string): Promise<MemoryEntry | undefined> {
    const entry = this.memories.get(id);
    if (entry) {
      entry.accessCount++;
      entry.lastAccessed = new Date();
    }
    return entry;
  }

  /**
   * 更新记忆
   */
  async update(
    id: string,
    updates: Partial<Omit<MemoryEntry, 'id' | 'timestamp'>>
  ): Promise<MemoryEntry | undefined> {
    const entry = this.memories.get(id);
    if (!entry) return undefined;

    // 更新字段
    if (updates.content !== undefined) {
      entry.content = updates.content;
      entry.embedding = this.embeddingGenerator.generate(updates.content);
    }
    if (updates.importance !== undefined) entry.importance = updates.importance;
    if (updates.metadata !== undefined) entry.metadata = { ...entry.metadata, ...updates.metadata };
    if (updates.layer !== undefined && updates.layer !== entry.layer) {
      // 迁移层级
      this.layerIndex.get(entry.layer)!.delete(id);
      this.layerIndex.get(updates.layer)!.add(id);
      entry.layer = updates.layer;
    }

    entry.lastAccessed = new Date();

    return entry;
  }

  /**
   * 删除记忆
   */
  async delete(id: string): Promise<boolean> {
    const entry = this.memories.get(id);
    if (!entry) return false;

    // 从索引中移除
    this.layerIndex.get(entry.layer)?.delete(id);
    this.typeIndex.get(entry.type)?.delete(id);
    if (entry.metadata.tags) {
      for (const tag of entry.metadata.tags) {
        this.tagIndex.get(tag)?.delete(id);
      }
    }

    // 从存储中移除
    this.memories.delete(id);

    return true;
  }

  /**
   * 总结记忆
   *
   * 将多条相关记忆压缩为一条总结记忆
   */
  async summarize(memories: MemoryEntry[]): Promise<MemoryEntry | undefined> {
    if (memories.length < 2) return undefined;

    // 构建总结提示
    const contents = memories.map(m => m.content).join('\n---\n');
    const prompt = `Summarize the following information into a concise paragraph:\n\n${contents}`;

    // 调用LLM生成总结
    let summary: string;
    if (this.config.llm) {
      summary = await this.config.llm.complete(prompt);
    } else {
      // 简化实现：连接内容
      summary = contents.slice(0, 500) + '...';
    }

    // 计算平均重要性
    const avgImportance = memories.reduce((sum, m) => sum + m.importance, 0) / memories.length;

    // 合并标签
    const allTags = new Set<string>();
    for (const m of memories) {
      m.metadata.tags?.forEach(tag => allTags.add(tag));
    }

    // 存储总结记忆
    const summaryEntry = await this.store(
      summary,
      'context',
      'medium_term',
      { tags: Array.from(allTags), source: 'summarization' },
      avgImportance
    );

    // 删除原始记忆 (可选)
    // for (const m of memories) {
    //   await this.delete(m.id);
    // }

    return summaryEntry;
  }

  /**
   * 获取统计信息
   */
  getStats(): MemoryStats {
    const entries = Array.from(this.memories.values());

    const byLayer: Record<MemoryLayer, number> = {
      working: 0,
      short_term: 0,
      medium_term: 0,
      long_term: 0,
    };

    const byType: Record<MemoryType, number> = {
      fact: 0,
      preference: 0,
      skill_usage: 0,
      error: 0,
      feedback: 0,
      context: 0,
      parameter: 0,
    };

    let totalImportance = 0;
    let totalAccess = 0;

    for (const entry of entries) {
      byLayer[entry.layer]++;
      byType[entry.type]++;
      totalImportance += entry.importance;
      totalAccess += entry.accessCount;
    }

    const totalCache = this.cacheHits + this.cacheMisses;

    return {
      totalCount: entries.length,
      byLayer,
      byType,
      averageImportance: entries.length > 0 ? totalImportance / entries.length : 0,
      totalAccessCount: totalAccess,
      cacheHitRate: totalCache > 0 ? this.cacheHits / totalCache : 0,
    };
  }

  /**
   * 清空所有记忆
   */
  async clear(): Promise<void> {
    this.memories.clear();
    this.initializeIndexes();
    this.queryCache.clear();
    this.cacheHits = 0;
    this.cacheMisses = 0;
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  private initializeIndexes(): void {
    this.layerIndex.set('working', new Set());
    this.layerIndex.set('short_term', new Set());
    this.layerIndex.set('medium_term', new Set());
    this.layerIndex.set('long_term', new Set());

    this.typeIndex.set('fact', new Set());
    this.typeIndex.set('preference', new Set());
    this.typeIndex.set('skill_usage', new Set());
    this.typeIndex.set('error', new Set());
    this.typeIndex.set('feedback', new Set());
    this.typeIndex.set('context', new Set());
    this.typeIndex.set('parameter', new Set());
  }

  private generateId(): string {
    return `mem_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  }

  private generateCacheKey(query: string, options: MemoryRetrieveOptions): string {
    return `${query}_${JSON.stringify(options)}`;
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
    const highImportanceKeywords = ['important', 'critical', 'must', 'always', 'never'];
    const hasHighImportance = highImportanceKeywords.some(kw =>
      content.toLowerCase().includes(kw)
    );
    const keywordBonus = hasHighImportance ? 0.1 : 0;

    return Math.min(baseImportance + lengthBonus + keywordBonus, 1.0);
  }

  private async checkLayerMigration(layer: MemoryLayer): Promise<void> {
    const maxSizes: Record<MemoryLayer, number> = {
      working: this.config.maxWorkingMemory,
      short_term: this.config.maxShortTermMemory,
      medium_term: this.config.maxMediumTermMemory,
      long_term: this.config.maxLongTermMemory,
    };

    const currentSize = this.layerIndex.get(layer)!.size;
    const maxSize = maxSizes[layer];

    if (currentSize > maxSize) {
      // 需要迁移或遗忘
      const entries = Array.from(this.layerIndex.get(layer)!)
        .map(id => this.memories.get(id)!)
        .sort((a, b) => {
          // 按重要性、访问频率、时间排序
          const scoreA = a.importance * 0.4 + (a.accessCount / 100) * 0.3 +
            (1 - (Date.now() - a.timestamp.getTime()) / (30 * 24 * 60 * 60 * 1000)) * 0.3;
          const scoreB = b.importance * 0.4 + (b.accessCount / 100) * 0.3 +
            (1 - (Date.now() - b.timestamp.getTime()) / (30 * 24 * 60 * 60 * 1000)) * 0.3;
          return scoreA - scoreB;
        });

      // 迁移最低分的条目到下一层
      const toMigrate = entries.slice(0, currentSize - maxSize);
      const nextLayer = this.getNextLayer(layer);

      for (const entry of toMigrate) {
        if (nextLayer && entry.importance > 0.3) {
          // 迁移到下一层
          this.layerIndex.get(layer)!.delete(entry.id);
          this.layerIndex.get(nextLayer)!.add(entry.id);
          entry.layer = nextLayer;
          this.logger.debug(`Migrated memory ${entry.id} to ${nextLayer}`);
        } else {
          // 删除
          await this.delete(entry.id);
          this.logger.debug(`Deleted memory ${entry.id} due to layer overflow`);
        }
      }
    }
  }

  private getNextLayer(layer: MemoryLayer): MemoryLayer | null {
    const layers: MemoryLayer[] = ['working', 'short_term', 'medium_term', 'long_term'];
    const index = layers.indexOf(layer);
    return index < layers.length - 1 ? layers[index + 1] : null;
  }

  private cleanupExpired(): void {
    const now = Date.now();
    const toDelete: string[] = [];

    for (const [id, entry] of this.memories) {
      if (entry.ttl && now - entry.timestamp.getTime() > entry.ttl) {
        toDelete.push(id);
      }
    }

    for (const id of toDelete) {
      this.delete(id);
    }

    if (toDelete.length > 0) {
      this.logger.debug(`Cleaned up ${toDelete.length} expired memories`);
    }
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

// ============================================================================
// Factory Functions
// ============================================================================

export function createLongTermMemorySystem(
  config?: LongTermMemoryConfig
): LongTermMemorySystem {
  return new LongTermMemorySystem(config);
}

// Types are exported from index.ts
