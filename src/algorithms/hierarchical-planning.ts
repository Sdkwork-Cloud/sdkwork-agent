/**
 * 层次规划系统 (Hierarchical Planning)
 *
 * 实现Hierarchical Task Network (HTN) 规划算法，支持：
 * 1. 任务分解 (Task Decomposition)
 * 2. 方法选择 (Method Selection)
 * 3. 偏序规划 (Partial Order Planning)
 * 4. 冲突检测与消解
 * 5. 计划执行与监控
 *
 * 适用于复杂多步任务规划场景
 */

import { Logger, createLogger } from '../utils/logger.js';
import { delay } from '../utils/environment.js';

export interface PlanningConfig {
  /** 最大规划深度 */
  maxDepth: number;
  /** 最大分支因子 */
  maxBranchingFactor: number;
  /** 规划超时时间(ms) */
  timeout: number;
  /** 是否启用偏序规划 */
  enablePartialOrder: boolean;
  /** 是否启用计划优化 */
  enableOptimization: boolean;
  /** 优化迭代次数 */
  optimizationIterations: number;
  /** 是否启用计划修复 */
  enableReplanning: boolean;
  /** 重新规划阈值 */
  replanningThreshold: number;
  /** 执行监控间隔(ms) */
  monitoringInterval: number;
}

export interface Task {
  /** 任务唯一ID */
  id: string;
  /** 任务名称 */
  name: string;
  /** 任务描述 */
  description?: string;
  /** 任务类型 */
  type: 'primitive' | 'compound';
  /** 前置条件 */
  preconditions?: Condition[];
  /** 后置效果 */
  effects?: Effect[];
  /** 任务参数 */
  parameters?: Record<string, unknown>;
  /** 任务优先级 */
  priority?: number;
  /** 预估成本 */
  estimatedCost?: number;
  /** 父任务ID */
  parentId?: string;
  /** 子任务IDs */
  subtaskIds?: string[];
  /** 动作定义 */
  action?: TaskAction;
  /** 预估执行时间(ms) */
  estimatedDuration?: number;
}

export interface CompoundTask extends Task {
  type: 'compound';
  /** 可用的分解方法 */
  methods: Method[];
}

export interface TaskAction {
  /** 动作类型 */
  type: string;
  /** 动作参数 */
  params?: Record<string, unknown>;
}

export interface PrimitiveTask extends Task {
  type: 'primitive';
  /** 执行函数 */
  execute?: (context: ExecutionContext) => Promise<TaskResult>;
  /** 动作定义 */
  action?: TaskAction;
  /** 执行超时(ms) */
  timeout?: number;
  /** 重试次数 */
  retries?: number;
  /** 预估执行时间(ms) */
  estimatedDuration?: number;
  /** 是否为可选任务 */
  optional?: boolean;
  /** 并行任务组ID列表 */
  parallelGroup?: string[];
}

export interface Method {
  /** 方法唯一ID */
  id: string;
  /** 方法名称 */
  name: string;
  /** 方法适用条件 */
  applicability: Condition[];
  /** 子任务列表 */
  subtasks: Task[];
  /** 子任务间的偏序约束 */
  orderingConstraints?: OrderingConstraint[];
  /** 因果约束 */
  causalConstraints?: CausalConstraint[];
  /** 方法优先级 */
  priority?: number;
  /** 预估成本 */
  estimatedCost?: number;
}

export interface Condition {
  /** 条件类型 */
  type: 'state' | 'resource' | 'temporal' | 'logical';
  /** 条件描述 */
  description: string;
  /** 条件目标 */
  target?: string;
  /** 条件检查函数 */
  check: (state: WorldState) => boolean;
  /** 条件参数 */
  parameters?: Record<string, unknown>;
}

export interface Effect {
  /** 效果类型 */
  type: 'add' | 'delete' | 'update';
  /** 目标状态 */
  target: string;
  /** 效果值 */
  value?: unknown;
  /** 效果应用函数 */
  apply: (state: WorldState) => WorldState;
}

/**
 * 目标定义
 */
export interface Goal {
  /** 目标ID */
  id: string;
  /** 目标名称 */
  name: string;
  /** 目标描述 */
  description?: string;
  /** 目标条件 */
  conditions: Condition[];
  /** 目标优先级 */
  priority?: number;
  /** 目标截止时间 */
  deadline?: Date;
}

export interface OrderingConstraint {
  /** 前置任务 */
  before: string;
  /** 后置任务 */
  after: string;
  /** 约束类型 */
  type: 'sequential' | 'parallel' | 'start' | 'end';
}

