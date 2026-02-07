/**
 * Skill Snapshot Manager
 *
 * 基于 OpenClaw 架构的技能快照管理器
 * 实现会话级技能缓存，避免重复加载
 *
 * 核心特性：
 * - 会话开始时创建技能快照
 * - 版本控制支持热更新
 * - 资格过滤确保环境一致性
 * - 为 LLM 生成标准化提示词
 *
 * @module SkillSnapshotManager
 * @version 1.0.0
 */

import { EventEmitter } from '../../utils/event-emitter.js';
import {
  SkillEntry,
  SkillSnapshot,
  SkillsConfig,
  SkillEligibilityContext,
  SkillSystemEvent,
  SnapshotVersionManager,
} from './openclaw-types.js';
import { Logger } from './types.js';

/**
 * 快照管理器配置
 */
export interface SnapshotManagerConfig {
  /** 工作区目录 */
  workspaceDir: string;
  /** 技能配置 */
  skillsConfig?: SkillsConfig;
  /** 日志器 */
  logger?: Logger;
  /** 初始版本 */
  initialVersion?: number;
}

/**
 * 快照缓存条目
 */
interface SnapshotCacheEntry {
  snapshot: SkillSnapshot;
  createdAt: Date;
  accessCount: number;
}

/**
 * 技能快照管理器
 *
 * 实现 OpenClaw 的 buildWorkspaceSkillSnapshot 机制：
 * 1. 加载所有技能条目
 * 2. 过滤符合条件的技能
 * 3. 生成 LLM 提示词
 * 4. 版本管理支持热更新
 */
export class SkillSnapshotManager extends EventEmitter implements SnapshotVersionManager {
  private config: Required<SnapshotManagerConfig>;
  private cache: Map<string, SnapshotCacheEntry> = new Map();
  private versionMap: Map<string, number> = new Map();

  constructor(config: SnapshotManagerConfig) {
    super();
    this.config = {
      skillsConfig: {},
      logger: this.createDefaultLogger(),
      initialVersion: 1,
      ...config,
    };

    // 初始化版本
    this.versionMap.set(config.workspaceDir, this.config.initialVersion);
  }

  /**
   * 构建技能快照
   *
   * 这是核心方法，实现 OpenClaw 的 buildWorkspaceSkillSnapshot 逻辑：
   * 1. 获取所有技能条目
   * 2. 过滤符合条件的技能
   * 3. 生成 LLM 提示词
   * 4. 创建快照对象
   */
  async buildSnapshot(
    entries: SkillEntry[],
    eligibility?: SkillEligibilityContext,
    skillFilter?: string[]
  ): Promise<SkillSnapshot> {
    const buildStartTime = Date.now();
    const workspaceDir = this.config.workspaceDir;

    this.config.logger.debug(`Building skill snapshot for ${workspaceDir}`);

    // 1. 过滤符合条件的技能
    const eligibleEntries = this.filterEligibleEntries(entries, eligibility, skillFilter);

    // 2. 过滤掉禁用模型调用的技能
    const promptEntries = eligibleEntries.filter(
      entry => entry.invocation?.disableModelInvocation !== true
    );

    // 3. 生成 LLM 提示词
    const prompt = this.formatSkillsForPrompt(promptEntries, eligibility?.remote?.note);

    // 4. 创建快照
    const version = this.getVersion(workspaceDir);
    const snapshot: SkillSnapshot = {
      prompt,
      skills: eligibleEntries.map(entry => ({
        name: entry.name,
        primaryEnv: entry.metadata?.primaryEnv,
      })),
      entries: eligibleEntries,
      version,
      createdAt: new Date(),
    };

    // 5. 缓存快照
    this.cache.set(workspaceDir, {
      snapshot,
      createdAt: new Date(),
      accessCount: 1,
    });

    const duration = Date.now() - buildStartTime;
    this.config.logger.info(
      `Built skill snapshot v${version} with ${eligibleEntries.length} skills in ${duration}ms`
    );

    // 6. 触发事件
    this.emit('snapshot:created' as SkillSystemEvent['type'], {
      type: 'snapshot:created',
      version,
      skillCount: eligibleEntries.length,
    });

    return snapshot;
  }

