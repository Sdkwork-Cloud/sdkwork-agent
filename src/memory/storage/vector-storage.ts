/**
 * 向量存储适配器
 * 
 * 特点：
 * - 基于HNSW算法的高维向量检索
 * - 语义相似度搜索
 * - 混合搜索（向量+文本）
 * - 适合长期记忆的语义检索
 * 
 * @module VectorStorage
 * @version 1.0.0
 */

import {
  StorageAdapter,
  StorageConfig,
  MemoryItem,
  StorageQueryOptions,
  SemanticQueryOptions,
  StorageQueryResult,
  StorageStats,
  BatchOperationResult,
} from './storage-adapter.js';

/**
 * HNSW索引节点
 */
interface HNSWNode {
  id: string;
  vector: number[];
  connections: Map<number, Set<string>>; // layer -> connected node ids
}

/**
 * 向量存储配置
 */
export interface VectorStorageConfig extends StorageConfig {
  options: {
    /** 向量维度 */
    dimension: number;
    /** HNSW M参数 */
    m?: number;
    /** HNSW efConstruction参数 */
    efConstruction?: number;
    /** HNSW efSearch参数 */
    efSearch?: number;
    /** 最大层级 */
    maxLevel?: number;
    /** 距离度量方式 */
    metric?: 'cosine' | 'euclidean' | 'dot';
    /** 持久化路径 */
    persistencePath?: string;
    /** 自动保存间隔 */
    autoSaveInterval?: number;
  };
}

/**
 * 向量存储适配器
 * 
 * 使用HNSW（Hierarchical Navigable Small World）算法实现
 * 高效的近似最近邻搜索，时间复杂度O(log n)
 */
export class VectorStorageAdapter extends StorageAdapter {
  private dimension: number;
  private m: number;
  private efConstruction: number;
  private efSearch: number;
  private maxLevel: number;
  private metric: 'cosine' | 'euclidean' | 'dot';
  private persistencePath?: string;
  private autoSaveInterval: number;

  private nodes = new Map<string, HNSWNode>();
  private entryPoint: string | null = null;
  private levelProb: number;
  private autoSaveTimer?: NodeJS.Timeout;
  private dirty = false;

  // 元数据存储（用于混合搜索）
  private metadata = new Map<string, MemoryItem>();

  constructor(config: VectorStorageConfig) {
    super(config);

    const opts = config.options;
    this.dimension = opts.dimension;
    this.m = opts.m || 16;
    this.efConstruction = opts.efConstruction || 200;
    this.efSearch = opts.efSearch || 50;
    this.maxLevel = opts.maxLevel || 16;
    this.metric = opts.metric || 'cosine';
    this.persistencePath = opts.persistencePath;
    this.autoSaveInterval = opts.autoSaveInterval || 60000;

    // 计算层级概率
    this.levelProb = 1 / Math.log(this.m);
  }

  // --------------------------------------------------------------------------
  // 生命周期
  // --------------------------------------------------------------------------

  async initialize(): Promise<void> {
    // 加载持久化数据
    if (this.persistencePath) {
      await this.loadFromDisk();
    }

    // 启动自动保存
    if (this.persistencePath && this.autoSaveInterval > 0) {
      this.autoSaveTimer = setInterval(() => {
        this.flush();
      }, this.autoSaveInterval);
    }

    this.initialized = true;
    this.logger.info('Vector storage initialized', {
      dimension: this.dimension,
      m: this.m,
      nodes: this.nodes.size,
    });
  }

  async close(): Promise<void> {
    if (this.autoSaveTimer) {
      clearInterval(this.autoSaveTimer);
    }

    await this.flush();

    this.nodes.clear();
    this.metadata.clear();
    this.initialized = false;
    this.logger.info('Vector storage closed');
  }

  // --------------------------------------------------------------------------
  // CRUD操作
  // --------------------------------------------------------------------------