export interface CausalConstraint {
  /** 提供者任务 */
  provider: string;
  /** 接收者任务 */
  receiver: string;
  /** 因果条件 */
  condition: Condition;
}

export interface WorldState {
  /** 状态变量 */
  variables: Map<string, unknown>;
  /** 资源状态 */
  resources: Map<string, ResourceState>;
  /** 时间戳 */
  timestamp: number;
  /** 历史记录 */
  history: StateChange[];
}

export interface ResourceState {
  /** 资源ID */
  id: string;
  /** 资源数量 */
  quantity: number;
  /** 资源容量 */
  capacity?: number;
  /** 使用者 */
  usedBy?: string[];
}

export interface StateChange {
  /** 变化时间 */
  timestamp: number;
  /** 变化描述 */
  description: string;
  /** 变化前状态 */
  before?: unknown;
  /** 变化后状态 */
  after?: unknown;
}

export interface Plan {
  /** 计划唯一ID */
  id: string;
  /** 根任务 */
  rootTask: Task;
  /** 所有任务 */
  tasks: Map<string, Task>;
  /** 任务分解树 */
  decompositionTree: DecompositionNode;
  /** 偏序关系 */
  partialOrder: PartialOrderGraph;
  /** 线性化后的执行序列 */
  linearizedSequence?: PrimitiveTask[];
  /** 计划总成本 */
  totalCost: number;
  /** 预估执行时间(ms) */
  estimatedDuration: number;
  /** 创建时间 */
  createdAt: Date;
  /** 计划目标 */
  goal?: Goal;
}

export interface DecompositionNode {
  /** 节点任务 */
  task: Task;
  /** 子节点 */
  children: DecompositionNode[];
  /** 分解深度 */
  depth: number;
  /** 所使用的方法 */
  method?: Method;
}

export interface PartialOrderGraph {
  /** 任务节点 */
  nodes: Set<string>;
  /** 边集合 (before -> after) */
  edges: Map<string, Set<string>>;
  /** 开始任务 */
  startTasks: Set<string>;
  /** 结束任务 */
  endTasks: Set<string>;
}

export interface TaskResult {
  /** 是否成功 */
  success: boolean;
  /** 输出数据 */
  output?: unknown;
  /** 错误信息 */
  error?: Error;
  /** 执行时间(ms) */
  executionTime?: number;
}

export interface ExecutionContext {
  /** 世界状态 */
  worldState: WorldState;
  /** 执行历史 */
  executionHistory: TaskResult[];
  /** 全局变量 */
  variables: Map<string, unknown>;
  /** 执行配置 */
  config?: PlanningConfig;
}

export interface PlanningStatistics {
  /** 规划耗时(ms) */
  planningTime: number;
  /** 探索的节点数 */
  nodesExplored: number;
  /** 最大深度 */
  maxDepthReached: number;
  /** 回溯次数 */
  backtracks: number;
  /** 生成的计划数 */
  plansGenerated: number;
}

/**
 * HTN规划器
 */
export class HTNPlanner {
  private config: PlanningConfig;
  private statistics: PlanningStatistics;
  private logger: Logger;

  constructor(config: Partial<PlanningConfig> = {}, logger?: Logger) {
    this.config = {
      maxDepth: 10,
      maxBranchingFactor: 5,
      timeout: 30000,
      enablePartialOrder: true,
      enableOptimization: true,
      optimizationIterations: 3,
      enableReplanning: true,
      replanningThreshold: 0.7,
      monitoringInterval: 1000,
      ...config
    };

    this.logger = logger || createLogger({ name: 'HTNPlanner' });

    this.statistics = {
      planningTime: 0,
      nodesExplored: 0,
      maxDepthReached: 0,
      backtracks: 0,
      plansGenerated: 0
    };
  }

  /**
   * 生成计划
   */
  async generatePlan(
    rootTask: Task,
    initialState: WorldState,
    goal?: Goal
  ): Promise<Plan | null> {
    const startTime = Date.now();
    this.statistics = {
      planningTime: 0,
      nodesExplored: 0,
      maxDepthReached: 0,
      backtracks: 0,
      plansGenerated: 0
    };

    try {
      // 1. 任务分解
      const decompositionTree = await this.decomposeTask(
        rootTask,
        initialState,
        0
      );

      if (!decompositionTree) {
        return null;
      }

      // 2. 构建偏序关系
      const partialOrder = this.buildPartialOrder(decompositionTree);

      // 3. 线性化
      const linearizedSequence = this.linearizePartialOrder(
        decompositionTree,
        partialOrder
      );

      if (!linearizedSequence) {
        return null;
      }

      // 4. 计算成本和预估时间
      const { totalCost, estimatedDuration } = this.calculatePlanMetrics(
        decompositionTree,
        linearizedSequence
      );

      // 5. 优化计划 (可选)
      let optimizedSequence = linearizedSequence;
      if (this.config.enableOptimization) {
        optimizedSequence = await this.optimizePlan(
          linearizedSequence,
          initialState
        );
      }

      const plan: Plan = {
        id: `plan-${Date.now()}`,
        rootTask,
        tasks: this.extractAllTasks(decompositionTree),
        decompositionTree,
        partialOrder,
        linearizedSequence: optimizedSequence,
        totalCost,
        estimatedDuration,
        createdAt: new Date(),
        goal
      };

      this.statistics.planningTime = Date.now() - startTime;
      this.statistics.plansGenerated = 1;

      return plan;
    } catch (error) {
      this.logger.error('Plan generation failed', { error });
      return null;
    }
  }

