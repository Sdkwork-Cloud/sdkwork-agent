/**
 * Object Factory and Builder Pattern - 对象工厂和构建器模式
 *
 * 提供灵活的对象创建和管理
 * - 工厂模式
 * - 构建器模式
 * - 原型模式
 * - 依赖注入集成
 *
 * @module Framework/Factory
 * @version 1.0.0
 */

import { createLogger, type ILogger } from '../utils/logger.js';

export interface Factory<T, Args extends unknown[] = []> {
  create(...args: Args): T | Promise<T>;
}

export interface FactoryConfig<T, Args extends unknown[] = []> {
  name: string;
  create: (...args: Args) => T | Promise<T>;
  validate?: (instance: T) => boolean | Promise<boolean>;
  initialize?: (instance: T, ...args: Args) => void | Promise<void>;
  destroy?: (instance: T) => void | Promise<void>;
  pool?: {
    min: number;
    max: number;
  };
  logger?: ILogger;
}

export class ObjectFactory<T, Args extends unknown[] = []> implements Factory<T, Args> {
  private config: Required<Omit<FactoryConfig<T, Args>, 'validate' | 'initialize' | 'destroy' | 'pool' | 'logger'>> & {
    validate?: (instance: T) => boolean | Promise<boolean>;
    initialize?: (instance: T, ...args: Args) => void | Promise<void>;
    destroy?: (instance: T) => void | Promise<void>;
    pool?: { min: number; max: number };
    logger?: ILogger;
  };
  private logger: ILogger;
  private pool: T[] = [];
  private inUse: Set<T> = new Set();
  private created = 0;
  private destroyed = 0;

  constructor(config: FactoryConfig<T, Args>) {
    this.config = {
      name: config.name,
      create: config.create,
      validate: config.validate,
      initialize: config.initialize,
      destroy: config.destroy,
      pool: config.pool,
      logger: config.logger,
    };
    this.logger = config.logger ?? createLogger({ name: `Factory:${config.name}` });
  }

  async create(...args: Args): Promise<T> {
    if (this.config.pool && this.pool.length > 0) {
      const instance = this.pool.pop()!;
      this.inUse.add(instance);

      if (this.config.validate && !(await this.config.validate(instance))) {
        this.inUse.delete(instance);
        return this.createNew(...args);
      }

      if (this.config.initialize) {
        await this.config.initialize(instance, ...args);
      }

      return instance;
    }

    return this.createNew(...args);
  }

  async release(instance: T): Promise<void> {
    if (!this.inUse.has(instance)) {
      this.logger.warn('Attempting to release unknown instance');
      return;
    }

    this.inUse.delete(instance);

    if (this.config.pool && this.pool.length < this.config.pool.max) {
      this.pool.push(instance);
    } else if (this.config.destroy) {
      await this.config.destroy(instance);
      this.destroyed++;
    }
  }

  async destroy(instance: T): Promise<void> {
    if (this.inUse.has(instance)) {
      this.inUse.delete(instance);
    }

    const poolIndex = this.pool.indexOf(instance);
    if (poolIndex !== -1) {
      this.pool.splice(poolIndex, 1);
    }

    if (this.config.destroy) {
      await this.config.destroy(instance);
      this.destroyed++;
    }
  }

  async destroyAll(): Promise<void> {
    for (const instance of this.inUse) {
      if (this.config.destroy) {
        await this.config.destroy(instance);
        this.destroyed++;
      }
    }
    this.inUse.clear();

    for (const instance of this.pool) {
      if (this.config.destroy) {
        await this.config.destroy(instance);
        this.destroyed++;
      }
    }
    this.pool = [];
  }

  getStats(): { created: number; destroyed: number; inUse: number; pooled: number } {
    return {
      created: this.created,
      destroyed: this.destroyed,
      inUse: this.inUse.size,
      pooled: this.pool.length,
    };
  }

  private async createNew(...args: Args): Promise<T> {
    const instance = await this.config.create(...args);
    this.created++;

    if (this.config.initialize) {
      await this.config.initialize(instance, ...args);
    }

    if (this.config.pool) {
      this.inUse.add(instance);
    }

    return instance;
  }
}

