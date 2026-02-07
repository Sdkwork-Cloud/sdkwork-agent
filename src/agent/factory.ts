/**
 * Agent Factory
 * 创建不同类型的Agent实例
 */

import { SDKWorkAgent } from './sdkwork-agent';
import type { AgentConfig, LLMConfig, PlanningConfig, MemoryConfig, ExecutionConfig } from './types';

/**
 * Agent配置预设
 */
export const AgentPresets = {
  /**
   * 基础Agent - 最小配置
   */
  basic: (llm: LLMConfig): Partial<AgentConfig> => ({
    name: 'BasicAgent',
    llm,
    skills: [],
    tools: [],
  }),

  /**
   * 智能Agent - 完整能力
   */
  smart: (llm: LLMConfig): Partial<AgentConfig> => ({
    name: 'SmartAgent',
    llm,
    skills: [],
    tools: [],
    planning: {
      strategy: 'react',
      maxDepth: 5,
      timeout: 60000,
    } as PlanningConfig,
    memory: {
      maxContextTokens: 8000,
      retrievalLimit: 10,
    } as MemoryConfig,
  }),

  /**
   * 工具Agent - 专注工具调用
   */
  tool: (llm: LLMConfig): Partial<AgentConfig> => ({
    name: 'ToolAgent',
    llm,
    tools: [],
    execution: {
      timeout: 60000,
      retries: 3,
    } as ExecutionConfig,
  }),

  /**
   * 反思Agent - 强反思能力
   */
  reflector: (llm: LLMConfig): Partial<AgentConfig> => ({
    name: 'ReflectiveAgent',
    llm,
    skills: [],
    tools: [],
    planning: {
      strategy: 'mcts',
      maxDepth: 7,
      timeout: 90000,
    } as PlanningConfig,
    memory: {
      maxContextTokens: 10000,
      retrievalLimit: 20,
    } as MemoryConfig,
  }),
} as const;

/**
 * Agent工厂
 */
export class AgentFactory {
  private llm: LLMConfig;

  constructor(llm: LLMConfig) {
    this.llm = llm;
  }

  /**
   * 使用预设创建Agent
   */
  createFromPreset(
    preset: keyof typeof AgentPresets,
    overrides?: Partial<AgentConfig>
  ): SDKWorkAgent {
    const presetConfig = AgentPresets[preset](this.llm);
    const config: AgentConfig = {
      ...presetConfig,
      ...overrides,
      llm: overrides?.llm || this.llm,
      name: (overrides?.name || presetConfig.name) as string,
    } as AgentConfig;

    return new SDKWorkAgent(config);
  }

  /**
   * 使用自定义配置创建Agent
   */
  create(config: AgentConfig): SDKWorkAgent {
    return new SDKWorkAgent({
      ...config,
      llm: config.llm || this.llm,
    });
  }

  /**
   * 创建基础Agent
   */
  createBasic(overrides?: Partial<AgentConfig>): SDKWorkAgent {
    return this.createFromPreset('basic', overrides);
  }

  /**
   * 创建智能Agent
   */
  createSmart(overrides?: Partial<AgentConfig>): SDKWorkAgent {
    return this.createFromPreset('smart', overrides);
  }

  /**
   * 创建工具Agent
   */
  createTool(overrides?: Partial<AgentConfig>): SDKWorkAgent {
    return this.createFromPreset('tool', overrides);
  }

  /**
   * 创建反思Agent
   */
  createReflector(overrides?: Partial<AgentConfig>): SDKWorkAgent {
    return this.createFromPreset('reflector', overrides);
  }
}

/**
 * 创建Agent工厂
 */
export function createAgent(llm: LLMConfig): AgentFactory {
  return new AgentFactory(llm);
}
