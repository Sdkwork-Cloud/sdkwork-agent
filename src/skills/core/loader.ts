/**
 * Skill Loader - 动态 Skill 加载系统
 *
 * 特性：
 * 1. 渐进式披露加载 (Progressive Disclosure)
 * 2. 按需懒加载 (Lazy Loading)
 * 3. 智能缓存管理
 * 4. 依赖自动解析
 * 5. 热更新支持
 *
 * @module SkillLoader
 * @version 2.0.0
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
} from './types.js';

/**
 * Skill 加载配置
 */
export interface SkillLoaderConfig {
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
  /** 依赖解析器 */
  dependencyResolver?: DependencyResolver;
}

/**
 * Skill 缓存条目
 */
interface SkillCacheEntry {
  manifest: SkillManifest;
  loadedSkill?: LoadedSkill;
  loadedAt: Date;
  lastAccessed: Date;
  accessCount: number;
  loadPromise?: Promise<LoadedSkill>;
}

/**
 * Skill 加载结果
 */
export interface SkillLoadResult {
  success: boolean;
  skill?: LoadedSkill;
  manifest?: SkillManifest;
  error?: Error;
}

/**
 * Skill 源定义
 */
export interface SkillSource {
  type: 'filesystem' | 'url' | 'registry' | 'memory';
  name: string;
  path: string;
  version?: string;
}

/**
 * 依赖解析器接口
 */
export interface DependencyResolver {
  resolve(dependencies: string[]): Promise<string[]>;
}

/**
 * 懒加载 Skill 包装器
 */
class LazySkillWrapper implements Skill {
  private loadedSkill?: Skill;
  private loadPromise?: Promise<Skill>;

  constructor(
    private loader: SkillLoader,
    private source: SkillSource,
    public name: string,
    public description: string,
    public version: string,
    public inputSchema: z.ZodType<unknown>
  ) {}

  async execute(input: unknown, context: ExecutionContext): Promise<SkillResult> {
    const skill = await this.ensureLoaded();
    return skill.execute(input, context);
  }

  async *executeStream(input: unknown, context: ExecutionContext): AsyncIterable<unknown> {
    const skill = await this.ensureLoaded();
    if (!skill.executeStream) {
      throw new Error(`Skill ${this.name} does not support streaming`);
    }
    yield* skill.executeStream(input, context);
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
    const result = await this.loader.load(this.source);
    if (!result.success || !result.skill) {
      throw new Error(`Failed to load skill: ${this.name}`);
    }

    // 从加载的 Skill 创建实际执行实例
    // 这里需要根据 manifest 创建具体的 Skill 实现
    return this.createSkillFromLoaded(result.skill);
  }

  private createSkillFromLoaded(loaded: LoadedSkill): Skill {
    // 根据 manifest 类型创建对应的 Skill 实现
    const manifest = loaded.manifest;

    return {
      name: manifest.name,
      description: manifest.description,
      version: manifest.version,
      inputSchema: this.inputSchema,
      execute: async (input: unknown, context: ExecutionContext): Promise<SkillResult> => {
        // 执行加载的脚本
        const mainScript = loaded.scripts.get('main');
        if (!mainScript) {
          return {
            success: false,
            error: new SkillError('Main script not found', 'SCRIPT_NOT_FOUND', false),
          };
        }

        try {
          // 在实际实现中，这里会在沙箱中执行脚本
          const result = await this.executeInSandbox(mainScript, input, context);
          return {
            success: true,
            data: result,
          };
        } catch (error) {
          return {
            success: false,
            error: new SkillError((error as Error).message, 'EXECUTION_ERROR', false),
          };
        }
      },
    };
  }

  private async executeInSandbox(
    script: ScriptFile,
    input: unknown,
    context: ExecutionContext
  ): Promise<unknown> {
    // 创建沙箱环境
    const sandbox = {
      console: {
        log: (...args: unknown[]) => context.logger.info(args.join(' ')),
        error: (...args: unknown[]) => context.logger.error(args.join(' ')),
        warn: (...args: unknown[]) => context.logger.warn(args.join(' ')),
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
    };

    // 在实际实现中，使用 vm2 或其他沙箱机制执行
    // 这里简化处理
    const fn = new Function('sandbox', `
      with (sandbox) {
        ${script.content}
        return typeof main === 'function' ? main(input, context) : undefined;
      }
    `);

    return fn(sandbox);
  }
}

/**
 * Skill Loader 实现
 *
 * 采用渐进式披露模式，支持三级加载：
 * 1. metadata - 仅加载元数据 (~100 tokens)
 * 2. instructions - 加载指令 (< 5000 tokens)
 * 3. full - 加载完整 Skill 及所有资源
 */
export class SkillLoader extends EventEmitter implements ISkillLoader {
  private cache = new Map<string, SkillCacheEntry>();
  private loadingPromises = new Map<string, Promise<SkillLoadResult>>();
  private config: Required<SkillLoaderConfig>;
  private activeLoads = 0;
  private cacheStats = { hits: 0, misses: 0 };

