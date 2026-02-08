/**
 * Error Boundary - 全局错误边界处理
 * 
 * 提供统一的错误捕获、处理和恢复机制
 * 支持异步操作错误边界
 * 
 * @utils ErrorBoundary
 * @version 1.0.0
 * @standard Industry Leading
 */

import { createLogger } from './logger';
import type { ILogger } from './logger';

// ============================================================================
// Types
// ============================================================================

export type ErrorSeverity = 'low' | 'medium' | 'high' | 'critical';

export interface ErrorContext {
  source: string;
  operation: string;
  input?: unknown;
  metadata?: Record<string, unknown>;
}

export interface ErrorHandler {
  (error: Error, context: ErrorContext): void | Promise<void>;
}

export interface ErrorRecoveryStrategy {
  (error: Error, context: ErrorContext): Promise<boolean>;
}

export interface ErrorBoundaryConfig {
  logger?: ILogger;
  onError?: ErrorHandler;
  onCritical?: ErrorHandler;
  recoveryStrategies?: Map<string, ErrorRecoveryStrategy>;
  maxRetries?: number;
  retryDelay?: number;
}

export interface BoundaryResult<T> {
  success: boolean;
  data?: T;
  error?: Error;
  recovered?: boolean;
  retryCount: number;
}

// ============================================================================
// Error Boundary Implementation
// ============================================================================

export class ErrorBoundary {
  private logger: ILogger;
  private onError?: ErrorHandler;
  private onCritical?: ErrorHandler;
  private recoveryStrategies: Map<string, ErrorRecoveryStrategy>;
  private maxRetries: number;
  private retryDelay: number;

  constructor(config: ErrorBoundaryConfig = {}) {
    this.logger = config.logger || createLogger({ name: 'ErrorBoundary' });
    this.onError = config.onError;
    this.onCritical = config.onCritical;
    this.recoveryStrategies = config.recoveryStrategies || new Map();
    this.maxRetries = config.maxRetries || 3;
    this.retryDelay = config.retryDelay || 1000;
  }

  /**
   * 执行带错误边界的操作
   * 
   * @example
   * const result = await errorBoundary.execute(
   *   () => fetchData(),
   *   { source: 'DataService', operation: 'fetch' }
   * );
   * if (result.success) {
   *   console.log(result.data);
   * }
   */
  async execute<T>(
    operation: () => Promise<T>,
    context: ErrorContext
  ): Promise<BoundaryResult<T>> {
    let retryCount = 0;
    let lastError: Error | undefined;

    while (retryCount <= this.maxRetries) {
      try {
        const data = await operation();
        return {
          success: true,
          data,
          retryCount,
        };
      } catch (error) {
        lastError = error as Error;
        const severity = this.classifyError(lastError);

        // 记录错误
        this.logError(lastError, context, severity, retryCount);

        // 尝试恢复
        const recovered = await this.tryRecover(lastError, context);
        if (recovered) {
          return {
            success: true,
            recovered: true,
            retryCount,
          };
        }

        // 调用错误处理器
        if (this.onError) {
          await this.onError(lastError, context);
        }

        // 严重错误直接抛出
        if (severity === 'critical') {
          if (this.onCritical) {
            await this.onCritical(lastError, context);
          }
          break;
        }

        // 重试
        if (retryCount < this.maxRetries) {
          retryCount++;
          await this.delay(this.retryDelay * retryCount);
          this.logger.info(`Retrying operation: ${context.operation}`, {
            retryCount,
            source: context.source,
          });
        } else {
          break;
        }
      }
    }

    return {
      success: false,
      error: lastError,
      retryCount,
    };
  }

  /**
   * 执行带错误边界的同步操作
   */
  executeSync<T>(
    operation: () => T,
    context: ErrorContext
  ): BoundaryResult<T> {
    try {
      const data = operation();
      return {
        success: true,
        data,
        retryCount: 0,
      };
    } catch (error) {
      const err = error as Error;
      const severity = this.classifyError(err);
      this.logError(err, context, severity, 0);

      if (this.onError) {
        this.onError(err, context);
      }

      if (severity === 'critical' && this.onCritical) {
        this.onCritical(err, context);
      }

      return {
        success: false,
        error: err,
        retryCount: 0,
      };
    }
  }

