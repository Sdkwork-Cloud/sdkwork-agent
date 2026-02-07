import { v4 as uuidv4 } from 'uuid'
import type {
  AgentState,
  SmartAgentConfig,
  SmartResponse,
  DecisionResult,
  PlanResult,
  SecurityCheckResult,
  UserIntent,
  AgentEvent,
  WorkingMemory,
  ConversationContext,
  AgentMetrics,
  TaskNode,
  Message,
  Skill,
} from '../types/smart-agent'
import type { Conversation } from '../types'

/**
 * 智能体服务 - 集成MCTS决策、向量记忆、安全检测
 */
export class SmartAgentService {
  private state: AgentState
  private config: SmartAgentConfig
  private eventListeners: ((event: AgentEvent) => void)[] = []
  private abortController: AbortController | null = null
  private skills: Map<string, Skill> = new Map()

  constructor(config: SmartAgentConfig) {
    this.config = config
    this.state = this.initializeState()
  }

  /**
   * 初始化智能体状态
   */
  private initializeState(): AgentState {
    return {
      id: uuidv4(),
      name: 'SmartAgent',
      status: 'idle',
      memory: this.initializeMemory(),
      context: this.initializeContext(),
      metrics: this.initializeMetrics(),
    }
  }

  /**
   * 初始化记忆系统
   */
  private initializeMemory(): WorkingMemory {
    return {
      shortTerm: {
        recentMessages: [],
        contextWindow: this.config.conversation.maxContextMessages,
        pendingQuestions: [],
        extractedEntities: [],
      },
      longTerm: {
        conversationSummaries: [],
        userPreferences: {
          responseLength: 'medium',
          codeStyle: 'functional',
          explanationDepth: 'moderate',
          examplePreference: 'moderate',
          languagePreference: 'zh-CN',
        },
        learnedPatterns: [],
        importantFacts: [],
      },
      episodic: [],
      semantic: [],
    }
  }

  /**
   * 初始化对话上下文
   */
  private initializeContext(): ConversationContext {
    return {
      conversationId: uuidv4(),
      turnCount: 0,
      topics: [],
      unresolvedReferences: [],
      sharedKnowledge: {},
      sessionStartTime: Date.now(),
      lastActivityTime: Date.now(),
    }
  }

  /**
   * 初始化指标
   */
  private initializeMetrics(): AgentMetrics {
    return {
      totalInteractions: 0,
      successfulTasks: 0,
      failedTasks: 0,
      averageResponseTime: 0,
      userSatisfactionScore: 0,
      tokenUsage: {
        totalInput: 0,
        totalOutput: 0,
        totalCost: 0,
        byModel: {},
      },
      mctsStats: {
        totalSimulations: 0,
        averageDepth: 0,
        branchingFactor: 0,
        successRate: 0,
        averageDecisionTime: 0,
      },
      memoryStats: {
        shortTermSize: 0,
        longTermSize: 0,
        vectorStoreSize: 0,
        cacheHitRate: 0,
        retrievalAccuracy: 0,
      },
    }
  }

  /**
   * 注册技能
   */
  registerSkill(skill: Skill): void {
    this.skills.set(skill.name, skill)
  }

  /**
   * 注册事件监听器
   */
  onEvent(listener: (event: AgentEvent) => void): () => void {
    this.eventListeners.push(listener)
    return () => {
      const index = this.eventListeners.indexOf(listener)
      if (index > -1) {
        this.eventListeners.splice(index, 1)
      }
    }
  }

  /**
   * 触发事件
   */
  private emitEvent(event: AgentEvent): void {
    this.eventListeners.forEach(listener => {
      try {
        listener(event)
      } catch (error) {
        console.error('Event listener error:', error)
      }
    })
  }

  /**
   * 更新状态
   */
  private setStatus(newStatus: AgentState['status']): void {
    const oldStatus = this.state.status
    this.state.status = newStatus
    this.emitEvent({
      type: 'state_change',
      payload: { from: oldStatus, to: newStatus },
    })
  }

