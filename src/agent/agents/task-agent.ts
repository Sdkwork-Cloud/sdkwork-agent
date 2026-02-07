/**
 * Task Agent - 任务执行智能体
 *
 * 专有智能体，专注于：
 * - 任务规划与分解
 * - 多步骤执行
 * - 工具调用
 * - 结果验证
 *
 * @module TaskAgent
 * @version 1.0.0
 * @standard Agent Architecture Standard
 */

import { BaseAgent, AgentConfig } from '../base-agent.js';
import type {
  AgentCapabilities,
  ExecutionResult,
} from '../types.js';
import type { LLMService, ToolRegistry } from '../../skills/core/types.js';

/**
 * 任务步骤
 */
export interface TaskStep {
  id: string;
  description: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  tool?: string;
  input?: unknown;
  output?: unknown;
  error?: string;
}

/**
 * 任务执行计划
 */
export interface TaskPlan {
  steps: TaskStep[];
  estimatedTime: number;
  requiredTools: string[];
}

/**
 * 任务智能体配置
 */
export interface TaskAgentConfig extends AgentConfig {
  /** LLM服务 */
  llm: LLMService;
  /** 工具注册表 */
  tools: ToolRegistry;
  /** 最大重试次数 */
  maxRetries?: number;
  /** 是否启用规划 */
  enablePlanning?: boolean;
}

/**
 * 任务智能体
 *
 * 专有智能体，用于处理需要多步骤、工具调用的复杂任务
 */
export class TaskAgent extends BaseAgent<TaskAgentConfig> {
  readonly type = 'task';

  private llm: LLMService;
  private tools: ToolRegistry;
  private currentPlan?: TaskPlan;

  constructor(config: TaskAgentConfig) {
    super(config);
    this.llm = config.llm;
    this.tools = config.tools;
  }

  /**
   * 初始化能力
   */
  protected initCapabilities(): AgentCapabilities {
    return {
      canPlan: this.config.enablePlanning ?? true,
      canReason: true,
      canUseTools: true,
      canUseSkills: false,
      hasMemory: true,
      canLearn: false,
      canReflect: true,
      canStream: false,
    };
  }

  /**
   * 初始化
   */
  protected async doInitialize(): Promise<void> {
    this.agentLogger.info(`[${this.id}] TaskAgent initialized`);
  }

  /**
   * 执行
   */
  protected async doExecute<T>(
    input: unknown,
    _context: Record<string, unknown> | undefined,
    executionId: string
  ): Promise<ExecutionResult<T>> {
    const task = String(input);

    // 1. 规划任务
    if (this.capabilities.canPlan) {
      this.currentPlan = await this.planTask(task);
    } else {
      this.currentPlan = this.createSimplePlan(task);
    }

    // 2. 执行计划
    const results: unknown[] = [];
    for (const step of this.currentPlan.steps) {
      try {
        step.status = 'running';

        if (step.tool) {
          // 调用工具
          step.output = await this.tools.execute(step.tool, step.input);
        } else {
          // 使用LLM处理
          step.output = await this.llm.complete(step.description);
        }

        step.status = 'completed';
        results.push(step.output);
      } catch (error) {
        step.status = 'failed';
        step.error = (error as Error).message;

        // 尝试重试
        const retrySuccess = await this.retryStep(step);
        if (!retrySuccess) {
          return {
            success: false,
            error: {
              code: 'TASK_FAILED',
              message: `Step failed: ${step.description}`,
              recoverable: false,
              name: 'TaskError',
            },
            executionId,
            duration: 0,
          };
        }
      }
    }

    // 3. 验证结果
    const finalResult = await this.verifyResults(task, results);

    return {
      success: finalResult.success,
      output: finalResult.output as T,
      executionId,
      duration: 0,
      steps: this.currentPlan.steps.map((s) => ({
        id: s.id,
        type: 'tool' as const,
        name: s.description,
        description: s.description,
        status: s.status,
        input: s.input,
        output: s.output,
        error: s.error ? { code: 'TOOL_ERROR', message: s.error, recoverable: false, name: 'ToolError' } : undefined,
        startedAt: new Date(),
      })),
    };
  }

  /**
   * 规划任务
   */
  private async planTask(task: string): Promise<TaskPlan> {
    const prompt = `Break down the following task into steps:
Task: ${task}

Available tools: ${Object.keys(this.tools).join(', ')}

Provide the plan as JSON:
{
  "steps": [
    { "description": "step description", "tool": "tool_name", "input": {} }
  ]
}`;

    const response = await this.llm.complete(prompt);

    try {
      const plan = JSON.parse(response);
      return {
        steps: plan.steps.map((s: TaskStep, i: number) => ({
          ...s,
          id: `step-${i}`,
          status: 'pending' as const,
        })),
        estimatedTime: plan.steps.length * 5000,
        requiredTools: plan.steps.map((s: TaskStep) => s.tool).filter(Boolean),
      };
    } catch {
      return this.createSimplePlan(task);
    }
  }

  /**
   * 创建简单计划
   */
  private createSimplePlan(task: string): TaskPlan {
    return {
      steps: [
        {
          id: 'step-0',
          description: task,
          status: 'pending',
        },
      ],
      estimatedTime: 5000,
      requiredTools: [],
    };
  }

  /**
   * 重试步骤
   */
  private async retryStep(step: TaskStep): Promise<boolean> {
    const maxRetries = this.config.maxRetries ?? 3;

    for (let i = 0; i < maxRetries; i++) {
      try {
        await new Promise((resolve) => setTimeout(resolve, 1000 * (i + 1)));

        if (step.tool) {
          step.output = await this.tools.execute(step.tool, step.input);
        } else {
          step.output = await this.llm.complete(step.description);
        }

        step.status = 'completed';
        step.error = undefined;
        return true;
      } catch {
        continue;
      }
    }

    return false;
  }

  /**
   * 验证结果
   */
  private async verifyResults(task: string, results: unknown[]): Promise<{ success: boolean; output: unknown }> {
    if (!this.capabilities.canReflect) {
      return { success: true, output: results[results.length - 1] };
    }

    const prompt = `Verify if the task was completed successfully:
Task: ${task}
Results: ${JSON.stringify(results)}

Respond with JSON:
{
  "success": true/false,
  "output": "final result"
}`;

    try {
      const response = await this.llm.complete(prompt);
      const verification = JSON.parse(response);
      return verification;
    } catch {
      return { success: true, output: results[results.length - 1] };
    }
  }

  /**
   * 销毁
   */
  protected async doDestroy(): Promise<void> {
    this.currentPlan = undefined;
    this.agentLogger.info(`[${this.id}] TaskAgent destroyed`);
  }
}

/**
 * 创建任务智能体
 */
export function createTaskAgent(llm: LLMService, tools: ToolRegistry, config?: Omit<TaskAgentConfig, 'llm' | 'tools'>): TaskAgent {
  return new TaskAgent({
    identity: { name: 'Task', description: '任务执行智能体', version: '1.0.0', id: 'task' },
    llm,
    tools,
    ...config,
  });
}
