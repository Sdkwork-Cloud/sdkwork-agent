/**
 * Interactive Selector - 交互式选择器
 *
 * 支持键盘导航的交互式选择组件
 * 参考 Claude Code、Codex CLI、OpenCode 等顶级 CLI 工具设计
 *
 * @module TUI
 * @version 1.0.0
 */

import { stdin, stdout } from 'process';
import { ANSI, COLORS } from './ansi-codes.js';

const DEBUG = process.env.TUI_DEBUG === 'true';

function debugLog(message: string, error?: unknown): void {
  if (DEBUG) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error(`${COLORS.warning}[TUI Debug]${ANSI.reset} ${message}${errorMsg ? `: ${errorMsg}` : ''}`);
  }
}

export interface SelectOption<T = string> {
  value: T;
  label: string;
  description?: string;
  disabled?: boolean;
}

export interface SelectConfig<T = string> {
  message: string;
  options: SelectOption<T>[];
  defaultIndex?: number;
  pageSize?: number;
  timeout?: number;
  theme?: {
    primary: string;
    secondary: string;
    selected: string;
    disabled: string;
    pointer: string;
    active: string;
  };
}

const DEFAULT_THEME = {
  primary: COLORS.primary,
  secondary: COLORS.secondary,
  selected: COLORS.success,
  disabled: COLORS.muted,
  pointer: `${COLORS.primary}❯`,
  active: ANSI.bold,
};

export class InteractiveSelector<T = string> {
  private config: SelectConfig<T>;
  private selectedIndex: number;
  private scrollTop: number;
  private resolved: boolean = false;
  private dataHandler: ((data: string) => void) | null = null;
  private timeoutId: NodeJS.Timeout | null = null;

  constructor(config: SelectConfig<T>) {
    this.config = {
      pageSize: 10,
      defaultIndex: 0,
      ...config,
    };
    this.selectedIndex = this.config.defaultIndex || 0;
    this.scrollTop = 0;
  }

  async select(): Promise<T | null> {
    if (this.config.options.length === 0) {
      console.log(`${this.config.theme?.secondary || COLORS.secondary}没有可选项${ANSI.reset}`);
      return null;
    }

    if (this.config.options.length === 1) {
      const option = this.config.options[0];
      if (option.disabled) {
        console.log(`${this.config.theme?.disabled || COLORS.muted}唯一选项已禁用${ANSI.reset}`);
        return null;
      }
      return option.value;
    }

    return new Promise((resolve) => {
      stdout.write(ANSI.hideCursor);

      this.render();

      const wasRaw = stdin.isTTY && stdin.isRaw;

      if (stdin.isTTY) {
        stdin.setRawMode(true);
      }
      stdin.resume();
      stdin.setEncoding('utf8');

      if (this.config.timeout && this.config.timeout > 0) {
        this.timeoutId = setTimeout(() => {
          if (!this.resolved) {
            this.cancel(resolve, wasRaw, true);
          }
        }, this.config.timeout);
      }

      this.dataHandler = (data: string) => {
        if (this.resolved) return;

        const key = data.toString();

        if (key === '\u001b[A' || key === 'k') {
          this.moveUp();
        } else if (key === '\u001b[B' || key === 'j') {
          this.moveDown();
        } else if (key === '\u001b[5~') {
          this.pageUp();
        } else if (key === '\u001b[6~') {
          this.pageDown();
        } else if (key === '\u001b[H' || key === 'g') {
          this.goToFirst();
        } else if (key === '\u001b[F' || key === 'G') {
          this.goToLast();
        } else if (key === '\r' || key === '\n') {
          this.confirm(resolve, wasRaw);
        } else if (key === '\u001b' || key === 'q') {
          this.cancel(resolve, wasRaw);
        } else if (/^[0-9]$/.test(key)) {
          this.selectByNumber(parseInt(key), resolve, wasRaw);
        }
      };

      stdin.on('data', this.dataHandler);
    });
  }

  private cleanup(wasRaw?: boolean): void {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }

    if (this.dataHandler) {
      stdin.off('data', this.dataHandler);
      this.dataHandler = null;
    }

    if (stdin.isTTY && wasRaw !== undefined) {
      try {
        stdin.setRawMode(wasRaw);
      } catch (err) {
        debugLog('Failed to restore rawMode in InteractiveSelector.cleanup', err);
      }
    }

