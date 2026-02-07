/**
 * Base Agent - 高度抽象的智能体基类
 *
 * 设计原则：
 * 1. 单一职责 - 每个Agent只负责一类任务
 * 2. 开闭原则 - 对扩展开放，对修改关闭
 * 3. 依赖倒置 - 依赖抽象，不依赖具体实现
 * 4. 接口隔离 - 最小化接口，避免臃肿
 * 5. 里氏替换 - 子类可完全替换父类
 *
 * 标准接口设计：
 * - IAgent: 基础Agent接口
 * - IExecutable: 可执行接口
 * - IStateful: 有状态接口
 * - IConfigurable: 可配置接口
 * - ILifecycle: 生命周期接口
 * - IEventEmitter: 事件接口
 *
 * @module BaseAgent
 * @version 5.0.0
 * @standard Agent Architecture Standard
 */

import { EventEmitter } from '../utils/event-emitter.js';
import { AgentContext, AgentContextConfig } from './agent-context.js';

// ============================================================================
/**
 * Simple logger interface for agent usage
 */
export type AgentLogger = import('../utils/logger').ILogger;

// ============================================================================
// 标准接口定义
// ============================================================================

/**
 * Agent唯一标识
 */
export interface AgentIdentity {
  /** 唯一ID */
  readonly id: string;
  /** 名称 */
  readonly name: string;
  /** 描述 */
  readonly description?: string;
  /** 版本 */
  readonly version: string;
  /** 类型 */
  readonly type: string;
}

/**
 * Agent状态
 */
export interface AgentState {
  /** 状态值 */
  status: AgentStatus;
  /** 创建时间 */
  readonly createdAt: Date;
  /** 最后更新时间 */
  lastUpdatedAt: Date;
  /** 执行次数 */
  executionCount: number;
  /** 总执行时间(ms) */
  totalExecutionTime: number;
  /** 元数据 */
  metadata: Record<string, unknown>;
}

/**
 * Agent状态枚举
 */
export enum AgentStatus {
  UNINITIALIZED = 'uninitialized',
  INITIALIZING = 'initializing',
  IDLE = 'idle',
  READY = 'ready',
  EXECUTING = 'executing',
  PAUSED = 'paused',
  ERROR = 'error',
  DESTROYING = 'destroying',
  DESTROYED = 'destroyed',
}

/**
 * Agent能力
 */
export interface AgentCapabilities {
  /** 是否支持规划 */
  canPlan?: boolean;
  /** 是否支持推理 */
  canReason?: boolean;
  /** 是否支持工具 */
  canUseTools?: boolean;
  /** 是否支持技能 */
  canUseSkills?: boolean;
  /** 是否支持记忆 */
  hasMemory?: boolean;
  /** 是否支持学习 */
  canLearn?: boolean;
  /** 是否支持反思 */
  canReflect?: boolean;
  /** 是否支持流式输出 */
  canStream?: boolean;
}

/**
 * Agent配置
 */
export interface AgentConfig {
  /** 身份配置 */
  identity?: Partial<AgentIdentity>;
  /** 能力配置 */
  capabilities?: Partial<AgentCapabilities>;
  /** 执行限制 */
  limits?: ExecutionLimits;
  /** 日志器 */
  logger?: AgentLogger;
  /** 智能体上下文 */
  context?: AgentContext;
  /** 上下文配置（如果没有提供context） */
  contextConfig?: AgentContextConfig;
}

/**
 * 执行限制
 */
export interface ExecutionLimits {
  /** 最大Token数 */
  maxTokens?: number;
  /** 最大执行时间(ms) */
  maxExecutionTime?: number;
  /** 最大迭代次数 */
  maxIterations?: number;
  /** 最大并发数 */
  maxConcurrency?: number;
}

/**
 * 执行上下文
 */
export interface ExecutionContext {
  /** 执行ID */
  readonly executionId: string;
  /** 父执行ID */
  readonly parentExecutionId?: string;
  /** 输入 */
  readonly input: unknown;
  /** 开始时间 */
  readonly startedAt: Date;
  /** 元数据 */
  readonly metadata: Record<string, unknown>;
}

/**
 * 执行结果
 */
export interface ExecutionResult<T = unknown> {
  /** 是否成功 */
  success: boolean;
  /** 输出 */
  output?: T;
  /** 错误 */
  error?: ExecutionError;
  /** 执行ID */
  executionId: string;
  /** 执行时间(ms) */
  duration: number;
  /** Token消耗 */
  tokensUsed?: number;
  /** 执行时间（别名） */
  executionTime?: number;
  /** Token 详情 */
  tokens?: {
    prompt: number;
    completion: number;
    total: number;
  };
  /** 执行步骤 */
  steps?: ExecutionStep[];
}

