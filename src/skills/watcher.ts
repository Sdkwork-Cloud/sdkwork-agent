/**
 * Perfect Skill Watcher - 完美的文件监视和热重载系统
 *
 * 监视所有 Skill 目录变更，自动重新加载
 * 支持：项目级、用户级、内置技能目录
 *
 * @module SkillWatcher
 * @version 6.0.0
 * @standard Industry Leading (OpenClaw + Codex)
 */

import * as fs from 'fs';
import * as path from 'path';
import { homedir } from 'os';
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
  isSKILLmd?: boolean;
}

export interface WatcherState {
  watcher: fs.FSWatcher;
  basePath: string;
  source: SkillSource;
  debounceMs: number;
  timer?: NodeJS.Timeout;
  pendingPath?: string;
}

// ============================================================================
// Perfect Skill Watcher
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
   * 开始监视所有技能目录
   * 完美支持：项目级、用户级、内置技能
   */
  watchAll(workspaceDir?: string): void {
    const watchEnabled = this.config?.load?.watch !== false;
    const debounceMs = this.config?.load?.watchDebounceMs ?? DEFAULT_DEBOUNCE_MS;

    if (!watchEnabled) {
      this.unwatchAll();
      return;
    }

    const allPaths = this.getAllSkillPaths(workspaceDir);
    
    for (const { path: dirPath, source } of allPaths) {
      if (fs.existsSync(dirPath)) {
        this.watchSingleDir(dirPath, source, debounceMs);
      }
    }
  }

  /**
   * 监视单个目录
   */
  private watchSingleDir(dirPath: string, source: SkillSource, debounceMs: number): void {
    const normalizedPath = path.normalize(dirPath);
    
    // 检查是否已存在
    if (this.watchers.has(normalizedPath)) {
      return;
    }

    try {
      const watcher = this.createSingleDirWatcher(normalizedPath, source, debounceMs);
      
      const state: WatcherState = {
        watcher,
        basePath: normalizedPath,
        source,
        debounceMs,
      };

      this.watchers.set(normalizedPath, state);
      this.isWatching = true;

      this.logger?.info(`[SkillWatcher] Started watching ${source} skills: ${normalizedPath}`);
    } catch (error) {
      this.logger?.warn(`[SkillWatcher] Failed to watch ${source} skills: ${normalizedPath}`, {
        error: (error as Error).message,
      });
    }
  }

  /**
   * 停止监视单个目录
   */
  unwatchDir(dirPath: string): void {
    const normalizedPath = path.normalize(dirPath);
    const state = this.watchers.get(normalizedPath);
    if (!state) {
      return;
    }

    if (state.timer) {
      clearTimeout(state.timer);
    }

    state.watcher.close();
    this.watchers.delete(normalizedPath);

    this.logger?.info(`[SkillWatcher] Stopped watching ${state.source} skills: ${normalizedPath}`);

    if (this.watchers.size === 0) {
      this.isWatching = false;
    }
  }

  /**
   * 停止所有监视
   */
  unwatchAll(): void {
    for (const [dirPath, state] of this.watchers) {
      if (state.timer) {
        clearTimeout(state.timer);
      }
      state.watcher.close();
    }
    this.watchers.clear();
    this.isWatching = false;
    
    this.logger?.info('[SkillWatcher] Stopped all watchers');
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
  getWatchedDirs(): Array<{ path: string; source: SkillSource }> {
    return Array.from(this.watchers.values()).map(state => ({
      path: state.basePath,
      source: state.source,
    }));
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  /**
   * 获取所有技能目录路径
   * 完美的优先级：工作区 > 用户级 > 内置
   */
  private getAllSkillPaths(workspaceDir?: string): Array<{ path: string; source: SkillSource }> {
    const paths: Array<{ path: string; source: SkillSource }> = [];

    // 1. 工作区技能目录 (最高优先级)
    if (workspaceDir) {
      paths.push({
        path: path.join(workspaceDir, '.sdkwork', 'skills'),
        source: 'workspace' as SkillSource,
      });
      paths.push({
        path: path.join(workspaceDir, '.agents', 'skills'),
        source: 'agents-skills-project' as SkillSource,
      });
      paths.push({
        path: path.join(workspaceDir, 'skills'),
        source: 'openclaw-workspace' as SkillSource,
      });
    }

    // 2. 用户级技能目录
    const userHome = homedir();
    paths.push({
      path: path.join(userHome, '.sdkwork', 'skills'),
      source: 'managed' as SkillSource,
    });
    paths.push({
      path: path.join(userHome, '.agents', 'skills'),
      source: 'agents-skills-personal' as SkillSource,
    });

    // 3. Extra dirs from config
    const extraDirs = this.config?.load?.extraDirs || [];
    for (const dir of extraDirs) {
      const resolvedDir = this.resolveUserPath(dir);
      paths.push({
        path: resolvedDir,
        source: 'openclaw-extra' as SkillSource,
      });
    }

    // 4. 内置技能目录 (最低优先级)
    const builtinDir = this.getBuiltinSkillsDir();
    if (builtinDir) {
      paths.push({
        path: builtinDir,
        source: 'builtin' as SkillSource,
      });
    }

    return paths;
  }

  /**
   * 获取内置技能目录
   */
  private getBuiltinSkillsDir(): string | null {
    const possiblePaths: string[] = [];

    if (typeof __dirname !== 'undefined') {
      possiblePaths.push(
        path.join(__dirname, 'builtin'),
        path.join(__dirname, '..', 'skills', 'builtin'),
        path.join(__dirname, '..', '..', 'skills', 'builtin')
      );
    }

    possiblePaths.push(
      path.join(process.cwd(), 'src', 'skills', 'builtin'),
      path.join(process.cwd(), 'skills', 'builtin')
    );

    for (const dir of possiblePaths) {
      const normalizedPath = path.normalize(dir);
      if (fs.existsSync(normalizedPath)) {
        return normalizedPath;
      }
    }

    return null;
  }

  /**
   * 为单个目录创建监视器
   */
  private createSingleDirWatcher(
    dirPath: string,
    source: SkillSource,
    debounceMs: number
  ): fs.FSWatcher {
    const watcher = fs.watch(
      dirPath,
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

        const fullPath = path.join(dirPath, filename);
        const isSKILLmd = path.basename(filename) === 'SKILL.md';
        
        // 确定事件类型
        let eventTypeFinal: 'add' | 'change' | 'unlink';
        if (eventType === 'rename') {
          // 检查文件是否存在来判断是 add 还是 unlink
          if (fs.existsSync(fullPath)) {
            eventTypeFinal = 'add';
          } else {
            eventTypeFinal = 'unlink';
          }
        } else {
          eventTypeFinal = 'change';
        }

        const event: SkillChangeEvent = {
          type: eventTypeFinal,
          path: fullPath,
          source,
          skillName: this.extractSkillName(fullPath),
          isSKILLmd,
        };

        this.scheduleUpdate(dirPath, fullPath, event, debounceMs);
      }
    );

    return watcher;
  }

  /**
   * 调度更新（防抖）
   */
  private scheduleUpdate(
    basePath: string,
    changedPath: string,
    event: SkillChangeEvent,
    debounceMs: number
  ): void {
    const state = this.watchers.get(basePath);
    if (!state) return;

    state.pendingPath = changedPath;

    if (state.timer) {
      clearTimeout(state.timer);
    }

    state.timer = setTimeout(() => {
      state.timer = undefined;
      state.pendingPath = undefined;

      // 先确保文件稳定再发射事件
      if (event.type !== 'unlink') {
        waitForFileStability(changedPath, 100)
          .then(() => {
            this.emit('change', event);
            this.logger?.debug(`[SkillWatcher] Skill ${event.type}: ${changedPath}`, {
              type: event.type,
              source: event.source,
              skillName: event.skillName,
            });
          })
          .catch(() => {
            // 如果文件在等待过程中被删除，仍然发射事件
            this.emit('change', event);
          });
      } else {
        // 对于删除事件，立即发射
        this.emit('change', event);
        this.logger?.debug(`[SkillWatcher] Skill removed: ${changedPath}`, {
          type: event.type,
          source: event.source,
          skillName: event.skillName,
        });
      }
    }, debounceMs);
  }

  /**
   * 解析用户路径
   */
  private resolveUserPath(inputPath: string): string {
    if (inputPath.startsWith('~/')) {
      return path.join(homedir(), inputPath.slice(2));
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
  private extractSkillName(filePath: string): string | undefined {
    const basename = path.basename(filePath, '.md');
    if (basename === 'SKILL') {
      return path.basename(path.dirname(filePath));
    }
    return basename;
  }
}

// ============================================================================
// Perfect Factory Functions
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
// Perfect Helper Functions
// ============================================================================

/**
 * 完美的快速创建并启动所有技能目录的监视器
 */
export function watchAllSkills(
  workspaceDir?: string,
  config?: SkillsConfig,
  onChange?: (event: SkillChangeEvent) => void
): SkillWatcher {
  const watcher = new SkillWatcher(config);

  if (onChange) {
    watcher.on('change', onChange);
  }

  watcher.watchAll(workspaceDir);
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
