/**
 * Skill Types - OpenClaw 兼容的 Skill 类型系统
 *
 * 完整的 Skill 类型定义，支持声明式配置
 *
 * @module SkillTypes
 * @version 5.0.0
 */

import type { z } from 'zod';

// ============================================================================
// Value Objects
// ============================================================================

export type SkillId = string;
export type SkillName = string;

// ============================================================================
// Skill Stream Chunk (流式输出)
// ============================================================================

export interface SkillStreamChunk {
  /** 块类型 */
  type: 'text' | 'data' | 'error' | 'progress';
  /** 内容 */
  content: string | Record<string, unknown>;
  /** 时间戳 */
  timestamp: number;
  /** 是否完成 */
  done?: boolean;
}

// ============================================================================
// Skill Install Spec
// ============================================================================

export type InstallKind = 'brew' | 'node' | 'go' | 'uv' | 'download';

export interface SkillInstallSpec {
  /** 安装器标识 */
  id?: string;
  /** 安装方式 */
  kind: InstallKind;
  /** 显示标签 */
  label?: string;
  /** 安装后提供的二进制文件 */
  bins?: string[];
  /** 支持的操作系统 */
  os?: string[];
  /** brew 公式名 */
  formula?: string;
  /** npm 包名 */
  package?: string;
  /** go 模块路径 */
  module?: string;
  /** 下载 URL */
  url?: string;
  /** 压缩包类型 */
  archive?: 'tar.gz' | 'tar.bz2' | 'tar.xz' | 'zip';
  /** 是否解压 */
  extract?: boolean;
  /** 解压时跳过的目录层级 */
  stripComponents?: number;
  /** 目标目录 */
  targetDir?: string;
}

// ============================================================================
// Skill Requirements
// ============================================================================

export interface SkillRequirements {
  /** 必须全部存在的二进制文件 */
  bins?: string[];
  /** 至少一个存在的二进制文件 */
  anyBins?: string[];
  /** 必须设置的环境变量 */
  env?: string[];
  /** 必须存在的配置路径 */
  config?: string[];
}

// ============================================================================
// OpenClaw Skill Metadata
// ============================================================================

export interface OpenClawSkillMetadata {
  /** 是否总是启用（忽略依赖检查） */
  always?: boolean;
  /** 技能唯一键 */
  skillKey?: string;
  /** 主要环境变量名（用于 API Key） */
  primaryEnv?: string;
  /** 表情符号 */
  emoji?: string;
  /** 主页链接 */
  homepage?: string;
  /** 支持的操作系统列表 */
  os?: string[];
  /** 依赖要求 */
  requires?: SkillRequirements;
  /** 安装规范列表 */
  install?: SkillInstallSpec[];
}

// ============================================================================
// Skill Invocation Policy
// ============================================================================

export interface SkillInvocationPolicy {
  /** 用户是否可直接调用 */
  userInvocable?: boolean;
  /** 是否禁用模型自动调用 */
  disableModelInvocation?: boolean;
}

// ============================================================================
// Skill Command Dispatch
// ============================================================================

export type DispatchKind = 'tool';

export interface SkillCommandDispatchSpec {
  kind: DispatchKind;
  toolName: string;
  argMode?: 'raw';
}

// ============================================================================
// Parsed Frontmatter
// ============================================================================

export interface ParsedSkillFrontmatter {
  /** Skill 名称 */
  name: SkillName;
  /** Skill 描述 */
  description: string;
  /** 主页链接 */
  homepage?: string;
  /** 是否用户可调佣 */
  userInvocable?: boolean;
  /** 是否禁用模型调用 */
  disableModelInvocation?: boolean;
  /** 命令分发类型 */
  commandDispatch?: DispatchKind;
  /** 关联的工具名称 */
  commandTool?: string;
  /** 参数传递模式 */
  commandArgMode?: 'raw';
  /** 原始元数据字符串 */
  metadata?: string;
}

// ============================================================================
// Skill Source
// ============================================================================

export type SkillSource =
  | 'openclaw-extra'
  | 'openclaw-bundled'
  | 'openclaw-managed'
  | 'openclaw-workspace'
  | 'openclaw-plugin';

// ============================================================================
// Core Skill Interface
// ============================================================================

export interface Skill {
  /** Skill ID */
  readonly id: SkillId;
  /** Skill 名称 */
  readonly name: SkillName;
  /** 描述 */
  readonly description: string;
  /** 版本 */
  readonly version: string;
  /** 来源 */
  readonly source: SkillSource;
  /** 文件路径（如果是从文件加载） */
  readonly filePath?: string;
  /** 基础目录 */
  readonly baseDir?: string;
  /** 输入 Schema */
  readonly inputSchema: unknown;
  /** 元数据 */
  readonly metadata?: SkillMetadata;
  /** 执行函数 */
  execute: (input: unknown, context: SkillContext) => Promise<SkillResult>;
  /** 流式执行（可选） */
  executeStream?: (input: unknown, context: SkillContext) => AsyncGenerator<SkillStreamChunk, SkillResult, unknown>;
}

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
  /** OpenClaw 扩展元数据 */
  openclaw?: OpenClawSkillMetadata;
}

// ============================================================================
// Skill Entry (Runtime)
// ============================================================================

export interface SkillEntry {
  /** 基础 Skill 对象 */
  skill: Skill;
  /** 解析的 Frontmatter */
  frontmatter: ParsedSkillFrontmatter;
  /** OpenClaw 元数据 */
  metadata?: OpenClawSkillMetadata;
  /** 调用策略 */
  invocation?: SkillInvocationPolicy;
  /** 来源 */
  source: SkillSource;
  /** 优先级 */
  priority: number;
}

// ============================================================================
// Skill Context
// ============================================================================

