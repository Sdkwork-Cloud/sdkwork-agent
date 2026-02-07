/**
 * Unified Domain - 统一领域定义
 * 
 * 行业标准统一架构
 * 高内聚低耦合，消除重复代码
 * 
 * @domain Unified
 * @version 5.0.0
 * @standard Industry Leading (Claude Code / OpenCode / OpenClaw)
 */

// ============================================
// Branded Types - 类型安全ID
// ============================================

/** Skill ID 类型 */
export type SkillId = string & { __brand: 'SkillId' };
/** Tool ID 类型 */
export type ToolId = string & { __brand: 'ToolId' };
/** Plugin ID 类型 */
export type PluginId = string & { __brand: 'PluginId' };
/** MCP Server ID 类型 */
export type MCPServerId = string & { __brand: 'MCPServerId' };
/** Execution ID 类型 */
export type ExecutionId = string & { __brand: 'ExecutionId' };
/** Session ID 类型 */
export type SessionId = string & { __brand: 'SessionId' };
/** Agent ID 类型 */
export type AgentId = string & { __brand: 'AgentId' };

/** 创建 branded ID */
export function createSkillId(id: string): SkillId { return id as SkillId; }
export function createToolId(id: string): ToolId { return id as ToolId; }
export function createPluginId(id: string): PluginId { return id as PluginId; }
export function createMCPServerId(id: string): MCPServerId { return id as MCPServerId; }
export function createExecutionId(id: string): ExecutionId { return id as ExecutionId; }
export function createSessionId(id: string): SessionId { return id as SessionId; }
export function createAgentId(id: string): AgentId { return id as AgentId; }

// ============================================
// Unified JSON Schema - 统一Schema定义
// ============================================

/**
 * 统一 JSON Schema 定义
 * 消除重复代码
 */
export interface JSONSchema {
  type: 'string' | 'number' | 'boolean' | 'object' | 'array' | 'null';
  properties?: Record<string, JSONSchema>;
  items?: JSONSchema;
  required?: string[];
  enum?: unknown[];
  description?: string;
  default?: unknown;
  examples?: unknown[];
  pattern?: string;
  minLength?: number;
  maxLength?: number;
  minimum?: number;
  maximum?: number;
  multipleOf?: number;
  format?: 'email' | 'uri' | 'date' | 'date-time' | 'uuid' | string;
}

// ============================================
// Unified Result Type - 统一结果类型
// ============================================

/**
 * 统一结果类型
 * 消除 null/undefined 歧义
 */
export type Result<T, E = Error> =
  | { readonly success: true; readonly data: T; readonly error?: never }
  | { readonly success: false; readonly data?: never; readonly error: E };

/** 创建成功结果 */
export function ok<T>(data: T): Result<T, never> {
  return { success: true, data };
}

/** 创建失败结果 */
export function err<E>(error: E): Result<never, E> {
  return { success: false, error };
}

/**
 * 统一日志接口 - 使用 utils/logger 中的 ILogger
 */
export type UnifiedLogger = import('../../utils/logger').ILogger;

// ============================================
// Unified Execution Context - 统一执行上下文
// ============================================

/**
 * 统一执行上下文
 * Skill/Tool/MCP/Plugin 共享基础上下文
 */
export interface BaseExecutionContext {
  /** 执行 ID */
  readonly executionId: ExecutionId;
  /** Agent ID */
  readonly agentId: AgentId;
  /** 会话 ID */
  readonly sessionId?: SessionId;
  /** 父执行 ID（用于嵌套调用） */
  readonly parentExecutionId?: ExecutionId;
  
  /** 日志 */
  readonly logger: UnifiedLogger;
  /** 中止信号 */
  readonly signal?: AbortSignal;
  
  /** 调用链 */
  readonly callStack: CallFrame[];
  /** 开始时间 */
  readonly startedAt: Date;
}

/** 调用帧 */
export interface CallFrame {
  type: 'skill' | 'tool' | 'mcp' | 'plugin';
  id: string;
  name: string;
  timestamp: Date;
}

// ============================================
// Unified Capability - 统一能力抽象
// ============================================

/**
 * 能力类型
 * 统一描述 Skill/Tool/MCP/Plugin
 */
export type CapabilityType = 'skill' | 'tool' | 'mcp-tool' | 'plugin';

/**
 * 统一能力接口
 */
export interface Capability {
  readonly type: CapabilityType;
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly version?: string;
  
  /** 输入 Schema */
  readonly inputSchema?: JSONSchema;
  /** 输出 Schema */
  readonly outputSchema?: JSONSchema;
  
  /** 元数据 */
  readonly meta?: Record<string, unknown>;
}

// ============================================
// Unified Events - 统一事件系统
// ============================================

/**
 * 统一事件类型定义
 * 类型安全的事件系统
 */
export interface UnifiedEvents {
  // Skill 事件
  'skill:registered': { skillId: SkillId; skill: unknown };
  'skill:unregistered': { skillId: SkillId };
  'skill:executing': { skillId: SkillId; executionId: ExecutionId; input: unknown };
  'skill:completed': { skillId: SkillId; executionId: ExecutionId; result: unknown };
  'skill:failed': { skillId: SkillId; executionId: ExecutionId; error: Error };
  'skill:aborted': { skillId: SkillId; executionId: ExecutionId };
  
  // Tool 事件
  'tool:registered': { toolId: ToolId; tool: unknown };
  'tool:unregistered': { toolId: ToolId };
  'tool:executing': { toolId: ToolId; executionId: ExecutionId; input: unknown };
  'tool:completed': { toolId: ToolId; executionId: ExecutionId; result: unknown };
  'tool:failed': { toolId: ToolId; executionId: ExecutionId; error: Error };
  
