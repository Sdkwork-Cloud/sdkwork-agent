/**
 * Agent Types - 智能体类型定义
 *
 * 智能体相关的所有类型定义
 *
 * @module AgentTypes
 * @version 1.0.0
 * @standard SDKWork Unified Type System
 */

import type { ID, Logger, BaseConfig, ExecutionError as CoreExecutionError } from './core.js';

// ============================================================================
// Agent Identity
// ============================================================================

/**
 * 智能体身份
 */
export interface AgentIdentity {
  /** 唯一ID */
  id: ID;
  /** 名称 */
  name: string;
  /** 描述 */
  description?: string;
  /** 版本 */
  version: string;
  /** 类型 */
  type: string;
}

// ============================================================================
// Agent Status
// ============================================================================

/**
 * 智能体状态枚举
 */
export enum AgentStatus {
  UNINITIALIZED = 'uninitialized',
  INITIALIZING = 'initializing',
  IDLE = 'idle',
  READY = 'ready',
  EXECUTING = 'executing',
  PAUSED = 'paused',
  ERROR = 'error',
  DESTROYING = 'destroying',
  DESTROYED = 'destroyed',
}

// ============================================================================
// Agent State
// ============================================================================

/**
 * 智能体状态
 */
export interface AgentState {
  /** 状态值 */
  status: AgentStatus;
  /** 创建时间 */
  readonly createdAt: Date;
  /** 最后更新时间 */
  lastUpdatedAt: Date;
  /** 执行次数 */
  executionCount: number;
  /** 总执行时间(ms) */
  totalExecutionTime: number;
  /** 元数据 */
  metadata: Record<string, unknown>;
}

// ============================================================================
// Agent Capabilities
// ============================================================================

/**
 * 智能体能力
 */
export interface AgentCapabilities {
  /** 是否支持规划 */
  canPlan: boolean;
  /** 是否支持推理 */
  canReason: boolean;
  /** 是否支持工具 */
  canUseTools: boolean;
  /** 是否支持技能 */
  canUseSkills: boolean;
  /** 是否支持记忆 */
  hasMemory: boolean;
  /** 是否支持学习 */
  canLearn: boolean;
  /** 是否支持反思 */
  canReflect: boolean;
  /** 是否支持流式输出 */
  canStream: boolean;
}

// ============================================================================
// Execution Types
// ============================================================================

/**
 * 执行限制
 */
export interface ExecutionLimits {
  /** 最大Token数 */
  maxTokens?: number;
  /** 最大执行时间(ms) */
  maxExecutionTime?: number;
  /** 最大迭代次数 */
  maxIterations?: number;
  /** 最大并发数 */
  maxConcurrency?: number;
}

/**
 * 执行上下文
 */
export interface ExecutionContext {
  /** 执行ID */
  readonly executionId: string;
  /** 父执行ID */
  readonly parentExecutionId?: string;
  /** 输入 */
  readonly input: unknown;
  /** 开始时间 */
  readonly startedAt: Date;
  /** 元数据 */
  readonly metadata: Record<string, unknown>;
}

/**
 * 执行步骤
 */
export interface ExecutionStep {
  /** 步骤ID */
  id: string;
  /** 步骤类型 */
  type: string;
  /** 描述 */
  description: string;
  /** 状态 */
  status: 'pending' | 'running' | 'completed' | 'failed';
  /** 开始时间 */
  startedAt?: Date;
  /** 结束时间 */
  endedAt?: Date;
  /** 输入 */
  input?: unknown;
  /** 输出 */
  output?: unknown;
  /** 错误 */
  error?: ExecutionError;
}

/**
 * 执行错误
 * 扩展核心 ExecutionError，添加 details 字段
 */
export interface ExecutionError extends CoreExecutionError {
  /** 详情 */
  details?: unknown;
}

/**
 * 执行结果
 */
export interface ExecutionResult<T = unknown> {
  /** 是否成功 */
  success: boolean;
  /** 输出 */
  output?: T;
  /** 错误 */
  error?: ExecutionError;
  /** 执行ID */
  executionId: string;
  /** 执行时间(ms) */
  duration: number;
  /** Token消耗 */
  tokensUsed?: number;
  /** 执行步骤 */
  steps?: ExecutionStep[];
}

// ============================================================================
// Agent Events
// ============================================================================

/**
 * Agent事件
 */
export interface AgentEvent<T = unknown> {
  /** 事件类型 */
  type: string;
  /** 时间戳 */
  timestamp: Date;
  /** 事件源 */
  source: string;
  /** 事件数据 */
  payload: T;
}

/**
 * 状态变更事件
 */
export interface StateChangeEvent {
  type: 'state:changed';
  payload: { from: AgentStatus; to: AgentStatus };
}

/**
 * 执行开始事件
 */
export interface ExecutionStartEvent {
  type: 'agent:executing';
  payload: { executionId: string; input: unknown };
}

/**
 * 执行完成事件
 */
export interface ExecutionCompleteEvent {
  type: 'agent:completed';
  payload: { executionId: string; result: ExecutionResult };
}

/**
 * 执行失败事件
 */
export interface ExecutionFailedEvent {
  type: 'agent:failed';
  payload: { executionId: string; error: ExecutionError };
}

// ============================================================================
// Agent Interfaces
// ============================================================================

/**
 * 基础Agent接口
 */
