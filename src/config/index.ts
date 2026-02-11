/**
 * Config Module - 配置管理模块
 *
 * 提供完整的模型配置管理功能
 *
 * @module Config
 * @version 2.0.0
 */

// 框架配置
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

// 模型配置
export {
  PREDEFINED_PROVIDERS,
  getSupportedProviders,
  getProviderConfig,
  getModelDefinition,
  getProviderModels,
  getDefaultModel,
  validateModelConfig,
  toLLMConfig,
} from './model-config.js';

export type {
  ModelProvider,
  ModelDefinition,
  ProviderConfig,
  UserModelConfig,
} from './model-config.js';

// 配置管理器
export {
  ConfigManager,
  getConfigManager,
  resetConfigManager,
} from './config-manager.js';
