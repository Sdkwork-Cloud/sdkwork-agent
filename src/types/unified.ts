/**
 * Unified Type System
 *
 * Consolidates all type definitions into a single source of truth.
 * Eliminates duplicate type definitions across the codebase.
 */

import type { JSONSchema7 } from 'json-schema';

// ============================================
// Core Types
// ============================================

/**
 * Unique identifier
 */
export type UUID = string;

/**
 * Timestamp
 */
export type Timestamp = number;

/**
 * Non-empty string
 */
export type NonEmptyString = string;

// ============================================
// Error Types (Unified)
// ============================================

/**
 * Error codes (single source of truth)
 */
export const ErrorCodes = {
  // Skill Errors
  SKILL_NOT_FOUND: 'SKILL_NOT_FOUND',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  EXECUTION_ERROR: 'EXECUTION_ERROR',
  TIMEOUT_ERROR: 'TIMEOUT_ERROR',
  COMPOSITE_ERROR: 'COMPOSITE_ERROR',
  SUBSKILL_ERROR: 'SUBSKILL_ERROR',

  // MCP Errors
  MCP_NOT_FOUND: 'MCP_NOT_FOUND',
  MCP_CONNECTION_ERROR: 'MCP_CONNECTION_ERROR',
  MCP_TIMEOUT_ERROR: 'MCP_TIMEOUT_ERROR',
  MCP_ERROR: 'MCP_ERROR',

  // LLM Errors
  LLM_ERROR: 'LLM_ERROR',
  LLM_RATE_LIMIT: 'LLM_RATE_LIMIT',
  LLM_CONTEXT_LENGTH: 'LLM_CONTEXT_LENGTH',

  // Configuration Errors
  CONFIG_ERROR: 'CONFIG_ERROR',
  PARSE_ERROR: 'PARSE_ERROR',

  // System Errors
  UNKNOWN_ERROR: 'UNKNOWN_ERROR',
  NOT_IMPLEMENTED: 'NOT_IMPLEMENTED',
} as const;

/**
 * Error code type
 */
export type ErrorCode = typeof ErrorCodes[keyof typeof ErrorCodes];

/**
 * Error details
 */
export interface ErrorDetails {
  code: ErrorCode;
  message: string;
  cause?: unknown;
  retryable?: boolean;
  metadata?: Record<string, unknown>;
}

// ============================================
// Skill Types (Unified)
// ============================================

/**
 * Skill metadata
 */
export interface SkillMetadata {
  name: string;
  description: string;
  version: string;
  author?: string;
  category: string;
  tags: string[];
  license?: string;
  compatibility?: string;
}

/**
 * Skill lifecycle configuration
 */
export interface SkillLifecycle {
  lazyLoad: boolean;
  cacheable: boolean;
  timeout: number;
  retries: number;
}

/**
 * Skill implementation types
 */
export type SkillImplementationType = 'code' | 'prompt' | 'composite' | 'mcp';

/**
 * Skill implementation
 */
export interface SkillImplementation {
  type: SkillImplementationType;
  prompt?: string;
  subskills?: string[];
  mcpServer?: string;
}

/**
 * Skill example
 */
export interface SkillExample {
  title: string;
  description?: string;
  parameters: Record<string, unknown>;
  expectedOutput?: string;
}

/**
 * Skill reference
 */
export interface SkillReference {
  name: string;
  version?: string;
  required: boolean;
}

/**
 * Skill definition (unified)
 */
export interface Skill {
  metadata: SkillMetadata;
  parameters: JSONSchema7;
  implementation: SkillImplementation;
  lifecycle: SkillLifecycle;
  readme?: string;
  examples?: SkillExample[];
  references?: SkillReference[];
}

/**
 * Skill handler function
 */
export type SkillHandler = (
  params: Record<string, unknown>,
  context: SkillContext
) => Promise<SkillResult>;

/**
 * Skill execution context (unified)
 */
export interface SkillContext {
  skillName: string;
  executionId: UUID;
  sessionId: string;
  timestamp: Timestamp;
  parentExecutionId?: UUID;
  metadata?: Record<string, unknown>;
}

/**
 * Skill execution result
 */
export interface SkillResult {
  success: boolean;
  output?: unknown;
  error?: ErrorDetails;
  metadata?: {
    executionTime?: number;
    tokenUsage?: number;
    retries?: number;
  };
}

// ============================================
// Agent Types (Unified)
// ============================================

/**
 * Agent configuration
 */
export interface AgentConfig {
  name: string;
  description?: string;
  version?: string;
  systemPrompt?: string;
  maxIterations?: number;
  timeout?: number;
}

