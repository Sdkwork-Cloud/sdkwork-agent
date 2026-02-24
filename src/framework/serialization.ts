/**
 * Serialization System - 序列化/反序列化系统
 *
 * 提供统一的数据序列化能力
 * - 多格式支持 (JSON, MessagePack等)
 * - 自定义序列化器
 * - 循环引用处理
 * - 类型保留
 *
 * @module Framework/Serialization
 * @version 1.0.0
 */

import { createLogger, type ILogger } from '../utils/logger.js';

export type SerializedType = 'json' | 'msgpack' | 'binary' | 'custom';

export interface SerializationOptions {
  pretty?: boolean;
  includeTypeInfo?: boolean;
  maxDepth?: number;
  excludeKeys?: Set<string>;
  customSerializers?: Map<string, CustomSerializer>;
}

export interface DeserializationOptions {
  strict?: boolean;
  customDeserializers?: Map<string, CustomDeserializer>;
}

export interface SerializedData {
  __type?: string;
  __data: unknown;
  __meta?: Record<string, unknown>;
}

export interface CustomSerializer {
  canSerialize: (value: unknown) => boolean;
  serialize: (value: unknown, options: SerializationOptions) => unknown;
  deserialize: (data: unknown, options: DeserializationOptions) => unknown;
  typeName: string;
}

type CustomDeserializer = CustomSerializer;

interface SerializationContext {
  depth: number;
  path: string;
  seen: Map<object, string>;
  references: Map<string, unknown>;
}

export class Serializer {
  private options: SerializationOptions;
  private customSerializers: Map<string, CustomSerializer> = new Map();
  private logger: ILogger;
  private idCounter = 0;

  constructor(options: SerializationOptions = {}, logger?: ILogger) {
    this.options = {
      pretty: options.pretty ?? false,
      includeTypeInfo: options.includeTypeInfo ?? true,
      maxDepth: options.maxDepth ?? 100,
      excludeKeys: options.excludeKeys ?? new Set(),
      customSerializers: options.customSerializers,
    };
    this.logger = logger ?? createLogger({ name: 'Serializer' });

    this.registerBuiltInSerializers();
  }

  private registerBuiltInSerializers(): void {
    this.registerCustom({
      typeName: 'Date',
      canSerialize: (value): value is Date => value instanceof Date,
      serialize: (value) => (value as Date).toISOString(),
      deserialize: (data) => new Date(data as string),
    });

    this.registerCustom({
      typeName: 'Map',
      canSerialize: (value): value is Map<unknown, unknown> => value instanceof Map,
      serialize: (value, options) => {
        const map = value as Map<unknown, unknown>;
        return Array.from(map.entries()).map(([k, v]) => [
          this.serializeValue(k, { depth: 0, path: '', seen: new Map(), references: new Map() }, options),
          this.serializeValue(v, { depth: 0, path: '', seen: new Map(), references: new Map() }, options),
        ]);
      },
      deserialize: (data, options) => {
        const entries = data as Array<[unknown, unknown]>;
        const map = new Map();
        for (const [k, v] of entries) {
          map.set(this.deserializeValue(k, options), this.deserializeValue(v, options));
        }
        return map;
      },
    });

    this.registerCustom({
      typeName: 'Set',
      canSerialize: (value): value is Set<unknown> => value instanceof Set,
      serialize: (value, options) => {
        const set = value as Set<unknown>;
        return Array.from(set).map(v =>
          this.serializeValue(v, { depth: 0, path: '', seen: new Map(), references: new Map() }, options)
        );
      },
      deserialize: (data, options) => {
        const arr = data as unknown[];
        return new Set(arr.map(v => this.deserializeValue(v, options)));
      },
    });

    this.registerCustom({
      typeName: 'RegExp',
      canSerialize: (value): value is RegExp => value instanceof RegExp,
      serialize: (value) => ({
        source: (value as RegExp).source,
        flags: (value as RegExp).flags,
      }),
      deserialize: (data) => {
        const { source, flags } = data as { source: string; flags: string };
        return new RegExp(source, flags);
      },
    });

    this.registerCustom({
      typeName: 'Buffer',
      canSerialize: (value): value is Buffer => Buffer.isBuffer(value),
      serialize: (value) => (value as Buffer).toString('base64'),
      deserialize: (data) => Buffer.from(data as string, 'base64'),
    });

    this.registerCustom({
      typeName: 'Error',
      canSerialize: (value): value is Error => value instanceof Error,
      serialize: (value) => {
        const err = value as Error;
        return {
          name: err.name,
          message: err.message,
          stack: err.stack,
        };
      },
      deserialize: (data) => {
        const { name, message, stack } = data as { name: string; message: string; stack?: string };
        const error = new Error(message);
        error.name = name;
        error.stack = stack;
        return error;
      },
    });
  }

  registerCustom(serializer: CustomSerializer): void {
    this.customSerializers.set(serializer.typeName, serializer);
    this.logger.debug(`Custom serializer registered: ${serializer.typeName}`);
  }

  serialize<T>(value: T, options?: Partial<SerializationOptions>): string {
    const mergedOptions = { ...this.options, ...options };
    const context: SerializationContext = {
      depth: 0,
      path: '$',
      seen: new Map(),
      references: new Map(),
    };

    const serialized = this.serializeValue(value, context, mergedOptions);

    const result: SerializedData = {
      __data: serialized,
    };

    if (mergedOptions.includeTypeInfo && context.references.size > 0) {
      result.__meta = { references: Object.fromEntries(context.references) };
    }

    return mergedOptions.pretty
      ? JSON.stringify(result, null, 2)
      : JSON.stringify(result);
  }

