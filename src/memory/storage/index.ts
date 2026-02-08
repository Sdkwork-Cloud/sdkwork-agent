/**
 * 统一记忆存储模块
 * 
 * 提供完美的存储抽象层，支持多种存储后端：
 * - Memory: 内存存储（高速，临时）
 * - File: 文件存储（持久化，本地）
 * - IndexedDB: 浏览器IndexedDB（持久化，前端）
 * - Redis: Redis存储（分布式，高性能）
 * - SQLite: SQLite数据库存储（关系型，本地）
 * - Vector: 向量数据库存储（语义检索）
 * 
 * @module MemoryStorage
 * @version 1.0.0
 * @architecture Unified Storage Abstraction Layer
 */

// ============================================================================
// 核心抽象层
// ============================================================================

export {
  // 抽象基类
  StorageAdapter,
  StorageAdapterFactory,
  
  // 核心类型
  type StorageType,
  type StorageTier,
  type MemoryItem,
  type MemoryType,
  type MemoryMetadata,
  type StorageConfig,
  type StorageQueryOptions,
  type SemanticQueryOptions,
  type StorageQueryResult,
  type StorageStats,
  type BatchOperationResult,
  type StorageEvent,
  type StorageEventType,
  type SerializationConfig,
  type CompressionConfig,
  type EncryptionConfig,
} from './storage-adapter.js';

// ============================================================================
// 存储适配器实现
// ============================================================================

export {
  MemoryStorageAdapter,
  createMemoryStorage,
  type MemoryStorageConfig,
} from './memory-storage.js';

export {
  FileStorageAdapter,
  createFileStorage,
  type FileStorageConfig,
} from './file-storage.js';

export {
  VectorStorageAdapter,
  createVectorStorage,
  type VectorStorageConfig,
} from './vector-storage.js';

// ============================================================================
// 统一记忆管理器
// ============================================================================

export {
  UnifiedMemoryManager,
  EmbeddingGenerator,
  createUnifiedMemoryManager,
  type UnifiedMemoryManagerConfig,
  type MemoryOperationOptions,
  type MemoryRetrievalOptions,
  type TierStorageMapping,
  type TierCapacityConfig,
  type MigrationResult,
} from './unified-memory-manager.js';

// ============================================================================
// 便捷工厂函数
// ============================================================================

import { UnifiedMemoryManager, UnifiedMemoryManagerConfig } from './unified-memory-manager.js';
import { StorageConfig } from './storage-adapter.js';

/**
 * 创建默认的统一记忆管理器配置
 * 
 * 使用内存存储作为工作/短期记忆，文件存储作为长期记忆
 */
export function createDefaultMemoryConfig(name: string = 'default'): UnifiedMemoryManagerConfig {
  return {
    name,
    storages: [
      {
        type: 'memory',
        name: 'working-memory',
        enabled: true,
        priority: 1,
        options: {
          maxEntries: 1000,
          enableLRU: true,
          defaultTTL: 24 * 60 * 60 * 1000, // 24小时
          cleanupInterval: 60 * 60 * 1000, // 1小时
        },
      },
      {
        type: 'file',
        name: 'long-term-memory',
        enabled: true,
        priority: 2,
        options: {
          dataDir: `./data/memory/${name}`,
          format: 'json',
          autoSaveInterval: 60000, // 1分钟
          enableBackup: true,
          backupCount: 5,
          writeBufferSize: 100,
          syncWrites: false,
        },
      },
    ],
    tierMapping: {
      working: 'working-memory',
      short_term: 'working-memory',
      long_term: 'long-term-memory',
    },
    tierCapacities: {
      working: {
        maxEntries: 100,
        maxTokens: 4000,
        migrationThreshold: 80,
        defaultTTL: 60 * 60 * 1000, // 1小时
      },
      short_term: {
        maxEntries: 1000,
        maxTokens: 20000,
        migrationThreshold: 800,
        defaultTTL: 24 * 60 * 60 * 1000, // 24小时
      },
      long_term: {
        maxEntries: 10000,
        maxTokens: 1000000,
        migrationThreshold: 9000,
      },
      archival: {
        maxEntries: 100000,
        migrationThreshold: 95000,
      },
    },
    autoMigrationInterval: 60000, // 1分钟
    enableCompression: true,
    compressionThreshold: 1000,
    enableVectorization: true,
    vectorDimension: 384,
  };
}

/**
 * 创建高性能记忆配置
 * 
 * 使用内存存储作为所有层级，适合高性能场景
 */
