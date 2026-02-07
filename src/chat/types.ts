/**
 * Chat Completion 标准接口
 * 
 * 遵循 OpenAI Chat Completion API 标准
 * 支持流式和非流式输出
 * 
 * @standard OpenAI Chat Completion API
 * @version 1.0.0
 */

// ============================================
// Chat Completion Request - 标准请求格式
// ============================================

/**
 * Chat Completion 请求
 */
export interface ChatCompletionRequest {
  /** 消息列表 */
  messages: ChatMessage[];
  /** 模型名称 */
  model?: string;
  /** 是否流式输出 */
  stream?: boolean;
  /** 温度参数 */
  temperature?: number;
  /** 最大 Token 数 */
  maxTokens?: number;
  /** Top P 采样 */
  topP?: number;
  /** 停止序列 */
  stop?: string | string[];
  /** 存在惩罚 */
  presencePenalty?: number;
  /** 频率惩罚 */
  frequencyPenalty?: number;
  /** 用户标识 */
  user?: string;
  /** 工具列表 */
  tools?: ChatTool[];
  /** 工具选择策略 */
  toolChoice?: 'none' | 'auto' | { type: 'function'; function: { name: string } };
  /** 响应格式 */
  responseFormat?: { type: 'text' | 'json_object' };
  /** 会话 ID */
  sessionId?: string;
  /** 元数据 */
  meta?: Record<string, unknown>;
}

/**
 * 聊天消息
 */
export interface ChatMessage {
  /** 角色 */
  role: 'system' | 'user' | 'assistant' | 'tool';
  /** 内容 */
  content: string | ChatMessageContent[];
  /** 工具调用 */
  toolCalls?: ChatToolCall[];
  /** 工具调用 ID */
  toolCallId?: string;
  /** 名称 */
  name?: string;
}

/**
 * 消息内容（多模态）
 */
export type ChatMessageContent = 
  | { type: 'text'; text: string }
  | { type: 'image_url'; imageUrl: { url: string; detail?: 'low' | 'high' | 'auto' } }
  | { type: 'file'; file: { name: string; content: string; mimeType: string } };

/**
 * 工具定义
 */
export interface ChatTool {
  /** 工具类型 */
  type: 'function';
  /** 函数定义 */
  function: {
    /** 函数名称 */
    name: string;
    /** 函数描述 */
    description?: string;
    /** 参数 Schema */
    parameters?: Record<string, unknown>;
  };
}

/**
 * 工具调用
 */
export interface ChatToolCall {
  /** 调用 ID */
  id: string;
  /** 工具类型 */
  type: 'function';
  /** 函数调用 */
  function: {
    /** 函数名称 */
    name: string;
    /** 参数 JSON */
    arguments: string;
  };
}

// ============================================
// Chat Completion Response - 标准响应格式
// ============================================

/**
 * Chat Completion 响应（非流式）
 */
export interface ChatCompletionResponse {
  /** 响应 ID */
  id: string;
  /** 对象类型 */
  object: 'chat.completion';
  /** 创建时间戳 */
  created: number;
  /** 模型名称 */
  model: string;
  /** 选择列表 */
  choices: ChatCompletionChoice[];
  /** 使用统计 */
  usage: ChatCompletionUsage;
  /** 系统指纹 */
  systemFingerprint?: string;
  /** 会话 ID */
  sessionId?: string;
}

/**
 * 完成选择
 */
export interface ChatCompletionChoice {
  /** 索引 */
  index: number;
  /** 消息 */
  message: ChatMessage;
  /** 结束原因 */
  finishReason: 'stop' | 'length' | 'tool_calls' | 'content_filter' | null;
  /** 日志概率 */
  logprobs?: ChatCompletionLogprobs | null;
}

/**
 * 使用统计
 */
export interface ChatCompletionUsage {
  /** 提示 Token 数 */
  promptTokens: number;
  /** 完成 Token 数 */
  completionTokens: number;
  /** 总 Token 数 */
  totalTokens: number;
}

/**
 * 日志概率
 */
export interface ChatCompletionLogprobs {
  /** 内容日志概率 */
  content: ChatCompletionTokenLogprob[] | null;
}

/**
 * Token 日志概率
 */
export interface ChatCompletionTokenLogprob {
  /** Token */
  token: string;
  /** 对数概率 */
  logprob: number;
  /** 字节表示 */
  bytes: number[] | null;
  /** 顶部对数概率 */
  topLogprobs: ChatCompletionTopLogprob[];
}

/**
 * 顶部对数概率
 */
export interface ChatCompletionTopLogprob {
  /** Token */
  token: string;
  /** 对数概率 */
  logprob: number;
  /** 字节表示 */
  bytes: number[] | null;
}

// ============================================
// Chat Completion Stream - 流式响应
// ============================================

/**
 * Chat Completion 流式块
 */
export interface ChatCompletionChunk {
  /** 响应 ID */
  id: string;
  /** 对象类型 */
  object: 'chat.completion.chunk';
  /** 创建时间戳 */
  created: number;
  /** 模型名称 */
  model: string;
  /** 选择列表 */
  choices: ChatCompletionChunkChoice[];
  /** 系统指纹 */
  systemFingerprint?: string;
  /** 会话 ID */
  sessionId?: string;
}

/**
 * 流式选择
 */
export interface ChatCompletionChunkChoice {
  /** 索引 */
  index: number;
  /** Delta 消息 */
  delta: ChatCompletionChunkDelta;
  /** 结束原因 */
  finishReason: 'stop' | 'length' | 'tool_calls' | 'content_filter' | null;
  /** 日志概率 */
  logprobs?: ChatCompletionLogprobs | null;
}

