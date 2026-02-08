/**
 * Microkernel Architecture - 微内核架构
 *
 * 参考业界最佳实践 (Netflix/Google 级别)
 * 实现真正的微内核架构，核心只提供最基本的服务
 *
 * 核心特性：
 * 1. 服务注册与发现
 * 2. 事件总线
 * 3. 插件生命周期管理
 * 4. 依赖注入
 * 5. 动态服务加载/卸载
 *
 * @module Microkernel
 * @version 1.0.0
 * @standard Netflix/Google Level
 */

import { Logger, createLogger } from '../../utils/logger.js';

// ============================================================================
// Types
// ============================================================================

export interface Service {
  id: string;
  version: string;
  dependencies: string[];
  initialize(): Promise<void>;
  destroy(): Promise<void>;
  pause?(): Promise<void>;
  resume?(): Promise<void>;
}

export interface ServiceMetadata {
  id: string;
  version: string;
  dependencies: string[];
  status: 'pending' | 'initializing' | 'running' | 'paused' | 'destroyed' | 'error';
  instance?: Service;
  error?: Error;
}

export interface KernelEvent {
  type: string;
  timestamp: number;
  source: string;
  data: unknown;
}

export type EventHandler = (event: KernelEvent) => void | Promise<void>;

export interface MicrokernelConfig {
  enableHotReload?: boolean;
  enableCircuitBreaker?: boolean;
  maxServiceRestartAttempts?: number;
  serviceTimeout?: number;
}

// ============================================================================
// Dependency Graph
// ============================================================================

class DependencyGraph {
  private graph = new Map<string, Set<string>>();
  private inDegree = new Map<string, number>();

  addNode(id: string): void {
    if (!this.graph.has(id)) {
      this.graph.set(id, new Set());
      this.inDegree.set(id, 0);
    }
  }

  addEdge(from: string, to: string): void {
    this.addNode(from);
    this.addNode(to);

    if (!this.graph.get(from)!.has(to)) {
      this.graph.get(from)!.add(to);
      this.inDegree.set(to, (this.inDegree.get(to) || 0) + 1);
    }
  }

  topologicalSort(): string[] {
    const result: string[] = [];
    const queue: string[] = [];
    const inDegreeCopy = new Map(this.inDegree);

    // 找到所有入度为 0 的节点
    for (const [id, degree] of inDegreeCopy) {
      if (degree === 0) {
        queue.push(id);
      }
    }

    while (queue.length > 0) {
      const id = queue.shift()!;
      result.push(id);

      for (const neighbor of this.graph.get(id) || []) {
        const newDegree = (inDegreeCopy.get(neighbor) || 0) - 1;
        inDegreeCopy.set(neighbor, newDegree);

        if (newDegree === 0) {
          queue.push(neighbor);
        }
      }
    }

    // 检查是否有环
    if (result.length !== this.graph.size) {
      throw new Error('Circular dependency detected');
    }

    return result;
  }
}

// ============================================================================
// Event Bus
// ============================================================================

class EventBus {
  private handlers = new Map<string, Set<EventHandler>>();
  private logger: Logger;

  constructor(logger?: Logger) {
    this.logger = logger || createLogger({ name: 'EventBus' });
  }

  subscribe(type: string, handler: EventHandler): () => void {
    if (!this.handlers.has(type)) {
      this.handlers.set(type, new Set());
    }

    this.handlers.get(type)!.add(handler);

    return () => {
      this.handlers.get(type)?.delete(handler);
    };
  }

  async publish(event: KernelEvent): Promise<void> {
    await this.executeHandlers(event);
  }

  private async executeHandlers(event: KernelEvent): Promise<void> {
    const handlers = this.handlers.get(event.type);
    if (!handlers) return;

    await Promise.all(
      Array.from(handlers).map(async (handler) => {
        try {
          await handler(event);
        } catch (error) {
          this.logger.error(`Event handler error for ${event.type}`, { error });
        }
      })
    );
  }
}

// ============================================================================
// Circuit Breaker
// ============================================================================

interface CircuitBreakerState {
  status: 'closed' | 'open' | 'half-open';
  failureCount: number;
  successCount: number;
  lastFailureTime: number;
}

