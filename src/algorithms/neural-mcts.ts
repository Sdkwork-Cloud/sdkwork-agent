/**
 * Neural MCTS (Neural Monte Carlo Tree Search)
 *
 * 结合神经网络和蒙特卡洛树搜索的决策算法
 * 参考: AlphaZero, MuZero
 *
 * 核心思想:
 * 1. 使用神经网络评估状态价值 (Value Network)
 * 2. 使用神经网络指导动作选择 (Policy Network)
 * 3. 使用 MCTS 进行多步规划
 * 4. 通过自我对弈训练神经网络
 */

import { EventEmitter } from '../utils/event-emitter.js';

// ============================================
// 类型定义
// ============================================

export interface NeuralMCTSConfig {
  /** 模拟次数 */
  numSimulations: number;
  /** UCB 探索常数 */
  cPuct: number;
  /** 温度参数 */
  temperature: number;
  /** 价值网络权重 */
  valueWeight: number;
  /** 先验概率权重 */
  priorWeight: number;
  /** 神经网络评估阈值 */
  neuralThreshold: number;
  /** 是否使用价值网络 */
  useValueNetwork: boolean;
  /** 是否使用策略网络 */
  usePolicyNetwork: boolean;
  /** 状态维度 */
  stateDimension: number;
  /** 动作空间大小 */
  actionSpace: number;
  /** 隐藏层维度 */
  hiddenDimension: number;
  /** 学习率 */
  learningRate: number;
  /** 折扣因子 */
  discountFactor: number;
}

export interface NeuralNetwork {
  /** 评估状态价值 */
  evaluate(state: number[]): Promise<NetworkOutput>;
  /** 训练网络 */
  train(examples: TrainingExample[]): Promise<TrainingStats>;
  /** 保存模型 */
  save(path: string): Promise<void>;
  /** 加载模型 */
  load(path: string): Promise<void>;
}

export interface NetworkOutput {
  /** 状态价值 [-1, 1] */
  value: number;
  /** 动作概率分布 */
  policy: number[];
  /** 隐藏状态表示 */
  hiddenState?: number[];
}

export interface TrainingExample {
  /** 状态 */
  state: number[];
  /** 目标策略 */
  targetPolicy: number[];
  /** 目标价值 */
  targetValue: number;
  /** 奖励 */
  reward: number;
}

export interface TrainingStats {
  loss: number;
  valueLoss: number;
  policyLoss: number;
  accuracy: number;
}

export interface MCTSNode {
  /** 节点ID */
  id: string;
  /** 父节点 */
  parent: MCTSNode | null;
  /** 子节点 */
  children: Map<number, MCTSNode>;
  /** 动作索引 */
  action: number;
  /** 访问次数 */
  visitCount: number;
  /** 累计价值 */
  valueSum: number;
  /** 先验概率 */
  prior: number;
  /** 状态表示 */
  state: number[];
  /** 是否为终止状态 */
  isTerminal: boolean;
  /** 是否已展开 */
  isExpanded: boolean;
}

export interface SearchResult {
  /** 最佳动作 */
  bestAction: number;
  /** 动作概率分布 */
  actionProbabilities: number[];
  /** 根节点价值 */
  rootValue: number;
  /** 访问次数分布 */
  visitCounts: number[];
  /** 搜索树深度 */
  treeDepth: number;
  /** 搜索时间 (ms) */
  searchTime: number;
}

export interface DecisionState {
  /** 状态特征向量 */
  features: number[];
  /** 可用动作掩码 */
  validActions: boolean[];
  /** 当前玩家 */
  currentPlayer: number;
  /** 回合数 */
  step: number;
  /** 元数据 */
  metadata?: Record<string, unknown>;
}

// ============================================
// 神经网络实现 (简化版)
// ============================================

export class SimpleNeuralNetwork implements NeuralNetwork {
  private config: NeuralMCTSConfig;
  private valueWeights: number[][];
  private valueBias: number[];
  private policyWeights: number[][];
  private policyBias: number[];
  private hiddenWeights: number[][];
  private hiddenBias: number[];

