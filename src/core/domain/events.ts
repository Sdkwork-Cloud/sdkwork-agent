/**
 * Unified Event System - 统一事件中心
 *
 * 集中管理所有领域事件类型
 * 提供类型安全的事件订阅和发布
 *
 * @domain Events
 * @version 1.0.0
 */

// ============================================
// Agent Events - 智能体事件
// ============================================

export type AgentEventType =
  // 生命周期事件
  | 'agent:initialized'
  | 'agent:started'
  | 'agent:stopped'
  | 'agent:destroyed'
  // 对话事件
  | 'chat:started'
  | 'chat:message'
  | 'chat:stream'
  | 'chat:completed'
  | 'chat:aborted'
  | 'chat:error'
  // 执行事件
  | 'execution:started'
  | 'execution:step'
  | 'execution:progress'
  | 'execution:completed'
  | 'execution:failed'
  // 工具事件
  | 'tool:invoking'
  | 'tool:invoked'
  | 'tool:completed'
  | 'tool:failed'
  // Skill 事件
  | 'skill:invoking'
  | 'skill:invoked'
  | 'skill:completed'
  | 'skill:failed'
  // 记忆事件
  | 'memory:stored'
  | 'memory:retrieved'
  | 'memory:searched';

export interface AgentEvent<T = unknown> {
  type: AgentEventType;
  timestamp: number;
  payload: T;
  metadata: {
    agentId: string;
    sessionId?: string;
    executionId?: string;
  };
}

// ============================================
// Skill Events - 技能事件
// ============================================

export type SkillEventType =
  | 'skill:registered'
  | 'skill:unregistered'
  | 'skill:executing'
  | 'skill:executed'
  | 'skill:completed'
  | 'skill:failed'
  | 'skill:aborted';

export interface SkillEvent<T = unknown> {
  type: SkillEventType;
  timestamp: number;
  payload: T;
  skillId: string;
  executionId?: string;
}

// ============================================
// Tool Events - 工具事件
// ============================================

export type ToolEventType =
  | 'tool:registered'
  | 'tool:unregistered'
  | 'tool:invoking'
  | 'tool:invoked'
  | 'tool:completed'
  | 'tool:failed'
  | 'tool:aborted'
  | 'tool:chain:started'
  | 'tool:chain:completed'
  | 'tool:chain:failed';

export interface ToolEvent<T = unknown> {
  type: ToolEventType;
  timestamp: number;
  payload: T;
  toolId: string;
  executionId?: string;
}

// ============================================
// Memory Events - 记忆事件
// ============================================

export type MemoryEventType =
  | 'memory:stored'
  | 'memory:retrieved'
  | 'memory:searched'
  | 'memory:deleted'
  | 'memory:synced';

export interface MemoryEvent<T = unknown> {
  type: MemoryEventType;
  timestamp: number;
  payload: T;
  memoryId?: string;
}

// ============================================
// MCP Events - MCP 事件
// ============================================

export type MCPEventType =
  | 'mcp:connected'
  | 'mcp:disconnected'
  | 'mcp:error'
  | 'mcp:tools:changed'
  | 'mcp:resources:changed'
  | 'mcp:resource:updated'
  | 'mcp:prompts:changed'
  | 'mcp:notification'
  | 'mcp:message';

export interface MCPEvent<T = unknown> {
  type: MCPEventType;
  timestamp: number;
  payload: T;
  clientId: string;
}

// ============================================
// Plugin Events - 插件事件
// ============================================

export type PluginEventType =
  | 'plugin:registered'
  | 'plugin:unregistered'
  | 'plugin:initializing'
  | 'plugin:initialized'
  | 'plugin:activating'
  | 'plugin:activated'
  | 'plugin:deactivating'
  | 'plugin:deactivated'
  | 'plugin:error'
  | 'plugin:destroyed'
  | 'hook:executing'
  | 'hook:executed'
  | 'hook:error'
  | 'command:executing'
  | 'command:executed'
  | 'command:error';

export interface PluginEvent<T = unknown> {
  type: PluginEventType;
  timestamp: number;
  payload: T;
  pluginId: string;
}

// ============================================
// Execution Events - 执行事件
// ============================================

export type ExecutionEventType =
  | 'execution:started'
  | 'execution:planning'
  | 'execution:planned'
  | 'execution:step:start'
  | 'execution:step:progress'
  | 'execution:step:complete'
  | 'execution:step:error'
  | 'execution:retry'
  | 'execution:timeout'
  | 'execution:cancelled'
  | 'execution:completed'
  | 'execution:failed';

export interface ExecutionEvent<T = unknown> {
  type: ExecutionEventType;
  timestamp: number;
  payload: T;
  executionId: string;
}

// ============================================
// Unified Event Type - 统一事件类型
// ============================================

export type UnifiedEventType =
  | AgentEventType
  | SkillEventType
  | ToolEventType
  | MemoryEventType
  | MCPEventType
  | PluginEventType
  | ExecutionEventType;

export interface UnifiedEvent<T = unknown> {
  type: UnifiedEventType;
  timestamp: number;
  payload: T;
  source: 'agent' | 'skill' | 'tool' | 'memory' | 'mcp' | 'plugin' | 'execution';
  metadata?: Record<string, unknown>;
}

// ============================================
// Event Handler Types - 事件处理器类型
// ============================================

export type EventHandler<T = unknown> = (event: UnifiedEvent<T>) => void | Promise<void>;

export type EventFilter = (event: UnifiedEvent) => boolean;

export interface EventSubscription {
  unsubscribe(): void;
}

// ============================================
// Event Bus Interface - 事件总线接口
// ============================================

export interface EventBus {
  /**
   * 订阅事件
   */
  subscribe<T>(
    eventType: UnifiedEventType | UnifiedEventType[],
    handler: EventHandler<T>,
    filter?: EventFilter
  ): EventSubscription;

  /**
   * 发布事件
   */
  emit<T>(event: UnifiedEvent<T>): void;

  /**
   * 发布事件（简化版）
   */
  publish<T>(
    type: UnifiedEventType,
    payload: T,
    source: UnifiedEvent['source'],
    metadata?: Record<string, unknown>
  ): void;

  /**
   * 清除所有订阅
   */
  clear(): void;
}
