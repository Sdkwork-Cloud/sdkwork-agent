/**
 * Memory Compressor - 记忆压缩与摘要系统
 *
 * 核心特性：
 * 1. 长时记忆压缩 - 将详细记忆压缩为关键信息
 * 2. 自动摘要生成 - 使用 LLM 生成高质量摘要
 * 3. 情景记忆提取 - 提取重要情景模式
 * 4. 记忆融合 - 合并相似记忆减少冗余
 * 5. 重要性评估 - 基于访问频率和内容重要性
 *
 * @module MemoryCompressor
 * @version 1.0.0
 * @reference MemGPT: Towards LLMs as Operating Systems
 */

import { EventEmitter } from '../utils/event-emitter.js';
import { LLMService, Logger } from '../skills/core/types.js';

/**
 * 记忆条目
 */
export interface MemoryEntry {
  /** 唯一标识符 */
  id: string;

  /** 记忆内容 */
  content: string;

  /** 记忆类型 */
  type: 'conversation' | 'fact' | 'experience' | 'skill_usage';

  /** 创建时间 */
  createdAt: Date;

  /** 最后访问时间 */
  lastAccessed: Date;

  /** 访问次数 */
  accessCount: number;

  /** 重要性分数 (0-1) */
  importance: number;

  /** 关联的记忆ID */
  relatedMemories: string[];

  /** 元数据 */
  metadata: Record<string, unknown>;
}

/**
 * 压缩后的记忆
 */
export interface CompressedMemory {
  /** 原始记忆ID */
  originalId: string;

  /** 摘要内容 */
  summary: string;

  /** 关键信息提取 */
  keyPoints: string[];

  /** 压缩比例 */
  compressionRatio: number;

  /** 压缩时间 */
  compressedAt: Date;

  /** 是否可解压 */
  reversible: boolean;

  /** 原始内容（如果可逆） */
  originalContent?: string;
}

/**
 * 情景模式
 */
export interface EpisodePattern {
  /** 模式名称 */
  name: string;

  /** 模式描述 */
  description: string;

  /** 触发条件 */
  triggers: string[];

  /** 典型响应 */
  typicalResponse: string;

  /** 出现频率 */
  frequency: number;

  /** 成功率 */
  successRate: number;
}

/**
 * 压缩配置
 */
export interface CompressionConfig {
  /** 压缩阈值（token数） */
  compressionThreshold?: number;

  /** 目标压缩比例 */
  targetRatio?: number;

  /** 启用智能摘要 */
  enableSmartSummary?: boolean;

  /** 启用模式提取 */
  enablePatternExtraction?: boolean;

  /** 启用记忆融合 */
  enableMemoryFusion?: boolean;

  /** 重要性阈值 */
  importanceThreshold?: number;

  /** 最大记忆数 */
  maxMemories?: number;
}

/**
 * 记忆压缩器
 *
 * 提供高效的记忆压缩和管理能力
 */
export class MemoryCompressor extends EventEmitter {
  private memories = new Map<string, MemoryEntry>();
  private compressedCache = new Map<string, CompressedMemory>();
  private patterns: EpisodePattern[] = [];
  private config: Required<CompressionConfig>;

  constructor(
    private llm: LLMService,
    private logger: Logger,
    config: CompressionConfig = {}
  ) {
    super();
    this.config = {
      compressionThreshold: 1000,
      targetRatio: 0.3,
      enableSmartSummary: true,
      enablePatternExtraction: true,
      enableMemoryFusion: true,
      importanceThreshold: 0.5,
      maxMemories: 10000,
      ...config,
    };
  }

