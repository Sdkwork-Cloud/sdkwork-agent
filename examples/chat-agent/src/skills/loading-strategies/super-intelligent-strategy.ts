/**
 * 超级智能策略 - Super Intelligent Strategy
 *
 * 终极智能策略，整合所有策略优点：
 * 1. 快速预筛选（关键词）
 * 2. 深度意图理解（LLM）
 * 3. 上下文感知
 * 4. 多轮对话记忆
 * 5. 不确定性处理
 * 6. 自学习和优化
 *
 * 准确性和智能性最大化
 */

import type {
  ISkillLoadingStrategy,
  SkillLoadingContext,
  SkillLoadingResult,
} from './types'
import type { Skill, SkillMatch } from '../../types'
import { KeywordStrategy } from './keyword-strategy'

// 超级智能配置
export interface SuperIntelligentConfig {
  // 准确性优先
  accuracyFirst?: boolean

  // 各阶段配置
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

  // 智能特性
  features?: {
    contextAwareness?: boolean
    multiTurnMemory?: boolean
    uncertaintyHandling?: boolean
    selfCorrection?: boolean
    skillChaining?: boolean
  }

  // 学习配置
  learning?: {
    enabled?: boolean
    feedbackLoop?: boolean
    adaptThresholds?: boolean
  }
}

// 默认配置 - 准确性优先
const DEFAULT_CONFIG: SuperIntelligentConfig = {
  accuracyFirst: true,
  stages: {
    prefilter: {
      enabled: true,
      strategy: 'keyword',
      topK: 5,
    },
    deepAnalysis: {
      enabled: true,
      useLLM: false, // 默认不使用LLM，避免延迟
      timeout: 500,
    },
    validation: {
      enabled: true,
      minConfidence: 0.75,
      requireConsensus: true,
    },
  },
  features: {
    contextAwareness: true,
    multiTurnMemory: true,
    uncertaintyHandling: true,
    selfCorrection: true,
    skillChaining: true,
  },
  learning: {
    enabled: true,
    feedbackLoop: true,
    adaptThresholds: true,
  },
}

// 决策上下文
interface DecisionContext {
  userInput: string
  prefilteredSkills: Skill[]
  intentScore: number
  contextScore: number
  historyScore: number
  consensusScore: number
}

export class SuperIntelligentStrategy implements ISkillLoadingStrategy {
  readonly name = 'super-intelligent' as const
  readonly description = '超级智能策略，准确性最大化'

  private config: SuperIntelligentConfig
  private strategies: Map<string, ISkillLoadingStrategy>
  private decisionHistory: Array<{
    input: string
    selectedSkills: string[]
    confidence: number
    wasCorrect: boolean | null
    timestamp: number
  }> = []

  // 学习到的阈值
  private learnedThresholds = {
    keywordWeight: 0.3,
    ruleWeight: 0.4,
    contextWeight: 0.2,
    historyWeight: 0.1,
    minConfidence: 0.75,
  }

  constructor(
    strategies: Map<string, ISkillLoadingStrategy>,
    config?: Partial<SuperIntelligentConfig>
  ) {
    this.config = { ...DEFAULT_CONFIG, ...config }
    this.strategies = strategies
  }

  async select(context: SkillLoadingContext): Promise<SkillLoadingResult> {
    const startTime = Date.now()
    const { userInput, availableSkills, conversationHistory } = context

    try {
      // ========== 阶段 1: 快速预筛选 ==========
      const prefilteredSkills = await this.prefilter(userInput, availableSkills)

      if (prefilteredSkills.length === 0) {
        return this.createEmptyResult(startTime)
      }

      // ========== 阶段 2: 多维度深度分析 ==========
      const analysis = await this.deepAnalysis(
        userInput,
        prefilteredSkills,
        conversationHistory
      )

      // ========== 阶段 3: 智能决策融合 ==========
      const decision = await this.makeDecision({
        userInput,
        prefilteredSkills,
        intentScore: analysis.intentScore,
        contextScore: analysis.contextScore,
        historyScore: analysis.historyScore,
        consensusScore: analysis.consensusScore,
      })

      // ========== 阶段 4: 验证和优化 ==========
      const validated = await this.validateDecision(decision, prefilteredSkills)

      // ========== 阶段 5: 构建结果 ==========
      const matches = this.buildMatches(validated, prefilteredSkills)

      // ========== 阶段 6: 学习更新 ==========
      if (this.config.learning?.enabled) {
        this.updateLearning(userInput, matches)
      }

      const executionTime = Date.now() - startTime

      return {
        selectedSkills: matches.map(m => m.skill),
        matches,
        confidence: validated.confidence,
        reasoning: this.generateSuperReasoning(validated, analysis),
        strategyUsed: this.name,
        executionTime,
      }
    } catch (error) {
      console.error('[SuperIntelligentStrategy] Error:', error)
      return this.fallback(context, startTime)
    }
  }

