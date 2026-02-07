/**
 * Skill Agent - 技能调用智能体
 *
 * 专有智能体，专注于：
 * - 技能发现与选择
 * - 技能调用执行
 * - 技能结果处理
 * - 技能组合编排
 *
 * @module SkillAgent
 * @version 1.0.0
 * @standard Agent Architecture Standard
 */

import { BaseAgent, AgentConfig } from '../base-agent.js';
import type {
  AgentCapabilities,
  ExecutionResult,
  SkillDefinition,
} from '../types.js';
import type { LLMService } from '../../skills/core/types.js';

/**
 * 技能调用配置
 */
export interface SkillAgentConfig extends AgentConfig {
  /** LLM服务 */
  llm: LLMService;
  /** 可用技能列表 */
  skills: SkillDefinition[];
  /** 自动选择技能 */
  autoSelect?: boolean;
  /** 最大技能调用次数 */
  maxSkillCalls?: number;
}

/**
 * 技能调用记录
 */
export interface SkillInvocation {
  skillName: string;
  input: unknown;
  output?: unknown;
  success: boolean;
  error?: string;
}

/**
 * 技能智能体
 *
 * 专有智能体，用于处理需要调用技能的任务
 */
export class SkillAgent extends BaseAgent<SkillAgentConfig> {
  readonly type = 'skill';

  private llm: LLMService;
  private skills: Map<string, SkillDefinition> = new Map();
  private invocationHistory: SkillInvocation[] = [];

  constructor(config: SkillAgentConfig) {
    super(config);
    this.llm = config.llm;

    // 注册技能
    for (const skill of config.skills) {
      this.skills.set(skill.name, skill);
    }
  }

  /**
   * 初始化能力
   */
  protected initCapabilities(): AgentCapabilities {
    return {
      canPlan: false,
      canReason: true,
      canUseTools: false,
      canUseSkills: true,
      hasMemory: true,
      canLearn: false,
      canReflect: false,
      canStream: false,
    };
  }

  /**
   * 初始化
   */
  protected async doInitialize(): Promise<void> {
    this.agentLogger.info(`[${this.id}] SkillAgent initialized with ${this.skills.size} skills`);
  }

  /**
   * 执行
   */
  protected async doExecute<T>(
    input: unknown,
    context: Record<string, unknown> | undefined,
    executionId: string
  ): Promise<ExecutionResult<T>> {
    const request = String(input);

    // 1. 选择技能
    let selectedSkills: string[];
    if (this.config.autoSelect !== false) {
      selectedSkills = await this.selectSkills(request);
    } else {
      selectedSkills = context?.skills as string[] || [];
    }

    if (selectedSkills.length === 0) {
      return {
        success: false,
        error: {
          code: 'NO_SKILL_SELECTED',
          message: 'No suitable skill found for the request',
          recoverable: false,
          name: 'SkillError',
        },
        executionId,
        duration: 0,
      };
    }

    // 2. 调用技能
    const results: unknown[] = [];
    const maxCalls = this.config.maxSkillCalls ?? 5;

    for (let i = 0; i < selectedSkills.length && i < maxCalls; i++) {
      const skillName = selectedSkills[i];
      const skill = this.skills.get(skillName);

      if (!skill) {
        continue;
      }

      try {
        // 准备输入
        const skillInput = await this.prepareSkillInput(request, skill);

        // 执行技能
        const output = await this.executeSkill(skill, skillInput);

        // 记录调用
        this.invocationHistory.push({
          skillName,
          input: skillInput,
          output,
          success: true,
        });

        results.push(output);
      } catch (error) {
        this.invocationHistory.push({
          skillName,
          input: request,
          success: false,
          error: (error as Error).message,
        });
      }
    }

    // 3. 整合结果
    const finalOutput = await this.integrateResults(request, results);

    return {
      success: results.length > 0,
      output: finalOutput as T,
      executionId,
      duration: 0,
      steps: this.invocationHistory.slice(-selectedSkills.length).map((inv) => ({
        id: `skill-${inv.skillName}`,
        type: 'skill' as const,
        name: inv.skillName,
        description: `Invoke skill: ${inv.skillName}`,
        status: inv.success ? 'completed' : 'failed',
        input: inv.input,
        output: inv.output,
        error: inv.error ? { code: 'SKILL_ERROR', message: inv.error, recoverable: false, name: 'SkillError' } : undefined,
        startedAt: new Date(),
      })),
    };
  }

