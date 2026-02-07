/**
 * HNSW (Hierarchical Navigable Small World) 算法实现
 * 
 * 一种基于图的高性能近似最近邻搜索算法
 * 时间复杂度: O(log n) 搜索，O(n log n) 构建
 * 空间复杂度: O(n * m) 其中 m 是每层平均连接数
 * 
 * 参考论文: "Efficient and robust approximate nearest neighbor search using Hierarchical Navigable Small World graphs"
 * https://arxiv.org/abs/1603.09320
 */

export interface HNSWConfig {
  /** 向量维度 */
  dimension: number;
  /** 最大连接数 (通常 5-48) */
  m: number;
  /** 构建时考虑的最近邻数 (通常 100-400) */
  efConstruction: number;
  /** 搜索时考虑的最近邻数 */
  efSearch: number;
  /** 距离度量方式 */
  metric: 'cosine' | 'euclidean' | 'dot';
  /** 随机种子 */
  seed?: number;
}

export interface HNSWNode {
  id: string;
  vector: number[];
  /** 每层的前向连接 */
  connections: Map<number, string[]>;
  /** 节点层级 */
  level: number;
  /** 元数据 */
  metadata?: Record<string, unknown>;
}

export interface HNSWSearchResult {
  id: string;
  distance: number;
  vector?: number[];
  metadata?: Record<string, unknown>;
}

import { PriorityQueue } from '../utils/priority-queue';

/**
 * 最大优先队列（用于维护最近邻）- 基于统一 PriorityQueue 实现
 */
class MaxPriorityQueue<T> {
  private queue: PriorityQueue<T>;

  constructor() {
    // 使用负优先级实现最大堆
    this.queue = new PriorityQueue<T>();
  }

  push(item: T, priority: number): void {
    // 使用负优先级实现最大堆效果
    this.queue.enqueue(item, -priority);
  }

  pop(): T | undefined {
    return this.queue.dequeue();
  }

  peek(): T | undefined {
    return this.queue.peek();
  }

  peekPriority(): number | undefined {
    const p = this.queue.peekPriority();
    return p !== undefined ? -p : undefined;
  }

  size(): number {
    return this.queue.size;
  }

  isEmpty(): boolean {
    return this.queue.isEmpty();
  }

  toArray(): Array<{ item: T; priority: number }> {
    // 转换为数组并恢复原始优先级
    const result: Array<{ item: T; priority: number }> = [];
    const temp = new PriorityQueue<T>();
    
    while (!this.queue.isEmpty()) {
      const item = this.queue.dequeue();
      if (item !== undefined) {
        const priority = -this.queue.peekPriority()!;
        result.push({ item, priority });
        temp.enqueue(item, -priority);
      }
    }
    
    // 恢复队列
    this.queue = temp;
    return result.sort((a, b) => b.priority - a.priority);
  }
}

/**
 * 最小优先队列 - 基于统一 PriorityQueue 实现
 */
class MinPriorityQueue<T> {
  private queue: PriorityQueue<T>;

  constructor() {
    this.queue = new PriorityQueue<T>();
  }

  push(item: T, priority: number): void {
    this.queue.enqueue(item, priority);
  }

  pop(): T | undefined {
    return this.queue.dequeue();
  }

  peek(): T | undefined {
    return this.queue.peek();
  }

  size(): number {
    return this.queue.size;
  }

  isEmpty(): boolean {
    return this.queue.isEmpty();
  }
}

/**
 * HNSW 索引实现
 */
export class HNSWIndex {
  private config: HNSWConfig;
  private nodes: Map<string, HNSWNode> = new Map();
  private entryPoint: string | null = null;
  private maxLevel = 0;
  private random: () => number;
  private levelMult: number;

  constructor(config: HNSWConfig) {
    this.config = {
      ...config,
      seed: config.seed ?? Date.now(),
    };
    
    // 计算层级乘数
    this.levelMult = 1 / Math.log(this.config.m);
    
    // 初始化随机数生成器
    this.random = this.createRandomGenerator(this.config.seed!);
  }

  /**
   * 创建确定性随机数生成器
   */
  private createRandomGenerator(seed: number): () => number {
    let s = seed;
    return () => {
      s = Math.sin(s * 12.9898 + 78.233) * 43758.5453;
      return s - Math.floor(s);
    };
  }

  /**
   * 计算向量距离
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
   * 随机生成节点层级
   */
  private randomLevel(): number {
    let level = 0;
    while (this.random() < Math.exp(-1 / this.levelMult) && level < 16) {
      level++;
    }
    return level;
  }

