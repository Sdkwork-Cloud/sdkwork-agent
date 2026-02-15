/**
 * TUI Events - TUI 事件系统
 *
 * 统一的事件类型定义，支持 Agent 所有事件的可视化
 *
 * @module TUI
 * @version 5.0.0
 */

import type { AgentEventType } from '../core/domain/agent.js';

export type TUIEventType =
  | AgentEventType
  | 'tui:ready'
  | 'tui:input'
  | 'tui:output'
  | 'tui:error'
  | 'tui:command'
  | 'mcp:connecting'
  | 'mcp:connected'
  | 'mcp:disconnected'
  | 'mcp:error'
  | 'mcp:tool:call'
  | 'mcp:tool:result'
  | 'mcp:resource:read'
  | 'mcp:prompt:get'
  | 'script:started'
  | 'script:step'
  | 'script:completed'
  | 'script:failed'
  | 'plugin:loaded'
  | 'plugin:unloaded'
  | 'plugin:error'
  | 'thinking:start'
  | 'thinking:step'
  | 'thinking:end'
  | 'stream:start'
  | 'stream:chunk'
  | 'stream:end';

export interface TUIEvent<T = unknown> {
  type: TUIEventType;
  timestamp: number;
  payload: T;
  metadata?: {
    source?: string;
    sessionId?: string;
    executionId?: string;
    duration?: number;
  };
}

export interface AgentEventPayload {
  agentId: string;
  timestamp?: number;
  capabilities?: {
    skills: number;
    tools: number;
    memory: boolean;
    mcp?: number;
    plugins?: number;
  };
}

export interface ChatStartedPayload {
  sessionId: string;
  executionId: string;
  messageCount: number;
}

export interface ChatCompletedPayload {
  sessionId: string;
  executionId: string;
  tokenUsage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export interface ChatErrorPayload {
  sessionId: string;
  executionId: string;
  error: string;
}

export interface SkillEventPayload {
  skillId: string;
  skillName?: string;
  executionId: string;
  input?: string;
  success?: boolean;
  result?: unknown;
  error?: string;
  duration?: number;
}

export interface ToolEventPayload {
  toolId: string;
  toolName?: string;
  executionId: string;
  input?: unknown;
  success?: boolean;
  result?: unknown;
  error?: string;
  duration?: number;
}

export interface MCPEventPayload {
  serverId: string;
  serverName?: string;
  toolName?: string;
  parameters?: unknown;
  result?: unknown;
  error?: string;
  connected?: boolean;
}

export interface ScriptEventPayload {
  scriptId: string;
  scriptName?: string;
  step?: number;
  totalSteps?: number;
  stepName?: string;
  result?: unknown;
  error?: string;
  duration?: number;
}

export interface PluginEventPayload {
  pluginId: string;
  pluginName?: string;
  version?: string;
  error?: string;
}

export interface ThinkingEventPayload {
  thoughtId: string;
  step?: number;
  totalSteps?: number;
  thought?: string;
  action?: string;
  observation?: string;
  conclusion?: string;
}

export interface StreamEventPayload {
  content?: string;
  delta?: string;
  done?: boolean;
}

export interface ExecutionStepPayload {
  step: string;
  data?: unknown;
  oldState?: string;
  newState?: string;
  timestamp?: number;
}

export const EVENT_ICONS: Record<string, string> = {
  'agent:initialized': '🚀',
  'agent:started': '✅',
  'agent:stopped': '🛑',
  'agent:destroyed': '💀',
  'agent:error': '❌',
  'agent:reset': '🔄',
  'chat:started': '💬',
  'chat:message': '📝',
  'chat:stream': '🌊',
  'chat:completed': '✓',
  'chat:aborted': '⏹',
  'chat:error': '⚠',
  'execution:started': '▶',
  'execution:step': '▸',
  'execution:progress': '⏳',
  'execution:completed': '✓',
  'execution:failed': '✗',
  'tool:invoking': '🔧',
  'tool:invoked': '🔩',
  'tool:completed': '✓',
  'tool:failed': '✗',
  'skill:invoking': '⚡',
  'skill:invoked': '🎯',
  'skill:completed': '✓',
  'skill:failed': '✗',
  'memory:stored': '💾',
  'memory:retrieved': '📖',
  'memory:searched': '🔍',
  'mcp:connecting': '🔌',
  'mcp:connected': '🔗',
  'mcp:disconnected': '断',
  'mcp:error': '⚠',
  'mcp:tool:call': '🛠',
  'mcp:tool:result': '📋',
  'mcp:resource:read': '📄',
  'mcp:prompt:get': '💬',
  'script:started': '📜',
  'script:step': '▸',
  'script:completed': '✓',
  'script:failed': '✗',
  'plugin:loaded': '📦',
  'plugin:unloaded': '📤',
  'plugin:error': '⚠',
  'thinking:start': '🧠',
  'thinking:step': '💭',
  'thinking:end': '💡',
  'stream:start': '🌊',
  'stream:chunk': '▸',
  'stream:end': '✓',
  'tui:ready': '🖥',
  'tui:input': '⌨',
  'tui:output': '📺',
  'tui:error': '⚠',
  'tui:command': '⚡',
};

export const EVENT_CATEGORIES: Record<string, string> = {
  'agent:': 'Agent',
  'chat:': 'Chat',
  'execution:': 'Execution',
  'tool:': 'Tool',
  'skill:': 'Skill',
  'memory:': 'Memory',
  'mcp:': 'MCP',
  'script:': 'Script',
  'plugin:': 'Plugin',
  'thinking:': 'Thinking',
  'stream:': 'Stream',
  'tui:': 'TUI',
};

export const EVENT_PRIORITIES: Record<string, 'high' | 'medium' | 'low'> = {
  'agent:error': 'high',
  'chat:error': 'high',
  'execution:failed': 'high',
  'tool:failed': 'high',
  'skill:failed': 'high',
  'mcp:error': 'high',
  'script:failed': 'high',
  'plugin:error': 'high',
  'tui:error': 'high',
  'agent:initialized': 'medium',
  'agent:started': 'medium',
  'agent:destroyed': 'medium',
  'chat:started': 'medium',
  'chat:completed': 'medium',
  'skill:invoking': 'medium',
  'skill:completed': 'medium',
  'tool:invoking': 'medium',
  'tool:completed': 'medium',
  'mcp:connected': 'medium',
  'mcp:disconnected': 'medium',
  'script:started': 'medium',
  'script:completed': 'medium',
  'plugin:loaded': 'medium',
  'thinking:start': 'medium',
  'thinking:end': 'medium',
};

export function getEventIcon(type: string): string {
  return EVENT_ICONS[type] || '•';
}

export function getEventCategory(type: string): string {
  for (const [prefix, category] of Object.entries(EVENT_CATEGORIES)) {
    if (type.startsWith(prefix)) {
      return category;
    }
  }
  return 'System';
}

export function getEventPriority(type: string): 'high' | 'medium' | 'low' {
  return EVENT_PRIORITIES[type] || 'low';
}

export function formatEventTimestamp(timestamp: number): string {
  const date = new Date(timestamp);
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  const seconds = date.getSeconds().toString().padStart(2, '0');
  const ms = date.getMilliseconds().toString().padStart(3, '0');
  return `${hours}:${minutes}:${seconds}.${ms}`;
}

export function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`;
}

export function truncateText(text: string, maxLength: number = 60): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 3) + '...';
}
