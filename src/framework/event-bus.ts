/**
 * Unified Event Bus - 统一事件总线
 *
 * 提供跨模块的事件通信机制
 * - 类型安全的事件发布/订阅
 * - 支持同步和异步事件处理
 * - 事件优先级和拦截器
 * - 事件溯源和重放
 *
 * @module Framework/EventBus
 * @version 1.0.0
 */

import { createLogger, type ILogger } from '../utils/logger.js';

export type EventHandler<T = unknown> = (event: T) => void | Promise<void>;
export type EventInterceptor<T = unknown> = (event: T) => T | Promise<T>;
export type EventFilter<T = unknown> = (event: T) => boolean;

export interface EventSubscription {
  id: string;
  eventType: string;
  handler: EventHandler;
  priority: number;
  once: boolean;
  filter?: EventFilter;
}

export interface EventBusConfig {
  name?: string;
  enableHistory?: boolean;
  maxHistorySize?: number;
  enableLogging?: boolean;
  asyncErrorHandler?: (error: Error, eventType: string) => void;
}

export interface EventRecord<T = unknown> {
  id: string;
  type: string;
  payload: T;
  timestamp: number;
  metadata?: Record<string, unknown>;
}

export const EVENT_PRIORITY = {
  HIGH: 100,
  NORMAL: 50,
  LOW: 10,
} as const;

export type EventPriority = typeof EVENT_PRIORITY;

export class EventBus {
  private subscriptions: Map<string, EventSubscription[]> = new Map();
  private interceptors: Map<string, EventInterceptor[]> = new Map();
  private history: EventRecord[] = [];
  private logger: ILogger;
  private config: Required<EventBusConfig>;
  private eventIdCounter = 0;

  constructor(config: EventBusConfig = {}) {
    this.config = {
      name: 'EventBus',
      enableHistory: config.enableHistory ?? false,
      maxHistorySize: config.maxHistorySize ?? 1000,
      enableLogging: config.enableLogging ?? true,
      asyncErrorHandler: config.asyncErrorHandler ?? ((error, type) => {
        this.logger.error(`Async handler error for event ${type}`, { error });
      }),
    };
    this.logger = createLogger({ name: this.config.name });
  }

  subscribe<T>(
    eventType: string,
    handler: EventHandler<T>,
    options: {
      priority?: number;
      once?: boolean;
      filter?: EventFilter<T>;
    } = {}
  ): string {
    const subscription: EventSubscription = {
      id: this.generateSubscriptionId(),
      eventType,
      handler: handler as EventHandler,
      priority: options.priority ?? EVENT_PRIORITY.NORMAL,
      once: options.once ?? false,
      filter: options.filter as EventFilter | undefined,
    };

    if (!this.subscriptions.has(eventType)) {
      this.subscriptions.set(eventType, []);
    }

    const subs = this.subscriptions.get(eventType)!;
    subs.push(subscription);
    subs.sort((a, b) => b.priority - a.priority);

    if (this.config.enableLogging) {
      this.logger.debug(`Subscribed to ${eventType}`, { subscriptionId: subscription.id });
    }

    return subscription.id;
  }

  subscribeOnce<T>(
    eventType: string,
    handler: EventHandler<T>,
    priority?: number
  ): string {
    return this.subscribe(eventType, handler, { once: true, priority });
  }

  unsubscribe(subscriptionId: string): boolean {
    for (const [eventType, subs] of this.subscriptions) {
      const index = subs.findIndex(s => s.id === subscriptionId);
      if (index !== -1) {
        subs.splice(index, 1);
        if (this.config.enableLogging) {
          this.logger.debug(`Unsubscribed from ${eventType}`, { subscriptionId });
        }
        return true;
      }
    }
    return false;
  }

  unsubscribeAll(eventType?: string): void {
    if (eventType) {
      this.subscriptions.delete(eventType);
    } else {
      this.subscriptions.clear();
    }
  }

  addInterceptor<T>(eventType: string, interceptor: EventInterceptor<T>): () => void {
    if (!this.interceptors.has(eventType)) {
      this.interceptors.set(eventType, []);
    }
    this.interceptors.get(eventType)!.push(interceptor as EventInterceptor);

    return () => {
      const interceptors = this.interceptors.get(eventType);
      if (interceptors) {
        const index = interceptors.indexOf(interceptor as EventInterceptor);
        if (index !== -1) {
          interceptors.splice(index, 1);
        }
      }
    };
  }