  /**
   * 获取缓存的快照
   */
  getCachedSnapshot(workspaceDir: string): SkillSnapshot | undefined {
    const cached = this.cache.get(workspaceDir);
    if (cached) {
      cached.accessCount++;
      return cached.snapshot;
    }
    return undefined;
  }

  /**
   * 获取当前版本
   */
  getVersion(workspaceDir: string): number {
    return this.versionMap.get(workspaceDir) ?? this.config.initialVersion;
  }

  /**
   * 递增版本
   *
   * 当技能文件发生变化时调用，触发快照重建
   */
  bumpVersion(workspaceDir: string, reason: string, _changedPath?: string): number {
    const currentVersion = this.getVersion(workspaceDir);
    const newVersion = currentVersion + 1;

    this.versionMap.set(workspaceDir, newVersion);

    // 清除缓存，强制重建
    this.cache.delete(workspaceDir);

    this.config.logger.debug(
      `Bumped snapshot version for ${workspaceDir}: ${currentVersion} -> ${newVersion} (${reason})`
    );

    // 触发事件
    this.emit('snapshot:updated' as SkillSystemEvent['type'], {
      type: 'snapshot:updated',
      version: newVersion,
      reason,
    });

    return newVersion;
  }

  /**
   * 过滤符合条件的技能条目
   *
   * 实现 OpenClaw 的 shouldIncludeSkill 逻辑：
   * 1. 检查配置中是否禁用
   * 2. 检查内置技能许可
   * 3. 检查操作系统兼容性
   * 4. 检查二进制依赖
   * 5. 检查环境变量
   * 6. 检查配置路径
   */
  private filterEligibleEntries(
    entries: SkillEntry[],
    eligibility?: SkillEligibilityContext,
    skillFilter?: string[]
  ): SkillEntry[] {
    const results: SkillEntry[] = [];

    for (const entry of entries) {
      const result = this.checkEligibility(entry, eligibility, skillFilter);

      // 触发资格检查事件
      this.emit('eligibility:check' as SkillSystemEvent['type'], {
        type: 'eligibility:check',
        skillName: entry.name,
        eligible: result.eligible,
        reason: result.reason,
      });

      if (result.eligible) {
        results.push(entry);
      } else {
        this.config.logger.debug(`Skill "${entry.name}" excluded: ${result.reason}`);
      }
    }

    return results;
  }

  /**
   * 检查技能资格
   */
  private checkEligibility(
    entry: SkillEntry,
    eligibility?: SkillEligibilityContext,
    skillFilter?: string[]
  ): { eligible: boolean; reason?: string } {
    const skillKey = this.resolveSkillKey(entry);
    const skillConfig = this.config.skillsConfig?.skills?.[skillKey];

    // 1. 检查是否在过滤列表中
    if (skillFilter && !skillFilter.includes(entry.name)) {
      return { eligible: false, reason: 'Not in skill filter' };
    }

    // 2. 检查配置中是否禁用
    if (skillConfig?.enabled === false) {
      return { eligible: false, reason: 'Disabled in config' };
    }

    // 3. 检查操作系统兼容性
    const osList = entry.metadata?.os ?? [];
    if (osList.length > 0) {
      const currentPlatform = eligibility?.currentPlatform || this.resolveRuntimePlatform();
      const remotePlatforms = eligibility?.remote?.platforms ?? [];

      const isCompatible =
        osList.includes(currentPlatform) ||
        remotePlatforms.some(platform => osList.includes(platform));

      if (!isCompatible) {
        return {
          eligible: false,
          reason: `OS incompatible: requires ${osList.join(', ')}, current: ${currentPlatform}`,
        };
      }
    }

    // 4. 检查 always 标志
    if (entry.metadata?.always === true) {
      return { eligible: true };
    }

    // 5. 检查二进制依赖
    const requiredBins = entry.metadata?.requires?.bins ?? [];
    for (const bin of requiredBins) {
      const hasBin = this.hasBinary(bin) || eligibility?.remote?.hasBin?.(bin);
      if (!hasBin) {
        return { eligible: false, reason: `Missing required binary: ${bin}` };
      }
    }

    // 6. 检查任一二进制依赖
    const requiredAnyBins = entry.metadata?.requires?.anyBins ?? [];
    if (requiredAnyBins.length > 0) {
      const anyFound =
        requiredAnyBins.some(bin => this.hasBinary(bin)) ||
        eligibility?.remote?.hasAnyBin?.(requiredAnyBins);

      if (!anyFound) {
        return {
          eligible: false,
          reason: `Missing any of required binaries: ${requiredAnyBins.join(', ')}`,
        };
      }
    }

    // 7. 检查环境变量
    const requiredEnv = entry.metadata?.requires?.env ?? [];
    for (const envName of requiredEnv) {
      const hasEnv =
        process.env[envName] ||
        skillConfig?.env?.[envName] ||
        (skillConfig?.apiKey && entry.metadata?.primaryEnv === envName);

      if (!hasEnv) {
        return { eligible: false, reason: `Missing required env var: ${envName}` };
      }
    }

    // 8. 检查配置路径
    const requiredConfig = entry.metadata?.requires?.config ?? [];
    for (const configPath of requiredConfig) {
      if (!this.isConfigPathTruthy(configPath)) {
        return { eligible: false, reason: `Missing required config: ${configPath}` };
      }
    }

    return { eligible: true };
  }

