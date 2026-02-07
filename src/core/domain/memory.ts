/**
 * Memory System Domain Model
 * Multi-dimensional memory storage with semantic search
 * Reference: OpenClaw Memory System, MemGPT, LangChain Memory
 */

// ============================================================================
// Memory Types - 记忆类型
// ============================================================================

export type MemoryType = 'episodic' | 'semantic' | 'procedural';

export type MemorySource = 'conversation' | 'document' | 'system' | 'user';

// ============================================================================
// Memory Entry - 记忆条目
// ============================================================================

export interface Memory {
  id: string;
  content: string;
  type: MemoryType;
  source: MemorySource;
  metadata?: MemoryMetadata;
  timestamp: number;
  score?: number;
  embedding?: number[];
}

export interface MemoryMetadata {
  // 会话信息
  sessionId?: string;
  agentId?: string;
  userId?: string;
  
  // 内容信息
  title?: string;
  category?: string;
  tags?: string[];
  
  // 来源信息
  sourcePath?: string;
  sourceType?: string;
  
  // 扩展属性
  [key: string]: unknown;
}

// ============================================================================
// Memory Query - 记忆查询
// ============================================================================

export interface MemoryQuery {
  content: string;
  type?: MemoryType;
  source?: MemorySource;
  sessionId?: string;
  limit?: number;
  threshold?: number;
  filters?: MemoryFilters;
}

export interface MemoryFilters {
  startTime?: number;
  endTime?: number;
  tags?: string[];
  category?: string;
  sourcePath?: string;
  metadata?: Record<string, unknown>;
}

// ============================================================================
// Memory Search Result - 记忆搜索结果
// ============================================================================

export interface MemorySearchResult {
  memory: Memory;
  score: number;
  relevance: number;
  context?: string;
}

// ============================================================================
// Memory Store Interface - 记忆存储接口
// ============================================================================

/**
 * 基础记忆存储接口
 * 核心功能：存储、检索、删除
 */
export interface MemoryStore {
  // 核心存储操作
  store(memory: Memory): Promise<void>;
  retrieve(id: string): Promise<Memory | undefined>;
  search(query: MemoryQuery): Promise<MemorySearchResult[]>;
  delete(id: string): Promise<void>;
  clear(): Promise<void>;
}

/**
 * 高级记忆存储接口
 * 扩展功能：批量操作、语义搜索、全文搜索、统计
 */
export interface AdvancedMemoryStore extends MemoryStore {
  // 批量操作
  storeBatch(memories: Memory[]): Promise<void>;
  deleteBySession(sessionId: string): Promise<void>;
  
  // 高级搜索
  semanticSearch(query: string, limit?: number): Promise<MemorySearchResult[]>;
  fullTextSearch(query: string, limit?: number): Promise<MemorySearchResult[]>;
  
  // 统计信息
  count(): Promise<number>;
  getStats(): Promise<MemoryStats>;
}

// ============================================================================
// Memory Stats - 记忆统计
// ============================================================================

export interface MemoryStats {
  totalCount: number;
  byType: Record<MemoryType, number>;
  bySource: Record<MemorySource, number>;
  oldestTimestamp?: number;
  newestTimestamp?: number;
}

// ============================================================================
// Memory Config - 记忆配置
// ============================================================================

export interface MemoryConfig {
  // 存储配置
  maxTokens?: number;
  limit?: number;
  
  // 嵌入配置
  embeddingModel?: string;
  embeddingDimension?: number;
  
  // 搜索配置
  searchThreshold?: number;
  searchLimit?: number;
  
  // 缓存配置
  enableCache?: boolean;
  cacheSize?: number;
  
  // 同步配置
  syncInterval?: number;
  enableAutoSync?: boolean;
}

// ============================================================================
// Memory Provider - 记忆提供者接口
// ============================================================================

export interface EmbeddingProvider {
  embed(text: string): Promise<number[]>;
  embedBatch(texts: string[]): Promise<number[][]>;
}

export interface VectorStore {
  add(id: string, embedding: number[], metadata?: Record<string, unknown>): Promise<void>;
  search(query: number[], limit: number): Promise<Array<{ id: string; score: number }>>;
  delete(id: string): Promise<void>;
  clear(): Promise<void>;
}

// ============================================================================
// Memory Events - 记忆事件
// ============================================================================

export interface MemoryEvent {
  type: 'stored' | 'retrieved' | 'searched' | 'deleted' | 'synced';
  memoryId?: string;
  timestamp: number;
  metadata?: Record<string, unknown>;
}

export type MemoryEventHandler = (event: MemoryEvent) => void | Promise<void>;

// ============================================================================
// Session Memory - 会话记忆
// ============================================================================

export interface SessionMemory {
  sessionId: string;
  messages: SessionMessage[];
  metadata?: SessionMetadata;
  createdAt: number;
  updatedAt: number;
}

export interface SessionMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  metadata?: Record<string, unknown>;
}

export interface SessionMetadata {
  title?: string;
  summary?: string;
  tags?: string[];
  customData?: Record<string, unknown>;
}

// ============================================================================
// Knowledge Memory - 知识记忆
// ============================================================================

export interface KnowledgeDocument {
  id: string;
  path: string;
  content: string;
  chunks: DocumentChunk[];
  metadata?: DocumentMetadata;
  hash: string;
  updatedAt: number;
}

export interface DocumentChunk {
  id: string;
  documentId: string;
  content: string;
  startLine: number;
  endLine: number;
  embedding?: number[];
  hash: string;
}

export interface DocumentMetadata {
  title?: string;
  author?: string;
  source?: string;
  category?: string;
  tags?: string[];
  createdAt?: Date;
  updatedAt?: Date;
}

// ============================================================================
// Memory Sync - 记忆同步
// ============================================================================

export interface MemorySyncConfig {
  enabled: boolean;
  interval: number;
  paths: string[];
  filePatterns: string[];
}

export interface MemorySyncResult {
  added: number;
  updated: number;
  deleted: number;
  errors: Array<{ path: string; error: Error }>;
  duration: number;
}