export interface BuilderConfig<T> {
  name: string;
  defaults?: Partial<T>;
  validators?: Map<keyof T, (value: unknown) => boolean>;
  transformers?: Map<keyof T, (value: unknown) => unknown>;
  required?: Set<keyof T>;
  logger?: ILogger;
}

export class ObjectBuilder<T extends object> {
  private config: Required<Omit<BuilderConfig<T>, 'defaults' | 'validators' | 'transformers' | 'required' | 'logger'>> & {
    defaults?: Partial<T>;
    validators?: Map<keyof T, (value: unknown) => boolean>;
    transformers?: Map<keyof T, (value: unknown) => unknown>;
    required?: Set<keyof T>;
    logger?: ILogger;
  };
  private logger: ILogger;
  private values: Partial<T> = {};
  private built = false;

  constructor(config: BuilderConfig<T>) {
    this.config = {
      name: config.name,
      defaults: config.defaults,
      validators: config.validators,
      transformers: config.transformers,
      required: config.required,
      logger: config.logger,
    };
    this.logger = config.logger ?? createLogger({ name: `Builder:${config.name}` });

    if (config.defaults) {
      this.values = { ...config.defaults };
    }
  }

  set<K extends keyof T>(key: K, value: T[K]): this {
    if (this.built) {
      throw new Error('Cannot modify a built object');
    }

    if (this.config.transformers?.has(key)) {
      this.values[key] = this.config.transformers.get(key)!(value) as T[K];
    } else {
      this.values[key] = value;
    }

    return this;
  }

  setMany(partial: Partial<T>): this {
    for (const [key, value] of Object.entries(partial) as [keyof T, T[keyof T]][]) {
      this.set(key, value);
    }
    return this;
  }

  delete(key: keyof T): this {
    if (this.built) {
      throw new Error('Cannot modify a built object');
    }
    delete this.values[key];
    return this;
  }

  reset(): this {
    this.values = this.config.defaults ? { ...this.config.defaults } : {};
    this.built = false;
    return this;
  }

  build(): T {
    if (this.built) {
      throw new Error('Object already built');
    }

    if (this.config.required) {
      const missing: string[] = [];
      for (const key of this.config.required) {
        if (this.values[key] === undefined) {
          missing.push(String(key));
        }
      }
      if (missing.length > 0) {
        throw new Error(`Missing required fields: ${missing.join(', ')}`);
      }
    }

    if (this.config.validators) {
      for (const [key, validator] of this.config.validators) {
        const value = this.values[key];
        if (value !== undefined && !validator(value)) {
          throw new Error(`Validation failed for field: ${String(key)}`);
        }
      }
    }

    this.built = true;
    return this.values as T;
  }

  buildUnsafe(): T {
    return this.values as T;
  }

  clone(): ObjectBuilder<T> {
    const cloned = new ObjectBuilder<T>({
      name: this.config.name,
      defaults: this.config.defaults,
      validators: this.config.validators,
      transformers: this.config.transformers,
      required: this.config.required,
      logger: this.config.logger,
    });
    cloned.values = { ...this.values };
    cloned.built = this.built;
    return cloned;
  }

  isBuilt(): boolean {
    return this.built;
  }

  has(key: keyof T): boolean {
    return this.values[key] !== undefined;
  }

  get<K extends keyof T>(key: K): T[K] | undefined {
    return this.values[key];
  }
}

export class PrototypeRegistry<T> {
  private prototypes: Map<string, T> = new Map();
  private cloners: Map<string, (prototype: T) => T> = new Map();
  private logger: ILogger;

  constructor(logger?: ILogger) {
    this.logger = logger ?? createLogger({ name: 'PrototypeRegistry' });
  }

  register(name: string, prototype: T, cloner?: (prototype: T) => T): void {
    this.prototypes.set(name, prototype);
    if (cloner) {
      this.cloners.set(name, cloner);
    }
    this.logger.debug(`Prototype registered: ${name}`);
  }

  clone(name: string): T {
    const prototype = this.prototypes.get(name);
    if (!prototype) {
      throw new Error(`Prototype not found: ${name}`);
    }

    const cloner = this.cloners.get(name);
    if (cloner) {
      return cloner(prototype);
    }

    return this.deepClone(prototype);
  }

