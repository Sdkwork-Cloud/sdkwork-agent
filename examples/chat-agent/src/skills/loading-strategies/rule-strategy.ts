/**
 * 基于规则的策略
 *
 * 使用预定义规则匹配用户输入并选择技能
 * 特点：确定性高、可预测、易于维护
 */

import type {
  ISkillLoadingStrategy,
  SkillLoadingContext,
  SkillLoadingResult,
  RuleStrategyOptions,
} from './types'
import type { Skill, SkillMatch } from '../../types'

// 默认规则集
const DEFAULT_RULES: RuleStrategyOptions['rules'] = [
  {
    id: 'math-calculation',
    condition: 'input.matches(/\\d+\\s*[+\\-*/]\\s*\\d+/) || input.containsAny(["计算", "等于", "多少", "math", "calculat"])',
    skills: ['math'],
    priority: 1,
  },
  {
    id: 'translation-request',
    condition: 'input.containsAny(["翻译", "translate", "中文", "英文", "english", "chinese"])',
    skills: ['translate'],
    priority: 1,
  },
  {
    id: 'code-help',
    condition: 'input.containsAny(["代码", "编程", "code", "program", "bug", "debug", "error", "function"])',
    skills: ['code-assistant'],
    priority: 1,
  },
  {
    id: 'weather-query',
    condition: 'input.containsAny(["天气", "weather", "温度", "下雨", "forecast"])',
    skills: ['weather'],
    priority: 1,
  },
  {
    id: 'time-query',
    condition: 'input.containsAny(["时间", "日期", "time", "date", "几点", "今天"])',
    skills: ['time'],
    priority: 1,
  },
  {
    id: 'search-request',
    condition: 'input.containsAny(["搜索", "search", "查询", "查找", "google", "百度"])',
    skills: ['web-search'],
    priority: 1,
  },
  {
    id: 'summarize-request',
    condition: 'input.containsAny(["总结", "summar", "摘要", "概括", "summary"])',
    skills: ['summarize'],
    priority: 1,
  },
]

export class RuleStrategy implements ISkillLoadingStrategy {
  readonly name = 'rule' as const
  readonly description = '基于预定义规则的技能选择策略'

  private rules: RuleStrategyOptions['rules']

  constructor(options?: Partial<RuleStrategyOptions>) {
    this.rules = options?.rules ?? DEFAULT_RULES
  }

  async select(context: SkillLoadingContext): Promise<SkillLoadingResult> {
    const startTime = Date.now()
    const { userInput, availableSkills } = context

    const matchedSkills = new Map<string, { skill: Skill; matchedRules: string[]; priority: number }>()

    // 按优先级排序规则
    const sortedRules = [...this.rules].sort((a, b) => a.priority - b.priority)

    for (const rule of sortedRules) {
      if (this.evaluateCondition(rule.condition, userInput)) {
        for (const skillName of rule.skills) {
          const skill = availableSkills.find(s => s.name === skillName)
          if (skill) {
            if (matchedSkills.has(skillName)) {
              const existing = matchedSkills.get(skillName)!
              existing.matchedRules.push(rule.id)
              existing.priority = Math.min(existing.priority, rule.priority)
            } else {
              matchedSkills.set(skillName, {
                skill,
                matchedRules: [rule.id],
                priority: rule.priority,
              })
            }
          }
        }
      }
    }

    // 转换为 SkillMatch
    const matches: SkillMatch[] = Array.from(matchedSkills.values()).map(({ skill, matchedRules, priority }) => ({
      skill,
      score: this.calculateScoreFromPriority(priority, matchedRules.length),
      matchedKeywords: matchedRules,
    }))

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

  /**
   * 评估规则条件
   * 支持简单的条件表达式
   */
  private evaluateCondition(condition: string, input: string): boolean {
    try {
      // 创建安全的评估上下文
      const context = {
        input: {
          text: input.toLowerCase(),
          contains: (str: string) => input.toLowerCase().includes(str.toLowerCase()),
          containsAny: (arr: string[]) => arr.some(s => input.toLowerCase().includes(s.toLowerCase())),
          matches: (regex: RegExp) => regex.test(input),
          startsWith: (str: string) => input.toLowerCase().startsWith(str.toLowerCase()),
          endsWith: (str: string) => input.toLowerCase().endsWith(str.toLowerCase()),
        },
      }

      // 简单的条件解析
      // 替换 input.xxx() 为 context.input.xxx()
      const normalizedCondition = condition
        .replace(/input\.containsAny\(([^)]+)\)/g, 'context.input.containsAny($1)')
        .replace(/input\.contains\(([^)]+)\)/g, 'context.input.contains($1)')
        .replace(/input\.matches\(([^)]+)\)/g, 'context.input.matches($1)')
        .replace(/input\.startsWith\(([^)]+)\)/g, 'context.input.startsWith($1)')
        .replace(/input\.endsWith\(([^)]+)\)/g, 'context.input.endsWith($1)')

      // 使用 Function 构造函数创建安全的求值函数
      const evaluator = new Function('context', `return ${normalizedCondition}`)
      return evaluator(context) as boolean
    } catch (error) {
      console.warn(`[RuleStrategy] Failed to evaluate condition: ${condition}`, error)
      return false
    }
  }

  private calculateScoreFromPriority(priority: number, ruleCount: number): number {
    // 优先级越高（数字越小），分数越高
    // 匹配的规则越多，分数越高
    const baseScore = Math.max(0.5, 1 - (priority - 1) * 0.1)
    const bonus = Math.min(ruleCount * 0.1, 0.3)
    return Math.min(baseScore + bonus, 1)
  }

  private generateReasoning(matches: SkillMatch[]): string {
    if (matches.length === 0) {
      return '未匹配任何规则'
    }

    const topMatch = matches[0]
    return `基于规则匹配，"${topMatch.skill.name}" 匹配了规则: ${topMatch.matchedKeywords.join(', ')}`
  }

  /**
   * 添加自定义规则
   */
  addRule(rule: RuleStrategyOptions['rules'][0]): void {
    this.rules.push(rule)
    // 重新排序
    this.rules.sort((a, b) => a.priority - b.priority)
  }

  /**
   * 移除规则
   */
  removeRule(ruleId: string): void {
    this.rules = this.rules.filter(r => r.id !== ruleId)
  }

  /**
   * 获取所有规则
   */
  getRules(): RuleStrategyOptions['rules'] {
    return [...this.rules]
  }
}
