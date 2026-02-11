/**
 * Circuit Breaker - 熔断器实现
 *
 * 防止级联故障，提高系统稳定性
 *
 * 核心特性：
 * 1. 三种状态：CLOSED(正常)、OPEN(熔断)、HALF_OPEN(半开)
 * 2. 自动故障检测
 * 3. 自动恢复尝试
 * 4. 可配置的阈值和超时
 *
 * @module CircuitBreaker
 * @version 1.0.0
 */

export interface CircuitBreakerConfig {
  /** 失败阈值，超过则熔断 */
  failureThreshold: number;
  /** 熔断后恢复超时 (ms) */
  resetTimeoutMs: number;
  /** 半开状态下允许的测试请求数 */
  halfOpenMaxCalls: number;
  /** 成功阈值，半开状态下连续成功则关闭 */
  successThreshold: number;
  /** 监控窗口大小 (ms) */
  monitoringWindowMs: number;
}

export interface CircuitBreakerState {
  status: 'CLOSED' | 'OPEN' | 'HALF_OPEN';
  failures: number;
  successes: number;
  lastFailureTime?: number;
  nextAttempt: number;
}

export interface CircuitBreakerMetrics {
  state: CircuitBreakerState['status'];
  failureCount: number;
  successCount: number;
  rejectionCount: number;
  lastFailureTime?: Date;
}

/**
 * 熔断器
 */
export class CircuitBreaker {
  private config: CircuitBreakerConfig;
  private state: CircuitBreakerState;
  private metrics = {
    successCount: 0,
    failureCount: 0,
    rejectionCount: 0,
  };

  constructor(config: Partial<CircuitBreakerConfig> = {}) {
    this.config = {
      failureThreshold: 5,
      resetTimeoutMs: 30000,
      halfOpenMaxCalls: 3,
      successThreshold: 2,
      monitoringWindowMs: 60000,
      ...config,
    };

    this.state = {
      status: 'CLOSED',
      failures: 0,
      successes: 0,
      nextAttempt: Date.now(),
    };
  }

  /**
   * 执行受保护的函数
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state.status === 'OPEN') {
      if (Date.now() < this.state.nextAttempt) {
        this.metrics.rejectionCount++;
        throw new Error('Circuit breaker is OPEN');
      }
      // 尝试进入半开状态
      this.state.status = 'HALF_OPEN';
      this.state.failures = 0;
      this.state.successes = 0;
    }

    if (this.state.status === 'HALF_OPEN') {
      const totalCalls = this.state.failures + this.state.successes;
      if (totalCalls >= this.config.halfOpenMaxCalls) {
        this.metrics.rejectionCount++;
        throw new Error('Circuit breaker is HALF_OPEN (max calls reached)');
      }
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  /**
   * 处理成功
   */
  private onSuccess(): void {
    this.metrics.successCount++;

    if (this.state.status === 'HALF_OPEN') {
      this.state.successes++;
      if (this.state.successes >= this.config.successThreshold) {
        this.close();
      }
    } else {
      this.state.failures = 0;
    }
  }

  /**
   * 处理失败
   */
  private onFailure(): void {
    this.metrics.failureCount++;
    this.state.failures++;
    this.state.lastFailureTime = Date.now();

    if (this.state.status === 'HALF_OPEN') {
      this.open();
    } else if (this.state.failures >= this.config.failureThreshold) {
      this.open();
    }
  }

  /**
   * 打开熔断器
   */
  private open(): void {
    this.state.status = 'OPEN';
    this.state.nextAttempt = Date.now() + this.config.resetTimeoutMs;
  }

  /**
   * 关闭熔断器
   */
  private close(): void {
    this.state.status = 'CLOSED';
    this.state.failures = 0;
    this.state.successes = 0;
  }

  /**
   * 获取当前状态
   */
  getState(): CircuitBreakerState {
    return { ...this.state };
  }

  /**
   * 获取指标
   */
  getMetrics(): CircuitBreakerMetrics {
    return {
      state: this.state.status,
      failureCount: this.metrics.failureCount,
      successCount: this.metrics.successCount,
      rejectionCount: this.metrics.rejectionCount,
      lastFailureTime: this.state.lastFailureTime ? new Date(this.state.lastFailureTime) : undefined,
    };
  }

  /**
   * 强制打开熔断器
   */
  forceOpen(): void {
    this.open();
  }

  /**
   * 强制关闭熔断器
   */
  forceClose(): void {
    this.close();
  }
}

/**
 * 创建熔断器
 */
export function createCircuitBreaker(config?: Partial<CircuitBreakerConfig>): CircuitBreaker {
  return new CircuitBreaker(config);
}
