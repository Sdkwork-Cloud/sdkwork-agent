/**
 * Event Logger - 事件日志渲染器
 *
 * 专业级事件日志显示系统
 * 支持所有 Agent 事件的可视化渲染
 *
 * @module TUI
 * @version 5.0.0
 */

import { TUIRenderer, DEFAULT_THEME, type Theme } from './renderer.js';
import {
  type TUIEvent,
  type TUIEventType,
  getEventIcon,
  getEventCategory,
  getEventPriority,
  formatEventTimestamp,
  formatDuration,
  truncateText,
  type SkillEventPayload,
  type ToolEventPayload,
  type MCPEventPayload,
  type ScriptEventPayload,
  type PluginEventPayload,
  type ThinkingEventPayload,
  type ChatStartedPayload,
  type ChatCompletedPayload,
  type ChatErrorPayload,
  type ExecutionStepPayload,
} from './tui-events.js';

const EVENT_LOGGER_CONSTANTS = {
  DEFAULT_MAX_EVENTS: 100,
} as const;

export interface EventLoggerConfig {
  maxEvents?: number;
  showTimestamp?: boolean;
  showCategory?: boolean;
  showDuration?: boolean;
  compact?: boolean;
  theme?: Theme;
  filter?: (event: TUIEvent) => boolean;
  priorityFilter?: 'high' | 'medium' | 'low' | 'all';
}

interface LogEntry {
  event: TUIEvent;
  rendered: string[];
  timestamp: number;
}

export class EventLogger {
  private config: Required<EventLoggerConfig>;
  private renderer: TUIRenderer;
  private events: LogEntry[] = [];
  private startTime: number = Date.now();
  private eventCounts: Map<string, number> = new Map();

  constructor(config: EventLoggerConfig = {}) {
    this.config = {
      maxEvents: config.maxEvents ?? EVENT_LOGGER_CONSTANTS.DEFAULT_MAX_EVENTS,
      showTimestamp: config.showTimestamp ?? true,
      showCategory: config.showCategory ?? true,
      showDuration: config.showDuration ?? true,
      compact: config.compact ?? false,
      theme: config.theme ?? DEFAULT_THEME,
      filter: config.filter ?? (() => true),
      priorityFilter: config.priorityFilter ?? 'all',
    };
    this.renderer = new TUIRenderer(this.config.theme);
  }

  log(event: TUIEvent): void {
    if (!this.config.filter(event)) return;

    const priority = getEventPriority(event.type);
    if (this.config.priorityFilter !== 'all') {
      const levels = { high: 0, medium: 1, low: 2 };
      if (levels[priority] > levels[this.config.priorityFilter]) return;
    }

    this.eventCounts.set(event.type, (this.eventCounts.get(event.type) || 0) + 1);

    const entry: LogEntry = {
      event,
      rendered: this.renderEvent(event),
      timestamp: Date.now(),
    };

    this.events.push(entry);
    if (this.events.length > this.config.maxEvents) {
      this.events.shift();
    }

    this.printEvent(entry);
  }

  private renderEvent(event: TUIEvent): string[] {
    const lines: string[] = [];
    const icon = getEventIcon(event.type);
    const category = getEventCategory(event.type);
    const timestamp = formatEventTimestamp(event.timestamp);
    const priority = getEventPriority(event.type);

    const priorityColors = {
      high: this.config.theme.error,
      medium: this.config.theme.warning,
      low: this.config.theme.dim,
    };
    const color = priorityColors[priority];

    const header = this.config.compact
      ? `${color(icon)} `
      : `${this.config.theme.dim(timestamp)} ${color(icon)} `;

    const categoryStr = this.config.showCategory
      ? `${this.config.theme.dim(`[${category}]`)} `
      : '';

    const mainLine = this.renderEventContent(event);

    if (this.config.compact) {
      lines.push(`${header}${categoryStr}${mainLine}`);
    } else {
      lines.push(`${header}${categoryStr}${mainLine}`);
      const details = this.renderEventDetails(event);
      lines.push(...details);
    }

    return lines;
  }

