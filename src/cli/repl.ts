/**
 * REPL - Read-Eval-Print Loop
 *
 * 参考 Claude Code、Codex CLI 等顶级智能体设计
 * 完美的命令行对话循环实现
 *
 * @module CLI
 * @version 1.0.0
 * @standard Industry Leading
 */

import { createInterface, type Interface } from 'readline';
import { stdin, stdout } from 'process';
import type {
  REPL,
  REPLConfig,
  CommandResult,
  ConversationState,
  ParsedCommand,
  CommandContext,
  CLIEvents,
} from './types';
import { AgentEventEmitter } from '../utils/typed-event-emitter.js';
import { createLogger } from '../utils/logger.js';
import type { Logger } from '../utils/logger.js';

// ============================================
// Perfect REPL Implementation
// ============================================

/**
 * 完美 REPL 实现
 *
 * 特性：
 * 1. 优雅的错误处理
 * 2. 流式输出支持
 * 3. 状态机驱动
 * 4. 事件驱动架构
 * 5. 优雅的退出处理
 */
export class PerfectREPL implements REPL {
  private config: REPLConfig;
  private state: ConversationState = 'idle';
  private rl: Interface | null = null;
  private eventEmitter: AgentEventEmitter;
  private logger: Logger;
  private running = false;
  private abortController: AbortController | null = null;

  constructor(config: REPLConfig) {
    this.config = config;
    this.eventEmitter = new AgentEventEmitter();
    this.logger = createLogger({ name: 'REPL' });
  }

  /**
   * 启动 REPL 循环
   */
  async start(): Promise<void> {
    if (this.running) {
      this.logger.warn('REPL is already running');
      return;
    }

    this.running = true;
    this.setState('input');

    // 发射启动事件
    this.emit('cli:start', { timestamp: new Date() });

    // 创建 readline 接口
    this.rl = createInterface({
      input: stdin,
      output: stdout,
      prompt: this.getPrompt(),
      historySize: 1000,
    });

    // 设置事件处理器
    this.setupEventHandlers();

    // 显示欢迎消息
    this.showWelcome();

    // 启动主循环
    await this.mainLoop();
  }

  /**
   * 停止 REPL 循环
   */
  async stop(): Promise<void> {
    if (!this.running) return;

    this.running = false;

    // 中止当前操作
    this.abortController?.abort();

    // 关闭 readline
    this.rl?.close();
    this.rl = null;

    // 发射退出事件
    this.emit('cli:exit', { timestamp: new Date(), code: 0 });
  }

  /**
   * 执行命令
   */
  async execute(input: string): Promise<CommandResult> {
    // 解析命令
    const command = this.parseCommand(input);

    // 发射命令事件
    this.emit('cli:command', { command });

    // 查找命令处理器
    const handler = this.findCommandHandler(command);

    if (!handler) {
      return {
        success: false,
        message: `Unknown command: ${command.name || command.raw}`,
        continue: true,
        error: new Error(`Unknown command: ${command.name || command.raw}`),
      };
    }

    // 构建命令上下文
    const context: CommandContext = {
      command,
      agent: this.config.context.agent as CommandContext['agent'],
      sessionId: this.config.history.sessionId,
      history: this.config.history,
      renderer: this.config.renderer,
    };

    // 执行命令
    this.setState('thinking');

    try {
      const result = await handler.execute(context);
      this.setState('idle');
      return result;
    } catch (error) {
      this.setState('error');
      return {
        success: false,
        message: error instanceof Error ? error.message : String(error),
        continue: true,
        error: error instanceof Error ? error : new Error(String(error)),
      };
    }
  }

  /**
   * 获取当前状态
   */
  getState(): ConversationState {
    return this.state;
  }

  /**
   * 设置状态
   */
  setState(state: ConversationState): void {
    const oldState = this.state;
    this.state = state;

    // 发射状态变更事件
    this.emit('cli:state', { from: oldState, to: state });

    // 更新提示符
    this.updatePrompt();
  }

  // ============================================
  // Private Methods
  // ============================================

  private async mainLoop(): Promise<void> {
    while (this.running) {
      try {
        const input = await this.readInput();

        if (!input.trim()) continue;

        // 添加到历史
        this.config.history.add({
          role: 'user',
          content: input,
        });

        // 执行命令
        const result = await this.execute(input);

        // 显示结果
        if (result.message) {
          if (result.success) {
            this.config.renderer.success(result.message);
          } else {
            this.config.renderer.error(result.message);
          }
        }

        // 检查是否继续
        if (!result.continue) {
          await this.stop();
          break;
        }
      } catch (error) {
        this.logger.error('REPL loop error', { error });
        this.config.renderer.error(error instanceof Error ? error.message : String(error));
        this.setState('error');
      }
    }
  }

