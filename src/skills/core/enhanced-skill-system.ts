/**
 * Enhanced Skill System with Configuration & Compatibility
 *
 * 增强版技能系统 - 集成配置管理和兼容性层
 *
 * 核心特性：
 * - 统一配置管理 (~/.sdkwork/agent.conf + 项目配置)
 * - 多平台兼容 (OpenClaw, Claude, Codex, OpenCode)
 * - 智能技能选择算法优化
 * - 语义缓存机制
 * - A/B 测试支持
 *
 * @module EnhancedSkillSystem
 * @version 3.0.0
 */

import { EventEmitter } from '../../utils/event-emitter.js';
import { UnifiedSkillSystem, createSkillSystem } from './skill-system.js';
import { FrameworkConfigManager, getFrameworkConfigManager } from '../../config/index.js';
import {
  UnifiedCompatibilityLayer,
  createCompatibilityLayer,
} from '../../compatibility/index.js';
import type { SkillSelectionContext, SkillSelectionResult } from './openclaw-types.js';
import { Logger } from './types';

// ============================================================================
// Advanced Algorithms
// ============================================================================

/**
 * 语义缓存条目
 */
interface SemanticCacheEntry {
  query: string;
  embedding: number[];
  result: SkillSelectionResult;
  timestamp: number;
  hitCount: number;
}

/**
 * 语义缓存管理器
 *
 * 使用向量相似度进行语义缓存
 */
class SemanticCache {
  private cache: Map<string, SemanticCacheEntry> = new Map();
  private maxSize: number;
  private similarityThreshold: number;
  private ttl: number;

  constructor(options: {
    maxSize?: number;
    similarityThreshold?: number;
    ttl?: number;
  } = {}) {
    this.maxSize = options.maxSize || 1000;
    this.similarityThreshold = options.similarityThreshold || 0.85;
    this.ttl = options.ttl || 3600000; // 1 hour
  }

  /**
   * 获取缓存结果
   */
  get(_query: string, embedding: number[]): SemanticCacheEntry | null {
    // 清理过期条目
    this.cleanup();

    // 查找最相似的缓存条目
    let bestMatch: SemanticCacheEntry | null = null;
    let bestSimilarity = 0;

    for (const entry of this.cache.values()) {
      const similarity = this.cosineSimilarity(embedding, entry.embedding);
      if (similarity > this.similarityThreshold && similarity > bestSimilarity) {
        bestSimilarity = similarity;
        bestMatch = entry;
      }
    }

    if (bestMatch) {
      bestMatch.hitCount++;
      return bestMatch;
    }

    return null;
  }

  /**
   * 设置缓存
   */
  set(query: string, embedding: number[], result: SkillSelectionResult): void {
    // 如果缓存已满，移除最少使用的条目
    if (this.cache.size >= this.maxSize) {
      this.evictLRU();
    }

    const key = this.generateKey(query);
    this.cache.set(key, {
      query,
      embedding,
      result,
      timestamp: Date.now(),
      hitCount: 0,
    });
  }

  /**
   * 计算余弦相似度
   */
  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) return 0;

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
   * 生成缓存键
   */
  private generateKey(query: string): string {
    // 简化哈希
    let hash = 0;
    for (let i = 0; i < query.length; i++) {
      const char = query.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return `cache_${hash}`;
  }

  /**
   * 清理过期条目
   */
  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache) {
      if (now - entry.timestamp > this.ttl) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * 移除最少使用的条目
   */
  private evictLRU(): void {
    let minHits = Infinity;
    let minKey: string | null = null;

    for (const [key, entry] of this.cache) {
      if (entry.hitCount < minHits) {
        minHits = entry.hitCount;
        minKey = key;
      }
    }

    if (minKey) {
      this.cache.delete(minKey);
    }
  }

  /**
   * 获取缓存统计
   */
  getStats(): { size: number; maxSize: number; hitRate: number } {
    let totalHits = 0;
    for (const entry of this.cache.values()) {
      totalHits += entry.hitCount;
    }

    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      hitRate: totalHits > 0 ? totalHits / (totalHits + this.cache.size) : 0,
    };
  }
}

