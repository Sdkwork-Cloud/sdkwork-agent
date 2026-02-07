/**
 * Perfect Agent Execution Architecture
 *
 * Design Principles:
 * 1. **Deterministic Execution**: Every decision is traceable and reproducible
 * 2. **Graceful Degradation**: Fallback chains ensure robustness
 * 3. **Token Efficiency**: Minimal LLM calls with maximum context utilization
 * 4. **Observability**: Full execution tracing and metrics
 * 5. **Extensibility**: Plugin-based architecture for custom behaviors
 * 6. **Type Safety**: Full TypeScript coverage with runtime validation
 *
 * Architecture Layers:
 * - Execution Layer: Orchestrates skill/tool/LLM execution
 * - Decision Layer: Intelligent routing and planning
 * - Optimization Layer: Token and performance optimization
 * - Observability Layer: Metrics, tracing, and logging
 */

// ============================================
// Core Types & Interfaces
// ============================================

export type ExecutionStatus =
  | 'pending'
  | 'planning'
  | 'executing'
  | 'waiting_for_input'
  | 'retrying'
  | 'completed'
  | 'failed'
  | 'cancelled';

export type ExecutionPhase =
  | 'initialization'
  | 'decision'
  | 'parameter_extraction'
  | 'execution'
  | 'result_processing'
  | 'completion';

export interface ExecutionContext {
  executionId: string;
  parentExecutionId?: string;
  sessionId: string;
  userId?: string;
  timestamp: Date;
  metadata: Record<string, unknown>;
}

export interface ExecutionPlan {
  id: string;
  steps: ExecutionStep[];
  strategy: ExecutionStrategy;
  estimatedTokens: number;
  estimatedTime: number;
  fallbackPlan?: ExecutionPlan;
}

export interface ExecutionStep {
  id: string;
  type: 'skill' | 'tool' | 'llm' | 'condition' | 'parallel' | 'sequence';
  target: string;
  parameters?: Record<string, unknown>;
  dependencies?: string[];
  timeout?: number;
  retries?: number;
  onError?: 'fail' | 'skip' | 'fallback';
  condition?: StepCondition;
}

export interface StepCondition {
  operator: 'and' | 'or' | 'not';
  conditions?: StepCondition[];
  stepId?: string;
  expectedResult?: unknown;
}

export type ExecutionStrategy = 'sequential' | 'parallel' | 'adaptive' | 'retry_with_backoff';

export interface ExecutionResult {
  executionId: string;
  status: ExecutionStatus;
  plan: ExecutionPlan;
  stepResults: StepResult[];
  finalOutput: unknown;
  metrics: ExecutionMetrics;
  errors: ExecutionError[];
  trace: ExecutionTrace;
}

export interface StepResult {
  stepId: string;
  status: ExecutionStatus;
  output?: unknown;
  error?: ExecutionError;
  executionTime: number;
  tokensUsed: number;
  startTime: Date;
  endTime: Date;
}

export interface ExecutionError {
  stepId: string;
  code: string;
  message: string;
  stack?: string;
  recoverable: boolean;
  suggestedAction?: string;
}

export interface ExecutionMetrics {
  totalTime: number;
  totalTokens: number;
  llmCalls: number;
  skillCalls: number;
  toolCalls: number;
  cacheHits: number;
  cacheMisses: number;
  retryCount: number;
}

export interface ExecutionTrace {
  phases: PhaseTrace[];
  decisions: DecisionTrace[];
  llmCalls: LLMCallTrace[];
}

export interface PhaseTrace {
  phase: ExecutionPhase;
  startTime: Date;
  endTime: Date;
  duration: number;
  metadata?: Record<string, unknown>;
}

export interface DecisionTrace {
  timestamp: Date;
  input: string;
  decision: string;
  confidence: number;
  alternatives: string[];
  reasoning: string;
}

export interface LLMCallTrace {
  timestamp: Date;
  model: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  duration: number;
  purpose: string;
}

// ============================================
// Parameter Extraction System
// ============================================

export interface ParameterExtractor {
  extract(
    input: string,
    schema: ParameterSchema,
    context?: ExecutionContext
  ): Promise<ParameterExtractionResult>;
}

export interface ParameterSchema {
  type: 'object';
  properties: Record<string, ParameterProperty>;
  required?: string[];
  additionalProperties?: boolean;
}

export interface ParameterProperty {
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  description: string;
  enum?: unknown[];
  default?: unknown;
  items?: ParameterProperty;
  properties?: Record<string, ParameterProperty>;
  format?: string;
  pattern?: string;
  minLength?: number;
  maxLength?: number;
  minimum?: number;
  maximum?: number;
}

export interface ParameterExtractionResult {
  success: boolean;
  parameters: Record<string, unknown>;
  confidence: number;
  missingRequired: string[];
  validationErrors: ValidationError[];
  extractionMethod: 'llm' | 'pattern' | 'default' | 'hybrid';
}

export interface ValidationError {
  path: string;
  message: string;
  value?: unknown;
}

// ============================================
// Retry & Resilience System
// ============================================

