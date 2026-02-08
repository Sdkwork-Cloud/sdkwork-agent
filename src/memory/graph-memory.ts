/**
 * Graph Memory - 知识图谱记忆系统
 *
 * 核心特性：
 * 1. 实体-关系-实体三元组存储
 * 2. 多跳推理查询
 * 3. 关系推理与路径发现
 * 4. 与向量记忆的互补
 *
 * @module GraphMemory
 * @version 2.0.0
 * @reference GraphRAG: Graph-based Retrieval-Augmented Generation
 */

import { EventEmitter } from '../utils/event-emitter.js';
import { MemoryService, Logger } from '../skills/core/types.js';

/**
 * 知识节点类型
 */
export type NodeType = 'entity' | 'concept' | 'event' | 'document' | 'skill' | 'tool';

/**
 * 知识节点
 */
export interface KnowledgeNode {
  /** 唯一标识符 */
  id: string;

  /** 节点类型 */
  type: NodeType;

  /** 节点名称 */
  name: string;

  /** 节点描述 */
  description?: string;

  /** 节点属性 */
  properties: Record<string, unknown>;

  /** 创建时间 */
  createdAt: Date;

  /** 更新时间 */
  updatedAt: Date;

  /** 访问次数 */
  accessCount: number;

  /** 重要性分数 (0-1) */
  importance: number;
}

/**
 * 关系类型
 */
export type RelationType =
  | 'is_a'           // 是一个
  | 'part_of'        // 部分
  | 'has_property'   // 有属性
  | 'related_to'     // 相关
  | 'causes'         // 导致
  | 'depends_on'     // 依赖
  | 'uses'           // 使用
  | 'produces'       // 产生
  | 'located_in'     // 位于
  | 'occurred_at'    // 发生在
  | 'custom';        // 自定义

/**
 * 知识边（关系）
 */
export interface KnowledgeEdge {
  /** 唯一标识符 */
  id: string;

  /** 源节点ID */
  sourceId: string;

  /** 目标节点ID */
  targetId: string;

  /** 关系类型 */
  type: RelationType;

  /** 关系描述 */
  description?: string;

  /** 关系强度 (0-1) */
  strength: number;

  /** 关系属性 */
  properties: Record<string, unknown>;

  /** 创建时间 */
  createdAt: Date;

  /** 是否双向 */
  bidirectional: boolean;
}

/**
 * 三元组（事实）
 */
export interface Triple {
  subject: string;
  predicate: RelationType;
  object: string;
  confidence?: number;
}

/**
 * 查询选项
 */
export interface GraphQueryOptions {
  /** 最大深度 */
  maxDepth?: number;

  /** 最小关系强度 */
  minStrength?: number;

  /** 关系类型过滤 */
  relationTypes?: RelationType[];

  /** 节点类型过滤 */
  nodeTypes?: NodeType[];

  /** 最大结果数 */
  limit?: number;

  /** 排序方式 */
  sortBy?: 'relevance' | 'importance' | 'recency';
}

/**
 * 路径查询结果
 */
export interface PathResult {
  /** 路径节点 */
  nodes: KnowledgeNode[];

  /** 路径边 */
  edges: KnowledgeEdge[];

  /** 路径长度 */
  length: number;

  /** 路径得分 */
  score: number;
}

/**
 * 推理结果
 */
export interface InferenceResult {
  /** 推理出的关系 */
  inferredRelations: Triple[];

  /** 推理置信度 */
  confidence: number;

  /** 推理路径 */
  reasoningPath: PathResult[];
}

/**
 * Graph Memory 配置
 */
export interface GraphMemoryConfig {
  /** 最大节点数 */
  maxNodes?: number;

  /** 最大边数 */
  maxEdges?: number;

  /** 自动索引 */
  autoIndex?: boolean;

  /** 启用推理 */
  enableInference?: boolean;

  /** 启用持久化 */
  enablePersistence?: boolean;

  /** 持久化路径 */
  persistencePath?: string;
}

/**
 * Graph Memory 实现
 *
 * 提供知识图谱的存储、查询和推理能力
 */
export class GraphMemory extends EventEmitter implements MemoryService {
  private nodes = new Map<string, KnowledgeNode>();
  private edges = new Map<string, KnowledgeEdge>();
  private adjacencyList = new Map<string, Set<string>>(); // nodeId -> edgeIds
  private config: Required<GraphMemoryConfig>;

  constructor(
    _logger: Logger,
    config: GraphMemoryConfig = {}
  ) {
    super();
    this.config = {
      maxNodes: 100000,
      maxEdges: 500000,
      autoIndex: true,
      enableInference: true,
      enablePersistence: false,
      persistencePath: './graph-memory.json',
      ...config,
    };
  }

  // ============================================================================
  // 节点操作
  // ============================================================================

