import { useState, useCallback, useRef, useEffect } from 'react'
import { v4 as uuidv4 } from 'uuid'
import { SmartAgentService, createSmartAgent } from '../services/smart-agent'
import type {
  SmartAgentConfig,
  SmartResponse,
  AgentState,
  AgentMetrics,
  AgentEvent,
  UserIntent,
} from '../types/smart-agent'
import type { Message, Conversation, Skill } from '../types'

/**
 * 智能体Hook配置选项
 */
export interface UseSmartAgentOptions {
  config?: Partial<SmartAgentConfig>
  skills?: Skill[]
  onEvent?: (event: AgentEvent) => void
  onError?: (error: Error) => void
}

/**
 * 智能体Hook返回值
 */
export interface UseSmartAgentReturn {
  // 状态
  isReady: boolean
  isProcessing: boolean
  agentState: AgentState | null
  metrics: AgentMetrics | null
  currentIntent: UserIntent | null

  // 处理函数
  processMessage: (
    content: string,
    conversation: Conversation,
    options?: ProcessMessageOptions
  ) => Promise<void>

  cancelProcessing: () => void
  resetAgent: () => void

  // 配置
  updateConfig: (config: Partial<SmartAgentConfig>) => void
  registerSkill: (skill: Skill) => void

  // 流式响应
  streamingContent: string
  isStreaming: boolean

  // 调试信息
  debugInfo: DebugInfo
}

/**
 * 处理消息选项
 */
export interface ProcessMessageOptions {
  enableStreaming?: boolean
  onStream?: (chunk: string) => void
  onThinkingStart?: () => void
  onThinkingComplete?: (decision: unknown) => void
  onPlanCreated?: (plan: unknown) => void
}

/**
 * 调试信息
 */
export interface DebugInfo {
  lastDecision: unknown | null
  lastPlan: unknown | null
  processingSteps: ProcessingStep[]
  memoryRetrievals: unknown[]
  securityChecks: SecurityCheckInfo[]
}

/**
 * 处理步骤
 */
export interface ProcessingStep {
  id: string
  name: string
  status: 'pending' | 'in_progress' | 'completed' | 'failed'
  startTime?: number
  endTime?: number
  duration?: number
  details?: unknown
}

/**
 * 安全检查信息
 */
export interface SecurityCheckInfo {
  timestamp: number
  passed: boolean
  score: number
  threats: unknown[]
}

/**
 * 智能体Hook - 集成MCTS、向量记忆、安全检测的高级对话能力
 */
