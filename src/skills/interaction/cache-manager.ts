/**
 * Cache Manager
 *
 * 统一的缓存管理系统，提供：
 * 1. 多级缓存架构（内存 + 本地存储）
 * 2. LRU 淘汰策略
 * 3. TTL 过期机制
 * 4. 缓存统计和监控
 * 5. 持久化支持
 *
 * @module CacheManager
 * @version 1.0.0
 */

import { EventEmitter } from 'events';
import * as fs from 'fs/promises';
import * as path from 'path';

/** 缓存条目 */
interface CacheEntry<V> {
  value: V;
  timestamp: number;
  accessCount: number;
  lastAccessed: number;
  ttl?: number;
  size: number;
}

/** 缓存配置 */
export interface CacheConfig {
  /** 最大条目数 */
  maxSize?: number;
  /** 默认 TTL (ms) */
  defaultTTL?: number;
  /** 是否启用持久化 */
  enablePersistence?: boolean;
  /** 持久化路径 */
  persistencePath?: string;
  /** 持久化间隔 (ms) */
  persistenceInterval?: number;
  /** 是否启用压缩 */
  enableCompression?: boolean;
  /** 缓存名称 */
  name?: string;
}

/** 缓存统计 */
export interface CacheStats {
  /** 当前条目数 */
  size: number;
  /** 最大条目数 */
  maxSize: number;
  /** 命中次数 */
  hits: number;
  /** 未命中次数 */
  misses: number;
  /** 命中率 */
  hitRate: number;
  /** 总访问次数 */
  totalAccess: number;
  /** 平均条目大小 (bytes) */
  avgEntrySize: number;
  /** 总内存占用 (bytes) */
  totalMemory: number;
  /** 过期条目数 */
  expiredCount: number;
  /** 淘汰条目数 */
  evictedCount: number;
}

/**
 * 缓存管理器
 *
 * 通用的缓存实现，支持多种数据类型
 */
export class CacheManager<K extends string | number, V> extends EventEmitter {
  private cache: Map<K, CacheEntry<V>> = new Map();
  private config: Required<CacheConfig>;
  private stats = {
    hits: 0,
    misses: 0,
    expiredCount: 0,
    evictedCount: 0,
  };
  private persistenceTimer?: NodeJS.Timeout;
  private isPersisting = false;

  constructor(config: CacheConfig = {}) {
    super();
    this.config = {
      maxSize: 1000,
      defaultTTL: 5 * 60 * 1000, // 5分钟
      enablePersistence: false,
      persistencePath: './cache',
      persistenceInterval: 60 * 1000, // 1分钟
      enableCompression: false,
      name: 'default',
      ...config,
    };

    if (this.config.enablePersistence) {
      this.startPersistence();
    }
  }

  /**
   * 获取缓存值
   */
  get(key: K): V | undefined {
    const entry = this.cache.get(key);

    if (!entry) {
      this.stats.misses++;
      this.emit('miss', key);
      return undefined;
    }

    // 检查是否过期
    if (this.isExpired(entry)) {
      this.cache.delete(key);
      this.stats.expiredCount++;
      this.stats.misses++;
      this.emit('expired', key);
      return undefined;
    }

    // 更新访问统计
    entry.accessCount++;
    entry.lastAccessed = Date.now();
    this.stats.hits++;
    this.emit('hit', key);

    return entry.value;
  }

  /**
   * 设置缓存值
   */
  set(key: K, value: V, ttl?: number): void {
    const size = this.estimateSize(value);

    // 如果缓存已满，淘汰最旧的条目
    while (this.cache.size >= this.config.maxSize) {
      this.evictLRU();
    }

    const entry: CacheEntry<V> = {
      value,
      timestamp: Date.now(),
      accessCount: 0,
      lastAccessed: Date.now(),
      ttl: ttl ?? this.config.defaultTTL,
      size,
    };

    this.cache.set(key, entry);
    this.emit('set', key, value);
  }

  /**
   * 删除缓存值
   */
  delete(key: K): boolean {
    const existed = this.cache.delete(key);
    if (existed) {
      this.emit('delete', key);
    }
    return existed;
  }

