/**
 * Execution Context Manager - 执行上下文管理器
 *
 * 负责管理执行深度、循环检测和资源限制
 *
 * @module Execution
 * @version 5.0.0
 */

import { getLogger } from '../utils/logger.js';
import type { EventBus } from '../agent/domain/events.js';

const logger = getLogger('execution');

// ============================================
// Types
// ============================================

export interface ExecutionLimits {
  /** 最大执行深度 */
  maxDepth: number;
  /** 最大步骤数 */
  maxSteps: number;
  /** 最大相同动作重复次数 */
  maxSameActionRepeat: number;
  /** 执行超时 (ms) */
  timeout: number;
  /** 最大总执行时间 (ms) */
  maxTotalTime: number;
}

export interface ExecutionCall {
  type: 'tool' | 'skill' | 'agent' | 'think' | 'finish' | 'reflect';
  name: string;
  timestamp: number;
  depth: number;
}

export interface ExecutionCycle {
  type: 'depth_exceeded' | 'steps_exceeded' | 'action_repeat' | 'timeout' | 'total_time';
  message: string;
  details: Record<string, unknown>;
}

export interface ExecutionContextOptions {
  executionId: string;
  agentId?: string;
  sessionId?: string;
  limits?: Partial<ExecutionLimits>;
  eventBus?: EventBus;
}

// ============================================
// Default Limits
// ============================================

export const DEFAULT_EXECUTION_LIMITS: ExecutionLimits = {
  maxDepth: 10,
  maxSteps: 50,
  maxSameActionRepeat: 3,
  timeout: 60000,
  maxTotalTime: 300000, // 5 minutes
};

// ============================================
// Execution Context Manager
// ============================================

export class ExecutionContextManager {
  private executionId: string;
  private agentId?: string;
  private sessionId?: string;
  private limits: ExecutionLimits;
  private eventBus?: EventBus;

  private currentDepth: number = 0;
  private stepCount: number = 0;
  private callHistory: ExecutionCall[] = [];
  private actionRepeatCount = new Map<string, number>();
  private startTime: number;
  private aborted: boolean = false;
  private abortReason?: ExecutionCycle;

  constructor(options: ExecutionContextOptions) {
    this.executionId = options.executionId;
    this.agentId = options.agentId;
    this.sessionId = options.sessionId;
    this.limits = { ...DEFAULT_EXECUTION_LIMITS, ...options.limits };
    this.eventBus = options.eventBus;
    this.startTime = Date.now();
  }

  /**
   * 获取当前执行深度
   */
  getDepth(): number {
    return this.currentDepth;
  }

  /**
   * 获取步骤计数
   */
  getStepCount(): number {
    return this.stepCount;
  }

  /**
   * 获取执行时长
   */
  getElapsedTime(): number {
    return Date.now() - this.startTime;
  }

  /**
   * 检查是否已中止
   */
  isAborted(): boolean {
    return this.aborted;
  }

  /**
   * 获取中止原因
   */
  getAbortReason(): ExecutionCycle | undefined {
    return this.abortReason;
  }

