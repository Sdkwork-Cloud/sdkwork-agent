/**
 * Dynamic Skill Selector
 *
 * 动态技能选择器 - 在Agent自我思考过程中智能选择技能
 *
 * 核心特性：
 * - 基于用户输入和上下文选择最合适的技能
 * - 使用LLM进行智能匹配
 * - 支持预加载推荐技能
 * - 置信度评估和理由说明
 *
 * @module DynamicSkillSelector
 * @version 1.0.0
 */

import { EventEmitter } from '../../utils/event-emitter.js';
import {
  SkillEntry,
  SkillSelectionContext,
  SkillSelectionResult,
  IDynamicSkillSelector,
  SkillSystemEvent,
} from './openclaw-types.js';
import { Logger } from './types.js';

/**
 * 动态选择器配置
 */
export interface DynamicSelectorConfig {
  /** 置信度阈值 */
  confidenceThreshold?: number;
  /** 最大选择技能数 */
  maxSelectedSkills?: number;
  /** 日志器 */
  logger?: Logger;
  /** 启用预加载 */
  enablePreload?: boolean;
  /** 预加载阈值 */
  preloadThreshold?: number;
}

/**
 * 技能匹配分数
 */
interface SkillMatchScore {
  skillName: string;
  score: number;
  reasons: string[];
}

/**
 * 动态技能选择器
 *
 * 实现Agent自我思考过程中的技能动态决策：
 * 1. 分析用户输入和上下文
 * 2. 计算技能匹配分数
 * 3. 使用LLM进行智能选择
 * 4. 返回选择结果和置信度
 */
export class DynamicSkillSelector extends EventEmitter implements IDynamicSkillSelector {
  private config: Required<DynamicSelectorConfig>;
  private skillEmbeddings: Map<string, number[]> = new Map();

  constructor(config: DynamicSelectorConfig = {}) {
    super();
    this.config = {
      confidenceThreshold: 0.6,
      maxSelectedSkills: 3,
      logger: this.createDefaultLogger(),
      enablePreload: true,
      preloadThreshold: 0.7,
      ...config,
    };
  }

  /**
   * 选择适合当前上下文的技能
   *
   * 这是核心方法，实现智能技能选择：
   * 1. 构建选择提示词
   * 2. 调用LLM进行分析
   * 3. 解析选择结果
   * 4. 计算置信度
   */
  async select(context: SkillSelectionContext): Promise<SkillSelectionResult> {
    const selectStartTime = Date.now();
    this.config.logger.debug('Starting dynamic skill selection');

    // 1. 快速预筛选
    const prefilteredSkills = this.prefilterSkills(context);

    if (prefilteredSkills.length === 0) {
      return {
        selectedSkills: [],
        confidence: 0,
        reasoning: 'No skills available for the current context',
        shouldLoad: false,
      };
    }

    // 2. 计算匹配分数
    const matchScores = this.calculateMatchScores(context, prefilteredSkills);

    // 3. 使用LLM进行深度分析
    const llmResult = await this.analyzeWithLLM(context, matchScores);

    // 4. 合并结果并排序
    const finalSelection = this.mergeResults(matchScores, llmResult);

    // 5. 计算整体置信度
    const confidence = this.calculateOverallConfidence(finalSelection);

    // 6. 确定是否需要加载
    const shouldLoad = confidence >= this.config.confidenceThreshold;

    const selectedSkillNames = finalSelection
      .slice(0, this.config.maxSelectedSkills)
      .map(s => s.skillName);

    const duration = Date.now() - selectStartTime;
    this.config.logger.info(
      `Selected ${selectedSkillNames.length} skills with confidence ${confidence.toFixed(2)} in ${duration}ms`
    );

    // 触发事件
    this.emit('skill:selected' as SkillSystemEvent['type'], {
      type: 'skill:selected',
      skillNames: selectedSkillNames,
      confidence,
    });

    return {
      selectedSkills: selectedSkillNames,
      confidence,
      reasoning: this.generateReasoning(finalSelection),
      shouldLoad,
    };
  }

  /**
   * 预加载推荐技能
   *
   * 基于部分上下文预加载可能需要的技能
   */
  async preloadRecommended(
    context: Partial<SkillSelectionContext>
  ): Promise<string[]> {
    if (!this.config.enablePreload) {
      return [];
    }

    const { userInput, availableSkills } = context;

    if (!userInput || !availableSkills || availableSkills.length === 0) {
      return [];
    }

    // 计算匹配分数
    const scores = this.calculateMatchScores(
      context as SkillSelectionContext,
      availableSkills
    );

    // 选择超过阈值的技能
    const recommended = scores
      .filter(s => s.score >= this.config.preloadThreshold)
      .sort((a, b) => b.score - a.score)
      .slice(0, this.config.maxSelectedSkills)
      .map(s => s.skillName);

    this.config.logger.debug(`Preloading ${recommended.length} recommended skills`);

    return recommended;
  }

