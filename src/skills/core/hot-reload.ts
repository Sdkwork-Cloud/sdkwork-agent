/**
 * Skill Hot Reload System
 *
 * 技能热重载系统 - 实时监控技能文件变化并自动刷新
 *
 * 核心特性：
 * - 文件系统监控 (File watching)
 * - 防抖机制 (Debouncing)
 * - 版本管理 (Version management)
 * - 智能变更检测
 *
 * @module SkillHotReload
 * @version 1.0.0
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { EventEmitter } from '../../utils/event-emitter.js';
import type {
  SkillFileChangeEvent,
  SkillSystemEvent,
  SkillsConfig,
} from './openclaw-types.js';
import { Logger } from './types.js';

/**
 * 热重载管理器配置
 */
export interface HotReloadManagerConfig {
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
  /** 版本管理器回调 */
  onVersionBump?: (reason: string, changedPath?: string) => void;
  /** 重新加载回调 */
  onReload?: () => Promise<void>;
}

/**
 * 监控状态
 */
interface WatchState {
  /** 是否正在等待 */
  pending: boolean;
  /** 定时器 */
  timer?: NodeJS.Timeout;
  /** 变更路径 */
  pendingPath?: string;
}

/**
 * 默认忽略模式
 */
const DEFAULT_IGNORED = [
  '**/node_modules/**',
  '**/.git/**',
  '**/.*',
  '**/*.tmp',
  '**/~*',
];

/**
 * 技能热重载管理器
 *
 * 实现 OpenClaw 的 ensureSkillsWatcher 机制：
 * 1. 监控技能文件变化
 * 2. 防抖处理避免频繁刷新
 * 3. 版本递增触发快照重建
 * 4. 智能变更检测
 */
export class SkillHotReloadManager extends EventEmitter {
  private config: Required<HotReloadManagerConfig>;
  private watchers: Map<string, fs.FSWatcher> = new Map();
  private watchState: WatchState = { pending: false };
  private isEnabled: boolean;
  private debounceMs: number;

  constructor(config: HotReloadManagerConfig) {
    super();
    this.config = {
      configDir: this.getDefaultConfigDir(),
      bundledDir: '',
      skillsConfig: {},
      logger: this.createDefaultLogger(),
      onVersionBump: () => {},
      onReload: async () => {},
      ...config,
    };

    // 从配置读取设置
    this.isEnabled = this.config.skillsConfig?.load?.watch !== false;
    const debounceMsRaw = this.config.skillsConfig?.load?.watchDebounceMs;
    this.debounceMs =
      typeof debounceMsRaw === 'number' && Number.isFinite(debounceMsRaw)
        ? Math.max(0, debounceMsRaw)
        : 250;
  }

  /**
   * 启动文件监控
   */
  async start(): Promise<void> {
    if (!this.isEnabled) {
      this.config.logger.debug('Hot reload is disabled');
      return;
    }

    this.config.logger.info('Starting skill hot reload watcher');

    // 收集所有需要监控的路径
    const watchPaths = this.collectWatchPaths();

    // 为每个路径创建监控器
    for (const watchPath of watchPaths) {
      if (!fs.existsSync(watchPath)) {
        continue;
      }

      try {
        const watcher = this.createWatcher(watchPath);
        this.watchers.set(watchPath, watcher);

        this.config.logger.debug(`Watching: ${watchPath}`);
      } catch (error) {
        this.config.logger.error(
          `Failed to watch ${watchPath}: ${(error as Error).message}`
        );
      }
    }

    this.emit('reload:started' as SkillSystemEvent['type'], {
      type: 'reload:started',
      watchPaths: watchPaths.length,
    });
  }

  /**
   * 停止文件监控
   */
  async stop(): Promise<void> {
    this.config.logger.info('Stopping skill hot reload watcher');

    // 清除待处理的定时器
    if (this.watchState.timer) {
      clearTimeout(this.watchState.timer);
      this.watchState = { pending: false };
    }

    // 关闭所有监控器
    for (const [path, watcher] of this.watchers) {
      watcher.close();
      this.config.logger.debug(`Stopped watching: ${path}`);
    }

    this.watchers.clear();

    this.emit('reload:stopped' as SkillSystemEvent['type'], {
      type: 'reload:stopped',
    });
  }

  /**
   * 重启监控
   */
  async restart(): Promise<void> {
    await this.stop();
    await this.start();
  }

  /**
   * 手动触发刷新
   */
  async triggerReload(reason: string, changedPath?: string): Promise<void> {
    this.config.logger.info(`Manual reload triggered: ${reason}`);

    // 递增版本
    this.config.onVersionBump(reason, changedPath);

    // 触发重新加载
    await this.config.onReload();

    this.emit('reload:triggered' as SkillSystemEvent['type'], {
      type: 'reload:triggered',
      reason,
      changedPath,
    });
  }

  /**
   * 检查是否正在运行
   */
  isRunning(): boolean {
    return this.watchers.size > 0;
  }

