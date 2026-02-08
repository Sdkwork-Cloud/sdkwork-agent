/**
 * Speculative Decoding（推测解码）实现
 *
 * 通过使用小模型（draft model）快速生成候选 token，
 * 然后使用大模型（target model）并行验证，实现 2-3 倍推理加速
 *
 * 核心思想：
 * 1. Draft Model 快速生成 K 个候选 token
 * 2. Target Model 一次前向传播验证所有 K 个 token
 * 3. 接受匹配的 token，拒绝时从正确分布采样
 *
 * 参考：
 * - Fast Inference from Transformers via Speculative Decoding (Leviathan et al., 2022)
 * - https://arxiv.org/abs/2211.17192
 *
 * @algorithms LLM Inference Optimization
 * @version 1.0.0
 * @advanced
 */

import { Logger, createLogger } from '../utils/logger';

/**
 * Token 概率分布
 */
export interface TokenDistribution {
  tokenId: number;
  logProb: number;
  prob: number;
}

/**
 * 模型接口
 */
export interface LanguageModel {
  /** 模型名称 */
  readonly name: string;
  /** 词汇表大小 */
  readonly vocabSize: number;
  /** 生成下一个 token 的分布 */
  generateLogits(inputIds: number[]): Promise<Float32Array>;
  /** 采样一个 token */
  sampleToken(logits: Float32Array, temperature: number): number;
}

/**
 * 推测解码配置
 */
export interface SpeculativeDecodingConfig {
  /** 每次推测的 token 数量 */
  gamma: number;
  /** 温度参数 */
  temperature: number;
  /** 最大总 token 数 */
  maxTokens: number;
  /** 是否使用动态 gamma 调整 */
  dynamicGamma: boolean;
  /** 接受率阈值（低于此值减少 gamma） */
  acceptanceThreshold: number;
  /** 最小 gamma */
  minGamma: number;
  /** 最大 gamma */
  maxGamma: number;
}

/**
 * 解码结果
 */
export interface DecodingResult {
  /** 生成的 token 序列 */
  tokens: number[];
  /** 实际生成的 token 数 */
  generatedTokens: number;
  /** 接受的 draft token 数 */
  acceptedTokens: number;
  /** Draft model 调用次数 */
  draftCalls: number;
  /** Target model 调用次数 */
  targetCalls: number;
  /** 平均接受率 */
  acceptanceRate: number;
  /** 加速比（相比标准解码） */
  speedup: number;
  /** 耗时（ms） */
  duration: number;
}

/**
 * 默认配置
 */
const DEFAULT_CONFIG: SpeculativeDecodingConfig = {
  gamma: 4,
  temperature: 1.0,
  maxTokens: 100,
  dynamicGamma: true,
  acceptanceThreshold: 0.6,
  minGamma: 2,
  maxGamma: 8,
};

/**
 * Speculative Decoding 实现
 */
export class SpeculativeDecoder {
  private config: SpeculativeDecodingConfig;
  private logger: Logger;
  private draftModel: LanguageModel;
  private targetModel: LanguageModel;

  // 统计信息
  private stats = {
    totalDraftTokens: 0,
    totalAcceptedTokens: 0,
    draftCalls: 0,
    targetCalls: 0,
  };

  constructor(
    draftModel: LanguageModel,
    targetModel: LanguageModel,
    config: Partial<SpeculativeDecodingConfig> = {}
  ) {
    this.draftModel = draftModel;
    this.targetModel = targetModel;
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.logger = createLogger({ name: 'SpeculativeDecoder' });
  }

