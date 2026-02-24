/**
 * SDKWork Framework - 企业级应用框架
 *
 * 提供完整的应用开发基础设施：
 * - 应用生命周期管理
 * - 依赖注入容器
 * - 事件系统
 * - 插件系统
 * - 配置管理
 * - 日志系统
 * - 错误处理
 * - 统一事件总线
 * - 状态机
 * - 命令系统
 * - 资源池
 * - 高级类型系统
 *
 * @module Framework
 * @version 2.0.0
 */

// Core DI Container
export {
  Container,
  ServiceLifetime,
  createContainer,
  getGlobalContainer,
  setGlobalContainer,
  resetGlobalContainer,
  createModule,
  loadModules,
  type Token,
  type Factory as DIFactory,
  type Constructor as DIConstructor,
  type ServiceDescriptor,
  type ContainerConfig,
  type RegistrationOptions,
  type DIModule,
} from '../di/container.js';

// Lifecycle Management
export {
  Application,
  createLifecycleHook,
  type AppState,
  type LifecycleHook,
  type ApplicationConfig,
} from './lifecycle.js';

// Service Base Classes
export {
  BaseService,
  SingletonService,
  createServiceFactory,
  type ServiceState,
  type ServiceConfig,
  type ServiceFactory,
} from './service.js';

// Middleware System
export {
  MiddlewarePipeline,
  createMiddleware,
  createPipeline as createMiddlewarePipeline,
  commonMiddlewares,
  type MiddlewareContext,
  type MiddlewareResult,
  type Middleware,
  type MiddlewarePipelineConfig,
} from './middleware.js';

// Event System
export {
  TypedEventEmitter,
  AgentEventEmitter,
  type EventListener,
} from '../utils/typed-event-emitter.js';

export {
  EventEmitter,
} from '../utils/event-emitter.js';

// Registry Pattern
export {
  BaseRegistry,
  createRegistry as createBaseRegistry,
  type RegistryItem,
  type RegistryOptions,
} from '../utils/registry.js';

// Logging
export {
  Logger,
  createLogger,
  getGlobalLogger,
  setGlobalLogger,
  getLogger,
  type LogLevel,
  type LogModule,
  type LogContext,
  type LogEntry,
  type LoggerConfig,
  type LogTransport,
  type ILogger,
} from '../utils/logger.js';

// Error Handling
export {
  AgentError,
  ErrorCodes,
  type ErrorCodeType,
} from '../utils/errors.js';

// Validation
export {
  SchemaValidator,
  createValidator,
  validators,
  string,
  number,
  boolean,
  array,
  object,
  type Schema,
  type SchemaField,
  type ValidationRule as SchemaValidationRule,
  type ValidationResult as SchemaValidationResult,
} from '../utils/schema-validator.js';

// Resilience
export {
  RetryableError,
  withRetry,
  createRetryableFunction,
  type RetryConfig,
  type RetryResult as UtilRetryResult,
} from '../utils/retry.js';

export {
  CircuitBreaker as UtilCircuitBreaker,
  type CircuitBreakerConfig,
} from '../utils/circuit-breaker.js';

// Caching
export {
  LRUCache as UtilLRUCache,
  createLRUCache as createUtilLRUCache,
} from '../utils/lru-cache.js';

// Performance
export {
  PerformanceMonitor as UtilPerformanceMonitor,
} from '../utils/performance-monitor.js';

// ID Generation
export {
  generateId,
  generateShortId,
  generateExecutionId,
  generateSessionId,
  generateAgentId,
} from '../utils/id-generator.js';

// Safety Utilities
export {
  isNil,
  isNotNil,
  defaultTo,
  isEmpty,
  isNotEmpty,
  safeString,
  safeNumber,
  safeBoolean,
  safeArray,
  safeObject,
  ensureArray,
  ensureString,
  ensureNumber,
  ensureBoolean,
} from '../tui/safety.js';

export type { Maybe } from '../tui/safety.js';

// Core Types
export {
  success,
  failure,
  isSuccess,
  isFailure,
  some,
  none,
  isSome,
  isNone,
  fromNullable,
  idle,
  loading,
  asyncSuccess,
  asyncError,
  paginate,
  now,
  Duration,
  type Result,
  type Success,
  type Failure,
  type Option,
  type Some,
  type None,
  type AsyncResult,
  type AsyncState,
  type Callback,
  type AsyncCallback,
  type Unsubscribe,
  type EventHandler,
  type ErrorHandler as ErrorHandlerType,
  type CompletionHandler,
  type ConfigValue,
  type ConfigSchema,
  type Entity,
  type NamedEntity,
  type VersionedEntity,
  type PaginationParams,
  type PaginatedResult,
  type KeyValuePair,
  type Dictionary,
  type Timestamp,
  type Duration as DurationType,
  type Brand,
  type UserId,
  type SessionId,
  type RequestId,
  type TraceId,
  type DeepPartial,
  type DeepReadonly,
  type NonEmptyArray,
  type Exactly,
} from './types.js';