  /**
   * 获取监控路径列表
   */
  getWatchPaths(): string[] {
    return Array.from(this.watchers.keys());
  }

  /**
   * 收集需要监控的路径
   */
  private collectWatchPaths(): string[] {
    const paths: string[] = [];

    // 1. 工作区技能目录
    const workspaceSkillsDir = path.join(this.config.workspaceDir, 'skills');
    paths.push(workspaceSkillsDir);

    // 2. 托管技能目录
    const managedDir = path.join(this.config.configDir, 'skills');
    paths.push(managedDir);

    // 3. 内置技能目录
    if (this.config.bundledDir) {
      paths.push(this.config.bundledDir);
    }

    // 4. 额外目录
    const extraDirs = this.config.skillsConfig?.load?.extraDirs ?? [];
    for (const dir of extraDirs) {
      const trimmed = dir.trim();
      if (trimmed) {
        paths.push(path.resolve(trimmed));
      }
    }

    // 过滤掉不存在的路径
    return paths.filter(p => fs.existsSync(p));
  }

  /**
   * 创建文件监控器
   */
  private createWatcher(watchPath: string): fs.FSWatcher {
    const watcher = fs.watch(watchPath, { recursive: true }, (eventType, filename) => {
      if (!filename) return;

      // 检查是否应该忽略
      if (this.shouldIgnore(filename)) {
        return;
      }

      const fullPath = path.join(watchPath, filename);

      // 调度刷新
      this.scheduleReload(eventType, fullPath);
    });

    return watcher;
  }

  /**
   * 调度刷新
   */
  private scheduleReload(
    eventType: 'rename' | 'change',
    changedPath: string
  ): void {
    // 更新待处理路径
    this.watchState.pendingPath = changedPath;

    // 清除现有定时器
    if (this.watchState.timer) {
      clearTimeout(this.watchState.timer);
    }

    // 设置防抖定时器
    this.watchState.pending = true;
    this.watchState.timer = setTimeout(() => {
      this.executeReload(eventType, changedPath);
    }, this.debounceMs);

    this.config.logger.debug(`Scheduled reload for ${changedPath} (${this.debounceMs}ms debounce)`);
  }

  /**
   * 执行刷新
   */
  private async executeReload(
    eventType: 'rename' | 'change',
    changedPath: string
  ): Promise<void> {
    const pendingPath = this.watchState.pendingPath || changedPath;

    // 重置状态
    this.watchState = { pending: false };

    // 确定变更类型
    const changeEvent: SkillFileChangeEvent['type'] =
      eventType === 'rename'
        ? fs.existsSync(pendingPath)
          ? 'add'
          : 'unlink'
        : 'change';

    this.config.logger.info(`Skill file ${changeEvent}: ${pendingPath}`);

    // 触发事件
    this.emit('skill:reload' as SkillSystemEvent['type'], {
      type: 'skill:reload',
      changedPath: pendingPath,
    });

    // 递增版本
    this.config.onVersionBump('watch', pendingPath);

    // 触发重新加载
    try {
      await this.config.onReload();

      this.emit('reload:completed' as SkillSystemEvent['type'], {
        type: 'reload:completed',
        changedPath: pendingPath,
      });
    } catch (error) {
      this.config.logger.error(`Reload failed: ${(error as Error).message}`);

      this.emit('reload:failed' as SkillSystemEvent['type'], {
        type: 'reload:failed',
        error: (error as Error).message,
      });
    }
  }

  /**
   * 检查是否应该忽略
   */
  private shouldIgnore(filename: string): boolean {
    const basename = path.basename(filename);

    // 检查默认忽略模式
    for (const pattern of DEFAULT_IGNORED) {
      if (this.matchPattern(filename, pattern) || this.matchPattern(basename, pattern)) {
        return true;
      }
    }

    // 检查隐藏文件
    if (basename.startsWith('.')) {
      return true;
    }

    // 检查临时文件
    if (basename.endsWith('.tmp') || basename.startsWith('~')) {
      return true;
    }

    return false;
  }

  /**
   * 匹配模式
   */
  private matchPattern(filename: string, pattern: string): boolean {
    // 简化实现，支持基本的 glob 模式
    const regex = pattern
      .replace(/\*\*/g, '{{GLOBSTAR}}')
      .replace(/\*/g, '[^/]*')
      .replace(/\?/g, '.')
      .replace(/{{GLOBSTAR}}/g, '.*');

    const regExp = new RegExp(`^${regex}$`);
    return regExp.test(filename);
  }

  /**
   * 获取默认配置目录
   */
  private getDefaultConfigDir(): string {
    const homeDir = process.env.HOME || process.env.USERPROFILE || '.';
    return path.join(homeDir, '.sdkwork');
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
 * 创建热重载管理器
 */
export function createHotReloadManager(
  config: HotReloadManagerConfig
): SkillHotReloadManager {
  return new SkillHotReloadManager(config);
}
