/**
 * Async Queue and Backpressure - 异步队列和背压控制
 *
 * 提供高效的异步队列处理能力
 * - 异步队列
 * - 背压控制
 * - 优先级队列
 * - 批处理
 *
 * @module Framework/AsyncQueue
 * @version 1.0.0
 */

import { createLogger, type ILogger } from '../utils/logger.js';

export interface AsyncQueueConfig {
  name?: string;
  concurrency?: number;
  maxSize?: number;
  timeout?: number;
  logger?: ILogger;
}

export interface QueueItem<T = unknown, R = unknown> {
  id: string;
  data: T;
  priority?: number;
  addedAt: number;
  startedAt?: number;
  completedAt?: number;
  resolve: (result: R) => void;
  reject: (error: Error) => void;
}

export interface QueueStats {
  pending: number;
  processing: number;
  completed: number;
  failed: number;
  total: number;
  averageWaitTime: number;
  averageProcessTime: number;
}

export interface BackpressureConfig {
  name?: string;
  highWatermark?: number;
  lowWatermark?: number;
  strategy?: 'block' | 'drop' | 'dropOldest' | 'sample';
  sampleRate?: number;
  logger?: ILogger;
}

export interface BackpressureState {
  level: 'normal' | 'warning' | 'critical';
  queueSize: number;
  utilization: number;
}

type QueueProcessor<T, R> = (item: T) => R | Promise<R>;

export class AsyncQueue<T = unknown, R = unknown> {
  private config: Required<Omit<AsyncQueueConfig, 'logger'>> & { logger?: ILogger };
  private logger: ILogger;
  private queue: QueueItem<T, R>[] = [];
  private processing: Map<string, QueueItem<T, R>> = new Map();
  private processor?: QueueProcessor<T, R>;
  private stats = {
    completed: 0,
    failed: 0,
    total: 0,
    waitTimes: [] as number[],
    processTimes: [] as number[],
  };
  private idCounter = 0;
  private paused = false;
  private closed = false;

  constructor(config: AsyncQueueConfig = {}) {
    this.config = {
      name: config.name ?? 'AsyncQueue',
      concurrency: config.concurrency ?? 5,
      maxSize: config.maxSize ?? 1000,
      timeout: config.timeout ?? 30000,
      logger: config.logger,
    };
    this.logger = config.logger ?? createLogger({ name: this.config.name });
  }

  setProcessor(processor: QueueProcessor<T, R>): void {
    this.processor = processor;
    this.processNext();
  }

