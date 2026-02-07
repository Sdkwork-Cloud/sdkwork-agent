/**
 * Metrics and Performance Monitoring System
 *
 * Provides comprehensive metrics collection, aggregation, and reporting.
 * Compatible with Prometheus, OpenTelemetry, and custom dashboards.
 */

// ============================================
// Types
// ============================================

export type MetricType = 'counter' | 'gauge' | 'histogram' | 'summary';

export interface MetricValue {
  value: number;
  timestamp: number;
  labels?: Record<string, string>;
}

export interface HistogramBucket {
  upperBound: number;
  count: number;
}

export interface MetricDefinition {
  name: string;
  type: MetricType;
  description: string;
  unit?: string;
  labels?: string[];
  buckets?: number[]; // For histogram
}

export interface MetricSnapshot {
  definition: MetricDefinition;
  values: MetricValue[];
  histogramBuckets?: HistogramBucket[];
  sum?: number;
  count?: number;
  min?: number;
  max?: number;
  avg?: number;
}

export interface PerformanceMetrics {
  // Timing
  decisionTime: number;
  executionTime: number;
  llmResponseTime: number;
  embeddingTime: number;
  searchTime: number;
  
  // Throughput
  requestsPerSecond: number;
  tokensPerSecond: number;
  
  // Quality
  successRate: number;
  cacheHitRate: number;
  errorRate: number;
  
  // Resources
  memoryUsage: number;
  cpuUsage: number;
  activeConnections: number;
}

// ============================================
// Metric Collectors
// ============================================

abstract class MetricCollector {
  protected definition: MetricDefinition;
  protected values: MetricValue[] = [];
  protected maxHistory: number = 10000;

  constructor(definition: MetricDefinition) {
    this.definition = definition;
  }

  abstract record(value: number, labels?: Record<string, string>): void;
  abstract getSnapshot(): MetricSnapshot;

  protected addValue(value: number, labels?: Record<string, string>): void {
    this.values.push({
      value,
      timestamp: Date.now(),
      labels,
    });

    // Keep only recent values
    if (this.values.length > this.maxHistory) {
      this.values = this.values.slice(-this.maxHistory);
    }
  }

  protected calculateStats(): { min: number; max: number; avg: number; sum: number; count: number } {
    if (this.values.length === 0) {
      return { min: 0, max: 0, avg: 0, sum: 0, count: 0 };
    }

    const values = this.values.map(v => v.value);
    const sum = values.reduce((a, b) => a + b, 0);
    const count = values.length;
    const min = Math.min(...values);
    const max = Math.max(...values);
    const avg = sum / count;

    return { min, max, avg, sum, count };
  }

  clear(): void {
    this.values = [];
  }
}

class CounterCollector extends MetricCollector {
  private counter = 0;

  record(value: number = 1, labels?: Record<string, string>): void {
    this.counter += value;
    this.addValue(this.counter, labels);
  }

  getSnapshot(): MetricSnapshot {
    return {
      definition: this.definition,
      values: [{ value: this.counter, timestamp: Date.now() }],
    };
  }

  increment(labels?: Record<string, string>): void {
    this.record(1, labels);
  }
}

class GaugeCollector extends MetricCollector {
  private currentValue = 0;

  record(value: number, labels?: Record<string, string>): void {
    this.currentValue = value;
    this.addValue(value, labels);
  }

  getSnapshot(): MetricSnapshot {
    const stats = this.calculateStats();
    return {
      definition: this.definition,
      values: [{ value: this.currentValue, timestamp: Date.now() }],
      ...stats,
    };
  }

  set(value: number, labels?: Record<string, string>): void {
    this.record(value, labels);
  }

  increment(value: number = 1, labels?: Record<string, string>): void {
    this.currentValue += value;
    this.record(this.currentValue, labels);
  }

  decrement(value: number = 1, labels?: Record<string, string>): void {
    this.currentValue -= value;
    this.record(this.currentValue, labels);
  }
}

class HistogramCollector extends MetricCollector {
  private buckets: HistogramBucket[];
  private sum = 0;
  private count = 0;

