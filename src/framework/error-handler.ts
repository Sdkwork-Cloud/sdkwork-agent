/**
 * Unified Error Handling System - 统一错误处理系统
 *
 * 提供全面的错误处理能力
 * - 错误分类和编码
 * - 错误恢复策略
 * - 错误链追踪
 * - 错误报告
 *
 * @module Framework/ErrorHandler
 * @version 1.0.0
 */

import { createLogger, type ILogger } from '../utils/logger.js';

export type ErrorCode = string;

export interface ErrorInfo {
  code: ErrorCode;
  message: string;
  category: ErrorCategory;
  severity: ErrorSeverity;
  recoverable: boolean;
  retryable: boolean;
  metadata?: Record<string, unknown>;
  cause?: Error;
  stack?: string;
  timestamp: number;
}

export enum ErrorCategory {
  SYSTEM = 'SYSTEM',
  NETWORK = 'NETWORK',
  VALIDATION = 'VALIDATION',
  BUSINESS = 'BUSINESS',
  PERMISSION = 'PERMISSION',
  RESOURCE = 'RESOURCE',
  TIMEOUT = 'TIMEOUT',
  UNKNOWN = 'UNKNOWN',
}

export enum ErrorSeverity {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

export interface RecoveryStrategy {
  name: string;
  canRecover: (error: FrameworkError) => boolean;
  recover: (error: FrameworkError) => Promise<boolean>;
  maxAttempts?: number;
  backoffMs?: number;
}

export interface ErrorHandlerConfig {
  name?: string;
  enableReporting?: boolean;
  enableRecovery?: boolean;
  maxRecoveryAttempts?: number;
  defaultRetryDelay?: number;
  logger?: ILogger;
  onUnhandledError?: (error: FrameworkError) => void;
}

export class FrameworkError extends Error {
  readonly code: ErrorCode;
  readonly category: ErrorCategory;
  readonly severity: ErrorSeverity;
  readonly recoverable: boolean;
  readonly retryable: boolean;
  readonly metadata: Record<string, unknown>;
  readonly timestamp: number;
  readonly cause?: Error;

  constructor(info: Omit<ErrorInfo, 'timestamp'>) {
    super(info.message);

    this.name = 'FrameworkError';
    this.code = info.code;
    this.category = info.category;
    this.severity = info.severity;
    this.recoverable = info.recoverable;
    this.retryable = info.retryable;
    this.metadata = info.metadata ?? {};
    this.timestamp = Date.now();
    this.cause = info.cause;

    if (info.stack) {
      this.stack = info.stack;
    } else if (Error.captureStackTrace) {
      Error.captureStackTrace(this, FrameworkError);
    }
  }

  toJSON(): ErrorInfo {
    return {
      code: this.code,
      message: this.message,
      category: this.category,
      severity: this.severity,
      recoverable: this.recoverable,
      retryable: this.retryable,
      metadata: this.metadata,
      cause: this.cause,
      stack: this.stack,
      timestamp: this.timestamp,
    };
  }

  static fromError(error: Error, defaults?: Partial<ErrorInfo>): FrameworkError {
    if (error instanceof FrameworkError) {
      return error;
    }

    return new FrameworkError({
      code: defaults?.code ?? 'UNKNOWN_ERROR',
      message: error.message,
      category: defaults?.category ?? ErrorCategory.UNKNOWN,
      severity: defaults?.severity ?? ErrorSeverity.MEDIUM,
      recoverable: defaults?.recoverable ?? false,
      retryable: defaults?.retryable ?? false,
      metadata: defaults?.metadata,
      cause: error,
    });
  }

