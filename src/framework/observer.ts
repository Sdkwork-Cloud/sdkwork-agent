/**
 * Observer Pattern Enhancement - 观察者模式增强
 *
 * 提供强大的观察者模式实现
 * - 类型安全的观察者
 * - 过滤和转换
 * - 批量通知
 * - 生命周期管理
 *
 * @module Framework/Observer
 * @version 1.0.0
 */

import { createLogger, type ILogger } from '../utils/logger.js';

export type ObserverId = string;

export interface Observer<T = unknown> {
  id: ObserverId;
  notify(data: T): void | Promise<void>;
  filter?: (data: T) => boolean;
  priority?: number;
  once?: boolean;
}

export interface ObservableConfig {
  name: string;
  enableHistory?: boolean;
  maxHistorySize?: number;
  notifyAsync?: boolean;
  logger?: ILogger;
}

export interface SubscriptionOptions {
  priority?: number;
  once?: boolean;
  filter?: (data: unknown) => boolean;
}

export class Observable<T = unknown> {
  private observers: Map<ObserverId, Observer<T>> = new Map();
  private config: Required<Omit<ObservableConfig, 'logger'>> & { logger?: ILogger };
  private logger: ILogger;
  private history: T[] = [];
  private idCounter = 0;
  private notifying = false;
  private pendingRemovals: Set<ObserverId> = new Set();

  constructor(config: ObservableConfig) {
    this.config = {
      name: config.name,
      enableHistory: config.enableHistory ?? false,
      maxHistorySize: config.maxHistorySize ?? 100,
      notifyAsync: config.notifyAsync ?? false,
      logger: config.logger,
    };
    this.logger = config.logger ?? createLogger({ name: `Observable:${config.name}` });
  }

  subscribe(
    handler: (data: T) => void | Promise<void>,
    options?: SubscriptionOptions
  ): ObserverId {
    const id = `obs_${Date.now()}_${++this.idCounter}`;
    const observer: Observer<T> = {
      id,
      notify: handler,
      priority: options?.priority ?? 0,
      once: options?.once ?? false,
      filter: options?.filter as ((data: T) => boolean) | undefined,
    };

    this.observers.set(id, observer);
    this.logger.debug(`Observer subscribed: ${id}`);

    return id;
  }

  subscribeOnce(handler: (data: T) => void | Promise<void>, priority?: number): ObserverId {
    return this.subscribe(handler, { once: true, priority });
  }

  unsubscribe(id: ObserverId): boolean {
    if (this.notifying) {
      this.pendingRemovals.add(id);
      return true;
    }

    const removed = this.observers.delete(id);
    if (removed) {
      this.logger.debug(`Observer unsubscribed: ${id}`);
    }
    return removed;
  }

  unsubscribeAll(): void {
    if (this.notifying) {
      for (const id of this.observers.keys()) {
        this.pendingRemovals.add(id);
      }
    } else {
      this.observers.clear();
    }
    this.logger.debug('All observers unsubscribed');
  }

  notify(data: T): void {
    if (this.config.enableHistory) {
      this.history.push(data);
      if (this.history.length > this.config.maxHistorySize) {
        this.history.shift();
      }
    }

    const sortedObservers = Array.from(this.observers.values())
      .sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));

    this.notifying = true;

    for (const observer of sortedObservers) {
      if (this.pendingRemovals.has(observer.id)) continue;

      try {
        if (observer.filter && !observer.filter(data)) continue;

        const result = observer.notify(data);

        if (result instanceof Promise && this.config.notifyAsync) {
          result.catch(error => {
            this.logger.error(`Observer error: ${observer.id}`, { error });
          });
        }

        if (observer.once) {
          this.pendingRemovals.add(observer.id);
        }
      } catch (error) {
        this.logger.error(`Observer error: ${observer.id}`, { error });
      }
    }

    this.notifying = false;

    for (const id of this.pendingRemovals) {
      this.observers.delete(id);
    }
    this.pendingRemovals.clear();
  }

  async notifyAsync(data: T): Promise<void> {
    if (this.config.enableHistory) {
      this.history.push(data);
      if (this.history.length > this.config.maxHistorySize) {
        this.history.shift();
      }
    }

    const sortedObservers = Array.from(this.observers.values())
      .sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));

    for (const observer of sortedObservers) {
      if (observer.filter && !observer.filter(data)) continue;

      try {
        await observer.notify(data);
      } catch (error) {
        this.logger.error(`Observer error: ${observer.id}`, { error });
      }

      if (observer.once) {
        this.observers.delete(observer.id);
      }
    }
  }

  notifyBatch(dataArray: T[]): void {
    for (const data of dataArray) {
      this.notify(data);
    }
  }

  getHistory(): T[] {
    return [...this.history];
  }

  clearHistory(): void {
    this.history = [];
  }

  observerCount(): number {
    return this.observers.size;
  }

  hasObservers(): boolean {
    return this.observers.size > 0;
  }
}