  /**
   * 包装函数，添加错误边界
   */
  wrap<TArgs extends unknown[], TReturn>(
    fn: (...args: TArgs) => Promise<TReturn>,
    context: Omit<ErrorContext, 'input'>
  ): (...args: TArgs) => Promise<BoundaryResult<TReturn>> {
    return async (...args: TArgs) => {
      return this.execute(() => fn(...args), {
        ...context,
        input: args,
      });
    };
  }

  /**
   * 注册恢复策略
   */
  registerRecoveryStrategy(
    errorType: string,
    strategy: ErrorRecoveryStrategy
  ): void {
    this.recoveryStrategies.set(errorType, strategy);
  }

  /**
   * 分类错误严重程度
   */
  private classifyError(error: Error): ErrorSeverity {
    const message = error.message.toLowerCase();

    // 严重错误
    if (
      message.includes('fatal') ||
      message.includes('crash') ||
      message.includes('out of memory') ||
      message.includes('stack overflow')
    ) {
      return 'critical';
    }

    // 高级错误
    if (
      message.includes('timeout') ||
      message.includes('network') ||
      message.includes('connection') ||
      message.includes('unauthorized') ||
      message.includes('forbidden')
    ) {
      return 'high';
    }

    // 中级错误
    if (
      message.includes('not found') ||
      message.includes('invalid') ||
      message.includes('validation')
    ) {
      return 'medium';
    }

    return 'low';
  }

  /**
   * 尝试恢复
   */
  private async tryRecover(
    error: Error,
    context: ErrorContext
  ): Promise<boolean> {
    const errorType = error.constructor.name;
    const strategy = this.recoveryStrategies.get(errorType);

    if (strategy) {
      try {
        return await strategy(error, context);
      } catch (recoveryError) {
        this.logger.error('Recovery strategy failed', {
          error: recoveryError,
          originalError: error.message,
        });
      }
    }

    return false;
  }

  /**
   * 记录错误
   */
  private logError(
    error: Error,
    context: ErrorContext,
    severity: ErrorSeverity,
    retryCount: number
  ): void {
    const logData = {
      error: error.message,
      stack: error.stack,
      source: context.source,
      operation: context.operation,
      severity,
      retryCount,
      metadata: context.metadata,
    };

    switch (severity) {
      case 'critical':
        this.logger.error('Critical error occurred', logData);
        break;
      case 'high':
        this.logger.error('High severity error', logData);
        break;
      case 'medium':
        this.logger.warn('Medium severity error', logData);
        break;
      default:
        this.logger.info('Low severity error', logData);
    }
  }

  /**
   * 延迟
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

// ============================================================================
// Global Error Boundary Instance
// ============================================================================

let globalErrorBoundary: ErrorBoundary | null = null;

export function getGlobalErrorBoundary(): ErrorBoundary {
  if (!globalErrorBoundary) {
    globalErrorBoundary = new ErrorBoundary();
  }
  return globalErrorBoundary;
}

export function setGlobalErrorBoundary(boundary: ErrorBoundary): void {
  globalErrorBoundary = boundary;
}

// ============================================================================
// Decorator for Method Error Boundary
// ============================================================================

export function withErrorBoundary(context: Omit<ErrorContext, 'input'>) {
  return function (
    _target: unknown,
    _propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;
    const boundary = getGlobalErrorBoundary();

    descriptor.value = async function (...args: unknown[]) {
      const result = await boundary.execute(
        () => originalMethod.apply(this, args),
        {
          ...context,
          input: args,
        }
      );

      if (!result.success) {
        throw result.error;
      }

      return result.data;
    };

    return descriptor;
  };
}

// ============================================================================
// Helper Functions
// ============================================================================

export function createErrorBoundary(config?: ErrorBoundaryConfig): ErrorBoundary {
  return new ErrorBoundary(config);
}

export function isBoundaryResult<T>(
  value: unknown
): value is BoundaryResult<T> {
  return (
    typeof value === 'object' &&
    value !== null &&
    'success' in value &&
    typeof (value as BoundaryResult<T>).success === 'boolean' &&
    'retryCount' in value &&
    typeof (value as BoundaryResult<T>).retryCount === 'number'
  );
}
