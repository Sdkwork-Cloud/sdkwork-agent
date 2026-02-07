/**
 * SDKWork Agent - 极简智能体类型定义
 * 
 * 设计原则：
 * 1. 极简主义 - 配置即启用，无需 enabled 标志
 * 2. 优美API - 参考行业最佳实践
 * 3. 类型安全 - 完整的 TypeScript 类型支持
 * 4. 统一风格 - 所有配置遵循相同模式
 * 
 * @version 3.2.0
 * @standard Industry Leading
 */

import type { AgentStatus } from './sdkwork-agent';

// ============================================
// Core Agent Configuration - 极简主义
// ============================================

/**
 * 智能体基础配置
 * 极简配置接口 - 配置即启用
 */
export interface AgentConfig {
  /** 智能体唯一标识 */
  id?: string;
  /** 智能体名称 */
  name: string;
  /** 智能体描述 */
  description?: string;
  /** 版本号 */
  version?: string;
  
  /** LLM 配置 */
  llm: LLMConfig;
  
  /** 
   * Skills 配置 - 配置即启用
   * undefined = 不启用
   * [] = 启用但无自定义 skills
   * [skill1, skill2] = 启用并加载指定 skills
   */
  skills?: SkillDefinition[];
  
  /** 
   * Tools 配置 - 配置即启用
   * undefined = 不启用
   * [] = 启用但无自定义 tools
   * [tool1, tool2] = 启用并加载指定 tools
   */
  tools?: ToolDefinition[];
  
  /** 
   * MCP 配置 - 配置即启用
   * undefined = 不启用
   * [] = 启用但无 servers
   * [{name, url}] = 启用并连接指定 servers
   */
  mcp?: MCPServerConfig[];
  
  /** 
   * Plugins 配置 - 配置即启用
   * undefined = 不启用
   * [] = 启用但无 plugins
   * [plugin1, plugin2] = 启用并加载指定 plugins
   */
  plugins?: PluginDefinition[];
  
  /** 
   * Memory 配置 - 配置即启用
   * undefined = 不启用
   * {} = 启用使用默认配置
   * { maxTokens: 8000 } = 启用并指定配置
   */
  memory?: MemoryConfig;
  
  /** 
   * Planning 配置 - 配置即启用
   * undefined = 不启用
   * {} = 启用使用默认配置
   * { strategy: 'mcts' } = 启用并指定配置
   */
  planning?: PlanningConfig;
  
  /** 执行配置 */
  execution?: ExecutionConfig;
}

// ============================================
// LLM Configuration - 简洁统一
// ============================================

export interface LLMConfig {
  /** 提供商类型 */
  provider: LLMProvider;
  /** API 密钥 */
  apiKey: string;
  /** 模型名称 */
  model?: string;
  /** 基础 URL（可选） */
  baseUrl?: string;
  /** 默认参数 */
  defaults?: LLMDefaults;
}

export type LLMProvider = 
  | 'openai' 
  | 'anthropic' 
  | 'google' 
  | 'moonshot' 
  | 'minimax' 
  | 'zhipu' 
  | 'qwen' 
  | 'deepseek' 
  | 'doubao' 
  | 'custom';

export interface LLMDefaults {
  temperature?: number;
  maxTokens?: number;
  topP?: number;
}

// ============================================
// Skills - 极简定义
// ============================================

export interface SkillDefinition {
  /** Skill ID */
  id: string;
  /** Skill 名称 */
  name: string;
  /** 描述 */
  description?: string;
  /** 版本 */
  version?: string;
  
  /** 执行配置 */
  run: SkillRunner;
  
  /** 引用文件 */
  refs?: ReferenceFile[];
  
  /** 输入输出 Schema */
  input?: JSONSchema;
  output?: JSONSchema;
}

export interface SkillRunner {
  /** 代码 */
  code: string;
  /** 语言 */
  lang: 'js' | 'ts' | 'python' | 'bash';
  /** 入口函数 */
  entry?: string;
}

