/**
 * Dynamic Skill Loader - On-demand Loading Strategy
 *
 * 动态技能加载器 - 按需加载执行策略
 *
 * 核心特性：
 * 1. 渐进式披露加载 (Progressive Disclosure)
 * 2. 预测性预加载 (Predictive Preloading)
 * 3. 懒加载与按需激活 (Lazy Loading & On-demand Activation)
 * 4. 智能缓存管理 (Intelligent Cache Management)
 * 5. 资源优化 (Resource Optimization)
 *
 * @module DynamicSkillLoader
 * @version 3.0.0
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { EventEmitter } from '../../utils/event-emitter.js';
import { Logger } from '../core/types.js';
import { SkillEntry } from '../core/openclaw-types.js';

// ============================================================================
// Dynamic Loader Types
// ============================================================================

/**
 * 加载级别
 */
export type DisclosureLevel = 'metadata' | 'instructions' | 'full';

/**
 * 动态加载配置
 */
export interface DynamicLoaderConfig {
  /** 工作区目录 */
  workspaceDir: string;
  /** 最大内存缓存 */
  maxMemoryCache?: number;
  /** 预加载阈值 */
  preloadThreshold?: number;
  /** 缓存 TTL (ms) */
  cacheTTL?: number;
  /** 日志器 */
  logger?: Logger;
}

/**
 * 加载的 Skill
 */
export interface LoadedSkillEntry {
  /** Skill 条目 */
  entry: SkillEntry;
  /** 加载级别 */
  level: DisclosureLevel;
  /** 加载时间 */
  loadedAt: Date;
  /** 最后访问时间 */
  lastAccessed: Date;
  /** 访问次数 */
  accessCount: number;
  /** 内容 */
  content?: string;
  /** 脚本 */
  scripts?: Map<string, string>;
  /** 引用 */
  references?: Map<string, string>;
}

/**
 * 预加载预测
 */
export interface PreloadPrediction {
  /** 预测的技能名称 */
  skillName: string;
  /** 置信度 */
  confidence: number;
  /** 预测原因 */
  reason: string;
}

// ============================================================================
// Dynamic Skill Loader
// ============================================================================

export class DynamicSkillLoader extends EventEmitter {
  private config: Required<DynamicLoaderConfig>;
  private logger: Logger;
  private cache: Map<string, LoadedSkillEntry> = new Map();
  private accessHistory: Array<{ skillName: string; timestamp: number; context: string }> = [];

  constructor(config: DynamicLoaderConfig) {
    super();
    this.config = {
      maxMemoryCache: 50,
      preloadThreshold: 0.7,
      cacheTTL: 3600000, // 1 hour
      logger: this.createDefaultLogger(),
      ...config,
    };
    this.logger = this.config.logger;
  }

  /**
   * 加载技能（按需）
   */
  async loadSkill(
    entry: SkillEntry,
    level: DisclosureLevel = 'metadata'
  ): Promise<LoadedSkillEntry> {
    const cacheKey = `${entry.name}:${level}`;

    // 检查缓存
    const cached = this.cache.get(cacheKey);
    if (cached && !this.isExpired(cached)) {
      cached.lastAccessed = new Date();
      cached.accessCount++;
      this.logger.debug(`Cache hit for skill: ${entry.name} (${level})`);
      return cached;
    }

    this.logger.info(`Loading skill: ${entry.name} (${level})`);

    // 根据级别加载
    let loadedEntry: LoadedSkillEntry;

    switch (level) {
      case 'metadata':
        loadedEntry = await this.loadMetadata(entry);
        break;
      case 'instructions':
        loadedEntry = await this.loadInstructions(entry);
        break;
      case 'full':
        loadedEntry = await this.loadFull(entry);
        break;
      default:
        throw new Error(`Unknown disclosure level: ${level}`);
    }

    // 缓存
    this.cache.set(cacheKey, loadedEntry);

    // 清理缓存
    this.evictIfNeeded();

    this.emit('skill:loaded', { name: entry.name, level });

    return loadedEntry;
  }

  /**
   * 预测性预加载
   */
  async predictAndPreload(
    currentContext: string,
    availableSkills: SkillEntry[]
  ): Promise<void> {
    const predictions = this.predictSkills(currentContext, availableSkills);

    for (const prediction of predictions) {
      if (prediction.confidence >= this.config.preloadThreshold) {
        const entry = availableSkills.find((e) => e.name === prediction.skillName);
        if (entry) {
          this.logger.debug(`Preloading skill: ${prediction.skillName} (${prediction.confidence})`);
          await this.loadSkill(entry, 'instructions');
        }
      }
    }
  }

  /**
   * 升级加载级别
   */
  async upgradeLevel(
    entry: SkillEntry,
    targetLevel: DisclosureLevel
  ): Promise<LoadedSkillEntry> {
    const currentLevel = this.getCurrentLevel(entry.name);

    if (this.levelToNumber(currentLevel) >= this.levelToNumber(targetLevel)) {
      return this.loadSkill(entry, currentLevel);
    }

    return this.loadSkill(entry, targetLevel);
  }

  /**
   * 获取当前加载级别
   */
  getCurrentLevel(skillName: string): DisclosureLevel {
    for (const level of ['full', 'instructions', 'metadata'] as DisclosureLevel[]) {
      const cacheKey = `${skillName}:${level}`;
      if (this.cache.has(cacheKey)) {
        return level;
      }
    }
    return 'metadata';
  }

