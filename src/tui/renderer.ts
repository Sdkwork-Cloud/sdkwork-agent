#!/usr/bin/env node
/**
 * TUI Renderer - 专业级终端渲染器
 *
 * 参考 Claude Code、Codex CLI、OpenClaw、OpenCode 等顶级工具设计
 * 融合行业最佳实践 - 完美的视觉体验
 *
 * @module TUI
 * @version 6.0.0
 */

import { stdout } from 'process';
import { ANSI } from './ansi-codes.js';
import {
  DEFAULT_THEME,
  highlightCode,
  type Theme,
} from './theme.js';

// ============================================
// 等待短语 - 参考 OpenClaw 设计
// ============================================

const WAITING_PHRASES = [
  '正在分析...',
  '处理中...',
  '请稍候...',
  '努力工作中...',
  '马上就好...',
];

// ============================================
// 加载动画
// ============================================

const SPINNER_FRAMES = {
  dots: ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'],
  line: ['-', '\\', '|', '/'],
  bounce: ['⠁', '⠃', '⠇', '⡇', '⣇', '⣧', '⣷', '⣾', '⣽', '⣻', '⢿', '⡿', '⣟', '⣯', '⣷'],
  pulse: ['█', '▓', '▒', '░', '▒', '▓'],
  arrow: ['▹▹▹▹▹', '▸▹▹▹▹', '▹▸▹▹▹', '▹▹▸▹▹', '▹▹▹▸▹', '▹▹▹▹▸'],
  moon: ['🌑', '🌒', '🌓', '🌔', '🌕', '🌖', '🌗', '🌘'],
};

type SpinnerStyle = keyof typeof SPINNER_FRAMES;

export class LoadingIndicator {
  private interval: NodeJS.Timeout | null = null;
  private currentFrame = 0;
  private message = '';
  private theme: Theme;
  private style: SpinnerStyle = 'dots';
  private prefix = '';
  private waitingTick = 0;
  private waitingPhrase: string | null = null;

  constructor(theme: Theme = DEFAULT_THEME, style: SpinnerStyle = 'dots') {
    this.theme = theme;
    this.style = style;
  }

  start(message: string, prefix: string = ''): void {
    this.stop();
    this.message = message;
    this.prefix = prefix;
    this.currentFrame = 0;
    this.waitingTick = 0;
    this.waitingPhrase = WAITING_PHRASES[Math.floor(Math.random() * WAITING_PHRASES.length)];
    this.render();

    const frameCount = SPINNER_FRAMES[this.style].length;
    const interval = this.style === 'bounce' ? 60 : this.style === 'pulse' ? 100 : 80;

    this.interval = setInterval(() => {
      this.currentFrame = (this.currentFrame + 1) % frameCount;
      this.waitingTick++;
      this.render();
    }, interval);
  }

  update(message: string): void {
    this.message = message;
    this.render();
  }

  stop(finalMessage?: string): void {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
      if (finalMessage) {
        stdout.write(ANSI.cursorHome + ANSI.clearLine + finalMessage + '\n');
      } else {
        stdout.write(ANSI.cursorHome + ANSI.clearLine);
      }
    }
  }

  succeed(message?: string): void {
    this.stop(`${this.theme.success('✓')} ${message || this.message}`);
  }

  fail(message?: string): void {
    this.stop(`${this.theme.error('✗')} ${message || this.message}`);
  }

  destroy(): void {
    this.stop();
  }

  private render(): void {
    const frames = SPINNER_FRAMES[this.style];
    const frame = frames[this.currentFrame];
    const prefix = this.prefix ? `${this.theme.accent(this.prefix)} ` : '';
    
    let displayMessage = this.message;
    if (this.waitingPhrase && this.waitingTick % 10 === 0) {
      displayMessage = `${this.message} ${this.theme.dim(this.waitingPhrase)}`;
    }

    const output = `${prefix}${this.theme.accent(frame)} ${displayMessage}`;
    stdout.write(ANSI.cursorHome + ANSI.clearLine + output);
  }
}

// ============================================
// 进度条
// ============================================

export class ProgressBar {
  private theme: Theme;
  private width: number;
  private started = false;
  private startTime = 0;

  constructor(theme: Theme = DEFAULT_THEME, width: number = 40) {
    this.theme = theme;
    this.width = width;
  }

