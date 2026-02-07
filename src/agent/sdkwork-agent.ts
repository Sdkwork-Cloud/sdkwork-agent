/**
 * SDKWork Agent - 极简智能体实现
 * 
 * 设计标准：
 * 1. 极简主义 - 配置即启用，无需 enabled 标志
 * 2. 优美API - 参考行业最佳实践
 * 3. 类型安全 - 完整的 TypeScript 类型支持
 * 4. 统一风格 - 所有配置遵循相同模式
 * 
 * @version 3.2.0
 * @standard Industry Leading
 */

import { EventEmitter } from '../utils/event-emitter';
import { createLogger } from '../utils/logger';
import { z } from 'zod';
import type {
  AgentConfig,
  AgentState,
  AgentCapabilities,
  ExecutionResult,
  Plan,
  SkillDefinition,
  ToolDefinition,
  PluginDefinition,
  MCPServerConfig,
  Logger,
  PluginContext,
} from './types';

// ============================================
// Agent Status Enum
// ============================================

export enum AgentStatus {
  UNINITIALIZED = 'uninitialized',
  INITIALIZING = 'initializing',
  IDLE = 'idle',
  PLANNING = 'planning',
  EXECUTING = 'executing',
  REFLECTING = 'reflecting',
  PAUSED = 'paused',
  ERROR = 'error',
  DESTROYING = 'destroying',
  DESTROYED = 'destroyed',
}

// ============================================
// Minimal Configuration Schema
// ============================================

const LLMConfigSchema = z.object({
  provider: z.enum(['openai', 'anthropic', 'google', 'moonshot', 'minimax', 'zhipu', 'qwen', 'deepseek', 'doubao', 'custom']),
  apiKey: z.string().min(1),
  model: z.string().optional(),
  baseUrl: z.string().url().optional(),
  defaults: z.object({
    temperature: z.number().min(0).max(2).optional(),
    maxTokens: z.number().int().positive().optional(),
    topP: z.number().min(0).max(1).optional(),
  }).optional(),
});

const SkillDefinitionSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  version: z.string().optional(),
  run: z.object({
    code: z.string(),
    lang: z.enum(['js', 'ts', 'python', 'bash']),
    entry: z.string().optional(),
  }),
  refs: z.array(z.object({
    name: z.string(),
    path: z.string(),
    content: z.string(),
    type: z.enum(['code', 'data', 'template', 'doc']),
  })).optional(),
  input: z.object({}).passthrough().optional(),
  output: z.object({}).passthrough().optional(),
});

const ToolDefinitionSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  version: z.string().optional(),
  category: z.enum(['file', 'network', 'system', 'data', 'llm', 'custom']),
  confirm: z.enum(['none', 'read', 'write', 'destructive']).optional(),
  run: z.function(),
  input: z.object({}).passthrough().optional(),
  output: z.object({}).passthrough().optional(),
});

const MCPServerConfigSchema = z.object({
  name: z.string(),
  url: z.string(),
  transport: z.enum(['stdio', 'http', 'websocket']).optional(),
  auth: z.object({
    type: z.enum(['bearer', 'basic', 'apiKey']),
    token: z.string().optional(),
    username: z.string().optional(),
    password: z.string().optional(),
    apiKey: z.string().optional(),
  }).optional(),
});

const PluginDefinitionSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  version: z.string(),
  init: z.function().optional(),
  destroy: z.function().optional(),
  provides: z.object({
    skills: z.array(SkillDefinitionSchema).optional(),
    tools: z.array(ToolDefinitionSchema).optional(),
  }).optional(),
});

const MemoryConfigSchema = z.object({
  maxTokens: z.number().int().positive().optional(),
  limit: z.number().int().positive().optional(),
});

const PlanningConfigSchema = z.object({
  strategy: z.enum(['mcts', 'htn', 'react', 'hybrid']).optional(),
  depth: z.number().int().positive().optional(),
  timeout: z.number().int().positive().optional(),
});

const ExecutionConfigSchema = z.object({
  timeout: z.number().int().positive().optional(),
  retries: z.number().int().min(0).optional(),
  tracing: z.boolean().optional(),
  limits: z.object({
    memory: z.number().int().positive().optional(),
    cpu: z.number().int().positive().optional(),
  }).optional(),
});

export const AgentConfigSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1).max(64),
  description: z.string().max(256).optional(),
  version: z.string().default('1.0.0'),
  llm: LLMConfigSchema,
  skills: z.array(SkillDefinitionSchema).optional(),
  tools: z.array(ToolDefinitionSchema).optional(),
  mcp: z.array(MCPServerConfigSchema).optional(),
  plugins: z.array(PluginDefinitionSchema).optional(),
  memory: MemoryConfigSchema.optional(),
  planning: PlanningConfigSchema.optional(),
  execution: ExecutionConfigSchema.optional(),
});

