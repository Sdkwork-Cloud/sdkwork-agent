/**
 * CLI Renderer - 命令行渲染器
 *
 * 完美的终端输出渲染系统
 * 支持颜色、格式化、流式输出
 *
 * @module CLI
 * @version 1.0.0
 * @standard Industry Leading
 */

import { stdout } from 'process';
import type { CLIRenderer, RenderOptions, CLITheme } from './types';
import { DEFAULT_THEME } from './types';

// ANSI 颜色代码
const ANSI_COLORS: Record<string, string> = {
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
  brightRed: '\x1b[91m',
  brightGreen: '\x1b[92m',
  brightYellow: '\x1b[93m',
  brightBlue: '\x1b[94m',
  brightMagenta: '\x1b[95m',
  brightCyan: '\x1b[96m',
  brightWhite: '\x1b[97m',
};

/**
 * 完美 CLI 渲染器
 */
export class PerfectRenderer implements CLIRenderer {
  private theme: CLITheme;
  private streaming = false;
  private streamBuffer = '';

  constructor(theme: CLITheme = DEFAULT_THEME) {
    this.theme = theme;
  }

  /**
   * 渲染消息
   */
  message(content: string, options?: RenderOptions): void {
    const formatted = this.format(content, options);
    this.write(formatted);
    if (!options?.noNewline) {
      this.newline();
    }
  }

  /**
   * 渲染代码块
   */
  code(content: string, language?: string): void {
    const width = process.stdout.columns || 80;
    const separator = '─'.repeat(Math.min(width - 2, 78));

    this.newline();
    this.write(this.colorize(`┌${separator}┐`, this.theme.code));
    this.newline();

    if (language) {
      this.write(this.colorize(`│ ${language}`, this.theme.code));
      this.newline();
      this.write(this.colorize(`├${separator}┤`, this.theme.code));
      this.newline();
    }

    const lines = content.split('\n');
    for (const line of lines) {
      const truncated = line.slice(0, width - 4);
      this.write(this.colorize(`│ ${truncated}`, this.theme.code));
      this.newline();
    }

    this.write(this.colorize(`└${separator}┘`, this.theme.code));
    this.newline();
  }

  /**
   * 渲染表格
   */
  table(data: Record<string, unknown>[]): void {
    if (data.length === 0) return;

    const keys = Object.keys(data[0]);
    const widths = keys.map((key) => {
      const values = data.map((row) => String(row[key] ?? '').length);
      return Math.max(key.length, ...values);
    });

    // 表头
    const header = keys.map((key, i) => key.padEnd(widths[i])).join(' │ ');
    this.write(this.colorize(header, this.theme.primary, { bold: true }));
    this.newline();

    // 分隔线
    const separator = widths.map((w) => '─'.repeat(w)).join('─┼─');
    this.write(separator);
    this.newline();

    // 数据行
    for (const row of data) {
      const line = keys.map((key, i) => String(row[key] ?? '').padEnd(widths[i])).join(' │ ');
      this.write(line);
      this.newline();
    }
  }

  /**
   * 渲染列表
   */
  list(items: string[]): void {
    for (const item of items) {
      this.write(`  • ${item}`);
      this.newline();
    }
  }

  /**
   * 渲染错误
   */
  error(error: Error | string): void {
    const message = error instanceof Error ? error.message : error;
    this.write(this.colorize(`✖ ${message}`, this.theme.error));
    this.newline();
  }

  /**
   * 渲染警告
   */
  warning(message: string): void {
    this.write(this.colorize(`⚠ ${message}`, this.theme.warning));
    this.newline();
  }

  /**
   * 渲染成功
   */
  success(message: string): void {
    this.write(this.colorize(`✔ ${message}`, this.theme.success));
    this.newline();
  }

  /**
   * 渲染信息
   */
  info(message: string): void {
    this.write(this.colorize(`ℹ ${message}`, this.theme.info));
    this.newline();
  }

  /**
   * 渲染提示符
   */
  prompt(text: string): void {
    this.write(this.colorize(text, this.theme.prompt, { bold: true }));
  }

  /**
   * 清屏
   */
  clear(): void {
    stdout.write('\x1b[2J\x1b[0f');
  }

  /**
   * 换行
   */
  newline(): void {
    stdout.write('\n');
  }

  /**
   * 流式输出
   */
  stream(chunk: string): void {
    if (!this.streaming) {
      this.streaming = true;
      this.streamBuffer = '';
    }

    this.streamBuffer += chunk;
    stdout.write(chunk);
  }

  /**
   * 结束流式输出
   */
  endStream(): void {
    if (this.streaming) {
      this.streaming = false;
      this.newline();
      this.streamBuffer = '';
    }
  }

  // ============================================
  // Private Methods
  // ============================================

  private write(content: string): void {
    stdout.write(content);
  }

  private format(content: string, options?: RenderOptions): string {
    let formatted = content;

    if (options?.prefix) {
      formatted = `${options.prefix} ${formatted}`;
    }

    if (options?.color) {
      formatted = this.colorize(formatted, options.color, {
        bold: options?.bold,
        italic: options?.italic,
        underline: options?.underline,
      });
    } else if (options?.bold || options?.italic || options?.underline) {
      formatted = this.applyStyles(formatted, options);
    }

    return formatted;
  }

  private colorize(text: string, color: string, styles?: { bold?: boolean; italic?: boolean; underline?: boolean }): string {
    const ansiColor = this.hexToAnsi(color);
    let result = `${ansiColor}${text}${ANSI_COLORS.reset}`;

    if (styles?.bold) {
      result = `${ANSI_COLORS.bold}${result}${ANSI_COLORS.reset}`;
    }
    if (styles?.italic) {
      result = `${ANSI_COLORS.italic}${result}${ANSI_COLORS.reset}`;
    }
    if (styles?.underline) {
      result = `${ANSI_COLORS.underline}${result}${ANSI_COLORS.reset}`;
    }

    return result;
  }

  private applyStyles(text: string, styles: { bold?: boolean; italic?: boolean; underline?: boolean }): string {
    let result = text;

    if (styles.bold) {
      result = `${ANSI_COLORS.bold}${result}${ANSI_COLORS.reset}`;
    }
    if (styles.italic) {
      result = `${ANSI_COLORS.italic}${result}${ANSI_COLORS.reset}`;
    }
    if (styles.underline) {
      result = `${ANSI_COLORS.underline}${result}${ANSI_COLORS.reset}`;
    }

    return result;
  }

  private hexToAnsi(hex: string): string {
    // 简化的 hex 到 ANSI 转换
    const colorMap: Record<string, string> = {
      '#ef4444': ANSI_COLORS.red,
      '#f59e0b': ANSI_COLORS.yellow,
      '#10b981': ANSI_COLORS.green,
      '#3b82f6': ANSI_COLORS.blue,
      '#f472b6': ANSI_COLORS.magenta,
      '#06b6d4': ANSI_COLORS.cyan,
      '#6b7280': ANSI_COLORS.dim,
      '#e5e7eb': ANSI_COLORS.white,
      '#00d4aa': ANSI_COLORS.brightCyan,
    };

    return colorMap[hex.toLowerCase()] || ANSI_COLORS.reset;
  }
}

// ============================================
// Factory
// ============================================

/**
 * 创建渲染器
 */
export function createRenderer(theme?: CLITheme): PerfectRenderer {
  return new PerfectRenderer(theme);
}