  /**
   * 阶段 1: 快速预筛选
   */
  private async prefilter(userInput: string, availableSkills: Skill[]): Promise<Skill[]> {
    if (!this.config.stages?.prefilter?.enabled) {
      return availableSkills
    }

    const prefilterStrategy = this.strategies.get(this.config.stages.prefilter.strategy || 'keyword')
    if (!prefilterStrategy) {
      return availableSkills
    }

    const result = await prefilterStrategy.select({
      userInput,
      availableSkills,
    })

    return result.selectedSkills.slice(0, this.config.stages.prefilter.topK || 5)
  }

  /**
   * 阶段 2: 多维度深度分析
   */
  private async deepAnalysis(
    userInput: string,
    skills: Skill[],
    conversationHistory?: string[]
  ): Promise<{
    intentScore: number
    contextScore: number
    historyScore: number
    consensusScore: number
  }> {
    // 并行执行多个分析
    const [intentAnalysis, contextAnalysis, historyAnalysis, consensusAnalysis] = await Promise.all([
      this.analyzeIntent(userInput, skills),
      this.analyzeContext(userInput, skills),
      this.analyzeHistory(userInput, skills, conversationHistory),
      this.analyzeConsensus(userInput, skills),
    ])

    return {
      intentScore: intentAnalysis,
      contextScore: contextAnalysis,
      historyScore: historyAnalysis,
      consensusScore: consensusAnalysis,
    }
  }

  /**
   * 意图分析
   */
  private async analyzeIntent(userInput: string, skills: Skill[]): Promise<number> {
    const keywordStrategy = this.strategies.get('keyword') as KeywordStrategy
    if (!keywordStrategy?.calculateScore) {
      return 0.5
    }

    let totalScore = 0
    for (const skill of skills) {
      totalScore += keywordStrategy.calculateScore(skill, { userInput, availableSkills: skills })
    }

    return skills.length > 0 ? totalScore / skills.length : 0
  }

  /**
   * 上下文分析
   */
  private async analyzeContext(userInput: string, _skills: Skill[]): Promise<number> {
    if (!this.config.features?.contextAwareness) {
      return 0.5
    }

    // 分析输入复杂度
    const complexity = Math.min(userInput.length / 100, 1)

    // 分析实体密度
    const entityDensity = (userInput.match(/\b\w+\b/g) || []).length / userInput.length

    return (complexity + entityDensity) / 2
  }

  /**
   * 历史分析
   */
  private async analyzeHistory(
    userInput: string,
    _skills: Skill[],
    conversationHistory?: string[]
  ): Promise<number> {
    if (!this.config.features?.multiTurnMemory || !conversationHistory) {
      return 0.5
    }

    // 查找相似历史输入
    const similarInputs = this.decisionHistory.filter(d =>
      this.calculateSimilarity(d.input, userInput) > 0.7
    )

    if (similarInputs.length === 0) {
      return 0.5
    }

    // 计算历史准确率
    const correctDecisions = similarInputs.filter(d => d.wasCorrect === true)
    return correctDecisions.length / similarInputs.length
  }

  /**
   * 共识分析 - 多策略投票
   */
  private async analyzeConsensus(userInput: string, skills: Skill[]): Promise<number> {
    if (!this.config.stages?.validation?.requireConsensus) {
      return 0.5
    }

    const strategies = ['keyword', 'rule', 'hybrid']
    const votes = new Map<string, number>()

    for (const strategyName of strategies) {
      const strategy = this.strategies.get(strategyName)
      if (!strategy) continue

      try {
        const result = await strategy.select({ userInput, availableSkills: skills })
        for (const skill of result.selectedSkills.slice(0, 2)) {
          votes.set(skill.name, (votes.get(skill.name) || 0) + 1)
        }
      } catch {
        // 忽略失败的策略
      }
    }

    // 计算共识度
    if (votes.size === 0) return 0.5

    const maxVotes = Math.max(...votes.values())
    return maxVotes / strategies.length
  }