/**
 * A/B 测试管理器
 */
class ABTestManager {
  private experiments: Map<string, {
    variants: string[];
    weights: number[];
    results: Map<string, { impressions: number; conversions: number }>;
  }> = new Map();

  /**
   * 注册实验
   */
  registerExperiment(
    name: string,
    variants: string[],
    weights?: number[]
  ): void {
    const normalizedWeights = weights ||
      variants.map(() => 1 / variants.length);

    this.experiments.set(name, {
      variants,
      weights: normalizedWeights,
      results: new Map(variants.map(v => [v, { impressions: 0, conversions: 0 }])),
    });
  }

  /**
   * 获取变体
   */
  getVariant(experimentName: string, userId: string): string {
    const experiment = this.experiments.get(experimentName);
    if (!experiment) return 'control';

    // 基于用户ID哈希选择变体
    const hash = this.hashString(userId + experimentName);
    const random = hash / 0xffffffff;

    let cumulativeWeight = 0;
    for (let i = 0; i < experiment.variants.length; i++) {
      cumulativeWeight += experiment.weights[i];
      if (random <= cumulativeWeight) {
        return experiment.variants[i];
      }
    }

    return experiment.variants[0];
  }

  /**
   * 记录展示
   */
  recordImpression(experimentName: string, variant: string): void {
    const experiment = this.experiments.get(experimentName);
    if (!experiment) return;

    const result = experiment.results.get(variant);
    if (result) {
      result.impressions++;
    }
  }

  /**
   * 记录转化
   */
  recordConversion(experimentName: string, variant: string): void {
    const experiment = this.experiments.get(experimentName);
    if (!experiment) return;

    const result = experiment.results.get(variant);
    if (result) {
      result.conversions++;
    }
  }

  /**
   * 获取实验结果
   */
  getResults(experimentName: string): Record<string, { rate: number; lift: number }> {
    const experiment = this.experiments.get(experimentName);
    if (!experiment) return {};

    const controlResult = experiment.results.get('control');
    const controlRate = controlResult
      ? controlResult.conversions / controlResult.impressions
      : 0;

    const results: Record<string, { rate: number; lift: number }> = {};

    for (const [variant, data] of experiment.results) {
      const rate = data.impressions > 0 ? data.conversions / data.impressions : 0;
      const lift = controlRate > 0 ? (rate - controlRate) / controlRate : 0;

      results[variant] = { rate, lift };
    }

    return results;
  }

  private hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash);
  }
}

// ============================================================================
// Enhanced Skill System
// ============================================================================

export interface EnhancedSkillSystemConfig {
  /** 工作区目录 */
  workspaceDir: string;
  /** 项目目录 */
  projectDir?: string;
  /** 日志器 */
  logger?: Logger;
  /** 启用语义缓存 */
  enableSemanticCache?: boolean;
  /** 启用A/B测试 */
  enableABTesting?: boolean;
}

/**
 * 增强版技能系统
 */
export class EnhancedSkillSystem extends EventEmitter {
  private config: Required<EnhancedSkillSystemConfig>;
  private logger: Logger;

  // 核心组件
  private configManager: FrameworkConfigManager;
  private skillSystem: UnifiedSkillSystem;
  private compatibilityLayer?: UnifiedCompatibilityLayer;

  // 高级功能
  private semanticCache?: SemanticCache;
  private abTestManager?: ABTestManager;

  // 状态
  private initialized = false;

  constructor(config: EnhancedSkillSystemConfig) {
    super();
    this.config = {
      projectDir: config.workspaceDir,
      logger: this.createDefaultLogger(),
      enableSemanticCache: true,
      enableABTesting: false,
      ...config,
    };
    this.logger = this.config.logger;

    // 初始化配置管理器
    this.configManager = getFrameworkConfigManager();

    // 初始化基础技能系统
    this.skillSystem = createSkillSystem({
      workspaceDir: this.config.workspaceDir,
      logger: this.logger,
    });
  }

