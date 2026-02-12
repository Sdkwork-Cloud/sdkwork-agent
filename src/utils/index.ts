/**
 * SDKWork Utils - 业界领先的工具库
 *
 * 包含高性能算法实现：
 * - SIMD 优化的向量计算
 * - W-TinyLFU 缓存（业界最先进的缓存算法）
 * - LRU 缓存
 * - 优先级队列
 * - 性能监控
 * - 错误处理
 *
 * @module Utils
 * @version 3.0.0
 * @standard Industry Leading
 */

// ============================================================================
// High-Performance Algorithms
// ============================================================================

export {
  // SIMD Vector Operations
  dotProductSIMD,
  euclideanDistanceSIMD,
  cosineSimilaritySIMD,
  manhattanDistanceSIMD,
  normalizeVectorSIMD,
  batchNormalizeVectors,
  batchCosineSimilarity,
  getDistanceFunction,
  benchmarkSIMD,
} from './simd-vector.js';
export type {
  Vector,
  DistanceMetric,
  VectorMathConfig,
} from './simd-vector.js';

export {
  // W-TinyLFU Cache (Caffeine Algorithm)
  WTinyLFUCache,
  createWTinyLFUCache,
  benchmarkCache,
} from './wtinylfu-cache.js';
export type {
  WTinyLFUCacheConfig,
  CacheEntry,
} from './wtinylfu-cache.js';

export {
  // Roaring Bitmap (Apache Standard)
  RoaringBitmap,
  createRoaringBitmap,
  benchmarkRoaringBitmap,
} from './roaring-bitmap.js';

export {
  // Bloom Filter (Space-efficient Probabilistic Data Structure)
  BloomFilter,
  ScalableBloomFilter,
  CountingBloomFilter,
  createBloomFilter,
  createScalableBloomFilter,
  createCountingBloomFilter,
  benchmarkBloomFilter,
} from './bloom-filter.js';
export type {
  BloomFilterConfig,
  BloomFilterStats,
} from './bloom-filter.js';

export {
  // Object Pool (Memory-efficient Object Reuse)
  ObjectPool,
  GenericObjectPool,
  ArrayPool,
  Float32ArrayPool,
  createObjectPool,
  createArrayPool,
  createFloat32ArrayPool,
} from './object-pool.js';
export type {
  PoolConfig,
  PoolStats,
} from './object-pool.js';

// ============================================================================
// Standard Utilities
// ============================================================================

export {
  LRUCache,
  createLRUCache,
} from './lru-cache.js';

export {
  BoundedCache,
} from './bounded-cache.js';

export {
  PriorityQueue,
} from './priority-queue.js';

export {
  PerformanceMonitor,
  createPerformanceMonitor,
} from './performance-monitor.js';

export {
  createLogger,
} from './logger.js';
export type {
  Logger,
  LogLevel,
  LogContext,
} from './logger.js';

export {
  AgentError,
  SkillError,
  MCPError,
  ValidationError,
  safeExecute,
} from './errors.js';

// EventEmitter - 统一使用类型安全版本
export {
  EventEmitter,
  AgentEventEmitter,
} from './event-emitter.js';

export {
  ResourceManager,
} from './resource-manager.js';

export {
  createMetricsCollector,
} from './metrics.js';

export {
  detectTaskType,
} from './task-type-detector.js';
export type {
  TaskType,
  TaskComplexity,
} from './task-type-detector.js';

export {
  // getEnvironment removed - use environment object instead
} from './environment.js';
export type {
  Environment as EnvironmentInfo,
} from './environment.js';

export {
  withRetry,
  fetchWithRetry,
  createRetryableFunction,
  batchRetry,
  RetryableError,
  DEFAULT_RETRY_CONFIG,
} from './retry.js';
export type {
  RetryConfig,
  RetryResult,
} from './retry.js';

export { noop } from './noop.js';

// ID Generator
export {
  generateId,
  generateShortId,
  generateExecutionId,
  generateSessionId,
  generateAgentId,
  generateTransactionId,
  generateMemoryId,
  generateStepId,
  generateWorkerId,
  generateActorId,
  generateConfigId,
  generateNodeId,
  generateErrorId,
  generateConflictId,
  generateReflectionId,
  generatePrefixedId,
} from './id-generator.js';

// Error Boundary
export {
  ErrorBoundary,
  createErrorBoundary,
  getGlobalErrorBoundary,
  setGlobalErrorBoundary,
  withErrorBoundary,
  isBoundaryResult,
} from './error-boundary.js';
export type {
  ErrorSeverity,
  ErrorContext,
  ErrorHandler,
  ErrorRecoveryStrategy,
  ErrorBoundaryConfig,
  BoundaryResult,
} from './error-boundary.js';

// Re-exports are handled above with export type
