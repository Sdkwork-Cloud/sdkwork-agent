/**
 * MCTS (Monte Carlo Tree Search) 决策引擎
 * 
 * 实现AlphaGo/AlphaZero使用的核心决策算法，结合：
 * 1. UCB1 (Upper Confidence Bound) 选择策略
 * 2. 树节点扩展与剪枝
 * 3. 随机模拟 (Rollout)
 * 4. 反向传播 (Backpropagation)
 * 5. 并行模拟支持
 * 
 * 适用于复杂决策场景：工具选择、多步规划、策略优化
 */

export interface MCTSConfig {
  /** 探索参数 C (UCB1公式中的探索常数) */
  explorationConstant: number;
  /** 最大迭代次数 */
  maxIterations: number;
  /** 单次模拟最大深度 */
  maxSimulationDepth: number;
  /** 模拟超时时间(ms) */
  timeout: number;
  /** 并行模拟数量 */
  parallelSimulations: number;
  /** 温度参数 (控制探索vs利用) */
  temperature: number;
  /** 是否使用渐进式拓宽 */
  useProgressiveWidening: boolean;
  /** 渐进式拓宽参数 */
  wideningParameter: number;
  /** 是否使用RAVE (Rapid Action Value Estimation) */
  useRAVE: boolean;
  /** RAVE折扣因子 */
  raveDiscount: number;
  /** 是否启用虚拟损失 (用于并行化) */
  useVirtualLoss: boolean;
  /** 虚拟损失值 */
  virtualLossValue: number;
  /** 节点扩展阈值 (访问次数达到此值才扩展) */
  expansionThreshold: number;
  /** 是否使用先验知识 */
  usePriorKnowledge: boolean;
  /** 先验知识权重 */
  priorWeight: number;
}

export interface DecisionState {
  /** 状态唯一标识 */
  id: string;
  /** 状态特征向量 (用于神经网络的输入) */
  features?: number[];
  /** 状态描述 */
  description?: string;
  /** 是否为终止状态 */
  isTerminal: boolean;
  /** 终止时的奖励值 */
  terminalReward?: number;
  /** 状态深度 */
  depth: number;
  /** 父状态ID */
  parentId?: string;
  /** 到达此状态的动作 */
  action?: Action;
}

export interface Action {
  /** 动作唯一标识 */
  id: string;
  /** 动作名称 */
  name: string;
  /** 动作描述 */
  description?: string;
  /** 动作参数 */
  parameters?: Record<string, unknown>;
  /** 先验概率 (来自策略网络或启发式) */
  priorProbability?: number;
  /** 预估成本 */
  estimatedCost?: number;
}

export interface SimulationResult {
  /** 累积奖励 */
  reward: number;
  /** 模拟路径 */
  path: string[];
  /** 模拟深度 */
  depth: number;
  /** 是否到达终止状态 */
  isTerminal: boolean;
  /** 额外信息 */
  metadata?: Record<string, unknown>;
}

export interface DecisionResult {
  /** 选中的动作 */
  selectedAction: Action;
  /** 动作置信度 (访问次数占比) */
  confidence: number;
  /** 预估价值 */
  estimatedValue: number;
  /** 访问次数 */
  visitCount: number;
  /** 所有动作的统计 */
  actionStats: ActionStats[];
  /** 搜索树统计 */
  treeStats: TreeStats;
  /** 决策耗时(ms) */
  decisionTime: number;
  /** 完整搜索树 (可选) */
  searchTree?: TreeNode;
}

export interface ActionStats {
  action: Action;
  visitCount: number;
  totalReward: number;
  meanReward: number;
  ucbScore: number;
  priorProbability: number;
}

export interface TreeStats {
  totalNodes: number;
  totalVisits: number;
  maxDepth: number;
  averageDepth: number;
  leafNodes: number;
}

/**
 * MCTS树节点
 */
class TreeNode {
  state: DecisionState;
  parent: TreeNode | null;
  children: Map<string, TreeNode>;
  actions: Action[];
  untriedActions: Action[];
  
  // 统计信息
  visitCount: number;
  totalReward: number;
  
  // RAVE统计
  raveVisitCount: number;
  raveTotalReward: number;
  
  // 虚拟损失 (用于并行化)
  virtualLoss: number;
  
  // 动作统计
  actionRewards: Map<string, number>;
  actionVisits: Map<string, number>;

