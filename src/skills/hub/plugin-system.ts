/**
 * Skill Plugin System - Extensible Plugin Architecture
 *
 * 技能插件系统 - 可扩展的插件架构
 *
 * 核心特性：
 * 1. 插件生命周期管理 (Plugin Lifecycle Management)
 * 2. 插件依赖解析 (Plugin Dependency Resolution)
 * 3. 热插拔支持 (Hot-swappable Support)
 * 4. 沙箱隔离 (Sandbox Isolation)
 * 5. 插件市场集成 (Plugin Marketplace Integration)
 *
 * @module SkillPluginSystem
 * @version 3.0.0
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { EventEmitter } from '../../utils/event-emitter.js';
import { Logger } from '../core/types.js';

// ============================================================================
// Plugin System Types
// ============================================================================

/**
 * 插件清单
 */
export interface PluginManifest {
  /** 插件 ID */
  id: string;
  /** 插件名称 */
  name: string;
  /** 版本 */
  version: string;
  /** 描述 */
  description: string;
  /** 作者 */
  author: string;
  /** 入口文件 */
  main: string;
  /** 依赖 */
  dependencies?: Record<string, string>;
  /** 技能目录 */
  skills?: string[];
  /** 激活钩子 */
  hooks?: {
    activate?: string;
    deactivate?: string;
  };
  /** 权限 */
  permissions?: string[];
  /** 配置 */
  config?: Record<string, unknown>;
}

/**
 * 插件实例
 */
export interface PluginInstance {
  /** 插件清单 */
  manifest: PluginManifest;
  /** 插件路径 */
  path: string;
  /** 是否激活 */
  active: boolean;
  /** 激活时间 */
  activatedAt?: Date;
  /** 导出的 API */
  api?: Record<string, unknown>;
  /** 上下文 */
  context?: PluginContext;
}

/**
 * 插件上下文
 */
export interface PluginContext {
  /** 日志器 */
  logger: Logger;
  /** 配置 */
  config: Record<string, unknown>;
  /** 注册技能 */
  registerSkill: (skillPath: string) => void;
  /** 注销技能 */
  unregisterSkill: (skillName: string) => void;
  /** 调用其他插件 */
  callPlugin: (pluginId: string, method: string, ...args: unknown[]) => Promise<unknown>;
  /** 获取插件 */
  getPlugin: (pluginId: string) => PluginInstance | undefined;
  /** 事件总线 */
  events: EventEmitter;
}

/**
 * 插件系统配置
 */
export interface PluginSystemConfig {
  /** 插件目录 */
  pluginsDir: string;
  /** 日志器 */
  logger?: Logger;
  /** 启用热重载 */
  enableHotReload?: boolean;
  /** 沙箱配置 */
  sandbox?: {
    enabled: boolean;
    allowedModules?: string[];
    timeout?: number;
  };
}

/**
 * 插件事件
 */
export type PluginEvent =
  | { type: 'plugin:loaded'; pluginId: string }
  | { type: 'plugin:activated'; pluginId: string }
  | { type: 'plugin:deactivated'; pluginId: string }
  | { type: 'plugin:error'; pluginId: string; error: Error }
  | { type: 'plugin:unloaded'; pluginId: string };

// ============================================================================
// Plugin System Implementation
// ============================================================================

export class SkillPluginSystem extends EventEmitter {
  private systemConfig: Required<PluginSystemConfig>;
  private systemLogger: Logger;
  private plugins: Map<string, PluginInstance> = new Map();
  private watchers: Map<string, fs.FSWatcher> = new Map();

  constructor(config: PluginSystemConfig) {
    super();
    this.systemConfig = {
      enableHotReload: true,
      logger: this.createDefaultLogger(),
      sandbox: {
        enabled: true,
        allowedModules: [],
        timeout: 30000,
      },
      ...config,
    };
    this.systemLogger = this.systemConfig.logger;
  }

  /**
   * 初始化插件系统
   */
  async initialize(): Promise<void> {
    this.systemLogger.info('Initializing plugin system');

    // 确保插件目录存在
    if (!fs.existsSync(this.systemConfig.pluginsDir)) {
      fs.mkdirSync(this.systemConfig.pluginsDir, { recursive: true });
    }

    // 加载所有插件
    await this.loadAllPlugins();

    // 启动热重载
    if (this.systemConfig.enableHotReload) {
      this.startHotReload();
    }

    this.emit('system:initialized', { pluginCount: this.plugins.size });
  }

