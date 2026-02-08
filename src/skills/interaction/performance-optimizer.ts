/**
 * Performance Optimizer
 *
 * 性能优化器 - 企业级性能优化方案
 *
 * 核心特性：
 * 1. 批量处理优化 (Batch Processing)
 * 2. 请求去重 (Request Deduplication)
 * 3. 连接池管理 (Connection Pool)
 * 4. 流式处理 (Streaming)
 * 5. 资源限流 (Rate Limiting)
 * 6. 性能监控 (Performance Monitoring)
 *
 * @module PerformanceOptimizer
 * @version 1.0.0
 * @standard Enterprise Grade
 */

import { EventEmitter } from 'events';

// ============================================================================
// Types
// ============================================================================

/** 批处理配置 */
export interface BatchConfig {
  /** 最大批大小 */
  maxSize: number;
  /** 最大等待时间 (ms) */
  maxWaitTime: number;
  /** 是否启用 */
  enabled: boolean;
}

/** 请求去重配置 */
export interface DeduplicationConfig {
  /** 去重窗口时间 (ms) */
  windowMs: number;
  /** 最大缓存请求数 */
  maxCacheSize: number;
  /** 是否启用 */
  enabled: boolean;
}

/** 连接池配置 */
export interface ConnectionPoolConfig {
  /** 最小连接数 */
  minConnections: number;
  /** 最大连接数 */
  maxConnections: number;
  /** 连接超时 (ms) */
  connectionTimeout: number;
  /** 空闲超时 (ms) */
  idleTimeout: number;
  /** 是否启用 */
  enabled: boolean;
}

/** 限流配置 */
export interface RateLimitConfig {
  /** 每秒最大请求数 */
  requestsPerSecond: number;
  /** 突发容量 */
  burstCapacity: number;
  /** 是否启用 */
  enabled: boolean;
}

/** 性能配置 */
export interface PerformanceConfig {
  batch?: Partial<BatchConfig>;
  deduplication?: Partial<DeduplicationConfig>;
  connectionPool?: Partial<ConnectionPoolConfig>;
  rateLimit?: Partial<RateLimitConfig>;
}

/** 性能指标 */
export interface PerformanceMetrics {
  /** 批处理统计 */
  batch: {
    totalBatches: number;
    totalItems: number;
    avgBatchSize: number;
    avgProcessingTime: number;
  };
  /** 去重统计 */
  deduplication: {
    totalRequests: number;
    deduplicatedRequests: number;
    deduplicationRate: number;
  };
  /** 连接池统计 */
  connectionPool: {
    totalConnections: number;
    activeConnections: number;
    idleConnections: number;
    waitingRequests: number;
  };
  /** 限流统计 */
  rateLimit: {
    totalRequests: number;
    allowedRequests: number;
    rejectedRequests: number;
    rejectionRate: number;
  };
}

/** 批处理任务 */
interface BatchTask<T, R> {
  id: string;
  item: T;
  resolve: (result: R) => void;
  reject: (error: Error) => void;
  timestamp: number;
}

/** 连接 */
interface Connection {
  id: string;
  createdAt: number;
  lastUsed: number;
  inUse: boolean;
  resource: unknown;
}

// ============================================================================
// Batch Processor
// ============================================================================

/**
 * 批处理器
 *
 * 将多个小请求合并为批量请求，减少网络开销
 */
export class BatchProcessor<T, R> extends EventEmitter {
  private config: BatchConfig;
  private queue: BatchTask<T, R>[] = [];
  private timer?: NodeJS.Timeout;
  private processing = false;
  private stats = {
    totalBatches: 0,
    totalItems: 0,
    totalProcessingTime: 0,
  };

  constructor(
    private processor: (items: T[]) => Promise<R[]>,
    config: Partial<BatchConfig> = {}
  ) {
    super();
    this.config = {
      maxSize: 100,
      maxWaitTime: 50,
      enabled: true,
      ...config,
    };
  }