  private renderEventContent(event: TUIEvent): string {
    const type = event.type;
    const payload = event.payload;

    switch (type) {
      case 'agent:initialized':
        return this.config.theme.success('Agent initialized');

      case 'agent:started': {
        const p = payload as { capabilities?: { skills: number; tools: number; memory: boolean } };
        const caps = p.capabilities;
        if (caps) {
          return `${this.config.theme.success('Agent ready')} ${this.config.theme.dim(`(${caps.skills} skills, ${caps.tools} tools, memory: ${caps.memory ? 'on' : 'off'})`)}`;
        }
        return this.config.theme.success('Agent ready');
      }

      case 'agent:destroyed':
        return this.config.theme.error('Agent destroyed');

      case 'agent:error':
        return `${this.config.theme.error('Agent error:')} ${(payload as { error?: string }).error || 'Unknown'}`;

      case 'agent:reset':
        return this.config.theme.warning('Agent reset');

      case 'chat:started': {
        const p = payload as ChatStartedPayload;
        return `${this.config.theme.accent('Chat started')} ${this.config.theme.dim(`(${p.messageCount} messages)`)}`;
      }

      case 'chat:completed': {
        const p = payload as ChatCompletedPayload;
        const tokens = p.tokenUsage;
        if (tokens) {
          return `${this.config.theme.success('Chat completed')} ${this.config.theme.dim(`(${tokens.promptTokens}+${tokens.completionTokens}=${tokens.totalTokens} tokens)`)}`;
        }
        return this.config.theme.success('Chat completed');
      }

      case 'chat:error': {
        const p = payload as ChatErrorPayload;
        return `${this.config.theme.error('Chat error:')} ${p.error}`;
      }

      case 'skill:invoking': {
        const p = payload as SkillEventPayload;
        return `${this.config.theme.accent('Invoking skill:')} ${p.skillId}`;
      }

      case 'skill:completed': {
        const p = payload as SkillEventPayload;
        const duration = p.duration ? ` (${formatDuration(p.duration)})` : '';
        return `${this.config.theme.success('Skill completed:')} ${p.skillId}${this.config.theme.dim(duration)}`;
      }

      case 'skill:failed': {
        const p = payload as SkillEventPayload;
        return `${this.config.theme.error('Skill failed:')} ${p.skillId} - ${p.error || 'Unknown'}`;
      }

      case 'tool:invoking': {
        const p = payload as ToolEventPayload;
        return `${this.config.theme.accent('Invoking tool:')} ${p.toolId}`;
      }

      case 'tool:completed': {
        const p = payload as ToolEventPayload;
        const duration = p.duration ? ` (${formatDuration(p.duration)})` : '';
        return `${this.config.theme.success('Tool completed:')} ${p.toolId}${this.config.theme.dim(duration)}`;
      }

      case 'tool:failed': {
        const p = payload as ToolEventPayload;
        return `${this.config.theme.error('Tool failed:')} ${p.toolId} - ${p.error || 'Unknown'}`;
      }

      case 'mcp:connecting': {
        const p = payload as MCPEventPayload;
        return `${this.config.theme.warning('MCP connecting:')} ${p.serverId}`;
      }

      case 'mcp:connected': {
        const p = payload as MCPEventPayload;
        return `${this.config.theme.success('MCP connected:')} ${p.serverId}`;
      }

      case 'mcp:disconnected': {
        const p = payload as MCPEventPayload;
        return `${this.config.theme.warning('MCP disconnected:')} ${p.serverId}`;
      }

      case 'mcp:error': {
        const p = payload as MCPEventPayload;
        return `${this.config.theme.error('MCP error:')} ${p.serverId} - ${p.error || 'Unknown'}`;
      }

      case 'mcp:tool:call': {
        const p = payload as MCPEventPayload;
        return `${this.config.theme.accent('MCP tool call:')} ${p.toolName}`;
      }

      case 'mcp:tool:result': {
        const p = payload as MCPEventPayload;
        return `${this.config.theme.success('MCP tool result:')} ${p.toolName}`;
      }

      case 'script:started': {
        const p = payload as ScriptEventPayload;
        return `${this.config.theme.accent('Script started:')} ${p.scriptName || p.scriptId}`;
      }

      case 'script:step': {
        const p = payload as ScriptEventPayload;
        return `${this.config.theme.info(`Script step ${p.step}/${p.totalSteps}:`)} ${p.stepName || 'processing'}`;
      }

      case 'script:completed': {
        const p = payload as ScriptEventPayload;
        const duration = p.duration ? ` (${formatDuration(p.duration)})` : '';
        return `${this.config.theme.success('Script completed:')} ${p.scriptName || p.scriptId}${this.config.theme.dim(duration)}`;
      }

      case 'script:failed': {
        const p = payload as ScriptEventPayload;
        return `${this.config.theme.error('Script failed:')} ${p.scriptName || p.scriptId} - ${p.error || 'Unknown'}`;
      }

      case 'plugin:loaded': {
        const p = payload as PluginEventPayload;
        return `${this.config.theme.success('Plugin loaded:')} ${p.pluginName || p.pluginId}`;
      }

      case 'plugin:unloaded': {
        const p = payload as PluginEventPayload;
        return `${this.config.theme.warning('Plugin unloaded:')} ${p.pluginName || p.pluginId}`;
      }

      case 'plugin:error': {
        const p = payload as PluginEventPayload;
        return `${this.config.theme.error('Plugin error:')} ${p.pluginName || p.pluginId} - ${p.error || 'Unknown'}`;
      }

      case 'thinking:start': {
        return this.config.theme.info('Thinking started');
      }

      case 'thinking:step': {
        const p = payload as ThinkingEventPayload;
        const thought = p.thought ? truncateText(p.thought, 50) : '';
        return `${this.config.theme.info(`Step ${p.step}/${p.totalSteps}:`)} ${thought}`;
      }

      case 'thinking:end': {
        return this.config.theme.success('Thinking complete');
      }

      case 'stream:start':
        return this.config.theme.accent('Stream started');

      case 'stream:chunk':
        return '';

      case 'stream:end':
        return this.config.theme.success('Stream complete');

      case 'memory:stored':
        return this.config.theme.success('Memory stored');

      case 'memory:retrieved':
        return this.config.theme.info('Memory retrieved');

      case 'memory:searched':
        return this.config.theme.info('Memory searched');

      case 'execution:started':
        return this.config.theme.accent('Execution started');

      case 'execution:step': {
        const p = payload as ExecutionStepPayload;
        if (p.step === 'state_changed') {
          return `${this.config.theme.info('State:')} ${p.oldState} → ${p.newState}`;
        }
        return `${this.config.theme.info('Step:')} ${p.step}`;
      }

      case 'execution:completed':
        return this.config.theme.success('Execution completed');

      case 'execution:failed':
        return this.config.theme.error('Execution failed');

      default:
        return type;
    }
  }

