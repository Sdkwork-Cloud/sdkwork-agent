/**
 * 记忆模块索引
 * 
 * 导出所有记忆和向量数据库实现
 */

// 统一记忆管理器
export {
  MemoryManager,
  createMemoryManager,
} from './memory-manager.js';
export type {
  MemoryManagerConfig,
  MemoryEntry,
  MemoryQuery,
  MemorySearchResult,
  MemoryStats,
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

// 智能体记忆
export type {
  SemanticSearchResult,
  KnowledgeNode,
} from './agent-memory.js';
