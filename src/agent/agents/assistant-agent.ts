/**
 * Assistant Agent - 通用助手智能体
 *
 * 设计原则：
 * 1. 通用性 - 支持对话、问答、简单任务
 * 2. 可配置 - 支持不同能力组合
 * 3. 标准接口 - 遵循Agent Architecture Standard
 *
 * 通用能力（所有智能体都支持）：
 * - 对话能力 (conversation)
 * - 记忆能力 (memory)
 * - 推理能力 (reasoning)
 * - 上下文理解 (context)
 * - Skill调用 (skills)
 * - MCP工具 (mcp)
 * - Plugin扩展 (plugins)
 *
 * @module AssistantAgent
 * @version 2.0.0
 * @standard Agent Architecture Standard
 */

import { BaseAgent, AgentConfig } from '../base-agent.js';
import type { AgentContextConfig } from '../agent-context.js';
import type {
  AgentCapabilities,
  ExecutionResult,
} from '../types.js';

/**
 * 助手智能体配置
 */
export interface AssistantAgentConfig extends AgentConfig {
  /** 系统提示词 */
  systemPrompt?: string;
  /** 最大历史轮数 */
  maxHistoryRounds?: number;
  /** 是否启用流式输出 */
  enableStreaming?: boolean;
  /** 温度参数 */
  temperature?: number;
}

/**
 * 对话历史
 */
export interface ConversationHistory {
  role: 'system' | 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

/**
 * 助手智能体
 *
 * 通用基础智能体，适用于：
 * - 对话问答
 * - 简单任务处理
 * - 信息查询
 * - 内容生成
 * - Skill调用
 * - MCP工具调用
 */
export class AssistantAgent extends BaseAgent<AssistantAgentConfig> {
  readonly type = 'assistant';

  private history: ConversationHistory[] = [];

  /**
   * 初始化能力
   */
  protected initCapabilities(): AgentCapabilities {
    return {
      canPlan: false,
      canReason: true,
      canUseTools: true,
      canUseSkills: true,
      hasMemory: true,
      canLearn: false,
      canReflect: false,
      canStream: this.config.enableStreaming ?? true,
    };
  }

  /**
   * 初始化
   */
  protected async doInitialize(): Promise<void> {
    // 初始化系统提示词
    if (this.config.systemPrompt) {
      this.history.push({
        role: 'system',
        content: this.config.systemPrompt,
        timestamp: new Date(),
      });
    }

    this.agentLogger.info(`[${this.id}] AssistantAgent initialized`);
    this.agentLogger.info(`[${this.id}] Available skills: ${this.context.skills.list().length}`);
    this.agentLogger.info(`[${this.id}] Available tools: ${this.context.tools.list().length}`);
    this.agentLogger.info(`[${this.id}] Available plugins: ${this.context.plugins.list().length}`);
  }

  /**
   * 执行
   */
  protected async doExecute<T>(
    input: unknown,
    _execContext: Record<string, unknown> | undefined,
    executionId: string
  ): Promise<ExecutionResult<T>> {
    const userMessage = String(input);

    // 添加用户消息到历史
    this.history.push({
      role: 'user',
      content: userMessage,
      timestamp: new Date(),
    });

    // 保存到记忆
    await this.context.memory.save(`user:${executionId}`, userMessage);

    // 尝试使用Skill
    let response: string;
    const skillResult = await this.trySkill(userMessage);
    if (skillResult) {
      response = String(skillResult);
    } else {
      // 尝试使用Tool
      const toolResult = await this.tryTool(userMessage);
      if (toolResult) {
        response = String(toolResult);
      } else {
        // 使用LLM
        const prompt = this.buildPrompt();
        response = await this.context.llm.complete(prompt);
      }
    }

    // 添加助手回复到历史
    this.history.push({
      role: 'assistant',
      content: response,
      timestamp: new Date(),
    });

    // 保存到记忆
    await this.context.memory.save(`assistant:${executionId}`, response);

    // 清理历史
    this.trimHistory();

    return {
      success: true,
      output: response as T,
      executionId,
      duration: 0,
      tokensUsed: userMessage.length + response.length,
    };
  }

