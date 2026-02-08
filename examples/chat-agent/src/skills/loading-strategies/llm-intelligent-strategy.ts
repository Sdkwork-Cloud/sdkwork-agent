/**
 * LLM 智能策略 - LLM Intelligent Strategy
 *
 * 使用 LLM 进行深度意图理解和技能选择
 * 结合上下文、历史对话、用户偏好进行智能决策
 * 准确性和智能性优先
 */

import type {
  ISkillLoadingStrategy,
  SkillLoadingContext,
  SkillLoadingResult,
} from './types'
import type { Skill, SkillMatch } from '../../types'
import { KeywordStrategy } from './keyword-strategy'

// 意图分析结果
export interface IntentAnalysis {
  primaryIntent: string
  secondaryIntents: string[]
  entities: Array<{
    type: string
    value: string
    confidence: number
  }>
  complexity: 'simple' | 'medium' | 'complex'
  urgency: 'low' | 'medium' | 'high'
  contextNeeded: boolean
}

// 技能选择决策
export interface SkillDecision {
  selectedSkills: string[]
  reasoning: string
  confidence: number
  chainOfThought: string[]
  fallbackSkills: string[]
  requiredContext: string[]
}

// LLM 策略配置
export interface LLMIntelligentConfig {
  // 模型配置
  model: string
  temperature: number
  maxTokens: number

  // 智能特性开关
  enableIntentAnalysis: boolean
  enableContextAwareness: boolean
  enableMultiTurnMemory: boolean
  enableSkillChaining: boolean
  enableUncertaintyHandling: boolean

  // 准确性配置
  minConfidenceThreshold: number
  requireExplanation: boolean
  maxSkillsToSelect: number

  // 系统提示词
  systemPrompt?: string
}

// 默认配置
const DEFAULT_CONFIG: LLMIntelligentConfig = {
  model: 'gpt-4',
  temperature: 0.2, // 低温度，更确定性
  maxTokens: 2000,
  enableIntentAnalysis: true,
  enableContextAwareness: true,
  enableMultiTurnMemory: true,
  enableSkillChaining: true,
  enableUncertaintyHandling: true,
  minConfidenceThreshold: 0.7,
  requireExplanation: true,
  maxSkillsToSelect: 3,
}

// 模拟 LLM 调用（实际项目中替换为真实 LLM API）
async function mockLLMCall(prompt: string): Promise<string> {
  // 模拟延迟
  await new Promise(resolve => setTimeout(resolve, 100))

  // 这里应该调用真实的 LLM API
  // 例如: OpenAI, Claude, 或其他模型
  console.log('[LLM] Prompt:', prompt.substring(0, 200) + '...')

  return JSON.stringify({
    intent: 'calculation',
    skills: ['math'],
    confidence: 0.95,
    reasoning: '用户明确要求进行数学计算',
  })
}

export class LLMIntelligentStrategy implements ISkillLoadingStrategy {
  readonly name = 'llm-intelligent' as const
  readonly description = '使用LLM进行深度意图理解的智能策略'

  private config: LLMIntelligentConfig
  private conversationHistory: Array<{
    role: 'user' | 'assistant'
    content: string
    selectedSkills: string[]
    timestamp: number
  }> = []

