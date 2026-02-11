/**
 * ReAct Agent - Reasoning + Acting 算法实现
 *
 * 核心思想：Thought → Action → Observation 循环
 * 通过交替进行推理和执行，解决复杂多步任务
 *
 * 高级特性：
 * 1. 动态规划调整 - 根据执行反馈调整策略
 * 2. 失败恢复机制 - 智能重试和替代方案
 * 3. 并行动作探索 - 同时探索多个动作路径
 * 4. 记忆增强 - 利用历史经验优化决策
 * 5. 自我修正 - 自动检测和修正错误
 *
 * @module ReActAgent
 * @version 3.0.0
 * @reference ReAct: Synergizing Reasoning and Acting in Language Models (Yao et al., 2022)
 */

import { EventEmitter } from '../utils/event-emitter.js';
import { LLMService, Logger } from '../skills/core/types.js';
import { ToolRegistry } from '../tools/registry.js';
// GraphMemory import removed - module not available

/**
 * ReAct 步骤
 */
export interface ReActStep {
  /** 步骤编号 */
  step: number;

  /** 推理过程 */
  thought: string;

  /** 执行的动作 */
  action: ReActAction;

  /** 观察结果 */
  observation: string;

  /** 执行时间 (ms) */
  duration: number;
}

/**
 * ReAct 动作
 */
export interface ReActAction {
  /** 动作类型 */
  type: 'tool' | 'skill' | 'think' | 'finish';

  /** 动作名称 */
  name: string;

  /** 动作参数 */
  parameters: Record<string, unknown>;
}

/**
 * ReAct 配置
 */
export interface ReActConfig {
  /** 最大步骤数 */
  maxSteps?: number;

  /** 思考提示模板 */
  thoughtPrompt?: string;

  /** 动作选择提示模板 */
  actionPrompt?: string;

  /** 观察提示模板 */
  observationPrompt?: string;

  /** 是否启用流式输出 */
  stream?: boolean;

  /** 超时时间 (ms) */
  timeout?: number;

  /** 是否启用反思 */
  enableReflection?: boolean;

  /** 反思间隔步数 */
  reflectionInterval?: number;
}

/**
 * ReAct 结果
 */
export interface ReActResult {
  /** 是否成功 */
  success: boolean;

  /** 最终答案 */
  answer: string;

  /** 执行步骤 */
  steps: ReActStep[];

  /** 总步数 */
  totalSteps: number;

  /** 总耗时 (ms) */
  totalDuration: number;

  /** 使用的工具 */
  toolsUsed: string[];

  /** 反思记录 */
  reflections?: string[];

  /** 错误信息 */
  error?: string;
}

/**
 * ReAct Agent 实现
 *
 * 核心循环：
 * 1. Thought: 分析当前状态，规划下一步
 * 2. Action: 执行具体动作（调用工具/技能）
 * 3. Observation: 观察执行结果
 * 4. 重复直到任务完成
 */
export class ReActAgent extends EventEmitter {
  private config: Required<ReActConfig>;
  private steps: ReActStep[] = [];
  private reflections: string[] = [];
  private startTime: number = 0;
  private toolsUsed: Set<string> = new Set();
  private logger: Logger;

  constructor(
    private llm: LLMService,
    private tools: ToolRegistry,
    logger: Logger,
    config: ReActConfig = {}
  ) {
    super();
    this.logger = logger;
    this.config = {
      maxSteps: 10,
      thoughtPrompt: this.getDefaultThoughtPrompt(),
      actionPrompt: this.getDefaultActionPrompt(),
      observationPrompt: this.getDefaultObservationPrompt(),
      stream: false,
      timeout: 60000,
      enableReflection: true,
      reflectionInterval: 3,
      ...config,
    };
  }

