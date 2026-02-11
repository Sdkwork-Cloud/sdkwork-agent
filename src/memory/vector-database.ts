/**
 * 向量数据库集成模块
 * 
 * 支持多种主流向量数据库：
 * 1. Pinecone - 托管向量数据库
 * 2. Weaviate - 开源向量搜索引擎
 * 3. Qdrant - 高性能向量数据库
 * 4. Milvus - 分布式向量数据库
 * 5. Chroma - 轻量级嵌入式向量数据库
 * 6. 内存向量存储 (Fallback)
 * 
 * 提供统一的CRUD、相似度搜索、混合查询接口
 */

import { EmbeddingProvider } from '../embeddings/embedding-provider.js';
import { delay } from '../utils/environment.js';
import type { FileVectorDBConfig } from './file-vector-database.js';

export interface VectorDBConfig {
  /** 数据库类型 */
  provider: 'pinecone' | 'weaviate' | 'qdrant' | 'milvus' | 'chroma' | 'memory' | 'file';
  /** 连接配置 */
  connection: {
    host?: string;
    port?: number;
    apiKey?: string;
    url?: string;
    region?: string;
    projectId?: string;
  };
  /** 集合/索引名称 */
  collection: string;
  /** 向量维度 */
  dimension: number;
  /** 距离度量方式 */
  metric: 'cosine' | 'euclidean' | 'dotproduct' | 'manhattan';
  /** 批量操作大小 */
  batchSize: number;
  /** 最大重试次数 */
  maxRetries: number;
  /** 重试延迟(ms) */
  retryDelay: number;
  /** 连接超时(ms) */
  timeout: number;
  /** 是否启用缓存 */
  cacheEnabled: boolean;
  /** 缓存大小 */
  cacheSize: number;
  /** 自定义元数据模式 */
  metadataSchema?: Record<string, 'string' | 'number' | 'boolean' | 'string[]'>;
}

export interface VectorDocument {
  /** 文档唯一ID */
  id: string;
  /** 向量表示 */
  vector: number[];
  /** 原始文本内容 */
  content?: string;
  /** 元数据 */
  metadata: Record<string, unknown>;
  /** 创建时间 */
  createdAt?: Date;
  /** 更新时间 */
  updatedAt?: Date;
}

export interface SearchResult {
  /** 文档 */
  document: VectorDocument;
  /** 相似度分数 */
  score: number;
  /** 排名 */
  rank: number;
}

export interface SearchOptions {
  /** 返回结果数量 */
  limit?: number;
  /** 相似度阈值 */
  threshold?: number;
  /** 元数据过滤条件 */
  filter?: Record<string, unknown>;
  /** 是否包含向量 */
  includeVector?: boolean;
  /** 是否包含内容 */
  includeContent?: boolean;
  /** 偏移量 (分页) */
  offset?: number;
  /** 混合搜索权重 (0-1, 1表示纯向量搜索) */
  vectorWeight?: number;
}

export interface HybridSearchOptions extends SearchOptions {
  /** 文本查询 (用于BM25/全文搜索) */
  textQuery?: string;
  /** 稀疏向量 (用于SPLADE等) */
  sparseVector?: number[];
  /** 混合搜索类型 */
  fusionType: 'rrf' | 'linear' | 'weighted';
  /** 向量搜索权重 */
  vectorWeight?: number;
  /** 文本搜索权重 */
  textWeight?: number;
}

export interface AggregationResult {
  /** 聚合字段 */
  field: string;
  /** 聚合类型 */
  type: 'count' | 'sum' | 'avg' | 'min' | 'max';
  /** 结果值 */
  value: number;
  /** 分组结果 */
  groups?: { key: string; value: number }[];
}

export interface IndexStats {
  /** 总向量数 */
  totalVectors: number;
  /** 向量维度 */
  dimension: number;
  /** 索引大小(字节) */
  indexSize: number;
  /** 平均查询时间(ms) */
  averageQueryTime: number;
  /** 缓存命中率 */
  cacheHitRate: number;
}

/**
 * 向量数据库抽象基类
 */
export abstract class VectorDatabase {
  protected config: VectorDBConfig;
  protected initialized: boolean = false;

