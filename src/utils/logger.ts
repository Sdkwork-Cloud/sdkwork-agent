/**
 * Unified Logging System - 统一日志系统
 *
 * 完整的日志解决方案，支持：
 * - 多级别日志 (debug, info, warn, error, fatal)
 * - 多传输器 (console, file, memory)
 * - 结构化日志格式
 * - 模块化日志标识
 * - 性能追踪
 * - 错误堆栈追踪
 * - CLI 友好输出
 *
 * @module Logger
 * @version 2.0.0
 */

import * as fs from 'fs';
import * as path from 'path';

// ============================================
// Types
// ============================================

export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'fatal';

export type LogModule =
  | 'agent'
  | 'skill'
  | 'tool'
  | 'mcp'
  | 'llm'
  | 'memory'
  | 'execution'
  | 'storage'
  | 'tui'
  | 'core'
  | 'system';

export interface LogContext {
  [key: string]: unknown;
}

export interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: Date;
  module?: LogModule;
  context?: LogContext;
  error?: Error;
  source?: string;
  traceId?: string;
  duration?: number;
}

export interface LoggerConfig {
  level: LogLevel;
  enableConsole: boolean;
  enableFile: boolean;
  filePath?: string;
  format: 'json' | 'pretty' | 'compact';
  includeTimestamp: boolean;
  includeSource: boolean;
  includeModule: boolean;
  colorize: boolean;
  maxFileSize?: number;
  maxFiles?: number;
  showStackTrace: boolean;
  enablePerformance: boolean;
}

export interface LogTransport {
  name: string;
  log(entry: LogEntry): void | Promise<void>;
  flush?(): Promise<void>;
  close?(): Promise<void>;
}

/**
 * 简化版 Logger 接口 - 用于外部组件
 */
export interface ILogger {
  debug(message: string, context?: LogContext): void;
  info(message: string, context?: LogContext): void;
  warn(message: string, context?: LogContext, error?: Error): void;
  error(message: string, context?: LogContext, error?: Error): void;
}

// ============================================
// Default Configuration
// ============================================

export const DEFAULT_LOGGER_CONFIG: LoggerConfig = {
  level: 'info',
  enableConsole: true,
  enableFile: false,
  format: 'pretty',
  includeTimestamp: true,
  includeSource: true,
  includeModule: true,
  colorize: true,
  showStackTrace: true,
  enablePerformance: true,
};

// ============================================
// Log Level Utilities
// ============================================

const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
  fatal: 4,
};

export function isLevelEnabled(configLevel: LogLevel, messageLevel: LogLevel): boolean {
  return LOG_LEVEL_PRIORITY[messageLevel] >= LOG_LEVEL_PRIORITY[configLevel];
}

// ============================================
// ANSI Colors
// ============================================

const ANSI = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  bright: '\x1b[1m',

  // Foreground colors
  black: '\x1b[30m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',

  // Background colors
  bgRed: '\x1b[41m',
  bgGreen: '\x1b[42m',
  bgYellow: '\x1b[43m',
  bgBlue: '\x1b[44m',
  bgMagenta: '\x1b[45m',
  bgCyan: '\x1b[46m',
};

const LEVEL_COLORS: Record<LogLevel, string> = {
  debug: ANSI.cyan,
  info: ANSI.green,
  warn: ANSI.yellow,
  error: ANSI.red,
  fatal: ANSI.bgRed + ANSI.white + ANSI.bold,
};

const MODULE_COLORS: Record<LogModule, string> = {
  agent: ANSI.magenta,
  skill: ANSI.blue,
  tool: ANSI.cyan,
  mcp: ANSI.yellow,
  llm: ANSI.green,
  memory: ANSI.dim,
  execution: ANSI.red,
  storage: ANSI.blue,
  tui: ANSI.cyan,
  core: ANSI.white,
  system: ANSI.yellow,
};

const LEVEL_ICONS: Record<LogLevel, string> = {
  debug: '🔍',
  info: '✓',
  warn: '⚠',
  error: '✗',
  fatal: '💥',
};

// ============================================
// Console Transport
// ============================================

