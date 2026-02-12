/**
 * Agent - 智能体核心实现
 *
 * DDD 领域驱动设计
 * 支持 Skills、自我思考、事件驱动
 *
 * @module Agent
 * @version 5.0.0
 */

import { z } from 'zod';
import type {
  AgentConfig,
  AgentId,
  ChatRequest,
  ChatResponse,
  ChatStreamChunk,
  ChatMessage,
  Skill,
  SkillId,
  Tool,
  ToolId,
  LLMService,
  SkillRegistry,
  MemoryService,
  Logger,
  ThinkingResult,
  ThinkingStrategy,
} from './domain/types.js';
import { AgentState } from './domain/types.js';
import {
  EventBus,
  createEventBus,
  AgentInitializedPayload,
  AgentStateChangedPayload,
  ChatStartedPayload,
  ChatCompletedPayload,
} from './domain/events.js';
import { ReActEngine, createReActEngine } from './thinking/react-engine.js';
import { ToolRegistry } from '../tools/registry.js';
import { SkillRegistryImpl } from './skills/registry.js';
import type { MessageContentPart } from './domain/types.js';

// ============================================================================
// Helper Functions
// ============================================================================

function extractTextContent(content: string | MessageContentPart[]): string {
  if (typeof content === 'string') {
    return content;
  }
  return content
    .filter((part): part is { type: 'text'; text: string } => part.type === 'text')
    .map(part => part.text)
    .join('');
}

// ============================================================================
// Agent Dependencies
// ============================================================================

export interface AgentDeps {
  llm: LLMService;
  skillRegistry: SkillRegistryImpl;
  toolRegistry: ToolRegistry;
  memory: MemoryService;
  logger: Logger;
  eventBus?: EventBus;
}

// ============================================================================
// Agent Implementation
// ============================================================================

export class Agent {
  readonly id: AgentId;
  readonly name: string;
  readonly description?: string;

  private _state: AgentState = AgentState.IDLE;
  private _config: AgentConfig;

  private readonly llm: LLMService;
  private readonly skillRegistry: SkillRegistryImpl;
  private readonly toolRegistry: ToolRegistry;
  private readonly memory: MemoryService;
  private readonly logger: Logger;
  private readonly eventBus: EventBus;

  private thinkingEngine: ReActEngine;
  private sessions = new Map<string, ChatMessage[]>();

  private static readonly DEFAULT_CONTEXT_WINDOW = 128000;
  private static readonly RESERVED_TOKENS = 4096;