  /**
   * 流式执行
   */
  async *executeStream(input: unknown): AsyncGenerator<string> {
    if (!this.capabilities.canStream) {
      throw new Error('Streaming is not enabled for this agent');
    }

    const userMessage = String(input);

    // 添加用户消息到历史
    this.history.push({
      role: 'user',
      content: userMessage,
      timestamp: new Date(),
    });

    // 构建提示词
    const prompt = this.buildPrompt();

    // 流式调用LLM
    let fullResponse = '';
    for await (const chunk of this.context.llm.completeStream(prompt)) {
      fullResponse += chunk;
      yield chunk;
    }

    // 添加助手回复到历史
    this.history.push({
      role: 'assistant',
      content: fullResponse,
      timestamp: new Date(),
    });

    // 清理历史
    this.trimHistory();
  }

  /**
   * 销毁
   */
  protected async doDestroy(): Promise<void> {
    this.history = [];
    await this.context.memory.clear();
    this.agentLogger.info(`[${this.id}] AssistantAgent destroyed`);
  }

  /**
   * 尝试使用Skill
   */
  private async trySkill(input: string): Promise<unknown | null> {
    if (!this.capabilities.canUseSkills) return null;

    const skills = this.context.skills.list();
    if (skills.length === 0) return null;

    // 简单匹配：检查输入是否包含技能名称
    for (const skill of skills) {
      if (input.toLowerCase().includes(skill.name.toLowerCase())) {
        try {
          this.agentLogger.debug(`[${this.id}] Using skill: ${skill.name}`);
          return await this.context.skills.execute(skill.name, input);
        } catch (error) {
          this.agentLogger.warn(`[${this.id}] Skill execution failed: ${skill.name}`, { error });
        }
      }
    }

    return null;
  }

  /**
   * 尝试使用Tool
   */
  private async tryTool(input: string): Promise<unknown | null> {
    if (!this.capabilities.canUseTools) return null;

    const tools = this.context.tools.list();
    if (tools.length === 0) return null;

    // 简单匹配：检查输入是否包含工具名称
    for (const toolName of tools) {
      if (input.toLowerCase().includes(toolName.toLowerCase())) {
        try {
          this.agentLogger.debug(`[${this.id}] Using tool: ${toolName}`);
          return await this.context.tools.execute(toolName, input);
        } catch (error) {
          this.agentLogger.warn(`[${this.id}] Tool execution failed: ${toolName}`, { error });
        }
      }
    }

    return null;
  }

  /**
   * 获取对话历史
   */
  getHistory(): ConversationHistory[] {
    return [...this.history];
  }

  /**
   * 清空历史
   */
  clearHistory(): void {
    const systemMessages = this.history.filter((h) => h.role === 'system');
    this.history = systemMessages;
    this.agentLogger.debug(`[${this.id}] History cleared`);
  }

  /**
   * 构建提示词
   */
  private buildPrompt(): string {
    const maxRounds = this.config.maxHistoryRounds ?? 10;
    const relevantHistory = this.history.slice(-maxRounds * 2);

    return relevantHistory.map((h) => `${h.role}: ${h.content}`).join('\n\n');
  }

  /**
   * 清理历史
   */
  private trimHistory(): void {
    const maxRounds = this.config.maxHistoryRounds ?? 10;
    const systemMessages = this.history.filter((h) => h.role === 'system');
    const conversationMessages = this.history.filter((h) => h.role !== 'system');

    if (conversationMessages.length > maxRounds * 2) {
      const trimmed = conversationMessages.slice(-maxRounds * 2);
      this.history = [...systemMessages, ...trimmed];
    }
  }
}

/**
 * 创建助手智能体
 */
export function createAssistantAgent(
  contextConfig: AgentContextConfig,
  config?: Omit<AssistantAgentConfig, 'context' | 'contextConfig'>
): AssistantAgent {
  return new AssistantAgent({
    identity: { name: 'Assistant', description: '通用助手智能体', version: '1.0.0', id: 'assistant' },
    contextConfig,
    ...config,
  });
}