export interface IAgent extends AgentIdentity {
  /** 当前状态 */
  readonly state: AgentState;
  /** 能力 */
  readonly capabilities: AgentCapabilities;

  /** 初始化 */
  initialize(): Promise<void>;
  /** 执行 */
  execute<T>(input: unknown, context?: Record<string, unknown>): Promise<ExecutionResult<T>>;
  /** 销毁 */
  destroy(): Promise<void>;
}

/**
 * 可配置接口
 */
export interface IConfigurable<T extends AgentConfig> {
  /** 获取配置 */
  getConfig(): T;
  /** 更新配置 */
  updateConfig(config: Partial<T>): void;
}

/**
 * 有状态接口
 */
export interface IStateful<T extends AgentState> {
  /** 获取状态 */
  getState(): T;
  /** 设置状态 */
  setState(state: Partial<T>): void;
}

/**
 * 生命周期接口
 */
export interface ILifecycle {
  /** 初始化前钩子 */
  onBeforeInitialize?(): Promise<void> | void;
  /** 初始化后钩子 */
  onAfterInitialize?(): Promise<void> | void;
  /** 执行前钩子 */
  onBeforeExecute?(input: unknown, context?: Record<string, unknown>): Promise<void> | void;
  /** 执行后钩子 */
  onAfterExecute?(result: ExecutionResult): Promise<void> | void;
  /** 销毁前钩子 */
  onBeforeDestroy?(): Promise<void> | void;
  /** 销毁后钩子 */
  onAfterDestroy?(): Promise<void> | void;
}

// ============================================================================
// Service Interfaces
// ============================================================================

/**
 * 工具注册表接口
 */
export interface ToolRegistry {
  /** 获取工具 */
  get(name: string): unknown | undefined;
  /** 执行工具 */
  execute(name: string, params: unknown): Promise<unknown>;
  /** 列出所有工具 */
  list(): string[];
}

/**
 * MCP 客户端接口
 */
export interface MCPClient {
  /** 调用工具 */
  callTool(server: string, tool: string, params: unknown): Promise<unknown>;
  /** 获取可用工具 */
  getTools(server: string): Promise<string[]>;
  /** 列出所有服务器 */
  listServers(): string[];
}

/**
 * 插件管理器接口
 */
export interface PluginManager {
  /** 加载插件 */
  load(pluginId: string): Promise<boolean>;
  /** 卸载插件 */
  unload(pluginId: string): Promise<boolean>;
  /** 获取插件 */
  get(pluginId: string): unknown | undefined;
  /** 列出所有插件 */
  list(): string[];
}

/**
 * 技能注册表接口
 */
export interface SkillRegistry {
  /** 注册技能 */
  register(skill: SkillDefinition): void;
  /** 注销技能 */
  unregister(name: string): boolean;
  /** 获取技能 */
  get(name: string): SkillDefinition | undefined;
  /** 列出所有技能 */
  list(): SkillDefinition[];
  /** 执行技能 */
  execute(name: string, input: unknown): Promise<unknown>;
}

/**
 * 记忆存储接口
 */
export interface MemoryStore {
  /** 保存记忆 */
  save(key: string, value: unknown): Promise<void>;
  /** 读取记忆 */
  load(key: string): Promise<unknown | undefined>;
  /** 删除记忆 */
  delete(key: string): Promise<void>;
  /** 搜索记忆 */
  search(query: string): Promise<Array<{ key: string; value: unknown }>>;
  /** 清空记忆 */
  clear(): Promise<void>;
}

// ============================================================================
// Skill Definition
// ============================================================================

/**
 * 技能定义
 */
export interface SkillDefinition {
  /** 技能名称 */
  name: string;
  /** 描述 */
  description: string;
  /** 版本 */
  version: string;
  /** 输入参数 */
  parameters?: Record<string, unknown>;
  /** 执行函数 */
  runner?: (input: unknown) => Promise<unknown>;
}

// ============================================================================
// Agent Configuration
// ============================================================================

/**
 * 智能体配置
 */
export interface AgentConfig extends BaseConfig {
  /** 身份配置 */
  identity?: Partial<AgentIdentity>;
  /** 能力配置 */
  capabilities?: Partial<AgentCapabilities>;
  /** 执行限制 */
  limits?: ExecutionLimits;
  /** 日志器 */
  logger?: Logger;
}

/**
 * 智能体上下文配置
 */
export interface AgentContextConfig {
  /** LLM 服务 */
  llm: unknown;
  /** 日志器 */
  logger?: Logger;
  /** 工具注册表 */
  tools?: ToolRegistry;
  /** MCP 客户端 */
  mcp?: MCPClient;
  /** 插件管理器 */
  plugins?: PluginManager;
  /** 记忆存储 */
  memory?: MemoryStore;
  /** 技能注册表 */
  skills?: SkillRegistry;
}

/**
 * 智能体上下文
 */
export interface AgentContext {
  /** LLM 服务 */
  llm: unknown;
  /** 日志器 */
  logger: Logger;
  /** 工具注册表 */
  tools: ToolRegistry;
  /** MCP 客户端 */
  mcp: MCPClient;
  /** 插件管理器 */
  plugins: PluginManager;
  /** 记忆存储 */
  memory: MemoryStore;
  /** 技能注册表 */
  skills: SkillRegistry;
}
