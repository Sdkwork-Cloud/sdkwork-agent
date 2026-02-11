/**
 * Agent Domain Types - 智能体领域类型定义
 *
 * DDD 领域驱动设计核心类型
 * 统一所有Agent相关类型定义，消除重复
 *
 * @domain Agent
 * @version 5.0.0
 * @standard Industry Leading (Claude Code / OpenCode / OpenClaw)
 */

import type { z } from 'zod';
import type { Tool as ToolFromTools, ToolResult as ToolResultFromTools, IToolRegistry } from '../../tools/core/types.js';

// 重新导出工具类型以保持兼容性
export type Tool = ToolFromTools;
export type ToolResult = ToolResultFromTools;
export type ToolRegistry = IToolRegistry;

// ============================================================================
// Value Objects - 值对象
// ============================================================================

/** Agent ID */
export type AgentId = string;

/** Session ID */
export type SessionId = string;

/** Execution ID */
export type ExecutionId = string;

/** Skill ID */
export type SkillId = string;

/** Tool ID */
export type ToolId = string;

/** Memory ID */
export type MemoryId = string;

// ============================================================================
// Enums - 枚举
// ============================================================================

/** Agent 状态 */
export enum AgentState {
  IDLE = 'idle',
  INITIALIZING = 'initializing',
  READY = 'ready',
  THINKING = 'thinking',
  EXECUTING = 'executing',
  CHATTING = 'chatting',
  ERROR = 'error',
  DESTROYED = 'destroyed',
}

/** 执行状态 */
export enum ExecutionState {
  PENDING = 'pending',
  RUNNING = 'running',
  PAUSED = 'paused',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
  TIMEOUT = 'timeout',
}

/** 思考策略 */
export enum ThinkingStrategy {
  REACT = 'react',           // Reasoning + Acting
  TOT = 'tot',               // Tree of Thoughts
  GOT = 'got',               // Graph of Thoughts
  REFLEXION = 'reflexion',   // Self-reflection
  PLAN_EXECUTE = 'plan_execute',
}

// ============================================================================
// Core Interfaces - 核心接口
// ============================================================================

/**
 * Agent 配置
 */
export interface AgentConfig {
  /** Agent ID */
  id?: AgentId;
  /** Agent 名称 */
  name: string;
  /** 描述 */
  description?: string;
  /** 系统提示词 */
  systemPrompt?: string;
  /** 思考策略 */
  thinkingStrategy?: ThinkingStrategy;
  /** 最大思考步数 */
  maxThinkingSteps?: number;
  /** 是否启用自我反思 */
  enableReflection?: boolean;
  /** LLM 配置 */
  llm: LLMConfig;
  /** 内存配置 */
  memory?: MemoryConfig;
}

/**
 * LLM 配置
 */
export interface LLMConfig {
  /** Provider */
  provider: 'openai' | 'anthropic' | 'google' | 'moonshot' | 'deepseek' | 'custom';
  /** API Key */
  apiKey: string;
  /** 模型 */
  model?: string;
  /** Base URL */
  baseUrl?: string;
  /** 默认参数 */
  defaults?: {
    temperature?: number;
    maxTokens?: number;
    topP?: number;
  };
}

/**
 * 内存配置
 */
export interface MemoryConfig {
  /** 最大 Token 数 */
  maxTokens?: number;
  /** 消息历史限制 */
  messageLimit?: number;
  /** 启用向量记忆 */
  enableVectorMemory?: boolean;
  /** 向量维度 */
  vectorDimension?: number;
}

// ============================================================================
// Message Types - 消息类型
// ============================================================================

/** 消息角色 */
export type MessageRole = 'system' | 'user' | 'assistant' | 'tool';

/**
 * 消息内容部分（多模态支持）
 */
export type MessageContentPart =
  | { type: 'text'; text: string }
  | { type: 'image_url'; imageUrl: { url: string; detail?: 'low' | 'high' | 'auto' } }
  | { type: 'file'; file: { name: string; content: string; mimeType: string } };

/**
 * 聊天消息
 */
export interface ChatMessage {
  /** 消息 ID */
  id: string;
  /** 角色 */
  role: MessageRole;
  /** 内容 */
  content: string | MessageContentPart[];
  /** 名称（用于tool消息） */
  name?: string;
  /** 工具调用 */
  toolCalls?: ToolCall[];
  /** 工具调用 ID */
  toolCallId?: string;
  /** 元数据 */
  metadata?: Record<string, unknown>;
  /** 时间戳 */
  timestamp: number;
}

