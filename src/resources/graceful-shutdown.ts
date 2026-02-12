/**
 * Graceful Shutdown Manager
 *
 * Manages graceful shutdown of the application with proper cleanup,
 * connection draining, and signal handling.
 * Compatible with both browser and Node.js environments.
 */

import { Logger, createLogger } from '../utils/logger.js';

// ============================================
// Types
// ============================================

export interface ShutdownConfig {
  timeout: number;
  signals: string[];
  hooks: Array<{
    name: string;
    priority: number;
    handler: () => Promise<void>;
  }>;
}

export interface ShutdownHook {
  name: string;
  handler: () => Promise<void>;
  priority: number;
}

export interface HealthCheck {
  name: string;
  check: () => Promise<boolean>;
}

export interface HealthStatus {
  status: 'healthy' | 'unhealthy' | 'degraded';
  checks: Array<{ name: string; healthy: boolean }>;
  timestamp: Date;
}

export interface ShutdownError extends Error {
  context: string;
}

// ============================================
// Default Configuration
// ============================================

export const DEFAULT_SHUTDOWN_CONFIG: ShutdownConfig = {
  timeout: 30000,
  signals: ['SIGTERM', 'SIGINT'],
  hooks: [],
};

// ============================================
// Graceful Shutdown Manager
// ============================================

export class GracefulShutdown {
  private config: ShutdownConfig;
  private hooks = new Map<string, ShutdownHook>();
  private healthChecks = new Map<string, HealthCheck>();
  private isShuttingDown = false;
  private signalHandlers: Array<() => void> = [];
  private logger: Logger;

  constructor(config: Partial<ShutdownConfig> = {}) {
    this.config = { ...DEFAULT_SHUTDOWN_CONFIG, ...config };
    this.logger = createLogger({ name: 'GracefulShutdown' });

    // Register configured hooks
    for (const hook of this.config.hooks) {
      this.register(hook.name, hook.handler, hook.priority);
    }
  }

  /**
   * Register shutdown hook
   */
  register(name: string, handler: () => Promise<void>, priority = 5): void {
    this.hooks.set(name, { name, handler, priority });
  }

  /**
   * Unregister shutdown hook
   */
  unregister(name: string): boolean {
    return this.hooks.delete(name);
  }

  /**
   * Register health check
   */
  registerHealthCheck(name: string, check: () => Promise<boolean>): void {
    this.healthChecks.set(name, { name, check });
  }

  /**
   * Unregister health check
   */
  unregisterHealthCheck(name: string): boolean {
    return this.healthChecks.delete(name);
  }

  /**
   * Setup signal handlers (Node.js only)
   */
  setupSignalHandlers(): void {
    if (typeof process === 'undefined') return;

    for (const signal of this.config.signals) {
      const handler = () => {
        this.shutdown(signal);
      };

      process.on(signal as NodeJS.Signals, handler);
      this.signalHandlers.push(() => process.off(signal as NodeJS.Signals, handler));
    }
  }

  /**
   * Remove signal handlers
   */
  removeSignalHandlers(): void {
    for (const remove of this.signalHandlers) {
      remove();
    }
    this.signalHandlers = [];
  }

  /**
   * Start graceful shutdown
   */
  async shutdown(signal?: string): Promise<void> {
    if (this.isShuttingDown) {
      this.logger.info('Shutdown already in progress...');
      return;
    }

    this.isShuttingDown = true;
    this.logger.info(signal ? `Received ${signal}, starting graceful shutdown...` : 'Starting graceful shutdown...');

    const startTime = Date.now();
    const timeout = this.config.timeout;

    try {
      // Execute hooks in priority order (highest first)
      const sortedHooks = Array.from(this.hooks.values()).sort((a, b) => b.priority - a.priority);

      for (const hook of sortedHooks) {
        const elapsed = Date.now() - startTime;
        const remaining = timeout - elapsed;

        if (remaining <= 0) {
          throw new Error(`Shutdown timeout exceeded while executing hook: ${hook.name}`);
        }

        this.logger.info(`Executing shutdown hook: ${hook.name} (priority: ${hook.priority})`);

        try {
          await this.executeWithTimeout(hook.handler, remaining, hook.name);
          this.logger.info(`Hook completed: ${hook.name}`);
        } catch (error) {
          this.logger.error(`Hook failed: ${hook.name}`, { error });
          // Continue with other hooks even if one fails
        }
      }

      const totalTime = Date.now() - startTime;
      this.logger.info(`Graceful shutdown completed in ${totalTime}ms`);
    } catch (error) {
      const totalTime = Date.now() - startTime;
      this.logger.error(`Graceful shutdown failed after ${totalTime}ms`, { error });
      throw error;
    }
  }