  constructor(definition: MetricDefinition) {
    super(definition);
    const bucketBounds = definition.buckets || [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10];
    this.buckets = bucketBounds.map(upperBound => ({ upperBound, count: 0 }));
  }

  record(value: number, labels?: Record<string, string>): void {
    this.sum += value;
    this.count++;

    // Update buckets
    for (const bucket of this.buckets) {
      if (value <= bucket.upperBound) {
        bucket.count++;
      }
    }

    this.addValue(value, labels);
  }

  getSnapshot(): MetricSnapshot {
    return {
      definition: this.definition,
      values: this.values.slice(-100), // Last 100 values
      histogramBuckets: this.buckets,
      sum: this.sum,
      count: this.count,
    };
  }

  observe(value: number, labels?: Record<string, string>): void {
    this.record(value, labels);
  }

  getPercentile(percentile: number): number {
    if (this.values.length === 0) return 0;
    
    const sorted = [...this.values].sort((a, b) => a.value - b.value);
    const index = Math.ceil((percentile / 100) * sorted.length) - 1;
    return sorted[Math.max(0, index)].value;
  }
}

class SummaryCollector extends MetricCollector {
  private quantiles: number[];

  constructor(definition: MetricDefinition, quantiles: number[] = [0.5, 0.9, 0.95, 0.99]) {
    super(definition);
    this.quantiles = quantiles;
  }

  record(value: number, labels?: Record<string, string>): void {
    this.addValue(value, labels);
  }

  getSnapshot(): MetricSnapshot {
    const stats = this.calculateStats();
    return {
      definition: this.definition,
      values: this.values,
      ...stats,
    };
  }

  getQuantile(q: number): number {
    if (this.values.length === 0) return 0;
    
    const sorted = [...this.values].sort((a, b) => a.value - b.value);
    const index = Math.ceil(q * sorted.length) - 1;
    return sorted[Math.max(0, index)].value;
  }

  getQuantiles(): Record<string, number> {
    const result: Record<string, number> = {};
    for (const q of this.quantiles) {
      result[`p${Math.round(q * 100)}`] = this.getQuantile(q);
    }
    return result;
  }
}

// ============================================
// Metrics Registry
// ============================================

export class MetricsRegistry {
  private collectors = new Map<string, MetricCollector>();
  private static instance: MetricsRegistry;

  static getInstance(): MetricsRegistry {
    if (!MetricsRegistry.instance) {
      MetricsRegistry.instance = new MetricsRegistry();
    }
    return MetricsRegistry.instance;
  }

  register(definition: MetricDefinition): MetricCollector {
    if (this.collectors.has(definition.name)) {
      throw new Error(`Metric ${definition.name} already registered`);
    }

    let collector: MetricCollector;
    switch (definition.type) {
      case 'counter':
        collector = new CounterCollector(definition);
        break;
      case 'gauge':
        collector = new GaugeCollector(definition);
        break;
      case 'histogram':
        collector = new HistogramCollector(definition);
        break;
      case 'summary':
        collector = new SummaryCollector(definition);
        break;
      default:
        throw new Error(`Unknown metric type: ${definition.type}`);
    }

    this.collectors.set(definition.name, collector);
    return collector;
  }

  get(name: string): MetricCollector | undefined {
    return this.collectors.get(name);
  }

  counter(name: string): CounterCollector {
    const collector = this.get(name);
    if (!collector) {
      return this.register({
        name,
        type: 'counter',
        description: `Counter metric: ${name}`,
      }) as CounterCollector;
    }
    return collector as CounterCollector;
  }

  gauge(name: string): GaugeCollector {
    const collector = this.get(name);
    if (!collector) {
      return this.register({
        name,
        type: 'gauge',
        description: `Gauge metric: ${name}`,
      }) as GaugeCollector;
    }
    return collector as GaugeCollector;
  }

  histogram(name: string, buckets?: number[]): HistogramCollector {
    const collector = this.get(name);
    if (!collector) {
      return this.register({
        name,
        type: 'histogram',
        description: `Histogram metric: ${name}`,
        buckets,
      }) as HistogramCollector;
    }
    return collector as HistogramCollector;
  }

