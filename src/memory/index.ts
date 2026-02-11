/**
 * 记忆模块索引
 * 
 * SDKWork-Agent 完美记忆系统
 * 
 * 本模块提供企业级的记忆管理能力，支持：
 * - 多层级记忆架构（工作/短期/长期/归档）
 * - 多种存储后端（内存/文件/向量/IndexedDB/Redis）
 * - 语义检索与混合搜索
 * - 自动数据迁移与压缩
 * - 灵活的配置系统
 * 
 * @module Memory
 * @version 2.0.0
 * @architecture Unified Multi-Tier Memory Architecture
 */

// ============================================================================
// 新版统一存储系统（推荐）
// ============================================================================

export {
  // 核心抽象
  StorageAdapter,
  StorageAdapterFactory,
  
  // 存储实现
  MemoryStorageAdapter,
  FileStorageAdapter,
  VectorStorageAdapter,
  
  // 统一记忆管理器
  UnifiedMemoryManager,
  EmbeddingGenerator,
  
  // 工厂函数
  createMemoryStorage,
  createFileStorage,
  createVectorStorage,
  createUnifiedMemoryManager,
  createMemoryManager,
  
  // 配置预设
  createDefaultMemoryConfig,
  createHighPerformanceMemoryConfig,
  createPersistentMemoryConfig,
  createVectorMemoryConfig,
  
  // 版本信息
  VERSION as MEMORY_VERSION,
  AUTHOR as MEMORY_AUTHOR,
} from './storage/index.js';

export type {
  // 核心类型
  StorageType,
  StorageTier,
  MemoryItem,
  MemoryType,
  MemoryMetadata,
  StorageConfig,
  StorageQueryOptions,
  SemanticQueryOptions,
  StorageQueryResult,
  StorageStats,
  BatchOperationResult,
  StorageEvent,
  StorageEventType,
  SerializationConfig,
  CompressionConfig,
  EncryptionConfig,
  
  // 存储配置
  MemoryStorageConfig,
  FileStorageConfig,
  VectorStorageConfig,
  
  // 管理器配置
  UnifiedMemoryManagerConfig,
  MemoryOperationOptions,
  MemoryRetrievalOptions,
  TierStorageMapping,
  TierCapacityConfig,
  MigrationResult,
} from './storage/index.js';

// ============================================================================
// 兼容层 - 旧版记忆系统（保持向后兼容）
// ============================================================================

// 统一记忆管理器（旧版）
export {
  MemoryManager,
  createMemoryManager as createLegacyMemoryManager,
} from './memory-manager.js';
export type {
  MemoryManagerConfig,
  MemoryEntry,
  MemoryQuery,
  MemorySearchResult,
  MemoryStats as LegacyMemoryStats,
  MemoryTier,
  Logger as MemoryLogger,
} from './memory-manager.js';

// 基础向量数据库
export {
  VectorDatabase,
  InMemoryVectorDB,
} from './vector-database.js';
export type {
  VectorDBConfig,
  VectorDocument,
  SearchResult,
  SearchOptions,
  HybridSearchOptions,
} from './vector-database.js';

// HNSW 高性能向量数据库
export {
  HNSWVectorDatabase,
  createHNSWVectorDB,
} from './hnsw-vector-database.js';
export type {
  HNSWVectorDBConfig,
} from './hnsw-vector-database.js';

// MemGPT 分层记忆系统
export {
  MemGPTMemory,
  createMemGPTMemory,
  createDefaultMemGPTConfig,
} from './memgpt-memory.js';
export type {
  MemGPTConfig,
  CoreMemory,
  RecallMemoryEntry,
  ArchivalMemoryEntry,
  WorkingContext,
  Task,
  Action,
} from './memgpt-memory.js';

// 文件向量数据库
export {
  FileVectorDatabase,
} from './file-vector-database.js';
export type {
  FileVectorDBConfig,
} from './file-vector-database.js';

// 智能体记忆类型
export type {
  SemanticSearchResult,
  KnowledgeNode,
} from './agent-memory.js';

// ============================================================================
// 便捷导出 - 快速开始
// ============================================================================

/**
 * 快速创建记忆管理器（使用默认配置）
 * 
 * @example
 * ```typescript
 * import { initMemory } from './memory/index.js';
 * 
 * const memory = await initMemory('my-agent');
 * 
 * // 存储记忆
 * await memory.store('用户喜欢使用TypeScript', 'preference');
 * 
 * // 搜索记忆
 * const results = await memory.search('TypeScript');
 * ```
 */
export async function initMemory(name: string = 'default') {
  const { createMemoryManager } = await import('./storage/index');
  return createMemoryManager(name, 'default');
}

/**
 * 创建高性能记忆管理器
 * 
 * 适用于对性能要求极高的场景，所有数据存储在内存中
 */
export async function initHighPerformanceMemory(name: string = 'high-performance') {
  const { createMemoryManager } = await import('./storage/index');
  return createMemoryManager(name, 'high-performance');
}

/**
 * 创建持久化记忆管理器
 * 
 * 适用于需要数据持久化的场景，所有数据保存到文件
 */
export async function initPersistentMemory(name: string = 'persistent') {
  const { createMemoryManager } = await import('./storage/index');
  return createMemoryManager(name, 'persistent');
}

/**
 * 创建支持语义搜索的记忆管理器
 * 
 * 适用于需要语义检索的场景，使用向量存储
 */
export async function initSemanticMemory(name: string = 'semantic') {
  const { createMemoryManager } = await import('./storage/index');
  return createMemoryManager(name, 'vector');
}

// ============================================================================
// 版本信息
// ============================================================================

export const VERSION = '2.0.0';
export const AUTHOR = 'SDKWork-Agent Team';
export const DESCRIPTION = 'Unified Multi-Tier Memory System for SDKWork-Agent';
