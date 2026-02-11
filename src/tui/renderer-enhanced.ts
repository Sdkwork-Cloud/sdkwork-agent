/**
 * Enhanced TUI Renderer - 极致级终端渲染器
 * 
 * 参考 Claude Code、Codex CLI、Warp、Fig 等顶级工具设计
 * 功能包括：智能补全、语法高亮、实时预览、富文本表格、进度动画等
 * 
 * @module TUI
 * @version 3.0.0
 */

import { stdout, stdin } from 'process';
import { emitKeypressEvents } from 'readline';

// ============================================
// ANSI 颜色代码 (扩展版)
// ============================================

export const ANSI = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  italic: '\x1b[3m',
  underline: '\x1b[4m',
  blink: '\x1b[5m',
  reverse: '\x1b[7m',
  hidden: '\x1b[8m',
  strikethrough: '\x1b[9m',
  
  // 前景色 - 标准
  black: '\x1b[30m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  
  // 前景色 - 亮色
  brightBlack: '\x1b[90m',
  brightRed: '\x1b[91m',
  brightGreen: '\x1b[92m',
  brightYellow: '\x1b[93m',
  brightBlue: '\x1b[94m',
  brightMagenta: '\x1b[95m',
  brightCyan: '\x1b[96m',
  brightWhite: '\x1b[97m',
  
  // 背景色 - 标准
  bgBlack: '\x1b[40m',
  bgRed: '\x1b[41m',
  bgGreen: '\x1b[42m',
  bgYellow: '\x1b[43m',
  bgBlue: '\x1b[44m',
  bgMagenta: '\x1b[45m',
  bgCyan: '\x1b[46m',
  bgWhite: '\x1b[47m',
  
  // 背景色 - 亮色
  bgBrightBlack: '\x1b[100m',
  bgBrightRed: '\x1b[101m',
  bgBrightGreen: '\x1b[102m',
  bgBrightYellow: '\x1b[103m',
  bgBrightBlue: '\x1b[104m',
  bgBrightMagenta: '\x1b[105m',
  bgBrightCyan: '\x1b[106m',
  bgBrightWhite: '\x1b[107m',
  
  // 光标控制
  clearLine: '\x1b[2K',
  clearScreen: '\x1b[2J',
  clearFromCursor: '\x1b[0J',
  cursorUp: '\x1b[1A',
  cursorDown: '\x1b[1B',
  cursorLeft: '\x1b[1D',
  cursorRight: '\x1b[1C',
  cursorHome: '\x1b[0G',
  cursorTo: (row: number, col: number) => `\x1b[${row};${col}H`,
  hideCursor: '\x1b[?25l',
  showCursor: '\x1b[?25h',
  saveCursor: '\x1b[s',
  restoreCursor: '\x1b[u',
  
  // 滚动
  scrollUp: '\x1b[S',
  scrollDown: '\x1b[T',
} as const;

// ============================================
// 主题系统 (多主题支持)
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
  background: string;
  text: string;
  highlight: string;
  gradient: string[];
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
    background: '',
    text: ANSI.reset,
    highlight: ANSI.brightCyan,
    gradient: [ANSI.cyan, ANSI.blue, ANSI.magenta],
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
    background: '',
    text: ANSI.reset,
    highlight: ANSI.brightCyan,
    gradient: [ANSI.blue, ANSI.cyan, ANSI.white],
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
    background: '',
    text: ANSI.reset,
    highlight: ANSI.brightRed,
    gradient: [ANSI.red, ANSI.magenta, ANSI.yellow],
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
    background: '',
    text: ANSI.reset,
    highlight: ANSI.brightGreen,
    gradient: [ANSI.green, ANSI.yellow, ANSI.cyan],
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
    background: ANSI.bgBlack,
    text: ANSI.brightWhite,
    highlight: ANSI.brightWhite,
    gradient: [ANSI.white, ANSI.brightBlack, ANSI.black],
  },
};

export const DEFAULT_THEME = THEMES.default;

// ============================================
// 加载动画 (多种样式)
// ============================================

export type SpinnerStyle = 'dots' | 'line' | 'arrow' | 'bounce' | 'pulse';

const SPINNER_FRAMES: Record<SpinnerStyle, string[]> = {
  dots: ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'],
  line: ['-', '\\', '|', '/'],
  arrow: ['←', '↖', '↑', '↗', '→', '↘', '↓', '↙'],
  bounce: ['( ●    )', '(  ●   )', '(   ●  )', '(    ● )', '(     ●)', '(    ● )', '(   ●  )', '(  ●   )', '( ●    )', '(●     )'],
  pulse: ['◐', '◓', '◑', '◒'],
};

