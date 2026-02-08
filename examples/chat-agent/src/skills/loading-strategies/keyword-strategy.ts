/**
 * 关键词匹配策略
 *
 * 基于关键词匹配算法选择技能
 * 特点：快速、轻量、可解释性强
 */

import type {
  ISkillLoadingStrategy,
  SkillLoadingContext,
  SkillLoadingResult,
  KeywordStrategyOptions,
} from './types'
import type { Skill, SkillMatch } from '../../types'

const DEFAULT_OPTIONS: KeywordStrategyOptions = {
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
}

export class KeywordStrategy implements ISkillLoadingStrategy {
  readonly name = 'keyword' as const
  readonly description = '基于关键词匹配的技能选择策略'

  private options: KeywordStrategyOptions

  constructor(options?: Partial<KeywordStrategyOptions>) {
    this.options = { ...DEFAULT_OPTIONS, ...options }
  }

  async select(context: SkillLoadingContext): Promise<SkillLoadingResult> {
    const startTime = Date.now()
    const { userInput, availableSkills } = context

    const matches: SkillMatch[] = []

    for (const skill of availableSkills) {
      const score = this.calculateScore(skill, context)
      if (score > 0) {
        matches.push({
          skill,
          score: Math.min(score, 1),
          matchedKeywords: this.getMatchedKeywords(skill, userInput),
        })
      }
    }

    // 按分数排序
    matches.sort((a, b) => b.score - a.score)

    const executionTime = Date.now() - startTime

    return {
      selectedSkills: matches.map(m => m.skill),
      matches,
      confidence: matches.length > 0 ? matches[0].score : 0,
      reasoning: this.generateReasoning(matches),
      strategyUsed: this.name,
      executionTime,
    }
  }

  calculateScore(skill: Skill, context: SkillLoadingContext): number {
    const { userInput } = context
    const inputLower = userInput.toLowerCase()
    const keywords = this.extractKeywords(userInput)
    let score = 0

    // 1. 技能名称匹配
    const nameLower = skill.name.toLowerCase()
    if (inputLower.includes(nameLower)) {
      score += this.options.weights.nameMatch
    }

    // 2. 描述关键词匹配
    const descLower = skill.description.toLowerCase()
    const descWords = descLower.split(/\s+/)
    let descMatches = 0
    for (const word of keywords) {
      if (descWords.some(dw => dw.includes(word.toLowerCase()) || word.toLowerCase().includes(dw))) {
        descMatches++
      }
    }
    score += Math.min(descMatches * 0.05, this.options.weights.descriptionMatch)

    // 3. 标签匹配
    if (skill.metadata?.tags) {
      let tagMatches = 0
      for (const tag of skill.metadata.tags) {
        if (inputLower.includes(tag.toLowerCase())) {
          tagMatches++
        }
      }
      score += Math.min(tagMatches * 0.05, this.options.weights.tagMatch)
    }

    // 4. 类别匹配
    if (skill.metadata?.category && inputLower.includes(skill.metadata.category.toLowerCase())) {
      score += this.options.weights.categoryMatch
    }

    // 5. 特殊关键词匹配
    const specialWords = this.options.specialKeywords[skill.name] || []
    for (const word of specialWords) {
      if (inputLower.includes(word.toLowerCase())) {
        score += this.options.weights.specialKeywordMatch
        break // 只加一次
      }
    }

    // 6. 正则模式匹配（用于数学计算等）
    if (skill.name === 'math') {
      if (/\d+\s*[+\-*/]\s*\d+/.test(userInput)) {
        score += 0.3
      }
    }

    return Math.min(score, 1)
  }

  private extractKeywords(text: string): string[] {
    // 提取中文词汇（2字以上）
    const chineseWords = text.match(/[\u4e00-\u9fa5]{2,}/g) || []
    // 提取英文词汇（3字母以上）
    const englishWords = text.toLowerCase().match(/[a-z]{3,}/g) || []
    return [...chineseWords, ...englishWords]
  }

  private getMatchedKeywords(skill: Skill, userInput: string): string[] {
    const inputLower = userInput.toLowerCase()
    const matched: string[] = []

    // 检查特殊关键词
    const specialWords = this.options.specialKeywords[skill.name] || []
    for (const word of specialWords) {
      if (inputLower.includes(word.toLowerCase())) {
        matched.push(word)
      }
    }

    // 检查标签
    if (skill.metadata?.tags) {
      for (const tag of skill.metadata.tags) {
        if (inputLower.includes(tag.toLowerCase())) {
          matched.push(tag)
        }
      }
    }

    return [...new Set(matched)]
  }

  private generateReasoning(matches: SkillMatch[]): string {
    if (matches.length === 0) {
      return '未找到匹配的技能'
    }

    const topMatch = matches[0]
    return `基于关键词匹配，"${topMatch.skill.name}" 匹配度最高 (${(topMatch.score * 100).toFixed(1)}%)，匹配关键词: ${topMatch.matchedKeywords.slice(0, 3).join(', ')}`
  }
}
