/**
 * Conversation Manager - 对话会话管理器
 *
 * 管理对话状态、事件追踪和会话持久化
 *
 * @module TUI
 * @version 5.0.0
 */

import { EventEmitter } from '../utils/event-emitter.js';
import { EventLogger, EventBuffer, createEventLogger } from './event-logger.js';
import {
  type TUIEvent,
  type TUIEventType,
  type SkillEventPayload,
  type ToolEventPayload,
  type ThinkingEventPayload,
  formatDuration,
} from './tui-events.js';
import type { AgentEvent } from '../core/domain/agent.js';
import { ANSI, COLORS } from './ansi-codes.js';

const CONVERSATION_CONSTANTS = {
  DEFAULT_EVENT_BUFFER_SIZE: 1000,
  DEFAULT_MAX_SESSIONS: 10,
} as const;

export interface ConversationMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  tokens?: {
    prompt?: number;
    completion?: number;
  };
  metadata?: {
    model?: string;
    duration?: number;
    toolCalls?: ToolCallRecord[];
    skillCalls?: SkillCallRecord[];
    thinking?: ThinkingRecord[];
  };
}

export interface ToolCallRecord {
  toolId: string;
  toolName?: string;
  input?: unknown;
  output?: unknown;
  duration?: number;
  success: boolean;
  timestamp: number;
}

export interface SkillCallRecord {
  skillId: string;
  skillName?: string;
  input?: unknown;
  output?: unknown;
  duration?: number;
  success: boolean;
  timestamp: number;
}

export interface ThinkingRecord {
  step: number;
  thought?: string;
  action?: string;
  observation?: string;
  timestamp: number;
}

export interface ConversationSession {
  id: string;
  name?: string;
  createdAt: number;
  updatedAt: number;
  messages: ConversationMessage[];
  stats: ConversationStats;
  metadata: {
    model?: string;
    provider?: string;
    totalTokens?: number;
    totalDuration?: number;
  };
}

export interface ConversationStats {
  totalMessages: number;
  userMessages: number;
  assistantMessages: number;
  totalTokens: number;
  promptTokens: number;
  completionTokens: number;
  toolCalls: number;
  skillCalls: number;
  mcpCalls: number;
  errors: number;
  thinkingSteps: number;
}

export interface ConversationManagerConfig {
  maxSessions?: number;
  autoSave?: boolean;
  eventLogger?: EventLogger;
  onEvent?: (event: TUIEvent) => void;
}

export class ConversationManager extends EventEmitter {
  private sessions: Map<string, ConversationSession> = new Map();
  private currentSessionId: string | null = null;
  private eventBuffer: EventBuffer;
  private eventLogger: EventLogger;
  private config: Required<Omit<ConversationManagerConfig, 'eventLogger' | 'onEvent'>> & { eventLogger?: EventLogger; onEvent?: (event: TUIEvent) => void };
  private pendingToolCalls: Map<string, ToolCallRecord> = new Map();
  private pendingSkillCalls: Map<string, SkillCallRecord> = new Map();
  private currentThinking: ThinkingRecord[] = [];
  private messageStartTime: number = 0;

  constructor(config: ConversationManagerConfig = {}) {
    super();
    this.config = {
      maxSessions: config.maxSessions ?? CONVERSATION_CONSTANTS.DEFAULT_MAX_SESSIONS,
      autoSave: config.autoSave ?? true,
      eventLogger: config.eventLogger,
      onEvent: config.onEvent,
    };
    this.eventBuffer = new EventBuffer(CONVERSATION_CONSTANTS.DEFAULT_EVENT_BUFFER_SIZE);
    this.eventLogger = config.eventLogger || createEventLogger();
  }

  createSession(name?: string): string {
    const id = `session-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const session: ConversationSession = {
      id,
      name: name || `Session ${this.sessions.size + 1}`,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      messages: [],
      stats: this.createEmptyStats(),
      metadata: {},
    };

    this.sessions.set(id, session);
    this.currentSessionId = id;

    this.cleanupOldSessions();

    return id;
  }

  getCurrentSession(): ConversationSession | null {
    if (!this.currentSessionId) return null;
    return this.sessions.get(this.currentSessionId) || null;
  }

  getSession(id: string): ConversationSession | null {
    return this.sessions.get(id) || null;
  }

  switchSession(id: string): boolean {
    if (this.sessions.has(id)) {
      this.currentSessionId = id;
      return true;
    }
    return false;
  }

  addUserMessage(content: string): ConversationMessage | null {
    const session = this.getCurrentSession();
    if (!session) return null;

    const message: ConversationMessage = {
      id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      role: 'user',
      content,
      timestamp: Date.now(),
    };

    session.messages.push(message);
    session.stats.totalMessages++;
    session.stats.userMessages++;
    session.updatedAt = Date.now();

    this.messageStartTime = Date.now();
    this.currentThinking = [];

    return message;
  }

  startAssistantMessage(): string | null {
    const session = this.getCurrentSession();
    if (!session) return null;

    return `msg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  }