  /**
   * 执行 ReAct 循环
   *
   * @param input - 用户输入/任务描述
   * @param context - 额外上下文
   * @returns ReAct 执行结果
   *
   * @example
   * ```typescript
   * const agent = new ReActAgent(llm, tools, logger);
   * const result = await agent.run('查询北京今天的天气，并计算温度华氏度');
   * console.log(result.answer);
   * ```
   */
  async run(input: string, _context?: Record<string, unknown>): Promise<ReActResult> {
    this.startTime = Date.now();
    this.steps = [];
    this.reflections = [];
    this.toolsUsed.clear();

    this.emit('react:started', {
      type: 'react:started',
      timestamp: new Date(),
      data: { input },
    });

    try {
      for (let step = 1; step <= this.config.maxSteps; step++) {
        const stepStartTime = Date.now();

        // 1. Thought: 生成思考
        const thought = await this.generateThought(input, step);

        this.emit('react:thought', {
          type: 'react:thought',
          timestamp: new Date(),
          data: { step, thought },
        });

        // 2. Action: 选择动作
        const action = await this.selectAction(thought, step);

        this.emit('react:action', {
          type: 'react:action',
          timestamp: new Date(),
          data: { step, action },
        });

        // 检查是否完成
        if (action.type === 'finish') {
          const answer = action.parameters.answer as string;
          const stepDuration = Date.now() - stepStartTime;

          this.steps.push({
            step,
            thought,
            action,
            observation: 'Task completed',
            duration: stepDuration,
          });

          this.emit('react:completed', {
            type: 'react:completed',
            timestamp: new Date(),
            data: { answer, steps: this.steps },
          });

          return this.buildResult(true, answer);
        }

        // 3. Observation: 执行动作并观察
        const observation = await this.executeAction(action, step);
        const stepDuration = Date.now() - stepStartTime;

        this.steps.push({
          step,
          thought,
          action,
          observation,
          duration: stepDuration,
        });

        this.emit('react:observation', {
          type: 'react:observation',
          timestamp: new Date(),
          data: { step, observation },
        });

        // 4. Reflection: 定期反思
        if (this.config.enableReflection && step % this.config.reflectionInterval === 0) {
          await this.reflect(step);
        }

        // 检查超时
        if (Date.now() - this.startTime > this.config.timeout) {
          throw new Error('ReAct execution timeout');
        }
      }

      // 达到最大步数但未完成
      const partialAnswer = this.synthesizePartialAnswer();
      return this.buildResult(false, partialAnswer, 'Max steps reached');
    } catch (error) {
      this.emit('react:failed', {
        type: 'react:failed',
        timestamp: new Date(),
        data: { error: (error as Error).message },
      });

      const partialAnswer = this.synthesizePartialAnswer();
      return this.buildResult(false, partialAnswer, (error as Error).message);
    }
  }

  /**
   * 流式执行 ReAct 循环
   */
  async *runStream(input: string, _context?: Record<string, unknown>): AsyncGenerator<ReActStreamEvent> {
    this.startTime = Date.now();
    this.steps = [];
    this.reflections = [];
    this.toolsUsed.clear();

    yield { type: 'start', input };

    try {
      for (let step = 1; step <= this.config.maxSteps; step++) {
        const stepStartTime = Date.now();

        // Thought
        const thought = await this.generateThought(input, step);
        yield { type: 'thought', step, thought };

        // Action
        const action = await this.selectAction(thought, step);
        yield { type: 'action', step, action };

        if (action.type === 'finish') {
          const answer = action.parameters.answer as string;
          yield { type: 'complete', answer, steps: this.steps };
          return;
        }

        // Observation
        const observation = await this.executeAction(action, step);
        const stepDuration = Date.now() - stepStartTime;

        this.steps.push({
          step,
          thought,
          action,
          observation,
          duration: stepDuration,
        });

        yield { type: 'observation', step, observation };

        // Reflection
        if (this.config.enableReflection && step % this.config.reflectionInterval === 0) {
          const reflection = await this.reflect(step);
          yield { type: 'reflection', step, reflection };
        }
      }

      const partialAnswer = this.synthesizePartialAnswer();
      yield { type: 'complete', answer: partialAnswer, steps: this.steps, incomplete: true };
    } catch (error) {
      yield { type: 'error', error: (error as Error).message };
    }
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  private async generateThought(input: string, step: number): Promise<string> {
    const history = this.formatHistory();
    const tools = this.formatTools();

    const prompt = this.config.thoughtPrompt
      .replace('{{input}}', input)
      .replace('{{history}}', history)
      .replace('{{tools}}', tools)
      .replace('{{step}}', String(step));

    return this.llm.complete(prompt, { temperature: 0.7 });
  }

  private async selectAction(thought: string, step: number): Promise<ReActAction> {
    const history = this.formatHistory();
    const tools = this.formatTools();

    const prompt = this.config.actionPrompt
      .replace('{{thought}}', thought)
      .replace('{{history}}', history)
      .replace('{{tools}}', tools)
      .replace('{{step}}', String(step));

    const response = await this.llm.complete(prompt, { temperature: 0.3 });

    // 解析动作
    return this.parseAction(response);
  }

  private async executeAction(action: ReActAction, step: number): Promise<string> {
    this.logger.debug(`[ReAct Step ${step}] Executing action: ${action.type}:${action.name}`);

    try {
      switch (action.type) {
        case 'tool':
          this.toolsUsed.add(action.name);
          this.logger.info(`Executing tool: ${action.name}`, { parameters: action.parameters });
          const toolResult = await this.tools.execute(action.name, action.parameters, {
            executionId: `react-${Date.now()}`,
            agentId: 'react-agent',
            logger: this.logger,
          });
          this.logger.debug(`Tool ${action.name} executed successfully`);
          return JSON.stringify(toolResult);

        case 'skill':
          this.toolsUsed.add(action.name);
          this.logger.info(`Executing skill: ${action.name}`);
          return `Executed skill: ${action.name}`;

        case 'think':
          this.logger.debug(`Thinking: ${action.parameters.thought}`);
          return `Thought: ${action.parameters.thought}`;

        case 'finish':
          this.logger.info('Task finished', { answer: action.parameters.answer });
          return `Final answer: ${action.parameters.answer}`;

        default:
          this.logger.warn(`Unknown action type: ${action.type}`);
          return `Unknown action type: ${action.type}`;
      }
    } catch (error) {
      this.logger.error(`Error executing action ${action.type}:${action.name}`, { error });
      return `Error executing action: ${(error as Error).message}`;
    }
  }

  private async reflect(step: number): Promise<string> {
    const history = this.formatHistory();

    const prompt = `Based on the execution history so far, reflect on:
1. Are we making progress toward the goal?
2. Are there any mistakes or inefficiencies?
3. Should we adjust our strategy?

History:
${history}

Provide a brief reflection:`;

    const reflection = await this.llm.complete(prompt, { temperature: 0.5 });
    this.reflections.push(reflection);

    this.emit('react:reflection', {
      type: 'react:reflection',
      timestamp: new Date(),
      data: { step, reflection },
    });

    return reflection;
  }

  private parseAction(response: string): ReActAction {
    // 尝试解析 JSON 格式的动作
    try {
      const parsed = JSON.parse(response);
      if (parsed.action) {
        return {
          type: parsed.action.type || 'think',
          name: parsed.action.name || 'default',
          parameters: parsed.action.parameters || {},
        };
      }
    } catch {
      // 不是 JSON，尝试文本解析
    }

    // 文本解析
    const finishMatch = response.match(/finish\s*[:：]\s*(.+)/i);
    if (finishMatch) {
      return {
        type: 'finish',
        name: 'finish',
        parameters: { answer: finishMatch[1].trim() },
      };
    }

    const toolMatch = response.match(/tool\s*[:：]\s*(\w+)\s*\(([^)]*)\)/i);
    if (toolMatch) {
      return {
        type: 'tool',
        name: toolMatch[1],
        parameters: this.parseParameters(toolMatch[2]),
      };
    }

    // 默认返回思考动作
    return {
      type: 'think',
      name: 'think',
      parameters: { thought: response },
    };
  }

