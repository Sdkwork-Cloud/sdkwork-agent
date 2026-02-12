#!/usr/bin/env node
/**
 * TUI Renderer - 专业级终端渲染器
 *
 * 参考 Claude Code、Codex CLI、OpenCode 等顶级工具设计
 * 精简但功能完整，无冗余兼容性代码
 *
 * @module TUI
 * @version 4.0.0
 */

import { stdout } from 'process';

// ============================================
// ANSI 颜色代码
// ============================================

const ANSI = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  italic: '\x1b[3m',
  underline: '\x1b[4m',
  blink: '\x1b[5m',
  reverse: '\x1b[7m',
  strikethrough: '\x1b[9m',

  // 前景色
  black: '\x1b[30m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',

  // 亮前景色
  brightBlack: '\x1b[90m',
  brightRed: '\x1b[91m',
  brightGreen: '\x1b[92m',
  brightYellow: '\x1b[93m',
  brightBlue: '\x1b[94m',
  brightMagenta: '\x1b[95m',
  brightCyan: '\x1b[96m',
  brightWhite: '\x1b[97m',

  // 背景色
  bgBlack: '\x1b[40m',
  bgRed: '\x1b[41m',
  bgGreen: '\x1b[42m',
  bgYellow: '\x1b[43m',
  bgBlue: '\x1b[44m',
  bgMagenta: '\x1b[45m',
  bgCyan: '\x1b[46m',
  bgWhite: '\x1b[47m',

  // 光标控制
  clearLine: '\x1b[2K',
  clearLineRight: '\x1b[0K',
  clearLineLeft: '\x1b[1K',
  clearScreen: '\x1b[2J',
  cursorHome: '\x1b[0G',
  cursorUp: '\x1b[1A',
  cursorDown: '\x1b[1B',
  cursorForward: '\x1b[1C',
  cursorBack: '\x1b[1D',
  hideCursor: '\x1b[?25l',
  showCursor: '\x1b[?25h',
  saveCursor: '\x1b[s',
  restoreCursor: '\x1b[u',
  alternateScreen: '\x1b[?1049h',
  mainScreen: '\x1b[?1049l',
} as const;

// ============================================
// 主题系统
// ============================================

export interface Theme {
  name: string;
  primary: string;
  secondary: string;
  success: string;
  warning: string;
  error: string;
  info: string;
  muted: string;
  border: string;
  accent: string;
  gradient: string[];
  userBubble: string;
  assistantBubble: string;
}

export const THEMES: Record<string, Theme> = {
  default: {
    name: 'Default',
    primary: ANSI.cyan,
    secondary: ANSI.brightBlack,
    success: ANSI.green,
    warning: ANSI.yellow,
    error: ANSI.red,
    info: ANSI.blue,
    muted: ANSI.dim,
    border: ANSI.brightBlack,
    accent: ANSI.magenta,
    gradient: [ANSI.cyan, ANSI.blue, ANSI.magenta],
    userBubble: ANSI.cyan,
    assistantBubble: ANSI.brightBlack,
  },
  ocean: {
    name: 'Ocean',
    primary: ANSI.brightBlue,
    secondary: ANSI.blue,
    success: ANSI.brightGreen,
    warning: ANSI.brightYellow,
    error: ANSI.brightRed,
    info: ANSI.cyan,
    muted: ANSI.dim,
    border: ANSI.blue,
    accent: ANSI.cyan,
    gradient: [ANSI.blue, ANSI.cyan, ANSI.white],
    userBubble: ANSI.brightBlue,
    assistantBubble: ANSI.blue,
  },
  sunset: {
    name: 'Sunset',
    primary: ANSI.brightMagenta,
    secondary: ANSI.magenta,
    success: ANSI.brightGreen,
    warning: ANSI.brightYellow,
    error: ANSI.brightRed,
    info: ANSI.yellow,
    muted: ANSI.dim,
    border: ANSI.magenta,
    accent: ANSI.yellow,
    gradient: [ANSI.red, ANSI.magenta, ANSI.yellow],
    userBubble: ANSI.brightMagenta,
    assistantBubble: ANSI.magenta,
  },
  forest: {
    name: 'Forest',
    primary: ANSI.brightGreen,
    secondary: ANSI.green,
    success: ANSI.brightCyan,
    warning: ANSI.brightYellow,
    error: ANSI.brightRed,
    info: ANSI.green,
    muted: ANSI.dim,
    border: ANSI.green,
    accent: ANSI.yellow,
    gradient: [ANSI.green, ANSI.yellow, ANSI.cyan],
    userBubble: ANSI.brightGreen,
    assistantBubble: ANSI.green,
  },
  dark: {
    name: 'Dark',
    primary: ANSI.brightWhite,
    secondary: ANSI.white,
    success: ANSI.brightGreen,
    warning: ANSI.brightYellow,
    error: ANSI.brightRed,
    info: ANSI.brightBlue,
    muted: ANSI.brightBlack,
    border: ANSI.brightBlack,
    accent: ANSI.brightCyan,
    gradient: [ANSI.white, ANSI.brightBlack, ANSI.black],
    userBubble: ANSI.brightWhite,
    assistantBubble: ANSI.white,
  },
  dracula: {
    name: 'Dracula',
    primary: '\x1b[38;5;117m',
    secondary: '\x1b[38;5;189m',
    success: '\x1b[38;5;84m',
    warning: '\x1b[38;5;215m',
    error: '\x1b[38;5;203m',
    info: '\x1b[38;5;117m',
    muted: ANSI.dim,
    border: '\x1b[38;5;189m',
    accent: '\x1b[38;5;212m',
    gradient: ['\x1b[38;5;117m', '\x1b[38;5;189m', '\x1b[38;5;212m'],
    userBubble: '\x1b[38;5;117m',
    assistantBubble: '\x1b[38;5;189m',
  },
};