  /**
   * 预筛选技能
   *
   * 基于简单规则快速筛选
   */
  private prefilterSkills(context: SkillSelectionContext): SkillEntry[] {
    const { userInput, availableSkills, currentTask } = context;
    const input = userInput.toLowerCase();
    const task = currentTask?.toLowerCase() || '';

    return availableSkills.filter(skill => {
      // 排除禁用模型调用的技能
      if (skill.invocation?.disableModelInvocation) {
        return false;
      }

      // 检查关键词匹配
      const nameMatch = input.includes(skill.name.toLowerCase());
      const descMatch = skill.description.toLowerCase().split(' ').some(word =>
        input.includes(word) || task.includes(word)
      );

      // 检查标签匹配
      const tags = skill.metadata?.os || [];
      const tagMatch = tags.some(tag => input.includes(tag.toLowerCase()));

      return nameMatch || descMatch || tagMatch;
    });
  }

  /**
   * 计算技能匹配分数
   *
   * 使用多种算法计算匹配度：
   * 1. 关键词匹配
   * 2. 语义相似度
   * 3. 历史使用模式
   */
  private calculateMatchScores(
    context: SkillSelectionContext,
    skills: SkillEntry[]
  ): SkillMatchScore[] {
    const { userInput, history } = context;
    const input = userInput.toLowerCase();
    const inputWords = input.split(/\s+/);

    const scores: SkillMatchScore[] = [];

    for (const skill of skills) {
      const reasons: string[] = [];
      let score = 0;

      // 1. 名称匹配 (高权重)
      const nameWords = skill.name.toLowerCase().split('-');
      const nameMatches = nameWords.filter(word => inputWords.includes(word)).length;
      if (nameMatches > 0) {
        score += nameMatches * 0.3;
        reasons.push(`Name match: ${nameMatches} words`);
      }

      // 2. 描述关键词匹配
      const descWords = skill.description.toLowerCase().split(/\s+/);
      const descMatches = descWords.filter(word =>
        inputWords.includes(word) && word.length > 3
      ).length;
      if (descMatches > 0) {
        score += Math.min(descMatches * 0.1, 0.3);
        reasons.push(`Description match: ${descMatches} keywords`);
      }

      // 3. 历史使用模式
      const recentUses = history.filter(
        h => h.role === 'assistant' && h.content.includes(skill.name)
      ).length;
      if (recentUses > 0) {
        score += Math.min(recentUses * 0.05, 0.15);
        reasons.push(`Recent usage: ${recentUses} times`);
      }

      // 4. 任务相关性
      if (context.currentTask) {
        const taskWords = context.currentTask.toLowerCase().split(/\s+/);
        const taskMatches = nameWords.filter(word => taskWords.includes(word)).length;
        if (taskMatches > 0) {
          score += taskMatches * 0.2;
          reasons.push(`Task relevance: ${taskMatches} words`);
        }
      }

      // 5. 元数据匹配
      if (skill.metadata?.os) {
        const osMatch = skill.metadata.os.some(os => input.includes(os.toLowerCase()));
        if (osMatch) {
          score += 0.1;
          reasons.push('OS compatibility match');
        }
      }

      scores.push({
        skillName: skill.name,
        score: Math.min(score, 1.0),
        reasons,
      });
    }

    // 按分数排序
    return scores.sort((a, b) => b.score - a.score);
  }

  /**
   * 使用LLM进行深度分析
   */
  private async analyzeWithLLM(
    context: SkillSelectionContext,
    matchScores: SkillMatchScore[]
  ): Promise<{ skillName: string; llmScore: number; reasoning: string }[]> {
    const { userInput, availableSkills, llm } = context;

    // 只取前10个候选技能
    const topCandidates = matchScores.slice(0, 10);
    const candidateSkills = availableSkills.filter(skill =>
      topCandidates.some(c => c.skillName === skill.name)
    );

    // 构建提示词
    const prompt = this.buildSelectionPrompt(userInput, candidateSkills);

    try {
      const response = await llm.complete(prompt, {
        temperature: 0.3,
        maxTokens: 500,
      });

      return this.parseLLMResponse(response);
    } catch (error) {
      this.config.logger.warn(`LLM analysis failed: ${(error as Error).message}`);
      return [];
    }
  }

