/**
 * 策略工厂
 *
 * 负责创建和管理技能加载策略实例
 * 实现策略模式的工厂模式
 */

import type {
  ISkillLoadingStrategy,
  IStrategyFactory,
  SkillLoadingStrategyType,
  SkillLoadingConfig,
  SkillLoadingResult,
} from './types'
import type { Skill } from '../../types'
import { KeywordStrategy } from './keyword-strategy'
import { RuleStrategy } from './rule-strategy'
import { HybridStrategy } from './hybrid-strategy'
import { AdaptiveStrategy } from './adaptive-strategy'
import { LLMIntelligentStrategy } from './llm-intelligent-strategy'
import { SuperIntelligentStrategy } from './super-intelligent-strategy'

// 策略类映射
type StrategyClass = new (options?: Record<string, unknown>) => ISkillLoadingStrategy

const strategyRegistry = new Map<SkillLoadingStrategyType, StrategyClass>()

// 注册默认策略
strategyRegistry.set('keyword', KeywordStrategy)
strategyRegistry.set('rule', RuleStrategy)
strategyRegistry.set('adaptive', AdaptiveStrategy as unknown as StrategyClass)
strategyRegistry.set('llm-intelligent', LLMIntelligentStrategy as unknown as StrategyClass)
strategyRegistry.set('super-intelligent', SuperIntelligentStrategy as unknown as StrategyClass)

export class StrategyFactory implements IStrategyFactory {
  private instances = new Map<SkillLoadingStrategyType, ISkillLoadingStrategy>()
  private config: SkillLoadingConfig

  constructor(config: SkillLoadingConfig) {
    this.config = config
    this.initializeStrategies()
  }

  /**
   * 初始化所有策略实例
   */
  private initializeStrategies(): void {
    for (const strategyConfig of this.config.strategies) {
      if (strategyConfig.enabled) {
        const instance = this.createStrategyInternal(
          strategyConfig.type,
          strategyConfig.options
        )
        if (instance) {
          this.instances.set(strategyConfig.type, instance)
        }
      }
    }

    // 特殊处理 hybrid 策略，需要其他策略实例
    if (this.config.defaultStrategy === 'hybrid' || this.config.strategies.some(s => s.type === 'hybrid')) {
      const hybridInstance = new HybridStrategy(this.instances, this.config.hybridOptions)
      this.instances.set('hybrid', hybridInstance)
    }

    // 特殊处理 adaptive 策略，需要其他策略实例
    if (this.config.defaultStrategy === 'adaptive' || this.config.strategies.some(s => s.type === 'adaptive')) {
      const adaptiveInstance = new AdaptiveStrategy(this.instances, this.config.adaptiveOptions)
      this.instances.set('adaptive', adaptiveInstance)
    }

    // 特殊处理 llm-intelligent 策略
    if (this.config.defaultStrategy === 'llm-intelligent' || this.config.strategies.some(s => s.type === 'llm-intelligent')) {
      const llmInstance = new LLMIntelligentStrategy(this.config.llmOptions)
      this.instances.set('llm-intelligent', llmInstance)
    }

    // 特殊处理 super-intelligent 策略，需要其他策略实例
    if (this.config.defaultStrategy === 'super-intelligent' || this.config.strategies.some(s => s.type === 'super-intelligent')) {
      const superInstance = new SuperIntelligentStrategy(this.instances, this.config.superIntelligentOptions || {})
      this.instances.set('super-intelligent', superInstance)
    }
  }

  /**
   * 创建策略实例（内部）
   */
  private createStrategyInternal(
    type: SkillLoadingStrategyType,
    options?: Record<string, unknown>
  ): ISkillLoadingStrategy | null {
    const StrategyClass = strategyRegistry.get(type)
    if (!StrategyClass) {
      console.warn(`[StrategyFactory] Unknown strategy type: ${type}`)
      return null
    }

    try {
      return new StrategyClass(options)
    } catch (error) {
      console.error(`[StrategyFactory] Failed to create strategy ${type}:`, error)
      return null
    }
  }

  /**
   * 创建策略实例（接口实现）
   */
  createStrategy(type: SkillLoadingStrategyType, options?: Record<string, unknown>): ISkillLoadingStrategy {
    // 检查是否已有实例
    if (this.instances.has(type)) {
      return this.instances.get(type)!
    }

    // 创建新实例
    const instance = this.createStrategyInternal(type, options)
    if (!instance) {
      throw new Error(`Failed to create strategy: ${type}`)
    }

    this.instances.set(type, instance)
    return instance
  }

  /**
   * 注册新策略类型
   */
  registerStrategy(type: SkillLoadingStrategyType, strategyClass: new () => ISkillLoadingStrategy): void {
    strategyRegistry.set(type, strategyClass as StrategyClass)
  }

  /**
   * 获取策略实例
   */
  getStrategy(type: SkillLoadingStrategyType): ISkillLoadingStrategy | undefined {
    return this.instances.get(type)
  }

  /**
   * 获取默认策略
   */
  getDefaultStrategy(): ISkillLoadingStrategy {
    const strategy = this.instances.get(this.config.defaultStrategy)
    if (!strategy) {
      throw new Error(`Default strategy not found: ${this.config.defaultStrategy}`)
    }
    return strategy
  }

  /**
   * 获取所有可用策略
   */
  getAllStrategies(): ISkillLoadingStrategy[] {
    return Array.from(this.instances.values())
  }

  /**
   * 获取策略类型列表
   */
  getAvailableStrategyTypes(): SkillLoadingStrategyType[] {
    return Array.from(this.instances.keys())
  }

  /**
   * 更新配置
   */
  updateConfig(config: Partial<SkillLoadingConfig>): void {
    this.config = { ...this.config, ...config }
    // 重新初始化
    this.instances.clear()
    this.initializeStrategies()
  }

  /**
   * 获取当前配置
   */
  getConfig(): SkillLoadingConfig {
    return { ...this.config }
  }

  /**
   * 选择技能（便捷方法）
   */
  async selectSkills(userInput: string, availableSkills: Skill[]): Promise<SkillLoadingResult> {
    const strategy = this.getDefaultStrategy()
    return strategy.select({
      userInput,
      availableSkills,
    })
  }
}

// 单例实例
let globalFactory: StrategyFactory | null = null

export function createStrategyFactory(config: SkillLoadingConfig): StrategyFactory {
  globalFactory = new StrategyFactory(config)
  return globalFactory
}

export function getStrategyFactory(): StrategyFactory | null {
  return globalFactory
}

export function resetStrategyFactory(): void {
  globalFactory = null
}