  deserialize<T>(data: string, options?: DeserializationOptions): T {
    const parsed: SerializedData = JSON.parse(data);
    const mergedOptions: DeserializationOptions = {
      strict: options?.strict ?? false,
      customDeserializers: options?.customDeserializers,
    };

    return this.deserializeValue(parsed.__data, mergedOptions) as T;
  }

  clone<T>(value: T): T {
    const serialized = this.serialize(value);
    return this.deserialize<T>(serialized);
  }

  private serializeValue(
    value: unknown,
    context: SerializationContext,
    options: SerializationOptions
  ): unknown {
    if (value === null || value === undefined) {
      return value;
    }

    if (context.depth > (options.maxDepth ?? 100)) {
      this.logger.warn(`Max depth exceeded at ${context.path}`);
      return '[MaxDepthExceeded]';
    }

    const type = typeof value;
    if (type === 'number' || type === 'string' || type === 'boolean') {
      return value;
    }

    if (type === 'bigint') {
      return { __type: 'bigint', __value: (value as bigint).toString() };
    }

    if (type === 'symbol') {
      return { __type: 'symbol', __value: (value as symbol).description };
    }

    if (type === 'function') {
      return { __type: 'function', __value: (value as (...args: unknown[]) => unknown).name || 'anonymous' };
    }

    for (const [typeName, serializer] of this.customSerializers) {
      if (serializer.canSerialize(value)) {
        const serialized = serializer.serialize(value, options);
        return options.includeTypeInfo
          ? { __type: typeName, __value: serialized }
          : serialized;
      }
    }

    if (Array.isArray(value)) {
      return value.map((item, index) =>
        this.serializeValue(item, { ...context, depth: context.depth + 1, path: `${context.path}[${index}]` }, options)
      );
    }

    if (typeof value === 'object') {
      if (context.seen.has(value as object)) {
        const refId = context.seen.get(value as object)!;
        return { __ref: refId };
      }

      const id = `ref_${++this.idCounter}`;
      context.seen.set(value as object, id);

      const result: Record<string, unknown> = {};
      for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
        if (options.excludeKeys?.has(key)) continue;

        result[key] = this.serializeValue(
          val,
          { ...context, depth: context.depth + 1, path: `${context.path}.${key}` },
          options
        );
      }

      return result;
    }

    return value;
  }

  private deserializeValue(value: unknown, options: DeserializationOptions): unknown {
    if (value === null || value === undefined) {
      return value;
    }

    const type = typeof value;
    if (type === 'number' || type === 'string' || type === 'boolean') {
      return value;
    }

    if (typeof value === 'object' && value !== null) {
      const obj = value as Record<string, unknown>;

      if ('__type' in obj && '__value' in obj) {
        const typeName = obj.__type as string;
        const typeValue = obj.__value;

        if (typeName === 'bigint') {
          return BigInt(typeValue as string);
        }

        if (typeName === 'symbol') {
          return Symbol(typeValue as string);
        }

        if (typeName === 'function') {
          return () => {};
        }

        const serializer = this.customSerializers.get(typeName);
        if (serializer) {
          return serializer.deserialize(typeValue, options);
        }

        if (options.strict) {
          throw new Error(`Unknown type: ${typeName}`);
        }

        return typeValue;
      }

      if ('__ref' in obj) {
        return { __circularRef: obj.__ref };
      }

      if (Array.isArray(obj)) {
        return obj.map(item => this.deserializeValue(item, options));
      }

      const result: Record<string, unknown> = {};
      for (const [key, val] of Object.entries(obj)) {
        result[key] = this.deserializeValue(val, options);
      }

      return result;
    }

    return value;
  }
}

export interface JsonSerializerConfig {
  pretty?: boolean;
  replacer?: (key: string, value: unknown) => unknown;
  reviver?: (key: string, value: unknown) => unknown;
}

export class JsonSerializer {
  private config: JsonSerializerConfig;

  constructor(config: JsonSerializerConfig = {}) {
    this.config = config;
  }

  serialize<T>(value: T): string {
    const str = this.config.pretty
      ? JSON.stringify(value, this.config.replacer as (key: string, value: unknown) => unknown, 2)
      : JSON.stringify(value, this.config.replacer as (key: string, value: unknown) => unknown);
    return str;
  }

  deserialize<T>(data: string): T {
    return JSON.parse(data, this.config.reviver as (key: string, value: unknown) => unknown) as T;
  }

  serializeToFile<T>(value: T, path: string): Promise<void> {
    const fs = require('fs/promises');
    return fs.writeFile(path, this.serialize(value), 'utf-8');
  }

  async deserializeFromFile<T>(path: string): Promise<T> {
    const fs = require('fs/promises');
    const data = await fs.readFile(path, 'utf-8');
    return this.deserialize<T>(data);
  }
}

export function createSerializer(options?: SerializationOptions, logger?: ILogger): Serializer {
  return new Serializer(options, logger);
}

export function createJsonSerializer(config?: JsonSerializerConfig): JsonSerializer {
  return new JsonSerializer(config);
}

export const defaultSerializer = new Serializer();
export const jsonSerializer = new JsonSerializer();
