/**
 * Stream Renderer - 流式输出渲染器
 *
 * 实现真正的流式响应，支持打字机效果和事件日志混合输出
 *
 * @module TUI
 * @version 5.0.0
 */

import { stdout } from 'process';
import { DEFAULT_THEME, type Theme } from './renderer.js';
import {
  type TUIEvent,
  getEventIcon,
  getEventCategory,
  getEventPriority,
  truncateText,
} from './tui-events.js';
import { ANSI } from './ansi-codes.js';

export interface StreamOptions {
  typeSpeed?: number;
  typeEffect?: boolean;
  bufferSize?: number;
  theme?: Theme;
  prefix?: string;
  autoWrap?: boolean;
  showEvents?: boolean;
  eventPosition?: 'inline' | 'sidebar' | 'below';
  maxEventWidth?: number;
}

interface PendingEvent {
  event: TUIEvent;
  rendered: boolean;
}

export class StreamRenderer {
  private options: Required<StreamOptions>;
  private buffer: string = '';
  private isRendering: boolean = false;
  private abortController: AbortController | null = null;
  private pendingEvents: PendingEvent[] = [];
  private currentLineLength: number = 0;
  private terminalWidth: number = process.stdout.columns || 80;
  private eventLineCount: number = 0;

  constructor(options: StreamOptions = {}) {
    this.options = {
      typeSpeed: 10,
      typeEffect: true,
      bufferSize: 1024,
      theme: DEFAULT_THEME,
      prefix: '',
      autoWrap: true,
      showEvents: true,
      eventPosition: 'inline',
      maxEventWidth: 40,
      ...options,
    };

    process.stdout.on('resize', () => {
      this.terminalWidth = process.stdout.columns || 80;
    });
  }

  async start(generator: AsyncGenerator<string>): Promise<void> {
    this.abortController = new AbortController();
    this.isRendering = true;
    this.buffer = '';
    this.currentLineLength = 0;
    this.pendingEvents = [];

    try {
      if (this.options.prefix) {
        stdout.write(this.options.prefix);
        this.currentLineLength = this.options.prefix.length;
      }

      for await (const chunk of generator) {
        if (this.abortController.signal.aborted) {
          break;
        }

        if (this.options.typeEffect) {
          await this.typeChunk(chunk);
        } else {
          this.writeChunk(chunk);
        }

        this.buffer += chunk;

        if (this.buffer.length > this.options.bufferSize) {
          this.buffer = this.buffer.slice(-this.options.bufferSize);
        }
      }

      this.flushPendingEvents();
    } finally {
      this.isRendering = false;
      this.abortController = null;
    }
  }

  writeEvent(event: TUIEvent): void {
    if (!this.options.showEvents) return;

    const priority = getEventPriority(event.type);
    if (priority === 'low' && this.pendingEvents.length > 5) return;

    this.pendingEvents.push({ event, rendered: false });

    if (this.options.eventPosition === 'inline') {
      this.renderInlineEvent(event);
    }
  }

  private renderInlineEvent(event: TUIEvent): void {
    const icon = getEventIcon(event.type);
    const category = getEventCategory(event.type);
    const priority = getEventPriority(event.type);

    const priorityColors = {
      high: this.options.theme.error,
      medium: this.options.theme.warning,
      low: this.options.theme.muted,
    };
    const color = priorityColors[priority];

    const eventText = this.formatEventText(event);
    const maxLen = this.options.maxEventWidth;

    if (eventText.length > maxLen) {
      const truncated = truncateText(eventText, maxLen);
      stdout.write(`\n${color}${icon}${ANSI.reset} ${ANSI.dim}[${category}]${ANSI.reset} ${truncated}\n`);
    } else {
      stdout.write(`\n${color}${icon}${ANSI.reset} ${ANSI.dim}[${category}]${ANSI.reset} ${eventText}\n`);
    }

    this.currentLineLength = 0;
    this.eventLineCount++;
  }

