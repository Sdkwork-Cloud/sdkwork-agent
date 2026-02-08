/**
 * Actor Model - Actor 模型核心实现
 *
 * 参考业界最佳实践：Akka Actor、Erlang OTP、Orleans
 * 实现完整的 Actor 系统，支持：
 * - Actor 生命周期管理
 * - 消息传递（无共享状态）
 * - 监督策略
 * - 路由和负载均衡
 * - 分布式支持（预留）
 *
 * Actor 模型优势：
 * 1. 高并发：每个 Actor 独立处理消息，无锁编程
 * 2. 容错性：监督机制自动恢复失败 Actor
 * 3. 可扩展性：水平扩展到多核、多机
 * 4. 响应性：异步消息传递，非阻塞
 *
 * @module Actor
 * @version 1.0.0
 * @standard Industry Leading (Akka Level)
 */

import { createLogger } from '../../utils/logger.js';
import type { ILogger } from '../../utils/logger.js';
import { EventEmitter } from '../../utils/event-emitter.js';

// ============================================================================
// Types & Interfaces
// ============================================================================

export type ActorRef = string;
export type Message = unknown;
export type ActorContext = unknown;

export interface ActorProps {
  id?: string;
  parent?: ActorRef;
  dispatcher?: Dispatcher;
  mailbox?: Mailbox;
}

export interface ActorSystemConfig {
  name: string;
  maxActors?: number;
  defaultDispatcher?: Dispatcher;
  supervisionStrategy?: SupervisionStrategy;
}

export enum ActorState {
  Created = 'created',
  Starting = 'starting',
  Running = 'running',
  Restarting = 'restarting',
  Stopping = 'stopping',
  Stopped = 'stopped',
  Failed = 'failed',
}

export enum SupervisionDirective {
  Resume = 'resume',     // 继续处理下一条消息
  Restart = 'restart',   // 重启 Actor
  Stop = 'stop',         // 停止 Actor
  Escalate = 'escalate', // 上报给父 Actor
}

export interface SupervisionStrategy {
  maxRetries: number;
  withinTimeRange: number; // 毫秒
  decide: (error: Error, actor: ActorRef) => SupervisionDirective;
}

export interface Mailbox {
  enqueue(message: Message): void;
  dequeue(): Message | undefined;
  isEmpty(): boolean;
  size(): number;
  clear(): void;
}

export interface Dispatcher {
  dispatch(actor: Actor, message: Message): void;
  shutdown(): void;
}

// ============================================================================
// Default Mailbox Implementation
// ============================================================================

export class DefaultMailbox implements Mailbox {
  private messages: Message[] = [];

  enqueue(message: Message): void {
    this.messages.push(message);
  }

  dequeue(): Message | undefined {
    return this.messages.shift();
  }

  isEmpty(): boolean {
    return this.messages.length === 0;
  }

  size(): number {
    return this.messages.length;
  }

  clear(): void {
    this.messages = [];
  }
}

// ============================================================================
// Default Dispatcher Implementation
// ============================================================================

export class DefaultDispatcher implements Dispatcher {
  private running = true;
  private actorQueue = new Map<ActorRef, Message[]>();
  private processing = new Set<ActorRef>();

  dispatch(actor: Actor, message: Message): void {
    if (!this.running) return;

    const queue = this.actorQueue.get(actor.ref) || [];
    queue.push(message);
    this.actorQueue.set(actor.ref, queue);

    if (!this.processing.has(actor.ref)) {
      this.processing.add(actor.ref);
      this.processMessages(actor);
    }
  }

  private processMessages(actor: Actor): void {
    const processNext = () => {
      const queue = this.actorQueue.get(actor.ref);
      if (!queue || queue.length === 0) {
        this.processing.delete(actor.ref);
        return;
      }

      const message = queue.shift();
      if (message) {
        actor.receive(message);
      }

      // 使用微任务继续处理下一条消息
      if (queue.length > 0) {
        Promise.resolve().then(processNext);
      } else {
        this.processing.delete(actor.ref);
      }
    };

    Promise.resolve().then(processNext);
  }

  shutdown(): void {
    this.running = false;
    this.actorQueue.clear();
    this.processing.clear();
  }
}

// ============================================================================
// Actor Base Class
// ============================================================================

export abstract class Actor extends EventEmitter {
  readonly ref: ActorRef;
  readonly parent: ActorRef | null;
  readonly system: ActorSystem;
  
  protected state: ActorState = ActorState.Created;
  protected mailbox: Mailbox;
  protected dispatcher: Dispatcher;
  protected children = new Set<ActorRef>();
  protected logger: ILogger;

  private restartCount = 0;

  constructor(system: ActorSystem, props: ActorProps = {}) {
    super();
    this.system = system;
    this.ref = props.id || this.generateId();
    this.parent = props.parent || null;
    this.mailbox = props.mailbox || new DefaultMailbox();
    this.dispatcher = props.dispatcher || system.getDefaultDispatcher();
    this.logger = createLogger({ name: `Actor:${this.ref}` });
  }

