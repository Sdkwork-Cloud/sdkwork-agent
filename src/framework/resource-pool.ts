/**
 * Resource Pool Manager - 资源池管理器
 *
 * 提供高效的资源管理和复用
 * - 对象池化
 * - 连接池管理
 * - 资源生命周期
 * - 自动回收和清理
 *
 * @module Framework/ResourcePool
 * @version 1.0.0
 */

import { createLogger, type ILogger } from '../utils/logger.js';

export interface ResourceFactory<T> {
  create(): T | Promise<T>;
  destroy?(resource: T): void | Promise<void>;
  validate?(resource: T): boolean | Promise<boolean>;
  reset?(resource: T): void | Promise<void>;
}

export interface PoolConfig {
  name: string;
  minSize: number;
  maxSize: number;
  acquireTimeout: number;
  idleTimeout: number;
  validationInterval: number;
  enableMetrics: boolean;
  logger?: ILogger;
}

export interface PoolStats {
  totalCreated: number;
  totalDestroyed: number;
  totalAcquired: number;
  totalReleased: number;
  currentSize: number;
  availableCount: number;
  inUseCount: number;
  waitQueueLength: number;
  averageAcquireTime: number;
  averageHoldTime: number;
}

interface PooledResource<T> {
  resource: T;
  id: string;
  createdAt: number;
  lastUsedAt: number;
  acquireCount: number;
  inUse: boolean;
}

interface WaitRequest {
  resolve: () => void;
  reject: (error: Error) => void;
  timestamp: number;
}

export class ResourcePool<T> {
  private factory: ResourceFactory<T>;
  private config: Required<Omit<PoolConfig, 'logger'>> & { logger?: ILogger };
  private logger: ILogger;
  private pool: Map<string, PooledResource<T>> = new Map();
  private available: Set<string> = new Set();
  private waitQueue: WaitRequest[] = [];
  private metrics = {
    totalCreated: 0,
    totalDestroyed: 0,
    totalAcquired: 0,
    totalReleased: 0,
    acquireTimes: [] as number[],
    holdTimes: [] as number[],
  };
  private validationTimer?: ReturnType<typeof setInterval>;
  private cleanupTimer?: ReturnType<typeof setInterval>;
  private idCounter = 0;
  private closed = false;

  constructor(factory: ResourceFactory<T>, config: PoolConfig) {
    this.factory = factory;
    this.config = {
      name: config.name,
      minSize: config.minSize ?? 0,
      maxSize: config.maxSize ?? 10,
      acquireTimeout: config.acquireTimeout ?? 30000,
      idleTimeout: config.idleTimeout ?? 300000,
      validationInterval: config.validationInterval ?? 60000,
      enableMetrics: config.enableMetrics ?? true,
      logger: config.logger,
    };
    this.logger = config.logger ?? createLogger({ name: `ResourcePool:${config.name}` });
  }

  async initialize(): Promise<void> {
    for (let i = 0; i < this.config.minSize; i++) {
      await this.createResource();
    }

    if (this.factory.validate) {
      this.validationTimer = setInterval(
        () => this.validateResources(),
        this.config.validationInterval
      );
    }

    this.cleanupTimer = setInterval(
      () => this.cleanupIdle(),
      this.config.idleTimeout / 2
    );

    this.logger.info(`Pool initialized with ${this.pool.size} resources`, {
      minSize: this.config.minSize,
      maxSize: this.config.maxSize,
    });
  }

