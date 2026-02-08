/**
 * 自适应策略 - Adaptive Strategy
 *
 * 根据运行环境、性能指标和历史数据动态选择最优策略
 * 实现真正的"智能"策略选择
 */

import type {
  ISkillLoadingStrategy,
  SkillLoadingContext,
  SkillLoadingResult,
  SkillLoadingStrategyType,
} from './types'

// 环境类型
export type EnvironmentType = 'development' | 'production' | 'test' | 'low-end' | 'high-end'

// 性能指标
export interface PerformanceMetrics {
  avgExecutionTime: number
  cacheHitRate: number
  accuracy: number
  memoryUsage: number
}

// 策略性能记录
export interface StrategyPerformance {
  type: SkillLoadingStrategyType
  metrics: PerformanceMetrics
  callCount: number
  lastUsed: number
  successRate: number
}

// 自适应配置
export interface AdaptiveConfig {
  // 环境检测
  environment: EnvironmentType

  // 性能阈值
  performanceThresholds: {
    maxExecutionTime: number // ms
    minCacheHitRate: number // 0-1
    minAccuracy: number // 0-1
    maxMemoryUsage: number // MB
  }

  // 自适应开关
  enableAutoSwitch: boolean
  enableLearning: boolean
  enablePreload: boolean

  // 策略优先级（动态调整）
  strategyPriorities: Record<EnvironmentType, SkillLoadingStrategyType[]>

  // 降级策略
  fallbackStrategy: SkillLoadingStrategyType
}

// 默认配置
const DEFAULT_ADAPTIVE_CONFIG: AdaptiveConfig = {
  environment: 'production',
  performanceThresholds: {
    maxExecutionTime: 100, // 100ms
    minCacheHitRate: 0.3,
    minAccuracy: 0.6,
    maxMemoryUsage: 100, // 100MB
  },
  enableAutoSwitch: true,
  enableLearning: true,
  enablePreload: true,
  strategyPriorities: {
    // 开发环境：优先使用混合策略，便于调试
    development: ['hybrid', 'rule', 'keyword'],
    // 生产环境：优先使用规则策略，确定性高
    production: ['rule', 'hybrid', 'keyword'],
    // 测试环境：优先使用关键词策略，快速
    test: ['keyword', 'rule', 'hybrid'],
    // 低端设备：只使用关键词策略，轻量
    'low-end': ['keyword'],
    // 高端设备：使用混合策略，精度优先
    'high-end': ['hybrid', 'rule', 'keyword'],
  },
  fallbackStrategy: 'keyword',
}

export class AdaptiveStrategy implements ISkillLoadingStrategy {
  readonly name = 'adaptive' as const
  readonly description = '根据环境和性能动态选择最优策略'

  private config: AdaptiveConfig
  private strategies: Map<SkillLoadingStrategyType, ISkillLoadingStrategy>
  private performanceHistory: Map<SkillLoadingStrategyType, StrategyPerformance> = new Map()
  private currentStrategy: SkillLoadingStrategyType
  private lastStrategySwitch: number = Date.now()
  private strategySwitchCooldown: number = 5000 // 5秒内不重复切换

  constructor(
    strategies: Map<SkillLoadingStrategyType, ISkillLoadingStrategy>,
    config?: Partial<AdaptiveConfig>
  ) {
    this.strategies = strategies
    this.config = { ...DEFAULT_ADAPTIVE_CONFIG, ...config }
    this.currentStrategy = this.detectOptimalStrategy()

    // 自动检测环境
    if (!config?.environment) {
      this.config.environment = this.detectEnvironment()
    }

    console.log('[AdaptiveStrategy] Initialized:', {
      environment: this.config.environment,
      currentStrategy: this.currentStrategy,
      availableStrategies: Array.from(strategies.keys()),
    })
  }