  /**
   * 检查缓存是否存在
   */
  has(key: K): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;
    if (this.isExpired(entry)) {
      this.cache.delete(key);
      this.stats.expiredCount++;
      return false;
    }
    return true;
  }

  /**
   * 获取或设置缓存值
   */
  async getOrSet(key: K, factory: () => Promise<V>, ttl?: number): Promise<V> {
    const cached = this.get(key);
    if (cached !== undefined) {
      return cached;
    }

    const value = await factory();
    this.set(key, value, ttl);
    return value;
  }

  /**
   * 批量获取
   */
  getMany(keys: K[]): Map<K, V> {
    const result = new Map<K, V>();
    for (const key of keys) {
      const value = this.get(key);
      if (value !== undefined) {
        result.set(key, value);
      }
    }
    return result;
  }

  /**
   * 批量设置
   */
  setMany(entries: Array<{ key: K; value: V; ttl?: number }>): void {
    for (const { key, value, ttl } of entries) {
      this.set(key, value, ttl);
    }
  }

  /**
   * 获取缓存统计
   */
  getStats(): CacheStats {
    let totalMemory = 0;
    let totalAccess = 0;

    for (const entry of this.cache.values()) {
      totalMemory += entry.size;
      totalAccess += entry.accessCount;
    }

    const total = this.stats.hits + this.stats.misses;

    return {
      size: this.cache.size,
      maxSize: this.config.maxSize,
      hits: this.stats.hits,
      misses: this.stats.misses,
      hitRate: total > 0 ? this.stats.hits / total : 0,
      totalAccess,
      avgEntrySize: this.cache.size > 0 ? totalMemory / this.cache.size : 0,
      totalMemory,
      expiredCount: this.stats.expiredCount,
      evictedCount: this.stats.evictedCount,
    };
  }

  /**
   * 清理过期条目
   */
  cleanup(): number {
    const now = Date.now();
    const toDelete: K[] = [];

    for (const [key, entry] of this.cache) {
      if (this.isExpired(entry, now)) {
        toDelete.push(key);
      }
    }

    for (const key of toDelete) {
      this.cache.delete(key);
    }

    this.stats.expiredCount += toDelete.length;
    this.emit('cleanup', toDelete.length);

    return toDelete.length;
  }

  /**
   * 清空缓存
   */
  clear(): void {
    this.cache.clear();
    this.stats = {
      hits: 0,
      misses: 0,
      expiredCount: 0,
      evictedCount: 0,
    };
    this.emit('clear');
  }

  /**
   * 获取所有键
   */
  keys(): IterableIterator<K> {
    return this.cache.keys();
  }

  /**
   * 获取缓存大小
   */
  size(): number {
    return this.cache.size;
  }

  /**
   * 持久化缓存到磁盘
   */
  async persist(): Promise<void> {
    if (!this.config.enablePersistence || this.isPersisting) return;

    this.isPersisting = true;
    try {
      const data = {
        entries: Array.from(this.cache.entries()).map(([key, entry]) => ({
          key,
          value: entry.value,
          timestamp: entry.timestamp,
          accessCount: entry.accessCount,
          lastAccessed: entry.lastAccessed,
          ttl: entry.ttl,
        })),
        stats: this.stats,
      };

      const filePath = path.join(
        this.config.persistencePath,
        `${this.config.name}.json`
      );

      // 确保目录存在
      await fs.mkdir(this.config.persistencePath, { recursive: true });

      // 写入文件
      await fs.writeFile(filePath, JSON.stringify(data, null, 2));
      this.emit('persisted', this.cache.size);
    } catch (error) {
      this.emit('persistError', error);
    } finally {
      this.isPersisting = false;
    }
  }

  /**
   * 从磁盘恢复缓存
   */
  async restore(): Promise<void> {
    if (!this.config.enablePersistence) return;

    try {
      const filePath = path.join(
        this.config.persistencePath,
        `${this.config.name}.json`
      );

      const data = await fs.readFile(filePath, 'utf-8');
      const parsed = JSON.parse(data);

      this.cache.clear();
      for (const item of parsed.entries) {
        const entry: CacheEntry<V> = {
          value: item.value,
          timestamp: item.timestamp,
          accessCount: item.accessCount,
          lastAccessed: item.lastAccessed,
          ttl: item.ttl,
          size: this.estimateSize(item.value),
        };

        // 只恢复未过期的条目
        if (!this.isExpired(entry)) {
          this.cache.set(item.key, entry);
        }
      }

      this.stats = parsed.stats;
      this.emit('restored', this.cache.size);
    } catch (error) {
      // 文件不存在或解析失败，忽略
      this.emit('restoreError', error);
    }
  }

  /**
   * 销毁缓存管理器
   */
  async destroy(): Promise<void> {
    this.stopPersistence();
    if (this.config.enablePersistence) {
      await this.persist();
    }
    this.clear();
    this.removeAllListeners();
  }

  /**
   * 检查条目是否过期
   */
  private isExpired(entry: CacheEntry<V>, now = Date.now()): boolean {
    if (!entry.ttl) return false;
    return now - entry.timestamp > entry.ttl;
  }

  /**
   * LRU 淘汰
   */
  private evictLRU(): void {
    let oldestKey: K | undefined;
    let oldestTime = Infinity;

    for (const [key, entry] of this.cache) {
      if (entry.lastAccessed < oldestTime) {
        oldestTime = entry.lastAccessed;
        oldestKey = key;
      }
    }

    if (oldestKey !== undefined) {
      this.cache.delete(oldestKey);
      this.stats.evictedCount++;
      this.emit('evict', oldestKey);
    }
  }

  /**
   * 估算值的大小（bytes）
   */
  private estimateSize(value: V): number {
    try {
      const str = JSON.stringify(value);
      return Buffer.byteLength(str, 'utf8');
    } catch {
      return 1024; // 默认值
    }
  }

  /**
   * 启动持久化定时器
   */
  private startPersistence(): void {
    this.persistenceTimer = setInterval(() => {
      this.persist().catch(() => {});
    }, this.config.persistenceInterval);
  }

  /**
   * 停止持久化定时器
   */
  private stopPersistence(): void {
    if (this.persistenceTimer) {
      clearInterval(this.persistenceTimer);
      this.persistenceTimer = undefined;
    }
  }
}

/**
 * 创建缓存管理器
 */
export function createCache<K extends string | number, V>(
  config?: CacheConfig
): CacheManager<K, V> {
  return new CacheManager<K, V>(config);
}

// Types are exported from index.ts
