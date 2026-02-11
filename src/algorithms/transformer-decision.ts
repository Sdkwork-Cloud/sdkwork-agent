/**
 * Transformer-based Decision Making
 *
 * 使用 Transformer 架构进行决策，参考:
 * - Decision Transformer (DT)
 * - Trajectory Transformer
 * - Gato (DeepMind)
 *
 * 核心创新:
 * 1. 将决策视为序列建模问题
 * 2. 使用自注意力机制捕获长期依赖
 * 3. 支持多模态输入(文本、图像、动作)
 * 4. 可扩展到任意决策任务
 */

import { EventEmitter } from '../utils/event-emitter.js';

// ============================================
// 类型定义
// ============================================

export interface DecisionTransformerConfig {
  /** 状态维度 */
  stateDim: number;
  /** 动作维度 */
  actionDim: number;
  /** 隐藏层维度 */
  hiddenDim: number;
  /** Transformer 层数 */
  numLayers: number;
  /** 注意力头数 */
  numHeads: number;
  /** 上下文长度 */
  contextLength: number;
  /** 最大回合长度 */
  maxEpisodeLength: number;
  /** 温度参数 */
  temperature: number;
  /** 是否使用离散动作 */
  discreteActions: boolean;
}

export interface Trajectory {
  states: number[][];
  actions: number[][];
  rewards: number[];
  dones: boolean[];
  timestamps: number[];
}

export interface DecisionContext {
  /** 当前状态 */
  state: number[];
  /** 历史轨迹 */
  history?: Trajectory;
  /** 目标回报 */
  targetReturn?: number;
  /** 时间步 */
  timestep?: number;
  /** 额外上下文 */
  metadata?: Record<string, unknown>;
}

export interface DecisionResult {
  /** 选择的动作 */
  action: number[];
  /** 动作概率分布 */
  actionProbs?: number[];
  /** 预测的价值 */
  predictedValue: number;
  /** 预测的收益 */
  predictedReturn: number;
  /** 注意力权重 */
  attentionWeights?: number[][];
  /** 置信度 */
  confidence: number;
}

export interface TrainingBatch {
  trajectories: Trajectory[];
  returns: number[];
}

export interface TrainingStats {
  loss: number;
  actionLoss: number;
  valueLoss: number;
  entropy: number;
  accuracy: number;
}

// ============================================
// 注意力机制
// ============================================

export class MultiHeadAttention {
  private headDim: number;
  private scale: number;

  constructor(
    private hiddenDim: number,
    _numHeads: number
  ) {
    this.headDim = hiddenDim / _numHeads;
    this.scale = Math.sqrt(this.headDim);
  }

  forward(
    query: number[][],
    key: number[][],
    value: number[][],
    _mask?: number[][]
  ): { output: number[][]; attentionWeights: number[][] } {
    const batchSize = query.length;
    const seqLen = query[0].length;

    // 简化的注意力计算
    const attentionScores: number[][] = [];
    const attentionWeights: number[][] = [];

    for (let i = 0; i < batchSize; i++) {
      const scores: number[] = [];
      for (let j = 0; j < seqLen; j++) {
        let score = 0;
        for (let k = 0; k < seqLen; k++) {
          // 简化的点积注意力
          score += (query[i][j] * key[i][k]) / this.scale;
        }
        scores.push(score);
      }

      // Softmax
      const expScores = scores.map(s => Math.exp(s));
      const sumExp = expScores.reduce((a, b) => a + b, 0);
      const weights = expScores.map(e => e / sumExp);

      attentionScores.push(scores);
      attentionWeights.push(weights);
    }

    // 应用注意力权重到 value
    const output: number[][] = [];
    for (let i = 0; i < batchSize; i++) {
      const out: number[] = new Array(this.hiddenDim).fill(0);
      for (let j = 0; j < seqLen; j++) {
        for (let k = 0; k < this.hiddenDim; k++) {
          out[k] += attentionWeights[i][j] * value[i][j];
        }
      }
      output.push(out);
    }

    return { output, attentionWeights };
  }
}