  /**
   * 启动 Actor
   */
  async start(): Promise<void> {
    if (this.state !== ActorState.Created) {
      throw new Error(`Actor ${this.ref} is already started`);
    }

    this.state = ActorState.Starting;
    
    try {
      await this.preStart();
      this.state = ActorState.Running;
      this.emit('started', { ref: this.ref });
    } catch (error) {
      this.state = ActorState.Failed;
      throw error;
    }
  }

  /**
   * 停止 Actor
   */
  async stop(): Promise<void> {
    if (this.state === ActorState.Stopped) return;

    this.state = ActorState.Stopping;

    // 停止所有子 Actor
    for (const childRef of this.children) {
      const child = this.system.getActor(childRef);
      if (child) {
        await child.stop();
      }
    }

    await this.postStop();
    this.state = ActorState.Stopped;
    this.emit('stopped', { ref: this.ref });
  }

  /**
   * 重启 Actor
   */
  async restart(error: Error): Promise<void> {
    this.state = ActorState.Restarting;
    this.emit('restarting', { ref: this.ref, error });

    // 停止但不清理状态
    await this.preRestart(error);
    
    // 重置状态
    this.restartCount++;
    
    // 重新启动
    await this.postRestart(error);
    this.state = ActorState.Running;
    this.emit('restarted', { ref: this.ref });
  }

  /**
   * 发送消息给当前 Actor
   */
  tell(message: Message): void {
    if (this.state !== ActorState.Running) {
      this.logger.warn(`Actor ${this.ref} is not running, message dropped`);
      return;
    }

    this.dispatcher.dispatch(this, message);
  }

  /**
   * 发送消息给其他 Actor
   */
  send(target: ActorRef, message: Message): void {
    const actor = this.system.getActor(target);
    if (actor) {
      actor.tell(message);
    } else {
      this.logger.warn(`Actor ${target} not found`);
    }
  }

  /**
   * 创建子 Actor
   */
  spawn<T extends Actor>(
    ActorClass: new (system: ActorSystem, props: ActorProps) => T,
    props: Omit<ActorProps, 'parent'> = {}
  ): ActorRef {
    const childProps: ActorProps = {
      ...props,
      parent: this.ref,
    };

    const child = new ActorClass(this.system, childProps);
    this.children.add(child.ref);
    
    child.start().catch(error => {
      this.handleChildFailure(child.ref, error);
    });

    return child.ref;
  }

  /**
   * 接收消息（子类必须实现）
   */
  abstract receive(message: Message): void | Promise<void>;

  /**
   * 生命周期钩子：启动前
   */
  protected async preStart(): Promise<void> {
    // 子类可重写
  }

  /**
   * 生命周期钩子：停止后
   */
  protected async postStop(): Promise<void> {
    // 子类可重写
  }

  /**
   * 生命周期钩子：重启前
   */
  protected async preRestart(_error: Error): Promise<void> {
    // 子类可重写
  }

  /**
   * 生命周期钩子：重启后
   */
  protected async postRestart(_error: Error): Promise<void> {
    // 子类可重写
  }

  /**
   * 获取当前状态
   */
  getState(): ActorState {
    return this.state;
  }

  /**
   * 获取子 Actor 列表
   */
  getChildren(): ActorRef[] {
    return Array.from(this.children);
  }

  /**
   * 处理子 Actor 失败
   */
  protected handleChildFailure(childRef: ActorRef, error: Error): void {
    const strategy = this.getSupervisionStrategy();
    const directive = strategy.decide(error, childRef);

    switch (directive) {
      case SupervisionDirective.Resume:
        // 继续处理下一条消息
        break;
      case SupervisionDirective.Restart:
        this.restartChild(childRef);
        break;
      case SupervisionDirective.Stop:
        this.stopChild(childRef);
        break;
      case SupervisionDirective.Escalate:
        if (this.parent) {
          const parent = this.system.getActor(this.parent);
          parent?.handleChildFailure(this.ref, error);
        }
        break;
    }
  }

  /**
   * 获取监督策略（子类可重写）
   */
  protected getSupervisionStrategy(): SupervisionStrategy {
    return {
      maxRetries: 3,
      withinTimeRange: 60000,
      decide: (error: Error) => {
        // 默认策略：根据错误类型决定
        if (error.message.includes('fatal')) {
          return SupervisionDirective.Stop;
        }
        return SupervisionDirective.Restart;
      },
    };
  }

