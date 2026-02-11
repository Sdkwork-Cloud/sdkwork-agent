/**
 * TUI Renderer - 专业级终端渲染器
 * 
 * 参考 Claude Code、Codex CLI 等顶级工具设计
 * 
 * @module TUI
 * @version 2.0.0
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
  cursorUp: '\x1b[1A',
  cursorDown: '\x1b[1B',
  cursorLeft: '\x1b[1D',
  cursorRight: '\x1b[1C',
  cursorHome: '\x1b[0G',
  hideCursor: '\x1b[?25l',
  showCursor: '\x1b[?25h',
  saveCursor: '\x1b[s',
  restoreCursor: '\x1b[u',
} as const;

// ============================================
// 主题配置
// ============================================

export interface Theme {
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
}

export const DEFAULT_THEME: Theme = {
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
};

// ============================================
// 加载动画
// ============================================

export class LoadingIndicator {
  private frames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
  private interval: NodeJS.Timeout | null = null;
  private currentFrame = 0;
  private message = '';
  private theme: Theme;

  constructor(theme: Theme = DEFAULT_THEME) {
    this.theme = theme;
  }

  start(message: string): void {
    this.message = message;
    this.currentFrame = 0;
    
    // 立即显示第一帧
    this.render();
    
    this.interval = setInterval(() => {
      this.currentFrame = (this.currentFrame + 1) % this.frames.length;
      this.render();
    }, 80);
  }

  stop(): void {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
      // 清除行
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
    const output = `${this.theme.primary}${frame}${ANSI.reset} ${this.message}`;
    stdout.write(ANSI.cursorHome + ANSI.clearLine + output);
  }
}

// ============================================
// 渲染器类
// ============================================

export class TUIRenderer {
  private theme: Theme;
  private loading: LoadingIndicator;

  constructor(theme: Theme = DEFAULT_THEME) {
    this.theme = theme;
    this.loading = new LoadingIndicator(theme);
  }

  // ----------------------------------------
  // 基础输出方法
  // ----------------------------------------

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

  // ----------------------------------------
  // 样式化输出
  // ----------------------------------------

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

  // ----------------------------------------
  // 组件渲染
  // ----------------------------------------

  /**
   * 渲染标题
   */
  title(text: string, subtitle?: string): void {
    this.newline();
    console.log(this.bold(this.primary(text)));
    if (subtitle) {
      console.log(this.secondary(subtitle));
    }
    this.newline();
  }

  /**
   * 渲染带边框的盒子
   */
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

  /**
   * 渲染代码块
   */
  code(content: string, language?: string): void {
    const width = Math.min(process.stdout.columns - 4 || 76, 76);
    const separator = '─'.repeat(width);
    
    this.newline();
    console.log(this.theme.border + `┌${separator}┐` + ANSI.reset);
    
    if (language) {
      const langStr = ` ${language} `.slice(0, width - 2);
      console.log(this.theme.border + `│${this.muted(langStr)}${' '.repeat(width - langStr.length)}│` + ANSI.reset);
      console.log(this.theme.border + `├${separator}┤` + ANSI.reset);
    }
    
    const lines = content.split('\n');
    for (const line of lines) {
      const truncated = line.slice(0, width - 4);
      const padded = truncated + ' '.repeat(Math.max(0, width - truncated.length - 4));
      console.log(this.theme.border + `│ ${padded} │` + ANSI.reset);
    }
    
    console.log(this.theme.border + `└${separator}┘` + ANSI.reset);
    this.newline();
  }

  /**
   * 渲染列表
   */
  list(items: string[], ordered = false): void {
    items.forEach((item, index) => {
      const prefix = ordered ? `${index + 1}.` : '•';
      console.log(`  ${this.secondary(prefix)} ${item}`);
    });
  }

  /**
   * 渲染键值对
   */
  keyValue(pairs: Record<string, string>): void {
    const maxKeyLength = Math.max(...Object.keys(pairs).map(k => k.length));
    
    for (const [key, value] of Object.entries(pairs)) {
      const paddedKey = key.padEnd(maxKeyLength);
      console.log(`  ${this.secondary(paddedKey)}  ${value}`);
    }
  }

  /**
   * 渲染分隔线
   */
  divider(char = '─'): void {
    const width = process.stdout.columns || 80;
    console.log(this.theme.border + char.repeat(width) + ANSI.reset);
  }

  /**
   * 渲染消息气泡
   */
  message(role: 'user' | 'assistant' | 'system', content: string): void {
    const icons = {
      user: '👤',
      assistant: '🤖',
      system: '⚙️',
    };
    
    const colors = {
      user: this.theme.primary,
      assistant: this.theme.success,
      system: this.theme.muted,
    };
    
    this.newline();
    console.log(`${colors[role]}${icons[role]} ${this.bold(role.charAt(0).toUpperCase() + role.slice(1))}${ANSI.reset}`);
    console.log(content);
    this.newline();
  }

  /**
   * 渲染状态徽章
   */
  badge(text: string, type: 'success' | 'warning' | 'error' | 'info' = 'info'): string {
    const colors = {
      success: this.theme.success,
      warning: this.theme.warning,
      error: this.theme.error,
      info: this.theme.info,
    };
    
    return `${colors[type]}${text}${ANSI.reset}`;
  }

  // ----------------------------------------
  // 加载状态
  // ----------------------------------------

  startLoading(message: string): void {
    this.loading.start(message);
  }

  stopLoading(): void {
    this.loading.stop();
  }

  updateLoading(message: string): void {
    this.loading.update(message);
  }

  // ----------------------------------------
  // 欢迎界面
  // ----------------------------------------

  welcome(config: { name: string; version?: string; description?: string }): void {
    this.clear();
    
    const lines = [
      '',
      this.bold(this.primary('  🚀 SDKWork Agent CLI')),
      '',
      `  ${config.description || 'Your AI-powered development companion'}`,
      '',
      this.secondary('  Commands:'),
      `    ${this.primary('/help')}     Show available commands`,
      `    ${this.primary('/clear')}    Clear conversation history`,
      `    ${this.primary('/exit')}     Exit the CLI`,
      `    ${this.primary('/config')}   Show configuration info`,
      `    ${this.primary('/skills')}   List available skills`,
      '',
      this.secondary('  Shortcuts:'),
      `    ${this.primary('Ctrl+C')}    Exit`,
      `    ${this.primary('Ctrl+L')}    Clear screen`,
      '',
    ];
    
    this.box(lines, `Agent: ${config.name}`);
  }

  // ----------------------------------------
  // 帮助界面
  // ----------------------------------------

  help(commands: Array<{ name: string; description: string; alias?: string }>): void {
    this.newline();
    console.log(this.bold('📖 Available Commands:'));
    this.newline();
    
    for (const cmd of commands) {
      const alias = cmd.alias ? this.muted(`(${cmd.alias})`) : '';
      console.log(`  ${this.primary('/' + cmd.name)} ${alias}`);
      console.log(`      ${cmd.description}`);
      this.newline();
    }
    
    console.log(this.secondary('💡 Tips:'));
    console.log('  • Type your message and press Enter to chat');
    console.log('  • Use Shift+Enter for multi-line input');
    console.log('  • The agent remembers context from your conversation');
    this.newline();
  }

  // ----------------------------------------
  // 错误显示
  // ----------------------------------------

  errorBox(title: string, message: string, suggestion?: string): void {
    this.newline();
    console.log(this.error('┌────────────────────────────────────────────────────────────┐'));
    console.log(this.error(`│  ❌ ${this.bold(title).padEnd(55)}│`));
    console.log(this.error('├────────────────────────────────────────────────────────────┤'));
    
    const lines = message.split('\n');
    for (const line of lines) {
      console.log(this.error(`│  ${line.padEnd(58)}│`));
    }
    
    if (suggestion) {
      console.log(this.error('├────────────────────────────────────────────────────────────┤'));
      console.log(this.error(`│  💡 ${this.bold('Suggestion:').padEnd(52)}│`));
      const suggestionLines = suggestion.split('\n');
      for (const line of suggestionLines) {
        console.log(this.error(`│     ${line.padEnd(55)}│`));
      }
    }
    
    console.log(this.error('└────────────────────────────────────────────────────────────┘'));
    this.newline();
  }

  // ----------------------------------------
  // Token 使用统计
  // ----------------------------------------

  tokenUsage(promptTokens: number, completionTokens: number): void {
    const total = promptTokens + completionTokens;
    console.log(this.secondary(`  📊 Tokens: ${promptTokens} + ${completionTokens} = ${total}`));
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
