/**
 * Fallback System - 降级系统
 *
 * 当主要服务不可用时提供降级方案
 *
 * 核心特性：
 * 1. 多级降级策略
 * 2. 自动降级和恢复
 * 3. 降级指标监控
 * 4. 优雅降级
 *
 * @module Fallback
 * @version 1.0.0
 */

export interface FallbackConfig<T> {
  /** 主要执行函数 */
  primary: () => Promise<T>;
  /** 降级函数列表（按优先级排序） */
  fallbacks: Array<{
    name: string;
    fn: () => Promise<T>;
    condition?: (error: Error) => boolean;
  }>;
  /** 缓存结果 */
  cacheResult?: boolean;
  /** 缓存 TTL (ms) */
  cacheTTL?: number;
  /** 降级超时 (ms) */
  fallbackTimeout?: number;
  /** 是否记录降级事件 */
  logFallbacks?: boolean;
}

export interface FallbackResult<T> {
  /** 是否成功 */
  success: boolean;
  /** 结果数据 */
  data?: T;
  /** 使用的策略 */
  strategy: 'primary' | 'fallback' | 'cache' | 'default';
  /** 降级层级 */
  fallbackLevel?: number;
  /** 错误信息 */
  error?: string;
  /** 执行时间 (ms) */
  duration: number;
  /** 是否从缓存获取 */
  fromCache?: boolean;
}

export interface FallbackMetrics {
  /** 主要策略成功次数 */
  primarySuccess: number;
  /** 主要策略失败次数 */
  primaryFailure: number;
  /** 降级使用统计 */
  fallbackUsage: Map<string, number>;
  /** 缓存命中次数 */
  cacheHits: number;
  /** 缓存未命中次数 */
  cacheMisses: number;
  /** 总降级次数 */
  totalFallbacks: number;
}

/**
 * 降级管理器
 */
export class FallbackManager<T> {
  private config: FallbackConfig<T>;
  private cache?: { data: T; expiresAt: number };
  private metrics: FallbackMetrics = {
    primarySuccess: 0,
    primaryFailure: 0,
    fallbackUsage: new Map(),
    cacheHits: 0,
    cacheMisses: 0,
    totalFallbacks: 0,
  };

  constructor(config: FallbackConfig<T>) {
    this.config = {
      cacheResult: true,
      cacheTTL: 60000,
      fallbackTimeout: 5000,
      logFallbacks: true,
      ...config,
    };
  }

  /**
   * 执行带降级的操作
   */
  async execute(): Promise<FallbackResult<T>> {
    const startTime = Date.now();

    // 1. 尝试主要策略
    try {
      const result = await this.config.primary();
      this.metrics.primarySuccess++;

      // 缓存结果
      if (this.config.cacheResult) {
        this.cache = {
          data: result,
          expiresAt: Date.now() + (this.config.cacheTTL || 60000),
        };
      }

      return {
        success: true,
        data: result,
        strategy: 'primary',
        duration: Date.now() - startTime,
      };
    } catch (primaryError) {
      this.metrics.primaryFailure++;

      // 2. 尝试降级策略
      for (let i = 0; i < this.config.fallbacks.length; i++) {
        const fallback = this.config.fallbacks[i];

        // 检查条件
        if (fallback.condition && !fallback.condition(primaryError as Error)) {
          continue;
        }

        try {
          const result = await this.executeWithTimeout(
            fallback.fn,
            this.config.fallbackTimeout || 5000
          );

          this.metrics.totalFallbacks++;
          this.metrics.fallbackUsage.set(
            fallback.name,
            (this.metrics.fallbackUsage.get(fallback.name) || 0) + 1
          );

          if (this.config.logFallbacks) {
            console.log(`[Fallback] Used fallback: ${fallback.name}`);
          }

          return {
            success: true,
            data: result,
            strategy: 'fallback',
            fallbackLevel: i + 1,
            duration: Date.now() - startTime,
          };
        } catch {
          // 继续下一个降级策略
          continue;
        }
      }

      // 3. 尝试缓存
      if (this.cache && this.cache.expiresAt > Date.now()) {
        this.metrics.cacheHits++;
        return {
          success: true,
          data: this.cache.data,
          strategy: 'cache',
          duration: Date.now() - startTime,
          fromCache: true,
        };
      }
      this.metrics.cacheMisses++;

      // 4. 所有策略都失败
      return {
        success: false,
        strategy: 'primary',
        error: (primaryError as Error).message,
        duration: Date.now() - startTime,
      };
    }
  }

  /**
   * 带超时的执行
   */
  private executeWithTimeout(
    fn: () => Promise<T>,
    timeout: number
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error('Fallback timeout'));
      }, timeout);

      fn()
        .then((result) => {
          clearTimeout(timer);
          resolve(result);
        })
        .catch((error) => {
          clearTimeout(timer);
          reject(error);
        });
    });
  }

  /**
   * 获取指标
   */
  getMetrics(): FallbackMetrics {
    return {
      ...this.metrics,
      fallbackUsage: new Map(this.metrics.fallbackUsage),
    };
  }

  /**
   * 清除缓存
   */
  clearCache(): void {
    this.cache = undefined;
  }

  /**
   * 重置指标
   */
  resetMetrics(): void {
    this.metrics = {
      primarySuccess: 0,
      primaryFailure: 0,
      fallbackUsage: new Map(),
      cacheHits: 0,
      cacheMisses: 0,
      totalFallbacks: 0,
    };
  }
}

/**
 * 创建降级管理器
 */
export function createFallback<T>(config: FallbackConfig<T>): FallbackManager<T> {
  return new FallbackManager(config);
}

/**
 * 带降级的执行包装器
 */
export async function withFallback<T>(
  primary: () => Promise<T>,
  fallbacks: Array<() => Promise<T>>,
  options?: {
    cacheResult?: boolean;
    cacheTTL?: number;
  }
): Promise<T> {
  const manager = createFallback({
    primary,
    fallbacks: fallbacks.map((fn, i) => ({
      name: `fallback-${i + 1}`,
      fn,
    })),
    ...options,
  });

  const result = await manager.execute();

  if (!result.success) {
    throw new Error(result.error || 'All fallback strategies failed');
  }

  return result.data!;
}
