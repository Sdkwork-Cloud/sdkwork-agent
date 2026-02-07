/**
 * Agent Execution Event System
 * 
 * Provides real-time feedback during agent execution
 * Supports: Skills, MCP Tools, LLM streaming, and custom events
 */

// ============================================
// Event Types
// ============================================

export type ExecutionEventType =
  | 'execution:start'
  | 'execution:step'
  | 'execution:skill'
  | 'execution:mcp'
  | 'execution:llm'
  | 'execution:complete'
  | 'execution:error'
  | 'execution:progress'

// ============================================
// Base Event Interface
// ============================================

export interface ExecutionEvent {
  id: string
  type: ExecutionEventType
  timestamp: number
  messageId: string
  conversationId: string
  metadata?: Record<string, unknown>
}

// ============================================
// Specific Event Types
// ============================================

export interface ExecutionStartEvent extends ExecutionEvent {
  type: 'execution:start'
  input: string
  selectedSkills: string[]
}

export interface ExecutionStepEvent extends ExecutionEvent {
  type: 'execution:step'
  step: number
  totalSteps: number
  description: string
  status: 'pending' | 'running' | 'completed' | 'failed'
}

export interface SkillExecutionEvent extends ExecutionEvent {
  type: 'execution:skill'
  skillName: string
  phase: 'start' | 'complete' | 'error'
  params?: Record<string, unknown>
  result?: {
    success: boolean
    data?: unknown
    error?: string
  }
  duration?: number
}

export interface MCPExecutionEvent extends ExecutionEvent {
  type: 'execution:mcp'
  toolName: string
  phase: 'start' | 'complete' | 'error'
  args?: Record<string, unknown>
  result?: {
    success: boolean
    content?: unknown
    error?: string
  }
  duration?: number
  serverId?: string
}

export interface LLMStreamEvent extends ExecutionEvent {
  type: 'execution:llm'
  phase: 'start' | 'chunk' | 'complete' | 'error'
  content?: string
  chunk?: string
  model?: string
  tokens?: {
    prompt: number
    completion: number
    total: number
  }
}

export interface ExecutionCompleteEvent extends ExecutionEvent {
  type: 'execution:complete'
  output: string
  skillsUsed: string[]
  mcpToolsUsed: string[]
  duration: number
  tokenUsage: {
    prompt: number
    completion: number
    total: number
  }
}

export interface ExecutionErrorEvent extends ExecutionEvent {
  type: 'execution:error'
  error: string
  step?: string
  recoverable: boolean
}

export interface ExecutionProgressEvent extends ExecutionEvent {
  type: 'execution:progress'
  progress: number // 0-100
  message: string
  details?: Record<string, unknown>
}

// Union type for all events
export type AnyExecutionEvent =
  | ExecutionStartEvent
  | ExecutionStepEvent
  | SkillExecutionEvent
  | MCPExecutionEvent
  | LLMStreamEvent
  | ExecutionCompleteEvent
  | ExecutionErrorEvent
  | ExecutionProgressEvent

// ============================================
// Event Listener Types
// ============================================

export type ExecutionEventListener = (event: AnyExecutionEvent) => void

export interface EventFilter {
  types?: ExecutionEventType[]
  messageId?: string
  conversationId?: string
}

// ============================================
// Event Emitter
// ============================================

class ExecutionEventEmitter {
  private listeners: Map<string, Set<ExecutionEventListener>> = new Map()
  private globalListeners: Set<ExecutionEventListener> = new Set()

  // Subscribe to all events
  on(listener: ExecutionEventListener): () => void {
    this.globalListeners.add(listener)
    return () => this.globalListeners.delete(listener)
  }