  private async readInput(): Promise<string> {
    return new Promise((resolve) => {
      if (!this.rl) {
        resolve('');
        return;
      }

      this.rl.question('', (answer) => {
        resolve(answer);
      });
    });
  }

  private parseCommand(input: string): ParsedCommand {
    const trimmed = input.trim();

    // 检查是否为退出命令
    if (['exit', 'quit', 'q', '/exit', '/quit'].includes(trimmed.toLowerCase())) {
      return {
        type: 'exit',
        raw: trimmed,
        args: [],
        options: {},
        rest: '',
      };
    }

    // 检查是否为特殊命令（以 / 开头）
    if (trimmed.startsWith('/')) {
      const parts = trimmed.slice(1).split(/\s+/);
      const name = parts[0];
      const args = parts.slice(1);

      return {
        type: 'special',
        raw: trimmed,
        name,
        args,
        options: this.parseOptions(args),
        rest: args.join(' '),
      };
    }

    // 检查是否为斜杠命令（以 \ 开头）
    if (trimmed.startsWith('\\')) {
      const parts = trimmed.slice(1).split(/\s+/);
      const name = parts[0];
      const args = parts.slice(1);

      return {
        type: 'slash',
        raw: trimmed,
        name,
        args,
        options: this.parseOptions(args),
        rest: args.join(' '),
      };
    }

    // 普通对话
    return {
      type: 'chat',
      raw: trimmed,
      args: [],
      options: {},
      rest: trimmed,
    };
  }

  private parseOptions(args: string[]): Record<string, string | boolean> {
    const options: Record<string, string | boolean> = {};

    for (let i = 0; i < args.length; i++) {
      const arg = args[i];

      if (arg.startsWith('--')) {
        const [key, value] = arg.slice(2).split('=');
        options[key] = value ?? true;
      } else if (arg.startsWith('-')) {
        const key = arg.slice(1);
        const nextArg = args[i + 1];

        if (nextArg && !nextArg.startsWith('-')) {
          options[key] = nextArg;
          i++;
        } else {
          options[key] = true;
        }
      }
    }

    return options;
  }

  private findCommandHandler(command: ParsedCommand) {
    if (command.type === 'exit') {
      return {
        name: 'exit',
        description: 'Exit the CLI',
        execute: async (): Promise<CommandResult> => ({
          success: true,
          message: 'Goodbye!',
          continue: false,
        }),
      };
    }

    if (command.type === 'chat') {
      return this.config.commands.get('chat');
    }

    return this.config.commands.get(command.name || '');
  }

  private setupEventHandlers(): void {
    // 处理 Ctrl+C
    process.on('SIGINT', () => {
      this.logger.info('Received SIGINT, shutting down...');
      this.stop();
    });

    // 处理 Ctrl+D
    process.on('SIGTERM', () => {
      this.logger.info('Received SIGTERM, shutting down...');
      this.stop();
    });
  }

  private showWelcome(): void {
    const { renderer } = this.config;

    renderer.newline();
    renderer.message('╔════════════════════════════════════════════════════════════╗');
    renderer.message('║                                                            ║');
    renderer.message('║           SDKWork Browser Agent CLI                        ║');
    renderer.message('║                                                            ║');
    renderer.message('║   Type your message or use /help for available commands   ║');
    renderer.message('║                                                            ║');
    renderer.message('╚════════════════════════════════════════════════════════════╝');
    renderer.newline();
  }

  private getPrompt(): string {
    switch (this.state) {
      case 'thinking':
        return '⏳ ';
      case 'streaming':
        return '💬 ';
      case 'tool':
        return '🔧 ';
      case 'error':
        return '❌ ';
      default:
        return '> ';
    }
  }

  private updatePrompt(): void {
    if (this.rl) {
      this.rl.setPrompt(this.getPrompt());
      this.rl.prompt();
    }
  }

  private emit<K extends keyof CLIEvents>(event: K, payload: CLIEvents[K]): void {
    this.eventEmitter.emit(event, payload);
  }
}

// ============================================
// Factory
// ============================================

/**
 * 创建 REPL 实例
 */
export function createREPL(config: REPLConfig): PerfectREPL {
  return new PerfectREPL(config);
}