export interface LoadingOptions {
  style?: SpinnerStyle;
  interval?: number;
  prefix?: string;
  suffix?: string;
}

export class LoadingIndicator {
  private frames: string[];
  private interval: NodeJS.Timeout | null = null;
  private currentFrame = 0;
  private message = '';
  private theme: Theme;
  private options: Required<LoadingOptions>;
  private startTime: number = 0;

  constructor(theme: Theme = DEFAULT_THEME, options: LoadingOptions = {}) {
    this.theme = theme;
    this.options = {
      style: options.style ?? 'dots',
      interval: options.interval ?? 80,
      prefix: options.prefix ?? '',
      suffix: options.suffix ?? '',
    };
    this.frames = SPINNER_FRAMES[this.options.style];
  }

  start(message: string): void {
    this.message = message;
    this.currentFrame = 0;
    this.startTime = Date.now();
    
    this.render();
    
    this.interval = setInterval(() => {
      this.currentFrame = (this.currentFrame + 1) % this.frames.length;
      this.render();
    }, this.options.interval);
  }

  stop(): void {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
      stdout.write(ANSI.cursorHome + ANSI.clearLine);
    }
  }

  update(message: string): void {
    this.message = message;
    if (!this.interval) {
      this.render();
    }
  }

  private render(): void {
    const frame = this.frames[this.currentFrame];
    const elapsed = ((Date.now() - this.startTime) / 1000).toFixed(1);
    const output = `${this.options.prefix}${this.theme.primary}${frame}${ANSI.reset} ${this.message} ${this.theme.muted}(${elapsed}s)${ANSI.reset}${this.options.suffix}`;
    stdout.write(ANSI.cursorHome + ANSI.clearLine + output);
  }
}

// ============================================
// 进度条组件
// ============================================

export interface ProgressBarOptions {
  width?: number;
  complete?: string;
  incomplete?: string;
  showPercentage?: boolean;
  showEta?: boolean;
}

export class ProgressBar {
  private theme: Theme;
  private options: Required<ProgressBarOptions>;
  private total: number = 0;
  private current: number = 0;
  private startTime: number = 0;

  constructor(theme: Theme = DEFAULT_THEME, options: ProgressBarOptions = {}) {
    this.theme = theme;
    this.options = {
      width: options.width ?? 40,
      complete: options.complete ?? '█',
      incomplete: options.incomplete ?? '░',
      showPercentage: options.showPercentage ?? true,
      showEta: options.showEta ?? true,
    };
  }

  start(total: number, label: string = ''): void {
    this.total = total;
    this.current = 0;
    this.startTime = Date.now();
    this.render(label);
  }

  update(current: number, label?: string): void {
    this.current = current;
    this.render(label);
  }

  increment(amount: number = 1, label?: string): void {
    this.current += amount;
    this.render(label);
  }

  complete(label: string = 'Complete'): void {
    this.current = this.total;
    this.render(label);
    stdout.write('\n');
  }

  private render(label?: string): void {
    const percentage = Math.min(100, Math.round((this.current / this.total) * 100));
    const filled = Math.round((this.current / this.total) * this.options.width);
    const empty = this.options.width - filled;
    
    const bar = this.theme.success + this.options.complete.repeat(filled) + 
                ANSI.reset + this.theme.muted + this.options.incomplete.repeat(empty) + ANSI.reset;
    
    let output = ` ${bar}`;
    
    if (this.options.showPercentage) {
      output += ` ${ANSI.bold}${percentage}%${ANSI.reset}`;
    }
    
    if (this.options.showEta && this.current > 0) {
      const elapsed = Date.now() - this.startTime;
      const eta = Math.round((elapsed / this.current) * (this.total - this.current) / 1000);
      output += ` ${this.theme.muted}ETA: ${eta}s${ANSI.reset}`;
    }
    
    if (label) {
      output += ` ${this.theme.secondary}${label}${ANSI.reset}`;
    }
    
    stdout.write(ANSI.cursorHome + ANSI.clearLine + output);
  }
}

// ============================================
// 通知系统
// ============================================

export type NotificationType = 'info' | 'success' | 'warning' | 'error';

export interface Notification {
  type: NotificationType;
  title: string;
  message: string;
  duration?: number;
}

export class NotificationManager {
  private theme: Theme;
  private notifications: Notification[] = [];

  constructor(theme: Theme = DEFAULT_THEME) {
    this.theme = theme;
  }

