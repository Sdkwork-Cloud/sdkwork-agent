/**
 * MCP Client Implementation
 * Full implementation of Model Context Protocol client
 * Supports stdio, SSE, HTTP, WebSocket transports
 */

import { EventEmitter } from '../../utils/event-emitter.js';
import { Logger, createLogger } from '../../utils/logger.js';

// Node.js specific imports - only available in Node environment
let spawn: typeof import('child_process')['spawn'] | undefined;
let processEnv: NodeJS.ProcessEnv | undefined;

if (typeof window === 'undefined') {
  // Node.js environment
  try {
    const childProcess = require('child_process');
    spawn = childProcess.spawn;
    processEnv = process.env;
  } catch {
    // Ignore
  }
}
import {
  MCPClient,
  MCPServerConfig,
  MCPTransport,
  MCPRequest,
  MCPResponse,
  MCPNotification,
  MCPRequestMethod,
  MCPInitializeParams,
  MCPInitializeResult,
  MCPCapabilities,
  MCPImplementation,
  MCPTool,
  MCPToolList,
  MCPToolCallParams,
  MCPToolCallResult,
  MCPResource,
  MCPResourceList,
  MCPResourceContents,
  MCPPrompt,
  MCPPromptList,
  MCPPromptGetResult,
  MCPRegistry,
  MCPManager,
} from '../domain/mcp';

// ============================================================================
// Transport Implementations
// ============================================================================

interface MCPTransportHandler {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  send(message: MCPRequest): Promise<void>;
  onMessage(callback: (message: MCPResponse | MCPNotification) => void): void;
  onError(callback: (error: Error) => void): void;
  onClose(callback: () => void): void;
}

class StdioTransport implements MCPTransportHandler {
  private _process: import('child_process').ChildProcess | null = null;
  private _messageCallback: ((message: MCPResponse | MCPNotification) => void) | null = null;
  private _errorCallback: ((error: Error) => void) | null = null;
  private _closeCallback: (() => void) | null = null;
  private _buffer = '';
  private _logger: Logger;

  constructor(private _config: MCPTransport) {
    this._logger = createLogger({ name: 'MCPClient' });
  }

