/**
 * Unified Skill System
 *
 * 统一的技能系统管理器 - 整合所有 OpenClaw 风格组件
 *
 * 核心架构：
 * - MultiLocationSkillLoader: 多位置技能加载
 * - SkillSnapshotManager: 技能快照管理
 * - DynamicSkillSelector: 动态技能选择
 * - SkillCommandDispatcher: 命令分发
 * - SkillHotReloadManager: 热重载
 *
 * @module UnifiedSkillSystem
 * @version 2.0.0
 */

import { EventEmitter } from '../../utils/event-emitter.js';
import {
  MultiLocationSkillLoader,
  createMultiLocationLoader,
} from './multi-location-loader.js';
import {
  SkillSnapshotManager,
  createSnapshotManager,
} from './snapshot-manager.js';
import {
  DynamicSkillSelector,
  createDynamicSelector,
} from './dynamic-selector.js';
import {
  SkillCommandDispatcher,
  createCommandDispatcher,
} from './command-dispatch.js';
import {
  SkillHotReloadManager,
  createHotReloadManager,
} from './hot-reload.js';
import {
  SkillEntry,
  SkillSnapshot,
  SkillSelectionContext,
  SkillSelectionResult,
  SkillCommandSpec,
  SkillsConfig,
  SkillSystemEvent,
} from './openclaw-types.js';
import { CommandDispatchResult } from './command-dispatch.js';
import { Logger, ISkillRegistry } from './types.js';

/**
 * 统一技能系统配置
 */
export interface UnifiedSkillSystemConfig {
  /** 工作区目录 */
  workspaceDir: string;
  /** 配置目录 */
  configDir?: string;
  /** 内置技能目录 */
  bundledDir?: string;
  /** 技能配置 */
  skillsConfig?: SkillsConfig;
  /** 日志器 */
  logger?: Logger;
  /** 技能注册表 */
  registry?: ISkillRegistry;
  /** 插件技能目录解析器 */
  pluginSkillResolver?: () => string[];
  /** 保留的命令名称 */
  reservedCommandNames?: Set<string>;
}

/**
 * 系统状态
 */
export interface SkillSystemState {
  /** 是否已初始化 */
  initialized: boolean;
  /** 是否正在加载 */
  loading: boolean;
  /** 当前快照版本 */
  snapshotVersion: number;
  /** 已加载技能数 */
  loadedSkillCount: number;
  /** 可用命令数 */
  availableCommandCount: number;
  /** 最后更新时间 */
  lastUpdated: Date | null;
}

/**
 * 统一技能系统
 *
 * 高内聚低耦合的架构设计：
 * - 各组件独立运作，通过事件通信
 * - 统一的配置和日志接口
 * - 支持动态扩展和热更新
 */
export class UnifiedSkillSystem extends EventEmitter {
  private config: Required<UnifiedSkillSystemConfig>;
  private loader: MultiLocationSkillLoader;
  private snapshotManager: SkillSnapshotManager;
  private dynamicSelector: DynamicSkillSelector;
  private commandDispatcher: SkillCommandDispatcher;
  private hotReloadManager: SkillHotReloadManager;

  private state: SkillSystemState = {
    initialized: false,
    loading: false,
    snapshotVersion: 1,
    loadedSkillCount: 0,
    availableCommandCount: 0,
    lastUpdated: null,
  };

  private currentEntries: SkillEntry[] = [];
  private currentSnapshot: SkillSnapshot | null = null;