export function useSmartAgent(options: UseSmartAgentOptions = {}): UseSmartAgentReturn {
  const { config: initialConfig = {}, skills = [], onEvent, onError } = options

  // Refs
  const agentRef = useRef<SmartAgentService | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)
  const eventUnsubscribeRef = useRef<(() => void) | null>(null)

  // State
  const [isReady, setIsReady] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [agentState, setAgentState] = useState<AgentState | null>(null)
  const [metrics, setMetrics] = useState<AgentMetrics | null>(null)
  const [currentIntent, setCurrentIntent] = useState<UserIntent | null>(null)
  const [streamingContent, setStreamingContent] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const [debugInfo, setDebugInfo] = useState<DebugInfo>({
    lastDecision: null,
    lastPlan: null,
    processingSteps: [],
    memoryRetrievals: [],
    securityChecks: [],
  })

  // 初始化智能体服务
  useEffect(() => {
    agentRef.current = createSmartAgent(initialConfig)

    // 注册技能
    skills.forEach(skill => {
      agentRef.current?.registerSkill(skill)
    })

    // 订阅事件
    eventUnsubscribeRef.current = agentRef.current.onEvent((event) => {
      handleAgentEvent(event)
      onEvent?.(event)
    })

    // 更新初始状态
    setAgentState(agentRef.current.getState())
    setMetrics(agentRef.current.getMetrics())
    setIsReady(true)

    return () => {
      eventUnsubscribeRef.current?.()
      agentRef.current = null
    }
  }, [])

  /**
   * 处理智能体事件
   */
  const handleAgentEvent = useCallback((event: AgentEvent) => {
    switch (event.type) {
      case 'state_change':
        setAgentState(prev => prev ? { ...prev, status: event.payload.to } : null)
        break

      case 'thinking_start':
        addProcessingStep('thinking', '意图分析与决策')
        break

      case 'thinking_complete':
        setDebugInfo(prev => ({
          ...prev,
          lastDecision: event.payload.result,
        }))
        completeProcessingStep('thinking')
        break

      case 'plan_created':
        setDebugInfo(prev => ({
          ...prev,
          lastPlan: event.payload.plan,
        }))
        addProcessingStep('planning', '创建执行计划')
        completeProcessingStep('planning')
        break

      case 'memory_retrieved':
        setDebugInfo(prev => ({
          ...prev,
          memoryRetrievals: [...prev.memoryRetrievals, event.payload.memories],
        }))
        break

      case 'security_alert':
        setDebugInfo(prev => ({
          ...prev,
          securityChecks: [
            ...prev.securityChecks,
            {
              timestamp: Date.now(),
              passed: false,
              score: 0,
              threats: [event.payload.threat],
            },
          ],
        }))
        break

      case 'response_generated':
        completeProcessingStep('execution')
        break

      case 'error':
        failProcessingStep('execution', event.payload.error)
        onError?.(event.payload.error)
        break
    }

    // 更新状态
    if (agentRef.current) {
      setAgentState(agentRef.current.getState())
      setMetrics(agentRef.current.getMetrics())
    }
  }, [onError])

  /**
   * 添加处理步骤
   */
  const addProcessingStep = useCallback((id: string, name: string) => {
    setDebugInfo(prev => ({
      ...prev,
      processingSteps: [
        ...prev.processingSteps,
        {
          id,
          name,
          status: 'in_progress',
          startTime: Date.now(),
        },
      ],
    }))
  }, [])

  /**
   * 完成处理步骤
   */
  const completeProcessingStep = useCallback((id: string) => {
    setDebugInfo(prev => ({
      ...prev,
      processingSteps: prev.processingSteps.map(step =>
        step.id === id
          ? {
              ...step,
              status: 'completed',
              endTime: Date.now(),
              duration: Date.now() - (step.startTime || Date.now()),
            }
          : step
      ),
    }))
  }, [])

  /**
   * 失败处理步骤
   */
  const failProcessingStep = useCallback((id: string, error: Error) => {
    setDebugInfo(prev => ({
      ...prev,
      processingSteps: prev.processingSteps.map(step =>
        step.id === id
          ? {
              ...step,
              status: 'failed',
              endTime: Date.now(),
              duration: Date.now() - (step.startTime || Date.now()),
              details: { error: error.message },
            }
          : step
      ),
    }))
  }, [])

  /**
   * 处理消息
   */
  const processMessage = useCallback(async (
    content: string,
    conversation: Conversation,
    processOptions: ProcessMessageOptions = {}
  ) => {
    if (!agentRef.current || isProcessing) return

    const {
      enableStreaming = true,
      onStream,
      onThinkingStart,
      onThinkingComplete,
      onPlanCreated,
    } = processOptions

    setIsProcessing(true)
    setStreamingContent('')
    setIsStreaming(enableStreaming)

    // 清空之前的处理步骤
    setDebugInfo(prev => ({
      ...prev,
      processingSteps: [],
    }))

    try {
      addProcessingStep('security', '安全检查')
      addProcessingStep('intent', '意图识别')
      addProcessingStep('memory', '记忆检索')

      // 创建流式回调
      const streamCallback = enableStreaming
        ? (chunk: string) => {
            setStreamingContent(chunk)
            onStream?.(chunk)
          }
        : undefined

      // 调用智能体服务
      const response = await agentRef.current.processMessage(
        content,
        conversation,
        streamCallback
      )

      // 更新意图
      if (agentRef.current) {
        const state = agentRef.current.getState()
        setCurrentIntent(state.memory.shortTerm.userIntent || null)
      }

      // 完成步骤
      completeProcessingStep('security')
      completeProcessingStep('intent')
      completeProcessingStep('memory')

      // 如果未启用流式，直接设置内容
      if (!enableStreaming) {
        setStreamingContent(response.content)
      }

      // 更新指标
      if (agentRef.current) {
        setMetrics(agentRef.current.getMetrics())
      }
    } catch (error) {
      console.error('Process message error:', error)
      onError?.(error as Error)
    } finally {
      setIsProcessing(false)
      setIsStreaming(false)
    }
  }, [isProcessing, onError, addProcessingStep, completeProcessingStep])

  /**
   * 取消处理
   */
  const cancelProcessing = useCallback(() => {
    agentRef.current?.cancel()
    abortControllerRef.current?.abort()
    setIsProcessing(false)
    setIsStreaming(false)
  }, [])

  /**
   * 重置智能体
   */
  const resetAgent = useCallback(() => {
    agentRef.current?.reset()
    setAgentState(agentRef.current?.getState() || null)
    setMetrics(agentRef.current?.getMetrics() || null)
    setCurrentIntent(null)
    setStreamingContent('')
    setDebugInfo({
      lastDecision: null,
      lastPlan: null,
      processingSteps: [],
      memoryRetrievals: [],
      securityChecks: [],
    })
  }, [])

  /**
   * 更新配置
   */
  const updateConfig = useCallback((newConfig: Partial<SmartAgentConfig>) => {
    // 重新创建智能体服务
    agentRef.current = createSmartAgent({ ...initialConfig, ...newConfig })

    // 重新订阅事件
    eventUnsubscribeRef.current?.()
    eventUnsubscribeRef.current = agentRef.current.onEvent((event) => {
      handleAgentEvent(event)
      onEvent?.(event)
    })

    setAgentState(agentRef.current.getState())
    setMetrics(agentRef.current.getMetrics())
  }, [initialConfig, onEvent, handleAgentEvent])

  /**
   * 注册技能
   */
  const registerSkill = useCallback((skill: Skill) => {
    agentRef.current?.registerSkill(skill)
  }, [])

  return {
    isReady,
    isProcessing,
    agentState,
    metrics,
    currentIntent,
    processMessage,
    cancelProcessing,
    resetAgent,
    updateConfig,
    registerSkill,
    streamingContent,
    isStreaming,
    debugInfo,
  }
}

