/**
 * SDKWork Browser Agent
 * 统一智能体架构 - DDD Domain-Driven Design
 *
 * 🎯 推荐用法（DDD 新架构）：
 * ```typescript
 * import { AgentImpl } from '@sdkwork/browser-agent';
 *
 * const agent = new AgentImpl({
 *   name: 'MyAgent',
 *   llm: openaiProvider,
 *   skills: [mySkill],
 *   tools: [myTool],
 * });
 * ```
 *
 * 核心特性：
 * - ✅ DDD分层架构 (Domain/Application/Infrastructure)
 * - ✅ 统一Agent架构 (AgentImpl)
 * - ✅ 技能系统 Skill System (遵循agentskills.io标准)
 * - ✅ 工具系统 Tool System (分类和确认级别)
 * - ✅ MCP客户端 (Model Context Protocol)
 * - ✅ 插件系统 Plugin System
 * - ✅ 规划系统 (MCTS/HTN/ToT)
 * - ✅ RAG系统 (Retrieval-Augmented Generation)
 * - ✅ 反思系统 (Reflection/Self-Improvement)
 *
 * 参考架构：
 * - Claude Code: Tool-first设计
 * - OpenCode: 开源标准
 * - OpenClaw: 插件架构
 * - LangGraph: 状态图驱动
 * - Temporal: 工作流引擎
 * - Anthropic MCP: 模型上下文协议
 *
 * @packageDocumentation
 */

// ============================================
// DDD Core - Domain + Application Layer
// ============================================
export * from './core';

// ============================================
// Agent - Skill-Based Architecture
// ============================================
export { Agent } from './agent';
export type {
  AgentConfig,
  LLMConfig,
  Skill,
  Tool,
} from './agent';
export { ReasonSkill, PlanSkill, MemorySkill } from './agent';

// ============================================
// Planning Algorithms
// ============================================
export { TreeOfThoughts } from './algorithms/tree-of-thoughts.js';
export { HNSWIndex, createHNSWIndex } from './algorithms/hnsw.js';
export { NeuralMCTS } from './algorithms/neural-mcts.js';

// ============================================
// Memory System
// ============================================
export { MemGPTMemory } from './memory/memgpt-memory.js';
export { HierarchicalMemory, createHierarchicalMemory } from './memory/hierarchical-memory.js';
export type { MemoryEntry, MemoryStats, MemoryRetrievalResult } from './memory/hierarchical-memory.js';

// ============================================
// Advanced Algorithms
// ============================================
export { ScannIndex, createScannIndex } from './algorithms/scann-index.js';
export type { ScannConfig } from './algorithms/scann-index.js';

export { SpeculativeDecoder, createSpeculativeDecoder, MockLanguageModel } from './algorithms/speculative-decoding.js';
export type { SpeculativeDecodingConfig, DecodingResult, LanguageModel } from './algorithms/speculative-decoding.js';

// ============================================
// LLM Providers
// ============================================
export type {
  LLMProvider,
  LLMRequest,
  LLMResponse,
  LLMStreamChunk,
  LLMMessage,
  ToolDefinition,
  ToolCall,
} from './llm/provider.js';

// ============================================
// Unified Execution Engine
// ============================================
export {
  ExecutionEngine,
  ScriptExecutor,
  ToolExecutor,
  MCPExecutor,
  PluginExecutor,
  ExecutionTracer,
  ResourceMonitor,
} from './execution';

export type {
  Executable,
  ExecutableType,
  ExecutionContext,
  ExecutionResult,
  ExecutionStep,
  ExecutionError,
  ExecutionMetadata,
  ResourceLimits,
  ResourceUsage,
  ExecutionLogger,
  LLMService,
  MemoryService,
  ToolRegistry,
  MCPClient,
  PluginManager,
  Plugin,
  ScriptExecutable,
  ScriptLanguage,
  ScriptSandbox,
  ToolExecutable,
  ToolCategory,
  ToolConfirmationLevel,
  MCPExecutable,
  MCPResource,
  MCPResourceContent,
  PluginExecutable,
  PluginManifest,
  PluginHook,
} from './execution';

// ============================================
// TUI (Terminal User Interface)
// ============================================
export {
  TUIRenderer,
  LoadingIndicator,
  createRenderer,
  DEFAULT_THEME,
  MarkdownRenderer,
  renderMarkdown,
  printMarkdown,
  StreamRenderer,
  createStreamRenderer,
  streamOutput,
  MultilineInput,
  readMultiline,
} from './tui';

export type {
  Theme,
  StreamOptions,
  MultilineOptions,
} from './tui';

// ============================================
// Configuration
// ============================================
export {
  ConfigManager,
  getConfigManager,
  resetConfigManager,
  PREDEFINED_PROVIDERS,
  getSupportedProviders,
  getProviderConfig,
  getModelDefinition,
  getProviderModels,
  getDefaultModel,
  validateModelConfig,
  toLLMConfig,
} from './config';

export type {
  ModelProvider,
  ModelDefinition,
  ProviderConfig,
  UserModelConfig,
} from './config';

// ============================================
// Utilities
// ============================================
export { Logger } from './utils/logger.js';
export { Container as DIContainer } from './di/container.js';

// ============================================
// Version & Environment
// ============================================
// Node.js 专用架构 - 不再支持浏览器环境
export const VERSION = '3.0.0';
export const AGENT_SKILLS_SPEC_VERSION = '1.0.0';

// ============================================
// Simplified API - 简洁的 Agent 创建 API
// ============================================

import type { LLMProvider } from './llm/provider.js';
import type { Skill } from './core/domain/skill.js';
import type { Tool } from './core/domain/tool.js';
import { AgentImpl } from './core/application/agent-impl.js';

export interface CreateAgentOptions {
  /** Agent 名称 */
  name?: string;
  /** Agent 描述 */
  description?: string;
  /** 技能列表 */
  skills?: Skill[];
  /** 工具列表 */
  tools?: Tool[];
}

/**
 * 创建 Agent - 简洁的 API
 * 
 * @example
 * ```typescript
 * import { createAgent } from '@sdkwork/agent';
 * 
 * const agent = createAgent(openaiProvider, {
 *   name: 'MyAgent',
 *   skills: [mySkill],
 *   tools: [myTool],
 * });
 * 
 * const response = await agent.chat('Hello!');
 * ```
 */
export function createAgent(llmProvider: LLMProvider, options: CreateAgentOptions = {}) {
  return new AgentImpl({
    name: options.name || 'Agent',
    description: options.description,
    llm: llmProvider,
    skills: options.skills,
    tools: options.tools,
  });
}

// 为了向后兼容，保留 quickCreateAgent 作为别名
/** @deprecated 使用 createAgent 代替 */
export const quickCreateAgent = createAgent;

// Default export
export { Agent as default } from './agent';
