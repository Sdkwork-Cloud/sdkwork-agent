/**
 * Skill Prompt Builder - Skill Prompt 构建器
 *
 * 基于 OpenClaw 渐进式披露策略构建高效 Prompt
 *
 * @module SkillPromptBuilder
 * @version 5.0.0
 */

import type { SkillEntry, SkillSnapshot, OpenClawSkillMetadata } from './types.js';

// ============================================================================
// Types
// ============================================================================

export interface PromptBuildOptions {
  /** 包含详细文档 */
  includeDetails?: boolean;
  /** 包含使用示例 */
  includeExamples?: boolean;
  /** 包含依赖信息 */
  includeDependencies?: boolean;
  /** 最大 token 估算 */
  maxTokens?: number;
  /** 优先级过滤 */
  minPriority?: number;
  /** 只包含可调用的 Skill */
  invocableOnly?: boolean;
}

export interface BuiltPrompt {
  /** 系统 Prompt */
  system: string;
  /** 可用 Skill 列表 */
  skills: SkillEntry[];
  /** 估算的 token 数 */
  estimatedTokens: number;
  /** 版本号 */
  version: number;
}

export interface SkillContextPrompt {
  /** Skill 标识 */
  identifier: string;
  /** 描述 */
  description: string;
  /** 表情符号 */
  emoji?: string;
  /** 使用提示 */
  usage?: string;
  /** 参数说明 */
  parameters?: string;
}

// ============================================================================
// Prompt Builder
// ============================================================================

export class SkillPromptBuilder {
  private static readonly DEFAULT_MAX_TOKENS = 4000;
  private static readonly TOKEN_PER_CHAR = 0.25;

  /**
   * 构建 Skill 系统 Prompt
   *
   * 基于渐进式披露策略：
   * - 始终包含：name, description, emoji
   * - 按需包含：详细文档、使用示例、依赖信息
   */
  buildSystemPrompt(
    entries: SkillEntry[],
    options: PromptBuildOptions = {}
  ): BuiltPrompt {
    const {
      includeDetails = false,
      includeExamples = false,
      includeDependencies = false,
      maxTokens = SkillPromptBuilder.DEFAULT_MAX_TOKENS,
      invocableOnly = true,
    } = options;

    // 过滤可调用的 Skill
    let filteredEntries = invocableOnly
      ? entries.filter(e => e.invocation?.disableModelInvocation !== true)
      : entries;

    // 构建 Prompt 部分
    const sections: string[] = [];

    // 1. 头部说明
    sections.push(this.buildHeader());

    // 2. Skill 列表（渐进式披露）
    const skillList = this.buildSkillList(filteredEntries, {
      includeDetails,
      includeExamples,
      includeDependencies,
    });
    sections.push(skillList);

    // 3. 使用指南
    sections.push(this.buildUsageGuide());

    // 4. 响应格式
    sections.push(this.buildResponseFormat());

    const systemPrompt = sections.join('\n\n');
    const estimatedTokens = this.estimateTokens(systemPrompt);

    return {
      system: systemPrompt,
      skills: filteredEntries,
      estimatedTokens,
      version: Date.now(),
    };
  }

  /**
   * 构建轻量级 Prompt（仅元数据）
   *
   * 用于初始对话，token 效率高
   */
  buildLightweightPrompt(entries: SkillEntry[]): BuiltPrompt {
    return this.buildSystemPrompt(entries, {
      includeDetails: false,
      includeExamples: false,
      includeDependencies: false,
      invocableOnly: true,
    });
  }

  /**
   * 构建详细 Prompt（包含完整文档）
   *
   * 用于复杂任务或首次使用 Skill
   */
  buildDetailedPrompt(entries: SkillEntry[]): BuiltPrompt {
    return this.buildSystemPrompt(entries, {
      includeDetails: true,
      includeExamples: true,
      includeDependencies: true,
      invocableOnly: true,
    });
  }

  /**
   * 为特定 Skill 构建上下文增强 Prompt
   */
  buildSkillContextPrompt(entry: SkillEntry): SkillContextPrompt {
    const metadata = entry.metadata;
    const emoji = metadata?.emoji || '🔧';

    return {
      identifier: entry.skill.name,
      description: entry.skill.description,
      emoji,
      usage: this.buildSkillUsage(entry),
      parameters: this.buildParameterHelp(entry),
    };
  }

