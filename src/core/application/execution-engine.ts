/**
 * Advanced Execution Engine
 * Supports planning, retry, timeout, parallel execution
 * Reference: Temporal, AWS Step Functions, LangGraph
 */

import { EventEmitter } from '../../utils/event-emitter';
import { v4 as uuidv4 } from 'uuid';

// ============================================================================
// Core Types
// ============================================================================

export type TaskStatus =
  | 'pending'      // 等待执行
  | 'scheduled'    // 已调度
  | 'running'      // 执行中
  | 'paused'       // 已暂停
  | 'completed'    // 已完成
  | 'failed'       // 已失败
  | 'cancelled'    // 已取消
  | 'timeout';     // 已超时

export type ExecutionStrategy =
  | 'sequential'   // 顺序执行
  | 'parallel'     // 并行执行
  | 'race'         // 竞争执行（第一个完成即返回）
  | 'all'          // 全部完成
  | 'dag';         // DAG执行（依赖图）

export interface TaskConfig<TInput = unknown, TOutput = unknown> {
  id: string;
  name: string;
  description?: string;
  
  // Execution
  execute: (input: TInput, context: TaskContext) => Promise<TOutput>;
  
  // Retry policy
  retry?: {
    maxAttempts: number;
    delay: number;
    backoff: 'fixed' | 'linear' | 'exponential';
    maxDelay?: number;
    retryableErrors?: string[];
  };
  
  // Timeout
  timeout?: number;
  
  // Dependencies (for DAG)
  dependencies?: string[];
  
  // Conditional execution
  condition?: (input: TInput, context: TaskContext) => boolean | Promise<boolean>;
  
  // Compensation (rollback)
  compensate?: (input: TInput, output: TOutput, context: TaskContext) => Promise<void>;
}

export interface TaskContext {
  readonly taskId: string;
  readonly executionId: string;
  readonly attempt: number;
  readonly startTime: number;
  
  // State
  getState<T>(key: string): T | undefined;
  setState<T>(key: string, value: T): void;
  
  // Signals
  signal: AbortSignal;
  
  // Logging
  log: (level: 'debug' | 'info' | 'warn' | 'error', message: string, meta?: unknown) => void;
  
  // Metrics
  recordMetric: (name: string, value: number, tags?: Record<string, string>) => void;
}

export interface TaskResult<T = unknown> {
  taskId: string;
  status: TaskStatus;
  output?: T;
  error?: Error;
  duration: number;
  attempts: number;
  startedAt: number;
  completedAt?: number;
}

export interface ExecutionPlan {
  id: string;
  name: string;
  strategy: ExecutionStrategy;
  tasks: TaskConfig[];
  globalTimeout?: number;
  onTaskComplete?: (result: TaskResult) => void | Promise<void>;
  onTaskError?: (result: TaskResult) => void | Promise<void>;
}

export interface ExecutionContext {
  readonly executionId: string;
  readonly plan: ExecutionPlan;
  readonly startTime: number;
  
  // Global state
  getGlobalState<T>(key: string): T | undefined;
  setGlobalState<T>(key: string, value: T): void;
  
  // Task results
  getTaskResult(taskId: string): TaskResult | undefined;
  getAllResults(): Map<string, TaskResult>;
  
  // Cancellation
  cancel(): void;
  isCancelled(): boolean;
}

export interface ExecutionResult {
  executionId: string;
  status: 'completed' | 'failed' | 'cancelled' | 'timeout';
  results: Map<string, TaskResult>;
  duration: number;
  startedAt: number;
  completedAt: number;
}

// ============================================================================
// Execution Engine
// ============================================================================

export interface ExecutionEngine {
  execute<T>(plan: ExecutionPlan, input?: T): Promise<ExecutionResult>;
  executeStream<T>(plan: ExecutionPlan, input?: T): AsyncGenerator<TaskResult>;
  cancel(executionId: string): void;
  pause(executionId: string): void;
  resume(executionId: string): void;
}

export class ExecutionEngineImpl extends EventEmitter implements ExecutionEngine {
  private _executions = new Map<string, ExecutionContextImpl>();
  private _abortControllers = new Map<string, AbortController>();

