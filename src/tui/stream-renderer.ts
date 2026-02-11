/**
 * Stream Renderer - 流式输出渲染器
 *
 * 实现真正的流式响应，支持打字机效果
 *
 * @module TUI
 * @version 2.0.0
 */

import { stdout } from 'process';
import { DEFAULT_THEME, type Theme } from './renderer.js';

export interface StreamOptions {
  /** 打字速度 (ms/char) */
  typeSpeed?: number;
  /** 是否启用打字效果 */
  typeEffect?: boolean;
  /** 缓冲区大小 */
  bufferSize?: number;
  /** 主题 */
  theme?: Theme;
  /** 前缀 */
  prefix?: string;
  /** 是否自动换行 */
  autoWrap?: boolean;
}

/**
 * 流式渲染器
 */
export class StreamRenderer {
  private options: Required<StreamOptions>;
  private buffer: string = '';
  private isRendering: boolean = false;
  private abortController: AbortController | null = null;

  constructor(options: StreamOptions = {}) {
    this.options = {
      typeSpeed: 10,
      typeEffect: true,
      bufferSize: 1024,
      theme: DEFAULT_THEME,
      prefix: '',
      autoWrap: true,
      ...options,
    };
  }

  /**
   * 开始流式输出
   */
  async start(generator: AsyncGenerator<string>): Promise<void> {
    this.abortController = new AbortController();
    this.isRendering = true;

    try {
      if (this.options.prefix) {
        stdout.write(this.options.prefix);
      }

      for await (const chunk of generator) {
        if (this.abortController.signal.aborted) {
          break;
        }

        if (this.options.typeEffect) {
          await this.typeChunk(chunk);
        } else {
          stdout.write(chunk);
        }

        this.buffer += chunk;

        // 缓冲区溢出保护
        if (this.buffer.length > this.options.bufferSize) {
          this.buffer = this.buffer.slice(-this.options.bufferSize);
        }
      }
    } finally {
      this.isRendering = false;
      this.abortController = null;
    }
  }

  /**
   * 停止流式输出
   */
  stop(): void {
    if (this.abortController) {
      this.abortController.abort();
    }
  }

  /**
   * 打字机效果输出
   */
  private async typeChunk(chunk: string): Promise<void> {
    for (const char of chunk) {
      if (this.abortController?.signal.aborted) {
        break;
      }

      stdout.write(char);

      // 遇到换行符或标点符号时暂停稍长
      const delay = this.getTypeDelay(char);
      await this.sleep(delay);
    }
  }

  /**
   * 获取打字延迟
   */
  private getTypeDelay(char: string): number {
    if (char === '\n') return this.options.typeSpeed * 5;
    if (/[.!?。！？]/.test(char)) return this.options.typeSpeed * 3;
    if (/[,;，；]/.test(char)) return this.options.typeSpeed * 2;
    return this.options.typeSpeed;
  }

  /**
   * 休眠
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 获取当前缓冲区内容
   */
  getBuffer(): string {
    return this.buffer;
  }

  /**
   * 是否正在渲染
   */
  get rendering(): boolean {
    return this.isRendering;
  }
}

/**
 * 创建流式渲染器
 */
export function createStreamRenderer(options?: StreamOptions): StreamRenderer {
  return new StreamRenderer(options);
}

/**
 * 快速流式输出
 */
export async function streamOutput(
  generator: AsyncGenerator<string>,
  options?: StreamOptions
): Promise<void> {
  const renderer = new StreamRenderer(options);
  await renderer.start(generator);
}