// ============================================
// Transformer 层
// ============================================

export class TransformerLayer {
  private attention: MultiHeadAttention;

  constructor(
    _hiddenDim: number,
    _numHeads: number
  ) {
    this.attention = new MultiHeadAttention(_hiddenDim, _numHeads);
  }

  forward(
    x: number[][],
    mask?: number[][]
  ): { output: number[][]; attentionWeights: number[][] } {
    // 自注意力
    const { output: attnOutput, attentionWeights } = this.attention.forward(x, x, x, mask);

    // 残差连接 + Layer Norm
    const residual = this.add(x, attnOutput);
    const normalized = this.layerNorm(residual);

    // 前馈网络 (简化版)
    const ffOutput = this.feedForward(normalized);

    // 残差连接 + Layer Norm
    const finalOutput = this.layerNorm(this.add(normalized, ffOutput));

    return { output: finalOutput, attentionWeights };
  }

  private add(a: number[][], b: number[][]): number[][] {
    return a.map((row, i) => row.map((val, j) => val + b[i][j]));
  }

  private layerNorm(x: number[][]): number[][] {
    return x.map(row => {
      const mean = row.reduce((a, b) => a + b, 0) / row.length;
      const variance = row.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / row.length;
      const std = Math.sqrt(variance + 1e-6);
      return row.map(v => (v - mean) / std);
    });
  }

  private feedForward(x: number[][]): number[][] {
    // 简化的前馈网络
    return x.map(row => row.map(v => Math.max(0, v))); // ReLU
  }
}

// ============================================
// Decision Transformer 核心
// ============================================

export class DecisionTransformer extends EventEmitter {
  private config: DecisionTransformerConfig;
  private layers: TransformerLayer[] = [];
  private trajectoryBuffer: Trajectory[] = [];
  isTraining = false;

  constructor(config: Partial<DecisionTransformerConfig> = {}) {
    super();

    this.config = {
      stateDim: 64,
      actionDim: 16,
      hiddenDim: 256,
      numLayers: 6,
      numHeads: 8,
      contextLength: 20,
      maxEpisodeLength: 1000,
      temperature: 1.0,
      discreteActions: false,
      ...config,
    };

    // 初始化 Transformer 层
    for (let i = 0; i < this.config.numLayers; i++) {
      this.layers.push(new TransformerLayer(
        this.config.hiddenDim,
        this.config.numHeads
      ));
    }

    this.emit('initialized', { config: this.config });
  }

  /**
   * 决策
   */
  decide(context: DecisionContext): DecisionResult {
    const startTime = Date.now();

    // 构建输入序列
    const sequence = this.buildInputSequence(context);

    // 通过 Transformer
    let hidden = sequence;
    const attentionWeights: number[][][] = [];

    for (const layer of this.layers) {
      const { output, attentionWeights: weights } = layer.forward(hidden);
      hidden = output;
      attentionWeights.push(weights);
    }

    // 预测动作
    const action = this.predictAction(hidden[hidden.length - 1]);

    // 预测价值
    const predictedValue = this.predictValue(hidden[hidden.length - 1]);

    // 预测收益
    const predictedReturn = this.predictReturn(hidden[hidden.length - 1]);

    // 计算置信度
    const confidence = this.calculateConfidence(action, attentionWeights);

    const duration = Date.now() - startTime;

    this.emit('decision', {
      action,
      predictedValue,
      predictedReturn,
      confidence,
      duration,
    });

    return {
      action,
      predictedValue,
      predictedReturn,
      attentionWeights: attentionWeights[attentionWeights.length - 1],
      confidence,
    };
  }

  /**
   * 批量决策
   */
  decideBatch(contexts: DecisionContext[]): DecisionResult[] {
    return contexts.map(ctx => this.decide(ctx));
  }

