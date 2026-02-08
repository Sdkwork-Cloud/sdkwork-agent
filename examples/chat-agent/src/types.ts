export interface Message {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: number
  skillsUsed?: string[]
  evaluation?: {
    passed: boolean
    score: number
    feedback: string
  }
  isError?: boolean
  isStreaming?: boolean
}

export interface Conversation {
  id: string
  title: string
  messages: Message[]
  createdAt: number
  updatedAt: number
  model?: string
}

// MCP Tool Result
export interface MCPToolResult {
  content: Array<{
    type: string
    text?: string
    data?: unknown
  }>
  isError?: boolean
  metadata?: Record<string, unknown>
}

// MCP Resource Content
export interface MCPResourceContent {
  uri: string
  mimeType: string
  text?: string
  blob?: string
  metadata?: Record<string, unknown>
}

// Agent interface for Skills to access MCP
export interface Agent {
  executeMCPTool: (name: string, args: Record<string, unknown>) => Promise<MCPToolResult>
  readMCPResource: (uri: string) => Promise<MCPResourceContent>
}

// Execution Context passed to Skill handlers
export interface ExecutionContext {
  agent: Agent
  skillName: string
  timestamp: Date
  metadata?: Record<string, unknown>
}

export interface Skill {
  name: string
  description: string
  parameters?: {
    type: 'object'
    properties: Record<string, {
      type: string
      description?: string
      enum?: string[]
      default?: unknown
    }>
    required?: string[]
  }
  handler?: (params: Record<string, unknown>, context: ExecutionContext) => Promise<{
    success: boolean
    data?: unknown
    error?: string
  }>
  metadata?: {
    category?: string
    tags?: string[]
    icon?: string
  }
}

export interface AgentConfigType {
  provider: 'openai' | 'anthropic' | 'gemini' | 'deepseek' | 'doubao'
  apiKey: string
  model?: string
  baseUrl?: string
  temperature?: number
  maxTokens?: number
  evaluationEnabled?: boolean
  evaluationLevel?: 'none' | 'basic' | 'standard' | 'strict'
}

export interface AgentResponse {
  content: string
  skillsUsed?: string[]
  evaluation?: {
    passed: boolean
    score: number
    feedback: string
  }
}

export type Theme = 'light' | 'dark' | 'system'

// Skill match result for smart skill selection
export interface SkillMatch {
  skill: Skill
  score: number
  matchedKeywords: string[]
}
