/**
 * MCP (Model Context Protocol) Integration for Chat Agent
 * https://modelcontextprotocol.io
 * 
 * This module provides MCP client capabilities that integrate with the Skills system.
 * Skills can call MCP tools through the ExecutionContext.agent interface.
 */

import type { Skill } from '../types'

// MCP Tool Definition
export interface MCPTool {
  name: string
  description: string
  inputSchema: {
    type: 'object'
    properties: Record<string, {
      type: string
      description?: string
      enum?: string[]
      default?: unknown
    }>
    required?: string[]
  }
  execute: (args: Record<string, unknown>) => Promise<MCPToolResult>
}

// MCP Tool Result
export interface MCPToolResult {
  content: Array<{
    type: 'text' | 'image' | 'json'
    text?: string
    data?: unknown
  }>
  isError?: boolean
  metadata?: Record<string, unknown>
}

// MCP Resource
export interface MCPResource {
  uri: string
  name: string
  description?: string
  mimeType?: string
  read: () => Promise<MCPResourceContent>
}

// MCP Resource Content
export interface MCPResourceContent {
  uri: string
  mimeType: string
  text?: string
  blob?: string
  metadata?: Record<string, unknown>
}

// MCP Server Configuration
export interface MCPServerConfig {
  name: string
  url: string
  auth?: {
    type: 'bearer' | 'apiKey'
    token: string
  }
}

// MCP Client for connecting to external MCP servers
export class MCPClient {
  private tools: Map<string, MCPTool> = new Map()
  private resources: Map<string, MCPResource> = new Map()
  private connected = false
  private config: MCPServerConfig

  constructor(config: MCPServerConfig) {
    this.config = config
  }

  async connect(): Promise<void> {
    try {
      const headers = this.getHeaders()
      
      // Fetch server capabilities
      const response = await fetch(`${this.config.url}/capabilities`, { headers })
      
      if (!response.ok) {
        throw new Error(`Failed to connect: ${response.status}`)
      }

      const capabilities = await response.json()

      // Register remote tools
      for (const tool of capabilities.tools || []) {
        this.tools.set(tool.name, this.createRemoteTool(tool, headers))
      }

      // Register remote resources
      for (const resource of capabilities.resources || []) {
        this.resources.set(resource.uri, this.createRemoteResource(resource, headers))
      }

      this.connected = true
      console.log(`[MCP] Connected to ${this.config.name}`)
    } catch (error) {
      console.error(`[MCP] Connection failed:`, error)
      throw error
    }
  }

  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }

    if (this.config.auth?.type === 'bearer') {
      headers['Authorization'] = `Bearer ${this.config.auth.token}`
    } else if (this.config.auth?.type === 'apiKey') {
      headers['X-API-Key'] = this.config.auth.token
    }

    return headers
  }

  private createRemoteTool(tool: Record<string, unknown>, headers: Record<string, string>): MCPTool {
    return {
      name: tool.name as string,
      description: tool.description as string,
      inputSchema: tool.inputSchema as MCPTool['inputSchema'],
      execute: async (args: Record<string, unknown>) => {
        const response = await fetch(
          `${this.config.url}/tools/${encodeURIComponent(tool.name as string)}`,
          {
            method: 'POST',
            headers,
            body: JSON.stringify(args),
          }
        )

        if (!response.ok) {
          throw new Error(`Tool execution failed: ${response.status}`)
        }

        return response.json()
      },
    }
  }

  private createRemoteResource(resource: Record<string, unknown>, headers: Record<string, string>): MCPResource {
    return {
      uri: resource.uri as string,
      name: resource.name as string,
      description: resource.description as string,
      mimeType: resource.mimeType as string,
      read: async () => {
        const response = await fetch(
          `${this.config.url}/resources/${encodeURIComponent(resource.uri as string)}`,
          { headers }
        )

        if (!response.ok) {
          throw new Error(`Resource read failed: ${response.status}`)
        }

        return response.json()
      },
    }
  }

  getTools(): MCPTool[] {
    return Array.from(this.tools.values())
  }

  getResources(): MCPResource[] {
    return Array.from(this.resources.values())
  }

  getTool(name: string): MCPTool | undefined {
    return this.tools.get(name)
  }

  getResource(uri: string): MCPResource | undefined {
    return this.resources.get(uri)
  }

  isConnected(): boolean {
    return this.connected
  }

  disconnect(): void {
    this.connected = false
    this.tools.clear()
    this.resources.clear()
  }
}