  private renderEventDetails(event: TUIEvent): string[] {
    const lines: string[] = [];
    const payload = event.payload;

    if (!payload || typeof payload !== 'object') return lines;

    const p = payload as Record<string, unknown>;

    if (event.type === 'skill:invoking' && p.input) {
      const inputStr = typeof p.input === 'string' ? p.input : JSON.stringify(p.input, null, 2);
      const truncated = truncateText(inputStr, 100);
      lines.push(`  ${this.config.theme.dim(`Input: ${truncated}`)}`);
    }

    if (event.type === 'skill:completed' && p.result) {
      const resultStr = typeof p.result === 'string' ? p.result : JSON.stringify(p.result, null, 2);
      const truncated = truncateText(resultStr, 100);
      lines.push(`  ${this.config.theme.dim(`Result: ${truncated}`)}`);
    }

    if (event.type === 'tool:invoking' && p.input) {
      const inputStr = typeof p.input === 'string' ? p.input : JSON.stringify(p.input, null, 2);
      const truncated = truncateText(inputStr, 100);
      lines.push(`  ${this.config.theme.dim(`Input: ${truncated}`)}`);
    }

    if (event.type === 'tool:completed' && p.result) {
      const resultStr = typeof p.result === 'string' ? p.result : JSON.stringify(p.result, null, 2);
      const truncated = truncateText(resultStr, 100);
      lines.push(`  ${this.config.theme.dim(`Result: ${truncated}`)}`);
    }

    if (event.type === 'mcp:tool:call' && p.parameters) {
      const paramsStr = JSON.stringify(p.parameters, null, 2);
      const truncated = truncateText(paramsStr, 80);
      lines.push(`  ${this.config.theme.dim(`Parameters: ${truncated}`)}`);
    }

    if (event.type === 'thinking:step' && p.action) {
      lines.push(`  ${this.config.theme.dim(`Action: ${truncateText(String(p.action), 60)}`)}`);
      if (p.observation) {
        lines.push(`  ${this.config.theme.dim(`Observation: ${truncateText(String(p.observation), 60)}`)}`);
      }
    }

    return lines;
  }

