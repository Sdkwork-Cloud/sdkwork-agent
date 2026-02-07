/**
 * Skill Domain - 技能领域
 * 
 * 行业标准 Skill 系统
 * 支持 Reference + Script + 注入 API
 * 
 * @domain Skill
 * @version 4.1.0
 * @standard Industry Leading (Claude Code / OpenCode / OpenClaw)
 */

import type { ExecutionResultBase, ExecutionError } from '../../types/core.js';

// ============================================
// Skill Definition - 技能定义
// ============================================

/**
 * Skill 定义 - 核心领域对象
 */
export interface Skill {
  /** Skill ID */
  id: string;
  /** Skill 名称 */
  name: string;
  /** 描述 */
  description: string;
  /** 版本 */
  version?: string;
  
  /** 执行脚本 */
  script: SkillScript;
  
  /** 引用文件 */
  references?: Reference[];
  
  /** 输入 Schema */
  input?: JSONSchema;
  /** 输出 Schema */
  output?: JSONSchema;
  
  /** 元数据 */
  meta?: Record<string, unknown>;
}

/**
 * Skill 脚本
 */
export interface SkillScript {
  /** 代码内容 */
  code: string;
  /** 语言 */
  lang: SkillLanguage;
  /** 入口函数 */
  entry?: string;
  /** 依赖 */
  dependencies?: Record<string, string>;
}

/**
 * Skill 支持的语言
 */
export type SkillLanguage = 
  | 'javascript' 
  | 'typescript' 
  | 'python' 
  | 'bash' 
  | 'shell';

/**
 * 引用文件
 */
export interface Reference {
  /** 引用名称 */
  name: string;
  /** 文件路径 */
  path: string;
  /** 文件内容 */
  content: string;
  /** 文件类型 */
  type: ReferenceType;
}

/**
 * 引用文件类型
 */
export type ReferenceType = 
  | 'code'      // 代码文件
  | 'data'      // 数据文件
  | 'template'  // 模板文件
  | 'doc'       // 文档
  | 'config';   // 配置文件

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
// Skill Execution Context - 执行上下文
// ============================================

/**
 * Skill 执行上下文
 */
export interface SkillExecutionContext {
  /** 执行 ID */
  executionId: string;
  /** Agent ID */
  agentId: string;
  /** 会话 ID */
  sessionId?: string;
  /** 父执行 ID（用于嵌套调用） */
  parentExecutionId?: string;
  
  /** 输入数据 */
  input: unknown;
  
  /** 引用文件映射 */
  references: Record<string, string>;
  
  /** 日志 */
  logger: SkillLogger;
  
  /** 中止信号 */
  signal?: AbortSignal;
  
  /** 开始时间 */
  startedAt: Date;
}

/**
 * Skill 日志 - 使用统一的 ILogger 接口
 */
export type SkillLogger = import('../../utils/logger').ILogger;

// ============================================
// Injected API - Agent 端注入 API
// ============================================

/**
 * Skill 注入 API
 * 在 Skill Script 中通过 $ 前缀访问
 */
export interface SkillInjectedAPI {
  /** 执行上下文 */
  $context: SkillExecutionContext;
  
  /** 输入数据 */
  $input: unknown;
  
  /** 
   * 调用 LLM
   * @example
   * const result = await $llm('请分析这段代码');
   */
  $llm: (prompt: string, options?: LLMOptions) => Promise<string>;
  
  /**
   * 调用 Tool
   * @example
   * const result = await $tool('file-read', { path: './data.txt' });
   */
  $tool: (name: string, input: unknown) => Promise<unknown>;
  
  /**
   * 调用 Skill
   * @example
   * const result = await $skill('math-calc', { expression: '2+2' });
   */
  $skill: (name: string, input: unknown) => Promise<unknown>;
  
  /**
   * 内存操作
   * @example
   * await $memory.set('key', value);
   * const value = await $memory.get('key');
   */
  $memory: SkillMemoryAPI;
  
  /**
   * 引用文件访问
   * @example
   * const template = $references.template;
   * const data = $references['data.json'];
   */
  $references: Record<string, string>;
  
  /**
   * 引用文件访问函数
   */
  $ref: (name: string) => string;
  
  /**
   * 日志
   * @example
   * $log.info('Processing...');
   */
  $log: SkillLogger;
}

/**
 * LLM 调用选项
 */
export interface LLMOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  systemPrompt?: string;
}

/**
 * Skill 内存 API
 */
export interface SkillMemoryAPI {
  /** 获取 */
  get: (key: string) => Promise<unknown>;
  /** 设置 */
  set: (key: string, value: unknown) => Promise<void>;
  /** 删除 */
  delete: (key: string) => Promise<void>;
  /** 搜索 */
  search: (query: string, limit?: number) => Promise<unknown[]>;
  /** 清空 */
  clear: () => Promise<void>;
}

// ============================================
// Skill Execution Result - 执行结果
// ============================================

/**
 * Skill 执行结果
 * 使用 ExecutionResultBase 基础接口
 */
export interface SkillResult extends ExecutionResultBase<unknown, SkillError, SkillExecutionMeta> {}

/**
 * Skill 错误
 * 扩展基础 ExecutionError，添加 Skill 特有字段
 */
export interface SkillError extends ExecutionError {
  /** Skill ID */
  skillId: string;
  /** 堆栈 */
  stack?: string;
}

/**
 * Skill 执行元数据
 */
export interface SkillExecutionMeta {
  /** 执行 ID */
  executionId: string;
  /** Skill ID */
  skillId: string;
  /** Skill 名称 */
  skillName: string;
  /** 开始时间 */
  startTime: number;
  /** 结束时间 */
  endTime: number;
  /** 持续时间 */
  duration: number;
  /** 资源使用 */
  resources?: ResourceUsage;
}

/**
 * 资源使用
 */
export interface ResourceUsage {
  /** 内存使用 (字节) */
  memory?: number;
  /** CPU 时间 (毫秒) */
  cpu?: number;
}

// ============================================
// Skill Registry - 技能注册表
// ============================================

/**
 * Skill 注册表接口
 */
export interface SkillRegistry {
  /** 注册 Skill */
  register(skill: Skill): void;
  /** 取消注册 */
  unregister(skillId: string): void;
  /** 获取 Skill */
  get(skillId: string): Skill | undefined;
  /** 根据名称获取 */
  getByName(name: string): Skill | undefined;
  /** 列出所有 */
  list(): Skill[];
  /** 搜索 */
  search(query: string): Skill[];
  /** 清空 */
  clear(): void;
}

// ============================================
// Skill Executor - 技能执行器
// ============================================

/**
 * Skill 执行器接口
 */
export interface SkillExecutor {
  /**
   * 执行 Skill
   */
  execute(skill: Skill, input: unknown, context: SkillExecutionContext): Promise<SkillResult>;
  
  /**
   * 验证 Skill
   */
  validate(skill: Skill): ValidationResult;
  
  /**
   * 中止执行
   */
  abort(executionId: string): void;
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
// Skill Events - 技能事件
// ============================================

export type SkillEventType =
  | 'skill:registered'
  | 'skill:unregistered'
  | 'skill:executing'
  | 'skill:executed'
  | 'skill:completed'
  | 'skill:failed'
  | 'skill:aborted';

export interface SkillEvent<T = unknown> {
  type: SkillEventType;
  timestamp: number;
  payload: T;
  skillId: string;
  executionId?: string;
}