  constructor(config: VectorDBConfig) {
    this.config = config;
  }

  /**
   * 初始化数据库连接
   */
  abstract initialize(): Promise<void>;

  /**
   * 关闭数据库连接
   */
  abstract close(): Promise<void>;

  /**
   * 插入单个文档
   */
  abstract insert(document: VectorDocument): Promise<void>;

  /**
   * 批量插入文档
   */
  abstract insertBatch(documents: VectorDocument[]): Promise<void>;

  /**
   * 根据ID查询文档
   */
  abstract getById(id: string): Promise<VectorDocument | null>;

  /**
   * 根据ID批量查询
   */
  abstract getByIds(ids: string[]): Promise<VectorDocument[]>;

  /**
   * 更新文档
   */
  abstract update(id: string, updates: Partial<VectorDocument>): Promise<void>;

  /**
   * 删除文档
   */
  abstract delete(id: string): Promise<void>;

  /**
   * 批量删除
   */
  abstract deleteBatch(ids: string[]): Promise<void>;

  /**
   * 向量相似度搜索
   */
  abstract search(vector: number[], options?: SearchOptions): Promise<SearchResult[]>;

  /**
   * 混合搜索 (向量 + 文本)
   */
  abstract hybridSearch(query: string, vector: number[], options?: HybridSearchOptions): Promise<SearchResult[]>;

  /**
   * 文本搜索 (需要数据库支持全文索引)
   */
  abstract textSearch(query: string, options?: SearchOptions): Promise<SearchResult[]>;

  /**
   * 元数据过滤查询
   */
  abstract filterSearch(filter: Record<string, unknown>, options?: SearchOptions): Promise<SearchResult[]>;

  /**
   * 获取索引统计信息
   */
  abstract getStats(): Promise<IndexStats>;

  /**
   * 清空集合
   */
  abstract clear(): Promise<void>;

  /**
   * 创建索引 (如果需要)
   */
  abstract createIndex?(): Promise<void>;

  /**
   * 删除索引
   */
  abstract deleteIndex?(): Promise<void>;

  /**
   * 检查是否已初始化
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * 带重试的操作包装器
   */
  protected async withRetry<T>(operation: () => Promise<T>): Promise<T> {
    let lastError: Error | undefined;
    
    for (let i = 0; i < this.config.maxRetries; i++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;
        if (i < this.config.maxRetries - 1) {
          await delay(this.config.retryDelay * Math.pow(2, i));
        }
      }
    }
    
    throw lastError;
  }

  /**
   * 验证向量维度
   */
  protected validateVector(vector: number[]): void {
    if (vector.length !== this.config.dimension) {
      throw new Error(`Vector dimension mismatch: expected ${this.config.dimension}, got ${vector.length}`);
    }
  }

  /**
   * 计算相似度分数
   */
  protected calculateSimilarity(a: number[], b: number[]): number {
    switch (this.config.metric) {
      case 'cosine':
        return this.cosineSimilarity(a, b);
      case 'euclidean':
        return 1 / (1 + this.euclideanDistance(a, b));
      case 'dotproduct':
        return this.dotProduct(a, b);
      case 'manhattan':
        return 1 / (1 + this.manhattanDistance(a, b));
      default:
        return this.cosineSimilarity(a, b);
    }
  }

  /**
   * 余弦相似度
   */
  protected cosineSimilarity(a: number[], b: number[]): number {
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    
    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  /**
   * 欧几里得距离
   */
  protected euclideanDistance(a: number[], b: number[]): number {
    let sum = 0;
    for (let i = 0; i < a.length; i++) {
      sum += Math.pow(a[i] - b[i], 2);
    }
    return Math.sqrt(sum);
  }

  /**
   * 曼哈顿距离
   */
  protected manhattanDistance(a: number[], b: number[]): number {
    let sum = 0;
    for (let i = 0; i < a.length; i++) {
      sum += Math.abs(a[i] - b[i]);
    }
    return sum;
  }

  /**
   * 点积
   */
  protected dotProduct(a: number[], b: number[]): number {
    let sum = 0;
    for (let i = 0; i < a.length; i++) {
      sum += a[i] * b[i];
    }
    return sum;
  }
}

