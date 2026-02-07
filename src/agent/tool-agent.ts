/**
 * Tool Agent
 * 专注于工具调用的Agent实现
 * 集成工具发现、选择、执行优化
 */

import { SDKWorkAgent } from './sdkwork-agent';
import type { AgentConfig, ToolDefinition, ToolContext, ToolResult } from './types';
import { createLogger, type Logger } from '../utils/logger';
import type { LLMProvider } from '../llm/provider';

// Define ToolInvocation locally
interface ToolInvocation {
  tool: string;
  input: unknown;
  output?: unknown;
  error?: Error;
  startTime?: Date;
  endTime?: Date;
  duration?: number;
}

/**
 * 工具Agent配置
 */
export interface ToolAgentConfig extends AgentConfig {
  toolSelection?: {
    strategy?: 'llm' | 'embedding' | 'rule';
    autoConfirm?: boolean;
    maxToolsPerQuery?: number;
  };
}

/**
 * 工具Agent
 * 
 * 特点：
 * - 智能工具发现
 * - 自动工具选择
 * - 批量工具执行
 * - 工具结果聚合
 */
export class ToolAgent extends SDKWorkAgent {
  private toolMap: Map<string, ToolDefinition> = new Map();
  private toolHistory: ToolInvocation[] = [];
  private selectionStrategy: string;
  private toolLogger: Logger;

  constructor(config: ToolAgentConfig) {
    super(config);

    this.selectionStrategy = config.toolSelection?.strategy || 'llm';
    this.toolLogger = createLogger({ name: 'ToolAgent' });
  }

  /**
   * 注册工具
   */
  registerTool(tool: ToolDefinition): void {
    this.toolMap.set(tool.name, tool);
    this.toolLogger.info(`Tool registered: ${tool.name}`);
  }

  /**
   * 执行工具调用
   * 
   * 流程：
   * 1. 解析用户意图
   * 2. 选择合适工具
   * 3. 提取参数
   * 4. 执行工具
   * 5. 返回结果
   */
  async executeToolQuery(
    query: string,
    _context?: Record<string, unknown>
  ): Promise<{
    success: boolean;
    output?: unknown;
    toolsUsed: string[];
    error?: string;
  }> {
    this.toolLogger.info(`Executing tool query: ${query.slice(0, 100)}`);

    try {
      // 1. 发现需要的工具
      const requiredTools = await this.discoverToolsForQuery(query);
      
      if (requiredTools.length === 0) {
        return {
          success: false,
          error: 'No suitable tools found for this query',
          toolsUsed: [],
        };
      }

      // 2. 提取参数
      const toolCalls = await this.extractToolCalls(query, requiredTools);

      // 3. 执行工具
      const results: unknown[] = [];
      const toolsUsed: string[] = [];

      for (const call of toolCalls) {
        const result = await this.invokeTool(call.toolName, call.parameters);
        results.push(result);
        toolsUsed.push(call.toolName);
      }

      // 4. 聚合结果
      const aggregated = await this.aggregateResults(results, query);

      return {
        success: true,
        output: aggregated,
        toolsUsed,
      };
    } catch (error) {
      this.toolLogger.error(`Tool query failed: ${query.slice(0, 100)}`, { error: (error as Error).message });
      return {
        success: false,
        error: (error as Error).message,
        toolsUsed: [],
      };
    }
  }

  /**
   * 发现并选择工具
   */
  private async discoverToolsForQuery(query: string): Promise<ToolDefinition[]> {
    const allTools = Array.from(this.toolMap.values());

    switch (this.selectionStrategy) {
      case 'llm':
        return this.selectToolsWithLLM(query, allTools);
      case 'embedding':
        return this.selectToolsWithEmbedding(query, allTools);
      case 'rule':
        return this.selectToolsWithRules(query, allTools);
      default:
        return allTools.slice(0, 3);
    }
  }

  /**
   * 使用LLM选择工具
   */
  private async selectToolsWithLLM(
    query: string,
    tools: ToolDefinition[]
  ): Promise<ToolDefinition[]> {
    const toolDescriptions = tools.map(t => `- ${t.name}: ${t.description}`).join('\n');

    const prompt = `Given the user query: "${query}"

Available tools:
${toolDescriptions}

Which tools are needed to answer this query? Return a JSON array of tool names.
Example: ["tool1", "tool2"]`;

    try {
      const llmProvider = this.getLLMProvider();
      const result = await llmProvider.complete({
        messages: [{ role: 'user', content: prompt }],
      });

      const toolNames = JSON.parse(result.content) as string[];
      return tools.filter(t => toolNames.includes(t.name));
    } catch {
      // 如果解析失败，返回前3个工具
      return tools.slice(0, 3);
    }
  }

