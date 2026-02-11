/**
 * Unified Event System - 统一事件系统
 *
 * DDD 领域事件总线
 * 支持类型安全的事件订阅和发布
 *
 * @domain Events
 * @version 5.0.0
 */

import type { AgentId, ExecutionId, SkillId, ToolId, SessionId } from './types.js';

// ============================================================================
// Event Types - 事件类型
// ============================================================================

/** Agent 事件类型 */
export type AgentEventType =
  // 生命周期
  | 'agent:initialized'
  | 'agent:started'
  | 'agent:stopped'
  | 'agent:destroyed'
  | 'agent:error'
  | 'agent:state:changed'
  // 对话
  | 'chat:started'
  | 'chat:message'
  | 'chat:stream'
  | 'chat:completed'
  | 'chat:aborted'
  | 'chat:error'
  // 思考
  | 'thinking:started'
  | 'thinking:step'
  | 'thinking:completed'
  | 'thinking:failed'
  | 'thinking:reflected';

/** Skill 事件类型 */
export type SkillEventType =
  | 'skill:registered'
  | 'skill:unregistered'
  | 'skill:executing'
  | 'skill:executed'
  | 'skill:completed'
  | 'skill:failed'
  | 'skill:aborted'
  | 'skill:hot:reloaded';

/** Tool 事件类型 */
export type ToolEventType =
  | 'tool:registered'
  | 'tool:unregistered'
  | 'tool:invoking'
  | 'tool:invoked'
  | 'tool:completed'
  | 'tool:failed'
  | 'tool:aborted';

/** Memory 事件类型 */
export type MemoryEventType =
  | 'memory:stored'
  | 'memory:retrieved'
  | 'memory:searched'
  | 'memory:deleted'
  | 'memory:synced'
  | 'memory:compressed';

/** Execution 事件类型 */
export type ExecutionEventType =
  | 'execution:started'
  | 'execution:step:start'
  | 'execution:step:complete'
  | 'execution:step:error'
  | 'execution:retry'
  | 'execution:timeout'
  | 'execution:cancelled'
  | 'execution:completed'
  | 'execution:failed';

/** 统一事件类型 */
export type UnifiedEventType =
  | AgentEventType
  | SkillEventType
  | ToolEventType
  | MemoryEventType
  | ExecutionEventType;

// ============================================================================
// Event Interfaces - 事件接口
// ============================================================================

/**
 * 基础事件接口
 */
export interface BaseEvent<T = unknown> {
  /** 事件类型 */
  type: UnifiedEventType;
  /** 时间戳 */
  timestamp: number;
  /** 载荷 */
  payload: T;
  /** 元数据 */
  metadata: {
    agentId: AgentId;
    sessionId?: SessionId;
    executionId?: ExecutionId;
  };
}

/**
 * Agent 事件
 */
export interface AgentEvent<T = unknown> extends BaseEvent<T> {
  type: AgentEventType;
}

/**
 * Skill 事件
 */
export interface SkillEvent<T = unknown> extends BaseEvent<T> {
  type: SkillEventType;
  skillId: SkillId;
}

/**
 * Tool 事件
 */
export interface ToolEvent<T = unknown> extends BaseEvent<T> {
  type: ToolEventType;
  toolId: ToolId;
}

/**
 * Memory 事件
 */
export interface MemoryEvent<T = unknown> extends BaseEvent<T> {
  type: MemoryEventType;
  memoryId?: string;
}

/**
 * Execution 事件
 */
export interface ExecutionEvent<T = unknown> extends BaseEvent<T> {
  type: ExecutionEventType;
  executionId: ExecutionId;
}

/**
 * 统一事件
 */
export type UnifiedEvent<T = unknown> =
  | AgentEvent<T>
  | SkillEvent<T>
  | ToolEvent<T>
  | MemoryEvent<T>
  | ExecutionEvent<T>;

// ============================================================================
// Event Payloads - 事件载荷
// ============================================================================

