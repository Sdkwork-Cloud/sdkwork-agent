/**
 * useConversationEngine Hook
 * 
 * 高级对话引擎 Hook，提供完美的对话体验
 */

import { useState, useCallback, useRef, useEffect } from 'react'
import {
  ConversationEngine,
  createConversationEngine,
  StreamingMessageHandler,
  ConversationContext,
} from '../services/conversation-engine'
import type { SmartResponse, UserIntent } from '../types/smart-agent'
import type { Message } from '../types'

/**
 * 消息状态
 */
export interface MessageState {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: number
  isStreaming?: boolean
  isThinking?: boolean
  thinkingContent?: string
  isAction?: boolean
  actionContent?: string
  intent?: UserIntent
  metadata?: {
    confidence?: number
    processingTime?: number
    tokenCount?: number
  }
}

/**
 * 对话状态
 */
export interface ConversationState {
  messages: MessageState[]
  isProcessing: boolean
  currentIntent?: UserIntent
  context?: ConversationContext
}

/**
 * Hook 配置
 */
export interface UseConversationEngineOptions {
  conversationId?: string
  enableStreaming?: boolean
  enableThinking?: boolean
  typingSpeed?: number
  onMessageComplete?: (message: MessageState) => void
  onError?: (error: Error) => void
}

/**
 * Hook 返回值
 */
export interface UseConversationEngineReturn {
  messages: MessageState[]
  isProcessing: boolean
  currentIntent?: UserIntent
  sendMessage: (content: string) => Promise<void>
  stopProcessing: () => void
  clearMessages: () => void
  regenerateMessage: (messageId: string) => Promise<void>
}

/**
 * 对话引擎 Hook
 */
export function useConversationEngine(
  options: UseConversationEngineOptions = {}
): UseConversationEngineReturn {
  const {
    conversationId = 'default',
    enableStreaming = true,
    enableThinking = true,
    typingSpeed = 30,
    onMessageComplete,
    onError,
  } = options

  // Refs
  const engineRef = useRef<ConversationEngine | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

  // State
  const [messages, setMessages] = useState<MessageState[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [currentIntent, setCurrentIntent] = useState<UserIntent | undefined>()

  // 初始化引擎
  useEffect(() => {
    engineRef.current = createConversationEngine({
      enableStreaming,
      enableThinking,
      typingSpeed,
    })

    return () => {
      engineRef.current?.clearContext(conversationId)
    }
  }, [conversationId, enableStreaming, enableThinking, typingSpeed])

  /**
   * 发送消息
   */
  const sendMessage = useCallback(
    async (content: string) => {
      if (!engineRef.current || isProcessing) return

      setIsProcessing(true)
      abortControllerRef.current = new AbortController()

      // 创建用户消息
      const userMessage: MessageState = {
        id: generateId(),
        role: 'user',
        content,
        timestamp: Date.now(),
      }

      setMessages((prev) => [...prev, userMessage])

      // 创建助手消息占位
      const assistantMessageId = generateId()
      const assistantMessage: MessageState = {
        id: assistantMessageId,
        role: 'assistant',
        content: '',
        timestamp: Date.now(),
        isStreaming: true,
        isThinking: enableThinking,
      }

      setMessages((prev) => [...prev, assistantMessage])

      // 构建流式处理器
      const handler: StreamingMessageHandler = {
        onStart: () => {
          // 开始处理
        },

        onChunk: (chunk, fullText) => {
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === assistantMessageId
                ? {
                    ...msg,
                    content: fullText,
                    isStreaming: true,
                  }
                : msg
            )
          )
        },

        onThinking: (thought) => {
          if (enableThinking) {
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === assistantMessageId
                  ? {
                      ...msg,
                      thinkingContent: thought,
                      isThinking: true,
                    }
                  : msg
              )
            )
          }
        },

        onAction: (action) => {
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === assistantMessageId
                ? {
                    ...msg,
                    actionContent: action,
                    isAction: true,
                  }
                : msg
            )
          )
        },

        onComplete: (response) => {
          const finalMessage: MessageState = {
            id: assistantMessageId,
            role: 'assistant',
            content: response.content,
            timestamp: Date.now(),
            isStreaming: false,
            isThinking: false,
            intent: response.metadata as unknown as UserIntent,
            metadata: {
              confidence: response.confidence,
              tokenCount: response.metadata.tokenCount,
            },
          }

          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === assistantMessageId ? finalMessage : msg
            )
          )

          setCurrentIntent(response.metadata as unknown as UserIntent)
          setIsProcessing(false)
          onMessageComplete?.(finalMessage)
        },

        onError: (error) => {
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === assistantMessageId
                ? {
                    ...msg,
                    content: `抱歉，处理出错：${error.message}`,
                    isStreaming: false,
                    isThinking: false,
                  }
                : msg
            )
          )
          setIsProcessing(false)
          onError?.(error)
        },
      }

      try {
        await engineRef.current.processMessage(content, conversationId, handler)
      } catch (error) {
        if ((error as Error).name !== 'AbortError') {
          onError?.(error as Error)
        }
        setIsProcessing(false)
      }
    },
    [isProcessing, conversationId, enableThinking, onMessageComplete, onError]
  )

  /**
   * 停止处理
   */
  const stopProcessing = useCallback(() => {
    abortControllerRef.current?.abort()
    engineRef.current?.cancelProcessing()
    setIsProcessing(false)
  }, [])

  /**
   * 清空消息
   */
  const clearMessages = useCallback(() => {
    setMessages([])
    engineRef.current?.clearContext(conversationId)
  }, [conversationId])

  /**
   * 重新生成消息
   */
  const regenerateMessage = useCallback(
    async (messageId: string) => {
      // 找到对应的消息
      const messageIndex = messages.findIndex((m) => m.id === messageId)
      if (messageIndex === -1) return

      // 找到前一条用户消息
      let userMessageIndex = messageIndex - 1
      while (userMessageIndex >= 0 && messages[userMessageIndex].role !== 'user') {
        userMessageIndex--
      }

      if (userMessageIndex < 0) return

      const userContent = messages[userMessageIndex].content

      // 删除当前助手消息及之后的所有消息
      setMessages((prev) => prev.slice(0, messageIndex))

      // 重新发送
      await sendMessage(userContent)
    },
    [messages, sendMessage]
  )

  return {
    messages,
    isProcessing,
    currentIntent,
    sendMessage,
    stopProcessing,
    clearMessages,
    regenerateMessage,
  }
}

/**
 * 生成唯一 ID
 */
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

export default useConversationEngine