  /**
   * 搜索最近邻（贪心算法）
   */
  private searchLevel(
    query: number[],
    entryPoint: string,
    level: number,
    ef: number
  ): Array<{ id: string; distance: number }> {
    const visited = new Set<string>();
    const candidates = new MinPriorityQueue<{ id: string; distance: number }>();
    const results = new MaxPriorityQueue<{ id: string; distance: number }>();

    const entryNode = this.nodes.get(entryPoint);
    if (!entryNode) return [];
    const entryDist = this.distance(query, entryNode.vector);

    candidates.push({ id: entryPoint, distance: entryDist }, entryDist);
    results.push({ id: entryPoint, distance: entryDist }, entryDist);
    visited.add(entryPoint);

    while (!candidates.isEmpty()) {
      const current = candidates.pop()!;
      
      // 如果当前最差的距离比候选者更好，停止搜索
      if (results.size() >= ef && results.peekPriority()! < current.distance) {
        break;
      }

      const node = this.nodes.get(current.id)!;
      const connections = node.connections.get(level) || [];

      for (const neighborId of connections) {
        if (visited.has(neighborId)) continue;
        visited.add(neighborId);

        const neighbor = this.nodes.get(neighborId);
        if (!neighbor) continue;
        const dist = this.distance(query, neighbor.vector);

        if (results.size() < ef || dist < results.peekPriority()!) {
          candidates.push({ id: neighborId, distance: dist }, dist);
          results.push({ id: neighborId, distance: dist }, dist);

          if (results.size() > ef) {
            results.pop();
          }
        }
      }
    }

    return results.toArray().map(item => item.item);
  }

  /**
   * 启发式选择邻居（考虑多样性）
   */
  private selectNeighbors(
    _query: number[],
    candidates: Array<{ id: string; distance: number }>,
    m: number
  ): string[] {
    if (candidates.length <= m) {
      return candidates.map(c => c.id);
    }

    const selected: string[] = [];
    const selectedSet = new Set<string>();

    for (const candidate of candidates) {
      if (selected.length >= m) break;

      let shouldAdd = true;
      const candidateNode = this.nodes.get(candidate.id)!;

      // 检查与已选节点的距离
      for (const selectedId of selected) {
        const selectedNode = this.nodes.get(selectedId)!;
        const dist = this.distance(candidateNode.vector, selectedNode.vector);
        
        // 如果距离太近，跳过（保持多样性）
        if (dist < candidate.distance * 0.5) {
          shouldAdd = false;
          break;
        }
      }

      if (shouldAdd) {
        selected.push(candidate.id);
        selectedSet.add(candidate.id);
      }
    }

    // 如果启发式选择不够，补充最近的
    if (selected.length < m) {
      for (const candidate of candidates) {
        if (selected.length >= m) break;
        if (!selectedSet.has(candidate.id)) {
          selected.push(candidate.id);
        }
      }
    }

    return selected;
  }

  /**
   * 添加节点到索引
   */
  add(id: string, vector: number[], metadata?: Record<string, unknown>): void {
    if (vector.length !== this.config.dimension) {
      throw new Error(`Vector dimension mismatch: expected ${this.config.dimension}, got ${vector.length}`);
    }

    const level = this.randomLevel();
    const node: HNSWNode = {
      id,
      vector: [...vector],
      connections: new Map(),
      level,
      metadata,
    };

    // 初始化每层的连接
    for (let i = 0; i <= level; i++) {
      node.connections.set(i, []);
    }

    this.nodes.set(id, node);

    // 如果是第一个节点
    if (!this.entryPoint) {
      this.entryPoint = id;
      this.maxLevel = level;
      return;
    }

    // 从最高层开始搜索
    let currentEntry = this.entryPoint;
    let currentDist = this.distance(vector, this.nodes.get(currentEntry)!.vector);

    // 找到合适的入口层
    for (let i = this.maxLevel; i > level; i--) {
      const entryNode = this.nodes.get(currentEntry)!;
      const connections = entryNode.connections.get(i) || [];
      
      let changed = true;
      while (changed) {
        changed = false;
        for (const neighborId of connections) {
          const neighbor = this.nodes.get(neighborId)!;
          const dist = this.distance(vector, neighbor.vector);
          if (dist < currentDist) {
            currentDist = dist;
            currentEntry = neighborId;
            changed = true;
          }
        }
      }
    }

    // 从当前层向下构建连接
    for (let i = Math.min(level, this.maxLevel); i >= 0; i--) {
      const neighbors = this.searchLevel(vector, currentEntry, i, this.config.efConstruction);
      const selectedNeighbors = this.selectNeighbors(vector, neighbors, this.config.m);

      node.connections.set(i, selectedNeighbors);

      // 双向连接
      for (const neighborId of selectedNeighbors) {
        const neighbor = this.nodes.get(neighborId)!;
        let neighborConnections = neighbor.connections.get(i) || [];
        
        if (!neighborConnections.includes(id)) {
          neighborConnections.push(id);
          
          // 如果连接数超过限制，进行剪枝
          if (neighborConnections.length > this.config.m * 2) {
            const neighborVectors = neighborConnections.map(nid => ({
              id: nid,
              vector: this.nodes.get(nid)!.vector,
            }));
            
            const distances = neighborVectors.map(nv => ({
              id: nv.id,
              distance: this.distance(neighbor.vector, nv.vector),
            }));
            
            distances.sort((a, b) => a.distance - b.distance);
            neighborConnections = distances.slice(0, this.config.m * 2).map(d => d.id);
          }
          
          neighbor.connections.set(i, neighborConnections);
        }
      }

      // 更新入口点
      if (neighbors.length > 0) {
        currentEntry = neighbors[0].id;
      }
    }

    // 更新全局入口点和最大层级
    if (level > this.maxLevel) {
      this.maxLevel = level;
      this.entryPoint = id;
    }
  }