  /**
   * 添加节点
   */
  addNode(
    name: string,
    type: NodeType,
    properties: Record<string, unknown> = {},
    importance: number = 0.5
  ): KnowledgeNode {
    const id = this.generateId('node');
    const now = new Date();

    const node: KnowledgeNode = {
      id,
      type,
      name,
      properties,
      createdAt: now,
      updatedAt: now,
      accessCount: 0,
      importance,
    };

    this.nodes.set(id, node);
    this.adjacencyList.set(id, new Set());

    // 检查容量
    if (this.nodes.size > this.config.maxNodes) {
      this.evictLeastImportantNode();
    }

    this.emit('node:added', {
      type: 'node:added',
      timestamp: now,
      data: { node },
    });

    return node;
  }

  /**
   * 获取节点
   */
  getNode(id: string): KnowledgeNode | undefined {
    const node = this.nodes.get(id);
    if (node) {
      node.accessCount++;
      node.updatedAt = new Date();
    }
    return node;
  }

  /**
   * 查找节点（按名称）
   */
  findNodeByName(name: string, type?: NodeType): KnowledgeNode | undefined {
    for (const node of this.nodes.values()) {
      if (node.name === name && (!type || node.type === type)) {
        node.accessCount++;
        return node;
      }
    }
    return undefined;
  }

  /**
   * 搜索节点
   */
  searchNodes(query: string, options: GraphQueryOptions = {}): KnowledgeNode[] {
    const results: KnowledgeNode[] = [];
    const queryLower = query.toLowerCase();

    for (const node of this.nodes.values()) {
      // 类型过滤
      if (options.nodeTypes && !options.nodeTypes.includes(node.type)) {
        continue;
      }

      // 名称匹配
      if (node.name.toLowerCase().includes(queryLower)) {
        results.push(node);
        continue;
      }

      // 描述匹配
      if (node.description?.toLowerCase().includes(queryLower)) {
        results.push(node);
        continue;
      }

      // 属性匹配
      for (const value of Object.values(node.properties)) {
        if (String(value).toLowerCase().includes(queryLower)) {
          results.push(node);
          break;
        }
      }
    }

    // 排序
    this.sortResults(results, options.sortBy || 'relevance');

    // 限制数量
    if (options.limit) {
      return results.slice(0, options.limit);
    }

    return results;
  }

  /**
   * 更新节点
   */
  updateNode(
    id: string,
    updates: Partial<Omit<KnowledgeNode, 'id' | 'createdAt'>>
  ): KnowledgeNode | undefined {
    const node = this.nodes.get(id);
    if (!node) return undefined;

    Object.assign(node, updates, { updatedAt: new Date() });

    this.emit('node:updated', {
      type: 'node:updated',
      timestamp: new Date(),
      data: { node },
    });

    return node;
  }

  /**
   * 删除节点
   */
  removeNode(id: string): boolean {
    const node = this.nodes.get(id);
    if (!node) return false;

    // 删除相关边
    const edgeIds = this.adjacencyList.get(id);
    if (edgeIds) {
      for (const edgeId of edgeIds) {
        this.edges.delete(edgeId);
      }
    }

    // 删除节点
    this.nodes.delete(id);
    this.adjacencyList.delete(id);

    this.emit('node:removed', {
      type: 'node:removed',
      timestamp: new Date(),
      data: { nodeId: id },
    });

    return true;
  }

  // ============================================================================
  // 边操作
  // ============================================================================

  /**
   * 添加边（关系）
   */
  addEdge(
    sourceId: string,
    targetId: string,
    type: RelationType,
    strength: number = 1.0,
    properties: Record<string, unknown> = {},
    bidirectional: boolean = false
  ): KnowledgeEdge | undefined {
    // 检查节点存在
    if (!this.nodes.has(sourceId) || !this.nodes.has(targetId)) {
      return undefined;
    }

    const id = this.generateId('edge');
    const edge: KnowledgeEdge = {
      id,
      sourceId,
      targetId,
      type,
      strength,
      properties,
      createdAt: new Date(),
      bidirectional,
    };

    this.edges.set(id, edge);

    // 更新邻接表
    this.adjacencyList.get(sourceId)?.add(id);
    if (bidirectional) {
      this.adjacencyList.get(targetId)?.add(id);
    }

    // 检查容量
    if (this.edges.size > this.config.maxEdges) {
      this.evictWeakestEdge();
    }

    this.emit('edge:added', {
      type: 'edge:added',
      timestamp: new Date(),
      data: { edge },
    });

    return edge;
  }

  /**
   * 获取边
   */
  getEdge(id: string): KnowledgeEdge | undefined {
    return this.edges.get(id);
  }

