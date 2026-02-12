/**
 * Intelligent Tool Selector - 智能工具选择器
 *
 * 核心特性：
 * 1. 基于语义的工具选择
 * 2. 工具组合优化
 * 3. 依赖分析与并行执行
 * 4. 工具使用学习
 *
 * @module IntelligentToolSelector
 * @version 2.0.0
 * @reference OpenAI Function Calling, Claude Tool Use
 */

import { EventEmitter } from '../../utils/event-emitter.js';
import { Tool } from './types';
import { ToolRegistry } from '../registry.js';
import { LLMService, Logger } from '../../skills/core/types.js';

/**
 * 工具选择结果
 */
export interface ToolSelection {
  /** 选中的工具 */
  tool: Tool;

  /** 置信度 (0-1) */
  confidence: number;

  /** 选择理由 */
  reasoning: string;

  /** 建议的参数 */
  suggestedParameters?: Record<string, unknown>;
}

/**
 * 工具组合
 */
export interface ToolChain {
  /** 工具序列 */
  tools: Tool[];

  /** 执行顺序 */
  executionOrder: number[];

  /** 数据流映射 */
  dataFlow: DataFlowMapping[];

  /** 预计执行时间 (ms) */
  estimatedTime: number;

  /** 成功率预测 */
  successRate: number;
}

/**
 * 数据流映射
 */
export interface DataFlowMapping {
  /** 源工具索引 */
  fromTool: number;

  /** 源输出字段 */
  fromField: string;

  /** 目标工具索引 */
  toTool: number;

  /** 目标参数字段 */
  toField: string;
}

/**
 * 依赖图
 */
export interface DependencyGraph {
  /** 节点（工具） */
  nodes: Tool[];

  /** 边（依赖关系） */
  edges: Array<{
    from: number;
    to: number;
    type: 'data' | 'control';
  }>;

  /** 并行组 */
  parallelGroups: number[][];
}

/**
 * 工具使用历史
 */
export interface ToolUsageHistory {
  /** 工具名称 */
  toolName: string;

  /** 使用次数 */
  usageCount: number;

  /** 成功次数 */
  successCount: number;

  /** 平均执行时间 */
  avgExecutionTime: number;

  /** 常见参数组合 */
  commonParameters: Array<{
    parameters: Record<string, unknown>;
    frequency: number;
  }>;

  /** 使用场景 */
  usageContexts: string[];
}

/**
 * 选择器配置
 */
export interface IntelligentSelectorConfig {
  /** 最小置信度阈值 */
  minConfidence?: number;

  /** 最大工具数量 */
  maxTools?: number;

  /** 启用工具学习 */
  enableLearning?: boolean;

  /** 启用并行执行 */
  enableParallelExecution?: boolean;

  /** 启用参数建议 */
  enableParameterSuggestion?: boolean;
}

/**
 * 智能工具选择器
 *
 * 提供基于语义理解和历史学习的工具选择能力
 */
export class IntelligentToolSelector extends EventEmitter {
  private usageHistory = new Map<string, ToolUsageHistory>();
  private config: Required<IntelligentSelectorConfig>;
  private _toolRegistry: ToolRegistry;
  private _llm: LLMService;
  private selectorLogger: Logger;

  constructor(
    toolRegistry: ToolRegistry,
    llm: LLMService,
    logger: Logger,
    config: IntelligentSelectorConfig = {}
  ) {
    super();
    this._toolRegistry = toolRegistry;
    this._llm = llm;
    this.selectorLogger = logger;
    this.config = {
      minConfidence: 0.7,
      maxTools: 5,
      enableLearning: true,
      enableParallelExecution: true,
      enableParameterSuggestion: true,
      ...config,
    };
  }

