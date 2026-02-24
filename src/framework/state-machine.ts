/**
 * State Machine - 标准化状态机组件
 *
 * 提供类型安全的状态机实现
 * - 状态转换验证
 * - 进入/退出钩子
 * - 状态历史追踪
 * - 条件转换
 *
 * @module Framework/StateMachine
 * @version 1.0.0
 */

import { createLogger, type ILogger } from '../utils/logger.js';

export type State = string;

export interface StateConfig<TContext = unknown> {
  name: State;
  onEnter?: (context: TContext, from: State) => void | Promise<void>;
  onExit?: (context: TContext, to: State) => void | Promise<void>;
  final?: boolean;
}

export interface TransitionConfig<TContext = unknown> {
  from: State | State[];
  to: State;
  guard?: (context: TContext) => boolean;
  action?: (context: TContext) => void | Promise<void>;
}

export interface StateMachineConfig<TContext = unknown> {
  name: string;
  initialState: State;
  states: StateConfig<TContext>[];
  transitions: TransitionConfig<TContext>[];
  context?: TContext;
  enableHistory?: boolean;
  maxHistorySize?: number;
  logger?: ILogger;
}

export interface StateHistoryEntry {
  from: State;
  to: State;
  timestamp: number;
  trigger?: string;
}

export interface StateMachineEvents<TContext = unknown> {
  'state:enter': { state: State; from: State; context: TContext };
  'state:exit': { state: State; to: State; context: TContext };
  'state:change': { from: State; to: State; context: TContext };
  'transition:blocked': { from: State; to: State; reason: string };
  'transition:error': { from: State; to: State; error: Error };
}

export class StateMachine<TContext = unknown> {
  private _state: State;
  private states: Map<State, StateConfig<TContext>> = new Map();
  private transitions: Map<State, TransitionConfig<TContext>[]> = new Map();
  private context: TContext;
  private history: StateHistoryEntry[] = [];
  private logger: ILogger;
  private config: Required<Omit<StateMachineConfig<TContext>, 'logger'>> & { logger?: ILogger };
  private eventHandlers: Map<string, Set<(data: unknown) => void>> = new Map();

  constructor(config: StateMachineConfig<TContext>) {
    this.config = {
      name: config.name,
      initialState: config.initialState,
      states: config.states,
      transitions: config.transitions,
      context: config.context ?? ({} as TContext),
      enableHistory: config.enableHistory ?? false,
      maxHistorySize: config.maxHistorySize ?? 100,
      logger: config.logger,
    };

    this.logger = config.logger ?? createLogger({ name: `StateMachine:${config.name}` });
    this.context = this.config.context;

    for (const state of config.states) {
      this.states.set(state.name, state);
    }

    for (const transition of config.transitions) {
      const fromStates = Array.isArray(transition.from) ? transition.from : [transition.from];
      for (const from of fromStates) {
        if (!this.transitions.has(from)) {
          this.transitions.set(from, []);
        }
        this.transitions.get(from)!.push(transition);
      }
    }

    this._state = config.initialState;
  }

  get state(): State {
    return this._state;
  }

  get contextValue(): TContext {
    return this.context;
  }

  updateContext(updates: Partial<TContext>): void {
    this.context = { ...this.context, ...updates };
  }

  canTransitionTo(targetState: State): boolean {
    const transitions = this.transitions.get(this._state) || [];
    return transitions.some(t => {
      if (t.to !== targetState) return false;
      if (t.guard && !t.guard(this.context)) return false;
      return true;
    });
  }

  getAvailableTransitions(): State[] {
    const transitions = this.transitions.get(this._state) || [];
    return transitions
      .filter(t => !t.guard || t.guard(this.context))
      .map(t => t.to);
  }

  async transition(targetState: State, trigger?: string): Promise<boolean> {
    const fromState = this._state;
    const transitions = this.transitions.get(fromState) || [];

    const transition = transitions.find(t => t.to === targetState);
    if (!transition) {
      this.logger.warn(`Invalid transition: ${fromState} -> ${targetState}`);
      this.emit('transition:blocked', { from: fromState, to: targetState, reason: 'Invalid transition' });
      return false;
    }

    if (transition.guard && !transition.guard(this.context)) {
      this.logger.debug(`Transition blocked by guard: ${fromState} -> ${targetState}`);
      this.emit('transition:blocked', { from: fromState, to: targetState, reason: 'Guard condition failed' });
      return false;
    }

    try {
      const fromConfig = this.states.get(fromState);
      const toConfig = this.states.get(targetState);

      if (fromConfig?.onExit) {
        await fromConfig.onExit(this.context, targetState);
      }
      this.emit('state:exit', { state: fromState, to: targetState, context: this.context });

      if (transition.action) {
        await transition.action(this.context);
      }

      this._state = targetState;

      if (toConfig?.onEnter) {
        await toConfig.onEnter(this.context, fromState);
      }
      this.emit('state:enter', { state: targetState, from: fromState, context: this.context });

      if (this.config.enableHistory) {
        this.history.push({
          from: fromState,
          to: targetState,
          timestamp: Date.now(),
          trigger,
        });
        if (this.history.length > this.config.maxHistorySize) {
          this.history.shift();
        }
      }

      this.emit('state:change', { from: fromState, to: targetState, context: this.context });
      this.logger.debug(`State changed: ${fromState} -> ${targetState}`);

      return true;
    } catch (error) {
      this.logger.error(`Transition error: ${fromState} -> ${targetState}`, { error });
      this.emit('transition:error', { from: fromState, to: targetState, error: error as Error });
      return false;
    }
  }