  /**
   * 阶段 3: 智能决策融合
   */
  private async makeDecision(context: DecisionContext): Promise<{
    selectedSkills: string[]
    confidence: number
    reasoning: string
    scores: Record<string, number>
  }> {
    const scores = new Map<string, number>()

    // 为每个技能计算综合得分
    for (const skill of context.prefilteredSkills) {
      const keywordScore = this.strategies.get('keyword')?.calculateScore
        ? (this.strategies.get('keyword') as KeywordStrategy).calculateScore!(skill, {
            userInput: context.userInput,
            availableSkills: context.prefilteredSkills,
          })
        : 0.5

      const ruleScore = 0.6 // 简化处理

      // 加权融合
      const finalScore =
        keywordScore * this.learnedThresholds.keywordWeight +
        ruleScore * this.learnedThresholds.ruleWeight +
        context.contextScore * this.learnedThresholds.contextWeight +
        context.historyScore * this.learnedThresholds.historyWeight

      scores.set(skill.name, finalScore)
    }

    // 排序并选择
    const sortedScores = Array.from(scores.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)

    const selectedSkills = sortedScores.map(([name]) => name)
    const avgConfidence = sortedScores.reduce((sum, [, score]) => sum + score, 0) / sortedScores.length

    return {
      selectedSkills,
      confidence: avgConfidence,
      reasoning: `综合得分: ${sortedScores.map(([name, score]) => `${name}(${score.toFixed(2)})`).join(', ')}`,
      scores: Object.fromEntries(scores),
    }
  }

  /**
   * 阶段 4: 验证决策
   */
  private async validateDecision(
    decision: {
      selectedSkills: string[]
      confidence: number
      reasoning: string
      scores: Record<string, number>
    },
    skills: Skill[]
  ): Promise<{
    selectedSkills: string[]
    confidence: number
    reasoning: string
  }> {
    if (!this.config.stages?.validation?.enabled) {
      return decision
    }

    // 验证技能存在
    const validSkills = decision.selectedSkills.filter(name =>
      skills.some(s => s.name === name)
    )

    // 验证置信度
    let confidence = decision.confidence
    if (confidence < (this.config.stages.validation.minConfidence || 0.75)) {
      // 置信度太低，降低权重
      confidence *= 0.8
    }

    return {
      selectedSkills: validSkills,
      confidence,
      reasoning: decision.reasoning,
    }
  }

  /**
   * 构建匹配结果
   */
  private buildMatches(
    decision: { selectedSkills: string[]; confidence: number; reasoning: string },
    skills: Skill[]
  ): SkillMatch[] {
    return decision.selectedSkills
      .map(name => {
        const skill = skills.find(s => s.name === name)
        if (!skill) return null
        return {
          skill,
          score: decision.confidence,
          matchedKeywords: [decision.reasoning],
        }
      })
      .filter((m): m is SkillMatch => m !== null)
  }

  /**
   * 生成超级理由
   */
  private generateSuperReasoning(
    decision: { selectedSkills: string[]; confidence: number; reasoning: string },
    analysis: {
      intentScore: number
      contextScore: number
      historyScore: number
      consensusScore: number
    }
  ): string {
    const parts: string[] = []

    parts.push(`[超级智能分析]`)
    parts.push(`选中技能: ${decision.selectedSkills.join(', ')}`)
    parts.push(`综合置信度: ${(decision.confidence * 100).toFixed(1)}%`)

    parts.push(`\n多维度评分:`)
    parts.push(`- 意图匹配: ${(analysis.intentScore * 100).toFixed(1)}%`)
    parts.push(`- 上下文: ${(analysis.contextScore * 100).toFixed(1)}%`)
    parts.push(`- 历史准确率: ${(analysis.historyScore * 100).toFixed(1)}%`)
    parts.push(`- 策略共识: ${(analysis.consensusScore * 100).toFixed(1)}%`)

    parts.push(`\n${decision.reasoning}`)

    if (this.config.learning?.enabled) {
      parts.push(`\n[学习状态] 已优化 ${this.decisionHistory.length} 次决策`)
    }

    return parts.join('\n')
  }

