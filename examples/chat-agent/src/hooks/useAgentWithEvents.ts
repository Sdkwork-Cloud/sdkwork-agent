/**
 * useAgentWithEvents Hook
 *
 * React hook for using Agent with event system.
 * Provides real-time execution monitoring and conversation management.
 */

import { useState, useCallback, useRef, useEffect } from 'react'
import { AgentWithEvents } from '../agent/agent-with-events'
import {
  agentEventEmitter,
  executionTracer,
  type AgentEvent,
  type ExecutionTrace,
} from '../agent/event-system'
import type { AgentConfig, Conversation, Message, SkillResult } from '../types'

export interface UseAgentWithEventsOptions {
  config: AgentConfig
  onEvent?: (event: AgentEvent) => void
  onSkillComplete?: (result: SkillResult) => void
}

export interface UseAgentWithEventsReturn {
  agent: AgentWithEvents | null
  isInitialized: boolean
  isProcessing: boolean
  currentTrace: ExecutionTrace | null
  events: AgentEvent[]
  initialize: () => Promise<void>
  sendMessage: (content: string, options?: { skills?: string[] }) => Promise<void>
  stopProcessing: () => void
}

export function useAgentWithEvents(
  options: UseAgentWithEventsOptions
): UseAgentWithEventsReturn {
  const [agent, setAgent] = useState<AgentWithEvents | null>(null)
  const [isInitialized, setIsInitialized] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [currentTrace, setCurrentTrace] = useState<ExecutionTrace | null>(null)
  const [events, setEvents] = useState<AgentEvent[]>([])

  const abortControllerRef = useRef<AbortController | null>(null)
  const eventsRef = useRef<AgentEvent[]>([])

  // Initialize agent
  const initialize = useCallback(async () => {
    if (agent) return

    const newAgent = new AgentWithEvents(options.config)
    await newAgent.initialize()

    setAgent(newAgent)
    setIsInitialized(true)
  }, [options.config, agent])

  // Listen to events
  useEffect(() => {
    const handleEvent = (event: AgentEvent) => {
      // Add to events list
      eventsRef.current.push(event)
      setEvents([...eventsRef.current])

      // Call user callback
      options.onEvent?.(event)

      // Update current trace
      if (event.traceId) {
        const trace = executionTracer.getTrace(event.traceId)
        if (trace) {
          setCurrentTrace(trace)
        }
      }

      // Handle skill completion
      if (event.type === 'skill:complete' && event.result) {
        options.onSkillComplete?.(event.result)
      }
    }

    const unsubscribe = agentEventEmitter.onAll(handleEvent)

    return () => {
      unsubscribe()
    }
  }, [options])

  // Send message
  const sendMessage = useCallback(
    async (content: string, options_?: { skills?: string[] }) => {
      if (!agent || isProcessing) return

      setIsProcessing(true)
      abortControllerRef.current = new AbortController()

      try {
        // Execute with skills if specified
        if (options_?.skills && options_.skills.length > 0) {
          for (const skillName of options_.skills) {
            if (abortControllerRef.current.signal.aborted) break

            const result = await agent.executeSkill(skillName, { input: content }, {
              conversationId: 'default',
            })

            if (!result.success) {
              console.error(`Skill ${skillName} failed:`, result.error)
            }
          }
        }
      } catch (error) {
        console.error('Message processing failed:', error)
      } finally {
        setIsProcessing(false)
        abortControllerRef.current = null
      }
    },
    [agent, isProcessing]
  )

  // Stop processing
  const stopProcessing = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
    }
    setIsProcessing(false)
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      agent?.destroy()
    }
  }, [agent])

  return {
    agent,
    isInitialized,
    isProcessing,
    currentTrace,
    events,
    initialize,
    sendMessage,
    stopProcessing,
  }
}
