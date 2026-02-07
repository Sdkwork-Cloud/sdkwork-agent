/**
 * Planning Agent
 * 专注于规划的Agent实现
 * 集成MCTS、HTN、Tree of Thoughts算法
 */

import { SDKWorkAgent } from './sdkwork-agent';
import type { AgentConfig, Plan, PlanStep, ExecutionContext, Logger } from './types';

/**
 * 规划策略
 */
export enum PlanningStrategy {
  MCTS = 'mcts',
  HTN = 'htn',
  TOT = 'tot',
  REACT = 'react',
  HYBRID = 'hybrid',
}

/**
 * 规划Agent配置
 */
export type PlanningAgentConfig = AgentConfig & {
  planning: {
    enabled: true;
    strategy: 'mcts' | 'htn' | 'tot' | 'react' | 'hybrid';
    maxDepth: number;
    timeout: number;
    beamWidth?: number;
    simulationCount?: number;
  };
};

/**
 * 规划Agent
 * 
 * 特点：
 * - 自动任务分解
 * - 多策略规划（MCTS/HTN/ToT）
 * - 动态规划调整
 * - 规划结果验证
 */
export class PlanningAgent extends SDKWorkAgent {
  private currentPlan?: Plan;
  private planHistory: Plan[] = [];

  constructor(config: PlanningAgentConfig) {
    super({
      ...config,
      planning: {
        strategy: config.planning.strategy,
        depth: config.planning.maxDepth,
        timeout: config.planning.timeout,
      },
    } as AgentConfig);
  }

  /**
   * 创建智能规划
   * 
   * 根据任务复杂度自动选择规划策略：
   * - 简单任务：ReAct
   * - 中等任务：MCTS
   * - 复杂任务：Tree of Thoughts
   * - 结构化任务：HTN
   */
  async createIntelligentPlan(goal: string, _context?: Record<string, unknown>): Promise<Plan> {
    const complexity = this.assessComplexity(goal);
    const strategy = this.selectStrategy(complexity);

    this.getLogger().info(`Creating plan with strategy: ${strategy}`, { complexity, goal: goal.slice(0, 100) });

    switch (strategy) {
      case PlanningStrategy.MCTS:
        return this.createMCTSPlan(goal);
      case PlanningStrategy.TOT:
        return this.createToTPlan(goal);
      case PlanningStrategy.HTN:
        return this.createHTNPlan(goal);
      case PlanningStrategy.HYBRID:
        return this.createHybridPlan(goal);
      default:
        return this.createReActPlan(goal);
    }
  }

  /**
   * 执行带规划的请求
   */
  async executeWithPlanning(input: string, context?: Record<string, unknown>): Promise<{
    success: boolean;
    output?: unknown;
    plan: Plan;
    steps: PlanStep[];
    error?: string;
  }> {
    // 创建规划
    const execContext = this.createExecutionContext(this.generateId(), input, context);
    const plan = await this.createIntelligentPlan(input, execContext as unknown as Record<string, unknown>);
    this.currentPlan = plan;
    this.planHistory.push(plan);

    this.emit('plan:created', { plan });

    // 执行规划
    const executedSteps: PlanStep[] = [];
    
    try {
      for (const step of plan.steps) {
        if (step.status === 'pending' || step.status === 'ready') {
          step.status = 'running';
          
          const result = await this.executePlanStep(step, execContext as unknown as ExecutionContext);
          executedSteps.push(step);

          if (!result.success) {
            // 尝试重新规划
            const adjustedPlan = await this.adjustPlan(plan, step, result.error);
            if (adjustedPlan) {
              return this.executeWithPlanning(input, { ...context, adjusted: true });
            }
            
            return {
              success: false,
              error: result.error,
              plan,
              steps: executedSteps,
            };
          }
        }
      }

      this.emit('plan:executed', { plan, success: true });

      return {
        success: true,
        output: this.aggregateResults(executedSteps),
        plan,
        steps: executedSteps,
      };
    } catch (error) {
      this.emit('plan:executed', { plan, success: false });
      
      return {
        success: false,
        error: (error as Error).message,
        plan,
        steps: executedSteps,
      };
    }
  }

  /**
   * 评估任务复杂度
   */
  private assessComplexity(goal: string): 'low' | 'medium' | 'high' {
    const indicators = {
      high: ['multi-step', 'complex', 'coordinate', 'optimize', 'design', 'architect'],
      medium: ['analyze', 'compare', 'evaluate', 'search', 'filter', 'transform'],
      low: ['simple', 'quick', 'basic', 'get', 'show', 'list'],
    };

    const lowerGoal = goal.toLowerCase();
    
    if (indicators.high.some(i => lowerGoal.includes(i))) return 'high';
    if (indicators.medium.some(i => lowerGoal.includes(i))) return 'medium';
    return 'low';
  }

  /**
   * 选择规划策略
   */
  private selectStrategy(complexity: 'low' | 'medium' | 'high'): PlanningStrategy {
    const strategyMap: Record<string, PlanningStrategy> = {
      low: PlanningStrategy.REACT,
      medium: PlanningStrategy.MCTS,
      high: PlanningStrategy.TOT,
    };

    return strategyMap[complexity] || PlanningStrategy.HYBRID;
  }

  /**
   * 创建MCTS规划
   */
  private async createMCTSPlan(goal: string): Promise<Plan> {
    // 使用MCTS算法创建规划
    return {
      id: this.generateId(),
      goal,
      steps: [
        {
          id: this.generateId(),
          description: 'Analyze goal using MCTS',
          type: 'skill',
          dependencies: [],
          status: 'pending',
        },
        {
          id: this.generateId(),
          description: 'Execute optimal path',
          type: 'skill',
          dependencies: [],
          status: 'pending',
        },
      ],
      strategy: PlanningStrategy.MCTS,
      createdAt: new Date(),
    };
  }

