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

// Import LLMProvider type for use in convenience functions
import type { LLMProvider } from './llm/provider.js';

// ============================================
// Unified Agent Architecture (Legacy)
// ============================================
export {
  SDKWorkAgent,
  AgentStatus,
  AgentConfigSchema,
} from './agent';

export type {
  ValidatedAgentConfig,
  AgentEvents,
} from './agent';

// ============================================
// Agent Factory & Specialized Agents
// ============================================
export {
  AgentFactory,
  createAgent,
  AgentPresets,
} from './agent/factory';

export { PlanningAgent, PlanningStrategy } from './agent/planning-agent';
export { ReflectiveAgent } from './agent/reflective-agent';
export { ToolAgent } from './agent/tool-agent';

// ============================================
// Skill System (agentskills.io compliant)
// ============================================
export {
  SkillRegistry,
  SkillExecutor,
  SkillLoader,
} from './skills/core';

export type {
  Skill,
  SkillResult,
  SkillManifest,
  LoadedSkill,
  SkillError,
  DisclosureLevel,
} from './skills/core/types';

// ============================================
// Planning Algorithms
// ============================================
export { TreeOfThoughts } from './algorithms/tree-of-thoughts';
export { HNSWIndex, createHNSWIndex } from './algorithms/hnsw';
export { NeuralMCTS } from './algorithms/neural-mcts';

// ============================================
// Memory System
// ============================================
export { MemGPTMemory } from './memory/memgpt-memory';
export { HierarchicalMemory, createHierarchicalMemory } from './memory/hierarchical-memory';
export type { MemoryEntry, MemoryStats, MemoryRetrievalResult } from './memory/hierarchical-memory';

// ============================================
// Advanced Algorithms
// ============================================
export { ScannIndex, createScannIndex } from './algorithms/scann-index';
export type { ScannConfig } from './algorithms/scann-index';

export { SpeculativeDecoder, createSpeculativeDecoder, MockLanguageModel } from './algorithms/speculative-decoding';
export type { SpeculativeDecodingConfig, DecodingResult, LanguageModel } from './algorithms/speculative-decoding';

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
} from './llm/provider';

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
// Utilities
// ============================================
export { Logger } from './utils/logger';
export { Container as DIContainer } from './di/container';

// ============================================
// Version & Environment
// ============================================
export const VERSION = '2.0.0';
export const AGENT_SKILLS_SPEC_VERSION = '1.0.0';

export const isBrowser = typeof window !== 'undefined';
export const isNode = typeof window === 'undefined';

// ============================================
// Convenience Exports
// ============================================

export interface QuickAgentOptions {
  name?: string;
  skills?: import('./core/domain/skill').Skill[];
  tools?: import('./core/domain/tool').Tool[];
}

/**
 * 快速创建Agent (使用新的DDD架构)
 */
export async function quickCreateAgent(llmProvider: LLMProvider, options: QuickAgentOptions = {}) {
  const { AgentImpl } = await import('./core/application/agent-impl');
  return new AgentImpl({
    name: options.name || 'Agent',
    llm: llmProvider,
    skills: options.skills,
    tools: options.tools,
  });
}

/**
 * 快速创建智能Agent (使用新的DDD架构)
 * @deprecated 使用 quickCreateAgent 代替
 */
export async function createSmartAgent(llmProvider: LLMProvider, name?: string) {
  return quickCreateAgent(llmProvider, { name: name || 'SmartAgent' });
}

/**
 * 快速创建规划Agent (使用新的DDD架构)
 * @deprecated 使用 quickCreateAgent 代替
 */
export async function createPlanningAgent(llmProvider: LLMProvider, name?: string) {
  return quickCreateAgent(llmProvider, { name: name || 'PlannerAgent' });
}

/**
 * 快速创建反思Agent (使用新的DDD架构)
 * @deprecated 使用 quickCreateAgent 代替
 */
export async function createReflectiveAgent(llmProvider: LLMProvider, name?: string) {
  return quickCreateAgent(llmProvider, { name: name || 'ReflectiveAgent' });
}

// Default export
import { SDKWorkAgent as _SDKWorkAgent } from './agent';
export { _SDKWorkAgent as default };