/**
 * 内存向量数据库实现 (Fallback)
 */
export class InMemoryVectorDB extends VectorDatabase {
  private documents: Map<string, VectorDocument> = new Map();
  private cache: Map<string, SearchResult[]> = new Map();

  async initialize(): Promise<void> {
    this.initialized = true;
  }

  async close(): Promise<void> {
    this.documents.clear();
    this.cache.clear();
    this.initialized = false;
  }

  async insert(document: VectorDocument): Promise<void> {
    this.validateVector(document.vector);
    document.createdAt = new Date();
    document.updatedAt = new Date();
    this.documents.set(document.id, { ...document });
    this.invalidateCache();
  }

  async insertBatch(documents: VectorDocument[]): Promise<void> {
    for (const doc of documents) {
      await this.insert(doc);
    }
  }

  async getById(id: string): Promise<VectorDocument | null> {
    return this.documents.get(id) || null;
  }

  async getByIds(ids: string[]): Promise<VectorDocument[]> {
    return ids.map(id => this.documents.get(id)).filter((doc): doc is VectorDocument => doc !== undefined);
  }

  async update(id: string, updates: Partial<VectorDocument>): Promise<void> {
    const existing = this.documents.get(id);
    if (!existing) {
      throw new Error(`Document not found: ${id}`);
    }
    
    const updated = {
      ...existing,
      ...updates,
      id,
      updatedAt: new Date()
    };
    
    this.documents.set(id, updated);
    this.invalidateCache();
  }

  async delete(id: string): Promise<void> {
    this.documents.delete(id);
    this.invalidateCache();
  }

  async deleteBatch(ids: string[]): Promise<void> {
    for (const id of ids) {
      this.documents.delete(id);
    }
    this.invalidateCache();
  }

  async search(vector: number[], options: SearchOptions = {}): Promise<SearchResult[]> {
    this.validateVector(vector);
    
    const cacheKey = this.getCacheKey(vector, options);
    if (this.config.cacheEnabled && this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!;
    }

    const { limit = 10, threshold = 0, filter = {} } = options;
    
    const results: SearchResult[] = [];
    
    for (const doc of this.documents.values()) {
      // 应用元数据过滤
      if (!this.matchesFilter(doc, filter)) {
        continue;
      }
      
      const score = this.calculateSimilarity(vector, doc.vector);
      
      if (score >= threshold) {
        results.push({
          document: this.filterDocument(doc, options),
          score,
          rank: 0
        });
      }
    }
    
    // 排序并限制结果
    results.sort((a, b) => b.score - a.score);
    const limitedResults = results.slice(0, limit);
    
    // 设置排名
    limitedResults.forEach((result, index) => {
      result.rank = index + 1;
    });

    if (this.config.cacheEnabled) {
      this.cache.set(cacheKey, limitedResults);
    }
    
    return limitedResults;
  }

  async textSearch(query: string, options: SearchOptions = {}): Promise<SearchResult[]> {
    const { limit = 10, filter = {} } = options;
    const queryLower = query.toLowerCase();
    
    const results: SearchResult[] = [];
    
    for (const doc of this.documents.values()) {
      if (!this.matchesFilter(doc, filter)) {
        continue;
      }
      
      // 简单的文本匹配
      let score = 0;
      if (doc.content?.toLowerCase().includes(queryLower)) {
        score = 0.5;
      }
      
      // 检查元数据
      for (const value of Object.values(doc.metadata)) {
        if (String(value).toLowerCase().includes(queryLower)) {
          score = Math.max(score, 0.3);
        }
      }
      
      if (score > 0) {
        results.push({
          document: this.filterDocument(doc, options),
          score,
          rank: 0
        });
      }
    }
    
    results.sort((a, b) => b.score - a.score);
    const limitedResults = results.slice(0, limit);
    limitedResults.forEach((result, index) => {
      result.rank = index + 1;
    });
    
    return limitedResults;
  }