  /**
   * 执行任务分解
   */
  private async decomposeTask(
    task: Task,
    state: WorldState,
    depth: number
  ): Promise<DecompositionNode | null> {
    this.statistics.nodesExplored++;
    this.statistics.maxDepthReached = Math.max(this.statistics.maxDepthReached, depth);

    // 检查深度限制
    if (depth > this.config.maxDepth) {
      return null;
    }

    // 检查前置条件
    if (task.preconditions && !this.checkConditions(task.preconditions, state)) {
      return null;
    }

    // 基础任务直接返回
    if (task.type === 'primitive') {
      return {
        task,
        children: [],
        depth
      };
    }

    // 复合任务：选择方法并递归分解
    const compoundTask = task as CompoundTask;
    const selectedMethod = await this.selectMethod(compoundTask, state);

    if (!selectedMethod) {
      return null;
    }

    const children: DecompositionNode[] = [];
    let currentState = { ...state };

    for (const subtask of selectedMethod.subtasks) {
      const child = await this.decomposeTask(subtask, currentState, depth + 1);
      if (!child) {
        this.statistics.backtracks++;
        return null;
      }
      children.push(child);

      // 更新状态（模拟执行）
      if (subtask.effects) {
        currentState = this.applyEffects(subtask.effects, currentState);
      }
    }

    return {
      task,
      children,
      depth,
      method: selectedMethod
    };
  }

  /**
   * 选择最佳方法
   */
  private async selectMethod(
    task: CompoundTask,
    state: WorldState
  ): Promise<Method | null> {
    const applicableMethods = task.methods.filter(method =>
      this.checkConditions(method.applicability, state)
    );

    if (applicableMethods.length === 0) {
      return null;
    }

    // 计算每个方法的综合评分
    const scoredMethods = await Promise.all(
      applicableMethods.map(async (method) => {
        const score = await this.evaluateMethod(method, task, state);
        return { method, score };
      })
    );

    // 按评分排序
    scoredMethods.sort((a, b) => b.score - a.score);

    // 选择评分最高的方法
    return scoredMethods[0]?.method || null;
  }

  /**
   * 评估方法的综合得分
   */
  private async evaluateMethod(
    method: Method,
    _task: CompoundTask,
    state: WorldState
  ): Promise<number> {
    let score = 0;

    // 1. 优先级得分
    score += (method.priority || 0) * 0.3;

    // 2. 成本得分 (成本越低得分越高)
    const estimatedCost = this.estimateMethodCost(method, state);
    score += Math.max(0, 100 - estimatedCost) * 0.2;

    // 3. 成功率得分
    const successRate = await this.estimateMethodSuccessRate(method, state);
    score += successRate * 0.3;

    // 4. 时间得分 (时间越短得分越高)
    const estimatedTime = this.estimateMethodTime(method);
    score += Math.max(0, 10000 - estimatedTime) * 0.1;

    // 5. 资源利用得分
    const resourceUtilization = this.estimateResourceUtilization(method, state);
    score += resourceUtilization * 0.1;

    return score;
  }

  /**
   * 估算方法成本
   */
  private estimateMethodCost(method: Method, _state: WorldState): number {
    let cost = 0;
    for (const subtask of method.subtasks) {
      cost += subtask.estimatedCost || 1;
    }
    return cost;
  }

  /**
   * 估算方法成功率
   */
  private async estimateMethodSuccessRate(method: Method, state: WorldState): Promise<number> {
    let successRate = 1.0;
    for (const subtask of method.subtasks) {
      if (subtask.preconditions) {
        const preconditionSatisfaction = subtask.preconditions.reduce((sum, condition) => {
          return sum + (condition.check(state) ? 1 : 0);
        }, 0) / subtask.preconditions.length;
        successRate *= preconditionSatisfaction;
      }
    }
    return successRate;
  }

