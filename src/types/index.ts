/**
 * SDKWork Unified Type System
 *
 * 统一的类型定义系统 - 所有模块共享的类型定义
 *
 * 设计原则：
 * 1. 单一事实来源 - 每种类型只在一个地方定义
 * 2. 清晰分层 - 核心类型 -> 领域类型 -> 应用类型
 * 3. 向后兼容 - 通过类型别名支持旧代码
 * 4. 完整导出 - 所有类型都通过此模块导出
 *
 * @module Types
 * @version 2.0.0
 * @standard SDKWork Unified Type System
 */

// ============================================================================
// Core Types - 核心基础类型
// ============================================================================
export type {
  ID,
  Timestamp,
  Version,
  JSONValue,
  JSONObject,
  JSONArray,
  Serializable,
  ErrorCode,
  StatusCode,
  LogLevel,
  LogContext,
  LogEntry,
  Logger,
  BaseConfig,
  BaseEvent,
  Result,
  SuccessResult,
  FailureResult,
  ExecutionError,
  ExecutionResultBase,
  EventHandler,
  EventEmitter,
  ValidationError,
  ValidationResult,
  Validator,
  ConfigChangeEvent,
} from './core';

// ============================================================================
// Agent Types - 智能体类型
// ============================================================================
export {
  AgentStatus,
} from './agent';
export type {
  AgentIdentity,
  AgentState,
  AgentCapabilities,
  ExecutionLimits,
  AgentConfig,
  ExecutionContext,
  ExecutionStep,
  // ExecutionError - 从 core.js 导出，避免重复
  ExecutionResult,
  AgentEvent,
  StateChangeEvent,
  ExecutionStartEvent,
  ExecutionCompleteEvent,
  ExecutionFailedEvent,
  IAgent,
  IConfigurable,
  IStateful,
  ILifecycle,
  ToolRegistry,
  MCPClient,
  PluginManager,
  SkillRegistry,
  MemoryStore,
  AgentContext,
  AgentContextConfig,
} from './agent';

// ============================================================================
// Legacy Compatibility - 向后兼容
// ============================================================================

// 为了向后兼容，导出类型别名
/** @deprecated 使用 AgentConfig */
export type AgentConfiguration = import('./agent').AgentConfig;

/** @deprecated 使用 ExecutionResult */
export type AgentExecutionResult<T = unknown> = import('./agent').ExecutionResult<T>;

/** @deprecated 使用 ExecutionContext */
export type AgentExecutionContext = import('./agent').ExecutionContext;

/** @deprecated 使用 ExecutionStep */
export type AgentExecutionStep = import('./agent').ExecutionStep;

/** @deprecated 使用 Logger */
export type AgentLogger = import('./core').Logger;
