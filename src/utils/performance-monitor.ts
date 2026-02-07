/**
 * Performance Monitor - 极致性能监控工具
 *
 * 特性：
 * 1. 微秒级性能测量
 * 2. 内存使用监控
 * 3. 函数调用分析
 * 4. 性能瓶颈识别
 * 5. 实时性能报告
 * 6. 性能回归检测
 *
 * @module PerformanceMonitor
 * @version 1.0.0
 */

import { Logger, createLogger } from './logger';

// ============================================
// 类型定义
// ============================================

/** 浏览器 Performance 内存信息接口 */
interface PerformanceMemory {
  usedJSHeapSize: number;
  totalJSHeapSize: number;
  jsHeapSizeLimit: number;
}

/** 扩展 Performance 接口 */
declare global {
  interface Performance {
    memory?: PerformanceMemory;
  }
}

export interface PerformanceMetrics {
  /** 函数名 */
  functionName: string;
  /** 调用次数 */
  callCount: number;
  /** 总耗时 (ms) */
  totalTime: number;
  /** 平均耗时 (ms) */
  averageTime: number;
  /** 最小耗时 (ms) */
  minTime: number;
  /** 最大耗时 (ms) */
  maxTime: number;
  /** 标准差 */
  stdDeviation: number;
  /** 内存使用 (bytes) */
  memoryUsage?: number;
  /** 最后调用时间 */
  lastCalled: Date;
}

export interface MemorySnapshot {
  /** 时间戳 */
  timestamp: Date;
  /** 堆内存使用 */
  heapUsed: number;
  /** 堆内存总量 */
  heapTotal: number;
  /** 外部内存 */
  external: number;
  /** RSS */
  rss: number;
}

export interface PerformanceReport {
  /** 报告时间 */
  timestamp: Date;
  /** 所有指标 */
  metrics: Map<string, PerformanceMetrics>;
  /** 内存快照 */
  memorySnapshots: MemorySnapshot[];
  /** 热点函数 */
  hotspots: PerformanceMetrics[];
  /** 性能建议 */
  suggestions: string[];
}

export interface MonitorOptions {
  /** 启用内存监控 */
  enableMemoryTracking?: boolean;
  /** 内存采样间隔 (ms) */
  memorySampleInterval?: number;
  /** 性能阈值 (ms) */
  performanceThreshold?: number;
  /** 最大历史记录数 */
  maxHistorySize?: number;
  /** 启用自动报告 */
  enableAutoReport?: boolean;
  /** 报告间隔 (ms) */
  reportInterval?: number;
}

/**
 * 性能监控器
 *
 * 提供极致的性能测量和分析能力
 */
export class PerformanceMonitor {
  private metrics = new Map<string, PerformanceMetrics>();
  private memorySnapshots: MemorySnapshot[] = [];
  private options: Required<MonitorOptions>;
  private memoryTimer?: ReturnType<typeof setInterval>;
  private reportTimer?: ReturnType<typeof setInterval>;
  private history: Array<{ name: string; time: number; timestamp: Date }> = [];
  private logger: Logger;

  constructor(options: MonitorOptions = {}) {
    this.options = {
      enableMemoryTracking: true,
      memorySampleInterval: 5000,
      performanceThreshold: 100,
      maxHistorySize: 10000,
      enableAutoReport: false,
      reportInterval: 60000,
      ...options,
    };

    this.logger = createLogger({ name: 'PerformanceMonitor' });

    if (this.options.enableMemoryTracking) {
      this.startMemoryTracking();
    }

    if (this.options.enableAutoReport) {
      this.startAutoReport();
    }
  }

  /**
   * 测量函数执行时间
   */
  async measure<T>(
    name: string,
    fn: () => Promise<T> | T
  ): Promise<T> {
    const start = performance.now();
    const startMemory = this.getMemoryUsage();

    try {
      const result = await fn();
      return result;
    } finally {
      const end = performance.now();
      const endMemory = this.getMemoryUsage();
      const duration = end - start;
      const memoryDelta = endMemory - startMemory;

      this.recordMeasurement(name, duration, memoryDelta);
    }
  }

