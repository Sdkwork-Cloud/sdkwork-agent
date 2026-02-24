/**
 * Dependency Graph - 依赖图和拓扑排序组件
 *
 * 提供依赖关系管理能力
 * - 依赖图构建
 * - 拓扑排序
 * - 循环依赖检测
 * - 依赖解析
 *
 * @module Framework/DependencyGraph
 * @version 1.0.0
 */

import { createLogger, type ILogger } from '../utils/logger.js';

export interface GraphNode<T = unknown> {
  id: string;
  data?: T;
  dependencies: Set<string>;
  dependents: Set<string>;
}

export interface CycleDetectionResult {
  hasCycle: boolean;
  cycle: string[];
}

export interface TopologicalSortResult<T = unknown> {
  sorted: string[];
  nodes: Map<string, GraphNode<T>>;
  levels: Map<string, number>;
}

export interface DependencyGraphConfig {
  name?: string;
  allowCycles?: boolean;
  logger?: ILogger;
}

export class DependencyGraph<T = unknown> {
  private nodes: Map<string, GraphNode<T>> = new Map();
  private config: { name: string; allowCycles: boolean };
  private logger: ILogger;

  constructor(config: DependencyGraphConfig = {}) {
    this.config = {
      name: config.name ?? 'DependencyGraph',
      allowCycles: config.allowCycles ?? false,
    };
    this.logger = config.logger ?? createLogger({ name: this.config.name });
  }

  addNode(id: string, data?: T): this {
    if (!this.nodes.has(id)) {
      this.nodes.set(id, {
        id,
        data,
        dependencies: new Set(),
        dependents: new Set(),
      });
      this.logger.debug(`Node added: ${id}`);
    } else if (data !== undefined) {
      this.nodes.get(id)!.data = data;
    }
    return this;
  }

  removeNode(id: string): boolean {
    const node = this.nodes.get(id);
    if (!node) return false;

    for (const depId of node.dependencies) {
      const dep = this.nodes.get(depId);
      dep?.dependents.delete(id);
    }

    for (const depId of node.dependents) {
      const dep = this.nodes.get(depId);
      dep?.dependencies.delete(id);
    }

    this.nodes.delete(id);
    this.logger.debug(`Node removed: ${id}`);
    return true;
  }

  addDependency(from: string, to: string): this {
    this.addNode(from);
    this.addNode(to);

    const fromNode = this.nodes.get(from)!;
    const toNode = this.nodes.get(to)!;

    fromNode.dependencies.add(to);
    toNode.dependents.add(from);

    if (!this.config.allowCycles) {
      const cycle = this.detectCycleFrom(from);
      if (cycle.hasCycle) {
        fromNode.dependencies.delete(to);
        toNode.dependents.delete(from);
        throw new Error(`Adding dependency would create cycle: ${cycle.cycle.join(' -> ')}`);
      }
    }

    this.logger.debug(`Dependency added: ${from} -> ${to}`);
    return this;
  }

  removeDependency(from: string, to: string): boolean {
    const fromNode = this.nodes.get(from);
    const toNode = this.nodes.get(to);

    if (!fromNode || !toNode) return false;

    const removed = fromNode.dependencies.delete(to);
    toNode.dependents.delete(from);

    if (removed) {
      this.logger.debug(`Dependency removed: ${from} -> ${to}`);
    }
    return removed;
  }

  hasNode(id: string): boolean {
    return this.nodes.has(id);
  }

  getNode(id: string): GraphNode<T> | undefined {
    return this.nodes.get(id);
  }

  getNodeData(id: string): T | undefined {
    return this.nodes.get(id)?.data;
  }

  getDependencies(id: string): string[] {
    const node = this.nodes.get(id);
    return node ? Array.from(node.dependencies) : [];
  }

  getDependents(id: string): string[] {
    const node = this.nodes.get(id);
    return node ? Array.from(node.dependents) : [];
  }

  getAllDependencies(id: string, visited: Set<string> = new Set()): string[] {
    const node = this.nodes.get(id);
    if (!node || visited.has(id)) return [];

    visited.add(id);
    const deps: string[] = [];

    for (const depId of node.dependencies) {
      if (!visited.has(depId)) {
        deps.push(depId);
        deps.push(...this.getAllDependencies(depId, visited));
      }
    }

    return deps;
  }

  getAllDependents(id: string, visited: Set<string> = new Set()): string[] {
    const node = this.nodes.get(id);
    if (!node || visited.has(id)) return [];

    visited.add(id);
    const deps: string[] = [];

    for (const depId of node.dependents) {
      if (!visited.has(depId)) {
        deps.push(depId);
        deps.push(...this.getAllDependents(depId, visited));
      }
    }

    return deps;
  }

  detectCycle(): CycleDetectionResult {
    const visited = new Set<string>();
    const recursionStack = new Set<string>();
    const path: string[] = [];

    for (const [id] of this.nodes) {
      const result = this.detectCycleDFS(id, visited, recursionStack, path);
      if (result.hasCycle) {
        return result;
      }
    }

    return { hasCycle: false, cycle: [] };
  }

  private detectCycleFrom(startId: string): CycleDetectionResult {
    const visited = new Set<string>();
    const recursionStack = new Set<string>();
    const path: string[] = [];

    return this.detectCycleDFS(startId, visited, recursionStack, path);
  }

  private detectCycleDFS(
    id: string,
    visited: Set<string>,
    recursionStack: Set<string>,
    path: string[]
  ): CycleDetectionResult {
    visited.add(id);
    recursionStack.add(id);
    path.push(id);

    const node = this.nodes.get(id);
    if (node) {
      for (const depId of node.dependencies) {
        if (!visited.has(depId)) {
          const result = this.detectCycleDFS(depId, visited, recursionStack, path);
          if (result.hasCycle) return result;
        } else if (recursionStack.has(depId)) {
          const cycleStart = path.indexOf(depId);
          return {
            hasCycle: true,
            cycle: [...path.slice(cycleStart), depId],
          };
        }
      }
    }

    path.pop();
    recursionStack.delete(id);
    return { hasCycle: false, cycle: [] };
  }