/** Agent 初始化载荷 */
export interface AgentInitializedPayload {
  agentId: AgentId;
  name: string;
  timestamp: Date;
}

/** Agent 状态改变载荷 */
export interface AgentStateChangedPayload {
  from: string;
  to: string;
  timestamp: Date;
}

/** 聊天开始载荷 */
export interface ChatStartedPayload {
  chatId: string;
  messages: unknown[];
  timestamp: Date;
}

/** 聊天完成载荷 */
export interface ChatCompletedPayload {
  chatId: string;
  response: string;
  tokensUsed: number;
  timestamp: Date;
}

/** 思考步骤载荷 */
export interface ThinkingStepPayload {
  step: number;
  thought: string;
  action: string;
  observation: string;
  duration: number;
}

/** Skill 执行载荷 */
export interface SkillExecutingPayload {
  skillId: SkillId;
  skillName: string;
  input: unknown;
}

/** Skill 完成载荷 */
export interface SkillCompletedPayload {
  skillId: SkillId;
  skillName: string;
  result: unknown;
  duration: number;
}

/** Tool 调用载荷 */
export interface ToolInvokingPayload {
  toolId: ToolId;
  toolName: string;
  parameters: unknown;
}

/** Tool 完成载荷 */
export interface ToolCompletedPayload {
  toolId: ToolId;
  toolName: string;
  result: unknown;
  duration: number;
}

/** 执行步骤载荷 */
export interface ExecutionStepPayload {
  stepId: string;
  type: string;
  name: string;
  state: string;
}

// ============================================================================
// Event Bus Interface - 事件总线接口
// ============================================================================

/**
 * 事件处理器类型
 */
export type EventHandler<T = unknown> = (event: UnifiedEvent<T>) => void | Promise<void>;

/**
 * 事件过滤器
 */
export type EventFilter = (event: UnifiedEvent) => boolean;

/**
 * 事件订阅
 */
export interface EventSubscription {
  /** 取消订阅 */
  unsubscribe(): void;
}

/**
 * 事件总线接口
 */
export interface EventBus {
  /**
   * 订阅事件
   * @param eventType - 事件类型或类型数组
   * @param handler - 事件处理器
   * @param filter - 可选的事件过滤器
   * @returns 事件订阅对象
   */
  subscribe<T>(
    eventType: UnifiedEventType | UnifiedEventType[],
    handler: EventHandler<T>,
    filter?: EventFilter
  ): EventSubscription;

  /**
   * 订阅一次性事件
   * @param eventType - 事件类型
   * @param handler - 事件处理器
   * @param filter - 可选的事件过滤器
   */
  once<T>(
    eventType: UnifiedEventType,
    handler: EventHandler<T>,
    filter?: EventFilter
  ): void;

  /**
   * 发布事件
   * @param event - 事件对象
   */
  emit<T>(event: UnifiedEvent<T>): void;

  /**
   * 发布事件（简化版）
   * @param type - 事件类型
   * @param payload - 事件载荷
   * @param metadata - 事件元数据
   */
  publish<T>(
    type: UnifiedEventType,
    payload: T,
    metadata: {
      agentId: AgentId;
      sessionId?: SessionId;
      executionId?: ExecutionId;
    }
  ): void;

  /**
   * 清除所有订阅
   */
  clear(): void;

  /**
   * 获取订阅统计
   */
  getStats(): {
    totalSubscriptions: number;
    subscriptionsByType: Map<UnifiedEventType, number>;
  };
}

// ============================================================================
// Event Bus Implementation - 事件总线实现
// ============================================================================

/**
 * 事件总线实现
 */
export class EventBusImpl implements EventBus {
  private handlers = new Map<UnifiedEventType, Set<EventHandler>>();
  private onceHandlers = new Map<UnifiedEventType, Set<EventHandler>>();
  private filters = new Map<EventHandler, EventFilter>();

