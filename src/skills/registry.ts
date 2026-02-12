/**
 * Skill Registry - 技能注册表
 *
 * 统一的 Skill 注册表，整合加载、资格检查、安装、缓存等功能
 *
 * @module SkillRegistry
 * @version 5.0.0
 */

import type {
  Skill,
  SkillId,
  SkillEntry,
  SkillResult,
  SkillContext,
  SkillsConfig,
  SkillExecutionOptions,
  EligibilityContext,
  LoadSkillOptions,
} from './types.js';
import { SkillLoader } from './loader.js';
import { SkillEligibilityChecker } from './eligibility.js';
import { SkillInstaller } from './installer.js';
import { SkillWatcher } from './watcher.js';
import { SkillSecurityScanner } from './security.js';
import { SkillCache, hashContext } from './cache.js';
import { SkillConfigManager } from './config.js';

// ============================================================================
// Skill Registry
// ============================================================================

export interface SkillIndex {
  byName: Map<string, SkillId>;
  byCategory: Map<string, Set<SkillId>>;
  byTag: Map<string, Set<SkillId>>;
}

export class SkillRegistry {
  private entries = new Map<SkillId, SkillEntry>();
  private nameToId = new Map<string, SkillId>();
  private loader: SkillLoader;
  private eligibilityChecker: SkillEligibilityChecker;
  private installer: SkillInstaller;
  private watcher?: SkillWatcher;
  private securityScanner: SkillSecurityScanner;
  private cache: SkillCache;
  private configManager: SkillConfigManager;
  private index: SkillIndex = {
    byName: new Map(),
    byCategory: new Map(),
    byTag: new Map(),
  };
  private accessStats = new Map<SkillId, { lastAccessed: Date; accessCount: number }>();

  constructor(
    private config?: SkillsConfig,
    private logger?: {
      debug: (msg: string, meta?: Record<string, unknown>) => void;
      info: (msg: string, meta?: Record<string, unknown>) => void;
      warn: (msg: string, meta?: Record<string, unknown>) => void;
      error: (msg: string, meta?: Record<string, unknown>, err?: Error) => void;
    }
  ) {
    this.loader = new SkillLoader(config, logger);
    this.eligibilityChecker = new SkillEligibilityChecker(config);
    this.installer = new SkillInstaller(config, logger);
    this.securityScanner = new SkillSecurityScanner();
    this.cache = new SkillCache();
    this.configManager = new SkillConfigManager();
  }

  // ============================================================================
  // Registration
  // ============================================================================

  /**
   * 注册 Skill
   */
  register(skill: Skill): void {
    const entry = this.createSkillEntry(skill);
    this.entries.set(skill.id, entry);
    this.nameToId.set(skill.name, skill.id);
    
    this.updateIndex(skill);
    this.accessStats.set(skill.id, { lastAccessed: new Date(), accessCount: 0 });
    
    this.cache.deleteSkillEntry(skill.id);
    this.cache.deleteEligibility(skill.id);
    
    this.logger?.info(`[SkillRegistry] Registered: ${skill.name}`);
  }

  unregister(skillId: SkillId): void {
    const entry = this.entries.get(skillId);
    if (entry) {
      this.nameToId.delete(entry.skill.name);
      this.entries.delete(skillId);
      this.removeFromIndex(entry.skill);
      this.accessStats.delete(skillId);
      
      this.cache.deleteSkillEntry(skillId);
      this.cache.deleteEligibility(skillId);
      
      this.logger?.info(`[SkillRegistry] Unregistered: ${entry.skill.name}`);
    }
  }

  /**
   * 批量注册
   */
  registerMany(skills: Skill[]): void {
    for (const skill of skills) {
      this.register(skill);
    }
  }

  // ============================================================================
  // Retrieval
  // ============================================================================

  get(skillId: SkillId): Skill | undefined {
    const cached = this.cache.getSkillEntry(skillId);
    if (cached) {
      this.updateAccessStats(skillId);
      return cached.skill;
    }
    
    const entry = this.entries.get(skillId);
    if (entry) {
      this.cache.setSkillEntry(skillId, entry);
      this.updateAccessStats(skillId);
      return entry.skill;
    }
    return undefined;
  }

  has(skillId: SkillId): boolean {
    return this.entries.has(skillId);
  }

  getByName(name: string): Skill | undefined {
    const id = this.nameToId.get(name);
    return id ? this.get(id) : undefined;
  }

  /**
   * 获取 SkillEntry
   */
  getEntry(skillId: SkillId): SkillEntry | undefined {
    // 先检查缓存
    const cached = this.cache.getSkillEntry(skillId);
    if (cached) {
      return cached;
    }
    
    const entry = this.entries.get(skillId);
    if (entry) {
      // 缓存结果
      this.cache.setSkillEntry(skillId, entry);
    }
    return entry;
  }