// ============================================================================
// Event Bus - 统一事件总线
// ============================================================================

export {
  EventBus,
  EVENT_PRIORITY,
  getGlobalEventBus,
  setGlobalEventBus,
  createEventBus,
  type EventInterceptor,
  type EventFilter,
  type EventSubscription,
  type EventBusConfig,
  type EventRecord,
} from './event-bus.js';

// ============================================================================
// State Machine - 状态机
// ============================================================================

export {
  StateMachine,
  createStateMachine,
  defineStateMachine,
  CommonStates,
  CommonTransitions,
  type State,
  type StateConfig,
  type TransitionConfig,
  type StateMachineConfig,
  type StateHistoryEntry,
  type StateMachineEvents,
} from './state-machine.js';

// ============================================================================
// Command System - 命令系统
// ============================================================================

export {
  CommandRegistry,
  CommandBuilder,
  MacroCommand,
  command,
  getGlobalCommandRegistry,
  createCommandRegistry,
  type Command,
  type CommandContext,
  type CommandResult,
  type CommandDefinition,
  type CommandHistoryEntry,
} from './command.js';

// ============================================================================
// Resource Pool - 资源池
// ============================================================================

export {
  ResourcePool,
  ConnectionPool,
  createPool,
  createConnectionPool,
  type ResourceFactory,
  type PoolConfig,
  type PoolStats,
  type ConnectionPoolConfig,
} from './resource-pool.js';

// ============================================================================
// Plugin Config - 插件化配置系统
// ============================================================================

export {
  PluginConfigSystem,
  FileConfigProvider,
  EnvConfigProvider,
  MemoryConfigProvider,
  DefaultConfigProvider,
  createConfigSystem,
  createZodSchema,
  type ConfigSource,
  type ConfigProvider,
  type ConfigOptions,
  type ConfigEntry,
  type ConfigChangeEvent,
  type ConfigChangeHandler,
} from './plugin-config.js';

// ============================================================================
// Advanced Types - 高级类型系统
// ============================================================================

export {
  isString,
  isNumber,
  isBoolean,
  isFunction,
  isObject,
  isArray,
  isNull,
  isUndefined,
  isNullish,
  isSymbol,
  isBigInt,
  isDate,
  isRegExp,
  isError,
  isPromise,
  isIterable,
  isAsyncIterable,
  hasProperty,
  hasMethod,
  assertNever,
  exhaustive,
  typedKeys,
  typedEntries,
  typedFromEntries,
  type Unbrand,
  type DeepRequired,
  type DeepMutable,
  type LastElement,
  type FirstElement,
  type Tail,
  type Exact,
  type UnionToIntersection,
  type StringKey,
  type ValueOf,
  type Entries,
  type Mutable,
  type Writable,
  type PickByValue,
  type OmitByValue,
  type RequiredKeys,
  type OptionalKeys,
  type FunctionPropertyNames,
  type NonFunctionPropertyNames,
  type FunctionProperties,
  type NonFunctionProperties,
  type AbstractConstructor,
  type AnyFunction,
  type AnyAsyncFunction,
  type Promisify,
  type Awaited,
  type AsyncReturnType,
  type Nullable,
  type Undefinable,
  type Nullish,
  type Falsy,
  type Truthy,
  type Primitive,
  type BuiltIn,
  type DeepWritable,
  type Equals,
  type IsNever,
  type IsAny,
  type IsUnknown,
  type IsFunction,
  type IsObject,
  type IsArray,
  type IsTuple,
  type ArrayElement,
  type TupleLength,
  type Reverse,
  type Flatten,
  type Unique,
  type Replace,
  type Split,
  type Join,
  type TrimLeft,
  type TrimRight,
  type Trim,
  type StringUppercase,
  type StringLowercase,
  type StringCapitalize,
  type StringUncapitalize,
  type KebabCase,
  type CamelCase,
  type SnakeCase,
  type PascalCase,
  type ConstantCase,
  type DotCase,
  type Path,
  type PathValue,
  type TypeGuard,
  type AssertionFunction,
} from './advanced-types.js';

// ============================================================================
// Cache - 缓存抽象层
// ============================================================================

export {
  BaseCache,
  MemoryCache,
  LRUCache,
  TieredCache,
  cacheDecorator,
  createMemoryCache,
  createLRUCache,
  createTieredCache,
  type CacheEntry,
  type CacheStats,
  type CacheConfig,
  type CacheProvider,
} from './cache.js';

// ============================================================================
// Task Scheduler - 任务调度器
// ============================================================================

export {
  TaskScheduler,
  TaskBuilder,
  task,
  createScheduler,
  type TaskId,
  type Task,
  type TaskResult,
  type ScheduledTask,
  type SchedulerConfig,
  type SchedulerStats,
} from './scheduler.js';

// ============================================================================
// Error Handler - 统一错误处理系统
// ============================================================================