export interface RetryPolicy {
  maxRetries: number;
  backoffStrategy: 'fixed' | 'linear' | 'exponential';
  baseDelay: number;
  maxDelay: number;
  retryableErrors: string[];
  onRetry?: (attempt: number, error: Error, delay: number) => void;
}

export interface CircuitBreakerConfig {
  failureThreshold: number;
  resetTimeout: number;
  halfOpenMaxCalls: number;
}

export interface ResilienceContext {
  retryPolicy: RetryPolicy;
  circuitBreaker?: CircuitBreakerConfig;
  timeout?: number;
}

// ============================================
// Caching System
// ============================================

export interface CacheStrategy {
  key: string;
  ttl: number;
  tags?: string[];
  invalidateOn?: string[];
}

export interface CacheEntry<T> {
  value: T;
  createdAt: Date;
  expiresAt: Date;
  tags: string[];
  accessCount: number;
}

export interface CacheStats {
  hits: number;
  misses: number;
  hitRate: number;
  size: number;
  oldestEntry: Date;
}

// ============================================
// Observability System
// ============================================

export interface ExecutionObserver {
  onExecutionStart?(context: ExecutionContext): void;
  onPhaseStart?(phase: ExecutionPhase, context: ExecutionContext): void;
  onPhaseEnd?(phase: ExecutionPhase, duration: number, context: ExecutionContext): void;
  onStepStart?(step: ExecutionStep, context: ExecutionContext): void;
  onStepEnd?(step: ExecutionStep, result: StepResult, context: ExecutionContext): void;
  onDecision?(decision: DecisionTrace, context: ExecutionContext): void;
  onLLMCall?(call: LLMCallTrace, context: ExecutionContext): void;
  onError?(error: ExecutionError, context: ExecutionContext): void;
  onExecutionEnd?(result: ExecutionResult, context: ExecutionContext): void;
}

export interface MetricsCollector {
  recordCounter(name: string, value: number, tags?: Record<string, string>): void;
  recordHistogram(name: string, value: number, tags?: Record<string, string>): void;
  recordGauge(name: string, value: number, tags?: Record<string, string>): void;
  recordTiming(name: string, duration: number, tags?: Record<string, string>): void;
}

// ============================================
// Skill & Tool Definitions (Enhanced)
// ============================================

export interface EnhancedSkill {
  name: string;
  description: string;
  parameters: ParameterSchema;
  handler: SkillHandler;
  metadata?: SkillMetadata;

  // Execution characteristics
  idempotent?: boolean;
  retryable?: boolean;
  timeout?: number;
  cost?: number; // Token cost estimate

  // Dependencies
  dependencies?: string[];
  requiredTools?: string[];
  requiredResources?: string[];

  // Validation
  inputValidator?: (params: Record<string, unknown>) => ValidationResult;
  outputValidator?: (output: unknown) => ValidationResult;
}

export interface EnhancedTool {
  name: string;
  description: string;
  parameters?: ParameterSchema;
  execute: ToolExecutor;
  metadata?: ToolMetadata;

  // Execution characteristics
  idempotent?: boolean;
  retryable?: boolean;
  timeout?: number;
  requiresConfirmation?: boolean;
  sideEffects?: string[];
}

export interface SkillMetadata {
  category?: string;
  tags?: string[];
  version?: string;
  author?: string;
  deprecated?: boolean;
  deprecationReason?: string;
  examples?: string[];
  documentation?: string;
}

export interface ToolMetadata {
  category?: string;
  tags?: string[];
  version?: string;
  requiresConfirmation?: boolean;
}

export type SkillHandler = (
  params: Record<string, unknown>,
  context: ExecutionContext
) => Promise<SkillResult>;

export type ToolExecutor = (input: unknown, context: ExecutionContext) => Promise<ToolResult>;

export interface SkillResult {
  success: boolean;
  data?: unknown;
  error?: string;
  metadata?: Record<string, unknown>;
  tokensUsed?: number;
}

export interface ToolResult {
  content: Array<{ type: string; text?: string; data?: unknown }>;
  isError?: boolean;
  metadata?: Record<string, unknown>;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

// ============================================
// Decision System (Enhanced)
// ============================================

export interface Decision {
  type: 'skill' | 'tool' | 'llm' | 'multi' | 'plan';
  skills?: string[];
  tools?: string[];
  plan?: ExecutionPlan;
  reasoning?: string;
  confidence: number;
  fallback?: string;
  alternatives?: Decision[];
}

export interface DecisionContext {
  input: string;
  history?: string[];
  availableSkills: string[];
  availableTools: string[];
  executionContext?: ExecutionContext;
  metadata?: Record<string, unknown>;
}

export interface DecisionEngine {
  decide(context: DecisionContext): Promise<Decision>;
  indexSkill(skill: EnhancedSkill): Promise<void>;
  clearCache(): void;
  getCacheStats(): CacheStats;
}

// ============================================
// Re-export base types for compatibility
// ============================================

export type {
  LLMProvider,
  LLMRequest,
  LLMResponse,
  LLMStreamChunk,
  LLMMessage,
  ToolDefinition,
} from '../llm/provider';