export const DEFAULT_THEME = THEMES.default;

// ============================================
// 加载动画
// ============================================

const SPINNER_FRAMES = {
  dots: ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'],
  line: ['-', '\\', '|', '/'],
  bounce: ['⠁', '⠃', '⠇', '⡇', '⣇', '⣧', '⣷', '⣾', '⣽', '⣻', '⢿', '⡿', '⣟', '⣯', '⣷'],
  pulse: ['█', '▓', '▒', '░', '▒', '▓'],
  arrow: ['▹▹▹▹▹', '▸▹▹▹▹', '▹▸▹▹▹', '▹▹▸▹▹', '▹▹▹▸▹', '▹▹▹▹▸'],
  progress: ['[          ]', '[=         ]', '[==        ]', '[===       ]', '[====      ]', '[=====     ]', '[======    ]', '[=======   ]', '[========  ]', '[========= ]', '[==========]'],
};

type SpinnerStyle = keyof typeof SPINNER_FRAMES;

export class LoadingIndicator {
  private interval: NodeJS.Timeout | null = null;
  private currentFrame = 0;
  private message = '';
  private theme: Theme;
  private style: SpinnerStyle = 'dots';
  private prefix = '';

  constructor(theme: Theme = DEFAULT_THEME, style: SpinnerStyle = 'dots') {
    this.theme = theme;
    this.style = style;
  }

