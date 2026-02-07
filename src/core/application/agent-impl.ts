/**
 * Agent Implementation - 智能体实现
 *
 * 基于微内核架构重构
 * 集成 Skill、Tool、MCP、Plugin 完整支持
 *
 * @application Agent
 * @version 5.0.0
 * @architecture Microkernel
 */

import { EventEmitter } from '../../utils/event-emitter';
import { Logger, createLogger } from '../../utils/logger';
import type {
  Agent,
  AgentConfig,
  AgentEvent,
  AgentEventType,
  ChatRequest,
  ChatResponse,
  ChatMessage,
  LLMConfig,
} from '../domain/agent';
import { createAgentId, createExecutionId } from '../domain/unified';
import type { AgentId } from '../domain/unified';
import { AgentState } from '../domain/agent';
import type { Skill, SkillExecutionContext, SkillResult } from '../domain/skill';
import type { Tool, ToolExecutionContext, ToolResult } from '../domain/tool';
import type { MCPServerConfig } from '../domain/mcp';
import type { PluginConfig } from '../domain/plugin';
import type { SessionId } from '../domain/agent';
import type { MemoryStore } from '../domain/memory';
import type { LLMProvider } from '../../llm/provider';
import type { ExecutionEngine } from './execution-engine';
import { OpenAIProvider } from '../../llm/providers/openai';
import { AnthropicProvider } from '../../llm/providers/anthropic';
import { GeminiProvider } from '../../llm/providers/gemini';
import { MoonshotProvider } from '../../llm/providers/moonshot';
import { MiniMaxProvider } from '../../llm/providers/minimax';
import { ZhipuProvider } from '../../llm/providers/zhipu';
import { QwenProvider } from '../../llm/providers/qwen';
import { DeepSeekProvider } from '../../llm/providers/deepseek';
import { DoubaoProvider } from '../../llm/providers/doubao';
import { SkillExecutorImpl } from './skill-executor';
import { ToolExecutorImpl } from './tool-executor';
import { MCPManagerImpl } from './mcp-client';
import { PluginManagerImpl, createPluginManager } from './plugin-manager';
import { Microkernel, createMicrokernel } from '../microkernel';
import { ExecutionEngineImpl } from './execution-engine';


// ============================================
// Microkernel-based Agent Implementation
// ============================================

export class AgentImpl extends EventEmitter implements Agent {
  // Identity
  readonly id: AgentId;
  readonly name: string;
  readonly description?: string;

  // State
  private _state: AgentState = AgentState.IDLE;

  // Microkernel - Core of the architecture
  private _kernel: Microkernel;

  // Domain Services (managed by kernel)
  private _llm!: LLMProvider;
  private _skills: Map<string, Skill> = new Map();
  private _tools: Map<string, Tool> = new Map();
  private _memory?: unknown;

  // Cached registry instances (lazy initialization)
  private _skillsRegistry?: import('../domain/skill').SkillRegistry;
  private _toolsRegistry?: import('../domain/tool').ToolRegistry;

  // Executors (managed by kernel)
  private _skillExecutor!: SkillExecutorImpl;
  private _toolExecutor!: ToolExecutorImpl;
  private _executionEngine?: ExecutionEngineImpl;

  // MCP Manager (managed by kernel)
  private _mcpManager!: MCPManagerImpl;

  // Plugin Manager (managed by kernel)
  private _pluginManager!: PluginManagerImpl;

  // Configuration
  private _config: AgentConfig;

  // Sessions
  private _sessions: Map<SessionId, ChatMessage[]> = new Map();
  private _currentSessionId?: SessionId;

  // Logger
  private agentLogger: Logger;

  constructor(config: AgentConfig) {
    super();

    // Store config
    this._config = config;

    // Set identity
    this.id = createAgentId(config.id || this._generateId());
    this.name = config.name;
    this.description = config.description;

    // Initialize Logger
    this.agentLogger = createLogger({ name: `Agent:${this.name}` });

    // Initialize Microkernel
    this._kernel = createMicrokernel({
      enableCircuitBreaker: true,
      serviceTimeout: 30000,
    });

    // Register services to kernel
    this._registerServices();

    // Subscribe to kernel events
    this._subscribeKernelEvents();

    // Initialize capabilities
    if (config.skills) {
      for (const skill of config.skills) {
        this._skills.set(skill.id, skill);
      }
    }

    if (config.tools) {
      for (const tool of config.tools) {
        this._tools.set(tool.id, tool);
      }
    }

    // Emit initialized event
    this._emitEvent('agent:initialized', {
      agentId: this.id,
      timestamp: Date.now(),
      capabilities: {
        skills: this._skills.size,
        tools: this._tools.size,
        memory: !!config.memory,
      },
    });
  }