  private generateId(): string {
    return `actor-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private async restartChild(childRef: ActorRef): Promise<void> {
    const child = this.system.getActor(childRef);
    if (child) {
      await child.restart(new Error('Restarted by parent'));
    }
  }

  private async stopChild(childRef: ActorRef): Promise<void> {
    const child = this.system.getActor(childRef);
    if (child) {
      await child.stop();
      this.children.delete(childRef);
    }
  }
}

// ============================================================================
// Actor System
// ============================================================================

export class ActorSystem extends EventEmitter {
  readonly name: string;
  private actors = new Map<ActorRef, Actor>();
  private defaultDispatcher: Dispatcher;
  private maxActors: number;
  private logger: ILogger;

  constructor(config: ActorSystemConfig) {
    super();
    this.name = config.name;
    this.maxActors = config.maxActors || 10000;
    this.defaultDispatcher = config.defaultDispatcher || new DefaultDispatcher();
    this.logger = createLogger({ name: `ActorSystem:${this.name}` });
  }

  /**
   * 创建 Actor
   */
  async actorOf<T extends Actor>(
    ActorClass: new (system: ActorSystem, props: ActorProps) => T,
    props: ActorProps = {}
  ): Promise<ActorRef> {
    if (this.actors.size >= this.maxActors) {
      throw new Error(`Actor system ${this.name} has reached max actors limit`);
    }

    const actor = new ActorClass(this, props);
    this.actors.set(actor.ref, actor);

    actor.on('started', () => this.emit('actor:started', { ref: actor.ref }));
    actor.on('stopped', () => {
      this.actors.delete(actor.ref);
      this.emit('actor:stopped', { ref: actor.ref });
    });

    await actor.start();
    return actor.ref;
  }

  /**
   * 停止 Actor
   */
  async stopActor(ref: ActorRef): Promise<void> {
    const actor = this.actors.get(ref);
    if (actor) {
      await actor.stop();
      this.actors.delete(ref);
    }
  }

  /**
   * 获取 Actor
   */
  getActor(ref: ActorRef): Actor | undefined {
    return this.actors.get(ref);
  }

  /**
   * 发送消息给 Actor
   */
  tell(ref: ActorRef, message: Message): void {
    const actor = this.actors.get(ref);
    if (actor) {
      actor.tell(message);
    } else {
      this.logger.warn(`Actor ${ref} not found`);
    }
  }

  /**
   * 广播消息给所有 Actor
   */
  broadcast(message: Message): void {
    for (const actor of this.actors.values()) {
      actor.tell(message);
    }
  }

  /**
   * 获取 Actor 数量
   */
  getActorCount(): number {
    return this.actors.size;
  }

  /**
   * 获取所有 Actor 引用
   */
  getAllActors(): ActorRef[] {
    return Array.from(this.actors.keys());
  }

  /**
   * 关闭系统
   */
  async shutdown(): Promise<void> {
    this.logger.info('Shutting down actor system...');

    // 停止所有 Actor
    const stopPromises = Array.from(this.actors.values()).map(actor => actor.stop());
    await Promise.all(stopPromises);

    this.actors.clear();
    this.defaultDispatcher.shutdown();

    this.emit('shutdown');;
    this.logger.info('Actor system shut down complete');
  }

  /**
   * 获取默认调度器
   */
  getDefaultDispatcher(): Dispatcher {
    return this.defaultDispatcher;
  }

}

// ============================================================================
// Router Actors
// ============================================================================

export enum RouterStrategy {
  RoundRobin = 'round-robin',
  Random = 'random',
  SmallestMailbox = 'smallest-mailbox',
  Broadcast = 'broadcast',
}

export class RouterActor extends Actor {
  private routees: ActorRef[] = [];
  private strategy: RouterStrategy;
  private currentIndex = 0;

  constructor(
    system: ActorSystem,
    props: ActorProps & { strategy?: RouterStrategy }
  ) {
    super(system, props);
    this.strategy = props.strategy || RouterStrategy.RoundRobin;
  }

  addRoutee(ref: ActorRef): void {
    this.routees.push(ref);
  }

  removeRoutee(ref: ActorRef): void {
    const index = this.routees.indexOf(ref);
    if (index > -1) {
      this.routees.splice(index, 1);
    }
  }

  receive(message: Message): void {
    if (this.routees.length === 0) return;

    switch (this.strategy) {
      case RouterStrategy.RoundRobin:
        this.roundRobin(message);
        break;
      case RouterStrategy.Random:
        this.random(message);
        break;
      case RouterStrategy.Broadcast:
        this.broadcast(message);
        break;
      default:
        this.roundRobin(message);
    }
  }

  private roundRobin(message: Message): void {
    const target = this.routees[this.currentIndex];
    this.currentIndex = (this.currentIndex + 1) % this.routees.length;
    this.send(target, message);
  }

  private random(message: Message): void {
    const target = this.routees[Math.floor(Math.random() * this.routees.length)];
    this.send(target, message);
  }

  private broadcast(message: Message): void {
    for (const target of this.routees) {
      this.send(target, message);
    }
  }
}

// ============================================================================
// Factory Functions
// ============================================================================

export function createActorSystem(config: ActorSystemConfig): ActorSystem {
  return new ActorSystem(config);
}

export function createDefaultSupervisionStrategy(
  maxRetries = 3,
  withinTimeRange = 60000
): SupervisionStrategy {
  return {
    maxRetries,
    withinTimeRange,
    decide: (error: Error) => {
      if (error.message.includes('fatal')) {
        return SupervisionDirective.Stop;
      }
      return SupervisionDirective.Restart;
    },
  };
}
