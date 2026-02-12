/**
 * CLI Types - 命令行对话系统类型定义
 * 
 * 参考 Claude Code、Codex CLI 等顶级智能体设计
 * 高内聚低耦合的完美架构
 * 
 * @module CLI
 * @version 1.0.0
 * @standard Industry Leading
 */

import type { Agent } from '../agent';

type BaseAgent = Agent;

// ============================================
// Core Types
// ============================================

/**
 * CLI 配置
 */
export interface CLIConfig {
  /** Agent 实例 */
  agent: Agent;
  /** 提示符 */
  prompt: string;
  /** 欢迎消息 */
  welcomeMessage?: string;
  /** 历史记录大小 */
  historySize?: number;
  /** 是否启用语法高亮 */
  enableSyntaxHighlight?: boolean;
  /** 是否启用自动补全 */
  enableAutoComplete?: boolean;
  /** 流式输出 */
  streaming?: boolean;
  /** 多行模式 */
  multiline?: boolean;
  /** 主题 */
  theme?: CLITheme;
  /** 命令别名 */
  aliases?: Record<string, string>;
}

/**
 * CLI 主题
 */
export interface CLITheme {
  /** 主色调 */
  primary: string;
  /** 次要色调 */
  secondary: string;
  /** 成功色 */
  success: string;
  /** 警告色 */
  warning: string;
  /** 错误色 */
  error: string;
  /** 信息色 */
  info: string;
  /** 提示符颜色 */
  prompt: string;
  /** 用户输入颜色 */
  userInput: string;
  /** AI 输出颜色 */
  aiOutput: string;
  /** 代码块颜色 */
  code: string;
}

/**
 * 默认主题
 */
export const DEFAULT_THEME: CLITheme = {
  primary: '#00d4aa',
  secondary: '#6b7280',
  success: '#10b981',
  warning: '#f59e0b',
  error: '#ef4444',
  info: '#3b82f6',
  prompt: '#00d4aa',
  userInput: '#e5e7eb',
  aiOutput: '#e5e7eb',
  code: '#f472b6',
};

// ============================================
// Command Types
// ============================================

/**
 * 命令类型
 */
export type CommandType = 
  | 'chat'      // 普通对话
  | 'slash'     // 斜杠命令
  | 'special'   // 特殊命令（以 / 开头）
  | 'exit';     // 退出命令

/**
 * 解析后的命令
 */
export interface ParsedCommand {
  /** 命令类型 */
  type: CommandType;
  /** 原始输入 */
  raw: string;
  /** 命令名 */
  name?: string;
  /** 参数 */
  args: string[];
  /** 选项 */
  options: Record<string, string | boolean>;
  /** 剩余文本 */
  rest: string;
}

/**
 * 命令处理器
 */
export interface CommandHandler {
  /** 命令名 */
  name: string;
  /** 别名 */
  aliases?: string[];
  /** 描述 */
  description: string;
  /** 用法 */
  usage?: string;
  /** 是否需要确认 */
  confirm?: boolean;
  /** 执行处理器 */
  execute: (context: CommandContext) => Promise<CommandResult>;
}

/**
 * 命令上下文
 */
export interface CommandContext {
  /** 解析后的命令 */
  command: ParsedCommand;
  /** Agent 实例 */
  agent: Agent;
  /** 会话 ID */
  sessionId: string;
  /** 历史记录 */
  history: ConversationHistory;
  /** 渲染器 */
  renderer: CLIRenderer;
}

/**
 * 命令执行结果
 */
export interface CommandResult {
  /** 是否成功 */
  success: boolean;
  /** 消息 */
  message?: string;
  /** 数据 */
  data?: unknown;
  /** 是否继续对话 */
  continue: boolean;
  /** 错误 */
  error?: Error;
}

// ============================================
// Conversation Types
// ============================================

/**
 * 对话消息
 */
export interface ConversationMessage {
  /** 消息 ID */
  id: string;
  /** 角色 */
  role: 'user' | 'assistant' | 'system';
  /** 内容 */
  content: string;
  /** 时间戳 */
  timestamp: Date;
  /** 元数据 */
  metadata?: {
    /** 使用的工具 */
    tools?: string[];
    /** 执行时间 */
    executionTime?: number;
    /** Token 数量 */
    tokens?: number;
    /** 是否流式 */
    streaming?: boolean;
  };
}

/**
 * 对话历史
 */
export interface ConversationHistory {
  /** 会话 ID */
  sessionId: string;
  /** 消息列表 */
  messages: ConversationMessage[];
  /** 最大消息数 */
  maxMessages: number;
  /** 添加消息 */
  add(message: Omit<ConversationMessage, 'id' | 'timestamp'>): ConversationMessage;
  /** 获取最近消息 */
  recent(count: number): ConversationMessage[];
  /** 清除历史 */
  clear(): void;
  /** 导出 */
  export(): string;
  /** 导入 */
  import(data: string): void;
  /** 转换为 LLM 消息格式 */
  toLLMMessages(): Array<{ role: string; content: string }>;
}