  constructor(config?: Partial<LLMIntelligentConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config }
  }

  async select(context: SkillLoadingContext): Promise<SkillLoadingResult> {
    const startTime = Date.now()
    const { userInput, availableSkills, conversationHistory } = context

    try {
      // 1. 意图分析
      const intentAnalysis = await this.analyzeIntent(userInput)

      // 2. 构建上下文
      const enrichedContext = await this.buildContext(
        userInput,
        intentAnalysis,
        availableSkills,
        conversationHistory
      )

      // 3. LLM 决策
      const decision = await this.makeDecision(enrichedContext, availableSkills)

      // 4. 验证和优化
      const validatedDecision = await this.validateDecision(decision, availableSkills)

      // 5. 构建结果
      const matches = this.buildMatches(validatedDecision, availableSkills)

      // 6. 更新历史
      this.updateHistory(userInput, validatedDecision.selectedSkills)

      const executionTime = Date.now() - startTime

      return {
        selectedSkills: matches.map(m => m.skill),
        matches,
        confidence: validatedDecision.confidence,
        reasoning: this.generateDetailedReasoning(validatedDecision, intentAnalysis),
        strategyUsed: this.name,
        executionTime,
      }
    } catch (error) {
      console.error('[LLMIntelligentStrategy] Error:', error)
      // 降级到关键词策略
      return this.fallbackToKeyword(context, startTime)
    }
  }

  /**
   * 深度意图分析
   */
  private async analyzeIntent(userInput: string): Promise<IntentAnalysis> {
    if (!this.config.enableIntentAnalysis) {
      return {
        primaryIntent: 'unknown',
        secondaryIntents: [],
        entities: [],
        complexity: 'simple',
        urgency: 'low',
        contextNeeded: false,
      }
    }

    const prompt = `分析用户输入的意图：

用户输入: "${userInput}"

请分析并返回 JSON 格式：
{
  "primaryIntent": "主要意图",
  "secondaryIntents": ["次要意图1", "次要意图2"],
  "entities": [
    {"type": "实体类型", "value": "实体值", "confidence": 0.9}
  ],
  "complexity": "simple|medium|complex",
  "urgency": "low|medium|high",
  "contextNeeded": true|false
}`

    try {
      const response = await mockLLMCall(prompt)
      const analysis = JSON.parse(response)

      return {
        primaryIntent: analysis.intent || 'unknown',
        secondaryIntents: analysis.secondaryIntents || [],
        entities: analysis.entities || [],
        complexity: analysis.complexity || 'simple',
        urgency: analysis.urgency || 'low',
        contextNeeded: analysis.contextNeeded || false,
      }
    } catch {
      return {
        primaryIntent: 'unknown',
        secondaryIntents: [],
        entities: [],
        complexity: 'simple',
        urgency: 'low',
        contextNeeded: false,
      }
    }
  }

  /**
   * 构建丰富上下文
   */
  private async buildContext(
    userInput: string,
    intentAnalysis: IntentAnalysis,
    availableSkills: Skill[],
    conversationHistory?: string[]
  ): Promise<string> {
    const parts: string[] = []

    // 用户输入
    parts.push(`当前输入: "${userInput}"`)

    // 意图分析
    parts.push(`\n意图分析:`)
    parts.push(`- 主要意图: ${intentAnalysis.primaryIntent}`)
    parts.push(`- 复杂度: ${intentAnalysis.complexity}`)
    parts.push(`- 紧急度: ${intentAnalysis.urgency}`)
    parts.push(`- 需要上下文: ${intentAnalysis.contextNeeded ? '是' : '否'}`)

    if (intentAnalysis.entities.length > 0) {
      parts.push(`- 识别实体:`)
      intentAnalysis.entities.forEach(e => {
        parts.push(`  * ${e.type}: ${e.value} (${Math.round(e.confidence * 100)}%)`)
      })
    }

    // 历史对话
    if (this.config.enableMultiTurnMemory && conversationHistory && conversationHistory.length > 0) {
      parts.push(`\n历史对话:`)
      conversationHistory.slice(-5).forEach((msg, i) => {
        parts.push(`${i + 1}. ${msg}`)
      })
    }

    // 可用技能
    parts.push(`\n可用技能:`)
    availableSkills.forEach(skill => {
      parts.push(`- ${skill.name}: ${skill.description}`)
      if (skill.metadata?.tags) {
        parts.push(`  标签: ${skill.metadata.tags.join(', ')}`)
      }
    })

    return parts.join('\n')
  }

  /**
   * LLM 决策
   */
  private async makeDecision(
    context: string,
    availableSkills: Skill[]
  ): Promise<SkillDecision> {
    const skillDescriptions = availableSkills
      .map(s => `- ${s.name}: ${s.description}`)
      .join('\n')

    const prompt = `${context}

基于以上信息，选择最合适的技能。

可用技能:
${skillDescriptions}

请返回 JSON 格式决策：
{
  "selectedSkills": ["skill1", "skill2"],
  "reasoning": "选择理由",
  "confidence": 0.95,
  "chainOfThought": ["思考步骤1", "思考步骤2"],
  "fallbackSkills": ["fallback1"],
  "requiredContext": ["需要的上下文信息"]
}`

    try {
      const response = await mockLLMCall(prompt)
      const decision = JSON.parse(response)

      return {
        selectedSkills: decision.selectedSkills || [],
        reasoning: decision.reasoning || '基于LLM分析',
        confidence: decision.confidence || 0.5,
        chainOfThought: decision.chainOfThought || [],
        fallbackSkills: decision.fallbackSkills || [],
        requiredContext: decision.requiredContext || [],
      }
    } catch {
      // 如果LLM失败，使用启发式方法
      return this.heuristicDecision(availableSkills)
    }
  }

  /**
   * 启发式决策（LLM失败时备用）
   */
  private heuristicDecision(availableSkills: Skill[]): SkillDecision {
    // 简单的关键词匹配作为备用
    return {
      selectedSkills: availableSkills.slice(0, 2).map(s => s.name),
      reasoning: '使用启发式备用策略',
      confidence: 0.5,
      chainOfThought: ['LLM调用失败，使用备用策略'],
      fallbackSkills: [],
      requiredContext: [],
    }
  }

  /**
   * 验证决策
   */
  private async validateDecision(
    decision: SkillDecision,
    availableSkills: Skill[]
  ): Promise<SkillDecision> {
    // 验证选中的技能是否存在
    const validSkills = decision.selectedSkills.filter(name =>
      availableSkills.some(s => s.name === name)
    )

    // 如果置信度太低，添加备用技能
    let fallbackSkills = decision.fallbackSkills
    if (decision.confidence < this.config.minConfidenceThreshold) {
      const additionalFallback = availableSkills
        .filter(s => !validSkills.includes(s.name))
        .slice(0, 2)
        .map(s => s.name)
      fallbackSkills = [...fallbackSkills, ...additionalFallback]
    }

    return {
      ...decision,
      selectedSkills: validSkills.slice(0, this.config.maxSkillsToSelect),
      fallbackSkills,
    }
  }

  /**
   * 构建匹配结果
   */
  private buildMatches(decision: SkillDecision, availableSkills: Skill[]): SkillMatch[] {
    const matches: SkillMatch[] = []

    for (const skillName of decision.selectedSkills) {
      const skill = availableSkills.find(s => s.name === skillName)
      if (skill) {
        matches.push({
          skill,
          score: decision.confidence,
          matchedKeywords: decision.chainOfThought,
        })
      }
    }

    // 添加备用技能（置信度降低）
    for (const skillName of decision.fallbackSkills) {
      const skill = availableSkills.find(s => s.name === skillName)
      if (skill && !matches.some(m => m.skill.name === skillName)) {
        matches.push({
          skill,
          score: decision.confidence * 0.7, // 备用技能置信度降低
          matchedKeywords: ['fallback'],
        })
      }
    }

    return matches.sort((a, b) => b.score - a.score)
  }

  /**
   * 生成详细理由
   */
  private generateDetailedReasoning(
    decision: SkillDecision,
    intentAnalysis: IntentAnalysis
  ): string {
    const parts: string[] = []

    parts.push(`[LLM智能分析]`)
    parts.push(`主要意图: ${intentAnalysis.primaryIntent}`)
    parts.push(`复杂度: ${intentAnalysis.complexity}`)

    if (decision.chainOfThought.length > 0) {
      parts.push(`\n思考过程:`)
      decision.chainOfThought.forEach((step, i) => {
        parts.push(`${i + 1}. ${step}`)
      })
    }

    parts.push(`\n选择理由: ${decision.reasoning}`)
    parts.push(`置信度: ${Math.round(decision.confidence * 100)}%`)

    if (decision.fallbackSkills.length > 0) {
      parts.push(`\n备用技能: ${decision.fallbackSkills.join(', ')}`)
    }

    return parts.join('\n')
  }

  /**
   * 更新历史
   */
  private updateHistory(userInput: string, selectedSkills: string[]): void {
    this.conversationHistory.push({
      role: 'user',
      content: userInput,
      selectedSkills,
      timestamp: Date.now(),
    })

    // 限制历史长度
    if (this.conversationHistory.length > 20) {
      this.conversationHistory = this.conversationHistory.slice(-20)
    }
  }

  /**
   * 降级到关键词策略
   */
  private async fallbackToKeyword(
    context: SkillLoadingContext,
    startTime: number
  ): Promise<SkillLoadingResult> {
    const keywordStrategy = new KeywordStrategy()

    const result = await keywordStrategy.select(context)
    return {
      ...result,
      reasoning: `[LLM降级] ${result.reasoning}`,
      strategyUsed: this.name,
      executionTime: Date.now() - startTime,
    }
  }

  /**
   * 获取对话历史
   */
  getConversationHistory(): typeof this.conversationHistory {
    return [...this.conversationHistory]
  }

  /**
   * 清空历史
   */
  clearHistory(): void {
    this.conversationHistory = []
  }

  /**
   * 更新配置
   */
  updateConfig(config: Partial<LLMIntelligentConfig>): void {
    this.config = { ...this.config, ...config }
  }
}