  summary(name: string): SummaryCollector {
    const collector = this.get(name);
    if (!collector) {
      return this.register({
        name,
        type: 'summary',
        description: `Summary metric: ${name}`,
      }) as SummaryCollector;
    }
    return collector as SummaryCollector;
  }

  getAllSnapshots(): MetricSnapshot[] {
    return Array.from(this.collectors.values()).map(c => c.getSnapshot());
  }

  clear(): void {
    this.collectors.clear();
  }

  // Prometheus format export
  toPrometheusFormat(): string {
    const lines: string[] = [];

    for (const [name, collector] of this.collectors) {
      const snapshot = collector.getSnapshot();
      const def = snapshot.definition;

      lines.push(`# HELP ${name} ${def.description}`);
      lines.push(`# TYPE ${name} ${def.type}`);

      switch (def.type) {
        case 'counter':
        case 'gauge':
          lines.push(`${name} ${snapshot.values[0]?.value || 0}`);
          break;
        case 'histogram':
          if (snapshot.histogramBuckets) {
            for (const bucket of snapshot.histogramBuckets) {
              lines.push(`${name}_bucket{le="${bucket.upperBound}"} ${bucket.count}`);
            }
            lines.push(`${name}_bucket{le="+Inf"} ${snapshot.count || 0}`);
            lines.push(`${name}_sum ${snapshot.sum || 0}`);
            lines.push(`${name}_count ${snapshot.count || 0}`);
          }
          break;
        case 'summary':
          lines.push(`${name}_sum ${snapshot.sum || 0}`);
          lines.push(`${name}_count ${snapshot.count || 0}`);
          break;
      }

      lines.push('');
    }

    return lines.join('\n');
  }

  // JSON format export
  toJSON(): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    for (const [name, collector] of this.collectors) {
      result[name] = collector.getSnapshot();
    }
    return result;
  }

  // Get snapshot of all metrics
  getSnapshot(): Record<string, unknown> {
    return this.toJSON();
  }
}

// ============================================
// Metrics Collector
// ============================================

export class MetricsCollector {
  private registry: MetricsRegistry;

  constructor(registry: MetricsRegistry = MetricsRegistry.getInstance()) {
    this.registry = registry;
  }

  counter(name: string) {
    return this.registry.counter(name);
  }

  gauge(name: string) {
    return this.registry.gauge(name);
  }

  histogram(name: string, buckets?: number[]) {
    return this.registry.histogram(name, buckets);
  }

  getSnapshot() {
    return this.registry.getSnapshot();
  }
}

// ============================================
// Performance Monitor
// ============================================

export class PerformanceMonitor {
  private registry: MetricsRegistry;
  private startTimes = new Map<string, number>();

  constructor(registry: MetricsRegistry = MetricsRegistry.getInstance()) {
    this.registry = registry;
    this.initializeDefaultMetrics();
  }

  private initializeDefaultMetrics(): void {
    // Decision metrics
    this.registry.histogram('agent_decision_duration_ms', [10, 50, 100, 250, 500, 1000, 2500, 5000]);
    this.registry.counter('agent_decisions_total');
    this.registry.counter('agent_decision_errors_total');

    // Execution metrics
    this.registry.histogram('agent_execution_duration_ms', [10, 50, 100, 250, 500, 1000, 2500, 5000]);
    this.registry.counter('agent_executions_total');
    this.registry.counter('agent_execution_errors_total');

    // LLM metrics
    this.registry.histogram('llm_request_duration_ms', [100, 250, 500, 1000, 2500, 5000, 10000]);
    this.registry.counter('llm_requests_total');
    this.registry.counter('llm_tokens_total');
    this.registry.counter('llm_errors_total');

    // Memory metrics
    this.registry.histogram('embedding_duration_ms', [10, 25, 50, 100, 250, 500]);
    this.registry.histogram('vector_search_duration_ms', [1, 5, 10, 25, 50, 100]);
    this.registry.counter('vector_searches_total');
    this.registry.gauge('vector_db_size');

    // Security metrics
    this.registry.counter('security_violations_total');
    this.registry.counter('injection_attempts_total');
    this.registry.histogram('security_check_duration_ms', [1, 5, 10, 25, 50]);

    // Cache metrics
    this.registry.counter('cache_hits_total');
    this.registry.counter('cache_misses_total');
    this.registry.gauge('cache_size');

    // System metrics
    this.registry.gauge('system_memory_usage_bytes');
    this.registry.gauge('system_cpu_usage_percent');
  }