  /**
   * 创建测量装饰器
   */
  createDecorator(name?: string) {
    return (
      target: object,
      propertyKey: string,
      descriptor: PropertyDescriptor
    ) => {
      const originalMethod = descriptor.value;
      const metricName = name || `${target.constructor.name}.${propertyKey}`;

      descriptor.value = async function (...args: unknown[]) {
        const monitor = PerformanceMonitor.getGlobalInstance();
        return monitor.measure(metricName, () => originalMethod.apply(this, args));
      };

      return descriptor;
    };
  }

  /**
   * 开始手动计时
   */
  startTimer(name: string): () => void {
    const start = performance.now();
    const startMemory = this.getMemoryUsage();

    return () => {
      const end = performance.now();
      const endMemory = this.getMemoryUsage();
      const duration = end - start;
      const memoryDelta = endMemory - startMemory;

      this.recordMeasurement(name, duration, memoryDelta);
    };
  }

  /**
   * 获取指标
   */
  getMetrics(name?: string): PerformanceMetrics | Map<string, PerformanceMetrics> | undefined {
    if (name) {
      return this.metrics.get(name);
    }
    return new Map(this.metrics);
  }

  /**
   * 获取性能报告
   */
  generateReport(): PerformanceReport {
    const metrics = new Map(this.metrics);
    const hotspots = this.identifyHotspots();
    const suggestions = this.generateSuggestions();

    return {
      timestamp: new Date(),
      metrics,
      memorySnapshots: [...this.memorySnapshots],
      hotspots,
      suggestions,
    };
  }

  /**
   * 获取内存快照
   */
  getMemorySnapshots(): MemorySnapshot[] {
    return [...this.memorySnapshots];
  }

  /**
   * 重置所有指标
   */
  reset(): void {
    this.metrics.clear();
    this.memorySnapshots = [];
    this.history = [];
  }

  /**
   * 销毁监控器
   */
  destroy(): void {
    this.stopMemoryTracking();
    this.stopAutoReport();
    this.reset();
  }