  async execute<T>(plan: ExecutionPlan, input?: T): Promise<ExecutionResult> {
    const executionId = uuidv4();
    const abortController = new AbortController();
    this._abortControllers.set(executionId, abortController);

    const context = new ExecutionContextImpl(executionId, plan, abortController);
    this._executions.set(executionId, context);

    this.emit('execution:started', { executionId, plan: plan.id });

    const startTime = Date.now();

    try {
      // Set global timeout
      if (plan.globalTimeout) {
        setTimeout(() => {
          abortController.abort();
          context._setStatus('timeout');
        }, plan.globalTimeout);
      }

      // Execute based on strategy
      switch (plan.strategy) {
        case 'sequential':
          await this._executeSequential(plan, input, context);
          break;
        case 'parallel':
          await this._executeParallel(plan, input, context);
          break;
        case 'race':
          await this._executeRace(plan, input, context);
          break;
        case 'all':
          await this._executeAll(plan, input, context);
          break;
        case 'dag':
          await this._executeDAG(plan, input, context);
          break;
        default:
          throw new Error(`Unknown execution strategy: ${plan.strategy}`);
      }

      const status = context.isCancelled() ? 'cancelled' :
                     context._getStatus() === 'timeout' ? 'timeout' :
                     context._hasFailures() ? 'failed' : 'completed';

      const result: ExecutionResult = {
        executionId,
        status,
        results: context.getAllResults(),
        duration: Date.now() - startTime,
        startedAt: startTime,
        completedAt: Date.now(),
      };

      this.emit('execution:completed', result);
      return result;

    } catch (error) {
      const result: ExecutionResult = {
        executionId,
        status: 'failed',
        results: context.getAllResults(),
        duration: Date.now() - startTime,
        startedAt: startTime,
        completedAt: Date.now(),
      };

      this.emit('execution:failed', { executionId, error });
      return result;
    } finally {
      this._executions.delete(executionId);
      this._abortControllers.delete(executionId);
    }
  }

  async *executeStream<T>(plan: ExecutionPlan, input?: T): AsyncGenerator<TaskResult> {
    const executionId = uuidv4();
    const abortController = new AbortController();
    this._abortControllers.set(executionId, abortController);

    const context = new ExecutionContextImpl(executionId, plan, abortController);
    this._executions.set(executionId, context);

    this.emit('execution:started', { executionId, plan: plan.id });

    const resultQueue: TaskResult[] = [];
    let completed = false;

    // Execute and collect results
    const executePromise = (async () => {
      try {
        switch (plan.strategy) {
          case 'sequential':
            await this._executeSequential(plan, input, context, (result) => {
              resultQueue.push(result);
            });
            break;
          case 'parallel':
            await this._executeParallel(plan, input, context, (result) => {
              resultQueue.push(result);
            });
            break;
          case 'dag':
            await this._executeDAG(plan, input, context, (result) => {
              resultQueue.push(result);
            });
            break;
          default:
            throw new Error(`Stream not supported for strategy: ${plan.strategy}`);
        }
      } finally {
        completed = true;
      }
    })();

    // Yield results as they complete
    while (!completed || resultQueue.length > 0) {
      if (resultQueue.length > 0) {
        yield resultQueue.shift()!;
      } else {
        await new Promise(resolve => setTimeout(resolve, 10));
      }
    }

    await executePromise;

    this._executions.delete(executionId);
    this._abortControllers.delete(executionId);
  }

  cancel(executionId: string): void {
    const controller = this._abortControllers.get(executionId);
    if (controller) {
      controller.abort();
      this.emit('execution:cancelled', { executionId });
    }
  }

  pause(executionId: string): void {
    const context = this._executions.get(executionId);
    if (context) {
      context._pause();
    }
  }

  resume(executionId: string): void {
    const context = this._executions.get(executionId);
    if (context) {
      context._resume();
    }
  }

  // ============================================================================
  // Private Execution Methods
  // ============================================================================

  private async _executeSequential<T>(
    plan: ExecutionPlan,
    input: T,
    context: ExecutionContextImpl,
    onResult?: (result: TaskResult) => void
  ): Promise<void> {
    let currentInput = input;

    for (const task of plan.tasks) {
      if (context.isCancelled()) break;

      const result = await this._executeTask(task, currentInput, context);
      context._setTaskResult(task.id, result);

      if (onResult) onResult(result);
      if (plan.onTaskComplete) await plan.onTaskComplete(result);

      if (result.status === 'failed') {
        if (plan.onTaskError) await plan.onTaskError(result);
        if (!task.compensate) break; // Stop on failure if no compensation
      }

      // Pass output as next input
      if (result.output !== undefined) {
        currentInput = result.output as T;
      }
    }
  }

  private async _executeParallel<T>(
    plan: ExecutionPlan,
    input: T,
    context: ExecutionContextImpl,
    onResult?: (result: TaskResult) => void
  ): Promise<void> {
    const promises = plan.tasks.map(async (task) => {
      if (context.isCancelled()) return;

      const result = await this._executeTask(task, input, context);
      context._setTaskResult(task.id, result);

      if (onResult) onResult(result);
      if (plan.onTaskComplete) await plan.onTaskComplete(result);
      if (result.status === 'failed' && plan.onTaskError) {
        await plan.onTaskError(result);
      }
    });

    await Promise.all(promises);
  }