  start(message: string, prefix: string = ''): void {
    this.stop();
    this.message = message;
    this.prefix = prefix;
    this.currentFrame = 0;
    this.render();

    const frameCount = SPINNER_FRAMES[this.style].length;
    const interval = this.style === 'bounce' ? 60 : this.style === 'pulse' ? 100 : 80;

    this.interval = setInterval(() => {
      this.currentFrame = (this.currentFrame + 1) % frameCount;
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
    this.stop(`${this.theme.success}✓${ANSI.reset} ${message || this.message}`);
  }

  fail(message?: string): void {
    this.stop(`${this.theme.error}✗${ANSI.reset} ${message || this.message}`);
  }

  destroy(): void {
    this.stop();
  }

  private render(): void {
    const frames = SPINNER_FRAMES[this.style];
    const frame = frames[this.currentFrame];
    const prefix = this.prefix ? `${this.theme.accent}${this.prefix}${ANSI.reset} ` : '';
    const output = `${prefix}${this.theme.primary}${frame}${ANSI.reset} ${this.message}`;
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

  constructor(theme: Theme = DEFAULT_THEME, width: number = 30) {
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

    const bar = `${this.theme.success}${'█'.repeat(filled)}${ANSI.dim}${'░'.repeat(empty)}${ANSI.reset}`;
    const percentStr = `${percent.toFixed(1)}%`.padStart(6);
    const countStr = `${current}/${total}`.padStart(10);

    let output = `${bar} ${this.theme.primary}${percentStr}${ANSI.reset} ${this.theme.muted}${countStr}${ANSI.reset}`;
    if (message) {
      output += ` ${this.theme.muted}${message}${ANSI.reset}`;
    }

    stdout.write(ANSI.cursorHome + ANSI.clearLine + output);
  }

  complete(message?: string): void {
    const duration = Date.now() - this.startTime;
    const durationStr = this.formatDuration(duration);
    stdout.write(ANSI.cursorHome + ANSI.clearLine);
    if (message) {
      console.log(`${this.theme.success}✓${ANSI.reset} ${message} ${this.theme.muted}(${durationStr})${ANSI.reset}`);
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
// 思考过程显示
// ============================================

export class ThinkingDisplay {
  private theme: Theme;
  private currentStep = 0;
  private totalSteps = 0;
  private spinner: LoadingIndicator;
  private thoughts: string[] = [];

  constructor(theme: Theme = DEFAULT_THEME) {
    this.theme = theme;
    this.spinner = new LoadingIndicator(theme, 'dots');
  }

  start(totalSteps: number): void {
    this.totalSteps = totalSteps;
    this.currentStep = 0;
    this.thoughts = [];
    this.spinner.start('Thinking...', '🧠');
  }

  step(thought: string): void {
    this.currentStep++;
    this.thoughts.push(thought);
    const truncated = thought.length > 50 ? thought.slice(0, 47) + '...' : thought;
    this.spinner.update(`Step ${this.currentStep}/${this.totalSteps}: ${truncated}`);
  }

  toolCall(toolName: string, params?: Record<string, unknown>): void {
    const paramsStr = params ? ` ${JSON.stringify(params).slice(0, 30)}` : '';
    this.spinner.update(`${this.theme.accent}🔧${ANSI.reset} ${toolName}${paramsStr}`);
  }

  observation(observation: string): void {
    const truncated = observation.length > 60 ? observation.slice(0, 57) + '...' : observation;
    this.spinner.update(`${this.theme.info}👁${ANSI.reset} ${truncated}`);
  }

  complete(answer: string): void {
    this.spinner.succeed('Thinking complete');
    this.showSummary();
  }

  private showSummary(): void {
    if (this.thoughts.length === 0) return;

    console.log(`${ANSI.dim}${'─'.repeat(50)}${ANSI.reset}`);
    console.log(`${this.theme.primary}Thinking Process:${ANSI.reset}`);
    this.thoughts.forEach((thought, i) => {
      const truncated = thought.length > 80 ? thought.slice(0, 77) + '...' : thought;
      console.log(`  ${ANSI.dim}${i + 1}.${ANSI.reset} ${truncated}`);
    });
    console.log(`${ANSI.dim}${'─'.repeat(50)}${ANSI.reset}`);
  }
}

// ============================================
// 渲染器
// ============================================

export class TUIRenderer {
  private theme: Theme;
  private loading: LoadingIndicator;
  private progressBar: ProgressBar;
  private thinking: ThinkingDisplay;

  constructor(theme: Theme = DEFAULT_THEME) {
    this.theme = theme;
    this.loading = new LoadingIndicator(theme);
    this.progressBar = new ProgressBar(theme);
    this.thinking = new ThinkingDisplay(theme);
  }

  getTerminalWidth(): number {
    return process.stdout.columns || 80;
  }

  // 基础输出
  write(text: string): void {
    stdout.write(text);
  }

  newline(count = 1): void {
    stdout.write('\n'.repeat(count));
  }

  clear(): void {
    console.clear();
  }

  clearLine(): void {
    stdout.write(ANSI.cursorHome + ANSI.clearLine);
  }

  // 样式化输出
  primary(text: string): string {
    return `${this.theme.primary}${text}${ANSI.reset}`;
  }

  secondary(text: string): string {
    return `${this.theme.secondary}${text}${ANSI.reset}`;
  }

  success(text: string): string {
    return `${this.theme.success}${text}${ANSI.reset}`;
  }

  warning(text: string): string {
    return `${this.theme.warning}${text}${ANSI.reset}`;
  }

  error(text: string): string {
    return `${this.theme.error}${text}${ANSI.reset}`;
  }

  info(text: string): string {
    return `${this.theme.info}${text}${ANSI.reset}`;
  }

  muted(text: string): string {
    return `${this.theme.muted}${text}${ANSI.reset}`;
  }

  bold(text: string): string {
    return `${ANSI.bold}${text}${ANSI.reset}`;
  }

  italic(text: string): string {
    return `${ANSI.italic}${text}${ANSI.reset}`;
  }

  dim(text: string): string {
    return `${ANSI.dim}${text}${ANSI.reset}`;
  }

  // 渐变文字
  gradient(text: string): string {
    const chars = text.split('');
    const colors = this.theme.gradient;
    return chars.map((char, i) => {
      const colorIndex = Math.floor((i / chars.length) * colors.length);
      return `${colors[colorIndex]}${char}${ANSI.reset}`;
    }).join('');
  }

  // 高亮文字
  highlight(text: string): string {
    return `${this.theme.accent}${ANSI.bold}${text}${ANSI.reset}`;
  }

  // 边框框
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
    console.log(this.theme.border + `${c.tl}${horizontal}${c.tr}` + ANSI.reset);

    if (title) {
      const titleLine = `${c.v} ${this.bold(title)}${' '.repeat(Math.max(0, width - title.length - 1))}${c.v}`;
      console.log(this.theme.border + titleLine + ANSI.reset);
      console.log(this.theme.border + `${c.lt}${horizontal}${c.rt}` + ANSI.reset);
    }

    for (const line of content) {
      const truncated = line.slice(0, width - 4);
      const padded = truncated + ' '.repeat(Math.max(0, width - truncated.length - 4));
      console.log(this.theme.border + `${c.v} ${padded} ${c.v}` + ANSI.reset);
    }

    console.log(this.theme.border + `${c.bl}${horizontal}${c.br}` + ANSI.reset);
    this.newline();
  }

  // 分隔线
  divider(label?: string, char: string = '─'): void {
    const width = this.getTerminalWidth() - 2;
    if (label) {
      const labelWidth = label.length + 2;
      const leftWidth = Math.floor((width - labelWidth) / 2);
      const rightWidth = width - labelWidth - leftWidth;
      console.log(`${this.theme.muted}${char.repeat(leftWidth)}${ANSI.reset} ${this.dim(label)} ${this.theme.muted}${char.repeat(rightWidth)}${ANSI.reset}`);
    } else {
      console.log(this.theme.muted + char.repeat(width) + ANSI.reset);
    }
  }

  // 加载状态
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

  // 进度条
  updateProgress(current: number, total: number, message?: string): void {
    this.progressBar.update(current, total, message);
  }

  completeProgress(message?: string): void {
    this.progressBar.complete(message);
  }

  // 思考过程
  startThinking(totalSteps: number): void {
    this.thinking.start(totalSteps);
  }

  thinkingStep(thought: string): void {
    this.thinking.step(thought);
  }

  thinkingToolCall(toolName: string, params?: Record<string, unknown>): void {
    this.thinking.toolCall(toolName, params);
  }

  thinkingObservation(observation: string): void {
    this.thinking.observation(observation);
  }

  completeThinking(answer: string): void {
    this.thinking.complete(answer);
  }

  // 设置主题
  setTheme(theme: Theme): void {
    this.theme = theme;
    this.loading.destroy();
    this.loading = new LoadingIndicator(theme);
    this.progressBar = new ProgressBar(theme);
    this.thinking = new ThinkingDisplay(theme);
  }

  destroy(): void {
    this.loading.destroy();
  }

  // 消息渲染 - 气泡样式
  message(role: 'user' | 'assistant', content: string): void {
    if (role === 'user') {
      this.userMessage(content);
    } else {
      this.assistantMessage(content);
    }
  }

  userMessage(content: string): void {
    const label = 'You';
    const maxWidth = this.getTerminalWidth() - 10;
    const lines = this.wrapText(content, maxWidth);

    console.log(`${this.theme.userBubble}${ANSI.bold} ${label} ${ANSI.reset}`);
    lines.forEach(line => {
      console.log(`  ${line}`);
    });
    this.newline();
  }

  assistantMessage(content: string): void {
    const label = 'Assistant';
    const maxWidth = this.getTerminalWidth() - 10;
    const lines = this.wrapText(content, maxWidth);

    console.log(`${this.theme.assistantBubble}${ANSI.bold} ${label} ${ANSI.reset}`);
    lines.forEach(line => {
      console.log(`  ${line}`);
    });
    this.newline();
  }

  // 系统消息
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

    console.log(`${colors[type]}${icons[type]}${ANSI.reset} ${this.dim(content)}`);
  }

  // 工具调用显示
  toolCall(toolName: string, params: Record<string, unknown>, result?: unknown): void {
    console.log(`${this.theme.accent}🔧 Tool:${ANSI.reset} ${this.bold(toolName)}`);
    console.log(`   ${this.dim('Input:')} ${JSON.stringify(params).slice(0, 100)}`);
    if (result !== undefined) {
      const resultStr = typeof result === 'string' ? result : JSON.stringify(result);
      console.log(`   ${this.dim('Output:')} ${resultStr.slice(0, 100)}`);
    }
  }

  // Token 使用统计
  tokenUsage(promptTokens: number, completionTokens: number): void {
    const total = promptTokens + completionTokens;
    const bar = this.createMiniBar(total, 1000);
    console.log(this.muted(`  Tokens: ${bar} ${promptTokens} + ${completionTokens} = ${total}`));
  }

  private createMiniBar(value: number, max: number): string {
    const width = 10;
    const filled = Math.round((value / max) * width);
    return `${this.theme.success}${'█'.repeat(Math.min(filled, width))}${this.theme.muted}${'░'.repeat(Math.max(0, width - filled))}${ANSI.reset}`;
  }

  // 错误框
  errorBox(title: string, message: string, hint?: string): void {
    this.newline();
    const width = Math.min(this.getTerminalWidth() - 4, 74);
    const horizontal = '─'.repeat(width);

    console.log(this.theme.error + `╭${horizontal}╮` + ANSI.reset);
    console.log(this.theme.error + `│ ${this.bold(`✗ ${title}`)}${' '.repeat(Math.max(0, width - title.length - 3))}│` + ANSI.reset);
    console.log(this.theme.error + `├${horizontal}┤` + ANSI.reset);

    const lines = this.wrapText(message, width - 4);
    lines.forEach(line => {
      console.log(this.theme.error + `│ ${line.padEnd(width - 2)}│` + ANSI.reset);
    });

    if (hint) {
      console.log(this.theme.error + `├${horizontal}┤` + ANSI.reset);
      const hintLines = this.wrapText(hint, width - 4);
      hintLines.forEach(line => {
        console.log(this.theme.border + `│ ${this.secondary(line).padEnd(width - 2)}│` + ANSI.reset);
      });
    }

    console.log(this.theme.error + `╰${horizontal}╯` + ANSI.reset);
    this.newline();
  }

  // 成功框
  successBox(title: string, message: string): void {
    this.newline();
    const width = Math.min(this.getTerminalWidth() - 4, 74);
    const horizontal = '─'.repeat(width);

    console.log(this.theme.success + `╭${horizontal}╮` + ANSI.reset);
    console.log(this.theme.success + `│ ${this.bold(`✓ ${title}`)}${' '.repeat(Math.max(0, width - title.length - 3))}│` + ANSI.reset);
    console.log(this.theme.success + `├${horizontal}┤` + ANSI.reset);

    const lines = this.wrapText(message, width - 4);
    lines.forEach(line => {
      console.log(this.theme.success + `│ ${line.padEnd(width - 2)}│` + ANSI.reset);
    });

    console.log(this.theme.success + `╰${horizontal}╯` + ANSI.reset);
    this.newline();
  }

  // 欢迎界面
  welcome(config: { name: string; version?: string; description?: string }): void {
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

    art.forEach(line => console.log(this.gradient(line)));

    console.log(`  ${this.bold(config.name)} ${this.muted(config.version || '')}`);
    console.log(`  ${this.secondary(config.description || 'Your AI-powered development companion')}`);
    this.newline();

    this.divider('Commands');
    console.log(`    ${this.primary('/help')}      Show available commands`);
    console.log(`    ${this.primary('/clear')}     Clear conversation history`);
    console.log(`    ${this.primary('/exit')}      Exit the CLI`);
    console.log(`    ${this.primary('/model')}     Switch model`);
    console.log(`    ${this.primary('/theme')}     Change theme`);
    this.newline();

    this.divider('Shortcuts');
    console.log(`    ${this.primary('Ctrl+C')}     Exit`);
    console.log(`    ${this.primary('Ctrl+L')}     Clear screen`);
    console.log(`    ${this.primary('↑/↓')}        Navigate history`);
    console.log(`    ${this.primary('Tab')}        Auto-complete`);
    this.newline();
  }

  // 状态栏
  statusBar(left: string, right: string): void {
    const rightWidth = right.length + 2;
    const leftWidth = this.getTerminalWidth() - rightWidth - 2;
    const leftPadded = left.slice(0, leftWidth).padEnd(leftWidth);
    console.log(`${ANSI.reverse}${leftPadded} ${right} ${ANSI.reset}`);
  }

  // 文本换行
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

// ============================================
// 便捷函数
// ============================================

export function createRenderer(theme?: Theme): TUIRenderer {
  return new TUIRenderer(theme);
}

// 默认导出
export default TUIRenderer;
