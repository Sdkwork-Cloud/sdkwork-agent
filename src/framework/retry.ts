/**
 * Retry Strategy System - 统一重试策略系统
 *
 * 提供灵活的重试机制
 * - 多种退避策略
 * - 可配置的重试条件
 * - 重试上下文和状态
 * - 重试事件和钩子
 *
 * @module Framework/Retry
 * @version 1.0.0
 */

import { createLogger, type ILogger } from '../utils/logger.js';

export interface RetryContext {
  attempt: number;
  maxAttempts: number;
  error: Error;
  startTime: number;
  elapsedTime: number;
  nextDelay?: number;
  metadata: Record<string, unknown>;
}

export interface RetryResult<T> {
  success: boolean;
  result?: T;
  error?: Error;
  attempts: number;
  totalTime: number;
  delays: number[];
}

export interface RetryOptions {
  maxAttempts?: number;
  initialDelay?: number;
  maxDelay?: number;
  factor?: number;
  jitter?: boolean;
  jitterFactor?: number;
  timeout?: number;
  retryOn?: (error: Error, attempt: number) => boolean;
  onRetry?: (context: RetryContext) => void | Promise<void>;
  onFailedAttempt?: (context: RetryContext) => void | Promise<void>;
  onMaxAttemptsReached?: (context: RetryContext) => void | Promise<void>;
  logger?: ILogger;
}

export type BackoffStrategy = 'fixed' | 'linear' | 'exponential' | 'fibonacci' | 'custom';

export interface BackoffConfig {
  strategy: BackoffStrategy;
  initialDelay: number;
  maxDelay: number;
  factor: number;
  jitter: boolean;
  jitterFactor: number;
  customCalculation?: (attempt: number, config: BackoffConfig) => number;
}

export class BackoffCalculator {
  private config: BackoffConfig;
  private fibonacciCache: number[] = [0, 1];

  constructor(config: Partial<BackoffConfig> = {}) {
    this.config = {
      strategy: config.strategy ?? 'exponential',
      initialDelay: config.initialDelay ?? 1000,
      maxDelay: config.maxDelay ?? 30000,
      factor: config.factor ?? 2,
      jitter: config.jitter ?? true,
      jitterFactor: config.jitterFactor ?? 0.5,
      customCalculation: config.customCalculation,
    };
  }

  calculate(attempt: number): number {
    let delay: number;

    switch (this.config.strategy) {
      case 'fixed':
        delay = this.fixed(attempt);
        break;
      case 'linear':
        delay = this.linear(attempt);
        break;
      case 'exponential':
        delay = this.exponential(attempt);
        break;
      case 'fibonacci':
        delay = this.fibonacci(attempt);
        break;
      case 'custom':
        delay = this.config.customCalculation?.(attempt, this.config) ?? this.exponential(attempt);
        break;
      default:
        delay = this.exponential(attempt);
    }

    delay = Math.min(delay, this.config.maxDelay);

    if (this.config.jitter) {
      delay = this.addJitter(delay);
    }

    return Math.max(0, delay);
  }

  private fixed(_attempt: number): number {
    return this.config.initialDelay;
  }

  private linear(attempt: number): number {
    return this.config.initialDelay * attempt;
  }

  private exponential(attempt: number): number {
    return this.config.initialDelay * Math.pow(this.config.factor, attempt - 1);
  }

  private fibonacci(attempt: number): number {
    const index = attempt + 1;
    while (this.fibonacciCache.length <= index) {
      const len = this.fibonacciCache.length;
      this.fibonacciCache.push(this.fibonacciCache[len - 1] + this.fibonacciCache[len - 2]);
    }
    return this.config.initialDelay * this.fibonacciCache[index];
  }

  private addJitter(delay: number): number {
    const jitterRange = delay * this.config.jitterFactor;
    return delay + (Math.random() * jitterRange * 2 - jitterRange);
  }

  getConfig(): BackoffConfig {
    return { ...this.config };
  }
}

