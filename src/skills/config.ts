/**
 * Skill Config Manager - 配置管理器
 *
 * 管理 ~/.sdkwork/config.json 配置文件
 *
 * @module SkillConfigManager
 * @version 5.0.0
 */

import * as fs from 'fs';
import * as path from 'path';
import { promisify } from 'util';
import type { SkillsConfig, SkillConfig } from './types.js';

const readFile = promisify(fs.readFile);
const writeFile = promisify(fs.writeFile);
const mkdir = promisify(fs.mkdir);
const access = promisify(fs.access);

// ============================================================================
// Constants
// ============================================================================

const CONFIG_DIR_NAME = '.sdkwork';
const CONFIG_FILE_NAME = 'config.json';

// ============================================================================
// Config Manager
// ============================================================================

export class SkillConfigManager {
  private configPath: string;
  private configDir: string;
  private cachedConfig?: SkillsConfig;
  private lastLoadTime: number = 0;
  private readonly cacheTTL: number = 5000; // 5 seconds

  constructor(customPath?: string) {
    if (customPath) {
      this.configPath = customPath;
      this.configDir = path.dirname(customPath);
    } else {
      const homeDir = process.env.HOME || process.env.USERPROFILE || process.cwd();
      this.configDir = path.join(homeDir, CONFIG_DIR_NAME);
      this.configPath = path.join(this.configDir, CONFIG_FILE_NAME);
    }
  }

  // ============================================================================
  // Config Loading
  // ============================================================================

