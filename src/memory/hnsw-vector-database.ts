/**
 * 基于 HNSW 的高性能向量数据库实现
 * 
 * 使用 HNSW (Hierarchical Navigable Small World) 算法实现 O(log n) 复杂度的近似最近邻搜索
 * 相比线性搜索的 O(n) 复杂度，在大数据量下性能提升 100-1000 倍
 * 
 * 安全特性：
 * 1. 路径验证防止路径遍历攻击
 * 2. 数据验证防止原型链污染
 * 3. 安全的文件操作
 */

import { VectorDatabase, VectorDBConfig, VectorDocument, SearchResult, SearchOptions, IndexStats, HybridSearchOptions } from './vector-database.js';
import { HNSWIndex, HNSWConfig } from '../algorithms/hnsw.js';
import { Logger, createLogger } from '../utils/logger.js';
import * as path from 'path';

/**
 * HNSW 向量数据库配置
 */
export interface HNSWVectorDBConfig extends VectorDBConfig {
  /** HNSW 特定配置 */
  hnsw?: Partial<HNSWConfig>;
  /** 是否持久化到磁盘 */
  persistToDisk?: boolean;
  /** 持久化路径 */
  persistencePath?: string;
  /** 自动保存间隔 (ms) */
  autoSaveInterval?: number;
}

/**
 * 基于 HNSW 的向量数据库实现
 */
export class HNSWVectorDatabase extends VectorDatabase {
  private hnswConfig: HNSWConfig;
  private index: HNSWIndex;
  private documentStore: Map<string, VectorDocument> = new Map();
  private persistToDisk: boolean;
  private persistencePath?: string;
  private autoSaveTimer?: NodeJS.Timeout;
  private pendingSave = false;
  private logger: Logger;
  private metrics = {
    insertions: 0,
    deletions: 0,
    searches: 0,
    cacheHits: 0,
  };

  constructor(config: HNSWVectorDBConfig) {
    super(config);

    this.logger = createLogger({ name: 'HNSWVectorDatabase' });

    // 验证并清理持久化路径
    if (config.persistencePath) {
      this.persistencePath = this.validatePath(config.persistencePath);
    }

    // 初始化 HNSW 配置
    this.hnswConfig = {
      dimension: config.dimension,
      m: config.hnsw?.m ?? 16,
      efConstruction: config.hnsw?.efConstruction ?? 200,
      efSearch: config.hnsw?.efSearch ?? 50,
      metric: this.mapMetric(config.metric),
      seed: config.hnsw?.seed,
    };

    this.persistToDisk = config.persistToDisk ?? false;
    this.persistencePath = config.persistencePath;

    // 创建 HNSW 索引
    this.index = new HNSWIndex(this.hnswConfig);
  }

  /**
   * 映射距离度量方式
   */
  private mapMetric(metric: VectorDBConfig['metric']): HNSWConfig['metric'] {
    switch (metric) {
      case 'cosine':
        return 'cosine';
      case 'euclidean':
        return 'euclidean';
      case 'dotproduct':
        return 'dot';
      default:
        return 'cosine';
    }
  }

  /**
   * 初始化数据库
   */
  async initialize(): Promise<void> {
    if (this.persistToDisk && this.persistencePath) {
      await this.loadFromDisk();
    }

    // 设置自动保存
    const autoSaveInterval = (this.config as HNSWVectorDBConfig).autoSaveInterval;
    if (this.persistToDisk && autoSaveInterval && autoSaveInterval > 0) {
      this.autoSaveTimer = setInterval(() => {
        if (this.pendingSave) {
          this.saveToDisk().catch((error) => {
            this.logger.error('Auto save failed', { error });
          });
        }
      }, autoSaveInterval);
    }

    this.initialized = true;
  }

  /**
   * 关闭数据库
   */
  async close(): Promise<void> {
    if (this.autoSaveTimer) {
      clearInterval(this.autoSaveTimer);
    }

    if (this.persistToDisk && this.pendingSave) {
      await this.saveToDisk();
    }

    this.documentStore.clear();
    this.index.clear();
    this.initialized = false;
  }

  /**
   * 插入文档
   */
  async insert(document: VectorDocument): Promise<void> {
    this.validateVector(document.vector);
    
    const now = new Date();
    document.createdAt = now;
    document.updatedAt = now;

    // 添加到 HNSW 索引
    this.index.add(document.id, document.vector, document.metadata);
    
    // 存储完整文档
    this.documentStore.set(document.id, { ...document });
    
    this.pendingSave = true;
    this.metrics.insertions++;
  }