  /**
   * 自动检测运行环境
   */
  private detectEnvironment(): EnvironmentType {
    // 检测是否为开发环境
    if (import.meta.env?.DEV || location.hostname === 'localhost') {
      return 'development'
    }

    // 检测设备性能
    const memory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory
    const cores = navigator.hardwareConcurrency

    // 低端设备检测
    if ((memory && memory < 4) || (cores && cores < 4)) {
      return 'low-end'
    }

    // 高端设备检测
    if ((memory && memory >= 8) || (cores && cores >= 8)) {
      return 'high-end'
    }

    return 'production'
  }

  /**
   * 检测最优策略
   */
  private detectOptimalStrategy(): SkillLoadingStrategyType {
    const priorities = this.config.strategyPriorities[this.config.environment]

    for (const strategyType of priorities) {
      if (this.strategies.has(strategyType)) {
        return strategyType
      }
    }

    return this.config.fallbackStrategy
  }

  async select(context: SkillLoadingContext): Promise<SkillLoadingResult> {
    const startTime = Date.now()

    // 1. 检查是否需要切换策略
    if (this.config.enableAutoSwitch) {
      this.maybeSwitchStrategy()
    }

    // 2. 获取当前策略
    const strategy = this.strategies.get(this.currentStrategy)
    if (!strategy) {
      throw new Error(`Current strategy not found: ${this.currentStrategy}`)
    }

    // 3. 执行策略
    const result = await strategy.select(context)

    // 4. 记录性能指标
    const executionTime = Date.now() - startTime
    this.recordPerformance(this.currentStrategy, {
      ...result,
      executionTime,
    })

    // 5. 添加自适应信息
    const adaptiveResult: SkillLoadingResult = {
      ...result,
      strategyUsed: this.name,
      reasoning: this.generateAdaptiveReasoning(result),
    }

    return adaptiveResult
  }

  /**
   * 可能切换策略
   */
  private maybeSwitchStrategy(): void {
    const now = Date.now()

    // 检查冷却时间
    if (now - this.lastStrategySwitch < this.strategySwitchCooldown) {
      return
    }

    // 分析性能数据
    const bestStrategy = this.analyzePerformance()

    if (bestStrategy && bestStrategy !== this.currentStrategy) {
      console.log('[AdaptiveStrategy] Switching strategy:', {
        from: this.currentStrategy,
        to: bestStrategy,
        reason: this.getSwitchReason(bestStrategy),
      })

      this.currentStrategy = bestStrategy
      this.lastStrategySwitch = now
    }
  }

  /**
   * 分析性能，返回最优策略
   */
  private analyzePerformance(): SkillLoadingStrategyType | null {
    if (this.performanceHistory.size === 0) {
      return null
    }

    let bestStrategy: SkillLoadingStrategyType | null = null
    let bestScore = -Infinity

    for (const [type, perf] of this.performanceHistory.entries()) {
      // 计算综合得分
      const score = this.calculateStrategyScore(perf)

      if (score > bestScore) {
        bestScore = score
        bestStrategy = type
      }
    }

    return bestStrategy
  }

  /**
   * 计算策略得分
   */
  private calculateStrategyScore(perf: StrategyPerformance): number {
    const { metrics, successRate } = perf

    // 根据环境调整权重
    const weights = this.getEnvironmentWeights()

    // 归一化各项指标
    const timeScore = Math.max(0, 1 - metrics.avgExecutionTime / this.config.performanceThresholds.maxExecutionTime)
    const cacheScore = metrics.cacheHitRate
    const accuracyScore = metrics.accuracy
    const memoryScore = Math.max(0, 1 - metrics.memoryUsage / this.config.performanceThresholds.maxMemoryUsage)

    // 加权求和
    return (
      timeScore * weights.time +
      cacheScore * weights.cache +
      accuracyScore * weights.accuracy +
      memoryScore * weights.memory +
      successRate * weights.success
    )
  }