  // ============================================
  // Microkernel Service Registration
  // ============================================

  private _registerServices(): void {
    // Register Memory Service (if configured)
    if (this._config.memory) {
      this._kernel.registerService({
        id: 'memory-service',
        version: '1.0.0',
        dependencies: [],
        initialize: async () => {
          // Initialize memory store
          const { createMemoryStore } = await import('./memory-store');
          this._memory = createMemoryStore(this._config.memory);
        },
        destroy: async () => {
          // Cleanup memory
          this._memory = undefined;
        },
      });
    }

    // Register LLM Service
    this._kernel.registerService({
      id: 'llm-service',
      version: '1.0.0',
      dependencies: [],
      initialize: async () => {
        this._llm = this._initLLM(this._config.llm);
      },
      destroy: async () => {
        // Cleanup LLM
      },
    });

    // Register Skill Executor Service
    this._kernel.registerService({
      id: 'skill-executor-service',
      version: '1.0.0',
      dependencies: ['llm-service', 'tool-executor-service'],
      initialize: async () => {
        this._skillExecutor = new SkillExecutorImpl({
          llm: this._llm,
          toolRegistry: this.tools,
          memory: this._memory as import('../domain/skill').SkillMemoryAPI,
        });
      },
      destroy: async () => {
        // Cleanup
      },
    });

    // Register Tool Executor Service
    this._kernel.registerService({
      id: 'tool-executor-service',
      version: '1.0.0',
      dependencies: ['llm-service'],
      initialize: async () => {
        this._toolExecutor = new ToolExecutorImpl({
          timeout: 30000,
        });
      },
      destroy: async () => {
        // Cleanup
      },
    });

    // Register MCP Manager Service
    this._kernel.registerService({
      id: 'mcp-manager-service',
      version: '1.0.0',
      dependencies: [],
      initialize: async () => {
        this._mcpManager = new MCPManagerImpl();

        // Initialize MCP servers
        if (this._config.mcp) {
          for (const mcpConfig of this._config.mcp) {
            this._mcpManager.connect(mcpConfig.id).catch((error) => {
              this.agentLogger.error(`Failed to connect to MCP server ${mcpConfig.id}`, { error });
            });
          }
        }
      },
      destroy: async () => {
        await this._mcpManager.disconnectAll();
      },
    });

    // Register Plugin Manager Service
    this._kernel.registerService({
      id: 'plugin-manager-service',
      version: '1.0.0',
      dependencies: ['llm-service'],
      initialize: async () => {
        this._pluginManager = createPluginManager();
        await this._pluginManager.initializeAll();
        await this._pluginManager.activateAll();
      },
      destroy: async () => {
        await this._pluginManager.destroyAll();
      },
      pause: async () => {
        // Pause all plugins
      },
      resume: async () => {
        // Resume all plugins
      },
    });
  }

  private _subscribeKernelEvents(): void {
    this._kernel.subscribeEvent('service:initialized', (event) => {
      this._emitEvent('execution:step', {
        step: 'service_initialized',
        data: event.data,
      });
    });

    this._kernel.subscribeEvent('service:error', (event) => {
      this._emitEvent('execution:failed', {
        error: event.data,
      });
    });
  }

  // ============================================
  // Getters
  // ============================================

  get state(): AgentState {
    return this._state;
  }

  get llm(): LLMProvider {
    return this._llm;
  }

  get skills(): import('../domain/skill').SkillRegistry {
    if (!this._skillsRegistry) {
      this._skillsRegistry = {
        register: (skill: Skill) => {
          this._skills.set(skill.id, skill);
        },
        unregister: (skillId: string) => {
          this._skills.delete(skillId);
        },
        get: (skillId: string) => this._skills.get(skillId),
        getByName: (name: string) => {
          for (const skill of this._skills.values()) {
            if (skill.name === name) return skill;
          }
          return undefined;
        },
        list: () => Array.from(this._skills.values()),
        search: (query: string) => {
          return Array.from(this._skills.values()).filter(
            (s) => s.name.includes(query) || s.description.includes(query)
          );
        },
        clear: () => this._skills.clear(),
      };
    }
    return this._skillsRegistry;
  }