  async connect(): Promise<void> {
    // Check if we're in Node.js environment
    if (typeof window !== 'undefined' || !spawn) {
      throw new Error('Stdio transport is only available in Node.js environment');
    }

    return new Promise((resolve, reject) => {
      if (!this._config.command) {
        reject(new Error('Command is required for stdio transport'));
        return;
      }

      this._process = spawn!(this._config.command, this._config.args || [], {
        env: { ...processEnv, ...this._config.env },
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      this._process.stdout?.on('data', (data: Buffer) => {
        this._buffer += data.toString();
        this._processBuffer();
      });

      this._process.stderr?.on('data', (data: Buffer) => {
        this._logger.error('MCP Server stderr', { data: data.toString() });
      });

      this._process.on('error', (error: Error) => {
        this._errorCallback?.(error);
        reject(error);
      });

      this._process.on('close', (code: number | null) => {
        this._closeCallback?.();
        if (code !== 0 && code !== null) {
          this._errorCallback?.(new Error(`Process exited with code ${code}`));
        }
      });

      // Give it a moment to start
      setTimeout(resolve, 100);
    });
  }

  async disconnect(): Promise<void> {
    if (this._process) {
      this._process.kill();
      this._process = null;
    }
  }

  async send(message: MCPRequest): Promise<void> {
    if (!this._process?.stdin) {
      throw new Error('Not connected');
    }
    const json = JSON.stringify(message);
    this._process.stdin.write(json + '\n');
  }

  onMessage(callback: (message: MCPResponse | MCPNotification) => void): void {
    this._messageCallback = callback;
  }

  onError(callback: (error: Error) => void): void {
    this._errorCallback = callback;
  }

  onClose(callback: () => void): void {
    this._closeCallback = callback;
  }

  private _processBuffer(): void {
    const lines = this._buffer.split('\n');
    this._buffer = lines.pop() || '';

    for (const line of lines) {
      if (line.trim()) {
        try {
          const message = JSON.parse(line) as MCPResponse | MCPNotification;
          this._messageCallback?.(message);
        } catch (error) {
          console.error('Failed to parse MCP message:', line);
        }
      }
    }
  }
}

class SSETransport implements MCPTransportHandler {
  private _eventSource: EventSource | null = null;
  private _endpoint: string;
  private _messageCallback: ((message: MCPResponse | MCPNotification) => void) | null = null;
  private _errorCallback: ((error: Error) => void) | null = null;

  constructor(private _config: MCPTransport) {
    this._endpoint = _config.endpoint || '';
  }

  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this._endpoint) {
        reject(new Error('Endpoint is required for SSE transport'));
        return;
      }

      this._eventSource = new EventSource(this._endpoint);

      this._eventSource.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data) as MCPResponse | MCPNotification;
          this._messageCallback?.(message);
        } catch (error) {
          console.error('Failed to parse SSE message:', event.data);
        }
      };

      this._eventSource.onerror = (_error) => {
        this._errorCallback?.(new Error('SSE connection error'));
      };

      this._eventSource.onopen = () => {
        resolve();
      };
    });
  }

  async disconnect(): Promise<void> {
    this._eventSource?.close();
    this._eventSource = null;
  }

  async send(message: MCPRequest): Promise<void> {
    const response = await fetch(this._endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...this._config.headers,
      },
      body: JSON.stringify(message),
    });

    if (!response.ok) {
      throw new Error(`HTTP error: ${response.status}`);
    }
  }

  onMessage(callback: (message: MCPResponse | MCPNotification) => void): void {
    this._messageCallback = callback;
  }

  onError(callback: (error: Error) => void): void {
    this._errorCallback = callback;
  }

  onClose(_callback: () => void): void {
    // SSE transport doesn't use close callback
  }
}

class HTTPTransport implements MCPTransportHandler {
  private _endpoint: string;
  private _messageCallback: ((message: MCPResponse | MCPNotification) => void) | null = null;

  constructor(private _config: MCPTransport) {
    this._endpoint = _config.endpoint || '';
  }

  async connect(): Promise<void> {
    if (!this._endpoint) {
      throw new Error('Endpoint is required for HTTP transport');
    }
    // HTTP is stateless, no persistent connection needed
  }

  async disconnect(): Promise<void> {
    // HTTP is stateless
  }

  async send(message: MCPRequest): Promise<void> {
    const response = await fetch(this._endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...this._config.headers,
      },
      body: JSON.stringify(message),
    });

    if (!response.ok) {
      throw new Error(`HTTP error: ${response.status}`);
    }

    const data = await response.json() as MCPResponse | MCPNotification;
    this._messageCallback?.(data);
  }

  onMessage(callback: (message: MCPResponse | MCPNotification) => void): void {
    this._messageCallback = callback;
  }

  onError(_callback: (error: Error) => void): void {
    // HTTP transport doesn't use error callback
  }

  onClose(_callback: () => void): void {
    // HTTP transport doesn't use close callback
  }
}

// ============================================================================
// MCP Client Implementation
// ============================================================================

export class MCPClientImpl extends EventEmitter implements MCPClient {
  private _transport: MCPTransportHandler | null = null;
  private _isConnected = false;
  private _capabilities: MCPCapabilities = {};
  private _tools: MCPTool[] = [];
  private _resources: MCPResource[] = [];
  private _prompts: MCPPrompt[] = [];
  private _pendingRequests = new Map<string | number, { resolve: (value: unknown) => void; reject: (error: Error) => void }>();
  private _requestId = 0;

  constructor(private _config: MCPServerConfig) {
    super();
  }

  get id(): string {
    return this._config.id;
  }