  show(notification: Notification): void {
    const icons = {
      info: 'ℹ️',
      success: '✅',
      warning: '⚠️',
      error: '❌',
    };

    const colors = {
      info: this.theme.info,
      success: this.theme.success,
      warning: this.theme.warning,
      error: this.theme.error,
    };

    const icon = icons[notification.type];
    const color = colors[notification.type];

    stdout.write('\n');
    console.log(`${color}${icon} ${ANSI.bold}${notification.title}${ANSI.reset}`);
    console.log(`   ${notification.message}`);
    stdout.write('\n');

    if (notification.duration) {
      setTimeout(() => {
        // 清除通知（在实际实现中可能需要更复杂的逻辑）
      }, notification.duration);
    }
  }

  info(title: string, message: string): void {
    this.show({ type: 'info', title, message });
  }

  success(title: string, message: string): void {
    this.show({ type: 'success', title, message });
  }

  warning(title: string, message: string): void {
    this.show({ type: 'warning', title, message });
  }

  error(title: string, message: string): void {
    this.show({ type: 'error', title, message });
  }
}

// ============================================
// 智能输入 (带自动补全和历史)
// ============================================

export interface SmartInputOptions {
  prompt?: string;
  completions?: string[];
  history?: string[];
  maxHistory?: number;
  multiline?: boolean;
}

export class SmartInput {
  private options: Required<SmartInputOptions>;
  private history: string[];
  private historyIndex = -1;
  private currentInput = '';
  private cursorPos = 0;
  private isActive = false;

  constructor(options: SmartInputOptions = {}) {
    this.options = {
      prompt: options.prompt ?? '> ',
      completions: options.completions ?? [],
      history: options.history ?? [],
      maxHistory: options.maxHistory ?? 100,
      multiline: options.multiline ?? false,
    };
    this.history = [...this.options.history];
  }

  async read(): Promise<string> {
    return new Promise((resolve, reject) => {
      this.isActive = true;
      this.currentInput = '';
      this.cursorPos = 0;
      this.historyIndex = -1;

      stdin.setRawMode(true);
      emitKeypressEvents(stdin);

      this.render();

      const onKeypress = (str: string, key: { 
        name: string; 
        ctrl: boolean; 
        shift: boolean; 
        meta: boolean;
      }) => {
        if (!this.isActive) return;

        // Ctrl+C - 取消
        if (key.ctrl && key.name === 'c') {
          this.cleanup(onKeypress);
          reject(new Error('Interrupted'));
          return;
        }

        // Ctrl+D - 结束输入
        if (key.ctrl && key.name === 'd') {
          this.cleanup(onKeypress);
          resolve(this.currentInput);
          return;
        }

        // Enter - 提交
        if (key.name === 'return' || key.name === 'enter') {
          if (this.options.multiline && key.shift) {
            // Shift+Enter - 新行
            this.insertChar('\n');
          } else {
            // 提交
            this.cleanup(onKeypress);
            if (this.currentInput.trim()) {
              this.addToHistory(this.currentInput);
            }
            resolve(this.currentInput);
          }
          return;
        }

        // Tab - 自动补全
        if (key.name === 'tab') {
          this.handleAutocomplete();
          return;
        }

        // 历史导航
        if (key.name === 'up') {
          this.navigateHistory(-1);
          return;
        }
        if (key.name === 'down') {
          this.navigateHistory(1);
          return;
        }

        // 光标移动
        if (key.name === 'left') {
          if (this.cursorPos > 0) {
            this.cursorPos--;
            this.render();
          }
          return;
        }
        if (key.name === 'right') {
          if (this.cursorPos < this.currentInput.length) {
            this.cursorPos++;
            this.render();
          }
          return;
        }
        if (key.name === 'home') {
          this.cursorPos = 0;
          this.render();
          return;
        }
        if (key.name === 'end') {
          this.cursorPos = this.currentInput.length;
          this.render();
          return;
        }

        // 删除
        if (key.name === 'backspace') {
          if (this.cursorPos > 0) {
            this.currentInput = this.currentInput.slice(0, this.cursorPos - 1) + 
                               this.currentInput.slice(this.cursorPos);
            this.cursorPos--;
            this.render();
          }
          return;
        }
        if (key.name === 'delete') {
          if (this.cursorPos < this.currentInput.length) {
            this.currentInput = this.currentInput.slice(0, this.cursorPos) + 
                               this.currentInput.slice(this.cursorPos + 1);
            this.render();
          }
          return;
        }

        // 输入字符
        if (str && !key.ctrl && !key.meta) {
          this.insertChar(str);
        }
      };

      stdin.on('keypress', onKeypress);
    });
  }

