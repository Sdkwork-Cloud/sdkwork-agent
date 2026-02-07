/**
 * Tool Core Types - 工具核心类型定义
 *
 * 统一 Tool 类型系统
 *
 * @module ToolTypes
 * @version 1.0.0
 */

// ============================================================================
// Tool Category
// ============================================================================

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

// ============================================================================
// Tool Definition
// ============================================================================

/**
 * Tool 输出内容项
 */
export interface ToolOutputContent {
  type: 'text' | 'error' | 'image' | 'json';
  text?: string;
  mimeType?: string;
  data?: string;
}

/**
 * Tool 执行结果
 */
export interface ToolOutput {
  content: ToolOutputContent[];
  isError?: boolean;
  metadata?: Record<string, unknown>;
}

/**
 * 执行上下文
 */
export interface ExecutionContext {
  agentId: string;
  sessionId?: string;
  executionId: string;
  logger: {
    debug: (message: string, meta?: Record<string, unknown>) => void;
    info: (message: string, meta?: Record<string, unknown>) => void;
    warn: (message: string, meta?: Record<string, unknown>) => void;
    error: (message: string, error?: Error) => void;
  };
}

/**
 * Tool 定义
 */
export interface Tool {
  /** Tool 名称 */
  name: string;
  /** 描述 */
  description: string;
  /** 参数定义 */
  parameters?: {
    type: 'object';
    properties?: Record<string, unknown>;
    required?: string[];
  };
  /** 执行函数 */
  execute: (input: unknown, context: ExecutionContext) => Promise<ToolOutput>;
  /** 元数据 */
  metadata?: {
    category?: string;
    tags?: string[];
    version?: string;
    requiresConfirmation?: boolean;
  };
}

// ============================================================================
// Tool Registry
// ============================================================================

/**
 * Tool 注册表接口
 */
export interface ToolRegistry {
  /** 注册 Tool */
  register(tool: Tool): void;
  /** 取消注册 */
  unregister(name: string): boolean;
  /** 获取 Tool */
  get(name: string): Tool | undefined;
  /** 是否存在 */
  has(name: string): boolean;
  /** 列出所有 */
  list(): Tool[];
  /** 搜索 */
  search(query: string): Tool[];
  /** 清空 */
  clear(): void;
  /** 执行 */
  execute(name: string, input: unknown, context: ExecutionContext): Promise<ToolOutput>;
}