// MCP Manager - Manages multiple MCP connections and provides direct tool execution
export class MCPManager {
  private clients: Map<string, MCPClient> = new Map()
  private localTools: Map<string, MCPTool> = new Map()
  private localResources: Map<string, MCPResource> = new Map()

  // Connect to an MCP server
  async connectServer(id: string, config: MCPServerConfig): Promise<void> {
    const client = new MCPClient(config)
    await client.connect()
    this.clients.set(id, client)
  }

  // Disconnect from an MCP server
  disconnectServer(id: string): void {
    const client = this.clients.get(id)
    if (client) {
      client.disconnect()
      this.clients.delete(id)
    }
  }

  // Register a local tool
  registerTool(tool: MCPTool): void {
    this.localTools.set(tool.name, tool)
  }

  // Register a local resource
  registerResource(resource: MCPResource): void {
    this.localResources.set(resource.uri, resource)
  }

  // Get all available tools (local + remote)
  getAllTools(): MCPTool[] {
    const tools = [...this.localTools.values()]
    for (const client of this.clients.values()) {
      tools.push(...client.getTools())
    }
    return tools
  }

  // Get all available resources (local + remote)
  getAllResources(): MCPResource[] {
    const resources = [...this.localResources.values()]
    for (const client of this.clients.values()) {
      resources.push(...client.getResources())
    }
    return resources
  }

  // Execute a tool by name (direct execution)
  async executeTool(name: string, args: Record<string, unknown>): Promise<MCPToolResult> {
    // Try local tools first
    const localTool = this.localTools.get(name)
    if (localTool) {
      return localTool.execute(args)
    }

    // Try remote tools
    for (const client of this.clients.values()) {
      const tool = client.getTool(name)
      if (tool) {
        return tool.execute(args)
      }
    }

    throw new Error(`Tool '${name}' not found`)
  }

  // Read a resource by URI
  async readResource(uri: string): Promise<MCPResourceContent> {
    // Try local resources first
    const localResource = this.localResources.get(uri)
    if (localResource) {
      return localResource.read()
    }

    // Try remote resources
    for (const client of this.clients.values()) {
      const resource = client.getResource(uri)
      if (resource) {
        return resource.read()
      }
    }

    throw new Error(`Resource '${uri}' not found`)
  }

  // Get connection status
  getStatus(): { id: string; name: string; connected: boolean }[] {
    return Array.from(this.clients.entries()).map(([id, client]) => ({
      id,
      name: id,
      connected: client.isConnected(),
    }))
  }

  // Clear all connections and registrations
  clear(): void {
    for (const client of this.clients.values()) {
      client.disconnect()
    }
    this.clients.clear()
    this.localTools.clear()
    this.localResources.clear()
  }
}

// Export singleton instance
export const mcpManager = new MCPManager()

// ============================================
// Skills with MCP Support
// ============================================

/**
 * Example skill that uses MCP tools through ExecutionContext
 * 
 * Skills can access MCP through the context.agent interface:
 * - context.agent.executeMCPTool(name, args)
 * - context.agent.readMCPResource(uri)
 */

