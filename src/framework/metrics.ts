/**
 * Performance Metrics System - 性能监控和度量系统
 *
 * 提供全面的性能监控能力
 * - 指标收集和聚合
 * - 性能计时器
 * - 资源使用监控
 * - 性能报告生成
 *
 * @module Framework/Metrics
 * @version 1.0.0
 */

import { createLogger, type ILogger } from '../utils/logger.js';

export type MetricValue = number | string | boolean;

export interface Metric {
  name: string;
  value: MetricValue;
  timestamp: number;
  tags?: Record<string, string>;
  type: 'counter' | 'gauge' | 'histogram' | 'timer';
}

export interface MetricConfig {
  name: string;
  description?: string;
  type: 'counter' | 'gauge' | 'histogram' | 'timer';
  unit?: string;
  tags?: Record<string, string>;
}

export interface MetricsConfig {
  name?: string;
  enableHistory?: boolean;
  maxHistorySize?: number;
  flushInterval?: number;
  logger?: ILogger;
}

export interface TimerResult {
  duration: number;
  start: number;
  end: number;
}

export interface HistogramStats {
  count: number;
  sum: number;
  min: number;
  max: number;
  mean: number;
  variance: number;
  stdDev: number;
  percentiles: Record<string, number>;
}

class MetricValueStore {
  private values: number[] = [];
  private sum = 0;
  private minVal = Infinity;
  private maxVal = -Infinity;
  private sorted = false;

  add(value: number): void {
    this.values.push(value);
    this.sum += value;
    if (value < this.minVal) this.minVal = value;
    if (value > this.maxVal) this.maxVal = value;
    this.sorted = false;
  }

  getStats(): HistogramStats {
    const count = this.values.length;
    if (count === 0) {
      return {
        count: 0,
        sum: 0,
        min: 0,
        max: 0,
        mean: 0,
        variance: 0,
        stdDev: 0,
        percentiles: { p50: 0, p90: 0, p95: 0, p99: 0 },
      };
    }

    const mean = this.sum / count;

    let variance = 0;
    for (const v of this.values) {
      variance += (v - mean) ** 2;
    }
    variance /= count;

    if (!this.sorted) {
      this.values.sort((a, b) => a - b);
      this.sorted = true;
    }

    return {
      count,
      sum: this.sum,
      min: this.minVal,
      max: this.maxVal,
      mean,
      variance,
      stdDev: Math.sqrt(variance),
      percentiles: {
        p50: this.percentile(50),
        p90: this.percentile(90),
        p95: this.percentile(95),
        p99: this.percentile(99),
      },
    };
  }

  private percentile(p: number): number {
    if (this.values.length === 0) return 0;
    const index = Math.ceil((p / 100) * this.values.length) - 1;
    return this.values[Math.max(0, index)];
  }

  reset(): void {
    this.values = [];
    this.sum = 0;
    this.minVal = Infinity;
    this.maxVal = -Infinity;
    this.sorted = false;
  }
}

export class Counter {
  private value = 0;
  private config: MetricConfig;

  constructor(config: MetricConfig) {
    this.config = config;
  }

  increment(amount = 1): void {
    this.value += amount;
  }

  decrement(amount = 1): void {
    this.value -= amount;
  }

  getValue(): number {
    return this.value;
  }

  reset(): void {
    this.value = 0;
  }

  getConfig(): MetricConfig {
    return this.config;
  }
}

export class Gauge {
  private value = 0;
  private config: MetricConfig;

  constructor(config: MetricConfig) {
    this.config = config;
  }

  set(value: number): void {
    this.value = value;
  }

  increment(amount = 1): void {
    this.value += amount;
  }

  decrement(amount = 1): void {
    this.value -= amount;
  }

  getValue(): number {
    return this.value;
  }

  reset(): void {
    this.value = 0;
  }

  getConfig(): MetricConfig {
    return this.config;
  }
}