    stdout.write(ANSI.showCursor);
  }

  private render(): void {
    const theme = this.config.theme || DEFAULT_THEME;
    const options = this.config.options;
    const pageSize = this.config.pageSize || 10;
    const totalOptions = options.length;

    // 计算滚动位置
    if (this.selectedIndex < this.scrollTop) {
      this.scrollTop = this.selectedIndex;
    } else if (this.selectedIndex >= this.scrollTop + pageSize) {
      this.scrollTop = this.selectedIndex - pageSize + 1;
    }

    // 清除之前的渲染
    const linesToClear = pageSize + 4;
    for (let i = 0; i < linesToClear; i++) {
      stdout.write(ANSI.cursorUp + ANSI.clearLine);
    }

    // 显示标题
    stdout.write(ANSI.cursorHome + ANSI.clearLine);
    console.log(`${theme.primary}${this.config.message}${ANSI.reset}`);
    console.log('');

    // 显示滚动指示器（上方）
    if (this.scrollTop > 0) {
      console.log(ANSI.clearLine + `${theme.secondary}  ↑ 还有 ${this.scrollTop} 个选项${ANSI.reset}`);
    }

    // 显示选项
    const endIndex = Math.min(this.scrollTop + pageSize, totalOptions);
    for (let i = this.scrollTop; i < endIndex; i++) {
      const option = options[i];
      const isSelected = i === this.selectedIndex;
      const isDisabled = option.disabled;

      // 计算显示编号
      const displayNum = i + 1;

      if (isDisabled) {
        const line = `  ${theme.disabled}○ ${option.label}${ANSI.reset}`;
        console.log(ANSI.clearLine + line);
      } else if (isSelected) {
        const pointer = `${theme.pointer} ${ANSI.reset}`;
        const label = `${theme.active}${theme.selected}${option.label}${ANSI.reset}`;
        const desc = option.description ? ` ${theme.secondary}${option.description}${ANSI.reset}` : '';
        console.log(ANSI.clearLine + pointer + label + desc);
      } else {
        const line = `    ${option.label}${ANSI.reset}`;
        const desc = option.description ? ` ${theme.secondary}${option.description}${ANSI.reset}` : '';
        console.log(ANSI.clearLine + line + desc);
      }
    }

    // 显示滚动指示器（下方）
    if (totalOptions > pageSize) {
      const more = totalOptions - endIndex;
      if (more > 0) {
        console.log(ANSI.clearLine + `${theme.secondary}  ↓ 还有 ${more} 个选项${ANSI.reset}`);
      }
    }

    // 显示操作提示
    console.log('');
    stdout.write(ANSI.clearLine);
    const position = `${theme.secondary}[${this.selectedIndex + 1}/${totalOptions}]${ANSI.reset}`;
    const hints = ` ↑/↓ 选择 | Enter 确认 | 0-9 快速选择 | Esc 取消`;
    console.log(position + hints);
  }

  private moveUp(): void {
    const enabledOptions = this.config.options
      .map((opt, idx) => ({ opt, idx }))
      .filter(({ opt }) => !opt.disabled);
    
    if (enabledOptions.length === 0) return;

    const currentEnabledIdx = enabledOptions.findIndex(({ idx }) => idx === this.selectedIndex);
    const prevIdx = currentEnabledIdx > 0 ? currentEnabledIdx - 1 : enabledOptions.length - 1;
    this.selectedIndex = enabledOptions[prevIdx].idx;
    this.render();
  }

  private moveDown(): void {
    const enabledOptions = this.config.options
      .map((opt, idx) => ({ opt, idx }))
      .filter(({ opt }) => !opt.disabled);
    
    if (enabledOptions.length === 0) return;

    const currentEnabledIdx = enabledOptions.findIndex(({ idx }) => idx === this.selectedIndex);
    const nextIdx = currentEnabledIdx < enabledOptions.length - 1 ? currentEnabledIdx + 1 : 0;
    this.selectedIndex = enabledOptions[nextIdx].idx;
    this.render();
  }

  private pageUp(): void {
    const pageSize = this.config.pageSize || 10;
    this.selectedIndex = Math.max(0, this.selectedIndex - pageSize);
    // 跳过禁用项
    while (this.config.options[this.selectedIndex]?.disabled && this.selectedIndex > 0) {
      this.selectedIndex--;
    }
    this.render();
  }

  private pageDown(): void {
    const pageSize = this.config.pageSize || 10;
    const maxIdx = this.config.options.length - 1;
    this.selectedIndex = Math.min(maxIdx, this.selectedIndex + pageSize);
    // 跳过禁用项
    while (this.config.options[this.selectedIndex]?.disabled && this.selectedIndex < maxIdx) {
      this.selectedIndex++;
    }
    this.render();
  }

  private goToFirst(): void {
    this.selectedIndex = 0;
    while (this.config.options[this.selectedIndex]?.disabled && this.selectedIndex < this.config.options.length - 1) {
      this.selectedIndex++;
    }
    this.render();
  }

  private goToLast(): void {
    this.selectedIndex = this.config.options.length - 1;
    while (this.config.options[this.selectedIndex]?.disabled && this.selectedIndex > 0) {
      this.selectedIndex--;
    }
    this.render();
  }

  private confirm(resolve: (value: T | null) => void, wasRaw?: boolean): void {
    if (this.resolved) return;
    this.resolved = true;

    const option = this.config.options[this.selectedIndex];
    this.cleanup(wasRaw);

    const theme = this.config.theme || DEFAULT_THEME;
    console.log('');
    console.log(`${theme.selected}✓${ANSI.reset} 已选择: ${option.label}`);

    resolve(option.disabled ? null : option.value);
  }

  private cancel(resolve: (value: T | null) => void, wasRaw?: boolean, isTimeout = false): void {
    if (this.resolved) return;
    this.resolved = true;

    this.cleanup(wasRaw);

    const theme = this.config.theme || DEFAULT_THEME;
    console.log('');
    if (isTimeout) {
      console.log(`${theme.secondary}操作超时${ANSI.reset}`);
    } else {
      console.log(`${theme.secondary}已取消${ANSI.reset}`);
    }

    resolve(null);
  }

  private selectByNumber(num: number, resolve: (value: T | null) => void, wasRaw?: boolean): void {
    // 0 选择第 10 个选项
    const idx = num === 0 ? 9 : num - 1;
    if (idx >= 0 && idx < this.config.options.length) {
      const option = this.config.options[idx];
      if (!option.disabled) {
        this.selectedIndex = idx;
        this.confirm(resolve, wasRaw);
      }
    }
  }
}

