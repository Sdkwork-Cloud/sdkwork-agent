/**
 * Agent Domain - 智能体领域核心
 * 
 * 设计原则：
 * 1. DDD 领域驱动 - 高内聚低耦合
 * 2. 极简主义 - 核心概念最少化
 * 3. OpenAI 兼容 - 标准接口
 * 4. 事件驱动 - 完整事件模型
 * 
 * @domain Agent
 * @version 4.0.0
 * @standard Industry Leading
 */

import type { MemoryStore } from './memory';
import type { SkillRegistry } from './skill.js';
import type { ToolRegistry } from './tool.js';
import type { LLMProvider } from '../../llm/provider.js';
import type { ExecutionEngine } from '../application/execution-engine.js';


// ============================================
// Domain Events - 领域事件
// ============================================

export type AgentEventType =
  // 生命周期事件
  | 'agent:initialized'
  | 'agent:started'
  | 'agent:stopped'
  | 'agent:destroyed'
  | 'agent:error'
  | 'agent:reset'
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
// Domain Entities - 领域实体
// ============================================

/**
 * Agent ID - 值对象
 */
export type AgentId = string;

/**
 * Session ID - 值对象
 */
export type SessionId = string;

/**
 * Execution ID - 值对象
 */
export type ExecutionId = string;

/**
 * Agent 状态 - 枚举
 */
export enum AgentState {
  IDLE = 'idle',
  INITIALIZING = 'initializing',
  READY = 'ready',
  CHATTING = 'chatting',
  EXECUTING = 'executing',
  ERROR = 'error',
  DESTROYED = 'destroyed',
}

// ============================================
// Chat Domain - 对话领域
// ============================================

/**
 * 对话消息 - 核心领域对象
 */
export interface ChatMessage {
  id: string;
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string | ChatContentPart[];
  name?: string;
  toolCalls?: ToolCall[];
  toolCallId?: string;
  metadata?: Record<string, unknown>;
  timestamp: number;
}

/**
 * 消息内容部分（多模态）
 */
export type ChatContentPart =
  | { type: 'text'; text: string }
  | { type: 'image_url'; imageUrl: { url: string; detail?: 'low' | 'high' | 'auto' } }
  | { type: 'file'; file: { name: string; content: string; mimeType: string } };

/**
 * 工具调用
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
 * 对话请求 - OpenAI 兼容
 */
export interface ChatRequest {
  // 核心参数
  messages: ChatMessage[];
  model?: string;
  
  // 流式控制
  stream?: boolean;
  
  // 生成参数
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
  stop?: string | string[];
  
  // 工具
  tools?: ToolDefinition[];
  toolChoice?: 'none' | 'auto' | 'required' | { type: 'function'; function: { name: string } };
  
  // 响应格式
  responseFormat?: { type: 'text' | 'json_object' | 'json_schema'; schema?: unknown };
  
  // 会话
  sessionId?: SessionId;
  
  // 元数据
  metadata?: Record<string, unknown>;
}

/**
 * 对话响应 - OpenAI 兼容
 */
export interface ChatResponse {
  id: string;
  object: 'chat.completion';
  created: number;
  model: string;
  choices: ChatChoice[];
  usage: ChatUsage;
  systemFingerprint?: string;
}

/**
 * 对话选择
 */
export interface ChatChoice {
  index: number;
  message: ChatMessage;
  finishReason: 'stop' | 'length' | 'tool_calls' | 'content_filter' | null;
  logprobs?: Logprobs | null;
}

/**
 * 使用统计
 */
export interface ChatUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

/**
 * 对数概率
 */
export interface Logprobs {
  content: TokenLogprob[] | null;
}

export interface TokenLogprob {
  token: string;
  logprob: number;
  bytes: number[] | null;
  topLogprobs: TopLogprob[];
}

export interface TopLogprob {
  token: string;
  logprob: number;
  bytes: number[] | null;
}

/**
 * 流式块 - OpenAI 兼容
 */
export interface ChatStreamChunk {
  id: string;
  object: 'chat.completion.chunk';
  created: number;
  model: string;
  choices: StreamChoice[];
  systemFingerprint?: string;
}