  /**
   * Check if shutdown is in progress
   */
  isShutdownInProgress(): boolean {
    return this.isShuttingDown;
  }

  /**
   * Check system health
   */
  async isHealthy(): Promise<HealthStatus> {
    const results: Array<{ name: string; healthy: boolean }> = [];

    const checkPromises = Array.from(this.healthChecks.values()).map(async (healthCheck) => {
      try {
        const healthy = await healthCheck.check();
        return { name: healthCheck.name, healthy };
      } catch (error) {
        this.logger.error(`Health check ${healthCheck.name} failed`, { error });
        return { name: healthCheck.name, healthy: false };
      }
    });

    const checkResults = await Promise.all(checkPromises);
    results.push(...checkResults);

    const unhealthy = results.filter((r) => !r.healthy);
    const status = unhealthy.length === 0 ? 'healthy' : unhealthy.length > results.length / 2 ? 'unhealthy' : 'degraded';

    return {
      status,
      checks: results,
      timestamp: new Date(),
    };
  }

  /**
   * Readiness probe (for Kubernetes)
   */
  async readinessProbe(): Promise<boolean> {
    return !this.isShuttingDown;
  }

  /**
   * Liveness probe (for Kubernetes)
   */
  async livenessProbe(): Promise<boolean> {
    if (this.isShuttingDown) return false;

    const health = await this.isHealthy();
    const criticalUnhealthy = health.checks.filter((c) => !c.healthy);

    // Consider unhealthy if more than half of checks fail
    return criticalUnhealthy.length <= health.checks.length / 2;
  }

  /**
   * Get shutdown status
   */
  getStatus(): {
    isShuttingDown: boolean;
    hookCount: number;
    healthCheckCount: number;
  } {
    return {
      isShuttingDown: this.isShuttingDown,
      hookCount: this.hooks.size,
      healthCheckCount: this.healthChecks.size,
    };
  }

  /**
   * Reset shutdown state (for testing)
   */
  reset(): void {
    this.isShuttingDown = false;
  }

  // ============================================
  // Private Methods
  // ============================================

  private async executeWithTimeout<T>(fn: () => Promise<T>, timeout: number, context: string): Promise<T> {
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error(`Timeout after ${timeout}ms: ${context}`));
      }, timeout);

      fn()
        .then((result) => {
          clearTimeout(timeoutId);
          resolve(result);
        })
        .catch((error) => {
          clearTimeout(timeoutId);
          reject(error);
        });
    });
  }
}

// ============================================
// Resource Manager
// ============================================

export interface ResourceLimits {
  maxMemoryMB: number;
  maxCpuPercent: number;
  maxConcurrentRequests: number;
  maxConnections: number;
}

export interface ResourceUsage {
  memoryMB: number;
  cpuPercent: number;
  activeRequests: number;
  activeConnections: number;
}

export class ResourceManager {
  private limits: ResourceLimits;
  private usage: ResourceUsage = {
    memoryMB: 0,
    cpuPercent: 0,
    activeRequests: 0,
    activeConnections: 0,
  };
  private requestQueue: Array<{
    id: string;
    resolve: () => void;
    reject: (error: Error) => void;
    timestamp: number;
  }> = [];
  private monitoringInterval?: ReturnType<typeof setInterval>;
  private logger: Logger;

  constructor(limits: Partial<ResourceLimits> = {}) {
    this.limits = {
      maxMemoryMB: 512,
      maxCpuPercent: 80,
      maxConcurrentRequests: 100,
      maxConnections: 50,
      ...limits,
    };
    this.logger = createLogger({ name: 'ResourceManager' });
  }

