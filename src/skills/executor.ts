/**
 * Skill Executor - Skill 执行引擎
 *
 * 高性能执行引擎，支持执行池、序列化队列、指数退避重试
 *
 * @module SkillExecutor
 * @version 5.0.0
 */

import { EventEmitter } from 'events';
import type { Skill, SkillContext, SkillResult, SkillId, SkillError, ExecutionMetadata } from './types.js';

// ============================================================================
// Types
// ============================================================================

export interface ExecutionOptions {
  timeout?: number;
  retries?: number;
  retryDelay?: number;
  maxRetryDelay?: number;
  jitter?: number;
  abortSignal?: AbortSignal;
}

export interface ExecutionTask {
  id: string;
  skillId: SkillId;
  skill: Skill;
  input: unknown;
  context: SkillContext;
  options: ExecutionOptions;
  resolve: (result: SkillResult) => void;
  reject: (error: Error) => void;
  startTime: number;
  attempts: number;
}

export interface ExecutionStats {
  totalExecuted: number;
  successful: number;
  failed: number;
  retried: number;
  averageDuration: number;
  queueLength: number;
  activeExecutions: number;
}

// ============================================================================
// Retry Logic
// ============================================================================

export interface RetryConfig {
  maxAttempts: number;
  minDelayMs: number;
  maxDelayMs: number;
  jitter: number;
  shouldRetry?: (error: Error, attempt: number) => boolean;
  onRetry?: (info: { attempt: number; maxAttempts: number; delayMs: number; error: Error }) => void;
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 3,
  minDelayMs: 300,
  maxDelayMs: 30000,
  jitter: 0.1,
};

/**
 * 计算指数退避延迟
 */
export function calculateBackoffDelay(
  attempt: number,
  config: RetryConfig = DEFAULT_RETRY_CONFIG
): number {
  // 指数退避: delay = minDelay * 2^(attempt-1)
  const baseDelay = config.minDelayMs * 2 ** (attempt - 1);
  
  // 应用最大延迟限制
  const cappedDelay = Math.min(baseDelay, config.maxDelayMs);
  
  // 应用抖动避免惊群
  const jitterAmount = cappedDelay * config.jitter;
  const jitteredDelay = cappedDelay + (Math.random() * 2 - 1) * jitterAmount;
  
  return Math.max(0, Math.floor(jitteredDelay));
}

// ============================================================================
// Execution Pool
// ============================================================================

export class ExecutionPool {
  private maxConcurrent: number;
  private activeExecutions = new Map<string, AbortController>();
  private queue: ExecutionTask[] = [];
  private stats = {
    totalExecuted: 0,
    successful: 0,
    failed: 0,
    retried: 0,
    totalDuration: 0,
  };

  constructor(maxConcurrent: number = 5) {
    this.maxConcurrent = maxConcurrent;
  }

  /**
   * 提交执行任务
   */
  async execute(
    skill: Skill,
    input: unknown,
    context: SkillContext,
    options: ExecutionOptions = {}
  ): Promise<SkillResult> {
    const task: ExecutionTask = {
      id: `${skill.id}:${Date.now()}:${Math.random().toString(36).slice(2)}`,
      skillId: skill.id,
      skill,
      input,
      context,
      options: {
        timeout: 60000,
        retries: 0,
        retryDelay: 1000,
        maxRetryDelay: 30000,
        jitter: 0.1,
        ...options,
      },
      resolve: () => {},
      reject: () => {},
      startTime: Date.now(),
      attempts: 0,
    };

    return new Promise((resolve, reject) => {
      task.resolve = resolve;
      task.reject = reject;
      this.queue.push(task);
      this.processQueue();
    });
  }

  /**
   * 取消指定 Skill 的所有执行
   */
  cancel(skillId: SkillId): void {
    const controller = this.activeExecutions.get(skillId);
    if (controller) {
      controller.abort();
      this.activeExecutions.delete(skillId);
    }
  }