  /**
   * 查找节点间的关系
   */
  findRelations(
    sourceId: string,
    targetId?: string,
    type?: RelationType
  ): KnowledgeEdge[] {
    const results: KnowledgeEdge[] = [];
    const edgeIds = this.adjacencyList.get(sourceId);

    if (!edgeIds) return results;

    for (const edgeId of edgeIds) {
      const edge = this.edges.get(edgeId);
      if (!edge) continue;

      if (targetId && edge.targetId !== targetId && edge.sourceId !== targetId) {
        continue;
      }

      if (type && edge.type !== type) {
        continue;
      }

      results.push(edge);
    }

    return results;
  }

  // ============================================================================
  // 查询与推理
  // ============================================================================

  /**
   * 多跳查询
   *
   * 查找从起始节点出发，在指定深度内的所有相关节点
   */
  multiHopQuery(
    startNodeId: string,
    options: GraphQueryOptions = {}
  ): { nodes: KnowledgeNode[]; edges: KnowledgeEdge[] } {
    const maxDepth = options.maxDepth || 3;
    const minStrength = options.minStrength || 0;
    const visited = new Set<string>();
    const resultNodes = new Map<string, KnowledgeNode>();
    const resultEdges: KnowledgeEdge[] = [];

    const dfs = (nodeId: string, depth: number) => {
      if (depth > maxDepth || visited.has(nodeId)) return;

      visited.add(nodeId);
      const node = this.nodes.get(nodeId);
      if (node) {
        resultNodes.set(nodeId, node);
      }

      const edgeIds = this.adjacencyList.get(nodeId);
      if (!edgeIds) return;

      for (const edgeId of edgeIds) {
        const edge = this.edges.get(edgeId);
        if (!edge || edge.strength < minStrength) continue;

        if (options.relationTypes && !options.relationTypes.includes(edge.type)) {
          continue;
        }

        resultEdges.push(edge);

        const nextNodeId = edge.sourceId === nodeId ? edge.targetId : edge.sourceId;
        dfs(nextNodeId, depth + 1);
      }
    };

    dfs(startNodeId, 0);

    return {
      nodes: Array.from(resultNodes.values()),
      edges: resultEdges,
    };
  }

  /**
   * 查找路径
   *
   * 查找两个节点间的所有路径
   */
  findPaths(
    sourceId: string,
    targetId: string,
    options: GraphQueryOptions = {}
  ): PathResult[] {
    const maxDepth = options.maxDepth || 5;
    const paths: PathResult[] = [];

    const dfs = (
      currentId: string,
      target: string,
      path: KnowledgeNode[],
      edges: KnowledgeEdge[],
      depth: number,
      visited: Set<string>
    ) => {
      if (depth > maxDepth) return;

      if (currentId === target) {
        paths.push({
          nodes: [...path],
          edges: [...edges],
          length: path.length,
          score: this.calculatePathScore(edges),
        });
        return;
      }

      const edgeIds = this.adjacencyList.get(currentId);
      if (!edgeIds) return;

      for (const edgeId of edgeIds) {
        const edge = this.edges.get(edgeId);
        if (!edge) continue;

        const nextId = edge.sourceId === currentId ? edge.targetId : edge.sourceId;
        if (visited.has(nextId)) continue;

        const nextNode = this.nodes.get(nextId);
        if (!nextNode) continue;

        visited.add(nextId);
        dfs(nextId, target, [...path, nextNode], [...edges, edge], depth + 1, visited);
        visited.delete(nextId);
      }
    };

    const startNode = this.nodes.get(sourceId);
    if (startNode) {
      dfs(sourceId, targetId, [startNode], [], 0, new Set([sourceId]));
    }

    // 按得分排序
    paths.sort((a, b) => b.score - a.score);

    if (options.limit) {
      return paths.slice(0, options.limit);
    }

    return paths;
  }

  /**
   * 关系推理
   *
   * 基于已有关系推理出新关系
   */
  inferRelations(nodeId: string): InferenceResult {
    const inferredRelations: Triple[] = [];
    const reasoningPaths: PathResult[] = [];

    // 获取节点的直接关系
    const directRelations = this.findRelations(nodeId);

    // 传递性推理: A -> B, B -> C => A -> C
    for (const rel1 of directRelations) {
      const intermediateId = rel1.targetId === nodeId ? rel1.sourceId : rel1.targetId;
      const intermediateRelations = this.findRelations(intermediateId);

      for (const rel2 of intermediateRelations) {
        const targetId = rel2.targetId === intermediateId ? rel2.sourceId : rel2.targetId;
        if (targetId === nodeId) continue;

        // 检查是否已存在直接关系
        const existing = this.findRelations(nodeId, targetId);
        if (existing.length === 0) {
          const sourceNode = this.nodes.get(nodeId)!;
          const targetNode = this.nodes.get(targetId)!;

          inferredRelations.push({
            subject: sourceNode.name,
            predicate: 'related_to',
            object: targetNode.name,
            confidence: rel1.strength * rel2.strength * 0.8,
          });

          // 记录推理路径
          const path = this.findPaths(nodeId, targetId, { maxDepth: 2 });
          if (path.length > 0) {
            reasoningPaths.push(path[0]);
          }
        }
      }
    }

    // 计算总体置信度
    const avgConfidence =
      inferredRelations.length > 0
        ? inferredRelations.reduce((sum, r) => sum + (r.confidence || 0), 0) /
          inferredRelations.length
        : 0;

    return {
      inferredRelations,
      confidence: avgConfidence,
      reasoningPath: reasoningPaths,
    };
  }