export {
  FrameworkError,
  NetworkError,
  ValidationError as FrameworkValidationError,
  TimeoutError,
  ResourceError,
  PermissionError,
  BusinessError,
  ErrorHandler as FrameworkErrorHandler,
  createErrorHandler,
  defaultErrorHandler,
  withErrorHandling,
  ErrorCategory,
  ErrorSeverity,
  type ErrorCode,
  type ErrorInfo,
  type RecoveryStrategy,
  type ErrorHandlerConfig,
} from './error-handler.js';

// ============================================================================
// Factory - 对象工厂和构建器模式
// ============================================================================

export {
  ObjectFactory,
  ObjectBuilder,
  PrototypeRegistry,
  ObjectRegistry,
  createFactory,
  createBuilder,
  createPrototypeRegistry,
  createRegistry,
  type Factory,
  type FactoryConfig,
  type BuilderConfig,
  type RegistryConfig,
} from './factory.js';

// ============================================================================
// Observer - 观察者模式增强
// ============================================================================

export {
  Observable,
  ObservableObject,
  ComputedObservable,
  ReactiveArray,
  createObservable,
  createObservableObject,
  createReactiveArray,
  type ObserverId,
  type Observer,
  type ObservableConfig,
  type SubscriptionOptions,
  type PropertyChange,
  type ObservableObjectConfig,
  type ComputedProperty,
  type ReactiveArrayConfig,
  type ArrayChange,
} from './observer.js';

// ============================================================================
// Metrics - 性能监控和度量系统
// ============================================================================

export {
  Counter,
  Gauge,
  Histogram,
  Timer,
  MetricsRegistry,
  PerformanceMonitor,
  createMetricsRegistry,
  createPerformanceMonitor,
  getGlobalMetrics,
  type Metric,
  type MetricConfig,
  type MetricsConfig,
  type TimerResult,
  type HistogramStats,
  type PerformanceSnapshot,
  type PerformanceMonitorConfig,
} from './metrics.js';

// ============================================================================
// Validation - 统一数据验证系统
// ============================================================================

export {
  BaseValidator,
  StringValidator,
  NumberValidator,
  BooleanValidator,
  ArrayValidator,
  ObjectValidator,
  ValidatorFactory,
  v,
  validate,
  assertValid,
  isValid,
  type ValidationErrorType,
  type ValidationError,
  type ValidationResult,
  type ValidationRule,
  type ValidationContext,
  type ValidationOptions,
} from './validation.js';

// ============================================================================
// Retry - 统一重试策略系统
// ============================================================================

export {
  BackoffCalculator,
  RetryStrategy,
  RetryBuilder,
  retry,
  retryable,
  commonRetryStrategies,
  createRetryStrategy,
  createBackoffCalculator,
  type RetryContext,
  type RetryResult,
  type RetryOptions,
  type BackoffStrategy,
  type BackoffConfig,
} from './retry.js';

// ============================================================================
// Flow Control - 流量控制系统
// ============================================================================

export {
  RateLimiter,
  EnhancedCircuitBreaker,
  Bulkhead,
  createRateLimiter,
  createCircuitBreaker,
  createBulkhead,
  type RateLimiterConfig,
  type RateLimitResult,
  type CircuitState,
  type EnhancedCircuitBreakerConfig,
  type CircuitStats,
  type BulkheadConfig,
  type BulkheadResult,
} from './flow-control.js';

// ============================================================================
// Dependency Graph - 依赖图和拓扑排序
// ============================================================================

export {
  DependencyGraph,
  DependencyResolver,
  createDependencyGraph,
  createDependencyResolver,
  type GraphNode,
  type CycleDetectionResult,
  type TopologicalSortResult,
  type DependencyGraphConfig,
} from './dependency-graph.js';

// ============================================================================
// Serialization - 序列化/反序列化系统
// ============================================================================

export {
  Serializer,
  JsonSerializer,
  createSerializer,
  createJsonSerializer,
  defaultSerializer,
  jsonSerializer,
  type SerializedType,
  type SerializationOptions,
  type DeserializationOptions,
  type SerializedData,
  type CustomSerializer,
  type JsonSerializerConfig,
} from './serialization.js';

// ============================================================================
// Async Queue - 异步队列和背压控制
// ============================================================================

export {
  AsyncQueue,
  PriorityAsyncQueue,
  BatchingQueue,
  BackpressureController,
  createAsyncQueue,
  createPriorityQueue,
  createBatchingQueue,
  createBackpressureController,
  type AsyncQueueConfig,
  type QueueItem,
  type QueueStats,
  type BackpressureConfig,
  type BackpressureState,
} from './async-queue.js';

// ============================================================================
// Pipeline - 管道和工作流引擎
// ============================================================================

export {
  Pipeline,
  WorkflowEngine,
  PipelineBuilder,
  WorkflowBuilder,
  pipeline,
  workflow,
  createPipeline,
  createWorkflowEngine,
  type PipelineStep,
  type PipelineStepConfig,
  type PipelineConfig,
  type PipelineResult,
  type WorkflowConfig,
  type WorkflowStep,
  type WorkflowContext,
  type WorkflowResult,
} from './pipeline.js';
