/**
 * SDKWork Agent Module - 统一智能体架构入口
 *
 * ⚠️ DEPRECATED: 此模块已弃用，将在 v3.0.0 中移除
 * 请使用新的 DDD 架构：src/core/application/agent-impl.ts
 *
 * 迁移指南：
 * ```typescript
 * // 旧用法（已弃用）
 * import { SDKWorkAgent } from '@sdkwork/agent';
 * const agent = new SDKWorkAgent(config);
 *
 * // 新用法（推荐）
 * import { AgentImpl } from '@sdkwork/core';
 * const agent = new AgentImpl(config);
 * ```
 *
 * @module Agent
 * @version 5.0.0
 * @deprecated 使用 src/core/application/agent-impl.ts 替代
 * @see {@link ../core/application/agent-impl.ts}
 */

// ============================================================================
// Agent Context - 智能体上下文
// ============================================================================
export {
  AgentContext,
  createAgentContext,
} from './agent-context.js';
export type {
  ToolRegistry,
  MCPClient,
  PluginManager,
  MemoryStore,
  SkillRegistry,
  AgentContextConfig,
} from './agent-context.js';

// ============================================================================
// Base Agent - 抽象基类（标准接口）
// ============================================================================
export {
  BaseAgent,
  AgentStatus,
  createAgentConfig,
} from './base-agent.js';
export type {
  BaseAgentEvent,
} from './base-agent.js';

// ============================================================================
// Agents - 智能体集合
// ============================================================================
export {
  // 通用基础智能体
  AssistantAgent,
  createAssistantAgent,
  // 专有智能体 - 任务执行
  TaskAgent,
  createTaskAgent,
  // 专有智能体 - 技能调用
  SkillAgent,
  createSkillAgent,
} from './agents/index.js';
export type {
  // Assistant Agent
  AssistantAgentConfig,
  ConversationHistory,
  // Task Agent
  TaskAgentConfig,
  TaskStep,
  TaskPlan,
  // Skill Agent
  SkillAgentConfig,
  // Common
  AgentType,
  CreateAgentOptions,
} from './agents/index.js';

// ============================================================================
// Core Agent - 核心实现
// ============================================================================
export {
  SDKWorkAgent,
  AgentConfigSchema,
} from './sdkwork-agent.js';
export type {
  ValidatedAgentConfig,
  AgentEvents,
} from './sdkwork-agent.js';

// ============================================================================
// Types - 类型定义
// ============================================================================
export type {
  AgentConfig as SDKWorkAgentConfig,
  AgentCapabilities as SDKWorkAgentCapabilities,
  PlanningConfig,
  MemoryConfig,
  ExecutionConfig,
  AgentState as SDKWorkAgentState,
  ExecutionContext as SDKWorkExecutionContext,
  ExecutionResult as SDKWorkExecutionResult,
  ExecutionStep as SDKWorkExecutionStep,
  Plan,
  PlanStep,
  Reflection,
  Improvement as ImprovementSuggestion,
  MemoryQuery,
  MemoryEntry,
  AgentEvent as SDKWorkAgentEvent,
  LLMConfig,
  LLMProvider,
  LLMDefaults,
  SkillDefinition,
  SkillRunner,
  ReferenceFile,
  ToolDefinition,
  ToolCategory,
  ConfirmLevel,
  ToolRunner,
  ToolContext,
  ToolResult,
  ToolError,
  MCPServerConfig,
  MCPTransport,
  MCPAuth,
  PluginDefinition,
  PluginContext,
  PlanningStrategy,
  ResourceLimits,
  JSONSchema,
  Logger,
} from './types.js';

// ============================================================================
// Factory - 工厂模式
// ============================================================================
export {
  AgentFactory,
  createAgent,
  AgentPresets,
} from './factory.js';

// ============================================================================
// Specialized Agents (Legacy)
// ============================================================================
export { PlanningAgent } from './planning-agent.js';
export { ReflectiveAgent } from './reflective-agent.js';
export { ToolAgent } from './tool-agent.js';