class ConsoleTransport implements LogTransport {
  name = 'console';

  constructor(private config: LoggerConfig) {}

  log(entry: LogEntry): void {
    const formatted = this.formatEntry(entry);

    switch (entry.level) {
      case 'debug':
        console.debug(formatted);
        break;
      case 'info':
        console.info(formatted);
        break;
      case 'warn':
        console.warn(formatted);
        break;
      case 'error':
      case 'fatal':
        console.error(formatted);
        if (entry.error && this.config.showStackTrace) {
          console.error(this.formatError(entry.error));
        }
        break;
    }
  }

  private formatEntry(entry: LogEntry): string {
    if (this.config.format === 'json') {
      return JSON.stringify({
        level: entry.level,
        message: entry.message,
        timestamp: entry.timestamp.toISOString(),
        module: entry.module,
        context: entry.context,
        source: entry.source,
        traceId: entry.traceId,
        duration: entry.duration,
        error: entry.error ? {
          name: entry.error.name,
          message: entry.error.message,
          stack: entry.error.stack,
        } : undefined,
      });
    }

    if (this.config.format === 'compact') {
      const parts: string[] = [];
      parts.push(`[${entry.level.toUpperCase().padEnd(5)}]`);
      if (entry.module) {
        parts.push(`[${entry.module}]`);
      }
      parts.push(entry.message);
      if (entry.duration !== undefined) {
        parts.push(`(${entry.duration}ms)`);
      }
      return parts.join(' ');
    }

    // Pretty format
    const parts: string[] = [];

    // Icon
    if (this.config.colorize) {
      parts.push(`${LEVEL_ICONS[entry.level]} `);
    }

    // Timestamp
    if (this.config.includeTimestamp) {
      const time = entry.timestamp.toLocaleTimeString('en-US', {
        hour12: false,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        fractionalSecondDigits: 3,
      });
      parts.push(`${ANSI.dim}${time}${ANSI.reset} `);
    }

    // Level
    if (this.config.colorize) {
      parts.push(`${LEVEL_COLORS[entry.level]}[${entry.level.toUpperCase().padEnd(5)}]${ANSI.reset} `);
    } else {
      parts.push(`[${entry.level.toUpperCase().padEnd(5)}] `);
    }

    // Module
    if (this.config.includeModule && entry.module) {
      if (this.config.colorize) {
        parts.push(`${MODULE_COLORS[entry.module]}[${entry.module.padEnd(8)}]${ANSI.reset} `);
      } else {
        parts.push(`[${entry.module.padEnd(8)}] `);
      }
    }

    // Source
    if (this.config.includeSource && entry.source) {
      parts.push(`${ANSI.dim}[${entry.source}]${ANSI.reset} `);
    }

    // Message
    parts.push(entry.message);

    // Duration
    if (entry.duration !== undefined) {
      const durationColor = entry.duration > 1000 ? ANSI.red : entry.duration > 100 ? ANSI.yellow : ANSI.green;
      if (this.config.colorize) {
        parts.push(` ${durationColor}(${entry.duration}ms)${ANSI.reset}`);
      } else {
        parts.push(` (${entry.duration}ms)`);
      }
    }

    // TraceId
    if (entry.traceId) {
      parts.push(` ${ANSI.dim}[trace:${entry.traceId.slice(0, 8)}]${ANSI.reset}`);
    }

    let output = parts.join('');

    // Context
    if (entry.context && Object.keys(entry.context).length > 0) {
      output += '\n' + this.formatContext(entry.context);
    }

    return output;
  }

  private formatContext(context: LogContext): string {
    const lines: string[] = [];
    for (const [key, value] of Object.entries(context)) {
      const valueStr = typeof value === 'object' ? JSON.stringify(value) : String(value);
      lines.push(`  ${ANSI.dim}${key}:${ANSI.reset} ${valueStr}`);
    }
    return lines.join('\n');
  }

  private formatError(error: Error): string {
    const lines: string[] = [];
    lines.push(`${ANSI.red}Error Stack:${ANSI.reset}`);
    if (error.stack) {
      const stackLines = error.stack.split('\n').slice(0, 10);
      for (const line of stackLines) {
        lines.push(`  ${ANSI.dim}${line}${ANSI.reset}`);
      }
    }
    return lines.join('\n');
  }
}