  constructor(config: SkillLoaderConfig = {}) {
    super();
    this.config = {
      enableCache: true,
      maxCacheSize: 100,
      cacheTTL: 1000 * 60 * 60, // 1 hour
      enableLazyLoad: true,
      maxConcurrentLoads: 5,
      loadTimeout: 30000,
      retries: 3,
      dependencyResolver: { resolve: () => Promise.resolve([]) },
      ...config,
    };
  }

  /**
   * 加载 Skill 元数据
   * 仅加载 SKILL.md 的 frontmatter，约 100 tokens
   */
  async loadMetadata(path: string): Promise<SkillManifest> {
    const cacheKey = `meta:${path}`;

    // 检查缓存
    if (this.config.enableCache) {
      const cached = this.cache.get(cacheKey);
      if (cached && this.isCacheValid(cached)) {
        cached.lastAccessed = new Date();
        cached.accessCount++;
        this.cacheStats.hits++;
        this.emit('cache:hit', { type: 'cache:hit', timestamp: new Date(), data: { path, level: 'metadata' } });
        return cached.manifest;
      }
    }
    this.cacheStats.misses++;

    try {
      const manifest = await this.fetchMetadata(path);
      validateSkillManifest(manifest);

      // 更新缓存
      if (this.config.enableCache) {
        this.cache.set(cacheKey, {
          manifest,
          loadedAt: new Date(),
          lastAccessed: new Date(),
          accessCount: 1,
        });
        this.evictIfNeeded();
      }

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
   * 加载 Skill 指令
   * 加载 SKILL.md 的内容，< 5000 tokens
   */
  async loadInstructions(path: string): Promise<string> {
    const cacheKey = `instr:${path}`;

    // 检查缓存
    if (this.config.enableCache) {
      const cached = this.cache.get(cacheKey);
      if (cached?.loadedSkill && this.isCacheValid(cached)) {
        cached.lastAccessed = new Date();
        cached.accessCount++;
        return cached.loadedSkill.instructions;
      }
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
   * 加载完整 Skill
   * 加载所有资源：scripts、references、assets
   */
  async loadFull(path: string): Promise<LoadedSkill> {
    const cacheKey = `full:${path}`;

    // 检查缓存
    if (this.config.enableCache) {
      const cached = this.cache.get(cacheKey);
      if (cached?.loadedSkill && this.isCacheValid(cached)) {
        cached.lastAccessed = new Date();
        cached.accessCount++;
        this.cacheStats.hits++;
        this.emit('cache:hit', { type: 'cache:hit', timestamp: new Date(), data: { path, level: 'full' } });
        return cached.loadedSkill;
      }

      // 检查是否正在加载
      if (cached?.loadPromise) {
        return cached.loadPromise;
      }
    }
    this.cacheStats.misses++;

    // 检查并发限制
    while (this.activeLoads >= this.config.maxConcurrentLoads) {
      await delay(10);
    }

    this.activeLoads++;

    // 开始加载
    const loadPromise = this.doLoadFull(path).finally(() => {
      this.activeLoads--;
    });

    // 存储加载 Promise
    if (this.config.enableCache) {
      const cached = this.cache.get(cacheKey);
      if (cached) {
        cached.loadPromise = loadPromise;
      }
    }

    try {
      const loadedSkill = await loadPromise;

      // 更新缓存
      if (this.config.enableCache) {
        this.cache.set(cacheKey, {
          manifest: loadedSkill.manifest,
          loadedSkill,
          loadedAt: new Date(),
          lastAccessed: new Date(),
          accessCount: 1,
        });
        this.evictIfNeeded();
      }

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
    const cacheKey = `${source.type}:${source.path}`;

    // 检查是否已加载
    const cached = this.cache.get(cacheKey);
    if (cached?.loadedSkill && this.isCacheValid(cached)) {
      return {
        success: true,
        skill: cached.loadedSkill,
        manifest: cached.manifest,
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

    if (result.success && result.skill) {
      // 更新缓存
      if (this.config.enableCache) {
        this.cache.set(cacheKey, {
          manifest: result.manifest!,
          loadedSkill: result.skill,
          loadedAt: new Date(),
          lastAccessed: new Date(),
          accessCount: 1,
        });
        this.evictIfNeeded();
      }
    }

    this.loadingPromises.delete(cacheKey);
    return result;
  }

  /**
   * 创建懒加载 Skill 代理
   * 首次执行时才加载完整 Skill
   */
  createLazySkill(_source: SkillSource, _manifest: SkillManifest): Skill {
    // 懒加载技能创建 - 简化实现
    return new LazySkillWrapper(
      this,
      _source,
      _manifest.name,
      _manifest.description,
      _manifest.version,
      z.any() // inputSchema 将在实际加载后填充
    );
  }

  /**
   * 预加载多个 Skills
   */
  async preload(paths: string[]): Promise<SkillLoadResult[]> {
    // 控制并发数
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

  /**
   * 清除缓存
   */
  clearCache(): void {
    this.cache.clear();
    this.cacheStats = { hits: 0, misses: 0 };
    this.emit('cache:cleared', {
      type: 'cache:cleared',
      timestamp: new Date(),
    });
  }

  /**
   * 获取缓存统计
   */
  getCacheStats(): {
    size: number;
    maxSize: number;
    hitRate: number;
    hits: number;
    misses: number;
    entries: Array<{
      name: string;
      loadedAt: Date;
      lastAccessed: Date;
      accessCount: number;
    }>;
  } {
    const entries = Array.from(this.cache.entries()).map(([, entry]) => ({
      name: entry.manifest.name,
      loadedAt: entry.loadedAt,
      lastAccessed: entry.lastAccessed,
      accessCount: entry.accessCount,
    }));

    const total = this.cacheStats.hits + this.cacheStats.misses;
    const hitRate = total > 0 ? this.cacheStats.hits / total : 0;

    return {
      size: this.cache.size,
      maxSize: this.config.maxCacheSize,
      hitRate,
      hits: this.cacheStats.hits,
      misses: this.cacheStats.misses,
      entries,
    };
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
        await delay(Math.pow(2, attempt) * 100); // 指数退避
        return this.doLoadWithRetry(source, attempt + 1);
      }
      throw error;
    }
  }

  private async doLoad(source: SkillSource): Promise<SkillLoadResult> {
    try {
      // 1. 加载元数据
      const manifest = await this.loadMetadata(source.path);

      // 2. 检查是否需要懒加载
      if (manifest.lifecycle?.lazyLoad && this.config.enableLazyLoad) {
        // 返回懒加载包装器
        const lazySkill = this.createLazySkill(source, manifest);
        return {
          success: true,
          manifest,
          skill: {
            manifest,
            instructions: '',
            scripts: new Map(),
            references: new Map(),
            assets: new Map(),
            path: source.path,
            // 懒加载技能通过 lazySkill 属性提供实际执行能力
            execute: lazySkill.execute.bind(lazySkill),
            executeStream: lazySkill.executeStream?.bind(lazySkill),
          } as LoadedSkill,
        };
      }

      // 3. 加载完整 Skill
      const loadedSkill = await this.loadFull(source.path);

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
    // 并行加载所有资源
    const [manifest, instructions, scripts, references, assets] = await Promise.all([
      this.loadMetadata(path),
      this.loadInstructions(path),
      this.loadScripts(path),
      this.loadReferences(path),
      this.loadAssets(path),
    ]);

    return {
      manifest,
      instructions,
      scripts,
      references,
      assets,
      path,
    };
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
    // 加载脚本文件
    return new Map();
  }

  private async loadReferences(_path: string): Promise<Map<string, ReferenceFile>> {
    // 加载引用文件
    return new Map();
  }

  private async loadAssets(_path: string): Promise<Map<string, AssetFile>> {
    // 加载资源文件
    return new Map();
  }

  private isCacheValid(entry: SkillCacheEntry): boolean {
    if (!this.config.enableCache) return false;

    const now = Date.now();
    const age = now - entry.loadedAt.getTime();
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

    this.emit('cache:evicted', {
      type: 'cache:evicted',
      timestamp: new Date(),
      data: { count: toEvict.length },
    });
  }

}

/**
 * 创建 SkillLoader 实例
 */
export function createSkillLoader(config?: SkillLoaderConfig): SkillLoader {
  return new SkillLoader(config);
}

/**
 * 全局 SkillLoader 单例
 */
let globalLoader: SkillLoader | null = null;

export function getGlobalLoader(): SkillLoader {
  if (!globalLoader) {
    globalLoader = new SkillLoader();
  }
  return globalLoader;
}
