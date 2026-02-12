/**
 * Node.js 原生进程/线程管理器
 * 
 * 完美设计目标：
 * 1. Worker Threads 线程池管理
 * 2. Child Process 进程池管理
 * 3. CPU 亲和性绑定
 * 4. 内存限制和监控
 * 5. 任务调度与负载均衡
 * 6. 优雅关闭与资源回收
 * 
 * @module ProcessManager
 * @version 2.0.0
 * @architecture Node.js Native Only
 */

import { Worker, isMainThread, parentPort, workerData } from 'worker_threads';
import { fork, ChildProcess } from 'child_process';
import { EventEmitter } from 'events';
import { cpus } from 'os';
import { Logger, createLogger } from '../utils/logger.js';

// ============================================================================
// 核心类型定义
// ============================================================================

export type ExecutionMode = 'worker' | 'process' | 'main';

export interface ProcessManagerConfig {
  /** Worker 线程池大小 (默认: CPU 核心数) */
  workerPoolSize?: number;
  /** 进程池大小 */
  processPoolSize?: number;
  /** 每个 Worker 的内存限制 (MB) */
  workerMemoryLimit?: number;
  /** 每个进程的内存限制 (MB) */
  processMemoryLimit?: number;
  /** 任务超时时间 (ms) */
  taskTimeout?: number;
  /** 空闲 Worker 存活时间 (ms) */
  idleTimeout?: number;
  /** 是否启用 CPU 亲和性 */
  enableCPUAffinity?: boolean;
  /** 是否启用资源监控 */
  enableMonitoring?: boolean;
  /** 日志 */
  logger?: Logger;
}

export interface TaskConfig<T = unknown, R = unknown> {
  /** 任务 ID */
  id: string;
  /** 执行模式 */
  mode: ExecutionMode;
  /** 任务处理器 */
  handler: (data: T) => Promise<R> | R;
  /** 输入数据 */
  data: T;
  /** 超时时间 (ms) */
  timeout?: number;
  /** 优先级 */
  priority?: number;
  /** 重试次数 */
  retries?: number;
  /** CPU 亲和性 (核心索引) */
  cpuAffinity?: number[];
}

export interface TaskResult<R = unknown> {
  /** 任务 ID */
  taskId: string;
  /** 是否成功 */
  success: boolean;
  /** 结果数据 */
  data?: R;
  /** 错误信息 */
  error?: Error;
  /** 执行时间 (ms) */
  executionTime: number;
  /** 使用的 Worker/进程 ID */
  executorId: string;
  /** 内存使用峰值 (MB) */
  peakMemoryUsage?: number;
}

export interface WorkerInfo {
  id: string;
  worker: Worker;
  status: 'idle' | 'busy' | 'terminated';
  currentTask?: string;
  stats: {
    tasksCompleted: number;
    tasksFailed: number;
    totalExecutionTime: number;
    peakMemoryUsage: number;
  };
  createdAt: Date;
  lastUsedAt: Date;
}

export interface ProcessInfo {
  id: string;
  process: ChildProcess;
  status: 'idle' | 'busy' | 'terminated';
  currentTask?: string;
  stats: {
    tasksCompleted: number;
    tasksFailed: number;
    totalExecutionTime: number;
  };
  createdAt: Date;
  lastUsedAt: Date;
}

export interface PoolStats {
  workers: {
    total: number;
    idle: number;
    busy: number;
    terminated: number;
  };
  processes: {
    total: number;
    idle: number;
    busy: number;
    terminated: number;
  };
  tasks: {
    pending: number;
    running: number;
    completed: number;
    failed: number;
  };
  performance: {
    averageExecutionTime: number;
    throughput: number; // tasks per second
    memoryUsage: number; // MB
  };
}

// ============================================================================
// Worker 线程池
// ============================================================================

export class WorkerPool extends EventEmitter {
  private config: Required<ProcessManagerConfig>;
  private logger: Logger;
  private workers = new Map<string, WorkerInfo>();
  private idleWorkers: string[] = [];
  private taskQueue: Array<{ task: TaskConfig<unknown, unknown>; resolve: (result: TaskResult<unknown>) => void; reject: (error: Error) => void }> = [];

