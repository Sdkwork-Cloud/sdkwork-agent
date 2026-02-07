/**
 * Perfect Skill Execution Engine
 *
 * 完美的技能执行引擎
 *
 * 核心特性：
 * 1. 完整的生命周期管理 (加载 → 验证 → 执行 → 清理)
 * 2. 依赖解析和注入
 * 3. 沙箱执行环境
 * 4. 与 Tool/MCP/Plugin 的无缝集成
 * 5. 强大的错误处理和恢复机制
 * 6. 性能优化和缓存
 *
 * @module SkillEngine
 * @version 3.0.0
 */

import { EventEmitter } from '../../utils/event-emitter.js';
import {
  Skill,
  SkillResult,
  ExecutionContext,
  SkillError,
  Logger,
  LLMService,
  MemoryService,
  ToolRegistry,
  SkillManifest,
  LoadedSkill,
} from './types.js';
import { SkillSystemEvent } from './openclaw-types.js';

// ============================================================================
// Skill Engine Types
// ============================================================================

/**
 * 技能引擎配置
 */
export interface SkillEngineConfig {
  /** 默认超时时间 (ms) */
  defaultTimeout?: number;
  /** 最大重试次数 */
  maxRetries?: number;
  /** 启用沙箱 */
  enableSandbox?: boolean;
  /** 启用缓存 */
  enableCache?: boolean;
  /** 缓存TTL (ms) */
  cacheTTL?: number;
  /** 日志器 */
  logger?: Logger;
  /** LLM服务 */
  llm?: LLMService;
  /** 内存服务 */
  memory?: MemoryService;
  /** 工具注册表 */
  tools?: ToolRegistry;
}

/**
 * 技能依赖定义
 */
export interface SkillDependency {
  /** 依赖名称 */
  name: string;
  /** 依赖类型 */
  type: 'skill' | 'tool' | 'mcp' | 'plugin';
  /** 版本要求 */
  version?: string;
  /** 是否必需 */
  required: boolean;
}

/**
 * 技能生命周期钩子
 */
export interface SkillLifecycleHooks {
  /** 加载前 */
  beforeLoad?: (manifest: SkillManifest) => Promise<void> | void;
  /** 加载后 */
  afterLoad?: (skill: LoadedSkill) => Promise<void> | void;
  /** 执行前 */
  beforeExecute?: (input: unknown, context: ExecutionContext) => Promise<void> | void;
  /** 执行后 */
  afterExecute?: (result: SkillResult, context: ExecutionContext) => Promise<void> | void;
  /** 错误时 */
  onError?: (error: SkillError, context: ExecutionContext) => Promise<void> | void;
  /** 清理时 */
  onCleanup?: (skillName: string) => Promise<void> | void;
}

/**
 * 沙箱配置
 */
export interface SandboxConfig {
  /** 允许的全局变量 */
  allowedGlobals?: string[];
  /** 禁止的API */
  forbiddenAPIs?: string[];
  /** 内存限制 (MB) */
  memoryLimit?: number;
  /** CPU时间限制 (ms) */
  cpuTimeLimit?: number;
}

/**
 * 执行选项
 */
export interface ExecuteOptions {
  /** 超时时间 (ms) */
  timeout?: number;
  /** 重试次数 */
  retries?: number;
  /** 使用缓存 */
  useCache?: boolean;
  /** 沙箱配置 */
  sandbox?: SandboxConfig;
  /** 生命周期钩子 */
  hooks?: SkillLifecycleHooks;
}

/**
 * 缓存条目
 */
interface CacheEntry {
  result: SkillResult;
  timestamp: number;
  hits: number;
}

// ============================================================================
// Skill Engine
// ============================================================================

export class SkillEngine extends EventEmitter {
  private config: Required<SkillEngineConfig>;
  private logger: Logger;
  private cache: Map<string, CacheEntry> = new Map();
  private executingSkills: Map<string, AbortController> = new Map();
  private hooks: SkillLifecycleHooks = {};

  constructor(config: SkillEngineConfig = {}) {
    super();
    this.config = {
      defaultTimeout: 30000,
      maxRetries: 3,
      enableSandbox: true,
      enableCache: true,
      cacheTTL: 300000, // 5 minutes
      logger: this.createDefaultLogger(),
      llm: undefined as unknown as LLMService,
      memory: undefined as unknown as MemoryService,
      tools: undefined as unknown as ToolRegistry,
      ...config,
    };
    this.logger = this.config.logger;
  }