  /**
   * 批量添加节点 - 优化大数据量插入性能
   * 
   * 相比逐个插入，批量插入可以：
   * 1. 减少重复的距离计算
   * 2. 优化内存访问模式
   * 3. 支持并行处理（未来扩展）
   * 
   * @param items - 要插入的节点数组 {id, vector, metadata?}
   * @param options - 批量插入选项
   */
  addBatch(
    items: Array<{ id: string; vector: number[]; metadata?: Record<string, unknown> }>,
    options: {
      /** 每批处理的节点数，默认 1000 */
      batchSize?: number;
      /** 是否显示进度，默认 false */
      showProgress?: boolean;
    } = {}
  ): void {
    const { batchSize = 1000, showProgress = false } = options;
    const total = items.length;
    let processed = 0;

    // 分批处理，避免内存峰值
    for (let i = 0; i < total; i += batchSize) {
      const batch = items.slice(i, Math.min(i + batchSize, total));
      
      // 预分配层级 - 减少随机数生成开销
      const levels = batch.map(() => this.randomLevel());
      const maxBatchLevel = Math.max(...levels);
      
      // 如果批次中有更高层级，更新全局最大层级
      if (maxBatchLevel > this.maxLevel) {
        this.maxLevel = maxBatchLevel;
      }

      // 批量插入节点（第一阶段：创建节点）
      const nodes: HNSWNode[] = batch.map((item, idx) => ({
        id: item.id,
        vector: [...item.vector],
        connections: new Map(),
        level: levels[idx],
        metadata: item.metadata,
      }));

      // 建立节点映射
      for (const node of nodes) {
        for (let l = 0; l <= node.level; l++) {
          node.connections.set(l, []);
        }
        this.nodes.set(node.id, node);

        // 更新入口点（选择层级最高的节点）
        if (!this.entryPoint || node.level > this.nodes.get(this.entryPoint)!.level) {
          this.entryPoint = node.id;
        }
      }

      // 批量构建连接（第二阶段：建立连接）
      for (const node of nodes) {
        this._buildConnectionsForNode(node);
      }

      processed += batch.length;
      
      if (showProgress && processed % batchSize === 0) {
        console.log(`HNSW Batch Insert: ${processed}/${total} (${((processed/total)*100).toFixed(1)}%)`);
      }
    }
  }

  /**
   * 为单个节点构建连接（内部方法）
   */
  private _buildConnectionsForNode(node: HNSWNode): void {
    if (!this.entryPoint || this.entryPoint === node.id) {
      return;
    }

    // 从最高层开始搜索
    let currentEntry = this.entryPoint;
    let currentDist = this.distance(node.vector, this.nodes.get(currentEntry)!.vector);

    // 找到合适的入口层
    for (let i = this.maxLevel; i > node.level; i--) {
      const entryNode = this.nodes.get(currentEntry)!;
      const connections = entryNode.connections.get(i) || [];
      
      let changed = true;
      while (changed) {
        changed = false;
        for (const neighborId of connections) {
          const neighbor = this.nodes.get(neighborId)!;
          const dist = this.distance(node.vector, neighbor.vector);
          if (dist < currentDist) {
            currentDist = dist;
            currentEntry = neighborId;
            changed = true;
          }
        }
      }
    }

    // 从当前层向下构建连接
    for (let i = Math.min(node.level, this.maxLevel); i >= 0; i--) {
      const neighbors = this.searchLevel(node.vector, currentEntry, i, this.config.efConstruction);
      const selectedNeighbors = this.selectNeighbors(node.vector, neighbors, this.config.m);

      node.connections.set(i, selectedNeighbors);

      // 双向连接
      for (const neighborId of selectedNeighbors) {
        const neighbor = this.nodes.get(neighborId)!;
        let neighborConnections = neighbor.connections.get(i) || [];
        
        if (!neighborConnections.includes(node.id)) {
          neighborConnections.push(node.id);
          
          // 如果连接数超过限制，进行剪枝
          if (neighborConnections.length > this.config.m * 2) {
            const distances = neighborConnections.map(nid => ({
              id: nid,
              distance: this.distance(neighbor.vector, this.nodes.get(nid)!.vector),
            }));
            
            distances.sort((a, b) => a.distance - b.distance);
            neighborConnections = distances.slice(0, this.config.m * 2).map(d => d.id);
          }
          
          neighbor.connections.set(i, neighborConnections);
        }
      }

      // 更新入口点
      if (neighbors.length > 0) {
        currentEntry = neighbors[0].id;
      }
    }
  }