  private async _executeRace<T>(
    plan: ExecutionPlan,
    input: T,
    context: ExecutionContextImpl
  ): Promise<void> {
    const promises = plan.tasks.map(async (task) => {
      const result = await this._executeTask(task, input, context);
      return { taskId: task.id, result };
    });

    const winner = await Promise.race(promises);
    context._setTaskResult(winner.taskId, winner.result);

    // Cancel other tasks
    this.cancel(context.executionId);
  }

  private async _executeAll<T>(
    plan: ExecutionPlan,
    input: T,
    context: ExecutionContextImpl
  ): Promise<void> {
    const promises = plan.tasks.map(async (task) => {
      const result = await this._executeTask(task, input, context);
      context._setTaskResult(task.id, result);
      return result;
    });

    const results = await Promise.all(promises);
    const allSuccessful = results.every(r => r.status === 'completed');

    if (!allSuccessful) {
      // Compensate all completed tasks
      for (const task of plan.tasks) {
        const result = context.getTaskResult(task.id);
        if (result?.status === 'completed' && task.compensate) {
          try {
            await task.compensate(input, result.output, {} as TaskContext);
          } catch (error) {
            this.emit('compensation:failed', { taskId: task.id, error });
          }
        }
      }
    }
  }

  private async _executeDAG<T>(
    plan: ExecutionPlan,
    input: T,
    context: ExecutionContextImpl,
    onResult?: (result: TaskResult) => void
  ): Promise<void> {
    const completed = new Set<string>();
    const inProgress = new Set<string>();

    const canExecute = (task: TaskConfig): boolean => {
      if (!task.dependencies) return true;
      return task.dependencies.every(dep => completed.has(dep));
    };

    const executeReadyTasks = async (): Promise<void> => {
      const ready = plan.tasks.filter(t =>
        !completed.has(t.id) &&
        !inProgress.has(t.id) &&
        canExecute(t)
      );

      if (ready.length === 0 && inProgress.size === 0) {
        return; // All done
      }

      if (ready.length === 0 && inProgress.size > 0) {
        // Wait for in-progress tasks
        await new Promise(resolve => setTimeout(resolve, 10));
        return executeReadyTasks();
      }

      const promises = ready.map(async (task) => {
        inProgress.add(task.id);

        // Gather inputs from dependencies
        let taskInput = input;
        if (task.dependencies && task.dependencies.length > 0) {
          const depResults = task.dependencies
            .map(depId => context.getTaskResult(depId))
            .filter((r): r is TaskResult => r !== undefined);
          
          if (depResults.length === 1) {
            taskInput = depResults[0].output as T;
          } else if (depResults.length > 1) {
            taskInput = depResults.map(r => r.output) as unknown as T;
          }
        }

        const result = await this._executeTask(task, taskInput, context);
        context._setTaskResult(task.id, result);
        completed.add(task.id);
        inProgress.delete(task.id);

        if (onResult) onResult(result);
        if (plan.onTaskComplete) await plan.onTaskComplete(result);
        if (result.status === 'failed' && plan.onTaskError) {
          await plan.onTaskError(result);
        }
      });

      await Promise.all(promises);
      return executeReadyTasks();
    };

    await executeReadyTasks();
  }

  private async _executeTask<T>(
    task: TaskConfig,
    input: T,
    context: ExecutionContextImpl
  ): Promise<TaskResult> {
    const taskId = task.id;
    const startTime = Date.now();
    let attempts = 0;
    let lastError: Error | undefined;

    const retryConfig = task.retry || { maxAttempts: 1, delay: 0, backoff: 'fixed' };

    while (attempts < retryConfig.maxAttempts) {
      if (context.isCancelled()) {
        return {
          taskId,
          status: 'cancelled',
          duration: Date.now() - startTime,
          attempts: attempts + 1,
          startedAt: startTime,
        };
      }

      attempts++;

      // Check condition
      if (task.condition) {
        const shouldRun = await task.condition(input, {} as TaskContext);
        if (!shouldRun) {
          return {
            taskId,
            status: 'completed',
            output: undefined,
            duration: 0,
            attempts,
            startedAt: startTime,
            completedAt: startTime,
          };
        }
      }

      // Create task context
      const taskContext: TaskContext = {
        taskId,
        executionId: context.executionId,
        attempt: attempts,
        startTime,
        getState: <T>(key: string) => context.getGlobalState<T>(`task:${taskId}:${key}`),
        setState: <T>(key: string, value: T) => context.setGlobalState(`task:${taskId}:${key}`, value),
        signal: this._abortControllers.get(context.executionId)!.signal,
        log: (level, message, meta) => {
          this.emit('task:log', { taskId, level, message, meta });
        },
        recordMetric: (name, value, tags) => {
          this.emit('task:metric', { taskId, name, value, tags });
        },
      };

      try {
        this.emit('task:started', { taskId, attempt: attempts });

        // Execute with timeout
        const timeout = task.timeout || 30000;
        const output = await this._withTimeout(
          task.execute(input, taskContext),
          timeout,
          taskContext.signal
        );

        const result: TaskResult = {
          taskId,
          status: 'completed',
          output,
          duration: Date.now() - startTime,
          attempts,
          startedAt: startTime,
          completedAt: Date.now(),
        };

        this.emit('task:completed', result);
        return result;

      } catch (error) {
        lastError = error as Error;
        this.emit('task:failed', { taskId, attempt: attempts, error: lastError });

        // Check if retryable
        const isRetryable = !retryConfig.retryableErrors ||
          retryConfig.retryableErrors.some(e => lastError!.message.includes(e));

        if (attempts < retryConfig.maxAttempts && isRetryable) {
          const delay = this._calculateDelay(retryConfig.delay, attempts, retryConfig.backoff, retryConfig.maxDelay);
          await this._sleep(delay);
        } else {
          break;
        }
      }
    }

    // All retries exhausted
    const result: TaskResult = {
      taskId,
      status: 'failed',
      error: lastError,
      duration: Date.now() - startTime,
      attempts,
      startedAt: startTime,
      completedAt: Date.now(),
    };

    // Try compensation
    if (task.compensate) {
      try {
        await task.compensate(input, undefined, {} as TaskContext);
      } catch (compError) {
        this.emit('compensation:failed', { taskId, error: compError });
      }
    }

    return result;
  }