  /**
   * 选择技能
   */
  private async selectSkills(request: string): Promise<string[]> {
    const skillList = Array.from(this.skills.values())
      .map((s) => `- ${s.name}: ${s.description}`)
      .join('\n');

    const prompt = `Select the most appropriate skills for the following request:
Request: ${request}

Available skills:
${skillList}

Respond with a JSON array of skill names:
["skill1", "skill2"]`;

    try {
      const response = await this.llm.complete(prompt);
      const selected = JSON.parse(response);
      return Array.isArray(selected) ? selected : [];
    } catch {
      // 回退：基于关键词匹配
      return this.fallbackSkillSelection(request);
    }
  }

  /**
   * 回退技能选择
   */
  private fallbackSkillSelection(request: string): string[] {
    const requestLower = request.toLowerCase();
    const matches: string[] = [];

    for (const [name, skill] of this.skills) {
      const descriptionLower = skill.description?.toLowerCase() ?? '';
      const keywords = descriptionLower.split(' ');

      // 简单匹配：检查关键词是否在请求中
      const matchCount = keywords.filter((k) => requestLower.includes(k)).length;
      if (matchCount > 0) {
        matches.push(name);
      }
    }

    return matches.slice(0, 3);
  }

  /**
   * 准备技能输入
   */
  private async prepareSkillInput(request: string, skill: SkillDefinition): Promise<unknown> {
    const prompt = `Extract the relevant input for skill "${skill.name}" from the request:
Request: ${request}
Skill description: ${skill.description}

Provide the input as JSON.`;

    try {
      const response = await this.llm.complete(prompt);
      return JSON.parse(response);
    } catch {
      return { request };
    }
  }

  /**
   * 执行技能
   */
  private async executeSkill(skill: SkillDefinition, input: unknown): Promise<unknown> {
    if (skill.run) {
      // Return execution configuration and input
      return { skill: skill.run, input };
    }

    // 如果没有runner，使用LLM模拟
    const prompt = `Execute skill "${skill.name}" with input:
${JSON.stringify(input)}

Skill description: ${skill.description}

Provide the output.`;

    return this.llm.complete(prompt);
  }

  /**
   * 整合结果
   */
  private async integrateResults(request: string, results: unknown[]): Promise<unknown> {
    if (results.length === 0) {
      return null;
    }

    if (results.length === 1) {
      return results[0];
    }

    const prompt = `Integrate the following results into a coherent response:
Request: ${request}
Results: ${JSON.stringify(results)}

Provide the integrated output.`;

    return this.llm.complete(prompt);
  }

  /**
   * 销毁
   */
  protected async doDestroy(): Promise<void> {
    this.skills.clear();
    this.invocationHistory = [];
    this.agentLogger.info(`[${this.id}] SkillAgent destroyed`);
  }

  /**
   * 添加技能
   */
  addSkill(skill: SkillDefinition): void {
    this.skills.set(skill.name, skill);
    this.agentLogger.debug(`[${this.id}] Skill added: ${skill.name}`);
  }

  /**
   * 移除技能
   */
  removeSkill(name: string): boolean {
    const removed = this.skills.delete(name);
    if (removed) {
      this.agentLogger.debug(`[${this.id}] Skill removed: ${name}`);
    }
    return removed;
  }

  /**
   * 获取技能列表
   */
  getSkills(): SkillDefinition[] {
    return Array.from(this.skills.values());
  }
}

/**
 * 创建技能智能体
 */
export function createSkillAgent(
  llm: LLMService,
  skills: SkillDefinition[],
  config?: Omit<SkillAgentConfig, 'llm' | 'skills'>
): SkillAgent {
  return new SkillAgent({
    identity: { name: 'Skill', description: '技能调用智能体', version: '1.0.0', id: 'skill' },
    llm,
    skills,
    ...config,
  });
}