  private insertChar(char: string): void {
    this.currentInput = this.currentInput.slice(0, this.cursorPos) + 
                       char + 
                       this.currentInput.slice(this.cursorPos);
    this.cursorPos += char.length;
    this.render();
  }

  private handleAutocomplete(): void {
    const matches = this.options.completions.filter(c => 
      c.toLowerCase().startsWith(this.currentInput.toLowerCase())
    );
    
    if (matches.length === 1) {
      this.currentInput = matches[0];
      this.cursorPos = this.currentInput.length;
      this.render();
    } else if (matches.length > 1) {
      // 显示可能的补全
      stdout.write('\n');
      matches.forEach(m => console.log(`  ${m}`));
      this.render();
    }
  }

  private navigateHistory(direction: number): void {
    if (this.history.length === 0) return;
    
    this.historyIndex += direction;
    this.historyIndex = Math.max(-1, Math.min(this.historyIndex, this.history.length - 1));
    
    if (this.historyIndex === -1) {
      this.currentInput = '';
    } else {
      this.currentInput = this.history[this.history.length - 1 - this.historyIndex];
    }
    this.cursorPos = this.currentInput.length;
    this.render();
  }

  private addToHistory(input: string): void {
    this.history.push(input);
    if (this.history.length > this.options.maxHistory) {
      this.history.shift();
    }
  }

  private render(): void {
    stdout.write(ANSI.cursorHome + ANSI.clearLine + 
                 this.options.prompt + this.currentInput);
    // 移动光标到正确位置
    const cursorOffset = this.options.prompt.length + this.cursorPos;
    stdout.write(ANSI.cursorHome + `\x1b[${cursorOffset + 1}G`);
  }

  private cleanup(listener: (...args: any[]) => void): void {
    this.isActive = false;
    stdin.removeListener('keypress', listener);
    stdin.setRawMode(false);
    stdout.write('\n');
  }

  getHistory(): string[] {
    return [...this.history];
  }
}

// ============================================
// 增强版渲染器
// ============================================

export class EnhancedTUIRenderer {
  private theme: Theme;
  private loading: LoadingIndicator;
  private progress: ProgressBar;
  private notifications: NotificationManager;

  constructor(theme: Theme = DEFAULT_THEME) {
    this.theme = theme;
    this.loading = new LoadingIndicator(theme);
    this.progress = new ProgressBar(theme);
    this.notifications = new NotificationManager(theme);
  }

  // 基础输出方法
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

  dim(text: string): string {
    return `${ANSI.dim}${text}${ANSI.reset}`;
  }

  italic(text: string): string {
    return `${ANSI.italic}${text}${ANSI.reset}`;
  }

  underline(text: string): string {
    return `${ANSI.underline}${text}${ANSI.reset}`;
  }

  // 渐变文字效果
  gradient(text: string): string {
    const chars = text.split('');
    const colors = this.theme.gradient;
    return chars.map((char, i) => {
      const colorIndex = Math.floor((i / chars.length) * colors.length);
      return `${colors[colorIndex]}${char}${ANSI.reset}`;
    }).join('');
  }

  // 组件渲染
  title(text: string, subtitle?: string): void {
    this.newline();
    console.log(this.bold(this.gradient(text)));
    if (subtitle) {
      console.log(this.secondary(subtitle));
    }
    this.newline();
  }

  box(content: string[], title?: string): void {
    const width = Math.min(process.stdout.columns - 4 || 76, 76);
    const horizontal = '─'.repeat(width);
    
    this.newline();
    console.log(this.theme.border + `┌${horizontal}┐` + ANSI.reset);
    
    if (title) {
      const paddedTitle = ` ${title} `.slice(0, width - 2);
      const titleLine = `│ ${this.bold(title)}${' '.repeat(width - paddedTitle.length - 1)}│`;
      console.log(this.theme.border + titleLine + ANSI.reset);
      console.log(this.theme.border + `├${horizontal}┤` + ANSI.reset);
    }
    
    for (const line of content) {
      const truncated = line.slice(0, width - 4);
      const padded = truncated + ' '.repeat(width - truncated.length - 4);
      console.log(this.theme.border + `│ ${padded} │` + ANSI.reset);
    }
    
    console.log(this.theme.border + `└${horizontal}┘` + ANSI.reset);
    this.newline();
  }

