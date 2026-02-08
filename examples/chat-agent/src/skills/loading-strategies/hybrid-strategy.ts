/**
 * 混合策略
 *
 * 组合多种策略的结果，取最优解
 * 特点：综合各策略优点，准确性高
 */

import type {
  ISkillLoadingStrategy,
  SkillLoadingContext,
  SkillLoadingResult,
  HybridStrategyOptions,
  SkillLoadingStrategyType,
} from './types'
import type { Skill, SkillMatch } from '../../types'

const DEFAULT_OPTIONS: HybridStrategyOptions = {
  strategies: [
    { type: 'keyword', weight: 0.4 },
    { type: 'rule', weight: 0.6 },
  ],
  combinationMethod: 'weighted',
}

export class HybridStrategy implements ISkillLoadingStrategy {
  readonly name = 'hybrid' as const
  readonly description = '组合多种策略的混合策略'

  private options: HybridStrategyOptions
  private strategies: Map<SkillLoadingStrategyType, ISkillLoadingStrategy>

  constructor(
    strategyInstances: Map<SkillLoadingStrategyType, ISkillLoadingStrategy>,
    options?: Partial<HybridStrategyOptions>
  ) {
    this.options = { ...DEFAULT_OPTIONS, ...options }
    this.strategies = strategyInstances
  }

  async select(context: SkillLoadingContext): Promise<SkillLoadingResult> {
    const startTime = Date.now()

    // 并行执行所有子策略
    const strategyPromises = this.options.strategies.map(async ({ type, weight }) => {
      const strategy = this.strategies.get(type)
      if (!strategy) {
        console.warn(`[HybridStrategy] Strategy ${type} not found`)
        return null
      }

      try {
        const result = await strategy.select(context)
        return { type, weight, result }
      } catch (error) {
        console.error(`[HybridStrategy] Strategy ${type} failed:`, error)
        return null
      }
    })

    const results = (await Promise.all(strategyPromises)).filter(
      (r): r is { type: SkillLoadingStrategyType; weight: number; result: SkillLoadingResult } => r !== null
    )

    if (results.length === 0) {
      return {
        selectedSkills: [],
        matches: [],
        confidence: 0,
        reasoning: '所有策略都失败了',
        strategyUsed: this.name,
        executionTime: Date.now() - startTime,
      }
    }

    // 合并结果
    let matches: SkillMatch[]
    switch (this.options.combinationMethod) {
      case 'weighted':
        matches = this.combineWeighted(results, context.availableSkills)
        break
      case 'voting':
        matches = this.combineVoting(results, context.availableSkills)
        break
      case 'cascade':
        matches = this.combineCascade(results, context.availableSkills)
        break
      default:
        matches = this.combineWeighted(results, context.availableSkills)
    }

    // 按分数排序
    matches.sort((a, b) => b.score - a.score)

    const executionTime = Date.now() - startTime
    const confidence = matches.length > 0 ? matches[0].score : 0

    return {
      selectedSkills: matches.map(m => m.skill),
      matches,
      confidence,
      reasoning: this.generateReasoning(results, matches),
      strategyUsed: this.name,
      executionTime,
    }
  }

  /**
   * 加权合并
   */
  private combineWeighted(
    results: { type: SkillLoadingStrategyType; weight: number; result: SkillLoadingResult }[],
    _availableSkills: Skill[]
  ): SkillMatch[] {
    const skillScores = new Map<string, { skill: Skill; score: number; sources: string[] }>()

    for (const { type, weight, result } of results) {
      for (const match of result.matches) {
        const existing = skillScores.get(match.skill.name)
        const weightedScore = match.score * weight

        if (existing) {
          existing.score += weightedScore
          existing.sources.push(type)
        } else {
          skillScores.set(match.skill.name, {
            skill: match.skill,
            score: weightedScore,
            sources: [type],
          })
        }
      }
    }

    return Array.from(skillScores.values()).map(({ skill, score, sources }) => ({
      skill,
      score: Math.min(score, 1),
      matchedKeywords: sources,
    }))
  }

  /**
   * 投票合并
   */
  private combineVoting(
    results: { type: SkillLoadingStrategyType; weight: number; result: SkillLoadingResult }[],
    _availableSkills: Skill[]
  ): SkillMatch[] {
    const skillVotes = new Map<string, { skill: Skill; votes: number; totalScore: number }>()

    for (const { result } of results) {
      for (const match of result.matches) {
        const existing = skillVotes.get(match.skill.name)

        if (existing) {
          existing.votes++
          existing.totalScore += match.score
        } else {
          skillVotes.set(match.skill.name, {
            skill: match.skill,
            votes: 1,
            totalScore: match.score,
          })
        }
      }
    }

    return Array.from(skillVotes.values()).map(({ skill, votes, totalScore }) => ({
      skill,
      score: Math.min((votes / results.length) * 0.5 + totalScore * 0.5, 1),
      matchedKeywords: [`${votes} votes`],
    }))
  }

  /**
   * 级联合并（按优先级依次尝试）
   */
  private combineCascade(
    results: { type: SkillLoadingStrategyType; weight: number; result: SkillLoadingResult }[],
    _availableSkills: Skill[]
  ): SkillMatch[] {
    // 按权重排序（高权重优先）
    const sortedResults = [...results].sort((a, b) => b.weight - a.weight)

    // 返回第一个有结果的高权重策略的结果
    for (const { result } of sortedResults) {
      if (result.matches.length > 0) {
        return result.matches.map(m => ({
          ...m,
          matchedKeywords: [...m.matchedKeywords, 'cascade'],
        }))
      }
    }

    return []
  }

  private generateReasoning(
    results: { type: SkillLoadingStrategyType; weight: number; result: SkillLoadingResult }[],
    matches: SkillMatch[]
  ): string {
    if (matches.length === 0) {
      return '混合策略未找到匹配的技能'
    }

    const strategyInfo = results
      .map(r => `${r.type}(${Math.round(r.weight * 100)}%)`)
      .join(' + ')

    const topMatch = matches[0]
    return `使用混合策略 (${strategyInfo})，"${topMatch.skill.name}" 综合得分最高 (${(topMatch.score * 100).toFixed(1)}%)`
  }

  /**
   * 更新策略权重
   */
  updateWeights(weights: Record<SkillLoadingStrategyType, number>): void {
    this.options.strategies = this.options.strategies.map(s => ({
      ...s,
      weight: weights[s.type] ?? s.weight,
    }))
  }

  /**
   * 设置组合方法
   */
  setCombinationMethod(method: HybridStrategyOptions['combinationMethod']): void {
    this.options.combinationMethod = method
  }
}
