/**
 * Skill Watcher - 文件监视和热重载
 *
 * 监视 Skill 文件变更，自动重新加载
 *
 * @module SkillWatcher
 * @version 5.0.0
 */

import * as fs from 'fs';
import * as path from 'path';
import { EventEmitter } from 'events';
import type { SkillsConfig, SkillSource } from './types.js';

// ============================================================================
// Constants
// ============================================================================

const DEFAULT_DEBOUNCE_MS = 250;
const DEFAULT_WATCH_IGNORED = [
  '**/node_modules/**',
  '**/.git/**',
  '**/.*',
  '**/*.tmp',
  '**/~*',
];

// ============================================================================
// Watch Event Types
// ============================================================================

export interface SkillChangeEvent {
  type: 'add' | 'change' | 'unlink';
  path: string;
  source: SkillSource;
  skillName?: string;
}

export interface WatcherState {
  watcher: fs.FSWatcher;
  pathsKey: string;
  debounceMs: number;
  timer?: NodeJS.Timeout;
  pendingPath?: string;
}

// ============================================================================
// Skill Watcher
// ============================================================================

export class SkillWatcher extends EventEmitter {
  private watchers = new Map<string, WatcherState>();
  private isWatching = false;

  constructor(
    private config?: SkillsConfig,
    private logger?: {
      debug: (msg: string, meta?: Record<string, unknown>) => void;
      info: (msg: string, meta?: Record<string, unknown>) => void;
      warn: (msg: string, meta?: Record<string, unknown>) => void;
      error: (msg: string, meta?: Record<string, unknown>, err?: Error) => void;
    }
  ) {
    super();
  }

  /**
   * 开始监视工作区
   */
  watch(workspaceDir: string): void {
    if (!workspaceDir) {
      return;
    }

    const watchEnabled = this.config?.load?.watch !== false;
    const debounceMs = this.config?.load?.watchDebounceMs ?? DEFAULT_DEBOUNCE_MS;

    // 如果禁用监视，清理现有监视器
    if (!watchEnabled) {
      this.unwatch(workspaceDir);
      return;
    }

    const watchPaths = this.resolveWatchPaths(workspaceDir);
    const pathsKey = watchPaths.join('|');

    // 检查是否已有相同配置的监视器
    const existing = this.watchers.get(workspaceDir);
    if (existing && existing.pathsKey === pathsKey && existing.debounceMs === debounceMs) {
      return;
    }

    // 清理旧监视器
    if (existing) {
      this.unwatch(workspaceDir);
    }

    // 创建新监视器
    const watcher = this.createWatcher(watchPaths, debounceMs, workspaceDir);

    const state: WatcherState = {
      watcher,
      pathsKey,
      debounceMs,
    };

    this.watchers.set(workspaceDir, state);
    this.isWatching = true;

    this.logger?.info(`[SkillWatcher] Started watching ${watchPaths.length} paths`, {
      workspaceDir,
      debounceMs,
    });
  }

  /**
   * 停止监视工作区
   */
  unwatch(workspaceDir: string): void {
    const state = this.watchers.get(workspaceDir);
    if (!state) {
      return;
    }

    if (state.timer) {
      clearTimeout(state.timer);
    }

    state.watcher.close();
    this.watchers.delete(workspaceDir);

    this.logger?.info(`[SkillWatcher] Stopped watching ${workspaceDir}`);

    if (this.watchers.size === 0) {
      this.isWatching = false;
    }
  }

  /**
   * 停止所有监视
   */
  unwatchAll(): void {
    for (const [workspaceDir] of this.watchers) {
      this.unwatch(workspaceDir);
    }
    this.watchers.clear();
    this.isWatching = false;
  }

  /**
   * 检查是否正在监视
   */
  get watching(): boolean {
    return this.isWatching;
  }