  // 用于类型转换的辅助方法
  private wrapTask<T, R>(task: TaskConfig<T, R>): TaskConfig<unknown, unknown> {
    return {
      id: task.id,
      mode: task.mode,
      handler: async (data: unknown) => {
        const result = await task.handler(data as T);
        return result as unknown;
      },
      data: task.data as unknown,
      timeout: task.timeout,
    };
  }
  private isShuttingDown = false;
  private monitorInterval?: NodeJS.Timeout;

  constructor(config: ProcessManagerConfig = {}) {
    super();
    this.config = {
      workerPoolSize: config.workerPoolSize || cpus().length,
      processPoolSize: config.processPoolSize || 4,
      workerMemoryLimit: config.workerMemoryLimit || 512,
      processMemoryLimit: config.processMemoryLimit || 1024,
      taskTimeout: config.taskTimeout || 30000,
      idleTimeout: config.idleTimeout || 600000,
      enableCPUAffinity: config.enableCPUAffinity ?? false,
      enableMonitoring: config.enableMonitoring ?? true,
      logger: config.logger || createLogger({ name: 'WorkerPool' }),
    };
    this.logger = this.config.logger;
  }

  async initialize(): Promise<void> {
    this.logger.info(`Initializing Worker Pool with ${this.config.workerPoolSize} workers`);

    // 预创建 Worker 线程
    for (let i = 0; i < this.config.workerPoolSize; i++) {
      await this.createWorker();
    }

    // 启动监控
    if (this.config.enableMonitoring) {
      this.startMonitoring();
    }

    this.emit('initialized', { workerCount: this.workers.size });
  }

  async terminate(): Promise<void> {
    this.isShuttingDown = true;
    this.logger.info('Terminating Worker Pool');

    // 停止监控
    if (this.monitorInterval) {
      clearInterval(this.monitorInterval);
    }

    // 等待队列中的任务完成或拒绝
    for (const { reject } of this.taskQueue) {
      reject(new Error('Worker pool is shutting down'));
    }
    this.taskQueue = [];

    // 终止所有 Worker
    const terminationPromises: Promise<void>[] = [];
    for (const [id, info] of this.workers) {
      if (info.status !== 'terminated') {
        terminationPromises.push(this.terminateWorker(id));
      }
    }

    await Promise.all(terminationPromises);
    this.emit('terminated');
  }

  execute<T, R>(task: TaskConfig<T, R>): Promise<TaskResult<R>> {
    return new Promise((resolve, reject) => {
      if (this.isShuttingDown) {
        reject(new Error('Worker pool is shutting down'));
        return;
      }

      // 尝试立即执行
      const workerId = this.getIdleWorker();
      if (workerId) {
        this.runTask(workerId, task, resolve, reject);
        return;
      }

      // 加入队列
      this.taskQueue.push({
        task: this.wrapTask(task),
        resolve: (result) => resolve(result as TaskResult<R>),
        reject,
      });
      this.emit('task:queued', { taskId: task.id, queueLength: this.taskQueue.length });
    });
  }

