/**
 * Unified Logging System
 *
 * Provides structured logging with multiple levels, transports, and context support.
 * Compatible with both browser and Node.js environments.
 */

// ============================================
// Types
// ============================================

export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'fatal';

export interface LogContext {
  [key: string]: unknown;
}

export interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: Date;
  context?: LogContext;
  error?: Error;
  source?: string;
}

export interface LoggerConfig {
  level: LogLevel;
  enableConsole: boolean;
  enableFile: boolean;
  filePath?: string;
  format: 'json' | 'pretty';
  includeTimestamp: boolean;
  includeSource: boolean;
  colorize: boolean;
  maxFileSize?: number; // bytes
  maxFiles?: number;
}

export interface LogTransport {
  log(entry: LogEntry): void | Promise<void>;
  flush?(): Promise<void>;
}

/**
 * 简化版 Logger 接口 - 用于外部组件
 * 只包含基本的日志方法
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
  colorize: true,
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
// Console Transport
// ============================================

class ConsoleTransport implements LogTransport {
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
        if (entry.error) {
          console.error(entry.error);
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
        context: entry.context,
        source: entry.source,
        error: entry.error?.message,
      });
    }

    // Pretty format
    const parts: string[] = [];

    if (this.config.includeTimestamp) {
      parts.push(`[${entry.timestamp.toISOString()}]`);
    }

    parts.push(`[${entry.level.toUpperCase()}]`);

    if (this.config.includeSource && entry.source) {
      parts.push(`[${entry.source}]`);
    }

    parts.push(entry.message);

    if (entry.context && Object.keys(entry.context).length > 0) {
      parts.push('\n' + JSON.stringify(entry.context, null, 2));
    }

    let output = parts.join(' ');

    // Colorize output in Node.js
    if (this.config.colorize && typeof process !== 'undefined') {
      const colors: Record<LogLevel, string> = {
        debug: '\x1b[36m', // cyan
        info: '\x1b[32m',  // green
        warn: '\x1b[33m',  // yellow
        error: '\x1b[31m', // red
        fatal: '\x1b[35m', // magenta
      };
      const reset = '\x1b[0m';
      output = `${colors[entry.level]}${output}${reset}`;
    }

    return output;
  }
}

// ============================================
// Memory Transport (for in-memory log storage)
// ============================================

export class MemoryTransport implements LogTransport {
  private logs: LogEntry[] = [];
  private maxSize: number;

  constructor(maxSize: number = 1000) {
    this.maxSize = maxSize;
  }

  log(entry: LogEntry): void {
    this.logs.push(entry);
    
    // Keep only recent logs
    if (this.logs.length > this.maxSize) {
      this.logs = this.logs.slice(-this.maxSize);
    }
  }

  getLogs(level?: LogLevel): LogEntry[] {
    if (level) {
      return this.logs.filter(log => log.level === level);
    }
    return [...this.logs];
  }

  clear(): void {
    this.logs = [];
  }

  getRecent(count: number = 10): LogEntry[] {
    return this.logs.slice(-count);
  }
}

// ============================================
// Logger Class
// ============================================

export class Logger {
  private config: LoggerConfig;
  private transports: LogTransport[] = [];
  private source?: string;
  private memoryTransport?: MemoryTransport;

  constructor(config: Partial<LoggerConfig> = {}, source?: string) {
    this.config = { ...DEFAULT_LOGGER_CONFIG, ...config };
    this.source = source;

    if (this.config.enableConsole) {
      this.transports.push(new ConsoleTransport(this.config));
    }

    // Always add memory transport for log retrieval
    this.memoryTransport = new MemoryTransport();
    this.transports.push(this.memoryTransport);
  }

  /**
   * Create a child logger with additional context
   */
  child(context: LogContext): Logger {
    const childLogger = new Logger(this.config, this.source);
    childLogger.transports = this.transports;
    childLogger.memoryTransport = this.memoryTransport;
    
    // Wrap log method to include context
    const originalLog = childLogger.log.bind(childLogger);
    childLogger.log = (level: LogLevel, message: string, additionalContext?: LogContext) => {
      originalLog(level, message, { ...context, ...additionalContext });
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
   * Time an operation and log its duration
   */
  async time<T>(
    operationName: string,
    operation: () => Promise<T>,
    level: LogLevel = 'info'
  ): Promise<T> {
    const start = Date.now();
    try {
      const result = await operation();
      const duration = Date.now() - start;
      this.log(level, `${operationName} completed`, { duration: `${duration}ms` });
      return result;
    } catch (error) {
      const duration = Date.now() - start;
      this.log('error', `${operationName} failed`, { duration: `${duration}ms` }, error as Error);
      throw error;
    }
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

export function LogOperation(level: LogLevel = 'info') {
  return function (
    target: unknown,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: unknown[]) {
      const logger = getGlobalLogger();
      const className = target?.constructor?.name || 'Unknown';
      const fullMethodName = `${className}.${propertyKey}`;

      logger.log(level, `[CALL] ${fullMethodName}`, { args });

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

export function createLogger(config?: Partial<LoggerConfig> & { name?: string }): Logger {
  return new Logger(config, config?.name);
}

export default Logger;