export interface PropertyChange<T extends object, K extends keyof T = keyof T> {
  property: K;
  oldValue: T[K] | undefined;
  newValue: T[K];
  source: T;
}

export interface ObservableObjectConfig {
  name: string;
  deep?: boolean;
  logger?: ILogger;
}

export class ObservableObject<T extends object> {
  private target: T;
  private propertyObservers: Map<keyof T, Observable<PropertyChange<T>>> = new Map();
  private anyPropertyObserver: Observable<PropertyChange<T>>;
  private config: Required<Omit<ObservableObjectConfig, 'logger'>> & { logger?: ILogger };
  private logger: ILogger;

  constructor(target: T, config: ObservableObjectConfig) {
    this.config = {
      name: config.name,
      deep: config.deep ?? false,
      logger: config.logger,
    };
    this.logger = config.logger ?? createLogger({ name: `ObservableObject:${config.name}` });

    this.target = this.createProxy(target);
    this.anyPropertyObserver = new Observable<PropertyChange<T>>({ name: `${config.name}:any` });
  }

  private createProxy(target: T): T {
    return new Proxy(target, {
      set: (obj, prop, value) => {
        if (typeof prop === 'string') {
          const key = prop as keyof T;
          const oldValue = obj[key];

          if (oldValue !== value) {
            obj[key] = value;

            const change: PropertyChange<T> = {
              property: key,
              oldValue,
              newValue: value,
              source: this.target,
            };

            this.notifyPropertyChange(key, change);
          }
          return true;
        }
        return false;
      },
      get: (obj, prop) => {
        return obj[prop as keyof T];
      },
    });
  }

  observe<K extends keyof T>(
    property: K,
    handler: (change: PropertyChange<T, K>) => void | Promise<void>
  ): ObserverId {
    if (!this.propertyObservers.has(property)) {
      this.propertyObservers.set(
        property,
        new Observable<PropertyChange<T>>({ name: `${this.config.name}:${String(property)}` })
      );
    }

    return this.propertyObservers.get(property)!.subscribe(
      handler as (change: PropertyChange<T>) => void | Promise<void>
    );
  }

  observeAny(handler: (change: PropertyChange<T>) => void | Promise<void>): ObserverId {
    return this.anyPropertyObserver.subscribe(handler);
  }

  unobserve(property: keyof T, id: ObserverId): boolean {
    const observable = this.propertyObservers.get(property);
    return observable?.unsubscribe(id) ?? false;
  }

  unobserveAny(id: ObserverId): boolean {
    return this.anyPropertyObserver.unsubscribe(id);
  }

  get(): T {
    return this.target;
  }

  set<K extends keyof T>(property: K, value: T[K]): void {
    this.target[property] = value;
  }

  private notifyPropertyChange(property: keyof T, change: PropertyChange<T>): void {
    const observable = this.propertyObservers.get(property);
    observable?.notify(change);
    this.anyPropertyObserver.notify(change);
  }
}

export interface ComputedProperty<T, R> {
  get(): R;
  dependencies: (keyof T)[];
}

export class ComputedObservable<T extends object, R> {
  private source: ObservableObject<T>;
  private cachedValue: R | undefined;
  private dirty = true;
  private compute: (source: T) => R;
  private observers: Observable<R>;
  private dependencySubscriptions: ObserverId[] = [];

  constructor(
    source: ObservableObject<T>,
    compute: (source: T) => R,
    dependencies: (keyof T)[],
    name?: string
  ) {
    this.source = source;
    this.compute = compute;
    this.observers = new Observable<R>({ name: name ?? 'Computed' });

    for (const dep of dependencies) {
      const id = source.observe(dep, () => {
        this.dirty = true;
        this.notifyObservers();
      });
      this.dependencySubscriptions.push(id);
    }
  }