export class Histogram {
  private store: MetricValueStore;
  private config: MetricConfig;

  constructor(config: MetricConfig) {
    this.config = config;
    this.store = new MetricValueStore();
  }

  observe(value: number): void {
    this.store.add(value);
  }

  getStats(): HistogramStats {
    return this.store.getStats();
  }

  reset(): void {
    this.store.reset();
  }

  getConfig(): MetricConfig {
    return this.config;
  }
}

export class Timer {
  private store: MetricValueStore;
  private config: MetricConfig;
  private startTime: number | null = null;
  private activeTimers: Map<string, number> = new Map();

  constructor(config: MetricConfig) {
    this.config = config;
    this.store = new MetricValueStore();
  }

  start(label?: string): number {
    const now = performance.now();
    if (label) {
      this.activeTimers.set(label, now);
    } else {
      this.startTime = now;
    }
    return now;
  }

  stop(label?: string): TimerResult {
    const end = performance.now();
    let start: number;

    if (label) {
      start = this.activeTimers.get(label) ?? end;
      this.activeTimers.delete(label);
    } else {
      start = this.startTime ?? end;
      this.startTime = null;
    }

    const duration = end - start;
    this.store.add(duration);

    return { duration, start, end };
  }

  time<T>(fn: () => T): { result: T; timer: TimerResult } {
    const start = this.start();
    const result = fn();
    const timer = this.stop();
    return { result, timer };
  }

  async timeAsync<T>(fn: () => Promise<T>): Promise<{ result: T; timer: TimerResult }> {
    const start = this.start();
    const result = await fn();
    const timer = this.stop();
    return { result, timer };
  }

  getStats(): HistogramStats {
    return this.store.getStats();
  }

  reset(): void {
    this.store.reset();
    this.activeTimers.clear();
    this.startTime = null;
  }

  getConfig(): MetricConfig {
    return this.config;
  }
}

export class MetricsRegistry {
  private counters: Map<string, Counter> = new Map();
  private gauges: Map<string, Gauge> = new Map();
  private histograms: Map<string, Histogram> = new Map();
  private timers: Map<string, Timer> = new Map();
  private config: { name: string; enableHistory: boolean; maxHistorySize: number; flushInterval: number };
  private logger: ILogger;
  private history: Metric[] = [];
  private flushTimer?: ReturnType<typeof setInterval>;

  constructor(config: MetricsConfig = {}) {
    this.config = {
      name: config.name ?? 'MetricsRegistry',
      enableHistory: config.enableHistory ?? false,
      maxHistorySize: config.maxHistorySize ?? 10000,
      flushInterval: config.flushInterval ?? 60000,
    };
    this.logger = config.logger ?? createLogger({ name: this.config.name });

    if (this.config.flushInterval > 0) {
      this.flushTimer = setInterval(() => this.flush(), this.config.flushInterval);
    }
  }

  registerCounter(config: MetricConfig): Counter {
    const counter = new Counter({ ...config, type: 'counter' });
    this.counters.set(config.name, counter);
    return counter;
  }

  registerGauge(config: MetricConfig): Gauge {
    const gauge = new Gauge({ ...config, type: 'gauge' });
    this.gauges.set(config.name, gauge);
    return gauge;
  }

  registerHistogram(config: MetricConfig): Histogram {
    const histogram = new Histogram({ ...config, type: 'histogram' });
    this.histograms.set(config.name, histogram);
    return histogram;
  }

  registerTimer(config: MetricConfig): Timer {
    const timer = new Timer({ ...config, type: 'timer' });
    this.timers.set(config.name, timer);
    return timer;
  }

  counter(name: string): Counter | undefined {
    return this.counters.get(name);
  }

  gauge(name: string): Gauge | undefined {
    return this.gauges.get(name);
  }

  histogram(name: string): Histogram | undefined {
    return this.histograms.get(name);
  }

