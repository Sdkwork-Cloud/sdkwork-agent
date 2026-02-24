/**
 * Task Scheduler - 任务调度器
 *
 * 提供灵活的任务调度能力
 * - 延迟任务
 * - 定时任务
 * - 任务队列
 * - 任务依赖
 *
 * @module Framework/Scheduler
 * @version 1.0.0
 */

import { createLogger, type ILogger } from '../utils/logger.js';

export type TaskId = string;

export interface Task<T = unknown> {
  id: TaskId;
  name: string;
  handler: () => T | Promise<T>;
  priority: number;
  timeout?: number;
  retries?: number;
  retryDelay?: number;
  dependencies?: TaskId[];
  metadata?: Record<string, unknown>;
}

export interface TaskResult<T = unknown> {
  taskId: TaskId;
  success: boolean;
  result?: T;
  error?: Error;
  startTime: number;
  endTime: number;
  duration: number;
  attempts: number;
}

export interface ScheduledTask extends Task {
  scheduledAt: number;
  executeAt: number;
  interval?: number;
  repeat?: number;
  executedCount: number;
}

export interface SchedulerConfig {
  name: string;
  concurrency?: number;
  defaultTimeout?: number;
  defaultRetries?: number;
  enableLogging?: boolean;
  logger?: ILogger;
}

export interface SchedulerStats {
  totalTasks: number;
  completedTasks: number;
  failedTasks: number;
  pendingTasks: number;
  runningTasks: number;
  averageExecutionTime: number;
}

type TaskQueueItem = {
  task: Task;
  resolve: (result: TaskResult) => void;
  reject: (error: Error) => void;
};

export class TaskScheduler {
  private config: Required<Omit<SchedulerConfig, 'logger'>> & { logger?: ILogger };
  private logger: ILogger;
  private taskQueue: TaskQueueItem[] = [];
  private scheduledTasks: Map<TaskId, ScheduledTask> = new Map();
  private runningTasks: Map<TaskId, Promise<TaskResult>> = new Map();
  private timers: Map<TaskId, ReturnType<typeof setTimeout>> = new Map();
  private intervals: Map<TaskId, ReturnType<typeof setInterval>> = new Map();
  private stats = {
    totalTasks: 0,
    completedTasks: 0,
    failedTasks: 0,
    executionTimes: [] as number[],
  };
  private taskIdCounter = 0;
  private processing = false;
  private closed = false;

  constructor(config: SchedulerConfig) {
    this.config = {
      name: config.name,
      concurrency: config.concurrency ?? 5,
      defaultTimeout: config.defaultTimeout ?? 30000,
      defaultRetries: config.defaultRetries ?? 0,
      enableLogging: config.enableLogging ?? true,
      logger: config.logger,
    };
    this.logger = config.logger ?? createLogger({ name: `Scheduler:${config.name}` });
  }

  async execute<T>(task: Omit<Task<T>, 'id'>): Promise<TaskResult<T>> {
    if (this.closed) {
      throw new Error('Scheduler is closed');
    }

    const fullTask: Task<T> = {
      ...task,
      id: this.generateTaskId(),
      timeout: task.timeout ?? this.config.defaultTimeout,
      retries: task.retries ?? this.config.defaultRetries,
    };

    this.stats.totalTasks++;

    if (this.runningTasks.size >= this.config.concurrency) {
      return new Promise((resolve, reject) => {
        this.taskQueue.push({
          task: fullTask,
          resolve: resolve as (result: TaskResult) => void,
          reject,
        });
        this.taskQueue.sort((a, b) => b.task.priority - a.task.priority);
      });
    }

    return this.runTask(fullTask);
  }

  schedule<T>(
    task: Omit<Task<T>, 'id'>,
    delay: number,
    options?: { interval?: number; repeat?: number }
  ): TaskId {
    if (this.closed) {
      throw new Error('Scheduler is closed');
    }

    const taskId = this.generateTaskId();
    const scheduledTask: ScheduledTask = {
      ...task,
      id: taskId,
      scheduledAt: Date.now(),
      executeAt: Date.now() + delay,
      interval: options?.interval,
      repeat: options?.repeat ?? (options?.interval ? -1 : 1),
      executedCount: 0,
      timeout: task.timeout ?? this.config.defaultTimeout,
      retries: task.retries ?? this.config.defaultRetries,
    };

    this.scheduledTasks.set(taskId, scheduledTask);
    this.stats.totalTasks++;

    const timer = setTimeout(() => {
      this.executeScheduledTask(taskId);
    }, delay);

    this.timers.set(taskId, timer);

    this.logger.debug(`Task scheduled: ${task.name}`, { taskId, delay });
    return taskId;
  }

