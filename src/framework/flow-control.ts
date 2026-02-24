/**
 * Flow Control System - 流量控制系统
 *
 * 提供全面的流量控制能力
 * - 限流器 (Rate Limiter)
 * - 熔断器增强 (Circuit Breaker Enhanced)
 * - 令牌桶算法
 * - 滑动窗口算法
 *
 * @module Framework/FlowControl
 * @version 1.0.0
 */

import { createLogger, type ILogger } from '../utils/logger.js';

export interface RateLimiterConfig {
  name: string;
  maxRequests: number;
  windowMs: number;
  strategy?: 'fixed' | 'sliding' | 'token-bucket' | 'leaky-bucket';
  keyGenerator?: (id: string) => string;
  onLimitReached?: (id: string) => void;
  logger?: ILogger;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
  retryAfter?: number;
}

interface RequestRecord {
  timestamp: number;
  count: number;
}

export class RateLimiter {
  private config: Required<Omit<RateLimiterConfig, 'keyGenerator' | 'onLimitReached' | 'logger'>> & {
    keyGenerator?: (id: string) => string;
    onLimitReached?: (id: string) => void;
    logger?: ILogger;
  };
  private logger: ILogger;
  private requests: Map<string, RequestRecord[]> = new Map();
  private tokens: Map<string, { count: number; lastRefill: number }> = new Map();
  private cleanupTimer?: ReturnType<typeof setInterval>;

  constructor(config: RateLimiterConfig) {
    this.config = {
      name: config.name,
      maxRequests: config.maxRequests,
      windowMs: config.windowMs,
      strategy: config.strategy ?? 'sliding',
      keyGenerator: config.keyGenerator,
      onLimitReached: config.onLimitReached,
      logger: config.logger,
    };
    this.logger = config.logger ?? createLogger({ name: `RateLimiter:${config.name}` });

    this.cleanupTimer = setInterval(() => this.cleanup(), this.config.windowMs);
  }

  tryAcquire(id: string = 'default'): RateLimitResult {
    const key = this.config.keyGenerator ? this.config.keyGenerator(id) : id;

    switch (this.config.strategy) {
      case 'fixed':
        return this.fixedWindow(key);
      case 'sliding':
        return this.slidingWindow(key);
      case 'token-bucket':
        return this.tokenBucket(key);
      case 'leaky-bucket':
        return this.leakyBucket(key);
      default:
        return this.slidingWindow(key);
    }
  }

  async acquire(id: string = 'default'): Promise<RateLimitResult> {
    const result = this.tryAcquire(id);

    if (!result.allowed && result.retryAfter) {
      await this.sleep(result.retryAfter);
      return this.tryAcquire(id);
    }

    return result;
  }

  reset(id: string = 'default'): void {
    const key = this.config.keyGenerator ? this.config.keyGenerator(id) : id;
    this.requests.delete(key);
    this.tokens.delete(key);
  }

  resetAll(): void {
    this.requests.clear();
    this.tokens.clear();
  }

  getStats(id: string = 'default'): { used: number; remaining: number; resetAt: number } {
    const key = this.config.keyGenerator ? this.config.keyGenerator(id) : id;
    const records = this.requests.get(key) ?? [];
    const now = Date.now();
    const windowStart = now - this.config.windowMs;
    const validRecords = records.filter(r => r.timestamp > windowStart);
    const used = validRecords.reduce((sum, r) => sum + r.count, 0);

    return {
      used,
      remaining: Math.max(0, this.config.maxRequests - used),
      resetAt: validRecords.length > 0 ? validRecords[0].timestamp + this.config.windowMs : now,
    };
  }

  destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }
    this.requests.clear();
    this.tokens.clear();
  }

  private fixedWindow(key: string): RateLimitResult {
    const now = Date.now();
    const windowStart = Math.floor(now / this.config.windowMs) * this.config.windowMs;
    const windowEnd = windowStart + this.config.windowMs;

    let records = this.requests.get(key);
    if (!records || records[0]?.timestamp < windowStart) {
      records = [{ timestamp: windowStart, count: 0 }];
      this.requests.set(key, records);
    }

    const record = records[0];
    const remaining = this.config.maxRequests - record.count;
    const allowed = remaining > 0;

    if (allowed) {
      record.count++;
    } else {
      this.config.onLimitReached?.(key);
    }

    return {
      allowed,
      remaining: Math.max(0, remaining - (allowed ? 1 : 0)),
      resetAt: windowEnd,
      retryAfter: allowed ? undefined : windowEnd - now,
    };
  }

  private slidingWindow(key: string): RateLimitResult {
    const now = Date.now();
    const windowStart = now - this.config.windowMs;

    let records = this.requests.get(key);
    if (!records) {
      records = [];
      this.requests.set(key, records);
    }

    const validRecords = records.filter(r => r.timestamp > windowStart);
    const used = validRecords.reduce((sum, r) => sum + r.count, 0);
    const remaining = this.config.maxRequests - used;
    const allowed = remaining > 0;

    if (allowed) {
      validRecords.push({ timestamp: now, count: 1 });
      this.requests.set(key, validRecords);
    } else {
      this.config.onLimitReached?.(key);
    }

    const oldestValid = validRecords[0];
    const resetAt = oldestValid ? oldestValid.timestamp + this.config.windowMs : now;

    return {
      allowed,
      remaining: Math.max(0, remaining - (allowed ? 1 : 0)),
      resetAt,
      retryAfter: allowed ? undefined : resetAt - now,
    };
  }

  private tokenBucket(key: string): RateLimitResult {
    const now = Date.now();
    const refillRate = this.config.maxRequests / this.config.windowMs;

    let bucket = this.tokens.get(key);
    if (!bucket) {
      bucket = { count: this.config.maxRequests, lastRefill: now };
      this.tokens.set(key, bucket);
    }

    const elapsed = now - bucket.lastRefill;
    const refill = elapsed * refillRate;
    bucket.count = Math.min(this.config.maxRequests, bucket.count + refill);
    bucket.lastRefill = now;

    const allowed = bucket.count >= 1;

    if (allowed) {
      bucket.count--;
    } else {
      this.config.onLimitReached?.(key);
    }

    const timeToNextToken = (1 - bucket.count) / refillRate;

    return {
      allowed,
      remaining: Math.floor(bucket.count),
      resetAt: now + timeToNextToken,
      retryAfter: allowed ? undefined : Math.ceil(timeToNextToken),
    };
  }

  private leakyBucket(key: string): RateLimitResult {
    const now = Date.now();
    const leakRate = this.config.maxRequests / this.config.windowMs;

    let bucket = this.tokens.get(key);
    if (!bucket) {
      bucket = { count: 0, lastRefill: now };
      this.tokens.set(key, bucket);
    }

    const elapsed = now - bucket.lastRefill;
    const leaked = elapsed * leakRate;
    bucket.count = Math.max(0, bucket.count - leaked);
    bucket.lastRefill = now;

    const allowed = bucket.count < this.config.maxRequests;

    if (allowed) {
      bucket.count++;
    } else {
      this.config.onLimitReached?.(key);
    }

    const timeToLeak = (bucket.count - this.config.maxRequests + 1) / leakRate;

    return {
      allowed,
      remaining: Math.max(0, this.config.maxRequests - Math.ceil(bucket.count)),
      resetAt: now + timeToLeak,
      retryAfter: allowed ? undefined : Math.ceil(timeToLeak),
    };
  }

  private cleanup(): void {
    const now = Date.now();
    const windowStart = now - this.config.windowMs;

    for (const [key, records] of this.requests) {
      const validRecords = records.filter(r => r.timestamp > windowStart);
      if (validRecords.length === 0) {
        this.requests.delete(key);
      } else {
        this.requests.set(key, validRecords);
      }
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export type CircuitState = 'closed' | 'open' | 'half-open';

export interface EnhancedCircuitBreakerConfig {
  name: string;
  failureThreshold: number;
  successThreshold: number;
  timeout: number;
  resetTimeout: number;
  volumeThreshold?: number;
  errorThresholdPercentage?: number;
  onStateChange?: (oldState: CircuitState, newState: CircuitState) => void;
  onFallback?: (error: Error) => unknown;
  logger?: ILogger;
}

export interface CircuitStats {
  state: CircuitState;
  failures: number;
  successes: number;
  consecutiveFailures: number;
  consecutiveSuccesses: number;
  totalCalls: number;
  failedCalls: number;
  rejectedCalls: number;
  timeoutCalls: number;
  lastFailureTime?: number;
  lastSuccessTime?: number;
}

export class EnhancedCircuitBreaker {
  private config: Required<Omit<EnhancedCircuitBreakerConfig, 'volumeThreshold' | 'errorThresholdPercentage' | 'onStateChange' | 'onFallback' | 'logger'>> & {
    volumeThreshold?: number;
    errorThresholdPercentage?: number;
    onStateChange?: (oldState: CircuitState, newState: CircuitState) => void;
    onFallback?: (error: Error) => unknown;
    logger?: ILogger;
  };
  private logger: ILogger;
  private state: CircuitState = 'closed';
  private stats: CircuitStats = {
    state: 'closed',
    failures: 0,
    successes: 0,
    consecutiveFailures: 0,
    consecutiveSuccesses: 0,
    totalCalls: 0,
    failedCalls: 0,
    rejectedCalls: 0,
    timeoutCalls: 0,
  };
  private lastStateChange: number = Date.now();
  private halfOpenAttempts = 0;

  constructor(config: EnhancedCircuitBreakerConfig) {
    this.config = {
      name: config.name,
      failureThreshold: config.failureThreshold ?? 5,
      successThreshold: config.successThreshold ?? 3,
      timeout: config.timeout ?? 30000,
      resetTimeout: config.resetTimeout ?? 60000,
      volumeThreshold: config.volumeThreshold,
      errorThresholdPercentage: config.errorThresholdPercentage,
      onStateChange: config.onStateChange,
      onFallback: config.onFallback,
      logger: config.logger,
    };
    this.logger = config.logger ?? createLogger({ name: `CircuitBreaker:${config.name}` });
  }

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === 'open') {
      if (this.shouldAttemptReset()) {
        this.transitionTo('half-open');
      } else {
        this.stats.rejectedCalls++;
        throw new Error(`Circuit breaker is open: ${this.config.name}`);
      }
    }

    try {
      const result = await this.executeWithTimeout(fn);
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure(error as Error);
      throw error;
    }
  }

  async executeWithFallback<T>(fn: () => Promise<T>, fallback?: () => T | Promise<T>): Promise<T> {
    try {
      return await this.execute(fn);
    } catch (error) {
      if (this.config.onFallback) {
        return this.config.onFallback(error as Error) as T;
      }
      if (fallback) {
        return fallback();
      }
      throw error;
    }
  }

  getState(): CircuitState {
    return this.state;
  }

  getStats(): CircuitStats {
    return { ...this.stats, state: this.state };
  }

  reset(): void {
    this.transitionTo('closed');
    this.stats = {
      state: 'closed',
      failures: 0,
      successes: 0,
      consecutiveFailures: 0,
      consecutiveSuccesses: 0,
      totalCalls: 0,
      failedCalls: 0,
      rejectedCalls: 0,
      timeoutCalls: 0,
    };
  }

  forceOpen(): void {
    this.transitionTo('open');
  }

  forceClose(): void {
    this.transitionTo('closed');
  }

  private onSuccess(): void {
    this.stats.totalCalls++;
    this.stats.successes++;
    this.stats.consecutiveSuccesses++;
    this.stats.consecutiveFailures = 0;
    this.stats.lastSuccessTime = Date.now();

    if (this.state === 'half-open') {
      this.halfOpenAttempts++;
      if (this.halfOpenAttempts >= this.config.successThreshold) {
        this.transitionTo('closed');
      }
    }
  }

  private onFailure(error: Error): void {
    this.stats.totalCalls++;
    this.stats.failures++;
    this.stats.consecutiveFailures++;
    this.stats.consecutiveSuccesses = 0;
    this.stats.lastFailureTime = Date.now();

    if (error.message.includes('timeout')) {
      this.stats.timeoutCalls++;
    }
    this.stats.failedCalls++;

    if (this.state === 'half-open') {
      this.transitionTo('open');
    } else if (this.shouldOpen()) {
      this.transitionTo('open');
    }
  }

  private shouldOpen(): boolean {
    if (this.config.volumeThreshold && this.stats.totalCalls < this.config.volumeThreshold) {
      return false;
    }

    if (this.stats.consecutiveFailures >= this.config.failureThreshold) {
      return true;
    }

    if (this.config.errorThresholdPercentage && this.stats.totalCalls > 0) {
      const errorPercentage = (this.stats.failures / this.stats.totalCalls) * 100;
      return errorPercentage >= this.config.errorThresholdPercentage;
    }

    return false;
  }

  private shouldAttemptReset(): boolean {
    return Date.now() - this.lastStateChange >= this.config.resetTimeout;
  }

  private transitionTo(newState: CircuitState): void {
    const oldState = this.state;
    this.state = newState;
    this.stats.state = newState;
    this.lastStateChange = Date.now();

    if (newState === 'closed') {
      this.halfOpenAttempts = 0;
      this.stats.failures = 0;
      this.stats.consecutiveFailures = 0;
    } else if (newState === 'half-open') {
      this.halfOpenAttempts = 0;
    }

    this.logger.info(`Circuit breaker state changed: ${oldState} -> ${newState}`, { name: this.config.name });
    this.config.onStateChange?.(oldState, newState);
  }

  private async executeWithTimeout<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Operation timed out after ${this.config.timeout}ms`));
      }, this.config.timeout);

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
}

export interface BulkheadConfig {
  name: string;
  maxConcurrent: number;
  maxQueueSize?: number;
  logger?: ILogger;
}

export interface BulkheadResult<T> {
  success: boolean;
  result?: T;
  error?: Error;
  queueSize: number;
  activeCount: number;
}

export class Bulkhead {
  private config: Required<Omit<BulkheadConfig, 'maxQueueSize' | 'logger'>> & {
    maxQueueSize?: number;
    logger?: ILogger;
  };
  private logger: ILogger;
  private activeCount = 0;
  private queue: Array<{
    fn: () => Promise<unknown>;
    resolve: (value: unknown) => void;
    reject: (error: Error) => void;
  }> = [];

  constructor(config: BulkheadConfig) {
    this.config = {
      name: config.name,
      maxConcurrent: config.maxConcurrent,
      maxQueueSize: config.maxQueueSize,
      logger: config.logger,
    };
    this.logger = config.logger ?? createLogger({ name: `Bulkhead:${config.name}` });
  }

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.activeCount < this.config.maxConcurrent) {
      return this.executeImmediately(fn);
    }

    if (this.config.maxQueueSize !== undefined && this.queue.length >= this.config.maxQueueSize) {
      throw new Error(`Bulkhead queue is full: ${this.config.name}`);
    }

    return new Promise<T>((resolve, reject) => {
      this.queue.push({ fn, resolve: resolve as (value: unknown) => void, reject });
    });
  }

  getStats(): { activeCount: number; queueSize: number; maxConcurrent: number } {
    return {
      activeCount: this.activeCount,
      queueSize: this.queue.length,
      maxConcurrent: this.config.maxConcurrent,
    };
  }

  private async executeImmediately<T>(fn: () => Promise<T>): Promise<T> {
    this.activeCount++;

    try {
      const result = await fn();
      return result;
    } finally {
      this.activeCount--;
      this.processQueue();
    }
  }

  private processQueue(): void {
    if (this.queue.length === 0 || this.activeCount >= this.config.maxConcurrent) {
      return;
    }

    const item = this.queue.shift()!;
    this.executeImmediately(item.fn as () => Promise<unknown>)
      .then(item.resolve)
      .catch(item.reject);
  }
}

export function createRateLimiter(config: RateLimiterConfig): RateLimiter {
  return new RateLimiter(config);
}

export function createCircuitBreaker(config: EnhancedCircuitBreakerConfig): EnhancedCircuitBreaker {
  return new EnhancedCircuitBreaker(config);
}

export function createBulkhead(config: BulkheadConfig): Bulkhead {
  return new Bulkhead(config);
}
