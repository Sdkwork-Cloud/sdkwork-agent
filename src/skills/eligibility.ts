/**
 * Skill Eligibility Checker - Skill 资格检查系统
 *
 * 基于 OpenClaw 架构的多维度资格判定
 *
 * @module EligibilityChecker
 * @version 5.0.0
 */

import * as fs from 'fs';
import * as path from 'path';
import type {
  SkillEntry,
  EligibilityContext,
  EligibilityResult,
  SkillsConfig,
  SkillConfig,
  RemoteEligibility,
} from './types.js';

// ============================================================================
// Constants
// ============================================================================

/** 平台映射 */
const PLATFORM_MAP: Record<string, string> = {
  win32: 'win32',
  darwin: 'darwin',
  linux: 'linux',
  freebsd: 'linux',
  openbsd: 'linux',
};

// ============================================================================
// Eligibility Checker
// ============================================================================

export class SkillEligibilityChecker {
  private platform: string;
  private env: Record<string, string | undefined>;

  constructor(private config?: SkillsConfig) {
    this.platform = PLATFORM_MAP[process.platform] || process.platform;
    this.env = process.env;
  }

  /**
   * 检查 Skill 是否符合条件
   */
  check(entry: SkillEntry, context?: Partial<EligibilityContext>): EligibilityResult {
    const ctx: EligibilityContext = {
      platform: context?.platform || this.platform,
      env: context?.env || this.env,
      config: context?.config,
      remote: context?.remote,
    };

    const skillKey = this.resolveSkillKey(entry);
    const skillConfig = this.resolveSkillConfig(skillKey);

    // 1. 检查是否被显式禁用
    if (skillConfig?.enabled === false) {
      return {
        eligible: false,
        reason: `Skill '${entry.skill.name}' is disabled in config`,
      };
    }

    // 2. 检查白名单限制（仅针对捆绑 Skill）
    if (!this.isBundledSkillAllowed(entry)) {
      return {
        eligible: false,
        reason: `Skill '${entry.skill.name}' is not in the allowBundled list`,
      };
    }

    // 3. 检查 always 标志（跳过其他检查）
    if (entry.metadata?.always === true) {
      return { eligible: true };
    }

    // 4. 检查操作系统兼容性
    const osCheck = this.checkPlatformCompatibility(entry, ctx);
    if (!osCheck.eligible) return osCheck;

    // 5. 检查必需的二进制文件
    const binsCheck = this.checkRequiredBins(entry, ctx);
    if (!binsCheck.eligible) return binsCheck;

    // 6. 检查任一必需的二进制文件
    const anyBinsCheck = this.checkRequiredAnyBins(entry, ctx);
    if (!anyBinsCheck.eligible) return anyBinsCheck;

    // 7. 检查必需的环境变量
    const envCheck = this.checkRequiredEnv(entry, ctx, skillConfig);
    if (!envCheck.eligible) return envCheck;

    // 8. 检查必需的配置路径
    const configCheck = this.checkRequiredConfig(entry, ctx);
    if (!configCheck.eligible) return configCheck;

    return { eligible: true };
  }

  /**
   * 批量检查多个 Skill
   */
  checkMany(entries: SkillEntry[], context?: Partial<EligibilityContext>): Map<SkillEntry, EligibilityResult> {
    const results = new Map<SkillEntry, EligibilityResult>();
    for (const entry of entries) {
      results.set(entry, this.check(entry, context));
    }
    return results;
  }

