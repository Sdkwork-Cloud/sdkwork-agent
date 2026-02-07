/**
 * MCP (Model Context Protocol) Implementation
 * https://modelcontextprotocol.io
 */

// Define local types for MCP protocol
interface MCPResource {
  uri: string;
  name: string;
  description?: string;
  mimeType?: string;
  read: () => Promise<MCPResourceContent>;
}

interface MCPResourceContent {
  uri: string;
  mimeType?: string;
  text?: string;
  blob?: string;
}

interface MCPTool {
  name: string;
  description?: string;
  inputSchema?: unknown;
  execute: (args: Record<string, unknown>, context?: ExecutionContext) => Promise<MCPToolResult>;
}

interface MCPToolResult {
  success: boolean;
  data?: unknown;
  error?: string;
}

interface ExecutionContext {
  executionId: string;
  agentId?: string;
  sessionId?: string;
  skillName?: string;
  timestamp?: Date;
  metadata?: Record<string, unknown>;
}

// MCP Server Configuration
export interface MCPServerConfig {
  name: string;
  version: string;
  resources?: MCPResource[];
  tools?: MCPTool[];
}

// MCP Client for connecting to external MCP servers
export interface MCPClientConfig {
  url: string;
  auth?: {
    type: 'bearer' | 'apiKey';
    token: string;
  };
}

export class MCPClient {
  private resources = new Map<string, MCPResource>();
  private tools = new Map<string, MCPTool>();

  constructor(private config: MCPClientConfig) {}

  async connect(): Promise<void> {
    // Fetch server capabilities
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (this.config.auth?.type === 'bearer') {
      headers['Authorization'] = `Bearer ${this.config.auth.token}`;
    } else if (this.config.auth?.type === 'apiKey') {
      headers['X-API-Key'] = this.config.auth.token;
    }

    const response = await fetch(`${this.config.url}/capabilities`, { headers });

    if (!response.ok) {
      throw new Error(`Failed to connect to MCP server: ${response.status}`);
    }

    const capabilities = await response.json();

    // Register remote resources
    for (const resource of capabilities.resources || []) {
      this.resources.set(resource.uri, this.createRemoteResource(resource, headers));
    }

    // Register remote tools
    for (const tool of capabilities.tools || []) {
      this.tools.set(tool.name, this.createRemoteTool(tool, headers));
    }
  }

  private createRemoteResource(
    resource: Record<string, unknown>,
    headers: Record<string, string>
  ): MCPResource {
    return {
      uri: resource.uri as string,
      name: resource.name as string,
      description: resource.description as string,
      mimeType: resource.mimeType as string,
      read: async () => {
        const response = await fetch(
          `${this.config.url}/resources/${encodeURIComponent(resource.uri as string)}`,
          {
            headers,
          }
        );

        if (!response.ok) {
          throw new Error(`Failed to read resource: ${response.status}`);
        }

        const content = await response.json();
        return content as MCPResourceContent;
      },
    };
  }

  private createRemoteTool(
    tool: Record<string, unknown>,
    headers: Record<string, string>
  ): MCPTool {
    return {
      name: tool.name as string,
      description: tool.description as string,
      inputSchema: tool.inputSchema,
      execute: async (args: Record<string, unknown>) => {
        const response = await fetch(
          `${this.config.url}/tools/${encodeURIComponent(tool.name as string)}`,
          {
            method: 'POST',
            headers,
            body: JSON.stringify(args),
          }
        );

        if (!response.ok) {
          throw new Error(`Failed to execute tool: ${response.status}`);
        }

        const result = await response.json();
        return result as MCPToolResult;
      },
    };
  }

  getResources(): MCPResource[] {
    return Array.from(this.resources.values());
  }

  getTools(): MCPTool[] {
    return Array.from(this.tools.values());
  }

  getResource(uri: string): MCPResource | undefined {
    return this.resources.get(uri);
  }

  getTool(name: string): MCPTool | undefined {
    return this.tools.get(name);
  }
}

// MCP Server for exposing local resources and tools
export class MCPServer {
  private resources = new Map<string, MCPResource>();
  private tools = new Map<string, MCPTool>();

  constructor(private config: MCPServerConfig) {
    // Register initial resources and tools
    config.resources?.forEach(resource => this.registerResource(resource));
    config.tools?.forEach(tool => this.registerTool(tool));
  }

  registerResource(resource: MCPResource): void {
    this.resources.set(resource.uri, resource);
  }

  registerTool(tool: MCPTool): void {
    this.tools.set(tool.name, tool);
  }

  unregisterResource(uri: string): boolean {
    return this.resources.delete(uri);
  }

  unregisterTool(name: string): boolean {
    return this.tools.delete(name);
  }

  getCapabilities(): {
    name: string;
    version: string;
    resources: Array<{ uri: string; name: string; description?: string; mimeType?: string }>;
    tools: Array<{ name: string; description: string; inputSchema: unknown }>;
  } {
    return {
      name: this.config.name,
      version: this.config.version,
      resources: Array.from(this.resources.values()).map(r => ({
        uri: r.uri,
        name: r.name,
        description: r.description,
        mimeType: r.mimeType,
      })),
      tools: Array.from(this.tools.values()).map(t => ({
        name: t.name,
        description: t.description ?? '',
        inputSchema: t.inputSchema,
      })),
    };
  }

  async readResource(uri: string): Promise<MCPResourceContent | null> {
    const resource = this.resources.get(uri);
    if (!resource) return null;
    return resource.read();
  }

  async executeTool(name: string, args: unknown): Promise<MCPToolResult | null> {
    const tool = this.tools.get(name);
    if (!tool) return null;

    const context: ExecutionContext = {
      executionId: `mcp-${Date.now()}`,
      skillName: name,
      timestamp: new Date(),
    };

    return tool.execute(args as Record<string, unknown>, context);
  }
}
