/**
 * Tool Core Types - 工具核心类型定义
 *
 * 统一 Tool 类型系统 - 插件化架构
 *
 * @module ToolTypes
 * @version 2.0.0
 */

import type { z } from 'zod';

// ============================================================================
// Tool Identity
// ============================================================================

export type ToolId = string;
export type ToolName = string;
export type ToolCategory = 
  | 'filesystem'  // 文件操作
  | 'network'     // 网络请求
  | 'system'      // 系统操作
  | 'data'        // 数据处理
  | 'llm'         // LLM 操作
  | 'browser'     // 浏览器操作
  | 'custom';     // 自定义

// ============================================================================
// Tool Output
// ============================================================================

export interface ToolOutputContent {
  type: 'text' | 'error' | 'image' | 'json';
  text?: string;
  mimeType?: string;
  data?: string;
}

export interface ToolOutput {
  content: ToolOutputContent[];
  isError?: boolean;
  metadata?: {
    duration?: number;
    tokensUsed?: number;
    [key: string]: unknown;
  };
}

// ============================================================================
// Tool Error
// ============================================================================

export interface ToolError {
  code: string;
  message: string;
  recoverable: boolean;
  details?: Record<string, unknown>;
}

// ============================================================================
// Tool Result
// ============================================================================

export interface ToolResult<T = unknown> {
  success: boolean;
  data?: T;
  output?: ToolOutput;
  error?: ToolError;
  metadata?: {
    duration?: number;
    attempts?: number;
    [key: string]: unknown;
  };
}

// ============================================================================
// Execution Context
// ============================================================================

export interface ExecutionContext {
  agentId: string;
  sessionId?: string;
  executionId: string;
  toolId: ToolId;
  toolName: ToolName;
  logger: {
    debug: (message: string, meta?: Record<string, unknown>) => void;
    info: (message: string, meta?: Record<string, unknown>) => void;
    warn: (message: string, meta?: Record<string, unknown>) => void;
    error: (message: string, meta?: Record<string, unknown>, error?: Error) => void;
  };
  signal?: AbortSignal;
  /** 执行上下文管理器 (用于循环检测和深度控制) */
  executionContext?: import('../../execution/execution-context.js').ExecutionContextManager;
}

// ============================================================================
// Tool Definition
// ============================================================================

export interface Tool {
  /** Tool ID */
  id: ToolId;
  /** Tool 名称 */
  name: ToolName;
  /** 描述 */
  description: string;
  /** 分类 */
  category: ToolCategory;
  /** 参数 Schema (zod) */
  parameters: z.ZodType<unknown>;
  /** 执行函数 */
  execute: (input: unknown, context: ExecutionContext) => Promise<ToolResult>;
  /** 元数据 */
  metadata?: {
    version?: string;
    author?: string;
    tags?: string[];
    requiresConfirmation?: boolean;
    timeout?: number;
    retries?: number;
  };
}

// ============================================================================
// Tool Registry Interface
// ============================================================================

export interface IToolRegistry {
  register(tool: Tool): void;
  unregister(toolId: ToolId): boolean;
  get(toolId: ToolId): Tool | undefined;
  getByName(name: ToolName): Tool | undefined;
  has(toolId: ToolId): boolean;
  list(): Tool[];
  listByCategory(category: ToolCategory): Tool[];
  search(query: string): Tool[];
  clear(): void;
  execute(
    toolId: ToolId,
    input: unknown,
    context: ExecutionContext,
    options?: ToolExecutionOptions
  ): Promise<ToolResult>;
  executeParallel(
    calls: Array<{ toolId: ToolId; input: unknown }>,
    context: ExecutionContext,
    options?: ToolExecutionOptions
  ): Promise<ToolResult[]>;
}

// ============================================================================
// Execution Options
// ============================================================================

export interface ToolExecutionOptions {
  timeout?: number;
  retries?: number;
  retryDelay?: number;
  parallel?: boolean;
}

// ============================================================================
// Tool Plugin Interface
// ============================================================================

export interface ToolPlugin {
  name: string;
  version: string;
  tools: Tool[];
  initialize?: (registry: IToolRegistry) => Promise<void> | void;
  destroy?: () => Promise<void> | void;
}

// ============================================================================
// Tool Factory
// ============================================================================

export type ToolFactory = (config?: Record<string, unknown>) => Tool;