  /**
   * 估算方法执行时间
   */
  private estimateMethodTime(method: Method): number {
    let time = 0;
    for (const subtask of method.subtasks) {
      time += subtask.estimatedDuration || 1000;
    }
    return time;
  }

  /**
   * 估算资源利用率
   */
  private estimateResourceUtilization(method: Method, _state: WorldState): number {
    // 简化的资源利用率计算
    const totalResources = _state.resources.size;
    if (totalResources === 0) return 1.0;

    let usedResources = 0;
    for (const _subtask of method.subtasks) {
      // 假设每个子任务使用至少一种资源
      usedResources++;
    }

    return Math.min(1.0, usedResources / totalResources);
  }

  /**
   * 检查条件
   */
  private checkConditions(conditions: Condition[], state: WorldState): boolean {
    return conditions.every(condition => condition.check(state));
  }

  /**
   * 应用效果
   */
  private applyEffects(effects: Effect[], state: WorldState): WorldState {
    let newState = { ...state };

    for (const effect of effects) {
      newState = effect.apply(newState);
    }

    return newState;
  }

  /**
   * 构建偏序关系图
   */
  private buildPartialOrder(decompositionTree: DecompositionNode): PartialOrderGraph {
    const nodes = new Set<string>();
    const edges = new Map<string, Set<string>>();
    const startTasks = new Set<string>();
    const endTasks = new Set<string>();

    // 收集所有任务节点
    this.collectTasks(decompositionTree, nodes);

    // 构建边关系
    this.buildEdges(decompositionTree, edges);

    // 识别开始和结束任务
    for (const nodeId of nodes) {
      const hasIncoming = Array.from(edges.values()).some(set => set.has(nodeId));
      const hasOutgoing = edges.get(nodeId)?.size || 0;

      if (!hasIncoming) {
        startTasks.add(nodeId);
      }
      if (!hasOutgoing) {
        endTasks.add(nodeId);
      }
    }

    return {
      nodes,
      edges,
      startTasks,
      endTasks
    };
  }

  /**
   * 收集所有任务
   */
  private collectTasks(node: DecompositionNode, collection: Set<string>): void {
    collection.add(node.task.id);
    for (const child of node.children) {
      this.collectTasks(child, collection);
    }
  }

  /**
   * 构建边关系
   */
  private buildEdges(node: DecompositionNode, edges: Map<string, Set<string>>): void {
    // 初始化当前节点的边
    if (!edges.has(node.task.id)) {
      edges.set(node.task.id, new Set());
    }

    // 处理子节点的偏序约束
    if (node.method?.orderingConstraints) {
      for (const constraint of node.method.orderingConstraints) {
        if (!edges.has(constraint.before)) {
          edges.set(constraint.before, new Set());
        }
        edges.get(constraint.before)!.add(constraint.after);
      }
    }

    // 递归处理子节点
    for (const child of node.children) {
      this.buildEdges(child, edges);
    }
  }

  /**
   * 线性化偏序关系
   */
  private linearizePartialOrder(
    decompositionTree: DecompositionNode,
    partialOrder: PartialOrderGraph
  ): PrimitiveTask[] | null {
    const visited = new Set<string>();
    const result: PrimitiveTask[] = [];
    const tempMark = new Set<string>();

    // 拓扑排序
    const visit = (taskId: string): boolean => {
      if (tempMark.has(taskId)) {
        return false; // 检测到环
      }
      if (visited.has(taskId)) {
        return true;
      }

      tempMark.add(taskId);

      const neighbors = partialOrder.edges.get(taskId) || new Set();
      for (const neighbor of neighbors) {
        if (!visit(neighbor)) {
          return false;
        }
      }

      tempMark.delete(taskId);
      visited.add(taskId);

      const task = this.findTaskById(decompositionTree, taskId);
      if (task && task.type === 'primitive') {
        result.unshift(task as PrimitiveTask);
      }

      return true;
    };

    // 从所有开始任务开始遍历
    for (const startTask of partialOrder.startTasks) {
      if (!visit(startTask)) {
        return null; // 存在环，无法线性化
      }
    }

    return result;
  }

  /**
   * 根据ID查找任务
   */
  private findTaskById(node: DecompositionNode, id: string): Task | null {
    if (node.task.id === id) {
      return node.task;
    }

    for (const child of node.children) {
      const found = this.findTaskById(child, id);
      if (found) {
        return found;
      }
    }

    return null;
  }

  /**
   * 提取所有任务
   */
  private extractAllTasks(decompositionTree: DecompositionNode): Map<string, Task> {
    const tasks = new Map<string, Task>();

    const collect = (node: DecompositionNode) => {
      tasks.set(node.task.id, node.task);
      for (const child of node.children) {
        collect(child);
      }
    };

    collect(decompositionTree);
    return tasks;
  }

