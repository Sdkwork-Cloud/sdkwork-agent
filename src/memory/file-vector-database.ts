/**
 * 文件持久化向量数据库
 *
 * 使用本地文件系统持久化存储向量数据
 * 支持JSON和Binary两种格式
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import {
  VectorDatabase,
  VectorDocument,
  VectorDBConfig,
  SearchOptions,
  SearchResult,
  HybridSearchOptions,
  IndexStats,
} from './vector-database.js';

/**
 * 文件向量数据库配置
 */
export interface FileVectorDBConfig extends VectorDBConfig {
  /** 数据目录路径 */
  dataDir: string;
  /** 存储格式: 'json' | 'binary' */
  format: 'json' | 'binary';
  /** 自动保存间隔(ms) */
  autoSaveInterval: number;
  /** 是否压缩 */
  compress: boolean;
}

/**
 * 默认文件向量数据库配置
 */
export const DEFAULT_FILE_VECTOR_DB_CONFIG: FileVectorDBConfig = {
  provider: 'file',
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
  dataDir: './data/vector-db',
  format: 'json',
  autoSaveInterval: 30000, // 30秒
  compress: false,
};

/**
 * 文件向量数据库实现
 *
 * 提供持久化的向量存储，适合中小型数据集
 */
export class FileVectorDatabase extends VectorDatabase {
  private fileConfig: FileVectorDBConfig;
  private documents: Map<string, VectorDocument> = new Map();
  private cache: Map<string, SearchResult[]> = new Map();
  private autoSaveTimer?: NodeJS.Timeout;
  private dirty = false;

  constructor(config?: Partial<FileVectorDBConfig>) {
    const fullConfig = { ...DEFAULT_FILE_VECTOR_DB_CONFIG, ...config };
    super(fullConfig);
    this.fileConfig = fullConfig;
  }

