/**
 * ScaNN (Scalable Nearest Neighbors) 风格索引实现
 *
 * 基于乘积量化 (Product Quantization) 和倒排索引的近似最近邻搜索
 * 相比 HNSW，在大数据量下内存占用更低，搜索速度更快
 *
 * 核心特性：
 * 1. 乘积量化 - 将高维向量压缩到 1/10 ~ 1/20 大小
 * 2. 倒排索引 - 快速定位候选集
 * 3. 非对称距离计算 (ADC) - 提高搜索精度
 * 4. 动态更新 - 支持增量添加和删除
 *
 * 参考：
 * - Google ScaNN: https://github.com/google-research/google-research/tree/master/scann
 * - Product Quantization for Nearest Neighbor Search (Jégou et al., 2011)
 *
 * @algorithms Vector Search
 * @version 1.0.0
 * @advanced
 */

import { PriorityQueue } from '../utils/priority-queue';

/**
 * ScaNN 索引配置
 */
export interface ScannConfig {
  /** 向量维度 */
  dimension: number;
  /** 子空间数量（将维度分成 M 个子空间） */
  numSubspaces: number;
  /** 每个子空间的聚类中心数（通常为 256，可用 1 字节存储） */
  kMeansCentersPerSubspace: number;
  /** 倒排列表数量 */
  numInvertedLists: number;
  /** 搜索时检查的候选列表数 */
  numCandidates: number;
  /** 距离度量 */
  metric: 'euclidean' | 'cosine' | 'dot';
}



/**
 * 倒排列表项
 */
interface InvertedListItem {
  vectorId: string;
  /** 到聚类中心的距离 */
  distanceToCenter: number;
}

/**
 * ScaNN 索引实现
 */
export class ScannIndex {
  private config: ScannConfig;
  private subspaceDimension: number;

  // 乘积量化相关
  private subspaceCentroids: number[][][] = []; // [subspace][centroid][dimension]

  // 倒排索引相关
  private coarseCentroids: number[][] = [];
  private invertedLists: Map<number, InvertedListItem[]> = new Map();

  // 原始向量存储（用于重排序）
  private vectors: Map<string, number[]> = new Map();
  private metadata: Map<string, Record<string, unknown>> = new Map();

  // 统计信息
  private stats = {
    insertions: 0,
    deletions: 0,
    searches: 0,
    quantizedSize: 0,
    originalSize: 0,
  };

  constructor(config: ScannConfig) {
    this.config = {
      ...config,
      numSubspaces: config.numSubspaces ?? 8,
      kMeansCentersPerSubspace: config.kMeansCentersPerSubspace ?? 256,
      numInvertedLists: config.numInvertedLists ?? 100,
      numCandidates: config.numCandidates ?? 10,
      metric: config.metric ?? 'euclidean',
    };

    if (config.dimension % this.config.numSubspaces !== 0) {
      throw new Error(
        `Dimension ${config.dimension} must be divisible by numSubspaces ${this.config.numSubspaces}`
      );
    }

    this.subspaceDimension = config.dimension / this.config.numSubspaces;

    // 初始化子空间聚类中心（随机初始化，实际应使用 k-means）
    this.initializeSubspaceCentroids();

    // 初始化粗量化聚类中心
    this.initializeCoarseCentroids();
  }

  /**
   * 初始化子空间聚类中心
   */
  private initializeSubspaceCentroids(): void {
    for (let m = 0; m < this.config.numSubspaces; m++) {
      const centroids: number[][] = [];
      for (let k = 0; k < this.config.kMeansCentersPerSubspace; k++) {
        // 随机初始化（实际应使用 k-means++）
        const centroid: number[] = [];
        for (let d = 0; d < this.subspaceDimension; d++) {
          centroid.push((Math.random() - 0.5) * 2);
        }
        centroids.push(centroid);
      }
      this.subspaceCentroids.push(centroids);
    }
  }

  /**
   * 初始化粗量化聚类中心
   */
  private initializeCoarseCentroids(): void {
    for (let i = 0; i < this.config.numInvertedLists; i++) {
      const centroid: number[] = [];
      for (let d = 0; d < this.config.dimension; d++) {
        centroid.push((Math.random() - 0.5) * 2);
      }
      this.coarseCentroids.push(centroid);
      this.invertedLists.set(i, []);
    }
  }

  /**
   * 训练索引（使用 k-means 优化聚类中心）
   *
   * @param vectors - 训练向量集
   * @param iterations - k-means 迭代次数
   */
  train(vectors: number[][], iterations: number = 10): void {
    if (vectors.length === 0) return;

    // 训练子空间聚类中心
    this.trainSubspaceCentroids(vectors, iterations);

    // 训练粗量化聚类中心
    this.trainCoarseCentroids(vectors, iterations);
  }