  constructor(state: DecisionState, parent: TreeNode | null = null, actions: Action[] = []) {
    this.state = state;
    this.parent = parent;
    this.children = new Map();
    this.actions = actions;
    this.untriedActions = [...actions];
    
    this.visitCount = 0;
    this.totalReward = 0;
    this.raveVisitCount = 0;
    this.raveTotalReward = 0;
    this.virtualLoss = 0;
    
    this.actionRewards = new Map();
    this.actionVisits = new Map();
  }

  /**
   * 计算UCB1分数
   * 
   * 边界条件处理：
   * - visitCount === 0: 返回 Infinity（鼓励探索）
   * - parentVisits <= 0: 只返回 exploitation（无探索项）
   * - parentVisits === 1: Math.log(1) === 0，探索项为 0
   */
  getUCBScore(explorationConstant: number, parentVisits: number): number {
    if (this.visitCount === 0) {
      return Infinity;
    }
    
    const exploitation = this.totalReward / this.visitCount;
    
    // 处理 parentVisits 边界条件
    if (parentVisits <= 0) {
      return exploitation - this.virtualLoss;
    }
    
    // 安全计算探索项
    const logParentVisits = Math.log(parentVisits);
    const exploration = explorationConstant * Math.sqrt(logParentVisits / this.visitCount);
    
    return exploitation + exploration - this.virtualLoss;
  }

  /**
   * 获取RAVE分数
   */
  getRAVEScore(actionId: string, raveDiscount: number): number {
    const actionVisits = this.actionVisits.get(actionId) || 0;
    const actionReward = this.actionRewards.get(actionId) || 0;
    
    if (actionVisits === 0) {
      return 0;
    }
    
    return (actionReward / actionVisits) * raveDiscount;
  }

  /**
   * 是否完全扩展
   */
  isFullyExpanded(): boolean {
    return this.untriedActions.length === 0;
  }

  /**
   * 是否为叶子节点
   */
  isLeaf(): boolean {
    return this.children.size === 0;
  }

  /**
   * 添加虚拟损失
   */
  addVirtualLoss(loss: number): void {
    this.virtualLoss += loss;
  }

  /**
   * 移除虚拟损失
   */
  removeVirtualLoss(loss: number): void {
    this.virtualLoss = Math.max(0, this.virtualLoss - loss);
  }
}

/**
 * 状态评估器接口
 */
export interface StateEvaluator {
  /** 评估状态价值 */
  evaluate(state: DecisionState): Promise<number>;
  /** 获取动作先验概率 */
  getActionPrior(state: DecisionState, actions: Action[]): Promise<Map<string, number>>;
}

/**
 * 模拟策略接口
 */
export interface SimulationPolicy {
  /** 选择动作进行模拟 */
  selectAction(state: DecisionState, availableActions: Action[]): Promise<Action>;
  /** 评估终止状态奖励 */
  evaluateTerminal(state: DecisionState): number;
}

/**
 * MCTS决策引擎
 */
export class MCTSDecisionEngine {
  private config: MCTSConfig;
  private rootNode: TreeNode | null = null;
  private stateEvaluator?: StateEvaluator;
  private simulationPolicy: SimulationPolicy;

  constructor(
    simulationPolicy: SimulationPolicy,
    config?: Partial<MCTSConfig>,
    stateEvaluator?: StateEvaluator
  ) {
    this.config = {
      explorationConstant: Math.sqrt(2),
      maxIterations: 1000,
      maxSimulationDepth: 50,
      timeout: 5000,
      parallelSimulations: 1,
      temperature: 1.0,
      useProgressiveWidening: false,
      wideningParameter: 0.5,
      useRAVE: false,
      raveDiscount: 0.5,
      useVirtualLoss: false,
      virtualLossValue: 1.0,
      expansionThreshold: 1,
      usePriorKnowledge: false,
      priorWeight: 0.5,
      ...config
    };

    this.simulationPolicy = simulationPolicy;
    this.stateEvaluator = stateEvaluator;
  }