  async store(item: MemoryItem): Promise<void> {
    if (!item.embedding) {
      throw new Error('Vector storage requires embedding');
    }

    // 验证维度
    if (item.embedding.length !== this.dimension) {
      throw new Error(`Dimension mismatch: expected ${this.dimension}, got ${item.embedding.length}`);
    }

    // 添加到HNSW索引
    this.insertToHNSW(item.id, item.embedding);

    // 存储元数据
    this.metadata.set(item.id, item);

    this.dirty = true;
    this.updateStats('add', item);
    this.emitEvent('item:stored', { id: item.id });
  }

  async storeBatch(items: MemoryItem[]): Promise<BatchOperationResult> {
    const startTime = Date.now();
    const succeeded: string[] = [];
    const failed: Array<{ id: string; error: string }> = [];

    for (const item of items) {
      try {
        await this.store(item);
        succeeded.push(item.id);
      } catch (error) {
        failed.push({ id: item.id, error: (error as Error).message });
      }
    }

    return {
      succeeded,
      failed,
      duration: Date.now() - startTime,
    };
  }

  async retrieve(id: string): Promise<MemoryItem | null> {
    const item = this.metadata.get(id);
    if (!item) return null;

    // 更新访问统计
    item.accessCount++;
    item.lastAccessed = Date.now();

    return { ...item };
  }

  async retrieveBatch(ids: string[]): Promise<MemoryItem[]> {
    const results: MemoryItem[] = [];

    for (const id of ids) {
      const item = await this.retrieve(id);
      if (item) {
        results.push(item);
      }
    }

    return results;
  }

