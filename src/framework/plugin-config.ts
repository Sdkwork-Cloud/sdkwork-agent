/**
 * Plugin Configuration System - 插件化配置系统
 *
 * 提供灵活的配置管理
 * - 多源配置加载
 * - 配置验证和转换
 * - 配置热更新
 * - 配置继承和覆盖
 *
 * @module Framework/PluginConfig
 * @version 1.0.0
 */

import { createLogger, type ILogger } from '../utils/logger.js';
import { z } from 'zod';

export type ConfigSource = 'file' | 'env' | 'memory' | 'remote' | 'default';

export interface ConfigProvider {
  name: string;
  priority: number;
  load(): Promise<Record<string, unknown>>;
  watch?(callback: (changes: Record<string, unknown>) => void): () => void;
}

export interface ConfigSchema<T> {
  parse(value: unknown): T;
  safeParse(value: unknown): { success: boolean; data?: T; error?: Error };
}

export interface ConfigOptions<T> {
  key: string;
  defaultValue?: T;
  required?: boolean;
  description?: string;
  envKey?: string;
  deprecated?: boolean;
  deprecationMessage?: string;
  validator?: (value: T) => boolean | string;
  transformer?: (value: unknown) => T;
  schema?: ConfigSchema<T>;
}

export interface ConfigEntry<T = unknown> {
  key: string;
  value: T;
  source: ConfigSource;
  timestamp: number;
  metadata?: Record<string, unknown>;
}

export interface ConfigChangeEvent<T = unknown> {
  key: string;
  oldValue: T | undefined;
  newValue: T;
  source: ConfigSource;
}

export type ConfigChangeHandler<T = unknown> = (event: ConfigChangeEvent<T>) => void;

export class PluginConfigSystem {
  private config: Map<string, ConfigEntry> = new Map();
  private providers: ConfigProvider[] = [];
  private schemas: Map<string, ConfigSchema<unknown>> = new Map();
  private options: Map<string, ConfigOptions<unknown>> = new Map();
  private watchers: Map<string, Set<ConfigChangeHandler>> = new Map();
  private globalWatchers: Set<ConfigChangeHandler> = new Set();
  private logger: ILogger;
  private loaded = false;

  constructor(logger?: ILogger) {
    this.logger = logger ?? createLogger({ name: 'PluginConfig' });
  }

  registerProvider(provider: ConfigProvider): void {
    this.providers.push(provider);
    this.providers.sort((a, b) => b.priority - a.priority);
    this.logger.debug(`Config provider registered: ${provider.name}`, { priority: provider.priority });
  }

  define<T>(options: ConfigOptions<T>): this {
    this.options.set(options.key, options as ConfigOptions<unknown>);
    if (options.schema) {
      this.schemas.set(options.key, options.schema as ConfigSchema<unknown>);
    }
    if (options.defaultValue !== undefined) {
      this.set(options.key, options.defaultValue, 'default');
    }
    return this;
  }

  defineFromZod<T>(key: string, schema: z.ZodType<T>, options: Partial<ConfigOptions<T>> = {}): this {
    return this.define({
      key,
      schema: {
        parse: (value) => schema.parse(value),
        safeParse: (value) => {
          const result = schema.safeParse(value);
          if (result.success) {
            return { success: true, data: result.data };
          }
          return { success: false, error: new Error(result.error.message) };
        },
      },
      ...options,
    });
  }

  async load(): Promise<void> {
    for (const provider of this.providers) {
      try {
        const values = await provider.load();
        for (const [key, value] of Object.entries(values)) {
          await this.setValueWithValidation(key, value, provider.name as ConfigSource);
        }
        this.logger.debug(`Config loaded from provider: ${provider.name}`);
      } catch (error) {
        this.logger.error(`Failed to load config from provider: ${provider.name}`, { error });
      }
    }

    this.validateRequired();
    this.loaded = true;
    this.logger.info('Configuration loaded', { keys: this.config.size });
  }

  get<T>(key: string): T | undefined {
    const entry = this.config.get(key);
    if (!entry) {
      const options = this.options.get(key);
      return options?.defaultValue as T | undefined;
    }
    return entry.value as T;
  }

  getOrThrow<T>(key: string): T {
    const value = this.get<T>(key);
    if (value === undefined) {
      throw new Error(`Configuration key '${key}' is required but not set`);
    }
    return value;
  }

  set<T>(key: string, value: T, source: ConfigSource = 'memory'): void {
    const oldValue = this.config.get(key)?.value;
    this.config.set(key, {
      key,
      value,
      source,
      timestamp: Date.now(),
    });

    if (oldValue !== value) {
      this.notifyWatchers(key, oldValue, value, source);
    }
  }

  async setWithValidation<T>(key: string, value: T, source: ConfigSource = 'memory'): Promise<void> {
    await this.setValueWithValidation(key, value, source);
  }

  has(key: string): boolean {
    return this.config.has(key);
  }

  delete(key: string): boolean {
    return this.config.delete(key);
  }