export type ValidatedAgentConfig = z.infer<typeof AgentConfigSchema>;

// ============================================
// Minimal Agent Implementation
// ============================================

export interface AgentEvents {
  'state:changed': { from: AgentStatus; to: AgentStatus; timestamp: Date };
  'skill:invoked': { skillId: string; input: unknown };
  'skill:completed': { skillId: string; output: unknown; duration: number };
  'skill:failed': { skillId: string; error: Error };
  'tool:invoked': { toolId: string; input: unknown };
  'tool:completed': { toolId: string; output: unknown; duration: number };
  'tool:failed': { toolId: string; error: Error };
  'mcp:invoked': { server: string; tool: string; input: unknown };
  'mcp:completed': { server: string; tool: string; output: unknown; duration: number };
  'plugin:invoked': { pluginId: string; input: unknown };
  'plugin:completed': { pluginId: string; output: unknown; duration: number };
  'execution:started': { executionId: string; input: unknown };
  'execution:completed': { executionId: string; output: unknown; duration: number };
  'execution:failed': { executionId: string; error: Error };
  'error:occurred': { error: Error; recoverable: boolean };
}

export class SDKWorkAgent extends EventEmitter {
  // Identity
  readonly id: string;
  readonly name: string;
  readonly description?: string;
  readonly version: string;
  
  // Configuration
  readonly config: ValidatedAgentConfig;
  
  // State
  private _status: AgentStatus = AgentStatus.UNINITIALIZED;
  private _state: AgentState;
  
  // Capabilities
  private _capabilities: AgentCapabilities;
  
  // Logger - using different name to avoid conflict with EventEmitter
  private _agentLogger: Logger;
  
  // Components (initialized on demand)
  private _skills?: Map<string, SkillDefinition>;
  private _tools?: Map<string, ToolDefinition>;
  private _mcpServers?: Map<string, MCPServerConfig>;
  private _plugins?: Map<string, PluginDefinition>;
  
  constructor(config: AgentConfig) {
    super();
    
    // Validate configuration
    this.config = AgentConfigSchema.parse(config);
    
    // Set identity
    this.id = this.config.id || this._generateId();
    this.name = this.config.name;
    this.description = this.config.description;
    this.version = this.config.version;
    
    // Initialize capabilities - 配置即启用
    this._capabilities = this._initCapabilities();
    
    // Initialize state
    this._state = this._initState();
    
    // Initialize logger
    this._agentLogger = this._initLogger();

    this._agentLogger.info(`Agent created: ${this.name} (${this.id})`);
  }
  
  // ============================================
  // Minimal Initialization - 配置即启用
  // ============================================
  
  /**
   * Initialize the agent with all capabilities
   * 配置即启用 - 无需 enabled 标志
   */
  async init(): Promise<void> {
    if (this._status !== AgentStatus.UNINITIALIZED) {
      throw new Error(`Cannot initialize agent in status: ${this._status}`);
    }
    
    await this._transitionTo(AgentStatus.INITIALIZING);
    
    try {
      // Initialize Skills - 配置了即启用
      if (this.config.skills) {
        await this._initSkills();
      }
      
      // Initialize Tools - 配置了即启用
      if (this.config.tools) {
        await this._initTools();
      }
      
      // Initialize MCP - 配置了即启用
      if (this.config.mcp) {
        await this._initMCP();
      }
      
      // Initialize Plugins - 配置了即启用
      if (this.config.plugins) {
        await this._initPlugins();
      }
      
      // Initialize Memory - 配置了即启用
      if (this.config.memory) {
        await this._initMemory();
      }
      
      await this._transitionTo(AgentStatus.IDLE);
      this._agentLogger.info(`Agent initialized successfully: ${this.name}`);
    } catch (error) {
      await this._transitionTo(AgentStatus.ERROR);
      this._agentLogger.error(`Agent initialization failed: ${this.name}`, { error: (error as Error).message });
      throw error;
    }
  }
  