  static isFrameworkError(error: unknown): error is FrameworkError {
    return error instanceof FrameworkError;
  }
}

export class NetworkError extends FrameworkError {
  constructor(message: string, options?: { code?: ErrorCode; cause?: Error; retryable?: boolean }) {
    super({
      code: options?.code ?? 'NETWORK_ERROR',
      message,
      category: ErrorCategory.NETWORK,
      severity: ErrorSeverity.MEDIUM,
      recoverable: true,
      retryable: options?.retryable ?? true,
      cause: options?.cause,
    });
    this.name = 'NetworkError';
  }
}

export class ValidationError extends FrameworkError {
  constructor(message: string, options?: { code?: ErrorCode; metadata?: Record<string, unknown> }) {
    super({
      code: options?.code ?? 'VALIDATION_ERROR',
      message,
      category: ErrorCategory.VALIDATION,
      severity: ErrorSeverity.LOW,
      recoverable: false,
      retryable: false,
      metadata: options?.metadata,
    });
    this.name = 'ValidationError';
  }
}

export class TimeoutError extends FrameworkError {
  constructor(message: string, options?: { code?: ErrorCode; timeout?: number }) {
    super({
      code: options?.code ?? 'TIMEOUT_ERROR',
      message,
      category: ErrorCategory.TIMEOUT,
      severity: ErrorSeverity.MEDIUM,
      recoverable: true,
      retryable: true,
      metadata: { timeout: options?.timeout },
    });
    this.name = 'TimeoutError';
  }
}

export class ResourceError extends FrameworkError {
  constructor(message: string, options?: { code?: ErrorCode; resource?: string }) {
    super({
      code: options?.code ?? 'RESOURCE_ERROR',
      message,
      category: ErrorCategory.RESOURCE,
      severity: ErrorSeverity.HIGH,
      recoverable: false,
      retryable: false,
      metadata: { resource: options?.resource },
    });
    this.name = 'ResourceError';
  }
}

export class PermissionError extends FrameworkError {
  constructor(message: string, options?: { code?: ErrorCode; permission?: string }) {
    super({
      code: options?.code ?? 'PERMISSION_ERROR',
      message,
      category: ErrorCategory.PERMISSION,
      severity: ErrorSeverity.HIGH,
      recoverable: false,
      retryable: false,
      metadata: { permission: options?.permission },
    });
    this.name = 'PermissionError';
  }
}

export class BusinessError extends FrameworkError {
  constructor(message: string, options?: { code?: ErrorCode; metadata?: Record<string, unknown> }) {
    super({
      code: options?.code ?? 'BUSINESS_ERROR',
      message,
      category: ErrorCategory.BUSINESS,
      severity: ErrorSeverity.MEDIUM,
      recoverable: false,
      retryable: false,
      metadata: options?.metadata,
    });
    this.name = 'BusinessError';
  }
}

export class ErrorHandler {
  private config: Required<ErrorHandlerConfig>;
  private logger: ILogger;
  private strategies: Map<string, RecoveryStrategy> = new Map();
  private errorHistory: FrameworkError[] = [];
  private maxHistorySize = 100;

  constructor(config: ErrorHandlerConfig = {}) {
    this.config = {
      name: config.name ?? 'ErrorHandler',
      enableReporting: config.enableReporting ?? true,
      enableRecovery: config.enableRecovery ?? true,
      maxRecoveryAttempts: config.maxRecoveryAttempts ?? 3,
      defaultRetryDelay: config.defaultRetryDelay ?? 1000,
      logger: config.logger ?? createLogger({ name: config.name ?? 'ErrorHandler' }),
      onUnhandledError: config.onUnhandledError ?? ((error) => {
        this.logger.error('Unhandled error', { error: error.toJSON() });
      }),
    };
    this.logger = this.config.logger;

    this.setupGlobalHandlers();
  }

  private setupGlobalHandlers(): void {
    process.on('uncaughtException', (error) => {
      const frameworkError = FrameworkError.fromError(error, {
        severity: ErrorSeverity.CRITICAL,
      });
      this.config.onUnhandledError(frameworkError);
    });

    process.on('unhandledRejection', (reason) => {
      const error = reason instanceof Error
        ? FrameworkError.fromError(reason)
        : new FrameworkError({
            code: 'UNHANDLED_REJECTION',
            message: String(reason),
            category: ErrorCategory.UNKNOWN,
            severity: ErrorSeverity.HIGH,
            recoverable: false,
            retryable: false,
          });
      this.config.onUnhandledError(error);
    });
  }

  registerStrategy(strategy: RecoveryStrategy): void {
    this.strategies.set(strategy.name, strategy);
    this.logger.debug(`Recovery strategy registered: ${strategy.name}`);
  }

  unregisterStrategy(name: string): boolean {
    return this.strategies.delete(name);
  }

