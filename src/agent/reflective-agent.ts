/**
 * Reflective Agent
 * 专注于自我反思和改进的Agent实现
 * 集成Reflexion算法
 */

import { SDKWorkAgent } from './sdkwork-agent';
import type { AgentConfig, Reflection, Improvement, ExecutionResult, Logger, AgentState } from './types';

// Type alias for backwards compatibility
type ImprovementSuggestion = Improvement;
import type { LLMProvider } from '../llm/provider';

/**
 * 反思配置
 */
export interface ReflectiveConfig extends AgentConfig {
  reflection: {
    enabled: true;
    depth: number;
    triggers: ReflectionTrigger[];
    autoImprove: boolean;
  };
}

/**
 * 反思触发器类型
 */
export type ReflectionTrigger = 
  | 'on_error'
  | 'on_success'
  | 'on_completion'
  | 'periodic'
  | 'manual';

/**
 * 反思Agent
 * 
 * 特点：
 * - 自动反思执行过程
 * - 识别改进机会
 * - 持续学习和优化
 * - 自我修正能力
 */
export class ReflectiveAgent extends SDKWorkAgent {
  private reflectionHistory: Reflection[] = [];
  private improvements: Map<string, ImprovementSuggestion[]> = new Map();
  private learningEnabled: boolean;

  constructor(config: ReflectiveConfig) {
    super({
      ...config,
      planning: {
        strategy: 'react',
        depth: config.reflection.depth,
      },
    } as AgentConfig);

    this.learningEnabled = config.reflection.autoImprove;
  }

  /**
   * 执行并反思
   * 
   * 流程：
   * 1. 执行原始任务
   * 2. 触发反思
   * 3. 生成改进建议
   * 4. 应用改进（如果启用学习）
   */
  async executeWithReflection(
    input: string,
    context?: Record<string, unknown>
  ): Promise<ExecutionResult & { reflection: Reflection }> {
    // 1. 执行原始任务
    const result = await this.execute(input, context);

    // 2. 触发反思
    const config = this.config as ReflectiveConfig;
    const shouldReflect = this.shouldReflectOnResult(result, config.reflection?.triggers || []);

    let reflection: Reflection;
    if (shouldReflect) {
      reflection = await this.reflectAtLevel(result, 1);
    } else {
      reflection = this.createEmptyReflection();
    }

    // 3. 保存反思
    this.reflectionHistory.push(reflection);

    // 4. 应用改进（如果启用）
    if (this.learningEnabled && reflection.improvements.length > 0) {
      await this.applyImprovements(reflection.improvements);
    }

    return {
      ...result,
      reflection,
    };
  }

  /**
   * 执行深度反思
   * 
   * 多层反思：
   * - Level 1: 执行结果反思
   * - Level 2: 过程反思
   * - Level 3: 策略反思
   * - Level 4+: 元反思
   */
  async deepReflect(result: ExecutionResult, depth?: number): Promise<Reflection> {
    const reflectionDepth = depth ?? (this.config as unknown as { capabilities?: { reflectionDepth?: number } }).capabilities?.reflectionDepth ?? 2;
    const reflections: Reflection[] = [];

    for (let level = 1; level <= reflectionDepth; level++) {
      const reflection = await this.reflectAtLevel(result, level);
      reflections.push(reflection);

      // 如果当前层没有洞察，停止深入
      if (reflection.insights.length === 0) break;
    }

    // 合并多层反思结果
    return this.mergeReflections(reflections);
  }