export interface StreamChoice {
  index: number;
  delta: StreamDelta;
  finishReason: 'stop' | 'length' | 'tool_calls' | 'content_filter' | null;
  logprobs?: Logprobs | null;
}

export interface StreamDelta {
  role?: 'system' | 'user' | 'assistant' | 'tool';
  content?: string;
  toolCalls?: ToolCall[];
}

// ============================================
// Tool Domain - 工具领域
// ============================================

/**
 * OpenAI 兼容的工具定义
 */
export interface ToolDefinition {
  type: 'function';
  function: {
    name: string;
    description?: string;
    parameters?: {
      type: 'object';
      properties?: Record<string, unknown>;
      required?: string[];
    };
  };
}

// 其他 Tool 相关定义从 tool.ts 导入
export type {
  ToolExecutionContext as ToolContext,
  ToolResult
} from './tool.js';

// ============================================
// Skill Domain - 技能领域
// ============================================

// Skill 定义从 skill.ts 导入，避免重复定义
export type { Skill } from './skill.js';

// ============================================
// Execution Domain - 执行领域
// ============================================

/**
 * 执行上下文
 */
export interface ExecutionContext {
  id: ExecutionId;
  agentId: AgentId;
  sessionId?: SessionId;
  request: ChatRequest;
  state: ExecutionState;
  startTime: number;
  steps: ExecutionStep[];
}

/**
 * 执行状态
 */
export enum ExecutionState {
  PENDING = 'pending',
  RUNNING = 'running',
  PAUSED = 'paused',
  COMPLETED = 'completed',
  FAILED = 'failed',
  ABORTED = 'aborted',
}

/**
 * 执行步骤
 */
export interface ExecutionStep {
  id: string;
  type: 'llm' | 'tool' | 'skill' | 'memory' | 'validation';
  name: string;
  input: unknown;
  output?: unknown;
  state: ExecutionState;
  startTime: number;
  endTime?: number;
  error?: Error;
}

// ============================================
// Agent Configuration - 智能体配置
// ============================================

/**
 * Agent 配置 - 极简主义
 * 配置即启用，无需 enabled 标志
 */
export interface AgentConfig {
  // 身份
  id?: AgentId;
  name: string;
  description?: string;
  
  // LLM - 支持两种方式
  // 1. new OpenAIProvider({...})
  // 2. { provider: 'openai', apiKey: 'xxx', baseUrl: 'xxx' }
  llm: LLMProvider | LLMConfig;
  
  // 可选能力 - 配置即启用
  skills?: import('./skill').Skill[];
  tools?: import('./tool').Tool[];
  mcp?: import('./mcp').MCPServerConfig[];
  memory?: MemoryConfig;
}

/**
 * LLM 配置
 */
export interface LLMConfig {
  provider: 'openai' | 'anthropic' | 'google' | 'moonshot' | 'minimax' | 'zhipu' | 'qwen' | 'deepseek' | 'doubao' | 'custom';
  apiKey: string;
  model?: string;
  baseUrl?: string;
  defaults?: {
    temperature?: number;
    maxTokens?: number;
    topP?: number;
  };
}

/**
 * 记忆配置
 */
export interface MemoryConfig {
  maxTokens?: number;
  limit?: number;
}

// ============================================
// Agent Aggregate Root - 智能体聚合根
// ============================================

export interface Agent {
  // 身份
  readonly id: AgentId;
  readonly name: string;
  readonly description?: string;
  
  // 状态
  readonly state: AgentState;
  
  // 领域服务
  readonly llm: LLMProvider;
  readonly skills: SkillRegistry;
  readonly tools: ToolRegistry;
  readonly memory: MemoryStore;
  readonly execution: ExecutionEngine;
  
  // 生命周期
  initialize(): Promise<void>;
  destroy(): Promise<void>;
  
  // 核心能力 - OpenAI 兼容
  chat(request: ChatRequest): Promise<ChatResponse>;
  chatStream(request: ChatRequest): AsyncGenerator<ChatStreamChunk>;
  
  // 事件订阅
  on<T>(event: AgentEventType, handler: (event: AgentEvent<T>) => void): void;
  off<T>(event: AgentEventType, handler: (event: AgentEvent<T>) => void): void;
  emit<T>(event: AgentEventType, payload: T): void;
}