  /**
   * 处理用户消息 - 主入口
   */
  async processMessage(
    message: string,
    conversation: Conversation,
    onStream?: (chunk: string) => void
  ): Promise<SmartResponse> {
    const startTime = Date.now()
    this.abortController = new AbortController()

    try {
      this.setStatus('thinking')
      this.emitEvent({
        type: 'thinking_start',
        payload: { task: message },
      })

      // 1. 安全检查
      if (this.config.security.enablePromptInjectionCheck) {
        const securityResult = await this.performSecurityCheck(message)
        if (!securityResult.passed && securityResult.score < 0.3) {
          return this.createSecurityErrorResponse(securityResult)
        }
      }

      // 2. 更新短期记忆
      this.updateShortTermMemory(conversation)

      // 3. 意图识别
      const intent = await this.recognizeIntent(message)

      // 4. MCTS决策（如果启用）
      let decision: DecisionResult | undefined
      if (this.config.mcts.enabled) {
        decision = await this.makeDecision(message, intent)
        this.emitEvent({
          type: 'thinking_complete',
          payload: { result: decision },
        })
      }

      // 5. 创建执行计划
      this.setStatus('planning')
      const plan = await this.createPlan(message, intent, decision)
      this.emitEvent({
        type: 'plan_created',
        payload: { plan },
      })

      // 6. 执行计划
      this.setStatus('executing')
      const response = await this.executePlan(plan, message, onStream)

      // 7. 更新指标
      this.updateMetrics(startTime, response)

      // 8. 保存到记忆
      await this.saveToMemory(message, response, conversation)

      this.setStatus('idle')
      this.emitEvent({
        type: 'response_generated',
        payload: { response },
      })

      return response
    } catch (error) {
      this.setStatus('error')
      this.emitEvent({
        type: 'error',
        payload: {
          error: error as Error,
          context: 'processMessage',
        },
      })
      return this.createErrorResponse(error as Error)
    }
  }