  /**
   * 执行决策
   */
  async decide(
    initialState: DecisionState,
    availableActions: Action[]
  ): Promise<DecisionResult> {
    const startTime = Date.now();
    
    // 初始化根节点
    this.rootNode = new TreeNode(initialState, null, availableActions);
    
    // 如果有先验知识，初始化动作先验概率
    if (this.config.usePriorKnowledge && this.stateEvaluator) {
      const priors = await this.stateEvaluator.getActionPrior(initialState, availableActions);
      for (const action of availableActions) {
        action.priorProbability = priors.get(action.id) || 1 / availableActions.length;
      }
    }

    // 执行MCTS搜索
    let iterations = 0;
    const timeoutMs = this.config.timeout;
    
    while (iterations < this.config.maxIterations && (Date.now() - startTime) < timeoutMs) {
      // 1. 选择
      const selectedNode = this.select(this.rootNode);
      
      // 2. 扩展
      let expandedNode = selectedNode;
      if (!selectedNode.state.isTerminal && selectedNode.visitCount >= this.config.expansionThreshold) {
        expandedNode = await this.expand(selectedNode);
      }
      
      // 3. 模拟
      const simulationResults: SimulationResult[] = [];
      
      if (this.config.parallelSimulations > 1) {
        // 并行模拟
        const promises = Array(this.config.parallelSimulations)
          .fill(null)
          .map(() => this.simulate(expandedNode));
        simulationResults.push(...await Promise.all(promises));
      } else {
        simulationResults.push(await this.simulate(expandedNode));
      }
      
      // 4. 反向传播
      for (const result of simulationResults) {
        this.backpropagate(expandedNode, result);
      }
      
      iterations++;
    }

    // 选择最佳动作
    const decisionTime = Date.now() - startTime;
    return this.selectBestAction(decisionTime);
  }

  /**
   * 选择阶段：使用UCB1策略选择子节点
   */
  private select(node: TreeNode): TreeNode {
    let current = node;
    
    while (!current.isLeaf() && !current.state.isTerminal) {
      // 渐进式拓宽
      if (this.config.useProgressiveWidening && !current.isFullyExpanded()) {
        const shouldExpand = Math.pow(current.visitCount, this.config.wideningParameter) > 
                            current.children.size;
        if (shouldExpand) {
          return current;
        }
      }
      
      // 选择UCB分数最高的子节点
      let bestChild: TreeNode | null = null;
      let bestScore = -Infinity;
      
      for (const child of current.children.values()) {
        let score = child.getUCBScore(this.config.explorationConstant, current.visitCount);
        
        // 结合RAVE
        if (this.config.useRAVE) {
          const raveScore = current.getRAVEScore(child.state.action!.id, this.config.raveDiscount);
          const beta = Math.sqrt(this.config.raveDiscount / (3 * child.visitCount + this.config.raveDiscount));
          score = (1 - beta) * score + beta * raveScore;
        }
        
        // 结合先验知识
        if (this.config.usePriorKnowledge && child.state.action?.priorProbability) {
          const priorBonus = this.config.priorWeight * child.state.action.priorProbability * 
                           Math.sqrt(current.visitCount) / (1 + child.visitCount);
          score += priorBonus;
        }
        
        if (score > bestScore) {
          bestScore = score;
          bestChild = child;
        }
      }
      
      if (bestChild) {
        // 添加虚拟损失
        if (this.config.useVirtualLoss) {
          bestChild.addVirtualLoss(this.config.virtualLossValue);
        }
        current = bestChild;
      } else {
        break;
      }
    }
    
    return current;
  }

  /**
   * 扩展阶段：添加新子节点
   */
  private async expand(node: TreeNode): Promise<TreeNode> {
    if (node.untriedActions.length === 0 || node.state.isTerminal) {
      return node;
    }
    
    // 选择未尝试的动作
    const actionIndex = Math.floor(Math.random() * node.untriedActions.length);
    const action = node.untriedActions.splice(actionIndex, 1)[0];
    
    // 创建新状态
    const newState = await this.applyAction(node.state, action);
    
    // 获取新状态的可用动作
    const newActions = await this.getAvailableActions(newState);
    
    // 创建子节点
    const childNode = new TreeNode(newState, node, newActions);
    node.children.set(action.id, childNode);
    
    return childNode;
  }

  /**
   * 模拟阶段：随机模拟到终止状态
   */
  private async simulate(node: TreeNode): Promise<SimulationResult> {
    let currentState = node.state;
    let depth = 0;
    const path: string[] = [currentState.id];
    let totalReward = 0;
    
    while (depth < this.config.maxSimulationDepth && !currentState.isTerminal) {
      const actions = await this.getAvailableActions(currentState);
      
      if (actions.length === 0) {
        break;
      }
      
      // 使用模拟策略选择动作
      const action = await this.simulationPolicy.selectAction(currentState, actions);
      currentState = await this.applyAction(currentState, action);
      path.push(currentState.id);
      
      // 累加中间奖励
      if (currentState.terminalReward !== undefined) {
        totalReward += currentState.terminalReward * Math.pow(0.99, depth);
      }
      
      depth++;
    }
    
    // 评估终止状态
    let finalReward = 0;
    if (currentState.isTerminal && currentState.terminalReward !== undefined) {
      finalReward = currentState.terminalReward;
    } else if (this.stateEvaluator) {
      finalReward = await this.stateEvaluator.evaluate(currentState);
    } else {
      finalReward = this.simulationPolicy.evaluateTerminal(currentState);
    }
    
    // 折扣累积奖励
    totalReward += finalReward * Math.pow(0.99, depth);
    
    return {
      reward: totalReward,
      path,
      depth,
      isTerminal: currentState.isTerminal
    };
  }