/**
 * 执行错误
 */
export interface ExecutionError extends Error {
  /** 错误码 */
  code: string;
  /** 错误消息 */
  message: string;
  /** 是否可恢复 */
  recoverable: boolean;
  /** 详情 */
  details?: unknown;
  /** 错误名称 */
  name: string;
}

/**
 * 执行步骤
 */
export interface ExecutionStep {
  /** 步骤ID */
  id: string;
  /** 步骤类型 */
  type: string;
  /** 名称 */
  name?: string;
  /** 描述 */
  description?: string;
  /** 状态 */
  status: 'pending' | 'running' | 'completed' | 'failed';
  /** 开始时间 */
  startedAt?: Date;
  /** 结束时间 */
  endedAt?: Date;
  /** 输入 */
  input?: unknown;
  /** 输出 */
  output?: unknown;
  /** 错误 */
  error?: ExecutionError;
}

/**
 * Agent事件
 */
export interface AgentEvent<T = unknown> {
  /** 事件类型 */
  type: string;
  /** 时间戳 */
  timestamp: Date;
  /** 事件源 */
  source: string;
  /** 事件数据 */
  payload: T;
}

/**
 * 基础Agent接口
 */
export interface IAgent extends AgentIdentity {
  /** 当前状态 */
  readonly state: AgentState;
  /** 能力 */
  readonly capabilities: AgentCapabilities;

  /** 初始化 */
  initialize(): Promise<void>;
  /** 执行 */
  execute<T>(input: unknown, context?: Record<string, unknown>): Promise<ExecutionResult<T>>;
  /** 销毁 */
  destroy(): Promise<void>;
}

/**
 * 可配置接口
 */
export interface IConfigurable<T extends AgentConfig> {
  /** 获取配置 */
  getConfig(): T;
  /** 更新配置 */
  updateConfig(config: Partial<T>): void;
}

/**
 * 有状态接口
 */
export interface IStateful<T extends AgentState> {
  /** 获取状态 */
  getState(): T;
  /** 设置状态 */
  setState(state: Partial<T>): void;
}

/**
 * 生命周期接口
 */
export interface ILifecycle {
  /** 初始化前钩子 */
  onBeforeInitialize?(): Promise<void> | void;
  /** 初始化后钩子 */
  onAfterInitialize?(): Promise<void> | void;
  /** 执行前钩子 */
  onBeforeExecute?(input: unknown, context?: Record<string, unknown>): Promise<void> | void;
  /** 执行后钩子 */
  onAfterExecute?(result: ExecutionResult): Promise<void> | void;
  /** 销毁前钩子 */
  onBeforeDestroy?(): Promise<void> | void;
  /** 销毁后钩子 */
  onAfterDestroy?(): Promise<void> | void;
}

// ============================================================================
// 抽象基类
// ============================================================================

/**
 * Agent事件类型
 */
export type BaseAgentEvent =
  | { type: 'agent:initialized'; payload: { timestamp: Date } }
  | { type: 'agent:executing'; payload: { executionId: string; input: unknown } }
  | { type: 'agent:completed'; payload: { executionId: string; result: ExecutionResult } }
  | { type: 'agent:failed'; payload: { executionId: string; error: ExecutionError } }
  | { type: 'agent:destroyed'; payload: { timestamp: Date } }
  | { type: 'state:changed'; payload: { from: AgentStatus; to: AgentStatus } };

/**
 * 抽象Agent基类
 *
 * 所有具体Agent的基类，提供：
 * 1. 标准生命周期管理
 * 2. 统一事件系统
 * 3. 状态管理
 * 4. 配置管理
 * 5. 执行框架
 */
