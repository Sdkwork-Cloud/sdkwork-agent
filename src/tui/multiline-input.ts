/**
 * Multiline Input - 多行输入支持
 * 
 * 实现 Shift+Enter 多行输入功能
 * 参考 Claude Code、Codex CLI 的多行输入
 * 
 * @module TUI
 * @version 2.0.0
 */

import { stdin, stdout } from 'process';
import { emitKeypressEvents } from 'readline';

export interface MultilineOptions {
  /** 提示符 */
  prompt?: string;
  /** 多行提示符 */
  multilinePrompt?: string;
  /** 提交快捷键 (默认: Ctrl+Enter) */
  submitKey?: { ctrl: boolean; key: string };
  /** 新行快捷键 (默认: Shift+Enter) */
  newlineKey?: { shift: boolean; key: string };
}

export class MultilineInput {
  private options: Required<MultilineOptions>;
  private lines: string[] = [''];
  private currentLine = 0;
  private cursorPos = 0;
  private isActive = false;

  constructor(options: MultilineOptions = {}) {
    this.options = {
      prompt: options.prompt ?? '> ',
      multilinePrompt: options.multilinePrompt ?? '... ',
      submitKey: options.submitKey ?? { ctrl: true, key: 'return' },
      newlineKey: options.newlineKey ?? { shift: true, key: 'return' },
    };
  }

  /**
   * 读取多行输入
   */
  async read(): Promise<string> {
    return new Promise((resolve, reject) => {
      this.isActive = true;
      this.lines = [''];
      this.currentLine = 0;
      this.cursorPos = 0;

      // 启用原始模式
      stdin.setRawMode(true);
      emitKeypressEvents(stdin);

      // 显示初始提示
      this.render();

      const onKeypress = (str: string, key: { 
        name: string; 
        ctrl: boolean; 
        shift: boolean; 
        meta: boolean;
      }) => {
        if (!this.isActive) return;

        // 处理特殊键
        if (key.ctrl) {
          switch (key.name) {
            case 'c':
              this.cleanup(onKeypress);
              reject(new Error('Interrupted'));
              return;
            case 'd':
              this.cleanup(onKeypress);
              resolve(this.getContent());
              return;
            case 'u':
              this.clearLine();
              return;
            case 'a':
              this.cursorPos = 0;
              this.render();
              return;
            case 'e':
              this.cursorPos = this.lines[this.currentLine].length;
              this.render();
              return;
            case 'k':
              this.lines[this.currentLine] = this.lines[this.currentLine].slice(0, this.cursorPos);
              this.render();
              return;
          }
        }

        // 检查提交键
        if (this.matchesKey(key, this.options.submitKey)) {
          this.cleanup(onKeypress);
          resolve(this.getContent());
          return;
        }

        // 检查新行键 (Shift+Enter)
        if (this.matchesKey(key, this.options.newlineKey)) {
          this.insertNewLine();
          return;
        }

        // 处理导航键
        switch (key.name) {
          case 'up':
            this.moveUp();
            return;
          case 'down':
            this.moveDown();
            return;
          case 'left':
            this.moveLeft();
            return;
          case 'right':
            this.moveRight();
            return;
          case 'home':
            this.cursorPos = 0;
            this.render();
            return;
          case 'end':
            this.cursorPos = this.lines[this.currentLine].length;
            this.render();
            return;
          case 'return':
          case 'enter':
            // 普通 Enter 也插入新行
            this.insertNewLine();
            return;
          case 'backspace':
            this.handleBackspace();
            return;
          case 'delete':
            this.handleDelete();
            return;
        }

        // 处理普通字符
        if (str && str.length > 0 && !key.ctrl && !key.meta) {
          this.insertChar(str);
        }
      };

      stdin.on('keypress', onKeypress);
    });
  }

  /**
   * 匹配快捷键
   */
  private matchesKey(
    key: { ctrl: boolean; shift: boolean; name: string },
    target: { ctrl?: boolean; shift?: boolean; key: string }
  ): boolean {
    const ctrlMatch = (target.ctrl ?? false) === key.ctrl;
    const shiftMatch = (target.shift ?? false) === key.shift;
    const nameMatch = target.key === key.name;
    return ctrlMatch && shiftMatch && nameMatch;
  }

  /**
   * 获取完整内容
   */
  private getContent(): string {
    return this.lines.join('\n');
  }

