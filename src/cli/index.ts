/**
 * CLI - Command Line Interface
 *
 * 完美的命令行对话系统入口
 * 参考 Claude Code、Codex CLI 等顶级智能体设计
 *
 * @module CLI
 * @version 1.0.0
 * @standard Industry Leading
 */

// ============================================
// Core Exports
// ============================================

export * from './types';
export * from './repl.js';
export * from './renderer.js';
export * from './history.js';

// ============================================
// Command Exports
// ============================================

export * from './commands/chat.js';

// ============================================
// Factory Functions
// ============================================

import type { BaseAgent } from '../agent';
import type { REPLConfig, ConversationContext } from './types';
import { PerfectREPL } from './repl.js';
import { PerfectRenderer } from './renderer.js';
import { PerfectConversationHistory } from './history.js';
import { ChatCommand } from './commands/chat.js';
import { v4 as uuidv4 } from 'uuid';

/**
 * CLI 配置选项
 */
export interface CLIOptions {
  /** Agent 实例 */
  agent: BaseAgent;
  /** 提示符 */
  prompt?: string;
  /** 欢迎消息 */
  welcomeMessage?: string;
  /** 历史记录大小 */
  historySize?: number;
  /** 主题 */
  theme?: import('./types').CLITheme;
}

/**
 * 创建并启动 CLI
 *
 * @example
 * ```typescript
 * import { createCLI } from './cli';
 *
 * const cli = await createCLI({
 *   agent: myAgent,
 *   prompt: '> ',
 * });
 *
 * await cli.start();
 * ```
 */
export async function createCLI(options: CLIOptions): Promise<PerfectREPL> {
  // 创建渲染器
  const renderer = new PerfectRenderer(options.theme);

  // 创建对话历史
  const history = new PerfectConversationHistory(
    uuidv4(),
    options.historySize ?? 1000
  );

  // 创建命令注册表
  const commands = new Map();
  commands.set('chat', new ChatCommand());

  // 创建对话上下文
  const context: ConversationContext = {
    sessionId: history.sessionId,
    state: 'idle',
    workingDirectory: process.cwd(),
    environment: { ...process.env } as Record<string, string>,
    preferences: {
      autoConfirm: false,
      verbose: false,
      quiet: false,
      outputFormat: 'text',
    },
    agent: options.agent,
  };

  // 创建 REPL 配置
  const config: REPLConfig = {
    input: {
      read: async () => '',
      readMultiline: async () => '',
      readPassword: async () => '',
      confirm: async () => true,
      select: async <T>(_message: string, choices: { value: T; label: string }[]) => choices[0]?.value,
    },
    renderer,
    commands,
    history,
    context,
  };

  // 创建 REPL 实例
  const repl = new PerfectREPL(config);

  return repl;
}

/**
 * 快速启动 CLI
 *
 * @example
 * ```typescript
 * import { runCLI } from './cli';
 *
 * await runCLI({ agent: myAgent });
 * ```
 */
export async function runCLI(options: CLIOptions): Promise<void> {
  const cli = await createCLI(options);
  await cli.start();
}