  /**
   * 特定层级反思
   */
  private async reflectAtLevel(result: ExecutionResult, level: number): Promise<Reflection> {
    const prompts: Record<number, string> = {
      1: `Analyze the execution result. What went well? What could be improved?`,
      2: `Analyze the execution process. Were the steps optimal? Any inefficiencies?`,
      3: `Analyze the strategy used. Was it appropriate? Better alternatives?`,
      4: `Reflect on the reflection process itself. Are we asking the right questions?`,
    };

    const prompt = prompts[level] || prompts[4];

    // 构建反思提示
    const reflectionPrompt = this.buildReflectionPrompt(result, prompt, level);

    try {
      // 调用LLM进行反思
      const llmProvider = this.getLLMProvider();
      const llmResult = await llmProvider.complete({
        messages: [
          { role: 'system', content: 'You are a self-reflective AI agent. Analyze your performance honestly.' },
          { role: 'user', content: reflectionPrompt },
        ],
      });

      // 解析反思结果
      return this.parseReflectionResponse(llmResult.content, result.executionId);
    } catch (error) {
      return {
        success: false,
        executionId: result.executionId,
        insights: [],
        improvements: [],
        confidence: 0,
        timestamp: new Date(),
      };
    }
  }

  /**
   * 获取 LLM Provider
   */
  protected getLLMProvider(): LLMProvider {
    // Access LLM provider through the parent class config
    return (this as unknown as { config: { llmProvider: LLMProvider } }).config.llmProvider;
  }

  /**
   * 获取 Logger
   */
  protected getLogger(): Logger {
    // Access logger through the parent class
    return (this as unknown as { _logger: Logger })._logger;
  }

  /**
   * 获取 Agent State
   */
  protected getState(): AgentState {
    // Access state through the parent class
    return (this as unknown as { _state: AgentState })._state;
  }

  /**
   * 构建反思提示
   */
  private buildReflectionPrompt(result: ExecutionResult, prompt: string, level: number): string {
    const steps = result.steps || [];
    return `
Reflection Level: ${level}

Execution Result:
- Success: ${result.success}
- Duration: ${result.duration}ms
- Steps: ${steps.length}
${result.error ? `- Error: ${result.error}` : ''}

Execution Steps:
${steps.map(s => `- [${s.status}] ${s.type}: ${s.name}`).join('\n')}

${prompt}

Provide your reflection in this format:
INSIGHTS:
- Insight 1
- Insight 2

IMPROVEMENTS:
- [TYPE] Description (Priority: HIGH/MEDIUM/LOW)

CONFIDENCE: 0-100
`;
  }

  /**
   * 解析反思响应
   */
  private parseReflectionResponse(content: string, executionId: string): Reflection {
    const insights: string[] = [];
    const improvements: ImprovementSuggestion[] = [];
    let confidence = 50;

    // 解析洞察
    const insightsMatch = content.match(/INSIGHTS:\s*\n?((?:- .+\n?)+)/i);
    if (insightsMatch) {
      insights.push(...insightsMatch[1].split('\n').filter(l => l.trim().startsWith('-')).map(l => l.replace('-', '').trim()));
    }

    // 解析改进建议
    const improvementsMatch = content.match(/IMPROVEMENTS:\s*\n?((?:- .+\n?)+)/i);
    if (improvementsMatch) {
      const improvementLines = improvementsMatch[1].split('\n').filter(l => l.trim().startsWith('-'));
      for (const line of improvementLines) {
        const match = line.match(/-\s*\[?(\w+)\]?\s*(.+?)\s*\(Priority:\s*(\w+)\)/i);
        if (match) {
          improvements.push({
            type: match[1].toLowerCase() as 'prompt' | 'skill' | 'plan' | 'memory',
            description: match[2].trim(),
            priority: match[3].toLowerCase() as 'low' | 'medium' | 'high',
            impact: this.calculateImpact(match[3]),
            expectedImpact: this.calculateImpact(match[3]),
          });
        }
      }
    }

    // 解析置信度
    const confidenceMatch = content.match(/CONFIDENCE:\s*(\d+)/i);
    if (confidenceMatch) {
      confidence = parseInt(confidenceMatch[1], 10);
    }

    return {
      success: true,
      executionId,
      insights,
      improvements,
      confidence,
      timestamp: new Date(),
    };
  }