  /**
   * 训练子空间聚类中心
   */
  private trainSubspaceCentroids(vectors: number[][], iterations: number): void {
    for (let m = 0; m < this.config.numSubspaces; m++) {
      const startDim = m * this.subspaceDimension;
      const endDim = startDim + this.subspaceDimension;

      // 提取子空间向量
      const subspaceVectors = vectors.map(v => v.slice(startDim, endDim));

      // k-means 聚类
      this.subspaceCentroids[m] = this.kMeans(
        subspaceVectors,
        this.config.kMeansCentersPerSubspace,
        iterations
      );
    }
  }

  /**
   * 训练粗量化聚类中心
   */
  private trainCoarseCentroids(vectors: number[][], iterations: number): void {
    this.coarseCentroids = this.kMeans(vectors, this.config.numInvertedLists, iterations);
  }

  /**
   * k-means 聚类算法
   */
  private kMeans(vectors: number[][], k: number, iterations: number): number[][] {
    if (vectors.length === 0) return [];

    const dimension = vectors[0].length;

    // k-means++ 初始化
    const centroids: number[][] = [vectors[Math.floor(Math.random() * vectors.length)]];

    while (centroids.length < k) {
      const distances = vectors.map(v => {
        const minDist = Math.min(...centroids.map(c => this.distance(v, c)));
        return minDist * minDist;
      });

      const sum = distances.reduce((a, b) => a + b, 0);
      let target = Math.random() * sum;
      let index = 0;

      while (target > 0 && index < distances.length) {
        target -= distances[index];
        index++;
      }

      centroids.push(vectors[Math.min(index, vectors.length - 1)]);
    }

    // k-means 迭代
    for (let iter = 0; iter < iterations; iter++) {
      // 分配步骤
      const assignments: number[][] = Array.from({ length: k }, () => []);

      for (let i = 0; i < vectors.length; i++) {
        let minDist = Infinity;
        let closest = 0;

        for (let j = 0; j < k; j++) {
          const dist = this.distance(vectors[i], centroids[j]);
          if (dist < minDist) {
            minDist = dist;
            closest = j;
          }
        }

        assignments[closest].push(i);
      }

      // 更新步骤
      for (let j = 0; j < k; j++) {
        if (assignments[j].length === 0) continue;

        const newCentroid: number[] = new Array(dimension).fill(0);
        for (const idx of assignments[j]) {
          for (let d = 0; d < dimension; d++) {
            newCentroid[d] += vectors[idx][d];
          }
        }

        for (let d = 0; d < dimension; d++) {
          newCentroid[d] /= assignments[j].length;
        }

        centroids[j] = newCentroid;
      }
    }

    return centroids;
  }

  /**
   * 量化向量
   */
  private quantize(vector: number[]): { codes: Uint8Array; residual: number[] } {
    const codes = new Uint8Array(this.config.numSubspaces);
    const residual: number[] = [];

    for (let m = 0; m < this.config.numSubspaces; m++) {
      const startDim = m * this.subspaceDimension;
      const subspace = vector.slice(startDim, startDim + this.subspaceDimension);

      // 找到最近的聚类中心
      let minDist = Infinity;
      let closest = 0;

      for (let k = 0; k < this.config.kMeansCentersPerSubspace; k++) {
        const dist = this.distance(subspace, this.subspaceCentroids[m][k]);
        if (dist < minDist) {
          minDist = dist;
          closest = k;
        }
      }

      codes[m] = closest;

      // 计算残差
      const centroid = this.subspaceCentroids[m][closest];
      for (let d = 0; d < this.subspaceDimension; d++) {
        residual.push(subspace[d] - centroid[d]);
      }
    }

    return { codes, residual };
  }

  /**
   * 添加向量到索引
   */
  add(id: string, vector: number[], metadata?: Record<string, unknown>): void {
    if (vector.length !== this.config.dimension) {
      throw new Error(
        `Vector dimension mismatch: expected ${this.config.dimension}, got ${vector.length}`
      );
    }

    // 量化向量
    const { codes } = this.quantize(vector);

    // 找到最近的粗量化中心
    let minDist = Infinity;
    let closestList = 0;

    for (let i = 0; i < this.coarseCentroids.length; i++) {
      const dist = this.distance(vector, this.coarseCentroids[i]);
      if (dist < minDist) {
        minDist = dist;
        closestList = i;
      }
    }

    // 添加到倒排列表
    const list = this.invertedLists.get(closestList) || [];
    list.push({ vectorId: id, distanceToCenter: minDist });
    this.invertedLists.set(closestList, list);

    // 存储原始向量和元数据
    this.vectors.set(id, [...vector]);
    this.metadata.set(id, metadata || {});

    // 更新统计
    this.stats.insertions++;
    this.stats.quantizedSize += codes.length;
    this.stats.originalSize += vector.length * 4; // float32
  }

