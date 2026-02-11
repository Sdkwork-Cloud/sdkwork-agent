/**
 * HNSW (Hierarchical Navigable Small World) Vector Index
 * Industry-leading approximate nearest neighbor search algorithm
 * 
 * Reference:
 * - Paper: "Efficient and robust approximate nearest neighbor search using Hierarchical Navigable Small World graphs" (Malkov & Yashunin, 2018)
 * - Implementation based on hnswlib and faiss principles
 * 
 * Time Complexity: O(log n) vs O(n) for linear scan
 * Space Complexity: O(n * m) where m is average connections per layer
 */

import type { VectorStore } from '../../domain/memory.js';

// ============================================================================
// HNSW Configuration
// ============================================================================

export interface HNSWConfig {
  /** Maximum number of connections per layer (M) - default 16 */
  maxConnections: number;
  /** Size of dynamic candidate list (efConstruction) - default 200 */
  efConstruction: number;
  /** Size of dynamic candidate list for search (efSearch) - default 128 */
  efSearch: number;
  /** Maximum layer count - default 16 */
  maxLevel: number;
  /** Random seed for reproducibility */
  seed?: number;
}

export const DEFAULT_HNSW_CONFIG: HNSWConfig = {
  maxConnections: 16,
  efConstruction: 200,
  efSearch: 128,
  maxLevel: 16,
  seed: 42,
};

// ============================================================================
// HNSW Node
// ============================================================================

interface HNSWNode {
  id: string;
  embedding: number[];
  level: number;
  /** Connections per level: level -> [connected node ids] */
  connections: Map<number, string[]>;
  metadata?: Record<string, unknown>;
}

// ============================================================================
// Priority Queue for Search
// ============================================================================

class PriorityQueue<T> {
  private items: Array<{ item: T; priority: number }> = [];

  push(item: T, priority: number): void {
    this.items.push({ item, priority });
    this.items.sort((a, b) => b.priority - a.priority);
  }

  pop(): T | undefined {
    return this.items.pop()?.item;
  }

  peek(): T | undefined {
    return this.items[this.items.length - 1]?.item;
  }

  peekPriority(): number | undefined {
    return this.items[this.items.length - 1]?.priority;
  }

  size(): number {
    return this.items.length;
  }

  isEmpty(): boolean {
    return this.items.length === 0;
  }

  toArray(): Array<{ item: T; priority: number }> {
    return [...this.items];
  }
}

// ============================================================================
// HNSW Index Implementation
// ============================================================================

export class HNSWIndex implements VectorStore {
  private nodes = new Map<string, HNSWNode>();
  private config: HNSWConfig;
  private entryPoint: string | null = null;
  private dimension: number = 0;
  private random: () => number;

  constructor(config: Partial<HNSWConfig> = {}) {
    this.config = { ...DEFAULT_HNSW_CONFIG, ...config };
    this.random = this.createRandom(this.config.seed);
  }

  // ============================================================================
  // Random Number Generator (Mulberry32)
  // ============================================================================

  private createRandom(seed?: number): () => number {
    if (seed === undefined) {
      return () => Math.random();
    }
    
    let t = seed;
    return () => {
      t += 0x6D2B79F5;
      let r = Math.imul(t ^ (t >>> 15), t | 1);
      r ^= r + Math.imul(r ^ (r >>> 7), r | 61);
      return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
    };
  }

  // ============================================================================
  // Vector Store Interface
  // ============================================================================

  async add(id: string, embedding: number[], metadata?: Record<string, unknown>): Promise<void> {
    if (this.dimension === 0) {
      this.dimension = embedding.length;
    } else if (embedding.length !== this.dimension) {
      throw new Error(`Embedding dimension mismatch: expected ${this.dimension}, got ${embedding.length}`);
    }

    const level = this.randomLevel();
    const node: HNSWNode = {
      id,
      embedding,
      level,
      connections: new Map(),
      metadata,
    };

    // Initialize connections for each level
    for (let i = 0; i <= level; i++) {
      node.connections.set(i, []);
    }

    // Insert into graph
    if (this.entryPoint === null) {
      this.entryPoint = id;
    } else {
      this.insertNode(node);
    }

    this.nodes.set(id, node);

    // Update entry point if new node has higher level
    const entryNode = this.entryPoint ? this.nodes.get(this.entryPoint) : undefined;
    if (entryNode && level > entryNode.level) {
      this.entryPoint = id;
    }
  }