/**
 * 对话状态
 */
export type ConversationState = 
  | 'idle'      // 空闲
  | 'input'     // 等待输入
  | 'thinking'  // 思考中
  | 'streaming' // 流式输出中
  | 'tool'      // 工具调用中
  | 'error';    // 错误状态

/**
 * 对话上下文
 */
export interface ConversationContext {
  /** 会话 ID */
  sessionId: string;
  /** 当前状态 */
  state: ConversationState;
  /** 工作目录 */
  workingDirectory: string;
  /** 环境变量 */
  environment: Record<string, string>;
  /** 用户偏好 */
  preferences: UserPreferences;
  /** Agent 实例 */
  agent?: unknown;
}

/**
 * 用户偏好
 */
export interface UserPreferences {
  /** 自动确认 */
  autoConfirm: boolean;
  /** 详细模式 */
  verbose: boolean;
  /** 安静模式 */
  quiet: boolean;
  /** 输出格式 */
  outputFormat: 'text' | 'json' | 'markdown';
}

// ============================================
// Renderer Types
// ============================================

/**
 * CLI 渲染器
 */
export interface CLIRenderer {
  /** 渲染消息 */
  message(content: string, options?: RenderOptions): void;
  /** 渲染代码块 */
  code(content: string, language?: string): void;
  /** 渲染表格 */
  table(data: Record<string, unknown>[]): void;
  /** 渲染列表 */
  list(items: string[]): void;
  /** 渲染错误 */
  error(error: Error | string): void;
  /** 渲染警告 */
  warning(message: string): void;
  /** 渲染成功 */
  success(message: string): void;
  /** 渲染信息 */
  info(message: string): void;
  /** 渲染提示符 */
  prompt(text: string): void;
  /** 清屏 */
  clear(): void;
  /** 换行 */
  newline(): void;
  /** 流式输出 */
  stream(chunk: string): void;
  /** 结束流式输出 */
  endStream(): void;
}

/**
 * 渲染选项
 */
export interface RenderOptions {
  /** 颜色 */
  color?: string;
  /** 是否加粗 */
  bold?: boolean;
  /** 是否斜体 */
  italic?: boolean;
  /** 是否下划线 */
  underline?: boolean;
  /** 前缀 */
  prefix?: string;
  /** 不换行 */
  noNewline?: boolean;
}

// ============================================
// Input Types
// ============================================

/**
 * 输入处理器
 */
export interface InputHandler {
  /** 读取输入 */
  read(): Promise<string>;
  /** 读取多行 */
  readMultiline(): Promise<string>;
  /** 读取密码 */
  readPassword(prompt: string): Promise<string>;
  /** 确认 */
  confirm(message: string): Promise<boolean>;
  /** 选择 */
  select<T>(message: string, choices: { value: T; label: string }[]): Promise<T>;
  /** 自动补全 */
  complete?(input: string, position: number): Promise<string[]>;
}

/**
 * 输入状态
 */
export interface InputState {
  /** 当前输入 */
  current: string;
  /** 光标位置 */
  cursor: number;
  /** 历史位置 */
  historyIndex: number;
  /** 是否多行 */
  multiline: boolean;
  /** 多行缓冲区 */
  buffer: string[];
}

// ============================================
// Event Types
// ============================================

/**
 * CLI 事件
 */
export interface CLIEvents {
  /** 启动 */
  'cli:start': { timestamp: Date };
  /** 关闭 */
  'cli:exit': { timestamp: Date; code: number };
  /** 输入 */
  'cli:input': { input: string };
  /** 命令执行 */
  'cli:command': { command: ParsedCommand };
  /** 消息 */
  'cli:message': { message: ConversationMessage };
  /** 状态变更 */
  'cli:state': { from: ConversationState; to: ConversationState };
  /** 错误 */
  'cli:error': { error: Error };
}

// ============================================
// REPL Types
// ============================================

/**
 * REPL 配置
 */
export interface REPLConfig {
  /** 输入处理器 */
  input: InputHandler;
  /** 渲染器 */
  renderer: CLIRenderer;
  /** 命令注册表 */
  commands: Map<string, CommandHandler>;
  /** 历史记录 */
  history: ConversationHistory;
  /** 上下文 */
  context: ConversationContext;
}

/**
 * REPL 循环
 */
export interface REPL {
  /** 启动 */
  start(): Promise<void>;
  /** 停止 */
  stop(): Promise<void>;
  /** 执行命令 */
  execute(input: string): Promise<CommandResult>;
  /** 获取状态 */
  getState(): ConversationState;
  /** 设置状态 */
  setState(state: ConversationState): void;
}

// ============================================
// Export Types
// ============================================

export * from './commands/types.js';