  private async createWorker(): Promise<string> {
    const id = `worker_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const worker = new Worker(__filename, {
      workerData: { id, memoryLimit: this.config.workerMemoryLimit },
      resourceLimits: {
        maxOldGenerationSizeMb: this.config.workerMemoryLimit,
        maxYoungGenerationSizeMb: Math.floor(this.config.workerMemoryLimit / 4),
      },
    });

    const info: WorkerInfo = {
      id,
      worker,
      status: 'idle',
      stats: {
        tasksCompleted: 0,
        tasksFailed: 0,
        totalExecutionTime: 0,
        peakMemoryUsage: 0,
      },
      createdAt: new Date(),
      lastUsedAt: new Date(),
    };

    worker.on('message', (result: TaskResult) => {
      this.handleTaskComplete(id, result);
    });

    worker.on('error', (error: Error) => {
      this.logger.error(`Worker ${id} error:`, { error: error.message });
      this.handleWorkerError(id, error);
    });

    worker.on('exit', (code) => {
      if (code !== 0) {
        this.logger.error(`Worker ${id} exited with code ${code}`);
        this.handleWorkerExit(id);
      }
    });

    this.workers.set(id, info);
    this.idleWorkers.push(id);

    this.logger.debug(`Created worker: ${id}`);
    this.emit('worker:created', { id });

    return id;
  }

  private async terminateWorker(id: string): Promise<void> {
    const info = this.workers.get(id);
    if (!info || info.status === 'terminated') return;

    info.status = 'terminated';

    // 发送终止信号
    await info.worker.terminate();

    this.workers.delete(id);
    const idleIndex = this.idleWorkers.indexOf(id);
    if (idleIndex > -1) {
      this.idleWorkers.splice(idleIndex, 1);
    }

    this.logger.debug(`Terminated worker: ${id}`);
    this.emit('worker:terminated', { id });
  }

  private getIdleWorker(): string | null {
    while (this.idleWorkers.length > 0) {
      const id = this.idleWorkers.shift()!;
      const info = this.workers.get(id);
      if (info && info.status === 'idle') {
        return id;
      }
    }
    return null;
  }

  private runTask<T, R>(
    workerId: string,
    task: TaskConfig<T, R>,
    resolve: (result: TaskResult<R>) => void,
    reject: (error: Error) => void
  ): void {
    const info = this.workers.get(workerId);
    if (!info) {
      reject(new Error(`Worker ${workerId} not found`));
      return;
    }

    info.status = 'busy';
    info.currentTask = task.id;
    info.lastUsedAt = new Date();

    const startTime = Date.now();

    // 设置超时
    const timeout = setTimeout(() => {
      reject(new Error(`Task ${task.id} timeout`));
      this.terminateWorker(workerId); // 终止超时的 Worker
    }, task.timeout || this.config.taskTimeout);

    // 发送任务到 Worker
    info.worker.postMessage({
      type: 'execute',
      task: {
        id: task.id,
        handler: task.handler.toString(),
        data: task.data,
      },
    });

    // 监听结果
    const onMessage = (result: TaskResult<R>) => {
      if (result.taskId === task.id) {
        clearTimeout(timeout);
        info.worker.off('message', onMessage);

        const executionTime = Date.now() - startTime;
        const finalResult: TaskResult<R> = {
          ...result,
          executionTime,
          executorId: workerId,
        };

        if (result.success) {
          resolve(finalResult);
        } else {
          reject(result.error || new Error('Task failed'));
        }

        // 回收 Worker
        this.recycleWorker(workerId);
      }
    };

    info.worker.on('message', onMessage);

    this.emit('task:started', { taskId: task.id, workerId });
  }

  private recycleWorker(id: string): void {
    const info = this.workers.get(id);
    if (!info || info.status === 'terminated') return;

    info.status = 'idle';
    info.currentTask = undefined;
    info.lastUsedAt = new Date();
    this.idleWorkers.push(id);

    // 处理队列中的下一个任务
    this.processQueue();

    this.emit('worker:recycled', { id });
  }

  private processQueue(): void {
    if (this.taskQueue.length === 0) return;

    const workerId = this.getIdleWorker();
    if (!workerId) return;

    const { task, resolve, reject } = this.taskQueue.shift()!;
    this.runTask(workerId, task, resolve, reject);

    this.emit('task:dequeued', { taskId: task.id, queueLength: this.taskQueue.length });
  }

  private handleTaskComplete(workerId: string, result: TaskResult): void {
    const info = this.workers.get(workerId);
    if (!info) return;

    if (result.success) {
      info.stats.tasksCompleted++;
    } else {
      info.stats.tasksFailed++;
    }

    info.stats.totalExecutionTime += result.executionTime;
    if (result.peakMemoryUsage) {
      info.stats.peakMemoryUsage = Math.max(info.stats.peakMemoryUsage, result.peakMemoryUsage);
    }
  }

  private handleWorkerError(id: string, error: Error): void {
    const info = this.workers.get(id);
    if (!info) return;

    info.stats.tasksFailed++;
    this.emit('worker:error', { id, error });

    this.terminateWorker(id).then(() => {
      if (!this.isShuttingDown) {
        this.createWorker();
      }
    }).catch((err) => {
      this.logger.error('Failed to restart worker', { id, error: err });
    });
  }

  private handleWorkerExit(id: string): void {
    this.workers.delete(id);
    const idleIndex = this.idleWorkers.indexOf(id);
    if (idleIndex > -1) {
      this.idleWorkers.splice(idleIndex, 1);
    }

    // 重启 Worker
    if (!this.isShuttingDown) {
      this.createWorker();
    }
  }

  private startMonitoring(): void {
    this.monitorInterval = setInterval(() => {
      const stats = this.getStats();
      this.emit('monitor:stats', stats);

      // 检查空闲 Worker 是否需要清理
      const now = Date.now();
      for (const id of this.idleWorkers) {
        const info = this.workers.get(id);
        if (info && now - info.lastUsedAt.getTime() > this.config.idleTimeout) {
          if (this.workers.size > this.config.workerPoolSize) {
            this.terminateWorker(id);
          }
        }
      }
    }, 30000); // 每 30 秒检查一次
  }

  getStats(): PoolStats {
    let idleCount = 0;
    let busyCount = 0;
    let terminatedCount = 0;
    let totalExecutionTime = 0;
    let totalTasksCompleted = 0;

    for (const info of this.workers.values()) {
      if (info.status === 'idle') idleCount++;
      else if (info.status === 'busy') busyCount++;
      else if (info.status === 'terminated') terminatedCount++;

      totalExecutionTime += info.stats.totalExecutionTime;
      totalTasksCompleted += info.stats.tasksCompleted;
    }

    const totalWorkers = this.workers.size;
    const averageExecutionTime = totalTasksCompleted > 0 ? totalExecutionTime / totalTasksCompleted : 0;

    return {
      workers: {
        total: totalWorkers,
        idle: idleCount,
        busy: busyCount,
        terminated: terminatedCount,
      },
      processes: { total: 0, idle: 0, busy: 0, terminated: 0 }, // 进程池暂未实现
      tasks: {
        pending: this.taskQueue.length,
        running: busyCount,
        completed: totalTasksCompleted,
        failed: Array.from(this.workers.values()).reduce((sum, w) => sum + w.stats.tasksFailed, 0),
      },
      performance: {
        averageExecutionTime,
        throughput: totalTasksCompleted / (totalExecutionTime / 1000 || 1),
        memoryUsage: process.memoryUsage().heapUsed / 1024 / 1024,
      },
    };
  }
}

// ============================================================================
// Worker 线程执行逻辑
// ============================================================================

// 预定义的操作处理器映射
const ALLOWED_OPERATIONS: Record<string, (data: unknown) => Promise<unknown>> = {
  'skill:execute': async (data) => {
    const { skillName, params, skillRegistry } = data as { skillName: string; params: unknown; skillRegistry: unknown };
    // Skill 执行逻辑
    return { success: true, skillName, params };
  },
  'tool:call': async (data) => {
    const { toolName, args } = data as { toolName: string; args: unknown };
    // 工具调用逻辑
    return { success: true, toolName, args };
  },
  'llm:complete': async (data) => {
    const { prompt, options } = data as { prompt: string; options?: unknown };
    // LLM 调用逻辑
    return { success: true, prompt, options };
  },
  'data:process': async (data) => {
    const { operation, input } = data as { operation: string; input: unknown };
    // 数据处理逻辑
    return { success: true, operation, input };
  },
  'math:calculate': async (data) => {
    const { expression } = data as { expression: string };
    const safeMathExpr = /^[0-9+\-*/().%\sMath.PI|Math.E|Math.sqrt|Math.pow|Math.abs|Math.floor|Math.ceil|Math.round|Math.min|Math.max|Math.sin|Math.cos|Math.tan|Math.log|Math.exp]+$/;
    if (!safeMathExpr.test(expression)) {
      return { success: false, error: 'Invalid math expression' };
    }
    try {
      const mathFunc = new Function('Math', `'use strict'; return (${expression})`);
      const result = mathFunc(Math);
      if (typeof result !== 'number' || !Number.isFinite(result)) {
        return { success: false, error: 'Invalid result: not a finite number' };
      }
      return { success: true, result };
    } catch {
      return { success: false, error: 'Failed to evaluate expression' };
    }
  },
};

if (!isMainThread) {
  // Worker 线程代码
  const { id, memoryLimit } = workerData as { id: string; memoryLimit: number };

  parentPort?.on('message', async (message: { type: string; task: { id: string; operation: string; data: unknown } }) => {
    if (message.type !== 'execute') return;

    const { task } = message;
    const startTime = Date.now();
    const startMemory = process.memoryUsage().heapUsed / 1024 / 1024;

    try {
      // 安全检查：验证操作是否在允许列表中
      const handler = ALLOWED_OPERATIONS[task.operation];
      if (!handler) {
        throw new Error(`Unknown or unauthorized operation: ${task.operation}`);
      }

      const result = await handler(task.data);

      const endMemory = process.memoryUsage().heapUsed / 1024 / 1024;

      parentPort?.postMessage({
        taskId: task.id,
        success: true,
        data: result,
        executionTime: Date.now() - startTime,
        peakMemoryUsage: Math.max(0, endMemory - startMemory),
      });
    } catch (error) {
      parentPort?.postMessage({
        taskId: task.id,
        success: false,
        error: error instanceof Error ? error.message : String(error),
        executionTime: Date.now() - startTime,
      });
    }
  });
}

// ============================================================================
// 进程管理器
// ============================================================================

export class ProcessManager extends EventEmitter {
  private workerPool: WorkerPool;
  private config: Required<ProcessManagerConfig>;
  private logger: Logger;

  constructor(config: ProcessManagerConfig = {}) {
    super();
    this.config = {
      workerPoolSize: config.workerPoolSize || cpus().length,
      processPoolSize: config.processPoolSize || 4,
      workerMemoryLimit: config.workerMemoryLimit || 512,
      processMemoryLimit: config.processMemoryLimit || 1024,
      taskTimeout: config.taskTimeout || 30000,
      idleTimeout: config.idleTimeout || 600000,
      enableCPUAffinity: config.enableCPUAffinity ?? false,
      enableMonitoring: config.enableMonitoring ?? true,
      logger: config.logger || createLogger({ name: 'ProcessManager' }),
    };
    this.logger = this.config.logger;
    this.workerPool = new WorkerPool(config);
  }

  async initialize(): Promise<void> {
    await this.workerPool.initialize();
    this.logger.info('Process Manager initialized');
  }

  async terminate(): Promise<void> {
    await this.workerPool.terminate();
    this.logger.info('Process Manager terminated');
  }

  execute<T, R>(task: TaskConfig<T, R>): Promise<TaskResult<R>> {
    if (task.mode === 'worker') {
      return this.workerPool.execute(task);
    }

    // TODO: 实现进程池执行
    if (task.mode === 'process') {
      throw new Error('Process pool not implemented yet');
    }

    // 主线程执行
    return this.executeInMainThread(task);
  }

  private async executeInMainThread<T, R>(task: TaskConfig<T, R>): Promise<TaskResult<R>> {
    const startTime = Date.now();
    const startMemory = process.memoryUsage().heapUsed / 1024 / 1024;

    try {
      const result = await task.handler(task.data);
      const endMemory = process.memoryUsage().heapUsed / 1024 / 1024;

      return {
        taskId: task.id,
        success: true,
        data: result,
        executionTime: Date.now() - startTime,
        executorId: 'main',
        peakMemoryUsage: Math.max(0, endMemory - startMemory),
      };
    } catch (error) {
      return {
        taskId: task.id,
        success: false,
        error: error instanceof Error ? error : new Error(String(error)),
        executionTime: Date.now() - startTime,
        executorId: 'main',
      };
    }
  }

  getStats(): PoolStats {
    return this.workerPool.getStats();
  }
}

// ============================================================================
// 工厂函数
// ============================================================================

export function createProcessManager(config?: ProcessManagerConfig): ProcessManager {
  return new ProcessManager(config);
}

// ============================================================================
// 导出
// ============================================================================

// Types are exported from index.ts