  async search(query: number[], limit: number): Promise<Array<{ id: string; score: number }>> {
    if (this.entryPoint === null || this.nodes.size === 0) {
      return [];
    }

    const efSearch = Math.max(this.config.efSearch, limit);
    const results = this.knnSearch(query, limit, efSearch);
    
    return results.map(({ id, score }) => ({ id, score }));
  }

  async delete(id: string): Promise<void> {
    const node = this.nodes.get(id);
    if (!node) return;

    // Remove connections from other nodes
    for (const [level, connections] of node.connections) {
      for (const connectedId of connections) {
        const connectedNode = this.nodes.get(connectedId);
        if (connectedNode) {
          const connectedConns = connectedNode.connections.get(level);
          if (connectedConns) {
            const index = connectedConns.indexOf(id);
            if (index !== -1) {
              connectedConns.splice(index, 1);
            }
          }
        }
      }
    }

    // Remove node
    this.nodes.delete(id);

    // Update entry point if needed
    if (this.entryPoint === id) {
      this.entryPoint = this.findNewEntryPoint();
    }
  }

  async clear(): Promise<void> {
    this.nodes.clear();
    this.entryPoint = null;
    this.dimension = 0;
  }

  // ============================================================================
  // HNSW Core Algorithms
  // ============================================================================

  /**
   * Generate random level using exponential distribution
   * P(level = l) = exp(-l / mL) * (1 - exp(-1 / mL))
   * where mL = 1 / ln(M)
   * 
   * Algorithm: increment level while random() < exp(-1 / mL)
   * This creates an exponential distribution where P(level >= l) = exp(-l / mL)
   */
  private randomLevel(): number {
    const mL = 1 / Math.log(this.config.maxConnections);
    const levelProbability = Math.exp(-1 / mL);
    let level = 0;
    while (this.random() < levelProbability && level < this.config.maxLevel) {
      level++;
    }
    return level;
  }

  /**
   * Insert node into HNSW graph
   */
  private insertNode(newNode: HNSWNode): void {
    if (!this.entryPoint) return;

    const entryNode = this.nodes.get(this.entryPoint)!;
    let currObj = entryNode;
    let currDist = this.cosineSimilarity(newNode.embedding, entryNode.embedding);

    // Search from top level down to level 1
    for (let level = entryNode.level; level > newNode.level; level--) {
      let changed = true;
      while (changed) {
        changed = false;
        const connections = currObj.connections.get(level) || [];
        for (const neighborId of connections) {
          const neighbor = this.nodes.get(neighborId);
          if (neighbor) {
            const dist = this.cosineSimilarity(newNode.embedding, neighbor.embedding);
            if (dist > currDist) {
              currDist = dist;
              currObj = neighbor;
              changed = true;
            }
          }
        }
      }
    }

    // For levels 0 to newNode.level, find neighbors and connect
    for (let level = Math.min(newNode.level, entryNode.level); level >= 0; level--) {
      const neighbors = this.searchLayer(newNode.embedding, currObj, level, this.config.efConstruction);
      const selectedNeighbors = this.selectNeighbors(neighbors, this.config.maxConnections);

      // Connect new node to neighbors
      for (const { id: neighborId } of selectedNeighbors) {
        this.connectNodes(newNode.id, neighborId, level);
      }
    }
  }

  /**
   * Search layer using greedy approach
   */
  private searchLayer(
    query: number[],
    entryPoint: HNSWNode,
    level: number,
    ef: number
  ): Array<{ id: string; score: number }> {
    const visited = new Set<string>([entryPoint.id]);
    const candidates = new PriorityQueue<string>();
    const results = new PriorityQueue<string>();

    const entryDist = this.cosineSimilarity(query, entryPoint.embedding);
    candidates.push(entryPoint.id, entryDist);
    results.push(entryPoint.id, entryDist);

    while (!candidates.isEmpty()) {
      const currId = candidates.pop();
      if (!currId) break;

      const currNode = this.nodes.get(currId);
      if (!currNode) continue;

      const currDist = this.cosineSimilarity(query, currNode.embedding);
      const worstResultDist = results.peekPriority() ?? -Infinity;

      if (currDist < worstResultDist && results.size() >= ef) {
        break;
      }

      const connections = currNode.connections.get(level) || [];
      for (const neighborId of connections) {
        if (!visited.has(neighborId)) {
          visited.add(neighborId);
          const neighbor = this.nodes.get(neighborId);
          if (neighbor) {
            const dist = this.cosineSimilarity(query, neighbor.embedding);
            const worstResult = results.peekPriority() ?? -Infinity;

            if (dist > worstResult || results.size() < ef) {
              candidates.push(neighborId, dist);
              results.push(neighborId, dist);

              if (results.size() > ef) {
                results.pop();
              }
            }
          }
        }
      }
    }

    return results.toArray().map(({ item, priority }) => ({ id: item, score: priority }));
  }