export function createHighPerformanceMemoryConfig(name: string = 'high-performance'): UnifiedMemoryManagerConfig {
  return {
    name,
    storages: [
      {
        type: 'memory',
        name: 'memory-store',
        enabled: true,
        priority: 1,
        options: {
          maxEntries: 50000,
          enableLRU: true,
          cleanupInterval: 5 * 60 * 1000, // 5分钟
        },
      },
    ],
    tierMapping: {
      working: 'memory-store',
      short_term: 'memory-store',
      long_term: 'memory-store',
      archival: 'memory-store',
    },
    tierCapacities: {
      working: { maxEntries: 100, migrationThreshold: 80 },
      short_term: { maxEntries: 1000, migrationThreshold: 800 },
      long_term: { maxEntries: 10000, migrationThreshold: 9000 },
      archival: { maxEntries: 50000, migrationThreshold: 45000 },
    },
    autoMigrationInterval: 60000,
    enableCompression: false,
    enableVectorization: true,
    vectorDimension: 384,
  };
}

/**
 * 创建持久化记忆配置
 * 
 * 使用文件存储作为所有层级，数据持久化
 */
export function createPersistentMemoryConfig(name: string = 'persistent'): UnifiedMemoryManagerConfig {
  return {
    name,
    storages: [
      {
        type: 'file',
        name: 'file-store',
        enabled: true,
        priority: 1,
        options: {
          dataDir: `./data/memory/${name}`,
          format: 'json',
          autoSaveInterval: 30000,
          enableBackup: true,
          backupCount: 10,
          syncWrites: true,
        },
      },
    ],
    tierMapping: {
      working: 'file-store',
      short_term: 'file-store',
      long_term: 'file-store',
      archival: 'file-store',
    },
    tierCapacities: {
      working: { maxEntries: 100, migrationThreshold: 80 },
      short_term: { maxEntries: 1000, migrationThreshold: 800 },
      long_term: { maxEntries: 100000, migrationThreshold: 90000 },
      archival: { maxEntries: 1000000, migrationThreshold: 950000 },
    },
    autoMigrationInterval: 60000,
    enableCompression: true,
    enableVectorization: true,
    vectorDimension: 384,
  };
}

/**
 * 创建向量检索记忆配置
 * 
 * 使用向量存储支持语义检索
 */
export function createVectorMemoryConfig(name: string = 'vector'): UnifiedMemoryManagerConfig {
  return {
    name,
    storages: [
      {
        type: 'memory',
        name: 'working-memory',
        enabled: true,
        priority: 1,
        options: {
          maxEntries: 1000,
          enableLRU: true,
        },
      },
      {
        type: 'vector',
        name: 'vector-store',
        enabled: true,
        priority: 2,
        options: {
          dimension: 384,
          m: 16,
          efConstruction: 200,
          efSearch: 50,
          metric: 'cosine',
          persistencePath: `./data/memory/${name}/vector-index.json`,
          autoSaveInterval: 60000,
        },
      },
    ],
    tierMapping: {
      working: 'working-memory',
      short_term: 'working-memory',
      long_term: 'vector-store',
      archival: 'vector-store',
    },
    tierCapacities: {
      working: { maxEntries: 100, migrationThreshold: 80 },
      short_term: { maxEntries: 1000, migrationThreshold: 800 },
      long_term: { maxEntries: 10000, migrationThreshold: 9000 },
      archival: { maxEntries: 100000, migrationThreshold: 95000 },
    },
    autoMigrationInterval: 60000,
    enableCompression: true,
    enableVectorization: true,
    vectorDimension: 384,
  };
}

/**
 * 快速创建统一记忆管理器
 */
export async function createMemoryManager(
  name: string = 'default',
  preset: 'default' | 'high-performance' | 'persistent' | 'vector' = 'default'
): Promise<UnifiedMemoryManager> {
  let config: UnifiedMemoryManagerConfig;

  switch (preset) {
    case 'high-performance':
      config = createHighPerformanceMemoryConfig(name);
      break;
    case 'persistent':
      config = createPersistentMemoryConfig(name);
      break;
    case 'vector':
      config = createVectorMemoryConfig(name);
      break;
    case 'default':
    default:
      config = createDefaultMemoryConfig(name);
      break;
  }

  const manager = new UnifiedMemoryManager(config);
  await manager.initialize();
  return manager;
}

// ============================================================================
// 版本信息
// ============================================================================

export const VERSION = '1.0.0';
export const AUTHOR = 'SDKWork-Agent Team';