// ============================================
// File Transport
// ============================================

class FileTransport implements LogTransport {
  name = 'file';
  private stream: fs.WriteStream | null = null;
  private currentSize = 0;

  constructor(
    private config: LoggerConfig,
    private filePath: string
  ) {
    this.ensureDirectory();
    this.openStream();
  }

  private ensureDirectory(): void {
    const dir = path.dirname(this.filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  private openStream(): void {
    this.stream = fs.createWriteStream(this.filePath, { flags: 'a' });
    this.currentSize = fs.existsSync(this.filePath) ? fs.statSync(this.filePath).size : 0;
  }

  log(entry: LogEntry): void {
    if (!this.stream) return;

    const line = JSON.stringify({
      level: entry.level,
      message: entry.message,
      timestamp: entry.timestamp.toISOString(),
      module: entry.module,
      context: entry.context,
      source: entry.source,
      traceId: entry.traceId,
      duration: entry.duration,
      error: entry.error ? {
        name: entry.error.name,
        message: entry.error.message,
        stack: entry.error.stack,
      } : undefined,
    }) + '\n';

    this.stream.write(line);
    this.currentSize += line.length;

    // Check for rotation
    if (this.config.maxFileSize && this.currentSize >= this.config.maxFileSize) {
      this.rotate();
    }
  }

  private rotate(): void {
    if (!this.stream) return;

    this.stream.end();
    this.currentSize = 0;

    // Rotate existing files
    if (this.config.maxFiles) {
      for (let i = this.config.maxFiles - 1; i >= 1; i--) {
        const oldFile = `${this.filePath}.${i}`;
        const newFile = `${this.filePath}.${i + 1}`;
        if (fs.existsSync(oldFile)) {
          if (i === this.config.maxFiles - 1) {
            fs.unlinkSync(oldFile);
          } else {
            fs.renameSync(oldFile, newFile);
          }
        }
      }
      fs.renameSync(this.filePath, `${this.filePath}.1`);
    }

    this.openStream();
  }

  async flush(): Promise<void> {
    return new Promise((resolve) => {
      if (this.stream) {
        this.stream.write('', () => resolve());
      } else {
        resolve();
      }
    });
  }

  async close(): Promise<void> {
    return new Promise((resolve) => {
      if (this.stream) {
        this.stream.end(() => resolve());
        this.stream = null;
      } else {
        resolve();
      }
    });
  }
}

// ============================================
// Memory Transport
// ============================================

export class MemoryTransport implements LogTransport {
  name = 'memory';
  private logs: LogEntry[] = [];
  private maxSize: number;

  constructor(maxSize: number = 1000) {
    this.maxSize = maxSize;
  }

  log(entry: LogEntry): void {
    this.logs.push(entry);
    if (this.logs.length > this.maxSize) {
      this.logs = this.logs.slice(-this.maxSize);
    }
  }

  getLogs(level?: LogLevel, module?: LogModule): LogEntry[] {
    let filtered = this.logs;
    if (level) {
      filtered = filtered.filter(log => log.level === level);
    }
    if (module) {
      filtered = filtered.filter(log => log.module === module);
    }
    return [...filtered];
  }

  clear(): void {
    this.logs = [];
  }

  getRecent(count: number = 10): LogEntry[] {
    return this.logs.slice(-count);
  }

  getErrors(): LogEntry[] {
    return this.logs.filter(log => log.level === 'error' || log.level === 'fatal');
  }

  getByModule(module: LogModule): LogEntry[] {
    return this.logs.filter(log => log.module === module);
  }
}

// ============================================
// Logger Class
// ============================================

export class Logger {
  private config: LoggerConfig;
  private transports: LogTransport[] = [];
  private module?: LogModule;
  private source?: string;
  private memoryTransport?: MemoryTransport;

  constructor(
    config: Partial<LoggerConfig> = {},
    source?: string,
    module?: LogModule
  ) {
    this.config = { ...DEFAULT_LOGGER_CONFIG, ...config };
    this.source = source;
    this.module = module;

    if (this.config.enableConsole) {
      this.transports.push(new ConsoleTransport(this.config));
    }

    if (this.config.enableFile && this.config.filePath) {
      this.transports.push(new FileTransport(this.config, this.config.filePath));
    }

    // Always add memory transport
    this.memoryTransport = new MemoryTransport();
    this.transports.push(this.memoryTransport);
  }

  /**
   * Create a child logger with module context
   */
  forModule(module: LogModule): Logger {
    const childLogger = new Logger(this.config, this.source, module);
    childLogger.transports = this.transports;
    childLogger.memoryTransport = this.memoryTransport;
    return childLogger;
  }

  /**
   * Create a child logger with additional context
   */
  child(context: LogContext): Logger {
    const childLogger = new Logger(this.config, this.source, this.module);
    childLogger.transports = this.transports;
    childLogger.memoryTransport = this.memoryTransport;

    const originalLog = childLogger.log.bind(childLogger);
    childLogger.log = (level: LogLevel, message: string, additionalContext?: LogContext, error?: Error) => {
      originalLog(level, message, { ...context, ...additionalContext }, error);
    };

    return childLogger;
  }

  /**
   * Set source for all log entries
   */
  setSource(source: string): void {
    this.source = source;
  }

  /**
   * Set module for all log entries
   */
  setModule(module: LogModule): void {
    this.module = module;
  }

  /**
   * Add a custom transport
   */
  addTransport(transport: LogTransport): void {
    this.transports.push(transport);
  }

  /**
   * Log a message
   */
  log(level: LogLevel, message: string, context?: LogContext, error?: Error): void {
    if (!isLevelEnabled(this.config.level, level)) {
      return;
    }

    const entry: LogEntry = {
      level,
      message,
      timestamp: new Date(),
      module: this.module,
      context,
      error,
      source: this.source,
    };

    for (const transport of this.transports) {
      try {
        transport.log(entry);
      } catch (err) {
        console.error('[Logger] Transport failed:', err);
      }
    }
  }

  /**
   * Log debug message
   */
  debug(message: string, context?: LogContext): void {
    this.log('debug', message, context);
  }

  /**
   * Log info message
   */
  info(message: string, context?: LogContext): void {
    this.log('info', message, context);
  }

  /**
   * Log warning message
   */
  warn(message: string, context?: LogContext, error?: Error): void {
    this.log('warn', message, context, error);
  }

  /**
   * Log error message
   */
  error(message: string, context?: LogContext, error?: Error): void {
    this.log('error', message, context, error);
  }

  /**
   * Log fatal message
   */
  fatal(message: string, context?: LogContext, error?: Error): void {
    this.log('fatal', message, context, error);
  }

  /**
   * Get recent logs from memory transport
   */
  getRecentLogs(count?: number): LogEntry[] {
    return this.memoryTransport?.getRecent(count) || [];
  }

  /**
   * Get all logs from memory transport
   */
  getAllLogs(): LogEntry[] {
    return this.memoryTransport?.getLogs() || [];
  }

  /**
   * Get error logs
   */
  getErrorLogs(): LogEntry[] {
    return this.memoryTransport?.getErrors() || [];
  }

  /**
   * Clear memory logs
   */
  clearLogs(): void {
    this.memoryTransport?.clear();
  }

  /**
   * Flush all transports
   */
  async flush(): Promise<void> {
    for (const transport of this.transports) {
      if (transport.flush) {
        await transport.flush();
      }
    }
  }

  /**
   * Close all transports
   */
  async close(): Promise<void> {
    for (const transport of this.transports) {
      if (transport.close) {
        await transport.close();
      }
    }
  }

  /**
   * Time an operation and log its duration
   */
  async time<T>(
    operationName: string,
    operation: () => Promise<T>,
    level: LogLevel = 'info'
  ): Promise<T> {
    if (!this.config.enablePerformance) {
      return operation();
    }

    const start = Date.now();
    this.debug(`[START] ${operationName}`);

    try {
      const result = await operation();
      const duration = Date.now() - start;

      const entry: LogEntry = {
        level,
        message: `[END] ${operationName}`,
        timestamp: new Date(),
        module: this.module,
        source: this.source,
        duration,
      };

      for (const transport of this.transports) {
        transport.log(entry);
      }

      return result;
    } catch (error) {
      const duration = Date.now() - start;
      this.log('error', `[FAILED] ${operationName}`, { duration: `${duration}ms` }, error as Error);
      throw error;
    }
  }

  /**
   * Create a performance tracker
   */
  trackPerformance(label: string): { end: () => number } {
    const start = Date.now();
    return {
      end: () => {
        const duration = Date.now() - start;
        this.debug(`[PERF] ${label}: ${duration}ms`, { duration });
        return duration;
      },
    };
  }

  /**
   * Create a group of related log messages
   */
  group<T>(groupName: string, operation: (logger: Logger) => T): T {
    this.info(`[GROUP START] ${groupName}`);
    try {
      const result = operation(this);
      this.info(`[GROUP END] ${groupName}`);
      return result;
    } catch (error) {
      this.error(`[GROUP FAILED] ${groupName}`, undefined, error as Error);
      throw error;
    }
  }

  /**
   * Log with trace ID for request tracking
   */
  withTrace(traceId: string): { log: (level: LogLevel, message: string, context?: LogContext, error?: Error) => void } {
    return {
      log: (level: LogLevel, message: string, context?: LogContext, error?: Error) => {
        const entry: LogEntry = {
          level,
          message,
          timestamp: new Date(),
          module: this.module,
          context,
          error,
          source: this.source,
          traceId,
        };

        for (const transport of this.transports) {
          transport.log(entry);
        }
      },
    };
  }
}

// ============================================
// Global Logger Instance
// ============================================

let globalLogger: Logger | null = null;

export function getGlobalLogger(): Logger {
  if (!globalLogger) {
    globalLogger = new Logger();
  }
  return globalLogger;
}

export function setGlobalLogger(logger: Logger): void {
  globalLogger = logger;
}

export function initLogger(config: Partial<LoggerConfig>): Logger {
  globalLogger = new Logger(config);
  return globalLogger;
}

// ============================================
// Module Loggers
// ============================================

const moduleLoggers = new Map<LogModule, Logger>();

export function getLogger(module: LogModule): Logger {
  if (moduleLoggers.has(module)) {
    return moduleLoggers.get(module)!;
  }

  const logger = getGlobalLogger().forModule(module);
  moduleLoggers.set(module, logger);
  return logger;
}

// ============================================
// Convenience Functions
// ============================================

export const log = {
  debug: (message: string, context?: LogContext) => getGlobalLogger().debug(message, context),
  info: (message: string, context?: LogContext) => getGlobalLogger().info(message, context),
  warn: (message: string, context?: LogContext, error?: Error) => getGlobalLogger().warn(message, context, error),
  error: (message: string, context?: LogContext, error?: Error) => getGlobalLogger().error(message, context, error),
  fatal: (message: string, context?: LogContext, error?: Error) => getGlobalLogger().fatal(message, context, error),
};

// ============================================
// Decorator for logging method calls
// ============================================

export function LogOperation(level: LogLevel = 'debug') {
  return function (
    target: unknown,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: unknown[]) {
      const logger = getGlobalLogger();
      const className = (target as { constructor?: { name?: string } })?.constructor?.name || 'Unknown';
      const fullMethodName = `${className}.${propertyKey}`;

      logger.log(level, `[CALL] ${fullMethodName}`, { argsCount: args.length });

      try {
        const result = await originalMethod.apply(this, args);
        logger.log(level, `[RETURN] ${fullMethodName}`, { success: true });
        return result;
      } catch (error) {
        logger.log('error', `[ERROR] ${fullMethodName}`, undefined, error as Error);
        throw error;
      }
    };

    return descriptor;
  };
}

// ============================================
// Factory Function
// ============================================

export function createLogger(config?: Partial<LoggerConfig> & { name?: string; module?: LogModule }): Logger {
  return new Logger(config, config?.name, config?.module);
}

export default Logger;