  /**
   * 搜索 K 近邻
   */
  search(query: number[], k: number): HNSWSearchResult[] {
    if (!this.entryPoint) {
      return [];
    }

    if (query.length !== this.config.dimension) {
      throw new Error(`Query dimension mismatch: expected ${this.config.dimension}, got ${query.length}`);
    }

    // 从最高层开始贪心搜索
    let currentEntry = this.entryPoint;
    let currentDist = this.distance(query, this.nodes.get(currentEntry)!.vector);

    for (let i = this.maxLevel; i > 0; i--) {
      const entryNode = this.nodes.get(currentEntry)!;
      const connections = entryNode.connections.get(i) || [];
      
      let changed = true;
      while (changed) {
        changed = false;
        for (const neighborId of connections) {
          const neighbor = this.nodes.get(neighborId)!;
          const dist = this.distance(query, neighbor.vector);
          if (dist < currentDist) {
            currentDist = dist;
            currentEntry = neighborId;
            changed = true;
          }
        }
      }
    }

    // 在最底层进行精细搜索
    const results = this.searchLevel(query, currentEntry, 0, Math.max(k, this.config.efSearch));

    return results.slice(0, k).map(r => {
      const node = this.nodes.get(r.id)!;
      return {
        id: r.id,
        distance: r.distance,
        vector: node.vector,
        metadata: node.metadata,
      };
    });
  }

  /**
   * 删除节点
   */
  remove(id: string): boolean {
    const node = this.nodes.get(id);
    if (!node) return false;

    // 从所有邻居的连接中移除
    for (let i = 0; i <= node.level; i++) {
      const connections = node.connections.get(i) || [];
      for (const neighborId of connections) {
        const neighbor = this.nodes.get(neighborId);
        if (neighbor) {
          const neighborConnections = neighbor.connections.get(i) || [];
          const index = neighborConnections.indexOf(id);
          if (index > -1) {
            neighborConnections.splice(index, 1);
            neighbor.connections.set(i, neighborConnections);
          }
        }
      }
    }

    // 如果删除的是入口点，需要更新
    if (this.entryPoint === id) {
      // 找到层级最高的其他节点
      let newEntry: string | null = null;
      let newMaxLevel = -1;
      
      for (const [nodeId, node] of this.nodes) {
        if (nodeId !== id && node.level > newMaxLevel) {
          newMaxLevel = node.level;
          newEntry = nodeId;
        }
      }
      
      this.entryPoint = newEntry;
      this.maxLevel = newMaxLevel;
    }

    this.nodes.delete(id);
    return true;
  }

  /**
   * 获取节点数量
   */
  size(): number {
    return this.nodes.size;
  }

  /**
   * 清空索引
   */
  clear(): void {
    this.nodes.clear();
    this.entryPoint = null;
    this.maxLevel = 0;
  }

  /**
   * 获取统计信息
   */
  getStats(): {
    nodeCount: number;
    maxLevel: number;
    entryPoint: string | null;
    avgConnections: number;
  } {
    let totalConnections = 0;
    for (const node of this.nodes.values()) {
      for (let i = 0; i <= node.level; i++) {
        totalConnections += node.connections.get(i)?.length || 0;
      }
    }

    return {
      nodeCount: this.nodes.size,
      maxLevel: this.maxLevel,
      entryPoint: this.entryPoint,
      avgConnections: this.nodes.size > 0 ? totalConnections / this.nodes.size : 0,
    };
  }
}

/**
 * 创建默认配置的 HNSW 索引
 */
export function createHNSWIndex(dimension: number): HNSWIndex {
  return new HNSWIndex({
    dimension,
    m: 16,
    efConstruction: 200,
    efSearch: 50,
    metric: 'cosine',
  });
}
