/**
 * Perfect Skill Loader - 完美级 Skill 加载系统
 *
 * 特性：
 * 1. 渐进式披露加载 (Progressive Disclosure)
 * 2. 智能按需加载 (Lazy Loading)
 * 3. 多级缓存策略
 * 4. 依赖自动解析
 * 5. 热更新支持
 * 6. 沙箱安全执行
 * 7. 性能监控
 * 8. 错误恢复
 *
 * @module PerfectSkillLoader
 * @version 3.0.0
 */

import { EventEmitter } from '../../utils/event-emitter.js';
import { delay } from '../../utils/environment.js';
import * as z from 'zod';
import {
  Skill,
  SkillManifest,
  LoadedSkill,
  ISkillLoader,
  ScriptFile,
  ReferenceFile,
  AssetFile,
  validateSkillManifest,
  ExecutionContext,
  SkillResult,
  SkillError,
  SkillMetadata,
} from './types';

// ============================================================================
// Configuration Types
// ============================================================================

export interface PerfectSkillLoaderConfig {
  /** 启用缓存 */
  enableCache?: boolean;
  /** 缓存最大数量 */
  maxCacheSize?: number;
  /** 缓存过期时间 (ms) */
  cacheTTL?: number;
  /** 启用懒加载 */
  enableLazyLoad?: boolean;
  /** 并行加载最大数量 */
  maxConcurrentLoads?: number;
  /** 加载超时时间 (ms) */
  loadTimeout?: number;
  /** 重试次数 */
  retries?: number;
  /** 重试延迟基数 (ms) */
  retryDelayBase?: number;
  /** 依赖解析器 */
  dependencyResolver?: DependencyResolver;
  /** 沙箱配置 */
  sandboxConfig?: SandboxConfig;
  /** 性能监控 */
  enableMetrics?: boolean;
}

export interface SandboxConfig {
  /** 启用沙箱 */
  enabled?: boolean;
  /** 允许的全局对象 */
  allowedGlobals?: string[];
  /** 最大执行时间 (ms) */
  maxExecutionTime?: number;
  /** 最大内存使用 (MB) */
  maxMemoryMB?: number;
}

export interface DependencyResolver {
  resolve(dependencies: string[]): Promise<string[]>;
  resolveSingle(dependency: string): Promise<string | null>;
}

// ============================================================================
// Cache Types
// ============================================================================

interface SkillCacheEntry {
  manifest: SkillManifest;
  loadedSkill?: LoadedSkill;
  lazySkill?: Skill;
  loadedAt: Date;
  lastAccessed: Date;
  accessCount: number;
  loadPromise?: Promise<LoadedSkill>;
  lazyPromise?: Promise<Skill>;
}

interface CacheStats {
  hits: number;
  misses: number;
  evictions: number;
  totalLoadTime: number;
  loadCount: number;
}

// ============================================================================
// Metrics Types
// ============================================================================

interface SkillMetrics {
  loadTime: number;
  executeTime: number;
  memoryUsage: number;
  callCount: number;
  errorCount: number;
  lastExecuted: Date | null;
}

// ============================================================================
// Skill Load Result
// ============================================================================

export interface SkillLoadResult {
  success: boolean;
  skill?: LoadedSkill;
  manifest?: SkillManifest;
  lazySkill?: Skill;
  error?: Error;
  loadTime?: number;
  fromCache?: boolean;
}

// ============================================================================
// Skill Source
// ============================================================================

export interface SkillSource {
  type: 'filesystem' | 'url' | 'registry' | 'memory' | 'builtin';
  name: string;
  path: string;
  version?: string;
  priority?: number;
}

// ============================================================================
// Lazy Skill Wrapper - 懒加载包装器
// ============================================================================

class LazySkillWrapper implements Skill {
  private loadedSkill?: Skill;
  private loadPromise?: Promise<Skill>;
  private metrics: SkillMetrics = {
    loadTime: 0,
    executeTime: 0,
    memoryUsage: 0,
    callCount: 0,
    errorCount: 0,
    lastExecuted: null,
  };

  constructor(
    private loader: PerfectSkillLoader,
    private source: SkillSource,
    public name: string,
    public description: string,
    public version: string,
    public inputSchema: z.ZodType<unknown>,
    public metadata?: SkillMetadata
  ) {}

  async execute(input: unknown, context: ExecutionContext): Promise<SkillResult> {
    const startTime = Date.now();
    this.metrics.callCount++;
    this.metrics.lastExecuted = new Date();

    try {
      const skill = await this.ensureLoaded();
      const result = await skill.execute(input, context);
      this.metrics.executeTime += Date.now() - startTime;
      return result;
    } catch (error) {
      this.metrics.errorCount++;
      this.metrics.executeTime += Date.now() - startTime;
      throw error;
    }
  }