  /**
   * 初始化数据库
   */
  async initialize(): Promise<void> {
    try {
      // 创建数据目录
      await fs.mkdir(this.fileConfig.dataDir, { recursive: true });

      // 加载已有数据
      await this.loadFromDisk();

      // 启动自动保存
      if (this.fileConfig.autoSaveInterval > 0) {
        this.startAutoSave();
      }

      this.initialized = true;
    } catch (error) {
      throw new Error(`Failed to initialize FileVectorDatabase: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * 关闭数据库
   */
  async close(): Promise<void> {
    // 停止自动保存
    if (this.autoSaveTimer) {
      clearInterval(this.autoSaveTimer);
      this.autoSaveTimer = undefined;
    }

    // 保存未保存的数据
    if (this.dirty) {
      await this.saveToDisk();
    }

    this.documents.clear();
    this.cache.clear();
    this.initialized = false;
  }

  /**
   * 插入文档
   */
  async insert(document: VectorDocument): Promise<void> {
    this.validateVector(document.vector);

    const doc: VectorDocument = {
      ...document,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.documents.set(document.id, doc);
    this.invalidateCache();
    this.dirty = true;

    // 立即保存（如果配置了）
    if (!this.fileConfig.autoSaveInterval) {
      await this.saveToDisk();
    }
  }

  /**
   * 批量插入
   */
  async insertBatch(documents: VectorDocument[]): Promise<void> {
    for (const doc of documents) {
      this.validateVector(doc.vector);

      this.documents.set(doc.id, {
        ...doc,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }

    this.invalidateCache();
    this.dirty = true;

    if (!this.fileConfig.autoSaveInterval) {
      await this.saveToDisk();
    }
  }

  /**
   * 根据ID获取文档
   */
  async getById(id: string): Promise<VectorDocument | null> {
    return this.documents.get(id) || null;
  }

  /**
   * 根据多个ID获取文档
   */
  async getByIds(ids: string[]): Promise<VectorDocument[]> {
    return ids
      .map(id => this.documents.get(id))
      .filter((doc): doc is VectorDocument => doc !== undefined);
  }

  /**
   * 更新文档
   */
  async update(id: string, updates: Partial<VectorDocument>): Promise<void> {
    const existing = this.documents.get(id);
    if (!existing) {
      throw new Error(`Document not found: ${id}`);
    }

    if (updates.vector) {
      this.validateVector(updates.vector);
    }

    const updated: VectorDocument = {
      ...existing,
      ...updates,
      id,
      updatedAt: new Date(),
    };

    this.documents.set(id, updated);
    this.invalidateCache();
    this.dirty = true;

    if (!this.fileConfig.autoSaveInterval) {
      await this.saveToDisk();
    }
  }

  /**
   * 删除文档
   */
  async delete(id: string): Promise<void> {
    this.documents.delete(id);
    this.invalidateCache();
    this.dirty = true;

    if (!this.fileConfig.autoSaveInterval) {
      await this.saveToDisk();
    }
  }

  /**
   * 批量删除
   */
  async deleteBatch(ids: string[]): Promise<void> {
    for (const id of ids) {
      this.documents.delete(id);
    }

    this.invalidateCache();
    this.dirty = true;

    if (!this.fileConfig.autoSaveInterval) {
      await this.saveToDisk();
    }
  }

  /**
   * 向量搜索
   */
  async search(vector: number[], options: SearchOptions = {}): Promise<SearchResult[]> {
    this.validateVector(vector);

    const cacheKey = this.getCacheKey(vector, options);
    if (this.fileConfig.cacheEnabled && this.cache.has(cacheKey)) {
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

    // 添加排名
    limitedResults.forEach((result, index) => {
      result.rank = index + 1;
    });

    // 缓存结果
    if (this.fileConfig.cacheEnabled) {
      this.cache.set(cacheKey, limitedResults);
    }

    return limitedResults;
  }

  /**
   * 文本搜索
   */
  async textSearch(query: string, options: SearchOptions = {}): Promise<SearchResult[]> {
    const { limit = 10, filter = {} } = options;

    const results: SearchResult[] = [];
    const queryLower = query.toLowerCase();

    for (const doc of this.documents.values()) {
      // 应用元数据过滤
      if (!this.matchesFilter(doc, filter)) {
        continue;
      }

      // 简单的文本匹配评分
      let score = 0;

      if (doc.content) {
        const contentLower = doc.content.toLowerCase();
        if (contentLower.includes(queryLower)) {
          score += 0.5;
          // 完全匹配加分
          if (contentLower === queryLower) {
            score += 0.3;
          }
        }
      }

      if (doc.metadata) {
        const metadataStr = JSON.stringify(doc.metadata).toLowerCase();
        if (metadataStr.includes(queryLower)) {
          score += 0.2;
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

    // 排序并限制结果
    results.sort((a, b) => b.score - a.score);
    const limitedResults = results.slice(0, limit);

    // 添加排名
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
    const { limit = 10, fusionType = 'rrf', vectorWeight = 0.7, textWeight = 0.3 } = options;

    // 执行向量搜索
    const vectorResults = await this.search(vector, { ...options, limit: limit * 2 });

    // 执行文本搜索
    const textResults = await this.textSearch(query, { ...options, limit: limit * 2 });

    // 融合结果
    const fusedResults = this.fuseResults(vectorResults, textResults, {
      fusionType,
      vectorWeight,
      textWeight,
      limit
    });

    return fusedResults;
  }

  /**
   * 获取索引统计
   */
  async getStats(): Promise<IndexStats> {
    const totalVectors = this.documents.size;
    let totalSize = 0;
    let dimension = 0;

    for (const doc of this.documents.values()) {
      if (doc.vector) {
        dimension = doc.vector.length;
        totalSize += doc.vector.length * 4; // 4 bytes per float
      }
      totalSize += JSON.stringify(doc).length * 2; // 估算元数据大小
    }

    return {
      totalVectors,
      dimension,
      indexSize: totalSize,
      averageQueryTime: 0, // 需要实际测量
      cacheHitRate: this.calculateCacheHitRate(),
    };
  }

  /**
   * 清空数据库
   */
  async clear(): Promise<void> {
    this.documents.clear();
    this.cache.clear();
    this.dirty = true;

    // 删除数据文件
    try {
      await fs.rm(this.fileConfig.dataDir, { recursive: true, force: true });
      await fs.mkdir(this.fileConfig.dataDir, { recursive: true });
    } catch (error) {
      console.error('Failed to clear data directory:', error);
    }
  }

  /**
   * 元数据过滤查询
   */
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

  /**
   * 创建索引
   */
  async createIndex(): Promise<void> {
    // 文件数据库不需要显式创建索引
    return Promise.resolve();
  }

  /**
   * 删除索引
   */
  async deleteIndex(): Promise<void> {
    // 文件数据库不需要显式删除索引
    return Promise.resolve();
  }

  /**
   * 保存到磁盘
   */
  async saveToDisk(): Promise<void> {
    if (!this.dirty) return;

    try {
      const dataPath = this.getDataFilePath();

      if (this.fileConfig.format === 'json') {
        const data = {
          documents: Array.from(this.documents.entries()),
          timestamp: new Date().toISOString(),
        };

        const json = JSON.stringify(data, null, 2);
        await fs.writeFile(dataPath, json, 'utf-8');
      } else {
        // Binary format
        const buffer = this.serializeToBinary();
        await fs.writeFile(dataPath, buffer);
      }

      this.dirty = false;
    } catch (error) {
      console.error('Failed to save to disk:', error);
      throw error;
    }
  }

  /**
   * 从磁盘加载
   */
  async loadFromDisk(): Promise<void> {
    try {
      const dataPath = this.getDataFilePath();

      try {
        await fs.access(dataPath);
      } catch {
        // 文件不存在，这是正常的
        return;
      }

      if (this.fileConfig.format === 'json') {
        const json = await fs.readFile(dataPath, 'utf-8');
        const data = JSON.parse(json);

        if (data.documents) {
          this.documents = new Map(data.documents);
        }
      } else {
        // Binary format
        const buffer = await fs.readFile(dataPath);
        this.deserializeFromBinary(buffer);
      }

      this.dirty = false;
    } catch (error) {
      console.error('Failed to load from disk:', error);
      // 不抛出错误，允许从空数据库开始
    }
  }

  /**
   * 启动自动保存
   */
  private startAutoSave(): void {
    this.autoSaveTimer = setInterval(async () => {
      if (this.dirty) {
        try {
          await this.saveToDisk();
        } catch (error) {
          console.error('Auto-save failed:', error);
        }
      }
    }, this.fileConfig.autoSaveInterval);
  }

  /**
   * 获取数据文件路径
   */
  private getDataFilePath(): string {
    const extension = this.fileConfig.format === 'json' ? 'json' : 'bin';
    return path.join(this.fileConfig.dataDir, `vectors.${extension}`);
  }

  /**
   * 序列化为二进制
   */
  private serializeToBinary(): Buffer {
    // 简化的二进制序列化
    const docs = Array.from(this.documents.values());
    const json = JSON.stringify(docs);
    return Buffer.from(json, 'utf-8');
  }

  /**
   * 从二进制反序列化
   */
  private deserializeFromBinary(buffer: Buffer): void {
    // 简化的二进制反序列化
    const json = buffer.toString('utf-8');
    const docs: VectorDocument[] = JSON.parse(json);

    this.documents.clear();
    for (const doc of docs) {
      this.documents.set(doc.id, doc);
    }
  }

  /**
   * 验证向量
   */
  protected validateVector(vector: number[]): void {
    if (!Array.isArray(vector)) {
      throw new Error('Vector must be an array');
    }

    if (vector.length === 0) {
      throw new Error('Vector cannot be empty');
    }

    if (!vector.every(v => typeof v === 'number' && !isNaN(v))) {
      throw new Error('Vector must contain only valid numbers');
    }
  }

  /**
   * 计算相似度
   */
  protected calculateSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) {
      throw new Error(`Vector dimensions do not match: ${a.length} vs ${b.length}`);
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    if (normA === 0 || normB === 0) {
      return 0;
    }

    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  /**
   * 检查文档是否匹配过滤条件
   */
  private matchesFilter(doc: VectorDocument, filter: Record<string, unknown>): boolean {
    if (!filter || Object.keys(filter).length === 0) {
      return true;
    }

    for (const [key, value] of Object.entries(filter)) {
      if (doc.metadata?.[key] !== value) {
        return false;
      }
    }

    return true;
  }

  /**
   * 过滤文档字段
   */
  private filterDocument(doc: VectorDocument, options: SearchOptions): VectorDocument {
    if (options.includeVector !== false) {
      return doc;
    }

    const { vector, ...rest } = doc;
    return rest as VectorDocument;
  }

  /**
   * 获取缓存键
   */
  private getCacheKey(vector: number[], options: SearchOptions): string {
    return `${vector.join(',')}:${JSON.stringify(options)}`;
  }

  /**
   * 使缓存失效
   */
  private invalidateCache(): void {
    this.cache.clear();
  }

  /**
   * 融合结果
   */
  private fuseResults(
    vectorResults: SearchResult[],
    textResults: SearchResult[],
    options: { fusionType: string; vectorWeight: number; textWeight: number; limit: number }
  ): SearchResult[] {
    const { fusionType, vectorWeight, textWeight, limit } = options;

    if (fusionType === 'rrf') {
      // Reciprocal Rank Fusion
      return this.rrfFusion(vectorResults, textResults, limit);
    } else {
      // Weighted score fusion
      return this.weightedFusion(vectorResults, textResults, vectorWeight, textWeight, limit);
    }
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
   * 计算缓存命中率
   */
  private calculateCacheHitRate(): number {
    // 简化实现，实际应该跟踪缓存命中和未命中
    return 0;
  }
}

export default FileVectorDatabase;
