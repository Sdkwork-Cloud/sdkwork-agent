/**
 * Application Lifecycle Manager - 应用生命周期管理
 *
 * 提供完整的应用生命周期管理：
 * - 启动/停止/重启
 * - 优雅关闭
 * - 状态管理
 * - 钩子系统
 *
 * @module Framework/Lifecycle
 * @version 1.0.0
 */

import { TypedEventEmitter } from '../utils/typed-event-emitter.js';
import { createLogger, type ILogger } from '../utils/logger.js';
import { Container, type DIModule } from '../di/container.js';

export type AppState = 
  | 'created'
  | 'initializing'
  | 'initialized'
  | 'starting'
  | 'started'
  | 'stopping'
  | 'stopped'
  | 'error';

export interface LifecycleHook {
  name: string;
  priority: number;
  handler: (app: Application) => Promise<void>;
}

export interface ApplicationConfig {
  name: string;
  version: string;
  modules?: DIModule[];
  hooks?: {
    beforeInit?: LifecycleHook[];
    afterInit?: LifecycleHook[];
    beforeStart?: LifecycleHook[];
    afterStart?: LifecycleHook[];
    beforeStop?: LifecycleHook[];
    afterStop?: LifecycleHook[];
  };
  shutdownTimeout?: number;
}

interface AppEvents extends Record<string, unknown> {
  'app:state-change': { from: AppState; to: AppState };
  'app:error': { error: Error; phase: string };
  'app:init': void;
  'app:start': void;
  'app:stop': void;
}

export abstract class Application extends TypedEventEmitter<AppEvents> {
  protected state: AppState = 'created';
  protected container: Container;
  protected config: ApplicationConfig;
  protected appLogger: ILogger;
  protected shutdownHandlers: Array<() => Promise<void>> = [];

  constructor(config: ApplicationConfig) {
    super();
    this.config = {
      shutdownTimeout: 30000,
      ...config,
    };
    this.container = new Container();
    this.appLogger = createLogger({ name: config.name });
    
    this.setupShutdownHandlers();
  }

  getState(): AppState {
    return this.state;
  }

  setState(newState: AppState): void {
    const oldState = this.state;
    this.state = newState;
    this.emit('app:state-change', { from: oldState, to: newState });
    this.appLogger.debug(`State changed: ${oldState} -> ${newState}`);
  }

  getContainer(): Container {
    return this.container;
  }

  async initialize(): Promise<void> {
    if (this.state !== 'created') {
      throw new Error(`Cannot initialize from state: ${this.state}`);
    }

    this.setState('initializing');

    try {
      await this.runHooks('beforeInit');
      
      this.registerCoreServices();
      await this.loadModules();
      await this.onInitialize();
      
      await this.runHooks('afterInit');
      
      this.setState('initialized');
      this.emit('app:init', undefined);
    } catch (error) {
      this.setState('error');
      this.emit('app:error', { error: error as Error, phase: 'initialize' });
      throw error;
    }
  }

  async start(): Promise<void> {
    if (this.state !== 'initialized') {
      throw new Error(`Cannot start from state: ${this.state}`);
    }

    this.setState('starting');

    try {
      await this.runHooks('beforeStart');
      
      await this.onStart();
      
      await this.runHooks('afterStart');
      
      this.setState('started');
      this.emit('app:start', undefined);
      this.appLogger.info(`${this.config.name} started`);
    } catch (error) {
      this.setState('error');
      this.emit('app:error', { error: error as Error, phase: 'start' });
      throw error;
    }
  }

  async stop(): Promise<void> {
    if (this.state !== 'started') {
      return;
    }

    this.setState('stopping');

    try {
      await this.runHooks('beforeStop');
      
      await this.onStop();
      
      await this.runHooks('afterStop');
      
      this.setState('stopped');
      this.emit('app:stop', undefined);
      this.appLogger.info(`${this.config.name} stopped`);
    } catch (error) {
      this.setState('error');
      this.emit('app:error', { error: error as Error, phase: 'stop' });
      throw error;
    }
  }

  async restart(): Promise<void> {
    await this.stop();
    this.setState('initialized');
    await this.start();
  }

  registerShutdownHandler(handler: () => Promise<void>): void {
    this.shutdownHandlers.push(handler);
  }

  protected abstract onInitialize(): Promise<void>;
  protected abstract onStart(): Promise<void>;
  protected abstract onStop(): Promise<void>;

  protected registerCoreServices(): void {
    this.container.registerInstance('Logger', this.appLogger);
    this.container.registerInstance('Application', this);
  }

  protected async loadModules(): Promise<void> {
    if (this.config.modules) {
      for (const module of this.config.modules) {
        this.appLogger.debug(`Loading module: ${module.name}`);
        module.register(this.container);
      }
    }
  }

  protected async runHooks(phase: keyof NonNullable<ApplicationConfig['hooks']>): Promise<void> {
    const hooks = this.config.hooks?.[phase];
    if (!hooks) return;

    const sorted = [...hooks].sort((a, b) => b.priority - a.priority);
    
    for (const hook of sorted) {
      this.appLogger.debug(`Running hook: ${hook.name} (${phase})`);
      await hook.handler(this);
    }
  }

  protected setupShutdownHandlers(): void {
    const gracefulShutdown = async (signal: string) => {
      this.appLogger.info(`Received ${signal}, starting graceful shutdown...`);
      
      const timeout = this.config.shutdownTimeout!;
      const timer = setTimeout(() => {
        this.appLogger.error('Shutdown timeout exceeded, forcing exit');
        process.exit(1);
      }, timeout);

      try {
        for (const handler of this.shutdownHandlers) {
          await handler();
        }
        await this.stop();
        clearTimeout(timer);
        process.exit(0);
      } catch (error) {
        this.appLogger.error('Error during shutdown', { error });
        process.exit(1);
      }
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
  }
}

export function createLifecycleHook(
  name: string,
  handler: (app: Application) => Promise<void>,
  priority: number = 0
): LifecycleHook {
  return { name, handler, priority };
}

export type { DIModule } from '../di/container.js';