  // Subscribe to specific event types
  onType(type: ExecutionEventType, listener: ExecutionEventListener): () => void {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, new Set())
    }
    this.listeners.get(type)!.add(listener)
    return () => this.listeners.get(type)?.delete(listener)
  }

  // Subscribe with filter
  onFilter(filter: EventFilter, listener: ExecutionEventListener): () => void {
    const wrappedListener = (event: AnyExecutionEvent) => {
      if (filter.types && !filter.types.includes(event.type)) return
      if (filter.messageId && event.messageId !== filter.messageId) return
      if (filter.conversationId && event.conversationId !== filter.conversationId) return
      listener(event)
    }

    this.globalListeners.add(wrappedListener)
    return () => this.globalListeners.delete(wrappedListener)
  }

  // Emit an event
  emit(event: AnyExecutionEvent): void {
    // Notify global listeners
    this.globalListeners.forEach(listener => {
      try {
        listener(event)
      } catch (error) {
        console.error('[EventEmitter] Listener error:', error)
      }
    })

    // Notify type-specific listeners
    const typeListeners = this.listeners.get(event.type)
    if (typeListeners) {
      typeListeners.forEach(listener => {
        try {
          listener(event)
        } catch (error) {
          console.error('[EventEmitter] Type listener error:', error)
        }
      })
    }
  }

  // Remove all listeners
  clear(): void {
    this.globalListeners.clear()
    this.listeners.clear()
  }
}

// Export singleton instance
export const executionEvents = new ExecutionEventEmitter()

// ============================================
// Event Helpers
// ============================================

export function createEventId(): string {
  return `evt-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

export function emitSkillStart(
  messageId: string,
  conversationId: string,
  skillName: string,
  params: Record<string, unknown>
): void {
  executionEvents.emit({
    id: createEventId(),
    type: 'execution:skill',
    timestamp: Date.now(),
    messageId,
    conversationId,
    skillName,
    phase: 'start',
    params,
  } as SkillExecutionEvent)
}

export function emitSkillComplete(
  messageId: string,
  conversationId: string,
  skillName: string,
  result: { success: boolean; data?: unknown; error?: string },
  duration: number
): void {
  executionEvents.emit({
    id: createEventId(),
    type: 'execution:skill',
    timestamp: Date.now(),
    messageId,
    conversationId,
    skillName,
    phase: 'complete',
    result,
    duration,
  } as SkillExecutionEvent)
}

export function emitMCPStart(
  messageId: string,
  conversationId: string,
  toolName: string,
  args: Record<string, unknown>,
  serverId?: string
): void {
  executionEvents.emit({
    id: createEventId(),
    type: 'execution:mcp',
    timestamp: Date.now(),
    messageId,
    conversationId,
    toolName,
    phase: 'start',
    args,
    serverId,
  } as MCPExecutionEvent)
}

export function emitMCPComplete(
  messageId: string,
  conversationId: string,
  toolName: string,
  result: { success: boolean; content?: unknown; error?: string },
  duration: number,
  serverId?: string
): void {
  executionEvents.emit({
    id: createEventId(),
    type: 'execution:mcp',
    timestamp: Date.now(),
    messageId,
    conversationId,
    toolName,
    phase: 'complete',
    result,
    duration,
    serverId,
  } as MCPExecutionEvent)
}

export function emitLLMStart(
  messageId: string,
  conversationId: string,
  model: string
): void {
  executionEvents.emit({
    id: createEventId(),
    type: 'execution:llm',
    timestamp: Date.now(),
    messageId,
    conversationId,
    phase: 'start',
    model,
  } as LLMStreamEvent)
}

export function emitLLMChunk(
  messageId: string,
  conversationId: string,
  chunk: string,
  content: string
): void {
  executionEvents.emit({
    id: createEventId(),
    type: 'execution:llm',
    timestamp: Date.now(),
    messageId,
    conversationId,
    phase: 'chunk',
    chunk,
    content,
  } as LLMStreamEvent)
}

export function emitProgress(
  messageId: string,
  conversationId: string,
  progress: number,
  message: string,
  details?: Record<string, unknown>
): void {
  executionEvents.emit({
    id: createEventId(),
    type: 'execution:progress',
    timestamp: Date.now(),
    messageId,
    conversationId,
    progress,
    message,
    details,
  } as ExecutionProgressEvent)
}
