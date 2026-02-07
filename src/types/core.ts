/**
 * Core Types - 核心基础类型定义
 *
 * 所有模块共享的基础类型定义
 *
 * @module CoreTypes
 * @version 1.0.0
 * @standard SDKWork Unified Type System
 */

// ============================================================================
// Basic Types
// ============================================================================

/** 唯一标识符 */
export type ID = string;

/** 时间戳 */
export type Timestamp = number | Date;

/** 版本号 */
export type Version = string;

/** JSON 兼容的数据类型 */
export type JSONValue = string | number | boolean | null | JSONObject | JSONArray;

/** JSON 对象 */
export interface JSONObject {
  [key: string]: JSONValue;
}

/** JSON 数组 */
export interface JSONArray extends Array<JSONValue> {}

/** 可序列化的数据 */
export type Serializable = JSONValue;

/** 错误码 */
export type ErrorCode = string;

/** 状态码 */
export type StatusCode = number;

// ============================================================================
// Result Types
// ============================================================================

/**
 * 操作结果
 */
export interface Result<T = unknown, E = Error> {
  success: boolean;
  data?: T;
  error?: E;
}

/**
 * 成功结果
 */
export interface SuccessResult<T> extends Result<T, never> {
  success: true;
  data: T;
}

/**
 * 失败结果
 */
export interface FailureResult<E = Error> extends Result<never, E> {
  success: false;
  error: E;
}

/**
 * 执行错误基础接口
 */
export interface ExecutionError {
  /** 错误码 */
  code: string;
  /** 错误消息 */
  message: string;
  /** 是否可恢复 */
  recoverable: boolean;
}

/**
 * 执行结果基础接口
 * 用于 Skill、Tool 等执行结果
 */
export interface ExecutionResultBase<T = unknown, E = ExecutionError, M = Record<string, unknown>> {
  /** 是否成功 */
  success: boolean;
  /** 输出数据 */
  data?: T;
  /** 错误信息 */
  error?: E;
  /** 执行元数据 */
  meta?: M;
}

// ============================================================================
// Event Types
// ============================================================================

/**
 * 基础事件
 */
export interface BaseEvent {
  type: string;
  timestamp: Timestamp;
  source?: string;
}

/**
 * 事件处理器
 */
export type EventHandler<T = unknown> = (event: T) => void | Promise<void>;

/**
 * 事件发射器接口
 */
export interface EventEmitter {
  on<T>(event: string, handler: EventHandler<T>): void;
  off<T>(event: string, handler: EventHandler<T>): void;
  emit<T>(event: string, data: T): void;
}

// ============================================================================
// Logger Types
// ============================================================================

/**
 * 日志级别
 */
export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'fatal';

/**
 * 日志上下文
 */
export interface LogContext {
  [key: string]: unknown;
}

/**
 * 日志条目
 */
export interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: Timestamp;
  context?: LogContext;
  error?: Error;
  source?: string;
}

/**
 * 日志器接口 - 使用 utils/logger 中的 ILogger
 */
export type Logger = import('../utils/logger').ILogger;

// ============================================================================
// Configuration Types
// ============================================================================

/**
 * 基础配置接口
 */
export interface BaseConfig {
  id?: ID;
  name?: string;
  description?: string;
  version?: Version;
  enabled?: boolean;
}

/**
 * 配置变更事件
 */
export interface ConfigChangeEvent<T = unknown> extends BaseEvent {
  type: 'config:changed';
  key: string;
  oldValue: T;
  newValue: T;
}

// ============================================================================
// Validation Types
// ============================================================================

/**
 * 验证错误
 */
export interface ValidationError {
  field: string;
  message: string;
  code: ErrorCode;
}

/**
 * 验证结果
 */
export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

/**
 * 验证器接口
 */
export interface Validator<T = unknown> {
  validate(value: T): ValidationResult;
}

// ============================================================================
// Utility Types
// ============================================================================

/** 可为空 */
export type Nullable<T> = T | null;

/** 可选 */
export type Optional<T> = T | undefined;

/** 异步 */
export type Async<T> = Promise<T>;

/** 构造函数 */
export type Constructor<T = {}> = new (...args: unknown[]) => T;

/** 函数 */
export type AnyFunction = (...args: unknown[]) => unknown;

/** 异步函数 */
export type AsyncFunction = (...args: unknown[]) => Promise<unknown>;

/** 深度只读 */
export type DeepReadonly<T> = {
  readonly [K in keyof T]: T[K] extends object ? DeepReadonly<T[K]> : T[K];
};

/** 深度部分 */
export type DeepPartial<T> = {
  [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K];
};

/** 必填字段 */
export type RequiredFields<T, K extends keyof T> = Omit<T, K> & Required<Pick<T, K>>;

/** 可选字段 */
export type OptionalFields<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;