  completeAssistantMessage(
    id: string,
    content: string,
    metadata?: {
      tokens?: { prompt: number; completion: number };
      model?: string;
    }
  ): ConversationMessage | null {
    const session = this.getCurrentSession();
    if (!session) return null;

    const duration = Date.now() - this.messageStartTime;

    const message: ConversationMessage = {
      id,
      role: 'assistant',
      content,
      timestamp: Date.now(),
      tokens: metadata?.tokens,
      metadata: {
        model: metadata?.model,
        duration,
        toolCalls: Array.from(this.pendingToolCalls.values()),
        skillCalls: Array.from(this.pendingSkillCalls.values()),
        thinking: this.currentThinking,
      },
    };

    session.messages.push(message);
    session.stats.totalMessages++;
    session.stats.assistantMessages++;

    if (metadata?.tokens) {
      session.stats.totalTokens += metadata.tokens.prompt + metadata.tokens.completion;
      session.stats.promptTokens += metadata.tokens.prompt;
      session.stats.completionTokens += metadata.tokens.completion;
    }

    session.stats.toolCalls += this.pendingToolCalls.size;
    session.stats.skillCalls += this.pendingSkillCalls.size;
    session.stats.thinkingSteps += this.currentThinking.length;

    session.updatedAt = Date.now();

    this.pendingToolCalls.clear();
    this.pendingSkillCalls.clear();
    this.currentThinking = [];

    return message;
  }

  handleAgentEvent(event: AgentEvent): void {
    const tuiEvent = this.convertAgentEvent(event);
    if (tuiEvent) {
      this.processEvent(tuiEvent);
    }
  }

  private convertAgentEvent(event: AgentEvent): TUIEvent | null {
    return {
      type: event.type as TUIEventType,
      timestamp: event.timestamp,
      payload: event.payload,
      metadata: event.metadata,
    };
  }

  processEvent(event: TUIEvent): void {
    this.eventBuffer.push(event);
    this.eventLogger.log(event);

    if (this.config.onEvent) {
      this.config.onEvent(event);
    }

    this.updateSessionFromEvent(event);

    this.emit('event', event);
  }

  private updateSessionFromEvent(event: TUIEvent): void {
    const session = this.getCurrentSession();
    if (!session) return;

    const type = event.type;
    const payload = event.payload as Record<string, unknown>;

    switch (type) {
      case 'tool:invoking': {
        const p = payload as unknown as ToolEventPayload;
        const record: ToolCallRecord = {
          toolId: p.toolId,
          toolName: p.toolName,
          input: p.input,
          timestamp: event.timestamp,
          success: false,
        };
        this.pendingToolCalls.set(p.executionId, record);
        break;
      }

      case 'tool:completed': {
        const p = payload as unknown as ToolEventPayload;
        const record = this.pendingToolCalls.get(p.executionId);
        if (record) {
          record.output = p.result;
          record.success = p.success ?? true;
          record.duration = p.duration;
        }
        break;
      }

      case 'tool:failed': {
        const p = payload as unknown as ToolEventPayload;
        const record = this.pendingToolCalls.get(p.executionId);
        if (record) {
          record.success = false;
          record.duration = p.duration;
        }
        session.stats.errors++;
        break;
      }

      case 'skill:invoking': {
        const p = payload as unknown as SkillEventPayload;
        const record: SkillCallRecord = {
          skillId: p.skillId,
          skillName: p.skillName,
          input: p.input,
          timestamp: event.timestamp,
          success: false,
        };
        this.pendingSkillCalls.set(p.executionId, record);
        break;
      }

      case 'skill:completed': {
        const p = payload as unknown as SkillEventPayload;
        const record = this.pendingSkillCalls.get(p.executionId);
        if (record) {
          record.output = p.result;
          record.success = p.success ?? true;
          record.duration = p.duration;
        }
        break;
      }

      case 'skill:failed': {
        const p = payload as unknown as SkillEventPayload;
        const record = this.pendingSkillCalls.get(p.executionId);
        if (record) {
          record.success = false;
          record.duration = p.duration;
        }
        session.stats.errors++;
        break;
      }

      case 'thinking:step': {
        const p = payload as unknown as ThinkingEventPayload;
        this.currentThinking.push({
          step: p.step || this.currentThinking.length + 1,
          thought: p.thought,
          action: p.action,
          observation: p.observation,
          timestamp: event.timestamp,
        });
        break;
      }

      case 'mcp:tool:call': {
        session.stats.mcpCalls++;
        break;
      }

      case 'chat:error':
      case 'execution:failed':
      case 'agent:error': {
        session.stats.errors++;
        break;
      }
    }
  }

  private createEmptyStats(): ConversationStats {
    return {
      totalMessages: 0,
      userMessages: 0,
      assistantMessages: 0,
      totalTokens: 0,
      promptTokens: 0,
      completionTokens: 0,
      toolCalls: 0,
      skillCalls: 0,
      mcpCalls: 0,
      errors: 0,
      thinkingSteps: 0,
    };
  }

