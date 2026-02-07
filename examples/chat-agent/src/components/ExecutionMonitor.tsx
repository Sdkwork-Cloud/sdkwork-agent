/**
 * Execution Monitor Component
 *
 * Real-time monitoring of Skill and MCP execution with visual feedback.
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import {
  agentEventEmitter,
  executionTracer,
  type AgentEvent,
  type ExecutionTrace,
  type ExecutionStep,
} from '../agent/event-system'
import './ExecutionMonitor.css'

// ============================================
// Types
// ============================================

interface ExecutionMonitorProps {
  conversationId: string
  messageId?: string
  onStepComplete?: (step: ExecutionStep) => void
}

interface DisplayStep {
  id: string
  type: 'skill' | 'mcp' | 'llm' | 'tool'
  name: string
  status: 'pending' | 'running' | 'completed' | 'error'
  startTime: number
  endTime?: number
  duration?: number
  progress?: number
  error?: { code: string; message: string }
  children: DisplayStep[]
}

// ============================================
// Component
// ============================================

export function ExecutionMonitor({
  conversationId,
  messageId,
  onStepComplete,
}: ExecutionMonitorProps) {
  const [steps, setSteps] = useState<DisplayStep[]>([])
  const [isExpanded, setIsExpanded] = useState(true)
  const [activeTraceId, setActiveTraceId] = useState<string | null>(null)
  const stepsRef = useRef<Map<string, DisplayStep>>(new Map())

  // Convert execution step to display step
  const toDisplayStep = useCallback((step: ExecutionStep): DisplayStep => {
    return {
      id: step.id,
      type: step.type,
      name: step.name,
      status: step.status,
      startTime: step.startTime,
      endTime: step.endTime,
      duration: step.duration,
      progress: step.progress,
      error: step.error,
      children: step.children.map(toDisplayStep),
    }
  }, [])

  // Update steps from trace
  const updateStepsFromTrace = useCallback((trace: ExecutionTrace) => {
    const displaySteps = trace.steps.map(toDisplayStep)
    setSteps(displaySteps)

    // Update ref
    stepsRef.current.clear()
    const addToRef = (step: DisplayStep) => {
      stepsRef.current.set(step.id, step)
      step.children.forEach(addToRef)
    }
    displaySteps.forEach(addToRef)
  }, [toDisplayStep])

  // Listen to events
  useEffect(() => {
    const handleEvent = (event: AgentEvent) => {
      // Filter by conversation
      if (event.conversationId !== conversationId) return
      if (messageId && event.messageId !== messageId) return

      // Get or create trace
      let trace = executionTracer.getTrace(event.traceId)
      if (!trace) {
        trace = executionTracer.startTrace(
          event.traceId,
          conversationId,
          messageId || event.id
        )
        setActiveTraceId(event.traceId)
      }

      // Handle different event types
      switch (event.type) {
        case 'skill:start': {
          executionTracer.addStep(event.traceId, {
            type: 'skill',
            name: event.skillName,
            status: 'running',
            progress: 0,
          })
          break
        }

        case 'skill:progress': {
          const step = stepsRef.current.get(event.executionId)
          if (step) {
            step.progress = (event.step / event.totalSteps) * 100
            step.status = 'running'
          }
          break
        }

        case 'skill:complete': {
          const step = stepsRef.current.get(event.executionId)
          if (step) {
            step.status = event.result.success ? 'completed' : 'error'
            step.duration = event.duration
            step.progress = 100
            onStepComplete?.(step as ExecutionStep)
          }
          break
        }

        case 'skill:error': {
          const step = stepsRef.current.get(event.executionId)
          if (step) {
            step.status = 'error'
            step.error = event.error
          }
          break
        }

        case 'mcp:start': {
          executionTracer.addStep(event.traceId, {
            type: 'mcp',
            name: event.toolName,
            status: 'running',
            progress: 0,
          })
          break
        }

        case 'mcp:progress': {
          const step = stepsRef.current.get(event.executionId)
          if (step) {
            step.progress = event.progress
            step.status = 'running'
          }
          break
        }

        case 'mcp:complete': {
          const step = stepsRef.current.get(event.executionId)
          if (step) {
            step.status = event.result.success ? 'completed' : 'error'
            step.duration = event.duration
            step.progress = 100
            onStepComplete?.(step as ExecutionStep)
          }
          break
        }

        case 'mcp:error': {
          const step = stepsRef.current.get(event.executionId)
          if (step) {
            step.status = 'error'
            step.error = event.error
          }
          break
        }
      }

      // Update UI
      const updatedTrace = executionTracer.getTrace(event.traceId)
      if (updatedTrace) {
        updateStepsFromTrace(updatedTrace)
      }
    }

    // Subscribe to all events
    const unsubscribe = agentEventEmitter.onAll(handleEvent)

    // Load existing traces
    const existingTraces = executionTracer.getTracesByConversation(conversationId)
    if (existingTraces.length > 0) {
      const latestTrace = existingTraces[existingTraces.length - 1]
      setActiveTraceId(latestTrace.traceId)
      updateStepsFromTrace(latestTrace)
    }

    return () => {
      unsubscribe()
    }
  }, [conversationId, messageId, onStepComplete, updateStepsFromTrace])

  // Get status icon
  const getStatusIcon = (status: DisplayStep['status']) => {
    switch (status) {
      case 'pending':
        return '⏳'
      case 'running':
        return '▶️'
      case 'completed':
        return '✅'
      case 'error':
        return '❌'
      default:
        return '⏳'
    }
  }

  // Get type icon
  const getTypeIcon = (type: DisplayStep['type']) => {
    switch (type) {
      case 'skill':
        return '🎯'
      case 'mcp':
        return '🔧'
      case 'llm':
        return '🧠'
      case 'tool':
        return '🛠️'
      default:
        return '📦'
    }
  }

  // Format duration
  const formatDuration = (ms?: number) => {
    if (!ms) return ''
    if (ms < 1000) return `${ms}ms`
    return `${(ms / 1000).toFixed(2)}s`
  }

  // Render step
  const renderStep = (step: DisplayStep, depth = 0) => {
    const hasChildren = step.children.length > 0
    const isRunning = step.status === 'running'

    return (
      <div
        key={step.id}
        className={`execution-step execution-step--${step.status}`}
        style={{ marginLeft: `${depth * 20}px` }}
      >
        <div className="execution-step__header">
          <span className="execution-step__icon">{getStatusIcon(step.status)}</span>
          <span className="execution-step__type-icon">{getTypeIcon(step.type)}</span>
          <span className="execution-step__name">{step.name}</span>
          {step.duration && (
            <span className="execution-step__duration">{formatDuration(step.duration)}</span>
          )}
        </div>

        {isRunning && step.progress !== undefined && (
          <div className="execution-step__progress">
            <div
              className="execution-step__progress-bar"
              style={{ width: `${step.progress}%` }}
            />
            <span className="execution-step__progress-text">{Math.round(step.progress)}%</span>
          </div>
        )}

        {step.error && (
          <div className="execution-step__error">
            <span className="execution-step__error-code">{step.error.code}</span>
            <span className="execution-step__error-message">{step.error.message}</span>
          </div>
        )}

        {hasChildren && (
          <div className="execution-step__children">
            {step.children.map(child => renderStep(child, depth + 1))}
          </div>
        )}
      </div>
    )
  }

  // Calculate overall progress
  const calculateProgress = (steps: DisplayStep[]): number => {
    if (steps.length === 0) return 0
    let totalProgress = 0
    let count = 0

    const calculate = (step: DisplayStep) => {
      if (step.status === 'completed') {
        totalProgress += 100
      } else if (step.status === 'running' && step.progress !== undefined) {
        totalProgress += step.progress
      }
      count++
      step.children.forEach(calculate)
    }

    steps.forEach(calculate)
    return count > 0 ? totalProgress / count : 0
  }

  const overallProgress = calculateProgress(steps)
  const isComplete = steps.every(s => s.status === 'completed' || s.status === 'error')

  if (steps.length === 0) {
    return null
  }

  return (
    <div className={`execution-monitor ${isExpanded ? 'execution-monitor--expanded' : ''}`}>
      <div
        className="execution-monitor__header"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="execution-monitor__title">
          <span className="execution-monitor__icon">🔍</span>
          <span>Execution Trace</span>
          {activeTraceId && (
            <span className="execution-monitor__trace-id">
              {activeTraceId.slice(0, 8)}...
            </span>
          )}
        </div>

        <div className="execution-monitor__status">
          {!isComplete && (
            <div className="execution-monitor__progress">
              <div
                className="execution-monitor__progress-bar"
                style={{ width: `${overallProgress}%` }}
              />
              <span className="execution-monitor__progress-text">
                {Math.round(overallProgress)}%
              </span>
            </div>
          )}
          <span className={`execution-monitor__status-badge execution-monitor__status-badge--${isComplete ? 'complete' : 'running'}`}>
            {isComplete ? 'Complete' : 'Running'}
          </span>
          <button className="execution-monitor__toggle">
            {isExpanded ? '▼' : '▶'}
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="execution-monitor__content">
          {steps.map(step => renderStep(step))}
        </div>
      )}
    </div>
  )
}