  /**
   * 使用Embedding选择工具
   */
  private async selectToolsWithEmbedding(
    query: string,
    tools: ToolDefinition[]
  ): Promise<ToolDefinition[]> {
    // 简单的关键词匹配（实际实现应使用向量相似度）
    const queryLower = query.toLowerCase();
    const scored = tools.map(tool => {
      const score = this.calculateRelevance(queryLower, tool);
      return { tool, score };
    });

    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, 3).map(s => s.tool);
  }

  /**
   * 计算工具相关性
   */
  private calculateRelevance(query: string, tool: ToolDefinition): number {
    const nameMatch = query.includes(tool.name.toLowerCase()) ? 2 : 0;
    const descMatch = tool.description?.toLowerCase().split(' ').filter(word => 
      query.includes(word)
    ).length || 0;
    return nameMatch + descMatch;
  }

  /**
   * 使用规则选择工具
   */
  private async selectToolsWithRules(
    query: string,
    tools: ToolDefinition[]
  ): Promise<ToolDefinition[]> {
    // 基于关键词规则匹配
    const queryLower = query.toLowerCase();
    
    const rules: Record<string, string[]> = {
      search: ['search', 'find', 'lookup', 'query'],
      calculate: ['calculate', 'compute', 'math', 'sum', 'add'],
      read: ['read', 'get', 'fetch', 'load'],
      write: ['write', 'save', 'store', 'create'],
    };

    for (const [category, keywords] of Object.entries(rules)) {
      if (keywords.some(k => queryLower.includes(k))) {
        const matched = tools.filter(t => 
          t.name.toLowerCase().includes(category) ||
          t.description?.toLowerCase().includes(category)
        );
        if (matched.length > 0) return matched;
      }
    }

    return tools.slice(0, 2);
  }

  /**
   * 提取工具调用参数
   */
  private async extractToolCalls(
    query: string,
    tools: ToolDefinition[]
  ): Promise<Array<{ toolName: string; parameters: unknown }>> {
    const toolSchemas = tools.map(t => ({
      name: t.name,
      description: t.description,
      input: t.input,
    }));

    const prompt = `Extract tool calls from the query.

Query: "${query}"

Available tools:
${JSON.stringify(toolSchemas, null, 2)}

Return a JSON array of tool calls:
[{"toolName": "tool1", "parameters": {"param1": "value1"}}]`;

    try {
      const llmProvider = this.getLLMProvider();
      const result = await llmProvider.complete({
        messages: [{ role: 'user', content: prompt }],
      });

      return JSON.parse(result.content);
    } catch {
      // 如果解析失败，返回空参数
      return tools.map(t => ({ toolName: t.name, parameters: {} }));
    }
  }

  /**
   * 调用单个工具
   */
  private async invokeTool(toolName: string, parameters: unknown): Promise<unknown> {
    const tool = this.toolMap.get(toolName);
    if (!tool) {
      throw new Error(`Tool not found: ${toolName}`);
    }

    const startTime = Date.now();
    this.toolLogger.info(`Invoking tool: ${toolName}`);

    try {
      // Create a logger adapter that matches ILogger interface
      const contextLogger: import('../utils/logger').ILogger = {
        debug: (msg: string, meta?: Record<string, unknown>) => this.toolLogger.debug(msg, meta),
        info: (msg: string, meta?: Record<string, unknown>) => this.toolLogger.info(msg, meta),
        warn: (msg: string, meta?: Record<string, unknown>) => this.toolLogger.warn(msg, meta),
        error: (msg: string, meta?: Record<string, unknown>, _error?: Error) => this.toolLogger.error(msg, meta),
      };
      const context: ToolContext = {
        executionId: `tool-${Date.now()}`,
        agent: {} as any,
        log: contextLogger,
      };
      const result: ToolResult = await tool.run(parameters, context);
      
      const invocation: ToolInvocation = {
        tool: toolName,
        input: parameters,
        output: result.data,
        startTime: new Date(startTime),
        endTime: new Date(),
        duration: Date.now() - startTime,
      };
      
      this.toolHistory.push(invocation);
      this.emit('tool:completed', { toolName, output: result.data, duration: invocation.duration });

      return result.data;
    } catch (error) {
      this.emit('tool:failed', { toolName, error: error as Error });
      throw error;
    }
  }

  /**
   * 聚合工具结果
   */
  private async aggregateResults(results: unknown[], query: string): Promise<unknown> {
    if (results.length === 1) return results[0];

    // 使用LLM聚合多个结果
    const prompt = `Synthesize the following tool results into a coherent answer.

User Query: "${query}"

Tool Results:
${results.map((r, i) => `Result ${i + 1}:\n${JSON.stringify(r, null, 2)}`).join('\n\n')}

Provide a clear, concise answer.`;

    try {
      const llmProvider = this.getLLMProvider();
      const result = await llmProvider.complete({
        messages: [{ role: 'user', content: prompt }],
      });

      return result.content;
    } catch {
      return results;
    }
  }

  /**
   * 批量执行工具
   */
  async executeToolsInParallel(
    calls: Array<{ toolName: string; parameters: unknown }>
  ): Promise<Array<{ toolName: string; result: unknown; error?: string }>> {
    const promises = calls.map(async call => {
      try {
        const result = await this.invokeTool(call.toolName, call.parameters);
        return { toolName: call.toolName, result };
      } catch (error) {
        return { 
          toolName: call.toolName, 
          result: null, 
          error: (error as Error).message 
        };
      }
    });

    return Promise.all(promises);
  }

  /**
   * 获取工具历史
   */
  getToolHistory(): ToolInvocation[] {
    return [...this.toolHistory];
  }

  /**
   * 获取可用工具列表
   */
  getAvailableTools(): ToolDefinition[] {
    return Array.from(this.toolMap.values());
  }

  /**
   * 清空工具历史
   */
  clearToolHistory(): void {
    this.toolHistory = [];
  }

  /**
   * 获取 LLM Provider
   */
  protected getLLMProvider(): LLMProvider {
    // Access LLM provider through the parent class config
    return (this as unknown as { config: { llmProvider: LLMProvider } }).config.llmProvider;
  }
}

export default ToolAgent;