  // 状态徽章
  badge(text: string, type: 'success' | 'warning' | 'error' | 'info' = 'info'): string {
    const colors = {
      success: this.theme.success,
      warning: this.theme.warning,
      error: this.theme.error,
      info: this.theme.info,
    };
    
    return `${colors[type]}${ANSI.bold} ${text} ${ANSI.reset}`;
  }

  // 加载状态
  startLoading(message: string, style?: SpinnerStyle): void {
    this.loading = new LoadingIndicator(this.theme, { style });
    this.loading.start(message);
  }

  stopLoading(): void {
    this.loading.stop();
  }

  updateLoading(message: string): void {
    this.loading.update(message);
  }

  // 进度条
  startProgress(total: number, label?: string): void {
    this.progress.start(total, label);
  }

  updateProgress(current: number, label?: string): void {
    this.progress.update(current, label);
  }

  incrementProgress(amount?: number, label?: string): void {
    this.progress.increment(amount, label);
  }

  completeProgress(label?: string): void {
    this.progress.complete(label);
  }

  // 通知
  notify(notification: Notification): void {
    this.notifications.show(notification);
  }

  notifyInfo(title: string, message: string): void {
    this.notifications.info(title, message);
  }

  notifySuccess(title: string, message: string): void {
    this.notifications.success(title, message);
  }

  notifyWarning(title: string, message: string): void {
    this.notifications.warning(title, message);
  }

  notifyError(title: string, message: string): void {
    this.notifications.error(title, message);
  }

  // 智能输入
  createSmartInput(options?: SmartInputOptions): SmartInput {
    return new SmartInput(options);
  }

  // 设置主题
  setTheme(theme: Theme): void {
    this.theme = theme;
    this.loading = new LoadingIndicator(theme);
    this.progress = new ProgressBar(theme);
    this.notifications = new NotificationManager(theme);
  }

  // 消息渲染
  message(role: 'user' | 'assistant', content: string): void {
    if (role === 'user') {
      console.log(`${this.primary('You:')} ${content}`);
    } else {
      console.log(`${this.secondary('Assistant:')}`);
      console.log(content);
    }
    this.newline();
  }

  // Token 使用统计
  tokenUsage(promptTokens: number, completionTokens: number): void {
    const total = promptTokens + completionTokens;
    console.log(this.muted(`  Tokens: ${promptTokens} prompt + ${completionTokens} completion = ${total} total`));
  }

  // 错误框
  errorBox(title: string, message: string, hint?: string): void {
    this.newline();
    console.log(this.theme.error + '┌' + '─'.repeat(74) + '┐' + ANSI.reset);
    console.log(this.theme.error + `│ ${this.bold(title).padEnd(73)}│` + ANSI.reset);
    console.log(this.theme.error + '├' + '─'.repeat(74) + '┤' + ANSI.reset);
    
    const lines = message.match(/.{1,70}/g) || [message];
    lines.forEach(line => {
      console.log(this.theme.error + `│ ${line.padEnd(73)}│` + ANSI.reset);
    });
    
    if (hint) {
      console.log(this.theme.error + '├' + '─'.repeat(74) + '┤' + ANSI.reset);
      const hintLines = hint.match(/.{1,70}/g) || [hint];
      hintLines.forEach(line => {
        console.log(this.theme.border + `│ ${this.secondary(line).padEnd(73)}│` + ANSI.reset);
      });
    }
    
    console.log(this.theme.error + '└' + '─'.repeat(74) + '┘' + ANSI.reset);
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
    
    console.log(this.secondary('  Commands:'));
    console.log(`    ${this.primary('/help')}     Show available commands`);
    console.log(`    ${this.primary('/clear')}    Clear conversation history`);
    console.log(`    ${this.primary('/exit')}     Exit the CLI`);
    console.log(`    ${this.primary('/config')}   Show configuration info`);
    console.log(`    ${this.primary('/skills')}   List available skills`);
    this.newline();
    
    console.log(this.secondary('  Shortcuts:'));
    console.log(`    ${this.primary('Ctrl+C')}    Exit`);
    console.log(`    ${this.primary('Ctrl+L')}    Clear screen`);
    console.log(`    ${this.primary('Tab')}       Auto-complete`);
    console.log(`    ${this.primary('↑/↓')}       Navigate history`);
    this.newline();
  }
}

// ============================================
// 便捷函数
// ============================================

export function createEnhancedRenderer(theme?: Theme): EnhancedTUIRenderer {
  return new EnhancedTUIRenderer(theme);
}

export function setTheme(themeName: keyof typeof THEMES): EnhancedTUIRenderer {
  return new EnhancedTUIRenderer(THEMES[themeName]);
}

// 默认导出
export default EnhancedTUIRenderer;