  /**
   * 清除缓存
   */
  clearCache(skillName?: string): void {
    if (skillName) {
      for (const level of ['metadata', 'instructions', 'full'] as DisclosureLevel[]) {
        this.cache.delete(`${skillName}:${level}`);
      }
    } else {
      this.cache.clear();
    }
  }

  /**
   * 获取缓存统计
   */
  getCacheStats(): {
    totalCached: number;
    metadataCount: number;
    instructionsCount: number;
    fullCount: number;
    totalAccesses: number;
  } {
    let metadataCount = 0;
    let instructionsCount = 0;
    let fullCount = 0;
    let totalAccesses = 0;

    for (const entry of this.cache.values()) {
      switch (entry.level) {
        case 'metadata':
          metadataCount++;
          break;
        case 'instructions':
          instructionsCount++;
          break;
        case 'full':
          fullCount++;
          break;
      }
      totalAccesses += entry.accessCount;
    }

    return {
      totalCached: this.cache.size,
      metadataCount,
      instructionsCount,
      fullCount,
      totalAccesses,
    };
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  private async loadMetadata(entry: SkillEntry): Promise<LoadedSkillEntry> {
    return {
      entry,
      level: 'metadata',
      loadedAt: new Date(),
      lastAccessed: new Date(),
      accessCount: 1,
    };
  }

  private async loadInstructions(entry: SkillEntry): Promise<LoadedSkillEntry> {
    // 读取 SKILL.md 内容
    let content = '';
    try {
      content = fs.readFileSync(entry.filePath, 'utf-8');
    } catch (error) {
      this.logger.warn(`Failed to read skill file: ${entry.filePath}`);
    }

    return {
      entry,
      level: 'instructions',
      loadedAt: new Date(),
      lastAccessed: new Date(),
      accessCount: 1,
      content,
    };
  }

  private async loadFull(entry: SkillEntry): Promise<LoadedSkillEntry> {
    const instructionsEntry = await this.loadInstructions(entry);

    // 加载脚本
    const scripts = new Map<string, string>();
    const scriptsDir = path.join(path.dirname(entry.filePath), 'scripts');
    if (fs.existsSync(scriptsDir)) {
      const files = fs.readdirSync(scriptsDir);
      for (const file of files) {
        const filePath = path.join(scriptsDir, file);
        try {
          const content = fs.readFileSync(filePath, 'utf-8');
          scripts.set(file, content);
        } catch {
          // 忽略读取失败的文件
        }
      }
    }

    // 加载引用
    const references = new Map<string, string>();
    const refsDir = path.join(path.dirname(entry.filePath), 'references');
    if (fs.existsSync(refsDir)) {
      const files = fs.readdirSync(refsDir);
      for (const file of files) {
        const filePath = path.join(refsDir, file);
        try {
          const content = fs.readFileSync(filePath, 'utf-8');
          references.set(file, content);
        } catch {
          // 忽略读取失败的文件
        }
      }
    }

    return {
      ...instructionsEntry,
      level: 'full',
      scripts,
      references,
    };
  }

  private predictSkills(
    context: string,
    availableSkills: SkillEntry[]
  ): PreloadPrediction[] {
    const predictions: PreloadPrediction[] = [];
    const contextLower = context.toLowerCase();

    for (const entry of availableSkills) {
      let confidence = 0;
      let reason = '';

      // 基于名称匹配
      if (contextLower.includes(entry.name.toLowerCase())) {
        confidence += 0.5;
        reason = 'Name match';
      }

      // 基于描述匹配
      if (entry.description.toLowerCase().split(' ').some((word) => contextLower.includes(word))) {
        confidence += 0.3;
        reason = reason || 'Description match';
      }

      // 基于历史使用
      const recentUses = this.accessHistory.filter(
        (h) => h.skillName === entry.name && Date.now() - h.timestamp < 3600000
      ).length;
      if (recentUses > 0) {
        confidence += Math.min(recentUses * 0.1, 0.2);
        reason = reason || 'Recent usage';
      }

      if (confidence > 0) {
        predictions.push({
          skillName: entry.name,
          confidence,
          reason: reason || 'Context match',
        });
      }
    }

    // 按置信度排序
    return predictions.sort((a, b) => b.confidence - a.confidence);
  }

  private isExpired(entry: LoadedSkillEntry): boolean {
    return Date.now() - entry.loadedAt.getTime() > this.config.cacheTTL;
  }

  private evictIfNeeded(): void {
    if (this.cache.size <= this.config.maxMemoryCache) {
      return;
    }

    // 按访问次数和最后访问时间排序，移除最少使用的
    const entries = Array.from(this.cache.entries());
    entries.sort((a, b) => {
      const scoreA = a[1].accessCount * 10 + a[1].lastAccessed.getTime();
      const scoreB = b[1].accessCount * 10 + b[1].lastAccessed.getTime();
      return scoreA - scoreB;
    });

    // 移除前 20%
    const toRemove = Math.ceil(this.cache.size * 0.2);
    for (let i = 0; i < toRemove && i < entries.length; i++) {
      this.cache.delete(entries[i][0]);
    }

    this.logger.debug(`Evicted ${toRemove} cached skills`);
  }

  private levelToNumber(level: DisclosureLevel): number {
    switch (level) {
      case 'metadata':
        return 1;
      case 'instructions':
        return 2;
      case 'full':
        return 3;
      default:
        return 0;
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

/**
 * 创建动态加载器
 */
export function createDynamicLoader(config: DynamicLoaderConfig): DynamicSkillLoader {
  return new DynamicSkillLoader(config);
}