  constructor(config: UnifiedSkillSystemConfig) {
    super();
    this.config = {
      configDir: this.getDefaultConfigDir(),
      bundledDir: '',
      skillsConfig: {},
      logger: this.createDefaultLogger(),
      registry: undefined as unknown as ISkillRegistry,
      pluginSkillResolver: () => [],
      reservedCommandNames: new Set(),
      ...config,
    };

    // 初始化各组件
    this.loader = createMultiLocationLoader({
      workspaceDir: this.config.workspaceDir,
      configDir: this.config.configDir,
      bundledDir: this.config.bundledDir,
      skillsConfig: this.config.skillsConfig,
      logger: this.config.logger,
      pluginSkillResolver: this.config.pluginSkillResolver,
    });

    this.snapshotManager = createSnapshotManager({
      workspaceDir: this.config.workspaceDir,
      skillsConfig: this.config.skillsConfig,
      logger: this.config.logger,
    });

    this.dynamicSelector = createDynamicSelector({
      logger: this.config.logger,
    });

    this.commandDispatcher = createCommandDispatcher({
      reservedNames: this.config.reservedCommandNames,
      skillsConfig: this.config.skillsConfig,
      logger: this.config.logger,
    });

    this.hotReloadManager = createHotReloadManager({
      workspaceDir: this.config.workspaceDir,
      configDir: this.config.configDir,
      bundledDir: this.config.bundledDir,
      skillsConfig: this.config.skillsConfig,
      logger: this.config.logger,
      onVersionBump: (reason, changedPath) => {
        this.handleVersionBump(reason, changedPath);
      },
      onReload: async () => {
        await this.reload();
      },
    });

    // 绑定事件
    this.bindEvents();
  }

  /**
   * 初始化技能系统
   */
  async initialize(): Promise<void> {
    if (this.state.initialized) {
      this.config.logger.warn('Skill system already initialized');
      return;
    }

    this.config.logger.info('Initializing unified skill system');
    this.state.loading = true;

    try {
      // 1. 加载所有技能
      await this.loadSkills();

      // 2. 构建初始快照
      await this.buildSnapshot();

      // 3. 构建命令规范
      this.buildCommandSpecs();

      // 4. 启动热重载
      await this.hotReloadManager.start();

      this.state.initialized = true;
      this.state.loading = false;
      this.state.lastUpdated = new Date();

      this.config.logger.info('Unified skill system initialized successfully');

      this.emit('system:initialized' as SkillSystemEvent['type'], {
        type: 'system:initialized',
        skillCount: this.state.loadedSkillCount,
        commandCount: this.state.availableCommandCount,
      });
    } catch (error) {
      this.state.loading = false;
      this.config.logger.error(`Failed to initialize skill system: ${(error as Error).message}`);
      throw error;
    }
  }

  /**
   * 关闭技能系统
   */
  async shutdown(): Promise<void> {
    this.config.logger.info('Shutting down unified skill system');

    // 停止热重载
    await this.hotReloadManager.stop();

    this.state.initialized = false;

    this.emit('system:shutdown' as SkillSystemEvent['type'], {
      type: 'system:shutdown',
    });

    this.config.logger.info('Unified skill system shut down');
  }

  /**
   * 重新加载技能
   */
  async reload(): Promise<void> {
    if (this.state.loading) {
      this.config.logger.debug('Reload already in progress, skipping');
      return;
    }

    this.config.logger.info('Reloading skill system');
    this.state.loading = true;

    try {
      // 1. 重新加载技能
      await this.loadSkills();

      // 2. 重建快照
      await this.buildSnapshot();

      // 3. 重建命令规范
      this.commandDispatcher.clear();
      this.buildCommandSpecs();

      this.state.loading = false;
      this.state.lastUpdated = new Date();

      this.config.logger.info('Skill system reloaded successfully');

      this.emit('system:reloaded' as SkillSystemEvent['type'], {
        type: 'system:reloaded',
        skillCount: this.state.loadedSkillCount,
        commandCount: this.state.availableCommandCount,
      });
    } catch (error) {
      this.state.loading = false;
      this.config.logger.error(`Failed to reload skill system: ${(error as Error).message}`);
      throw error;
    }
  }

  /**
   * 动态选择技能
   *
   * 在Agent自我思考过程中调用
   */
  async selectSkills(context: Omit<SkillSelectionContext, 'availableSkills'>): Promise<SkillSelectionResult> {
    if (!this.state.initialized) {
      throw new Error('Skill system not initialized');
    }

    const fullContext: SkillSelectionContext = {
      ...context,
      availableSkills: this.currentEntries,
    };

    return this.dynamicSelector.select(fullContext);
  }

  /**
   * 解析并分发命令
   */
  async handleCommand(input: string): Promise<CommandDispatchResult> {
    if (!this.state.initialized) {
      return {
        success: false,
        error: 'Skill system not initialized',
      };
    }

    const command = this.commandDispatcher.parseCommand(input);

    if (!command) {
      return {
        success: false,
        error: 'Invalid command format',
      };
    }

    return this.commandDispatcher.dispatch(command);
  }