  /**
   * 构建选择提示词
   */
  private buildSelectionPrompt(userInput: string, skills: SkillEntry[]): string {
    const lines: string[] = [
      'You are a skill selection assistant. Analyze the user input and select the most appropriate skills.',
      '',
      'User Input:',
      userInput,
      '',
      'Available Skills:',
    ];

    for (const skill of skills) {
      lines.push(`- ${skill.name}: ${skill.description}`);
    }

    lines.push('');
    lines.push('Instructions:');
    lines.push('1. Analyze the user input to understand the intent');
    lines.push('2. Select skills that best match the intent');
    lines.push('3. Provide a confidence score (0-1) for each selection');
    lines.push('4. Explain your reasoning briefly');
    lines.push('');
    lines.push('Respond in this format:');
    lines.push('SKILL: <skill_name>');
    lines.push('SCORE: <confidence_score>');
    lines.push('REASON: <brief_reasoning>');
    lines.push('---');

    return lines.join('\n');
  }

  /**
   * 解析LLM响应
   */
  private parseLLMResponse(response: string): { skillName: string; llmScore: number; reasoning: string }[] {
    const results: { skillName: string; llmScore: number; reasoning: string }[] = [];

    const blocks = response.split('---');

    for (const block of blocks) {
      const skillMatch = block.match(/SKILL:\s*(\S+)/);
      const scoreMatch = block.match(/SCORE:\s*(\d*\.?\d+)/);
      const reasonMatch = block.match(/REASON:\s*(.+)/);

      if (skillMatch && scoreMatch) {
        results.push({
          skillName: skillMatch[1].trim(),
          llmScore: parseFloat(scoreMatch[1]),
          reasoning: reasonMatch ? reasonMatch[1].trim() : '',
        });
      }
    }

    return results;
  }

  /**
   * 合并结果
   */
  private mergeResults(
    matchScores: SkillMatchScore[],
    llmResults: { skillName: string; llmScore: number; reasoning: string }[]
  ): SkillMatchScore[] {
    const merged = new Map<string, SkillMatchScore>();

    // 添加基础分数
    for (const score of matchScores) {
      merged.set(score.skillName, score);
    }

    // 合并LLM分数
    for (const llmResult of llmResults) {
      const existing = merged.get(llmResult.skillName);
      if (existing) {
        // 加权平均: 60% 基础分数 + 40% LLM分数
        existing.score = existing.score * 0.6 + llmResult.llmScore * 0.4;
        existing.reasons.push(`LLM analysis: ${llmResult.reasoning}`);
      } else {
        merged.set(llmResult.skillName, {
          skillName: llmResult.skillName,
          score: llmResult.llmScore * 0.4,
          reasons: [`LLM analysis: ${llmResult.reasoning}`],
        });
      }
    }

    return Array.from(merged.values()).sort((a, b) => b.score - a.score);
  }

  /**
   * 计算整体置信度
   */
  private calculateOverallConfidence(selection: SkillMatchScore[]): number {
    if (selection.length === 0) return 0;

    // 取前3个技能的平均分数
    const topSkills = selection.slice(0, 3);
    const avgScore = topSkills.reduce((sum, s) => sum + s.score, 0) / topSkills.length;

    // 如果有高置信度技能，提升整体置信度
    const hasHighConfidence = topSkills.some(s => s.score > 0.8);
    const boost = hasHighConfidence ? 0.1 : 0;

    return Math.min(avgScore + boost, 1.0);
  }

  /**
   * 生成选择理由
   */
  private generateReasoning(selection: SkillMatchScore[]): string {
    if (selection.length === 0) {
      return 'No skills selected';
    }

    const topSkill = selection[0];
    const reasons = topSkill.reasons.join('; ');

    return `Selected "${topSkill.skillName}" with score ${topSkill.score.toFixed(2)}: ${reasons}`;
  }

  /**
   * 更新技能嵌入向量
   */
  updateSkillEmbedding(skillName: string, embedding: number[]): void {
    this.skillEmbeddings.set(skillName, embedding);
  }

  /**
   * 获取技能嵌入向量
   */
  getSkillEmbedding(skillName: string): number[] | undefined {
    return this.skillEmbeddings.get(skillName);
  }

  /**
   * 创建默认日志器
   */
  private createDefaultLogger(): Logger {
    return {
      debug: () => {},
      info: () => {},
      warn: console.warn,
      error: console.error,
    };
  }
}

/**
 * 创建动态技能选择器
 */
export function createDynamicSelector(
  config?: DynamicSelectorConfig
): DynamicSkillSelector {
  return new DynamicSkillSelector(config);
}