  get config(): MCPServerConfig {
    return this._config;
  }

  get isConnected(): boolean {
    return this._isConnected;
  }

  get capabilities(): MCPCapabilities {
    return this._capabilities;
  }

  get tools(): MCPTool[] {
    return [...this._tools];
  }

  get resources(): MCPResource[] {
    return [...this._resources];
  }

  get prompts(): MCPPrompt[] {
    return [...this._prompts];
  }

  async connect(): Promise<void> {
    if (this._isConnected) {
      return;
    }

    // Create transport
    this._transport = this._createTransport(this._config.transport);

    // Set up handlers
    this._transport.onMessage((message) => this._handleMessage(message));
    this._transport.onError((error) => this._handleError(error));
    this._transport.onClose(() => this._handleClose());

    // Connect transport
    await this._transport.connect();

    // Initialize MCP protocol
    await this._initialize();

    this._isConnected = true;

    // Fetch initial data
    await this._fetchCapabilities();

    this.emit('mcp:connected', {
      clientId: this._config.id,
      serverInfo: { name: 'MCP Server', version: 'unknown' },
    });
  }

  async disconnect(): Promise<void> {
    if (!this._isConnected) {
      return;
    }

    await this._transport?.disconnect();
    this._isConnected = false;
    this._transport = null;

    // Reject all pending requests
    for (const [, { reject }] of this._pendingRequests) {
      reject(new Error('Connection closed'));
    }
    this._pendingRequests.clear();

    this.emit('mcp:disconnected', { clientId: this._config.id });
  }