  async filterSearch(filter: Record<string, unknown>, options: SearchOptions = {}): Promise<SearchResult[]> {
    const { limit = 10 } = options;
    
    const results: SearchResult[] = [];
    
    for (const doc of this.documents.values()) {
      if (this.matchesFilter(doc, filter)) {
        results.push({
          document: this.filterDocument(doc, options),
          score: 1,
          rank: 0
        });
      }
    }
    
    const limitedResults = results.slice(0, limit);
    limitedResults.forEach((result, index) => {
      result.rank = index + 1;
    });
    
    return limitedResults;
  }

  async hybridSearch(
    query: string,
    vector: number[],
    options: HybridSearchOptions = { fusionType: 'rrf' }
  ): Promise<SearchResult[]> {
    const { limit = 10, fusionType = 'rrf', vectorWeight = 0.7, textWeight = 0.3 } = options;
    
    // 执行向量搜索
    const vectorResults = await this.search(vector, { ...options, limit: limit * 2 });
    
    // 执行文本搜索
    const textResults = await this.textSearch(query, { ...options, limit: limit * 2 });
    
    // 融合结果
    if (fusionType === 'rrf') {
      return this.rrfFusion(vectorResults, textResults, limit);
    } else {
      return this.weightedFusion(vectorResults, textResults, vectorWeight, textWeight, limit);
    }
  }

  async getStats(): Promise<IndexStats> {
    let sizeInBytes = 0;
    
    for (const doc of this.documents.values()) {
      sizeInBytes += JSON.stringify(doc).length * 2; // 粗略估计
    }
    
    return {
      totalVectors: this.documents.size,
      dimension: this.config.dimension,
      indexSize: sizeInBytes,
      averageQueryTime: 0,
      cacheHitRate: 0
    };
  }

  async clear(): Promise<void> {
    this.documents.clear();
    this.cache.clear();
  }

  async createIndex(): Promise<void> {
    // 内存数据库不需要创建索引
    return Promise.resolve();
  }

  async deleteIndex(): Promise<void> {
    // 内存数据库不需要删除索引
    return Promise.resolve();
  }

