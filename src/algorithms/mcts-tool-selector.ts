/**
 * MCTS 工具选择器
 * 
 * 基于 MCTS 算法的智能工具选择实现
 * 用于在多个可用工具中选择最优的执行序列
 */

import {
  MCTSDecisionEngine,
  DecisionState,
  Action,
  MCTSConfig,
  StateEvaluator,
  SimulationPolicy,
  DecisionResult,
} from './mcts-decision-engine.js';

/**
 * 工具定义
 */
export interface Tool {
  id: string;
  name: string;
  description: string;
  parameters?: Record<string, unknown>;
  estimatedCost?: number;
  successRate?: number;
  averageExecutionTime?: number;
}

/**
 * 工具执行上下文
 */
export interface ToolExecutionContext {
  userQuery: string;
  conversationHistory: Array<{ role: string; content: string }>;
  availableTools: Tool[];
  previousToolResults?: Map<string, unknown>;
  constraints?: {
    maxTools?: number;
    maxCost?: number;
    maxTime?: number;
  };
}

/**
 * 工具执行结果
 */
export interface ToolExecutionResult {
  toolId: string;
  success: boolean;
  result: unknown;
  executionTime: number;
  cost: number;
  error?: string;
}

/**
 * 工具选择状态
 */
export interface ToolSelectionState extends DecisionState {
  context: ToolExecutionContext;
  selectedTools: string[];
  executedTools: Map<string, ToolExecutionResult>;
  remainingBudget: {
    tools: number;
    cost: number;
    time: number;
  };
  currentQuery: string;
}

/**
 * 工具选择动作
 */
export interface ToolSelectionAction extends Action {
  tool: Tool;
  parameters?: Record<string, unknown>;
  expectedOutcome?: string;
}

/**
 * 工具选择结果
 */
export interface ToolSelectionResult {
  selectedTools: Array<{
    tool: Tool;
    parameters?: Record<string, unknown>;
    confidence: number;
    expectedOutcome: string;
  }>;
  executionPlan: string[];
  totalEstimatedCost: number;
  totalEstimatedTime: number;
  successProbability: number;
  alternativePlans: Array<{
    tools: string[];
    probability: number;
  }>;
}

/**
 * 工具执行器接口
 */
export interface ToolExecutor {
  execute(tool: Tool, parameters?: Record<string, unknown>): Promise<ToolExecutionResult>;
  estimateCost(tool: Tool, parameters?: Record<string, unknown>): number;
  estimateTime(tool: Tool, parameters?: Record<string, unknown>): number;
}

/**
 * 基于 MCTS 的工具选择引擎
 */
export class MCTSToolSelector extends MCTSDecisionEngine {
  private toolExecutor: ToolExecutor;
  private llmEvaluator?: (query: string, toolResults: Map<string, unknown>) => Promise<number>;

  constructor(
    toolExecutor: ToolExecutor,
    config?: Partial<MCTSConfig>,
    llmEvaluator?: (query: string, toolResults: Map<string, unknown>) => Promise<number>
  ) {
    super(
      new ToolSelectionSimulationPolicy(toolExecutor),
      {
        maxIterations: 500,
        timeout: 10000,
        parallelSimulations: 4,
        explorationConstant: 1.414,
        useRAVE: true,
        expansionThreshold: 3,
        ...config
      }
    );
    this.toolExecutor = toolExecutor;
    this.llmEvaluator = llmEvaluator;
  }

  /**
   * 选择最优工具序列
   */
  async selectTools(context: ToolExecutionContext): Promise<ToolSelectionResult> {
    const initialState: ToolSelectionState = {
      id: 'initial',
      depth: 0,
      isTerminal: false,
      context,
      selectedTools: [],
      executedTools: new Map(),
      remainingBudget: {
        tools: context.constraints?.maxTools || 5,
        cost: context.constraints?.maxCost || 100,
        time: context.constraints?.maxTime || 30000
      },
      currentQuery: context.userQuery,
      description: `Selecting tools for: ${context.userQuery}`
    };

    const availableActions = await this.getAvailableActions(initialState);
    
    if (availableActions.length === 0) {
      return {
        selectedTools: [],
        executionPlan: [],
        totalEstimatedCost: 0,
        totalEstimatedTime: 0,
        successProbability: 0,
        alternativePlans: []
      };
    }

    const decisionResult = await this.decide(initialState, availableActions);
    
    return this.buildSelectionResult(decisionResult, context);
  }