  constructor(config: AgentConfig, deps: AgentDeps) {
    this.id = config.id || `agent-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    this.name = config.name;
    this.description = config.description;
    this._config = config;

    this.llm = deps.llm;
    this.skillRegistry = deps.skillRegistry;
    this.toolRegistry = deps.toolRegistry;
    this.memory = deps.memory;
    this.logger = deps.logger;
    this.eventBus = deps.eventBus || createEventBus();

    this.thinkingEngine = createReActEngine({
      llm: this.llm,
      tools: this.toolRegistry,
      skills: this.skillRegistry,
      memory: this.memory,
      logger: this.logger,
      config: {
        maxSteps: config.maxThinkingSteps || 10,
        enableReflection: config.enableReflection ?? true,
        systemPrompt: config.systemPrompt,
        enableParallelTools: true,
      },
      eventBus: this.eventBus,
    });

    this.logger.info(`[Agent:${this.name}] Created`, { agentId: this.id });
  }

  async initialize(): Promise<void> {
    this.setState(AgentState.INITIALIZING);

    try {
      this.setState(AgentState.READY);

      this.eventBus.publish<AgentInitializedPayload>(
        'agent:initialized',
        {
          agentId: this.id,
          name: this.name,
          timestamp: new Date(),
        },
        { agentId: this.id }
      );

      this.logger.info(`[Agent:${this.name}] Initialized`);
    } catch (error) {
      this.setState(AgentState.ERROR);
      throw error;
    }
  }

  async chat(request: ChatRequest): Promise<ChatResponse> {
    this.setState(AgentState.CHATTING);

    const chatId = `chat-${Date.now()}`;
    const sessionId = request.sessionId || `session-${Date.now()}`;

    try {
      this.eventBus.publish<ChatStartedPayload>(
        'chat:started',
        {
          chatId,
          messages: request.messages,
          timestamp: new Date(),
        },
        { agentId: this.id, sessionId }
      );

      const lastMessage = request.messages[request.messages.length - 1];
      if (!lastMessage || lastMessage.role !== 'user') {
        throw new Error('Last message must be from user');
      }

      const managedMessages = this.manageContextWindow(request.messages);
      this.sessions.set(sessionId, [...managedMessages]);

      const thinkingResult = await this.think(extractTextContent(lastMessage.content), {
        sessionId,
        executionId: chatId,
      });

      const responseMessage: ChatMessage = {
        id: `msg-${Date.now()}`,
        role: 'assistant',
        content: thinkingResult.answer,
        timestamp: Date.now(),
        metadata: {
          thinkingSteps: thinkingResult.steps.length,
          toolsUsed: thinkingResult.toolsUsed,
          reflections: thinkingResult.reflections,
        },
      };

      const session = this.sessions.get(sessionId) || [];
      session.push(responseMessage);
      this.sessions.set(sessionId, session);

      await this.memory.store({
        id: `memory-${Date.now()}`,
        content: `User: ${lastMessage.content}\nAssistant: ${thinkingResult.answer}`,
        type: 'message',
        timestamp: Date.now(),
        importance: 0.7,
      });

      const promptTokens = this.estimateTokens(request.messages);
      const completionTokens = this.estimateTokens([responseMessage]);

      const response: ChatResponse = {
        id: chatId,
        object: 'chat.completion',
        created: Math.floor(Date.now() / 1000),
        model: request.model || 'default',
        choices: [
          {
            index: 0,
            message: responseMessage,
            finishReason: thinkingResult.success ? 'stop' : 'length',
          },
        ],
        usage: {
          promptTokens,
          completionTokens,
          totalTokens: promptTokens + completionTokens,
        },
      };

      this.eventBus.publish<ChatCompletedPayload>(
        'chat:completed',
        {
          chatId,
          response: thinkingResult.answer,
          tokensUsed: promptTokens + completionTokens,
          timestamp: new Date(),
        },
        { agentId: this.id, sessionId }
      );

      this.setState(AgentState.READY);
      return response;
    } catch (error) {
      this.setState(AgentState.ERROR);

      this.eventBus.publish(
        'chat:error',
        { chatId, error: (error as Error).message },
        { agentId: this.id, sessionId }
      );

      throw error;
    }
  }

  async *chatStream(request: ChatRequest): AsyncGenerator<ChatStreamChunk> {
    this.setState(AgentState.CHATTING);

    const chatId = `chat-${Date.now()}`;
    const sessionId = request.sessionId || `session-${Date.now()}`;

    try {
      const lastMessage = request.messages[request.messages.length - 1];
      if (!lastMessage || lastMessage.role !== 'user') {
        throw new Error('Last message must be from user');
      }

      const managedMessages = this.manageContextWindow(request.messages);

      for await (const event of this.thinkStream(extractTextContent(lastMessage.content), {
        sessionId,
        executionId: chatId,
      })) {
        switch (event.type) {
          case 'thought':
            yield {
              id: chatId,
              object: 'chat.completion.chunk',
              created: Math.floor(Date.now() / 1000),
              model: request.model || 'default',
              choices: [
                {
                  index: 0,
                  delta: { content: `[思考] ${event.thought}\n` },
                  finishReason: null,
                },
              ],
            };
            break;

          case 'actions':
            yield {
              id: chatId,
              object: 'chat.completion.chunk',
              created: Math.floor(Date.now() / 1000),
              model: request.model || 'default',
              choices: [
                {
                  index: 0,
                  delta: { content: `[执行] ${event.actions.map(a => `${a.type}:${a.name}`).join(', ')}\n` },
                  finishReason: null,
                },
              ],
            };
            break;

          case 'observations':
            yield {
              id: chatId,
              object: 'chat.completion.chunk',
              created: Math.floor(Date.now() / 1000),
              model: request.model || 'default',
              choices: [
                {
                  index: 0,
                  delta: { content: `[结果] ${event.observations.join('; ')}\n` },
                  finishReason: null,
                },
              ],
            };
            break;

          case 'complete':
            yield {
              id: chatId,
              object: 'chat.completion.chunk',
              created: Math.floor(Date.now() / 1000),
              model: request.model || 'default',
              choices: [
                {
                  index: 0,
                  delta: { content: `\n${event.answer}` },
                  finishReason: 'stop',
                },
              ],
            };
            break;
        }
      }

      this.setState(AgentState.READY);
    } catch (error) {
      this.setState(AgentState.ERROR);
      throw error;
    }
  }

  async think(
    input: string,
    context: { sessionId: string; executionId: string }
  ): Promise<ThinkingResult> {
    this.setState(AgentState.THINKING);

    try {
      const result = await this.thinkingEngine.think(input, {
        agentId: this.id,
        executionId: context.executionId,
        sessionId: context.sessionId,
      });

      this.setState(AgentState.READY);
      return result;
    } catch (error) {
      this.setState(AgentState.ERROR);
      throw error;
    }
  }

  async *thinkStream(
    input: string,
    context: { sessionId: string; executionId: string }
  ): AsyncGenerator<import('./thinking/react-engine.js').ThinkingStreamEvent> {
    this.setState(AgentState.THINKING);

    try {
      yield* this.thinkingEngine.thinkStream(input, {
        agentId: this.id,
        executionId: context.executionId,
        sessionId: context.sessionId,
      });

      this.setState(AgentState.READY);
    } catch (error) {
      this.setState(AgentState.ERROR);
      throw error;
    }
  }

  async executeSkill<T>(skillId: SkillId, input: unknown): Promise<unknown> {
    this.setState(AgentState.EXECUTING);

    try {
      const result = await this.skillRegistry.execute(skillId, input, {
        executionId: `exec-${Date.now()}`,
        agentId: this.id,
        input,
        logger: this.logger,
        llm: this.llm,
        memory: this.memory,
        tools: this.toolRegistry,
      });

      this.setState(AgentState.READY);
      return result;
    } catch (error) {
      this.setState(AgentState.ERROR);
      throw error;
    }
  }

  registerSkill(skill: Skill): void {
    this.skillRegistry.register(skill);
    this.logger.info(`[Agent:${this.name}] Skill registered: ${skill.name}`);
  }

  unregisterSkill(skillId: SkillId): void {
    this.skillRegistry.unregister(skillId);
    this.logger.info(`[Agent:${this.name}] Skill unregistered: ${skillId}`);
  }

  registerTool(tool: Tool): void {
    this.toolRegistry.register(tool);
    this.logger.info(`[Agent:${this.name}] Tool registered: ${tool.name}`);
  }

  unregisterTool(toolId: ToolId): void {
    this.toolRegistry.unregister(toolId);
    this.logger.info(`[Agent:${this.name}] Tool unregistered: ${toolId}`);
  }

  getSessionHistory(sessionId: string): ChatMessage[] {
    return this.sessions.get(sessionId) || [];
  }

  clearSession(sessionId: string): void {
    this.sessions.delete(sessionId);
    this.logger.info(`[Agent:${this.name}] Session cleared: ${sessionId}`);
  }

  on<T>(
    eventType: Parameters<EventBus['subscribe']>[0],
    handler: (event: T) => void
  ): () => void {
    const subscription = this.eventBus.subscribe(eventType, handler as never);
    return () => subscription.unsubscribe();
  }

  get state(): AgentState {
    return this._state;
  }

  async destroy(): Promise<void> {
    this.setState(AgentState.DESTROYED);

    this.thinkingEngine.abort();
    this.sessions.clear();

    this.eventBus.publish(
      'agent:destroyed',
      { agentId: this.id, timestamp: new Date() },
      { agentId: this.id }
    );

    this.logger.info(`[Agent:${this.name}] Destroyed`);
  }

  private setState(newState: AgentState): void {
    const oldState = this._state;
    this._state = newState;

    if (oldState !== newState) {
      this.eventBus.publish<AgentStateChangedPayload>(
        'agent:state:changed',
        {
          from: oldState,
          to: newState,
          timestamp: new Date(),
        },
        { agentId: this.id }
      );
    }
  }

  private estimateTokens(messages: ChatMessage[]): number {
    let total = 0;
    for (const msg of messages) {
      const content = typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content);
      total += Math.ceil(content.length / 4);
    }
    return total;
  }

  private manageContextWindow(messages: ChatMessage[], maxTokens?: number): ChatMessage[] {
    const limit = maxTokens || this._config.memory?.maxTokens || Agent.DEFAULT_CONTEXT_WINDOW;
    const availableTokens = limit - Agent.RESERVED_TOKENS;

    const totalTokens = this.estimateTokens(messages);
    if (totalTokens <= availableTokens) {
      return messages;
    }

    const result: ChatMessage[] = [];
    let currentTokens = 0;

    for (let i = messages.length - 1; i >= 0; i--) {
      const msg = messages[i];
      const msgTokens = this.estimateTokens([msg]);

      if (currentTokens + msgTokens <= availableTokens) {
        result.unshift(msg);
        currentTokens += msgTokens;
      } else {
        break;
      }
    }

    if (result.length === 0 && messages.length > 0) {
      result.push(messages[messages.length - 1]);
    }

    this.logger.debug(`[Agent:${this.name}] Context window managed`, {
      original: messages.length,
      truncated: result.length,
      tokens: currentTokens,
    });

    return result;
  }
}

// ============================================================================
// Factory
// ============================================================================

export function createAgent(config: {
  id?: AgentId;
  name: string;
  description?: string;
  systemPrompt?: string;
  thinkingStrategy?: ThinkingStrategy;
  maxThinkingSteps?: number;
  enableReflection?: boolean;
  llm: LLMService;
  skillRegistry?: SkillRegistryImpl;
  toolRegistry?: ToolRegistry;
  memory: MemoryService;
  logger: Logger;
  eventBus?: EventBus;
}): Agent {
  const { llm, skillRegistry, toolRegistry, memory, logger, eventBus, ...agentConfig } = config;

  return new Agent(agentConfig as AgentConfig, {
    llm,
    skillRegistry: skillRegistry || new SkillRegistryImpl(),
    toolRegistry: toolRegistry || new ToolRegistry(),
    memory,
    logger,
    eventBus,
  });
}

// ============================================================================
// Built-in Skills
// ============================================================================

export const ReasonSkill: Skill = {
  id: 'reason' as SkillId,
  name: 'reason',
  description: 'Basic reasoning and analysis capability',
  version: '1.0.0',
  inputSchema: z.object({ prompt: z.string() }),
  execute: async (input, ctx) => {
    const { prompt } = input as { prompt: string };

    const response = await ctx.llm.complete({
      messages: [
        { role: 'user', content: prompt, id: 'user', timestamp: Date.now() },
      ],
    });

    return {
      success: true,
      data: response.choices[0]?.message?.content || '',
      metadata: {
        executionId: ctx.executionId,
        skillId: 'reason',
        skillName: 'reason',
        startTime: Date.now(),
        endTime: Date.now(),
        duration: 0,
      },
    };
  },
};

export const PlanSkill: Skill = {
  id: 'plan' as SkillId,
  name: 'plan',
  description: 'Create execution plans for complex tasks',
  version: '1.0.0',
  inputSchema: z.object({
    goal: z.string(),
    constraints: z.array(z.string()).optional(),
  }),
  execute: async (input, ctx) => {
    const { goal, constraints = [] } = input as { goal: string; constraints?: string[] };

    const prompt = `Create a step-by-step plan for: ${goal}\n${constraints.length > 0 ? `Constraints: ${constraints.join(', ')}` : ''}`;

    const response = await ctx.llm.complete({
      messages: [
        { role: 'user', content: prompt, id: 'user', timestamp: Date.now() },
      ],
    });

    return {
      success: true,
      data: {
        goal,
        plan: response.choices[0]?.message?.content || '',
        steps: [],
      },
      metadata: {
        executionId: ctx.executionId,
        skillId: 'plan',
        skillName: 'plan',
        startTime: Date.now(),
        endTime: Date.now(),
        duration: 0,
      },
    };
  },
};

export const MemorySkill: Skill = {
  id: 'memory' as SkillId,
  name: 'memory',
  description: 'Store and retrieve information from memory',
  version: '1.0.0',
  inputSchema: z.object({
    action: z.enum(['store', 'retrieve', 'search']),
    content: z.string().optional(),
    query: z.string().optional(),
  }),
  execute: async (input, ctx) => {
    const { action, content, query } = input as {
      action: 'store' | 'retrieve' | 'search';
      content?: string;
      query?: string;
    };

    switch (action) {
      case 'store':
        if (!content) {
          return {
            success: false,
            error: { code: 'MISSING_CONTENT', message: 'Content is required', skillId: 'memory', recoverable: true },
          };
        }
        await ctx.memory.store({
          id: `memory-${Date.now()}`,
          content,
          type: 'fact',
          timestamp: Date.now(),
        });
        return {
          success: true,
          data: { stored: true },
          metadata: {
            executionId: ctx.executionId,
            skillId: 'memory',
            skillName: 'memory',
            startTime: Date.now(),
            endTime: Date.now(),
            duration: 0,
          },
        };

      case 'search':
        if (!query) {
          return {
            success: false,
            error: { code: 'MISSING_QUERY', message: 'Query is required', skillId: 'memory', recoverable: true },
          };
        }
        const results = await ctx.memory.search(query);
        return {
          success: true,
          data: results,
          metadata: {
            executionId: ctx.executionId,
            skillId: 'memory',
            skillName: 'memory',
            startTime: Date.now(),
            endTime: Date.now(),
            duration: 0,
          },
        };

      default:
        return {
          success: false,
          error: { code: 'INVALID_ACTION', message: `Unknown action: ${action}`, skillId: 'memory', recoverable: false },
        };
    }
  },
};