  private async _withTimeout<T>(
    promise: Promise<T>,
    timeout: number,
    signal: AbortSignal
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error(`Task timeout after ${timeout}ms`));
      }, timeout);

      const onAbort = () => {
        clearTimeout(timeoutId);
        reject(new Error('Task cancelled'));
      };

      signal.addEventListener('abort', onAbort);

      promise
        .then((result) => {
          clearTimeout(timeoutId);
          signal.removeEventListener('abort', onAbort);
          resolve(result);
        })
        .catch((error) => {
          clearTimeout(timeoutId);
          signal.removeEventListener('abort', onAbort);
          reject(error);
        });
    });
  }

  private _calculateDelay(
    baseDelay: number,
    attempt: number,
    backoff: 'fixed' | 'linear' | 'exponential',
    maxDelay?: number
  ): number {
    let delay: number;

    switch (backoff) {
      case 'fixed':
        delay = baseDelay;
        break;
      case 'linear':
        delay = baseDelay * attempt;
        break;
      case 'exponential':
        delay = baseDelay * Math.pow(2, attempt - 1);
        break;
      default:
        delay = baseDelay;
    }

    if (maxDelay !== undefined) {
      delay = Math.min(delay, maxDelay);
    }

    return delay;
  }

  private _sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// ============================================================================
// Execution Context Implementation
// ============================================================================

class ExecutionContextImpl implements ExecutionContext {
  readonly executionId: string;
  readonly plan: ExecutionPlan;
  readonly startTime: number;

  private _globalState = new Map<string, unknown>();
  private _taskResults = new Map<string, TaskResult>();
  private _abortController: AbortController;
  private _paused = false;
  private _status: 'running' | 'completed' | 'failed' | 'cancelled' | 'timeout' = 'running';

  constructor(executionId: string, plan: ExecutionPlan, abortController: AbortController) {
    this.executionId = executionId;
    this.plan = plan;
    this.startTime = Date.now();
    this._abortController = abortController;
  }

  getGlobalState<T>(key: string): T | undefined {
    return this._globalState.get(key) as T | undefined;
  }

  setGlobalState<T>(key: string, value: T): void {
    this._globalState.set(key, value);
  }

  getTaskResult(taskId: string): TaskResult | undefined {
    return this._taskResults.get(taskId);
  }

  getAllResults(): Map<string, TaskResult> {
    return new Map(this._taskResults);
  }

  cancel(): void {
    this._abortController.abort();
    this._status = 'cancelled';
  }

  isCancelled(): boolean {
    return this._abortController.signal.aborted;
  }

  _setTaskResult(taskId: string, result: TaskResult): void {
    this._taskResults.set(taskId, result);
  }

  _pause(): void {
    this._paused = true;
  }

  _resume(): void {
    this._paused = false;
  }

  _isPaused(): boolean {
    return this._paused;
  }

  _setStatus(status: typeof this._status): void {
    this._status = status;
  }

  _getStatus(): typeof this._status {
    return this._status;
  }

  _hasFailures(): boolean {
    for (const result of this._taskResults.values()) {
      if (result.status === 'failed') {
        return true;
      }
    }
    return false;
  }
}

// ============================================================================
// Factory
// ============================================================================

export function createExecutionEngine(): ExecutionEngineImpl {
  return new ExecutionEngineImpl();
}

export default ExecutionEngineImpl;