  /**
   * 添加任务到批处理队列
   */
  async add(item: T): Promise<R> {
    if (!this.config.enabled) {
      const results = await this.processor([item]);
      return results[0];
    }

    return new Promise((resolve, reject) => {
      const task: BatchTask<T, R> = {
        id: `task_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
        item,
        resolve,
        reject,
        timestamp: Date.now(),
      };

      this.queue.push(task);
      this.emit('task:added', { id: task.id, queueSize: this.queue.length });

      // 检查是否需要立即处理
      if (this.queue.length >= this.config.maxSize) {
        this.flush();
      } else if (!this.timer) {
        // 设置定时器
        this.timer = setTimeout(() => {
          this.flush();
        }, this.config.maxWaitTime);
      }
    });
  }

  /**
   * 立即刷新队列
   */
  async flush(): Promise<void> {
    if (this.processing || this.queue.length === 0) return;

    this.processing = true;

    // 清除定时器
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = undefined;
    }

    // 取出当前队列中的所有任务
    const tasks = this.queue.splice(0, this.config.maxSize);
    const items = tasks.map((t) => t.item);

    const startTime = Date.now();

    try {
      this.emit('batch:start', { size: tasks.length });

      const results = await this.processor(items);

      // 分发结果
      tasks.forEach((task, index) => {
        const result = results[index];
        if (result !== undefined) {
          task.resolve(result);
        } else {
          task.reject(new Error('No result for task'));
        }
      });

      // 更新统计
      const processingTime = Date.now() - startTime;
      this.stats.totalBatches++;
      this.stats.totalItems += tasks.length;
      this.stats.totalProcessingTime += processingTime;

      this.emit('batch:complete', {
        size: tasks.length,
        processingTime,
      });
    } catch (error) {
      // 所有任务都失败
      tasks.forEach((task) => {
        task.reject(error as Error);
      });

      this.emit('batch:error', { error, size: tasks.length });
    } finally {
      this.processing = false;

      // 如果队列中还有任务，继续处理
      if (this.queue.length > 0) {
        this.flush();
      }
    }
  }

  /**
   * 获取统计信息
   */
  getStats() {
    return {
      ...this.stats,
      avgBatchSize: this.stats.totalBatches > 0 ? this.stats.totalItems / this.stats.totalBatches : 0,
      avgProcessingTime: this.stats.totalBatches > 0 ? this.stats.totalProcessingTime / this.stats.totalBatches : 0,
      queueSize: this.queue.length,
    };
  }

  /**
   * 清空队列
   */
  clear(): void {
    this.queue = [];
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = undefined;
    }
  }
}

// ============================================================================
// Request Deduplicator
// ============================================================================

/**
 * 请求去重器
 *
 * 在指定时间窗口内，相同请求只执行一次，其他请求共享结果
 */
export class RequestDeduplicator<K, V> extends EventEmitter {
  private config: DeduplicationConfig;
  private pending = new Map<K, Promise<V>>();
  private completed = new Map<K, { value: V; timestamp: number }>();
  private cleanupTimer?: NodeJS.Timeout;
  private stats = {
    totalRequests: 0,
    deduplicatedRequests: 0,
  };

  constructor(config: Partial<DeduplicationConfig> = {}) {
    super();
    this.config = {
      windowMs: 5000,
      maxCacheSize: 1000,
      enabled: true,
      ...config,
    };

    // 启动清理定时器
    this.startCleanup();
  }

  /**
   * 执行请求（自动去重）
   */
  async execute(key: K, factory: () => Promise<V>): Promise<V> {
    this.stats.totalRequests++;

    if (!this.config.enabled) {
      return factory();
    }

    // 检查是否已有进行中的请求
    const pending = this.pending.get(key);
    if (pending) {
      this.stats.deduplicatedRequests++;
      this.emit('deduplicated', { key });
      return pending;
    }

    // 检查缓存的结果
    const cached = this.completed.get(key);
    if (cached && Date.now() - cached.timestamp < this.config.windowMs) {
      this.stats.deduplicatedRequests++;
      this.emit('cache:hit', { key });
      return cached.value;
    }

    // 执行新请求
    const promise = factory()
      .then((value) => {
        // 移动到已完成缓存
        this.completed.set(key, { value, timestamp: Date.now() });
        this.pending.delete(key);

        // 检查缓存大小
        if (this.completed.size > this.config.maxCacheSize) {
          this.cleanupOldEntries();
        }

        this.emit('executed', { key, success: true });
        return value;
      })
      .catch((error) => {
        this.pending.delete(key);
        this.emit('executed', { key, success: false, error });
        throw error;
      });

    this.pending.set(key, promise);
    this.emit('pending', { key });

    return promise;
  }

  /**
   * 清除指定键的缓存
   */
  invalidate(key: K): boolean {
    const existed = this.completed.has(key);
    this.completed.delete(key);
    this.pending.delete(key);
    return existed;
  }

  /**
   * 清除所有缓存
   */
  clear(): void {
    this.completed.clear();
    this.pending.clear();
  }

  /**
   * 获取统计信息
   */
  getStats() {
    return {
      ...this.stats,
      deduplicationRate: this.stats.totalRequests > 0 ? this.stats.deduplicatedRequests / this.stats.totalRequests : 0,
      pendingCount: this.pending.size,
      cachedCount: this.completed.size,
    };
  }

  /**
   * 销毁
   */
  destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }
    this.clear();
    this.removeAllListeners();
  }

  private startCleanup(): void {
    this.cleanupTimer = setInterval(() => {
      this.cleanupOldEntries();
    }, this.config.windowMs);
  }

  private cleanupOldEntries(): void {
    const now = Date.now();
    const toDelete: K[] = [];

    for (const [key, entry] of this.completed) {
      if (now - entry.timestamp > this.config.windowMs) {
        toDelete.push(key);
      }
    }

    for (const key of toDelete) {
      this.completed.delete(key);
    }

    if (toDelete.length > 0) {
      this.emit('cleanup', { count: toDelete.length });
    }
  }
}

// ============================================================================
// Connection Pool
// ============================================================================

/**
 * 连接池
 *
 * 管理可重用连接的池
 */
export class ConnectionPool<T> extends EventEmitter {
  private config: ConnectionPoolConfig;
  private pool: Connection[] = [];
  private waitingQueue: Array<{
    resolve: (connection: Connection) => void;
    reject: (error: Error) => void;
    timestamp: number;
  }> = [];
  private factory: () => Promise<T>;
  private destroyConnection: (resource: T) => Promise<void>;
  private stats = {
    totalCreated: 0,
    totalDestroyed: 0,
    totalAcquired: 0,
    totalReleased: 0,
    totalTimeouts: 0,
  };

  constructor(
    factory: () => Promise<T>,
    destroyConnection: (resource: T) => Promise<void>,
    config: Partial<ConnectionPoolConfig> = {}
  ) {
    super();
    this.factory = factory;
    this.destroyConnection = destroyConnection;
    this.config = {
      minConnections: 2,
      maxConnections: 10,
      connectionTimeout: 5000,
      idleTimeout: 30000,
      enabled: true,
      ...config,
    };

    // 初始化最小连接数
    if (this.config.enabled) {
      this.initializePool();
    }
  }

  /**
   * 获取连接
   */
  async acquire(): Promise<T> {
    if (!this.config.enabled) {
      return this.factory();
    }

    this.stats.totalAcquired++;

    // 1. 查找空闲连接
    const idleConnection = this.pool.find((c) => !c.inUse);
    if (idleConnection) {
      idleConnection.inUse = true;
      idleConnection.lastUsed = Date.now();
      this.emit('acquired', { id: idleConnection.id, fromPool: true });
      return idleConnection.resource as T;
    }

    // 2. 创建新连接（如果未达到上限）
    if (this.pool.length < this.config.maxConnections) {
      const connection = await this.createConnection();
      connection.inUse = true;
      this.emit('acquired', { id: connection.id, fromPool: false });
      return connection.resource as T;
    }

    // 3. 等待可用连接
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        const index = this.waitingQueue.findIndex((w) => w.resolve === resolve);
        if (index > -1) {
          this.waitingQueue.splice(index, 1);
        }
        this.stats.totalTimeouts++;
        reject(new Error('Connection acquisition timeout'));
      }, this.config.connectionTimeout);

      this.waitingQueue.push({
        resolve: (conn) => {
          clearTimeout(timeout);
          resolve(conn.resource as T);
        },
        reject: (err) => {
          clearTimeout(timeout);
          reject(err);
        },
        timestamp: Date.now(),
      });

      this.emit('waiting', { queueSize: this.waitingQueue.length });
    });
  }

  /**
   * 释放连接
   */
  async release(resource: T): Promise<void> {
    if (!this.config.enabled) {
      await this.destroyConnection(resource);
      return;
    }

    this.stats.totalReleased++;

    const connection = this.pool.find((c) => c.resource === resource);
    if (!connection) {
      // 连接不在池中，直接销毁
      await this.destroyConnection(resource);
      return;
    }

    connection.inUse = false;
    connection.lastUsed = Date.now();

    // 检查是否有等待的请求
    if (this.waitingQueue.length > 0) {
      const waiter = this.waitingQueue.shift();
      if (waiter) {
        connection.inUse = true;
        waiter.resolve(connection);
        return;
      }
    }

    this.emit('released', { id: connection.id });
  }

  /**
   * 获取统计信息
   */
  getStats() {
    return {
      ...this.stats,
      totalConnections: this.pool.length,
      activeConnections: this.pool.filter((c) => c.inUse).length,
      idleConnections: this.pool.filter((c) => !c.inUse).length,
      waitingRequests: this.waitingQueue.length,
    };
  }

  /**
   * 清空连接池
   */
  async clear(): Promise<void> {
    // 拒绝所有等待的请求
    for (const waiter of this.waitingQueue) {
      waiter.reject(new Error('Connection pool cleared'));
    }
    this.waitingQueue = [];

    // 销毁所有连接
    for (const connection of this.pool) {
      await this.destroyConnection(connection.resource as T);
    }
    this.pool = [];
  }

  /**
   * 销毁
   */
  async destroy(): Promise<void> {
    await this.clear();
    this.removeAllListeners();
  }

  private async initializePool(): Promise<void> {
    for (let i = 0; i < this.config.minConnections; i++) {
      await this.createConnection();
    }
  }

  private async createConnection(): Promise<Connection> {
    const resource = await this.factory();
    const connection: Connection = {
      id: `conn_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      createdAt: Date.now(),
      lastUsed: Date.now(),
      inUse: false,
      resource,
    };

    this.pool.push(connection);
    this.stats.totalCreated++;

    this.emit('created', { id: connection.id });

    return connection;
  }
}

// ============================================================================
// Rate Limiter
// ============================================================================

/**
 * 令牌桶限流器
 *
 * 实现令牌桶算法进行请求限流
 */
export class RateLimiter extends EventEmitter {
  private config: RateLimitConfig;
  private tokens: number;
  private lastRefill: number;
  private stats = {
    totalRequests: 0,
    allowedRequests: 0,
    rejectedRequests: 0,
  };

  constructor(config: Partial<RateLimitConfig> = {}) {
    super();
    this.config = {
      requestsPerSecond: 100,
      burstCapacity: 150,
      enabled: true,
      ...config,
    };
    this.tokens = this.config.burstCapacity;
    this.lastRefill = Date.now();
  }

  /**
   * 尝试获取令牌
   */
  tryAcquire(): boolean {
    this.stats.totalRequests++;

    if (!this.config.enabled) {
      this.stats.allowedRequests++;
      return true;
    }

    this.refillTokens();

    if (this.tokens >= 1) {
      this.tokens--;
      this.stats.allowedRequests++;
      this.emit('allowed');
      return true;
    }

    this.stats.rejectedRequests++;
    this.emit('rejected');
    return false;
  }

  /**
   * 等待获取令牌
   */
  async acquire(): Promise<void> {
    while (!this.tryAcquire()) {
      // 计算等待时间
      const waitTime = 1000 / this.config.requestsPerSecond;
      await new Promise((resolve) => setTimeout(resolve, waitTime));
    }
  }

  /**
   * 获取统计信息
   */
  getStats() {
    return {
      ...this.stats,
      rejectionRate: this.stats.totalRequests > 0 ? this.stats.rejectedRequests / this.stats.totalRequests : 0,
      availableTokens: this.tokens,
    };
  }

  /**
   * 重置
   */
  reset(): void {
    this.tokens = this.config.burstCapacity;
    this.lastRefill = Date.now();
    this.stats = {
      totalRequests: 0,
      allowedRequests: 0,
      rejectedRequests: 0,
    };
  }

  private refillTokens(): void {
    const now = Date.now();
    const timePassed = (now - this.lastRefill) / 1000; // 转换为秒
    const tokensToAdd = timePassed * this.config.requestsPerSecond;

    this.tokens = Math.min(this.config.burstCapacity, this.tokens + tokensToAdd);
    this.lastRefill = now;
  }
}

// ============================================================================
// Performance Optimizer (Main Class)
// ============================================================================

/**
 * 性能优化器主类
 *
 * 整合所有性能优化组件
 */
export class PerformanceOptimizer extends EventEmitter {
  batchProcessors = new Map<string, BatchProcessor<unknown, unknown>>();
  deduplicators = new Map<string, RequestDeduplicator<unknown, unknown>>();
  connectionPools = new Map<string, ConnectionPool<unknown>>();
  rateLimiters = new Map<string, RateLimiter>();

  /**
   * 创建批处理器
   */
  createBatchProcessor<T, R>(
    name: string,
    processor: (items: T[]) => Promise<R[]>,
    config?: Partial<BatchConfig>
  ): BatchProcessor<T, R> {
    const batchProcessor = new BatchProcessor(processor, config);
    this.batchProcessors.set(name, batchProcessor as BatchProcessor<unknown, unknown>);
    return batchProcessor;
  }

  /**
   * 创建请求去重器
   */
  createDeduplicator<K, V>(
    name: string,
    config?: Partial<DeduplicationConfig>
  ): RequestDeduplicator<K, V> {
    const deduplicator = new RequestDeduplicator<K, V>(config);
    this.deduplicators.set(name, deduplicator as RequestDeduplicator<unknown, unknown>);
    return deduplicator;
  }

  /**
   * 创建连接池
   */
  createConnectionPool<T>(
    name: string,
    factory: () => Promise<T>,
    destroyConnection: (resource: T) => Promise<void>,
    config?: Partial<ConnectionPoolConfig>
  ): ConnectionPool<T> {
    const pool = new ConnectionPool(factory, destroyConnection, config);
    this.connectionPools.set(name, pool as ConnectionPool<unknown>);
    return pool;
  }

  /**
   * 创建限流器
   */
  createRateLimiter(name: string, config?: Partial<RateLimitConfig>): RateLimiter {
    const limiter = new RateLimiter(config);
    this.rateLimiters.set(name, limiter);
    return limiter;
  }

  /**
   * 获取所有统计信息
   */
  getAllStats(): PerformanceMetrics {
    const batchStats = Array.from(this.batchProcessors.values()).map((p) => p.getStats());
    const dedupStats = Array.from(this.deduplicators.values()).map((d) => d.getStats());
    const poolStats = Array.from(this.connectionPools.values()).map((p) => p.getStats());
    const rateLimitStats = Array.from(this.rateLimiters.values()).map((r) => r.getStats());

    return {
      batch: {
        totalBatches: batchStats.reduce((sum, s) => sum + s.totalBatches, 0),
        totalItems: batchStats.reduce((sum, s) => sum + s.totalItems, 0),
        avgBatchSize:
          batchStats.length > 0
            ? batchStats.reduce((sum, s) => sum + s.avgBatchSize, 0) / batchStats.length
            : 0,
        avgProcessingTime:
          batchStats.length > 0
            ? batchStats.reduce((sum, s) => sum + s.avgProcessingTime, 0) / batchStats.length
            : 0,
      },
      deduplication: {
        totalRequests: dedupStats.reduce((sum, s) => sum + s.totalRequests, 0),
        deduplicatedRequests: dedupStats.reduce((sum, s) => sum + s.deduplicatedRequests, 0),
        deduplicationRate:
          dedupStats.length > 0
            ? dedupStats.reduce((sum, s) => sum + s.deduplicationRate, 0) / dedupStats.length
            : 0,
      },
      connectionPool: {
        totalConnections: poolStats.reduce((sum, s) => sum + s.totalConnections, 0),
        activeConnections: poolStats.reduce((sum, s) => sum + s.activeConnections, 0),
        idleConnections: poolStats.reduce((sum, s) => sum + s.idleConnections, 0),
        waitingRequests: poolStats.reduce((sum, s) => sum + s.waitingRequests, 0),
      },
      rateLimit: {
        totalRequests: rateLimitStats.reduce((sum, s) => sum + s.totalRequests, 0),
        allowedRequests: rateLimitStats.reduce((sum, s) => sum + s.allowedRequests, 0),
        rejectedRequests: rateLimitStats.reduce((sum, s) => sum + s.rejectedRequests, 0),
        rejectionRate:
          rateLimitStats.length > 0
            ? rateLimitStats.reduce((sum, s) => sum + s.rejectionRate, 0) / rateLimitStats.length
            : 0,
      },
    };
  }

  /**
   * 销毁所有组件
   */
  async destroy(): Promise<void> {
    // 销毁批处理器
    for (const processor of this.batchProcessors.values()) {
      processor.clear();
    }
    this.batchProcessors.clear();

    // 销毁去重器
    for (const deduplicator of this.deduplicators.values()) {
      deduplicator.destroy();
    }
    this.deduplicators.clear();

    // 销毁连接池
    for (const pool of this.connectionPools.values()) {
      await pool.destroy();
    }
    this.connectionPools.clear();

    // 销毁限流器
    this.rateLimiters.clear();

    this.removeAllListeners();
  }
}

// ============================================================================
// Factory Functions
// ============================================================================

export function createPerformanceOptimizer(): PerformanceOptimizer {
  return new PerformanceOptimizer();
}

export function createBatchProcessor<T, R>(
  processor: (items: T[]) => Promise<R[]>,
  config?: Partial<BatchConfig>
): BatchProcessor<T, R> {
  return new BatchProcessor(processor, config);
}

export function createDeduplicator<K, V>(
  config?: Partial<DeduplicationConfig>
): RequestDeduplicator<K, V> {
  return new RequestDeduplicator(config);
}

export function createConnectionPool<T>(
  factory: () => Promise<T>,
  destroyConnection: (resource: T) => Promise<void>,
  config?: Partial<ConnectionPoolConfig>
): ConnectionPool<T> {
  return new ConnectionPool(factory, destroyConnection, config);
}

export function createRateLimiter(config?: Partial<RateLimitConfig>): RateLimiter {
  return new RateLimiter(config);
}

// Export types
export type {
  PerformanceConfig,
  PerformanceMetrics,
  BatchConfig,
  DeduplicationConfig,
  ConnectionPoolConfig,
  RateLimitConfig,
};
