/**
 * 技能缓存系统
 *
 * 提供技能匹配结果的缓存机制，提高性能
 * 支持内存缓存和持久化缓存
 */

import type { Skill, SkillMatch } from '../types'

export interface CacheEntry {
  key: string
  matches: SkillMatch[]
  timestamp: number
  ttl: number
  hitCount: number
}

export interface SkillCacheConfig {
  enabled: boolean
  maxSize: number // 最大缓存条目数
  defaultTTL: number // 默认过期时间（毫秒）
  persistent: boolean // 是否持久化到 localStorage
  storageKey: string // localStorage key
}

const DEFAULT_CONFIG: SkillCacheConfig = {
  enabled: true,
  maxSize: 100,
  defaultTTL: 5 * 60 * 1000, // 5分钟
  persistent: true,
  storageKey: 'chat-agent-skill-cache',
}

export class SkillCache {
  private cache = new Map<string, CacheEntry>()
  private config: SkillCacheConfig

  constructor(config?: Partial<SkillCacheConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config }

    if (this.config.enabled && this.config.persistent) {
      this.loadFromStorage()
    }
  }

  /**
   * 生成缓存键
   */
  private generateKey(userInput: string, availableSkills: Skill[]): string {
    const skillNames = availableSkills.map(s => s.name).sort().join(',')
    return `${userInput.trim().toLowerCase()}::${skillNames}`
  }

  /**
   * 获取缓存
   */
  get(userInput: string, availableSkills: Skill[]): SkillMatch[] | null {
    if (!this.config.enabled) return null

    const key = this.generateKey(userInput, availableSkills)
    const entry = this.cache.get(key)

    if (!entry) return null

    // 检查是否过期
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key)
      this.saveToStorage()
      return null
    }

    // 更新命中次数
    entry.hitCount++
    return entry.matches
  }

  /**
   * 设置缓存
   */
  set(userInput: string, availableSkills: Skill[], matches: SkillMatch[], ttl?: number): void {
    if (!this.config.enabled) return

    const key = this.generateKey(userInput, availableSkills)

    // 检查缓存是否已满
    if (this.cache.size >= this.config.maxSize && !this.cache.has(key)) {
      this.evictLRU()
    }

    const entry: CacheEntry = {
      key,
      matches,
      timestamp: Date.now(),
      ttl: ttl || this.config.defaultTTL,
      hitCount: 0,
    }

    this.cache.set(key, entry)

    if (this.config.persistent) {
      this.saveToStorage()
    }
  }

  /**
   * 清除缓存
   */
  clear(): void {
    this.cache.clear()
    if (this.config.persistent) {
      localStorage.removeItem(this.config.storageKey)
    }
  }

  /**
   * 获取缓存统计
   */
  getStats(): {
    size: number
    hitRate: number
    totalHits: number
    totalMisses: number
  } {
    let totalHits = 0
    let totalMisses = 0

    for (const entry of this.cache.values()) {
      totalHits += entry.hitCount
    }

    // 这里简化处理，实际应该记录 miss 次数
    totalMisses = this.cache.size

    const hitRate = totalHits + totalMisses > 0
      ? totalHits / (totalHits + totalMisses)
      : 0

    return {
      size: this.cache.size,
      hitRate,
      totalHits,
      totalMisses,
    }
  }

  /**
   * LRU 淘汰策略
   */
  private evictLRU(): void {
    let oldestKey: string | null = null
    let oldestTime = Infinity

    for (const [key, entry] of this.cache.entries()) {
      if (entry.timestamp < oldestTime) {
        oldestTime = entry.timestamp
        oldestKey = key
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey)
    }
  }

  /**
   * 从 localStorage 加载
   */
  private loadFromStorage(): void {
    try {
      const stored = localStorage.getItem(this.config.storageKey)
      if (stored) {
        const entries = JSON.parse(stored) as CacheEntry[]
        const now = Date.now()

        for (const entry of entries) {
          // 只加载未过期的条目
          if (now - entry.timestamp <= entry.ttl) {
            this.cache.set(entry.key, entry)
          }
        }
      }
    } catch (error) {
      console.warn('[SkillCache] Failed to load from storage:', error)
    }
  }

  /**
   * 保存到 localStorage
   */
  private saveToStorage(): void {
    try {
      const entries = Array.from(this.cache.values())
      localStorage.setItem(this.config.storageKey, JSON.stringify(entries))
    } catch (error) {
      console.warn('[SkillCache] Failed to save to storage:', error)
    }
  }

  /**
   * 清理过期条目
   */
  cleanup(): number {
    const now = Date.now()
    let cleaned = 0

    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key)
        cleaned++
      }
    }

    if (cleaned > 0 && this.config.persistent) {
      this.saveToStorage()
    }

    return cleaned
  }
}

// 全局缓存实例
let globalCache: SkillCache | null = null

export function createSkillCache(config?: Partial<SkillCacheConfig>): SkillCache {
  globalCache = new SkillCache(config)
  return globalCache
}

export function getSkillCache(): SkillCache | null {
  return globalCache
}

export function resetSkillCache(): void {
  globalCache?.clear()
  globalCache = null
}
