/**
 * TUI Module - Terminal User Interface
 *
 * 专业级终端交互界面组件库
 * 参考 Claude Code、Codex CLI、OpenCode 等顶级 AI CLI 工具设计
 *
 * @module TUI
 * @version 5.0.0
 */

import { TUIRenderer, LoadingIndicator, ProgressBar, ThinkingDisplay, createRenderer, DEFAULT_THEME, THEMES } from './renderer.js';
import type { Theme } from './renderer.js';
import { MarkdownRenderer, renderMarkdown, printMarkdown } from './markdown-renderer.js';
import { StreamRenderer, EnhancedStreamRenderer, createStreamRenderer, createEnhancedStreamRenderer, streamOutput } from './stream-renderer.js';
import type { StreamOptions } from './stream-renderer.js';
import { MultilineInput, readMultiline } from './multiline-input.js';
import type { MultilineOptions } from './multiline-input.js';
import { InteractiveSelector, MultiSelector, SelectorBuilder, select, confirm, prompt, promptWithValidation, createSelector } from './selector.js';
import type { SelectOption, SelectConfig, PromptOptions } from './selector.js';
import { EventLogger, EventBuffer, createEventLogger } from './event-logger.js';
import { ConversationManager, createConversationManager } from './conversation-manager.js';
import {
  type TUIEvent,
  type TUIEventType,
  type AgentEventPayload,
  type ChatStartedPayload,
  type ChatCompletedPayload,
  type ChatErrorPayload,
  type SkillEventPayload,
  type ToolEventPayload,
  type MCPEventPayload,
  type ScriptEventPayload,
  type PluginEventPayload,
  type ThinkingEventPayload,
  type StreamEventPayload,
  type ExecutionStepPayload,
  EVENT_ICONS,
  EVENT_CATEGORIES,
  EVENT_PRIORITIES,
  getEventIcon,
  getEventCategory,
  getEventPriority,
  formatEventTimestamp,
  formatDuration,
  truncateText,
} from './tui-events.js';
import { ANSI, COLORS, colorize, bold, dim, underline } from './ansi-codes.js';

export {
  TUIRenderer,
  LoadingIndicator,
  ProgressBar,
  ThinkingDisplay,
  createRenderer,
  DEFAULT_THEME,
  THEMES,
};
export type { Theme };

export {
  MarkdownRenderer,
  renderMarkdown,
  printMarkdown,
};

export {
  StreamRenderer,
  EnhancedStreamRenderer,
  createStreamRenderer,
  createEnhancedStreamRenderer,
  streamOutput,
};
export type { StreamOptions };

export {
  MultilineInput,
  readMultiline,
};
export type { MultilineOptions };

export {
  InteractiveSelector,
  MultiSelector,
  SelectorBuilder,
  select,
  confirm,
  prompt,
  promptWithValidation,
  createSelector,
};
export type { SelectOption, SelectConfig, PromptOptions };

export {
  EventLogger,
  EventBuffer,
  createEventLogger,
};

export {
  ConversationManager,
  createConversationManager,
};

export {
  EVENT_ICONS,
  EVENT_CATEGORIES,
  EVENT_PRIORITIES,
  getEventIcon,
  getEventCategory,
  getEventPriority,
  formatEventTimestamp,
  formatDuration,
  truncateText,
};

export type {
  TUIEvent,
  TUIEventType,
  AgentEventPayload,
  ChatStartedPayload,
  ChatCompletedPayload,
  ChatErrorPayload,
  SkillEventPayload,
  ToolEventPayload,
  MCPEventPayload,
  ScriptEventPayload,
  PluginEventPayload,
  ThinkingEventPayload,
  StreamEventPayload,
  ExecutionStepPayload,
};

export type {
  ConversationMessage,
  ConversationSession,
  ConversationStats,
  ToolCallRecord,
  SkillCallRecord,
  ThinkingRecord,
} from './conversation-manager.js';

export { ANSI, COLORS, colorize, bold, dim, underline };
export { main } from './cli.js';