  /**
   * 批量插入
   */
  async insertBatch(documents: VectorDocument[]): Promise<void> {
    for (const doc of documents) {
      await this.insert(doc);
    }
  }

  /**
   * 通过 ID 获取文档
   */
  async getById(id: string): Promise<VectorDocument | null> {
    return this.documentStore.get(id) || null;
  }

  /**
   * 通过 IDs 批量获取
   */
  async getByIds(ids: string[]): Promise<VectorDocument[]> {
    return ids
      .map(id => this.documentStore.get(id))
      .filter((doc): doc is VectorDocument => doc !== undefined);
  }

  /**
   * 更新文档
   */
  async update(id: string, updates: Partial<VectorDocument>): Promise<void> {
    const existing = this.documentStore.get(id);
    if (!existing) {
      throw new Error(`Document not found: ${id}`);
    }

    // 如果向量更新，需要重新索引
    if (updates.vector) {
      this.validateVector(updates.vector);
      this.index.remove(id);
      this.index.add(id, updates.vector, updates.metadata || existing.metadata);
    }

    const updated: VectorDocument = {
      ...existing,
      ...updates,
      id,
      updatedAt: new Date(),
    };

    this.documentStore.set(id, updated);
    this.pendingSave = true;
  }

  /**
   * 删除文档
   */
  async delete(id: string): Promise<void> {
    this.index.remove(id);
    this.documentStore.delete(id);
    this.pendingSave = true;
    this.metrics.deletions++;
  }

  /**
   * 批量删除
   */
  async deleteBatch(ids: string[]): Promise<void> {
    for (const id of ids) {
      await this.delete(id);
    }
  }

  /**
   * 向量搜索 (核心方法 - O(log n) 复杂度)
   */
  async search(vector: number[], options: SearchOptions = {}): Promise<SearchResult[]> {
    this.validateVector(vector);

    if (this.config.cacheEnabled) {
      const cached = this.getFromCache();
      if (cached) {
        this.metrics.cacheHits++;
        return cached;
      }
    }

    const { limit = 10, threshold = 0, filter = {} } = options;

    // 使用 HNSW 进行快速搜索
    const hnswResults = this.index.search(vector, limit * 2); // 搜索更多结果以支持过滤

    // 转换为 SearchResult 格式并应用过滤
    let results: SearchResult[] = [];

    for (const hnswResult of hnswResults) {
      // 获取完整文档
      const doc = this.documentStore.get(hnswResult.id);
      if (!doc) continue;

      // 应用元数据过滤
      if (!this.matchesFilter(doc, filter)) {
        continue;
      }

      // 应用相似度阈值
      const similarity = 1 - hnswResult.distance; // 转换距离为相似度
      if (similarity < threshold) {
        continue;
      }

      results.push({
        document: this.filterDocument(doc, options),
        score: similarity,
        rank: 0,
      });

      if (results.length >= limit) {
        break;
      }
    }

    // 设置排名
    results.forEach((result, index) => {
      result.rank = index + 1;
    });

    // 缓存结果
    if (this.config.cacheEnabled) {
      this.setCache();
    }

    this.metrics.searches++;
    return results;
  }