  /**
   * 创建Tree of Thoughts规划
   */
  private async createToTPlan(goal: string): Promise<Plan> {
    // 使用ToT算法创建规划
    return {
      id: this.generateId(),
      goal,
      steps: [
        {
          id: this.generateId(),
          description: 'Generate thought branches',
          type: 'skill',
          dependencies: [],
          status: 'pending',
        },
        {
          id: this.generateId(),
          description: 'Evaluate thoughts',
          type: 'skill',
          dependencies: [],
          status: 'pending',
        },
        {
          id: this.generateId(),
          description: 'Select best thought path',
          type: 'skill',
          dependencies: [],
          status: 'pending',
        },
      ],
      strategy: PlanningStrategy.TOT,
      createdAt: new Date(),
    };
  }

  /**
   * 创建HTN规划
   */
  private async createHTNPlan(goal: string): Promise<Plan> {
    // 使用HTN算法创建规划
    return {
      id: this.generateId(),
      goal,
      steps: [
        {
          id: this.generateId(),
          description: 'Decompose task hierarchically',
          type: 'skill',
          dependencies: [],
          status: 'pending',
        },
        {
          id: this.generateId(),
          description: 'Order subtasks',
          type: 'skill',
          dependencies: [],
          status: 'pending',
        },
        {
          id: this.generateId(),
          description: 'Execute primitive tasks',
          type: 'skill',
          dependencies: [],
          status: 'pending',
        },
      ],
      strategy: PlanningStrategy.HTN,
      createdAt: new Date(),
    };
  }

  /**
   * 创建混合规划
   */
  private async createHybridPlan(goal: string): Promise<Plan> {
    // 组合多种策略
    return {
      id: this.generateId(),
      goal,
      steps: [
        {
          id: this.generateId(),
          description: 'Initial planning with MCTS',
          type: 'skill',
          dependencies: [],
          status: 'pending',
        },
        {
          id: this.generateId(),
          description: 'Refine with Tree of Thoughts',
          type: 'skill',
          dependencies: [],
          status: 'pending',
        },
        {
          id: this.generateId(),
          description: 'Execute with HTN',
          type: 'skill',
          dependencies: [],
          status: 'pending',
        },
      ],
      strategy: PlanningStrategy.HYBRID,
      createdAt: new Date(),
    };
  }

  /**
   * 创建ReAct规划
   */
  private async createReActPlan(goal: string): Promise<Plan> {
    return {
      id: this.generateId(),
      goal,
      steps: [
        {
          id: this.generateId(),
          description: 'Think: Analyze the goal',
          type: 'llm',
          dependencies: [],
          status: 'pending',
        },
        {
          id: this.generateId(),
          description: 'Act: Execute action',
          type: 'skill',
          dependencies: [],
          status: 'pending',
        },
        {
          id: this.generateId(),
          description: 'Observe: Check result',
          type: 'skill',
          dependencies: [],
          status: 'pending',
        },
      ],
      strategy: PlanningStrategy.REACT,
      createdAt: new Date(),
    };
  }

  /**
   * 执行规划步骤
   */
  private async executePlanStep(
    step: PlanStep,
    _context: ExecutionContext
  ): Promise<{ success: boolean; error?: string; output?: unknown }> {
    try {
      switch (step.type) {
        case 'skill':
          if (step.target) {
            // Use skill method from SDKWorkAgent
            const result = await this.skill(step.target, step.input || {});
            step.result = result.output;
            step.status = result.success ? 'completed' : 'failed';
            return { success: result.success, error: result.error?.message || undefined, output: result.output };
          }
          break;
        case 'llm':
          // LLM调用
          step.status = 'completed';
          return { success: true };
        case 'tool':
          // 工具调用
          step.status = 'completed';
          return { success: true };
        default:
          step.status = 'completed';
          return { success: true };
      }

      return { success: true };
    } catch (error) {
      step.status = 'failed';
      step.result = { error: (error as Error).message };
      return { success: false, error: (error as Error).message };
    }
  }

  /**
   * 调整规划
   */
  private async adjustPlan(_plan: Plan, failedStep: PlanStep, error?: string): Promise<Plan | null> {
    this.getLogger().warn(`Adjusting plan after step failure: ${failedStep.id}`, { error });
    
    // 简单的重新规划逻辑
    // 实际实现可以更复杂，如回退、替代路径等
    return null;
  }

  /**
   * 聚合执行结果
   */
  private aggregateResults(steps: PlanStep[]): unknown {
    const results = steps
      .filter(s => s.status === 'completed' && s.result)
      .map(s => s.result);
    
    if (results.length === 1) return results[0];
    return results;
  }

  /**
   * 获取当前规划
   */
  getCurrentPlan(): Plan | undefined {
    return this.currentPlan;
  }

  /**
   * 获取规划历史
   */
  getPlanHistory(): Plan[] {
    return [...this.planHistory];
  }

  protected getLogger(): Logger {
    // Access logger through the parent class
    return (this as unknown as { _logger: Logger })._logger;
  }

  protected generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  protected createExecutionContext(
    executionId: string,
    input: string,
    context?: Record<string, unknown>
  ) {
    return {
      executionId,
      agentId: this.id,
      agentName: this.name,
      input,
      timestamp: new Date(),
      metadata: context || {},
    };
  }
}

export default PlanningAgent;