class CircuitBreaker {
  private state: CircuitBreakerState = {
    status: 'closed',
    failureCount: 0,
    successCount: 0,
    lastFailureTime: 0,
  };

  private readonly failureThreshold = 5;
  private readonly successThreshold = 3;
  private readonly timeout = 60000; // 1 minute

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state.status === 'open') {
      if (Date.now() - this.state.lastFailureTime > this.timeout) {
        this.state.status = 'half-open';
        this.state.successCount = 0;
      } else {
        throw new Error('Circuit breaker is open');
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

  private onSuccess(): void {
    this.state.failureCount = 0;

    if (this.state.status === 'half-open') {
      this.state.successCount++;
      if (this.state.successCount >= this.successThreshold) {
        this.state.status = 'closed';
        this.state.successCount = 0;
      }
    }
  }

  private onFailure(): void {
    this.state.failureCount++;
    this.state.lastFailureTime = Date.now();

    if (this.state.failureCount >= this.failureThreshold) {
      this.state.status = 'open';
    }
  }

  getState(): CircuitBreakerState {
    return { ...this.state };
  }
}

// ============================================================================
// Microkernel Implementation
// ============================================================================

export class Microkernel {
  private services = new Map<string, ServiceMetadata>();
  private eventBus: EventBus;
  private circuitBreakers = new Map<string, CircuitBreaker>();
  private config: Required<MicrokernelConfig>;
  private logger: Logger;

  constructor(config: MicrokernelConfig = {}) {
    this.config = {
      enableHotReload: false,
      enableCircuitBreaker: true,
      maxServiceRestartAttempts: 3,
      serviceTimeout: 30000,
      ...config,
    };
    this.logger = createLogger({ name: 'Microkernel' });
    this.eventBus = new EventBus(this.logger);
  }

  /**
   * 注册服务
   */
  registerService(service: Service): void {
    if (this.services.has(service.id)) {
      throw new Error(`Service ${service.id} is already registered`);
    }

    this.services.set(service.id, {
      id: service.id,
      version: service.version,
      dependencies: service.dependencies,
      status: 'pending',
      instance: service,
    });

    if (this.config.enableCircuitBreaker) {
      this.circuitBreakers.set(service.id, new CircuitBreaker());
    }

    this.eventBus.publish({
      type: 'service:registered',
      timestamp: Date.now(),
      source: 'microkernel',
      data: { serviceId: service.id, version: service.version },
    });
  }

  /**
   * 注销服务
   */
  async unregisterService(serviceId: string): Promise<void> {
    const metadata = this.services.get(serviceId);
    if (!metadata) {
      throw new Error(`Service ${serviceId} not found`);
    }

    // 检查是否有其他服务依赖此服务
    for (const [id, otherMetadata] of this.services) {
      if (otherMetadata.dependencies.includes(serviceId)) {
        throw new Error(`Service ${id} depends on ${serviceId}`);
      }
    }

    if (metadata.status === 'running' || metadata.status === 'paused') {
      await metadata.instance!.destroy();
    }

    this.services.delete(serviceId);
    this.circuitBreakers.delete(serviceId);

    this.eventBus.publish({
      type: 'service:unregistered',
      timestamp: Date.now(),
      source: 'microkernel',
      data: { serviceId },
    });
  }

  /**
   * 初始化所有服务
   */
  async initializeAll(): Promise<void> {
    const graph = new DependencyGraph();

    // 构建依赖图
    for (const [id, metadata] of this.services) {
      graph.addNode(id);
      for (const dep of metadata.dependencies) {
        graph.addEdge(dep, id); // dep 必须在 id 之前初始化
      }
    }

    // 拓扑排序（会自动检测循环依赖）
    const order = graph.topologicalSort();

    // 按顺序初始化服务
    for (const serviceId of order) {
      await this.initializeService(serviceId);
    }
  }

  /**
   * 初始化单个服务
   */
  async initializeService(serviceId: string): Promise<void> {
    const metadata = this.services.get(serviceId);
    if (!metadata) {
      throw new Error(`Service ${serviceId} not found`);
    }

    if (metadata.status !== 'pending') {
      return; // 已经初始化
    }

    // 检查依赖是否已初始化
    for (const depId of metadata.dependencies) {
      const depMetadata = this.services.get(depId);
      if (!depMetadata) {
        throw new Error(`Dependency ${depId} not found for service ${serviceId}`);
      }
      if (depMetadata.status !== 'running') {
        throw new Error(`Dependency ${depId} is not running`);
      }
    }

    metadata.status = 'initializing';

    try {
      const circuitBreaker = this.circuitBreakers.get(serviceId);

      if (circuitBreaker) {
        await circuitBreaker.execute(() =>
          this.withTimeout(
            metadata.instance!.initialize(),
            this.config.serviceTimeout,
            `Service ${serviceId} initialization timeout`
          )
        );
      } else {
        await this.withTimeout(
          metadata.instance!.initialize(),
          this.config.serviceTimeout,
          `Service ${serviceId} initialization timeout`
        );
      }

      metadata.status = 'running';

      this.eventBus.publish({
        type: 'service:initialized',
        timestamp: Date.now(),
        source: 'microkernel',
        data: { serviceId },
      });
    } catch (error) {
      metadata.status = 'error';
      metadata.error = error as Error;

      this.eventBus.publish({
        type: 'service:error',
        timestamp: Date.now(),
        source: 'microkernel',
        data: { serviceId, error: (error as Error).message },
      });

      throw error;
    }
  }

  /**
   * 获取服务实例
   */
  getService<T extends Service>(id: string): T {
    const metadata = this.services.get(id);
    if (!metadata || metadata.status !== 'running') {
      throw new Error(`Service ${id} is not available`);
    }
    return metadata.instance as T;
  }

  /**
   * 暂停服务
   */
  async pauseService(serviceId: string): Promise<void> {
    const metadata = this.services.get(serviceId);
    if (!metadata || metadata.status !== 'running') {
      throw new Error(`Service ${serviceId} is not running`);
    }

    if (metadata.instance!.pause) {
      await metadata.instance!.pause();
    }

    metadata.status = 'paused';

    this.eventBus.publish({
      type: 'service:paused',
      timestamp: Date.now(),
      source: 'microkernel',
      data: { serviceId },
    });
  }

  /**
   * 恢复服务
   */
  async resumeService(serviceId: string): Promise<void> {
    const metadata = this.services.get(serviceId);
    if (!metadata || metadata.status !== 'paused') {
      throw new Error(`Service ${serviceId} is not paused`);
    }

    if (metadata.instance!.resume) {
      await metadata.instance!.resume();
    }

    metadata.status = 'running';

    this.eventBus.publish({
      type: 'service:resumed',
      timestamp: Date.now(),
      source: 'microkernel',
      data: { serviceId },
    });
  }

  /**
   * 订阅事件
   */
  subscribeEvent(type: string, handler: EventHandler): () => void {
    return this.eventBus.subscribe(type, handler);
  }

  /**
   * 发布事件
   */
  async publishEvent(event: KernelEvent): Promise<void> {
    await this.eventBus.publish(event);
  }

  /**
   * 获取所有服务状态
   */
  getAllServiceStatus(): ServiceMetadata[] {
    return Array.from(this.services.values()).map((m) => ({
      ...m,
      instance: undefined, // 不暴露实例
    }));
  }

  /**
   * 销毁所有服务
   */
  async destroyAll(): Promise<void> {
    const order = Array.from(this.services.keys()).reverse();

    for (const serviceId of order) {
      const metadata = this.services.get(serviceId);
      if (metadata && (metadata.status === 'running' || metadata.status === 'paused')) {
        try {
          await metadata.instance!.destroy();
          metadata.status = 'destroyed';
        } catch (error) {
          this.logger.error(`Error destroying service ${serviceId}`, { error });
        }
      }
    }
  }

  private async withTimeout<T>(promise: Promise<T>, timeout: number, message: string): Promise<T> {
    return Promise.race([
      promise,
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error(message)), timeout)
      ),
    ]);
  }
}

// ============================================================================
// Factory Functions
// ============================================================================

export function createMicrokernel(config?: MicrokernelConfig): Microkernel {
  return new Microkernel(config);
}


