/**
 * Node.js 原生存储模块
 * 
 * 专为 Node.js 环境设计的完美存储系统
 * 
 * 核心特性：
 * 1. 多后端支持 (文件系统、SQLite、Redis、S3)
 * 2. 流式处理大文件
 * 3. 内置压缩 (gzip) 和加密 (AES-256-GCM)
 * 4. 文件监听 (fs.watch)
 * 5. 事务支持
 * 6. 智能缓存
 * 
 * @module Storage
 * @version 2.0.0
 * @architecture Node.js Native Only
 */

// 存储管理器
export {
  StorageManager,
  FileSystemBackend,
  createStorageManager,
} from './storage-manager.js';

export type {
  StorageBackend,
  StorageManagerConfig,
  BackendConfig,
  FileMetadata,
  ReadOptions,
  WriteOptions,
  ListOptions,
  WatchOptions,
  Transaction,
  Operation,
  StorageStats,
  BackendStats,
  IStorageBackend,
} from './storage-manager.js';

// Node.js 适配器 (保留兼容)
export {
  NodeStorageAdapter,
} from './node-adapter.js';

export type {
  StorageAdapter,
  StorageConfig,
} from './types';
