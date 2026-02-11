/**
 * Memory Store Implementation - 内存存储实现
 *
 * 基于内存的简单存储实现
 * 生产环境应替换为持久化存储
 *
 * @application Memory
 * @version 1.0.0
 */

import type {
  Memory,
  MemoryQuery,
  MemorySearchResult,
  MemoryStats,
  AdvancedMemoryStore,
  MemoryType,
  MemorySource,
} from '../domain/memory.js';
import type { MemoryConfig } from '../domain/memory.js';

/**
 * 创建内存存储
 */
export function createMemoryStore(config?: MemoryConfig): AdvancedMemoryStore {
  return new MemoryStoreImpl(config);
}

/**
 * 内存存储实现
 */
class MemoryStoreImpl implements AdvancedMemoryStore {
  private memories = new Map<string, Memory>();
  private config: MemoryConfig;

  constructor(config?: MemoryConfig) {
    this.config = config ?? {};
  }

  /**
   * 存储记忆
   */
  async store(memory: Memory): Promise<void> {
    this.memories.set(memory.id, {
      ...memory,
      timestamp: memory.timestamp ?? Date.now(),
    });

    // 检查存储限制
    if (this.config.limit && this.memories.size > this.config.limit) {
      // 删除最旧的记忆
      const oldest = Array.from(this.memories.values())
        .sort((a, b) => a.timestamp - b.timestamp)[0];
      if (oldest) {
        this.memories.delete(oldest.id);
      }
    }
  }

  /**
   * 批量存储
   */
  async storeBatch(memories: Memory[]): Promise<void> {
    for (const memory of memories) {
      await this.store(memory);
    }
  }

  /**
   * 检索记忆
   */
  async retrieve(id: string): Promise<Memory | undefined> {
    return this.memories.get(id);
  }

  /**
   * 搜索记忆
   */
  async search(query: MemoryQuery): Promise<MemorySearchResult[]> {
    let results = Array.from(this.memories.values());

    // 应用过滤器
    if (query.type) {
      results = results.filter((m) => m.type === query.type);
    }
    if (query.source) {
      results = results.filter((m) => m.source === query.source);
    }
    if (query.sessionId) {
      results = results.filter((m) => m.metadata?.sessionId === query.sessionId);
    }
    if (query.filters?.tags) {
      results = results.filter((m) =>
        query.filters!.tags!.some((tag) => m.metadata?.tags?.includes(tag))
      );
    }
    if (query.filters?.category) {
      results = results.filter((m) => m.metadata?.category === query.filters!.category);
    }

    // 简单文本匹配（生产环境应使用向量搜索）
    if (query.content) {
      const queryLower = query.content.toLowerCase();
      results = results.filter(
        (m) =>
          m.content.toLowerCase().includes(queryLower) ||
          m.metadata?.title?.toLowerCase().includes(queryLower)
      );
    }

    // 计算相关性分数
    const scored = results.map((memory) => ({
      memory,
      score: this._calculateScore(memory, query),
      relevance: this._calculateRelevance(memory, query),
    }));

    // 按分数排序
    scored.sort((a, b) => b.score - a.score);

    // 应用阈值和限制
    const threshold = query.threshold ?? 0;
    const limit = query.limit ?? 10;

    return scored.filter((r) => r.score >= threshold).slice(0, limit);
  }

  /**
   * 语义搜索（简化实现）
   */
  async semanticSearch(query: string, limit?: number): Promise<MemorySearchResult[]> {
    // 生产环境应使用向量嵌入
    return this.search({
      content: query,
      limit: limit ?? 10,
    });
  }

  /**
   * 全文搜索
   */
  async fullTextSearch(query: string, limit?: number): Promise<MemorySearchResult[]> {
    return this.search({
      content: query,
      limit: limit ?? 10,
    });
  }

  /**
   * 删除记忆
   */
  async delete(id: string): Promise<void> {
    this.memories.delete(id);
  }

  /**
   * 按会话删除
   */
  async deleteBySession(sessionId: string): Promise<void> {
    for (const [id, memory] of this.memories) {
      if (memory.metadata?.sessionId === sessionId) {
        this.memories.delete(id);
      }
    }
  }

  /**
   * 清空所有记忆
   */
  async clear(): Promise<void> {
    this.memories.clear();
  }

  /**
   * 获取记忆数量
   */
  async count(): Promise<number> {
    return this.memories.size;
  }

  /**
   * 获取统计信息
   */
  async getStats(): Promise<MemoryStats> {
    const memories = Array.from(this.memories.values());

    const byType: Record<MemoryType, number> = {
      episodic: 0,
      semantic: 0,
      procedural: 0,
    };

    const bySource: Record<MemorySource, number> = {
      conversation: 0,
      document: 0,
      system: 0,
      user: 0,
    };

    let oldestTimestamp: number | undefined;
    let newestTimestamp: number | undefined;

    for (const memory of memories) {
      byType[memory.type] = (byType[memory.type] ?? 0) + 1;
      bySource[memory.source] = (bySource[memory.source] ?? 0) + 1;

      if (!oldestTimestamp || memory.timestamp < oldestTimestamp) {
        oldestTimestamp = memory.timestamp;
      }
      if (!newestTimestamp || memory.timestamp > newestTimestamp) {
        newestTimestamp = memory.timestamp;
      }
    }

    return {
      totalCount: memories.length,
      byType,
      bySource,
      oldestTimestamp,
      newestTimestamp,
    };
  }

  /**
   * 计算搜索分数
   */
  private _calculateScore(memory: Memory, _query: MemoryQuery): number {
    let score = memory.score ?? 0;

    // 时间衰减（越新的记忆分数越高）
    const age = Date.now() - memory.timestamp;
    const timeDecay = Math.exp(-age / (24 * 60 * 60 * 1000)); // 24小时衰减
    score += timeDecay * 10;

    return score;
  }

  /**
   * 计算相关性
   */
  private _calculateRelevance(memory: Memory, query: MemoryQuery): number {
    if (!query.content) return 0;

    const content = memory.content.toLowerCase();
    const queryLower = query.content.toLowerCase();

    // 简单匹配
    if (content.includes(queryLower)) {
      return 0.8;
    }

    return 0.1;
  }
}