  async listTools(): Promise<MCPTool[]> {
    const response = await this._request<MCPToolList>('tools/list', {});
    this._tools = response.tools;
    return this._tools;
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<MCPToolCallResult> {
    return await this._request<MCPToolCallResult>('tools/call', {
      name,
      arguments: args,
    } as MCPToolCallParams);
  }

  async listResources(): Promise<MCPResource[]> {
    const response = await this._request<MCPResourceList>('resources/list', {});
    this._resources = response.resources;
    return this._resources;
  }

  async readResource(uri: string): Promise<MCPResourceContents> {
    return await this._request<MCPResourceContents>('resources/read', { uri });
  }

  async subscribeResource(uri: string): Promise<void> {
    await this._request<void>('resources/subscribe', { uri });
  }

  async unsubscribeResource(uri: string): Promise<void> {
    await this._request<void>('resources/unsubscribe', { uri });
  }

  async listPrompts(): Promise<MCPPrompt[]> {
    const response = await this._request<MCPPromptList>('prompts/list', {});
    this._prompts = response.prompts;
    return this._prompts;
  }

  async getPrompt(name: string, args?: Record<string, string>): Promise<MCPPromptGetResult> {
    return await this._request<MCPPromptGetResult>('prompts/get', { name, arguments: args });
  }

  async setLoggingLevel(level: 'debug' | 'info' | 'warning' | 'error'): Promise<void> {
    await this._request<void>('logging/setLevel', { level });
  }

  async complete(params: {
    ref: { type: 'ref/prompt' | 'ref/resource'; name?: string; uri?: string };
    argument: { name: string; value: string };
  }): Promise<{ completion: { values: string[]; total: number; hasMore: boolean } }> {
    return await this._request('completion/complete', params);
  }

  async ping(): Promise<void> {
    await this._request<void>('ping', {});
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  private _createTransport(transportConfig: MCPTransport): MCPTransportHandler {
    switch (transportConfig.type) {
      case 'stdio':
        return new StdioTransport(transportConfig);
      case 'sse':
        return new SSETransport(transportConfig);
      case 'http':
        return new HTTPTransport(transportConfig);
      default:
        throw new Error(`Unsupported transport type: ${transportConfig.type}`);
    }
  }

  private async _initialize(): Promise<void> {
    const clientInfo: MCPImplementation = {
      name: 'SDKWork Browser Agent',
      version: '1.0.0',
    };

    const params: MCPInitializeParams = {
      protocolVersion: '2024-11-05',
      capabilities: {
        tools: { listChanged: true },
        resources: { subscribe: true, listChanged: true },
        prompts: { listChanged: true },
        logging: {},
        completions: {},
      },
      clientInfo,
    };

    const result = await this._request<MCPInitializeResult>('initialize', params);
    this._capabilities = result.capabilities;
  }

  private async _fetchCapabilities(): Promise<void> {
    const promises: Promise<unknown>[] = [];

    if (this._capabilities.tools) {
      promises.push(this.listTools());
    }

    if (this._capabilities.resources) {
      promises.push(this.listResources());
    }

    if (this._capabilities.prompts) {
      promises.push(this.listPrompts());
    }

    await Promise.all(promises);
  }

  private _request<T>(method: MCPRequestMethod, params: unknown): Promise<T> {
    return new Promise((resolve, reject) => {
      if (!this._transport) {
        reject(new Error('Not connected'));
        return;
      }

      const id = ++this._requestId;
      const request: MCPRequest = {
        jsonrpc: '2.0',
        id,
        method,
        params,
      };

      const timeout = this._config.timeout || 30000;
      const timeoutId = setTimeout(() => {
        this._pendingRequests.delete(id);
        reject(new Error(`Request timeout after ${timeout}ms`));
      }, timeout);

      this._pendingRequests.set(id, {
        resolve: (value: unknown) => {
          clearTimeout(timeoutId);
          resolve(value as T);
        },
        reject: (error: Error) => {
          clearTimeout(timeoutId);
          reject(error);
        },
      });

      this._transport.send(request).catch((error) => {
        clearTimeout(timeoutId);
        this._pendingRequests.delete(id);
        reject(error);
      });
    });
  }

  private _handleMessage(message: MCPResponse | MCPNotification): void {
    this.emit('mcp:message', { clientId: this._config.id, message });

    // Handle response
    if ('id' in message && message.id !== undefined) {
      const pending = this._pendingRequests.get(message.id);
      if (pending) {
        this._pendingRequests.delete(message.id);
        if (message.error) {
          pending.reject(new Error(message.error.message));
        } else {
          pending.resolve(message.result);
        }
      }
    }

    // Handle notification
    if (!('id' in message) || message.id === undefined) {
      this._handleNotification(message as MCPNotification);
    }
  }

  private _handleNotification(notification: MCPNotification): void {
    this.emit('mcp:notification', { clientId: this._config.id, notification });

    switch (notification.method) {
      case 'notifications/tools/list_changed':
        this.listTools().then((tools) => {
          this.emit('mcp:tools:changed', { clientId: this._config.id, tools });
        });
        break;

      case 'notifications/resources/list_changed':
        this.listResources().then((resources) => {
          this.emit('mcp:resources:changed', { clientId: this._config.id, resources });
        });
        break;

      case 'notifications/resources/updated':
        if (notification.params && typeof notification.params === 'object' && 'uri' in notification.params) {
          this.emit('mcp:resource:updated', {
            clientId: this._config.id,
            uri: String(notification.params.uri),
          });
        }
        break;

      case 'notifications/prompts/list_changed':
        this.listPrompts().then((prompts) => {
          this.emit('mcp:prompts:changed', { clientId: this._config.id, prompts });
        });
        break;
    }
  }

  private _handleError(error: Error): void {
    this.emit('mcp:error', { clientId: this._config.id, error });
  }

  private _handleClose(): void {
    this._isConnected = false;
    this.emit('mcp:disconnected', { clientId: this._config.id, reason: 'Transport closed' });
  }
}

// ============================================================================
// MCP Registry Implementation
// ============================================================================

export class MCPRegistryImpl implements MCPRegistry {
  private _servers = new Map<string, MCPServerConfig>();

  register(config: MCPServerConfig): void {
    this._servers.set(config.id, config);
  }

  unregister(serverId: string): void {
    this._servers.delete(serverId);
  }

  get(serverId: string): MCPServerConfig | undefined {
    return this._servers.get(serverId);
  }

  list(): MCPServerConfig[] {
    return Array.from(this._servers.values());
  }

  clear(): void {
    this._servers.clear();
  }
}

// ============================================================================
// MCP Manager Implementation
// ============================================================================

export class MCPManagerImpl extends EventEmitter implements MCPManager {
  private _clients = new Map<string, MCPClient>();
  private _registry: MCPRegistry;

  constructor(registry?: MCPRegistry) {
    super();
    this._registry = registry || new MCPRegistryImpl();
  }

  get clients(): Map<string, MCPClient> {
    return new Map(this._clients);
  }

  async connect(serverId: string): Promise<MCPClient> {
    const config = this._registry.get(serverId);
    if (!config) {
      throw new Error(`MCP server config not found: ${serverId}`);
    }

    const client = new MCPClientImpl(config);

    // Forward all events
    client.on('mcp:connected', (event) => this.emit('mcp:connected', event));
    client.on('mcp:disconnected', (event) => this.emit('mcp:disconnected', event));
    client.on('mcp:error', (event) => this.emit('mcp:error', event));
    client.on('mcp:tools:changed', (event) => this.emit('mcp:tools:changed', event));
    client.on('mcp:resources:changed', (event) => this.emit('mcp:resources:changed', event));
    client.on('mcp:resource:updated', (event) => this.emit('mcp:resource:updated', event));
    client.on('mcp:prompts:changed', (event) => this.emit('mcp:prompts:changed', event));

    await client.connect();
    this._clients.set(serverId, client);

    return client;
  }

  async disconnect(serverId: string): Promise<void> {
    const client = this._clients.get(serverId);
    if (client) {
      await client.disconnect();
      this._clients.delete(serverId);
    }
  }

  async disconnectAll(): Promise<void> {
    const promises = Array.from(this._clients.values()).map((client) => client.disconnect());
    await Promise.all(promises);
    this._clients.clear();
  }

  getClient(serverId: string): MCPClient | undefined {
    return this._clients.get(serverId);
  }

  listConnected(): MCPClient[] {
    return Array.from(this._clients.values());
  }

  async callTool(serverId: string, toolName: string, args: Record<string, unknown>): Promise<MCPToolCallResult> {
    const client = this._clients.get(serverId);
    if (!client) {
      throw new Error(`MCP client not connected: ${serverId}`);
    }
    return await client.callTool(toolName, args);
  }

  async callToolAll(toolName: string, args: Record<string, unknown>): Promise<Map<string, MCPToolCallResult>> {
    const results = new Map<string, MCPToolCallResult>();
    const promises: Promise<void>[] = [];

    for (const [serverId, client] of this._clients) {
      const promise = client.callTool(toolName, args)
        .then((result) => { results.set(serverId, result); })
        .catch((error) => {
          results.set(serverId, {
            content: [{ type: 'text', text: `Error: ${error.message}` }],
            isError: true,
          });
        });
      promises.push(promise);
    }

    await Promise.all(promises);
    return results;
  }

  aggregateTools(): MCPTool[] {
    const allTools: MCPTool[] = [];
    for (const client of this._clients.values()) {
      allTools.push(...client.tools);
    }
    return allTools;
  }

  aggregateResources(): MCPResource[] {
    const allResources: MCPResource[] = [];
    for (const client of this._clients.values()) {
      allResources.push(...client.resources);
    }
    return allResources;
  }

  aggregatePrompts(): MCPPrompt[] {
    const allPrompts: MCPPrompt[] = [];
    for (const client of this._clients.values()) {
      allPrompts.push(...client.prompts);
    }
    return allPrompts;
  }
}