  /**
   * 订阅事件
   */
  subscribe<T>(
    eventType: UnifiedEventType | UnifiedEventType[],
    handler: EventHandler<T>,
    filter?: EventFilter
  ): EventSubscription {
    const types = Array.isArray(eventType) ? eventType : [eventType];

    for (const type of types) {
      if (!this.handlers.has(type)) {
        this.handlers.set(type, new Set());
      }
      this.handlers.get(type)!.add(handler as EventHandler);
    }

    if (filter) {
      this.filters.set(handler as EventHandler, filter);
    }

    return {
      unsubscribe: () => {
        for (const type of types) {
          this.handlers.get(type)?.delete(handler as EventHandler);
        }
        this.filters.delete(handler as EventHandler);
      },
    };
  }

  /**
   * 订阅一次性事件
   */
  once<T>(
    eventType: UnifiedEventType,
    handler: EventHandler<T>,
    filter?: EventFilter
  ): void {
    if (!this.onceHandlers.has(eventType)) {
      this.onceHandlers.set(eventType, new Set());
    }
    this.onceHandlers.get(eventType)!.add(handler as EventHandler);

    if (filter) {
      this.filters.set(handler as EventHandler, filter);
    }
  }

  /**
   * 发布事件
   */
  emit<T>(event: UnifiedEvent<T>): void {
    const handlers = this.handlers.get(event.type) || new Set();
    const onceHandlers = this.onceHandlers.get(event.type) || new Set();

    // 处理常规订阅
    for (const handler of handlers) {
      this.executeHandler(handler, event);
    }

    // 处理一次性订阅
    for (const handler of onceHandlers) {
      this.executeHandler(handler, event);
    }

    // 清除一次性处理器
    if (onceHandlers.size > 0) {
      this.onceHandlers.delete(event.type);
    }
  }

  /**
   * 发布事件（简化版）
   */
  publish<T>(
    type: UnifiedEventType,
    payload: T,
    metadata: {
      agentId: AgentId;
      sessionId?: SessionId;
      executionId?: ExecutionId;
    }
  ): void {
    const event: UnifiedEvent<T> = {
      type,
      timestamp: Date.now(),
      payload,
      metadata,
    } as UnifiedEvent<T>;

    this.emit(event);
  }

  /**
   * 清除所有订阅
   */
  clear(): void {
    this.handlers.clear();
    this.onceHandlers.clear();
    this.filters.clear();
  }

  /**
   * 获取订阅统计
   */
  getStats(): {
    totalSubscriptions: number;
    subscriptionsByType: Map<UnifiedEventType, number>;
  } {
    const subscriptionsByType = new Map<UnifiedEventType, number>();
    let totalSubscriptions = 0;

    for (const [type, handlers] of this.handlers) {
      subscriptionsByType.set(type, handlers.size);
      totalSubscriptions += handlers.size;
    }

    return {
      totalSubscriptions,
      subscriptionsByType,
    };
  }

  /**
   * 执行处理器
   */
  private executeHandler<T>(handler: EventHandler, event: UnifiedEvent<T>): void {
    try {
      // 检查过滤器
      const filter = this.filters.get(handler);
      if (filter && !filter(event)) {
        return;
      }

      // 执行处理器
      const result = handler(event);
      if (result instanceof Promise) {
        result.catch((error) => {
          console.error('Event handler error:', error);
        });
      }
    } catch (error) {
      console.error('Event handler error:', error);
    }
  }
}

/**
 * 创建事件总线
 */
export function createEventBus(): EventBus {
  return new EventBusImpl();
}

/**
 * 全局事件总线（单例）
 */
let globalEventBus: EventBus | null = null;

/**
 * 获取全局事件总线
 */
export function getGlobalEventBus(): EventBus {
  if (!globalEventBus) {
    globalEventBus = createEventBus();
  }
  return globalEventBus;
}

/**
 * 重置全局事件总线（主要用于测试）
 */
export function resetGlobalEventBus(): void {
  globalEventBus = null;
}