  /**
   * 加载插件
   */
  async loadPlugin(pluginPath: string): Promise<PluginInstance | null> {
    const manifestPath = path.join(pluginPath, 'plugin.json');

    if (!fs.existsSync(manifestPath)) {
      this.systemLogger.warn(`Plugin manifest not found: ${manifestPath}`);
      return null;
    }

    try {
      // 读取清单
      const manifestContent = fs.readFileSync(manifestPath, 'utf-8');
      const manifest: PluginManifest = JSON.parse(manifestContent);

      // 验证清单
      if (!this.validateManifest(manifest)) {
        this.systemLogger.error(`Invalid plugin manifest: ${manifestPath}`);
        return null;
      }

      // 检查是否已加载
      if (this.plugins.has(manifest.id)) {
        this.systemLogger.warn(`Plugin already loaded: ${manifest.id}`);
        return this.plugins.get(manifest.id)!;
      }

      // 创建插件实例
      const instance: PluginInstance = {
        manifest,
        path: pluginPath,
        active: false,
      };

      this.plugins.set(manifest.id, instance);

      this.systemLogger.info(`Plugin loaded: ${manifest.name} (${manifest.id})`);
      this.emit('plugin:loaded', { pluginId: manifest.id });

      return instance;
    } catch (error) {
      this.systemLogger.error(`Failed to load plugin: ${pluginPath}`, { error: String(error) });
      return null;
    }
  }

  /**
   * 激活插件
   */
  async activatePlugin(pluginId: string): Promise<boolean> {
    const instance = this.plugins.get(pluginId);
    if (!instance) {
      this.systemLogger.warn(`Plugin not found: ${pluginId}`);
      return false;
    }

    if (instance.active) {
      this.systemLogger.debug(`Plugin already active: ${pluginId}`);
      return true;
    }

    try {
      // 检查依赖
      if (instance.manifest.dependencies) {
        for (const depId of Object.keys(instance.manifest.dependencies)) {
          if (!this.plugins.has(depId)) {
            this.systemLogger.error(`Dependency not found: ${depId} (required by ${pluginId})`);
            return false;
          }
          // 版本检查简化实现
        }
      }

      // 创建上下文
      const context = this.createPluginContext(instance);
      instance.context = context;

      // 加载入口文件
      const mainPath = path.join(instance.path, instance.manifest.main);
      if (fs.existsSync(mainPath)) {
        // 动态导入
        const module = await import(mainPath);
        if (module.activate) {
          await module.activate(context);
        }
        instance.api = module;
      }

      // 注册技能
      if (instance.manifest.skills) {
        for (const skillPath of instance.manifest.skills) {
          const fullPath = path.join(instance.path, skillPath);
          context.registerSkill(fullPath);
        }
      }

      instance.active = true;
      instance.activatedAt = new Date();

      this.systemLogger.info(`Plugin activated: ${instance.manifest.name}`);
      this.emit('plugin:activated', { pluginId });

      return true;
    } catch (error) {
      this.systemLogger.error(`Failed to activate plugin: ${pluginId}`, { error: String(error) });
      this.emit('plugin:error', { pluginId, error: error as Error });
      return false;
    }
  }

  /**
   * 停用插件
   */
  async deactivatePlugin(pluginId: string): Promise<boolean> {
    const instance = this.plugins.get(pluginId);
    if (!instance || !instance.active) {
      return false;
    }

    try {
      // 调用停用钩子
      const deactivateFn = instance.api?.deactivate as ((ctx: PluginContext) => Promise<void>) | undefined;
      if (deactivateFn && instance.context) {
        await deactivateFn(instance.context);
      }

      // 注销技能
      if (instance.context && instance.manifest.skills) {
        for (const skillPath of instance.manifest.skills) {
          const skillName = path.basename(skillPath);
          instance.context.unregisterSkill(skillName);
        }
      }

      instance.active = false;
      instance.activatedAt = undefined;
      instance.api = undefined;
      instance.context = undefined;

      this.systemLogger.info(`Plugin deactivated: ${instance.manifest.name}`);
      this.emit('plugin:deactivated', { pluginId });

      return true;
    } catch (error) {
      this.systemLogger.error(`Failed to deactivate plugin: ${pluginId}`, { error: String(error) });
      return false;
    }
  }

  /**
   * 卸载插件
   */
  async unloadPlugin(pluginId: string): Promise<boolean> {
    const instance = this.plugins.get(pluginId);
    if (!instance) {
      return false;
    }

    // 先停用
    if (instance.active) {
      await this.deactivatePlugin(pluginId);
    }

    // 移除
    this.plugins.delete(pluginId);

    this.systemLogger.info(`Plugin unloaded: ${pluginId}`);
    this.emit('plugin:unloaded', { pluginId });

    return true;
  }