/**
 * 创建交互式选择器
 */
export function createSelector<T = string>(config: SelectConfig<T>): InteractiveSelector<T> {
  return new InteractiveSelector(config);
}

/**
 * 快速选择
 */
export async function select<T = string>(
  message: string,
  options: SelectOption<T>[],
  config?: Partial<SelectConfig<T>>
): Promise<T | null> {
  const selector = new SelectorBuilder<T>()
    .message(message)
    .options(options)
    .apply(config || {})
    .build();
  return selector.select();
}

/**
 * 选择器构建器
 */
export class SelectorBuilder<T = string> {
  private config: Partial<SelectConfig<T>> = {};

  message(message: string): this {
    this.config.message = message;
    return this;
  }

  options(options: SelectOption<T>[]): this {
    this.config.options = options;
    return this;
  }

  defaultIndex(index: number): this {
    this.config.defaultIndex = index;
    return this;
  }

  pageSize(size: number): this {
    this.config.pageSize = size;
    return this;
  }

  theme(theme: SelectConfig<T>['theme']): this {
    this.config.theme = theme;
    return this;
  }

  apply(config: Partial<SelectConfig<T>>): this {
    this.config = { ...this.config, ...config };
    return this;
  }

  build(): InteractiveSelector<T> {
    return new InteractiveSelector(this.config as SelectConfig<T>);
  }
}

/**
 * 确认对话框
 */
export async function confirm(
  message: string,
  defaultValue: boolean = false
): Promise<boolean> {
  const options: SelectOption<boolean>[] = [
    { value: true, label: '是', description: '' },
    { value: false, label: '否', description: '' },
  ];

  const result = await select(message, options, {
    defaultIndex: defaultValue ? 0 : 1,
    pageSize: 2,
  });

  return result === true;
}

/**
 * 多选选择器
 */