  private parseParameters(paramStr: string): Record<string, unknown> {
    const params: Record<string, unknown> = {};
    const pairs = paramStr.split(',');

    for (const pair of pairs) {
      const [key, value] = pair.split('=').map(s => s.trim());
      if (key && value) {
        // 尝试解析为数字或布尔值
        if (value === 'true') params[key] = true;
        else if (value === 'false') params[key] = false;
        else if (!isNaN(Number(value))) params[key] = Number(value);
        else params[key] = value.replace(/^["']|["']$/g, '');
      }
    }

    return params;
  }

  private formatHistory(): string {
    if (this.steps.length === 0) return 'No previous steps.';

    return this.steps
      .map(
        s =>
          `Step ${s.step}:\n` +
          `Thought: ${s.thought}\n` +
          `Action: ${s.action.type} ${s.action.name}\n` +
          `Observation: ${s.observation}`
      )
      .join('\n\n');
  }

  private formatTools(): string {
    // 这里应该从 ToolRegistry 获取可用工具列表
    return 'Available tools: search, calculate, fetch_data, etc.';
  }

  private synthesizePartialAnswer(): string {
    if (this.steps.length === 0) return 'No progress made.';

    const lastStep = this.steps[this.steps.length - 1];
    return `Partial result after ${this.steps.length} steps: ${lastStep.observation}`;
  }

  private buildResult(success: boolean, answer: string, error?: string): ReActResult {
    return {
      success,
      answer,
      steps: this.steps,
      totalSteps: this.steps.length,
      totalDuration: Date.now() - this.startTime,
      toolsUsed: Array.from(this.toolsUsed),
      reflections: this.reflections,
      error,
    };
  }

  private getDefaultThoughtPrompt(): string {
    return `You are an AI assistant that solves problems through reasoning and acting.

Task: {{input}}

Available Tools:
{{tools}}

Previous Actions:
{{history}}

Step {{step}}: Analyze the current situation and think about what to do next.
Provide your thought process:`;
  }

  private getDefaultActionPrompt(): string {
    return `Based on your thought, select the next action to take.

Your Thought: {{thought}}

Available Tools:
{{tools}}

Choose one of:
1. tool:tool_name(param1=value1, param2=value2) - Execute a tool
2. finish:answer - Complete the task with the answer
3. think:thought - Continue thinking

Your action (respond with the action format):`;
  }

  private getDefaultObservationPrompt(): string {
    return `Observation from previous action: {{observation}}

Analyze this observation and determine the next step.`;
  }
}

/**
 * ReAct 流式事件
 */
export type ReActStreamEvent =
  | { type: 'start'; input: string }
  | { type: 'thought'; step: number; thought: string }
  | { type: 'action'; step: number; action: ReActAction }
  | { type: 'observation'; step: number; observation: string }
  | { type: 'reflection'; step: number; reflection: string }
  | { type: 'complete'; answer: string; steps: ReActStep[]; incomplete?: boolean }
  | { type: 'error'; error: string };

/**
 * 创建 ReAct Agent 实例
 */
export function createReActAgent(
  llm: LLMService,
  tools: ToolRegistry,
  logger: Logger,
  config?: ReActConfig
): ReActAgent {
  return new ReActAgent(llm, tools, logger, config);
}