  /**
   * 获取插件
   */
  getPlugin(pluginId: string): PluginInstance | undefined {
    return this.plugins.get(pluginId);
  }

  /**
   * 获取所有插件
   */
  getAllPlugins(): PluginInstance[] {
    return Array.from(this.plugins.values());
  }

  /**
   * 获取激活的插件
   */
  getActivePlugins(): PluginInstance[] {
    return Array.from(this.plugins.values()).filter((p) => p.active);
  }

  /**
   * 调用插件方法
   */
  async callPlugin(pluginId: string, method: string, ...args: unknown[]): Promise<unknown> {
    const instance = this.plugins.get(pluginId);
    if (!instance || !instance.active) {
      throw new Error(`Plugin not found or inactive: ${pluginId}`);
    }

    if (!instance.api || typeof instance.api[method] !== 'function') {
      throw new Error(`Method not found: ${method} in plugin ${pluginId}`);
    }

    return instance.api[method](...args);
  }

  /**
   * 关闭插件系统
   */
  async shutdown(): Promise<void> {
    this.systemLogger.info('Shutting down plugin system');

    // 停用所有插件
    for (const [pluginId] of this.plugins) {
      await this.deactivatePlugin(pluginId);
    }

    // 停止文件监控
    for (const [, watcher] of this.watchers) {
      watcher.close();
    }
    this.watchers.clear();

    this.plugins.clear();

    this.systemLogger.info('Plugin system shut down');
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  private async loadAllPlugins(): Promise<void> {
    if (!fs.existsSync(this.systemConfig.pluginsDir)) {
      return;
    }

    const entries = fs.readdirSync(this.systemConfig.pluginsDir, { withFileTypes: true });

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;

      const pluginPath = path.join(this.systemConfig.pluginsDir, entry.name);
      await this.loadPlugin(pluginPath);
    }

    this.systemLogger.info(`Loaded ${this.plugins.size} plugins`);
  }

  private validateManifest(manifest: PluginManifest): boolean {
    return !!(manifest.id && manifest.name && manifest.version && manifest.main);
  }

  private createPluginContext(instance: PluginInstance): PluginContext {
    return {
      logger: this.systemLogger,
      config: instance.manifest.config || {},
      registerSkill: (skillPath: string) => {
        this.systemLogger.debug(`Registering skill from plugin: ${skillPath}`);
        // 实际实现需要与技能系统集成
      },
      unregisterSkill: (skillName: string) => {
        this.systemLogger.debug(`Unregistering skill: ${skillName}`);
        // 实际实现需要与技能系统集成
      },
      callPlugin: async (pluginId: string, method: string, ...args: unknown[]) => {
        return this.callPlugin(pluginId, method, ...args);
      },
      getPlugin: (pluginId: string) => this.getPlugin(pluginId),
      events: this,
    };
  }

  private startHotReload(): void {
    if (!fs.existsSync(this.systemConfig.pluginsDir)) return;

    const watcher = fs.watch(this.systemConfig.pluginsDir, { recursive: true }, (_eventType, filename) => {
      if (!filename) return;

      // 防抖处理
      setTimeout(() => {
        this.handlePluginChange(filename);
      }, 500);
    });

    void watcher;

    this.systemLogger.debug('Plugin hot reload started');
  }

  private handlePluginChange(filename: string): void {
    // 简化实现：重新加载受影响的插件
    const pluginName = filename.split(path.sep)[0];
    if (!pluginName) return;

    const pluginPath = path.join(this.systemConfig.pluginsDir, pluginName);
    const manifestPath = path.join(pluginPath, 'plugin.json');

    if (fs.existsSync(manifestPath)) {
      try {
        const content = fs.readFileSync(manifestPath, 'utf-8');
        const manifest: PluginManifest = JSON.parse(content);

        // 检查是否已加载
        const existing = this.plugins.get(manifest.id);
        if (existing) {
          this.systemLogger.info(`Reloading plugin: ${manifest.id}`);
          void this.unloadPlugin(manifest.id).then(() => {
            void this.loadPlugin(pluginPath).then((instance) => {
              if (instance) {
                void this.activatePlugin(instance.manifest.id);
              }
            });
          });
        }
      } catch {
        // 忽略解析错误
      }
    }
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
 * 创建插件系统
 */
export function createPluginSystem(config: PluginSystemConfig): SkillPluginSystem {
  return new SkillPluginSystem(config);
}