export interface SkillContext {
  /** 执行 ID */
  executionId: string;
  /** Agent ID */
  agentId: string;
  /** 会话 ID */
  sessionId?: string;
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
  /** 执行上下文管理器 (用于循环检测和深度控制) */
  executionContext?: import('../execution/execution-context.js').ExecutionContextManager;
}

// ============================================================================
// Skill Result
// ============================================================================

export interface SkillResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: SkillError;
  metadata?: ExecutionMetadata;
}

export interface SkillError {
  code: string;
  message: string;
  skillId: SkillId;
  recoverable: boolean;
  stack?: string;
}

export interface ExecutionMetadata {
  executionId: string;
  skillId?: SkillId;
  skillName?: string;
  startTime: number;
  endTime: number;
  duration: number;
  tokensUsed?: number;
  attempts?: number;
}

// ============================================================================
// Service Interfaces
// ============================================================================

export interface Logger {
  debug: (message: string, meta?: Record<string, unknown>) => void;
  info: (message: string, meta?: Record<string, unknown>) => void;
  warn: (message: string, meta?: Record<string, unknown>) => void;
  error: (message: string, context?: Record<string, unknown>, error?: Error) => void;
}

export interface LLMService {
  complete: (request: {
    messages: Array<{ role: string; content: string; id: string; timestamp: number }>;
    temperature?: number;
    model?: string;
  }) => Promise<{
    choices: Array<{ message?: { content?: string } }>;
  }>;
  completeStream: (request: unknown) => AsyncGenerator<unknown>;
}

export interface MemoryService {
  store: (entry: {
    id: string;
    content: string;
    type: string;
    timestamp: number;
    importance?: number;
  }) => Promise<void>;
  search: (query: string) => Promise<unknown[]>;
  retrieve: (id: string) => Promise<unknown | undefined>;
}

export interface ToolRegistry {
  execute: (
    toolId: string,
    params: unknown,
    context: unknown
  ) => Promise<{ success: boolean; data?: unknown; error?: { code: string; message: string } }>;
  list: () => Array<{ name: string; description: string }>;
}

// ============================================================================
// Skill Registry Interface
// ============================================================================

export interface SkillRegistry {
  /** 注册 Skill */
  register: (skill: Skill) => void;
  /** 取消注册 */
  unregister: (skillId: SkillId) => void;
  /** 获取 Skill */
  get: (skillId: SkillId) => Skill | undefined;
  /** 根据名称获取 */
  getByName: (name: string) => Skill | undefined;
  /** 列出所有 Skill */
  list: () => Skill[];
  /** 搜索 Skill */
  search: (query: string) => Skill[];
  /** 执行 Skill */
  execute: (skillId: SkillId, input: unknown, context: SkillContext) => Promise<SkillResult>;
}

// ============================================================================
// Eligibility Types
// ============================================================================

export interface EligibilityContext {
  /** 当前平台 */
  platform: string;
  /** 环境变量 */
  env: Record<string, string | undefined>;
  /** 配置 */
  config?: SkillConfig;
  /** 远程节点资格 */
  remote?: RemoteEligibility;
}

export interface RemoteEligibility {
  /** 支持的平台 */
  platforms: string[];
  /** 检查是否有指定二进制 */
  hasBin: (bin: string) => boolean;
  /** 检查是否有任一指定二进制 */
  hasAnyBin: (bins: string[]) => boolean;
  /** 提示信息 */
  note?: string;
}

export interface EligibilityResult {
  eligible: boolean;
  reason?: string;
  missingBins?: string[];
  missingEnv?: string[];
  missingConfig?: string[];
  unsupportedPlatform?: boolean;
}

// ============================================================================
// Config Types
// ============================================================================

export interface SkillConfig {
  /** 是否启用 */
  enabled?: boolean;
  /** API 密钥 */
  apiKey?: string;
  /** 环境变量 */
  env?: Record<string, string>;
  /** 自定义配置 */
  config?: Record<string, unknown>;
}

export interface SkillsConfig {
  /** 内置 Skill 白名单 */
  allowBundled?: string[];
  /** 加载配置 */
  load?: {
    extraDirs?: string[];
    watch?: boolean;
    watchDebounceMs?: number;
  };
  /** 安装偏好 */
  install?: {
    nodeManager?: 'npm' | 'yarn' | 'pnpm';
  };
  /** 每个 Skill 的配置 */
  entries?: Record<string, SkillConfig>;
}

// ============================================================================
// Skill Snapshot
// ============================================================================

export interface SkillSnapshot {
  /** 格式化后的提示文本 */
  prompt: string;
  /** Skill 列表 */
  skills: Array<{ name: string; primaryEnv?: string }>;
  /** 解析后的 Skill 列表 */
  resolvedSkills?: Skill[];
  /** 版本号 */
  version?: number;
}

// ============================================================================
// Execution Options
// ============================================================================

export interface SkillExecutionOptions {
  timeout?: number;
  retries?: number;
  retryDelay?: number;
  maxRetryDelay?: number;
  jitter?: number;
}

// ============================================================================
// Load Options
// ============================================================================

export interface LoadSkillOptions {
  config?: SkillsConfig;
  eligibility?: EligibilityContext;
  skillFilter?: (entry: SkillEntry) => boolean;
}

// ============================================================================
// Security Types
// ============================================================================

export interface SecurityRule {
  ruleId: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  message: string;
  pattern: RegExp;
  requiresContext?: RegExp;
}

export interface SecurityWarning {
  ruleId: string;
  severity: SecurityRule['severity'];
  message: string;
  line?: number;
  column?: number;
}

export interface SecurityScanResult {
  passed: boolean;
  warnings: SecurityWarning[];
  criticalCount: number;
  highCount: number;
  mediumCount: number;
  lowCount: number;
}