  /**
   * 获取监视的目录列表
   */
  getWatchedDirs(): string[] {
    return Array.from(this.watchers.keys());
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  /**
   * 创建文件监视器
   */
  private createWatcher(
    watchPaths: string[],
    debounceMs: number,
    workspaceDir: string
  ): fs.FSWatcher {
    const watcher = fs.watch(
      watchPaths[0],
      { recursive: true },
      (eventType, filename) => {
        if (!filename) return;

        // 忽略隐藏文件和临时文件
        if (this.shouldIgnore(filename)) {
          return;
        }

        // 只关注 .md 文件
        if (!filename.endsWith('.md')) {
          return;
        }

        const fullPath = path.join(watchPaths[0], filename);
        const event: SkillChangeEvent = {
          type: eventType === 'rename' ? 'unlink' : 'change',
          path: fullPath,
          source: 'openclaw-workspace',
          skillName: this.extractSkillName(filename),
        };

        this.scheduleUpdate(workspaceDir, fullPath, event, debounceMs);
      }
    );

    return watcher;
  }

  /**
   * 调度更新（防抖）
   */
  private scheduleUpdate(
    workspaceDir: string,
    changedPath: string,
    event: SkillChangeEvent,
    debounceMs: number
  ): void {
    const state = this.watchers.get(workspaceDir);
    if (!state) return;

    state.pendingPath = changedPath;

    if (state.timer) {
      clearTimeout(state.timer);
    }

    state.timer = setTimeout(() => {
      state.timer = undefined;
      state.pendingPath = undefined;

      this.emit('change', event);
      this.logger?.debug(`[SkillWatcher] Skill changed: ${changedPath}`, {
        type: event.type,
        skillName: event.skillName,
      });
    }, debounceMs);
  }

  /**
   * 解析监视路径
   */
  private resolveWatchPaths(workspaceDir: string): string[] {
    const paths: string[] = [];

    // 工作区 skills 目录
    const workspaceSkillsDir = path.join(workspaceDir, 'skills');
    if (fs.existsSync(workspaceSkillsDir)) {
      paths.push(workspaceSkillsDir);
    }

    // Extra dirs
    const extraDirs = this.config?.load?.extraDirs || [];
    for (const dir of extraDirs) {
      const resolvedDir = this.resolveUserPath(dir);
      if (fs.existsSync(resolvedDir)) {
        paths.push(resolvedDir);
      }
    }

    return paths;
  }

  /**
   * 解析用户路径
   */
  private resolveUserPath(inputPath: string): string {
    if (inputPath.startsWith('~/')) {
      return path.join(process.env.HOME || process.env.USERPROFILE || '', inputPath.slice(2));
    }
    return path.resolve(inputPath);
  }

  /**
   * 检查是否应该忽略文件
   */
  private shouldIgnore(filename: string): boolean {
    const basename = path.basename(filename);

    // 隐藏文件
    if (basename.startsWith('.')) {
      return true;
    }

    // 临时文件
    if (basename.endsWith('.tmp') || basename.startsWith('~')) {
      return true;
    }

    // node_modules
    if (filename.includes('node_modules')) {
      return true;
    }

    // .git
    if (filename.includes('.git')) {
      return true;
    }

    return false;
  }

  /**
   * 提取 Skill 名称
   */
  private extractSkillName(filename: string): string | undefined {
    // 从 SKILL.md 或 xxx.md 提取名称
    const basename = path.basename(filename, '.md');
    if (basename === 'SKILL') {
      // 从父目录名提取
      return path.basename(path.dirname(filename));
    }
    return basename;
  }
}

// ============================================================================
// Factory
// ============================================================================

export function createSkillWatcher(
  config?: SkillsConfig,
  logger?: {
    debug: (msg: string, meta?: Record<string, unknown>) => void;
    info: (msg: string, meta?: Record<string, unknown>) => void;
    warn: (msg: string, meta?: Record<string, unknown>) => void;
    error: (msg: string, meta?: Record<string, unknown>, err?: Error) => void;
  }
): SkillWatcher {
  return new SkillWatcher(config, logger);
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * 快速创建并启动监视器
 */
export function watchSkills(
  workspaceDir: string,
  config?: SkillsConfig,
  onChange?: (event: SkillChangeEvent) => void
): SkillWatcher {
  const watcher = new SkillWatcher(config);

  if (onChange) {
    watcher.on('change', onChange);
  }

  watcher.watch(workspaceDir);
  return watcher;
}

/**
 * 等待文件稳定（写入完成）
 */
export async function waitForFileStability(
  filePath: string,
  stabilityThresholdMs: number = 100
): Promise<void> {
  let lastSize = -1;
  let stableCount = 0;
  const requiredStableCount = 3;

  return new Promise((resolve, reject) => {
    const check = () => {
      try {
        const stats = fs.statSync(filePath);
        const currentSize = stats.size;

        if (currentSize === lastSize) {
          stableCount++;
          if (stableCount >= requiredStableCount) {
            resolve();
            return;
          }
        } else {
          stableCount = 0;
          lastSize = currentSize;
        }

        setTimeout(check, stabilityThresholdMs);
      } catch (error) {
        reject(error);
      }
    };

    check();
  });
}