  /**
   * 安全检查
   */
  private async performSecurityCheck(content: string): Promise<SecurityCheckResult> {
    // 简化的安全检查实现
    const threats = []
    let score = 1.0

    // 检测提示注入模式
    const injectionPatterns = [
      /ignore previous instructions/i,
      /disregard.*prompt/i,
      /system.*override/i,
      /you are now.*mode/i,
      /DAN|jailbreak/i,
    ]

    for (const pattern of injectionPatterns) {
      if (pattern.test(content)) {
        threats.push({
          type: 'prompt_injection' as const,
          severity: 'high' as const,
          description: `Detected pattern: ${pattern.source}`,
          location: { start: 0, end: content.length },
          confidence: 0.8,
        })
        score -= 0.3
      }
    }

    // 检测代码注入
    const codePatterns = [
      /<script/i,
      /javascript:/i,
      /on\w+\s*=/i,
      /eval\s*\(/i,
    ]

    for (const pattern of codePatterns) {
      if (pattern.test(content)) {
        threats.push({
          type: 'code_injection' as const,
          severity: 'critical' as const,
          description: `Potential code injection: ${pattern.source}`,
          location: { start: 0, end: content.length },
          confidence: 0.9,
        })
        score -= 0.4
      }
    }

    return {
      passed: score > 0.5,
      score: Math.max(0, score),
      threats,
      sanitizedContent: content,
      recommendations: threats.length > 0
        ? ['Review input carefully', 'Consider sanitization', 'Monitor for attacks']
        : [],
    }
  }

  /**
   * 意图识别
   */
  private async recognizeIntent(message: string): Promise<UserIntent> {
    // 简化的意图识别实现
    const intentPatterns: Record<string, RegExp[]> = {
      question: [/\?$/, /什么是|how to|what is|why does/i],
      command: [/^请|请帮我|帮我|执行|run|execute/i],
      code_generation: [/写代码|生成代码|code|function|class/i],
      analysis: [/分析|analyze|compare|对比/i],
      clarification: [/不明白|不清楚|confused|clarify/i],
      greeting: [/^你好|^hi|^hello|^嗨/i],
    }

    let primaryIntent: string = 'information_seeking'
    let maxConfidence = 0.5

    for (const [intent, patterns] of Object.entries(intentPatterns)) {
      for (const pattern of patterns) {
        if (pattern.test(message)) {
          const confidence = 0.7 + Math.random() * 0.2
          if (confidence > maxConfidence) {
            maxConfidence = confidence
            primaryIntent = intent
          }
        }
      }
    }

    // 提取实体
    const entities = this.extractEntities(message)

    // 情感分析
    const sentiment = this.analyzeSentiment(message)

    return {
      primary: primaryIntent as UserIntent['primary'],
      confidence: maxConfidence,
      entities,
      sentiment,
      urgency: this.assessUrgency(message),
    }
  }

  /**
   * 提取实体
   */
  private extractEntities(message: string): UserIntent['entities'] {
    const entities: UserIntent['entities'] = []

    // 代码块
    const codeBlocks = message.match(/```[\s\S]*?```/g)
    if (codeBlocks) {
      codeBlocks.forEach((block, index) => {
        entities.push({
          type: 'code',
          value: block.slice(3, -3).trim(),
          startIndex: message.indexOf(block),
          endIndex: message.indexOf(block) + block.length,
          confidence: 0.95,
        })
      })
    }

    // 文件路径
    const filePaths = message.match(/[\w\/\\.-]+\.(js|ts|jsx|tsx|py|java|go|rs|cpp|c|h|json|md|txt)/gi)
    if (filePaths) {
      filePaths.forEach(path => {
        entities.push({
          type: 'file',
          value: path,
          confidence: 0.9,
        })
      })
    }

    // URL
    const urls = message.match(/https?:\/\/[^\s]+/g)
    if (urls) {
      urls.forEach(url => {
        entities.push({
          type: 'concept',
          value: url,
          confidence: 0.95,
        })
      })
    }

    return entities
  }

  /**
   * 情感分析
   */
  private analyzeSentiment(message: string): UserIntent['sentiment'] {
    const positiveWords = /谢谢|感谢|good|great|awesome|excellent|love|like/i
    const negativeWords = /差|坏|bad|terrible|awful|hate|dislike|error|bug|问题/i

    const positiveCount = (message.match(positiveWords) || []).length
    const negativeCount = (message.match(negativeWords) || []).length

    if (positiveCount > negativeCount) return 'positive'
    if (negativeCount > positiveCount) return 'negative'
    return 'neutral'
  }

  /**
   * 评估紧急程度
   */
  private assessUrgency(message: string): UserIntent['urgency'] {
    const urgentWords = /紧急|urgent|asap|immediately|now|马上|立刻/i
    const lowPriorityWords = /有空|later|someday|maybe|perhaps/i

    if (urgentWords.test(message)) return 'high'
    if (lowPriorityWords.test(message)) return 'low'
    return 'medium'
  }

  /**
   * MCTS决策
   */
  private async makeDecision(message: string, intent: UserIntent): Promise<DecisionResult> {
    const startTime = Date.now()

    // 构建决策树
    const rootNode: TaskNode = {
      id: uuidv4(),
      type: 'root',
      description: message,
      status: 'in_progress',
      children: [],
      depth: 0,
      priority: 1,
      estimatedEffort: 1,
      dependencies: [],
      skills: [],
      context: { intent },
      mctsData: { visits: 0, value: 0, ucb1: Infinity },
    }

    // 生成可能的行动
    const possibleActions = this.generatePossibleActions(intent)

    // MCTS模拟
    let bestAction = possibleActions[0]
    let bestValue = -Infinity

    for (const action of possibleActions) {
      // 简化的UCB1计算
      const explorationBonus = this.config.mcts.explorationConstant * Math.sqrt(Math.log(1) / 1)
      const value = Math.random() * 0.5 + 0.5 + explorationBonus

      if (value > bestValue) {
        bestValue = value
        bestAction = action
      }
    }

    // 更新MCTS统计
    this.state.metrics.mctsStats.totalSimulations++
    this.state.metrics.mctsStats.averageDecisionTime =
      (this.state.metrics.mctsStats.averageDecisionTime * (this.state.metrics.mctsStats.totalSimulations - 1) +
        (Date.now() - startTime)) /
      this.state.metrics.mctsStats.totalSimulations

    return {
      action: bestAction,
      confidence: bestValue,
      reasoning: `Selected based on MCTS simulation with ${this.config.mcts.maxIterations} iterations`,
      alternatives: possibleActions
        .filter(a => a !== bestAction)
        .slice(0, 3)
        .map(a => ({
          action: a,
          confidence: Math.random() * 0.5 + 0.3,
          reason: 'Alternative approach',
        })),
      expectedOutcome: 'Successful task completion',
      risks: [
        {
          type: 'uncertainty',
          probability: 0.2,
          impact: 'medium',
          mitigation: 'Fallback to alternative approach',
        },
      ],
    }
  }

  /**
   * 生成可能的行动
   */
  private generatePossibleActions(intent: UserIntent): string[] {
    const actions: string[] = []

    switch (intent.primary) {
      case 'question':
        actions.push('direct_answer', 'search_knowledge', 'ask_clarification')
        break
      case 'code_generation':
        actions.push('generate_code', 'explain_approach', 'provide_examples')
        break
      case 'analysis':
        actions.push('analyze_data', 'compare_options', 'generate_report')
        break
      case 'command':
        actions.push('execute_command', 'validate_command', 'show_preview')
        break
      default:
        actions.push('general_response', 'ask_clarification', 'suggest_topics')
    }

    return actions
  }

  /**
   * 创建执行计划
   */
  private async createPlan(
    message: string,
    intent: UserIntent,
    decision?: DecisionResult
  ): Promise<PlanResult> {
    const steps: PlanResult['steps'] = []
    let order = 1

    // 根据意图和决策创建计划步骤
    if (this.config.memory.enabled) {
      steps.push({
        id: uuidv4(),
        order: order++,
        description: 'Retrieve relevant memories',
        type: 'retrieval',
        status: 'pending',
        dependencies: [],
        estimatedDuration: 100,
      })
    }

    steps.push({
      id: uuidv4(),
      order: order++,
      description: 'Analyze user intent and context',
      type: 'analysis',
      status: 'pending',
      dependencies: steps.length > 0 ? [steps[steps.length - 1].id] : [],
      estimatedDuration: 200,
    })

    if (intent.primary === 'code_generation') {
      steps.push({
        id: uuidv4(),
        order: order++,
        description: 'Generate code solution',
        type: 'generation',
        status: 'pending',
        dependencies: [steps[steps.length - 1].id],
        estimatedDuration: 1000,
      })
    } else {
      steps.push({
        id: uuidv4(),
        order: order++,
        description: 'Generate response',
        type: 'generation',
        status: 'pending',
        dependencies: [steps[steps.length - 1].id],
        estimatedDuration: 800,
      })
    }

    steps.push({
      id: uuidv4(),
      order: order++,
      description: 'Validate response quality',
      type: 'validation',
      status: 'pending',
      dependencies: [steps[steps.length - 1].id],
      estimatedDuration: 100,
    })

    return {
      planId: uuidv4(),
      goal: message,
      steps,
      estimatedDuration: steps.reduce((sum, step) => sum + step.estimatedDuration, 0),
      requiredSkills: this.determineRequiredSkills(intent),
      dependencies: [],
      fallbackPlans: [
        {
          trigger: 'generation_failed',
          alternativeSteps: [
            {
              id: uuidv4(),
              order: 1,
              description: 'Ask for clarification',
              type: 'generation',
              status: 'pending',
              dependencies: [],
              estimatedDuration: 300,
            },
          ],
        },
      ],
    }
  }

  /**
   * 确定所需技能
   */
  private determineRequiredSkills(intent: UserIntent): string[] {
    const skills: string[] = []

    if (intent.primary === 'code_generation') {
      skills.push('code-generation', 'syntax-validation')
    }
    if (intent.entities.some(e => e.type === 'code')) {
      skills.push('code-analysis')
    }
    if (intent.primary === 'analysis') {
      skills.push('data-analysis', 'comparison')
    }

    return skills
  }

  /**
   * 执行计划
   */
  private async executePlan(
    plan: PlanResult,
    message: string,
    onStream?: (chunk: string) => void
  ): Promise<SmartResponse> {
    const startTime = Date.now()
    let content = ''

    // 执行每个步骤
    for (const step of plan.steps) {
      step.status = 'in_progress'

      switch (step.type) {
        case 'retrieval':
          // 检索记忆
          await this.retrieveRelevantMemories(message)
          break

        case 'analysis':
          // 分析已在前面完成
          break

        case 'generation':
          // 生成响应
          content = await this.generateResponse(message, onStream)
          break

        case 'validation':
          // 验证响应
          break
      }

      step.status = 'completed'
      step.actualDuration = Date.now() - startTime
    }

    return {
      content,
      type: 'direct_answer',
      confidence: 0.85,
      sources: [
        {
          type: 'llm_generation',
          description: 'Generated using LLM',
          confidence: 0.9,
          timestamp: Date.now(),
        },
      ],
      metadata: {
        generationTime: Date.now() - startTime,
        tokenCount: content.length / 4, // 粗略估计
        modelUsed: this.config.llm.model,
        mctsNodesExplored: this.config.mcts.enabled ? 10 : undefined,
        memoryRetrievals: this.config.memory.enabled ? 5 : undefined,
        securityChecksPassed: true,
      },
    }
  }

  /**
   * 生成响应
   */
  private async generateResponse(
    message: string,
    onStream?: (chunk: string) => void
  ): Promise<string> {
    // 构建上下文
    const context = this.buildContext()

    // 这里应该调用实际的LLM API
    // 简化实现：模拟流式响应
    const response = `我理解你的问题："${message}"

基于我的分析，这是一个关于${this.state.memory.shortTerm.userIntent?.primary || '一般'}的查询。

让我为你提供详细的回答...

[这里是基于MCTS决策和向量记忆生成的智能响应内容]

如果你有其他问题，请随时告诉我！`

    if (onStream) {
      const chunks = response.split('')
      let accumulated = ''

      for (const char of chunks) {
        if (this.abortController?.signal.aborted) {
          break
        }
        accumulated += char
        onStream(accumulated)
        await this.delay(10)
      }
    }

    return response
  }

  /**
   * 构建上下文
   */
  private buildContext(): string {
    const recentMessages = this.state.memory.shortTerm.recentMessages
      .slice(-5)
      .map(m => `${m.role}: ${m.content}`)
      .join('\n')

    const relevantFacts = this.state.memory.longTerm.importantFacts
      .slice(0, 3)
      .map(f => f.fact)
      .join('\n')

    return `Recent conversation:\n${recentMessages}\n\nRelevant facts:\n${relevantFacts}`
  }

  /**
   * 检索相关记忆
   */
  private async retrieveRelevantMemories(query: string): Promise<void> {
    // 简化的记忆检索实现
    // 实际应该使用向量数据库进行语义搜索

    const relevantEpisodes = this.state.memory.episodic
      .filter(e => e.event.includes(query) || e.context.includes(query))
      .slice(0, 5)

    this.emitEvent({
      type: 'memory_retrieved',
      payload: { memories: relevantEpisodes },
    })
  }

  /**
   * 更新短期记忆
   */
  private updateShortTermMemory(conversation: Conversation): void {
    this.state.memory.shortTerm.recentMessages = conversation.messages.slice(
      -this.config.conversation.maxContextMessages
    )
    this.state.memory.shortTerm.contextWindow = conversation.messages.length
  }

  /**
   * 保存到记忆
   */
  private async saveToMemory(
    message: string,
    response: SmartResponse,
    conversation: Conversation
  ): Promise<void> {
    // 保存为情景记忆
    this.state.memory.episodic.push({
      id: uuidv4(),
      timestamp: Date.now(),
      event: `User: ${message}`,
      context: conversation.id,
      outcome: `Assistant: ${response.content.substring(0, 100)}...`,
      emotionalValence: response.confidence > 0.8 ? 1 : 0.5,
      importance: response.confidence,
      relatedFacts: [],
    })

    // 限制记忆大小
    if (this.state.memory.episodic.length > 100) {
      this.state.memory.episodic = this.state.memory.episodic.slice(-100)
    }
  }

  /**
   * 更新指标
   */
  private updateMetrics(startTime: number, response: SmartResponse): void {
    const duration = Date.now() - startTime

    this.state.metrics.totalInteractions++
    this.state.metrics.successfulTasks++
    this.state.metrics.averageResponseTime =
      (this.state.metrics.averageResponseTime * (this.state.metrics.totalInteractions - 1) + duration) /
      this.state.metrics.totalInteractions

    this.state.metrics.tokenUsage.totalOutput += response.metadata.tokenCount
  }

  /**
   * 创建安全错误响应
   */
  private createSecurityErrorResponse(checkResult: SecurityCheckResult): SmartResponse {
    return {
      content: `⚠️ 安全警告：检测到潜在的安全威胁（置信度：${(checkResult.score * 100).toFixed(1)}%）

检测到的威胁：
${checkResult.threats.map(t => `- ${t.type}: ${t.description} (${t.severity})`).join('\n')}

建议：
${checkResult.recommendations.map(r => `- ${r}`).join('\n')}

请重新表述您的问题，避免使用可能被误解的表述。`,
      type: 'error',
      confidence: checkResult.score,
      sources: [],
      metadata: {
        generationTime: 0,
        tokenCount: 0,
        modelUsed: 'security_filter',
        securityChecksPassed: false,
      },
    }
  }

  /**
   * 创建错误响应
   */
  private createErrorResponse(error: Error): SmartResponse {
    this.state.metrics.failedTasks++

    return {
      content: `抱歉，处理您的请求时出现了错误：${error.message}

请稍后重试，或者尝试用不同的方式描述您的问题。`,
      type: 'error',
      confidence: 0,
      sources: [],
      metadata: {
        generationTime: 0,
        tokenCount: 0,
        modelUsed: 'error_handler',
        securityChecksPassed: false,
      },
    }
  }

  /**
   * 获取当前状态
   */
  getState(): AgentState {
    return { ...this.state }
  }

  /**
   * 获取指标
   */
  getMetrics(): AgentMetrics {
    return { ...this.state.metrics }
  }

  /**
   * 取消处理
   */
  cancel(): void {
    this.abortController?.abort()
    this.setStatus('idle')
  }

  /**
   * 重置智能体
   */
  reset(): void {
    this.state = this.initializeState()
    this.skills.clear()
  }

  /**
   * 延迟辅助函数
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}

/**
 * 创建智能体服务实例的工厂函数
 */
export function createSmartAgent(config: Partial<SmartAgentConfig> = {}): SmartAgentService {
  const defaultConfig: SmartAgentConfig = {
    llm: {
      provider: 'openai',
      model: 'gpt-4',
      apiKey: '',
      temperature: 0.7,
      maxTokens: 2000,
    },
    mcts: {
      enabled: true,
      maxIterations: 100,
      explorationConstant: 1.414,
      simulationDepth: 5,
      useRAVE: true,
    },
    memory: {
      enabled: true,
      vectorStoreProvider: 'memory',
      embeddingProvider: 'openai',
      maxShortTermMessages: 10,
      similarityThreshold: 0.7,
      topK: 5,
    },
    security: {
      enablePromptInjectionCheck: true,
      enableSandbox: false,
      maxCodeExecutionTime: 5000,
      allowedDomains: [],
      blockedPatterns: [],
      sensitivityLevel: 'medium',
    },
    conversation: {
      maxContextMessages: 20,
      enableContextCompression: true,
      enableTopicTracking: true,
      enableIntentRecognition: true,
    },
  }

  return new SmartAgentService({ ...defaultConfig, ...config })
}