  has(name: string): boolean {
    return this.prototypes.has(name);
  }

  remove(name: string): boolean {
    this.cloners.delete(name);
    return this.prototypes.delete(name);
  }

  list(): string[] {
    return Array.from(this.prototypes.keys());
  }

  clear(): void {
    this.prototypes.clear();
    this.cloners.clear();
  }

  private deepClone(obj: T): T {
    if (obj === null || typeof obj !== 'object') {
      return obj;
    }

    if (Array.isArray(obj)) {
      return obj.map(item => this.deepClone(item as T)) as T;
    }

    if (obj instanceof Date) {
      return new Date(obj.getTime()) as T;
    }

    if (obj instanceof Map) {
      const cloned = new Map();
      for (const [key, value] of obj) {
        cloned.set(key, this.deepClone(value as T));
      }
      return cloned as T;
    }

    if (obj instanceof Set) {
      const cloned = new Set();
      for (const value of obj) {
        cloned.add(this.deepClone(value as T));
      }
      return cloned as T;
    }

    const cloned = Object.create(Object.getPrototypeOf(obj));
    for (const key of Object.keys(obj)) {
      (cloned as Record<string, T>)[key] = this.deepClone((obj as Record<string, T>)[key]);
    }
    return cloned;
  }
}

export interface RegistryConfig<T> {
  name: string;
  allowOverride?: boolean;
  logger?: ILogger;
}

export class ObjectRegistry<T> {
  private items: Map<string, T> = new Map();
  private factories: Map<string, Factory<T>> = new Map();
  private config: Required<Omit<RegistryConfig<T>, 'logger'>> & { logger?: ILogger };
  private logger: ILogger;

  constructor(config: RegistryConfig<T>) {
    this.config = {
      name: config.name,
      allowOverride: config.allowOverride ?? false,
      logger: config.logger,
    };
    this.logger = config.logger ?? createLogger({ name: `Registry:${config.name}` });
  }

  register(name: string, item: T): void {
    if (!this.config.allowOverride && this.items.has(name)) {
      throw new Error(`Item already registered: ${name}`);
    }
    this.items.set(name, item);
    this.logger.debug(`Item registered: ${name}`);
  }

  registerFactory(name: string, factory: Factory<T>): void {
    this.factories.set(name, factory);
    this.logger.debug(`Factory registered: ${name}`);
  }

  get(name: string): T | undefined {
    return this.items.get(name);
  }

  async getOrCreate(name: string): Promise<T> {
    const item = this.items.get(name);
    if (item) return item;

    const factory = this.factories.get(name);
    if (factory) {
      const created = await factory.create();
      this.items.set(name, created);
      return created;
    }

    throw new Error(`Item not found: ${name}`);
  }

  has(name: string): boolean {
    return this.items.has(name) || this.factories.has(name);
  }

  remove(name: string): boolean {
    this.factories.delete(name);
    return this.items.delete(name);
  }

  list(): string[] {
    const names = new Set<string>();
    for (const name of this.items.keys()) {
      names.add(name);
    }
    for (const name of this.factories.keys()) {
      names.add(name);
    }
    return Array.from(names);
  }

  listInstances(): string[] {
    return Array.from(this.items.keys());
  }

  listFactories(): string[] {
    return Array.from(this.factories.keys());
  }

  clear(): void {
    this.items.clear();
    this.factories.clear();
  }

  size(): number {
    return this.items.size;
  }
}

export function createFactory<T, Args extends unknown[] = []>(
  config: FactoryConfig<T, Args>
): ObjectFactory<T, Args> {
  return new ObjectFactory(config);
}

export function createBuilder<T extends object>(
  config: BuilderConfig<T>
): ObjectBuilder<T> {
  return new ObjectBuilder(config);
}

export function createPrototypeRegistry<T>(logger?: ILogger): PrototypeRegistry<T> {
  return new PrototypeRegistry(logger);
}

export function createRegistry<T>(config: RegistryConfig<T>): ObjectRegistry<T> {
  return new ObjectRegistry(config);
}