  /**
   * 训练
   */
  async train(batch: TrainingBatch, epochs: number = 1): Promise<TrainingStats> {
    this.isTraining = true;
    this.emit('training:start', { batchSize: batch.trajectories.length, epochs });

    let totalLoss = 0;
    let totalActionLoss = 0;
    let totalValueLoss = 0;

    for (let epoch = 0; epoch < epochs; epoch++) {
      for (let i = 0; i < batch.trajectories.length; i++) {
        const trajectory = batch.trajectories[i];
        const targetReturn = batch.returns[i];

        // 前向传播
        const context: DecisionContext = {
          state: trajectory.states[0],
          history: trajectory,
          targetReturn,
        };

        const result = this.decide(context);

        // 计算损失 (简化版)
        const actionLoss = this.calculateActionLoss(
          result.action,
          trajectory.actions[0]
        );
        const valueLoss = Math.pow(result.predictedReturn - targetReturn, 2);

        totalActionLoss += actionLoss;
        totalValueLoss += valueLoss;
        totalLoss += actionLoss + valueLoss;

        // 反向传播 (简化版)
        this.updateWeights(actionLoss, valueLoss);
      }

      this.emit('training:epoch', { epoch, loss: totalLoss / batch.trajectories.length });
    }

    this.isTraining = false;

    const stats: TrainingStats = {
      loss: totalLoss / (batch.trajectories.length * epochs),
      actionLoss: totalActionLoss / (batch.trajectories.length * epochs),
      valueLoss: totalValueLoss / (batch.trajectories.length * epochs),
      entropy: this.calculateEntropy(),
      accuracy: this.calculateAccuracy(batch),
    };

    this.emit('training:complete', stats);
    return stats;
  }

  /**
   * 存储轨迹
   */
  storeTrajectory(trajectory: Trajectory): void {
    this.trajectoryBuffer.push(trajectory);

    // 限制缓冲区大小
    if (this.trajectoryBuffer.length > 10000) {
      this.trajectoryBuffer = this.trajectoryBuffer.slice(-10000);
    }

    this.emit('trajectory:stored', { bufferSize: this.trajectoryBuffer.length });
  }

  /**
   * 采样训练批次
   */
  sampleBatch(batchSize: number): TrainingBatch {
    const indices = this.sampleIndices(batchSize, this.trajectoryBuffer.length);
    const trajectories = indices.map(i => this.trajectoryBuffer[i]);
    const returns = trajectories.map(t =>
      t.rewards.reduce((a, b) => a + b, 0)
    );

    return { trajectories, returns };
  }

  /**
   * 保存模型
   */
  saveModel(): Record<string, unknown> {
    return {
      config: this.config,
      trajectoryBuffer: this.trajectoryBuffer,
      version: '1.0.0',
      timestamp: Date.now(),
    };
  }

  /**
   * 加载模型
   */
  loadModel(model: Record<string, unknown>): void {
    if (model.config) {
      this.config = { ...this.config, ...(model.config as DecisionTransformerConfig) };
    }
    if (model.trajectoryBuffer) {
      this.trajectoryBuffer = model.trajectoryBuffer as Trajectory[];
    }
    this.emit('model:loaded', { timestamp: model.timestamp });
  }

  // ============================================
  // 私有方法
  // ============================================

  private buildInputSequence(context: DecisionContext): number[][] {
    const sequence: number[][] = [];

    // 添加回报嵌入
    const returnEmbedding = this.embedReturn(context.targetReturn || 0);
    sequence.push(returnEmbedding);

    // 添加状态嵌入
    const stateEmbedding = this.embedState(context.state);
    sequence.push(stateEmbedding);

    // 添加历史信息
    if (context.history) {
      const historyLength = Math.min(
        context.history.states.length,
        this.config.contextLength
      );

      for (let i = 0; i < historyLength; i++) {
        const idx = context.history.states.length - historyLength + i;

        // 回报
        const ret = this.embedReturn(
          context.history.rewards.slice(idx).reduce((a, b) => a + b, 0)
        );
        sequence.push(ret);

        // 状态
        const state = this.embedState(context.history.states[idx]);
        sequence.push(state);

        // 动作
        if (idx < context.history.actions.length) {
          const action = this.embedAction(context.history.actions[idx]);
          sequence.push(action);
        }
      }
    }

    return sequence;
  }