  /**
   * 获取环境权重
   */
  private getEnvironmentWeights(): Record<string, number> {
    const weights: Record<EnvironmentType, Record<string, number>> = {
      development: { time: 0.2, cache: 0.1, accuracy: 0.4, memory: 0.1, success: 0.2 },
      production: { time: 0.3, cache: 0.2, accuracy: 0.3, memory: 0.1, success: 0.1 },
      test: { time: 0.4, cache: 0.1, accuracy: 0.2, memory: 0.1, success: 0.2 },
      'low-end': { time: 0.5, cache: 0.1, accuracy: 0.1, memory: 0.2, success: 0.1 },
      'high-end': { time: 0.1, cache: 0.2, accuracy: 0.5, memory: 0.1, success: 0.1 },
    }

    return weights[this.config.environment]
  }

  /**
   * 记录性能数据
   */
  private recordPerformance(
    type: SkillLoadingStrategyType,
    result: SkillLoadingResult & { executionTime: number }
  ): void {
    const existing = this.performanceHistory.get(type)

    if (existing) {
      // 更新历史数据（指数移动平均）
      const alpha = 0.3 // 平滑因子
      existing.metrics.avgExecutionTime =
        existing.metrics.avgExecutionTime * (1 - alpha) + result.executionTime * alpha
      existing.metrics.accuracy =
        existing.metrics.accuracy * (1 - alpha) + result.confidence * alpha
      existing.callCount++
      existing.lastUsed = Date.now()
      // 简化处理：假设成功率与置信度相关
      existing.successRate = existing.metrics.accuracy
    } else {
      this.performanceHistory.set(type, {
        type,
        metrics: {
          avgExecutionTime: result.executionTime,
          cacheHitRate: 0,
          accuracy: result.confidence,
          memoryUsage: 0,
        },
        callCount: 1,
        lastUsed: Date.now(),
        successRate: result.confidence,
      })
    }
  }

  /**
   * 生成自适应理由
   */
  private generateAdaptiveReasoning(result: SkillLoadingResult): string {
    const env = this.config.environment
    const strategy = this.currentStrategy
    const perf = this.performanceHistory.get(strategy)

    let reasoning = `[${env}环境] 使用${strategy}策略`

    if (perf) {
      reasoning += `，平均耗时${perf.metrics.avgExecutionTime.toFixed(1)}ms，`
      reasoning += `准确率${(perf.metrics.accuracy * 100).toFixed(1)}%`
    }

    reasoning += `。${result.reasoning}`

    return reasoning
  }

  /**
   * 获取切换原因
   */
  private getSwitchReason(newStrategy: SkillLoadingStrategyType): string {
    const newPerf = this.performanceHistory.get(newStrategy)
    const oldPerf = this.performanceHistory.get(this.currentStrategy)

    if (!newPerf || !oldPerf) {
      return '首次使用'
    }

    if (newPerf.metrics.avgExecutionTime < oldPerf.metrics.avgExecutionTime * 0.8) {
      return '性能更优'
    }

    if (newPerf.metrics.accuracy > oldPerf.metrics.accuracy * 1.1) {
      return '准确率更高'
    }

    return '综合评分更高'
  }

  /**
   * 获取性能报告
   */
  getPerformanceReport(): Record<SkillLoadingStrategyType, StrategyPerformance> {
    return Object.fromEntries(this.performanceHistory) as Record<
      SkillLoadingStrategyType,
      StrategyPerformance
    >
  }

  /**
   * 获取当前策略
   */
  getCurrentStrategy(): SkillLoadingStrategyType {
    return this.currentStrategy
  }

  /**
   * 手动设置策略
   */
  setStrategy(type: SkillLoadingStrategyType): void {
    if (!this.strategies.has(type)) {
      throw new Error(`Strategy not available: ${type}`)
    }

    this.currentStrategy = type
    this.lastStrategySwitch = Date.now()

    console.log('[AdaptiveStrategy] Manually switched to:', type)
  }

  /**
   * 更新配置
   */
  updateConfig(config: Partial<AdaptiveConfig>): void {
    this.config = { ...this.config, ...config }

    // 重新检测最优策略
    if (config.environment) {
      this.currentStrategy = this.detectOptimalStrategy()
    }
  }

  /**
   * 重置性能历史
   */
  resetPerformanceHistory(): void {
    this.performanceHistory.clear()
    console.log('[AdaptiveStrategy] Performance history reset')
  }
}