export class MultiSelector<T = string> {
  private config: SelectConfig<T>;
  private selectedIndices: Set<number>;
  private currentIndex: number;
  private scrollTop: number;
  private resolved: boolean = false;
  private dataHandler: ((data: string) => void) | null = null;

  constructor(config: SelectConfig<T>) {
    this.config = {
      pageSize: 10,
      defaultIndex: 0,
      ...config,
    };
    this.currentIndex = this.config.defaultIndex || 0;
    this.scrollTop = 0;
    this.selectedIndices = new Set();
  }

  async select(): Promise<T[]> {
    return new Promise((resolve) => {
      stdout.write(ANSI.hideCursor);
      this.render();

      // 保存之前的 rawMode 状态
      const wasRaw = stdin.isTTY && stdin.isRaw;

      if (stdin.isTTY) {
        stdin.setRawMode(true);
      }
      stdin.resume();
      stdin.setEncoding('utf8');

      this.dataHandler = (data: string) => {
        if (this.resolved) return;

        const key = data.toString();

        if (key === '\u001b[A' || key === 'k') {
          this.moveUp();
        } else if (key === '\u001b[B' || key === 'j') {
          this.moveDown();
        } else if (key === ' ') {
          // 空格切换选择
          this.toggle();
        } else if (key === 'a') {
          // a 全选/取消全选
          this.toggleAll();
        } else if (key === '\r' || key === '\n') {
          this.confirm(resolve, wasRaw);
        } else if (key === '\u001b' || key === 'q') {
          this.cancel(resolve, wasRaw);
        }
      };

      stdin.on('data', this.dataHandler);
    });
  }

  // 清理函数 - 恢复 stdin 状态
  private cleanup(wasRaw?: boolean): void {
    if (this.dataHandler) {
      stdin.off('data', this.dataHandler);
      this.dataHandler = null;
    }

    // 恢复 rawMode 状态
    if (stdin.isTTY && wasRaw !== undefined) {
      try {
        stdin.setRawMode(wasRaw);
      } catch (err) {
        debugLog('Failed to restore rawMode in MultiSelector.cleanup', err);
      }
    }

    stdout.write(ANSI.showCursor);
  }

  private render(): void {
    const theme = this.config.theme || DEFAULT_THEME;
    const options = this.config.options;
    const pageSize = this.config.pageSize || 10;

    // 清除之前的渲染
    const linesToClear = pageSize + 4;
    for (let i = 0; i < linesToClear; i++) {
      stdout.write(ANSI.cursorUp + ANSI.clearLine);
    }

    // 显示标题
    stdout.write(ANSI.cursorHome + ANSI.clearLine);
    console.log(`${theme.primary}${this.config.message}${ANSI.reset}`);
    console.log('');

    // 显示选项
    const endIndex = Math.min(this.scrollTop + pageSize, options.length);
    for (let i = this.scrollTop; i < endIndex; i++) {
      const option = options[i];
      const isCurrent = i === this.currentIndex;
      const isSelected = this.selectedIndices.has(i);

      const checkbox = isSelected ? `${theme.selected}◉${ANSI.reset}` : '○';
      const pointer = isCurrent ? `${theme.pointer} ` : '  ';
      const label = isCurrent ? `${theme.active}${option.label}${ANSI.reset}` : option.label;

      console.log(ANSI.clearLine + pointer + checkbox + ' ' + label);
    }

    // 显示操作提示
    console.log('');
    stdout.write(ANSI.clearLine);
    const hints = `${theme.secondary}↑/↓ 移动 | Space 选择 | a 全选 | Enter 确认 | Esc 取消${ANSI.reset}`;
    console.log(hints);
  }

  private moveUp(): void {
    this.currentIndex = Math.max(0, this.currentIndex - 1);
    this.render();
  }

  private moveDown(): void {
    this.currentIndex = Math.min(this.config.options.length - 1, this.currentIndex + 1);
    this.render();
  }

  private toggle(): void {
    if (this.selectedIndices.has(this.currentIndex)) {
      this.selectedIndices.delete(this.currentIndex);
    } else {
      this.selectedIndices.add(this.currentIndex);
    }
    this.render();
  }

  private toggleAll(): void {
    if (this.selectedIndices.size === this.config.options.length) {
      this.selectedIndices.clear();
    } else {
      this.config.options.forEach((_, idx) => this.selectedIndices.add(idx));
    }
    this.render();
  }