  /**
   * 计算计划指标
   */
  private calculatePlanMetrics(
    _decompositionTree: DecompositionNode,
    sequence: PrimitiveTask[]
  ): { totalCost: number; estimatedDuration: number } {
    let totalCost = 0;
    let estimatedDuration = 0;

    for (const task of sequence) {
      totalCost += task.estimatedCost || 1;
      estimatedDuration += task.estimatedDuration || task.timeout || 1000;
    }

    return { totalCost, estimatedDuration };
  }

  /**
   * 优化计划
   */
  private async optimizePlan(
    sequence: PrimitiveTask[],
    _initialState: WorldState
  ): Promise<PrimitiveTask[]> {
    let optimized = sequence;

    // 1. 移除不必要的任务
    optimized = this.removeUnnecessaryTasks(optimized, _initialState);

    // 2. 任务排序优化
    optimized = await this.optimizeTaskOrder(optimized, _initialState);

    // 3. 任务合并优化
    optimized = await this.mergeSimilarTasks(optimized);

    // 4. 并行任务识别
    optimized = this.identifyParallelTasks(optimized);

    // 5. 资源分配优化
    optimized = this.optimizeResourceAllocation(optimized, _initialState);

    return optimized;
  }

  /**
   * 移除不必要的任务
   */
  private removeUnnecessaryTasks(
    sequence: PrimitiveTask[],
    initialState: WorldState
  ): PrimitiveTask[] {
    const necessary = new Set<string>();
    let state = { ...initialState };

    for (const task of sequence) {
      const canExecute = !task.preconditions || this.checkConditions(task.preconditions, state);

      if (canExecute) {
        necessary.add(task.id);

        // 应用效果
        if (task.effects) {
          state = this.applyEffects(task.effects, state);
        }
      }
    }

    return sequence.filter(task => necessary.has(task.id));
  }

  /**
   * 优化任务顺序
   */
  private async optimizeTaskOrder(
    sequence: PrimitiveTask[],
    _initialState: WorldState
  ): Promise<PrimitiveTask[]> {
    // 计算任务间的依赖关系
    const dependencies = this.calculateTaskDependencies(sequence);
    
    // 构建任务依赖图
    const graph = this.buildTaskGraph(sequence, dependencies);
    
    // 拓扑排序
    const orderedTaskIds = this.topologicalSort(graph);
    
    // 根据排序后的ID重新排序任务
    const taskMap = new Map<string, PrimitiveTask>();
    for (const task of sequence) {
      taskMap.set(task.id, task);
    }
    
    const orderedTasks = orderedTaskIds.map(id => taskMap.get(id)).filter(Boolean) as PrimitiveTask[];
    
    // 如果拓扑排序失败，返回原始顺序
    return orderedTasks.length > 0 ? orderedTasks : sequence;
  }

  /**
   * 合并相似任务
   */
  private async mergeSimilarTasks(
    sequence: PrimitiveTask[]
  ): Promise<PrimitiveTask[]> {
    const merged: PrimitiveTask[] = [];
    const groupedTasks = new Map<string, PrimitiveTask[]>();

    // 按任务名称分组
    for (const task of sequence) {
      if (!groupedTasks.has(task.name)) {
        groupedTasks.set(task.name, []);
      }
      groupedTasks.get(task.name)!.push(task);
    }

    // 合并每组中的任务
    for (const [_name, tasks] of groupedTasks) {
      if (tasks.length > 1) {
        // 检查是否可以合并
        if (this.canMergeTasks(tasks)) {
          const mergedTask = this.mergeTaskGroup(tasks);
          merged.push(mergedTask);
        } else {
          merged.push(...tasks);
        }
      } else {
        merged.push(...tasks);
      }
    }

    return merged;
  }

  /**
   * 识别并行任务
   */
  private identifyParallelTasks(
    sequence: PrimitiveTask[]
  ): PrimitiveTask[] {
    // 简单的并行任务识别：标记可以并行执行的任务
    const parallelGroups: PrimitiveTask[][] = [];
    const remaining = [...sequence];

    while (remaining.length > 0) {
      const current = remaining.shift()!;
      const group = [current];

      // 找到与当前任务无依赖关系的后续任务
      for (let i = 0; i < remaining.length; i++) {
        const task = remaining[i];
        if (!this.hasDependency(current, task)) {
          group.push(task);
          remaining.splice(i, 1);
          i--;
        }
      }

      parallelGroups.push(group);
    }

    // 标记并行任务组
    const result: PrimitiveTask[] = [];
    for (const group of parallelGroups) {
      if (group.length > 1) {
        // 为组中的每个任务添加并行标记
        const groupIds = group.map(t => t.id);
        for (const task of group) {
          task.parallelGroup = groupIds;
        }
      }
      result.push(...group);
    }

    return result;
  }