/**
 * Smart agent configuration
 */
export interface SmartAgentConfig extends AgentConfig {
  autoDecide?: boolean;
  maxAutoIterations?: number;
  enableStreaming?: boolean;
  evaluationEnabled?: boolean;
  evaluationLevel?: 'none' | 'basic' | 'standard' | 'strict';
}

/**
 * Execution context (unified)
 */
export interface ExecutionContext {
  executionId: UUID;
  sessionId: string;
  skillName: string;
  parentExecutionId?: UUID;
  timestamp: Timestamp;
  metadata?: Record<string, unknown>;
}

// ============================================
// LLM Types (Unified)
// ============================================

/**
 * LLM message
 */
export interface LLMMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  name?: string;
}

/**
 * LLM request
 */
export interface LLMRequest {
  messages: LLMMessage[];
  model?: string;
  temperature?: number;
  maxTokens?: number;
  tools?: ToolDefinition[];
  toolChoice?: 'auto' | 'none' | { type: 'function'; function: { name: string } };
}

/**
 * LLM response
 */
export interface LLMResponse {
  id: string;
  model: string;
  content: string;
  role: 'assistant';
  finishReason: 'stop' | 'length' | 'tool_calls' | 'content_filter';
  toolCalls?: ToolCall[];
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

/**
 * Tool definition
 */
export interface ToolDefinition {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: JSONSchema7;
  };
}

/**
 * Tool call
 */
export interface ToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string;
  };
}

/**
 * Tool result
 */
export interface ToolResult {
  toolCallId: string;
  role: 'tool';
  content: string;
}

// ============================================
// MCP Types (Unified)
// ============================================

/**
 * MCP server configuration
 */
export interface MCPServerConfig {
  name: string;
  url: string;
  auth?: {
    type: 'bearer' | 'apiKey';
    token: string;
  };
  timeout?: number;
  retries?: number;
}

/**
 * MCP resource
 */
export interface MCPResource {
  uri: string;
  name: string;
  description?: string;
  mimeType?: string;
}

/**
 * MCP tool
 */
export interface MCPTool {
  name: string;
  description: string;
  inputSchema: JSONSchema7;
}

// ============================================
// Decision Types (Unified)
// ============================================

/**
 * Decision types
 */
export type DecisionType = 'skill' | 'tool' | 'llm' | 'multi' | 'composite';

/**
 * Decision
 */
export interface Decision {
  type: DecisionType;
  confidence: number;
  reasoning: string;
  skills?: string[];
  tools?: string[];
  prompt?: string;
  nextSteps?: Decision[];
}

/**
 * Decision context
 */
export interface DecisionContext {
  input: string;
  history: string[];
  availableSkills: string[];
  availableTools: string[];
  metadata?: Record<string, unknown>;
}

// ============================================
// Evaluation Types (Unified)
// ============================================

/**
 * Evaluation level
 */
export type EvaluationLevel = 'none' | 'basic' | 'standard' | 'strict';

/**
 * Evaluation strategy
 */
export type EvaluationStrategy = 'exact' | 'semantic' | 'schema' | 'custom';

/**
 * Evaluation result
 */
export interface EvaluationResult {
  passed: boolean;
  score: {
    overall: number;
    accuracy?: number;
    relevance?: number;
    completeness?: number;
  };
  feedback: string;
  suggestions: string[];
  metadata?: Record<string, unknown>;
}

// ============================================
// Event Types (Unified)
// ============================================

/**
 * Event types
 */
export type EventType =
  | 'skill:start'
  | 'skill:complete'
  | 'skill:error'
  | 'skill:retry'
  | 'llm:request'
  | 'llm:response'
  | 'decision:made'
  | 'execution:start'
  | 'execution:complete';

/**
 * Base event
 */
export interface BaseEvent {
  type: EventType;
  timestamp: Timestamp;
  executionId: UUID;
  sessionId: string;
  metadata?: Record<string, unknown>;
}

/**
 * Skill event
 */
export interface SkillEvent extends BaseEvent {
  skillName: string;
  parameters?: Record<string, unknown>;
  result?: SkillResult;
  error?: ErrorDetails;
}

// ============================================
// Utility Types
// ============================================

/**
 * Nullable type
 */
export type Nullable<T> = T | null | undefined;

/**
 * Optional type
 */
export type Optional<T> = T | undefined;

/**
 * Deep partial type
 */
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

/**
 * Async function type
 */
export type AsyncFunction<T = unknown, R = unknown> = (arg: T) => Promise<R>;