  /**
   * 列出所有 Skill
   */
  list(): Skill[] {
    return Array.from(this.entries.values()).map(e => e.skill);
  }

  /**
   * 列出所有 Entry
   */
  listEntries(): SkillEntry[] {
    return Array.from(this.entries.values());
  }

  /**
   * 搜索 Skill
   */
  search(query: string): Skill[] {
    const lowerQuery = query.toLowerCase();
    return this.list().filter(
      skill =>
        skill.name.toLowerCase().includes(lowerQuery) ||
        skill.description.toLowerCase().includes(lowerQuery) ||
        skill.metadata?.tags?.some(tag => tag.toLowerCase().includes(lowerQuery))
    );
  }

  getByCategory(category: string): Skill[] {
    const skillIds = this.index.byCategory.get(category);
    if (!skillIds) return [];
    
    return Array.from(skillIds)
      .map(id => this.entries.get(id)?.skill)
      .filter((skill): skill is Skill => skill !== undefined);
  }

  getByTag(tag: string): Skill[] {
    const skillIds = this.index.byTag.get(tag);
    if (!skillIds) return [];
    
    return Array.from(skillIds)
      .map(id => this.entries.get(id)?.skill)
      .filter((skill): skill is Skill => skill !== undefined);
  }

  getStats(): {
    totalSkills: number;
    totalCategories: number;
    totalTags: number;
    mostAccessed: Array<{ skillId: SkillId; accessCount: number }>;
  } {
    const sortedByAccess = Array.from(this.accessStats.entries())
      .sort((a, b) => b[1].accessCount - a[1].accessCount)
      .slice(0, 5)
      .map(([skillId, stats]) => ({ skillId, accessCount: stats.accessCount }));

    return {
      totalSkills: this.entries.size,
      totalCategories: this.index.byCategory.size,
      totalTags: this.index.byTag.size,
      mostAccessed: sortedByAccess,
    };
  }

  // ============================================================================
  // Execution
  // ============================================================================