  /**
   * 添加记忆
   */
  addMemory(
    content: string,
    type: MemoryEntry['type'],
    importance: number = 0.5,
    metadata: Record<string, unknown> = {}
  ): MemoryEntry {
    const id = this.generateId();
    const now = new Date();

    const entry: MemoryEntry = {
      id,
      content,
      type,
      createdAt: now,
      lastAccessed: now,
      accessCount: 1,
      importance,
      relatedMemories: [],
      metadata,
    };

    this.memories.set(id, entry);

    // 检查是否需要压缩
    if (this.shouldCompress(entry)) {
      this.compressMemory(id);
    }

    // 检查容量
    if (this.memories.size > this.config.maxMemories) {
      this.evictLeastImportant();
    }

    this.emit('memory:added', {
      type: 'memory:added',
      timestamp: now,
      data: { id, type, importance },
    });

    return entry;
  }

  /**
   * 压缩记忆
   */
  async compressMemory(memoryId: string): Promise<CompressedMemory | undefined> {
    const memory = this.memories.get(memoryId);
    if (!memory) return undefined;

    // 检查缓存
    const cached = this.compressedCache.get(memoryId);
    if (cached) return cached;

    try {
      let summary: string;
      let keyPoints: string[];

      if (this.config.enableSmartSummary) {
        // 使用 LLM 生成智能摘要
        const result = await this.generateSmartSummary(memory);
        summary = result.summary;
        keyPoints = result.keyPoints;
      } else {
        // 简单摘要
        summary = this.generateSimpleSummary(memory.content);
        keyPoints = this.extractKeyPoints(memory.content);
      }

      const compressed: CompressedMemory = {
        originalId: memoryId,
        summary,
        keyPoints,
        compressionRatio: summary.length / memory.content.length,
        compressedAt: new Date(),
        reversible: false, // 默认不可逆
      };

      // 如果压缩比例好，保存原始内容
      if (compressed.compressionRatio > 0.5) {
        compressed.reversible = true;
        compressed.originalContent = memory.content;
      }

      this.compressedCache.set(memoryId, compressed);

      this.emit('memory:compressed', {
        type: 'memory:compressed',
        timestamp: new Date(),
        data: { memoryId, ratio: compressed.compressionRatio },
      });

      return compressed;
    } catch (error) {
      this.logger.error('Failed to compress memory', { error: (error as Error).message });
      return undefined;
    }
  }

  /**
   * 解压记忆
   */
  decompressMemory(memoryId: string): string | undefined {
    const compressed = this.compressedCache.get(memoryId);
    if (!compressed) return undefined;

    if (compressed.reversible && compressed.originalContent) {
      return compressed.originalContent;
    }

    // 返回摘要作为近似
    return compressed.summary;
  }

  /**
   * 提取情景模式
   */
  async extractPatterns(): Promise<EpisodePattern[]> {
    if (!this.config.enablePatternExtraction) return [];

    const conversations = Array.from(this.memories.values())
      .filter(m => m.type === 'conversation')
      .sort((a, b) => b.accessCount - a.accessCount)
      .slice(0, 100); // 最近100条

    if (conversations.length < 10) return [];

    const prompt = `Analyze the following conversation patterns and extract common behavioral patterns:

${conversations.map(c => c.content).join('\n---\n')}

Extract patterns in JSON format:
[{
  "name": "pattern name",
  "description": "what this pattern represents",
  "triggers": ["trigger words or situations"],
  "typicalResponse": "typical response to this pattern",
  "frequency": 0.8,
  "successRate": 0.9
}]`;

    try {
      const response = await this.llm.complete(prompt, { temperature: 0.3 });
      const patterns = JSON.parse(response);
      this.patterns = patterns;

      this.emit('patterns:extracted', {
        type: 'patterns:extracted',
        timestamp: new Date(),
        data: { count: patterns.length },
      });

      return patterns;
    } catch (error) {
      this.logger.error('Failed to extract patterns', { error: (error as Error).message });
      return [];
    }
  }