  /**
   * 过滤符合条件的 Skill
   */
  filter(entries: SkillEntry[], context?: Partial<EligibilityContext>): SkillEntry[] {
    return entries.filter(entry => this.check(entry, context).eligible);
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  /**
   * 解析 Skill Key
   */
  private resolveSkillKey(entry: SkillEntry): string {
    return entry.metadata?.skillKey || entry.skill.name;
  }

  /**
   * 解析 Skill 配置
   */
  private resolveSkillConfig(skillKey: string): SkillConfig | undefined {
    return this.config?.entries?.[skillKey];
  }

  /**
   * 检查捆绑 Skill 白名单
   */
  private isBundledSkillAllowed(entry: SkillEntry): boolean {
    if (entry.source !== 'openclaw-bundled') {
      return true;
    }

    const allowBundled = this.config?.allowBundled;
    if (!allowBundled || allowBundled.length === 0) {
      return true;
    }

    return allowBundled.includes(entry.skill.name);
  }

  /**
   * 检查平台兼容性
   */
  private checkPlatformCompatibility(
    entry: SkillEntry,
    ctx: EligibilityContext
  ): EligibilityResult {
    const osList = entry.metadata?.os || [];

    if (osList.length === 0) {
      return { eligible: true };
    }

    const currentPlatform = ctx.platform;
    const remotePlatforms = ctx.remote?.platforms || [];

    // 检查本地平台
    if (osList.includes(currentPlatform)) {
      return { eligible: true };
    }

    // 检查远程平台
    if (remotePlatforms.some(p => osList.includes(p))) {
      return { eligible: true };
    }

    return {
      eligible: false,
      reason: `Skill '${entry.skill.name}' requires platform: ${osList.join(', ')}, current: ${currentPlatform}`,
      unsupportedPlatform: true,
    };
  }

  /**
   * 检查必需的二进制文件
   */
  private checkRequiredBins(
    entry: SkillEntry,
    ctx: EligibilityContext
  ): EligibilityResult {
    const requiredBins = entry.metadata?.requires?.bins || [];
    if (requiredBins.length === 0) {
      return { eligible: true };
    }

    const missingBins: string[] = [];

    for (const bin of requiredBins) {
      const hasLocal = this.hasBinary(bin);
      const hasRemote = ctx.remote?.hasBin?.(bin) || false;

      if (!hasLocal && !hasRemote) {
        missingBins.push(bin);
      }
    }

    if (missingBins.length > 0) {
      return {
        eligible: false,
        reason: `Missing required binaries: ${missingBins.join(', ')}`,
        missingBins,
      };
    }

    return { eligible: true };
  }

  /**
   * 检查任一必需的二进制文件
   */
  private checkRequiredAnyBins(
    entry: SkillEntry,
    ctx: EligibilityContext
  ): EligibilityResult {
    const requiredAnyBins = entry.metadata?.requires?.anyBins || [];
    if (requiredAnyBins.length === 0) {
      return { eligible: true };
    }

    const hasLocal = requiredAnyBins.some(bin => this.hasBinary(bin));
    const hasRemote = ctx.remote?.hasAnyBin?.(requiredAnyBins) || false;

    if (!hasLocal && !hasRemote) {
      return {
        eligible: false,
        reason: `Requires at least one of: ${requiredAnyBins.join(', ')}`,
        missingBins: requiredAnyBins,
      };
    }

    return { eligible: true };
  }

  /**
   * 检查必需的环境变量
   */
  private checkRequiredEnv(
    entry: SkillEntry,
    ctx: EligibilityContext,
    skillConfig?: SkillConfig
  ): EligibilityResult {
    const requiredEnv = entry.metadata?.requires?.env || [];
    if (requiredEnv.length === 0) {
      return { eligible: true };
    }

    const missingEnv: string[] = [];
    const primaryEnv = entry.metadata?.primaryEnv;

    for (const envName of requiredEnv) {
      // 检查环境变量
      if (ctx.env[envName]) {
        continue;
      }

      // 检查配置中的环境变量
      if (skillConfig?.env?.[envName]) {
        continue;
      }

      // 检查 API Key 作为主环境变量
      if (primaryEnv === envName && skillConfig?.apiKey) {
        continue;
      }

      missingEnv.push(envName);
    }

    if (missingEnv.length > 0) {
      return {
        eligible: false,
        reason: `Missing required environment variables: ${missingEnv.join(', ')}`,
        missingEnv,
      };
    }

    return { eligible: true };
  }

  /**
   * 检查必需的配置路径
   */
  private checkRequiredConfig(
    entry: SkillEntry,
    ctx: EligibilityContext
  ): EligibilityResult {
    const requiredConfig = entry.metadata?.requires?.config || [];
    if (requiredConfig.length === 0) {
      return { eligible: true };
    }

    const missingConfig: string[] = [];

    for (const configPath of requiredConfig) {
      if (!this.isConfigPathTruthy(ctx.config, configPath)) {
        missingConfig.push(configPath);
      }
    }

    if (missingConfig.length > 0) {
      return {
        eligible: false,
        reason: `Missing required config: ${missingConfig.join(', ')}`,
        missingConfig,
      };
    }

    return { eligible: true };
  }

  /**
   * 检查系统 PATH 中是否存在指定二进制文件
   */
  private hasBinary(bin: string): boolean {
    const pathEnv = this.env.PATH || '';
    const parts = pathEnv.split(path.delimiter).filter(Boolean);

    // Windows 可执行文件扩展名
    const extensions = process.platform === 'win32' ? ['.exe', '.cmd', '.bat', ''] : [''];

    for (const part of parts) {
      for (const ext of extensions) {
        const candidate = path.join(part, bin + ext);
        try {
          fs.accessSync(candidate, fs.constants.X_OK);
          return true;
        } catch {
          continue;
        }
      }
    }

    return false;
  }

  /**
   * 检查配置路径是否存在且为真值
   */
  private isConfigPathTruthy(config: unknown, pathStr: string): boolean {
    if (!config || typeof config !== 'object') {
      return false;
    }

    const parts = pathStr.split('.');
    let current: unknown = config;

    for (const part of parts) {
      if (current === null || current === undefined) {
        return false;
      }
      current = (current as Record<string, unknown>)[part];
    }

    return Boolean(current);
  }
}

// ============================================================================
// Factory
// ============================================================================

export function createEligibilityChecker(config?: SkillsConfig): SkillEligibilityChecker {
  return new SkillEligibilityChecker(config);
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * 快速检查单个 Skill 是否符合条件
 */
export function isEligible(
  entry: SkillEntry,
  config?: SkillsConfig,
  context?: Partial<EligibilityContext>
): boolean {
  const checker = new SkillEligibilityChecker(config);
  return checker.check(entry, context).eligible;
}

/**
 * 获取当前平台标识符
 */
export function getCurrentPlatform(): string {
  return PLATFORM_MAP[process.platform] || process.platform;
}

/**
 * 检查远程资格
 */
export function checkRemoteEligibility(
  remoteNodes: Array<{
    platform: string;
    deviceFamily?: string;
    commands: string[];
    bins: string[];
  }>
): RemoteEligibility | undefined {
  const macNodes = remoteNodes.filter(
    node =>
      (node.platform === 'darwin' || node.deviceFamily?.includes('mac')) &&
      node.commands.includes('system:run')
  );

  if (macNodes.length === 0) {
    return undefined;
  }

  const bins = new Set<string>();
  for (const node of macNodes) {
    for (const bin of node.bins) {
      bins.add(bin);
    }
  }

  return {
    platforms: ['darwin'],
    hasBin: (bin: string) => bins.has(bin),
    hasAnyBin: (required: string[]) => required.some(bin => bins.has(bin)),
    note: `Remote macOS node available with ${bins.size} binaries`,
  };
}
