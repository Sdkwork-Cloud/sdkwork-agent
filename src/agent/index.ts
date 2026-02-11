/**
 * Agent Framework - 智能体框架
 *
 * @module Agent
 * @version 5.0.0
 *
 * @example
 * ```typescript
 * import { createAgent, Agent, ReasonSkill, createToolRegistry, createSkillRegistry } from '@sdkwork/agent';
 *
 * const agent = createAgent({
 *   name: 'Assistant',
 *   llm: openaiService,
 *   memory,
 *   logger,
 * });
 *
 * // 注册工具
 * agent.registerTool({
 *   id: 'calculator',
 *   name: 'calculator',
 *   description: 'Perform calculations',
 *   parameters: z.object({ expression: z.string() }),
 *   execute: async (params) => ({ success: true, data: eval(params.expression) }),
 * });
 *
 * await agent.initialize();
 *
 * const response = await agent.chat({
 *   messages: [{ role: 'user', content: 'Calculate 2+2' }],
 * });
 * ```
 */

// ============================================================================
// Core
// ============================================================================

export {
  Agent,
  createAgent,
  ReasonSkill,
  PlanSkill,
  MemorySkill,
} from './agent.js';
export type { AgentDeps } from './agent.js';

// ============================================================================
// Domain Types
// ============================================================================

export type {
  AgentId,
  SessionId,
  ExecutionId,
  SkillId,
  ToolId,
  MemoryId,
  AgentConfig,
  LLMConfig,
  MemoryConfig,
  ChatMessage,
  ChatRequest,
  ChatResponse,
  ChatStreamChunk,
  Skill,
  SkillContext,
  SkillResult,
  Tool,
  ToolContext,
  LLMService,
  SkillRegistry,
  MemoryService,
  Logger,
  ThinkingResult,
} from './domain/types.js';
export type { ToolResult } from '../tools/core/types.js';

export {
  AgentState,
  ExecutionState,
  ThinkingStrategy,
} from './domain/types.js';

// ============================================================================
// Events
// ============================================================================

export type {
  EventBus,
  EventSubscription,
  UnifiedEvent,
  AgentEvent,
  SkillEvent,
  ToolEvent,
} from './domain/events.js';

export {
  createEventBus,
  getGlobalEventBus,
} from './domain/events.js';

// ============================================================================
// Tools
// ============================================================================

export type { ToolExecutionOptions } from '../tools/core/types.js';
export {
  createToolRegistry,
} from '../tools/registry.js';
export { ToolRegistry } from '../tools/registry.js';

// ============================================================================
// Skills
// ============================================================================

export type { SkillExecutionOptions } from './skills/registry.js';
export {
  SkillRegistryImpl,
  createSkillRegistry,
} from './skills/registry.js';

// ============================================================================
// Thinking
// ============================================================================

export type {
  ReActConfig,
  ReActState,
  ThinkingStreamEvent,
} from './thinking/react-engine.js';

export {
  ReActEngine,
  createReActEngine,
} from './thinking/react-engine.js';

// ============================================================================
// Default
// ============================================================================

export { Agent as default } from './agent.js';

export const VERSION = '5.0.0';