  // ============================================================================
  // MemoryService 接口实现
  // ============================================================================

  async get(key: string): Promise<unknown> {
    const node = this.findNodeByName(key);
    return node?.properties.value;
  }

  async set(key: string, value: unknown): Promise<void> {
    const node = this.findNodeByName(key);
    if (node) {
      this.updateNode(node.id, { properties: { ...node.properties, value } });
    } else {
      this.addNode(key, 'concept', { value });
    }
  }

  async search(query: string): Promise<unknown[]> {
    const nodes = this.searchNodes(query);
    return nodes.map(n => ({
      name: n.name,
      type: n.type,
      properties: n.properties,
    }));
  }

  // ============================================================================
  // 统计与导出
  // ============================================================================

  /**
   * 获取统计信息
   */
  getStats(): {
    nodeCount: number;
    edgeCount: number;
    nodeTypes: Record<NodeType, number>;
    relationTypes: Record<RelationType, number>;
  } {
    const nodeTypes: Record<string, number> = {};
    const relationTypes: Record<string, number> = {};

    for (const node of this.nodes.values()) {
      nodeTypes[node.type] = (nodeTypes[node.type] || 0) + 1;
    }

    for (const edge of this.edges.values()) {
      relationTypes[edge.type] = (relationTypes[edge.type] || 0) + 1;
    }

    return {
      nodeCount: this.nodes.size,
      edgeCount: this.edges.size,
      nodeTypes: nodeTypes as Record<NodeType, number>,
      relationTypes: relationTypes as Record<RelationType, number>,
    };
  }

  /**
   * 导出为三元组
   */
  exportTriples(): Triple[] {
    const triples: Triple[] = [];

    for (const edge of this.edges.values()) {
      const source = this.nodes.get(edge.sourceId);
      const target = this.nodes.get(edge.targetId);

      if (source && target) {
        triples.push({
          subject: source.name,
          predicate: edge.type,
          object: target.name,
          confidence: edge.strength,
        });
      }
    }

    return triples;
  }

  /**
   * 清空图谱
   */
  clear(): void {
    this.nodes.clear();
    this.edges.clear();
    this.adjacencyList.clear();

    this.emit('graph:cleared', {
      type: 'graph:cleared',
      timestamp: new Date(),
    });
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  private generateId(prefix: string): string {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private evictLeastImportantNode(): void {
    let leastImportant: KnowledgeNode | undefined;

    for (const node of this.nodes.values()) {
      if (!leastImportant || node.importance < leastImportant.importance) {
        leastImportant = node;
      }
    }

    if (leastImportant) {
      this.removeNode(leastImportant.id);
    }
  }

  private evictWeakestEdge(): void {
    let weakest: KnowledgeEdge | undefined;

    for (const edge of this.edges.values()) {
      if (!weakest || edge.strength < weakest.strength) {
        weakest = edge;
      }
    }

    if (weakest) {
      this.edges.delete(weakest.id);
      this.adjacencyList.get(weakest.sourceId)?.delete(weakest.id);
      if (weakest.bidirectional) {
        this.adjacencyList.get(weakest.targetId)?.delete(weakest.id);
      }
    }
  }

  private sortResults(nodes: KnowledgeNode[], sortBy: string): void {
    switch (sortBy) {
      case 'importance':
        nodes.sort((a, b) => b.importance - a.importance);
        break;
      case 'recency':
        nodes.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
        break;
      case 'relevance':
      default:
        nodes.sort((a, b) => b.accessCount - a.accessCount);
        break;
    }
  }

  private calculatePathScore(edges: KnowledgeEdge[]): number {
    if (edges.length === 0) return 0;
    const avgStrength = edges.reduce((sum, e) => sum + e.strength, 0) / edges.length;
    const lengthPenalty = 1 / (1 + Math.log(edges.length + 1));
    return avgStrength * lengthPenalty;
  }
}

/**
 * 创建 Graph Memory 实例
 */
export function createGraphMemory(logger: Logger, config?: GraphMemoryConfig): GraphMemory {
  return new GraphMemory(logger, config);
}