  /**
   * 计算改进影响
   */
  private calculateImpact(priority: string): number {
    const impactMap: Record<string, number> = {
      high: 0.8,
      medium: 0.5,
      low: 0.2,
    };
    return impactMap[priority.toLowerCase()] || 0.5;
  }

  /**
   * 判断是否应反思
   */
  private shouldReflectOnResult(result: ExecutionResult, triggers: ReflectionTrigger[]): boolean {
    if (triggers.includes('manual')) return false;
    if (triggers.includes('on_completion')) return true;
    if (triggers.includes('on_error') && !result.success) return true;
    if (triggers.includes('on_success') && result.success) return true;
    if (triggers.includes('periodic')) {
      // 每5次执行反思一次
      return this.getState().executionCount % 5 === 0;
    }
    return true;
  }

  /**
   * 合并多层反思
   */
  private mergeReflections(reflections: Reflection[]): Reflection {
    const allInsights = reflections.flatMap(r => r.insights);
    const allImprovements = reflections.flatMap(r => r.improvements);
    const avgConfidence = reflections.reduce((sum, r) => sum + r.confidence, 0) / reflections.length;

    // 去重改进建议
    const uniqueImprovements = this.deduplicateImprovements(allImprovements);

    return {
      success: reflections.every(r => r.success),
      executionId: reflections[0]?.executionId,
      insights: [...new Set(allInsights)],
      improvements: uniqueImprovements,
      confidence: Math.round(avgConfidence),
      timestamp: new Date(),
    };
  }

  /**
   * 去重改进建议
   */
  private deduplicateImprovements(improvements: ImprovementSuggestion[]): ImprovementSuggestion[] {
    const seen = new Set<string>();
    return improvements.filter(i => {
      const key = `${i.type}:${i.description}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  /**
   * 应用改进
   */
  private async applyImprovements(improvements: ImprovementSuggestion[]): Promise<void> {
    for (const improvement of improvements) {
      if (improvement.priority === 'high') {
        await this.applyHighPriorityImprovement(improvement);
      }
      
      // 保存所有改进
      const key = `${Date.now()}`;
      const existing = this.improvements.get(key) || [];
      existing.push(improvement);
      this.improvements.set(key, existing);
    }
  }

  /**
   * 应用高优先级改进
   */
  private async applyHighPriorityImprovement(improvement: ImprovementSuggestion): Promise<void> {
    switch (improvement.type) {
      case 'prompt':
        // 更新系统提示词
        break;
      case 'skill':
        // 优化技能调用方式
        break;
      case 'plan':
        // 调整规划策略
        break;
      case 'memory':
        // 优化记忆检索
        break;
    }
  }

  /**
   * 创建空反思
   */
  private createEmptyReflection(): Reflection {
    return {
      success: true,
      insights: [],
      improvements: [],
      confidence: 100,
      timestamp: new Date(),
    };
  }

  /**
   * 获取反思历史
   */
  getReflectionHistory(): Reflection[] {
    return [...this.reflectionHistory];
  }

  /**
   * 获取所有改进建议
   */
  getAllImprovements(): ImprovementSuggestion[] {
    return Array.from(this.improvements.values()).flat();
  }

  /**
   * 获取高优先级改进
   */
  getHighPriorityImprovements(): ImprovementSuggestion[] {
    return this.getAllImprovements().filter(i => i.priority === 'high');
  }

  /**
   * 手动触发反思
   */
  async triggerManualReflection(result: ExecutionResult): Promise<Reflection> {
    const reflectionDepth = (this.config as unknown as { capabilities?: { reflectionDepth?: number } }).capabilities?.reflectionDepth ?? 2;
    const reflection = await this.deepReflect(result, reflectionDepth);
    this.reflectionHistory.push(reflection);
    return reflection;
  }
}

export default ReflectiveAgent;
