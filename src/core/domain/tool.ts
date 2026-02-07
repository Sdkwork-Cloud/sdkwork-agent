/**
 * Tool Domain - 工具领域
 * 
 * 行业标准 Tool 系统
 * 支持分类、确认级别、执行链
 * 
 * @domain Tool
 * @version 4.1.0
 * @standard Industry Leading (Claude Code / OpenCode / OpenClaw)
 */

import type { ExecutionResultBase, ExecutionError } from '../../types/core.js';

// ============================================
// Tool Definition - 工具定义
// ============================================

/**
 * Tool 定义 - 核心领域对象
 */
export interface Tool {
  /** Tool ID */
  id: string;
  /** Tool 名称 */
  name: string;
  /** 描述 */
  description: string;
  /** 版本 */
  version?: string;
  
  /** 分类 */
  category: ToolCategory;
  /** 确认级别 */
  confirm: ConfirmLevel;
  
  /** 输入 Schema */
  input?: JSONSchema;
  /** 输出 Schema */
  output?: JSONSchema;
  
  /** 执行函数 */
  execute: ToolExecutor;
  
  /** 元数据 */
  meta?: Record<string, unknown>;
}

/**
 * Tool 分类
 */
export type ToolCategory = 
  | 'file'      // 文件操作
  | 'network'   // 网络请求
  | 'system'    // 系统操作
  | 'data'      // 数据处理
  | 'llm'       // LLM 操作
  | 'custom';   // 自定义

/**
 * 确认级别
 */
export type ConfirmLevel = 
  | 'none'        // 无需确认
  | 'read'        // 只读确认
  | 'write'       // 写入确认
  | 'destructive'; // 破坏性操作确认

/**
 * JSON Schema 简化定义
 */
export interface JSONSchema {
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  properties?: Record<string, JSONSchema>;
  items?: JSONSchema;
  required?: string[];
  enum?: unknown[];
  description?: string;
  default?: unknown;
}

// ============================================
// Tool Execution - 工具执行
// ============================================

/**
 * Tool 执行函数类型
 */
export type ToolExecutor = (
  input: unknown,
  context: ToolExecutionContext
) => Promise<ToolResult>;

/**
 * Tool 执行上下文
 */
export interface ToolExecutionContext {
  /** 执行 ID */
  executionId: string;
  /** Agent ID */
  agentId: string;
  /** 会话 ID */
  sessionId?: string;
  /** Tool ID */
  toolId: string;
  /** Tool 名称 */
  toolName: string;
  /** 日志 */
  logger: ToolLogger;
  /** 中止信号 */
  signal?: AbortSignal;
}

/**
 * Tool 日志 - 使用统一的 ILogger 接口
 */
export type ToolLogger = import('../../utils/logger').ILogger;

/**
 * Tool 执行结果
 * 使用 ExecutionResultBase 基础接口
 */
export interface ToolResult extends ExecutionResultBase<unknown, ToolError, ToolExecutionMeta> {}

/**
 * Tool 错误
 * 扩展基础 ExecutionError，添加 Tool 特有字段
 */
export interface ToolError extends ExecutionError {
  /** 详细信息 */
  details?: unknown;
}

/**
 * Tool 执行元数据
 */
export interface ToolExecutionMeta {
  /** 执行 ID */
  executionId: string;
  /** Tool ID */
  toolId: string;
  /** Tool 名称 */
  toolName: string;
  /** 开始时间 */
  startTime: number;
  /** 结束时间 */
  endTime: number;
  /** 持续时间 */
  duration: number;
}

// ============================================
// Tool Registry - 工具注册表
// ============================================

/**
 * Tool 注册表接口
 */
export interface ToolRegistry {
  /** 注册 Tool */
  register(tool: Tool): void;
  /** 取消注册 */
  unregister(toolId: string): void;
  /** 获取 Tool */
  get(toolId: string): Tool | undefined;
  /** 根据名称获取 */
  getByName(name: string): Tool | undefined;
  /** 列出所有 */
  list(): Tool[];
  /** 按分类列出 */
  listByCategory(category: ToolCategory): Tool[];
  /** 搜索 */
  search(query: string): Tool[];
  /** 清空 */
  clear(): void;
  /** 执行 Tool */
  execute(name: string, input: unknown, context: ToolExecutionContext): Promise<ToolResult>;
}

// ============================================
// Tool Chain - 工具调用链
// ============================================

/**
 * Tool 调用节点
 */
export interface ToolCallNode {
  /** 节点 ID */
  id: string;
  /** Tool ID */
  toolId: string;
  /** 输入 */
  input: unknown;
  /** 依赖节点 */
  dependencies: string[];
  /** 执行结果 */
  result?: unknown;
  /** 执行状态 */
  state: ToolCallState;
  /** 错误信息 */
  error?: string;
}

/**
 * Tool 调用状态
 */
export type ToolCallState = 
  | 'pending'    // 等待中
  | 'ready'      // 准备执行
  | 'executing'  // 执行中
  | 'completed'  // 完成
  | 'failed'     // 失败
  | 'skipped';   // 跳过