  /**
   * 加载配置
   */
  async load(): Promise<SkillsConfig> {
    // 检查缓存
    if (this.cachedConfig && Date.now() - this.lastLoadTime < this.cacheTTL) {
      return this.cachedConfig;
    }

    try {
      await access(this.configPath, fs.constants.R_OK);
      const content = await readFile(this.configPath, 'utf-8');
      const parsed = JSON.parse(content);
      this.cachedConfig = this.normalizeConfig(parsed);
      this.lastLoadTime = Date.now();
      return this.cachedConfig;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        // 配置文件不存在，返回默认配置
        this.cachedConfig = this.getDefaultConfig();
        return this.cachedConfig;
      }
      throw error;
    }
  }

  /**
   * 同步加载配置
   */
  loadSync(): SkillsConfig {
    // 检查缓存
    if (this.cachedConfig && Date.now() - this.lastLoadTime < this.cacheTTL) {
      return this.cachedConfig;
    }

    try {
      const content = fs.readFileSync(this.configPath, 'utf-8');
      const parsed = JSON.parse(content);
      this.cachedConfig = this.normalizeConfig(parsed);
      this.lastLoadTime = Date.now();
      return this.cachedConfig;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        this.cachedConfig = this.getDefaultConfig();
        return this.cachedConfig;
      }
      throw error;
    }
  }

  // ============================================================================
  // Config Saving
  // ============================================================================

  /**
   * 保存配置
   */
  async save(config: SkillsConfig): Promise<void> {
    // 确保目录存在
    await mkdir(this.configDir, { recursive: true });

    // 格式化并保存
    const content = JSON.stringify(config, null, 2);
    await writeFile(this.configPath, content, 'utf-8');

    // 更新缓存
    this.cachedConfig = config;
    this.lastLoadTime = Date.now();
  }

  /**
   * 同步保存配置
   */
  saveSync(config: SkillsConfig): void {
    // 确保目录存在
    fs.mkdirSync(this.configDir, { recursive: true });

    // 格式化并保存
    const content = JSON.stringify(config, null, 2);
    fs.writeFileSync(this.configPath, content, 'utf-8');

    // 更新缓存
    this.cachedConfig = config;
    this.lastLoadTime = Date.now();
  }

  // ============================================================================
  // Config Manipulation
  // ============================================================================

  /**
   * 获取 Skill 配置
   */
  async getSkillConfig(skillKey: string): Promise<SkillConfig | undefined> {
    const config = await this.load();
    return config.entries?.[skillKey];
  }

  /**
   * 设置 Skill 配置
   */
  async setSkillConfig(skillKey: string, skillConfig: SkillConfig): Promise<void> {
    const config = await this.load();

    if (!config.entries) {
      config.entries = {};
    }

    config.entries[skillKey] = {
      ...config.entries[skillKey],
      ...skillConfig,
    };

    await this.save(config);
  }

  /**
   * 删除 Skill 配置
   */
  async deleteSkillConfig(skillKey: string): Promise<void> {
    const config = await this.load();

    if (config.entries?.[skillKey]) {
      delete config.entries[skillKey];
      await this.save(config);
    }
  }

  /**
   * 设置允许的内置 Skill 列表
   */
  async setAllowBundled(allowBundled: string[]): Promise<void> {
    const config = await this.load();
    config.allowBundled = allowBundled;
    await this.save(config);
  }

  /**
   * 添加额外 Skill 目录
   */
  async addExtraDir(dir: string): Promise<void> {
    const config = await this.load();

    if (!config.load) {
      config.load = {};
    }

    if (!config.load.extraDirs) {
      config.load.extraDirs = [];
    }

    if (!config.load.extraDirs.includes(dir)) {
      config.load.extraDirs.push(dir);
      await this.save(config);
    }
  }

  /**
   * 移除额外 Skill 目录
   */
  async removeExtraDir(dir: string): Promise<void> {
    const config = await this.load();

    if (config.load?.extraDirs) {
      config.load.extraDirs = config.load.extraDirs.filter(d => d !== dir);
      await this.save(config);
    }
  }

  /**
   * 设置文件监视
   */
  async setWatch(enabled: boolean, debounceMs?: number): Promise<void> {
    const config = await this.load();

    if (!config.load) {
      config.load = {};
    }

    config.load.watch = enabled;

    if (debounceMs !== undefined) {
      config.load.watchDebounceMs = debounceMs;
    }

    await this.save(config);
  }

  // ============================================================================
  // Config Validation
  // ============================================================================

  /**
   * 验证配置
   */
  validate(config: unknown): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!config || typeof config !== 'object') {
      return { valid: false, errors: ['Config must be an object'] };
    }

    const c = config as Record<string, unknown>;

    // 验证 allowBundled
    if (c.allowBundled !== undefined) {
      if (!Array.isArray(c.allowBundled) || !c.allowBundled.every(item => typeof item === 'string')) {
        errors.push('allowBundled must be an array of strings');
      }
    }

    // 验证 load
    if (c.load !== undefined) {
      if (typeof c.load !== 'object' || c.load === null) {
        errors.push('load must be an object');
      } else {
        const load = c.load as Record<string, unknown>;

        if (load.extraDirs !== undefined) {
          if (!Array.isArray(load.extraDirs) || !load.extraDirs.every(item => typeof item === 'string')) {
            errors.push('load.extraDirs must be an array of strings');
          }
        }

        if (load.watch !== undefined && typeof load.watch !== 'boolean') {
          errors.push('load.watch must be a boolean');
        }

        if (load.watchDebounceMs !== undefined) {
          if (typeof load.watchDebounceMs !== 'number' || load.watchDebounceMs < 0) {
            errors.push('load.watchDebounceMs must be a non-negative number');
          }
        }
      }
    }

    // 验证 install
    if (c.install !== undefined) {
      if (typeof c.install !== 'object' || c.install === null) {
        errors.push('install must be an object');
      } else {
        const install = c.install as Record<string, unknown>;

        if (install.nodeManager !== undefined) {
          const validManagers = ['npm', 'yarn', 'pnpm'];
          if (!validManagers.includes(install.nodeManager as string)) {
            errors.push(`install.nodeManager must be one of: ${validManagers.join(', ')}`);
          }
        }
      }
    }

    // 验证 entries
    if (c.entries !== undefined) {
      if (typeof c.entries !== 'object' || c.entries === null) {
        errors.push('entries must be an object');
      } else {
        const entries = c.entries as Record<string, unknown>;

        for (const [key, value] of Object.entries(entries)) {
          if (typeof value !== 'object' || value === null) {
            errors.push(`entries.${key} must be an object`);
            continue;
          }

          const entry = value as Record<string, unknown>;

          if (entry.enabled !== undefined && typeof entry.enabled !== 'boolean') {
            errors.push(`entries.${key}.enabled must be a boolean`);
          }

          if (entry.apiKey !== undefined && typeof entry.apiKey !== 'string') {
            errors.push(`entries.${key}.apiKey must be a string`);
          }

          if (entry.env !== undefined) {
            if (typeof entry.env !== 'object' || entry.env === null) {
              errors.push(`entries.${key}.env must be an object`);
            } else {
              for (const [envKey, envValue] of Object.entries(entry.env)) {
                if (typeof envValue !== 'string') {
                  errors.push(`entries.${key}.env.${envKey} must be a string`);
                }
              }
            }
          }
        }
      }
    }

    return { valid: errors.length === 0, errors };
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  /**
   * 规范化配置
   */
  private normalizeConfig(config: unknown): SkillsConfig {
    if (!config || typeof config !== 'object') {
      return this.getDefaultConfig();
    }

    const c = config as Record<string, unknown>;

    return {
      allowBundled: Array.isArray(c.allowBundled) ? c.allowBundled : undefined,
      load: this.normalizeLoadConfig(c.load),
      install: this.normalizeInstallConfig(c.install),
      entries: this.normalizeEntriesConfig(c.entries),
    };
  }

  /**
   * 规范化加载配置
   */
  private normalizeLoadConfig(load: unknown): SkillsConfig['load'] {
    if (!load || typeof load !== 'object') {
      return undefined;
    }

    const l = load as Record<string, unknown>;

    return {
      extraDirs: Array.isArray(l.extraDirs) ? l.extraDirs.filter((d): d is string => typeof d === 'string') : undefined,
      watch: typeof l.watch === 'boolean' ? l.watch : undefined,
      watchDebounceMs: typeof l.watchDebounceMs === 'number' ? l.watchDebounceMs : undefined,
    };
  }

  /**
   * 规范化安装配置
   */
  private normalizeInstallConfig(install: unknown): SkillsConfig['install'] {
    if (!install || typeof install !== 'object') {
      return undefined;
    }

    const i = install as Record<string, unknown>;
    const validManagers = ['npm', 'yarn', 'pnpm'];

    return {
      nodeManager: validManagers.includes(i.nodeManager as string) ? (i.nodeManager as 'npm' | 'yarn' | 'pnpm') : undefined,
    };
  }

  /**
   * 规范化条目配置
   */
  private normalizeEntriesConfig(entries: unknown): SkillsConfig['entries'] {
    if (!entries || typeof entries !== 'object') {
      return undefined;
    }

    const result: SkillsConfig['entries'] = {};

    for (const [key, value] of Object.entries(entries as Record<string, unknown>)) {
      if (typeof value !== 'object' || value === null) {
        continue;
      }

      const e = value as Record<string, unknown>;

      const envEntries = typeof e.env === 'object' && e.env !== null
        ? Object.entries(e.env as Record<string, unknown>).filter(([, v]) => typeof v === 'string')
        : [];
      const env = envEntries.length > 0
        ? Object.fromEntries(envEntries as [string, string][])
        : undefined;

      result[key] = {
        enabled: typeof e.enabled === 'boolean' ? e.enabled : undefined,
        apiKey: typeof e.apiKey === 'string' ? e.apiKey : undefined,
        env,
        config: typeof e.config === 'object' && e.config !== null ? (e.config as Record<string, unknown>) : undefined,
      };
    }

    return Object.keys(result).length > 0 ? result : undefined;
  }

  /**
   * 获取默认配置
   */
  private getDefaultConfig(): SkillsConfig {
    return {
      load: {
        watch: true,
        watchDebounceMs: 250,
      },
      install: {
        nodeManager: 'npm',
      },
    };
  }
}

// ============================================================================
// Factory
// ============================================================================

export function createSkillConfigManager(customPath?: string): SkillConfigManager {
  return new SkillConfigManager(customPath);
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * 获取默认配置路径
 */
export function getDefaultConfigPath(): string {
  const homeDir = process.env.HOME || process.env.USERPROFILE || process.cwd();
  return path.join(homeDir, CONFIG_DIR_NAME, CONFIG_FILE_NAME);
}

/**
 * 检查配置文件是否存在
 */
export async function configExists(customPath?: string): Promise<boolean> {
  const configPath = customPath || getDefaultConfigPath();
  try {
    await access(configPath, fs.constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

/**
 * 创建默认配置文件
 */
export async function createDefaultConfig(customPath?: string): Promise<void> {
  const manager = new SkillConfigManager(customPath);
  await manager.save(manager['getDefaultConfig']());
}
