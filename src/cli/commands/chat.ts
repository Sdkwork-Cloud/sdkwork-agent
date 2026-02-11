/**
 * Chat Command - 对话命令处理器
 *
 * 处理用户对话消息，与 Agent 交互
 *
 * @module CLI
 * @version 1.0.0
 * @standard Industry Leading
 */

import type { CommandHandler, CommandContext, CommandResult } from '../types';
import { createLogger } from '../../utils/logger.js';
import type { Logger } from '../../utils/logger.js';

/**
 * Chat 命令处理器
 */
export class ChatCommand implements CommandHandler {
  readonly name = 'chat';
  readonly description = 'Send a message to the AI assistant';
  readonly usage = '<message>';

  private logger: Logger;

  constructor() {
    this.logger = createLogger({ name: 'ChatCommand' });
  }

  /**
   * 执行对话命令
   */
  async execute(context: CommandContext): Promise<CommandResult> {
    const { command, agent, history, renderer } = context;

    try {
      // 获取用户输入
      const userMessage = command.rest;

      if (!userMessage.trim()) {
        return {
          success: false,
          message: 'Please enter a message',
          continue: true,
        };
      }

      // 添加用户消息到历史
      history.add({
        role: 'user',
        content: userMessage,
      });

      // 显示思考状态
      renderer.info('Thinking...');

      // 执行 Agent
      const result = await agent.execute({
        input: userMessage,
        context: {
          sessionId: context.sessionId,
          history: history.toLLMMessages(),
        },
      });

      // 处理结果
      if (result.success) {
        // 添加 AI 回复到历史
        history.add({
          role: 'assistant',
          content: String(result.output),
          metadata: {
            executionTime: result.executionTime,
            tokens: result.tokens?.total,
          },
        });

        // 显示 AI 回复
        renderer.message(String(result.output));

        return {
          success: true,
          continue: true,
        };
      } else {
        return {
          success: false,
          message: result.error?.message || 'Execution failed',
          continue: true,
          error: result.error,
        };
      }
    } catch (error) {
      this.logger.error('Chat command failed', { error });
      return {
        success: false,
        message: error instanceof Error ? error.message : String(error),
        continue: true,
        error: error instanceof Error ? error : new Error(String(error)),
      };
    }
  }
}

/**
 * 创建 Chat 命令
 */
export function createChatCommand(): ChatCommand {
  return new ChatCommand();
}