  /**
   * 优化资源分配
   */
  private optimizeResourceAllocation(
    sequence: PrimitiveTask[],
    state: WorldState
  ): PrimitiveTask[] {
    // 分析资源需求
    const resourceDemands = this.analyzeResourceDemands(sequence, state);

    // 调整任务顺序以优化资源使用
    const optimized = this.adjustTaskOrderForResources(sequence, resourceDemands);

    return optimized;
  }

  /**
   * 计算任务间的依赖关系
   */
  private calculateTaskDependencies(
    tasks: PrimitiveTask[]
  ): Map<string, Set<string>> {
    const dependencies = new Map<string, Set<string>>();

    for (let i = 0; i < tasks.length; i++) {
      const task = tasks[i];
      dependencies.set(task.id, new Set());

      // 检查与后续任务的依赖关系
      for (let j = i + 1; j < tasks.length; j++) {
        const nextTask = tasks[j];
        if (this.hasDependency(task, nextTask)) {
          dependencies.get(nextTask.id)!.add(task.id);
        }
      }
    }

    return dependencies;
  }

  /**
   * 构建任务图
   */
  private buildTaskGraph(
    tasks: PrimitiveTask[],
    dependencies: Map<string, Set<string>>
  ): PartialOrderGraph {
    const nodes = new Set(tasks.map(t => t.id));
    const edges = new Map<string, Set<string>>();
    const startTasks = new Set<string>();
    const endTasks = new Set<string>();

    // 初始化边
    for (const task of tasks) {
      edges.set(task.id, new Set());
    }

    // 构建边关系
    for (const [taskId, deps] of dependencies) {
      for (const depId of deps) {
        edges.get(depId)!.add(taskId);
      }
    }

    // 识别开始和结束任务
    for (const task of tasks) {
      const hasIncoming = Array.from(edges.values()).some(set => set.has(task.id));
      const hasOutgoing = (edges.get(task.id)?.size || 0) > 0;

      if (!hasIncoming) {
        startTasks.add(task.id);
      }
      if (!hasOutgoing) {
        endTasks.add(task.id);
      }
    }

    return { nodes, edges, startTasks, endTasks };
  }

  /**
   * 拓扑排序
   */
  private topologicalSort(
    graph: PartialOrderGraph
  ): string[] {
    // 克隆边集合，以便在算法中修改
    const edges = new Map<string, Set<string>>();
    for (const [node, neighbors] of graph.edges) {
      edges.set(node, new Set(neighbors));
    }

    // 计算每个节点的入度
    const inDegree = new Map<string, number>();
    for (const node of graph.nodes) {
      inDegree.set(node, 0);
    }
    for (const neighbors of edges.values()) {
      for (const neighbor of neighbors) {
        inDegree.set(neighbor, (inDegree.get(neighbor) || 0) + 1);
      }
    }

    // 初始化队列，包含所有入度为0的节点
    const queue: string[] = [];
    for (const [node, degree] of inDegree) {
      if (degree === 0) {
        queue.push(node);
      }
    }

    const result: string[] = [];

    // 执行拓扑排序
    while (queue.length > 0) {
      const node = queue.shift()!;
      result.push(node);

      // 遍历当前节点的所有邻居
      const neighbors = edges.get(node) || new Set();
      for (const neighbor of neighbors) {
        // 减少邻居的入度
        inDegree.set(neighbor, (inDegree.get(neighbor) || 0) - 1);
        
        // 如果邻居的入度变为0，加入队列
        if (inDegree.get(neighbor) === 0) {
          queue.push(neighbor);
        }
      }
    }

    // 检查是否存在环
    if (result.length !== graph.nodes.size) {
      console.warn('Topological sort failed: cycle detected');
      return [];
    }

    return result;
  }

  /**
   * 检查任务间是否有依赖关系
   */
  private hasDependency(
    task1: PrimitiveTask,
    task2: PrimitiveTask
  ): boolean {
    // 检查task1的效果是否满足task2的前置条件
    if (task2.preconditions) {
      for (const condition of task2.preconditions) {
        // 简化检查：如果task1的效果可能满足task2的条件，则认为有依赖
        if (task1.effects) {
          for (const effect of task1.effects) {
            if (effect.target === condition.target) {
              return true;
            }
          }
        }
      }
    }
    return false;
  }