  async acquire(timeout?: number): Promise<T> {
    if (this.closed) {
      throw new Error('Pool is closed');
    }

    const startTime = Date.now();
    const acquireTimeout = timeout ?? this.config.acquireTimeout;

    while (true) {
      if (this.available.size > 0) {
        const resourceId = this.available.values().next().value;
        if (resourceId) {
          this.available.delete(resourceId);
          const pooled = this.pool.get(resourceId)!;

          if (this.factory.validate && !(await this.factory.validate(pooled.resource))) {
            await this.destroyResource(resourceId);
            continue;
          }

          pooled.inUse = true;
          pooled.lastUsedAt = Date.now();
          pooled.acquireCount++;

          this.metrics.totalAcquired++;
          if (this.config.enableMetrics) {
            this.metrics.acquireTimes.push(Date.now() - startTime);
            if (this.metrics.acquireTimes.length > 100) {
              this.metrics.acquireTimes.shift();
            }
          }

          return pooled.resource;
        }
      }

      if (this.pool.size < this.config.maxSize) {
        const resource = await this.createResource();
        if (resource) {
          const pooled = this.pool.get(resource.id)!;
          pooled.inUse = true;
          pooled.lastUsedAt = Date.now();
          pooled.acquireCount++;

          this.metrics.totalAcquired++;
          return pooled.resource;
        }
      }

      if (Date.now() - startTime >= acquireTimeout) {
        throw new Error(`Acquire timeout after ${acquireTimeout}ms`);
      }

      await new Promise<void>((resolve, reject) => {
        const timer = setTimeout(() => {
          const index = this.waitQueue.findIndex(r => r.resolve === resolve);
          if (index !== -1) {
            this.waitQueue.splice(index, 1);
            reject(new Error(`Acquire timeout after ${acquireTimeout}ms`));
          }
        }, acquireTimeout - (Date.now() - startTime));

        this.waitQueue.push({
          resolve: () => {
            clearTimeout(timer);
            resolve();
          },
          reject: (err: Error) => {
            clearTimeout(timer);
            reject(err);
          },
          timestamp: Date.now(),
        });
      });

      if (this.available.size > 0) {
        continue;
      }
    }
  }

  async release(resource: T): Promise<void> {
    const entry = Array.from(this.pool.values()).find(p => p.resource === resource);
    if (!entry) {
      this.logger.warn('Attempting to release unknown resource');
      return;
    }

    if (!entry.inUse) {
      this.logger.warn('Resource was not acquired');
      return;
    }

    entry.inUse = false;
    entry.lastUsedAt = Date.now();

    if (this.factory.reset) {
      await this.factory.reset(entry.resource);
    }

    this.metrics.totalReleased++;
    if (this.config.enableMetrics && entry.acquireCount > 0) {
      const holdTime = Date.now() - entry.lastUsedAt;
      this.metrics.holdTimes.push(holdTime);
      if (this.metrics.holdTimes.length > 100) {
        this.metrics.holdTimes.shift();
      }
    }

    if (this.waitQueue.length > 0) {
      const request = this.waitQueue.shift()!;
      request.resolve();
    } else {
      this.available.add(entry.id);
    }
  }

  async withResource<R>(fn: (resource: T) => Promise<R>, timeout?: number): Promise<R> {
    const resource = await this.acquire(timeout);
    try {
      return await fn(resource);
    } finally {
      await this.release(resource);
    }
  }

  getStats(): PoolStats {
    const inUseCount = Array.from(this.pool.values()).filter(p => p.inUse).length;

    return {
      totalCreated: this.metrics.totalCreated,
      totalDestroyed: this.metrics.totalDestroyed,
      totalAcquired: this.metrics.totalAcquired,
      totalReleased: this.metrics.totalReleased,
      currentSize: this.pool.size,
      availableCount: this.available.size,
      inUseCount,
      waitQueueLength: this.waitQueue.length,
      averageAcquireTime: this.calculateAverage(this.metrics.acquireTimes),
      averageHoldTime: this.calculateAverage(this.metrics.holdTimes),
    };
  }

  async drain(): Promise<void> {
    this.logger.info('Draining pool...');

    for (const request of this.waitQueue) {
      request.reject(new Error('Pool is draining'));
    }
    this.waitQueue = [];

    for (const [id, pooled] of this.pool) {
      if (!pooled.inUse) {
        await this.destroyResource(id);
      }
    }

    this.logger.info('Pool drained', { remaining: this.pool.size });
  }