/**
 * 工具调用
 */
export interface ToolCall {
  /** 调用 ID */
  id: string;
  /** 类型 */
  type: 'function';
  /** 函数信息 */
  function: {
    name: string;
    arguments: string;
  };
}

// ============================================================================
// Request/Response Types - 请求响应类型
// ============================================================================

/**
 * 聊天请求（OpenAI 兼容）
 */
export interface ChatRequest {
  /** 消息历史 */
  messages: ChatMessage[];
  /** 模型 */
  model?: string;
  /** 流式输出 */
  stream?: boolean;
  /** 温度 */
  temperature?: number;
  /** 最大 Token */
  maxTokens?: number;
  /** Top P */
  topP?: number;
  /** 停止序列 */
  stop?: string | string[];
  /** 工具 */
  tools?: ToolDefinition[];
  /** 工具选择 */
  toolChoice?: 'none' | 'auto' | 'required' | { type: 'function'; function: { name: string } };
  /** 响应格式 */
  responseFormat?: { type: 'text' | 'json_object' | 'json_schema'; schema?: unknown };
  /** 会话 ID */
  sessionId?: SessionId;
  /** 元数据 */
  metadata?: Record<string, unknown>;
}

/**
 * 聊天响应（OpenAI 兼容）
 */
export interface ChatResponse {
  /** 响应 ID */
  id: string;
  /** 对象类型 */
  object: 'chat.completion';
  /** 创建时间 */
  created: number;
  /** 模型 */
  model: string;
  /** 选择 */
  choices: ChatChoice[];
  /** 使用统计 */
  usage: ChatUsage;
  /** 系统指纹 */
  systemFingerprint?: string;
}

/**
 * 聊天选择
 */
export interface ChatChoice {
  /** 索引 */
  index: number;
  /** 消息 */
  message: ChatMessage;
  /** 结束原因 */
  finishReason: 'stop' | 'length' | 'tool_calls' | 'content_filter' | null;
  /** 对数概率 */
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
 * 流式块
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
  role?: MessageRole;
  content?: string;
  toolCalls?: ToolCall[];
}

// ============================================================================
// Tool Types - 工具类型
// ============================================================================

/**
 * 工具定义
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

/**
 * 工具上下文
 */
export interface ToolContext {
  /** 执行 ID */
  executionId: ExecutionId;
  /** Agent ID */
  agentId: AgentId;
  /** 会话 ID */
  sessionId?: SessionId;
  /** 工具 ID */
  toolId: ToolId;
  /** 工具名称 */
  toolName: string;
  /** 日志器 */
  logger: Logger;
  /** 中止信号 */
  signal?: AbortSignal;
}

/**
 * 工具错误
 */
export interface ToolError {
  code: string;
  message: string;
  recoverable: boolean;
}

// Tool 和 ToolResult 在文件顶部已重新导出

// ============================================================================
// Skill Types - 技能类型
// ============================================================================

/**
 * Skill 元数据
 */
export interface SkillMetadata {
  /** 分类 */
  category?: string;
  /** 标签 */
  tags?: string[];
  /** 作者 */
  author?: string;
  /** 依赖 */
  dependencies?: string[];
}

/**
 * Skill 上下文
 */
export interface SkillContext {
  /** 执行 ID */
  executionId: ExecutionId;
  /** Agent ID */
  agentId: AgentId;
  /** 会话 ID */
  sessionId?: SessionId;
  /** 输入 */
  input: unknown;
  /** 日志器 */
  logger: Logger;
  /** LLM 服务 */
  llm: LLMService;
  /** 内存服务 */
  memory: MemoryService;
  /** 工具注册表 */
  tools: ToolRegistry;
  /** 中止信号 */
  signal?: AbortSignal;
}

/**
 * Skill 接口（统一版本）
 */
export interface Skill {
  /** Skill ID */
  readonly id: SkillId;
  /** Skill 名称 */
  readonly name: string;
  /** 描述 */
  readonly description: string;
  /** 版本 */
  readonly version: string;
  /** 输入 Schema */
  readonly inputSchema: z.ZodType<unknown>;
  /** 元数据 */
  readonly metadata?: SkillMetadata;
  /** 执行函数 */
  execute: (input: unknown, context: SkillContext) => Promise<SkillResult>;
  /** 流式执行（可选） */
  executeStream?: (input: unknown, context: SkillContext) => AsyncIterable<unknown>;
}

