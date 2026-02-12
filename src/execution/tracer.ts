/**
 * Execution Tracer
 * 执行追踪器 - 记录和分析执行链路
 * 
 * 安全特性：
 * 1. 内存限制 - 防止无限增长
 * 2. LRU 淘汰 - 自动清理旧追踪
 * 3. 定期清理 - 定时清理过期数据
 */

import type { Executable, ExecutionResult } from './index.js';
import { getLogger } from '../utils/logger.js';

const logger = getLogger('execution');

export interface ExecutionTrace {
  executionId: string;
  executableName: string;
  executableType: string;
  startTime: Date;
  endTime?: Date;
  duration?: number;
  input?: unknown;
  output?: unknown;
  success: boolean;
  error?: string;
  children: ExecutionTrace[];
}

export interface ExecutionTracerOptions {
  /** 最大追踪数量 */
  maxTraces?: number;
  /** 追踪过期时间 (ms) */
  traceTTL?: number;
  /** 启用自动清理 */
  enableAutoCleanup?: boolean;
  /** 清理间隔 (ms) */
  cleanupInterval?: number;
}

export class ExecutionTracer {
  private traces = new Map<string, ExecutionTrace>();
  private activeTraces = new Map<string, ExecutionTrace>();
  private options: Required<ExecutionTracerOptions>;
  private cleanupTimer?: ReturnType<typeof setInterval>;

  constructor(options: ExecutionTracerOptions = {}) {
    this.options = {
      maxTraces: 10000,
      traceTTL: 1000 * 60 * 60, // 1小时
      enableAutoCleanup: true,
      cleanupInterval: 1000 * 60 * 5, // 5分钟
      ...options,
    };

    if (this.options.enableAutoCleanup) {
      this.startAutoCleanup();
    }
  }

  startTrace(executionId: string, executable: Executable, input: unknown): void {
    // 检查容量限制
    if (this.traces.size >= this.options.maxTraces) {
      this.evictOldestTrace();
    }

    const trace: ExecutionTrace = {
      executionId,
      executableName: executable.name,
      executableType: executable.type,
      startTime: new Date(),
      input,
      success: false,
      children: [],
    };

    this.activeTraces.set(executionId, trace);
    this.traces.set(executionId, trace);
  }

  endTrace(executionId: string, result: ExecutionResult): void {
    const trace = this.activeTraces.get(executionId);
    if (!trace) return;

    trace.endTime = new Date();
    trace.duration = trace.endTime.getTime() - trace.startTime.getTime();
    trace.output = result.data;
    trace.success = result.success;
    trace.error = result.error?.message;

    this.activeTraces.delete(executionId);
  }

  addChildTrace(parentId: string, childTrace: ExecutionTrace): void {
    const parent = this.activeTraces.get(parentId);
    if (parent) {
      parent.children.push(childTrace);
    }
  }

  getTrace(executionId: string): ExecutionTrace | undefined {
    return this.traces.get(executionId);
  }

  getAllTraces(): ExecutionTrace[] {
    return Array.from(this.traces.values());
  }

  getSuccessRate(): number {
    const allTraces = this.getAllTraces();
    if (allTraces.length === 0) return 0;
    const successful = allTraces.filter(t => t.success).length;
    return successful / allTraces.length;
  }

  getAverageDuration(): number {
    const allTraces = this.getAllTraces();
    if (allTraces.length === 0) return 0;
    const totalDuration = allTraces.reduce((sum, t) => sum + (t.duration || 0), 0);
    return totalDuration / allTraces.length;
  }

  /**
   * 清理过期追踪
   */
  cleanup(): void {
    const now = Date.now();
    const expiredIds: string[] = [];

    for (const [id, trace] of this.traces) {
      const age = now - trace.startTime.getTime();
      if (age > this.options.traceTTL) {
        expiredIds.push(id);
      }
    }

    for (const id of expiredIds) {
      this.traces.delete(id);
    }

    if (expiredIds.length > 0) {
      logger.debug(`Cleaned up expired traces`, { count: expiredIds.length });
    }
  }

  /**
   * 销毁，清理所有资源
   */
  destroy(): void {
    this.stopAutoCleanup();
    this.clear();
  }

  clear(): void {
    this.traces.clear();
    this.activeTraces.clear();
  }

  /**
   * 获取统计信息
   */
  getStats(): {
    totalTraces: number;
    activeTraces: number;
    maxTraces: number;
    successRate: number;
    averageDuration: number;
  } {
    return {
      totalTraces: this.traces.size,
      activeTraces: this.activeTraces.size,
      maxTraces: this.options.maxTraces,
      successRate: this.getSuccessRate(),
      averageDuration: this.getAverageDuration(),
    };
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  private startAutoCleanup(): void {
    this.cleanupTimer = setInterval(() => {
      this.cleanup();
    }, this.options.cleanupInterval);
  }

  private stopAutoCleanup(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = undefined;
    }
  }

  private evictOldestTrace(): void {
    let oldestId: string | undefined;
    let oldestTime = Infinity;

    for (const [id, trace] of this.traces) {
      if (trace.startTime.getTime() < oldestTime) {
        oldestTime = trace.startTime.getTime();
        oldestId = id;
      }
    }

    if (oldestId) {
      this.traces.delete(oldestId);
    }
  }
}

export default ExecutionTracer;