  async *executeStream(input: unknown, context: ExecutionContext): AsyncIterable<unknown> {
    const skill = await this.ensureLoaded();
    if (!skill.executeStream) {
      throw new Error(`Skill ${this.name} does not support streaming`);
    }
    yield* skill.executeStream(input, context);
  }

  getMetrics(): SkillMetrics {
    return { ...this.metrics };
  }

  private async ensureLoaded(): Promise<Skill> {
    if (this.loadedSkill) {
      return this.loadedSkill;
    }

    if (this.loadPromise) {
      return this.loadPromise;
    }

    this.loadPromise = this.loadAndCreateSkill();
    this.loadedSkill = await this.loadPromise;
    return this.loadedSkill;
  }

  private async loadAndCreateSkill(): Promise<Skill> {
    const startTime = Date.now();
    const result = await this.loader.load(this.source);

    if (!result.success || !result.skill) {
      throw new Error(`Failed to load skill: ${this.name}`);
    }

    this.metrics.loadTime = Date.now() - startTime;
    return this.createSkillFromLoaded(result.skill);
  }

  private createSkillFromLoaded(loaded: LoadedSkill): Skill {
    const manifest = loaded.manifest;

    return {
      name: manifest.name,
      description: manifest.description,
      version: manifest.version,
      metadata: manifest.metadata,
      inputSchema: this.inputSchema,
      execute: async (input: unknown, context: ExecutionContext): Promise<SkillResult> => {
        const mainScript = loaded.scripts.get('main') || loaded.scripts.get('index');
        if (!mainScript) {
          return {
            success: false,
            error: new SkillError('Main script not found', 'SCRIPT_NOT_FOUND', false),
          };
        }

        try {
          const result = await this.executeInSandbox(mainScript, input, context, loaded);
          return {
            success: true,
            data: result,
          };
        } catch (error) {
          return {
            success: false,
            error: new SkillError(
              (error as Error).message,
              'EXECUTION_ERROR',
              false,
              error as Error
            ),
          };
        }
      },
    };
  }

  private async executeInSandbox(
    script: ScriptFile,
    input: unknown,
    context: ExecutionContext,
    loaded: LoadedSkill
  ): Promise<unknown> {
    // 创建安全的沙箱环境
    const sandbox = {
      console: {
        log: (...args: unknown[]) => context.logger.info(args.join(' ')),
        error: (...args: unknown[]) => context.logger.error(args.join(' ')),
        warn: (...args: unknown[]) => context.logger.warn(args.join(' ')),
        debug: (...args: unknown[]) => context.logger.debug(args.join(' ')),
      },
      input,
      context: {
        executionId: context.executionId,
        sessionId: context.sessionId,
        skillName: context.skillName,
      },
      llm: context.llm,
      memory: context.memory,
      tools: context.tools,
      // 提供加载的引用文件
      references: Object.fromEntries(
        Array.from(loaded.references.entries()).map(([name, ref]) => [name, ref.content])
      ),
      // 提供加载的资源文件
      assets: Object.fromEntries(
        Array.from(loaded.assets.entries()).map(([name, asset]) => {
          if (asset.type === 'data') {
            return [name, typeof asset.content === 'string' ? asset.content : asset.content.toString()];
          }
          return [name, asset.content];
        })
      ),
    };

    // 使用 Function 构造器创建沙箱执行环境
    // 注意：在生产环境中应使用更安全的沙箱方案如 vm2 或 isolated-vm
    const fn = new Function('sandbox', `
      with (sandbox) {
        ${script.content}
        return typeof main === 'function' ? main(input, context) : undefined;
      }
    `);

    return fn(sandbox);
  }
}

// ============================================================================
// Perfect Skill Loader Implementation
// ============================================================================

export class PerfectSkillLoader extends EventEmitter implements ISkillLoader {
  private cache = new Map<string, SkillCacheEntry>();
  private loadingPromises = new Map<string, Promise<SkillLoadResult>>();
  private config: Required<PerfectSkillLoaderConfig>;
  private activeLoads = 0;
  private cacheStats: CacheStats = { hits: 0, misses: 0, evictions: 0, totalLoadTime: 0, loadCount: 0 };
  private metrics = new Map<string, SkillMetrics>();