  /**
   * 反向传播阶段：更新节点统计
   */
  private backpropagate(node: TreeNode, result: SimulationResult): void {
    let current: TreeNode | null = node;
    const visitedActions = new Set<string>();
    
    while (current !== null) {
      // 更新节点统计
      current.visitCount++;
      current.totalReward += result.reward;
      
      // 移除虚拟损失
      if (this.config.useVirtualLoss) {
        current.removeVirtualLoss(this.config.virtualLossValue);
      }
      
      // 更新RAVE统计
      if (this.config.useRAVE && current.state.action) {
        const actionId = current.state.action.id;
        if (!visitedActions.has(actionId)) {
          current.raveVisitCount++;
          current.raveTotalReward += result.reward;
          visitedActions.add(actionId);
        }
        
        // 更新动作统计
        for (const actionId of visitedActions) {
          const currentVisits = current.actionVisits.get(actionId) || 0;
          const currentReward = current.actionRewards.get(actionId) || 0;
          current.actionVisits.set(actionId, currentVisits + 1);
          current.actionRewards.set(actionId, currentReward + result.reward);
        }
      }
      
      current = current.parent;
    }
  }

  /**
   * 选择最佳动作
   */
  private selectBestAction(decisionTime: number): DecisionResult {
    if (!this.rootNode) {
      throw new Error('Root node is null');
    }
    
    const actionStats: ActionStats[] = [];
    let bestAction: Action | null = null;
    let bestScore = -Infinity;
    let totalVisits = 0;
    
    for (const [actionId, childNode] of this.rootNode.children) {
      const action = this.rootNode.actions.find(a => a.id === actionId)!;
      const visits = childNode.visitCount;
      const meanReward = visits > 0 ? childNode.totalReward / visits : 0;
      const ucbScore = childNode.getUCBScore(this.config.explorationConstant, this.rootNode.visitCount);
      
      totalVisits += visits;
      
      actionStats.push({
        action,
        visitCount: visits,
        totalReward: childNode.totalReward,
        meanReward,
        ucbScore,
        priorProbability: action.priorProbability || 1 / this.rootNode.actions.length
      });
      
      // 使用温度参数进行探索
      const score = visits * Math.pow(meanReward + 1, 1 / this.config.temperature);
      
      if (score > bestScore) {
        bestScore = score;
        bestAction = action;
      }
    }
    
    if (!bestAction) {
      // 如果没有子节点，随机选择
      bestAction = this.rootNode.actions[0];
    }
    
    // 计算树统计
    const treeStats = this.calculateTreeStats(this.rootNode);
    
    return {
      selectedAction: bestAction,
      confidence: totalVisits > 0 ? 
        (this.rootNode.children.get(bestAction.id)?.visitCount || 0) / totalVisits : 0,
      estimatedValue: this.rootNode.children.get(bestAction.id)?.totalReward || 0,
      visitCount: this.rootNode.children.get(bestAction.id)?.visitCount || 0,
      actionStats: actionStats.sort((a, b) => b.visitCount - a.visitCount),
      treeStats,
      decisionTime,
      searchTree: this.rootNode
    };
  }

  /**
   * 计算树统计
   */
  private calculateTreeStats(node: TreeNode): TreeStats {
    let totalNodes = 0;
    let totalVisits = 0;
    let maxDepth = 0;
    let totalDepth = 0;
    let leafNodes = 0;
    
    const traverse = (n: TreeNode, depth: number) => {
      totalNodes++;
      totalVisits += n.visitCount;
      maxDepth = Math.max(maxDepth, depth);
      totalDepth += depth;
      
      if (n.isLeaf()) {
        leafNodes++;
      }
      
      for (const child of n.children.values()) {
        traverse(child, depth + 1);
      }
    };
    
    traverse(node, 0);
    
    return {
      totalNodes,
      totalVisits,
      maxDepth,
      averageDepth: totalNodes > 0 ? totalDepth / totalNodes : 0,
      leafNodes
    };
  }