  /**
   * 执行 Skill
   */
  async execute(
    skillId: SkillId,
    input: unknown,
    context: SkillContext,
    options: SkillExecutionOptions = {}
  ): Promise<SkillResult> {
    const entry = this.entries.get(skillId);
    if (!entry) {
      return {
        success: false,
        error: {
          code: 'SKILL_NOT_FOUND',
          message: `Skill not found: ${skillId}`,
          skillId,
          recoverable: false,
        },
      };
    }

    // 检查资格
    const eligibility = this.checkEligibility(skillId);
    if (!eligibility.eligible) {
      return {
        success: false,
        error: {
          code: 'SKILL_NOT_ELIGIBLE',
          message: eligibility.reason || 'Skill is not eligible',
          skillId,
          recoverable: false,
        },
      };
    }

    const { timeout = 60000, retries = 0, retryDelay = 1000 } = options;
    let lastError: Error | undefined;

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const startTime = Date.now();

        // 检查中止信号
        if (context.signal?.aborted) {
          return {
            success: false,
            error: {
              code: 'SKILL_ABORTED',
              message: 'Skill execution was aborted',
              skillId,
              recoverable: false,
            },
            metadata: {
              executionId: context.executionId,
              skillId,
              skillName: entry.skill.name,
              startTime,
              endTime: Date.now(),
              duration: 0,
            },
          };
        }

        const executePromise = entry.skill.execute(input, context);
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error('Skill execution timeout')), timeout);
        });

        const result = await Promise.race([executePromise, timeoutPromise]);

        return {
          ...result,
          metadata: {
            ...result.metadata,
            executionId: context.executionId,
            skillId,
            skillName: entry.skill.name,
            startTime,
            endTime: Date.now(),
            duration: Date.now() - startTime,
          },
        };
      } catch (error) {
        lastError = error as Error;

        if (attempt < retries) {
          context.logger.warn(
            `[Skill:${entry.skill.name}] Execution failed, retrying (${attempt + 1}/${retries})`,
            { error: lastError.message }
          );
          await this.delay(retryDelay * (attempt + 1));
        }
      }
    }

    return {
      success: false,
      error: {
        code: 'SKILL_EXECUTION_FAILED',
        message: lastError?.message || 'Unknown error',
        skillId,
        recoverable: false,
      },
      metadata: {
        executionId: context.executionId,
        skillId,
        skillName: entry.skill.name,
        startTime: Date.now(),
        endTime: Date.now(),
        duration: 0,
      },
    };
  }

  /**
   * 流式执行 Skill
   */
  async *executeStream(
    skillId: SkillId,
    input: unknown,
    context: SkillContext
  ): AsyncGenerator<unknown, SkillResult, unknown> {
    const entry = this.entries.get(skillId);
    if (!entry) {
      return {
        success: false,
        error: {
          code: 'SKILL_NOT_FOUND',
          message: `Skill not found: ${skillId}`,
          skillId,
          recoverable: false,
        },
      };
    }

    if (!entry.skill.executeStream) {
      // 如果没有流式执行方法，退化为普通执行
      const result = await this.execute(skillId, input, context);
      return result;
    }

    const startTime = Date.now();
    
    try {
      for await (const chunk of entry.skill.executeStream(input, context)) {
        // 检查中止信号
        if (context.signal?.aborted) {
          return {
            success: false,
            error: {
              code: 'SKILL_ABORTED',
              message: 'Skill execution was aborted',
              skillId,
              recoverable: false,
            },
            metadata: {
              executionId: context.executionId,
              skillId,
              skillName: entry.skill.name,
              startTime,
              endTime: Date.now(),
              duration: Date.now() - startTime,
            },
          };
        }
        
        yield chunk;
      }

      return {
        success: true,
        metadata: {
          executionId: context.executionId,
          skillId,
          skillName: entry.skill.name,
          startTime,
          endTime: Date.now(),
          duration: Date.now() - startTime,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'SKILL_EXECUTION_FAILED',
          message: (error as Error).message || 'Unknown error',
          skillId,
          recoverable: false,
        },
        metadata: {
          executionId: context.executionId,
          skillId,
          skillName: entry.skill.name,
          startTime,
          endTime: Date.now(),
          duration: Date.now() - startTime,
        },
      };
    }
  }

  // ============================================================================
  // Loading
  // ============================================================================

  /**
   * 从工作区加载 Skill
   */
  async loadFromWorkspace(workspaceDir: string, options?: LoadSkillOptions): Promise<void> {
    const entries = await this.loader.loadFromWorkspace(workspaceDir, options);

    for (const entry of entries) {
      this.entries.set(entry.skill.id, entry);
      this.nameToId.set(entry.skill.name, entry.skill.id);
      // 缓存新加载的 entry
      this.cache.setSkillEntry(entry.skill.id, entry);
    }

    this.logger?.info(`[SkillRegistry] Loaded ${entries.length} skills from workspace`);
  }

  /**
   * 从目录加载 Skill
   */
  async loadFromDirectory(dir: string, source: 'openclaw-extra' | 'openclaw-bundled' | 'openclaw-managed' | 'openclaw-workspace' | 'openclaw-plugin'): Promise<void> {
    const skills = await this.loader.loadFromDirectory(dir, source);

    for (const skill of skills) {
      const entry = this.createSkillEntry(skill);
      this.entries.set(skill.id, entry);
      this.nameToId.set(skill.name, skill.id);
      // 缓存新加载的 entry
      this.cache.setSkillEntry(skill.id, entry);
    }

    this.logger?.info(`[SkillRegistry] Loaded ${skills.length} skills from ${dir}`);
  }

  // ============================================================================
  // Eligibility
  // ============================================================================

  /**
   * 检查 Skill 资格
   */
  checkEligibility(skillId: SkillId, context?: Partial<EligibilityContext>) {
    const entry = this.entries.get(skillId);
    if (!entry) {
      return { eligible: false, reason: 'Skill not found' };
    }

    // 计算上下文哈希用于缓存
    const contextHash = context ? hashContext(context as Record<string, unknown>) : 'default';
    
    // 检查缓存
    const cached = this.cache.getEligibility(skillId, contextHash);
    if (cached) {
      return cached;
    }

    const result = this.eligibilityChecker.check(entry, context);
    
    // 缓存结果
    this.cache.setEligibility(skillId, contextHash, result);
    
    return result;
  }

  /**
   * 过滤符合条件的 Skill
   */
  filterEligible(context?: Partial<EligibilityContext>): SkillEntry[] {
    const entries = Array.from(this.entries.values());
    return this.eligibilityChecker.filter(entries, context);
  }

  // ============================================================================
  // Installation
  // ============================================================================

  /**
   * 安装 Skill
   */
  async install(skillId: SkillId, installId?: string): Promise<{
    ok: boolean;
    message: string;
    code?: number;
  }> {
    const entry = this.entries.get(skillId);
    if (!entry) {
      return { ok: false, message: `Skill not found: ${skillId}`, code: -1 };
    }

    return this.installer.install(entry, installId);
  }

  /**
   * 卸载 Skill
   */
  async uninstall(skillId: SkillId): Promise<{
    ok: boolean;
    message: string;
    code?: number;
  }> {
    const entry = this.entries.get(skillId);
    if (!entry) {
      return { ok: false, message: `Skill not found: ${skillId}`, code: -1 };
    }

    return this.installer.uninstall(entry);
  }

  /**
   * 检查是否已安装
   */
  isInstalled(skillId: SkillId): boolean {
    const entry = this.entries.get(skillId);
    if (!entry) return false;

    return this.installer.isInstalled(entry);
  }

  // ============================================================================
  // Watching
  // ============================================================================

  /**
   * 开始监视文件变更
   */
  watch(workspaceDir: string, onChange?: (event: { type: 'add' | 'change' | 'unlink'; path: string; skillName?: string }) => void): void {
    if (!this.watcher) {
      this.watcher = new SkillWatcher(this.config, this.logger);
    }

    if (onChange) {
      this.watcher.on('change', onChange);
    }

    this.watcher.watch(workspaceDir);
  }

  /**
   * 停止监视
   */
  unwatch(workspaceDir: string): void {
    this.watcher?.unwatch(workspaceDir);
  }

  /**
   * 停止所有监视
   */
  unwatchAll(): void {
    this.watcher?.unwatchAll();
  }

  // ============================================================================
  // Security
  // ============================================================================

  /**
   * 扫描 Skill 安全性
   */
  scanSecurity(skillId: SkillId) {
    const entry = this.entries.get(skillId);
    if (!entry || !entry.skill.filePath) {
      return { passed: true, warnings: [] };
    }

    try {
      const content = require('fs').readFileSync(entry.skill.filePath, 'utf-8');
      return this.securityScanner.scan(content, entry.skill.filePath);
    } catch {
      return { passed: true, warnings: [] };
    }
  }

  // ============================================================================
  // Snapshot
  // ============================================================================

  /**
   * 构建 Skill 快照
   */
  buildSnapshot() {
    const entries = this.filterEligible();
    return this.loader.buildSnapshot(entries);
  }

  // ============================================================================
  // Cache Management
  // ============================================================================

  /**
   * 清空缓存
   */
  clearCache(): void {
    this.cache.clear();
    this.logger?.debug('[SkillRegistry] Cache cleared');
  }

  /**
   * 获取缓存统计
   */
  getCacheStats() {
    return this.cache.getStats();
  }

  // ============================================================================
  // Config Management
  // ============================================================================

  /**
   * 获取配置管理器
   */
  getConfigManager(): SkillConfigManager {
    return this.configManager;
  }

  /**
   * 重新加载配置
   */
  async reloadConfig(): Promise<void> {
    const newConfig = await this.configManager.load();
    this.config = newConfig;
    // 清除资格检查缓存，因为配置可能已变更
    this.cache.clear();
    this.logger?.info('[SkillRegistry] Configuration reloaded');
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  private createSkillEntry(skill: Skill): SkillEntry {
    return {
      skill,
      frontmatter: {
        name: skill.name,
        description: skill.description,
        userInvocable: true,
        disableModelInvocation: false,
      },
      metadata: skill.metadata?.openclaw,
      invocation: {
        userInvocable: true,
        disableModelInvocation: false,
      },
      source: skill.source,
      priority: 0,
    };
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private updateIndex(skill: Skill): void {
    this.index.byName.set(skill.name, skill.id);

    const category = skill.metadata?.category;
    if (category) {
      if (!this.index.byCategory.has(category)) {
        this.index.byCategory.set(category, new Set());
      }
      this.index.byCategory.get(category)!.add(skill.id);
    }

    const tags = skill.metadata?.tags;
    if (Array.isArray(tags)) {
      for (const tag of tags) {
        if (!this.index.byTag.has(tag)) {
          this.index.byTag.set(tag, new Set());
        }
        this.index.byTag.get(tag)!.add(skill.id);
      }
    }
  }

  private removeFromIndex(skill: Skill): void {
    this.index.byName.delete(skill.name);

    const category = skill.metadata?.category;
    if (category) {
      this.index.byCategory.get(category)?.delete(skill.id);
    }

    const tags = skill.metadata?.tags;
    if (Array.isArray(tags)) {
      for (const tag of tags) {
        this.index.byTag.get(tag)?.delete(skill.id);
      }
    }
  }

  private updateAccessStats(skillId: SkillId): void {
    const stats = this.accessStats.get(skillId);
    if (stats) {
      stats.lastAccessed = new Date();
      stats.accessCount++;
    }
  }
}

// ============================================================================
// Factory
// ============================================================================

export function createSkillRegistry(
  config?: SkillsConfig,
  logger?: {
    debug: (msg: string, meta?: Record<string, unknown>) => void;
    info: (msg: string, meta?: Record<string, unknown>) => void;
    warn: (msg: string, meta?: Record<string, unknown>) => void;
    error: (msg: string, meta?: Record<string, unknown>, err?: Error) => void;
  }
): SkillRegistry {
  return new SkillRegistry(config, logger);
}

// ============================================================================
// Export Types
// ============================================================================

export * from './types.js';
export * from './loader.js';
export * from './eligibility.js';
export * from './installer.js';
export * from './watcher.js';
export * from './frontmatter.js';
export * from './security.js';
export * from './cache.js';
export * from './config.js';
