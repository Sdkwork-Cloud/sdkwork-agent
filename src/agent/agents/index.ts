/**
 * SDKWork Agents - 智能体集合
 *
 * 架构设计：
 * 1. 通用基础智能体 - AssistantAgent
 * 2. 专有智能体 - TaskAgent, SkillAgent
 * 3. 所有智能体继承自 BaseAgent
 * 4. 遵循 Agent Architecture Standard
 *
 * 通用能力（所有智能体都支持）：
 * - conversation: 对话能力
 * - memory: 记忆能力
 * - reasoning: 推理能力
 * - context: 上下文理解
 *
 * @module Agents
 * @version 1.0.0
 * @standard Agent Architecture Standard
 */

// ============================================================================
// 通用基础智能体
// ============================================================================

export {
  AssistantAgent,
  createAssistantAgent,
} from './assistant-agent.js';
export type {
  AssistantAgentConfig,
  ConversationHistory,
} from './assistant-agent.js';

// ============================================================================
// 专有智能体 - 任务执行
// ============================================================================

export {
  TaskAgent,
  createTaskAgent,
} from './task-agent.js';
export type {
  TaskAgentConfig,
  TaskStep,
  TaskPlan,
} from './task-agent.js';

// ============================================================================
// 专有智能体 - 技能调用
// ============================================================================

export {
  SkillAgent,
  createSkillAgent,
} from './skill-agent.js';
export type {
  SkillAgentConfig,
  SkillInvocation,
} from './skill-agent.js';

// ============================================================================
// 智能体类型定义
// ============================================================================

/**
 * 智能体类型
 */
export type AgentType = 'assistant' | 'task' | 'skill';

/**
 * 智能体工厂函数类型
 */
export type AgentFactory<TConfig, TAgent> = (config: TConfig) => TAgent;

/**
 * 创建智能体配置
 */
export interface CreateAgentOptions {
  /** 智能体类型 */
  type: AgentType;
  /** 名称 */
  name?: string;
  /** 描述 */
  description?: string;
}