  /**
   * 文本搜索
   */
  async textSearch(query: string, options: SearchOptions = {}): Promise<SearchResult[]> {
    const { limit = 10, filter = {} } = options;

    const results: SearchResult[] = [];
    const queryLower = query.toLowerCase();

    for (const doc of this.documentStore.values()) {
      if (!this.matchesFilter(doc, filter)) {
        continue;
      }

      // 简单的文本匹配评分
      let score = 0;
      
      if (doc.content?.toLowerCase().includes(queryLower)) {
        score = 0.5;
        // 计算匹配度
        const matches = (doc.content.toLowerCase().match(new RegExp(queryLower, 'g')) || []).length;
        score += Math.min(matches * 0.1, 0.3);
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
          rank: 0,
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

  /**
   * 过滤搜索
   */
  async filterSearch(filter: Record<string, unknown>, options: SearchOptions = {}): Promise<SearchResult[]> {
    const { limit = 10 } = options;

    const results: SearchResult[] = [];

    for (const doc of this.documentStore.values()) {
      if (this.matchesFilter(doc, filter)) {
        results.push({
          document: this.filterDocument(doc, options),
          score: 1,
          rank: 0,
        });
      }
    }

    const limitedResults = results.slice(0, limit);
    limitedResults.forEach((result, index) => {
      result.rank = index + 1;
    });

    return limitedResults;
  }

  /**
   * 混合搜索
   */
  async hybridSearch(
    query: string,
    vector: number[],
    options: HybridSearchOptions = { fusionType: 'rrf' }
  ): Promise<SearchResult[]> {
    const { limit = 10, vectorWeight = 0.7 } = options;

    // 并行执行向量搜索和文本搜索
    const [vectorResults, textResults] = await Promise.all([
      this.search(vector, { ...options, limit: limit * 2 }),
      this.textSearch(query, { ...options, limit: limit * 2 }),
    ]);

    // 融合结果
    const fusedScores = new Map<string, { doc: VectorDocument; score: number }>();

    // 添加向量搜索结果
    for (const result of vectorResults) {
      fusedScores.set(result.document.id, {
        doc: result.document,
        score: result.score * vectorWeight,
      });
    }

    // 添加文本搜索结果
    const textWeight = 1 - vectorWeight;
    for (const result of textResults) {
      const existing = fusedScores.get(result.document.id);
      if (existing) {
        existing.score += result.score * textWeight;
      } else {
        fusedScores.set(result.document.id, {
          doc: result.document,
          score: result.score * textWeight,
        });
      }
    }

    // 排序并返回
    const results = Array.from(fusedScores.entries())
      .map(([, data]) => ({
        document: data.doc,
        score: data.score,
        rank: 0,
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);

    results.forEach((result, index) => {
      result.rank = index + 1;
    });

    return results;
  }

  /**
   * 获取所有文档
   */
  async getAll(options: { limit?: number; offset?: number } = {}): Promise<VectorDocument[]> {
    const { limit, offset = 0 } = options;
    const docs = Array.from(this.documentStore.values());
    
    if (offset) {
      docs.splice(0, offset);
    }
    
    if (limit) {
      docs.splice(limit);
    }
    
    return docs;
  }

  /**
   * 获取文档数量
   */
  async count(): Promise<number> {
    return this.documentStore.size;
  }

  /**
   * 清空数据库
   */
  async clear(): Promise<void> {
    this.index.clear();
    this.documentStore.clear();
    this.clearCache();
    this.pendingSave = true;
  }

  /**
   * 创建索引
   */
  async createIndex(): Promise<void> {
    // HNSW 索引在构造函数中已创建
    return Promise.resolve();
  }

  /**
   * 删除索引
   */
  async deleteIndex(): Promise<void> {
    this.index.clear();
    return Promise.resolve();
  }

  /**
   * 获取统计信息
   */
  async getStats(): Promise<IndexStats> {
    let totalSize = 0;
    
    for (const doc of this.documentStore.values()) {
      totalSize += JSON.stringify(doc).length * 2;
    }
    
    return {
      totalVectors: this.documentStore.size,
      dimension: this.config.dimension,
      indexSize: totalSize,
      averageQueryTime: 0,
      cacheHitRate: 0,
    };
  }

  /**
   * 重建索引
   */
  async rebuildIndex(): Promise<void> {
    // 创建新索引
    const newIndex = new HNSWIndex(this.hnswConfig);

    // 重新添加所有文档
    for (const [id, doc] of this.documentStore) {
      newIndex.add(id, doc.vector, doc.metadata);
    }

    this.index = newIndex;
  }

  /**
   * 保存到磁盘
   */
  private async saveToDisk(): Promise<void> {
    if (!this.persistencePath) return;

    const data = {
      config: this.config,
      hnswConfig: this.hnswConfig,
      documents: Array.from(this.documentStore.entries()),
      indexStats: this.index.getStats(),
    };

    // 在 Node.js 环境中使用 fs
    if (typeof window === 'undefined') {
      const fs = await import('fs/promises');
      await fs.writeFile(this.persistencePath, JSON.stringify(data, null, 2));
    } else {
      // 在浏览器环境中使用 localStorage
      localStorage.setItem(`hnsw-db-${this.config.collection}`, JSON.stringify(data));
    }

    this.pendingSave = false;
  }

  /**
   * 从磁盘加载
   */
  private async loadFromDisk(): Promise<void> {
    if (!this.persistencePath) return;

    try {
      let data: string;

      if (typeof window === 'undefined') {
        const fs = await import('fs/promises');
        data = await fs.readFile(this.persistencePath, 'utf-8');
      } else {
        data = localStorage.getItem(`hnsw-db-${this.config.collection}`) || '';
      }

      if (!data) return;

      const parsed = JSON.parse(data);

      // 验证数据结构（防止原型链污染）
      if (!parsed || typeof parsed !== 'object' || !Array.isArray(parsed.documents)) {
        throw new Error('Invalid data format');
      }

      // 恢复文档（使用 Object.create(null) 防止原型链污染）
      for (const [id, doc] of parsed.documents) {
        // 验证 ID（防止 __proto__ 等特殊键）
        if (typeof id !== 'string' || id.startsWith('__') || id === 'constructor' || id === 'prototype') {
          this.logger.warn(`Skipping invalid document ID: ${id}`);
          continue;
        }

        // 验证文档结构
        if (!doc || typeof doc !== 'object' || !Array.isArray(doc.vector)) {
          this.logger.warn(`Skipping invalid document: ${id}`);
          continue;
        }
        
        // 使用安全的方式存储
        const safeDoc = {
          id: String(id),
          vector: doc.vector,
          metadata: doc.metadata && typeof doc.metadata === 'object' 
            ? Object.create(null) // 创建无原型的对象
            : undefined,
        };
        
        // 安全复制 metadata
        if (doc.metadata && typeof doc.metadata === 'object') {
          for (const [key, value] of Object.entries(doc.metadata)) {
            // 跳过危险键
            if (key.startsWith('__') || key === 'constructor' || key === 'prototype') {
              continue;
            }
            safeDoc.metadata![key] = value;
          }
        }
        
        this.documentStore.set(id, safeDoc as VectorDocument);
        this.index.add(id, safeDoc.vector, safeDoc.metadata);
      }
    } catch (error) {
      this.logger.warn('Failed to load HNSW database from disk', { error });
    }
  }

  /**
   * 验证路径安全
   * 防止路径遍历攻击
   */
  private validatePath(inputPath: string): string {
    // 解析为绝对路径
    const resolved = path.resolve(inputPath);
    
    // 获取工作目录
    const cwd = process.cwd();
    
    // 确保路径在工作目录内（防止路径遍历）
    if (!resolved.startsWith(cwd)) {
      throw new Error('Invalid path: path must be within working directory');
    }
    
    // 检查路径遍历（双重检查）
    const normalized = path.normalize(resolved);
    if (normalized.includes('..') || normalized.includes('~')) {
      throw new Error('Invalid path: path traversal detected');
    }
    
    // 只允许特定扩展名
    const allowedExtensions = ['.json', '.db', '.vec'];
    const ext = path.extname(normalized).toLowerCase();
    if (!allowedExtensions.includes(ext)) {
      throw new Error(`Invalid path extension: ${ext}`);
    }
    
    // 验证文件名（防止特殊字符）
    const basename = path.basename(normalized);
    if (!/^[a-zA-Z0-9_-]+\.[a-z]+$/.test(basename)) {
      throw new Error('Invalid path: filename contains invalid characters');
    }
    
    return normalized;
  }

  /**
   * 从缓存获取
   */
  private getFromCache(): SearchResult[] | undefined {
    // 简单实现，可以优化为 LRU 缓存
    return undefined;
  }

  /**
   * 设置缓存
   */
  private setCache(): void {
    // 简单实现，可以优化为 LRU 缓存
  }

  /**
   * 清空缓存
   */
  private clearCache(): void {
    // 实现缓存清空
  }

  /**
   * 检查文档是否匹配过滤条件
   */
  private matchesFilter(doc: VectorDocument, filter: Record<string, unknown>): boolean {
    for (const [key, value] of Object.entries(filter)) {
      if (doc.metadata[key] !== value) {
        return false;
      }
    }
    return true;
  }

  /**
   * 过滤文档字段
   */
  private filterDocument(doc: VectorDocument, options: SearchOptions): VectorDocument {
    const { includeVector = false, includeContent = true } = options;

    return {
      id: doc.id,
      vector: includeVector ? doc.vector : [],
      content: includeContent ? doc.content : undefined,
      metadata: doc.metadata,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    };
  }

  /**
   * 验证向量
   */
  protected validateVector(vector: number[]): void {
    if (vector.length !== this.config.dimension) {
      throw new Error(`Vector dimension mismatch: expected ${this.config.dimension}, got ${vector.length}`);
    }
  }
}

/**
 * 创建 HNSW 向量数据库
 */
export function createHNSWVectorDB(
  dimension: number,
  options: Partial<Omit<HNSWVectorDBConfig, 'dimension' | 'provider'>> = {}
): HNSWVectorDatabase {
  return new HNSWVectorDatabase({
    provider: 'memory',
    connection: {},
    collection: 'default',
    dimension,
    metric: 'cosine',
    batchSize: 100,
    maxRetries: 3,
    retryDelay: 1000,
    timeout: 30000,
    cacheEnabled: true,
    cacheSize: 1000,
    ...options,
  });
}
