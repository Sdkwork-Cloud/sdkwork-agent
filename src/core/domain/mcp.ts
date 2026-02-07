/**
 * MCP (Model Context Protocol) Domain Model
 * Following Anthropic's MCP specification
 * Reference: https://modelcontextprotocol.io
 */

import type { JSONSchema } from '../../types';

// ============================================================================
// MCP Core Types
// ============================================================================

export type MCPTransportType = 'stdio' | 'sse' | 'http' | 'websocket';

export interface MCPTransport {
  type: MCPTransportType;
  endpoint?: string;
  command?: string;
  args?: string[];
  env?: Record<string, string>;
  headers?: Record<string, string>;
}

export interface MCPServerConfig {
  id: string;
  name: string;
  transport: MCPTransport;
  timeout?: number;
  retry?: {
    maxAttempts: number;
    delay: number;
  };
}

// ============================================================================
// MCP Protocol Types
// ============================================================================

export type MCPRequestMethod =
  | 'initialize'
  | 'tools/list'
  | 'tools/call'
  | 'resources/list'
  | 'resources/read'
  | 'resources/subscribe'
  | 'resources/unsubscribe'
  | 'prompts/list'
  | 'prompts/get'
  | 'completion/complete'
  | 'logging/setLevel'
  | 'ping';

export interface MCPRequest {
  jsonrpc: '2.0';
  id: string | number;
  method: MCPRequestMethod;
  params?: unknown;
}

export interface MCPResponse {
  jsonrpc: '2.0';
  id: string | number;
  result?: unknown;
  error?: {
    code: number;
    message: string;
    data?: unknown;
  };
}

export interface MCPNotification {
  jsonrpc: '2.0';
  method: string;
  params?: unknown;
}

// ============================================================================
// MCP Capability Types
// ============================================================================

export interface MCPCapabilities {
  tools?: {
    listChanged?: boolean;
  };
  resources?: {
    subscribe?: boolean;
    listChanged?: boolean;
  };
  prompts?: {
    listChanged?: boolean;
  };
  logging?: {};
  completions?: {};
}

export interface MCPImplementation {
  name: string;
  version: string;
}

export interface MCPInitializeParams {
  protocolVersion: string;
  capabilities: MCPCapabilities;
  clientInfo: MCPImplementation;
}

export interface MCPInitializeResult {
  protocolVersion: string;
  capabilities: MCPCapabilities;
  serverInfo: MCPImplementation;
}

// ============================================================================
// MCP Tool Types
// ============================================================================

export interface MCPTool {
  name: string;
  description: string;
  inputSchema: JSONSchema;
}

export interface MCPToolList {
  tools: MCPTool[];
}

export interface MCPToolCallParams {
  name: string;
  arguments: Record<string, unknown>;
}

export interface MCPToolCallResult {
  content: MCPContentItem[];
  isError?: boolean;
}

export type MCPContentItem =
  | { type: 'text'; text: string }
  | { type: 'image'; data: string; mimeType: string }
  | { type: 'resource'; resource: MCPResourceContents };

// ============================================================================
// MCP Resource Types
// ============================================================================

export interface MCPResource {
  uri: string;
  name: string;
  description?: string;
  mimeType?: string;
}

export interface MCPResourceTemplate {
  uriTemplate: string;
  name: string;
  description?: string;
  mimeType?: string;
}

export interface MCPResourceList {
  resources: MCPResource[];
  resourceTemplates?: MCPResourceTemplate[];
}

export interface MCPResourceContents {
  uri: string;
  mimeType?: string;
  text?: string;
  blob?: string;
}

// ============================================================================
// MCP Prompt Types
// ============================================================================

export interface MCPPrompt {
  name: string;
  description?: string;
  arguments?: MCPPromptArgument[];
}

export interface MCPPromptArgument {
  name: string;
  description?: string;
  required?: boolean;
}

export interface MCPPromptList {
  prompts: MCPPrompt[];
}

export interface MCPPromptMessage {
  role: 'user' | 'assistant';
  content: MCPContentItem;
}

export interface MCPPromptGetResult {
  description?: string;
  messages: MCPPromptMessage[];
}

// ============================================================================
// MCP Client Domain Model
// ============================================================================

export interface MCPClient {
  readonly id: string;
  readonly config: MCPServerConfig;
  readonly isConnected: boolean;
  readonly capabilities: MCPCapabilities;
  readonly tools: MCPTool[];
  readonly resources: MCPResource[];
  readonly prompts: MCPPrompt[];

  connect(): Promise<void>;
  disconnect(): Promise<void>;

  listTools(): Promise<MCPTool[]>;
  callTool(name: string, args: Record<string, unknown>): Promise<MCPToolCallResult>;

  listResources(): Promise<MCPResource[]>;
  readResource(uri: string): Promise<MCPResourceContents>;
  subscribeResource(uri: string): Promise<void>;
  unsubscribeResource(uri: string): Promise<void>;

  listPrompts(): Promise<MCPPrompt[]>;
  getPrompt(name: string, args?: Record<string, string>): Promise<MCPPromptGetResult>;

  setLoggingLevel(level: 'debug' | 'info' | 'warning' | 'error'): Promise<void>;
  complete(params: {
    ref: { type: 'ref/prompt' | 'ref/resource'; name?: string; uri?: string };
    argument: { name: string; value: string };
  }): Promise<{ completion: { values: string[]; total: number; hasMore: boolean } }>;

  ping(): Promise<void>;
}

// ============================================================================
// MCP Client Events
// ============================================================================

export interface MCPClientEvents {
  'mcp:connected': { clientId: string; serverInfo: MCPImplementation };
  'mcp:disconnected': { clientId: string; reason?: string };
  'mcp:error': { clientId: string; error: Error };
  'mcp:tools:changed': { clientId: string; tools: MCPTool[] };
  'mcp:resources:changed': { clientId: string; resources: MCPResource[] };
  'mcp:resource:updated': { clientId: string; uri: string };
  'mcp:prompts:changed': { clientId: string; prompts: MCPPrompt[] };
  'mcp:notification': { clientId: string; notification: MCPNotification };
  'mcp:message': { clientId: string; message: MCPRequest | MCPResponse | MCPNotification };
}

// ============================================================================
// MCP Registry
// ============================================================================

export interface MCPRegistry {
  register(config: MCPServerConfig): void;
  unregister(serverId: string): void;
  get(serverId: string): MCPServerConfig | undefined;
  list(): MCPServerConfig[];
  clear(): void;
}

// ============================================================================
// MCP Manager
// ============================================================================

export interface MCPManager {
  readonly clients: Map<string, MCPClient>;

  connect(serverId: string): Promise<MCPClient>;
  disconnect(serverId: string): Promise<void>;
  disconnectAll(): Promise<void>;

  getClient(serverId: string): MCPClient | undefined;
  listConnected(): MCPClient[];

  callTool(serverId: string, toolName: string, args: Record<string, unknown>): Promise<MCPToolCallResult>;
  callToolAll(toolName: string, args: Record<string, unknown>): Promise<Map<string, MCPToolCallResult>>;

  aggregateTools(): MCPTool[];
  aggregateResources(): MCPResource[];
  aggregatePrompts(): MCPPrompt[];
}

// ============================================================================
// MCP Execution Context
// ============================================================================

export interface MCPExecutionContext {
  serverId: string;
  toolName: string;
  arguments: Record<string, unknown>;
  timeout?: number;
  abortSignal?: AbortSignal;
}

export interface MCPExecutionResult {
  success: boolean;
  data?: MCPToolCallResult;
  error?: Error;
  duration: number;
  serverId: string;
}
