import type { Message, Conversation, Skill } from '../types'

/**
 * 智能体状态
 */
export interface AgentState {
  id: string
  name: string
  status: 'idle' | 'thinking' | 'planning' | 'executing' | 'reflecting' | 'error'
  currentTask?: TaskNode
  memory: WorkingMemory
  context: ConversationContext
  metrics: AgentMetrics
}

/**
 * 任务节点（用于MCTS决策树）
 */
export interface TaskNode {
  id: string
  type: 'root' | 'task' | 'subtask' | 'action'
  description: string
  status: 'pending' | 'in_progress' | 'completed' | 'failed'
  parentId?: string
  children: string[]
  depth: number
  priority: number
  estimatedEffort: number
  actualEffort?: number
  dependencies: string[]
  skills: string[]
  context: Record<string, unknown>
  result?: unknown
  mctsData?: {
    visits: number
    value: number
    ucb1: number
    raveVisits?: number
    raveValue?: number
  }
}

/**
 * 工作记忆
 */
export interface WorkingMemory {
  shortTerm: ShortTermMemory
  longTerm: LongTermMemory
  episodic: EpisodicMemory[]
  semantic: SemanticMemory[]
}

/**
 * 短期记忆（当前对话上下文）
 */
export interface ShortTermMemory {
  recentMessages: Message[]
  currentTopic?: string
  userIntent?: UserIntent
  pendingQuestions: string[]
  extractedEntities: Entity[]
  contextWindow: number
}

/**
 * 长期记忆（向量存储）
 */
export interface LongTermMemory {
  conversationSummaries: ConversationSummary[]
  userPreferences: UserPreferences
  learnedPatterns: LearnedPattern[]
  importantFacts: ImportantFact[]
}

/**
 * 情景记忆（具体事件）
 */
export interface EpisodicMemory {
  id: string
  timestamp: number
  event: string
  context: string
  outcome: string
  emotionalValence: number
  importance: number
  relatedFacts: string[]
}

/**
 * 语义记忆（概念知识）
 */
export interface SemanticMemory {
  id: string
  concept: string
  definition: string
  relationships: Relationship[]
  source: string
  confidence: number
  lastAccessed: number
}

/**
 * 关系
 */
export interface Relationship {
  type: 'is_a' | 'part_of' | 'related_to' | 'causes' | 'enables'
  target: string
  strength: number
}

/**
 * 用户意图
 */
export interface UserIntent {
  primary: IntentType
  secondary?: IntentType
  confidence: number
  entities: Entity[]
  sentiment: 'positive' | 'neutral' | 'negative'
  urgency: 'low' | 'medium' | 'high'
}

export type IntentType =
  | 'question'
  | 'command'
  | 'clarification'
  | 'feedback'
  | 'greeting'
  | 'farewell'
  | 'task_request'
  | 'information_seeking'
  | 'problem_solving'
  | 'creative_writing'
  | 'code_generation'
  | 'analysis'
  | 'comparison'
  | 'summarization'

/**
 * 实体
 */
export interface Entity {
  type: 'person' | 'organization' | 'location' | 'date' | 'time' | 'product' | 'concept' | 'code' | 'file'
  value: string
  startIndex?: number
  endIndex?: number
  confidence: number
  metadata?: Record<string, unknown>
}

/**
 * 对话上下文
 */
export interface ConversationContext {
  conversationId: string
  turnCount: number
  topics: Topic[]
  unresolvedReferences: string[]
  sharedKnowledge: Record<string, unknown>
  userProfile?: UserProfile
  sessionStartTime: number
  lastActivityTime: number
}

/**
 * 主题
 */
export interface Topic {
  id: string
  name: string
  keywords: string[]
  startMessageIndex: number
  endMessageIndex?: number
  relevance: number
  subtopics: string[]
}

/**
 * 用户画像
 */
export interface UserProfile {
  userId: string
  expertiseLevel: 'beginner' | 'intermediate' | 'advanced' | 'expert'
  communicationStyle: 'concise' | 'detailed' | 'technical' | 'casual'
  preferredTopics: string[]
  dislikedTopics: string[]
  successfulInteractions: number
  failedInteractions: number
  feedbackHistory: FeedbackRecord[]
}

/**
 * 反馈记录
 */
export interface FeedbackRecord {
  timestamp: number
  messageId: string
  rating: number
  comment?: string
  aspect: 'accuracy' | 'relevance' | 'clarity' | 'helpfulness' | 'speed'
}

/**
 * 对话摘要
 */
export interface ConversationSummary {
  id: string
  conversationId: string
  summary: string
  keyPoints: string[]
  topics: string[]
  messageCount: number
  startTime: number
  endTime: number
  importance: number
  embedding?: number[]
}

/**
 * 用户偏好
 */
export interface UserPreferences {
  responseLength: 'short' | 'medium' | 'long'
  codeStyle: 'functional' | 'oop' | 'procedural'
  explanationDepth: 'surface' | 'moderate' | 'deep'
  examplePreference: 'minimal' | 'moderate' | 'extensive'
  languagePreference: string
  timezone?: string
}

/**
 * 学习模式
 */
export interface LearnedPattern {
  id: string
  pattern: string
  context: string
  frequency: number
  successRate: number
  lastObserved: number
}

/**
 * 重要事实
 */
export interface ImportantFact {
  id: string
  fact: string
  category: string
  source: string
  confidence: number
  verified: boolean
  timestamp: number
  accessCount: number
}

/**
 * 智能体指标
 */