  /**
   * 检查任务是否可以合并
   */
  private canMergeTasks(
    tasks: PrimitiveTask[]
  ): boolean {
    if (tasks.length < 2) return false;

    // 检查任务是否具有相同的名称和类型
    const first = tasks[0];
    return tasks.every(task => task.name === first.name && task.action?.type === first.action?.type);
  }

  /**
   * 合并任务组
   */
  private mergeTaskGroup(
    tasks: PrimitiveTask[]
  ): PrimitiveTask {
    const first = tasks[0];
    return {
      id: `merged-${Date.now()}`,
      name: first.name,
      type: 'primitive',
      description: `Merged task: ${tasks.map(t => t.description).join(', ')}`,
      preconditions: first.preconditions,
      effects: first.effects,
      parameters: {
        mergedTasks: tasks.map(t => t.id),
        ...first.parameters
      },
      estimatedCost: tasks.reduce((sum, t) => sum + (t.estimatedCost || 0), 0),
      estimatedDuration: tasks.reduce((sum, t) => sum + (t.estimatedDuration || 0), 0)
    };
  }

  /**
   * 分析资源需求
   */
  private analyzeResourceDemands(
    tasks: PrimitiveTask[],
    _state: WorldState
  ): Map<string, number> {
    const demands = new Map<string, number>();
    for (const task of tasks) {
      // 简化分析：假设每个任务使用一种资源
      const resourceId = `resource-${task.id.charCodeAt(0) % 5}`;
      demands.set(resourceId, (demands.get(resourceId) || 0) + 1);
    }
    return demands;
  }

  /**
   * 调整任务顺序以优化资源使用
   */
  private adjustTaskOrderForResources(
    tasks: PrimitiveTask[],
    resourceDemands: Map<string, number>
  ): PrimitiveTask[] {
    // 基于资源需求的任务排序
    // 目标：平衡资源使用，避免资源竞争
    
    // 1. 计算每个任务的资源使用得分
    const taskScores = new Map<string, number>();
    for (const task of tasks) {
      const resourceId = `resource-${task.id.charCodeAt(0) % 5}`;
      const demand = resourceDemands.get(resourceId) || 1;
      // 资源需求越高的任务优先级越高
      taskScores.set(task.id, demand);
    }
    
    // 2. 按资源使用得分排序，同时保持依赖关系
    const sortedTasks = this.sortTasksByResourceDemand(tasks, taskScores);
    
    return sortedTasks;
  }
  
  /**
   * 按资源需求排序任务，保持依赖关系
   */
  private sortTasksByResourceDemand(
    tasks: PrimitiveTask[],
    scores: Map<string, number>
  ): PrimitiveTask[] {
    // 计算依赖关系
    const dependencies = this.calculateTaskDependencies(tasks);
    
    // 构建任务图
    const graph = this.buildTaskGraph(tasks, dependencies);
    
    // 基于得分的拓扑排序
    const prioritizedTasks = this.prioritizedTopologicalSort(graph, scores);
    
    // 映射回任务对象
    const taskMap = new Map<string, PrimitiveTask>();
    for (const task of tasks) {
      taskMap.set(task.id, task);
    }
    
    return prioritizedTasks.map(id => taskMap.get(id)).filter(Boolean) as PrimitiveTask[];
  }
  
  /**
   * 带优先级的拓扑排序
   */
  private prioritizedTopologicalSort(
    graph: PartialOrderGraph,
    scores: Map<string, number>
  ): string[] {
    // 克隆边集合
    const edges = new Map<string, Set<string>>();
    for (const [node, neighbors] of graph.edges) {
      edges.set(node, new Set(neighbors));
    }
    
    // 计算每个节点的入度
    const inDegree = new Map<string, number>();
    for (const node of graph.nodes) {
      inDegree.set(node, 0);
    }
    for (const neighbors of edges.values()) {
      for (const neighbor of neighbors) {
        inDegree.set(neighbor, (inDegree.get(neighbor) || 0) + 1);
      }
    }
    
    // 初始化优先队列，包含所有入度为0的节点
    // 使用基于得分的优先级
    const queue: string[] = [];
    for (const [node, degree] of inDegree) {
      if (degree === 0) {
        queue.push(node);
      }
    }
    
    // 按得分排序队列
    queue.sort((a, b) => (scores.get(b) || 0) - (scores.get(a) || 0));
    
    const result: string[] = [];
    
    // 执行拓扑排序
    while (queue.length > 0) {
      const node = queue.shift()!;
      result.push(node);
      
      // 遍历当前节点的所有邻居
      const neighbors = edges.get(node) || new Set();
      for (const neighbor of neighbors) {
        // 减少邻居的入度
        inDegree.set(neighbor, (inDegree.get(neighbor) || 0) - 1);
        
        // 如果邻居的入度变为0，加入队列
        if (inDegree.get(neighbor) === 0) {
          queue.push(neighbor);
          // 重新排序队列以保持优先级
          queue.sort((a, b) => (scores.get(b) || 0) - (scores.get(a) || 0));
        }
      }
    }
    
    // 检查是否存在环
    if (result.length !== graph.nodes.size) {
      console.warn('Prioritized topological sort failed: cycle detected');
      return [];
    }
    
    return result;
  }

