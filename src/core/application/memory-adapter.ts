/**
 * Memory Adapter - 内存存储适配器
 *
 * 将 MemoryStore 适配为 SkillMemoryAPI
 * 解决接口不兼容问题
 *
 * @application Memory
 * @version 1.0.0
 */

import type { MemoryStore, Memory, MemoryQuery } from '../domain/memory.js';
import type { SkillMemoryAPI } from '../domain/skill.js';

/**
 * MemoryStore 适配器
 * 实现 SkillMemoryAPI 接口
 */
export class MemoryStoreAdapter implements SkillMemoryAPI {
  constructor(private store: MemoryStore) {}

  /**
   * 获取值
   */
  async get(key: string): Promise<unknown> {
    const memory = await this.store.retrieve(key);
    return memory?.content ?? null;
  }

  /**
   * 设置值
   */
  async set(key: string, value: unknown): Promise<void> {
    const memory: Memory = {
      id: key,
      content: typeof value === 'string' ? value : JSON.stringify(value),
      type: 'episodic',
      source: 'system',
      timestamp: Date.now(),
    };
    await this.store.store(memory);
  }

  /**
   * 删除值
   */
  async delete(key: string): Promise<void> {
    await this.store.delete(key);
  }

  /**
   * 搜索
   */
  async search(query: string, limit?: number): Promise<unknown[]> {
    const queryObj: MemoryQuery = {
      content: query,
      limit: limit ?? 10,
    };
    const results = await this.store.search(queryObj);
    return results.map(r => r.memory.content);
  }

  /**
   * 清空
   */
  async clear(): Promise<void> {
    await this.store.clear();
  }
}

/**
 * 创建内存适配器
 */
export function createMemoryAdapter(store: MemoryStore): SkillMemoryAPI {
  return new MemoryStoreAdapter(store);
}