  constructor(config: NeuralMCTSConfig) {
    this.config = config;

    // 初始化价值网络参数
    this.valueWeights = this.xavierInit(config.hiddenDimension, 1);
    this.valueBias = [0];

    // 初始化策略网络参数
    this.policyWeights = this.xavierInit(config.hiddenDimension, config.actionSpace);
    this.policyBias = new Array(config.actionSpace).fill(0);

    // 初始化隐藏层参数
    this.hiddenWeights = this.xavierInit(config.stateDimension, config.hiddenDimension);
    this.hiddenBias = new Array(config.hiddenDimension).fill(0);
  }

  /**
   * Xavier 初始化
   */
  private xavierInit(inputDim: number, outputDim: number): number[][] {
    const scale = Math.sqrt(2.0 / (inputDim + outputDim));
    return Array(outputDim)
      .fill(null)
      .map(() =>
        Array(inputDim)
          .fill(0)
          .map(() => (Math.random() * 2 - 1) * scale)
      );
  }

  /**
   * 评估状态
   */
  async evaluate(state: number[]): Promise<NetworkOutput> {
    // 前向传播
    const hidden = this.relu(this.linearForward(state, this.hiddenWeights, this.hiddenBias));

    // 价值预测
    const valueRaw = this.linearForward(hidden, this.valueWeights, this.valueBias)[0];
    const value = Math.tanh(valueRaw);

    // 策略预测
    const policyLogits = this.linearForward(hidden, this.policyWeights, this.policyBias);
    const policy = this.softmax(policyLogits);

    return { value, policy, hiddenState: hidden };
  }

  /**
   * 训练网络
   */
  async train(examples: TrainingExample[]): Promise<TrainingStats> {
    let totalLoss = 0;
    let valueLossSum = 0;
    let policyLossSum = 0;
    let correct = 0;

    for (const example of examples) {
      // 前向传播
      const output = await this.evaluate(example.state);

      // 计算损失
      const valueError = output.value - example.targetValue;
      const valueLoss = valueError * valueError;

      let policyLoss = 0;
      for (let i = 0; i < output.policy.length; i++) {
        const targetProb = example.targetPolicy[i] || 0;
        // 交叉熵损失
        policyLoss -= targetProb * Math.log(Math.max(output.policy[i], 1e-8));
      }

      const loss = valueLoss + policyLoss;
      totalLoss += loss;
      valueLossSum += valueLoss;
      policyLossSum += policyLoss;

      // 简单的梯度下降更新 (简化版)
      this.updateWeights(example, output);

      // 计算准确率
      const predictedAction = output.policy.indexOf(Math.max(...output.policy));
      const targetAction = example.targetPolicy.indexOf(Math.max(...example.targetPolicy));
      if (predictedAction === targetAction) {
        correct++;
      }
    }

    const n = examples.length;
    return {
      loss: totalLoss / n,
      valueLoss: valueLossSum / n,
      policyLoss: policyLossSum / n,
      accuracy: correct / n,
    };
  }

  /**
   * 更新权重 (简化版 SGD)
   */
  private updateWeights(example: TrainingExample, output: NetworkOutput): void {
    const lr = this.config.learningRate;

    // 简化的权重更新
    // 实际实现应该使用完整的反向传播
    for (let i = 0; i < this.valueWeights.length; i++) {
      for (let j = 0; j < this.valueWeights[i].length; j++) {
        const error = output.value - example.targetValue;
        this.valueWeights[i][j] -= lr * error * 0.01;
      }
    }

    for (let i = 0; i < this.policyWeights.length; i++) {
      for (let j = 0; j < this.policyWeights[i].length; j++) {
        const targetProb = example.targetPolicy[i] || 0;
        const error = output.policy[i] - targetProb;
        this.policyWeights[i][j] -= lr * error * 0.01;
      }
    }
  }

