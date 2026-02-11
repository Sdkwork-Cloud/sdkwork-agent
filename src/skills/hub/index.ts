/**
 * Skill Hub Module
 *
 * 技能中心模块 - 统一导出所有技能管理组件
 *
 * @module SkillHub
 * @version 3.0.0
 */

// ============================================================================
// Skill Hub
// ============================================================================
export {
  SkillHub,
  createSkillHub,
} from './skill-hub.js';
export type {
  SkillHubConfig,
  SkillPackage,
  SearchOptions,
  SearchResult,
  InstallOptions,
  InstallResult,
} from './skill-hub.js';

// ============================================================================
// Dynamic Loader
// ============================================================================
export {
  DynamicSkillLoader,
  createDynamicLoader,
} from './dynamic-loader.js';
export type {
  DynamicLoaderConfig,
  LoadedSkillEntry,
  DisclosureLevel,
  PreloadPrediction,
} from './dynamic-loader.js';

// ============================================================================
// Plugin System
// ============================================================================
export {
  SkillPluginSystem,
  createPluginSystem,
} from './plugin-system';
export type {
  PluginManifest,
  PluginInstance,
  PluginContext,
  PluginSystemConfig,
  PluginEvent,
} from './plugin-system';

// ============================================================================
// Unified Skill Manager
// ============================================================================

import { EventEmitter } from '../../utils/event-emitter.js';
import { Logger } from '../core/types.js';
import { SkillHub, createSkillHub, SkillHubConfig } from './skill-hub.js';
import { DynamicSkillLoader, createDynamicLoader, DynamicLoaderConfig } from './dynamic-loader.js';
import { SkillPluginSystem, createPluginSystem, PluginSystemConfig } from './plugin-system';

/**
 * 统一技能管理器配置
 */
export interface UnifiedSkillManagerConfig {
  /** 工作区目录 */
  workspaceDir: string;
  /** Skill Hub 配置 */
  hubConfig?: Partial<SkillHubConfig>;
  /** 动态加载器配置 */
  loaderConfig?: Partial<DynamicLoaderConfig>;
  /** 插件系统配置 */
  pluginConfig?: Partial<PluginSystemConfig>;
  /** 日志器 */
  logger?: Logger;
}

/**
 * 统一技能管理器
 *
 * 整合 Skill Hub、动态加载器和插件系统
 */
export class UnifiedSkillManager extends EventEmitter {
  private config: Required<UnifiedSkillManagerConfig>;
  private managerLogger: Logger;

  /** Skill Hub */
  hub: SkillHub;
  /** 动态加载器 */
  loader: DynamicSkillLoader;
  /** 插件系统 */
  plugins: SkillPluginSystem;

  constructor(config: UnifiedSkillManagerConfig) {
    super();
    this.config = {
      logger: this.createDefaultLogger(),
      hubConfig: {},
      loaderConfig: {},
      pluginConfig: {},
      ...config,
    };
    this.managerLogger = this.config.logger;

    // 初始化组件
    this.hub = createSkillHub({
      name: 'default-hub',
      type: 'hybrid',
      storagePath: `${config.workspaceDir}/.sdkwork/hub`,
      logger: this.managerLogger,
      ...this.config.hubConfig,
    });

    this.loader = createDynamicLoader({
      workspaceDir: config.workspaceDir,
      logger: this.managerLogger,
      ...this.config.loaderConfig,
    });

    this.plugins = createPluginSystem({
      pluginsDir: `${config.workspaceDir}/.sdkwork/plugins`,
      logger: this.managerLogger,
      ...this.config.pluginConfig,
    });
  }

  /**
   * 初始化
   */
  async initialize(): Promise<void> {
    this.managerLogger.info('Initializing unified skill manager');

    await Promise.all([
      this.hub.initialize(),
      this.plugins.initialize(),
    ]);

    this.emit('manager:initialized', undefined);
  }

  /**
   * 关闭
   */
  async shutdown(): Promise<void> {
    this.managerLogger.info('Shutting down unified skill manager');

    await Promise.all([
      this.hub.shutdown?.(),
      this.plugins.shutdown(),
    ]);

    this.emit('manager:shutdown', undefined);
  }

  private createDefaultLogger(): Logger {
    return {
      debug: () => {},
      info: console.info,
      warn: console.warn,
      error: console.error,
    };
  }
}

/**
 * 创建统一技能管理器
 */
export function createSkillManager(config: UnifiedSkillManagerConfig): UnifiedSkillManager {
  return new UnifiedSkillManager(config);
}