  /**
   * 应用动作到状态 - 实现父类抽象方法
   */
  protected async applyAction(state: DecisionState, action: Action): Promise<DecisionState> {
    const toolState = state as ToolSelectionState;
    const toolAction = action as ToolSelectionAction;
    
    const newSelectedTools = [...toolState.selectedTools, toolAction.tool.id];
    const estimatedCost = this.toolExecutor.estimateCost(toolAction.tool, toolAction.parameters);
    const estimatedTime = this.toolExecutor.estimateTime(toolAction.tool, toolAction.parameters);
    
    // 检查是否达到终止条件
    const isTerminal = this.isTerminalState({
      ...toolState,
      selectedTools: newSelectedTools,
      remainingBudget: {
        tools: toolState.remainingBudget.tools - 1,
        cost: toolState.remainingBudget.cost - estimatedCost,
        time: toolState.remainingBudget.time - estimatedTime
      }
    });

    return {
      id: `${state.id}-${action.id}`,
      depth: state.depth + 1,
      isTerminal,
      parentId: state.id,
      action,
      context: toolState.context,
      selectedTools: newSelectedTools,
      executedTools: toolState.executedTools,
      remainingBudget: {
        tools: toolState.remainingBudget.tools - 1,
        cost: toolState.remainingBudget.cost - estimatedCost,
        time: toolState.remainingBudget.time - estimatedTime
      },
      currentQuery: toolState.currentQuery,
      description: `Selected ${toolAction.tool.name}`
    } as ToolSelectionState;
  }

  /**
   * 获取可用动作 - 实现父类抽象方法
   */
  protected async getAvailableActions(state: DecisionState): Promise<Action[]> {
    const toolState = state as ToolSelectionState;
    
    // 如果已到达终止条件，返回空数组
    if (this.isTerminalState(toolState)) {
      return [];
    }

    // 过滤掉已选择的工具和超出预算的工具
    const availableTools = toolState.context.availableTools.filter(tool => {
      // 检查是否已选择
      if (toolState.selectedTools.includes(tool.id)) {
        return false;
      }
      
      // 检查预算
      const estimatedCost = this.toolExecutor.estimateCost(tool);
      const estimatedTime = this.toolExecutor.estimateTime(tool);
      
      if (estimatedCost > toolState.remainingBudget.cost ||
          estimatedTime > toolState.remainingBudget.time) {
        return false;
      }
      
      return true;
    });

    // 为每个可用工具创建动作
    return availableTools.map(tool => ({
      id: tool.id,
      name: tool.name,
      description: tool.description,
      tool,
      parameters: tool.parameters,
      expectedOutcome: `Execute ${tool.name} to help answer: ${toolState.currentQuery}`,
      priorProbability: this.calculateToolRelevance(tool, toolState)
    } as ToolSelectionAction));
  }

  /**
   * 检查是否为终止状态
   */
  private isTerminalState(state: ToolSelectionState): boolean {
    // 预算耗尽
    if (state.remainingBudget.tools <= 0 ||
        state.remainingBudget.cost <= 0 ||
        state.remainingBudget.time <= 0) {
      return true;
    }

    // 已选择足够工具
    const maxTools = state.context.constraints?.maxTools || 5;
    if (state.selectedTools.length >= maxTools) {
      return true;
    }

    // 查询已解决（通过LLM评估）
    if (this.llmEvaluator && state.selectedTools.length > 0) {
      // 异步检查，这里简化处理
      return false;
    }

    return false;
  }