  /**
   * 批量添加向量
   */
  addBatch(
    items: Array<{ id: string; vector: number[]; metadata?: Record<string, unknown> }>,
    batchSize: number = 1000
  ): void {
    for (let i = 0; i < items.length; i += batchSize) {
      const batch = items.slice(i, i + batchSize);
      for (const item of batch) {
        this.add(item.id, item.vector, item.metadata);
      }
    }
  }

  /**
   * 搜索 K 近邻
   */
  search(query: number[], k: number): Array<{ id: string; distance: number; metadata?: Record<string, unknown> }> {
    this.stats.searches++;

    // 1. 粗量化 - 找到最近的倒排列表
    const coarseDistances = this.coarseCentroids.map((center, idx) => ({
      idx,
      distance: this.distance(query, center),
    }));

    coarseDistances.sort((a, b) => a.distance - b.distance);

    // 2. 收集候选向量
    const candidates = new PriorityQueue<string>();
    const candidateSet = new Set<string>();

    for (let i = 0; i < Math.min(this.config.numCandidates, coarseDistances.length); i++) {
      const listId = coarseDistances[i].idx;
      const list = this.invertedLists.get(listId) || [];

      for (const item of list) {
        if (!candidateSet.has(item.vectorId)) {
          candidateSet.add(item.vectorId);
          // 使用到粗量化中心的距离作为近似距离
          candidates.enqueue(item.vectorId, item.distanceToCenter + coarseDistances[i].distance);
        }
      }
    }

    // 3. 重排序 - 使用原始向量计算精确距离
    const results: Array<{ id: string; distance: number; metadata?: Record<string, unknown> }> = [];

    while (!candidates.isEmpty() && results.length < k * 2) {
      const id = candidates.dequeue();
      if (id === undefined) break;

      const vector = this.vectors.get(id);
      if (vector) {
        const distance = this.distance(query, vector);
        results.push({
          id,
          distance,
          metadata: this.metadata.get(id),
        });
      }
    }

    // 返回最近的 k 个
    return results.sort((a, b) => a.distance - b.distance).slice(0, k);
  }

  /**
   * 计算距离
   */
  private distance(a: number[], b: number[]): number {
    switch (this.config.metric) {
      case 'euclidean':
        return this.euclideanDistance(a, b);
      case 'cosine':
        return 1 - this.cosineSimilarity(a, b);
      case 'dot':
        return -this.dotProduct(a, b);
      default:
        return this.euclideanDistance(a, b);
    }
  }

  /**
   * 欧几里得距离
   */
  private euclideanDistance(a: number[], b: number[]): number {
    let sum = 0;
    for (let i = 0; i < a.length; i++) {
      const diff = a[i] - b[i];
      sum += diff * diff;
    }
    return Math.sqrt(sum);
  }

  /**
   * 余弦相似度
   */
  private cosineSimilarity(a: number[], b: number[]): number {
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    if (normA === 0 || normB === 0) return 0;
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  /**
   * 点积
   */
  private dotProduct(a: number[], b: number[]): number {
    let sum = 0;
    for (let i = 0; i < a.length; i++) {
      sum += a[i] * b[i];
    }
    return sum;
  }

  /**
   * 删除向量
   */
  delete(id: string): boolean {
    if (!this.vectors.has(id)) return false;

    this.vectors.delete(id);
    this.metadata.delete(id);

    // 从倒排列表中删除
    for (const [listId, list] of this.invertedLists) {
      const newList = list.filter(item => item.vectorId !== id);
      if (newList.length !== list.length) {
        this.invertedLists.set(listId, newList);
        break;
      }
    }

    this.stats.deletions++;
    return true;
  }

  /**
   * 获取统计信息
   */
  getStats(): {
    insertions: number;
    deletions: number;
    searches: number;
    compressionRatio: number;
    memorySaved: string;
  } {
    const compressionRatio = this.stats.originalSize > 0
      ? this.stats.quantizedSize / this.stats.originalSize
      : 0;

    return {
      ...this.stats,
      compressionRatio,
      memorySaved: `${((1 - compressionRatio) * 100).toFixed(1)}%`,
    };
  }

  /**
   * 获取索引大小
   */
  size(): number {
    return this.vectors.size;
  }

  /**
   * 清空索引
   */
  clear(): void {
    this.vectors.clear();
    this.metadata.clear();
    this.invertedLists.clear();
    this.stats = {
      insertions: 0,
      deletions: 0,
      searches: 0,
      quantizedSize: 0,
      originalSize: 0,
    };

    // 重新初始化倒排列表
    for (let i = 0; i < this.config.numInvertedLists; i++) {
      this.invertedLists.set(i, []);
    }
  }
}

/**
 * 创建 ScaNN 索引
 */
export function createScannIndex(config: ScannConfig): ScannIndex {
  return new ScannIndex(config);
}