/**
 * Skill 执行结果
 */
export interface SkillResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: SkillError;
  metadata?: ExecutionMetadata;
}

/**
 * Skill 错误
 */
export interface SkillError {
  code: string;
  message: string;
  skillId: SkillId;
  recoverable: boolean;
  stack?: string;
}

// ============================================================================
// Memory Types - 内存类型
// ============================================================================

/**
 * 内存条目
 */
export interface MemoryEntry {
  /** 内存 ID */
  id: MemoryId;
  /** 内容 */
  content: string;
  /** 类型 */
  type: 'message' | 'thought' | 'observation' | 'fact' | 'skill_result';
  /** 元数据 */
  metadata?: Record<string, unknown>;
  /** 向量嵌入 */
  embedding?: number[];
  /** 时间戳 */
  timestamp: number;
  /** 重要性分数 */
  importance?: number;
}

/**
 * 内存服务接口
 */
export interface MemoryService {
  /** 存储 */
  store: (entry: MemoryEntry) => Promise<void>;
  /** 检索 */
  retrieve: (id: MemoryId) => Promise<MemoryEntry | undefined>;
  /** 搜索 */
  search: (query: string, options?: SearchOptions) => Promise<MemoryEntry[]>;
  /** 语义搜索 */
  semanticSearch: (query: string, limit?: number) => Promise<MemoryEntry[]>;
  /** 获取最近 */
  getRecent: (limit?: number) => Promise<MemoryEntry[]>;
  /** 清空 */
  clear: () => Promise<void>;
}

export interface SearchOptions {
  type?: MemoryEntry['type'];
  limit?: number;
  before?: number;
  after?: number;
}

// ============================================================================
// Service Interfaces - 服务接口
// ============================================================================

/**
 * LLM 服务接口
 */
export interface LLMService {
  /** 完成 */
  complete: (request: ChatRequest) => Promise<ChatResponse>;
  /** 流式完成 */
  completeStream: (request: ChatRequest) => AsyncGenerator<ChatStreamChunk>;
}

/**
 * Skill 注册表接口
 */
export interface SkillRegistry {
  /** 注册 */
  register: (skill: Skill) => void;
  /** 取消注册 */
  unregister: (skillId: SkillId) => void;
  /** 获取 */
  get: (skillId: SkillId) => Skill | undefined;
  /** 根据名称获取 */
  getByName: (name: string) => Skill | undefined;
  /** 列出所有 */
  list: () => Skill[];
  /** 搜索 */
  search: (query: string) => Skill[];
}

/**
 * 日志器接口
 */
export interface Logger {
  debug: (message: string, meta?: Record<string, unknown>) => void;
  info: (message: string, meta?: Record<string, unknown>) => void;
  warn: (message: string, meta?: Record<string, unknown>) => void;
  error: (message: string, context?: Record<string, unknown>, error?: Error) => void;
}

// ============================================================================
// Execution Types - 执行类型
// ============================================================================

/**
 * 执行元数据
 */
export interface ExecutionMetadata {
  executionId: ExecutionId;
  skillId?: SkillId;
  skillName?: string;
  startTime: number;
  endTime: number;
  duration: number;
  tokensUsed?: number;
}

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
 * 执行步骤
 */
export interface ExecutionStep {
  id: string;
  type: 'llm' | 'tool' | 'skill' | 'memory' | 'thought' | 'observation';
  name: string;
  input: unknown;
  output?: unknown;
  state: ExecutionState;
  startTime: number;
  endTime?: number;
  error?: Error;
}

// ============================================================================
// Thinking Types - 思考类型
// ============================================================================

/**
 * 思考步骤（ReAct）
 */
export interface ThinkingStep {
  /** 步骤编号 */
  step: number;
  /** 推理过程 */
  thought: string;
  /** 执行的动作 */
  action: Action;
  /** 观察结果 */
  observation: string;
  /** 执行时间 */
  duration: number;
}

/**
 * 动作
 */
export interface Action {
  /** 动作类型 */
  type: 'tool' | 'skill' | 'think' | 'finish' | 'reflect';
  /** 动作名称 */
  name: string;
  /** 参数 */
  parameters: Record<string, unknown>;
}

/**
 * 思考结果
 */
export interface ThinkingResult {
  success: boolean;
  answer: string;
  steps: ThinkingStep[];
  totalSteps: number;
  totalDuration: number;
  toolsUsed: string[];
  reflections?: string[];
  error?: string;
}