  scheduleInterval<T>(
    task: Omit<Task<T>, 'id'>,
    interval: number,
    options?: { delay?: number; repeat?: number }
  ): TaskId {
    const taskId = this.schedule(task, options?.delay ?? 0, {
      interval,
      repeat: options?.repeat ?? -1,
    });
    return taskId;
  }

  scheduleCron<T>(
    task: Omit<Task<T>, 'id'>,
    cronExpression: string
  ): TaskId {
    const taskId = this.generateTaskId();
    const nextRun = this.parseCron(cronExpression);

    if (nextRun === null) {
      throw new Error(`Invalid cron expression: ${cronExpression}`);
    }

    const scheduledTask: ScheduledTask = {
      ...task,
      id: taskId,
      scheduledAt: Date.now(),
      executeAt: nextRun,
      interval: undefined,
      repeat: -1,
      executedCount: 0,
      metadata: { cronExpression },
      timeout: task.timeout ?? this.config.defaultTimeout,
      retries: task.retries ?? this.config.defaultRetries,
    };

    this.scheduledTasks.set(taskId, scheduledTask);
    this.stats.totalTasks++;

    const scheduleNext = () => {
      const task = this.scheduledTasks.get(taskId);
      if (!task || task.repeat === 0) {
        this.cancel(taskId);
        return;
      }

      const next = this.parseCron(cronExpression);
      if (next === null) return;

      const delay = Math.max(0, next - Date.now());
      const timer = setTimeout(() => {
        this.executeScheduledTask(taskId);
        scheduleNext();
      }, delay);

      this.timers.set(taskId, timer);
    };

    scheduleNext();
    return taskId;
  }

  cancel(taskId: TaskId): boolean {
    const timer = this.timers.get(taskId);
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(taskId);
    }

    const interval = this.intervals.get(taskId);
    if (interval) {
      clearInterval(interval);
      this.intervals.delete(taskId);
    }

    const removed = this.scheduledTasks.delete(taskId);

    const queueIndex = this.taskQueue.findIndex(item => item.task.id === taskId);
    if (queueIndex !== -1) {
      const item = this.taskQueue.splice(queueIndex, 1)[0];
      item.reject(new Error('Task cancelled'));
    }

    if (removed) {
      this.logger.debug(`Task cancelled: ${taskId}`);
    }