  /**
   * 计算工具相关性（先验概率）
   */
  private calculateToolRelevance(tool: Tool, state: ToolSelectionState): number {
    let relevance = 0.5; // 基础相关性

    // 基于工具描述和查询的关键词匹配
    const queryWords = state.currentQuery.toLowerCase().split(/\s+/);
    const toolWords = (tool.description + ' ' + tool.name).toLowerCase().split(/\s+/);
    
    const matchingWords = queryWords.filter(word => 
      toolWords.some(toolWord => toolWord.includes(word) || word.includes(toolWord))
    );
    
    relevance += (matchingWords.length / queryWords.length) * 0.3;

    // 基于成功率
    if (tool.successRate !== undefined) {
      relevance += tool.successRate * 0.2;
    }

    // 基于历史执行结果
    if (state.context.previousToolResults?.has(tool.id)) {
      const previousResult = state.context.previousToolResults.get(tool.id) as ToolExecutionResult;
      if (previousResult.success) {
        relevance += 0.1;
      } else {
        relevance -= 0.2;
      }
    }

    return Math.max(0.1, Math.min(0.95, relevance));
  }

  /**
   * 构建选择结果
   */
  private buildSelectionResult(
    decisionResult: DecisionResult,
    _context: ToolExecutionContext
  ): ToolSelectionResult {
    const selectedTools: ToolSelectionResult['selectedTools'] = [];
    let totalCost = 0;
    let totalTime = 0;

    // 从决策结果中提取工具序列
    for (const stat of decisionResult.actionStats.slice(0, 3)) {
      const toolAction = stat.action as ToolSelectionAction;
      selectedTools.push({
        tool: toolAction.tool,
        parameters: toolAction.parameters,
        confidence: stat.visitCount / Math.max(1, decisionResult.treeStats.totalVisits),
        expectedOutcome: toolAction.expectedOutcome || ''
      });
      
      totalCost += this.toolExecutor.estimateCost(toolAction.tool, toolAction.parameters);
      totalTime += this.toolExecutor.estimateTime(toolAction.tool, toolAction.parameters);
    }

    // 构建替代方案
    const alternativePlans = decisionResult.actionStats
      .slice(3, 6)
      .map(stat => ({
        tools: [stat.action.name],
        probability: stat.visitCount / Math.max(1, decisionResult.treeStats.totalVisits)
      }));

    return {
      selectedTools,
      executionPlan: selectedTools.map(t => t.tool.id),
      totalEstimatedCost: totalCost,
      totalEstimatedTime: totalTime,
      successProbability: decisionResult.confidence,
      alternativePlans
    };
  }
}

/**
 * 工具选择模拟策略
 */
class ToolSelectionSimulationPolicy implements SimulationPolicy {
  private toolExecutor: ToolExecutor;

  constructor(toolExecutor: ToolExecutor) {
    this.toolExecutor = toolExecutor;
  }

  async selectAction(state: DecisionState, availableActions: Action[]): Promise<Action> {
    const toolState = state as ToolSelectionState;
    
    // 基于启发式选择最佳动作
    let bestAction = availableActions[0];
    let bestScore = -Infinity;

    for (const action of availableActions) {
      const toolAction = action as ToolSelectionAction;
      const score = this.evaluateToolAction(toolAction, toolState);
      
      if (score > bestScore) {
        bestScore = score;
        bestAction = action;
      }
    }

    return bestAction;
  }

  evaluateTerminal(state: DecisionState): number {
    const toolState = state as ToolSelectionState;
    
    // 评估最终状态的质量
    let score = 0;

    // 成功执行的工具数量
    score += toolState.selectedTools.length * 10;

    // 剩余预算（适度使用预算是好的）
    const budgetUtilization = 1 - (toolState.remainingBudget.cost / 
      (toolState.context.constraints?.maxCost || 100));
    score += budgetUtilization * 20;

    // 工具多样性奖励
    const uniqueToolTypes = new Set(toolState.selectedTools).size;
    score += uniqueToolTypes * 5;

    return score;
  }