  /**
   * 获取技能提示词
   */
  getSkillPrompt(): string {
    return this.currentSnapshot?.prompt || '';
  }

  /**
   * 获取系统状态
   */
  getState(): SkillSystemState {
    return { ...this.state };
  }

  /**
   * 获取所有技能条目
   */
  getSkillEntries(): SkillEntry[] {
    return [...this.currentEntries];
  }

  /**
   * 获取当前快照
   */
  getCurrentSnapshot(): SkillSnapshot | null {
    return this.currentSnapshot;
  }

  /**
   * 获取所有命令规范
   */
  getCommandSpecs(): SkillCommandSpec[] {
    return this.commandDispatcher.getAllSpecs();
  }

  /**
   * 搜索命令
   */
  searchCommands(query: string): SkillCommandSpec[] {
    return this.commandDispatcher.searchCommands(query);
  }

  /**
   * 检查命令是否存在
   */
  hasCommand(name: string): boolean {
    return this.commandDispatcher.hasCommand(name);
  }

  /**
   * 获取特定技能条目
   */
  getSkillEntry(name: string): SkillEntry | undefined {
    return this.currentEntries.find(entry => entry.name === name);
  }

  /**
   * 加载技能
   */
  private async loadSkills(): Promise<void> {
    this.currentEntries = await this.loader.loadAllSkills();
    this.state.loadedSkillCount = this.currentEntries.length;
  }

  /**
   * 构建快照
   */
  private async buildSnapshot(): Promise<void> {
    this.currentSnapshot = await this.snapshotManager.buildSnapshot(
      this.currentEntries,
      undefined, // eligibility context
      undefined // skill filter
    );

    this.state.snapshotVersion = this.currentSnapshot.version;
  }

  /**
   * 构建命令规范
   */
  private buildCommandSpecs(): void {
    this.commandDispatcher.buildCommandSpecs(this.currentEntries);
    this.state.availableCommandCount = this.commandDispatcher.getAllSpecs().length;
  }

  /**
   * 处理版本递增
   */
  private handleVersionBump(reason: string, changedPath?: string): void {
    const newVersion = this.snapshotManager.bumpVersion(
      this.config.workspaceDir,
      reason,
      changedPath
    );

    this.state.snapshotVersion = newVersion;

    this.config.logger.debug(`Snapshot version bumped to ${newVersion} (${reason})`);
  }

  /**
   * 绑定事件
   */
  private bindEvents(): void {
    // 转发加载器事件
    this.loader.on('skill:loaded', (event) => {
      this.emit('skill:loaded', event);
    });

    // 转发快照管理器事件
    this.snapshotManager.on('snapshot:created', (event) => {
      this.emit('snapshot:created', event);
    });

    this.snapshotManager.on('snapshot:updated', (event) => {
      this.emit('snapshot:updated', event);
    });

    // 转发动态选择器事件
    this.dynamicSelector.on('skill:selected', (event) => {
      this.emit('skill:selected', event);
    });

    // 转发命令分发器事件
    this.commandDispatcher.on('command:dispatch', (event) => {
      this.emit('command:dispatch', event);
    });

    // 转发热重载事件
    this.hotReloadManager.on('skill:reload', (event) => {
      this.emit('skill:reload', event);
    });
  }

  /**
   * 获取默认配置目录
   */
  private getDefaultConfigDir(): string {
    const homeDir = process.env.HOME || process.env.USERPROFILE || '.';
    return `${homeDir}/.sdkwork`;
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
 * 创建统一技能系统
 */
export function createSkillSystem(config: UnifiedSkillSystemConfig): UnifiedSkillSystem {
  return new UnifiedSkillSystem(config);
}

// 导出所有组件
export {
  MultiLocationSkillLoader,
  createMultiLocationLoader,
  SkillSnapshotManager,
  createSnapshotManager,
  DynamicSkillSelector,
  createDynamicSelector,
  SkillCommandDispatcher,
  createCommandDispatcher,
  SkillHotReloadManager,
  createHotReloadManager,
};

// 导出类型
export * from './openclaw-types.js';