  /**
   * 执行推测解码
   *
   * @param prompt - 输入提示 token 序列
   * @returns 解码结果
   */
  async decode(prompt: number[]): Promise<DecodingResult> {
    const startTime = performance.now();
    const tokens = [...prompt];
    let acceptedTokens = 0;
    let currentGamma = this.config.gamma;

    this.stats = {
      totalDraftTokens: 0,
      totalAcceptedTokens: 0,
      draftCalls: 0,
      targetCalls: 0,
    };

    while (tokens.length < prompt.length + this.config.maxTokens) {
      // 1. Draft Model 生成候选 token
      const draftTokens = await this.generateDraftTokens(tokens, currentGamma);
      this.stats.totalDraftTokens += draftTokens.length;
      this.stats.draftCalls++;

      if (draftTokens.length === 0) break;

      // 2. Target Model 验证
      const verificationResult = await this.verifyTokens(tokens, draftTokens);
      this.stats.targetCalls++;

      // 3. 处理接受结果
      const accepted = verificationResult.acceptedCount;
      acceptedTokens += accepted;
      this.stats.totalAcceptedTokens += accepted;

      // 添加接受的 token
      for (let i = 0; i < accepted; i++) {
        tokens.push(draftTokens[i]);
      }

      // 添加修正的 token（如果有）
      if (verificationResult.correctedToken !== null) {
        tokens.push(verificationResult.correctedToken);
      }

      // 动态调整 gamma
      if (this.config.dynamicGamma) {
        currentGamma = this.adjustGamma(accepted, draftTokens.length, currentGamma);
      }

      // 检查是否生成结束
      if (verificationResult.shouldStop || tokens.length >= prompt.length + this.config.maxTokens) {
        break;
      }
    }

    const duration = performance.now() - startTime;
    const acceptanceRate = this.stats.totalDraftTokens > 0
      ? this.stats.totalAcceptedTokens / this.stats.totalDraftTokens
      : 0;

    // 估算加速比
    const speedup = this.estimateSpeedup(acceptanceRate);

    const result: DecodingResult = {
      tokens,
      generatedTokens: tokens.length - prompt.length,
      acceptedTokens,
      draftCalls: this.stats.draftCalls,
      targetCalls: this.stats.targetCalls,
      acceptanceRate,
      speedup,
      duration,
    };

    this.logger.debug('Speculative decoding completed', {
      generatedTokens: result.generatedTokens,
      acceptanceRate: (acceptanceRate * 100).toFixed(1) + '%',
      speedup: speedup.toFixed(2) + 'x',
      draftCalls: result.draftCalls,
      targetCalls: result.targetCalls,
    });

    return result;
  }

  /**
   * 生成 Draft tokens
   */
  private async generateDraftTokens(
    prefix: number[],
    gamma: number
  ): Promise<number[]> {
    const draftTokens: number[] = [];
    const currentInput = [...prefix];

    for (let i = 0; i < gamma; i++) {
      const logits = await this.draftModel.generateLogits(currentInput);
      const token = this.draftModel.sampleToken(logits, this.config.temperature);

      draftTokens.push(token);
      currentInput.push(token);
    }

    return draftTokens;
  }

  /**
   * 验证 Draft tokens
   *
   * 使用 Target Model 并行验证所有 draft tokens
   */
  private async verifyTokens(
    prefix: number[],
    draftTokens: number[]
  ): Promise<{
    acceptedCount: number;
    correctedToken: number | null;
    shouldStop: boolean;
  }> {
    let acceptedCount = 0;
    const currentInput = [...prefix];

    for (let i = 0; i < draftTokens.length; i++) {
      // 获取 target model 的分布
      const targetLogits = await this.targetModel.generateLogits(currentInput);

      const draftToken = draftTokens[i];

      // 从 target model 采样
      const targetToken = this.targetModel.sampleToken(targetLogits, this.config.temperature);

      // 接受-拒绝采样
      if (targetToken === draftToken) {
        // 完全匹配，接受
        acceptedCount++;
        currentInput.push(draftToken);
      } else {
        // 不匹配，使用修正的 token
        return {
          acceptedCount,
          correctedToken: targetToken,
          shouldStop: false,
        };
      }
    }

    // 所有 draft tokens 都被接受
    // 从 target model 再采样一个 token
    const finalLogits = await this.targetModel.generateLogits(currentInput);
    const finalToken = this.targetModel.sampleToken(finalLogits, this.config.temperature);

    return {
      acceptedCount,
      correctedToken: finalToken,
      shouldStop: false,
    };
  }