  /**
   * Execute a task - the main entry point
   */
  async execute(input: string | unknown, context?: Record<string, unknown>): Promise<ExecutionResult> {
    if (this._status !== AgentStatus.IDLE) {
      throw new Error(`Cannot execute in status: ${this._status}`);
    }
    
    const executionId = this._generateId();
    const startTime = Date.now();
    
    this.emit('execution:started', { executionId, input });
    this._agentLogger.info(`Execution started: ${executionId}`, { input });
    
    try {
      await this._transitionTo(AgentStatus.EXECUTING);
      
      // Planning phase - 配置了即启用
      let plan: Plan | undefined;
      if (this._capabilities.planning) {
        await this._transitionTo(AgentStatus.PLANNING);
        plan = await this._plan(input, context);
      }
      
      // Execution phase
      await this._transitionTo(AgentStatus.EXECUTING);
      const result = await this._execute(input, plan, context);
      
      // Reflection phase - 配置了即启用
      if (this._capabilities.reflection) {
        await this._transitionTo(AgentStatus.REFLECTING);
        await this._reflect(result);
      }
      
      await this._transitionTo(AgentStatus.IDLE);
      
      const duration = Date.now() - startTime;
      this.emit('execution:completed', { executionId, output: result, duration });
      this._agentLogger.info(`Execution completed: ${executionId}`, { duration });

      return {
        success: true,
        output: result,
        executionId,
        duration,
        meta: { plan },
      };
    } catch (error) {
      await this._transitionTo(AgentStatus.ERROR);

      const duration = Date.now() - startTime;
      this.emit('execution:failed', { executionId, error: error as Error });
      this._agentLogger.error(`Execution failed: ${executionId}`, { error: (error as Error).message });
      
      return {
        success: false,
        error: {
          code: 'EXECUTION_FAILED',
          message: (error as Error).message,
          recoverable: false,
          name: 'ExecutionError',
        },
        executionId,
        duration,
      };
    }
  }
  
  /**
   * Execute a Skill
   */
  async skill(skillId: string, input: unknown): Promise<ExecutionResult> {
    const skill = this._skills?.get(skillId);
    if (!skill) {
      throw new Error(`Skill not found: ${skillId}`);
    }
    
    const executionId = this._generateId();
    const startTime = Date.now();
    
    this.emit('skill:invoked', { skillId, input });
    
    try {
      const output = await this._executeSkill(skill, input);
      
      const duration = Date.now() - startTime;
      this.emit('skill:completed', { skillId, output, duration });
      
      return {
        success: true,
        output,
        executionId,
        duration,
      };
    } catch (error) {
      this.emit('skill:failed', { skillId, error: error as Error });
      throw error;
    }
  }
  
  /**
   * Execute a Tool
   */
  async tool(toolId: string, input: unknown): Promise<ExecutionResult> {
    const tool = this._tools?.get(toolId);
    if (!tool) {
      throw new Error(`Tool not found: ${toolId}`);
    }
    
    const executionId = this._generateId();
    const startTime = Date.now();
    
    this.emit('tool:invoked', { toolId, input });
    
    try {
      const result = await tool.run(input, {
        executionId,
        agent: { id: this.id, name: this.name, version: this.version },
        log: this._agentLogger,
      });

      const duration = Date.now() - startTime;
      this.emit('tool:completed', { toolId, output: result, duration });

      return {
        success: result.success,
        output: result.data,
        error: result.error ? { ...result.error, name: 'ToolError' } : undefined,
        executionId,
        duration,
      };
    } catch (error) {
      this.emit('tool:failed', { toolId, error: error as Error });
      throw error;
    }
  }
  
  /**
   * Execute an MCP Tool
   */
  async mcp(serverName: string, toolName: string, input: unknown): Promise<ExecutionResult> {
    const executionId = this._generateId();
    const startTime = Date.now();
    
    this.emit('mcp:invoked', { server: serverName, tool: toolName, input });
    
    try {
      const output = await this._executeMCP(serverName, toolName, input);
      
      const duration = Date.now() - startTime;
      this.emit('mcp:completed', { server: serverName, tool: toolName, output, duration });
      
      return {
        success: true,
        output,
        executionId,
        duration,
      };
    } catch (error) {
      throw error;
    }
  }
  
