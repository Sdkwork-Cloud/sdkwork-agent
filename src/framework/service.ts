/**
 * Service Base Classes - 服务基类
 *
 * 提供标准化的服务实现模式：
 * - 生命周期管理
 * - 状态追踪
 * - 错误处理
 * - 日志集成
 *
 * @module Framework/Service
 * @version 1.0.0
 */

import { TypedEventEmitter } from '../utils/typed-event-emitter.js';
import { createLogger, type ILogger } from '../utils/logger.js';

export type ServiceState = 'created' | 'initializing' | 'ready' | 'running' | 'stopping' | 'stopped' | 'error';

export interface ServiceConfig {
  name: string;
  autoStart?: boolean;
}

interface ServiceEvents extends Record<string, unknown> {
  'service:state-change': { from: ServiceState; to: ServiceState };
  'service:error': { error: Error; phase: string };
  'service:ready': void;
}

export abstract class BaseService extends TypedEventEmitter<ServiceEvents> {
  protected state: ServiceState = 'created';
  protected serviceLogger: ILogger;
  protected config: ServiceConfig;

  constructor(config: ServiceConfig) {
    super();
    this.config = config;
    this.serviceLogger = createLogger({ name: config.name });
  }

  getState(): ServiceState {
    return this.state;
  }

  protected setState(newState: ServiceState): void {
    const oldState = this.state;
    this.state = newState;
    this.emit('service:state-change', { from: oldState, to: newState });
    this.serviceLogger.debug(`State: ${oldState} -> ${newState}`);
  }

  async initialize(): Promise<void> {
    if (this.state !== 'created') {
      throw new Error(`Cannot initialize from state: ${this.state}`);
    }

    this.setState('initializing');

    try {
      await this.onInitialize();
      this.setState('ready');
      this.emit('service:ready', undefined);
    } catch (error) {
      this.setState('error');
      this.emit('service:error', { error: error as Error, phase: 'initialize' });
      throw error;
    }
  }

  async start(): Promise<void> {
    if (this.state !== 'ready') {
      throw new Error(`Cannot start from state: ${this.state}`);
    }

    try {
      await this.onStart();
      this.setState('running');
    } catch (error) {
      this.setState('error');
      this.emit('service:error', { error: error as Error, phase: 'start' });
      throw error;
    }
  }

  async stop(): Promise<void> {
    if (this.state !== 'running') {
      return;
    }

    this.setState('stopping');

    try {
      await this.onStop();
      this.setState('stopped');
    } catch (error) {
      this.setState('error');
      this.emit('service:error', { error: error as Error, phase: 'stop' });
      throw error;
    }
  }

  async destroy(): Promise<void> {
    if (this.state === 'running') {
      await this.stop();
    }
    await this.onDestroy();
    this.setState('stopped');
  }

  isReady(): boolean {
    return this.state === 'ready' || this.state === 'running';
  }

  isRunning(): boolean {
    return this.state === 'running';
  }

  protected abstract onInitialize(): Promise<void>;
  protected onStart(): Promise<void> { return Promise.resolve(); }
  protected onStop(): Promise<void> { return Promise.resolve(); }
  protected onDestroy(): Promise<void> { return Promise.resolve(); }
}

export abstract class SingletonService<T extends SingletonService<T> = any> extends BaseService {
  private static instances = new Map<string, SingletonService<any>>();

  constructor(config: ServiceConfig) {
    super(config);
    
    const existing = SingletonService.instances.get(config.name);
    if (existing) {
      return existing as T;
    }
    
    SingletonService.instances.set(config.name, this);
  }

  static getInstance<T extends SingletonService<any>>(name: string): T | undefined {
    return SingletonService.instances.get(name) as T | undefined;
  }

  static clearInstances(): void {
    SingletonService.instances.clear();
  }
}

export interface ServiceFactory<T extends BaseService> {
  create(config: ServiceConfig): T;
}

export function createServiceFactory<T extends BaseService>(
  ServiceClass: new (config: ServiceConfig) => T
): ServiceFactory<T> {
  return {
    create: (config: ServiceConfig) => new ServiceClass(config),
  };
}