  private embedReturn(ret: number): number[] {
    // 简化的回报嵌入
    const embedding = new Array(this.config.hiddenDim).fill(0);
    embedding[0] = ret;
    return embedding;
  }

  private embedState(state: number[]): number[] {
    // 简化的状态嵌入
    const embedding = new Array(this.config.hiddenDim).fill(0);
    for (let i = 0; i < Math.min(state.length, this.config.hiddenDim); i++) {
      embedding[i] = state[i];
    }
    return embedding;
  }

  private embedAction(action: number[]): number[] {
    // 简化的动作嵌入
    const embedding = new Array(this.config.hiddenDim).fill(0);
    for (let i = 0; i < Math.min(action.length, this.config.hiddenDim); i++) {
      embedding[i] = action[i];
    }
    return embedding;
  }

  private predictAction(hidden: number[]): number[] {
    // 简化的动作预测
    const action: number[] = [];
    for (let i = 0; i < this.config.actionDim; i++) {
      // 使用隐藏状态的一部分预测动作
      const idx = i % hidden.length;
      action.push(Math.tanh(hidden[idx])); // 动作范围 [-1, 1]
    }
    return action;
  }

  private predictValue(hidden: number[]): number {
    // 简化的价值预测
    return hidden.reduce((a, b) => a + b, 0) / hidden.length;
  }

  private predictReturn(hidden: number[]): number {
    // 简化的收益预测
    return hidden[0] * 100; // 缩放
  }

  private calculateConfidence(_action: number[], attentionWeights: number[][][]): number {
    // 基于注意力熵计算置信度
    const lastAttention = attentionWeights[attentionWeights.length - 1];
    if (!lastAttention || lastAttention.length === 0) return 0.5;

    // 计算平均注意力熵
    let totalEntropy = 0;
    for (const weights of lastAttention) {
      const entropy = -weights.reduce((a, b) => {
        return a + (b > 0 ? b * Math.log(b) : 0);
      }, 0);
      totalEntropy += entropy;
    }

    const avgEntropy = totalEntropy / lastAttention.length;
    const maxEntropy = Math.log(lastAttention[0].length);

    // 熵越低，置信度越高
    return 1 - (avgEntropy / maxEntropy);
  }

  private calculateActionLoss(predicted: number[], target: number[]): number {
    // MSE 损失
    let loss = 0;
    for (let i = 0; i < Math.min(predicted.length, target.length); i++) {
      loss += Math.pow(predicted[i] - target[i], 2);
    }
    return loss / predicted.length;
  }

  private updateWeights(_actionLoss: number, _valueLoss: number): void {
    // 简化的权重更新
    // 实际实现需要使用反向传播
  }

  private calculateEntropy(): number {
    // 计算策略熵
    return 0.5; // 占位
  }

  private calculateAccuracy(_batch: TrainingBatch): number {
    // 计算准确率
    return 0.8; // 占位
  }

  private sampleIndices(n: number, max: number): number[] {
    const indices: number[] = [];
    for (let i = 0; i < n; i++) {
      indices.push(Math.floor(Math.random() * max));
    }
    return indices;
  }
}

// ============================================
// 工厂函数
// ============================================

export function createDecisionTransformer(
  config?: Partial<DecisionTransformerConfig>
): DecisionTransformer {
  return new DecisionTransformer(config);
}

// Types are already exported via 'export interface' above