  /**
   * 基于意图选择工具
   *
   * @param intent - 用户意图/任务描述
   * @param _context - 额外上下文
   * @returns 工具选择结果列表
   *
   * @example
   * ```typescript
   * const selector = new IntelligentToolSelector(registry, llm, logger);
   * const selections = await selector.selectTools('查询北京天气并发送邮件');
   * // 可能返回: [weather_tool, email_tool]
   * ```
   */
  async selectTools(
    intent: string,
    _context?: Record<string, unknown>
  ): Promise<ToolSelection[]> {
    this.emit('selection:started', {
      type: 'selection:started',
      timestamp: new Date(),
      data: { intent },
    });

    // 1. 获取所有可用工具
    const availableTools = this.getAvailableTools();

    // 2. 基于语义匹配筛选
    const semanticMatches = await this.semanticMatch(intent, availableTools);

    // 3. 基于历史使用优化
    const optimizedMatches = this.optimizeByHistory(semanticMatches, intent);

    // 4. 过滤低置信度
    const filtered = optimizedMatches.filter(
      s => s.confidence >= this.config.minConfidence
    );

    // 5. 限制数量
    const limited = filtered.slice(0, this.config.maxTools);

    this.emit('selection:completed', {
      type: 'selection:completed',
      timestamp: new Date(),
      data: { intent, selected: limited.map(s => s.tool.name) },
    });

    return limited;
  }

  /**
   * 优化工具组合
   *
   * 根据任务目标优化工具的执行顺序和数据流
   */
  async optimizeToolChain(
    tools: Tool[],
    goal: string,
    input: Record<string, unknown>
  ): Promise<ToolChain> {
    this.emit('optimization:started', {
      type: 'optimization:started',
      timestamp: new Date(),
      data: { tools: tools.map(t => t.name), goal },
    });

    // 1. 分析依赖关系
    const dependencyGraph = this.analyzeDependencies(tools, goal);

    // 2. 确定执行顺序
    const executionOrder = this.topologicalSort(dependencyGraph);

    // 3. 识别并行组
    void this.identifyParallelGroups(dependencyGraph);

    // 4. 映射数据流
    const dataFlow = await this.inferDataFlow(tools, executionOrder, input);

    // 5. 估算执行时间和成功率
    const { estimatedTime, successRate } = this.estimatePerformance(
      tools,
      executionOrder
    );

    const chain: ToolChain = {
      tools,
      executionOrder,
      dataFlow,
      estimatedTime,
      successRate,
    };

    this.emit('optimization:completed', {
      type: 'optimization:completed',
      timestamp: new Date(),
      data: { chain },
    });

    return chain;
  }

  /**
   * 分析工具依赖关系
   */
  analyzeDependencies(tools: Tool[], goal: string): DependencyGraph {
    const nodes = tools;
    const edges: DependencyGraph['edges'] = [];

    // 基于工具类别和描述分析依赖
    for (let i = 0; i < tools.length; i++) {
      for (let j = 0; j < tools.length; j++) {
        if (i === j) continue;

        const source = tools[i];
        const target = tools[j];

        // 检查数据依赖
        if (this.hasDataDependency(source, target)) {
          edges.push({ from: i, to: j, type: 'data' });
        }

        // 检查控制依赖
        if (this.hasControlDependency(source, target, goal)) {
          edges.push({ from: i, to: j, type: 'control' });
        }
      }
    }

    // 识别并行组
    const parallelGroups = this.identifyParallelGroups({ nodes, edges, parallelGroups: [] });

    return { nodes, edges, parallelGroups };
  }

  /**
   * 并行执行工具
   */
  async executeParallel<T>(
    toolChain: ToolChain,
    initialInput: Record<string, unknown>
  ): Promise<Array<{ tool: Tool; result: T; success: boolean }>> {
    if (!this.config.enableParallelExecution) {
      // 串行执行
      return this.executeSequential<T>(toolChain, initialInput);
    }

    const results: Array<{ tool: Tool; result: T | Error; success: boolean }> = [];
    const executed = new Set<number>();
    const dataMap = new Map<string, unknown>();

    // 存储初始输入
    Object.entries(initialInput).forEach(([key, value]) => {
      dataMap.set(`input.${key}`, value);
    });

    // 按并行组执行
    for (const group of this.identifyParallelGroupsFromChain(toolChain)) {
      const groupResults = await Promise.all(
        group.map(async index => {
          const tool = toolChain.tools[index];

          // 准备输入
          const input = this.prepareToolInput(tool, index, toolChain, dataMap);

          try {
            const result = await this.executeTool<T>(tool, input);
            return { index, tool, result, success: true };
          } catch (error) {
            return { index, tool, result: error as Error, success: false };
          }
        })
      );

      // 存储结果
      for (const { index, tool, result, success } of groupResults) {
        results[index] = { tool, result: result as T, success };
        executed.add(index);

        // 更新数据映射
        if (success) {
          dataMap.set(`tool_${index}.result`, result);
        }

        // 学习
        if (this.config.enableLearning) {
          const input = this.prepareToolInput(tool, index, toolChain, dataMap);
          this.learnFromExecution(tool, input, success);
        }
      }
    }

    return results as Array<{ tool: Tool; result: T; success: boolean }>;
  }

