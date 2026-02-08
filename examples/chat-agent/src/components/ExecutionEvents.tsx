import { useState, useEffect } from 'react'
import { 
  executionEvents, 
  type AnyExecutionEvent,
  type SkillExecutionEvent,
  type MCPExecutionEvent,
  type ExecutionStepEvent,
  type ExecutionProgressEvent
} from '../agent/events'
import './ExecutionEvents.css'

interface ExecutionEventsProps {
  messageId: string
  conversationId: string
}

interface DisplayEvent {
  id: string
  type: string
  title: string
  description: string
  status: 'pending' | 'running' | 'completed' | 'error' | 'failed'
  timestamp: number
  duration?: number
  details?: Record<string, unknown>
}

export function ExecutionEvents({ messageId, conversationId }: ExecutionEventsProps) {
  const [events, setEvents] = useState<DisplayEvent[]>([])
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    // Subscribe to events for this message
    const unsubscribe = executionEvents.onFilter(
      { messageId, conversationId },
      (event: AnyExecutionEvent) => {
        setEvents(prev => {
          // Convert event to display event first
          const displayEvent = convertToDisplayEvent(event)
          
          // For skill events, match by skill name and running status
          // For other events, match by event id
          const existingIndex = prev.findIndex(e => {
            if (e.id === event.id) return true
            // Match skill events by name when they're running
            if (event.type === 'execution:skill' && e.type === 'skill' && e.status === 'running') {
              const skillEvent = event as SkillExecutionEvent
              return e.title === `Skill: ${skillEvent.skillName}`
            }
            return false
          })
          
          if (existingIndex >= 0) {
            const newEvents = [...prev]
            newEvents[existingIndex] = displayEvent
            return newEvents
          }
          
          return [...prev, displayEvent]
        })
      }
    )

    return () => unsubscribe()
  }, [messageId, conversationId])

  const convertToDisplayEvent = (event: AnyExecutionEvent): DisplayEvent => {
    switch (event.type) {
      case 'execution:start':
        return {
          id: event.id,
          type: 'start',
          title: '开始执行',
          description: `准备处理: ${event.input.substring(0, 50)}...`,
          status: 'completed',
          timestamp: event.timestamp,
          details: { selectedSkills: event.selectedSkills }
        }

      case 'execution:skill':
        const skillEvent = event as SkillExecutionEvent
        return {
          id: event.id,
          type: 'skill',
          title: `Skill: ${skillEvent.skillName}`,
          description: skillEvent.phase === 'start' 
            ? '正在执行...' 
            : skillEvent.result?.success 
              ? '执行完成' 
              : `错误: ${skillEvent.result?.error}`,
          status: skillEvent.phase === 'start' 
            ? 'running' 
            : skillEvent.result?.success 
              ? 'completed' 
              : 'error',
          timestamp: event.timestamp,
          duration: skillEvent.duration,
          details: skillEvent.params
        }

      case 'execution:mcp':
        const mcpEvent = event as MCPExecutionEvent
        return {
          id: event.id,
          type: 'mcp',
          title: `MCP Tool: ${mcpEvent.toolName}`,
          description: mcpEvent.phase === 'start'
            ? '调用中...'
            : mcpEvent.result?.success
              ? '调用完成'
              : `错误: ${mcpEvent.result?.error}`,
          status: mcpEvent.phase === 'start'
            ? 'running'
            : mcpEvent.result?.success
              ? 'completed'
              : 'error',
          timestamp: event.timestamp,
          duration: mcpEvent.duration,
          details: mcpEvent.args
        }

      case 'execution:step':
        const stepEvent = event as ExecutionStepEvent
        return {
          id: event.id,
          type: 'step',
          title: `步骤 ${stepEvent.step}/${stepEvent.totalSteps}`,
          description: stepEvent.description,
          status: stepEvent.status === 'failed' ? 'error' : stepEvent.status,
          timestamp: event.timestamp
        }

      case 'execution:progress':
        const progressEvent = event as ExecutionProgressEvent
        return {
          id: event.id,
          type: 'progress',
          title: '进度更新',
          description: progressEvent.message,
          status: 'running',
          timestamp: event.timestamp,
          details: { progress: progressEvent.progress, ...progressEvent.details }
        }

      case 'execution:llm':
        return {
          id: event.id,
          type: 'llm',
          title: 'LLM 调用',
          description: event.phase === 'start' 
            ? '开始生成...' 
            : event.phase === 'chunk'
              ? '生成中...'
              : '生成完成',
          status: event.phase === 'error' ? 'error' : event.phase === 'complete' ? 'completed' : 'running',
          timestamp: event.timestamp
        }

      case 'execution:complete':
        return {
          id: event.id,
          type: 'complete',
          title: '执行完成',
          description: `耗时: ${(event.duration / 1000).toFixed(2)}s`,
          status: 'completed',
          timestamp: event.timestamp,
          duration: event.duration,
          details: {
            skillsUsed: event.skillsUsed,
            mcpToolsUsed: event.mcpToolsUsed,
            tokenUsage: event.tokenUsage
          }
        }

      case 'execution:error':
        return {
          id: event.id,
          type: 'error',
          title: '执行错误',
          description: event.error,
          status: 'error',
          timestamp: event.timestamp
        }

      default:
        return {
          id: (event as AnyExecutionEvent).id,
          type: 'unknown',
          title: '未知事件',
          description: (event as AnyExecutionEvent).type,
          status: 'pending',
          timestamp: (event as AnyExecutionEvent).timestamp
        }
    }
  }

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'start':
        return '🚀'
      case 'skill':
        return '🔧'
      case 'mcp':
        return '🔌'
      case 'step':
        return '📋'
      case 'progress':
        return '📊'
      case 'llm':
        return '🤖'
      case 'complete':
        return '✅'
      case 'error':
        return '❌'
      default:
        return '📌'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'running':
        return <span className="status-spinner">⟳</span>
      case 'completed':
        return <span className="status-success">✓</span>
      case 'error':
        return <span className="status-error">✗</span>
      case 'pending':
        return <span className="status-pending">○</span>
      default:
        return null
    }
  }

  if (events.length === 0) {
    return null
  }

  const runningCount = events.filter(e => e.status === 'running').length
  const completedCount = events.filter(e => e.status === 'completed').length
  const errorCount = events.filter(e => e.status === 'error').length

  return (
    <div className="execution-events">
      <div 
        className="events-header"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="events-summary">
          <span className="events-icon">📊</span>
          <span className="events-title">执行详情</span>
          <span className="events-count">
            {runningCount > 0 && <span className="count-running">{runningCount} 运行中</span>}
            {completedCount > 0 && <span className="count-completed">{completedCount} 完成</span>}
            {errorCount > 0 && <span className="count-error">{errorCount} 错误</span>}
          </span>
        </div>
        <span className={`expand-icon ${expanded ? 'expanded' : ''}`}>
          ▼
        </span>
      </div>

      {expanded && (
        <div className="events-list">
          {events.map((event, index) => (
            <div 
              key={event.id} 
              className={`event-item ${event.status}`}
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <div className="event-icon">{getEventIcon(event.type)}</div>
              <div className="event-content">
                <div className="event-header">
                  <span className="event-title">{event.title}</span>
                  <span className="event-status">{getStatusIcon(event.status)}</span>
                </div>
                <div className="event-description">{event.description}</div>
                {event.duration && (
                  <div className="event-duration">
                    耗时: {(event.duration / 1000).toFixed(2)}s
                  </div>
                )}
                {event.details && Object.keys(event.details).length > 0 && (
                  <details className="event-details">
                    <summary>查看详情</summary>
                    <pre>{JSON.stringify(event.details, null, 2)}</pre>
                  </details>
                )}
              </div>
              <div className="event-time">
                {new Date(event.timestamp).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit'
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