/**
 * 使用智能对话上下文的Hook
 */
export function useSmartConversation(conversationId?: string) {
  const [conversation, setConversation] = useState<Conversation>(() => ({
    id: conversationId || uuidv4(),
    title: '新对话',
    messages: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  }))

  const addMessage = useCallback((message: Omit<Message, 'id' | 'timestamp'>) => {
    const newMessage: Message = {
      ...message,
      id: uuidv4(),
      timestamp: Date.now(),
    }

    setConversation(prev => ({
      ...prev,
      messages: [...prev.messages, newMessage],
      updatedAt: Date.now(),
      title: prev.messages.length === 0 && message.role === 'user'
        ? message.content.slice(0, 30) + (message.content.length > 30 ? '...' : '')
        : prev.title,
    }))

    return newMessage
  }, [])

  const updateMessage = useCallback((messageId: string, updates: Partial<Message>) => {
    setConversation(prev => ({
      ...prev,
      messages: prev.messages.map(msg =>
        msg.id === messageId ? { ...msg, ...updates } : msg
      ),
      updatedAt: Date.now(),
    }))
  }, [])

  const clearMessages = useCallback(() => {
    setConversation(prev => ({
      ...prev,
      messages: [],
      updatedAt: Date.now(),
    }))
  }, [])

  const setTitle = useCallback((title: string) => {
    setConversation(prev => ({
      ...prev,
      title,
      updatedAt: Date.now(),
    }))
  }, [])

  return {
    conversation,
    addMessage,
    updateMessage,
    clearMessages,
    setTitle,
  }
}

/**
 * 使用智能体记忆管理的Hook
 */
export function useAgentMemory(agentState: AgentState | null) {
  const getRelevantContext = useCallback((query: string, topK: number = 5): string => {
    if (!agentState) return ''

    const { shortTerm, longTerm, episodic } = agentState.memory

    // 组合相关记忆
    const contexts: string[] = []

    // 短期记忆
    if (shortTerm.recentMessages.length > 0) {
      contexts.push('Recent conversation:\n' +
        shortTerm.recentMessages
          .slice(-topK)
          .map(m => `${m.role}: ${m.content}`)
          .join('\n')
      )
    }

    // 重要事实
    if (longTerm.importantFacts.length > 0) {
      contexts.push('Important facts:\n' +
        longTerm.importantFacts
          .slice(0, topK)
          .map(f => `- ${f.fact}`)
          .join('\n')
      )
    }

    // 情景记忆
    const relevantEpisodes = episodic
      .filter(e => e.event.includes(query) || e.context.includes(query))
      .slice(0, topK)

    if (relevantEpisodes.length > 0) {
      contexts.push('Related past interactions:\n' +
        relevantEpisodes
          .map(e => `- ${e.event} → ${e.outcome}`)
          .join('\n')
      )
    }

    return contexts.join('\n\n')
  }, [agentState])

  const getUserPreferences = useCallback(() => {
    return agentState?.memory.longTerm.userPreferences
  }, [agentState])

  const getConversationTopics = useCallback(() => {
    return agentState?.context.topics || []
  }, [agentState])

  return {
    getRelevantContext,
    getUserPreferences,
    getConversationTopics,
    shortTermMemory: agentState?.memory.shortTerm,
    longTermMemory: agentState?.memory.longTerm,
    episodicMemory: agentState?.memory.episodic,
    semanticMemory: agentState?.memory.semantic,
  }
}

export default useSmartAgent