  /**
   * 线性前向传播
   */
  private linearForward(input: number[], weights: number[][], bias: number[]): number[] {
    return weights.map((row, i) => {
      const sum = row.reduce((acc, w, j) => acc + w * (input[j] || 0), 0);
      return sum + bias[i];
    });
  }

  /**
   * ReLU 激活
   */
  private relu(x: number[]): number[] {
    return x.map(v => Math.max(0, v));
  }

  /**
   * Softmax 激活
   */
  private softmax(x: number[]): number[] {
    const maxVal = Math.max(...x);
    const expX = x.map(v => Math.exp(v - maxVal));
    const sumExp = expX.reduce((a, b) => a + b, 0);
    return expX.map(v => v / sumExp);
  }

  /**
   * 保存模型
   */
  async save(path: string): Promise<void> {
    const model = {
      valueWeights: this.valueWeights,
      valueBias: this.valueBias,
      policyWeights: this.policyWeights,
      policyBias: this.policyBias,
      hiddenWeights: this.hiddenWeights,
      hiddenBias: this.hiddenBias,
    };

    // Node.js 环境 - 使用文件系统
    const fs = await import('fs/promises');
    await fs.writeFile(path, JSON.stringify(model));
  }

  /**
   * 加载模型
   */
  async load(path: string): Promise<void> {
    let data: string;

    // Node.js 环境 - 使用文件系统
    const fs = await import('fs/promises');
    data = await fs.readFile(path, 'utf-8');

    if (!data) throw new Error('Model not found');

    const model = JSON.parse(data);
    this.valueWeights = model.valueWeights;
    this.valueBias = model.valueBias;
    this.policyWeights = model.policyWeights;
    this.policyBias = model.policyBias;
    this.hiddenWeights = model.hiddenWeights;
    this.hiddenBias = model.hiddenBias;
  }
}

// ============================================
// Neural MCTS 实现
// ============================================

export class NeuralMCTS extends EventEmitter {
  private config: NeuralMCTSConfig;
  private network: NeuralNetwork;
  private rootNode: MCTSNode | null = null;
  private trainingExamples: TrainingExample[] = [];

  constructor(config: Partial<NeuralMCTSConfig> = {}) {
    super();

    this.config = {
      numSimulations: 800,
      cPuct: 1.5,
      temperature: 1.0,
      valueWeight: 1.0,
      priorWeight: 1.0,
      neuralThreshold: 0.8,
      useValueNetwork: true,
      usePolicyNetwork: true,
      stateDimension: 128,
      actionSpace: 10,
      hiddenDimension: 256,
      learningRate: 0.001,
      discountFactor: 0.99,
      ...config,
    };

    // 创建神经网络
    this.network = new SimpleNeuralNetwork(this.config);
  }

  /**
   * 执行搜索
   */
  async search(state: DecisionState): Promise<SearchResult> {
    const startTime = Date.now();

    // 创建根节点
    this.rootNode = this.createNode(null, -1, state.features);

    // 使用神经网络评估根节点
    if (this.config.useValueNetwork || this.config.usePolicyNetwork) {
      const networkOutput = await this.network.evaluate(state.features);
      this.rootNode.prior = 1.0;

      // 展开根节点
      await this.expandNode(this.rootNode, state, networkOutput);
    }

    // 执行 MCTS 模拟
    for (let i = 0; i < this.config.numSimulations; i++) {
      // 选择
      const selectedNode = this.select(this.rootNode);

      // 扩展和评估
      const value = await this.expandAndEvaluate(selectedNode, state);

      // 回溯
      this.backpropagate(selectedNode, value);

      // 触发进度事件
      if ((i + 1) % 100 === 0) {
        this.emit('searchProgress', {
          simulation: i + 1,
          totalSimulations: this.config.numSimulations,
        });
      }
    }

    // 计算动作概率
    const actionProbabilities = this.getActionProbabilities(this.rootNode);
    const visitCounts = this.getVisitCounts(this.rootNode);
    const bestAction = this.selectBestAction(actionProbabilities);

    const searchTime = Date.now() - startTime;

    // 保存训练样本
    this.saveTrainingExample(state.features, actionProbabilities, this.rootNode);

    return {
      bestAction,
      actionProbabilities,
      rootValue: this.rootNode.valueSum / Math.max(1, this.rootNode.visitCount),
      visitCounts,
      treeDepth: this.calculateTreeDepth(this.rootNode),
      searchTime,
    };
  }