  /**
   * 融合相似记忆
   */
  async fuseSimilarMemories(similarityThreshold: number = 0.8): Promise<number> {
    if (!this.config.enableMemoryFusion) return 0;

    const memories = Array.from(this.memories.values());
    const fused = new Set<string>();
    let fusionCount = 0;

    for (let i = 0; i < memories.length; i++) {
      if (fused.has(memories[i].id)) continue;

      const similar: MemoryEntry[] = [];

      for (let j = i + 1; j < memories.length; j++) {
        if (fused.has(memories[j].id)) continue;

        const similarity = this.calculateSimilarity(
          memories[i].content,
          memories[j].content
        );

        if (similarity >= similarityThreshold) {
          similar.push(memories[j]);
          fused.add(memories[j].id);
        }
      }

      if (similar.length > 0) {
        // 融合记忆
        await this.fuseMemoryGroup([memories[i], ...similar]);
        fusionCount++;
      }
    }

    // 删除已融合的记忆
    for (const id of fused) {
      this.memories.delete(id);
      this.compressedCache.delete(id);
    }

    this.emit('memories:fused', {
      type: 'memories:fused',
      timestamp: new Date(),
      data: { fusedCount: fusionCount, removedCount: fused.size },
    });

    return fusionCount;
  }

  /**
   * 检索相关记忆
   */
  async retrieveRelevant(
    query: string,
    limit: number = 10
  ): Promise<Array<{ memory: MemoryEntry | CompressedMemory; relevance: number }>> {
    const results: Array<{ memory: MemoryEntry | CompressedMemory; relevance: number }> = [];

    // 检查所有记忆
    for (const [id, memory] of this.memories) {
      const compressed = this.compressedCache.get(id);
      const content = compressed?.summary || memory.content;

      const relevance = this.calculateRelevance(query, content, memory);

      if (relevance > 0.3) {
        results.push({
          memory: compressed || memory,
          relevance,
        });
      }
    }

    // 按相关性和重要性排序
    results.sort((a, b) => {
      const scoreA = a.relevance * (a.memory instanceof Object && 'importance' in a.memory ? a.memory.importance : 0.5);
      const scoreB = b.relevance * (b.memory instanceof Object && 'importance' in b.memory ? b.memory.importance : 0.5);
      return scoreB - scoreA;
    });

    return results.slice(0, limit);
  }

  /**
   * 获取记忆统计
   */
  getStats(): {
    totalMemories: number;
    compressedCount: number;
    averageCompressionRatio: number;
    patternCount: number;
    typeDistribution: Record<string, number>;
  } {
    let totalRatio = 0;
    for (const compressed of this.compressedCache.values()) {
      totalRatio += compressed.compressionRatio;
    }

    const typeDistribution: Record<string, number> = {};
    for (const memory of this.memories.values()) {
      typeDistribution[memory.type] = (typeDistribution[memory.type] || 0) + 1;
    }

    return {
      totalMemories: this.memories.size,
      compressedCount: this.compressedCache.size,
      averageCompressionRatio:
        this.compressedCache.size > 0 ? totalRatio / this.compressedCache.size : 0,
      patternCount: this.patterns.length,
      typeDistribution,
    };
  }