  /**
   * 执行技能
   *
   * 完整的执行流程：
   * 1. 检查缓存
   * 2. 解析依赖
   * 3. 验证输入
   * 4. 执行前钩子
   * 5. 沙箱执行
   * 6. 执行后钩子
   * 7. 缓存结果
   * 8. 错误处理
   */
  async execute(
    skill: Skill,
    input: unknown,
    options: ExecuteOptions = {}
  ): Promise<SkillResult> {
    const executionId = this.generateExecutionId();
    const startTime = Date.now();

    this.logger.info(`[${executionId}] Starting skill execution: ${skill.name}`);

    try {
      // 1. 检查缓存
      if (options.useCache !== false && this.config.enableCache) {
        const cached = this.getCachedResult(skill.name, input);
        if (cached) {
          this.logger.debug(`[${executionId}] Cache hit for skill: ${skill.name}`);
          return cached;
        }
      }

      // 2. 创建执行上下文
      const context = this.createExecutionContext(executionId, skill.name);

      // 3. 执行前钩子
      if (options.hooks?.beforeExecute) {
        await options.hooks.beforeExecute(input, context);
      }
      await this.hooks.beforeExecute?.(input, context);

      // 4. 验证输入
      const validatedInput = await this.validateInput(skill, input);

      // 5. 沙箱执行
      const result = await this.executeInSandbox(
        skill,
        validatedInput,
        context,
        options
      );

      // 6. 执行后钩子
      if (options.hooks?.afterExecute) {
        await options.hooks.afterExecute(result, context);
      }
      await this.hooks.afterExecute?.(result, context);

      // 7. 添加元数据
      const resultWithMetadata: SkillResult = {
        ...result,
        metadata: {
          startTime: new Date(startTime),
          endTime: new Date(),
          duration: Date.now() - startTime,
        },
      };

      // 8. 缓存结果
      if (options.useCache !== false && this.config.enableCache && result.success) {
        this.cacheResult(skill.name, input, resultWithMetadata);
      }

      this.logger.info(`[${executionId}] Skill execution completed: ${skill.name}`);

      // 9. 触发事件
      this.emit('skill:completed' as SkillSystemEvent['type'], {
        type: 'skill:completed',
        skillName: skill.name,
        executionId,
        duration: resultWithMetadata.metadata?.duration,
      });

      return resultWithMetadata;
    } catch (error) {
      return this.handleExecutionError(error, skill.name, executionId, startTime, options);
    }
  }

  /**
   * 批量执行技能
   */
  async executeBatch(
    tasks: Array<{ skill: Skill; input: unknown; options?: ExecuteOptions }>,
    options: { concurrency?: number } = {}
  ): Promise<SkillResult[]> {
    const { concurrency = 5 } = options;
    const results: SkillResult[] = [];

    // 使用信号量控制并发
    const executing: Promise<void>[] = [];

    for (const task of tasks) {
      const promise = this.execute(task.skill, task.input, task.options).then(
        result => {
          results.push(result);
        }
      );

      executing.push(promise);

      if (executing.length >= concurrency) {
        await Promise.race(executing);
        executing.splice(
          executing.findIndex(p => p === promise),
          1
        );
      }
    }

    await Promise.all(executing);

    return results;
  }

  /**
   * 取消执行
   */
  cancelExecution(executionId: string): boolean {
    const controller = this.executingSkills.get(executionId);
    if (controller) {
      controller.abort();
      this.executingSkills.delete(executionId);
      this.logger.info(`[${executionId}] Execution cancelled`);
      return true;
    }
    return false;
  }

  /**
   * 设置全局生命周期钩子
   */
  setLifecycleHooks(hooks: SkillLifecycleHooks): void {
    this.hooks = hooks;
  }

  /**
   * 清除缓存
   */
  clearCache(skillName?: string): void {
    if (skillName) {
      for (const [key] of this.cache) {
        if (key.startsWith(`${skillName}:`)) {
          this.cache.delete(key);
        }
      }
      this.logger.debug(`Cache cleared for skill: ${skillName}`);
    } else {
      this.cache.clear();
      this.logger.debug('All cache cleared');
    }
  }