  /**
   * 取消所有执行
   */
  cancelAll(): void {
    for (const [skillId, controller] of this.activeExecutions) {
      controller.abort();
    }
    this.activeExecutions.clear();
    this.queue = [];
  }

  /**
   * 获取执行统计
   */
  getStats(): ExecutionStats {
    return {
      totalExecuted: this.stats.totalExecuted,
      successful: this.stats.successful,
      failed: this.stats.failed,
      retried: this.stats.retried,
      averageDuration: this.stats.totalExecuted > 0
        ? this.stats.totalDuration / this.stats.totalExecuted
        : 0,
      queueLength: this.queue.length,
      activeExecutions: this.activeExecutions.size,
    };
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  private async processQueue(): Promise<void> {
    if (this.queue.length === 0) return;
    if (this.activeExecutions.size >= this.maxConcurrent) return;

    const task = this.queue.shift();
    if (!task) return;

    this.executeTask(task);
    
    // 继续处理队列
    if (this.queue.length > 0) {
      setImmediate(() => this.processQueue());
    }
  }

  private async executeTask(task: ExecutionTask): Promise<void> {
    const controller = new AbortController();
    this.activeExecutions.set(task.skillId, controller);

    const startTime = Date.now();
    let lastError: Error | undefined;

    try {
      const result = await this.runWithRetry(task, controller.signal);
      
      this.stats.totalExecuted++;
      this.stats.successful++;
      this.stats.totalDuration += Date.now() - startTime;
      
      task.resolve(result);
    } catch (error) {
      this.stats.totalExecuted++;
      this.stats.failed++;
      this.stats.totalDuration += Date.now() - startTime;
      
      task.reject(error as Error);
    } finally {
      this.activeExecutions.delete(task.skillId);
      // 处理下一个任务
      setImmediate(() => this.processQueue());
    }
  }

  private async runWithRetry(
    task: ExecutionTask,
    signal: AbortSignal
  ): Promise<SkillResult> {
    const { retries = 0, retryDelay = 1000, maxRetryDelay = 30000, jitter = 0.1 } = task.options;
    let lastError: Error | undefined;

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        // 检查是否已取消
        if (signal.aborted) {
          return this.createErrorResult(task, 'EXECUTION_ABORTED', 'Execution was aborted');
        }

        task.attempts = attempt + 1;
        const result = await this.runOnce(task, signal);
        
        if (result.success) {
          return result;
        }
        
        // 如果执行返回错误且不可恢复，不再重试
        if (result.error && !result.error.recoverable) {
          return result;
        }
        
        lastError = result.error ? new Error(result.error.message) : new Error('Unknown error');
      } catch (error) {
        lastError = error as Error;
      }

      // 是否需要重试
      if (attempt < retries) {
        this.stats.retried++;
        
        const delay = calculateBackoffDelay(attempt + 1, {
          maxAttempts: retries + 1,
          minDelayMs: retryDelay,
          maxDelayMs: maxRetryDelay,
          jitter,
        });

        task.context.logger.warn(
          `[SkillExecutor] Retrying ${task.skill.name} (attempt ${attempt + 2}/${retries + 1}) after ${delay}ms`,
          { error: lastError?.message }
        );

        await this.sleep(delay);
      }
    }