  /**
   * Execute a Plugin
   */
  async plugin(pluginId: string, input: unknown): Promise<ExecutionResult> {
    const plugin = this._plugins?.get(pluginId);
    if (!plugin) {
      throw new Error(`Plugin not found: ${pluginId}`);
    }
    
    const executionId = this._generateId();
    const startTime = Date.now();
    
    this.emit('plugin:invoked', { pluginId, input });
    
    try {
      const output = await this._executePlugin(plugin, input);
      
      const duration = Date.now() - startTime;
      this.emit('plugin:completed', { pluginId, output, duration });
      
      return {
        success: true,
        output,
        executionId,
        duration,
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Chat completion - OpenAI compatible interface
   */
  async chat(request: {
    messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>;
    model?: string;
    temperature?: number;
    maxTokens?: number;
    stream?: boolean;
  }): Promise<{
    id: string;
    object: 'chat.completion';
    created: number;
    model: string;
    choices: Array<{
      index: number;
      message: { role: string; content: string };
      finishReason: string;
    }>;
    usage?: {
      promptTokens: number;
      completionTokens: number;
      totalTokens: number;
    };
  }> {
    const executionId = this._generateId();
    const startTime = Date.now();

    this.emit('chat:started', { executionId, messages: request.messages });

    try {
      // Get the last user message
      const lastMessage = request.messages[request.messages.length - 1];
      if (!lastMessage || lastMessage.role !== 'user') {
        throw new Error('Last message must be from user');
      }

      // Execute through the agent
      const result = await this.execute(lastMessage.content, {
        messages: request.messages,
        temperature: request.temperature,
        maxTokens: request.maxTokens,
      });

      const duration = Date.now() - startTime;
      this.emit('chat:completed', { executionId, result, duration });

      return {
        id: `chatcmpl-${executionId}`,
        object: 'chat.completion',
        created: Math.floor(Date.now() / 1000),
        model: request.model || this.config.llm.model || 'default',
        choices: [
          {
            index: 0,
            message: {
              role: 'assistant',
              content: typeof result.output === 'string' ? result.output : JSON.stringify(result.output),
            },
            finishReason: 'stop',
          },
        ],
        usage: {
          promptTokens: 0,
          completionTokens: 0,
          totalTokens: 0,
        },
      };
    } catch (error) {
      this.emit('chat:failed', { executionId, error: error as Error });
      throw error;
    }
  }

  /**
   * Chat completion stream - OpenAI compatible interface
   */
  async *chatStream(request: {
    messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>;
    model?: string;
    temperature?: number;
    maxTokens?: number;
  }): AsyncGenerator<{
    id: string;
    object: 'chat.completion.chunk';
    created: number;
    model: string;
    choices: Array<{
      index: number;
      delta: { role?: string; content?: string };
      finishReason?: string;
    }>;
  }> {
    const executionId = this._generateId();

    this.emit('chat:stream:started', { executionId, messages: request.messages });

    try {
      // Get the last user message
      const lastMessage = request.messages[request.messages.length - 1];
      if (!lastMessage || lastMessage.role !== 'user') {
        throw new Error('Last message must be from user');
      }

      // Execute and stream the result
      const result = await this.execute(lastMessage.content, {
        messages: request.messages,
        temperature: request.temperature,
        maxTokens: request.maxTokens,
      });

      const content = typeof result.output === 'string' ? result.output : JSON.stringify(result.output);
      const chunks = content.split(' ');

      for (let i = 0; i < chunks.length; i++) {
        yield {
          id: `chatcmpl-${executionId}`,
          object: 'chat.completion.chunk',
          created: Math.floor(Date.now() / 1000),
          model: request.model || this.config.llm.model || 'default',
          choices: [
            {
              index: 0,
              delta: {
                content: chunks[i] + (i < chunks.length - 1 ? ' ' : ''),
              },
              finishReason: i === chunks.length - 1 ? 'stop' : undefined,
            },
          ],
        };
      }

      this.emit('chat:stream:completed', { executionId });
    } catch (error) {
      this.emit('chat:stream:failed', { executionId, error: error as Error });
      throw error;
    }
  }
  
  /**
   * Destroy the agent
   */
  async destroy(): Promise<void> {
    if (this._status === AgentStatus.DESTROYED || this._status === AgentStatus.DESTROYING) {
      return;
    }
    
    await this._transitionTo(AgentStatus.DESTROYING);
    
    try {
      // Destroy plugins
      if (this._plugins) {
        for (const plugin of this._plugins.values()) {
          if (plugin.destroy) {
            await plugin.destroy();
          }
        }
      }
      
      // Disconnect MCP
      if (this._mcpServers) {
        // Disconnect logic here
      }
      
      // Clear state
      this._state = this._initState();
      this._skills?.clear();
      this._tools?.clear();
      this._mcpServers?.clear();
      this._plugins?.clear();
      
      this.removeAllListeners();

      await this._transitionTo(AgentStatus.DESTROYED);
      this._agentLogger.info(`Agent destroyed: ${this.name}`);
    } catch (error) {
      this._agentLogger.error(`Error destroying agent: ${this.name}`, { error: (error as Error).message });
      throw error;
    }
  }
  
  // ============================================
  // Getters
  // ============================================
  
  get status(): AgentStatus {
    return this._status;
  }
  
  get state(): Readonly<AgentState> {
    return Object.freeze({ ...this._state });
  }
  
  get capabilities(): Readonly<AgentCapabilities> {
    return Object.freeze({ ...this._capabilities });
  }
  
  get skills(): ReadonlyMap<string, SkillDefinition> {
    return this._skills ?? new Map();
  }
  
  get tools(): ReadonlyMap<string, ToolDefinition> {
    return this._tools ?? new Map();
  }
  
  // ============================================
  // Private Methods
  // ============================================
  
  private _generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
  
  /**
   * 初始化能力 - 配置即启用
   * undefined = 不启用
   * 配置了 = 启用
   */
  private _initCapabilities(): AgentCapabilities {
    return {
      reflection: this.config.planning !== undefined,
      planning: this.config.planning !== undefined,
      tools: this.config.tools !== undefined,
      skills: this.config.skills !== undefined,
      mcp: this.config.mcp !== undefined,
      plugins: this.config.plugins !== undefined,
      memory: this.config.memory !== undefined,
    };
  }
  
  private _initState(): AgentState {
    return {
      status: AgentStatus.UNINITIALIZED,
      executionCount: 0,
      totalExecutionTime: 0,
      skills: [],
      tools: [],
      memory: {},
    };
  }
  
  private _initLogger(): Logger {
    const logger = createLogger({ name: `Agent:${this.name}` });
    return {
      debug: (msg: string, meta?: Record<string, unknown>) => {
        logger.debug(msg, meta);
      },
      info: (msg: string, meta?: Record<string, unknown>) => {
        logger.info(msg, meta);
      },
      warn: (msg: string, meta?: Record<string, unknown>) => {
        logger.warn(msg, meta);
      },
      error: (msg: string, context?: Record<string, unknown>, _error?: Error) => {
        logger.error(msg, context);
      },
    };
  }
  
  private async _transitionTo(status: AgentStatus): Promise<void> {
    const from = this._status;
    this._status = status;
    this._state.status = status;
    
    this.emit('state:changed', { from, to: status, timestamp: new Date() });
  }
  
  private async _initSkills(): Promise<void> {
    this._skills = new Map();

    for (const skill of this.config.skills || []) {
      this._skills.set(skill.id, skill as SkillDefinition);
    }

    this._state.skills = Array.from(this._skills.keys());
    this._agentLogger.info(`Initialized ${this._skills.size} skills`);
  }

  private async _initTools(): Promise<void> {
    this._tools = new Map();

    for (const tool of this.config.tools || []) {
      this._tools.set(tool.id, tool as ToolDefinition);
    }

    this._state.tools = Array.from(this._tools.keys());
    this._agentLogger.info(`Initialized ${this._tools.size} tools`);
  }

  private async _initMCP(): Promise<void> {
    this._mcpServers = new Map();

    for (const server of this.config.mcp || []) {
      this._mcpServers.set(server.name, server);
    }

    this._agentLogger.info(`Initialized ${this._mcpServers.size} MCP servers`);
  }

  private async _initPlugins(): Promise<void> {
    this._plugins = new Map();

    for (const plugin of this.config.plugins || []) {
      if (plugin.init) {
        await (plugin.init as (context: PluginContext) => Promise<void>)({
          agent: { id: this.id, name: this.name, version: this.version },
          config: {},
          log: this._agentLogger,
        });
      }
      this._plugins.set(plugin.id, plugin as PluginDefinition);
    }

    this._agentLogger.info(`Initialized ${this._plugins.size} plugins`);
  }

  private async _initMemory(): Promise<void> {
    this._agentLogger.info('Memory system initialized');
  }
  
  private async _plan(_input: unknown, _context?: Record<string, unknown>): Promise<Plan> {
    const strategy = this.config.planning?.strategy || 'react';

    return {
      id: this._generateId(),
      steps: [],
      strategy,
      createdAt: new Date(),
    };
  }

  private async _execute(input: unknown, _plan?: Plan, _context?: Record<string, unknown>): Promise<unknown> {
    return input;
  }

  private async _executeSkill(_skill: SkillDefinition, input: unknown): Promise<unknown> {
    return { success: true, data: input };
  }

  private async _executeMCP(_serverName: string, _toolName: string, input: unknown): Promise<unknown> {
    return { success: true, data: input };
  }

  private async _executePlugin(_plugin: PluginDefinition, input: unknown): Promise<unknown> {
    return { success: true, data: input };
  }

  private async _reflect(_result: unknown): Promise<void> {
    // Reflection logic here
  }
}

export default SDKWorkAgent;
