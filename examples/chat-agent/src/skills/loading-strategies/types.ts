/**
 * 技能加载策略模式 - 类型定义
 *
 * 定义策略接口、配置类型和结果类型
 */

import type { Skill, SkillMatch } from '../../types'

// ============================================
// 策略类型枚举
// ============================================

export type SkillLoadingStrategyType =
  | 'keyword'           // 基于关键词匹配
  | 'semantic'          // 基于语义相似度
  | 'llm'               // 基于LLM智能选择
  | 'rule'              // 基于规则匹配
  | 'hybrid'            // 混合策略
  | 'mcts'              // 基于MCTS决策
  | 'adaptive'          // 自适应策略
  | 'llm-intelligent'   // LLM深度智能策略
  | 'super-intelligent' // 超级智能策略（默认，准确性最大化）

// ============================================
// 策略上下文
// ============================================

export interface SkillLoadingContext {
  userInput: string
  conversationHistory?: string[]
  availableSkills: Skill[]
  previouslyUsedSkills?: string[]
  metadata?: Record<string, unknown>
}

// ============================================
// 策略结果
// ============================================

export interface SkillLoadingResult {
  selectedSkills: Skill[]
  matches: SkillMatch[]
  confidence: number
  reasoning: string
  strategyUsed: SkillLoadingStrategyType
  executionTime: number
}

// ============================================
// 策略接口
// ============================================

export interface ISkillLoadingStrategy {
  readonly name: SkillLoadingStrategyType
  readonly description: string

  /**
   * 执行技能选择
   */
  select(context: SkillLoadingContext): Promise<SkillLoadingResult>

  /**
   * 计算单个技能的匹配分数
   */
  calculateScore?(skill: Skill, context: SkillLoadingContext): number
}

// ============================================
// 策略配置
// ============================================

export interface StrategyConfig {
  type: SkillLoadingStrategyType
  enabled: boolean
  priority: number // 优先级，数字越小优先级越高
  options?: Record<string, unknown>
}

export interface SkillLoadingConfig {
  /** 默认策略 */
  defaultStrategy: SkillLoadingStrategyType

  /** 策略列表 */
  strategies: StrategyConfig[]

  /** 全局配置 */
  global: {
    maxSkills: number
    minConfidence: number
    enableCache: boolean
    cacheTTL: number // 毫秒
    enableParallelExecution: boolean
  }

  /** 策略特定配置 */
  keywordOptions?: KeywordStrategyOptions
  semanticOptions?: SemanticStrategyOptions
  llmOptions?: LLMStrategyOptions
  ruleOptions?: RuleStrategyOptions
  hybridOptions?: HybridStrategyOptions
  mctsOptions?: MCTSStrategyOptions
  adaptiveOptions?: AdaptiveStrategyOptions
  superIntelligentOptions?: SuperIntelligentStrategyOptions
}

// ============================================
// 各策略配置选项
// ============================================

export interface KeywordStrategyOptions {
  weights: {
    nameMatch: number
    descriptionMatch: number
    tagMatch: number
    categoryMatch: number
    specialKeywordMatch: number
  }
  specialKeywords: Record<string, string[]>
  minKeywordLength: number
}

export interface SemanticStrategyOptions {
  embeddingProvider: 'openai' | 'local' | 'cohere'
  similarityThreshold: number
  topK: number
  useCache: boolean
}

export interface LLMStrategyOptions {
  model: string
  temperature: number
  maxTokens: number
  systemPrompt?: string
  timeout: number
}

export interface RuleStrategyOptions {
  rules: Array<{
    id: string
    condition: string // 条件表达式
    skills: string[] // 匹配时加载的技能
    priority: number
  }>
}

export interface HybridStrategyOptions {
  strategies: Array<{
    type: SkillLoadingStrategyType
    weight: number
  }>
  combinationMethod: 'weighted' | 'voting' | 'cascade'
}

export interface MCTSStrategyOptions {
  maxIterations: number
  explorationConstant: number
  timeout: number
  simulationDepth: number
}

export interface AdaptiveStrategyOptions {
  environment?: 'development' | 'production' | 'test' | 'low-end' | 'high-end'
  performanceThresholds?: {
    maxExecutionTime: number
    minCacheHitRate: number
    minAccuracy: number
    maxMemoryUsage: number
  }
  enableAutoSwitch?: boolean
  enableLearning?: boolean
  enablePreload?: boolean
  strategyPriorities?: Record<string, SkillLoadingStrategyType[]>
  fallbackStrategy?: SkillLoadingStrategyType
}

export interface SuperIntelligentStrategyOptions {
  accuracyFirst?: boolean
  stages?: {
    prefilter?: {
      enabled?: boolean
      strategy?: 'keyword' | 'rule'
      topK?: number
    }
    deepAnalysis?: {
      enabled?: boolean
      useLLM?: boolean
      timeout?: number
    }
    validation?: {
      enabled?: boolean
      minConfidence?: number
      requireConsensus?: boolean
    }
  }
  features?: {
    contextAwareness?: boolean
    multiTurnMemory?: boolean
    uncertaintyHandling?: boolean
    selfCorrection?: boolean
    skillChaining?: boolean
  }
  learning?: {
    enabled?: boolean
    feedbackLoop?: boolean
    adaptThresholds?: boolean
  }
}

// ============================================
// 策略工厂
// ============================================

export interface IStrategyFactory {
  createStrategy(type: SkillLoadingStrategyType, config?: Record<string, unknown>): ISkillLoadingStrategy
  registerStrategy(type: SkillLoadingStrategyType, strategy: new () => ISkillLoadingStrategy): void
}