  /**
   * 为 LLM 生成技能提示词
   */
  private formatSkillsForPrompt(entries: SkillEntry[], remoteNote?: string): string {
    const lines: string[] = [];

    if (remoteNote) {
      lines.push(remoteNote);
      lines.push('');
    }

    if (entries.length === 0) {
      lines.push('No skills available.');
      return lines.join('\n');
    }

    lines.push('## Available Skills');
    lines.push('');

    for (const entry of entries) {
      const emoji = entry.metadata?.emoji ? `${entry.metadata.emoji} ` : '';
      lines.push(`### ${emoji}${entry.name}`);
      lines.push(entry.description);

      // 添加兼容性信息
      if (entry.frontmatter.compatibility) {
        lines.push(`*Compatibility: ${entry.frontmatter.compatibility}*`);
      }

      lines.push('');
    }

    return lines.join('\n');
  }

  /**
   * 解析技能键名
   */
  private resolveSkillKey(entry: SkillEntry): string {
    return entry.metadata?.skillKey || entry.name;
  }

  /**
   * 解析运行时平台
   */
  private resolveRuntimePlatform(): string {
    const platform = process.platform;
    switch (platform) {
      case 'win32':
        return 'windows';
      case 'darwin':
        return 'macos';
      case 'linux':
        return 'linux';
      default:
        return platform;
    }
  }

  /**
   * 检查二进制是否存在
   */
  private hasBinary(bin: string): boolean {
    // 简化实现，实际应使用 which/where 命令检查
    try {
      const { execSync } = require('node:child_process');
      const cmd = process.platform === 'win32' ? `where ${bin}` : `which ${bin}`;
      execSync(cmd, { stdio: 'ignore' });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * 检查配置路径是否为真
   */
  private isConfigPathTruthy(configPath: string): boolean {
    // 简化实现，实际应解析嵌套路径
    const parts = configPath.split('.');
    let current: unknown = this.config.skillsConfig;

    for (const part of parts) {
      if (current && typeof current === 'object') {
        current = (current as Record<string, unknown>)[part];
      } else {
        return false;
      }
    }

    return Boolean(current);
  }

  /**
   * 清除缓存
   */
  clearCache(workspaceDir?: string): void {
    if (workspaceDir) {
      this.cache.delete(workspaceDir);
      this.config.logger.debug(`Cleared snapshot cache for ${workspaceDir}`);
    } else {
      this.cache.clear();
      this.config.logger.debug('Cleared all snapshot caches');
    }
  }

  /**
   * 获取缓存统计
   */
  getCacheStats(): {
    totalCaches: number;
    totalAccesses: number;
  } {
    let totalAccesses = 0;
    for (const entry of this.cache.values()) {
      totalAccesses += entry.accessCount;
    }

    return {
      totalCaches: this.cache.size,
      totalAccesses,
    };
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
 * 创建快照管理器
 */
export function createSnapshotManager(config: SnapshotManagerConfig): SkillSnapshotManager {
  return new SkillSnapshotManager(config);
}