  private cleanupOldSessions(): void {
    if (this.sessions.size <= this.config.maxSessions) return;

    const sorted = Array.from(this.sessions.entries())
      .sort((a, b) => a[1].updatedAt - b[1].updatedAt);

    const toRemove = sorted.slice(0, sorted.length - this.config.maxSessions);
    for (const [id] of toRemove) {
      if (id !== this.currentSessionId) {
        this.sessions.delete(id);
      }
    }
  }

  getStats(): ConversationStats {
    const session = this.getCurrentSession();
    return session?.stats || this.createEmptyStats();
  }

  getEventBuffer(): EventBuffer {
    return this.eventBuffer;
  }

  getEventLogger(): EventLogger {
    return this.eventLogger;
  }

  listSessions(): ConversationSession[] {
    return Array.from(this.sessions.values())
      .sort((a, b) => b.updatedAt - a.updatedAt);
  }

  deleteSession(id: string): boolean {
    if (id === this.currentSessionId) {
      return false;
    }
    return this.sessions.delete(id);
  }

  clearCurrentSession(): void {
    const session = this.getCurrentSession();
    if (session) {
      session.messages = [];
      session.stats = this.createEmptyStats();
      session.updatedAt = Date.now();
    }
    this.pendingToolCalls.clear();
    this.pendingSkillCalls.clear();
    this.currentThinking = [];
    this.eventBuffer.clear();
  }

  exportSession(format: 'json' | 'markdown' | 'txt' = 'json'): string {
    const session = this.getCurrentSession();
    if (!session) return '';

    if (format === 'json') {
      return JSON.stringify(session, null, 2);
    }

    if (format === 'markdown') {
      let md = `# ${session.name || 'Conversation'}\n\n`;
      md += `Created: ${new Date(session.createdAt).toLocaleString()}\n`;
      md += `Messages: ${session.stats.totalMessages}\n`;
      md += `Tokens: ${session.stats.totalTokens}\n\n`;
      md += `---\n\n`;

      for (const msg of session.messages) {
        const role = msg.role === 'user' ? '👤 User' : msg.role === 'assistant' ? '🤖 Assistant' : 'System';
        md += `## ${role}\n\n${msg.content}\n\n`;

        if (msg.metadata?.toolCalls?.length) {
          md += `**Tool Calls:**\n`;
          for (const tc of msg.metadata.toolCalls) {
            md += `- ${tc.toolName || tc.toolId}: ${tc.success ? '✓' : '✗'}\n`;
          }
          md += '\n';
        }

        if (msg.metadata?.skillCalls?.length) {
          md += `**Skill Calls:**\n`;
          for (const sc of msg.metadata.skillCalls) {
            md += `- ${sc.skillName || sc.skillId}: ${sc.success ? '✓' : '✗'}\n`;
          }
          md += '\n';
        }

        md += '---\n\n';
      }

      return md;
    }

    let txt = `${session.name || 'Conversation'}\n${'='.repeat(50)}\n\n`;
    for (const msg of session.messages) {
      const role = msg.role.toUpperCase();
      txt += `[${role}]\n${msg.content}\n\n`;
    }
    return txt;
  }

  printStats(): void {
    const stats = this.getStats();
    const session = this.getCurrentSession();

    console.log('');
    console.log(`${COLORS.primary}${'═'.repeat(50)}${ANSI.reset}`);
    console.log(`${COLORS.primary}📊 Session Statistics${ANSI.reset}`);
    console.log(`${COLORS.primary}${'═'.repeat(50)}${ANSI.reset}`);

    if (session) {
      console.log(`  ${ANSI.dim}Session:${ANSI.reset} ${session.name || session.id}`);
      console.log(`  ${ANSI.dim}Duration:${ANSI.reset} ${formatDuration(session.updatedAt - session.createdAt)}`);
    }

    console.log('');
    console.log(`${ANSI.dim}Messages:${ANSI.reset}`);
    console.log(`  Total: ${stats.totalMessages}`);
    console.log(`  User: ${stats.userMessages} | Assistant: ${stats.assistantMessages}`);

    console.log('');
    console.log(`${ANSI.dim}Tokens:${ANSI.reset}`);
    console.log(`  Total: ${stats.totalTokens.toLocaleString()}`);
    console.log(`  Prompt: ${stats.promptTokens.toLocaleString()} | Completion: ${stats.completionTokens.toLocaleString()}`);

    console.log('');
    console.log(`${ANSI.dim}Operations:${ANSI.reset}`);
    console.log(`  Tool Calls: ${stats.toolCalls}`);
    console.log(`  Skill Calls: ${stats.skillCalls}`);
    console.log(`  MCP Calls: ${stats.mcpCalls}`);
    console.log(`  Thinking Steps: ${stats.thinkingSteps}`);

    if (stats.errors > 0) {
      console.log('');
      console.log(`${COLORS.error}Errors: ${stats.errors}${ANSI.reset}`);
    }

    console.log(`${COLORS.primary}${'═'.repeat(50)}${ANSI.reset}`);
    console.log('');
  }
}

export function createConversationManager(config?: ConversationManagerConfig): ConversationManager {
  return new ConversationManager(config);
}