export interface AgentMetrics {
  totalInteractions: number
  successfulTasks: number
  failedTasks: number
  averageResponseTime: number
  userSatisfactionScore: number
  tokenUsage: TokenUsage
  mctsStats: MCTSStats
  memoryStats: MemoryStats
}

/**
 * Token使用统计
 */
export interface TokenUsage {
  totalInput: number
  totalOutput: number
  totalCost: number
  byModel: Record<string, { input: number; output: number; cost: number }>
}

/**
 * MCTS统计
 */
export interface MCTSStats {
  totalSimulations: number
  averageDepth: number
  branchingFactor: number
  successRate: number
  averageDecisionTime: number
}

/**
 * 记忆统计
 */
export interface MemoryStats {
  shortTermSize: number
  longTermSize: number
  vectorStoreSize: number
  cacheHitRate: number
  retrievalAccuracy: number
}

/**
 * 决策结果
 */
export interface DecisionResult {
  action: string
  confidence: number
  reasoning: string
  alternatives: AlternativeAction[]
  expectedOutcome: string
  risks: RiskAssessment[]
}

/**
 * 替代行动
 */
export interface AlternativeAction {
  action: string
  confidence: number
  reason: string
}

/**
 * 风险评估
 */
export interface RiskAssessment {
  type: string
  probability: number
  impact: 'low' | 'medium' | 'high' | 'critical'
  mitigation?: string
}

/**
 * 计划结果
 */
export interface PlanResult {
  planId: string
  goal: string
  steps: PlanStep[]
  estimatedDuration: number
  requiredSkills: string[]
  dependencies: string[]
  fallbackPlans: FallbackPlan[]
}

/**
 * 计划步骤
 */
export interface PlanStep {
  id: string
  order: number
  description: string
  type: 'analysis' | 'retrieval' | 'generation' | 'validation' | 'execution'
  status: 'pending' | 'in_progress' | 'completed' | 'failed'
  dependencies: string[]
  estimatedDuration: number
  actualDuration?: number
  result?: unknown
}

/**
 * 备用计划
 */
export interface FallbackPlan {
  trigger: string
  alternativeSteps: PlanStep[]
}

/**
 * 安全检查配置
 */
export interface SecurityConfig {
  enablePromptInjectionCheck: boolean
  enableSandbox: boolean
  maxCodeExecutionTime: number
  allowedDomains: string[]
  blockedPatterns: string[]
  sensitivityLevel: 'low' | 'medium' | 'high'
}

/**
 * 安全检查结果
 */
export interface SecurityCheckResult {
  passed: boolean
  score: number
  threats: SecurityThreat[]
  sanitizedContent?: string
  recommendations: string[]
}

/**
 * 安全威胁
 */
export interface SecurityThreat {
  type: 'prompt_injection' | 'code_injection' | 'data_exfiltration' | 'jailbreak' | 'other'
  severity: 'low' | 'medium' | 'high' | 'critical'
  description: string
  location: { start: number; end: number }
  confidence: number
}

/**
 * 智能响应
 */
export interface SmartResponse {
  content: string
  type: 'direct_answer' | 'clarification' | 'suggestion' | 'action_result' | 'error'
  confidence: number
  sources: ResponseSource[]
  followUpQuestions?: string[]
  relatedTopics?: string[]
  actions?: ResponseAction[]
  metadata: ResponseMetadata
}

/**
 * 响应来源
 */
export interface ResponseSource {
  type: 'memory' | 'knowledge_base' | 'tool_execution' | 'llm_generation' | 'user_input'
  description: string
  confidence: number
  timestamp: number
}

/**
 * 响应行动
 */
export interface ResponseAction {
  type: 'suggest_skill' | 'show_example' | 'ask_clarification' | 'escalate' | 'save_memory'
  payload: unknown
  priority: number
}

/**
 * 响应元数据
 */
export interface ResponseMetadata {
  generationTime: number
  tokenCount: number
  modelUsed: string
  mctsNodesExplored?: number
  memoryRetrievals?: number
  securityChecksPassed: boolean
}

/**
 * 智能体配置
 */
export interface SmartAgentConfig {
  // LLM配置
  llm: {
    provider: 'openai' | 'anthropic' | 'gemini' | 'deepseek'
    model: string
    apiKey: string
    baseUrl?: string
    temperature: number
    maxTokens: number
  }
  // MCTS配置
  mcts: {
    enabled: boolean
    maxIterations: number
    explorationConstant: number
    simulationDepth: number
    useRAVE: boolean
  }
  // 记忆配置
  memory: {
    enabled: boolean
    vectorStoreProvider: 'memory' | 'pinecone' | 'weaviate' | 'chroma'
    embeddingProvider: 'openai' | 'local' | 'transformers'
    maxShortTermMessages: number
    similarityThreshold: number
    topK: number
  }
  // 安全配置
  security: SecurityConfig
  // 对话配置
  conversation: {
    maxContextMessages: number
    enableContextCompression: boolean
    enableTopicTracking: boolean
    enableIntentRecognition: boolean
  }
}

/**
 * 智能体事件
 */
export type AgentEvent =
  | { type: 'state_change'; payload: { from: AgentState['status']; to: AgentState['status'] } }
  | { type: 'thinking_start'; payload: { task: string } }
  | { type: 'thinking_complete'; payload: { result: DecisionResult } }
  | { type: 'plan_created'; payload: { plan: PlanResult } }
  | { type: 'memory_retrieved'; payload: { memories: EpisodicMemory[] } }
  | { type: 'security_alert'; payload: { threat: SecurityThreat } }
  | { type: 'response_generated'; payload: { response: SmartResponse } }
  | { type: 'error'; payload: { error: Error; context: string } }