  private confirm(resolve: (value: T[]) => void, wasRaw?: boolean): void {
    if (this.resolved) return;
    this.resolved = true;

    this.cleanup(wasRaw);

    const theme = this.config.theme || DEFAULT_THEME;
    const selected = Array.from(this.selectedIndices).map(
      idx => this.config.options[idx].value
    );

    console.log('');
    if (selected.length > 0) {
      console.log(`${theme.selected}✓${ANSI.reset} 已选择 ${selected.length} 项`);
    } else {
      console.log(`${theme.secondary}未选择任何项${ANSI.reset}`);
    }

    resolve(selected);
  }

  private cancel(resolve: (value: T[]) => void, wasRaw?: boolean): void {
    if (this.resolved) return;
    this.resolved = true;

    this.cleanup(wasRaw);

    const theme = this.config.theme || DEFAULT_THEME;
    console.log('');
    console.log(`${theme.secondary}已取消${ANSI.reset}`);

    resolve([]);
  }
}

/**
 * 输入框 - 使用原始输入模式，避免与 CLI readline 冲突
 */
export interface PromptConfig {
  defaultValue?: string;
  timeout?: number;
}

export async function prompt(
  message: string,
  defaultValue?: string | PromptConfig
): Promise<string | null> {
  const config: PromptConfig = typeof defaultValue === 'string' 
    ? { defaultValue } 
    : (defaultValue || {});

  return new Promise((resolve) => {
    const promptText = config.defaultValue
      ? `${message} (${config.defaultValue}): `
      : `${message}: `;
    stdout.write(promptText);

    const wasRaw = stdin.isTTY && stdin.isRaw;

    if (stdin.isTTY) {
      try {
        stdin.setRawMode(false);
      } catch (err) {
        debugLog('Failed to disable rawMode in prompt', err);
      }
    }
    stdin.resume();
    stdin.setEncoding('utf8');

    let input = '';
    let resolved = false;
    let timeoutId: NodeJS.Timeout | null = null;

    const cleanup = () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
      stdin.off('data', onData);
      if (stdin.isTTY && wasRaw !== undefined) {
        try {
          stdin.setRawMode(wasRaw);
        } catch (err) {
          debugLog('Failed to restore rawMode in prompt cleanup', err);
        }
      }
    };

    if (config.timeout && config.timeout > 0) {
      timeoutId = setTimeout(() => {
        if (!resolved) {
          resolved = true;
          cleanup();
          stdout.write('\n');
          console.log(`${COLORS.secondary}操作超时${ANSI.reset}`);
          resolve(null);
        }
      }, config.timeout);
    }

    const onData = (data: string) => {
      if (resolved) return;

      const key = data.toString();

      if (key === '\r' || key === '\n') {
        resolved = true;
        cleanup();
        stdout.write('\n');
        const result = input.trim() || config.defaultValue || '';
        resolve(result || null);
        return;
      }

      if (key === '\u0003') {
        resolved = true;
        cleanup();
        stdout.write('\n');
        resolve(null);
        return;
      }

      if (key === '\u007f' || key === '\b') {
        if (input.length > 0) {
          input = input.slice(0, -1);
          stdout.write('\b \b');
        }
        return;
      }

      if (key >= ' ' && key <= '~') {
        input += key;
        stdout.write(key);
      }
    };

    stdin.on('data', onData);
  });
}

export interface PromptOptions {
  defaultValue?: string;
  validate?: (value: string) => string | true;
  maxRetries?: number;
  placeholder?: string;
}

export async function promptWithValidation(
  message: string,
  options: PromptOptions = {}
): Promise<string | null> {
  const { defaultValue, validate, maxRetries = 3, placeholder } = options;
  let retries = 0;

  while (retries < maxRetries) {
    const value = await prompt(
      placeholder ? `${message} (${placeholder})` : message,
      defaultValue
    );

    if (value === null) {
      return null;
    }

    if (!validate) {
      return value;
    }

    const validationResult = validate(value);
    if (validationResult === true) {
      return value;
    }

    stdout.write(`${COLORS.error}✗ ${validationResult}${ANSI.reset}\n`);
    retries++;
  }

  return null;
}