  // MCP 事件
  'mcp:connected': { serverId: MCPServerId };
  'mcp:disconnected': { serverId: MCPServerId };
  'mcp:tool:executing': { serverId: MCPServerId; toolName: string; executionId: ExecutionId };
  'mcp:tool:completed': { serverId: MCPServerId; toolName: string; executionId: ExecutionId };
  'mcp:tool:failed': { serverId: MCPServerId; toolName: string; executionId: ExecutionId; error: Error };
  
  // Plugin 事件
  'plugin:registered': { pluginId: PluginId };
  'plugin:activated': { pluginId: PluginId };
  'plugin:deactivated': { pluginId: PluginId };
  'plugin:error': { pluginId: PluginId; error: Error };
  
  // Agent 事件
  'agent:initializing': { agentId: AgentId };
  'agent:initialized': { agentId: AgentId };
  'agent:shutting-down': { agentId: AgentId };
  'agent:shutdown': { agentId: AgentId };
}

/** 事件名称类型 */
export type UnifiedEventName = keyof UnifiedEvents;

/** 获取事件负载类型 */
export type UnifiedEventPayload<T extends UnifiedEventName> = UnifiedEvents[T];

// ============================================
// Unified Registry - 统一注册表接口
// ============================================

/**
 * 统一注册表接口
 * Skill/Tool/MCP/Plugin 共享
 */
export interface UnifiedRegistry<T, Id extends string> {
  /** 注册 */
  register(id: Id, item: T): Result<void, Error>;
  /** 注销 */
  unregister(id: Id): Result<void, Error>;
  /** 获取 */
  get(id: Id): Result<T, Error>;
  /** 是否存在 */
  has(id: Id): boolean;
  /** 列出所有 */
  list(): T[];
  /** 清空 */
  clear(): void;
}

// ============================================
// Unified Lifecycle - 统一生命周期
// ============================================

/**
 * 统一生命周期状态
 */
export type LifecycleState = 
  | 'registered'    // 已注册
  | 'initializing'  // 初始化中
  | 'initialized'   // 已初始化
  | 'activating'    // 激活中
  | 'active'        // 已激活
  | 'deactivating'  // 停用中
  | 'inactive'      // 已停用
  | 'destroying'    // 销毁中
  | 'destroyed'     // 已销毁
  | 'error';        // 错误状态

/**
 * 统一生命周期接口
 */
export interface UnifiedLifecycle {
  readonly state: LifecycleState;
  
  initialize(): Promise<Result<void, Error>>;
  activate(): Promise<Result<void, Error>>;
  deactivate(): Promise<Result<void, Error>>;
  destroy(): Promise<Result<void, Error>>;
  
  /** 状态变更事件 */
  onStateChange(handler: (newState: LifecycleState, oldState: LifecycleState) => void): () => void;
}

// ============================================
// Progressive Disclosure - 渐进式披露
// ============================================

/**
 * 渐进式加载级别
 * 符合 SPECIFICATION.md 标准
 */
export type DisclosureLevel = 'metadata' | 'instructions' | 'resources';

/**
 * Skill 元数据（第一级）
 * ~100 tokens
 */
export interface SkillMetadata {
  readonly id: SkillId;
  readonly name: string;
  readonly description: string;
  readonly version?: string;
  readonly author?: string;
  readonly license?: string;
  readonly tags?: string[];
}

/**
 * Skill 指令（第二级）
 * <5000 tokens
 */
export interface SkillInstructions {
  readonly readme: string;
  readonly examples?: string[];
  readonly limitations?: string[];
}

/**
 * Skill 资源（第三级）
 * 按需加载
 */
export interface SkillResources {
  /** scripts/ 目录 */
  readonly scripts?: Record<string, string>;
  /** references/ 目录 */
  readonly references?: Record<string, string>;
  /** assets/ 目录 */
  readonly assets?: Record<string, string>;
}

/**
 * 渐进式 Skill 加载器
 */
export interface ProgressiveSkillLoader {
  /** 加载元数据（第一级） */
  loadMetadata(source: SkillSource): Promise<Result<SkillMetadata, Error>>;
  
  /** 加载指令（第二级） */
  loadInstructions(source: SkillSource): Promise<Result<SkillInstructions, Error>>;
  
  /** 加载资源（第三级） */
  loadResources(source: SkillSource): Promise<Result<SkillResources, Error>>;
  
  /** 加载特定资源 */
  loadResource(source: SkillSource, path: string): Promise<Result<string, Error>>;
}

/**
 * Skill 来源
 */
export interface SkillSource {
  readonly type: 'filesystem' | 'url' | 'inline' | 'registry';
  readonly path: string;
  readonly version?: string;
}

// ============================================
// Unified Config - 统一配置
// ============================================

/**
 * 统一配置接口
 */
export interface UnifiedConfig {
  /** Agent 配置 */
  agent: {
    id?: string;
    name: string;
    description?: string;
  };
  
  /** 执行配置 */
  execution: {
    timeout: number;
    maxMemory: number;
    maxConcurrency: number;
  };
  
  /** 日志配置 */
  logging: {
    level: 'debug' | 'info' | 'warn' | 'error';
    format: 'json' | 'pretty';
  };
  
  /** 缓存配置 */
  cache: {
    enabled: boolean;
    ttl: number;
    maxSize: number;
  };
}

// ============================================
// Re-exports for backward compatibility
// ============================================

export type { JSONSchema as UnifiedJSONSchema };