export interface ReferenceFile {
  /** 引用名称 */
  name: string;
  /** 文件路径 */
  path: string;
  /** 文件内容 */
  content: string;
  /** 文件类型 */
  type: 'code' | 'data' | 'template' | 'doc';
}

// ============================================
// Tools - 极简定义
// ============================================

export interface ToolDefinition {
  /** Tool ID */
  id: string;
  /** Tool 名称 */
  name: string;
  /** 描述 */
  description?: string;
  /** 版本 */
  version?: string;
  
  /** 分类 */
  category: ToolCategory;
  /** 确认级别 */
  confirm?: ConfirmLevel;
  
  /** 执行函数 */
  run: ToolRunner;
  
  /** 输入输出 Schema */
  input?: JSONSchema;
  output?: JSONSchema;
}

export type ToolCategory = 'file' | 'network' | 'system' | 'data' | 'llm' | 'custom';
export type ConfirmLevel = 'none' | 'read' | 'write' | 'destructive';
export type ToolRunner = (input: unknown, context: ToolContext) => Promise<ToolResult>;

export interface ToolContext {
  executionId: string;
  agent: AgentContext;
  log: Logger;
}

export interface ToolResult {
  success: boolean;
  data?: unknown;
  error?: ToolError;
  meta?: Record<string, unknown>;
}

export interface ToolError {
  code: string;
  message: string;
  recoverable: boolean;
}

// ============================================
// MCP - 极简定义
// ============================================

export interface MCPServerConfig {
  /** 服务器名称 */
  name: string;
  /** 服务器 URL */
  url: string;
  /** 传输类型 */
  transport?: MCPTransport;
  /** 认证信息 */
  auth?: MCPAuth;
}

export type MCPTransport = 'stdio' | 'http' | 'websocket';

export interface MCPAuth {
  type: 'bearer' | 'basic' | 'apiKey';
  token?: string;
  username?: string;
  password?: string;
  apiKey?: string;
}

// ============================================
// Plugins - 极简定义
// ============================================

export interface PluginDefinition {
  /** Plugin ID */
  id: string;
  /** Plugin 名称 */
  name: string;
  /** 描述 */
  description?: string;
  /** 版本 */
  version: string;
  
  /** 初始化 */
  init?: (context: PluginContext) => Promise<void>;
  /** 销毁 */
  destroy?: () => Promise<void>;
  
  /** 提供的功能 */
  provides?: {
    skills?: SkillDefinition[];
    tools?: ToolDefinition[];
  };
}

export interface PluginContext {
  agent: AgentContext;
  config: Record<string, unknown>;
  log: Logger;
}

// ============================================
// Memory - 极简配置
// ============================================

export interface MemoryConfig {
  /** 最大上下文 Token 数 */
  maxTokens?: number;
  /** 检索限制 */
  limit?: number;
}

// ============================================
// Planning - 极简配置
// ============================================

export interface PlanningConfig {
  /** 规划策略 */
  strategy?: PlanningStrategy;
  /** 最大深度 */
  depth?: number;
  /** 超时时间 */
  timeout?: number;
}

export type PlanningStrategy = 'mcts' | 'htn' | 'react' | 'hybrid';

// ============================================
// Execution - 极简配置
// ============================================

export interface ExecutionConfig {
  /** 超时时间（毫秒） */
  timeout?: number;
  /** 最大重试次数 */
  retries?: number;
  /** 是否启用追踪 */
  tracing?: boolean;
  /** 资源限制 */
  limits?: ResourceLimits;
}

export interface ResourceLimits {
  memory?: number;
  cpu?: number;
}

// ============================================
// Common Types
// ============================================

export interface JSONSchema {
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  properties?: Record<string, JSONSchema>;
  items?: JSONSchema;
  required?: string[];
  enum?: unknown[];
  description?: string;
}

export interface AgentContext {
  id: string;
  name: string;
  version: string;
}

/**
 * Logger interface
 */
export type Logger = import('../utils/logger').ILogger;

// ============================================
// Execution Types
// ============================================