  /**
   * Start resource monitoring
   */
  startMonitoring(intervalMs = 5000): void {
    this.monitoringInterval = setInterval(() => {
      this.updateUsage();
      this.enforceLimits();
    }, intervalMs);
  }

  /**
   * Stop resource monitoring
   */
  stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = undefined;
    }
  }

  /**
   * Acquire resource for request
   */
  async acquireRequest(): Promise<{ release: () => void }> {
    // Check if we can accept more requests
    if (this.usage.activeRequests >= this.limits.maxConcurrentRequests) {
      // Queue the request
      return new Promise((resolve, reject) => {
        const id = this.generateId();
        const timeout = setTimeout(() => {
          const index = this.requestQueue.findIndex((r) => r.id === id);
          if (index > -1) {
            this.requestQueue.splice(index, 1);
            reject(new Error('Request timeout waiting for resources'));
          }
        }, 30000);

        this.requestQueue.push({
          id,
          resolve: () => {
            clearTimeout(timeout);
            resolve({ release: () => this.releaseRequest() });
          },
          reject: (error) => {
            clearTimeout(timeout);
            reject(error);
          },
          timestamp: Date.now(),
        });
      });
    }

    this.usage.activeRequests++;
    return { release: () => this.releaseRequest() };
  }

  /**
   * Check if resources are available
   */
  hasAvailableResources(): boolean {
    return (
      this.usage.activeRequests < this.limits.maxConcurrentRequests &&
      this.usage.memoryMB < this.limits.maxMemoryMB &&
      this.usage.activeConnections < this.limits.maxConnections
    );
  }

  /**
   * Get current resource usage
   */
  getUsage(): ResourceUsage {
    this.updateUsage();
    return { ...this.usage };
  }

  /**
   * Get resource limits
   */
  getLimits(): ResourceLimits {
    return { ...this.limits };
  }

  /**
   * Update resource limits
   */
  setLimits(limits: Partial<ResourceLimits>): void {
    this.limits = { ...this.limits, ...limits };
  }

  /**
   * Get resource status
   */
  getStatus(): {
    usage: ResourceUsage;
    limits: ResourceLimits;
    utilization: {
      memory: number;
      cpu: number;
      requests: number;
      connections: number;
    };
  } {
    this.updateUsage();
    return {
      usage: { ...this.usage },
      limits: { ...this.limits },
      utilization: {
        memory: this.usage.memoryMB / this.limits.maxMemoryMB,
        cpu: this.usage.cpuPercent / this.limits.maxCpuPercent,
        requests: this.usage.activeRequests / this.limits.maxConcurrentRequests,
        connections: this.usage.activeConnections / this.limits.maxConnections,
      },
    };
  }

  // ============================================
  // Private Methods
  // ============================================

  private updateUsage(): void {
    // Update memory usage
    if (typeof process !== 'undefined' && process.memoryUsage) {
      this.usage.memoryMB = process.memoryUsage().heapUsed / 1024 / 1024;
    }

    // CPU usage would require more complex tracking
    // For now, we use a placeholder
    this.usage.cpuPercent = 0;
  }

  private enforceLimits(): void {
    // Process queued requests if resources are available
    while (this.requestQueue.length > 0 && this.hasAvailableResources()) {
      const request = this.requestQueue.shift();
      if (request) {
        request.resolve();
      }
    }

    // Log warnings if near limits
    if (this.usage.memoryMB > this.limits.maxMemoryMB * 0.9) {
      this.logger.warn(`Memory usage critical: ${this.usage.memoryMB.toFixed(2)}MB / ${this.limits.maxMemoryMB}MB`);
    }

    if (this.usage.activeRequests > this.limits.maxConcurrentRequests * 0.9) {
      this.logger.warn(`Request capacity critical: ${this.usage.activeRequests} / ${this.limits.maxConcurrentRequests}`);
    }
  }

  private releaseRequest(): void {
    this.usage.activeRequests = Math.max(0, this.usage.activeRequests - 1);

    // Process next queued request
    if (this.requestQueue.length > 0 && this.hasAvailableResources()) {
      const request = this.requestQueue.shift();
      if (request) {
        request.resolve();
      }
    }
  }

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

// ============================================
// Export
// ============================================

export { GracefulShutdown as default };