  async close(): Promise<void> {
    if (this.closed) return;

    this.closed = true;

    if (this.validationTimer) {
      clearInterval(this.validationTimer);
    }
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }

    await this.drain();

    for (const [id] of this.pool) {
      await this.destroyResource(id);
    }

    this.logger.info('Pool closed');
  }

  private async createResource(): Promise<{ id: string; resource: T } | null> {
    try {
      const resource = await this.factory.create();
      const id = this.generateId();
      const now = Date.now();

      const pooled: PooledResource<T> = {
        resource,
        id,
        createdAt: now,
        lastUsedAt: now,
        acquireCount: 0,
        inUse: false,
      };

      this.pool.set(id, pooled);
      this.available.add(id);
      this.metrics.totalCreated++;

      this.logger.debug('Resource created', { id });
      return { id, resource };
    } catch (error) {
      this.logger.error('Failed to create resource', { error });
      return null;
    }
  }

  private async destroyResource(id: string): Promise<void> {
    const pooled = this.pool.get(id);
    if (!pooled) return;

    if (pooled.inUse) {
      this.logger.warn('Attempting to destroy in-use resource', { id });
      return;
    }

    try {
      if (this.factory.destroy) {
        await this.factory.destroy(pooled.resource);
      }
    } catch (error) {
      this.logger.error('Failed to destroy resource', { error, id });
    }

    this.pool.delete(id);
    this.available.delete(id);
    this.metrics.totalDestroyed++;

    this.logger.debug('Resource destroyed', { id });
  }

  private async validateResources(): Promise<void> {
    for (const [id, pooled] of this.pool) {
      if (pooled.inUse) continue;

      try {
        const valid = this.factory.validate
          ? await this.factory.validate(pooled.resource)
          : true;

        if (!valid) {
          this.logger.debug('Resource validation failed, destroying', { id });
          await this.destroyResource(id);

          if (this.pool.size < this.config.minSize) {
            await this.createResource();
          }
        }
      } catch (error) {
        this.logger.error('Validation error', { error, id });
        await this.destroyResource(id);
      }
    }
  }

  private async cleanupIdle(): Promise<void> {
    const now = Date.now();
    const toDestroy: string[] = [];

    for (const [id, pooled] of this.pool) {
      if (pooled.inUse) continue;
      if (this.pool.size - toDestroy.length <= this.config.minSize) break;

      if (now - pooled.lastUsedAt > this.config.idleTimeout) {
        toDestroy.push(id);
      }
    }

    for (const id of toDestroy) {
      await this.destroyResource(id);
    }

    if (toDestroy.length > 0) {
      this.logger.debug('Cleaned up idle resources', { count: toDestroy.length });
    }
  }

  private calculateAverage(values: number[]): number {
    if (values.length === 0) return 0;
    return values.reduce((a, b) => a + b, 0) / values.length;
  }

  private generateId(): string {
    return `res_${Date.now()}_${++this.idCounter}`;
  }
}

export interface ConnectionPoolConfig extends PoolConfig {
  connectionFactory: () => Promise<unknown>;
  connectionValidator?: (conn: unknown) => Promise<boolean>;
  connectionDestroyer?: (conn: unknown) => Promise<void>;
}

export class ConnectionPool extends ResourcePool<unknown> {
  constructor(config: ConnectionPoolConfig) {
    super(
      {
        create: config.connectionFactory,
        validate: config.connectionValidator,
        destroy: config.connectionDestroyer,
      },
      config
    );
  }
}

export function createPool<T>(
  factory: ResourceFactory<T>,
  config: PoolConfig
): ResourcePool<T> {
  return new ResourcePool(factory, config);
}

export function createConnectionPool(config: ConnectionPoolConfig): ConnectionPool {
  return new ConnectionPool(config);
}