  /**
   * 应用动作到状态
   * 子类应重写此方法以实现具体的状态转换逻辑
   */
  protected async applyAction(state: DecisionState, action: Action): Promise<DecisionState> {
    // 子类应重写此方法
    return {
      id: `${state.id}-${action.id}`,
      depth: state.depth + 1,
      isTerminal: false,
      parentId: state.id,
      action
    };
  }

  /**
   * 获取可用动作
   * 子类应重写此方法以提供可用的动作列表
   */
  protected async getAvailableActions(_state: DecisionState): Promise<Action[]> {
    // 子类应重写此方法
    return [];
  }

  /**
   * 更新配置
   */
  updateConfig(newConfig: Partial<MCTSConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * 获取当前配置
   */
  getConfig(): MCTSConfig {
    return { ...this.config };
  }

  /**
   * 重置引擎
   */
  reset(): void {
    this.rootNode = null;
  }
}

/**
 * 默认模拟策略
 */
export class DefaultSimulationPolicy implements SimulationPolicy {
  async selectAction(_state: DecisionState, availableActions: Action[]): Promise<Action> {
    // 随机选择
    return availableActions[Math.floor(Math.random() * availableActions.length)];
  }

  evaluateTerminal(state: DecisionState): number {
    return state.terminalReward || 0;
  }
}

/**
 * 启发式模拟策略
 */
export class HeuristicSimulationPolicy implements SimulationPolicy {
  private heuristic: (state: DecisionState, action: Action) => number;

  constructor(heuristic: (state: DecisionState, action: Action) => number) {
    this.heuristic = heuristic;
  }

  async selectAction(state: DecisionState, availableActions: Action[]): Promise<Action> {
    // 使用启发式函数选择最佳动作
    let bestAction = availableActions[0];
    let bestScore = -Infinity;
    
    for (const action of availableActions) {
      const score = this.heuristic(state, action);
      if (score > bestScore) {
        bestScore = score;
        bestAction = action;
      }
    }
    
    return bestAction;
  }

  evaluateTerminal(state: DecisionState): number {
    return state.terminalReward || 0;
  }
}

/**
 * 神经网络评估器
 */
export class NeuralNetworkEvaluator implements StateEvaluator {
  private valueNetwork: (state: DecisionState) => Promise<number>;
  private policyNetwork: (state: DecisionState, actions: Action[]) => Promise<Map<string, number>>;

  constructor(
    valueNetwork: (state: DecisionState) => Promise<number>,
    policyNetwork: (state: DecisionState, actions: Action[]) => Promise<Map<string, number>>
  ) {
    this.valueNetwork = valueNetwork;
    this.policyNetwork = policyNetwork;
  }

  async evaluate(state: DecisionState): Promise<number> {
    return this.valueNetwork(state);
  }

  async getActionPrior(state: DecisionState, actions: Action[]): Promise<Map<string, number>> {
    return this.policyNetwork(state, actions);
  }
}

/**
 * MCTS工厂
 */
export class MCTSFactory {
  static createDefault(): MCTSDecisionEngine {
    return new MCTSDecisionEngine(new DefaultSimulationPolicy());
  }

  static createWithHeuristic(heuristic: (state: DecisionState, action: Action) => number): MCTSDecisionEngine {
    return new MCTSDecisionEngine(new HeuristicSimulationPolicy(heuristic));
  }

  static createWithNeuralNetworks(
    valueNetwork: (state: DecisionState) => Promise<number>,
    policyNetwork: (state: DecisionState, actions: Action[]) => Promise<Map<string, number>>,
    config?: Partial<MCTSConfig>
  ): MCTSDecisionEngine {
    const evaluator = new NeuralNetworkEvaluator(valueNetwork, policyNetwork);
    return new MCTSDecisionEngine(
      new DefaultSimulationPolicy(),
      {
        usePriorKnowledge: true,
        maxIterations: 800,
        parallelSimulations: 4,
        ...config
      },
      evaluator
    );
  }

  static createFast(): MCTSDecisionEngine {
    return new MCTSDecisionEngine(new DefaultSimulationPolicy(), {
      maxIterations: 100,
      timeout: 1000,
      parallelSimulations: 1,
      explorationConstant: 1.0
    });
  }

  static createThorough(): MCTSDecisionEngine {
    return new MCTSDecisionEngine(new DefaultSimulationPolicy(), {
      maxIterations: 5000,
      timeout: 30000,
      parallelSimulations: 8,
      useRAVE: true,
      useProgressiveWidening: true,
      explorationConstant: Math.sqrt(2)
    });
  }
}

export default MCTSDecisionEngine;