// Film production skills that can leverage MCP
export const filmSkillsWithMCP: Skill[] = [
  {
    name: 'generate-script-with-mcp',
    description: 'Generate a script using MCP-enhanced capabilities. Can leverage external script generation services via MCP.',
    parameters: {
      type: 'object',
      properties: {
        concept: {
          type: 'string',
          description: 'Story concept or synopsis',
        },
        useMCP: {
          type: 'boolean',
          description: 'Whether to use MCP-enhanced generation if available',
          default: true,
        },
      },
      required: ['concept'],
    },
    handler: async (params, context) => {
      try {
        // Check if we should use MCP
        if (params.useMCP && context.agent?.executeMCPTool) {
          // Try to use MCP script generation tool if available
          try {
            const result = await context.agent.executeMCPTool('script-generator', {
              concept: params.concept,
              format: 'screenplay',
            })
            
            return {
              success: true,
              data: {
                script: result.content[0]?.text,
                source: 'mcp',
                metadata: result.metadata,
              },
            }
          } catch (mcpError) {
            // MCP not available, fall back to local generation
            console.log('[Skill] MCP not available, using local generation')
          }
        }

        // Local fallback
        return {
          success: true,
          data: {
            script: `[Generated script for: ${params.concept}]\n\nFADE IN:\n\n[Local generation fallback]`,
            source: 'local',
          },
        }
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Script generation failed',
        }
      }
    },
    metadata: { category: 'film', tags: ['script', 'mcp', 'external'], icon: '🎬' },
  },

  {
    name: 'research-with-mcp',
    description: 'Research topics using MCP-connected knowledge bases and search services.',
    parameters: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Research query',
        },
        sources: {
          type: 'array',
          description: 'Specific MCP sources to query (optional)',
        },
      },
      required: ['query'],
    },
    handler: async (params, context) => {
      try {
        const results: Array<{ source: string; content: unknown }> = []

        // Try MCP research tools if available
        if (context.agent?.executeMCPTool) {
          const mcpTools = ['web-search', 'knowledge-base', 'document-search']
          
          for (const toolName of mcpTools) {
            try {
              const result = await context.agent.executeMCPTool(toolName, {
                query: params.query,
              })
              results.push({
                source: toolName,
                content: result.content,
              })
            } catch {
              // Tool not available, skip
            }
          }
        }

        // Try MCP resources if available
        if (context.agent?.readMCPResource) {
          try {
            const resource = await context.agent.readMCPResource('research-db://facts')
            results.push({
              source: 'research-db',
              content: resource.text,
            })
          } catch {
            // Resource not available
          }
        }

        return {
          success: true,
          data: {
            query: params.query,
            results,
            count: results.length,
          },
        }
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Research failed',
        }
      }
    },
    metadata: { category: 'film', tags: ['research', 'mcp', 'knowledge'], icon: '🔍' },
  },

  {
    name: 'generate-visuals-with-mcp',
    description: 'Generate visual content using MCP-connected image/video generation services.',
    parameters: {
      type: 'object',
      properties: {
        description: {
          type: 'string',
          description: 'Visual description',
        },
        type: {
          type: 'string',
          description: 'Type of visual',
          enum: ['image', 'video', 'storyboard'],
          default: 'image',
        },
      },
      required: ['description'],
    },
    handler: async (params, context) => {
      try {
        // Map type to MCP tool
        const toolMap: Record<string, string> = {
          image: 'image-generator',
          video: 'video-generator',
          storyboard: 'storyboard-generator',
        }

        const toolName = toolMap[params.type as string]

        if (context.agent?.executeMCPTool) {
          try {
            const result = await context.agent.executeMCPTool(toolName, {
              prompt: params.description,
            })

            return {
              success: true,
              data: {
                type: params.type,
                content: result.content,
                source: 'mcp',
              },
            }
          } catch (mcpError) {
            console.log(`[Skill] MCP ${toolName} not available, using fallback`)
          }
        }

        // Fallback
        return {
          success: true,
          data: {
            type: params.type,
            description: params.description,
            note: 'MCP service not available - would generate here',
            source: 'fallback',
          },
        }
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Visual generation failed',
        }
      }
    },
    metadata: { category: 'film', tags: ['visual', 'mcp', 'generation'], icon: '📸' },
  },
]

// Export all MCP-enhanced skills
export default filmSkillsWithMCP
