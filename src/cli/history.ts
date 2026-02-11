/**
 * Conversation History - 对话历史管理
 *
 * 完美的对话历史管理系统
 * 支持持久化、搜索、导出
 *
 * @module CLI
 * @version 1.0.0
 * @standard Industry Leading
 */

import type { ConversationHistory, ConversationMessage } from './types';
import { createLogger } from '../utils/logger.js';
import type { Logger } from '../utils/logger.js';
import { v4 as uuidv4 } from 'uuid';

/**
 * 完美对话历史实现
 */
export class PerfectConversationHistory implements ConversationHistory {
  readonly sessionId: string;
  messages: ConversationMessage[] = [];
  readonly maxMessages: number;
  private logger: Logger;

  constructor(sessionId: string, maxMessages = 1000) {
    this.sessionId = sessionId;
    this.maxMessages = maxMessages;
    this.logger = createLogger({ name: 'ConversationHistory' });
  }

  /**
   * 添加消息
   */
  add(message: Omit<ConversationMessage, 'id' | 'timestamp'>): ConversationMessage {
    const fullMessage: ConversationMessage = {
      ...message,
      id: uuidv4(),
      timestamp: new Date(),
    };

    this.messages.push(fullMessage);

    // 限制历史大小
    if (this.messages.length > this.maxMessages) {
      this.messages = this.messages.slice(-this.maxMessages);
    }

    this.logger.debug('Message added', {
      id: fullMessage.id,
      role: fullMessage.role,
      contentLength: fullMessage.content.length,
    });

    return fullMessage;
  }

  /**
   * 获取最近消息
   */
  recent(count: number): ConversationMessage[] {
    return this.messages.slice(-count);
  }

  /**
   * 获取特定范围消息
   */
  range(start: number, end: number): ConversationMessage[] {
    return this.messages.slice(start, end);
  }

  /**
   * 查找消息
   */
  find(predicate: (message: ConversationMessage) => boolean): ConversationMessage | undefined {
    return this.messages.find(predicate);
  }

  /**
   * 过滤消息
   */
  filter(predicate: (message: ConversationMessage) => boolean): ConversationMessage[] {
    return this.messages.filter(predicate);
  }

  /**
   * 搜索消息
   */
  search(query: string): ConversationMessage[] {
    const lowerQuery = query.toLowerCase();
    return this.messages.filter((msg) =>
      msg.content.toLowerCase().includes(lowerQuery)
    );
  }

  /**
   * 获取消息数量
   */
  get count(): number {
    return this.messages.length;
  }

  /**
   * 清除历史
   */
  clear(): void {
    this.messages = [];
    this.logger.info('History cleared');
  }

  /**
   * 导出为 JSON
   */
  export(): string {
    const data = {
      sessionId: this.sessionId,
      exportedAt: new Date().toISOString(),
      messageCount: this.messages.length,
      messages: this.messages,
    };

    return JSON.stringify(data, null, 2);
  }

  /**
   * 从 JSON 导入
   */
  import(data: string): void {
    try {
      const parsed = JSON.parse(data);

      if (parsed.messages && Array.isArray(parsed.messages)) {
        this.messages = parsed.messages.map((msg: Partial<ConversationMessage>) => ({
          ...msg,
          timestamp: new Date(msg.timestamp || Date.now()),
        }));

        this.logger.info('History imported', {
          messageCount: this.messages.length,
        });
      }
    } catch (error) {
      this.logger.error('Failed to import history', { error });
      throw new Error('Invalid history data format');
    }
  }

  /**
   * 获取统计信息
   */
  getStats(): {
    totalMessages: number;
    userMessages: number;
    assistantMessages: number;
    systemMessages: number;
    averageMessageLength: number;
    firstMessageAt?: Date;
    lastMessageAt?: Date;
  } {
    const userMessages = this.messages.filter((m) => m.role === 'user');
    const assistantMessages = this.messages.filter((m) => m.role === 'assistant');
    const systemMessages = this.messages.filter((m) => m.role === 'system');

    const totalLength = this.messages.reduce(
      (sum, m) => sum + m.content.length,
      0
    );

    return {
      totalMessages: this.messages.length,
      userMessages: userMessages.length,
      assistantMessages: assistantMessages.length,
      systemMessages: systemMessages.length,
      averageMessageLength: this.messages.length > 0 ? totalLength / this.messages.length : 0,
      firstMessageAt: this.messages[0]?.timestamp,
      lastMessageAt: this.messages[this.messages.length - 1]?.timestamp,
    };
  }

  /**
   * 转换为 LLM 消息格式
   */
  toLLMMessages(): Array<{ role: string; content: string }> {
    return this.messages.map((msg) => ({
      role: msg.role,
      content: msg.content,
    }));
  }

  /**
   * 获取上下文窗口
   */
  getContextWindow(maxTokens: number = 4000): ConversationMessage[] {
    // 简化的 token 估算：平均每个字符 0.25 个 token
    const charsPerToken = 4;
    const maxChars = maxTokens * charsPerToken;

    let totalChars = 0;
    const context: ConversationMessage[] = [];

    // 从后往前添加消息，直到达到限制
    for (let i = this.messages.length - 1; i >= 0; i--) {
      const msg = this.messages[i];
      const msgChars = msg.content.length;

      if (totalChars + msgChars > maxChars && context.length > 0) {
        break;
      }

      context.unshift(msg);
      totalChars += msgChars;
    }

    return context;
  }
}

// ============================================
// Factory
// ============================================

/**
 * 创建对话历史
 */
export function createConversationHistory(
  sessionId?: string,
  maxMessages?: number
): PerfectConversationHistory {
  return new PerfectConversationHistory(sessionId || uuidv4(), maxMessages);
}
