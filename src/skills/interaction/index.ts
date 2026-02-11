/**
 * Skill交互优化模块
 *
 * 本模块提供了一套完整的Skill交互优化方案
 *
 * @module Interaction
 * @version 2.0.0
 */

// 导出意图识别引擎
export { IntentRecognizer, createIntentRecognizer } from './intent-recognizer.js';
export type {
  IntentRecognitionResult,
  IntentRecognizerConfig,
  DialogueContext,
  LLMService,
} from './intent-recognizer.js';

// 导出参数提取器
export { IntelligentParameterExtractor, createParameterExtractor } from './parameter-extractor.js';
export type {
  ParameterDefinition,
  ExtractionContext,
  ExtractionResult,
  InputType,
} from './parameter-extractor.js';

// 导出对话状态机
export { SkillConversationStateMachine, createConversationStateMachine } from './conversation-state-machine.js';
export type {
  ConversationState,
  ConversationContext,
  StateHandler,
  StateTransitionResult,
  StateTransitionEvent,
  StateMachineConfig,
} from './conversation-state-machine.js';

// 导出长期记忆系统
export { LongTermMemorySystem, createLongTermMemorySystem } from './long-term-memory.js';
export type {
  MemoryEntry,
  MemoryType,
  MemoryLayer,
  MemoryRetrieveOptions,
  MemoryRetrieveResult,
  MemoryStats,
  LongTermMemoryConfig,
} from './long-term-memory.js';

// 导出错误恢复管理器
export { ErrorRecoveryManager } from './error-recovery.js';
export type {
  SkillError,
  RecoveryResult,
  RecoveryConfig,
  ErrorSeverity,
  ErrorCategory,
  RecoveryStrategy,
} from './error-recovery.js';

// 导出交互管理器
export { OptimizedSkillInteractionManager, createOptimizedInteractionManager } from './interaction-manager.js';
export type {
  InteractionConfig,
  UserInput,
  InteractionResult,
  InteractionSession,
} from './interaction-manager.js';

// 导出缓存管理器
export { CacheManager, createCache } from './cache-manager.js';
export type { CacheConfig, CacheStats } from './cache-manager.js';

// 导出高级缓存系统
export { AdvancedCache, createAdvancedCache } from './advanced-cache.js';
export type {
  AdvancedCacheConfig,
  AdvancedCacheStats,
  CacheLevel,
} from './advanced-cache.js';

// 导出本地数据管理器
export { DataManager, createDataManager } from './data-manager.js';
export type {
  DataManagerConfig,
  DataVersion,
  DataMigration,
  DataTransaction,
  DataOperation,
  DataMetadata,
  DataManagerStats,
} from './data-manager.js';

// 导出性能优化器
export {
  PerformanceOptimizer,
  BatchProcessor,
  RequestDeduplicator,
  ConnectionPool,
  RateLimiter,
  createPerformanceOptimizer,
  createBatchProcessor,
  createDeduplicator,
  createConnectionPool,
  createRateLimiter,
} from './performance-optimizer.js';
export type {
  PerformanceConfig,
  PerformanceMetrics,
  BatchConfig,
  DeduplicationConfig,
  ConnectionPoolConfig,
  RateLimitConfig,
} from './performance-optimizer.js';