  timer(name: string): Timer | undefined {
    return this.timers.get(name);
  }

  increment(name: string, amount = 1): void {
    const counter = this.counters.get(name);
    if (counter) {
      counter.increment(amount);
      this.recordMetric(name, counter.getValue(), 'counter');
    }
  }

  decrement(name: string, amount = 1): void {
    const counter = this.counters.get(name);
    if (counter) {
      counter.decrement(amount);
      this.recordMetric(name, counter.getValue(), 'counter');
    }
  }

  setGauge(name: string, value: number): void {
    const gauge = this.gauges.get(name);
    if (gauge) {
      gauge.set(value);
      this.recordMetric(name, value, 'gauge');
    }
  }

  observe(name: string, value: number): void {
    const histogram = this.histograms.get(name);
    if (histogram) {
      histogram.observe(value);
      this.recordMetric(name, value, 'histogram');
    }
  }

  startTimer(name: string, label?: string): number | undefined {
    const timer = this.timers.get(name);
    return timer?.start(label);
  }

  stopTimer(name: string, label?: string): TimerResult | undefined {
    const timer = this.timers.get(name);
    if (timer) {
      const result = timer.stop(label);
      this.recordMetric(name, result.duration, 'timer');
      return result;
    }
    return undefined;
  }

  async measure<T>(name: string, fn: () => Promise<T>): Promise<T> {
    const timer = this.timers.get(name) ?? this.registerTimer({ name, type: 'timer' });
    const { result } = await timer.timeAsync(fn);
    this.recordMetric(name, timer.getStats().mean, 'timer');
    return result;
  }

  getAllMetrics(): Record<string, unknown> {
    const result: Record<string, unknown> = {};

    for (const [name, counter] of this.counters) {
      result[name] = counter.getValue();
    }

    for (const [name, gauge] of this.gauges) {
      result[name] = gauge.getValue();
    }

    for (const [name, histogram] of this.histograms) {
      result[`${name}_stats`] = histogram.getStats();
    }

    for (const [name, timer] of this.timers) {
      result[`${name}_stats`] = timer.getStats();
    }

    return result;
  }

  getHistory(): Metric[] {
    return [...this.history];
  }

  reset(name?: string): void {
    if (name) {
      this.counters.get(name)?.reset();
      this.gauges.get(name)?.reset();
      this.histograms.get(name)?.reset();
      this.timers.get(name)?.reset();
    } else {
      for (const counter of this.counters.values()) counter.reset();
      for (const gauge of this.gauges.values()) gauge.reset();
      for (const histogram of this.histograms.values()) histogram.reset();
      for (const timer of this.timers.values()) timer.reset();
      this.history = [];
    }
  }

  flush(): void {
    if (this.history.length === 0) return;

    const metrics = this.getAllMetrics();
    this.logger.info('Metrics flush', { metrics, historySize: this.history.length });
    this.history = [];
  }

  destroy(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }
    this.flush();
  }

  private recordMetric(name: string, value: MetricValue, type: Metric['type']): void {
    if (this.config.enableHistory) {
      this.history.push({
        name,
        value,
        timestamp: Date.now(),
        type,
      });

      if (this.history.length > this.config.maxHistorySize) {
        this.history.shift();
      }
    }
  }
}

export interface PerformanceMonitorConfig {
  name?: string;
  sampleInterval?: number;
  logger?: ILogger;
}

export interface PerformanceSnapshot {
  timestamp: number;
  memory?: {
    heapUsed: number;
    heapTotal: number;
    external: number;
    rss: number;
  };
  cpu?: {
    user: number;
    system: number;
  };
  eventLoop?: {
    delay: number;
  };
}

export class PerformanceMonitor {
  private config: { name: string; sampleInterval: number };
  private logger: ILogger;
  private registry: MetricsRegistry;
  private snapshots: PerformanceSnapshot[] = [];
  private sampleTimer?: ReturnType<typeof setInterval>;
  private lastCpuUsage?: NodeJS.CpuUsage;
  private lastHrTime?: [number, number];