  /**
   * RRF融合
   */
  private rrfFusion(vectorResults: SearchResult[], textResults: SearchResult[], limit: number): SearchResult[] {
    const k = 60; // RRF常数
    const scores = new Map<string, { score: number; doc: VectorDocument }>();
    
    // 处理向量结果
    vectorResults.forEach((result, index) => {
      const id = result.document.id;
      const rankScore = 1 / (k + index + 1);
      
      if (scores.has(id)) {
        scores.get(id)!.score += rankScore;
      } else {
        scores.set(id, { score: rankScore, doc: result.document });
      }
    });
    
    // 处理文本结果
    textResults.forEach((result, index) => {
      const id = result.document.id;
      const rankScore = 1 / (k + index + 1);
      
      if (scores.has(id)) {
        scores.get(id)!.score += rankScore;
      } else {
        scores.set(id, { score: rankScore, doc: result.document });
      }
    });
    
    // 排序并返回
    const fused = Array.from(scores.entries())
      .map(([, { score, doc }]) => ({
        document: doc,
        score,
        rank: 0
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
    
    fused.forEach((result, index) => {
      result.rank = index + 1;
    });
    
    return fused;
  }

  /**
   * 加权融合
   */
  private weightedFusion(
    vectorResults: SearchResult[],
    textResults: SearchResult[],
    vectorWeight: number,
    textWeight: number,
    limit: number
  ): SearchResult[] {
    const scores = new Map<string, { score: number; doc: VectorDocument }>();
    
    // 处理向量结果
    vectorResults.forEach(result => {
      const id = result.document.id;
      const weightedScore = result.score * vectorWeight;
      
      if (scores.has(id)) {
        scores.get(id)!.score += weightedScore;
      } else {
        scores.set(id, { score: weightedScore, doc: result.document });
      }
    });
    
    // 处理文本结果
    textResults.forEach(result => {
      const id = result.document.id;
      const weightedScore = result.score * textWeight;
      
      if (scores.has(id)) {
        scores.get(id)!.score += weightedScore;
      } else {
        scores.set(id, { score: weightedScore, doc: result.document });
      }
    });
    
    // 排序并返回
    const fused = Array.from(scores.entries())
      .map(([, { score, doc }]) => ({
        document: doc,
        score,
        rank: 0
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
    
    fused.forEach((result, index) => {
      result.rank = index + 1;
    });
    
    return fused;
  }

  /**
   * 检查文档是否匹配过滤条件
   */
  private matchesFilter(doc: VectorDocument, filter: Record<string, unknown>): boolean {
    for (const [key, value] of Object.entries(filter)) {
      const docValue = doc.metadata[key];
      
      if (typeof value === 'object' && value !== null) {
        // 支持操作符: $eq, $ne, $gt, $gte, $lt, $lte, $in, $nin
        const op = Object.keys(value)[0];
        const opValue = (value as Record<string, unknown>)[op];
        
        switch (op) {
          case '$eq':
            if (docValue !== opValue) return false;
            break;
          case '$ne':
            if (docValue === opValue) return false;
            break;
          case '$gt':
            if (!(typeof docValue === 'number' && typeof opValue === 'number' && docValue > opValue)) return false;
            break;
          case '$gte':
            if (!(typeof docValue === 'number' && typeof opValue === 'number' && docValue >= opValue)) return false;
            break;
          case '$lt':
            if (!(typeof docValue === 'number' && typeof opValue === 'number' && docValue < opValue)) return false;
            break;
          case '$lte':
            if (!(typeof docValue === 'number' && typeof opValue === 'number' && docValue <= opValue)) return false;
            break;
          case '$in':
            if (!Array.isArray(opValue) || !opValue.includes(docValue)) return false;
            break;
          case '$nin':
            if (!Array.isArray(opValue) || opValue.includes(docValue)) return false;
            break;
          default:
            return false;
        }
      } else {
        if (docValue !== value) return false;
      }
    }
    
    return true;
  }

  /**
   * 根据选项过滤文档字段
   */
  private filterDocument(doc: VectorDocument, options: SearchOptions): VectorDocument {
    const filtered: VectorDocument = {
      id: doc.id,
      vector: options.includeVector ? doc.vector : [],
      content: options.includeContent !== false ? doc.content : undefined,
      metadata: doc.metadata,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt
    };
    
    return filtered;
  }

  /**
   * 获取缓存键
   */
  private getCacheKey(vector: number[], options: SearchOptions): string {
    return `${vector.slice(0, 5).join(',')}:${JSON.stringify(options)}`;
  }

  /**
   * 清除缓存
   */
  private invalidateCache(): void {
    this.cache.clear();
  }
}

/**
 * 向量数据库管理器
 * 提供统一的接口管理多个数据库实例
 */
export class VectorDatabaseManager {
  private databases: Map<string, VectorDatabase> = new Map();
  private embeddingProvider?: EmbeddingProvider;

  constructor(embeddingProvider?: EmbeddingProvider) {
    this.embeddingProvider = embeddingProvider;
  }

  /**
   * 注册数据库
   */
  register(name: string, database: VectorDatabase): void {
    this.databases.set(name, database);
  }

  /**
   * 获取数据库
   */
  get(name: string): VectorDatabase | undefined {
    return this.databases.get(name);
  }

  /**
   * 创建并注册内存数据库
   */
  createMemoryDB(name: string, config: Partial<VectorDBConfig> = {}): InMemoryVectorDB {
    const fullConfig: VectorDBConfig = {
      provider: 'memory',
      connection: {},
      collection: name,
      dimension: 384,
      metric: 'cosine',
      batchSize: 100,
      maxRetries: 3,
      retryDelay: 1000,
      timeout: 30000,
      cacheEnabled: true,
      cacheSize: 1000,
      ...config
    };
    
    const db = new InMemoryVectorDB(fullConfig);
    this.register(name, db);
    return db;
  }

  /**
   * 使用文本搜索
   */
  async searchByText(
    dbName: string,
    text: string,
    options?: SearchOptions
  ): Promise<SearchResult[]> {
    const db = this.get(dbName);
    if (!db) {
      throw new Error(`Database not found: ${dbName}`);
    }

    if (!this.embeddingProvider) {
      throw new Error('Embedding provider not configured');
    }

    const embeddingResult = await this.embeddingProvider.embed(text);
    const vector = Array.isArray(embeddingResult) ? embeddingResult : embeddingResult.embedding;
    return db.search(vector, options);
  }

  /**
   * 插入带自动嵌入的文档
   */
  async insertWithEmbedding(
    dbName: string,
    id: string,
    content: string,
    metadata: Record<string, unknown> = {}
  ): Promise<void> {
    const db = this.get(dbName);
    if (!db) {
      throw new Error(`Database not found: ${dbName}`);
    }

    if (!this.embeddingProvider) {
      throw new Error('Embedding provider not configured');
    }

    const embeddingResult = await this.embeddingProvider.embed(content);
    
    await db.insert({
      id,
      vector: embeddingResult.embedding,
      content,
      metadata: {
        ...metadata,
        contentLength: content.length
      }
    });
  }

  /**
   * 批量插入带自动嵌入
   */
  async insertBatchWithEmbedding(
    dbName: string,
    items: { id: string; content: string; metadata?: Record<string, unknown> }[]
  ): Promise<void> {
    const db = this.get(dbName);
    if (!db) {
      throw new Error(`Database not found: ${dbName}`);
    }

    if (!this.embeddingProvider) {
      throw new Error('Embedding provider not configured');
    }

    const contents = items.map(item => item.content);
    const batchResult = await this.embeddingProvider.embedBatch(contents);
    
    const documents: VectorDocument[] = items.map((item, index) => ({
      id: item.id,
      vector: batchResult.embeddings[index],
      content: item.content,
      metadata: {
        ...item.metadata,
        contentLength: item.content.length
      }
    }));

    await db.insertBatch(documents);
  }

  /**
   * 初始化所有数据库
   */
  async initializeAll(): Promise<void> {
    await Promise.all(
      Array.from(this.databases.values()).map(db => db.initialize())
    );
  }

  /**
   * 关闭所有数据库
   */
  async closeAll(): Promise<void> {
    await Promise.all(
      Array.from(this.databases.values()).map(db => db.close())
    );
    this.databases.clear();
  }

  /**
   * 获取所有数据库名称
   */
  getDatabaseNames(): string[] {
    return Array.from(this.databases.keys());
  }
}

/**
 * 向量数据库工厂
 */
export class VectorDatabaseFactory {
  static createMemory(config: Partial<VectorDBConfig> = {}): InMemoryVectorDB {
    const fullConfig: VectorDBConfig = {
      provider: 'memory',
      connection: {},
      collection: 'default',
      dimension: 384,
      metric: 'cosine',
      batchSize: 100,
      maxRetries: 3,
      retryDelay: 1000,
      timeout: 30000,
      cacheEnabled: true,
      cacheSize: 1000,
      ...config
    };
    
    return new InMemoryVectorDB(fullConfig);
  }

  /**
   * 创建文件持久化向量数据库
   */
  static createFile(config: Partial<FileVectorDBConfig> = {}): import('./file-vector-database').FileVectorDatabase {
    const { FileVectorDatabase, DEFAULT_FILE_VECTOR_DB_CONFIG } = require('./file-vector-database');
    
    const fullConfig: FileVectorDBConfig = {
      ...DEFAULT_FILE_VECTOR_DB_CONFIG,
      ...config
    };
    
    return new FileVectorDatabase(fullConfig);
  }

  static async createWithEmbedding(
    config: VectorDBConfig,
    _embeddingProvider: EmbeddingProvider
  ): Promise<VectorDatabase> {
    let db: VectorDatabase;

    switch (config.provider) {
      case 'memory':
        db = new InMemoryVectorDB(config);
        break;
      case 'file':
        const { FileVectorDatabase } = require('./file-vector-database');
        db = new FileVectorDatabase(config);
        break;
      // 其他数据库类型需要对应的SDK
      // case 'pinecone':
      // case 'weaviate':
      // case 'qdrant':
      // case 'milvus':
      // case 'chroma':
      default:
        db = new InMemoryVectorDB(config);
    }

    await db.initialize();
    return db;
  }
}

export default VectorDatabase;
