/**
 * SDKWork Unified Execution Engine
 * 统一执行引擎 - 行业领先的Skill执行标准
 * 
 * 设计原则：
 * 1. 统一抽象：所有可执行单元（Skill、Tool、MCP、Plugin）遵循统一接口
 * 2. 沙箱安全：代码执行在受控环境中
 * 3. 资源隔离：每个执行单元有独立的资源限制
 * 4. 可观测性：完整的执行追踪和监控
 * 5. 可扩展性：插件化架构支持自定义执行器
 * 
 * 参考架构：
 * - Claude Code: 命令即代码，工具优先
 * - OpenCode: 模块化执行上下文
 * - OpenClaw: 声明式动作定义
 * - MCP: 标准化工具协议
 * 
 * @module execution
 */

// ============================================================================
// Core Execution Types
// ============================================================================

/**
 * 可执行单元类型
 * 统一所有可执行资源的类型标识
 */
export type ExecutableType = 
  | 'skill'      // Skill脚本执行
  | 'tool'       // 本地工具调用
  | 'mcp'        // MCP协议工具
  | 'plugin'     // 插件扩展
  | 'reference'  // 引用资源
  | 'composite'; // 组合执行

/**
 * 执行单元接口
 * 所有可执行资源必须实现此接口
 */
export interface Executable {
  /** 唯一标识符 */
  readonly id: string;
  
  /** 执行单元类型 */
  readonly type: ExecutableType;
  
  /** 名称 */
  readonly name: string;
  
  /** 描述 */
  readonly description: string;
  
  /** 版本 */
  readonly version: string;
  
  /** 输入参数Schema */
  readonly inputSchema: unknown;
  
  /** 输出Schema */
  readonly outputSchema?: unknown;
  
  /** 执行单元 */
  execute(input: unknown, context: ExecutionContext): Promise<ExecutionResult>;
}

/**
 * 执行上下文
 * 提供执行所需的完整环境
 */
export interface ExecutionContext {
  /** 执行ID */
  executionId: string;
  
  /** 父执行ID（用于追踪调用链） */
  parentExecutionId?: string;
  
  /** 会话ID */
  sessionId: string;
  
  /** Agent实例引用 */
  agent: unknown;
  
  /** 执行单元名称 */
  executableName: string;
  
  /** 执行单元类型 */
  executableType: ExecutableType;
  
  /** 执行开始时间 */
  startTime: Date;
  
  /** 超时控制 */
  abortSignal?: AbortSignal;
  
  /** 日志记录器 */
  logger: ExecutionLogger;
  
  /** LLM服务 */
  llm: LLMService;
  
  /** 内存服务 */
  memory: MemoryService;
  
  /** 工具注册表 */
  tools: ToolRegistry;
  
  /** MCP客户端 */
  mcp?: MCPClient;
  
  /** 插件管理器 */
  plugins?: PluginManager;
  
  /** 资源限制 */
  limits?: ResourceLimits;
  
  /** 环境变量 */
  env?: Record<string, string>;
  
  /** 元数据 */
  metadata?: Record<string, unknown>;
}

/**
 * 执行结果
 */
export interface ExecutionResult<T = unknown> {
  /** 是否成功 */
  success: boolean;
  
  /** 输出数据 */
  data?: T;
  
  /** 错误信息 */
  error?: ExecutionError;
  
  /** 执行元数据 */
  metadata: ExecutionMetadata;
  
  /** 子执行记录 */
  children?: ExecutionResult[];
}

/**
 * 执行错误
 */
export interface ExecutionError {
  /** 错误代码 */
  code: string;
  
  /** 错误消息 */
  message: string;
  
  /** 是否可恢复 */
  recoverable: boolean;
  
  /** 错误详情 */
  details?: unknown;
  
  /** 堆栈跟踪 */
  stack?: string;
  
  /** 导致错误的执行ID */
  executionId?: string;
}

/**
 * 执行元数据
 */
export interface ExecutionMetadata {
  /** 执行ID */
  executionId: string;
  
  /** 执行单元名称 */
  executableName: string;
  
  /** 执行单元类型 */
  executableType: ExecutableType;
  
  /** 开始时间 */
  startTime: Date;
  
  /** 结束时间 */
  endTime: Date;
  
  /** 执行时长（毫秒） */
  duration: number;
  
  /** 使用的token数 */
  tokensUsed?: number;
  
  /** 资源使用统计 */
  resources?: ResourceUsage;
  
  /** 执行步骤 */
  steps?: ExecutionStep[];
}

/**
 * 执行步骤
 */
export interface ExecutionStep {
  /** 步骤ID */
  id: string;
  
  /** 步骤类型 */
  type: 'script' | 'tool' | 'mcp' | 'plugin' | 'llm' | 'memory' | 'validate' | 'prepare' | 'execute';
  
  /** 步骤名称 */
  name: string;
  
  /** 输入 */
  input?: unknown;
  
  /** 输出 */
  output?: unknown;
  
  /** 状态 */
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
  
  /** 开始时间 */
  startTime?: Date;
  
  /** 结束时间 */
  endTime?: Date;
  
  /** 时长 */
  duration?: number;
  
  /** 错误 */
  error?: ExecutionError;
}

/**
 * 资源限制
 */
export interface ResourceLimits {
  /** 最大执行时间（毫秒） */
  maxExecutionTime?: number;
  
