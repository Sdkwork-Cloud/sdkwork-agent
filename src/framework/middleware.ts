/**
 * Middleware System - 中间件系统
 *
 * 提供标准化的中间件模式：
 * - 中间件管道
 * - 优先级排序
 * - 错误处理
 * - 上下文传递
 *
 * @module Framework/Middleware
 * @version 1.0.0
 */

import { createLogger, type ILogger } from '../utils/logger.js';

export interface MiddlewareContext<T = unknown> {
  id: string;
  input: T;
  state: Map<string, unknown>;
  metadata: Record<string, unknown>;
  startTime: number;
  logger?: ILogger;
}

export interface MiddlewareResult<R = unknown> {
  success: boolean;
  output?: R;
  error?: Error;
  duration: number;
  metadata: Record<string, unknown>;
}

export interface Middleware<T = unknown, R = unknown> {
  name: string;
  priority: number;
  enabled?: boolean;
  before?(context: MiddlewareContext<T>): Promise<void>;
  execute(context: MiddlewareContext<T>, next: () => Promise<R>): Promise<R>;
  after?(context: MiddlewareContext<T>, result: R): Promise<void>;
  onError?(context: MiddlewareContext<T>, error: Error): Promise<void>;
}

export interface MiddlewarePipelineConfig {
  name: string;
  enableLogging?: boolean;
  timeout?: number;
}

export class MiddlewarePipeline<T = unknown, R = unknown> {
  private middlewares: Middleware<T, R>[] = [];
  private logger: ILogger;
  private config: MiddlewarePipelineConfig;

  constructor(config: MiddlewarePipelineConfig) {
    this.config = config;
    this.logger = createLogger({ name: `Pipeline:${config.name}` });
  }

  use(middleware: Middleware<T, R>): this {
    this.middlewares.push(middleware);
    this.middlewares.sort((a, b) => b.priority - a.priority);
    this.logger.debug(`Middleware added: ${middleware.name} (priority: ${middleware.priority})`);
    return this;
  }

  remove(name: string): boolean {
    const index = this.middlewares.findIndex(m => m.name === name);
    if (index !== -1) {
      this.middlewares.splice(index, 1);
      this.logger.debug(`Middleware removed: ${name}`);
      return true;
    }
    return false;
  }

  has(name: string): boolean {
    return this.middlewares.some(m => m.name === name);
  }

  list(): string[] {
    return this.middlewares.map(m => m.name);
  }

  async execute(input: T): Promise<MiddlewareResult<R>> {
    const context: MiddlewareContext<T> = {
      id: `ctx-${Date.now()}`,
      input,
      state: new Map(),
      metadata: {},
      startTime: Date.now(),
      logger: this.logger,
    };

    try {
      const result = await this.executePipeline(context, 0);
      
      return {
        success: true,
        output: result,
        duration: Date.now() - context.startTime,
        metadata: context.metadata,
      };
    } catch (error) {
      return {
        success: false,
        error: error as Error,
        duration: Date.now() - context.startTime,
        metadata: context.metadata,
      };
    }
  }

  private async executePipeline(context: MiddlewareContext<T>, index: number): Promise<R> {
    const middleware = this.middlewares[index];
    
    if (!middleware) {
      throw new Error('Pipeline exhausted without producing a result');
    }

    if (middleware.enabled === false) {
      return this.executePipeline(context, index + 1);
    }

    const next = async (): Promise<R> => {
      return this.executePipeline(context, index + 1);
    };

    try {
      if (middleware.before) {
        await middleware.before(context);
      }

      const result = await middleware.execute(context, next);

      if (middleware.after) {
        await middleware.after(context, result);
      }

      return result;
    } catch (error) {
      if (middleware.onError) {
        await middleware.onError(context, error as Error);
      }
      throw error;
    }
  }

  clear(): void {
    this.middlewares = [];
    this.logger.debug('All middlewares cleared');
  }
}

export function createMiddleware<T = unknown, R = unknown>(
  name: string,
  execute: (context: MiddlewareContext<T>, next: () => Promise<R>) => Promise<R>,
  options: Partial<Middleware<T, R>> = {}
): Middleware<T, R> {
  return {
    name,
    priority: options.priority ?? 0,
    enabled: options.enabled ?? true,
    before: options.before,
    after: options.after,
    onError: options.onError,
    execute,
  };
}

export function createPipeline<T = unknown, R = unknown>(
  name: string,
  config: Partial<MiddlewarePipelineConfig> = {}
): MiddlewarePipeline<T, R> {
  return new MiddlewarePipeline<T, R>({ name, ...config });
}

export const commonMiddlewares = {
  logging: <T = unknown, R = unknown>(): Middleware<T, R> => ({
    name: 'logging',
    priority: 1000,
    async execute(context, next) {
      context.logger?.debug(`Processing: ${context.id}`);
      const result = await next();
      context.logger?.debug(`Completed: ${context.id}`);
      return result;
    },
  }),

  timing: <T = unknown, R = unknown>(): Middleware<T, R> => ({
    name: 'timing',
    priority: 999,
    async execute(context, next) {
      const start = Date.now();
      const result = await next();
      context.metadata.duration = Date.now() - start;
      return result;
    },
  }),

  errorBoundary: <T = unknown, R = unknown>(): Middleware<T, R> => ({
    name: 'errorBoundary',
    priority: 998,
    async execute(context, next) {
      try {
        return await next();
      } catch (error) {
        context.metadata.error = (error as Error).message;
        throw error;
      }
    },
  }),

  timeout: <T = unknown, R = unknown>(ms: number): Middleware<T, R> => ({
    name: 'timeout',
    priority: 997,
    async execute(context, next) {
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error(`Timeout after ${ms}ms`)), ms);
      });
      
      return Promise.race([next(), timeoutPromise]);
    },
  }),

  retry: <T = unknown, R = unknown>(attempts: number = 3): Middleware<T, R> => ({
    name: 'retry',
    priority: 996,
    async execute(context, next) {
      let lastError: Error | undefined;
      
      for (let i = 0; i < attempts; i++) {
        try {
          return await next();
        } catch (error) {
          lastError = error as Error;
          context.logger?.debug(`Retry attempt ${i + 1}/${attempts}`);
        }
      }
      
      throw lastError;
    },
  }),
};