  /**
   * 初始化增强版技能系统
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      this.logger.warn('Enhanced skill system already initialized');
      return;
    }

    this.logger.info('Initializing enhanced skill system');

    // 1. 加载配置
    await this.configManager.load();
    const frameworkConfig = this.configManager.getConfig();

    // 2. 初始化语义缓存
    if (this.config.enableSemanticCache && frameworkConfig.skills.snapshot.enableCache) {
      this.semanticCache = new SemanticCache({
        maxSize: 1000,
        similarityThreshold: 0.85,
        ttl: frameworkConfig.skills.snapshot.cacheTTL,
      });
      this.logger.info('Semantic cache enabled');
    }

    // 3. 初始化A/B测试
    if (this.config.enableABTesting) {
      this.abTestManager = new ABTestManager();
      this.registerDefaultExperiments();
      this.logger.info('A/B testing enabled');
    }

    // 4. 初始化兼容性层
    if (this.hasCompatibilityEnabled()) {
      this.compatibilityLayer = createCompatibilityLayer({
        configManager: this.configManager,
        logger: this.logger,
      });
      await this.compatibilityLayer.initialize();
    }

    // 5. 初始化基础技能系统
    await this.skillSystem.initialize();

    // 6. 加载 OpenClaw 技能（如果启用）
    if (this.compatibilityLayer?.isOpenClawEnabled()) {
      await this.loadOpenClawSkills();
    }

    this.initialized = true;
    this.logger.info('Enhanced skill system initialized successfully');

    this.emit('system:initialized', {
      config: this.config,
      compatibility: this.compatibilityLayer?.getEnabledModes() || [],
    });
  }

  /**
   * 智能技能选择（带语义缓存和A/B测试）
   */
  async selectSkills(
    context: Omit<SkillSelectionContext, 'availableSkills'>,
    options: {
      useCache?: boolean;
      experimentId?: string;
    } = {}
  ): Promise<SkillSelectionResult> {
    if (!this.initialized) {
      throw new Error('Enhanced skill system not initialized');
    }

    const { useCache = true, experimentId } = options;

    // 1. 检查语义缓存
    if (useCache && this.semanticCache) {
      // 生成查询的embedding（简化实现）
      const embedding = this.generateEmbedding(context.userInput);
      const cached = this.semanticCache.get(context.userInput, embedding);

      if (cached) {
        this.logger.debug('Semantic cache hit for skill selection');
        return cached.result;
      }
    }

    // 2. A/B测试：选择算法变体
    let selectorVariant = 'default';
    if (this.abTestManager && experimentId) {
      selectorVariant = this.abTestManager.getVariant(
        'skill-selection-algorithm',
        context.userInput
      );
      this.abTestManager.recordImpression('skill-selection-algorithm', selectorVariant);
    }

    // 3. 根据变体选择算法
    let result: SkillSelectionResult;

    switch (selectorVariant) {
      case 'transformer':
        result = await this.selectWithTransformer(context);
        break;
      case 'hybrid':
        result = await this.selectWithHybrid(context);
        break;
      case 'default':
      default:
        result = await this.skillSystem.selectSkills(context);
        break;
    }

    // 4. 缓存结果
    if (useCache && this.semanticCache) {
      const embedding = this.generateEmbedding(context.userInput);
      this.semanticCache.set(context.userInput, embedding, result);
    }

    return result;
  }

  /**
   * 获取配置值
   */
  getConfig<T>(path: string): T | undefined {
    // 从配置对象中获取值
    const parts = path.split('.');
    let current: unknown = this.configManager.getConfig();
    for (const part of parts) {
      if (current && typeof current === 'object' && part in current) {
        current = (current as Record<string, unknown>)[part];
      } else {
        return undefined;
      }
    }
    return current as T;
  }

  /**
   * 更新配置
   */
  updateConfig(path: string, value: unknown): void {
    this.configManager.updateConfig({ [path]: value } as Partial<import('../../config/framework-config.js').FrameworkConfig>);
  }