  get(): R {
    if (this.dirty) {
      this.cachedValue = this.compute(this.source.get());
      this.dirty = false;
    }
    return this.cachedValue!;
  }

  subscribe(handler: (value: R) => void | Promise<void>): ObserverId {
    return this.observers.subscribe(handler);
  }

  unsubscribe(id: ObserverId): boolean {
    return this.observers.unsubscribe(id);
  }

  dispose(): void {
    for (const id of this.dependencySubscriptions) {
      this.source.unobserveAny(id);
    }
    this.dependencySubscriptions = [];
  }

  private notifyObservers(): void {
    const value = this.get();
    this.observers.notify(value);
  }
}

export interface ReactiveArrayConfig {
  name: string;
  logger?: ILogger;
}

export interface ArrayChange<T> {
  type: 'add' | 'remove' | 'move' | 'replace';
  index: number;
  items: T[];
  oldItems?: T[];
}

export class ReactiveArray<T> {
  private items: T[];
  private observers: Observable<ArrayChange<T>>;
  private config: Required<Omit<ReactiveArrayConfig, 'logger'>> & { logger?: ILogger };
  private logger: ILogger;

  constructor(items: T[] = [], config: ReactiveArrayConfig) {
    this.config = {
      name: config.name,
      logger: config.logger,
    };
    this.logger = config.logger ?? createLogger({ name: `ReactiveArray:${config.name}` });
    this.items = [...items];
    this.observers = new Observable<ArrayChange<T>>({ name: `${config.name}:changes` });
  }

  get(index: number): T | undefined {
    return this.items[index];
  }

  getAll(): T[] {
    return [...this.items];
  }

  set(index: number, item: T): void {
    const oldItem = this.items[index];
    this.items[index] = item;
    this.notify({
      type: 'replace',
      index,
      items: [item],
      oldItems: oldItem ? [oldItem] : [],
    });
  }

  push(...items: T[]): number {
    const index = this.items.length;
    this.items.push(...items);
    this.notify({
      type: 'add',
      index,
      items,
    });
    return this.items.length;
  }

  pop(): T | undefined {
    const item = this.items.pop();
    if (item !== undefined) {
      this.notify({
        type: 'remove',
        index: this.items.length,
        items: [item],
      });
    }
    return item;
  }

  shift(): T | undefined {
    const item = this.items.shift();
    if (item !== undefined) {
      this.notify({
        type: 'remove',
        index: 0,
        items: [item],
      });
    }
    return item;
  }

  unshift(...items: T[]): number {
    this.items.unshift(...items);
    this.notify({
      type: 'add',
      index: 0,
      items,
    });
    return this.items.length;
  }

  splice(start: number, deleteCount: number, ...items: T[]): T[] {
    const removed = this.items.splice(start, deleteCount, ...items);

    if (removed.length > 0) {
      this.notify({
        type: 'remove',
        index: start,
        items: removed,
      });
    }

    if (items.length > 0) {
      this.notify({
        type: 'add',
        index: start,
        items,
      });
    }

    return removed;
  }

  move(from: number, to: number): void {
    const [item] = this.items.splice(from, 1);
    this.items.splice(to, 0, item);
    this.notify({
      type: 'move',
      index: to,
      items: [item],
      oldItems: undefined,
    });
  }

  clear(): void {
    const items = [...this.items];
    this.items = [];
    this.notify({
      type: 'remove',
      index: 0,
      items,
    });
  }

  get length(): number {
    return this.items.length;
  }

  subscribe(handler: (change: ArrayChange<T>) => void | Promise<void>): ObserverId {
    return this.observers.subscribe(handler);
  }

  unsubscribe(id: ObserverId): boolean {
    return this.observers.unsubscribe(id);
  }

  private notify(change: ArrayChange<T>): void {
    this.observers.notify(change);
  }
}

export function createObservable<T = unknown>(config: ObservableConfig): Observable<T> {
  return new Observable<T>(config);
}

export function createObservableObject<T extends object>(
  target: T,
  config: ObservableObjectConfig
): ObservableObject<T> {
  return new ObservableObject(target, config);
}

export function createReactiveArray<T>(items: T[], config: ReactiveArrayConfig): ReactiveArray<T> {
  return new ReactiveArray(items, config);
}