  /**
   * 执行计划
   */
  async executePlan(
    plan: Plan,
    context: ExecutionContext
  ): Promise<{ success: boolean; results: TaskResult[] }> {
    const results: TaskResult[] = [];

    for (const task of plan.linearizedSequence || []) {
      const result = await this.executeTask(task, context);
      results.push(result);

      if (!result.success && !task.optional) {
        // 非可选任务失败，尝试重新规划
        if (this.config.enableReplanning) {
          const regeneratedPlan = await this.tryRegeneratePlan(plan, task, context);
          if (regeneratedPlan) {
            return this.executePlan(regeneratedPlan, context);
          }
        }

        return { success: false, results };
      }

      // 更新上下文
      context.executionHistory.push(result);
    }

    return { success: true, results };
  }

  /**
   * 执行单个任务
   */
  private async executeTask(
    task: PrimitiveTask,
    context: ExecutionContext
  ): Promise<TaskResult> {
    const maxRetries = task.retries || 0;

    for (let i = 0; i <= maxRetries; i++) {
      try {
        const timeout = task.timeout || 30000;

        if (!task.execute) {
          throw new Error(`Task ${task.id} has no execute function`);
        }

        const result = await Promise.race([
          task.execute(context),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('Task timeout')), timeout)
          )
        ]);

        return result;
      } catch (error) {
        if (i === maxRetries) {
          return {
            success: false,
            error: error as Error
          };
        }

        // 等待后重试
        await delay(1000 * Math.pow(2, i));
      }
    }

    return { success: false };
  }

  /**
   * 尝试重新生成计划
   */
  private async tryRegeneratePlan(
    currentPlan: Plan,
    failedTask: PrimitiveTask,
    context: ExecutionContext
  ): Promise<Plan | null> {
    // 找到失败任务的索引
    const failedIndex = currentPlan.linearizedSequence?.findIndex(
      t => t.id === failedTask.id
    ) || -1;

    if (failedIndex === -1) {
      return null;
    }

    // 尝试跳过失败任务（如果是可选的）
    if (failedTask.optional) {
      const newSequence = currentPlan.linearizedSequence?.filter(
        (_, index) => index !== failedIndex
      ) || [];

      // 验证剩余任务是否仍然可以达到目标
      if (!currentPlan.goal) {
        return null;
      }

      const canAchieveGoal = await this.verifyPlanAchievesGoal(
        newSequence,
        context.worldState,
        currentPlan.goal
      );

      if (canAchieveGoal) {
        return {
          ...currentPlan,
          linearizedSequence: newSequence,
          totalCost: this.recalculateCost(newSequence),
          estimatedDuration: this.recalculateDuration(newSequence)
        };
      }
    }

    return null;
  }

  /**
   * 验证计划是否可以达到目标
   */
  private async verifyPlanAchievesGoal(
    sequence: PrimitiveTask[],
    initialState: WorldState,
    goal: Goal
  ): Promise<boolean> {
    let state = { ...initialState };

    // 模拟执行计划
    for (const task of sequence) {
      // 检查前置条件
      if (task.preconditions && !this.checkConditions(task.preconditions, state)) {
        return false;
      }

      // 应用效果
      if (task.effects) {
        state = this.applyEffects(task.effects, state);
      }
    }

    // 检查目标条件
    return this.checkConditions(goal.conditions, state);
  }

  /**
   * 重新计算成本
   */
  private recalculateCost(sequence: PrimitiveTask[]): number {
    return sequence.reduce((sum, task) => sum + (task.estimatedCost || 1), 0);
  }

  /**
   * 重新计算预估时间
   */
  private recalculateDuration(sequence: PrimitiveTask[]): number {
    return sequence.reduce((sum, task) => sum + (task.estimatedDuration || 1000), 0);
  }

  /**
   * 获取统计信息
   */
  getStatistics(): PlanningStatistics {
    return { ...this.statistics };
  }

  /**
   * 更新配置
   */
  updateConfig(config: Partial<PlanningConfig>): void {
    this.config = { ...this.config, ...config };
  }
}

export default HTNPlanner;
