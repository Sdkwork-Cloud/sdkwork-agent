/**
 * Skill Cache - Skill 缓存系统
 *
 * 缓存 Skill 解析结果和资格检查结果
 *
 * @module SkillCache
 * @version 5.0.0
 */

import * as crypto from 'crypto';
import type { SkillEntry, EligibilityResult } from './types.js';

// ============================================================================
// Cache Entry
// ============================================================================

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

// ============================================================================
// Skill Cache
// ============================================================================

export class SkillCache {
  private skillEntries = new Map<string, CacheEntry<SkillEntry>>();
  private eligibilityResults = new Map<string, CacheEntry<EligibilityResult>>();
  private snapshots = new Map<string, CacheEntry<unknown>>();

  constructor(
    private defaultTTL: number = 5 * 60 * 1000, // 5 minutes
    private maxSize: number = 1000
  ) {}

  // ============================================================================
  // Skill Entry Cache
  // ============================================================================

  /**
   * 缓存 Skill Entry
   */
  setSkillEntry(key: string, entry: SkillEntry, ttl?: number): void {
    this.evictIfNeeded();
    this.skillEntries.set(key, {
      data: entry,
      timestamp: Date.now(),
      ttl: ttl ?? this.defaultTTL,
    });
  }

  /**
   * 获取缓存的 Skill Entry
   */
  getSkillEntry(key: string): SkillEntry | undefined {
    const entry = this.skillEntries.get(key);
    if (!entry) return undefined;

    if (this.isExpired(entry)) {
      this.skillEntries.delete(key);
      return undefined;
    }

    return entry.data;
  }

  /**
   * 检查 Skill Entry 是否缓存
   */
  hasSkillEntry(key: string): boolean {
    return this.getSkillEntry(key) !== undefined;
  }

  /**
   * 删除 Skill Entry 缓存
   */
  deleteSkillEntry(key: string): void {
    this.skillEntries.delete(key);
  }

  // ============================================================================
  // Eligibility Cache
  // ============================================================================

  /**
   * 缓存资格检查结果
   */
  setEligibility(skillId: string, contextHash: string, result: EligibilityResult, ttl?: number): void {
    this.evictIfNeeded();
    const key = `${skillId}:${contextHash}`;
    this.eligibilityResults.set(key, {
      data: result,
      timestamp: Date.now(),
      ttl: ttl ?? this.defaultTTL,
    });
  }

  /**
   * 获取缓存的资格检查结果
   */
  getEligibility(skillId: string, contextHash: string): EligibilityResult | undefined {
    const key = `${skillId}:${contextHash}`;
    const entry = this.eligibilityResults.get(key);
    if (!entry) return undefined;

    if (this.isExpired(entry)) {
      this.eligibilityResults.delete(key);
      return undefined;
    }

    return entry.data;
  }

  /**
   * 删除资格检查缓存
   */
  deleteEligibility(skillId: string): void {
    for (const key of this.eligibilityResults.keys()) {
      if (key.startsWith(`${skillId}:`)) {
        this.eligibilityResults.delete(key);
      }
    }
  }

  // ============================================================================
  // Snapshot Cache
  // ============================================================================

  /**
   * 缓存快照
   */
  setSnapshot(key: string, snapshot: unknown, ttl?: number): void {
    this.evictIfNeeded();
    this.snapshots.set(key, {
      data: snapshot,
      timestamp: Date.now(),
      ttl: ttl ?? this.defaultTTL,
    });
  }

  /**
   * 获取缓存的快照
   */
  getSnapshot(key: string): unknown | undefined {
    const entry = this.snapshots.get(key);
    if (!entry) return undefined;

    if (this.isExpired(entry)) {
      this.snapshots.delete(key);
      return undefined;
    }

    return entry.data;
  }

  // ============================================================================
  // Cache Management
  // ============================================================================

  /**
   * 清空所有缓存
   */
  clear(): void {
    this.skillEntries.clear();
    this.eligibilityResults.clear();
    this.snapshots.clear();
  }

  /**
   * 清空过期的缓存
   */
  clearExpired(): void {
    const now = Date.now();

    for (const [key, entry] of this.skillEntries) {
      if (this.isExpired(entry, now)) {
        this.skillEntries.delete(key);
      }
    }

    for (const [key, entry] of this.eligibilityResults) {
      if (this.isExpired(entry, now)) {
        this.eligibilityResults.delete(key);
      }
    }

    for (const [key, entry] of this.snapshots) {
      if (this.isExpired(entry, now)) {
        this.snapshots.delete(key);
      }
    }
  }

  /**
   * 获取缓存统计
   */
  getStats(): {
    skillEntries: number;
    eligibilityResults: number;
    snapshots: number;
    total: number;
  } {
    return {
      skillEntries: this.skillEntries.size,
      eligibilityResults: this.eligibilityResults.size,
      snapshots: this.snapshots.size,
      total: this.skillEntries.size + this.eligibilityResults.size + this.snapshots.size,
    };
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  /**
   * 检查缓存是否过期
   */
  private isExpired<T>(entry: CacheEntry<T>, now?: number): boolean {
    const currentTime = now ?? Date.now();
    return currentTime - entry.timestamp > entry.ttl;
  }

  /**
   * 如果需要，淘汰最旧的缓存
   */
  private evictIfNeeded(): void {
    const total = this.skillEntries.size + this.eligibilityResults.size + this.snapshots.size;
    if (total < this.maxSize) return;

    // 清理过期项
    this.clearExpired();

    // 如果还是超过限制，删除最旧的
    const remaining = this.skillEntries.size + this.eligibilityResults.size + this.snapshots.size;
    if (remaining >= this.maxSize) {
      this.evictOldest();
    }
  }

  /**
   * 淘汰最旧的缓存项
   */
  private evictOldest(): void {
    interface OldestEntry {
      map: Map<string, CacheEntry<unknown>>;
      key: string;
    }

    let oldestMap: Map<string, CacheEntry<unknown>> | undefined;
    let oldestKey: string | undefined;
    let oldestTime = Infinity;

    const checkMap = (map: Map<string, CacheEntry<unknown>>) => {
      for (const [key, entry] of map) {
        if (entry.timestamp < oldestTime) {
          oldestTime = entry.timestamp;
          oldestMap = map;
          oldestKey = key;
        }
      }
    };

    checkMap(this.skillEntries as Map<string, CacheEntry<unknown>>);
    checkMap(this.eligibilityResults as Map<string, CacheEntry<unknown>>);
    checkMap(this.snapshots);

    if (oldestMap && oldestKey) {
      oldestMap.delete(oldestKey);
    }
  }
}

// ============================================================================
// Factory
// ============================================================================

export function createSkillCache(defaultTTL?: number, maxSize?: number): SkillCache {
  return new SkillCache(defaultTTL, maxSize);
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * 计算上下文哈希
 */
export function hashContext(context: Record<string, unknown>): string {
  const str = JSON.stringify(context, Object.keys(context).sort());
  return crypto.createHash('md5').update(str).digest('hex').slice(0, 16);
}

/**
 * 计算文件内容哈希
 */
export function hashContent(content: string): string {
  return crypto.createHash('md5').update(content).digest('hex').slice(0, 16);
}
