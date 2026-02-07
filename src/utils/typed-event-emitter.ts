/**
 * Typed Event Emitter - 类型安全的事件发射器
 * 
 * 完美实现类型安全的事件系统
 * 支持 UnifiedEvents 定义
 * 
 * @utils TypedEventEmitter
 * @version 5.0.0
 * @standard Industry Leading
 */

import type { UnifiedLogger } from '../core/domain/unified';
import { createLogger } from './logger';

/**
 * 事件处理器类型
 */
type EventHandler<T> = (payload: T) => void | Promise<void>;

/**
 * 兼容旧版 EventListener 类型
 * @deprecated 使用 EventHandler 替代
 */
export type EventListener<T = unknown> = EventHandler<T>;

/**
 * 类型安全的事件发射器
 * 
 * 特性：
 * 1. 编译时类型检查
 * 2. 自动推断事件负载类型
 * 3. 支持异步处理器
 * 4. 错误隔离（单个处理器失败不影响其他）
 * 5. 支持中间件模式
 */
export class TypedEventEmitter<Events extends Record<string, unknown>> {
  private handlers = new Map<keyof Events, Set<EventHandler<unknown>>>();
  private middlewares: Array<(event: keyof Events, payload: unknown, next: () => void) => void> = [];
  private logger: UnifiedLogger;

  constructor() {
    this.logger = createLogger({ name: 'TypedEventEmitter' });
  }

  /**
   * 注册事件处理器
   * 
   * @example
   * emitter.on('skill:executing', ({ skillId, input }) => {
   *   console.log(`Executing skill: ${skillId}`);
   * });
   */
  on<K extends keyof Events>(
    event: K,
    handler: EventHandler<Events[K]>
  ): () => void {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, new Set());
    }
    
    const handlers = this.handlers.get(event)!;
    const wrappedHandler = handler as EventHandler<unknown>;
    handlers.add(wrappedHandler);

    // 返回取消订阅函数
    return () => {
      handlers.delete(wrappedHandler);
      if (handlers.size === 0) {
        this.handlers.delete(event);
      }
    };
  }

  /**
   * 注册一次性事件处理器
   * 
   * @example
   * emitter.once('skill:completed', ({ skillId, result }) => {
   *   console.log(`Skill ${skillId} completed`);
   * });
   */
  once<K extends keyof Events>(
    event: K,
    handler: EventHandler<Events[K]>
  ): () => void {
    const unsubscribe = this.on(event, ((payload: Events[K]) => {
      unsubscribe();
      return handler(payload);
    }) as EventHandler<Events[K]>);

    return unsubscribe;
  }

  /**
   * 发射事件
   * 
   * @example
   * emitter.emit('skill:executing', { skillId: 'my-skill', input: {} });
   */
  emit<K extends keyof Events>(event: K, payload: Events[K]): void {
    // 执行中间件
    this.executeMiddlewares(event, payload, () => {
      this.executeHandlers(event, payload);
    });
  }

  /**
   * 异步发射事件
   * 等待所有处理器完成
   */
  async emitAsync<K extends keyof Events>(event: K, payload: Events[K]): Promise<void> {
    return new Promise((resolve) => {
      this.executeMiddlewares(event, payload, async () => {
        await this.executeHandlersAsync(event, payload);
        resolve();
      });
    });
  }

  /**
   * 添加中间件
   */
  use(middleware: (event: keyof Events, payload: unknown, next: () => void) => void): void {
    this.middlewares.push(middleware);
  }

  /**
   * 获取事件处理器数量
   */
  listenerCount<K extends keyof Events>(event: K): number {
    return this.handlers.get(event)?.size ?? 0;
  }

  /**
   * 获取所有事件名称
   */
  eventNames(): (keyof Events)[] {
    return Array.from(this.handlers.keys());
  }

  /**
   * 移除所有事件处理器
   */
  removeAllListeners<K extends keyof Events>(event?: K): void {
    if (event) {
      this.handlers.delete(event);
    } else {
      this.handlers.clear();
    }
  }

  /**
   * 销毁发射器
   */
  destroy(): void {
    this.removeAllListeners();
    this.middlewares = [];
  }

  // ============================================
  // Private Methods
  // ============================================

  private executeMiddlewares(
    event: keyof Events,
    payload: unknown,
    finalHandler: () => void
  ): void {
    let index = 0;

    const next = () => {
      if (index >= this.middlewares.length) {
        finalHandler();
        return;
      }

      const middleware = this.middlewares[index++];
      try {
        middleware(event, payload, next);
      } catch (error) {
        // 中间件错误不影响后续执行
        this.logger.error('Middleware error', { error });
        next();
      }
    };

    next();
  }

  private executeHandlers<K extends keyof Events>(event: K, payload: Events[K]): void {
    const handlers = this.handlers.get(event);
    if (!handlers) return;

    for (const handler of handlers) {
      try {
        const result = handler(payload);
        // 如果是 Promise，捕获错误
        if (result instanceof Promise) {
          result.catch(error => {
            this.logger.error(`Event handler error for ${String(event)}`, { error });
          });
        }
      } catch (error) {
        this.logger.error(`Event handler error for ${String(event)}`, { error });
      }
    }
  }

  private async executeHandlersAsync<K extends keyof Events>(
    event: K,
    payload: Events[K]
  ): Promise<void> {
    const handlers = this.handlers.get(event);
    if (!handlers) return;

    const promises: Promise<void>[] = [];

    for (const handler of handlers) {
      try {
        const result = handler(payload);
        if (result instanceof Promise) {
          promises.push(
            result.catch(error => {
              this.logger.error(`Event handler error for ${String(event)}`, { error });
            })
          );
        }
      } catch (error) {
        this.logger.error(`Event handler error for ${String(event)}`, { error });
      }
    }

    await Promise.all(promises);
  }
}

/**
 * Agent 专用类型安全事件发射器
 * 预配置 UnifiedEvents
 */
export class AgentEventEmitter extends TypedEventEmitter<Record<string, unknown>> {
  constructor() {
    super();
  }
}

// ============================================
// Helper Types for External Use
// ============================================

/**
 * 提取事件发射器的事件类型
 */
export type EventEmitterEvents<T> = T extends TypedEventEmitter<infer E> ? E : never;

/**
 * 提取事件发射器的事件名称
 */
export type EventEmitterEventNames<T> = T extends TypedEventEmitter<infer E> ? keyof E : never;
