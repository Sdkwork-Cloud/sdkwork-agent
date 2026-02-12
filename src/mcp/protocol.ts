/**
 * MCP (Model Context Protocol) Implementation
 * https://modelcontextprotocol.io
 */

import { z } from 'zod';

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
  inputSchema?: z.ZodType<unknown>;
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

interface MCPValidationError {
  field: string;
  message: string;
  value?: unknown;
}

interface MCPValidationResult {
  valid: boolean;
  errors: MCPValidationError[];
  data?: Record<string, unknown>;
}

function validateInput(
  schema: z.ZodType<unknown> | undefined,
  args: unknown
): MCPValidationResult {
  if (!schema) {
    return { valid: true, errors: [], data: args as Record<string, unknown> };
  }

  try {
    const result = schema.parse(args);
    return { valid: true, errors: [], data: result as Record<string, unknown> };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors: MCPValidationError[] = error.issues.map((err: z.ZodIssue) => ({
        field: err.path.join('.'),
        message: err.message,
      }));
      return { valid: false, errors };
    }
    return {
      valid: false,
      errors: [{ field: 'unknown', message: String(error) }],
    };
  }
}

function sanitizeInput(args: unknown): Record<string, unknown> {
  if (typeof args !== 'object' || args === null) {
    return {};
  }

  const sanitized: Record<string, unknown> = {};
  const MAX_STRING_LENGTH = 100000;
  const MAX_ARRAY_LENGTH = 10000;
  const MAX_OBJECT_DEPTH = 10;

  function sanitizeValue(value: unknown, depth: number): unknown {
    if (depth > MAX_OBJECT_DEPTH) {
      return '[MAX_DEPTH_EXCEEDED]';
    }

    if (typeof value === 'string') {
      if (value.length > MAX_STRING_LENGTH) {
        return value.slice(0, MAX_STRING_LENGTH) + '...[TRUNCATED]';
      }
      const dangerousPatterns = [
        /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
        /javascript:/gi,
        /on\w+\s*=/gi,
      ];
      let sanitized = value;
      for (const pattern of dangerousPatterns) {
        sanitized = sanitized.replace(pattern, '[BLOCKED]');
      }
      return sanitized;
    }

    if (Array.isArray(value)) {
      if (value.length > MAX_ARRAY_LENGTH) {
        return value.slice(0, MAX_ARRAY_LENGTH);
      }
      return value.map(v => sanitizeValue(v, depth + 1));
    }

    if (typeof value === 'object' && value !== null) {
      const obj: Record<string, unknown> = {};
      for (const [key, val] of Object.entries(value)) {
        if (!key.includes('__proto__') && !key.includes('prototype')) {
          obj[key] = sanitizeValue(val, depth + 1);
        }
      }
      return obj;
    }

    return value;
  }

  for (const [key, value] of Object.entries(args as Record<string, unknown>)) {
    if (!key.includes('__proto__') && !key.includes('prototype')) {
      sanitized[key] = sanitizeValue(value, 0);
    }
  }

  return sanitized;
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

    const capabilities = await response.json() as {
      resources?: Array<{ uri: string; [key: string]: unknown }>;
      tools?: Array<{ name: string; [key: string]: unknown }>;
    };

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
      inputSchema: tool.inputSchema as z.ZodType<unknown> | undefined,
      execute: async (args: Record<string, unknown>) => {
        const sanitizedArgs = sanitizeInput(args);
        
        const response = await fetch(
          `${this.config.url}/tools/${encodeURIComponent(tool.name as string)}`,
          {
            method: 'POST',
            headers,
            body: JSON.stringify(sanitizedArgs),
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

    const sanitizedArgs = sanitizeInput(args);

    const validation = validateInput(tool.inputSchema, sanitizedArgs);
    if (!validation.valid) {
      return {
        success: false,
        error: `Validation failed: ${validation.errors.map(e => `${e.field}: ${e.message}`).join(', ')}`,
      };
    }

    const context: ExecutionContext = {
      executionId: `mcp-${Date.now()}`,
      skillName: name,
      timestamp: new Date(),
    };

    return tool.execute(validation.data!, context);
  }
}