  /**
   * 建议工具参数
   */
  async suggestParameters(
    tool: Tool,
    intent: string,
    _context?: Record<string, unknown>
  ): Promise<Record<string, unknown>> {
    if (!this.config.enableParameterSuggestion) {
      return {};
    }

    // 1. 从历史中学习
    const history = this.usageHistory.get(tool.name);
    const commonParams = history?.commonParameters[0]?.parameters || {};

    // 2. 使用 LLM 优化
    const prompt = `Given the intent "${intent}" and tool "${tool.name}" (${tool.description}),
suggest optimal parameters.

Historical common parameters: ${JSON.stringify(commonParams)}
Context: ${JSON.stringify(_context)}

Suggest parameters as JSON:`;

    try {
      const response = await this._llm.complete(prompt, { temperature: 0.3 });
      const suggested = JSON.parse(response);
      return { ...commonParams, ...suggested };
    } catch {
      return commonParams;
    }
  }

  /**
   * 记录工具使用
   */
  recordUsage(
    toolName: string,
    parameters: Record<string, unknown>,
    success: boolean,
    executionTime: number,
    context: string
  ): void {
    let history = this.usageHistory.get(toolName);

    if (!history) {
      history = {
        toolName,
        usageCount: 0,
        successCount: 0,
        avgExecutionTime: 0,
        commonParameters: [],
        usageContexts: [],
      };
      this.usageHistory.set(toolName, history);
    }

    // 更新统计
    history.usageCount++;
    if (success) history.successCount++;

    // 更新平均执行时间
    history.avgExecutionTime =
      (history.avgExecutionTime * (history.usageCount - 1) + executionTime) /
      history.usageCount;

    // 记录参数
    this.recordParameterUsage(history, parameters);

    // 记录上下文
    if (!history.usageContexts.includes(context)) {
      history.usageContexts.push(context);
    }

    this.emit('usage:recorded', {
      type: 'usage:recorded',
      timestamp: new Date(),
      data: { toolName, success, executionTime },
    });
  }