  /**
   * 进入新的执行层级
   */
  enterAction(type: 'tool' | 'skill' | 'agent' | 'think' | 'finish' | 'reflect', name: string): boolean {
    if (this.aborted) {
      return false;
    }

    // 检查深度限制
    if (this.currentDepth >= this.limits.maxDepth) {
      this.abort('depth_exceeded', `Maximum execution depth (${this.limits.maxDepth}) exceeded`, {
        type,
        name,
        depth: this.currentDepth,
      });
      return false;
    }

    // 检查步骤限制
    if (this.stepCount >= this.limits.maxSteps) {
      this.abort('steps_exceeded', `Maximum steps (${this.limits.maxSteps}) exceeded`, {
        type,
        name,
        steps: this.stepCount,
      });
      return false;
    }

    // 检查重复调用
    const actionKey = `${type}:${name}`;
    const repeatCount = this.actionRepeatCount.get(actionKey) || 0;
    if (repeatCount >= this.limits.maxSameActionRepeat) {
      this.abort('action_repeat', `Action '${actionKey}' repeated too many times (${repeatCount})`, {
        type,
        name,
        repeatCount,
      });
      return false;
    }

    // 检查总执行时间
    if (this.getElapsedTime() >= this.limits.maxTotalTime) {
      this.abort('total_time', `Maximum execution time (${this.limits.maxTotalTime}ms) exceeded`, {
        elapsedTime: this.getElapsedTime(),
      });
      return false;
    }

    // 主动检测循环模式
    const potentialCycles = this.detectCycles();
    for (const cycle of potentialCycles) {
      if (cycle.count >= 3) {
        this.abort('action_repeat', `Execution cycle detected: ${cycle.pattern} repeated ${cycle.count} times`, {
          pattern: cycle.pattern,
          count: cycle.count,
          type,
          name,
        });
        return false;
      }
    }

    // 记录调用
    this.currentDepth++;
    this.stepCount++;
    this.actionRepeatCount.set(actionKey, repeatCount + 1);
    this.callHistory.push({
      type,
      name,
      timestamp: Date.now(),
      depth: this.currentDepth,
    });

    logger.debug(`Entering action`, {
      type,
      name,
      depth: this.currentDepth,
      steps: this.stepCount,
    });

    return true;
  }

  /**
   * 退出执行层级
   */
  exitAction(type: 'tool' | 'skill' | 'agent' | 'think' | 'finish' | 'reflect', name: string): void {
    if (this.currentDepth > 0) {
      this.currentDepth--;
    }

    // 检测循环模式并警告
    const cycles = this.detectCycles();
    if (cycles.length > 0) {
      logger.warn(`Potential execution cycle detected`, {
        cycles: cycles.slice(0, 3),
        depth: this.currentDepth,
        steps: this.stepCount,
      });
    }

    logger.debug(`Exiting action`, {
      type,
      name,
      depth: this.currentDepth,
    });
  }

  /**
   * 检查是否可以继续执行
   */
  canContinue(): boolean {
    if (this.aborted) {
      return false;
    }

    if (this.currentDepth >= this.limits.maxDepth) {
      return false;
    }

    if (this.stepCount >= this.limits.maxSteps) {
      return false;
    }

    if (this.getElapsedTime() >= this.limits.maxTotalTime) {
      return false;
    }

    return true;
  }

  /**
   * 中止执行
   */
  abort(type: ExecutionCycle['type'], message: string, details: Record<string, unknown> = {}): void {
    this.aborted = true;
    this.abortReason = { type, message, details };

    logger.error(`Execution aborted: ${message}`, {
      type,
      executionId: this.executionId,
      ...details,
    });

    // 发布事件
    this.eventBus?.publish(
      'execution:aborted',
      {
        executionId: this.executionId,
        agentId: this.agentId || '',
        reason: this.abortReason,
        timestamp: new Date(),
      },
      { agentId: this.agentId || '', executionId: this.executionId }
    );
  }

  /**
   * 手动中止
   */
  manualAbort(reason?: string): void {
    this.abort('timeout', reason || 'Manually aborted', { manual: true });
  }

  /**
   * 获取执行统计
   */
  getStats(): {
    executionId: string;
    depth: number;
    steps: number;
    elapsedTime: number;
    callHistory: ExecutionCall[];
    topActions: Array<{ action: string; count: number }>;
  } {
    // 统计最频繁的动作
    const actionCounts = new Map<string, number>();
    for (const call of this.callHistory) {
      const key = `${call.type}:${call.name}`;
      actionCounts.set(key, (actionCounts.get(key) || 0) + 1);
    }

    const topActions = Array.from(actionCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([action, count]) => ({ action, count }));

    return {
      executionId: this.executionId,
      depth: this.currentDepth,
      steps: this.stepCount,
      elapsedTime: this.getElapsedTime(),
      callHistory: [...this.callHistory],
      topActions,
    };
  }