  getAll(): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    for (const [key, entry] of this.config) {
      result[key] = entry.value;
    }
    return result;
  }

  getWithMetadata(key: string): ConfigEntry | undefined {
    return this.config.get(key);
  }

  watch<T>(key: string, handler: ConfigChangeHandler<T>): () => void {
    if (!this.watchers.has(key)) {
      this.watchers.set(key, new Set());
    }
    this.watchers.get(key)!.add(handler as ConfigChangeHandler);

    return () => {
      this.watchers.get(key)?.delete(handler as ConfigChangeHandler);
    };
  }

  watchAll(handler: ConfigChangeHandler): () => void {
    this.globalWatchers.add(handler);
    return () => {
      this.globalWatchers.delete(handler);
    };
  }

  getSchema(key: string): ConfigSchema<unknown> | undefined {
    return this.schemas.get(key);
  }

  getOptions(key: string): ConfigOptions<unknown> | undefined {
    return this.options.get(key);
  }

  getDefinedKeys(): string[] {
    return Array.from(this.options.keys());
  }

  exportSchema(): Record<string, unknown> {
    const schema: Record<string, unknown> = {};
    for (const [key, options] of this.options) {
      schema[key] = {
        type: typeof options.defaultValue,
        defaultValue: options.defaultValue,
        required: options.required,
        description: options.description,
        envKey: options.envKey,
        deprecated: options.deprecated,
      };
    }
    return schema;
  }

  validate(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    for (const [key, options] of this.options) {
      const entry = this.config.get(key);

      if (options.required && !entry) {
        errors.push(`Required configuration '${key}' is missing`);
        continue;
      }

      if (options.deprecated && entry) {
        this.logger.warn(`Configuration '${key}' is deprecated: ${options.deprecationMessage}`);
      }

      if (entry && options.validator) {
        const result = options.validator(entry.value);
        if (result !== true) {
          errors.push(typeof result === 'string' ? result : `Invalid value for '${key}'`);
        }
      }
    }

    return { valid: errors.length === 0, errors };
  }

  private async setValueWithValidation(key: string, value: unknown, source: ConfigSource): Promise<void> {
    const options = this.options.get(key);
    let processedValue = value;

    if (options?.transformer) {
      try {
        processedValue = options.transformer(value);
      } catch (error) {
        this.logger.error(`Transform failed for '${key}'`, { error, value });
        throw error;
      }
    }

    if (options?.schema) {
      const result = options.schema.safeParse(processedValue);
      if (!result.success) {
        this.logger.error(`Validation failed for '${key}'`, { error: result.error, value: processedValue });
        throw result.error;
      }
      processedValue = result.data;
    }

    this.set(key, processedValue, source);
  }

  private validateRequired(): void {
    for (const [key, options] of this.options) {
      if (options.required && !this.config.has(key) && options.defaultValue === undefined) {
        this.logger.warn(`Required configuration '${key}' is missing`);
      }
    }
  }

  private notifyWatchers(key: string, oldValue: unknown, newValue: unknown, source: ConfigSource): void {
    const event: ConfigChangeEvent = { key, oldValue, newValue, source };

    const keyWatchers = this.watchers.get(key);
    if (keyWatchers) {
      for (const handler of keyWatchers) {
        try {
          handler(event);
        } catch (error) {
          this.logger.error(`Config watcher error for '${key}'`, { error });
        }
      }
    }

    for (const handler of this.globalWatchers) {
      try {
        handler(event);
      } catch (error) {
        this.logger.error('Global config watcher error', { error, key });
      }
    }
  }
}

export class FileConfigProvider implements ConfigProvider {
  name = 'file';
  priority = 100;

  constructor(
    private filePath: string,
    private parser: (content: string) => Record<string, unknown> = JSON.parse
  ) {}

  async load(): Promise<Record<string, unknown>> {
    const fs = await import('fs/promises');
    const content = await fs.readFile(this.filePath, 'utf-8');
    return this.parser(content);
  }
}

export class EnvConfigProvider implements ConfigProvider {
  name = 'env';
  priority = 50;

  constructor(private prefix: string = '') {}

  async load(): Promise<Record<string, unknown>> {
    const result: Record<string, unknown> = {};
    const prefix = this.prefix.toUpperCase();

    for (const [key, value] of Object.entries(process.env)) {
      if (value === undefined) continue;

      if (prefix && key.startsWith(prefix)) {
        const configKey = key.slice(prefix.length).toLowerCase().replace(/_/g, '.');
        result[configKey] = this.parseValue(value);
      } else if (!prefix) {
        result[key.toLowerCase().replace(/_/g, '.')] = this.parseValue(value);
      }
    }

    return result;
  }

  private parseValue(value: string): unknown {
    if (value === 'true') return true;
    if (value === 'false') return false;
    if (value === 'null') return null;
    if (value === 'undefined') return undefined;

    const num = Number(value);
    if (!isNaN(num)) return num;

    try {
      return JSON.parse(value);
    } catch {
      return value;
    }
  }
}

export class MemoryConfigProvider implements ConfigProvider {
  name = 'memory';
  priority = 10;
  private config: Record<string, unknown> = {};

  constructor(initialConfig?: Record<string, unknown>) {
    if (initialConfig) {
      this.config = { ...initialConfig };
    }
  }

  set(key: string, value: unknown): void {
    this.config[key] = value;
  }

  delete(key: string): void {
    delete this.config[key];
  }

  async load(): Promise<Record<string, unknown>> {
    return { ...this.config };
  }
}

export class DefaultConfigProvider implements ConfigProvider {
  name = 'default';
  priority = 0;
  private defaults: Record<string, unknown>;

  constructor(defaults: Record<string, unknown>) {
    this.defaults = defaults;
  }

  async load(): Promise<Record<string, unknown>> {
    return { ...this.defaults };
  }
}

export function createConfigSystem(logger?: ILogger): PluginConfigSystem {
  return new PluginConfigSystem(logger);
}

export function createZodSchema<T>(schema: z.ZodType<T>): ConfigSchema<T> {
  return {
    parse: (value) => schema.parse(value),
    safeParse: (value) => {
      const result = schema.safeParse(value);
      if (result.success) {
        return { success: true, data: result.data };
      }
      return { success: false, error: new Error(result.error.message) };
    },
  };
}