  /**
   * 获取工具使用统计
   */
  getUsageStats(): Map<string, ToolUsageHistory> {
    return new Map(this.usageHistory);
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  private getAvailableTools(): Tool[] {
    // 从 ToolRegistry 获取所有工具
    return this._toolRegistry.list();
  }

  private async semanticMatch(intent: string, tools: Tool[]): Promise<ToolSelection[]> {
    const matches: ToolSelection[] = [];

    // 构建提示
    const toolsDescription = tools
      .map(
        (t, i) =>
          `${i + 1}. ${t.name}: ${t.description} (category: ${t.category || 'unknown'})`
      )
      .join('\n');

    const prompt = `Given the user intent: "${intent}"

Available tools:
${toolsDescription}

Rate each tool's relevance to the intent on a scale of 0-1.
Respond in JSON format: {"selections": [{"toolIndex": 1, "confidence": 0.9, "reasoning": "..."}]}`;

    try {
      const response = await this._llm.complete(prompt, { temperature: 0.3 });
      const parsed = JSON.parse(response);

      for (const sel of parsed.selections || []) {
        const tool = tools[sel.toolIndex - 1];
        if (tool) {
          matches.push({
            tool,
            confidence: sel.confidence,
            reasoning: sel.reasoning,
          });
        }
      }
    } catch (error) {
      this.selectorLogger.error('Semantic matching failed', { error: String(error) });
    }

    // 按置信度排序
    matches.sort((a, b) => b.confidence - a.confidence);

    return matches;
  }

  private optimizeByHistory(
    matches: ToolSelection[],
    intent: string
  ): ToolSelection[] {
    return matches.map(match => {
      const history = this.usageHistory.get(match.tool.name);

      if (!history) return match;

      // 根据历史成功率调整置信度
      const successRate = history.successCount / history.usageCount;
      const adjustedConfidence = match.confidence * (0.5 + 0.5 * successRate);

      // 添加上下文匹配度
      const contextMatch = history.usageContexts.some(ctx =>
        intent.toLowerCase().includes(ctx.toLowerCase())
      );

      const finalConfidence = contextMatch
        ? Math.min(1, adjustedConfidence + 0.1)
        : adjustedConfidence;

      return {
        ...match,
        confidence: finalConfidence,
        reasoning: `${match.reasoning} (historical success rate: ${(
          successRate * 100
        ).toFixed(1)}%)`,
      };
    });
  }

  private hasDataDependency(_source: Tool, _target: Tool): boolean {
    // 检查 source 的输出是否是 target 的输入
    // 这里简化实现，实际应该检查工具的输入输出 schema
    return false;
  }

  private hasControlDependency(_source: Tool, _target: Tool, _goal: string): boolean {
    // 基于目标分析控制依赖
    // 例如：某些工具必须在其他工具之前执行
    return false;
  }

  private topologicalSort(graph: DependencyGraph): number[] {
    const visited = new Set<number>();
    const temp = new Set<number>();
    const order: number[] = [];

    const visit = (node: number) => {
      if (temp.has(node)) throw new Error('Circular dependency detected');
      if (visited.has(node)) return;

      temp.add(node);

      // 找到所有依赖当前节点的边
      for (const edge of graph.edges) {
        if (edge.from === node) {
          visit(edge.to);
        }
      }

      temp.delete(node);
      visited.add(node);
      order.unshift(node);
    };

    for (let i = 0; i < graph.nodes.length; i++) {
      if (!visited.has(i)) {
        visit(i);
      }
    }

    return order;
  }

  private identifyParallelGroups(graph: DependencyGraph): number[][] {
    const inDegree = new Map<number, number>();

    // 计算入度
    for (let i = 0; i < graph.nodes.length; i++) {
      inDegree.set(i, 0);
    }

    for (const edge of graph.edges) {
      inDegree.set(edge.to, (inDegree.get(edge.to) || 0) + 1);
    }

    const groups: number[][] = [];
    const visited = new Set<number>();

    while (visited.size < graph.nodes.length) {
      const group: number[] = [];

      for (let i = 0; i < graph.nodes.length; i++) {
        if (visited.has(i)) continue;
        if (inDegree.get(i) === 0) {
          group.push(i);
        }
      }

      if (group.length === 0) break;

      groups.push(group);

      // 更新入度
      for (const node of group) {
        visited.add(node);
        for (const edge of graph.edges) {
          if (edge.from === node) {
            inDegree.set(edge.to, (inDegree.get(edge.to) || 0) - 1);
          }
        }
      }
    }

    return groups;
  }

  private identifyParallelGroupsFromChain(chain: ToolChain): number[][] {
    const groups: number[][] = [];
    const executed = new Set<number>();

    for (const index of chain.executionOrder) {
      if (executed.has(index)) continue;

      const group = [index];
      executed.add(index);

      // 找到可以并行执行的工具
      for (const otherIndex of chain.executionOrder) {
        if (executed.has(otherIndex)) continue;

        // 检查是否有依赖关系
        const hasDependency = chain.dataFlow.some(
          flow =>
            (flow.fromTool === index && flow.toTool === otherIndex) ||
            (flow.fromTool === otherIndex && flow.toTool === index)
        );

        if (!hasDependency) {
          group.push(otherIndex);
          executed.add(otherIndex);
        }
      }

      groups.push(group);
    }

    return groups;
  }

  private async inferDataFlow(
    tools: Tool[],
    executionOrder: number[],
    input: Record<string, unknown>
  ): Promise<DataFlowMapping[]> {
    // 使用 LLM 推断数据流
    const prompt = `Given the tools and execution order, infer the data flow between tools.

Tools: ${tools.map(t => t.name).join(', ')}
Execution Order: ${executionOrder.join(' -> ')}
Initial Input: ${JSON.stringify(input)}

Identify how output from one tool flows as input to another.
Respond as JSON array of {fromTool, fromField, toTool, toField}`;

    try {
      const response = await this._llm.complete(prompt, { temperature: 0.3 });
      const parsed = JSON.parse(response);
      return parsed || [];
    } catch {
      return [];
    }
  }

  private estimatePerformance(
    tools: Tool[],
    executionOrder: number[]
  ): { estimatedTime: number; successRate: number } {
    let totalTime = 0;
    let totalSuccessRate = 1;

    for (const index of executionOrder) {
      const tool = tools[index];
      const history = this.usageHistory.get(tool.name);

      if (history) {
        totalTime += history.avgExecutionTime;
        totalSuccessRate *= history.successCount / history.usageCount;
      } else {
        // 默认值
        totalTime += 1000;
        totalSuccessRate *= 0.8;
      }
    }

    return {
      estimatedTime: totalTime,
      successRate: totalSuccessRate,
    };
  }

  private prepareToolInput(
    _tool: Tool,
    index: number,
    chain: ToolChain,
    dataMap: Map<string, unknown>
  ): Record<string, unknown> {
    const input: Record<string, unknown> = {};

    // 根据数据流映射准备输入
    for (const flow of chain.dataFlow) {
      if (flow.toTool === index) {
        const value = dataMap.get(`tool_${flow.fromTool}.${flow.fromField}`);
        if (value !== undefined) {
          input[flow.toField] = value;
        }
      }
    }

    // 添加初始输入
    for (const [key, value] of dataMap.entries()) {
      if (key.startsWith('input.')) {
        const fieldName = key.substring(6);
        if (input[fieldName] === undefined) {
          input[fieldName] = value;
        }
      }
    }

    return input;
  }

  private async executeTool<T>(
    _tool: Tool,
    _input: Record<string, unknown>
  ): Promise<T> {
    // 实际执行工具
    // 这里简化实现
    return {} as T;
  }

  private async executeSequential<T>(
    toolChain: ToolChain,
    initialInput: Record<string, unknown>
  ): Promise<Array<{ tool: Tool; result: T; success: boolean }>> {
    const results: Array<{ tool: Tool; result: T; success: boolean }> = [];
    let currentInput = { ...initialInput };

    for (const index of toolChain.executionOrder) {
      const tool = toolChain.tools[index];

      try {
        const result = await this.executeTool<T>(tool, currentInput);
        results.push({ tool, result, success: true });

        // 更新输入用于下一个工具
        currentInput = { ...currentInput, result };
      } catch (error) {
        results.push({ tool, result: error as T, success: false });
      }
    }

    return results;
  }

  private learnFromExecution(
    _tool: Tool,
    _parameters: Record<string, unknown>,
    _success: boolean
  ): void {
    // 记录成功/失败模式
    // 用于未来优化选择
  }

  private recordParameterUsage(
    history: ToolUsageHistory,
    parameters: Record<string, unknown>
  ): void {
    // 简化参数用于比较
    const simplified = JSON.stringify(parameters);

    const existing = history.commonParameters.find(
      p => JSON.stringify(p.parameters) === simplified
    );

    if (existing) {
      existing.frequency++;
    } else {
      history.commonParameters.push({ parameters, frequency: 1 });
    }

    // 按频率排序
    history.commonParameters.sort((a, b) => b.frequency - a.frequency);

    // 只保留前10个
    if (history.commonParameters.length > 10) {
      history.commonParameters = history.commonParameters.slice(0, 10);
    }
  }
}

/**
 * 创建智能工具选择器实例
 */
export function createIntelligentToolSelector(
  toolRegistry: ToolRegistry,
  llm: LLMService,
  logger: Logger,
  config?: IntelligentSelectorConfig
): IntelligentToolSelector {
  return new IntelligentToolSelector(toolRegistry, llm, logger, config);
}