  /**
   * 创建子上下文（用于嵌套执行）
   */
  createChildContext(executionId: string): ExecutionContextManager {
    return new ExecutionContextManager({
      executionId,
      agentId: this.agentId,
      sessionId: this.sessionId,
      limits: this.limits,
      eventBus: this.eventBus,
    });
  }

  /**
   * 检测潜在的循环模式
   */
  detectCycles(): Array<{ pattern: string; count: number }> {
    const cycles: Array<{ pattern: string; count: number }> = [];
    const history = this.callHistory;

    // 检测长度为 2-4 的循环模式
    for (let patternLength = 2; patternLength <= 4; patternLength++) {
      if (history.length < patternLength * 2) continue;

      // 获取最近的模式
      const recentPattern = history.slice(-patternLength).map(c => `${c.type}:${c.name}`).join(' -> ');

      // 计算这个模式出现的次数
      let patternCount = 0;
      for (let i = 0; i <= history.length - patternLength; i++) {
        const segment = history.slice(i, i + patternLength).map(c => `${c.type}:${c.name}`).join(' -> ');
        if (segment === recentPattern) {
          patternCount++;
        }
      }

      if (patternCount >= 2) {
        cycles.push({ pattern: recentPattern, count: patternCount });
      }
    }

    return cycles;
  }

  /**
   * 重置上下文（用于新的执行）
   */
  reset(): void {
    this.currentDepth = 0;
    this.stepCount = 0;
    this.callHistory = [];
    this.actionRepeatCount.clear();
    this.startTime = Date.now();
    this.aborted = false;
    this.abortReason = undefined;
  }
}

// ============================================
// Global Execution Context Registry
// ============================================

const activeContexts = new Map<string, ExecutionContextManager>();

/**
 * 创建执行上下文
 */
export function createExecutionContext(options: ExecutionContextOptions): ExecutionContextManager {
  const context = new ExecutionContextManager(options);
  activeContexts.set(options.executionId, context);
  return context;
}

/**
 * 获取执行上下文
 */
export function getExecutionContext(executionId: string): ExecutionContextManager | undefined {
  return activeContexts.get(executionId);
}

/**
 * 移除执行上下文
 */
export function removeExecutionContext(executionId: string): void {
  activeContexts.delete(executionId);
}

/**
 * 获取所有活跃的执行上下文
 */
export function getActiveExecutionContexts(): ExecutionContextManager[] {
  return Array.from(activeContexts.values());
}

/**
 * 清理过期的执行上下文
 */
export function cleanupExpiredContexts(maxAge: number = 3600000): number {
  let cleaned = 0;

  for (const [id, context] of activeContexts.entries()) {
    if (context.getElapsedTime() > maxAge) {
      activeContexts.delete(id);
      cleaned++;
    }
  }

  if (cleaned > 0) {
    logger.debug(`Cleaned up expired execution contexts`, { count: cleaned });
  }

  return cleaned;
}

// ============================================
// Decorator for automatic context management
// ============================================

export function WithExecutionContext(
  type: 'tool' | 'skill' | 'agent',
  getNameFromArgs: (args: unknown[]) => string
) {
  return function (
    _target: unknown,
    _propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (this: { executionContext?: ExecutionContextManager }, ...args: unknown[]) {
      const name = getNameFromArgs(args);
      const context = this.executionContext;

      if (!context) {
        logger.warn(`No execution context found for ${type}:${name}`);
        return originalMethod.apply(this, args);
      }

      if (!context.enterAction(type, name)) {
        const reason = context.getAbortReason();
        throw new Error(`Execution aborted: ${reason?.message || 'Unknown reason'}`);
      }

      try {
        const result = await originalMethod.apply(this, args);
        context.exitAction(type, name);
        return result;
      } catch (error) {
        context.exitAction(type, name);
        throw error;
      }
    };

    return descriptor;
  };
}

export default ExecutionContextManager;
