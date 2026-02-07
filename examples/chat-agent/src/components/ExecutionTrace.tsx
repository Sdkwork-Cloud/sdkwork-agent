import { useState, useEffect, useCallback } from 'react'
import {
  executionEvents,
  type AnyExecutionEvent,
  type SkillExecutionEvent,
  type MCPExecutionEvent,
} from '../agent/events'
import './ExecutionTrace.css'

interface ExecutionTraceProps {
  messageId: string
  conversationId: string
  onClose?: () => void
}

interface ExecutionStep {
  id: string
  type: 'skill' | 'mcp' | 'llm' | 'step'
  name: string
  status: 'pending' | 'running' | 'completed' | 'failed'
  startTime: number
  endTime?: number
  duration?: number
  details?: Record<string, unknown>
  error?: string
}

export function ExecutionTrace({ messageId, conversationId, onClose }: ExecutionTraceProps) {
  const [steps, setSteps] = useState<ExecutionStep[]>([])
  const [isExpanded, setIsExpanded] = useState(true)
  const [progress, setProgress] = useState(0)

  const addStep = useCallback((step: ExecutionStep) => {
    setSteps(prev => [...prev, step])
  }, [])

  const updateStep = useCallback((id: string, updates: Partial<ExecutionStep>) => {
    setSteps(prev =>
      prev.map(step => (step.id === id ? { ...step, ...updates } : step))
    )
  }, [])

  useEffect(() => {
    const unsubscribe = executionEvents.onFilter(
      { messageId, conversationId },
      (event: AnyExecutionEvent) => {
        switch (event.type) {
          case 'execution:skill': {
            const skillEvent = event as SkillExecutionEvent
            const stepId = `skill-${skillEvent.skillName}`

            if (skillEvent.phase === 'start') {
              addStep({
                id: stepId,
                type: 'skill',
                name: skillEvent.skillName,
                status: 'running',
                startTime: skillEvent.timestamp,
                details: skillEvent.params,
              })
            } else if (skillEvent.phase === 'complete') {
              updateStep(stepId, {
                status: skillEvent.result?.success ? 'completed' : 'failed',
                endTime: skillEvent.timestamp,
                duration: skillEvent.duration,
                error: skillEvent.result?.error,
              })
            }
            break
          }

          case 'execution:mcp': {
            const mcpEvent = event as MCPExecutionEvent
            const stepId = `mcp-${mcpEvent.toolName}`

            if (mcpEvent.phase === 'start') {
              addStep({
                id: stepId,
                type: 'mcp',
                name: mcpEvent.toolName,
                status: 'running',
                startTime: mcpEvent.timestamp,
                details: { args: mcpEvent.args, serverId: mcpEvent.serverId },
              })
            } else if (mcpEvent.phase === 'complete') {
              updateStep(stepId, {
                status: mcpEvent.result?.success ? 'completed' : 'failed',
                endTime: mcpEvent.timestamp,
                duration: mcpEvent.duration,
                error: mcpEvent.result?.error,
              })
            }
            break
          }

          case 'execution:progress': {
            setProgress(event.progress)
            break
          }

          case 'execution:complete': {
            setProgress(100)
            break
          }
        }
      }
    )

    return () => unsubscribe()
  }, [messageId, conversationId, addStep, updateStep])

  const formatDuration = (ms?: number): string => {
    if (!ms) return ''
    if (ms < 1000) return `${ms}ms`
    return `${(ms / 1000).toFixed(2)}s`
  }

  const getStepIcon = (type: string, status: string): string => {
    const icons: Record<string, Record<string, string>> = {
      skill: {
        pending: '⏳',
        running: '⚙️',
        completed: '✅',
        failed: '❌',
      },
      mcp: {
        pending: '⏳',
        running: '🔌',
        completed: '✅',
        failed: '❌',
      },
      llm: {
        pending: '⏳',
        running: '🤖',
        completed: '✅',
        failed: '❌',
      },
      step: {
        pending: '⏳',
        running: '▶️',
        completed: '✅',
        failed: '❌',
      },
    }
    return icons[type]?.[status] || '⏳'
  }

  const runningSteps = steps.filter(s => s.status === 'running').length
  const completedSteps = steps.filter(s => s.status === 'completed').length
  const failedSteps = steps.filter(s => s.status === 'failed').length

  if (steps.length === 0) return null

  return (
    <div className={`execution-trace ${isExpanded ? 'expanded' : 'collapsed'}`}>
      <div className="trace-header" onClick={() => setIsExpanded(!isExpanded)}>
        <div className="trace-title">
          <span className="trace-icon">📊</span>
          <span>Execution Trace</span>
          <span className="trace-badge">{steps.length}</span>
        </div>
        <div className="trace-summary">
          {runningSteps > 0 && <span className="badge running">{runningSteps} running</span>}
          {completedSteps > 0 && <span className="badge completed">{completedSteps} done</span>}
          {failedSteps > 0 && <span className="badge failed">{failedSteps} failed</span>}
        </div>
        <div className="trace-actions">
          <button className="toggle-btn">
            {isExpanded ? '▼' : '▶'}
          </button>
          {onClose && (
            <button className="close-btn" onClick={(e) => { e.stopPropagation(); onClose() }}>
              ×
            </button>
          )}
        </div>
      </div>

      {isExpanded && (
        <>
          <div className="trace-progress">
            <div className="progress-bar">
              <div className="progress-fill" style={{ width: `${progress}%` }} />
            </div>
            <span className="progress-text">{progress}%</span>
          </div>

          <div className="trace-steps">
            {steps.map((step, index) => (
              <div
                key={step.id}
                className={`trace-step ${step.status}`}
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <div className="step-indicator">
                  <span className="step-icon">{getStepIcon(step.type, step.status)}</span>
                  {index < steps.length - 1 && <div className="step-line" />}
                </div>
                <div className="step-content">
                  <div className="step-header">
                    <span className="step-name">{step.name}</span>
                    <span className={`step-status ${step.status}`}>{step.status}</span>
                  </div>
                  <div className="step-meta">
                    <span className="step-type">{step.type.toUpperCase()}</span>
                    {step.duration && (
                      <span className="step-duration">{formatDuration(step.duration)}</span>
                    )}
                  </div>
                  {step.error && (
                    <div className="step-error">{step.error}</div>
                  )}
                  {step.details && Object.keys(step.details).length > 0 && (
                    <details className="step-details">
                      <summary>Details</summary>
                      <pre>{JSON.stringify(step.details, null, 2)}</pre>
                    </details>
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