  /**
   * 构建 Skill 调用指令
   */
  buildInvocationPrompt(skillName: string, params: Record<string, unknown>): string {
    const paramStr = Object.entries(params)
      .map(([key, value]) => `${key}="${value}"`)
      .join(' ');

    return `<skill name="${skillName}"${paramStr ? ' ' + paramStr : ''} />`;
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  /**
   * 构建 Prompt 头部
   */
  private buildHeader(): string {
    return `You are an AI assistant with access to various skills. You can use these skills to help the user complete tasks.

When you need to use a skill, respond with a skill invocation in the following format:
<skill name="skill-name" param1="value1" param2="value2" />

Available skills:`;
  }

  /**
   * 构建 Skill 列表
   */
  private buildSkillList(
    entries: SkillEntry[],
    options: {
      includeDetails: boolean;
      includeExamples: boolean;
      includeDependencies: boolean;
    }
  ): string {
    const lines: string[] = [];

    for (const entry of entries) {
      const emoji = entry.metadata?.emoji || '🔧';
      const name = entry.skill.name;
      const description = entry.skill.description;

      // 基础信息（始终包含）
      lines.push(`${emoji} **${name}**: ${description}`);

      // 详细信息（按需包含）
      if (options.includeDetails) {
        const details = this.buildSkillDetails(entry);
        if (details) {
          lines.push(`   ${details}`);
        }
      }

      // 依赖信息（按需包含）
      if (options.includeDependencies && entry.metadata?.requires) {
        const deps = this.buildDependencyInfo(entry.metadata);
        if (deps) {
          lines.push(`   ${deps}`);
        }
      }

      // 空行分隔
      lines.push('');
    }

    return lines.join('\n');
  }

  /**
   * 构建 Skill 详细信息
   */
  private buildSkillDetails(entry: SkillEntry): string | null {
    const details: string[] = [];

    // 主页链接
    if (entry.metadata?.homepage) {
      details.push(`Homepage: ${entry.metadata.homepage}`);
    }

    // 环境变量要求
    if (entry.metadata?.requires?.env) {
      const envVars = entry.metadata.requires.env.join(', ');
      details.push(`Requires env: ${envVars}`);
    }

    return details.length > 0 ? `(${details.join('; ')})` : null;
  }

  /**
   * 构建依赖信息
   */
  private buildDependencyInfo(metadata: OpenClawSkillMetadata): string | null {
    const deps: string[] = [];

    if (metadata.requires?.bins) {
      deps.push(`bins: ${metadata.requires.bins.join(', ')}`);
    }

    if (metadata.requires?.env) {
      deps.push(`env: ${metadata.requires.env.join(', ')}`);
    }

    return deps.length > 0 ? `[Deps: ${deps.join('; ')}]` : null;
  }

  /**
   * 构建使用指南
   */
  private buildUsageGuide(): string {
    return `Usage Guidelines:
1. Analyze the user's request to determine which skill(s) are needed
2. If multiple skills are needed, invoke them in the correct order
3. Use the exact skill name as shown above
4. Provide all required parameters
5. Wait for the skill execution result before proceeding`;
  }

  /**
   * 构建响应格式说明
   */
  private buildResponseFormat(): string {
    return `Response Format:
- To invoke a skill: <skill name="skill-name" param="value" />
- To provide information: normal text response
- To ask for clarification: explain what information is needed`;
  }

  /**
   * 构建 Skill 使用说明
   */
  private buildSkillUsage(entry: SkillEntry): string {
    const parts: string[] = [];

    // 基础用法
    parts.push(`Use: <skill name="${entry.skill.name}" />`);

    // 参数说明
    if (entry.skill.inputSchema) {
      parts.push('Parameters: (see schema)');
    }

    return parts.join('\n');
  }

  /**
   * 构建参数帮助
   */
  private buildParameterHelp(entry: SkillEntry): string | undefined {
    // 简化实现，实际应该从 schema 生成
    return undefined;
  }

  /**
   * 估算 token 数
   */
  private estimateTokens(text: string): number {
    return Math.ceil(text.length * SkillPromptBuilder.TOKEN_PER_CHAR);
  }
}

// ============================================================================
// Factory
// ============================================================================

export function createPromptBuilder(): SkillPromptBuilder {
  return new SkillPromptBuilder();
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * 快速构建轻量级 Prompt
 */
export function buildLightweightSkillPrompt(entries: SkillEntry[]): BuiltPrompt {
  const builder = new SkillPromptBuilder();
  return builder.buildLightweightPrompt(entries);
}

/**
 * 快速构建详细 Prompt
 */
export function buildDetailedSkillPrompt(entries: SkillEntry[]): BuiltPrompt {
  const builder = new SkillPromptBuilder();
  return builder.buildDetailedPrompt(entries);
}

/**
 * 估算 Prompt token 数
 */
export function estimatePromptTokens(text: string): number {
  return Math.ceil(text.length * 0.25);
}