export class RetryStrategy {
  private options: Required<Omit<RetryOptions, 'retryOn' | 'onRetry' | 'onFailedAttempt' | 'onMaxAttemptsReached' | 'logger'>> & {
    retryOn?: (error: Error, attempt: number) => boolean;
    onRetry?: (context: RetryContext) => void | Promise<void>;
    onFailedAttempt?: (context: RetryContext) => void | Promise<void>;
    onMaxAttemptsReached?: (context: RetryContext) => void | Promise<void>;
    logger?: ILogger;
  };
  private backoff: BackoffCalculator;
  private logger: ILogger;

  constructor(options: RetryOptions = {}) {
    this.options = {
      maxAttempts: options.maxAttempts ?? 3,
      initialDelay: options.initialDelay ?? 1000,
      maxDelay: options.maxDelay ?? 30000,
      factor: options.factor ?? 2,
      jitter: options.jitter ?? true,
      jitterFactor: options.jitterFactor ?? 0.5,
      timeout: options.timeout ?? 0,
      retryOn: options.retryOn,
      onRetry: options.onRetry,
      onFailedAttempt: options.onFailedAttempt,
      onMaxAttemptsReached: options.onMaxAttemptsReached,
      logger: options.logger,
    };

    this.backoff = new BackoffCalculator({
      strategy: 'exponential',
      initialDelay: this.options.initialDelay,
      maxDelay: this.options.maxDelay,
      factor: this.options.factor,
      jitter: this.options.jitter,
      jitterFactor: this.options.jitterFactor,
    });

    this.logger = options.logger ?? createLogger({ name: 'RetryStrategy' });
  }

  async execute<T>(fn: () => Promise<T>): Promise<RetryResult<T>> {
    const startTime = Date.now();
    const delays: number[] = [];
    let lastError: Error | undefined;
    let attempt = 0;

    while (attempt < this.options.maxAttempts) {
      attempt++;

      try {
        const result = await this.executeWithTimeout(fn);
        return {
          success: true,
          result,
          attempts: attempt,
          totalTime: Date.now() - startTime,
          delays,
        };
      } catch (error) {
        lastError = error as Error;

        const shouldRetry = this.shouldRetry(lastError, attempt);
        const context: RetryContext = {
          attempt,
          maxAttempts: this.options.maxAttempts,
          error: lastError,
          startTime,
          elapsedTime: Date.now() - startTime,
          metadata: {},
        };

        if (this.options.onFailedAttempt) {
          await this.options.onFailedAttempt(context);
        }

        if (!shouldRetry || attempt >= this.options.maxAttempts) {
          if (this.options.onMaxAttemptsReached) {
            await this.options.onMaxAttemptsReached(context);
          }

          return {
            success: false,
            error: lastError,
            attempts: attempt,
            totalTime: Date.now() - startTime,
            delays,
          };
        }

        const delay = this.backoff.calculate(attempt);
        delays.push(delay);
        context.nextDelay = delay;

        this.logger.debug(`Retry attempt ${attempt}/${this.options.maxAttempts}`, {
          delay,
          error: lastError.message,
        });

        if (this.options.onRetry) {
          await this.options.onRetry(context);
        }

        await this.sleep(delay);
      }
    }

    return {
      success: false,
      error: lastError,
      attempts: attempt,
      totalTime: Date.now() - startTime,
      delays,
    };
  }

  wrap<T extends (...args: unknown[]) => Promise<unknown>>(fn: T): T {
    return (async (...args: Parameters<T>) => {
      const result = await this.execute(() => fn(...args));
      if (!result.success) {
        throw result.error;
      }
      return result.result;
    }) as T;
  }