    return removed;
  }

  async cancelAll(): Promise<void> {
    for (const taskId of this.timers.keys()) {
      this.cancel(taskId);
    }
    for (const taskId of this.intervals.keys()) {
      this.cancel(taskId);
    }
    this.taskQueue.forEach(item => {
      item.reject(new Error('All tasks cancelled'));
    });
    this.taskQueue = [];
    this.scheduledTasks.clear();
  }

  async close(): Promise<void> {
    if (this.closed) return;

    this.closed = true;
    await this.cancelAll();

    while (this.runningTasks.size > 0) {
      await Promise.all(this.runningTasks.values());
    }

    this.logger.info('Scheduler closed');
  }

  getStats(): SchedulerStats {
    const avgTime = this.stats.executionTimes.length > 0
      ? this.stats.executionTimes.reduce((a, b) => a + b, 0) / this.stats.executionTimes.length
      : 0;

    return {
      totalTasks: this.stats.totalTasks,
      completedTasks: this.stats.completedTasks,
      failedTasks: this.stats.failedTasks,
      pendingTasks: this.taskQueue.length + this.scheduledTasks.size,
      runningTasks: this.runningTasks.size,
      averageExecutionTime: avgTime,
    };
  }

  getScheduledTasks(): ScheduledTask[] {
    return Array.from(this.scheduledTasks.values());
  }

  getRunningTasks(): TaskId[] {
    return Array.from(this.runningTasks.keys());
  }

  private async runTask<T>(task: Task<T>): Promise<TaskResult<T>> {
    const startTime = Date.now();
    let attempts = 0;
    let lastError: Error | undefined;

    const maxAttempts = (task.retries ?? 0) + 1;

    while (attempts < maxAttempts) {
      attempts++;

      try {
        const result = await this.executeWithTimeout(task);
        const endTime = Date.now();
        const duration = endTime - startTime;

        this.stats.completedTasks++;
        this.stats.executionTimes.push(duration);
        if (this.stats.executionTimes.length > 100) {
          this.stats.executionTimes.shift();
        }

        this.logger.debug(`Task completed: ${task.name}`, { taskId: task.id, duration, attempts });

        return {
          taskId: task.id,
          success: true,
          result,
          startTime,
          endTime,
          duration,
          attempts,
        };
      } catch (error) {
        lastError = error as Error;

        if (attempts < maxAttempts && task.retryDelay) {
          await this.delay(task.retryDelay);
        }
      }
    }

    const endTime = Date.now();
    const duration = endTime - startTime;

    this.stats.failedTasks++;
    this.logger.error(`Task failed: ${task.name}`, { taskId: task.id, error: lastError, attempts });

    return {
      taskId: task.id,
      success: false,
      error: lastError,
      startTime,
      endTime,
      duration,
      attempts,
    };
  }

  private async executeWithTimeout<T>(task: Task<T>): Promise<T> {
    const timeout = task.timeout ?? this.config.defaultTimeout;

    return new Promise<T>((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Task timeout after ${timeout}ms`));
      }, timeout);

      Promise.resolve(task.handler())
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

  private async executeScheduledTask(taskId: TaskId): Promise<void> {
    const scheduledTask = this.scheduledTasks.get(taskId);
    if (!scheduledTask) return;

    scheduledTask.executedCount++;

    if (scheduledTask.repeat !== undefined && scheduledTask.repeat > 0) {
      scheduledTask.repeat--;
    }

    try {
      const taskToExecute: Omit<Task, 'id'> = {
        name: scheduledTask.name,
        handler: scheduledTask.handler,
        priority: scheduledTask.priority,
        timeout: scheduledTask.timeout,
        retries: scheduledTask.retries,
        retryDelay: scheduledTask.retryDelay,
        dependencies: scheduledTask.dependencies,
        metadata: scheduledTask.metadata,
      };
      await this.execute(taskToExecute);
    } catch (error) {
      this.logger.error(`Scheduled task failed: ${scheduledTask.name}`, { error });
    }

    if (scheduledTask.interval && scheduledTask.repeat !== 0) {
      scheduledTask.executeAt = Date.now() + scheduledTask.interval;
    } else if (scheduledTask.repeat === 0) {
      this.cancel(taskId);
    }
  }

  private processQueue(): void {
    if (this.processing || this.closed) return;
    this.processing = true;

    while (
      this.taskQueue.length > 0 &&
      this.runningTasks.size < this.config.concurrency
    ) {
      const item = this.taskQueue.shift()!;
      const promise = this.runTask(item.task);

      this.runningTasks.set(item.task.id, promise);

      promise
        .then(result => item.resolve(result))
        .catch(error => item.reject(error))
        .finally(() => {
          this.runningTasks.delete(item.task.id);
        });
    }

    this.processing = false;
  }

  private parseCron(expression: string): number | null {
    const parts = expression.trim().split(/\s+/);
    if (parts.length !== 5) return null;

    const now = new Date();
    const next = new Date(now);

    next.setSeconds(0);
    next.setMilliseconds(0);
    next.setMinutes(next.getMinutes() + 1);

    return next.getTime();
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private generateTaskId(): TaskId {
    return `task_${Date.now()}_${++this.taskIdCounter}`;
  }
}

export class TaskBuilder<T = unknown> {
  private task: Partial<Task<T>> = {};

  name(name: string): this {
    this.task.name = name;
    return this;
  }

  handler(fn: () => T | Promise<T>): this {
    this.task.handler = fn;
    return this;
  }

  priority(priority: number): this {
    this.task.priority = priority;
    return this;
  }

  timeout(ms: number): this {
    this.task.timeout = ms;
    return this;
  }

  retries(count: number, delay?: number): this {
    this.task.retries = count;
    this.task.retryDelay = delay;
    return this;
  }

  dependsOn(...taskIds: TaskId[]): this {
    this.task.dependencies = taskIds;
    return this;
  }

  metadata(data: Record<string, unknown>): this {
    this.task.metadata = data;
    return this;
  }

  build(): Omit<Task<T>, 'id'> {
    if (!this.task.name || !this.task.handler) {
      throw new Error('Task name and handler are required');
    }
    return {
      name: this.task.name,
      handler: this.task.handler,
      priority: this.task.priority ?? 0,
      timeout: this.task.timeout,
      retries: this.task.retries,
      retryDelay: this.task.retryDelay,
      dependencies: this.task.dependencies,
      metadata: this.task.metadata,
    };
  }
}

export function task<T = unknown>(): TaskBuilder<T> {
  return new TaskBuilder();
}

export function createScheduler(config: SchedulerConfig): TaskScheduler {
  return new TaskScheduler(config);
}
