import type { Skill } from './skill';
import type { Tool } from './tool';

/**
 * Execution Engine Domain - 执行引擎领域模型
 *
 * 设计原则：
 * 1. 规划-执行分离 - 先规划后执行，可追踪可回滚
 * 2. 容错机制 - 重试、降级、熔断
 * 3. 超时控制 - 精细化超时管理
 * 4. 可观测性 - 完整执行链路追踪
 *
 * @domain Execution
 * @version 1.0.0
 * @standard Industry Leading
 */

// ============================================
// Execution Status & State
// ============================================

/**
 * 执行状态
 */
export enum ExecutionStatus {
  PENDING = 'pending',           // 等待执行
  PLANNING = 'planning',         // 规划中
  PLANNED = 'planned',           // 规划完成
  EXECUTING = 'executing',       // 执行中
  WAITING = 'waiting',           // 等待输入/确认
  RETRYING = 'retrying',         // 重试中
  COMPLETED = 'completed',       // 完成
  FAILED = 'failed',             // 失败
  CANCELLED = 'cancelled',       // 取消
  TIMEOUT = 'timeout',           // 超时
}

/**
 * 执行阶段
 */
export enum ExecutionPhase {
  INITIALIZATION = 'initialization',
  PLANNING = 'planning',
  PARAMETER_EXTRACTION = 'parameter_extraction',
  VALIDATION = 'validation',
  EXECUTION = 'execution',
  RESULT_PROCESSING = 'result_processing',
  COMPLETION = 'completion',
}

// ============================================
// Execution Plan
// ============================================

/**
 * 执行计划
 */
export interface ExecutionPlan {
  id: string;
  name: string;
  description?: string;
  steps: ExecutionStep[];
  strategy: ExecutionStrategy;
  estimatedTokens: number;
  estimatedTime: number;
  fallbackPlan?: ExecutionPlan;
  metadata?: Record<string, unknown>;
  createdAt: number;
}

/**
 * 执行步骤
 */
export interface ExecutionStep {
  id: string;
  name: string;
  description?: string;
  type: StepType;
  target: string;               // Skill/Tool ID
  input?: unknown;
  dependencies: string[];       // 依赖的步骤ID
  timeout?: number;
  retries?: number;
  retryPolicy?: RetryPolicy;
  onError?: ErrorHandler;
  condition?: StepCondition;
  metadata?: Record<string, unknown>;
}

/**
 * 步骤类型
 */
export type StepType =
  | 'skill'
  | 'tool'
  | 'mcp'
  | 'llm'
  | 'condition'
  | 'parallel'
  | 'sequence'
  | 'loop'
  | 'wait';

/**
 * 执行策略
 */
export type ExecutionStrategy =
  | 'sequential'      // 顺序执行
  | 'parallel'        // 并行执行
  | 'adaptive'        // 自适应执行
  | 'dag';            // DAG 执行

/**
 * 步骤条件
 */
export interface StepCondition {
  operator: 'and' | 'or' | 'not' | 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte';
  conditions?: StepCondition[];
  stepId?: string;
  path?: string;
  expectedValue?: unknown;
}

// ============================================
// Retry & Resilience
// ============================================

/**
 * 重试策略
 */
export interface RetryPolicy {
  maxRetries: number;
  backoffStrategy: BackoffStrategy;
  baseDelay: number;
  maxDelay: number;
  retryableErrors: string[];
  onRetry?: (attempt: number, error: Error, delay: number) => void | Promise<void>;
}

/**
 * 退避策略
 */
export type BackoffStrategy =
  | 'fixed'         // 固定间隔
  | 'linear'        // 线性增长
  | 'exponential'   // 指数退避
  | 'jitter';       // 抖动退避

/**
 * 错误处理器
 */
export interface ErrorHandler {
  action: 'fail' | 'skip' | 'retry' | 'fallback' | 'compensate';
  fallbackStepId?: string;
  compensateStepId?: string;
  maxRetries?: number;
}

/**
 * 熔断器配置
 */
export interface CircuitBreakerConfig {
  failureThreshold: number;     // 失败阈值
  resetTimeout: number;         // 重置超时
  halfOpenMaxCalls: number;     // 半开状态最大调用数
}

// ============================================
// Execution Context & Result
// ============================================

/**
 * 执行上下文
 */
export interface ExecutionContext {
  executionId: string;
  parentExecutionId?: string;
  sessionId: string;
  agentId: string;
  userId?: string;
  plan: ExecutionPlan;
  state: ExecutionState;
  variables: Map<string, unknown>;
  metadata: Record<string, unknown>;
  signal?: AbortSignal;
  startTime: number;
}

/**
 * 执行状态（运行时）
 */
export interface ExecutionState {
  status: ExecutionStatus;
  currentStepId?: string;
  completedSteps: string[];
  failedSteps: string[];
  skippedSteps: string[];
  stepResults: Map<string, StepResult>;
  retryCount: Map<string, number>;
}

/**
 * 步骤结果
 */
export interface StepResult {
  stepId: string;
  status: ExecutionStatus;
  output?: unknown;
  error?: ExecutionError;
  executionTime: number;
  tokensUsed: number;
  startTime: number;
  endTime: number;
  retries: number;
}