  private shouldRetry(error: Error, attempt: number): boolean {
    if (this.options.retryOn) {
      return this.options.retryOn(error, attempt);
    }

    const retryableErrors = [
      'ECONNRESET',
      'ECONNREFUSED',
      'ETIMEDOUT',
      'ENOTFOUND',
      'ENETUNREACH',
      'EAI_AGAIN',
    ];

    const isRetryable =
      retryableErrors.includes((error as NodeJS.ErrnoException).code ?? '') ||
      error.message.includes('timeout') ||
      error.message.includes('retry') ||
      error.message.includes('rate limit') ||
      error.message.includes('429') ||
      error.message.includes('503') ||
      error.message.includes('502');

    return isRetryable;
  }

  private async executeWithTimeout<T>(fn: () => Promise<T>): Promise<T> {
    if (this.options.timeout <= 0) {
      return fn();
    }

    return new Promise<T>((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Operation timed out after ${this.options.timeout}ms`));
      }, this.options.timeout);

      fn()
        .then(result => {
          clearTimeout(timer);
          resolve(result);
        })
        .catch(error => {
          clearTimeout(timer);
          reject(error);
        });
    });
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export class RetryBuilder {
  private options: RetryOptions = {};

  maxAttempts(attempts: number): this {
    this.options.maxAttempts = attempts;
    return this;
  }

  delay(ms: number): this {
    this.options.initialDelay = ms;
    return this;
  }

  maxDelay(ms: number): this {
    this.options.maxDelay = ms;
    return this;
  }

  factor(factor: number): this {
    this.options.factor = factor;
    return this;
  }

  withJitter(enabled = true, factor = 0.5): this {
    this.options.jitter = enabled;
    this.options.jitterFactor = factor;
    return this;
  }

  timeout(ms: number): this {
    this.options.timeout = ms;
    return this;
  }

  retryOn(condition: (error: Error, attempt: number) => boolean): this {
    this.options.retryOn = condition;
    return this;
  }

  onRetry(handler: (context: RetryContext) => void | Promise<void>): this {
    this.options.onRetry = handler;
    return this;
  }

  onFailedAttempt(handler: (context: RetryContext) => void | Promise<void>): this {
    this.options.onFailedAttempt = handler;
    return this;
  }

  onMaxAttemptsReached(handler: (context: RetryContext) => void | Promise<void>): this {
    this.options.onMaxAttemptsReached = handler;
    return this;
  }

  logger(logger: ILogger): this {
    this.options.logger = logger;
    return this;
  }

  build(): RetryStrategy {
    return new RetryStrategy(this.options);
  }
}

export function retry<T>(fn: () => Promise<T>, options?: RetryOptions): Promise<RetryResult<T>> {
  const strategy = new RetryStrategy(options);
  return strategy.execute(fn);
}

export function retryable(options?: RetryOptions): RetryBuilder {
  return new RetryBuilder();
}

export const commonRetryStrategies = {
  network: new RetryStrategy({
    maxAttempts: 3,
    initialDelay: 1000,
    maxDelay: 10000,
    factor: 2,
    jitter: true,
    retryOn: (error: Error) => {
      const networkErrors = ['ECONNRESET', 'ECONNREFUSED', 'ETIMEDOUT', 'ENOTFOUND'];
      return networkErrors.includes((error as NodeJS.ErrnoException).code ?? '');
    },
  }),

  rateLimit: new RetryStrategy({
    maxAttempts: 5,
    initialDelay: 2000,
    maxDelay: 60000,
    factor: 2,
    jitter: true,
    retryOn: (error: Error) => {
      return error.message.includes('429') || error.message.includes('rate limit');
    },
  }),

  aggressive: new RetryStrategy({
    maxAttempts: 10,
    initialDelay: 500,
    maxDelay: 30000,
    factor: 1.5,
    jitter: true,
  }),

  conservative: new RetryStrategy({
    maxAttempts: 2,
    initialDelay: 5000,
    maxDelay: 30000,
    factor: 3,
    jitter: false,
  }),
};

export function createRetryStrategy(options?: RetryOptions): RetryStrategy {
  return new RetryStrategy(options);
}

export function createBackoffCalculator(config?: Partial<BackoffConfig>): BackoffCalculator {
  return new BackoffCalculator(config);
}