  async handle<T>(
    fn: () => Promise<T>,
    options?: {
      fallback?: T | (() => T | Promise<T>);
      retries?: number;
      retryDelay?: number;
      strategy?: string;
    }
  ): Promise<T> {
    const maxAttempts = (options?.retries ?? 0) + 1;
    const retryDelay = options?.retryDelay ?? this.config.defaultRetryDelay;
    let lastError: FrameworkError | undefined;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = FrameworkError.fromError(error as Error);
        this.recordError(lastError);

        if (!lastError.retryable || attempt >= maxAttempts) {
          break;
        }

        if (this.config.enableRecovery) {
          const recovered = await this.tryRecover(lastError, options?.strategy);
          if (recovered) {
            continue;
          }
        }

        await this.delay(retryDelay * attempt);
      }
    }

    if (options?.fallback !== undefined) {
      if (typeof options.fallback === 'function') {
        return (options.fallback as () => T | Promise<T>)();
      }
      return options.fallback;
    }

    throw lastError;
  }

  wrap<T extends (...args: unknown[]) => Promise<unknown>>(
    fn: T,
    options?: {
      fallback?: unknown;
      retries?: number;
      retryDelay?: number;
    }
  ): T {
    return (async (...args: Parameters<T>) => {
      return this.handle(() => fn(...args), options);
    }) as T;
  }

  private async tryRecover(error: FrameworkError, strategyName?: string): Promise<boolean> {
    const strategies = strategyName
      ? [this.strategies.get(strategyName)].filter(Boolean)
      : Array.from(this.strategies.values());

    for (const strategy of strategies) {
      if (!strategy) continue;

      if (strategy.canRecover(error)) {
        try {
          const recovered = await strategy.recover(error);
          if (recovered) {
            this.logger.info(`Error recovered using strategy: ${strategy.name}`, {
              errorCode: error.code,
            });
            return true;
          }
        } catch (recoveryError) {
          this.logger.error(`Recovery strategy failed: ${strategy.name}`, {
            error: recoveryError,
            originalError: error.code,
          });
        }
      }
    }

    return false;
  }

  private recordError(error: FrameworkError): void {
    this.errorHistory.push(error);
    if (this.errorHistory.length > this.maxHistorySize) {
      this.errorHistory.shift();
    }

    if (this.config.enableReporting) {
      this.reportError(error);
    }
  }

  private reportError(error: FrameworkError): void {
    const logData = {
      code: error.code,
      category: error.category,
      severity: error.severity,
      message: error.message,
      metadata: error.metadata,
    };

    switch (error.severity) {
      case ErrorSeverity.CRITICAL:
        this.logger.error('Critical error occurred', logData);
        break;
      case ErrorSeverity.HIGH:
        this.logger.error('High severity error occurred', logData);
        break;
      case ErrorSeverity.MEDIUM:
        this.logger.warn('Medium severity error occurred', logData);
        break;
      case ErrorSeverity.LOW:
        this.logger.info('Low severity error occurred', logData);
        break;
    }
  }

  getErrorHistory(): FrameworkError[] {
    return [...this.errorHistory];
  }

  getErrorStats(): Record<ErrorCategory, number> {
    const stats: Record<ErrorCategory, number> = {
      [ErrorCategory.SYSTEM]: 0,
      [ErrorCategory.NETWORK]: 0,
      [ErrorCategory.VALIDATION]: 0,
      [ErrorCategory.BUSINESS]: 0,
      [ErrorCategory.PERMISSION]: 0,
      [ErrorCategory.RESOURCE]: 0,
      [ErrorCategory.TIMEOUT]: 0,
      [ErrorCategory.UNKNOWN]: 0,
    };

    for (const error of this.errorHistory) {
      stats[error.category]++;
    }

    return stats;
  }

  clearHistory(): void {
    this.errorHistory = [];
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export function createErrorHandler(config?: ErrorHandlerConfig): ErrorHandler {
  return new ErrorHandler(config);
}

export const defaultErrorHandler = new ErrorHandler();

export function withErrorHandling<T>(
  fn: () => Promise<T>,
  fallback?: T
): Promise<T> {
  return defaultErrorHandler.handle(fn, { fallback });
}