export interface ExecutionContext {
  id: string;
  parentId?: string;
  agent: AgentContext;
  input: unknown;
  timestamp: Date;
  meta?: Record<string, unknown>;
}

export interface ExecutionResult<T = unknown> {
  success: boolean;
  output?: T;
  error?: ExecutionError;
  executionId: string;
  duration: number;
  steps?: ExecutionStep[];
  meta?: ExecutionMetadata | Record<string, unknown>;
  tokensUsed?: number;
  executionTime?: number;
  tokens?: {
    prompt: number;
    completion: number;
    total: number;
  };
}

export interface ExecutionError extends Error {
  code: string;
  message: string;
  recoverable: boolean;
  details?: unknown;
  name: string;
}

export interface ExecutionStep {
  id: string;
  type: 'skill' | 'tool' | 'mcp' | 'plugin' | 'llm' | 'memory';
  name: string;
  description?: string;
  input: unknown;
  output?: unknown;
  status: 'pending' | 'running' | 'completed' | 'failed';
  startedAt: Date;
  endedAt?: Date;
  error?: ExecutionError;
}

export interface ExecutionMetadata {
  executionId: string;
  name: string;
  type: 'skill' | 'tool' | 'mcp' | 'plugin';
  startedAt: Date;
  endedAt: Date;
  duration: number;
  resources?: ResourceUsage;
  plan?: Plan;
}

export interface ResourceUsage {
  memory?: number;
  cpu?: number;
  network?: number;
}

// ============================================
// Agent State & Lifecycle
// ============================================

export interface AgentState {
  status: AgentStatus;
  executionCount: number;
  lastExecutionAt?: Date;
  totalExecutionTime: number;
  skills: string[];
  tools: string[];
  memory: Record<string, unknown>;
}

export interface AgentCapabilities {
  reflection?: boolean;
  planning?: boolean;
  tools?: boolean;
  skills?: boolean;
  mcp?: boolean;
  plugins?: boolean;
  memory?: boolean;
  canReflect?: boolean;
  canPlan?: boolean;
  canUseTools?: boolean;
  canUseSkills?: boolean;
  hasMemory?: boolean;
  canLearn?: boolean;
  canStream?: boolean;
  canReason?: boolean;
  maxIterations?: number;
  reflectionDepth?: number;
}

// ============================================
// Events
// ============================================

export interface AgentEvent<T = unknown> {
  type: string;
  timestamp: Date;
  payload: T;
  source: string;
}

export interface StateChangeEvent {
  from: AgentStatus;
  to: AgentStatus;
  timestamp: Date;
  reason?: string;
}

// ============================================
// Planning Types
// ============================================

export interface Plan {
  id: string;
  goal?: string;
  steps: PlanStep[];
  strategy: string;
  createdAt: Date;
  estimatedDuration?: number;
}

export interface PlanStep {
  id: string;
  description: string;
  type: 'skill' | 'tool' | 'mcp' | 'plugin' | 'llm' | 'condition' | 'loop';
  target?: string;
  input?: unknown;
  dependencies: string[];
  status: 'pending' | 'ready' | 'running' | 'completed' | 'failed';
  result?: unknown;
}

// ============================================
// Reflection Types
// ============================================

export interface Reflection {
  success: boolean;
  executionId?: string;
  insights: string[];
  improvements: Improvement[];
  confidence: number;
  timestamp: Date;
}

export interface Improvement {
  type: 'prompt' | 'skill' | 'tool' | 'plan' | 'memory';
  description: string;
  priority: 'low' | 'medium' | 'high';
  impact: number;
  expectedImpact?: number;
}

// ============================================
// Memory Types
// ============================================

export interface MemoryQuery {
  query: string;
  type?: 'episodic' | 'semantic' | 'procedural';
  limit?: number;
  threshold?: number;
  filters?: Record<string, unknown>;
}

export interface MemoryEntry {
  id: string;
  content: string;
  type: 'episodic' | 'semantic' | 'procedural';
  embedding?: number[];
  meta: Record<string, unknown>;
  createdAt: Date;
  accessedAt?: Date;
  accessCount: number;
}