  private formatEventText(event: TUIEvent): string {
    const type = event.type;
    const payload = event.payload as Record<string, unknown>;

    switch (type) {
      case 'skill:invoking':
        return `Skill: ${(payload as { skillId: string }).skillId}`;
      case 'skill:completed':
        return `Skill done: ${(payload as { skillId: string }).skillId}`;
      case 'skill:failed':
        return `Skill failed: ${(payload as { skillId: string }).skillId}`;
      case 'tool:invoking':
        return `Tool: ${(payload as { toolId: string }).toolId}`;
      case 'tool:completed':
        return `Tool done: ${(payload as { toolId: string }).toolId}`;
      case 'tool:failed':
        return `Tool failed: ${(payload as { toolId: string }).toolId}`;
      case 'thinking:step':
        return `Thinking: ${(payload as { step: number; totalSteps?: number }).step}${(payload as { totalSteps?: number }).totalSteps ? `/${(payload as { totalSteps?: number }).totalSteps}` : ''}`;
      case 'mcp:tool:call':
        return `MCP: ${(payload as { toolName?: string }).toolName || 'tool'}`;
      case 'execution:step':
        return `Step: ${(payload as { step: string }).step}`;
      default:
        return type.split(':')[1] || type;
    }
  }

  private writeChunk(chunk: string): void {
    stdout.write(chunk);
    const lastNewline = chunk.lastIndexOf('\n');
    if (lastNewline >= 0) {
      this.currentLineLength = chunk.length - lastNewline - 1;
    } else {
      this.currentLineLength += chunk.length;
    }
  }

  private async typeChunk(chunk: string): Promise<void> {
    for (const char of chunk) {
      if (this.abortController?.signal.aborted) {
        break;
      }

      stdout.write(char);

      if (char === '\n') {
        this.currentLineLength = 0;
      } else {
        this.currentLineLength++;
      }

      const delay = this.getTypeDelay(char);
      await this.sleep(delay);
    }
  }

  private flushPendingEvents(): void {
    for (const pending of this.pendingEvents) {
      if (!pending.rendered && this.options.eventPosition === 'below') {
        this.renderInlineEvent(pending.event);
        pending.rendered = true;
      }
    }
    this.pendingEvents = [];
  }

  private getTypeDelay(char: string): number {
    if (char === '\n') return this.options.typeSpeed * 5;
    if (/[.!?。！？]/.test(char)) return this.options.typeSpeed * 3;
    if (/[,;，；]/.test(char)) return this.options.typeSpeed * 2;
    return this.options.typeSpeed;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  stop(): void {
    if (this.abortController) {
      this.abortController.abort();
    }
  }

  getBuffer(): string {
    return this.buffer;
  }

  get rendering(): boolean {
    return this.isRendering;
  }

  getEventCount(): number {
    return this.eventLineCount;
  }

  reset(): void {
    this.buffer = '';
    this.currentLineLength = 0;
    this.pendingEvents = [];
    this.eventLineCount = 0;
  }
}

export function createStreamRenderer(options?: StreamOptions): StreamRenderer {
  return new StreamRenderer(options);
}

export async function streamOutput(
  generator: AsyncGenerator<string>,
  options?: StreamOptions
): Promise<void> {
  const renderer = new StreamRenderer(options);
  await renderer.start(generator);
}

export class EnhancedStreamRenderer extends StreamRenderer {
  private thinkingIndicator: boolean = false;
  private lastThinkingUpdate: number = 0;

  showThinkingIndicator(show: boolean): void {
    this.thinkingIndicator = show;
    if (show) {
      stdout.write(`${ANSI.dim}🧠 Thinking...${ANSI.reset}`);
    } else {
      stdout.write(`\r${ANSI.clearLine}`);
    }
  }

  updateThinkingProgress(step: number, total?: number, thought?: string): void {
    if (!this.thinkingIndicator) return;

    const now = Date.now();
    if (now - this.lastThinkingUpdate < 100) return;
    this.lastThinkingUpdate = now;

    const progress = total ? ` ${step}/${total}` : ` ${step}`;
    const thoughtPreview = thought ? ` - ${truncateText(thought, 30)}` : '';

    stdout.write(`\r${ANSI.clearLine}${ANSI.dim}🧠 Thinking${progress}${thoughtPreview}${ANSI.reset}`);
  }

  hideThinkingIndicator(): void {
    if (this.thinkingIndicator) {
      stdout.write(`\r${ANSI.clearLine}`);
      this.thinkingIndicator = false;
    }
  }
}

export function createEnhancedStreamRenderer(options?: StreamOptions): EnhancedStreamRenderer {
  return new EnhancedStreamRenderer(options);
}