/**
 * 执行错误
 */
export interface ExecutionError {
  stepId: string;
  code: string;
  message: string;
  stack?: string;
  recoverable: boolean;
  suggestedAction?: string;
  cause?: Error;
}

/**
 * 执行结果
 */
export interface ExecutionResult {
  executionId: string;
  status: ExecutionStatus;
  plan: ExecutionPlan;
  stepResults: StepResult[];
  finalOutput: unknown;
  metrics: ExecutionMetrics;
  errors: ExecutionError[];
  trace: ExecutionTrace;
  startTime: number;
  endTime: number;
}

/**
 * 执行指标
 */
export interface ExecutionMetrics {
  totalTime: number;
  totalTokens: number;
  llmCalls: number;
  skillCalls: number;
  toolCalls: number;
  mcpCalls: number;
  cacheHits: number;
  cacheMisses: number;
  retryCount: number;
  timeoutCount: number;
}

/**
 * 执行追踪
 */
export interface ExecutionTrace {
  phases: PhaseTrace[];
  decisions: DecisionTrace[];
  llmCalls: LLMCallTrace[];
  stepExecutions: StepExecutionTrace[];
}

export interface PhaseTrace {
  phase: ExecutionPhase;
  startTime: number;
  endTime: number;
  duration: number;
  metadata?: Record<string, unknown>;
}

export interface DecisionTrace {
  timestamp: number;
  input: string;
  decision: string;
  confidence: number;
  alternatives: string[];
  reasoning: string;
}

export interface LLMCallTrace {
  timestamp: number;
  model: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  duration: number;
  purpose: string;
}

export interface StepExecutionTrace {
  stepId: string;
  startTime: number;
  endTime: number;
  duration: number;
  status: ExecutionStatus;
  retries: number;
  events: ExecutionEvent[];
}

export interface ExecutionEvent {
  timestamp: number;
  type: string;
  message: string;
  metadata?: Record<string, unknown>;
}

// ============================================
// Execution Engine Interface
// ============================================

/**
 * 执行引擎接口
 */
export interface ExecutionEngine {
  // 执行
  execute(plan: ExecutionPlan, context?: Partial<ExecutionContext>): Promise<ExecutionResult>;
  executeStream(plan: ExecutionPlan, context?: Partial<ExecutionContext>): AsyncGenerator<ExecutionStreamChunk>;

  // 规划
  plan(input: string, availableSkills: Skill[], availableTools: Tool[]): Promise<ExecutionPlan>;

  // 控制
  cancel(executionId: string): Promise<void>;
  pause(executionId: string): Promise<void>;
  resume(executionId: string): Promise<void>;

  // 查询
  getExecution(executionId: string): ExecutionContext | undefined;
  getExecutions(): ExecutionContext[];

  // 事件
  on(event: ExecutionEventType, handler: (event: ExecutionEngineEvent) => void): void;
  off(event: ExecutionEventType, handler: (event: ExecutionEngineEvent) => void): void;
}

/**
 * 执行流块
 */
export interface ExecutionStreamChunk {
  executionId: string;
  stepId?: string;
  type: 'plan' | 'step_start' | 'step_progress' | 'step_complete' | 'complete' | 'error';
  payload: unknown;
  timestamp: number;
}

/**
 * 执行事件类型
 */
export type ExecutionEventType =
  | 'execution:started'
  | 'execution:planning'
  | 'execution:planned'
  | 'execution:step:start'
  | 'execution:step:progress'
  | 'execution:step:complete'
  | 'execution:step:error'
  | 'execution:retry'
  | 'execution:timeout'
  | 'execution:cancelled'
  | 'execution:completed'
  | 'execution:failed';

/**
 * 执行引擎事件
 */
export interface ExecutionEngineEvent {
  type: ExecutionEventType;
  executionId: string;
  timestamp: number;
  payload: unknown;
}

// ============================================
// Planner Interface
// ============================================

/**
 * 规划器接口
 */
export interface Planner {
  plan(input: string, availableSkills: Skill[], availableTools: Tool[]): Promise<ExecutionPlan>;
  replan(context: ExecutionContext, failure: ExecutionError): Promise<ExecutionPlan>;
}

// ============================================
// Execution Errors
// ============================================

/**
 * 执行错误代码
 */
export enum ExecutionErrorCode {
  PLANNING_FAILED = 'PLANNING_FAILED',
  STEP_NOT_FOUND = 'STEP_NOT_FOUND',
  CYCLIC_DEPENDENCY = 'CYCLIC_DEPENDENCY',
  TIMEOUT = 'TIMEOUT',
  CANCELLED = 'CANCELLED',
  MAX_RETRIES_EXCEEDED = 'MAX_RETRIES_EXCEEDED',
  CIRCUIT_OPEN = 'CIRCUIT_OPEN',
  INVALID_INPUT = 'INVALID_INPUT',
  EXECUTION_ERROR = 'EXECUTION_ERROR',
}

/**
 * 执行引擎错误
 */
export class ExecutionEngineError extends Error {
  constructor(
    public readonly code: ExecutionErrorCode,
    message: string,
    public readonly executionId?: string,
    public readonly cause?: Error
  ) {
    super(message);
    this.name = 'ExecutionEngineError';
  }
}