  /**
   * 打印性能报告
   */
  printReport(): void {
    const report = this.generateReport();

    this.logger.info('Performance Report', {
      timestamp: report.timestamp.toISOString(),
      hotspots: report.hotspots.slice(0, 5).map(h => ({
        functionName: h.functionName,
        callCount: h.callCount,
        averageTime: h.averageTime.toFixed(2),
        totalTime: h.totalTime.toFixed(2),
      })),
      metrics: Array.from(report.metrics.values())
        .sort((a, b) => b.totalTime - a.totalTime)
        .map(m => ({
          functionName: m.functionName,
          callCount: m.callCount,
          averageTime: m.averageTime.toFixed(3),
          minTime: m.minTime.toFixed(3),
          maxTime: m.maxTime.toFixed(3),
          status: m.averageTime > this.options.performanceThreshold ? 'warning' : 'ok',
        })),
      suggestions: report.suggestions,
    });
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  private recordMeasurement(name: string, duration: number, memoryDelta: number): void {
    const existing = this.metrics.get(name);
    const now = new Date();

    if (existing) {
      existing.callCount++;
      existing.totalTime += duration;
      existing.averageTime = existing.totalTime / existing.callCount;
      existing.minTime = Math.min(existing.minTime, duration);
      existing.maxTime = Math.max(existing.maxTime, duration);
      existing.lastCalled = now;

      // 计算标准差
      if (existing.callCount > 1) {
        const variance = this.calculateVariance(name, existing.averageTime);
        existing.stdDeviation = Math.sqrt(variance);
      }

      if (memoryDelta > 0) {
        existing.memoryUsage = (existing.memoryUsage || 0) + memoryDelta;
      }
    } else {
      this.metrics.set(name, {
        functionName: name,
        callCount: 1,
        totalTime: duration,
        averageTime: duration,
        minTime: duration,
        maxTime: duration,
        stdDeviation: 0,
        memoryUsage: memoryDelta > 0 ? memoryDelta : undefined,
        lastCalled: now,
      });
    }

    // 记录历史
    this.history.push({ name, time: duration, timestamp: now });

    // 限制历史大小
    if (this.history.length > this.options.maxHistorySize) {
      this.history = this.history.slice(-this.options.maxHistorySize);
    }

    // 检查性能阈值
    if (duration > this.options.performanceThreshold) {
      console.warn(`⚠️ Performance warning: ${name} took ${duration.toFixed(2)}ms (threshold: ${this.options.performanceThreshold}ms)`);
    }
  }

  private calculateVariance(name: string, average: number): number {
    const measurements = this.history
      .filter(h => h.name === name)
      .slice(-100) // 最近100次
      .map(h => h.time);

    if (measurements.length < 2) return 0;

    const sum = measurements.reduce((acc, val) => acc + Math.pow(val - average, 2), 0);
    return sum / measurements.length;
  }

  private getMemoryUsage(): number {
    if (typeof process !== 'undefined' && process.memoryUsage) {
      return process.memoryUsage().heapUsed;
    }
    if (typeof performance !== 'undefined' && performance.memory) {
      return performance.memory.usedJSHeapSize;
    }
    return 0;
  }

  private takeMemorySnapshot(): MemorySnapshot {
    const usage = process.memoryUsage ? process.memoryUsage() : {
      heapUsed: 0,
      heapTotal: 0,
      external: 0,
      rss: 0,
    };

    return {
      timestamp: new Date(),
      heapUsed: usage.heapUsed,
      heapTotal: usage.heapTotal,
      external: usage.external,
      rss: usage.rss,
    };
  }

  private startMemoryTracking(): void {
    this.memoryTimer = setInterval(() => {
      const snapshot = this.takeMemorySnapshot();
      this.memorySnapshots.push(snapshot);

      // 限制快照数量
      if (this.memorySnapshots.length > 1000) {
        this.memorySnapshots = this.memorySnapshots.slice(-1000);
      }
    }, this.options.memorySampleInterval);
  }

  private stopMemoryTracking(): void {
    if (this.memoryTimer) {
      clearInterval(this.memoryTimer);
      this.memoryTimer = undefined;
    }
  }

  private startAutoReport(): void {
    this.reportTimer = setInterval(() => {
      this.printReport();
    }, this.options.reportInterval);
  }

  private stopAutoReport(): void {
    if (this.reportTimer) {
      clearInterval(this.reportTimer);
      this.reportTimer = undefined;
    }
  }

  private identifyHotspots(): PerformanceMetrics[] {
    return Array.from(this.metrics.values())
      .filter(m => m.totalTime > this.options.performanceThreshold)
      .sort((a, b) => b.totalTime - a.totalTime);
  }

  private generateSuggestions(): string[] {
    const suggestions: string[] = [];
    const metrics = Array.from(this.metrics.values());

    // 检查高方差
    const highVariance = metrics.filter(m => m.stdDeviation > m.averageTime * 0.5);
    if (highVariance.length > 0) {
      suggestions.push(`High variance detected in ${highVariance.length} functions. Consider optimizing for consistency.`);
    }

    // 检查频繁调用
    const frequentCalls = metrics.filter(m => m.callCount > 1000 && m.averageTime > 1);
    if (frequentCalls.length > 0) {
      suggestions.push(`Frequent slow calls detected. Consider caching or batching.`);
    }

    // 检查内存使用
    const highMemory = metrics.filter(m => m.memoryUsage && m.memoryUsage > 10 * 1024 * 1024);
    if (highMemory.length > 0) {
      suggestions.push(`High memory usage detected. Consider memory optimization.`);
    }

    return suggestions;
  }

  // ============================================================================
  // Static Methods
  // ============================================================================

  private static globalInstance: PerformanceMonitor | null = null;

  static getGlobalInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.globalInstance) {
      PerformanceMonitor.globalInstance = new PerformanceMonitor();
    }
    return PerformanceMonitor.globalInstance;
  }

  static resetGlobalInstance(): void {
    if (PerformanceMonitor.globalInstance) {
      PerformanceMonitor.globalInstance.destroy();
      PerformanceMonitor.globalInstance = null;
    }
  }
}

/**
 * 创建性能监控器实例
 */
export function createPerformanceMonitor(options?: MonitorOptions): PerformanceMonitor {
  return new PerformanceMonitor(options);
}

export default PerformanceMonitor;