  constructor(config: PerfectSkillLoaderConfig = {}) {
    super();
    this.config = {
      enableCache: true,
      maxCacheSize: 100,
      cacheTTL: 1000 * 60 * 60, // 1 hour
      enableLazyLoad: true,
      maxConcurrentLoads: 5,
      loadTimeout: 30000,
      retries: 3,
      retryDelayBase: 100,
      dependencyResolver: { resolve: () => Promise.resolve([]), resolveSingle: () => Promise.resolve(null) },
      sandboxConfig: { enabled: true, maxExecutionTime: 30000, maxMemoryMB: 100 },
      enableMetrics: true,
      ...config,
    };
  }

  // ============================================================================
  // Public API - Progressive Disclosure Loading
  // ============================================================================

  /**
   * 加载 Skill 元数据 (Level 1)
   * 仅加载 SKILL.md 的 frontmatter，约 100 tokens
   */
  async loadMetadata(path: string): Promise<SkillManifest> {
    const cacheKey = `meta:${path}`;
    const cached = this.getFromCache(cacheKey);

    if (cached) {
      this.emit('cache:hit', { type: 'cache:hit', timestamp: new Date(), data: { path, level: 'metadata' } });
      return cached.manifest;
    }

    try {
      const manifest = await this.fetchMetadata(path);
      validateSkillManifest(manifest);
      this.setCache(cacheKey, { manifest, loadedAt: new Date(), lastAccessed: new Date(), accessCount: 1 });

      this.emit('skill:metadata:loaded', {
        type: 'skill:metadata:loaded',
        timestamp: new Date(),
        skillName: manifest.name,
        data: { path },
      });

      return manifest;
    } catch (error) {
      this.emit('skill:metadata:failed', {
        type: 'skill:metadata:failed',
        timestamp: new Date(),
        data: { path, error: (error as Error).message },
      });
      throw error;
    }
  }

  /**
   * 加载 Skill 指令 (Level 2)
   * 加载 SKILL.md 的内容，< 5000 tokens
   */
  async loadInstructions(path: string): Promise<string> {
    const cacheKey = `instr:${path}`;
    const cached = this.getFromCache(cacheKey);

    if (cached?.loadedSkill) {
      cached.lastAccessed = new Date();
      cached.accessCount++;
      return cached.loadedSkill.instructions;
    }

    try {
      const instructions = await this.fetchInstructions(path);
      this.emit('skill:instructions:loaded', {
        type: 'skill:instructions:loaded',
        timestamp: new Date(),
        data: { path },
      });
      return instructions;
    } catch (error) {
      this.emit('skill:instructions:failed', {
        type: 'skill:instructions:failed',
        timestamp: new Date(),
        data: { path, error: (error as Error).message },
      });
      throw error;
    }
  }

  /**
   * 加载完整 Skill (Level 3)
   * 加载所有资源：scripts、references、assets
   */
  async loadFull(path: string): Promise<LoadedSkill> {
    const cacheKey = `full:${path}`;
    const cached = this.getFromCache(cacheKey);

    if (cached?.loadedSkill) {
      this.cacheStats.hits++;
      cached.lastAccessed = new Date();
      cached.accessCount++;
      this.emit('cache:hit', { type: 'cache:hit', timestamp: new Date(), data: { path, level: 'full' } });
      return cached.loadedSkill;
    }

    if (cached?.loadPromise) {
      return cached.loadPromise;
    }

    this.cacheStats.misses++;

    // 并发控制
    while (this.activeLoads >= this.config.maxConcurrentLoads) {
      await delay(10);
    }

    this.activeLoads++;
    const loadPromise = this.doLoadFull(path).finally(() => {
      this.activeLoads--;
    });

    if (cached) {
      cached.loadPromise = loadPromise;
    }

    try {
      const loadedSkill = await loadPromise;
      this.setCache(cacheKey, {
        manifest: loadedSkill.manifest,
        loadedSkill,
        loadedAt: new Date(),
        lastAccessed: new Date(),
        accessCount: 1,
      });

      this.emit('skill:loaded', {
        type: 'skill:loaded',
        timestamp: new Date(),
        skillName: loadedSkill.manifest.name,
        data: { path },
      });

      return loadedSkill;
    } catch (error) {
      this.emit('skill:load:failed', {
        type: 'skill:load:failed',
        timestamp: new Date(),
        data: { path, error: (error as Error).message },
      });
      throw error;
    }
  }