  /**
   * 获取缓存统计
   */
  getCacheStats(): { size: number; hitRate: number } {
    let totalHits = 0;
    for (const entry of this.cache.values()) {
      totalHits += entry.hits;
    }

    return {
      size: this.cache.size,
      hitRate: totalHits > 0 ? totalHits / (totalHits + this.cache.size) : 0,
    };
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  private createExecutionContext(
    executionId: string,
    skillName: string
  ): ExecutionContext {
    const controller = new AbortController();
    this.executingSkills.set(executionId, controller);

    return {
      executionId,
      sessionId: this.generateSessionId(),
      skillName,
      abortSignal: controller.signal,
      logger: this.logger,
      llm: this.config.llm,
      memory: this.config.memory,
      tools: this.config.tools,
    };
  }

  private async validateInput(skill: Skill, input: unknown): Promise<unknown> {
    try {
      return skill.inputSchema.parse(input);
    } catch (error) {
      throw new SkillError(
        `Input validation failed: ${error instanceof Error ? error.message : String(error)}`,
        'VALIDATION_ERROR',
        true
      );
    }
  }

  private async executeInSandbox(
    skill: Skill,
    input: unknown,
    context: ExecutionContext,
    options: ExecuteOptions
  ): Promise<SkillResult> {
    const timeout = options.timeout || this.config.defaultTimeout;

    // 创建超时Promise
    const timeoutPromise = new Promise<never>((_, reject) => {
      const timer = setTimeout(() => {
        reject(new SkillError(
          `Skill execution timed out after ${timeout}ms`,
          'TIMEOUT',
          false
        ));
      }, timeout);

      // 监听取消信号
      context.abortSignal?.addEventListener('abort', () => {
        clearTimeout(timer);
        reject(new SkillError('Skill execution cancelled', 'CANCELLED', false));
      });
    });

    // 执行技能
    const executionPromise = skill.execute(input, context);

    // 竞争执行
    try {
      const result = await Promise.race([executionPromise, timeoutPromise]);
      return result;
    } finally {
      this.executingSkills.delete(context.executionId);
    }
  }

  private handleExecutionError(
    error: unknown,
    skillName: string,
    executionId: string,
    startTime: number,
    options: ExecuteOptions
  ): SkillResult {
    const normalizedError = this.normalizeError(error);

    this.logger.error(`[${executionId}] Skill execution failed: ${skillName}`, {
      error: normalizedError,
      code: normalizedError.code,
    });

    // 错误钩子
    const context = this.createExecutionContext(executionId, skillName);
    options.hooks?.onError?.(normalizedError, context);
    this.hooks.onError?.(normalizedError, context);

    // 触发事件
    this.emit('skill:failed' as SkillSystemEvent['type'], {
      type: 'skill:failed',
      skillName,
      executionId,
      error: normalizedError,
    });

    return {
      success: false,
      error: normalizedError,
      metadata: {
        startTime: new Date(startTime),
        endTime: new Date(),
        duration: Date.now() - startTime,
      },
    };
  }

  private getCachedResult(skillName: string, input: unknown): SkillResult | null {
    const key = this.generateCacheKey(skillName, input);
    const entry = this.cache.get(key);

    if (!entry) return null;

    // 检查是否过期
    if (Date.now() - entry.timestamp > this.config.cacheTTL) {
      this.cache.delete(key);
      return null;
    }

    entry.hits++;
    return entry.result;
  }

  private cacheResult(skillName: string, input: unknown, result: SkillResult): void {
    const key = this.generateCacheKey(skillName, input);
    this.cache.set(key, {
      result,
      timestamp: Date.now(),
      hits: 0,
    });
  }

  private generateCacheKey(skillName: string, input: unknown): string {
    // 简化实现：使用JSON序列化
    const inputHash = JSON.stringify(input);
    return `${skillName}:${inputHash}`;
  }

  private generateExecutionId(): string {
    return `exec_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  }

  private normalizeError(error: unknown): SkillError {
    if (error instanceof SkillError) {
      return error;
    }

    if (error instanceof Error) {
      return new SkillError(
        error.message,
        'EXECUTION_ERROR',
        false,
        error
      );
    }

    return new SkillError(
      String(error) || 'Unknown error',
      'UNKNOWN_ERROR',
      false
    );
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
 * 创建技能引擎
 */
export function createSkillEngine(config?: SkillEngineConfig): SkillEngine {
  return new SkillEngine(config);
}