  async publish<T>(
    eventType: string,
    payload: T,
    metadata?: Record<string, unknown>
  ): Promise<void> {
    let processedPayload: T = payload;

    const interceptors = this.interceptors.get(eventType) || [];
    for (const interceptor of interceptors) {
      try {
        processedPayload = await interceptor(processedPayload) as T;
      } catch (error) {
        this.logger.error(`Interceptor error for ${eventType}`, { error });
      }
    }

    const record: EventRecord<T> = {
      id: this.generateEventId(),
      type: eventType,
      payload: processedPayload,
      timestamp: Date.now(),
      metadata,
    };

    if (this.config.enableHistory) {
      this.history.push(record);
      if (this.history.length > this.config.maxHistorySize) {
        this.history.shift();
      }
    }

    const subs = this.subscriptions.get(eventType) || [];
    const toRemove: string[] = [];

    for (const sub of subs) {
      if (sub.filter && !sub.filter(processedPayload)) {
        continue;
      }

      try {
        const result = sub.handler(processedPayload);
        if (result instanceof Promise) {
          result.catch(error => {
            this.config.asyncErrorHandler(error, eventType);
          });
        }
      } catch (error) {
        this.logger.error(`Handler error for ${eventType}`, { error, subscriptionId: sub.id });
      }

      if (sub.once) {
        toRemove.push(sub.id);
      }
    }

    for (const id of toRemove) {
      this.unsubscribe(id);
    }
  }

  publishSync<T>(eventType: string, payload: T, metadata?: Record<string, unknown>): void {
    let processedPayload: T = payload;

    const interceptors = this.interceptors.get(eventType) || [];
    for (const interceptor of interceptors) {
      try {
        const result = interceptor(processedPayload);
        if (!(result instanceof Promise)) {
          processedPayload = result as T;
        }
      } catch (error) {
        this.logger.error(`Interceptor error for ${eventType}`, { error });
      }
    }

    const record: EventRecord<T> = {
      id: this.generateEventId(),
      type: eventType,
      payload: processedPayload,
      timestamp: Date.now(),
      metadata,
    };

    if (this.config.enableHistory) {
      this.history.push(record);
      if (this.history.length > this.config.maxHistorySize) {
        this.history.shift();
      }
    }

    const subs = this.subscriptions.get(eventType) || [];
    const toRemove: string[] = [];

    for (const sub of subs) {
      if (sub.filter && !sub.filter(processedPayload)) {
        continue;
      }

      try {
        const result = sub.handler(processedPayload);
        if (result instanceof Promise) {
          this.logger.warn(`Async handler in sync publish for ${eventType}`);
        }
      } catch (error) {
        this.logger.error(`Handler error for ${eventType}`, { error, subscriptionId: sub.id });
      }

      if (sub.once) {
        toRemove.push(sub.id);
      }
    }

    for (const id of toRemove) {
      this.unsubscribe(id);
    }
  }

  getHistory(eventType?: string): EventRecord[] {
    if (eventType) {
      return this.history.filter(r => r.type === eventType);
    }
    return [...this.history];
  }

  replay(eventType: string, fromTimestamp?: number): void {
    const events = this.history.filter(r => {
      if (r.type !== eventType) return false;
      if (fromTimestamp && r.timestamp < fromTimestamp) return false;
      return true;
    });

    for (const event of events) {
      this.publish(event.type, event.payload, event.metadata);
    }
  }

  clearHistory(): void {
    this.history = [];
  }

  getSubscriptionCount(eventType?: string): number {
    if (eventType) {
      return this.subscriptions.get(eventType)?.length ?? 0;
    }
    let count = 0;
    for (const subs of this.subscriptions.values()) {
      count += subs.length;
    }
    return count;
  }

  hasSubscribers(eventType: string): boolean {
    const subs = this.subscriptions.get(eventType);
    return subs !== undefined && subs.length > 0;
  }

  private generateSubscriptionId(): string {
    return `sub_${Date.now()}_${++this.eventIdCounter}`;
  }

  private generateEventId(): string {
    return `evt_${Date.now()}_${++this.eventIdCounter}`;
  }
}

let globalEventBus: EventBus | null = null;

export function getGlobalEventBus(): EventBus {
  if (!globalEventBus) {
    globalEventBus = new EventBus({ name: 'GlobalEventBus', enableHistory: true });
  }
  return globalEventBus;
}

export function setGlobalEventBus(bus: EventBus): void {
  globalEventBus = bus;
}

export function createEventBus(config?: EventBusConfig): EventBus {
  return new EventBus(config);
}

export type { EventSubscription as Subscription };