  private printEvent(entry: LogEntry): void {
    for (const line of entry.rendered) {
      if (line) console.log(line);
    }
  }

  getEvents(): TUIEvent[] {
    return this.events.map(e => e.event);
  }

  getEventCounts(): Map<string, number> {
    return new Map(this.eventCounts);
  }

  getStats(): {
    totalEvents: number;
    eventCounts: Map<string, number>;
    uptime: number;
  } {
    return {
      totalEvents: this.events.length,
      eventCounts: this.getEventCounts(),
      uptime: Date.now() - this.startTime,
    };
  }

  clear(): void {
    this.events = [];
    this.eventCounts.clear();
    this.startTime = Date.now();
  }

  setFilter(filter: (event: TUIEvent) => boolean): void {
    this.config.filter = filter;
  }

  setPriorityFilter(priority: 'high' | 'medium' | 'low' | 'all'): void {
    this.config.priorityFilter = priority;
  }

  setCompact(compact: boolean): void {
    this.config.compact = compact;
  }

  printSummary(): void {
    const stats = this.getStats();
    const duration = formatDuration(stats.uptime);

    console.log('');
    console.log(this.config.theme.accent('═'.repeat(50)));
    console.log(this.config.theme.accent('📊 Event Summary'));
    console.log(this.config.theme.accent('═'.repeat(50)));
    console.log(`  ${this.config.theme.dim('Uptime:')} ${duration}`);
    console.log(`  ${this.config.theme.dim('Total Events:')} ${stats.totalEvents}`);
    console.log('');

    const sorted = Array.from(stats.eventCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);

    if (sorted.length > 0) {
      console.log(this.config.theme.dim('Top Events:'));
      for (const [type, count] of sorted) {
        const icon = getEventIcon(type);
        console.log(`  ${icon} ${type}: ${count}`);
      }
    }

    console.log(this.config.theme.accent('═'.repeat(50)));
    console.log('');
  }
}

export function createEventLogger(config?: EventLoggerConfig): EventLogger {
  return new EventLogger(config);
}

export class EventBuffer {
  private buffer: TUIEvent[] = [];
  private maxSize: number;

  constructor(maxSize: number = 1000) {
    this.maxSize = maxSize;
  }

  push(event: TUIEvent): void {
    this.buffer.push(event);
    if (this.buffer.length > this.maxSize) {
      this.buffer.shift();
    }
  }

  getAll(): TUIEvent[] {
    return [...this.buffer];
  }

  getByType(type: TUIEventType): TUIEvent[] {
    return this.buffer.filter(e => e.type === type);
  }

  getByCategory(category: string): TUIEvent[] {
    return this.buffer.filter(e => getEventCategory(e.type) === category);
  }

  getSince(timestamp: number): TUIEvent[] {
    return this.buffer.filter(e => e.timestamp >= timestamp);
  }

  clear(): void {
    this.buffer = [];
  }

  get size(): number {
    return this.buffer.length;
  }
}
