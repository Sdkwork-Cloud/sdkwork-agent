/**
 * SDKWork Configuration Module
 *
 * 统一的配置管理系统，区分框架级配置和智能体级配置：
 *
 * 框架级配置 (FrameworkConfig):
 * - 全局框架设置
 * - 技能系统配置
 * - LLM 配置
 * - 安全配置
 * - 实验性功能
 *
 * 智能体级配置 (AgentRuntimeConfig):
 * - 智能体身份
 * - 智能体能力
 * - 执行限制
 *
 * @module Config
 * @version 3.0.0
 * @standard SDKWork Architecture Standard
 */

// ============================================================================
// Framework Configuration - 框架级配置
// ============================================================================
export {
  FrameworkConfigManager,
  getFrameworkConfigManager,
  setFrameworkConfigManager,
  loadFrameworkConfig,
  getFrameworkConfig,
} from './framework-config.js';
export type {
  FrameworkConfig,
  LoggingConfig,
  CompatibilityConfig,
  SkillSystemConfig,
  LLMConfig,
  LLMProviderConfig,
  MemoryConfig,
  SecurityConfig,
  ExperimentalConfig,
  FrameworkConfigManagerOptions,
} from './framework-config.js';