  /**
   * 选择节点 (UCB)
   */
  private select(node: MCTSNode): MCTSNode {
    while (node.isExpanded && !node.isTerminal) {
      const bestChild = this.selectBestChild(node);
      if (!bestChild) break;
      node = bestChild;
    }
    return node;
  }

  /**
   * 选择最佳子节点 (UCB1)
   */
  private selectBestChild(node: MCTSNode): MCTSNode | null {
    let bestScore = -Infinity;
    let bestChild: MCTSNode | null = null;

    for (const child of node.children.values()) {
      const ucbScore = this.calculateUCB(node, child);
      if (ucbScore > bestScore) {
        bestScore = ucbScore;
        bestChild = child;
      }
    }

    return bestChild;
  }

  /**
   * 计算 UCB 分数
   */
  private calculateUCB(parent: MCTSNode, child: MCTSNode): number {
    const exploitation = child.valueSum / Math.max(1, child.visitCount);
    const exploration =
      this.config.cPuct *
      child.prior *
      Math.sqrt(parent.visitCount) /
      (1 + child.visitCount);

    return exploitation + exploration;
  }

  /**
   * 扩展和评估节点
   */
  private async expandAndEvaluate(node: MCTSNode, state: DecisionState): Promise<number> {
    if (node.isTerminal) {
      return 0;
    }

    // 使用神经网络评估
    const networkOutput = await this.network.evaluate(node.state);

    // 展开节点
    if (!node.isExpanded) {
      await this.expandNode(node, state, networkOutput);
    }

    return networkOutput.value;
  }

  /**
   * 展开节点
   */
  private async expandNode(
    node: MCTSNode,
    state: DecisionState,
    networkOutput: NetworkOutput
  ): Promise<void> {
    if (node.isExpanded) return;

    // 为每个有效动作创建子节点
    for (let action = 0; action < state.validActions.length; action++) {
      if (!state.validActions[action]) continue;

      // 计算先验概率
      const prior = this.config.usePolicyNetwork
        ? networkOutput.policy[action] || 0.01
        : 1.0 / state.validActions.filter(Boolean).length;

      // 模拟下一个状态 (简化版)
      const nextState = this.simulateNextState(node.state, action);

      const childNode = this.createNode(node, action, nextState);
      childNode.prior = prior;

      node.children.set(action, childNode);
    }

    node.isExpanded = true;
  }

  /**
   * 模拟下一个状态 (简化版)
   */
  private simulateNextState(currentState: number[], action: number): number[] {
    // 简化的状态转移
    // 实际实现应该使用环境模型
    return currentState.map((v, i) => {
      const noise = (Math.random() - 0.5) * 0.1;
      const actionEffect = Math.sin(action + i) * 0.1;
      return Math.tanh(v + actionEffect + noise);
    });
  }

  /**
   * 回溯更新
   */
  private backpropagate(node: MCTSNode, value: number): void {
    let current: MCTSNode | null = node;

    while (current) {
      current.visitCount++;
      current.valueSum += value;

      // 折扣价值
      value *= this.config.discountFactor;

      current = current.parent;
    }
  }

  /**
   * 获取动作概率分布
   */
  private getActionProbabilities(node: MCTSNode): number[] {
    const counts = this.getVisitCounts(node);
    const totalVisits = counts.reduce((a, b) => a + b, 0);

    if (totalVisits === 0) {
      return counts.map(() => 1.0 / counts.length);
    }

    // 应用温度参数
    const expCounts = counts.map(c => Math.pow(c, 1.0 / this.config.temperature));
    const sumExp = expCounts.reduce((a, b) => a + b, 0);

    return expCounts.map(c => c / sumExp);
  }