  /**
   * Select best neighbors using heuristic
   */
  private selectNeighbors(
    candidates: Array<{ id: string; score: number }>,
    maxConnections: number
  ): Array<{ id: string; score: number }> {
    // Simple strategy: select top-k by score
    // Advanced strategy: use heuristic to maintain graph connectivity
    return candidates
      .sort((a, b) => b.score - a.score)
      .slice(0, maxConnections);
  }

  /**
   * Connect two nodes bidirectionally
   */
  private connectNodes(id1: string, id2: string, level: number): void {
    const node1 = this.nodes.get(id1);
    const node2 = this.nodes.get(id2);

    if (!node1 || !node2) return;

    // Add connection from node1 to node2
    let conns1 = node1.connections.get(level);
    if (!conns1) {
      conns1 = [];
      node1.connections.set(level, conns1);
    }
    if (!conns1.includes(id2)) {
      conns1.push(id2);
    }

    // Add connection from node2 to node1
    let conns2 = node2.connections.get(level);
    if (!conns2) {
      conns2 = [];
      node2.connections.set(level, conns2);
    }
    if (!conns2.includes(id1)) {
      conns2.push(id1);
    }

    // Prune connections if exceeding max
    this.pruneConnections(node1, level);
    this.pruneConnections(node2, level);
  }

  /**
   * Prune excess connections to maintain graph sparsity
   */
  private pruneConnections(node: HNSWNode, level: number): void {
    const conns = node.connections.get(level);
    if (!conns || conns.length <= this.config.maxConnections) return;

    // Keep only the best connections based on distance
    const connsWithDist = conns.map(id => {
      const neighbor = this.nodes.get(id);
      const dist = neighbor ? this.cosineSimilarity(node.embedding, neighbor.embedding) : -1;
      return { id, dist };
    });

    connsWithDist.sort((a, b) => b.dist - a.dist);
    const pruned = connsWithDist.slice(0, this.config.maxConnections).map(c => c.id);
    node.connections.set(level, pruned);
  }

  /**
   * K-NN Search with efSearch parameter
   */
  private knnSearch(
    query: number[],
    k: number,
    efSearch: number
  ): Array<{ id: string; score: number }> {
    if (!this.entryPoint) return [];

    const entryNode = this.nodes.get(this.entryPoint)!;
    let currObj = entryNode;
    let currDist = this.cosineSimilarity(query, entryNode.embedding);

    // Search from top level down to level 1
    for (let level = entryNode.level; level > 0; level--) {
      let changed = true;
      while (changed) {
        changed = false;
        const connections = currObj.connections.get(level) || [];
        for (const neighborId of connections) {
          const neighbor = this.nodes.get(neighborId);
          if (neighbor) {
            const dist = this.cosineSimilarity(query, neighbor.embedding);
            if (dist > currDist) {
              currDist = dist;
              currObj = neighbor;
              changed = true;
            }
          }
        }
      }
    }

    // Search at level 0 with efSearch
    const results = this.searchLayer(query, currObj, 0, efSearch);
    
    return results.slice(0, k);
  }

  /**
   * Find new entry point after deletion
   */
  private findNewEntryPoint(): string | null {
    let maxLevel = -1;
    let newEntry: string | null = null;

    for (const [id, node] of this.nodes) {
      if (node.level > maxLevel) {
        maxLevel = node.level;
        newEntry = id;
      }
    }

    return newEntry;
  }

  // ============================================================================
  // Utility Methods
  // ============================================================================

  /**
   * Cosine similarity between two vectors
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

    if (normA === 0 || normB === 0) {
      return 0;
    }

    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  /**
   * Get index statistics
   */
  getStats(): {
    nodeCount: number;
    dimension: number;
    avgConnections: number;
    maxLevel: number;
  } {
    let totalConnections = 0;
    let maxLevel = 0;

    for (const node of this.nodes.values()) {
      for (const conns of node.connections.values()) {
        totalConnections += conns.length;
      }
      maxLevel = Math.max(maxLevel, node.level);
    }

    return {
      nodeCount: this.nodes.size,
      dimension: this.dimension,
      avgConnections: this.nodes.size > 0 ? totalConnections / this.nodes.size : 0,
      maxLevel,
    };
  }
}

// ============================================================================
// Factory Function
// ============================================================================

export function createHNSWIndex(config?: Partial<HNSWConfig>): HNSWIndex {
  return new HNSWIndex(config);
}