  update(current: number, total: number, message?: string): void {
    if (!this.started) {
      this.started = true;
      this.startTime = Date.now();
    }

    const percent = Math.min(100, Math.max(0, (current / total) * 100));
    const filled = Math.round((percent / 100) * this.width);
    const empty = this.width - filled;

    const bar = `${this.theme.success('█'.repeat(filled))}${this.theme.dim('░'.repeat(empty))}`;
    const percentStr = `${percent.toFixed(1)}%`.padStart(6);
    const countStr = `${current}/${total}`.padStart(10);

    let output = `${bar} ${this.theme.accent(percentStr)} ${this.theme.dim(countStr)}`;
    if (message) {
      output += ` ${this.theme.dim(message)}`;
    }

    stdout.write(ANSI.cursorHome + ANSI.clearLine + output);
  }

  complete(message?: string): void {
    const duration = Date.now() - this.startTime;
    const durationStr = this.formatDuration(duration);
    stdout.write(ANSI.cursorHome + ANSI.clearLine);
    if (message) {
      console.log(`${this.theme.success('✓')} ${message} ${this.theme.dim(`(${durationStr})`)}`);
    }
    this.started = false;
  }

  private formatDuration(ms: number): string {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`;
  }
}

// ============================================
// 渲染器
// ============================================

export class TUIRenderer {
  private theme: Theme;
  private loading: LoadingIndicator;
  private progressBar: ProgressBar;

  constructor(theme: Theme = DEFAULT_THEME) {
    this.theme = theme;
    this.loading = new LoadingIndicator(theme);
    this.progressBar = new ProgressBar(theme);
  }

  getTerminalWidth(): number {
    return process.stdout.columns || 80;
  }

  write(text: string): void {
    stdout.write(text);
  }

  newline(count = 1): void {
    stdout.write('\n'.repeat(count));
  }

  clear(): void {
    stdout.write(ANSI.cursorHome + ANSI.clearScreen);
  }

  clearLine(): void {
    stdout.write(ANSI.cursorHome + ANSI.clearLine);
  }

  setTheme(theme: Theme): void {
    this.theme = theme;
    this.loading.destroy();
    this.loading = new LoadingIndicator(theme);
    this.progressBar = new ProgressBar(theme);
  }

  getTheme(): Theme {
    return this.theme;
  }

  primary(text: string): string {
    return this.theme.accent(text);
  }

  secondary(text: string): string {
    return this.theme.dim(text);
  }

  success(text: string): string {
    return this.theme.success(text);
  }

  warning(text: string): string {
    return this.theme.warning(text);
  }

  error(text: string): string {
    return this.theme.error(text);
  }

  info(text: string): string {
    return this.theme.info(text);
  }

  accent(text: string): string {
    return this.theme.accent(text);
  }

  muted(text: string): string {
    return this.theme.dim(text);
  }

  dim(text: string): string {
    return this.theme.dim(text);
  }

  bold(text: string): string {
    return this.theme.bold(text);
  }

  italic(text: string): string {
    return this.theme.italic(text);
  }

  underline(text: string): string {
    return this.theme.underline(text);
  }

  strike(text: string): string {
    return this.theme.strike(text);
  }

  highlight(text: string): string {
    return this.theme.bold(this.theme.accent(text));
  }

  gradient(text: string): string {
    const chars = text.split('');
    const colors = [this.theme.accent, this.theme.accentSoft, this.theme.info];
    return chars.map((char, i) => colors[i % colors.length](char)).join('');
  }

  // 兼容旧接口
  tokenUsage(promptTokens: number, completionTokens: number): void {
    const total = promptTokens + completionTokens;
    const bar = this.createMiniBar(total, 1000);
    console.log(this.muted(`  Tokens: ${bar} ${promptTokens} + ${completionTokens} = ${total}`));
  }

  private createMiniBar(value: number, max: number): string {
    const width = 10;
    const filled = Math.round((value / max) * width);
    return `${this.theme.success('█'.repeat(Math.min(filled, width)))}${this.theme.dim('░'.repeat(Math.max(0, width - filled)))}`;
  }

  statusBar(left: string, right: string): void {
    const rightWidth = right.length + 2;
    const leftWidth = this.getTerminalWidth() - rightWidth - 2;
    const leftPadded = left.slice(0, leftWidth).padEnd(leftWidth);
    console.log(`${ANSI.reverse}${leftPadded} ${right} ${ANSI.reset}`);
  }

  promptLine(config: { model?: string; ready?: boolean }): string {
    const status = config.ready !== false ? this.success('●') : this.warning('○');
    const model = config.model ? this.dim(`[${config.model}]`) : '';
    return `${status} ${model} ${this.primary('❯')} `;
  }

  footer(lines: string[]): void {
    const width = this.getTerminalWidth();
    console.log('');
    console.log(`${this.theme.dim(`╭${'─'.repeat(width - 2)}╮`)}`);
    for (const line of lines) {
      console.log(`${this.theme.dim(`│`)} ${this.dim(line)}${' '.repeat(Math.max(0, width - line.length - 3))}${this.theme.dim(`│`)}`);
    }
    console.log(`${this.theme.dim(`╰${'─'.repeat(width - 2)}╯`)}`);
    console.log('');
  }

  table(headers: string[], rows: string[][], options?: {
    style?: 'rounded' | 'borderless' | 'compact';
    alignments?: Array<'left' | 'center' | 'right'>;
    maxHeight?: number;
  }): void {
    const style = options?.style ?? 'rounded';
    const alignments = options?.alignments ?? headers.map(() => 'left');
    const maxHeight = options?.maxHeight ?? 0;
    
    const widths = headers.map((h, i) => {
      const maxRowLen = Math.max(...rows.map(r => r[i]?.length || 0));
      return Math.max(h.length, maxRowLen);
    });
    
    const totalWidth = widths.reduce((a, b) => a + b, 0) + (widths.length - 1) * 3 + 4;
    const border = this.theme.dim('─'.repeat(totalWidth - 2));
    
    if (style === 'rounded') {
      console.log(`  ${this.theme.dim('┌')}${border.slice(2, -5)}${this.theme.dim('┐')}`);
      
      const headerRow = headers.map((h, i) => {
        const padded = h.padEnd(widths[i], ' ');
        return alignments[i] === 'center' 
          ? this.center(h, widths[i]) 
          : (alignments[i] === 'right' ? padded.padStart(widths[i]) : padded);
      }).join(` ${this.dim('│')} `);
      console.log(`  ${this.theme.dim('│')} ${this.bold(headerRow)} ${this.theme.dim('│')}`);
      console.log(`  ${this.theme.dim('├')}${border.slice(2, -5)}${this.theme.dim('┤')}`);
      
      let visibleRows = rows;
      if (maxHeight > 0 && rows.length > maxHeight) {
        visibleRows = rows.slice(0, maxHeight);
        const truncated = rows.length - maxHeight;
        for (const row of visibleRows) {
          const rowStr = row.map((cell, i) => {
            const content = cell || '';
            return alignments[i] === 'center' 
              ? this.center(content, widths[i]) 
              : (alignments[i] === 'right' ? content.padStart(widths[i]) : content.padEnd(widths[i]));
          }).join(` ${this.dim('│')} `);
          console.log(`  ${this.theme.dim('│')} ${rowStr} ${this.theme.dim('│')}`);
        }
        console.log(`  ${this.theme.dim('│')} ${this.dim(`... 还有 ${truncated} 行`)}${' '.repeat(totalWidth - 20)}${this.theme.dim('│')}`);
      } else {
        for (const row of visibleRows) {
          const rowStr = row.map((cell, i) => {
            const content = cell || '';
            return alignments[i] === 'center' 
              ? this.center(content, widths[i]) 
              : (alignments[i] === 'right' ? content.padStart(widths[i]) : content.padEnd(widths[i]));
          }).join(` ${this.dim('│')} `);
          console.log(`  ${this.theme.dim('│')} ${rowStr} ${this.theme.dim('│')}`);
        }
      }
      
      console.log(`  ${this.theme.dim('└')}${border.slice(2, -5)}${this.theme.dim('┘')}`);
    } else if (style === 'borderless') {
      const headerRow = headers.join('  ');
      console.log(this.bold(headerRow));
      for (const row of rows) {
        console.log(row.join('  '));
      }
    } else if (style === 'compact') {
      console.log(headers.join(' │ '));
      console.log(widths.map(w => '─'.repeat(w)).join('─┼─'));
      for (const row of rows) {
        console.log(row.join(' │ '));
      }
    }
  }

  private center(text: string, width: number): string {
    const padding = Math.max(0, width - text.length);
    const left = Math.floor(padding / 2);
    return ' '.repeat(left) + text + ' '.repeat(padding - left);
  }

  keyValuePair(pairs: [string, string | number | boolean][], title?: string): void {
    if (title) {
      console.log(`  ${this.bold(title)}`);
    }
    const maxKeyLen = Math.max(...pairs.map(([k]) => k.length));
    for (const [key, value] of pairs) {
      const keyStr = this.dim(key.padEnd(maxKeyLen + 1));
      const valueStr = typeof value === 'boolean' 
        ? (value ? this.success('✓') : this.error('✗'))
        : this.primary(String(value));
      console.log(`    ${keyStr} ${valueStr}`);
    }
  }

  json(data: unknown, options?: {
    indent?: number;
    maxDepth?: number;
    theme?: 'colored' | 'plain';
    collapsed?: boolean;
  }): void {
    const indent = options?.indent ?? 2;
    const maxDepth = options?.maxDepth ?? 3;
    const theme = options?.theme ?? 'colored';
    const collapsed = options?.collapsed ?? false;
    
    const formatJson = (obj: unknown, depth: number, inArray: boolean): string => {
      if (obj === null) return this.theme.null('null');
      if (obj === undefined) return this.theme.null('undefined');
      
      if (typeof obj === 'boolean') {
        return obj ? this.theme.success('true') : this.theme.error('false');
      }
      
      if (typeof obj === 'number') {
        return this.theme.number(String(obj));
      }
      
      if (typeof obj === 'string') {
        if (theme === 'colored') {
          return this.theme.string(`"${obj}"`);
        }
        return `"${obj}"`;
      }
      
      if (Array.isArray(obj)) {
        if (obj.length === 0) return this.theme.dim('[]');
        if (depth >= maxDepth && !collapsed) {
          return this.theme.dim(`[Array(${obj.length})]`);
        }
        const items = obj.map(item => formatJson(item, depth + 1, true));
        if (theme === 'colored') {
          return `${this.theme.dim('[')}\n${' '.repeat((depth + 1) * indent)}${items.join(this.dim(', '))}\n${' '.repeat(depth * indent)}${this.theme.dim(']')}`;
        }
        return `[${items.join(', ')}]`;
      }
      
      if (typeof obj === 'object') {
        const entries = Object.entries(obj as Record<string, unknown>);
        if (entries.length === 0) return this.theme.dim('{}');
        if (depth >= maxDepth && !collapsed) {
          return this.theme.dim(`{Object(${entries.length})}`);
        }
        const items = entries.map(([key, value]) => {
          const formattedValue = formatJson(value, depth + 1, false);
          if (theme === 'colored') {
            return `${this.theme.key(key)}: ${formattedValue}`;
          }
          return `"${key}": ${formattedValue}`;
        });
        if (theme === 'colored') {
          return `${this.theme.dim('{')}\n${' '.repeat((depth + 1) * indent)}${items.join(this.dim(',\n') + ' '.repeat((depth + 1) * indent))}\n${' '.repeat(depth * indent)}${this.theme.dim('}')}`;
        }
        return `{${items.join(', ')}}`;
      }
      
      return String(obj);
    };
    
    console.log(formatJson(data, 0, false));
  }

  tree(data: Record<string, unknown>, options?: {
    indent?: number;
    maxDepth?: number;
    collapsed?: boolean;
  }): void {
    const indent = options?.indent ?? 2;
    const maxDepth = options?.maxDepth ?? 3;
    const collapsed = options?.collapsed ?? false;
    
    const renderTree = (obj: unknown, key: string | null, depth: number, isLast: boolean, prefix: string): void => {
      const connector = isLast ? '└── ' : '├── ';
      const childPrefix = isLast ? '    ' : '│   ';
      
      if (obj === null || obj === undefined) {
        const displayKey = key !== null ? `${connector}${key}: ` : '';
        console.log(`${prefix}${displayKey}${this.theme.null(String(obj))}`);
        return;
      }
      
      if (typeof obj === 'boolean') {
        const displayKey = key !== null ? `${connector}${key}: ` : '';
        const value = obj ? this.theme.success('true') : this.theme.error('false');
        console.log(`${prefix}${displayKey}${value}`);
        return;
      }
      
      if (typeof obj === 'number') {
        const displayKey = key !== null ? `${connector}${key}: ` : '';
        console.log(`${prefix}${displayKey}${this.theme.number(String(obj))}`);
        return;
      }
      
      if (typeof obj === 'string') {
        const displayKey = key !== null ? `${connector}${key}: ` : '';
        console.log(`${prefix}${displayKey}${this.theme.string(`"${obj}"`)}`);
        return;
      }
      
      if (Array.isArray(obj)) {
        const displayKey = key !== null ? `${connector}${key}` : '';
        const label = obj.length > 0 ? `${displayKey} [${obj.length}]` : `${displayKey} []`;
        console.log(`${prefix}${this.theme.dim(label)}`);
        
        if (depth >= maxDepth && !collapsed) {
          console.log(`${prefix}${childPrefix}${this.theme.dim('...')}`);
          return;
        }
        
        obj.forEach((item, index) => {
          renderTree(item, `[${index}]`, depth + 1, index === obj.length - 1, prefix + childPrefix);
        });
        return;
      }
      
      if (typeof obj === 'object') {
        const entries = Object.entries(obj as Record<string, unknown>);
        const displayKey = key !== null ? `${connector}${key}` : '';
        const label = entries.length > 0 ? `${displayKey} {${entries.length}}` : `${displayKey} {}`;
        console.log(`${prefix}${this.theme.dim(label)}`);
        
        if (depth >= maxDepth && !collapsed) {
          console.log(`${prefix}${childPrefix}${this.theme.dim('...')}`);
          return;
        }
        
        entries.forEach(([k, v], index) => {
          renderTree(v, k, depth + 1, index === entries.length - 1, prefix + childPrefix);
        });
        return;
      }
      
      const displayKey = key !== null ? `${connector}${key}: ` : '';
      console.log(`${prefix}${displayKey}${String(obj)}`);
    };
    
    console.log(this.theme.bold('Tree View:'));
    console.log(this.theme.dim('─'.repeat(40)));
    renderTree(data, null, 0, true, '');
    console.log(this.theme.dim('─'.repeat(40)));
  }

  progressBarText(current: number, total: number, label?: string, width: number = 20): string {
    const percent = total > 0 ? Math.min(100, (current / total) * 100) : 0;
    const filled = Math.round((percent / 100) * width);
    const empty = width - filled;
    const bar = `${this.theme.success('█'.repeat(filled))}${this.theme.dim('░'.repeat(empty))}`;
    const percentStr = `${percent.toFixed(0)}%`.padStart(4);
    const labelStr = label ? `${label}: ` : '';
    return `${this.dim(labelStr)}${bar} ${this.primary(percentStr)}`;
  }

  startLoading(message: string, prefix: string = ''): void {
    this.loading.start(message, prefix);
  }

  updateLoading(message: string): void {
    this.loading.update(message);
  }

  stopLoading(): void {
    this.loading.stop();
  }

  succeedLoading(message?: string): void {
    this.loading.succeed(message);
  }

  failLoading(message?: string): void {
    this.loading.fail(message);
  }

  updateProgress(current: number, total: number, message?: string): void {
    this.progressBar.update(current, total, message);
  }

  completeProgress(message?: string): void {
    this.progressBar.complete(message);
  }

  box(content: string[], title?: string, style: 'single' | 'double' | 'rounded' = 'rounded'): void {
    const width = Math.min(this.getTerminalWidth() - 4, 76);
    const chars = {
      single: { tl: '┌', tr: '┐', bl: '└', br: '┘', h: '─', v: '│', lt: '├', rt: '┤', tt: '┬', bt: '┴', x: '┼' },
      double: { tl: '╔', tr: '╗', bl: '╚', br: '╝', h: '═', v: '║', lt: '╠', rt: '╣', tt: '╦', bt: '╩', x: '╬' },
      rounded: { tl: '╭', tr: '╮', bl: '╰', br: '╯', h: '─', v: '│', lt: '├', rt: '┤', tt: '┬', bt: '┴', x: '┼' },
    };
    const c = chars[style];
    const horizontal = c.h.repeat(width);

    this.newline();
    console.log(this.theme.border(`${c.tl}${horizontal}${c.tr}`));

    if (title) {
      const titleLine = `${c.v} ${this.theme.bold(title)}${' '.repeat(Math.max(0, width - title.length - 1))}${c.v}`;
      console.log(this.theme.border(titleLine));
      console.log(this.theme.border(`${c.lt}${horizontal}${c.rt}`));
    }

    for (const line of content) {
      const truncated = line.slice(0, width - 4);
      const padded = truncated + ' '.repeat(Math.max(0, width - truncated.length - 4));
      console.log(this.theme.border(`${c.v} ${padded} ${c.v}`));
    }

    console.log(this.theme.border(`${c.bl}${horizontal}${c.br}`));
    this.newline();
  }

  divider(label?: string, char: string = '─'): void {
    const width = this.getTerminalWidth() - 2;
    if (label) {
      const labelWidth = label.length + 2;
      const leftWidth = Math.floor((width - labelWidth) / 2);
      const rightWidth = width - labelWidth - leftWidth;
      console.log(`${this.theme.dim(char.repeat(leftWidth))} ${this.theme.dim(label)} ${this.theme.dim(char.repeat(rightWidth))}`);
    } else {
      console.log(this.theme.dim(char.repeat(width)));
    }
  }

  userMessage(content: string): void {
    const maxWidth = this.getTerminalWidth() - 10;
    const lines = this.wrapText(content, maxWidth);

    this.newline();
    console.log(`${this.theme.userBg(this.theme.bold(' You '))}`);
    lines.forEach(line => {
      console.log(`  ${this.theme.userText(line)}`);
    });
    this.newline();
  }

  assistantMessage(content: string): void {
    const maxWidth = this.getTerminalWidth() - 10;
    const lines = this.wrapText(content, maxWidth);

    this.newline();
    console.log(`${this.theme.assistantBg(this.theme.bold(' Assistant '))}`);
    lines.forEach(line => {
      console.log(`  ${this.theme.assistantText(line)}`);
    });
    this.newline();
  }

  message(role: 'user' | 'assistant', content: string): void {
    if (role === 'user') {
      this.userMessage(content);
    } else {
      this.assistantMessage(content);
    }
  }

  systemMessage(content: string, type: 'info' | 'warning' | 'error' | 'success' = 'info'): void {
    const icons = {
      info: 'ℹ',
      warning: '⚠',
      error: '✗',
      success: '✓',
    };
    const colors = {
      info: this.theme.info,
      warning: this.theme.warning,
      error: this.theme.error,
      success: this.theme.success,
    };

    console.log(`${colors[type](icons[type])} ${this.theme.system(content)}`);
  }

  toolCall(toolName: string, params: Record<string, unknown>, result?: unknown): void {
    this.newline();
    console.log(`${this.theme.toolPendingBg(` 🔧 ${this.theme.bold(toolName)} `)}`);
    console.log(`   ${this.theme.dim('Input:')} ${this.theme.toolOutput(JSON.stringify(params).slice(0, 100))}`);
    if (result !== undefined) {
      const resultStr = typeof result === 'string' ? result : JSON.stringify(result);
      console.log(`   ${this.theme.dim('Output:')} ${this.theme.toolOutput(resultStr.slice(0, 100))}`);
    }
    this.newline();
  }

  toolSuccess(toolName: string, message?: string): void {
    this.newline();
    console.log(`${this.theme.toolSuccessBg(` ✅ ${this.theme.bold(toolName)} `)} ${message ? this.theme.success(message) : ''}`);
    this.newline();
  }

  toolError(toolName: string, error?: string): void {
    this.newline();
    console.log(`${this.theme.toolErrorBg(` ❌ ${this.theme.bold(toolName)} `)} ${error ? this.theme.error(error) : ''}`);
    this.newline();
  }

  codeBlock(code: string, lang?: string): void {
    const highlighted = highlightCode(code, lang);
    const maxWidth = this.getTerminalWidth() - 4;

    this.newline();
    console.log(this.theme.border(`╭${'─'.repeat(maxWidth)}╮`));
    highlighted.forEach((line) => {
      const truncated = line.slice(0, maxWidth - 2);
      const padded = truncated + ' '.repeat(Math.max(0, maxWidth - truncated.length - 2));
      console.log(this.theme.border(`│ ${padded} │`));
    });
    console.log(this.theme.border(`╰${'─'.repeat(maxWidth)}╯`));
    this.newline();
  }

  errorBox(title: string, message: string, hint?: string): void {
    this.newline();
    const width = Math.min(this.getTerminalWidth() - 4, 74);
    const horizontal = '─'.repeat(width);

    console.log(this.theme.error(`╭${horizontal}╮`));
    console.log(this.theme.error(`│ ${this.theme.bold(`✗ ${title}`)}${' '.repeat(Math.max(0, width - title.length - 3))}│`));
    console.log(this.theme.error(`├${horizontal}┤`));

    const lines = this.wrapText(message, width - 4);
    lines.forEach(line => {
      console.log(this.theme.error(`│ ${line.padEnd(width - 2)}│`));
    });

    if (hint) {
      console.log(this.theme.error(`├${horizontal}┤`));
      const hintLines = this.wrapText(hint, width - 4);
      hintLines.forEach(line => {
        console.log(this.theme.border(`│ ${this.theme.dim(line).padEnd(width - 2)}│`));
      });
    }

    console.log(this.theme.error(`╰${horizontal}╯`));
    this.newline();
  }

  successBox(title: string, message: string): void {
    this.newline();
    const width = Math.min(this.getTerminalWidth() - 4, 74);
    const horizontal = '─'.repeat(width);

    console.log(this.theme.success(`╭${horizontal}╮`));
    console.log(this.theme.success(`│ ${this.theme.bold(`✓ ${title}`)}${' '.repeat(Math.max(0, width - title.length - 3))}│`));
    console.log(this.theme.success(`├${horizontal}┤`));

    const lines = this.wrapText(message, width - 4);
    lines.forEach(line => {
      console.log(this.theme.success(`│ ${line.padEnd(width - 2)}│`));
    });

    console.log(this.theme.success(`╰${horizontal}╯`));
    this.newline();
  }

  welcome(config: { name: string; version?: string; description?: string; provider?: string; model?: string }): void {
    this.clear();

    const art = [
      '',
      '  ███████╗██████╗ ██╗  ██╗██╗    ██╗ ██████╗ ██████╗ ██╗  ██╗',
      '  ██╔════╝██╔══██╗██║ ██╔╝██║    ██║██╔═══██╗██╔══██╗██║ ██╔╝',
      '  ███████╗██║  ██║█████╔╝ ██║ █╗ ██║██║   ██║██████╔╝█████╔╝ ',
      '  ╚════██║██║  ██║██╔═██╗ ██║███╗██║██║   ██║██╔══██╗██╔═██╗ ',
      '  ███████║██████╔╝██║  ██╗╚███╔███╔╝╚██████╔╝██║  ██║██║  ██╗',
      '  ╚══════╝╚═════╝ ╚═╝  ╚═╝ ╚══╝╚══╝  ╚═════╝ ╚═╝  ╚═╝╚═╝  ╚═╝',
      '',
    ];

    art.forEach(line => {
      const colored = line.split('').map((char, i) => {
        const colors = [this.theme.accent, this.theme.accentSoft, this.theme.info];
        return colors[i % colors.length](char);
      }).join('');
      console.log(colored);
    });

    console.log(`  ${this.theme.bold(config.name)} ${this.theme.dim(config.version || '')}`);
    console.log(`  ${this.theme.dim(config.description || '您的智能开发助手')}`);
    
    if (config.provider || config.model) {
      console.log(`  ${this.theme.dim('提供商:')} ${this.theme.info(config.provider || 'default')} ${this.theme.dim('|')} ${this.theme.dim('模型:')} ${this.theme.success(config.model || 'unknown')}`);
    }
    
    this.newline();

    this.divider('快捷命令');
    console.log(`    ${this.theme.accent('/help')}       显示所有命令`);
    console.log(`    ${this.theme.accent('/clear')}      清空对话历史`);
    console.log(`    ${this.theme.accent('/exit')}       退出 CLI`);
    console.log(`    ${this.theme.accent('/model')}      切换 AI 模型`);
    console.log(`    ${this.theme.accent('/stats')}      查看使用统计`);
    console.log(`    ${this.theme.accent('/events')}     查看事件日志`);
    this.newline();

    this.divider('快捷键');
    console.log(`    ${this.theme.accent('Ctrl+C')}      退出 (按两次)`);
    console.log(`    ${this.theme.accent('Ctrl+L')}      清屏`);
    console.log(`    ${this.theme.accent('↑/↓')}         浏览命令历史`);
    console.log(`    ${this.theme.accent('Tab')}         自动补全命令`);
    console.log(`    ${this.theme.accent('Ctrl+U')}      清空输入行`);
    this.newline();
    
    this.divider(undefined, '─');
    console.log(`  ${this.theme.dim('💡 提示:')} 所有智能体事件 (技能、工具、MCP) 都被追踪。使用 ${this.theme.accent('/events')} 查看。`);
    this.newline();
  }

  statusLine(config: {
    model?: string;
    provider?: string;
    messages?: number;
    tokens?: number;
    session?: string;
  }): void {
    const parts: string[] = [];
    
    if (config.provider && config.model) {
      parts.push(`${this.theme.info(config.provider)}:${this.theme.success(config.model)}`);
    } else if (config.model) {
      parts.push(`${this.theme.success(config.model)}`);
    }
    
    if (config.messages !== undefined) {
      parts.push(`${this.theme.dim('msgs:')}${this.theme.accent(config.messages.toString())}`);
    }
    
    if (config.tokens !== undefined) {
      parts.push(`${this.theme.dim('toks:')}${this.theme.dim(config.tokens.toLocaleString())}`);
    }
    
    if (config.session) {
      parts.push(`${this.theme.dim('session:')}${this.theme.info(config.session)}`);
    }
    
    const line = parts.join(` ${this.theme.dim('|')} `);
    console.log(`${this.theme.dim('┌')} ${line} ${'─'.repeat(Math.max(0, this.getTerminalWidth() - line.length - 4))}`);
  }

  header(title: string, subtitle?: string): void {
    const width = this.getTerminalWidth();
    const titleLine = subtitle ? `${this.theme.bold(title)} ${this.theme.dim('─')} ${this.theme.dim(subtitle)}` : this.theme.bold(title);
    console.log('');
    console.log(`${this.theme.accent(`╭${'─'.repeat(width - 2)}╮`)}`);
    console.log(`${this.theme.accent(`│`)} ${titleLine}${' '.repeat(Math.max(0, width - titleLine.length - 3))}${this.theme.accent(`│`)}`);
    console.log(`${this.theme.accent(`╰${'─'.repeat(width - 2)}╯`)}`);
    console.log('');
  }

  destroy(): void {
    this.loading.destroy();
  }

  private wrapText(text: string, maxWidth: number): string[] {
    const words = text.split(' ');
    const lines: string[] = [];
    let currentLine = '';

    for (const word of words) {
      if (currentLine.length + word.length + 1 <= maxWidth) {
        currentLine += (currentLine ? ' ' : '') + word;
      } else {
        if (currentLine) lines.push(currentLine);
        currentLine = word;
      }
    }
    if (currentLine) lines.push(currentLine);

    return lines.length > 0 ? lines : [''];
  }
}

export function createRenderer(theme?: Theme): TUIRenderer {
  return new TUIRenderer(theme);
}

export default TUIRenderer;

export { THEMES, DEFAULT_THEME, type Theme } from './theme.js';

export class ThinkingDisplay {
  private theme: Theme;
  private currentStep = 0;
  private totalSteps = 0;
  private spinner: LoadingIndicator;
  private thoughts: string[] = [];
  private startTime = 0;

  constructor(theme: Theme = DEFAULT_THEME) {
    this.theme = theme;
    this.spinner = new LoadingIndicator(theme, 'dots');
  }

  start(totalSteps: number): void {
    this.totalSteps = totalSteps;
    this.currentStep = 0;
    this.thoughts = [];
    this.startTime = Date.now();
    this.spinner.start('分析中...', '🧠');
  }

  step(thought: string): void {
    this.currentStep++;
    this.thoughts.push(thought);
    const truncated = thought.length > 40 ? thought.slice(0, 37) + '...' : thought;
    const elapsed = Math.round((Date.now() - this.startTime) / 1000);
    this.spinner.update(`[${elapsed}s] 步骤 ${this.currentStep}/${this.totalSteps}: ${truncated}`);
  }

  toolCall(toolName: string, params?: Record<string, unknown>): void {
    const paramsStr = params ? ` ${JSON.stringify(params).slice(0, 20)}...` : '';
    this.spinner.update(`🔧 调用: ${toolName}${paramsStr}`);
  }

  observation(observation: string): void {
    const truncated = observation.length > 50 ? observation.slice(0, 47) + '...' : observation;
    this.spinner.update(`📋 结果: ${truncated}`);
  }

  complete(_answer: string): void {
    const elapsed = Math.round((Date.now() - this.startTime) / 1000);
    this.spinner.succeed(`完成 (${elapsed}s)`);
    this.showSummary();
  }

  private showSummary(): void {
    if (this.thoughts.length === 0) return;

    stdout.write(`\n${ANSI.dim}${'─'.repeat(50)}${ANSI.reset}\n`);
    stdout.write(`${this.theme.accent('📝 执行摘要')}\n`);
    stdout.write(`${ANSI.dim}${'─'.repeat(50)}${ANSI.reset}\n`);
    this.thoughts.slice(-3).forEach((thought, i) => {
      const truncated = thought.length > 60 ? thought.slice(0, 57) + '...' : thought;
      stdout.write(`  ${this.theme.primary('•')} ${truncated}\n`);
    });
    stdout.write(`${ANSI.dim}${'─'.repeat(50)}${ANSI.reset}\n`);
  }
}
