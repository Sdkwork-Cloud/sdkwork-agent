/**
 * Skill Decision Engine - Skill 决策引擎
 *
 * 智能决策何时以及如何调用 Skill
 *
 * @module SkillDecisionEngine
 * @version 5.0.0
 */

import type { SkillEntry, SkillContext, SkillResult } from './types.js';
import { ExecutionPool } from './executor.js';

// ============================================================================
// Types
// ============================================================================

export interface DecisionContext {
  /** 用户输入 */
  userInput: string;
  /** 对话历史 */
  conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }>;
  /** 当前可用的 Skills */
  availableSkills: SkillEntry[];
  /** 执行上下文 */
  executionContext: SkillContext;
}

export interface SkillDecision {
  /** 是否应该调用 Skill */
  shouldInvoke: boolean;
  /** 要调用的 Skills */
  skillsToInvoke: Array<{
    entry: SkillEntry;
    confidence: number;
    reason: string;
    params?: Record<string, unknown>;
  }>;
  /** 决策理由 */
  reasoning: string;
  /** 是否需要澄清 */
  needsClarification: boolean;
  /** 澄清问题 */
  clarificationQuestion?: string;
}

export interface ExecutionPlan {
  /** 执行步骤 */
  steps: Array<{
    skillId: string;
    skillName: string;
    params: Record<string, unknown>;
    dependsOn?: string[];
  }>;
  /** 是否可以并行 */
  parallelizable: boolean;
  /** 预估执行时间 */
  estimatedDuration: number;
}

export interface DecisionEngineConfig {
  /** 置信度阈值 */
  confidenceThreshold: number;
  /** 最大并行执行数 */
  maxParallelExecution: number;
  /** 是否启用自动参数提取 */
  enableAutoParams: boolean;
  /** 是否启用多 Skill 组合 */
  enableSkillComposition: boolean;
}

// ============================================================================
// Decision Engine
// ============================================================================

export class SkillDecisionEngine {
  private config: DecisionEngineConfig;
  private executionPool: ExecutionPool;

  constructor(
    config: Partial<DecisionEngineConfig> = {},
    executionPool?: ExecutionPool
  ) {
    this.config = {
      confidenceThreshold: 0.7,
      maxParallelExecution: 3,
      enableAutoParams: true,
      enableSkillComposition: true,
      ...config,
    };
    this.executionPool = executionPool || new ExecutionPool(5);
  }

  /**
   * 分析用户意图并决策
   */
  async analyzeAndDecide(context: DecisionContext): Promise<SkillDecision> {
    const { userInput, availableSkills, conversationHistory } = context;

    // 1. 意图分析
    const intent = this.analyzeIntent(userInput, conversationHistory);

    // 2. Skill 匹配
    const matches = this.matchSkills(intent, availableSkills);

    // 3. 置信度评估
    const evaluatedMatches = this.evaluateConfidence(matches, userInput);

    // 4. 过滤低置信度匹配
    const highConfidenceMatches = evaluatedMatches.filter(
      m => m.confidence >= this.config.confidenceThreshold
    );

    // 5. 决策
    if (highConfidenceMatches.length === 0) {
      return {
        shouldInvoke: false,
        skillsToInvoke: [],
        reasoning: 'No matching skill found with sufficient confidence',
        needsClarification: matches.length > 0,
        clarificationQuestion: this.generateClarificationQuestion(matches, userInput),
      };
    }

    // 6. 参数提取
    const skillsWithParams = this.config.enableAutoParams
      ? await this.extractParameters(highConfidenceMatches, userInput)
      : highConfidenceMatches.map(m => ({ ...m, params: {} }));

    // 7. 检查是否需要澄清
    const incompleteSkills = skillsWithParams.filter(
      s => !this.hasRequiredParams(s.entry, s.params)
    );

    if (incompleteSkills.length > 0) {
      return {
        shouldInvoke: false,
        skillsToInvoke: skillsWithParams,
        reasoning: 'Missing required parameters',
        needsClarification: true,
        clarificationQuestion: this.generateParameterClarification(incompleteSkills),
      };
    }

    return {
      shouldInvoke: true,
      skillsToInvoke: skillsWithParams,
      reasoning: this.generateReasoning(skillsWithParams),
      needsClarification: false,
    };
  }