  get tools(): import('../domain/tool').ToolRegistry {
    if (!this._toolsRegistry) {
      this._toolsRegistry = {
        register: (tool: Tool) => {
          this._tools.set(tool.id, tool);
        },
        unregister: (toolId: string) => {
          this._tools.delete(toolId);
        },
        get: (toolId: string) => this._tools.get(toolId),
        getByName: (name: string) => {
          for (const tool of this._tools.values()) {
            if (tool.name === name) return tool;
          }
          return undefined;
        },
        list: () => Array.from(this._tools.values()),
        listByCategory: (category) => {
          return Array.from(this._tools.values()).filter(
            (t) => t.category === category
          );
        },
        search: (query: string) => {
          return Array.from(this._tools.values()).filter(
            (t) => t.name.includes(query) || t.description.includes(query)
          );
        },
        clear: () => this._tools.clear(),
        execute: async (name: string, input: unknown, context: import('../domain/tool').ToolExecutionContext) => {
          const tool = this.tools.getByName(name);
          if (!tool) throw new Error(`Tool ${name} not found`);
          return tool.execute(input, context);
        },
      };
    }
    return this._toolsRegistry;
  }

  get memory(): MemoryStore {
    return this._memory as MemoryStore;
  }

  get execution(): ExecutionEngine {
    if (!this._executionEngine) {
      this._executionEngine = new ExecutionEngineImpl();
    }
    return this._executionEngine;
  }

  get kernel(): Microkernel {
    return this._kernel;
  }

  // ============================================
  // Lifecycle
  // ============================================

  async initialize(): Promise<void> {
    // 允许从 IDLE 或 ERROR 状态初始化
    if (this._state !== AgentState.IDLE && this._state !== AgentState.ERROR) {
      throw new Error(`Cannot initialize agent in state: ${this._state}`);
    }

    this._setState(AgentState.INITIALIZING);

    try {
      // Initialize all services via kernel
      await this._kernel.initializeAll();

      this._setState(AgentState.READY);

      this._emitEvent('agent:started', {
        agentId: this.id,
        timestamp: Date.now(),
        capabilities: {
          skills: this._skills.size,
          tools: this._tools.size,
          mcp: this._mcpManager?.clients?.size || 0,
          plugins: this._pluginManager?.plugins?.size || 0,
          memory: !!this._config.memory,
        },
      });
    } catch (error) {
      this._setState(AgentState.ERROR);
      this._emitEvent('agent:error', {
        agentId: this.id,
        timestamp: Date.now(),
        error: (error as Error).message,
        stack: (error as Error).stack,
      });
      throw error;
    }
  }

  /**
   * 重置 Agent 状态
   * 用于从 ERROR 状态恢复
   */
  async reset(): Promise<void> {
    if (this._state === AgentState.DESTROYED) {
      throw new Error('Cannot reset destroyed agent');
    }

    this.agentLogger.info('Resetting agent...', { agentId: this.id });

    // 清理执行引擎
    this._executionEngine = undefined;

    // 清理会话
    this._sessions.clear();

    // 重置状态
    this._setState(AgentState.IDLE);

    this._emitEvent('agent:reset', {
      agentId: this.id,
      timestamp: Date.now(),
    });

    // 重新初始化
    await this.initialize();
  }

  async destroy(): Promise<void> {
    this._setState(AgentState.DESTROYED);

    // Destroy all services via kernel
    await this._kernel.destroyAll();

    // Cleanup
    this._sessions.clear();
    this._skills.clear();
    this._tools.clear();

    this._emitEvent('agent:destroyed', {
      agentId: this.id,
      timestamp: Date.now(),
    });

    this.removeAllListeners();
  }

  // ============================================
  // Core Capability - OpenAI Compatible Chat
  // ============================================

  async chat(request: ChatRequest): Promise<ChatResponse> {
    this._ensureReady();

    const sessionId = request.sessionId || this._getOrCreateSessionId();
    const executionId = this._generateId();

    this._setState(AgentState.CHATTING);

    this._emitEvent('chat:started', {
      sessionId,
      executionId,
      messageCount: request.messages.length,
    });

    try {
      // Execute chat via LLM
      const response = await this._llm.complete({
        model: request.model || 'default',
        messages: request.messages.map((m) => ({
          role: m.role,
          content: typeof m.content === 'string' ? m.content : '',
          name: m.name,
          tool_calls: m.toolCalls,
          tool_call_id: m.toolCallId,
        })),
        temperature: request.temperature,
        max_tokens: request.maxTokens,
        stream: false,
      });

      // Store in session
      this._addToSession(sessionId, request.messages);

      this._setState(AgentState.READY);

      this._emitEvent('chat:completed', {
        sessionId,
        executionId,
        tokenUsage: response.usage,
      });

      return {
        id: executionId,
        object: 'chat.completion',
        created: Date.now(),
        model: response.model,
        choices: [
          {
            index: 0,
            message: {
              id: this._generateId(),
              role: 'assistant',
              content: response.content,
              toolCalls: response.tool_calls,
              timestamp: Date.now(),
            },
            finishReason: response.finish_reason,
          },
        ],
        usage: {
          promptTokens: response.usage?.prompt_tokens || 0,
          completionTokens: response.usage?.completion_tokens || 0,
          totalTokens: response.usage?.total_tokens || 0,
        },
      };
    } catch (error) {
      this._setState(AgentState.ERROR);

      this._emitEvent('chat:error', {
        sessionId,
        executionId,
        error: (error as Error).message,
      });

      throw error;
    }
  }