  /**
   * 清理
   */
  private cleanup(listener: (...args: any[]) => void): void {
    this.isActive = false;
    stdin.removeListener('keypress', listener);
    stdin.setRawMode(false);
    stdout.write('\n');
  }

  /**
   * 渲染当前状态
   */
  private render(): void {
    // 清除所有行
    for (let i = 0; i < this.lines.length; i++) {
      stdout.write('\x1b[2K\x1b[1A');
    }
    stdout.write('\x1b[2K');

    // 重新渲染所有行
    this.lines.forEach((line, index) => {
      const prompt = index === 0 ? this.options.prompt : this.options.multilinePrompt;
      stdout.write(prompt + line + '\n');
    });

    // 移动光标到正确位置
    const linesUp = this.lines.length - this.currentLine - 1;
    if (linesUp > 0) {
      stdout.write(`\x1b[${linesUp}A`);
    }
    const prompt = this.currentLine === 0 ? this.options.prompt : this.options.multilinePrompt;
    stdout.write(`\x1b[${prompt.length + this.cursorPos}C`);
  }

  /**
   * 插入字符
   */
  private insertChar(char: string): void {
    const line = this.lines[this.currentLine];
    this.lines[this.currentLine] = line.slice(0, this.cursorPos) + char + line.slice(this.cursorPos);
    this.cursorPos += char.length;
    this.render();
  }

  /**
   * 插入新行
   */
  private insertNewLine(): void {
    const line = this.lines[this.currentLine];
    const afterCursor = line.slice(this.cursorPos);
    this.lines[this.currentLine] = line.slice(0, this.cursorPos);
    this.lines.splice(this.currentLine + 1, 0, afterCursor);
    this.currentLine++;
    this.cursorPos = 0;
    this.render();
  }

  /**
   * 处理退格
   */
  private handleBackspace(): void {
    if (this.cursorPos > 0) {
      const line = this.lines[this.currentLine];
      this.lines[this.currentLine] = line.slice(0, this.cursorPos - 1) + line.slice(this.cursorPos);
      this.cursorPos--;
      this.render();
    } else if (this.currentLine > 0) {
      // 合并到上一行
      const currentLineContent = this.lines[this.currentLine];
      this.cursorPos = this.lines[this.currentLine - 1].length;
      this.lines[this.currentLine - 1] += currentLineContent;
      this.lines.splice(this.currentLine, 1);
      this.currentLine--;
      this.render();
    }
  }

  /**
   * 处理删除
   */
  private handleDelete(): void {
    const line = this.lines[this.currentLine];
    if (this.cursorPos < line.length) {
      this.lines[this.currentLine] = line.slice(0, this.cursorPos) + line.slice(this.cursorPos + 1);
      this.render();
    } else if (this.currentLine < this.lines.length - 1) {
      // 合并下一行
      this.lines[this.currentLine] += this.lines[this.currentLine + 1];
      this.lines.splice(this.currentLine + 1, 1);
      this.render();
    }
  }

  /**
   * 清除当前行
   */
  private clearLine(): void {
    this.lines[this.currentLine] = '';
    this.cursorPos = 0;
    this.render();
  }

  /**
   * 向上移动
   */
  private moveUp(): void {
    if (this.currentLine > 0) {
      this.currentLine--;
      this.cursorPos = Math.min(this.cursorPos, this.lines[this.currentLine].length);
      this.render();
    }
  }

  /**
   * 向下移动
   */
  private moveDown(): void {
    if (this.currentLine < this.lines.length - 1) {
      this.currentLine++;
      this.cursorPos = Math.min(this.cursorPos, this.lines[this.currentLine].length);
      this.render();
    }
  }

  /**
   * 向左移动
   */
  private moveLeft(): void {
    if (this.cursorPos > 0) {
      this.cursorPos--;
      this.render();
    } else if (this.currentLine > 0) {
      this.currentLine--;
      this.cursorPos = this.lines[this.currentLine].length;
      this.render();
    }
  }

  /**
   * 向右移动
   */
  private moveRight(): void {
    if (this.cursorPos < this.lines[this.currentLine].length) {
      this.cursorPos++;
      this.render();
    } else if (this.currentLine < this.lines.length - 1) {
      this.currentLine++;
      this.cursorPos = 0;
      this.render();
    }
  }
}

/**
 * 读取多行输入的便捷函数
 */
export async function readMultiline(options?: MultilineOptions): Promise<string> {
  const input = new MultilineInput(options);
  return input.read();
}

export default MultilineInput;