    return this.createErrorResult(
      task,
      'EXECUTION_FAILED',
      lastError?.message || 'All retry attempts failed',
      true
    );
  }

  private async runOnce(
    task: ExecutionTask,
    signal: AbortSignal
  ): Promise<SkillResult> {
    const { skill, input, context, options } = task;
    const startTime = Date.now();

    // 创建超时 Promise
    const timeoutMs = options.timeout || 60000;
    const timeoutPromise = new Promise<never>((_, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Execution timeout after ${timeoutMs}ms`));
      }, timeoutMs);

      // 如果取消，清除定时器
      signal.addEventListener('abort', () => {
        clearTimeout(timer);
        reject(new Error('Execution aborted'));
      });
    });

    try {
      const executePromise = skill.execute(input, {
        ...context,
        signal,
      });

      const result = await Promise.race([executePromise, timeoutPromise]);

      return {
        ...result,
        metadata: {
          ...result.metadata,
          executionId: context.executionId,
          skillId: skill.id,
          skillName: skill.name,
          startTime,
          endTime: Date.now(),
          duration: Date.now() - startTime,
          attempts: task.attempts,
        },
      };
    } catch (error) {
      const errorMessage = (error as Error).message;
      const isTimeout = errorMessage.includes('timeout');
      const isAborted = errorMessage.includes('aborted');

      return this.createErrorResult(
        task,
        isTimeout ? 'EXECUTION_TIMEOUT' : isAborted ? 'EXECUTION_ABORTED' : 'EXECUTION_ERROR',
        errorMessage,
        !isAborted // 超时和错误可重试，取消不可重试
      );
    }
  }

  private createErrorResult(
    task: ExecutionTask,
    code: string,
    message: string,
    recoverable: boolean = false
  ): SkillResult {
    return {
      success: false,
      error: {
        code,
        message,
        skillId: task.skillId,
        recoverable,
      },
      metadata: {
        executionId: task.context.executionId,
        skillId: task.skillId,
        skillName: task.skill.name,
        startTime: task.startTime,
        endTime: Date.now(),
        duration: Date.now() - task.startTime,
        attempts: task.attempts,
      },
    };
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// ============================================================================
// Execution Monitor
// ============================================================================

export class ExecutionMonitor extends EventEmitter {
  private executions = new Map<string, {
    task: ExecutionTask;
    startTime: number;
    status: 'running' | 'completed' | 'failed';
  }>();

  /**
   * 开始监控执行
   */
  startMonitoring(task: ExecutionTask): void {
    this.executions.set(task.id, {
      task,
      startTime: Date.now(),
      status: 'running',
    });

    this.emit('execution:started', {
      id: task.id,
      skillId: task.skillId,
      skillName: task.skill.name,
      timestamp: Date.now(),
    });
  }

  /**
   * 标记执行完成
   */
  completeExecution(taskId: string, result: SkillResult): void {
    const execution = this.executions.get(taskId);
    if (!execution) return;

    execution.status = result.success ? 'completed' : 'failed';
    
    this.emit('execution:completed', {
      id: taskId,
      skillId: execution.task.skillId,
      skillName: execution.task.skill.name,
      success: result.success,
      duration: Date.now() - execution.startTime,
      timestamp: Date.now(),
    });
  }

  /**
   * 获取正在执行的列表
   */
  getRunningExecutions(): Array<{
    id: string;
    skillId: SkillId;
    skillName: string;
    duration: number;
  }> {
    const now = Date.now();
    return Array.from(this.executions.values())
      .filter(e => e.status === 'running')
      .map(e => ({
        id: e.task.id,
        skillId: e.task.skillId,
        skillName: e.task.skill.name,
        duration: now - e.startTime,
      }));
  }

  /**
   * 获取执行历史
   */
  getExecutionHistory(limit: number = 100): Array<{
    id: string;
    skillId: SkillId;
    skillName: string;
    status: string;
    duration: number;
  }> {
    const now = Date.now();
    return Array.from(this.executions.values())
      .slice(-limit)
      .map(e => ({
        id: e.task.id,
        skillId: e.task.skillId,
        skillName: e.task.skill.name,
        status: e.status,
        duration: now - e.startTime,
      }));
  }
}

// ============================================================================
// Factory
// ============================================================================

export function createExecutionPool(maxConcurrent?: number): ExecutionPool {
  return new ExecutionPool(maxConcurrent);
}

export function createExecutionMonitor(): ExecutionMonitor {
  return new ExecutionMonitor();
}