/**
 * Tool 调用链
 */
export interface ToolChain {
  /** 链 ID */
  id: string;
  /** 节点列表 */
  nodes: ToolCallNode[];
  /** 执行策略 */
  strategy: ToolChainStrategy;
}

/**
 * Tool 链执行策略
 */
export type ToolChainStrategy = 
  | 'sequential'  // 顺序执行
  | 'parallel'    // 并行执行
  | 'dag';        // DAG 执行

// ============================================
// Tool Executor - 工具执行器
// ============================================

/**
 * Tool 执行器接口
 */
export interface ToolExecutorInterface {
  /**
   * 执行 Tool
   */
  execute(tool: Tool, input: unknown, context: ToolExecutionContext): Promise<ToolResult>;
  
  /**
   * 执行 Tool 链
   */
  executeChain(chain: ToolChain): Promise<ToolChainResult>;
  
  /**
   * 验证输入
   */
  validateInput(tool: Tool, input: unknown): ValidationResult;
  
  /**
   * 需要确认
   */
  needsConfirmation(tool: Tool): boolean;
  
  /**
   * 中止执行
   */
  abort(executionId: string): void;
}

/**
 * Tool 链执行结果
 */
export interface ToolChainResult {
  /** 是否成功 */
  success: boolean;
  /** 节点结果 */
  nodes: ToolCallNode[];
  /** 最终结果 */
  finalResult?: unknown;
  /** 错误 */
  error?: ToolError;
}

/**
 * 验证结果
 */
export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

export interface ValidationError {
  field: string;
  message: string;
}

// ============================================
// Tool Events - 工具事件
// ============================================

export type ToolEventType =
  | 'tool:registered'
  | 'tool:unregistered'
  | 'tool:invoking'
  | 'tool:invoked'
  | 'tool:completed'
  | 'tool:failed'
  | 'tool:aborted'
  | 'tool:chain:started'
  | 'tool:chain:completed'
  | 'tool:chain:failed';

export interface ToolEvent<T = unknown> {
  type: ToolEventType;
  timestamp: number;
  payload: T;
  toolId: string;
  executionId?: string;
}

// ============================================
// Built-in Tools - 内置工具
// ============================================

/**
 * 内置 Tool 定义
 */
export interface BuiltInToolDefinition {
  name: string;
  category: ToolCategory;
  confirm: ConfirmLevel;
  description: string;
  inputSchema?: JSONSchema;
  outputSchema?: JSONSchema;
}

/** 内置 Tool 列表 */
export const BUILT_IN_TOOLS: BuiltInToolDefinition[] = [
  {
    name: 'file-read',
    category: 'file',
    confirm: 'none',
    description: 'Read file content',
    inputSchema: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'File path' },
        encoding: { type: 'string', enum: ['utf8', 'base64'], default: 'utf8' },
      },
      required: ['path'],
    },
  },
  {
    name: 'file-write',
    category: 'file',
    confirm: 'write',
    description: 'Write content to file',
    inputSchema: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'File path' },
        content: { type: 'string', description: 'File content' },
        encoding: { type: 'string', enum: ['utf8', 'base64'], default: 'utf8' },
      },
      required: ['path', 'content'],
    },
  },
  {
    name: 'file-delete',
    category: 'file',
    confirm: 'destructive',
    description: 'Delete file',
    inputSchema: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'File path' },
      },
      required: ['path'],
    },
  },
  {
    name: 'http-request',
    category: 'network',
    confirm: 'none',
    description: 'Make HTTP request',
    inputSchema: {
      type: 'object',
      properties: {
        url: { type: 'string', description: 'Request URL' },
        method: { type: 'string', enum: ['GET', 'POST', 'PUT', 'DELETE'], default: 'GET' },
        headers: { type: 'object', description: 'Request headers' },
        body: { type: 'string', description: 'Request body' },
      },
      required: ['url'],
    },
  },
  {
    name: 'command-exec',
    category: 'system',
    confirm: 'destructive',
    description: 'Execute system command',
    inputSchema: {
      type: 'object',
      properties: {
        command: { type: 'string', description: 'Command to execute' },
        args: { type: 'array', items: { type: 'string' }, description: 'Command arguments' },
        cwd: { type: 'string', description: 'Working directory' },
        timeout: { type: 'number', description: 'Timeout in milliseconds' },
      },
      required: ['command'],
    },
  },
  {
    name: 'data-parse',
    category: 'data',
    confirm: 'none',
    description: 'Parse data format',
    inputSchema: {
      type: 'object',
      properties: {
        data: { type: 'string', description: 'Data to parse' },
        format: { type: 'string', enum: ['json', 'yaml', 'csv', 'xml'], description: 'Data format' },
      },
      required: ['data', 'format'],
    },
  },
  {
    name: 'data-transform',
    category: 'data',
    confirm: 'none',
    description: 'Transform data',
    inputSchema: {
      type: 'object',
      properties: {
        data: { type: 'object', description: 'Data to transform' },
        transformation: { type: 'string', description: 'Transformation logic' },
      },
      required: ['data', 'transformation'],
    },
  },
];