  forceTransition(targetState: State, trigger?: string): void {
    const fromState = this._state;

    if (this.config.enableHistory) {
      this.history.push({
        from: fromState,
        to: targetState,
        timestamp: Date.now(),
        trigger,
      });
    }

    this._state = targetState;
    this.emit('state:change', { from: fromState, to: targetState, context: this.context });
    this.logger.warn(`Forced transition: ${fromState} -> ${targetState}`);
  }

  reset(): void {
    const fromState = this._state;
    this._state = this.config.initialState;
    this.history = [];

    this.emit('state:change', { from: fromState, to: this._state, context: this.context });
    this.logger.info(`State machine reset to initial state: ${this._state}`);
  }

  isFinalState(): boolean {
    const stateConfig = this.states.get(this._state);
    return stateConfig?.final ?? false;
  }

  getHistory(): StateHistoryEntry[] {
    return [...this.history];
  }

  getLastTransition(): StateHistoryEntry | undefined {
    return this.history[this.history.length - 1];
  }

  getStateConfig(state?: State): StateConfig<TContext> | undefined {
    return this.states.get(state ?? this._state);
  }

  getAllStates(): State[] {
    return Array.from(this.states.keys());
  }

  getTransitionsFrom(state?: State): TransitionConfig<TContext>[] {
    return this.transitions.get(state ?? this._state) ?? [];
  }

  on<K extends keyof StateMachineEvents<TContext>>(
    event: K,
    handler: (data: StateMachineEvents<TContext>[K]) => void
  ): () => void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, new Set());
    }
    this.eventHandlers.get(event)!.add(handler as (data: unknown) => void);

    return () => {
      this.eventHandlers.get(event)?.delete(handler as (data: unknown) => void);
    };
  }

  private emit<K extends keyof StateMachineEvents<TContext>>(
    event: K,
    data: StateMachineEvents<TContext>[K]
  ): void {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      for (const handler of handlers) {
        try {
          handler(data);
        } catch (error) {
          this.logger.error(`Event handler error for ${event}`, { error });
        }
      }
    }
  }
}

export function createStateMachine<TContext = unknown>(
  config: StateMachineConfig<TContext>
): StateMachine<TContext> {
  return new StateMachine(config);
}

export function defineStateMachine<TContext = unknown>(
  name: string,
  definition: {
    states: StateConfig<TContext>[];
    transitions: TransitionConfig<TContext>[];
    initial: State;
  }
): (context?: TContext) => StateMachine<TContext> {
  return (context?: TContext) => {
    return new StateMachine({
      name,
      initialState: definition.initial,
      states: definition.states,
      transitions: definition.transitions,
      context,
    });
  };
}

export const CommonStates = {
  IDLE: 'idle',
  INITIALIZING: 'initializing',
  READY: 'ready',
  RUNNING: 'running',
  PAUSED: 'paused',
  STOPPING: 'stopping',
  STOPPED: 'stopped',
  ERROR: 'error',
  COMPLETED: 'completed',
} as const;

export const CommonTransitions = {
  initialize: { from: CommonStates.IDLE, to: CommonStates.INITIALIZING },
  ready: { from: CommonStates.INITIALIZING, to: CommonStates.READY },
  start: { from: CommonStates.READY, to: CommonStates.RUNNING },
  pause: { from: CommonStates.RUNNING, to: CommonStates.PAUSED },
  resume: { from: CommonStates.PAUSED, to: CommonStates.RUNNING },
  stop: { from: [CommonStates.RUNNING, CommonStates.PAUSED], to: CommonStates.STOPPING },
  stopped: { from: CommonStates.STOPPING, to: CommonStates.STOPPED },
  error: { from: [CommonStates.INITIALIZING, CommonStates.READY, CommonStates.RUNNING], to: CommonStates.ERROR },
  recover: { from: CommonStates.ERROR, to: CommonStates.READY },
  complete: { from: CommonStates.RUNNING, to: CommonStates.COMPLETED },
} as const;