  /**
   * 获取访问次数
   */
  private getVisitCounts(node: MCTSNode): number[] {
    const counts = new Array(this.config.actionSpace).fill(0);

    for (const [action, child] of node.children) {
      counts[action] = child.visitCount;
    }

    return counts;
  }

  /**
   * 选择最佳动作
   */
  private selectBestAction(probabilities: number[]): number {
    // 贪婪选择
    return probabilities.indexOf(Math.max(...probabilities));
  }

  /**
   * 创建新节点
   */
  private createNode(parent: MCTSNode | null, action: number, state: number[]): MCTSNode {
    return {
      id: `node_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      parent,
      children: new Map(),
      action,
      visitCount: 0,
      valueSum: 0,
      prior: 0,
      state: [...state],
      isTerminal: false,
      isExpanded: false,
    };
  }

  /**
   * 计算树深度
   */
  private calculateTreeDepth(node: MCTSNode): number {
    if (node.children.size === 0) return 0;

    let maxDepth = 0;
    for (const child of node.children.values()) {
      maxDepth = Math.max(maxDepth, this.calculateTreeDepth(child));
    }

    return maxDepth + 1;
  }

  /**
   * 保存训练样本
   */
  private saveTrainingExample(
    state: number[],
    policy: number[],
    rootNode: MCTSNode
  ): void {
    const value = rootNode.valueSum / Math.max(1, rootNode.visitCount);

    this.trainingExamples.push({
      state: [...state],
      targetPolicy: [...policy],
      targetValue: value,
      reward: 0, // 实际奖励需要环境提供
    });

    // 限制样本数量
    if (this.trainingExamples.length > 10000) {
      this.trainingExamples.shift();
    }
  }

  /**
   * 训练神经网络
   */
  async train(iterations: number = 10): Promise<TrainingStats> {
    if (this.trainingExamples.length < 100) {
      throw new Error('Not enough training examples');
    }

    let bestStats: TrainingStats = { loss: Infinity, valueLoss: 0, policyLoss: 0, accuracy: 0 };

    for (let i = 0; i < iterations; i++) {
      // 随机采样批次
      const batch = this.sampleBatch(32);
      const stats = await this.network.train(batch);

      if (stats.loss < bestStats.loss) {
        bestStats = stats;
      }

      this.emit('trainingProgress', {
        iteration: i + 1,
        totalIterations: iterations,
        loss: stats.loss,
      });
    }

    return bestStats;
  }

  /**
   * 随机采样批次
   */
  private sampleBatch(size: number): TrainingExample[] {
    const batch: TrainingExample[] = [];
    const examples = [...this.trainingExamples];

    for (let i = 0; i < size && examples.length > 0; i++) {
      const index = Math.floor(Math.random() * examples.length);
      batch.push(examples.splice(index, 1)[0]);
    }

    return batch;
  }

  /**
   * 保存模型
   */
  async saveModel(path: string): Promise<void> {
    await this.network.save(path);
  }

  /**
   * 加载模型
   */
  async loadModel(path: string): Promise<void> {
    await this.network.load(path);
  }

  /**
   * 获取统计信息
   */
  getStats() {
    return {
      trainingExamples: this.trainingExamples.length,
      config: this.config,
    };
  }
}

// ============================================
// 导出便捷函数
// ============================================

export function createNeuralMCTS(config: Partial<NeuralMCTSConfig> = {}): NeuralMCTS {
  return new NeuralMCTS(config);
}

export function createDefaultNeuralMCTSConfig(): NeuralMCTSConfig {
  return {
    numSimulations: 800,
    cPuct: 1.5,
    temperature: 1.0,
    valueWeight: 1.0,
    priorWeight: 1.0,
    neuralThreshold: 0.8,
    useValueNetwork: true,
    usePolicyNetwork: true,
    stateDimension: 128,
    actionSpace: 10,
    hiddenDimension: 256,
    learningRate: 0.001,
    discountFactor: 0.99,
  };
}