/**
 * Delta 消息
 */
export interface ChatCompletionChunkDelta {
  /** 角色 */
  role?: 'system' | 'user' | 'assistant' | 'tool';
  /** 内容 */
  content?: string;
  /** 工具调用 */
  toolCalls?: ChatToolCall[];
}

// ============================================
// Stream Events - 流式事件
// ============================================

/**
 * 流式事件类型
 */
export type StreamEventType = 
  | 'start'
  | 'message'
  | 'content'
  | 'tool_call'
  | 'tool_result'
  | 'thinking'
  | 'progress'
  | 'complete'
  | 'error';

/**
 * 流式事件
 */
export interface StreamEvent {
  /** 事件类型 */
  type: StreamEventType;
  /** 事件数据 */
  data: unknown;
  /** 时间戳 */
  timestamp: number;
  /** 会话 ID */
  sessionId?: string;
}

/**
 * 流式回调
 */
export interface StreamCallbacks {
  /** 开始回调 */
  onStart?: () => void;
  /** 消息回调 */
  onMessage?: (message: ChatMessage) => void;
  /** 内容增量回调 */
  onContent?: (content: string) => void;
  /** 工具调用回调 */
  onToolCall?: (toolCall: ChatToolCall) => void;
  /** 工具结果回调 */
  onToolResult?: (toolCallId: string, result: unknown) => void;
  /** 思考过程回调 */
  onThinking?: (thinking: string) => void;
  /** 进度回调 */
  onProgress?: (progress: ChatProgress) => void;
  /** 完成回调 */
  onComplete?: (response: ChatCompletionResponse) => void;
  /** 错误回调 */
  onError?: (error: ChatError) => void;
}

/**
 * 聊天进度
 */
export interface ChatProgress {
  /** 当前步骤 */
  step: number;
  /** 总步骤 */
  totalSteps: number;
  /** 当前操作 */
  operation: string;
  /** 进度百分比 */
  percent: number;
  /** 详细信息 */
  details?: Record<string, unknown>;
}

/**
 * 聊天错误
 */
export interface ChatError {
  /** 错误码 */
  code: string;
  /** 错误消息 */
  message: string;
  /** 错误类型 */
  type: 'api_error' | 'timeout' | 'rate_limit' | 'invalid_request' | 'server_error';
  /** 是否可重试 */
  retryable: boolean;
  /** 原始错误 */
  originalError?: Error;
}

// ============================================
// Chat Session - 会话管理
// ============================================

/**
 * 聊天会话
 */
export interface ChatSession {
  /** 会话 ID */
  id: string;
  /** 会话名称 */
  name: string;
  /** 消息历史 */
  messages: ChatMessage[];
  /** 创建时间 */
  createdAt: Date;
  /** 更新时间 */
  updatedAt: Date;
  /** 元数据 */
  meta?: Record<string, unknown>;
}

/**
 * 会话配置
 */
export interface ChatSessionConfig {
  /** 最大消息数 */
  maxMessages?: number;
  /** 最大 Token 数 */
  maxTokens?: number;
  /** 上下文窗口 */
  contextWindow?: number;
  /** 是否持久化 */
  persistent?: boolean;
}

// ============================================
// Chat Interface - 界面交互
// ============================================

/**
 * 聊天界面消息
 */
export interface ChatUIMessage {
  /** 消息 ID */
  id: string;
  /** 角色 */
  role: 'system' | 'user' | 'assistant' | 'tool';
  /** 内容 */
  content: string;
  /** 内容类型 */
  contentType: 'text' | 'markdown' | 'code' | 'image' | 'file';
  /** 状态 */
  status: 'pending' | 'streaming' | 'complete' | 'error';
  /** 时间戳 */
  timestamp: Date;
  /** 工具调用 */
  toolCalls?: ChatToolCall[];
  /** 工具结果 */
  toolResults?: ChatToolResult[];
  /** 思考过程 */
  thinking?: string;
  /** 错误信息 */
  error?: string;
  /** 元数据 */
  meta?: Record<string, unknown>;
}

/**
 * 工具结果
 */
export interface ChatToolResult {
  /** 调用 ID */
  callId: string;
  /** 工具名称 */
  toolName: string;
  /** 结果 */
  result: unknown;
  /** 是否成功 */
  success: boolean;
  /** 执行时间 */
  duration: number;
}

/**
 * 聊天界面状态
 */
export interface ChatUIState {
  /** 消息列表 */
  messages: ChatUIMessage[];
  /** 输入内容 */
  input: string;
  /** 是否正在输入 */
  isTyping: boolean;
  /** 是否正在流式输出 */
  isStreaming: boolean;
  /** 当前会话 ID */
  sessionId?: string;
  /** 错误信息 */
  error?: string;
  /** 连接状态 */
  connectionStatus: 'connected' | 'disconnected' | 'connecting';
}

/**
 * 聊天界面配置
 */
export interface ChatUIConfig {
  /** 是否显示思考过程 */
  showThinking: boolean;
  /** 是否显示工具调用 */
  showToolCalls: boolean;
  /** 是否自动滚动 */
  autoScroll: boolean;
  /** 主题 */
  theme: 'light' | 'dark' | 'auto';
  /** 语言 */
  language: string;
  /** 消息动画 */
  messageAnimation: boolean;
  /** 代码高亮 */
  codeHighlight: boolean;
}