  /**
   * 动态调整 gamma
   */
  private adjustGamma(
    accepted: number,
    total: number,
    currentGamma: number
  ): number {
    const acceptanceRate = accepted / total;

    if (acceptanceRate < this.config.acceptanceThreshold) {
      // 接受率低，减少 gamma
      return Math.max(this.config.minGamma, currentGamma - 1);
    } else if (acceptanceRate > 0.9) {
      // 接受率很高，增加 gamma
      return Math.min(this.config.maxGamma, currentGamma + 1);
    }

    return currentGamma;
  }

  /**
   * 估算加速比
   *
   * 基于接受率和模型速度比估算
   */
  private estimateSpeedup(acceptanceRate: number): number {
    // 假设 draft model 比 target model 快 5 倍
    const speedRatio = 5;
    const gamma = this.config.gamma;

    // 理论加速比公式
    // speedup = 1 / (1 - acceptanceRate^gamma + (1/speedRatio) * acceptanceRate^gamma)
    const pGamma = Math.pow(acceptanceRate, gamma);
    const denominator = 1 - pGamma + (1 / speedRatio) * pGamma;

    return 1 / denominator;
  }

  /**
   * 流式解码
   */
  async *decodeStream(
    prompt: number[]
  ): AsyncGenerator<{ token: number; accepted: boolean }, void, unknown> {
    const tokens = [...prompt];
    let currentGamma = this.config.gamma;

    while (tokens.length < prompt.length + this.config.maxTokens) {
      // 生成 draft tokens
      const draftTokens = await this.generateDraftTokens(tokens, currentGamma);

      if (draftTokens.length === 0) break;

      // 验证
      const result = await this.verifyTokens(tokens, draftTokens);

      // 产生接受的 token
      for (let i = 0; i < result.acceptedCount; i++) {
        yield { token: draftTokens[i], accepted: true };
        tokens.push(draftTokens[i]);
      }

      // 产生修正的 token
      if (result.correctedToken !== null) {
        yield { token: result.correctedToken, accepted: false };
        tokens.push(result.correctedToken);
      }

      // 动态调整
      if (this.config.dynamicGamma) {
        currentGamma = this.adjustGamma(result.acceptedCount, draftTokens.length, currentGamma);
      }

      if (result.shouldStop) break;
    }
  }

  /**
   * 获取统计信息
   */
  getStats(): typeof this.stats {
    return { ...this.stats };
  }

  /**
   * 重置统计
   */
  resetStats(): void {
    this.stats = {
      totalDraftTokens: 0,
      totalAcceptedTokens: 0,
      draftCalls: 0,
      targetCalls: 0,
    };
  }
}

/**
 * 创建推测解码器
 */
export function createSpeculativeDecoder(
  draftModel: LanguageModel,
  targetModel: LanguageModel,
  config?: Partial<SpeculativeDecodingConfig>
): SpeculativeDecoder {
  return new SpeculativeDecoder(draftModel, targetModel, config);
}

/**
 * 模拟语言模型（用于测试）
 */
export class MockLanguageModel implements LanguageModel {
  readonly name: string;
  readonly vocabSize: number;
  private latency: number;

  constructor(name: string, vocabSize: number, latency: number = 10) {
    this.name = name;
    this.vocabSize = vocabSize;
    this.latency = latency;
  }

  async generateLogits(inputIds: number[]): Promise<Float32Array> {
    // 模拟延迟
    await new Promise(resolve => setTimeout(resolve, this.latency));

    // 生成随机 logits
    const logits = new Float32Array(this.vocabSize);
    for (let i = 0; i < this.vocabSize; i++) {
      logits[i] = Math.random() * 2 - 1;
    }

    // 添加一些确定性（基于输入）
    const seed = inputIds.reduce((a, b) => a + b, 0);
    logits[seed % this.vocabSize] += 2;

    return logits;
  }

  sampleToken(logits: Float32Array, _temperature: number): number {
    // 贪婪采样（取最大）
    void _temperature; // 模拟模型不使用温度参数
    let maxIdx = 0;
    let maxVal = logits[0];

    for (let i = 1; i < logits.length; i++) {
      if (logits[i] > maxVal) {
        maxVal = logits[i];
        maxIdx = i;
      }
    }

    return maxIdx;
  }
}