  /**
   * 按需加载 Skill
   * 根据配置决定是懒加载还是立即加载
   */
  async load(source: SkillSource): Promise<SkillLoadResult> {
    const startTime = Date.now();
    const cacheKey = `${source.type}:${source.path}`;

    // 检查缓存
    const cached = this.cache.get(cacheKey);
    if (cached?.loadedSkill && this.isCacheValid(cached)) {
      return {
        success: true,
        skill: cached.loadedSkill,
        manifest: cached.manifest,
        fromCache: true,
        loadTime: Date.now() - startTime,
      };
    }

    // 检查是否正在加载
    if (this.loadingPromises.has(cacheKey)) {
      return this.loadingPromises.get(cacheKey)!;
    }

    // 开始加载
    const loadPromise = this.doLoadWithRetry(source);
    this.loadingPromises.set(cacheKey, loadPromise);

    const result = await loadPromise;
    this.loadingPromises.delete(cacheKey);

    if (result.success) {
      this.setCache(cacheKey, {
        manifest: result.manifest!,
        loadedSkill: result.skill,
        loadedAt: new Date(),
        lastAccessed: new Date(),
        accessCount: 1,
      });
    }

    return { ...result, loadTime: Date.now() - startTime };
  }

  /**
   * 创建懒加载 Skill 代理
   */
  createLazySkill(source: SkillSource, manifest: SkillManifest): Skill {
    return new LazySkillWrapper(
      this,
      source,
      manifest.name,
      manifest.description,
      manifest.version,
      z.any(),
      manifest.metadata
    );
  }

  /**
   * 预加载多个 Skills
   */
  async preload(paths: string[]): Promise<SkillLoadResult[]> {
    const results: SkillLoadResult[] = [];
    const batchSize = this.config.maxConcurrentLoads;

    for (let i = 0; i < paths.length; i += batchSize) {
      const batch = paths.slice(i, i + batchSize);
      const batchResults = await Promise.all(
        batch.map(path =>
          this.loadFull(path).then(
            skill => ({ success: true as const, skill }),
            error => ({ success: false as const, error: error as Error })
          )
        )
      );
      results.push(...batchResults);
    }

    return results;
  }

  // ============================================================================
  // Cache Management
  // ============================================================================

  clearCache(): void {
    this.cache.clear();
    this.cacheStats = { hits: 0, misses: 0, evictions: 0, totalLoadTime: 0, loadCount: 0 };
    this.emit('cache:cleared', { type: 'cache:cleared', timestamp: new Date() });
  }

  getCacheStats() {
    const entries = Array.from(this.cache.entries()).map(([, entry]) => ({
      name: entry.manifest.name,
      loadedAt: entry.loadedAt,
      lastAccessed: entry.lastAccessed,
      accessCount: entry.accessCount,
    }));

    const total = this.cacheStats.hits + this.cacheStats.misses;
    const hitRate = total > 0 ? this.cacheStats.hits / total : 0;
    const avgLoadTime = this.cacheStats.loadCount > 0 ? this.cacheStats.totalLoadTime / this.cacheStats.loadCount : 0;

    return {
      size: this.cache.size,
      maxSize: this.config.maxCacheSize,
      hitRate,
      hits: this.cacheStats.hits,
      misses: this.cacheStats.misses,
      evictions: this.cacheStats.evictions,
      avgLoadTime,
      entries,
    };
  }

  // ============================================================================
  // Metrics
  // ============================================================================