  async *chatStream(request: ChatRequest): AsyncGenerator<import('../domain/agent').ChatStreamChunk> {
    this._ensureReady();

    const sessionId = request.sessionId || this._getOrCreateSessionId();
    const executionId = this._generateId();

    this._setState(AgentState.CHATTING);

    this._emitEvent('chat:started', {
      sessionId,
      executionId,
      messageCount: request.messages.length,
    });

    try {
      const stream = this._llm.stream({
        model: request.model || 'default',
        messages: request.messages.map((m) => ({
          role: m.role,
          content: typeof m.content === 'string' ? m.content : '',
        })),
        temperature: request.temperature,
        max_tokens: request.maxTokens,
        stream: true,
      });

      for await (const chunk of stream) {
        yield {
          id: executionId,
          object: 'chat.completion.chunk',
          created: Date.now(),
          model: chunk.model,
          choices: [
            {
              index: 0,
              delta: {
                role: chunk.delta.role,
                content: chunk.delta.content,
                toolCalls: chunk.delta.tool_calls,
              },
              finishReason: chunk.finish_reason || null,
            },
          ],
        };
      }

      this._setState(AgentState.READY);

      this._emitEvent('chat:completed', {
        sessionId,
        executionId,
      });
    } catch (error) {
      this._setState(AgentState.ERROR);

      this._emitEvent('chat:error', {
        sessionId,
        executionId,
        error: (error as Error).message,
      });

      throw error;
    }
  }

  // ============================================
  // Skill Management
  // ============================================

  async executeSkill(skillId: string, input: string, context?: Partial<SkillExecutionContext>): Promise<SkillResult> {
    this._ensureReady();

    const skill = this._skills.get(skillId);
    if (!skill) {
      throw new Error(`Skill ${skillId} not found`);
    }

    const executionId = this._generateId();

    this._emitEvent('skill:invoking', {
      skillId,
      executionId,
      input,
    });

    try {
      const result = await this._skillExecutor.execute({
        skill,
        input,
        context: {
          agentId: createAgentId(this.id),
          sessionId: context?.sessionId || this._currentSessionId,
          parentExecutionId: createExecutionId(executionId),
        },
      });

      this._emitEvent('skill:completed', {
        skillId,
        executionId,
        success: result.success,
      });

      return result as SkillResult;
    } catch (error) {
      this._emitEvent('skill:failed', {
        skillId,
        executionId,
        error: (error as Error).message,
      });

      throw error;
    }
  }

  // ============================================
  // Tool Management
  // ============================================

  async executeTool(toolId: string, input: string, context?: Partial<ToolExecutionContext>): Promise<ToolResult> {
    this._ensureReady();

    const tool = this._tools.get(toolId);
    if (!tool) {
      throw new Error(`Tool ${toolId} not found`);
    }

    const executionId = this._generateId();

    this._emitEvent('tool:invoking', {
      toolId,
      executionId,
      input,
    });

    try {
      const result = await this._toolExecutor.execute(tool, input, {
        executionId,
        agentId: this.id,
        sessionId: context?.sessionId || this._currentSessionId,
        toolId: tool.id,
        toolName: tool.name,
        logger: {
          debug: (msg, meta) => this.agentLogger.debug(msg, meta),
          info: (msg, meta) => this.agentLogger.info(msg, meta),
          warn: (msg, meta) => this.agentLogger.warn(msg, meta),
          error: (msg, err) => this.agentLogger.error(msg, { error: err }),
        },
      });

      this._emitEvent('tool:completed', {
        toolId,
        executionId,
        success: result.success,
      });

      return result;
    } catch (error) {
      this._emitEvent('tool:failed', {
        toolId,
        executionId,
        error: (error as Error).message,
      });

      throw error;
    }
  }