  async enqueue(data: T, priority?: number): Promise<R> {
    if (this.closed) {
      throw new Error('Queue is closed');
    }

    if (this.queue.length >= this.config.maxSize) {
      throw new Error('Queue is full');
    }

    return new Promise<R>((resolve, reject) => {
      const item: QueueItem<T, R> = {
        id: this.generateId(),
        data,
        priority: priority ?? 0,
        addedAt: Date.now(),
        resolve,
        reject,
      };

      this.queue.push(item);
      this.queue.sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));
      this.stats.total++;

      this.logger.debug(`Item enqueued: ${item.id}`, { priority, queueSize: this.queue.length });
      this.processNext();
    });
  }

  enqueueMany(items: Array<{ data: T; priority?: number }>): Promise<R[]> {
    return Promise.all(items.map(item => this.enqueue(item.data, item.priority)));
  }

  pause(): void {
    this.paused = true;
    this.logger.info('Queue paused');
  }

  resume(): void {
    this.paused = false;
    this.logger.info('Queue resumed');
    this.processNext();
  }

  async close(waitForCompletion = true): Promise<void> {
    this.closed = true;

    if (waitForCompletion) {
      while (this.processing.size > 0) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    } else {
      for (const item of this.processing.values()) {
        item.reject(new Error('Queue closed'));
      }
      this.processing.clear();

      for (const item of this.queue) {
        item.reject(new Error('Queue closed'));
      }
      this.queue = [];
    }

    this.logger.info('Queue closed', { processed: this.stats.completed, failed: this.stats.failed });
  }

  getStats(): QueueStats {
    const avgWait = this.stats.waitTimes.length > 0
      ? this.stats.waitTimes.reduce((a, b) => a + b, 0) / this.stats.waitTimes.length
      : 0;

    const avgProcess = this.stats.processTimes.length > 0
      ? this.stats.processTimes.reduce((a, b) => a + b, 0) / this.stats.processTimes.length
      : 0;

    return {
      pending: this.queue.length,
      processing: this.processing.size,
      completed: this.stats.completed,
      failed: this.stats.failed,
      total: this.stats.total,
      averageWaitTime: avgWait,
      averageProcessTime: avgProcess,
    };
  }

  getPending(): number {
    return this.queue.length;
  }

  isPaused(): boolean {
    return this.paused;
  }

  isClosed(): boolean {
    return this.closed;
  }

  private processNext(): void {
    if (this.paused || this.closed || !this.processor) return;

    while (this.queue.length > 0 && this.processing.size < this.config.concurrency) {
      const item = this.queue.shift()!;
      this.processItem(item);
    }
  }

  private async processItem(item: QueueItem<T, R>): Promise<void> {
    item.startedAt = Date.now();
    this.processing.set(item.id, item);

    const waitTime = item.startedAt - item.addedAt;
    this.stats.waitTimes.push(waitTime);
    if (this.stats.waitTimes.length > 100) {
      this.stats.waitTimes.shift();
    }

    try {
      const result = await this.executeWithTimeout(item.data);
      item.completedAt = Date.now();

      const processTime = item.completedAt - item.startedAt;
      this.stats.processTimes.push(processTime);
      if (this.stats.processTimes.length > 100) {
        this.stats.processTimes.shift();
      }

      this.stats.completed++;
      item.resolve(result);

      this.logger.debug(`Item completed: ${item.id}`, { processTime });
    } catch (error) {
      this.stats.failed++;
      item.reject(error as Error);

      this.logger.error(`Item failed: ${item.id}`, { error });
    } finally {
      this.processing.delete(item.id);
      this.processNext();
    }
  }

  private async executeWithTimeout(data: T): Promise<R> {
    if (!this.processor) {
      throw new Error('No processor set');
    }

    return new Promise<R>((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Processing timeout after ${this.config.timeout}ms`));
      }, this.config.timeout);

      Promise.resolve(this.processor!(data))
        .then(result => {
          clearTimeout(timer);
          resolve(result);
        })
        .catch(error => {
          clearTimeout(timer);
          reject(error);
        });
    });
  }

  private generateId(): string {
    return `item_${Date.now()}_${++this.idCounter}`;
  }
}

export class PriorityAsyncQueue<T = unknown, R = unknown> extends AsyncQueue<T, R> {
  private priorityBuckets: Map<number, T[]> = new Map();

  constructor(config: AsyncQueueConfig = {}) {
    super(config);
  }

  enqueueWithPriority(data: T, priority: number): Promise<R> {
    return this.enqueue(data, priority);
  }

  getPriorities(): number[] {
    return Array.from(this.priorityBuckets.keys()).sort((a, b) => b - a);
  }
}

export class BatchingQueue<T = unknown, R = unknown> {
  private config: { name: string; maxSize: number; timeout: number; batchSize: number; batchTimeout: number };
  private logger: ILogger;
  private batch: T[] = [];
  private batchTimer?: ReturnType<typeof setTimeout>;
  private processor?: (items: T[]) => R[] | Promise<R[]>;
  private pendingResolvers: Array<{ resolve: (result: R) => void; reject: (error: Error) => void }> = [];
  private closed = false;

  constructor(config: AsyncQueueConfig & { batchSize?: number; batchTimeout?: number } = {}) {
    this.config = {
      name: config.name ?? 'BatchingQueue',
      maxSize: config.maxSize ?? 10000,
      timeout: config.timeout ?? 60000,
      batchSize: config.batchSize ?? 100,
      batchTimeout: config.batchTimeout ?? 1000,
    };
    this.logger = config.logger ?? createLogger({ name: this.config.name });
  }

  setProcessor(processor: (items: T[]) => R[] | Promise<R[]>): void {
    this.processor = processor;
  }

  async enqueue(data: T): Promise<R> {
    if (this.closed) {
      throw new Error('Queue is closed');
    }

    return new Promise<R>((resolve, reject) => {
      this.batch.push(data);
      this.pendingResolvers.push({ resolve, reject });

      if (this.batch.length >= this.config.batchSize) {
        this.flush();
      } else if (!this.batchTimer) {
        this.batchTimer = setTimeout(() => this.flush(), this.config.batchTimeout);
      }
    });
  }

  async flush(): Promise<void> {
    if (this.batch.length === 0) return;

    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
      this.batchTimer = undefined;
    }

    const batch = [...this.batch];
    const resolvers = [...this.pendingResolvers];
    this.batch = [];
    this.pendingResolvers = [];

    if (!this.processor) {
      resolvers.forEach(r => r.reject(new Error('No processor set')));
      return;
    }

    try {
      const results = await this.processor(batch);

      for (let i = 0; i < resolvers.length; i++) {
        if (i < results.length) {
          resolvers[i].resolve(results[i]);
        } else {
          resolvers[i].reject(new Error('Missing result'));
        }
      }

      this.logger.debug(`Batch processed: ${batch.length} items`);
    } catch (error) {
      resolvers.forEach(r => r.reject(error as Error));
      this.logger.error('Batch processing failed', { error });
    }
  }

  async close(): Promise<void> {
    this.closed = true;
    await this.flush();
  }
}

export class BackpressureController {
  private config: Required<Omit<BackpressureConfig, 'logger'>> & { logger?: ILogger };
  private logger: ILogger;
  private queueSize = 0;
  private state: BackpressureState = { level: 'normal', queueSize: 0, utilization: 0 };
  private listeners: Set<(state: BackpressureState) => void> = new Set();

  constructor(config: BackpressureConfig = {}) {
    this.config = {
      name: config.name ?? 'BackpressureController',
      highWatermark: config.highWatermark ?? 1000,
      lowWatermark: config.lowWatermark ?? 500,
      strategy: config.strategy ?? 'block',
      sampleRate: config.sampleRate ?? 0.1,
      logger: config.logger,
    };
    this.logger = config.logger ?? createLogger({ name: this.config.name });
  }

  increment(): boolean {
    this.queueSize++;
    this.updateState();
    return this.shouldAccept();
  }

  decrement(): void {
    this.queueSize = Math.max(0, this.queueSize - 1);
    this.updateState();
  }

  getState(): BackpressureState {
    return { ...this.state };
  }

  shouldAccept(): boolean {
    switch (this.config.strategy) {
      case 'block':
        return this.queueSize < this.config.highWatermark;

      case 'drop':
        return this.state.level !== 'critical';

      case 'dropOldest':
        return true;

      case 'sample':
        if (this.state.level === 'critical') {
          return Math.random() < this.config.sampleRate;
        }
        return true;

      default:
        return true;
    }
  }

  onStateChange(listener: (state: BackpressureState) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  reset(): void {
    this.queueSize = 0;
    this.updateState();
  }

  private updateState(): void {
    const utilization = this.queueSize / this.config.highWatermark;
    const previousLevel = this.state.level;

    this.state = {
      level: utilization >= 1 ? 'critical' : utilization >= 0.8 ? 'warning' : 'normal',
      queueSize: this.queueSize,
      utilization,
    };

    if (this.state.level !== previousLevel) {
      this.logger.info(`Backpressure level changed: ${previousLevel} -> ${this.state.level}`, {
        queueSize: this.queueSize,
        utilization: `${(utilization * 100).toFixed(1)}%`,
      });

      for (const listener of this.listeners) {
        listener(this.state);
      }
    }
  }
}

export function createAsyncQueue<T = unknown, R = unknown>(config?: AsyncQueueConfig): AsyncQueue<T, R> {
  return new AsyncQueue<T, R>(config);
}

export function createPriorityQueue<T = unknown, R = unknown>(config?: AsyncQueueConfig): PriorityAsyncQueue<T, R> {
  return new PriorityAsyncQueue<T, R>(config);
}

export function createBatchingQueue<T = unknown, R = unknown>(
  config?: AsyncQueueConfig & { batchSize?: number; batchTimeout?: number }
): BatchingQueue<T, R> {
  return new BatchingQueue<T, R>(config);
}

export function createBackpressureController(config?: BackpressureConfig): BackpressureController {
  return new BackpressureController(config);
}