  async query(options: StorageQueryOptions): Promise<StorageQueryResult[]> {
    // 向量存储主要支持语义查询，这里通过元数据过滤
    const {
      tier,
      type,
      tags,
      timeRange,
      importanceThreshold = 0,
      limit = 100,
      offset = 0,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = options;

    let results: StorageQueryResult[] = [];

    for (const item of this.metadata.values()) {
      // 层级过滤
      if (tier) {
        const tiers = Array.isArray(tier) ? tier : [tier];
        if (!tiers.includes(item.tier)) continue;
      }

      // 类型过滤
      if (type) {
        const types = Array.isArray(type) ? type : [type];
        if (!types.includes(item.type)) continue;
      }

      // 标签过滤
      if (tags && tags.length > 0) {
        if (!item.metadata.tags?.some(tag => tags.includes(tag))) continue;
      }

      // 时间范围过滤
      if (timeRange) {
        if (timeRange.start && item.createdAt < timeRange.start) continue;
        if (timeRange.end && item.createdAt > timeRange.end) continue;
      }

      // 重要性过滤
      if (item.importance < importanceThreshold) continue;

      results.push({
        item: { ...item },
        score: item.importance,
        importanceScore: item.importance,
        recencyScore: this.calculateRecencyScore(item.createdAt),
      });
    }

    // 排序
    results = this.sortResults(results, sortBy, sortOrder);

    // 分页
    results = results.slice(offset, offset + limit);

    return results;
  }

  async semanticQuery(options: SemanticQueryOptions): Promise<StorageQueryResult[]> {
    const {
      queryEmbedding,
      similarityThreshold = 0.7,
      vectorWeight = 0.7,
      textWeight = 0.3,
      limit = 10,
      tier,
      type,
      tags,
    } = options;

    // 验证维度
    if (queryEmbedding.length !== this.dimension) {
      throw new Error(`Dimension mismatch: expected ${this.dimension}, got ${queryEmbedding.length}`);
    }

    // HNSW搜索
    const hnswResults = this.searchHNSW(queryEmbedding, limit * 2);

    const results: StorageQueryResult[] = [];

    for (const { id, distance } of hnswResults) {
      const item = this.metadata.get(id);
      if (!item) continue;

      // 应用过滤器
      if (tier) {
        const tiers = Array.isArray(tier) ? tier : [tier];
        if (!tiers.includes(item.tier)) continue;
      }

      if (type) {
        const types = Array.isArray(type) ? type : [type];
        if (!types.includes(item.type)) continue;
      }

      if (tags && tags.length > 0) {
        if (!item.metadata.tags?.some(tag => tags.includes(tag))) continue;
      }

      // 计算相似度（距离转换为相似度）
      const similarity = 1 - distance;

      if (similarity < similarityThreshold) continue;

      // 更新访问统计
      item.accessCount++;
      item.lastAccessed = Date.now();

      results.push({
        item: { ...item },
        score: similarity,
        similarityScore: similarity,
        recencyScore: this.calculateRecencyScore(item.createdAt),
        importanceScore: item.importance,
      });
    }

    // 按相似度排序
    results.sort((a, b) => b.score - a.score);

    return results.slice(0, limit);
  }

  async update(id: string, updates: Partial<MemoryItem>): Promise<MemoryItem | null> {
    const item = this.metadata.get(id);
    if (!item) return null;

    // 如果向量更新，需要重新索引
    if (updates.embedding && updates.embedding !== item.embedding) {
      // 删除旧节点
      this.deleteFromHNSW(id);
      // 添加新节点
      this.insertToHNSW(id, updates.embedding);
    }

    // 应用其他更新
    Object.assign(item, updates);
    item.lastAccessed = Date.now();

    this.dirty = true;
    this.emitEvent('item:updated', { id });

    return { ...item };
  }

  async delete(id: string): Promise<boolean> {
    const item = this.metadata.get(id);
    if (!item) return false;

    // 从HNSW索引删除
    this.deleteFromHNSW(id);

    // 删除元数据
    this.metadata.delete(id);

    this.dirty = true;
    this.updateStats('remove', item);
    this.emitEvent('item:deleted', { id });

    return true;
  }

  async deleteBatch(ids: string[]): Promise<BatchOperationResult> {
    const startTime = Date.now();
    const succeeded: string[] = [];
    const failed: Array<{ id: string; error: string }> = [];

    for (const id of ids) {
      const success = await this.delete(id);
      if (success) {
        succeeded.push(id);
      } else {
        failed.push({ id, error: 'Not found' });
      }
    }

    return {
      succeeded,
      failed,
      duration: Date.now() - startTime,
    };
  }

  async deleteByQuery(options: StorageQueryOptions): Promise<number> {
    const toDelete = await this.query(options);
    let count = 0;

    for (const result of toDelete) {
      if (await this.delete(result.item.id)) {
        count++;
      }
    }

    return count;
  }

  // --------------------------------------------------------------------------
  // 管理操作
  // --------------------------------------------------------------------------

  async clear(): Promise<void> {
    const count = this.nodes.size;

    this.nodes.clear();
    this.metadata.clear();
    this.entryPoint = null;
    this.dirty = true;

    // 删除持久化文件
    if (this.persistencePath) {
      try {
        const fs = await import('fs/promises');
        await fs.unlink(this.persistencePath);
      } catch {
        // 文件可能不存在
      }
    }

    this.emitEvent('storage:cleared', { count });
  }

  async flush(): Promise<void> {
    if (!this.dirty || !this.persistencePath) return;

    try {
      const fs = await import('fs/promises');
      const path = await import('path');

      // 确保目录存在
      await fs.mkdir(path.dirname(this.persistencePath), { recursive: true });

      // 保存数据
      const data = {
        version: '1.0',
        timestamp: Date.now(),
        config: {
          dimension: this.dimension,
          m: this.m,
          metric: this.metric,
        },
        entryPoint: this.entryPoint,
        nodes: Array.from(this.nodes.entries()),
        metadata: Array.from(this.metadata.entries()),
      };

      await fs.writeFile(this.persistencePath, JSON.stringify(data, null, 2));

      this.dirty = false;
      this.emitEvent('storage:flushed', { nodeCount: this.nodes.size });
    } catch (error) {
      this.logger.error('Failed to flush vector storage', { error: (error as Error).message });
      throw error;
    }
  }

  async getStats(): Promise<StorageStats> {
    let totalSize = 0;

    for (const node of this.nodes.values()) {
      totalSize += node.vector.length * 4; // float32
    }

    for (const item of this.metadata.values()) {
      totalSize += JSON.stringify(item).length * 2;
    }

    // 计算各层级和类型的数量
    const tierCounts = { working: 0, short_term: 0, long_term: 0, archival: 0 };
    const typeCounts: Record<string, number> = {};

    for (const item of this.metadata.values()) {
      tierCounts[item.tier]++;
      typeCounts[item.type] = (typeCounts[item.type] || 0) + 1;
    }

    return {
      totalCount: this.nodes.size,
      tierCounts,
      typeCounts: typeCounts as Record<string, number>,
      totalSize,
      averageItemSize: this.nodes.size > 0 ? totalSize / this.nodes.size : 0,
    };
  }

  async healthCheck(): Promise<{ healthy: boolean; message?: string }> {
    // 检查索引一致性
    if (this.entryPoint && !this.nodes.has(this.entryPoint)) {
      return { healthy: false, message: 'Entry point references non-existent node' };
    }

    // 检查节点完整性
    for (const [id, node] of this.nodes) {
      if (node.vector.length !== this.dimension) {
        return { healthy: false, message: `Node ${id} has invalid dimension` };
      }
    }

    return { healthy: true };
  }

  // --------------------------------------------------------------------------
  // HNSW算法实现
  // --------------------------------------------------------------------------

  private insertToHNSW(id: string, vector: number[]): void {
    const level = this.randomLevel();
    const node: HNSWNode = {
      id,
      vector,
      connections: new Map(),
    };

    // 初始化每一层的连接
    for (let i = 0; i <= level; i++) {
      node.connections.set(i, new Set());
    }

    // 如果是第一个节点
    if (!this.entryPoint) {
      this.entryPoint = id;
      this.nodes.set(id, node);
      return;
    }

    // 找到每一层的最近邻
    let currentEntry = this.entryPoint;
    const entryPointNode = this.nodes.get(this.entryPoint)!;
    const entryPointLevel = this.getNodeLevel(entryPointNode);

    // 从最高层开始
    for (let i = Math.min(level, entryPointLevel); i >= 0; i--) {
      currentEntry = this.searchLayer(vector, currentEntry, i, 1)[0]?.id || currentEntry;
    }

    // 在每一层建立连接
    for (let i = 0; i <= level; i++) {
      const neighbors = this.searchLayer(vector, currentEntry, i, this.m);

      for (const neighbor of neighbors) {
        // 双向连接
        node.connections.get(i)?.add(neighbor.id);
        const neighborNode = this.nodes.get(neighbor.id);
        if (neighborNode) {
          if (!neighborNode.connections.has(i)) {
            neighborNode.connections.set(i, new Set());
          }
          neighborNode.connections.get(i)?.add(id);

          // 如果连接数超过限制，修剪
          this.pruneConnections(neighborNode, i);
        }
      }
    }

    // 更新entry point（如果新节点层级更高）
    if (level > entryPointLevel) {
      this.entryPoint = id;
    }

    this.nodes.set(id, node);
  }

  private deleteFromHNSW(id: string): void {
    const node = this.nodes.get(id);
    if (!node) return;

    // 从所有邻居的连接中移除
    for (const [level, connections] of node.connections) {
      for (const neighborId of connections) {
        const neighbor = this.nodes.get(neighborId);
        if (neighbor) {
          neighbor.connections.get(level)?.delete(id);
        }
      }
    }

    // 如果删除的是entry point，需要更新
    if (this.entryPoint === id) {
      // 找到最高层的其他节点
      let maxLevel = -1;
      let newEntry: string | null = null;

      for (const [nodeId, n] of this.nodes) {
        if (nodeId !== id) {
          const nodeLevel = this.getNodeLevel(n);
          if (nodeLevel > maxLevel) {
            maxLevel = nodeLevel;
            newEntry = nodeId;
          }
        }
      }

      this.entryPoint = newEntry;
    }

    this.nodes.delete(id);
  }

  private searchHNSW(query: number[], k: number): Array<{ id: string; distance: number }> {
    if (!this.entryPoint || this.nodes.size === 0) {
      return [];
    }

    const entryPointNode = this.nodes.get(this.entryPoint)!;
    const entryPointLevel = this.getNodeLevel(entryPointNode);

    let currentEntry = this.entryPoint;

    // 贪婪搜索到最底层
    for (let i = entryPointLevel; i > 0; i--) {
      currentEntry = this.searchLayer(query, currentEntry, i, 1)[0]?.id || currentEntry;
    }

    // 在最底层搜索k个最近邻
    return this.searchLayer(query, currentEntry, 0, k);
  }

  private searchLayer(
    query: number[],
    entryPoint: string,
    level: number,
    k: number
  ): Array<{ id: string; distance: number }> {
    const visited = new Set<string>();
    const candidates = new Map<string, number>();
    const results: Array<{ id: string; distance: number }> = [];

    const entryNode = this.nodes.get(entryPoint);
    if (!entryNode) return results;

    const entryDist = this.calculateDistance(query, entryNode.vector);
    candidates.set(entryPoint, entryDist);
    visited.add(entryPoint);

    while (candidates.size > 0) {
      // 找到最近的候选
      let nearestId: string | null = null;
      let nearestDist = Infinity;

      for (const [id, dist] of candidates) {
        if (dist < nearestDist) {
          nearestDist = dist;
          nearestId = id;
        }
      }

      if (!nearestId) break;

      candidates.delete(nearestId);

      // 如果距离比当前结果中最远的还大，且已有k个结果，停止
      if (results.length >= k && nearestDist > (results[results.length - 1]?.distance ?? 0)) {
        break;
      }

      results.push({ id: nearestId, distance: nearestDist });
      results.sort((a, b) => a.distance - b.distance);
      if (results.length > k) {
        results.pop();
      }

      // 探索邻居
      const node = this.nodes.get(nearestId);
      if (!node) continue;

      const neighbors = node.connections.get(level) || new Set();
      for (const neighborId of neighbors) {
        if (visited.has(neighborId)) continue;

        const neighbor = this.nodes.get(neighborId);
        if (!neighbor) continue;

        const dist = this.calculateDistance(query, neighbor.vector);
        visited.add(neighborId);

        // 如果邻居比当前最远的候选更近，或者候选不足ef个
        if (candidates.size < this.efSearch || dist < Math.max(...candidates.values())) {
          candidates.set(neighborId, dist);
        }
      }
    }

    return results;
  }

  private pruneConnections(node: HNSWNode, level: number): void {
    const connections = node.connections.get(level);
    if (!connections || connections.size <= this.m) return;

    // 简单的修剪策略：保留最近的m个
    const distances: Array<{ id: string; dist: number }> = [];

    for (const neighborId of connections) {
      const neighbor = this.nodes.get(neighborId);
      if (neighbor) {
        const dist = this.calculateDistance(node.vector, neighbor.vector);
        distances.push({ id: neighborId, dist });
      }
    }

    distances.sort((a, b) => a.dist - b.dist);

    connections.clear();
    for (let i = 0; i < Math.min(this.m, distances.length); i++) {
      connections.add(distances[i].id);
    }
  }

  private getNodeLevel(node: HNSWNode): number {
    return Math.max(...Array.from(node.connections.keys()), -1);
  }

  private randomLevel(): number {
    let level = 0;
    while (Math.random() < this.levelProb && level < this.maxLevel) {
      level++;
    }
    return level;
  }

  private calculateDistance(a: number[], b: number[]): number {
    switch (this.metric) {
      case 'euclidean':
        return this.euclideanDistance(a, b);
      case 'dot':
        return 1 - this.dotProduct(a, b);
      case 'cosine':
      default:
        return 1 - this.cosineSimilarity(a, b);
    }
  }

  private euclideanDistance(a: number[], b: number[]): number {
    let sum = 0;
    for (let i = 0; i < a.length; i++) {
      const diff = a[i] - b[i];
      sum += diff * diff;
    }
    return Math.sqrt(sum);
  }

  private dotProduct(a: number[], b: number[]): number {
    let sum = 0;
    for (let i = 0; i < a.length; i++) {
      sum += a[i] * b[i];
    }
    return sum;
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    const dot = this.dotProduct(a, b);
    const normA = Math.sqrt(a.reduce((sum, v) => sum + v * v, 0));
    const normB = Math.sqrt(b.reduce((sum, v) => sum + v * v, 0));

    if (normA === 0 || normB === 0) return 0;

    return dot / (normA * normB);
  }

  // --------------------------------------------------------------------------
  // 私有方法
  // --------------------------------------------------------------------------

  private async loadFromDisk(): Promise<void> {
    if (!this.persistencePath) return;

    try {
      const fs = await import('fs/promises');

      try {
        await fs.access(this.persistencePath);
      } catch {
        return;
      }

      const content = await fs.readFile(this.persistencePath, 'utf-8');
      const data = JSON.parse(content);

      if (data.nodes && Array.isArray(data.nodes)) {
        this.nodes = new Map(data.nodes);
      }

      if (data.metadata && Array.isArray(data.metadata)) {
        this.metadata = new Map(data.metadata);
      }

      this.entryPoint = data.entryPoint || null;

      this.logger.info('Loaded vector storage from disk', {
        nodes: this.nodes.size,
        metadata: this.metadata.size,
      });
    } catch (error) {
      this.logger.warn('Failed to load vector storage from disk', { error: (error as Error).message });
    }
  }

  private calculateRecencyScore(timestamp: number): number {
    const age = Date.now() - timestamp;
    return Math.exp(-age / (24 * 60 * 60 * 1000));
  }

  private sortResults(
    results: StorageQueryResult[],
    sortBy: string,
    sortOrder: 'asc' | 'desc'
  ): StorageQueryResult[] {
    const multiplier = sortOrder === 'asc' ? 1 : -1;

    return results.sort((a, b) => {
      let comparison = 0;

      switch (sortBy) {
        case 'createdAt':
          comparison = a.item.createdAt - b.item.createdAt;
          break;
        case 'lastAccessed':
          comparison = a.item.lastAccessed - b.item.lastAccessed;
          break;
        case 'importance':
          comparison = a.item.importance - b.item.importance;
          break;
        case 'accessCount':
          comparison = a.item.accessCount - b.item.accessCount;
          break;
        default:
          comparison = a.score - b.score;
      }

      return comparison * multiplier;
    });
  }
}

/**
 * 创建向量存储适配器
 */
export function createVectorStorage(
  dimension: number,
  config: Partial<Omit<VectorStorageConfig, 'type' | 'options'>> & Partial<VectorStorageConfig['options']> = {}
): VectorStorageAdapter {
  const { dimension: _, ...restOptions } = config;

  return new VectorStorageAdapter({
    type: 'vector',
    name: config.name || 'vector',
    enabled: config.enabled ?? true,
    priority: config.priority ?? 3,
    options: {
      dimension,
      m: config.m ?? 16,
      efConstruction: config.efConstruction ?? 200,
      efSearch: config.efSearch ?? 50,
      maxLevel: config.maxLevel ?? 16,
      metric: config.metric || 'cosine',
      persistencePath: config.persistencePath,
      autoSaveInterval: config.autoSaveInterval ?? 60000,
    },
    serialization: config.serialization,
    compression: config.compression,
    encryption: config.encryption,
  });
}