  // ============================================
  // Plugin Management
  // ============================================

  async loadPlugin(config: PluginConfig): Promise<void> {
    this._ensureReady();

    await this._pluginManager.initialize(config.id);
    await this._pluginManager.activate(config.id);

    this._emitEvent('execution:step', {
      step: 'plugin_loaded',
      pluginId: config.id,
      timestamp: Date.now(),
    });
  }

  async unloadPlugin(pluginId: string): Promise<void> {
    this._ensureReady();

    await this._pluginManager.deactivate(pluginId);
    await this._pluginManager.destroyPlugin(pluginId);

    this._emitEvent('execution:step', {
      step: 'plugin_unloaded',
      pluginId,
      timestamp: Date.now(),
    });
  }

  // ============================================
  // MCP Management
  // ============================================

  async connectMCP(config: MCPServerConfig): Promise<void> {
    this._ensureReady();

    await this._mcpManager.connect(config.id);

    this._emitEvent('execution:step', {
      step: 'mcp_connected',
      serverId: config.id,
      timestamp: Date.now(),
    });
  }

  async disconnectMCP(serverId: string): Promise<void> {
    this._ensureReady();

    await this._mcpManager.disconnect(serverId);

    this._emitEvent('execution:step', {
      step: 'mcp_disconnected',
      serverId,
      timestamp: Date.now(),
    });
  }

  // ============================================
  // Session Management
  // ============================================

  createSession(): SessionId {
    const sessionId = this._generateId();
    this._sessions.set(sessionId, []);
    this._currentSessionId = sessionId;

    this._emitEvent('memory:stored', {
      sessionId,
      timestamp: Date.now(),
    });

    return sessionId;
  }

  getSession(sessionId: SessionId): ChatMessage[] | undefined {
    return this._sessions.get(sessionId);
  }

  clearSession(sessionId: SessionId): void {
    this._sessions.delete(sessionId);

    this._emitEvent('memory:stored', {
      sessionId,
      timestamp: Date.now(),
    });
  }

  // ============================================
  // Private Helpers
  // ============================================

  private _initLLM(config: AgentConfig['llm']): LLMProvider {
    // Check if config is already a provider instance
    if (config && typeof config === 'object' && 'complete' in config && 'stream' in config) {
      return config as LLMProvider;
    }

    const llmConfig = config as LLMConfig | undefined;
    const provider = llmConfig?.provider || 'openai';
    const apiKey = llmConfig?.apiKey || '';
    const baseUrl = llmConfig?.baseUrl;

    switch (provider) {
      case 'openai':
        return new OpenAIProvider({ apiKey, baseUrl });
      case 'anthropic':
        return new AnthropicProvider({ apiKey, baseUrl });
      case 'google':
        return new GeminiProvider({ apiKey });
      case 'moonshot':
        return new MoonshotProvider({ apiKey });
      case 'minimax':
        return new MiniMaxProvider({ apiKey });
      case 'zhipu':
        return new ZhipuProvider({ apiKey });
      case 'qwen':
        return new QwenProvider({ apiKey });
      case 'deepseek':
        return new DeepSeekProvider({ apiKey });
      case 'doubao':
        return new DoubaoProvider({ apiKey });
      default:
        throw new Error(`Unknown LLM provider: ${provider}`);
    }
  }

  private _setState(state: AgentState): void {
    const oldState = this._state;
    this._state = state;

    this._emitEvent('execution:step', {
      step: 'state_changed',
      oldState,
      newState: state,
      timestamp: Date.now(),
    });
  }

  private _ensureReady(): void {
    if (this._state !== AgentState.READY && this._state !== AgentState.CHATTING) {
      throw new Error(`Agent is not ready. Current state: ${this._state}`);
    }
  }

  private _generateId(): string {
    return `agent_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private _getOrCreateSessionId(): SessionId {
    if (!this._currentSessionId) {
      return this.createSession();
    }
    return this._currentSessionId;
  }

  private _addToSession(sessionId: SessionId, messages: ChatMessage[]): void {
    const session = this._sessions.get(sessionId);
    if (session) {
      session.push(...messages);
    }
  }

  private _emitEvent(type: AgentEventType, payload: unknown): void {
    const event: AgentEvent = {
      type,
      timestamp: Date.now(),
      payload,
      metadata: {
        agentId: this.id,
        sessionId: this._currentSessionId,
      },
    };

    this.emit(type, event);
    this.emit('*', event);
  }
}

// ============================================
// Factory Function
// ============================================

export function createAgent(config: AgentConfig): AgentImpl {
  return new AgentImpl(config);
}