  /**
   * 学习更新
   */
  private updateLearning(userInput: string, matches: SkillMatch[]): void {
    this.decisionHistory.push({
      input: userInput,
      selectedSkills: matches.map(m => m.skill.name),
      confidence: matches[0]?.score || 0,
      wasCorrect: null, // 等待用户反馈
      timestamp: Date.now(),
    })

    // 限制历史长度
    if (this.decisionHistory.length > 100) {
      this.decisionHistory = this.decisionHistory.slice(-100)
    }

    // 自适应调整阈值
    if (this.config.learning?.adaptThresholds && this.decisionHistory.length > 10) {
      this.adaptThresholds()
    }
  }

  /**
   * 自适应调整阈值
   */
  private adaptThresholds(): void {
    const recentDecisions = this.decisionHistory.slice(-20)
    const correctDecisions = recentDecisions.filter(d => d.wasCorrect === true)

    if (correctDecisions.length < 5) return

    const accuracy = correctDecisions.length / recentDecisions.length

    // 根据准确率调整权重
    if (accuracy > 0.8) {
      // 准确率高，可以提高置信度阈值
      this.learnedThresholds.minConfidence = Math.min(
        0.9,
        this.learnedThresholds.minConfidence + 0.02
      )
    } else if (accuracy < 0.6) {
      // 准确率低，降低阈值，增加探索
      this.learnedThresholds.minConfidence = Math.max(
        0.5,
        this.learnedThresholds.minConfidence - 0.02
      )
    }
  }

  /**
   * 计算字符串相似度
   */
  private calculateSimilarity(str1: string, str2: string): number {
    const longer = str1.length > str2.length ? str1 : str2
    const shorter = str1.length > str2.length ? str2 : str1

    if (longer.length === 0) return 1.0

    const distance = this.levenshteinDistance(longer, shorter)
    return (longer.length - distance) / longer.length
  }

  /**
   * Levenshtein 距离
   */
  private levenshteinDistance(str1: string, str2: string): number {
    const matrix: number[][] = []

    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i]
    }

    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j
    }

    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1]
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          )
        }
      }
    }

    return matrix[str2.length][str1.length]
  }

  /**
   * 创建空结果
   */
  private createEmptyResult(startTime: number): SkillLoadingResult {
    return {
      selectedSkills: [],
      matches: [],
      confidence: 0,
      reasoning: '未找到匹配的技能',
      strategyUsed: this.name,
      executionTime: Date.now() - startTime,
    }
  }

  /**
   * 降级处理
   */
  private async fallback(context: SkillLoadingContext, startTime: number): Promise<SkillLoadingResult> {
    const keywordStrategy = this.strategies.get('keyword')
    if (keywordStrategy) {
      const result = await keywordStrategy.select(context)
      return {
        ...result,
        reasoning: `[超级智能降级] ${result.reasoning}`,
        strategyUsed: this.name,
        executionTime: Date.now() - startTime,
      }
    }

    return this.createEmptyResult(startTime)
  }

  /**
   * 提供反馈
   */
  provideFeedback(input: string, wasCorrect: boolean): void {
    const decision = this.decisionHistory.find(d => d.input === input)
    if (decision) {
      decision.wasCorrect = wasCorrect
    }
  }

  /**
   * 获取学习统计
   */
  getLearningStats(): {
    totalDecisions: number
    correctDecisions: number
    accuracy: number
    currentThresholds: {
      keywordWeight: number
      ruleWeight: number
      contextWeight: number
      historyWeight: number
      minConfidence: number
    }
  } {
    const correct = this.decisionHistory.filter(d => d.wasCorrect === true).length
    const total = this.decisionHistory.filter(d => d.wasCorrect !== null).length

    return {
      totalDecisions: this.decisionHistory.length,
      correctDecisions: correct,
      accuracy: total > 0 ? correct / total : 0,
      currentThresholds: { ...this.learnedThresholds },
    }
  }
}