  topologicalSort(): TopologicalSortResult<T> {
    const inDegree = new Map<string, number>();
    const levels = new Map<string, number>();

    for (const [id, node] of this.nodes) {
      inDegree.set(id, node.dependencies.size);
      levels.set(id, 0);
    }

    const queue: string[] = [];
    for (const [id, degree] of inDegree) {
      if (degree === 0) {
        queue.push(id);
      }
    }

    const sorted: string[] = [];

    while (queue.length > 0) {
      const id = queue.shift()!;
      sorted.push(id);

      const node = this.nodes.get(id)!;
      for (const depId of node.dependents) {
        const currentDegree = inDegree.get(depId)! - 1;
        inDegree.set(depId, currentDegree);

        levels.set(depId, Math.max(levels.get(depId)!, levels.get(id)! + 1));

        if (currentDegree === 0) {
          queue.push(depId);
        }
      }
    }

    if (sorted.length !== this.nodes.size) {
      const cycle = this.detectCycle();
      throw new Error(`Cannot perform topological sort: cycle detected (${cycle.cycle.join(' -> ')})`);
    }

    return { sorted, nodes: this.nodes, levels };
  }

  getExecutionOrder(): string[] {
    return this.topologicalSort().sorted;
  }

  getParallelExecutionGroups(): string[][] {
    const { sorted, levels } = this.topologicalSort();

    const groups: Map<number, string[]> = new Map();
    for (const id of sorted) {
      const level = levels.get(id)!;
      if (!groups.has(level)) {
        groups.set(level, []);
      }
      groups.get(level)!.push(id);
    }

    return Array.from(groups.values());
  }

  getLeafNodes(): string[] {
    const leaves: string[] = [];
    for (const [id, node] of this.nodes) {
      if (node.dependents.size === 0) {
        leaves.push(id);
      }
    }
    return leaves;
  }

  getRootNodes(): string[] {
    const roots: string[] = [];
    for (const [id, node] of this.nodes) {
      if (node.dependencies.size === 0) {
        roots.push(id);
      }
    }
    return roots;
  }

  clone(): DependencyGraph<T> {
    const cloned = new DependencyGraph<T>(this.config);

    for (const [id, node] of this.nodes) {
      cloned.addNode(id, node.data);
    }

    for (const [id, node] of this.nodes) {
      for (const depId of node.dependencies) {
        cloned.addDependency(id, depId);
      }
    }

    return cloned;
  }

  clear(): void {
    this.nodes.clear();
    this.logger.debug('Graph cleared');
  }

  size(): number {
    return this.nodes.size;
  }

  isEmpty(): boolean {
    return this.nodes.size === 0;
  }

  toJSON(): { nodes: Array<{ id: string; data?: T; dependencies: string[] }> } {
    const nodes: Array<{ id: string; data?: T; dependencies: string[] }> = [];

    for (const [id, node] of this.nodes) {
      nodes.push({
        id,
        data: node.data,
        dependencies: Array.from(node.dependencies),
      });
    }

    return { nodes };
  }

  static fromJSON<T>(json: { nodes: Array<{ id: string; data?: T; dependencies: string[] }> }): DependencyGraph<T> {
    const graph = new DependencyGraph<T>();

    for (const node of json.nodes) {
      graph.addNode(node.id, node.data);
    }

    for (const node of json.nodes) {
      for (const depId of node.dependencies) {
        graph.addDependency(node.id, depId);
      }
    }

    return graph;
  }
}

export class DependencyResolver<T = unknown> {
  private graph: DependencyGraph<T>;
  private logger: ILogger;

  constructor(graph?: DependencyGraph<T>, logger?: ILogger) {
    this.graph = graph ?? new DependencyGraph<T>();
    this.logger = logger ?? createLogger({ name: 'DependencyResolver' });
  }

  register(id: string, data: T, dependencies: string[] = []): this {
    this.graph.addNode(id, data);
    for (const depId of dependencies) {
      this.graph.addDependency(id, depId);
    }
    return this;
  }

  resolve(id: string): { id: string; data: T | undefined }[] {
    const allDeps = this.graph.getAllDependencies(id);
    const result: { id: string; data: T | undefined }[] = [];

    const { sorted } = this.graph.topologicalSort();
    const depSet = new Set(allDeps);
    depSet.add(id);

    for (const depId of sorted) {
      if (depSet.has(depId)) {
        result.push({
          id: depId,
          data: this.graph.getNodeData(depId),
        });
      }
    }

    return result;
  }

  resolveAll(): { id: string; data: T | undefined }[][] {
    const groups = this.graph.getParallelExecutionGroups();
    return groups.map(group =>
      group.map(id => ({
        id,
        data: this.graph.getNodeData(id),
      }))
    );
  }

  getGraph(): DependencyGraph<T> {
    return this.graph;
  }

  canResolve(id: string): boolean {
    return this.graph.hasNode(id);
  }

  getMissingDependencies(id: string): string[] {
    const deps = this.graph.getAllDependencies(id);
    return deps.filter(depId => !this.graph.hasNode(depId));
  }
}

export function createDependencyGraph<T>(config?: DependencyGraphConfig): DependencyGraph<T> {
  return new DependencyGraph<T>(config);
}

export function createDependencyResolver<T>(graph?: DependencyGraph<T>): DependencyResolver<T> {
  return new DependencyResolver<T>(graph);
}