  /** 最大内存使用（字节） */
  maxMemory?: number;
  
  /** 最大CPU时间（毫秒） */
  maxCpuTime?: number;
  
  /** 最大递归深度 */
  maxRecursionDepth?: number;
  
  /** 最大并发执行数 */
  maxConcurrency?: number;
}

/**
 * 资源使用统计
 */
export interface ResourceUsage {
  /** CPU时间（毫秒） */
  cpuTime?: number;
  
  /** 内存使用峰值（字节） */
  memoryPeak?: number;
  
  /** 网络请求次数 */
  networkRequests?: number;
  
  /** 文件读写次数 */
  fileOperations?: number;
}

// ============================================================================
// Service Interfaces
// ============================================================================

/**
 * 执行日志记录器
 */
export type ExecutionLogger = import('../utils/logger').ILogger;

/**
 * LLM服务接口
 */
export interface LLMService {
  complete(request: LLMRequest): Promise<LLMResponse>;
  completeStream(request: LLMRequest): AsyncIterable<LLMStreamChunk>;
}

/**
 * LLM请求
 */
export interface LLMRequest {
  messages: LLMMessage[];
  model?: string;
  temperature?: number;
  maxTokens?: number;
  tools?: LLMToolDefinition[];
}

/**
 * LLM消息
 */
export interface LLMMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  toolCalls?: LLMToolCall[];
  toolCallId?: string;
}

/**
 * LLM响应
 */
export interface LLMResponse {
  content: string;
  toolCalls?: LLMToolCall[];
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

/**
 * LLM流式响应块
 */
export interface LLMStreamChunk {
  content?: string;
  toolCall?: LLMToolCall;
  usage?: {
    promptTokens: number;
    completionTokens: number;
  };
  isComplete: boolean;
}

/**
 * LLM工具定义
 */
export interface LLMToolDefinition {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: unknown;
  };
}

/**
 * LLM工具调用
 */
export interface LLMToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string;
  };
}

/**
 * 内存服务接口
 */
export interface MemoryService {
  get<T>(key: string): Promise<T | undefined>;
  set<T>(key: string, value: T): Promise<void>;
  delete(key: string): Promise<void>;
  search(query: string, options?: { limit?: number; threshold?: number }): Promise<unknown[]>;
}

/**
 * 工具注册表接口
 */
export interface ToolRegistry {
  get(name: string): Executable | undefined;
  register(tool: Executable): void;
  unregister(name: string): boolean;
  list(): Executable[];
  execute(name: string, input: unknown, context: ExecutionContext): Promise<ExecutionResult>;
}

/**
 * MCP客户端接口
 */
export interface MCPClient {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  getTools(): Executable[];
  getResources(): unknown[];
  executeTool(name: string, args: unknown): Promise<ExecutionResult>;
  readResource(uri: string): Promise<unknown>;
}

/**
 * 插件管理器接口
 */
export interface PluginManager {
  load(plugin: Plugin): Promise<void>;
  unload(name: string): Promise<void>;
  get(name: string): Plugin | undefined;
  list(): Plugin[];
  execute(name: string, input: unknown, context: ExecutionContext): Promise<ExecutionResult>;
}

/**
 * 插件接口
 */
export interface Plugin extends Executable {
  /** 插件初始化 */
  initialize(context: PluginContext): Promise<void>;
  
  /** 插件销毁 */
  destroy(): Promise<void>;
  
  /** 提供的可执行单元 */
  provides?: Executable[];
}

/**
 * 插件上下文
 */
export interface PluginContext {
  logger: ExecutionLogger;
  config: Record<string, unknown>;
  registerExecutable(executable: Executable): void;
}

// ============================================================================
// Execution Engine
// ============================================================================

export { ExecutionEngine } from './engine.js';
export { ScriptExecutor } from './script-executor.js';
export { MCPExecutor } from './mcp-executor.js';
export { PluginExecutor } from './plugin-executor.js';
export { ExecutionTracer } from './tracer.js';
export { ResourceMonitor } from './resource-monitor.js';

// Execution Context Manager
export {
  ExecutionContextManager,
  createExecutionContext,
  getExecutionContext,
  removeExecutionContext,
  getActiveExecutionContexts,
  cleanupExpiredContexts,
  WithExecutionContext,
  DEFAULT_EXECUTION_LIMITS,
} from './execution-context.js';

export type {
  ExecutionLimits,
  ExecutionCall,
  ExecutionCycle,
  ExecutionContextOptions,
} from './execution-context.js';

// ToolExecutor 从 core/application 重新导出
export { ToolExecutorImpl as ToolExecutor } from '../core/application/tool-executor.js';

// ============================================================================
// Re-exports from sub-modules
// ============================================================================

export type {
  ScriptExecutable,
  ScriptLanguage,
  ScriptSandbox,
} from './script-executor.js';

// Tool 类型从 domain/tool 导出
export type {
  Tool as ToolExecutable,
  ToolCategory,
  ConfirmLevel as ToolConfirmationLevel,
} from '../core/domain/tool.js';

export type {
  MCPExecutable,
  MCPResource,
  MCPResourceContent,
} from './mcp-executor.js';

export type {
  PluginExecutable,
  PluginManifest,
  PluginHook,
} from './plugin-executor.js';