  /**
   * 生成执行计划
   */
  generateExecutionPlan(decision: SkillDecision): ExecutionPlan {
    if (!decision.shouldInvoke || decision.skillsToInvoke.length === 0) {
      return {
        steps: [],
        parallelizable: false,
        estimatedDuration: 0,
      };
    }

    const steps = decision.skillsToInvoke.map((skill, index) => ({
      skillId: skill.entry.skill.id,
      skillName: skill.entry.skill.name,
      params: skill.params || {},
      dependsOn: index > 0 ? [decision.skillsToInvoke[index - 1].entry.skill.id] : undefined,
    }));

    // 检查是否可以并行执行
    const parallelizable =
      this.config.enableSkillComposition &&
      steps.length > 1 &&
      steps.every(s => !s.dependsOn);

    // 估算执行时间（简化实现）
    const estimatedDuration = steps.length * 2000; // 假设每个 Skill 2秒

    return {
      steps,
      parallelizable,
      estimatedDuration,
    };
  }

  /**
   * 执行决策
   */
  async executeDecision(
    decision: SkillDecision,
    context: SkillContext
  ): Promise<SkillResult[]> {
    if (!decision.shouldInvoke) {
      return [];
    }

    const plan = this.generateExecutionPlan(decision);
    const results: SkillResult[] = [];

    if (plan.parallelizable && plan.steps.length > 1) {
      // 并行执行
      const executions = plan.steps.map(step =>
        this.executeSkillStep(step, context)
      );
      results.push(...(await Promise.all(executions)));
    } else {
      // 串行执行
      for (const step of plan.steps) {
        const result = await this.executeSkillStep(step, context);
        results.push(result);

        // 如果执行失败且不可恢复，停止后续执行
        if (!result.success && result.error && !result.error.recoverable) {
          break;
        }
      }
    }

    return results;
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  /**
   * 分析用户意图
   */
  private analyzeIntent(
    userInput: string,
    history: Array<{ role: 'user' | 'assistant'; content: string }>
  ): {
    action: string;
    target?: string;
    params: Record<string, string>;
  } {
    const lowerInput = userInput.toLowerCase();

    // 简单的意图识别（实际应该使用 NLP）
    const actionPatterns = [
      { pattern: /\b(create|make|new)\b/, action: 'create' },
      { pattern: /\b(read|get|show|list)\b/, action: 'read' },
      { pattern: /\b(update|edit|modify)\b/, action: 'update' },
      { pattern: /\b(delete|remove)\b/, action: 'delete' },
      { pattern: /\b(search|find)\b/, action: 'search' },
    ];

    let action = 'unknown';
    for (const { pattern, action: act } of actionPatterns) {
      if (pattern.test(lowerInput)) {
        action = act;
        break;
      }
    }

    // 提取潜在参数
    const params: Record<string, string> = {};
    const quotedStrings = userInput.match(/"([^"]*)"/g);
    if (quotedStrings) {
      params.query = quotedStrings[0].replace(/"/g, '');
    }

    return { action, params };
  }

  /**
   * 匹配 Skills
   */
  private matchSkills(
    intent: { action: string; target?: string; params: Record<string, string> },
    skills: SkillEntry[]
  ): SkillEntry[] {
    const matches: SkillEntry[] = [];

    for (const skill of skills) {
      const description = skill.skill.description.toLowerCase();
      const name = skill.skill.name.toLowerCase();
      const tags = skill.skill.metadata?.tags?.map(t => t.toLowerCase()) || [];

      // 检查是否匹配
      const actionMatch = description.includes(intent.action);
      const nameMatch = intent.target && name.includes(intent.target.toLowerCase());
      const tagMatch = tags.some(t => t.includes(intent.action));

      if (actionMatch || nameMatch || tagMatch) {
        matches.push(skill);
      }
    }

    return matches;
  }

  /**
   * 评估置信度
   */
  private evaluateConfidence(
    matches: SkillEntry[],
    userInput: string
  ): Array<{ entry: SkillEntry; confidence: number; reason: string }> {
    return matches.map(entry => {
      const description = entry.skill.description.toLowerCase();
      const input = userInput.toLowerCase();

      // 计算关键词匹配度
      const words = input.split(/\s+/);
      const matchCount = words.filter(w => description.includes(w)).length;
      const confidence = Math.min(0.95, matchCount / words.length + 0.3);

      return {
        entry,
        confidence,
        reason: `Keyword match: ${matchCount}/${words.length} words`,
      };
    });
  }

  /**
   * 提取参数
   */
  private async extractParameters(
    matches: Array<{ entry: SkillEntry; confidence: number; reason: string }>,
    userInput: string
  ): Promise<Array<{ entry: SkillEntry; confidence: number; reason: string; params?: Record<string, unknown> }>> {
    return matches.map(match => {
      const params: Record<string, unknown> = {};

      // 从引号字符串提取参数
      const quotedMatches = userInput.match(/"([^"]*)"/g);
      if (quotedMatches && quotedMatches.length > 0) {
        params.query = quotedMatches[0].replace(/"/g, '');
      }

      // 从等号表达式提取参数
      const keyValueMatches = userInput.match(/(\w+)=(\S+)/g);
      if (keyValueMatches) {
        for (const kv of keyValueMatches) {
          const [key, value] = kv.split('=');
          params[key] = value;
        }
      }

      return {
        ...match,
        params,
      };
    });
  }

  /**
   * 检查是否有必需参数
   */
  private hasRequiredParams(
    entry: SkillEntry,
    params?: Record<string, unknown>
  ): boolean {
    // 简化实现，实际应该检查 schema
    return true;
  }

  /**
   * 生成澄清问题
   */
  private generateClarificationQuestion(
    matches: SkillEntry[],
    userInput: string
  ): string | undefined {
    if (matches.length === 0) {
      return "I don't have a skill that can handle this request. Could you clarify what you'd like to do?";
    }

    const skillNames = matches.map(m => m.skill.name).join(', ');
    return `I found multiple skills that might help: ${skillNames}. Which one would you like to use?`;
  }

  /**
   * 生成参数澄清问题
   */
  private generateParameterClarification(
    skills: Array<{ entry: SkillEntry; params?: Record<string, unknown> }>
  ): string | undefined {
    const skillName = skills[0].entry.skill.name;
    return `To use the ${skillName} skill, I need more information. Could you provide the missing parameters?`;
  }

  /**
   * 生成决策理由
   */
  private generateReasoning(
    skills: Array<{ entry: SkillEntry; confidence: number; reason: string }>
  ): string {
    const names = skills.map(s => s.entry.skill.name).join(', ');
    return `Selected skills: ${names} based on user intent matching`;
  }

  /**
   * 执行单个 Skill 步骤
   */
  private async executeSkillStep(
    step: {
      skillId: string;
      skillName: string;
      params: Record<string, unknown>;
    },
    context: SkillContext
  ): Promise<SkillResult> {
    // 这里应该调用 SkillRegistry 执行
    // 简化实现
    return {
      success: false,
      error: {
        code: 'NOT_IMPLEMENTED',
        message: 'Skill execution not implemented in decision engine',
        skillId: step.skillId,
        recoverable: false,
      },
    };
  }
}

// ============================================================================
// Factory
// ============================================================================

export function createDecisionEngine(
  config?: Partial<DecisionEngineConfig>,
  executionPool?: ExecutionPool
): SkillDecisionEngine {
  return new SkillDecisionEngine(config, executionPool);
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * 快速决策
 */
export async function quickDecide(
  userInput: string,
  availableSkills: SkillEntry[]
): Promise<SkillDecision> {
  const engine = new SkillDecisionEngine();
  return engine.analyzeAndDecide({
    userInput,
    availableSkills,
    conversationHistory: [],
    executionContext: {
      executionId: `quick-${Date.now()}`,
      agentId: 'quick-agent',
      input: userInput,
      logger: console as any,
      llm: {} as any,
      memory: {} as any,
      tools: {} as any,
    },
  });
}