  constructor(config: PerformanceMonitorConfig = {}) {
    this.config = {
      name: config.name ?? 'PerformanceMonitor',
      sampleInterval: config.sampleInterval ?? 1000,
    };
    this.logger = config.logger ?? createLogger({ name: this.config.name });
    this.registry = new MetricsRegistry({ name: `${this.config.name}_metrics` });

    this.registry.registerGauge({ name: 'memory_heap_used', unit: 'bytes', type: 'gauge' });
    this.registry.registerGauge({ name: 'memory_heap_total', unit: 'bytes', type: 'gauge' });
    this.registry.registerGauge({ name: 'memory_external', unit: 'bytes', type: 'gauge' });
    this.registry.registerGauge({ name: 'memory_rss', unit: 'bytes', type: 'gauge' });
    this.registry.registerGauge({ name: 'event_loop_delay', unit: 'ms', type: 'gauge' });
    this.registry.registerHistogram({ name: 'event_loop_delay_hist', unit: 'ms', type: 'histogram' });
  }

  start(): void {
    if (this.sampleTimer) return;

    this.lastCpuUsage = process.cpuUsage();
    this.lastHrTime = process.hrtime();

    this.sampleTimer = setInterval(() => this.sample(), this.config.sampleInterval);
    this.logger.info('Performance monitoring started');
  }

  stop(): void {
    if (this.sampleTimer) {
      clearInterval(this.sampleTimer);
      this.sampleTimer = undefined;
    }
    this.logger.info('Performance monitoring stopped');
  }

  getSnapshots(): PerformanceSnapshot[] {
    return [...this.snapshots];
  }

  getLatestSnapshot(): PerformanceSnapshot | undefined {
    return this.snapshots[this.snapshots.length - 1];
  }

  getMetrics(): MetricsRegistry {
    return this.registry;
  }

  private sample(): void {
    const snapshot: PerformanceSnapshot = {
      timestamp: Date.now(),
    };

    const memUsage = process.memoryUsage();
    snapshot.memory = {
      heapUsed: memUsage.heapUsed,
      heapTotal: memUsage.heapTotal,
      external: memUsage.external,
      rss: memUsage.rss,
    };

    this.registry.setGauge('memory_heap_used', memUsage.heapUsed);
    this.registry.setGauge('memory_heap_total', memUsage.heapTotal);
    this.registry.setGauge('memory_external', memUsage.external);
    this.registry.setGauge('memory_rss', memUsage.rss);

    if (this.lastHrTime) {
      const now = process.hrtime();
      const delay = (now[0] - this.lastHrTime[0]) * 1000 + (now[1] - this.lastHrTime[1]) / 1e6;
      const expectedDelay = this.config.sampleInterval;
      const eventLoopDelay = Math.max(0, delay - expectedDelay);

      snapshot.eventLoop = { delay: eventLoopDelay };
      this.registry.setGauge('event_loop_delay', eventLoopDelay);
      this.registry.observe('event_loop_delay_hist', eventLoopDelay);
      this.lastHrTime = now;
    }

    this.snapshots.push(snapshot);
    if (this.snapshots.length > 100) {
      this.snapshots.shift();
    }
  }
}

export function createMetricsRegistry(config?: MetricsConfig): MetricsRegistry {
  return new MetricsRegistry(config);
}

export function createPerformanceMonitor(config?: PerformanceMonitorConfig): PerformanceMonitor {
  return new PerformanceMonitor(config);
}

let globalMetrics: MetricsRegistry | null = null;

export function getGlobalMetrics(): MetricsRegistry {
  if (!globalMetrics) {
    globalMetrics = new MetricsRegistry({ name: 'GlobalMetrics' });
  }
  return globalMetrics;
}