export abstract class BaseAgent<TConfig extends AgentConfig = AgentConfig>
  extends EventEmitter
  implements IAgent, IConfigurable<TConfig>, IStateful<AgentState>, ILifecycle
{
  // 身份属性
  readonly id: string;
  readonly name: string;
  readonly description?: string;
  readonly version: string;
  abstract readonly type: string;

  // 配置
  protected config: TConfig;

  // 状态
  protected _state: AgentState;

  // 能力
  protected _capabilities: AgentCapabilities;

  // 日志器（使用 agentLogger 避免与 EventEmitter 的 logger 冲突）
  protected agentLogger: AgentLogger;

  // 智能体上下文
  readonly context: AgentContext;

  // 执行计数器
  private executionCounter = 0;

  constructor(config: TConfig) {
    super();

    // 初始化配置
    this.config = this.mergeWithDefaultConfig(config);

    // 初始化身份
    this.id = this.config.identity?.id || this.generateId();
    this.name = this.config.identity?.name || 'UnnamedAgent';
    this.description = this.config.identity?.description;
    this.version = this.config.identity?.version || '1.0.0';

    // 初始化上下文
    if (this.config.context) {
      this.context = this.config.context;
    } else if (this.config.contextConfig) {
      this.context = new AgentContext(this.config.contextConfig);
    } else {
      throw new Error('Either context or contextConfig must be provided');
    }

    // 使用上下文的日志器
    this.agentLogger = this.config.logger || this.context.logger;

    // 初始化能力
    this._capabilities = this.initCapabilities();

    // 初始化状态
    this._state = {
      status: AgentStatus.UNINITIALIZED,
      createdAt: new Date(),
      lastUpdatedAt: new Date(),
      executionCount: 0,
      totalExecutionTime: 0,
      metadata: {},
    };

    this.agentLogger.info(`[${this.id}] Agent created: ${this.name} (${this.constructor.name})`);
  }

  // ============================================================================
  // 公共属性
  // ============================================================================

  /**
   * 获取当前状态
   */
  get state(): AgentState {
    return Object.freeze({ ...this._state });
  }

  /**
   * 获取能力
   */
  get capabilities(): AgentCapabilities {
    return Object.freeze({ ...this._capabilities });
  }

  // ============================================================================
  // 生命周期管理
  // ============================================================================

  /**
   * 初始化Agent
   *
   * 标准初始化流程：
   * 1. onBeforeInitialize - 子类前置初始化
   * 2. doInitialize - 子类具体初始化
   * 3. onAfterInitialize - 子类后置初始化
   */
  async initialize(): Promise<void> {
    if (this._state.status !== AgentStatus.UNINITIALIZED) {
      throw new Error(`Cannot initialize agent in status: ${this._state.status}`);
    }

    await this.transitionTo(AgentStatus.INITIALIZING);

    try {
      // 前置钩子
      await this.onBeforeInitialize?.();

      // 具体初始化
      await this.doInitialize();

      // 后置钩子
      await this.onAfterInitialize?.();

      await this.transitionTo(AgentStatus.IDLE);

      this.emit('agent:initialized', { timestamp: new Date() });
      this.agentLogger.info(`[${this.id}] Agent initialized`);
    } catch (error) {
      await this.transitionTo(AgentStatus.ERROR);
      this.agentLogger.error(`[${this.id}] Initialization failed:`, { error: (error as Error).message });
      throw error;
    }
  }

  /**
   * 执行请求
   *
   * 标准执行流程：
   * 1. onBeforeExecute - 前置钩子
   * 2. doExecute - 具体执行
   * 3. onAfterExecute - 后置钩子
   */
  async execute<T>(input: unknown, context?: Record<string, unknown>): Promise<ExecutionResult<T>> {
    if (this._state.status !== AgentStatus.IDLE && this._state.status !== AgentStatus.READY) {
      throw new Error(`Cannot execute in status: ${this._state.status}`);
    }

    const executionId = this.generateExecutionId();
    const startTime = Date.now();

    this.agentLogger.info(`[${this.id}] Execution started: ${executionId}`);
    this.emit('agent:executing', { executionId, input });

    try {
      await this.transitionTo(AgentStatus.EXECUTING);

      // 前置钩子
      await this.onBeforeExecute?.(input, context);

      // 具体执行
      const result = await this.doExecute<T>(input, context, executionId);

      // 后置钩子
      await this.onAfterExecute?.(result);

      // 更新统计
      this.updateExecutionStats(startTime);

      await this.transitionTo(AgentStatus.IDLE);

      this.emit('agent:completed', { executionId, result });
      this.agentLogger.info(`[${this.id}] Execution completed: ${executionId} (${result.duration}ms)`);

      return result;
    } catch (error) {
      await this.transitionTo(AgentStatus.ERROR);

      const errorResult: ExecutionResult<T> = {
        success: false,
        error: {
          code: 'EXECUTION_FAILED',
          message: (error as Error).message,
          recoverable: false,
          name: 'ExecutionError',
        },
        executionId,
        duration: Date.now() - startTime,
      };

      this.emit('agent:failed', { executionId, error: errorResult.error! });
      this.agentLogger.error(`[${this.id}] Execution failed: ${executionId}`, { error: (error as Error).message });

      return errorResult;
    }
  }

  /**
   * 销毁Agent
   *
   * 标准销毁流程：
   * 1. onBeforeDestroy - 前置钩子
   * 2. doDestroy - 具体销毁
   * 3. onAfterDestroy - 后置钩子
   */
  async destroy(): Promise<void> {
    if (
      this._state.status === AgentStatus.DESTROYED ||
      this._state.status === AgentStatus.DESTROYING
    ) {
      return;
    }

    await this.transitionTo(AgentStatus.DESTROYING);

    try {
      // 前置钩子
      await this.onBeforeDestroy?.();

      // 具体销毁
      await this.doDestroy();

      // 后置钩子
      await this.onAfterDestroy?.();

      // 清理
      this.removeAllListeners();

      await this.transitionTo(AgentStatus.DESTROYED);

      this.emit('agent:destroyed', { timestamp: new Date() });
      this.agentLogger.info(`[${this.id}] Agent destroyed`);
    } catch (error) {
      this.agentLogger.error(`[${this.id}] Destruction failed:`, { error: (error as Error).message });
      throw error;
    }
  }

  // ============================================================================
  // 配置管理
  // ============================================================================

  /**
   * 获取配置
   */
  getConfig(): TConfig {
    return Object.freeze({ ...this.config });
  }

  /**
   * 更新配置
   */
  updateConfig(config: Partial<TConfig>): void {
    this.config = { ...this.config, ...config };
    this.agentLogger.debug(`[${this.id}] Config updated`);
  }

  // ============================================================================
  // 状态管理
  // ============================================================================

  /**
   * 获取状态
   */
  getState(): AgentState {
    return this.state;
  }

  /**
   * 设置状态
   */
  setState(state: Partial<AgentState>): void {
    this._state = { ...this._state, ...state, lastUpdatedAt: new Date() };
  }

  // ============================================================================
  // 抽象方法 - 子类必须实现
  // ============================================================================

  /**
   * 初始化能力
   */
  protected abstract initCapabilities(): AgentCapabilities;

  /**
   * 具体初始化逻辑
   */
  protected abstract doInitialize(): Promise<void>;

  /**
   * 具体执行逻辑
   */
  protected abstract doExecute<T>(
    input: unknown,
    context: Record<string, unknown> | undefined,
    executionId: string
  ): Promise<ExecutionResult<T>>;

  /**
   * 具体销毁逻辑
   */
  protected abstract doDestroy(): Promise<void>;

  // ============================================================================
  // 可选生命周期钩子
  // ============================================================================

  onBeforeInitialize?(): Promise<void> | void;
  onAfterInitialize?(): Promise<void> | void;
  onBeforeExecute?(input: unknown, context?: Record<string, unknown>): Promise<void> | void;
  onAfterExecute?(result: ExecutionResult): Promise<void> | void;
  onBeforeDestroy?(): Promise<void> | void;
  onAfterDestroy?(): Promise<void> | void;

  // ============================================================================
  // 私有方法
  // ============================================================================

  /**
   * 状态转换
   */
  private async transitionTo(status: AgentStatus): Promise<void> {
    const from = this._state.status;
    this._state.status = status;
    this._state.lastUpdatedAt = new Date();

    this.emit('state:changed', { from, to: status });
    this.agentLogger.debug(`[${this.id}] State transition: ${from} -> ${status}`);
  }

  /**
   * 更新执行统计
   */
  private updateExecutionStats(startTime: number): void {
    this.executionCounter++;
    this._state.executionCount = this.executionCounter;
    this._state.totalExecutionTime += Date.now() - startTime;
  }

  /**
   * 生成唯一ID
   */
  private generateId(): string {
    return `agent-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  }

  /**
   * 生成执行ID
   */
  private generateExecutionId(): string {
    return `exec-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  }

  /**
   * 合并默认配置
   */
  private mergeWithDefaultConfig(config: TConfig): TConfig {
    return {
      identity: {},
      capabilities: {},
      limits: {},
      ...config,
    } as TConfig;
  }
}

// ============================================================================
// 便捷函数
// ============================================================================

/**
 * 创建Agent配置
 */
export function createAgentConfig(config: Partial<AgentConfig> = {}): AgentConfig {
  return {
    identity: {
      id: `agent-${Date.now()}`,
      name: 'Agent',
      version: '1.0.0',
      ...config.identity,
    },
    capabilities: {
      canPlan: false,
      canReason: false,
      canUseTools: false,
      canUseSkills: false,
      hasMemory: false,
      canLearn: false,
      canReflect: false,
      canStream: false,
      ...config.capabilities,
    },
    limits: {
      maxTokens: 10000,
      maxExecutionTime: 60000,
      maxIterations: 10,
      ...config.limits,
    },
    ...config,
  };
}

// Note: Types are exported from types.ts to avoid conflicts