  private evaluateToolAction(action: ToolSelectionAction, state: ToolSelectionState): number {
    let score = 0;

    // 先验概率
    score += (action.priorProbability || 0.5) * 30;

    // 工具成功率
    if (action.tool.successRate !== undefined) {
      score += action.tool.successRate * 20;
    }

    // 成本效益
    const cost = this.toolExecutor.estimateCost(action.tool, action.parameters);
    const maxCost = state.context.constraints?.maxCost || 100;
    score += (1 - cost / maxCost) * 15;

    // 执行时间
    const time = this.toolExecutor.estimateTime(action.tool, action.parameters);
    const maxTime = state.context.constraints?.maxTime || 30000;
    score += (1 - time / maxTime) * 10;

    return score;
  }
}

/**
 * 基于LLM的工具选择评估器
 */
export class LLMToolSelectionEvaluator implements StateEvaluator {
  private llmClient: {
    evaluate: (prompt: string) => Promise<number>;
  };

  constructor(llmClient: { evaluate: (prompt: string) => Promise<number> }) {
    this.llmClient = llmClient;
  }

  async evaluate(state: DecisionState): Promise<number> {
    const toolState = state as ToolSelectionState;
    
    const prompt = `
Query: ${toolState.currentQuery}
Selected Tools: ${toolState.selectedTools.join(', ')}
Remaining Budget: ${JSON.stringify(toolState.remainingBudget)}

Evaluate how well this tool selection addresses the query (0-100):
    `.trim();

    try {
      const score = await this.llmClient.evaluate(prompt);
      return score / 100; // 归一化到 0-1
    } catch {
      return 0.5;
    }
  }

  async getActionPrior(state: DecisionState, actions: Action[]): Promise<Map<string, number>> {
    const toolState = state as ToolSelectionState;
    const priors = new Map<string, number>();

    for (const action of actions) {
      const toolAction = action as ToolSelectionAction;
      
      const prompt = `
Query: ${toolState.currentQuery}
Tool: ${toolAction.tool.name}
Description: ${toolAction.tool.description}

Rate how relevant this tool is for the query (0-100):
      `.trim();

      try {
        const score = await this.llmClient.evaluate(prompt);
        priors.set(action.id, score / 100);
      } catch {
        priors.set(action.id, 0.5);
      }
    }

    return priors;
  }
}

/**
 * 简单工具执行器实现
 */
export class SimpleToolExecutor implements ToolExecutor {
  private toolHandlers: Map<string, (params?: Record<string, unknown>) => Promise<unknown>>;

  constructor(handlers: Map<string, (params?: Record<string, unknown>) => Promise<unknown>>) {
    this.toolHandlers = handlers;
  }

  async execute(tool: Tool, parameters?: Record<string, unknown>): Promise<ToolExecutionResult> {
    const startTime = Date.now();
    
    try {
      const handler = this.toolHandlers.get(tool.id);
      if (!handler) {
        throw new Error(`No handler for tool: ${tool.id}`);
      }

      const result = await handler(parameters);
      
      return {
        toolId: tool.id,
        success: true,
        result,
        executionTime: Date.now() - startTime,
        cost: this.estimateCost(tool, parameters)
      };
    } catch (error) {
      return {
        toolId: tool.id,
        success: false,
        result: null,
        executionTime: Date.now() - startTime,
        cost: this.estimateCost(tool, parameters),
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  estimateCost(tool: Tool, parameters?: Record<string, unknown>): number {
    // 基于工具复杂度和参数估算成本
    let cost = tool.estimatedCost || 10;
    
    if (parameters) {
      const paramSize = JSON.stringify(parameters).length;
      cost += paramSize * 0.01;
    }
    
    return cost;
  }

  estimateTime(tool: Tool, parameters?: Record<string, unknown>): number {
    // 基于历史平均执行时间或默认值
    let time = tool.averageExecutionTime || 1000;
    
    if (parameters) {
      const paramComplexity = Object.keys(parameters).length;
      time += paramComplexity * 100;
    }
    
    return time;
  }
}

export default MCTSToolSelector;