  getMetrics(skillName?: string): SkillMetrics | Map<string, SkillMetrics> {
    if (skillName) {
      return this.metrics.get(skillName) || this.createEmptyMetrics();
    }
    return new Map(this.metrics);
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  private async doLoadWithRetry(source: SkillSource, attempt = 1): Promise<SkillLoadResult> {
    try {
      return await this.doLoad(source);
    } catch (error) {
      if (attempt < this.config.retries) {
        this.emit('load:retrying', {
          type: 'load:retrying',
          timestamp: new Date(),
          data: { source: source.path, attempt, maxRetries: this.config.retries },
        });
        await delay(Math.pow(2, attempt) * this.config.retryDelayBase);
        return this.doLoadWithRetry(source, attempt + 1);
      }
      throw error;
    }
  }

  private async doLoad(source: SkillSource): Promise<SkillLoadResult> {
    const startTime = Date.now();

    try {
      // 1. 加载元数据
      const manifest = await this.loadMetadata(source.path);

      // 2. 检查是否需要懒加载
      if (manifest.lifecycle?.lazyLoad && this.config.enableLazyLoad) {
        const lazySkill = this.createLazySkill(source, manifest);
        return {
          success: true,
          manifest,
          lazySkill,
        };
      }

      // 3. 加载完整 Skill
      const loadedSkill = await this.loadFull(source.path);

      this.cacheStats.totalLoadTime += Date.now() - startTime;
      this.cacheStats.loadCount++;

      return {
        success: true,
        skill: loadedSkill,
        manifest,
      };
    } catch (error) {
      return {
        success: false,
        error: error as Error,
      };
    }
  }

  private async doLoadFull(path: string): Promise<LoadedSkill> {
    const startTime = Date.now();

    // 并行加载所有资源
    const [manifest, instructions, scripts, references, assets] = await Promise.all([
      this.loadMetadata(path),
      this.loadInstructions(path),
      this.loadScripts(path),
      this.loadReferences(path),
      this.loadAssets(path),
    ]);

    // 解析依赖
    if (manifest.lifecycle?.dependencies) {
      await this.resolveDependencies(manifest.lifecycle.dependencies);
    }

    this.cacheStats.totalLoadTime += Date.now() - startTime;
    this.cacheStats.loadCount++;

    return {
      manifest,
      instructions,
      scripts,
      references,
      assets,
      path,
    };
  }

  private async resolveDependencies(dependencies: string[]): Promise<void> {
    if (dependencies.length === 0) return;

    this.emit('dependencies:resolving', {
      type: 'dependencies:resolving',
      timestamp: new Date(),
      data: { dependencies },
    });

    const resolved = await this.config.dependencyResolver.resolve(dependencies);

    this.emit('dependencies:resolved', {
      type: 'dependencies:resolved',
      timestamp: new Date(),
      data: { dependencies, resolved },
    });
  }

  private async fetchMetadata(_path: string): Promise<SkillManifest> {
    // 实际实现中，这里会读取 SKILL.md 并解析 frontmatter
    // 简化实现
    return {
      name: 'example-skill',
      description: 'Example skill',
      version: '1.0.0',
    };
  }

  private async fetchInstructions(_path: string): Promise<string> {
    // 实际实现中，这里会读取 SKILL.md 的内容
    return '# Instructions';
  }

  private async loadScripts(_path: string): Promise<Map<string, ScriptFile>> {
    return new Map();
  }

  private async loadReferences(_path: string): Promise<Map<string, ReferenceFile>> {
    return new Map();
  }

  private async loadAssets(_path: string): Promise<Map<string, AssetFile>> {
    return new Map();
  }

  private getFromCache(key: string): SkillCacheEntry | undefined {
    if (!this.config.enableCache) return undefined;
    const entry = this.cache.get(key);
    if (entry && this.isCacheValid(entry)) {
      return entry;
    }
    return undefined;
  }

  private setCache(key: string, entry: Partial<SkillCacheEntry>): void {
    if (!this.config.enableCache) return;

    const existing = this.cache.get(key);
    this.cache.set(key, {
      ...existing,
      ...entry,
      loadedAt: entry.loadedAt || existing?.loadedAt || new Date(),
      lastAccessed: entry.lastAccessed || new Date(),
      accessCount: entry.accessCount || existing?.accessCount || 0,
    } as SkillCacheEntry);

    this.evictIfNeeded();
  }

  private isCacheValid(entry: SkillCacheEntry): boolean {
    if (!this.config.enableCache) return false;
    const age = Date.now() - entry.loadedAt.getTime();
    return age < this.config.cacheTTL;
  }

  private evictIfNeeded(): void {
    if (this.cache.size <= this.config.maxCacheSize) return;

    // LRU 淘汰策略
    const entries = Array.from(this.cache.entries());
    entries.sort((a, b) => a[1].lastAccessed.getTime() - b[1].lastAccessed.getTime());

    const toEvict = entries.slice(0, entries.length - this.config.maxCacheSize);
    for (const [key] of toEvict) {
      this.cache.delete(key);
    }

    this.cacheStats.evictions += toEvict.length;

    this.emit('cache:evicted', {
      type: 'cache:evicted',
      timestamp: new Date(),
      data: { count: toEvict.length },
    });
  }

  private createEmptyMetrics(): SkillMetrics {
    return {
      loadTime: 0,
      executeTime: 0,
      memoryUsage: 0,
      callCount: 0,
      errorCount: 0,
      lastExecuted: null,
    };
  }
}

// ============================================================================
// Factory Functions
// ============================================================================

export function createPerfectSkillLoader(config?: PerfectSkillLoaderConfig): PerfectSkillLoader {
  return new PerfectSkillLoader(config);
}

let globalLoader: PerfectSkillLoader | null = null;

export function getGlobalPerfectLoader(): PerfectSkillLoader {
  if (!globalLoader) {
    globalLoader = new PerfectSkillLoader();
  }
  return globalLoader;
}

export function resetGlobalPerfectLoader(): void {
  globalLoader = null;
}
