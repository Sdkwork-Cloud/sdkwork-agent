/**
 * 技能加载策略模式 - 入口文件
 *
 * 导出所有策略相关类型和函数
 */

// 导出类型
export type {
  SkillLoadingStrategyType,
  SkillLoadingContext,
  SkillLoadingResult,
  ISkillLoadingStrategy,
  IStrategyFactory,
  SkillLoadingConfig,
  StrategyConfig,
  KeywordStrategyOptions,
  SemanticStrategyOptions,
  LLMStrategyOptions,
  RuleStrategyOptions,
  HybridStrategyOptions,
  MCTSStrategyOptions,
  AdaptiveStrategyOptions,
} from './types'

// 导出策略实现
export { KeywordStrategy } from './keyword-strategy'
export { RuleStrategy } from './rule-strategy'
export { HybridStrategy } from './hybrid-strategy'
export { AdaptiveStrategy } from './adaptive-strategy'
export { LLMIntelligentStrategy } from './llm-intelligent-strategy'
export { SuperIntelligentStrategy } from './super-intelligent-strategy'

// 导出类型
export type { EnvironmentType, PerformanceMetrics, StrategyPerformance, AdaptiveConfig } from './adaptive-strategy'
export type { IntentAnalysis, SkillDecision, LLMIntelligentConfig } from './llm-intelligent-strategy'
export type { SuperIntelligentConfig } from './super-intelligent-strategy'

// 导出工厂
export {
  StrategyFactory,
  createStrategyFactory,
  getStrategyFactory,
  resetStrategyFactory,
} from './strategy-factory'

// 导出默认配置 - 使用超级智能策略作为默认
export const DEFAULT_SKILL_LOADING_CONFIG: import('./types').SkillLoadingConfig = {
  defaultStrategy: 'super-intelligent',
  strategies: [
    { type: 'keyword', enabled: true, priority: 1 },
    { type: 'rule', enabled: true, priority: 2 },
    { type: 'hybrid', enabled: true, priority: 3 },
    { type: 'adaptive', enabled: true, priority: 4 },
    { type: 'super-intelligent', enabled: true, priority: 0 },
  ],
  global: {
    maxSkills: 5,
    minConfidence: 0.75, // 提高默认置信度阈值
    enableCache: true,
    cacheTTL: 5 * 60 * 1000, // 5分钟
    enableParallelExecution: true,
  },
  keywordOptions: {
    weights: {
      nameMatch: 0.4,
      descriptionMatch: 0.3,
      tagMatch: 0.2,
      categoryMatch: 0.1,
      specialKeywordMatch: 0.15,
    },
    specialKeywords: {
      math: ['计算', '数学', 'calculat', 'math', '公式', '加减乘除', '平方', '根号', '等于', '多少'],
      translate: ['翻译', 'translate', '中文', '英文', 'english', 'chinese', '日文', '韩文', '语言'],
      'code-assistant': ['代码', '编程', 'code', 'program', 'bug', 'debug', 'error', 'function', '函数'],
      weather: ['天气', 'weather', '温度', '下雨', 'forecast', '晴天', '多云'],
      summarize: ['总结', 'summar', '摘要', '概括', 'summary', '归纳'],
      'web-search': ['搜索', 'search', '查询', '查找', 'google', '百度'],
      time: ['时间', '日期', 'time', 'date', '几点', '今天', '现在'],
    },
    minKeywordLength: 2,
  },
  hybridOptions: {
    strategies: [
      { type: 'keyword', weight: 0.4 },
      { type: 'rule', weight: 0.6 },
    ],
    combinationMethod: 'weighted',
  },
  adaptiveOptions: {
    enableAutoSwitch: true,
    enableLearning: true,
    performanceThresholds: {
      maxExecutionTime: 100,
      minCacheHitRate: 0.3,
      minAccuracy: 0.75, // 提高准确率要求
      maxMemoryUsage: 100,
    },
  },
}
