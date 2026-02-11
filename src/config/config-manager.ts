/**
 * Configuration Manager - 配置管理器
 * 
 * 管理用户模型配置的存储和加载
 * 
 * @module Config
 * @version 2.0.0
 */

import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import type {
  ModelProvider,
  UserModelConfig,
  ProviderConfig,
  ModelDefinition,
} from './model-config.js';
import {
  PREDEFINED_PROVIDERS,
  getProviderConfig,
  getModelDefinition,
  getProviderModels,
  getDefaultModel,
  validateModelConfig,
  toLLMConfig,
} from './model-config.js';

// 配置存储路径
const CONFIG_DIR = join(homedir(), '.sdkwork');
const CONFIG_FILE = join(CONFIG_DIR, 'config.json');

// 配置数据结构
interface ConfigData {
  version: string;
  defaultConfigId?: string;
  configs: UserModelConfig[];
  settings: {
    theme?: string;
    language?: string;
    autoSave?: boolean;
  };
}

// 默认配置
const DEFAULT_CONFIG: ConfigData = {
  version: '2.0.0',
  configs: [],
  settings: {
    theme: 'default',
    language: 'zh-CN',
    autoSave: true,
  },
};

/**
 * 配置管理器
 */
export class ConfigManager {
  private data: ConfigData;
  private loaded = false;

  constructor() {
    this.data = { ...DEFAULT_CONFIG };
    this.load();
  }

  /**
   * 加载配置
   */
  private load(): void {
    try {
      if (existsSync(CONFIG_FILE)) {
        const content = readFileSync(CONFIG_FILE, 'utf-8');
        const loaded = JSON.parse(content) as ConfigData;
        this.data = { ...DEFAULT_CONFIG, ...loaded };
        this.loaded = true;
      }
    } catch (error) {
      console.warn('Failed to load config:', error);
      this.data = { ...DEFAULT_CONFIG };
    }
  }

  /**
   * 保存配置
   */
  save(): void {
    try {
      if (!existsSync(CONFIG_DIR)) {
        mkdirSync(CONFIG_DIR, { recursive: true });
      }
      writeFileSync(CONFIG_FILE, JSON.stringify(this.data, null, 2), 'utf-8');
    } catch (error) {
      console.error('Failed to save config:', error);
    }
  }

  /**
   * 获取所有配置
   */
  getAllConfigs(): UserModelConfig[] {
    return [...this.data.configs];
  }

  /**
   * 获取默认配置
   */
  getDefaultConfig(): UserModelConfig | undefined {
    if (this.data.defaultConfigId) {
      return this.data.configs.find(c => c.id === this.data.defaultConfigId);
    }
    return this.data.configs[0];
  }

  /**
   * 根据 ID 获取配置
   */
  getConfig(id: string): UserModelConfig | undefined {
    return this.data.configs.find(c => c.id === id);
  }

  /**
   * 添加配置
   */
  addConfig(config: Omit<UserModelConfig, 'id' | 'createdAt' | 'updatedAt'>): UserModelConfig {
    const newConfig: UserModelConfig = {
      ...config,
      id: this.generateId(),
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    // 验证配置
    const validation = validateModelConfig(newConfig);
    if (!validation.valid) {
      throw new Error(`Invalid config: ${validation.errors.join(', ')}`);
    }

    this.data.configs.push(newConfig);

    // 如果是第一个配置，设为默认
    if (this.data.configs.length === 1 || newConfig.isDefault) {
      this.setDefaultConfig(newConfig.id);
    }

    if (this.data.settings.autoSave !== false) {
      this.save();
    }

    return newConfig;
  }

  /**
   * 更新配置
   */
  updateConfig(id: string, updates: Partial<UserModelConfig>): UserModelConfig | undefined {
    const index = this.data.configs.findIndex(c => c.id === id);
    if (index === -1) return undefined;

    const updated = {
      ...this.data.configs[index],
      ...updates,
      updatedAt: Date.now(),
    };

    // 验证配置
    const validation = validateModelConfig(updated);
    if (!validation.valid) {
      throw new Error(`Invalid config: ${validation.errors.join(', ')}`);
    }

    this.data.configs[index] = updated;

    if (this.data.settings.autoSave !== false) {
      this.save();
    }

    return updated;
  }

  /**
   * 删除配置
   */
  deleteConfig(id: string): boolean {
    const index = this.data.configs.findIndex(c => c.id === id);
    if (index === -1) return false;

    this.data.configs.splice(index, 1);

    // 如果删除的是默认配置，重新设置默认
    if (this.data.defaultConfigId === id) {
      this.data.defaultConfigId = this.data.configs[0]?.id;
    }

    if (this.data.settings.autoSave !== false) {
      this.save();
    }

    return true;
  }

  /**
   * 设置默认配置
   */
  setDefaultConfig(id: string): boolean {
    const config = this.data.configs.find(c => c.id === id);
    if (!config) return false;

    // 清除其他配置的默认标记
    this.data.configs.forEach(c => {
      c.isDefault = false;
    });

    // 设置新的默认配置
    config.isDefault = true;
    this.data.defaultConfigId = id;

    if (this.data.settings.autoSave !== false) {
      this.save();
    }

    return true;
  }

  /**
   * 获取提供商配置
   */
  getProviderConfig(provider: ModelProvider): ProviderConfig {
    return getProviderConfig(provider);
  }

  /**
   * 获取所有支持的提供商
   */
  getSupportedProviders(): ModelProvider[] {
    return Object.keys(PREDEFINED_PROVIDERS) as ModelProvider[];
  }

  /**
   * 获取提供商的所有模型
   */
  getProviderModels(provider: ModelProvider): ModelDefinition[] {
    return getProviderModels(provider);
  }

  /**
   * 获取模型定义
   */
  getModelDefinition(provider: ModelProvider, modelId: string): ModelDefinition | undefined {
    return getModelDefinition(provider, modelId);
  }

  /**
   * 获取默认模型
   */
  getDefaultModel(provider: ModelProvider): ModelDefinition {
    return getDefaultModel(provider);
  }

  /**
   * 转换为 LLM 配置
   */
  toLLMConfig(configId?: string): ReturnType<typeof toLLMConfig> | undefined {
    const config = configId ? this.getConfig(configId) : this.getDefaultConfig();
    if (!config) return undefined;
    return toLLMConfig(config);
  }

  /**
   * 获取设置
   */
  getSettings(): ConfigData['settings'] {
    return { ...this.data.settings };
  }

  /**
   * 更新设置
   */
  updateSettings(settings: Partial<ConfigData['settings']>): void {
    this.data.settings = { ...this.data.settings, ...settings };
    if (this.data.settings.autoSave !== false) {
      this.save();
    }
  }

  /**
   * 生成唯一 ID
   */
  private generateId(): string {
    return `config_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// 单例实例
let instance: ConfigManager | null = null;

/**
 * 获取配置管理器实例
 */
export function getConfigManager(): ConfigManager {
  if (!instance) {
    instance = new ConfigManager();
  }
  return instance;
}

/**
 * 重置配置管理器实例（用于测试）
 */
export function resetConfigManager(): void {
  instance = null;
}

export default ConfigManager;