  /**
   * 获取技能系统状态
   */
  getState() {
    return {
      ...this.skillSystem.getState(),
      initialized: this.initialized,
      semanticCache: this.semanticCache?.getStats(),
      compatibility: this.compatibilityLayer?.getEnabledModes() || [],
    };
  }

  /**
   * 关闭系统
   */
  async shutdown(): Promise<void> {
    this.logger.info('Shutting down enhanced skill system');

    await this.skillSystem.shutdown();
    this.configManager.destroy();

    this.initialized = false;
    this.logger.info('Enhanced skill system shut down');
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  private hasCompatibilityEnabled(): boolean {
    const config = this.configManager.getConfig();
    return (
      config.compatibility.openclaw?.enabled ||
      config.compatibility.claude?.enabled ||
      config.compatibility.codex?.enabled ||
      config.compatibility.opencode?.enabled ||
      false
    );
  }

  private async loadOpenClawSkills(): Promise<void> {
    const adapter = this.compatibilityLayer?.getOpenClawAdapter();
    if (!adapter) return;

    const openClawSkills = adapter.getSkills();
    this.logger.info(`Loading ${openClawSkills.length} OpenClaw skills`);

    // 转换并合并到技能系统
    // 这里需要扩展 UnifiedSkillSystem 支持动态添加技能
  }

  private generateEmbedding(text: string): number[] {
    // 简化实现：使用词袋模型生成伪embedding
    // 实际应使用真实的embedding模型（如OpenAI的text-embedding-ada-002）
    const words = text.toLowerCase().split(/\s+/);
    const embedding: number[] = new Array(128).fill(0);

    for (const word of words) {
      for (let i = 0; i < word.length; i++) {
        const char = word.charCodeAt(i);
        embedding[char % 128] += 1;
      }
    }

    // 归一化
    const norm = Math.sqrt(embedding.reduce((sum, v) => sum + v * v, 0));
    if (norm > 0) {
      return embedding.map(v => v / norm);
    }

    return embedding;
  }

  private async selectWithTransformer(
    context: Omit<SkillSelectionContext, 'availableSkills'>
  ): Promise<SkillSelectionResult> {
    // Transformer-based 选择算法
    // 使用注意力机制对技能进行排序
    this.logger.debug('Using transformer-based skill selection');

    // 这里应该调用真实的Transformer模型
    // 简化实现：使用加权评分
    return this.skillSystem.selectSkills(context);
  }

  private async selectWithHybrid(
    context: Omit<SkillSelectionContext, 'availableSkills'>
  ): Promise<SkillSelectionResult> {
    // 混合算法：结合多种选择策略
    this.logger.debug('Using hybrid skill selection');

    // 并行执行多种选择算法
    const [result1, result2] = await Promise.all([
      this.skillSystem.selectSkills(context),
      this.skillSystem.selectSkills({
        ...context,
        currentTask: `${context.currentTask || ''} (alternative)`,
      }),
    ]);

    // 合并结果
    const mergedSkills = [...new Set([...result1.selectedSkills, ...result2.selectedSkills])];

    return {
      selectedSkills: mergedSkills.slice(0, 3),
      confidence: (result1.confidence + result2.confidence) / 2,
      reasoning: `Hybrid: ${result1.reasoning} + ${result2.reasoning}`,
      shouldLoad: result1.shouldLoad || result2.shouldLoad,
    };
  }

  private registerDefaultExperiments(): void {
    if (!this.abTestManager) return;

    // 注册技能选择算法实验
    this.abTestManager.registerExperiment('skill-selection-algorithm', [
      'control',      // 默认算法
      'transformer',  // Transformer-based
      'hybrid',       // 混合算法
    ], [0.5, 0.25, 0.25]);
  }

  private createDefaultLogger(): Logger {
    return {
      debug: () => {},
      info: console.info,
      warn: console.warn,
      error: console.error,
    };
  }
}

/**
 * 创建增强版技能系统
 */
export function createEnhancedSkillSystem(
  config: EnhancedSkillSystemConfig
): EnhancedSkillSystem {
  return new EnhancedSkillSystem(config);
}

// Export advanced components
export { SemanticCache, ABTestManager };