  startTimer(operation: string): () => void {
    const startTime = performance.now();
    this.startTimes.set(operation, startTime);

    return () => {
      const duration = performance.now() - startTime;
      this.recordDuration(operation, duration);
      this.startTimes.delete(operation);
    };
  }

  recordDuration(operation: string, durationMs: number): void {
    const metricName = `${operation}_duration_ms`;
    this.registry.histogram(metricName).observe(durationMs);
  }

  recordCounter(metricName: string, value: number = 1): void {
    const counter = this.registry.counter(metricName);
    for (let i = 0; i < value; i++) {
      counter.increment();
    }
  }

  recordGauge(metricName: string, value: number): void {
    this.registry.gauge(metricName).set(value);
  }

  async measure<T>(
    operation: string,
    fn: () => Promise<T>,
    onError?: (error: Error) => void
  ): Promise<T> {
    const endTimer = this.startTimer(operation);
    const counterName = `${operation.replace('_duration_ms', '')}_total`;

    try {
      const result = await fn();
      this.registry.counter(counterName).increment();
      return result;
    } catch (error) {
      const errorCounterName = `${operation.replace('_duration_ms', '')}_errors_total`;
      this.registry.counter(errorCounterName).increment();
      if (onError) {
        onError(error as Error);
      }
      throw error;
    } finally {
      endTimer();
    }
  }

  getMetrics(): PerformanceMetrics {
    const snapshots = this.registry.getAllSnapshots();
    const metrics: Partial<PerformanceMetrics> = {};

    for (const snapshot of snapshots) {
      const name = snapshot.definition.name;
      if (name.includes('duration')) {
        const key = name.replace('_duration_ms', 'Time') as keyof PerformanceMetrics;
        metrics[key] = snapshot.avg || 0;
      }
    }

    return metrics as PerformanceMetrics;
  }

  getReport(): string {
    const snapshots = this.registry.getAllSnapshots();
    const lines: string[] = ['=== Performance Report ===', ''];

    for (const snapshot of snapshots) {
      const def = snapshot.definition;
      lines.push(`${def.name} (${def.type})`);
      lines.push(`  Description: ${def.description}`);

      if (snapshot.count !== undefined) {
        lines.push(`  Count: ${snapshot.count}`);
      }
      if (snapshot.avg !== undefined) {
        lines.push(`  Average: ${snapshot.avg.toFixed(2)}`);
      }
      if (snapshot.min !== undefined) {
        lines.push(`  Min: ${snapshot.min.toFixed(2)}`);
      }
      if (snapshot.max !== undefined) {
        lines.push(`  Max: ${snapshot.max.toFixed(2)}`);
      }

      lines.push('');
    }

    return lines.join('\n');
  }
}

// ============================================
// Global Instance
// ============================================

export const metricsRegistry = MetricsRegistry.getInstance();
export const performanceMonitor = new PerformanceMonitor();

// ============================================
// Decorators
// ============================================

export function MeasurePerformance(operationName?: string) {
  return function (
    target: unknown,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;
    const name = operationName || `${target?.constructor?.name}_${propertyKey}`;

    descriptor.value = async function (...args: unknown[]) {
      return performanceMonitor.measure(name, () => originalMethod.apply(this, args));
    };

    return descriptor;
  };
}

export function createMetricsCollector() {
  return new MetricsCollector();
}

export default {
  MetricsRegistry,
  PerformanceMonitor,
  metricsRegistry,
  performanceMonitor,
  createMetricsCollector,
};
