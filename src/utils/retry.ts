/**
 * 重试工具
 * 
 * 提供指数退避重试机制，用于处理瞬态失败
 */

/**
 * 重试配置
 */
export interface RetryConfig {
  /** 最大重试次数 */
  maxRetries: number;
  /** 初始延迟（毫秒） */
  initialDelay: number;
  /** 最大延迟（毫秒） */
  maxDelay: number;
  /** 退避乘数 */
  backoffMultiplier: number;
  /** 是否使用抖动 */
  useJitter: boolean;
  /** 可重试的错误类型 */
  retryableErrors?: string[];
  /** 可重试的HTTP状态码 */
  retryableStatusCodes?: number[];
  /** 自定义重试条件 */
  shouldRetry?: (error: Error, attempt: number) => boolean;
  /** 每次重试前的回调 */
  onRetry?: (error: Error, attempt: number, delay: number) => void;
}

/**
 * 默认重试配置
 */
export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  initialDelay: 1000,
  maxDelay: 30000,
  backoffMultiplier: 2,
  useJitter: true,
  retryableStatusCodes: [408, 429, 500, 502, 503, 504],
};

/**
 * 重试结果
 */
export interface RetryResult<T> {
  success: boolean;
  result?: T;
  error?: Error;
  attempts: number;
  totalDelay: number;
}

/**
 * 可重试的错误类型
 */
export class RetryableError extends Error {
  constructor(
    message: string,
    public readonly cause: Error,
    public readonly attempt: number
  ) {
    super(message);
    this.name = 'RetryableError';
  }
}

/**
 * 重试函数
 * 
 * @param operation 要执行的操作
 * @param config 重试配置
 * @returns 操作结果
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  config: Partial<RetryConfig> = {}
): Promise<T> {
  const fullConfig = { ...DEFAULT_RETRY_CONFIG, ...config };
  let lastError: Error | undefined;
  let totalDelay = 0;

  for (let attempt = 0; attempt <= fullConfig.maxRetries; attempt++) {
    try {
      const result = await operation();
      return result;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // 检查是否应该重试
      if (attempt >= fullConfig.maxRetries) {
        break;
      }

      const shouldRetry = fullConfig.shouldRetry 
        ? fullConfig.shouldRetry(lastError, attempt + 1)
        : isRetryableError(lastError, fullConfig);

      if (!shouldRetry) {
        break;
      }

      // 计算延迟
      const delay = calculateDelay(attempt, fullConfig);
      totalDelay += delay;

      // 调用重试回调
      fullConfig.onRetry?.(lastError, attempt + 1, delay);

      // 等待后重试
      await sleep(delay);
    }
  }

  throw new RetryableError(
    `Operation failed after ${fullConfig.maxRetries + 1} attempts`,
    lastError!,
    fullConfig.maxRetries + 1
  );
}

/**
 * 带重试的fetch
 * 
 * @param url 请求URL
 * @param options fetch选项
 * @param config 重试配置
 * @returns fetch响应
 */
export async function fetchWithRetry(
  url: string,
  options?: RequestInit,
  config: Partial<RetryConfig> = {}
): Promise<Response> {
  return withRetry(
    async () => {
      const response = await fetch(url, options);
      
      // 检查是否需要重试
      if (!response.ok) {
        const fullConfig = { ...DEFAULT_RETRY_CONFIG, ...config };
        const shouldRetry = fullConfig.retryableStatusCodes?.includes(response.status);
        
        if (shouldRetry) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
      }
      
      return response;
    },
    config
  );
}

/**
 * 计算延迟时间
 */
function calculateDelay(attempt: number, config: RetryConfig): number {
  // 指数退避
  let delay = config.initialDelay * Math.pow(config.backoffMultiplier, attempt);
  
  // 限制最大延迟
  delay = Math.min(delay, config.maxDelay);
  
  // 添加抖动
  if (config.useJitter) {
    delay = addJitter(delay);
  }
  
  return delay;
}

/**
 * 添加抖动
 */
function addJitter(delay: number): number {
  // 在延迟的 ±25% 范围内随机抖动
  const jitter = delay * 0.25 * (Math.random() * 2 - 1);
  return Math.max(0, delay + jitter);
}

/**
 * 检查错误是否可重试
 */
function isRetryableError(error: Error, config: RetryConfig): boolean {
  // 检查错误类型
  if (config.retryableErrors) {
    const errorType = error.name || error.constructor.name;
    if (config.retryableErrors.includes(errorType)) {
      return true;
    }
  }

  // 检查错误消息
  const retryablePatterns = [
    /timeout/i,
    /network/i,
    /connection/i,
    /econnrefused/i,
    /econnreset/i,
    /etimedout/i,
    /rate limit/i,
    /too many requests/i,
    /service unavailable/i,
    /internal server error/i,
  ];

  const errorMessage = error.message.toLowerCase();
  return retryablePatterns.some(pattern => pattern.test(errorMessage));
}

/**
 * 睡眠函数
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 创建带重试的函数包装器
 */
export function createRetryableFunction<T extends (...args: unknown[]) => Promise<unknown>>(
  fn: T,
  config: Partial<RetryConfig> = {}
): T {
  return (async (...args: unknown[]) => {
    return withRetry(() => fn(...args), config);
  }) as T;
}

/**
 * 批量重试
 * 
 * 对多个操作进行重试，支持并行和串行模式
 */
export async function batchRetry<T>(
  operations: Array<() => Promise<T>>,
  config: Partial<RetryConfig> & { parallel?: boolean; concurrency?: number } = {}
): Promise<RetryResult<T>[]> {
  const { parallel = false, concurrency = 5, ...retryConfig } = config;

  if (parallel) {
    // 并行执行
    const semaphore = new Semaphore(concurrency);
    
    return Promise.all(
      operations.map(op => 
        semaphore.acquire().then(async () => {
          try {
            const result = await withRetry(op, retryConfig);
            return { success: true, result, attempts: 1, totalDelay: 0 };
          } catch (error) {
            return { 
              success: false, 
              error: error instanceof Error ? error : new Error(String(error)),
              attempts: (retryConfig.maxRetries || 3) + 1,
              totalDelay: 0 
            };
          } finally {
            semaphore.release();
          }
        })
      )
    );
  } else {
    // 串行执行
    const results: RetryResult<T>[] = [];
    
    for (const op of operations) {
      try {
        const startTime = Date.now();
        const result = await withRetry(op, retryConfig);
        results.push({
          success: true,
          result,
          attempts: 1,
          totalDelay: Date.now() - startTime,
        });
      } catch (error) {
        results.push({
          success: false,
          error: error instanceof Error ? error : new Error(String(error)),
          attempts: (retryConfig.maxRetries || 3) + 1,
          totalDelay: 0,
        });
      }
    }
    
    return results;
  }
}

/**
 * 信号量
 */
class Semaphore {
  private permits: number;
  private queue: Array<() => void> = [];

  constructor(permits: number) {
    this.permits = permits;
  }

  acquire(): Promise<void> {
    if (this.permits > 0) {
      this.permits--;
      return Promise.resolve();
    }
    
    return new Promise(resolve => {
      this.queue.push(resolve);
    });
  }

  release(): void {
    if (this.queue.length > 0) {
      const resolve = this.queue.shift()!;
      resolve();
    } else {
      this.permits++;
    }
  }
}

export default {
  withRetry,
  fetchWithRetry,
  createRetryableFunction,
  batchRetry,
  RetryableError,
  DEFAULT_RETRY_CONFIG,
};