  /**
   * 清空所有记忆
   */
  clear(): void {
    this.memories.clear();
    this.compressedCache.clear();
    this.patterns = [];

    this.emit('memory:cleared', {
      type: 'memory:cleared',
      timestamp: new Date(),
    });
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  private generateId(): string {
    return `mem_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private shouldCompress(memory: MemoryEntry): boolean {
    return memory.content.length > this.config.compressionThreshold;
  }

  private async generateSmartSummary(
    memory: MemoryEntry
  ): Promise<{ summary: string; keyPoints: string[] }> {
    const prompt = `Summarize the following memory concisely and extract key points:

Memory Type: ${memory.type}
Content: ${memory.content}

Provide output in JSON format:
{
  "summary": "concise summary in 1-2 sentences",
  "keyPoints": ["key point 1", "key point 2", "key point 3"]
}`;

    try {
      const response = await this.llm.complete(prompt, { temperature: 0.3 });
      return JSON.parse(response);
    } catch (error) {
      // 记录错误并回退到简单摘要
      this.logger.warn('Smart summary generation failed, falling back to simple summary', { error: (error as Error).message });
      return {
        summary: this.generateSimpleSummary(memory.content),
        keyPoints: this.extractKeyPoints(memory.content),
      };
    }
  }

  private generateSimpleSummary(content: string): string {
    // 提取前两句作为摘要
    const sentences = content.split(/[.!?。！？]+/).filter(s => s.trim());
    return sentences.slice(0, 2).join('. ') + '.';
  }

  private extractKeyPoints(content: string): string[] {
    // 简单提取关键信息
    const sentences = content.split(/[.!?。！？]+/).filter(s => s.trim().length > 10);
    return sentences.slice(0, 3);
  }

  private calculateSimilarity(a: string, b: string): number {
    // 简单的 Jaccard 相似度
    const setA = new Set(a.toLowerCase().split(/\s+/));
    const setB = new Set(b.toLowerCase().split(/\s+/));

    const intersection = new Set([...setA].filter(x => setB.has(x)));
    const union = new Set([...setA, ...setB]);

    return intersection.size / union.size;
  }

  private async fuseMemoryGroup(memories: MemoryEntry[]): Promise<void> {
    if (memories.length < 2) return;

    // 选择最重要的记忆作为主记忆
    const primary = memories.reduce((max, m) =>
      m.importance > max.importance ? m : max
    );

    // 合并内容
    const fusedContent = await this.generateFusedContent(
      memories.map(m => m.content)
    );

    // 更新主记忆
    primary.content = fusedContent;
    primary.importance = Math.min(1, primary.importance + 0.1);
    primary.relatedMemories = memories
      .filter(m => m.id !== primary.id)
      .map(m => m.id);
    primary.metadata.fusedFrom = memories.length;
    primary.metadata.fusedAt = new Date();

    // 更新压缩缓存
    this.compressedCache.delete(primary.id);
  }

  private async generateFusedContent(contents: string[]): Promise<string> {
    if (contents.length === 1) return contents[0];

    const prompt = `Merge the following similar memories into a single coherent memory:

${contents.map((c, i) => `Memory ${i + 1}: ${c}`).join('\n\n')}

Provide a fused version that preserves all unique information:`;

    try {
      return await this.llm.complete(prompt, { temperature: 0.3 });
    } catch {
      // 回退：连接所有内容
      return contents.join('\n\n');
    }
  }

  private calculateRelevance(
    query: string,
    content: string,
    memory: MemoryEntry
  ): number {
    // 文本相似度
    const textSimilarity = this.calculateSimilarity(query, content);

    // 时间衰减
    const daysSinceAccess =
      (Date.now() - memory.lastAccessed.getTime()) / (1000 * 60 * 60 * 24);
    const recencyFactor = Math.exp(-daysSinceAccess / 30); // 30天衰减

    // 访问频率
    const frequencyFactor = Math.log1p(memory.accessCount) / 5;

    // 重要性
    const importanceFactor = memory.importance;

    // 综合得分
    return (
      textSimilarity * 0.4 +
      recencyFactor * 0.2 +
      frequencyFactor * 0.2 +
      importanceFactor * 0.2
    );
  }

  private evictLeastImportant(): void {
    let leastImportant: MemoryEntry | undefined;

    for (const memory of this.memories.values()) {
      if (!leastImportant || memory.importance < leastImportant.importance) {
        leastImportant = memory;
      }
    }

    if (leastImportant) {
      this.memories.delete(leastImportant.id);
      this.compressedCache.delete(leastImportant.id);
    }
  }
}

/**
 * 创建记忆压缩器实例
 */
export function createMemoryCompressor(
  llm: LLMService,
  logger: Logger,
  config?: CompressionConfig
): MemoryCompressor {
  return new MemoryCompressor(llm, logger, config);
}
