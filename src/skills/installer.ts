/**
 * Skill Installer - Skill 安装系统
 *
 * 支持 brew/node/go/uv/download 多种安装方式
 *
 * @module SkillInstaller
 * @version 5.0.0
 */

import * as fs from 'fs';
import * as path from 'path';
import { spawn } from 'child_process';
import { promisify } from 'util';
import type {
  SkillEntry,
  SkillInstallSpec,
  InstallKind,
  SkillsConfig,
  SecurityScanResult,
} from './types.js';
import { SkillSecurityScanner } from './security.js';

const mkdir = promisify(fs.mkdir);
const writeFile = promisify(fs.writeFile);

// ============================================================================
// Types
// ============================================================================

export interface InstallResult {
  ok: boolean;
  message: string;
  stdout?: string;
  stderr?: string;
  code?: number;
  warnings?: SecurityScanResult['warnings'];
}

export interface InstallOptions {
  timeoutMs?: number;
  env?: Record<string, string>;
  skipSecurityScan?: boolean;
}

// ============================================================================
// Skill Installer
// ============================================================================

export class SkillInstaller {
  private securityScanner: SkillSecurityScanner;

  constructor(
    private config?: SkillsConfig,
    private logger?: {
      debug: (msg: string, meta?: Record<string, unknown>) => void;
      info: (msg: string, meta?: Record<string, unknown>) => void;
      warn: (msg: string, meta?: Record<string, unknown>) => void;
      error: (msg: string, meta?: Record<string, unknown>, err?: Error) => void;
    }
  ) {
    this.securityScanner = new SkillSecurityScanner();
  }

  /**
   * 安装 Skill
   */
  async install(
    entry: SkillEntry,
    installId?: string,
    options: InstallOptions = {}
  ): Promise<InstallResult> {
    const timeoutMs = this.clamp(options.timeoutMs ?? 300_000, 1_000, 900_000);

    // 查找安装规范
    const spec = this.findInstallSpec(entry, installId);

    // 安全扫描
    if (!options.skipSecurityScan && entry.skill.filePath) {
      const scanResult = await this.scanSkill(entry);
      if (!scanResult.passed) {
        return this.withWarnings(
          {
            ok: false,
            message: 'Security scan failed',
            code: -1,
          },
          scanResult.warnings
        );
      }
    }

    if (!spec) {
      return {
        ok: false,
        message: `Installer not found: ${installId || 'default'}`,
        code: -1,
      };
    }

    // 处理下载类型
    if (spec.kind === 'download') {
      return this.installDownloadSpec(entry, spec, timeoutMs, options);
    }

    // 构建安装命令
    const command = this.buildInstallCommand(spec);

    if (command.error) {
      return {
        ok: false,
        message: command.error,
        code: -1,
      };
    }

    // 检查并安装依赖工具
    const depCheck = await this.checkAndInstallDependencies(spec, timeoutMs);
    if (!depCheck.ok) {
      return depCheck;
    }

    // 执行安装
    if (!command.argv) {
      return {
        ok: false,
        message: 'Failed to build install command',
        code: -1,
      };
    }

    const result = await this.runCommandWithTimeout(command.argv, {
      timeoutMs,
      env: options.env,
    });

    const success = result.code === 0;

    return {
      ok: success,
      message: success ? 'Installed successfully' : this.formatInstallFailureMessage(result),
      stdout: result.stdout?.trim(),
      stderr: result.stderr?.trim(),
      code: result.code,
    };
  }

  /**
   * 卸载 Skill
   */
  async uninstall(entry: SkillEntry): Promise<InstallResult> {
    // 删除 Skill 目录
    if (entry.skill.baseDir) {
      try {
        await fs.promises.rm(entry.skill.baseDir, { recursive: true, force: true });
        return {
          ok: true,
          message: `Skill '${entry.skill.name}' uninstalled successfully`,
        };
      } catch (error) {
        return {
          ok: false,
          message: `Failed to uninstall: ${(error as Error).message}`,
          code: -1,
        };
      }
    }

    return {
      ok: false,
      message: 'Skill base directory not found',
      code: -1,
    };
  }

  /**
   * 检查 Skill 是否已安装
   */
  isInstalled(entry: SkillEntry): boolean {
    const requiredBins = entry.metadata?.install?.flatMap(i => i.bins || []) || [];

    if (requiredBins.length === 0) {
      // 没有指定二进制文件，检查目录是否存在
      return entry.skill.baseDir ? fs.existsSync(entry.skill.baseDir) : false;
    }

    // 检查所有必需的二进制文件是否存在
    return requiredBins.every(bin => this.hasBinary(bin));
  }

  /**
   * 获取可用的安装选项
   */
  getInstallOptions(entry: SkillEntry): SkillInstallSpec[] {
    return entry.metadata?.install || [];
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  /**
   * 查找安装规范
   */
  private findInstallSpec(
    entry: SkillEntry,
    installId?: string
  ): SkillInstallSpec | undefined {
    const specs = entry.metadata?.install || [];

    if (installId) {
      return specs.find(s => s.id === installId);
    }

    // 返回第一个匹配当前平台的安装规范
    const platform = this.getCurrentPlatform();
    return specs.find(s => !s.os || s.os.includes(platform)) || specs[0];
  }

  /**
   * 安全扫描 Skill
   */
  private async scanSkill(entry: SkillEntry): Promise<SecurityScanResult> {
    if (!entry.skill.filePath) {
      return { passed: true, warnings: [], criticalCount: 0, highCount: 0, mediumCount: 0, lowCount: 0 };
    }

    try {
      const content = await fs.promises.readFile(entry.skill.filePath, 'utf-8');
      return this.securityScanner.scan(content, entry.skill.filePath);
    } catch {
      return { passed: true, warnings: [], criticalCount: 0, highCount: 0, mediumCount: 0, lowCount: 0 };
    }
  }

  /**
   * 安装下载类型
   */
  private async installDownloadSpec(
    entry: SkillEntry,
    spec: SkillInstallSpec,
    timeoutMs: number,
    options: InstallOptions
  ): Promise<InstallResult> {
    const url = spec.url?.trim();

    if (!url) {
      return {
        ok: false,
        message: 'Missing download URL',
        code: -1,
      };
    }

    // 提取文件名
    let filename: string;
    try {
      const parsed = new URL(url);
      filename = path.basename(parsed.pathname);
    } catch {
      filename = path.basename(url);
    }

    if (!filename) {
      filename = 'download';
    }

    const targetDir = this.resolveDownloadTargetDir(entry, spec);
    await mkdir(targetDir, { recursive: true });

    const archivePath = path.join(targetDir, filename);

    // 下载文件
    try {
      await this.downloadFile(url, archivePath, timeoutMs);
    } catch (error) {
      return {
        ok: false,
        message: `Download failed: ${(error as Error).message}`,
        code: -1,
      };
    }

    // 判断是否需要解压
    const archiveType = this.resolveArchiveType(spec, filename);
    const shouldExtract = spec.extract ?? Boolean(archiveType);

    if (!shouldExtract) {
      return {
        ok: true,
        message: `Downloaded to ${archivePath}`,
        stdout: `downloaded: ${archivePath}`,
      };
    }

    if (!archiveType) {
      return {
        ok: false,
        message: 'Extract requested but archive type could not be detected',
        code: -1,
      };
    }

    // 解压
    const extractResult = await this.extractArchive({
      archivePath,
      archiveType,
      targetDir,
      stripComponents: spec.stripComponents,
      timeoutMs,
    });

    const success = extractResult.code === 0;

    return {
      ok: success,
      message: success
        ? `Downloaded and extracted to ${targetDir}`
        : this.formatInstallFailureMessage(extractResult),
      stdout: extractResult.stdout?.trim(),
      stderr: extractResult.stderr?.trim(),
      code: extractResult.code,
    };
  }

  /**
   * 构建安装命令
   */
  private buildInstallCommand(spec: SkillInstallSpec): { argv?: string[]; error?: string } {
    switch (spec.kind) {
      case 'brew':
        if (!spec.formula) {
          return { error: 'Missing formula for brew install' };
        }
        return { argv: ['brew', 'install', spec.formula] };

      case 'node':
        if (!spec.package) {
          return { error: 'Missing package for node install' };
        }
        const nodeManager = this.config?.install?.nodeManager || 'npm';
        return { argv: [nodeManager, 'install', '-g', spec.package] };

      case 'go':
        if (!spec.module) {
          return { error: 'Missing module for go install' };
        }
        return { argv: ['go', 'install', spec.module] };

      case 'uv':
        if (!spec.package) {
          return { error: 'Missing package for uv install' };
        }
        return { argv: ['uv', 'tool', 'install', spec.package] };

      default:
        return { error: `Unsupported install kind: ${spec.kind}` };
    }
  }

  /**
   * 检查并安装依赖工具
   */
  private async checkAndInstallDependencies(
    spec: SkillInstallSpec,
    timeoutMs: number
  ): Promise<InstallResult> {
    // 检查 brew
    if (spec.kind === 'brew' && !this.hasBinary('brew')) {
      return {
        ok: false,
        message: 'brew not installed. Please install Homebrew first.',
        code: -1,
      };
    }

    // 检查 uv，如果没有则尝试安装
    if (spec.kind === 'uv' && !this.hasBinary('uv')) {
      if (this.hasBinary('brew')) {
        this.logger?.info('[SkillInstaller] Installing uv via brew...');
        const result = await this.runCommandWithTimeout(['brew', 'install', 'uv'], {
          timeoutMs,
        });

        if (result.code !== 0) {
          return {
            ok: false,
            message: 'Failed to install uv (brew). Please install uv manually.',
            stderr: result.stderr,
            code: result.code,
          };
        }
      } else {
        return {
          ok: false,
          message: 'uv not installed. Please install uv or use brew.',
          code: -1,
        };
      }
    }

    return { ok: true, message: 'Dependencies OK' };
  }

  /**
   * 运行带超时的命令
   */
  private runCommandWithTimeout(
    argv: string[],
    options: { timeoutMs: number; env?: Record<string, string> }
  ): Promise<{ code: number; stdout?: string; stderr?: string }> {
    return new Promise((resolve) => {
      const { timeoutMs, env } = options;

      const child = spawn(argv[0], argv.slice(1), {
        env: env ? { ...process.env, ...env } : process.env,
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      let stdout = '';
      let stderr = '';
      let settled = false;

      child.stdout?.on('data', (data) => {
        stdout += data.toString();
      });

      child.stderr?.on('data', (data) => {
        stderr += data.toString();
      });

      // 超时处理
      const timer = setTimeout(() => {
        if (!settled) {
          settled = true;
          child.kill('SIGKILL');
          resolve({
            code: 124,
            stdout,
            stderr: stderr + '\n[Command timed out]',
          });
        }
      }, timeoutMs);

      child.on('close', (code) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        resolve({ code: code ?? 1, stdout, stderr });
      });

      child.on('error', (err) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        resolve({
          code: 1,
          stdout,
          stderr: stderr + '\n' + err.message,
        });
      });
    });
  }

  /**
   * 下载文件
   */
  private async downloadFile(url: string, targetPath: string, timeoutMs: number): Promise<void> {
    // 使用 curl 或 wget 下载
    const hasCurl = this.hasBinary('curl');
    const hasWget = this.hasBinary('wget');

    if (!hasCurl && !hasWget) {
      throw new Error('Neither curl nor wget is available');
    }

    const argv = hasCurl
      ? ['curl', '-L', '-o', targetPath, '--max-time', String(Math.floor(timeoutMs / 1000)), url]
      : ['wget', '-O', targetPath, '--timeout', String(Math.floor(timeoutMs / 1000)), url];

    const result = await this.runCommandWithTimeout(argv, { timeoutMs });

    if (result.code !== 0) {
      throw new Error(result.stderr || 'Download failed');
    }
  }

  /**
   * 解压归档
   */
  private async extractArchive(params: {
    archivePath: string;
    archiveType: string;
    targetDir: string;
    stripComponents?: number;
    timeoutMs: number;
  }): Promise<{ code: number; stdout?: string; stderr?: string }> {
    const { archivePath, archiveType, targetDir, stripComponents, timeoutMs } = params;

    let argv: string[];

    switch (archiveType) {
      case 'tar.gz':
      case 'tar.bz2':
      case 'tar.xz':
        argv = ['tar', '-xf', archivePath, '-C', targetDir];
        if (stripComponents) {
          argv.push('--strip-components', String(stripComponents));
        }
        break;

      case 'zip':
        argv = ['unzip', '-o', archivePath, '-d', targetDir];
        break;

      default:
        return {
          code: 1,
          stderr: `Unsupported archive type: ${archiveType}`,
        };
    }

    return this.runCommandWithTimeout(argv, { timeoutMs });
  }

  /**
   * 解析归档类型
   */
  private resolveArchiveType(spec: SkillInstallSpec, filename: string): string | undefined {
    if (spec.archive) {
      return spec.archive;
    }

    // 从文件名推断
    if (filename.endsWith('.tar.gz') || filename.endsWith('.tgz')) {
      return 'tar.gz';
    }
    if (filename.endsWith('.tar.bz2')) {
      return 'tar.bz2';
    }
    if (filename.endsWith('.tar.xz')) {
      return 'tar.xz';
    }
    if (filename.endsWith('.zip')) {
      return 'zip';
    }

    return undefined;
  }

  /**
   * 解析下载目标目录
   */
  private resolveDownloadTargetDir(entry: SkillEntry, spec: SkillInstallSpec): string {
    if (spec.targetDir) {
      if (path.isAbsolute(spec.targetDir)) {
        return spec.targetDir;
      }
      return path.join(entry.skill.baseDir || '', spec.targetDir);
    }

    return entry.skill.baseDir || path.join(process.cwd(), 'skills', entry.skill.name);
  }

  /**
   * 检查系统 PATH 中是否存在指定二进制文件
   */
  private hasBinary(bin: string): boolean {
    const pathEnv = process.env.PATH || '';
    const parts = pathEnv.split(path.delimiter).filter(Boolean);

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
   * 获取当前平台
   */
  private getCurrentPlatform(): string {
    const platformMap: Record<string, string> = {
      win32: 'win32',
      darwin: 'darwin',
      linux: 'linux',
    };
    return platformMap[process.platform] || process.platform;
  }

  /**
   * 数值限制
   */
  private clamp(value: number, min: number, max: number): number {
    return Math.min(Math.max(value, min), max);
  }

  /**
   * 格式化安装失败消息
   */
  private formatInstallFailureMessage(result: {
    code: number;
    stdout?: string;
    stderr?: string;
  }): string {
    const parts: string[] = [`Installation failed (code: ${result.code})`];

    if (result.stderr) {
      parts.push(`Error: ${result.stderr.slice(0, 500)}`);
    }

    return parts.join('\n');
  }

  /**
   * 添加警告到结果
   */
  private withWarnings(result: InstallResult, warnings: unknown[]): InstallResult {
    if (warnings.length > 0) {
      return {
        ...result,
        warnings: warnings as SecurityScanResult['warnings'],
      };
    }
    return result;
  }
}

// ============================================================================
// Factory
// ============================================================================

export function createSkillInstaller(
  config?: SkillsConfig,
  logger?: {
    debug: (msg: string, meta?: Record<string, unknown>) => void;
    info: (msg: string, meta?: Record<string, unknown>) => void;
    warn: (msg: string, meta?: Record<string, unknown>) => void;
    error: (msg: string, meta?: Record<string, unknown>, err?: Error) => void;
  }
): SkillInstaller {
  return new SkillInstaller(config, logger);
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * 快速安装 Skill
 */
export async function quickInstall(
  entry: SkillEntry,
  installId?: string,
  config?: SkillsConfig
): Promise<InstallResult> {
  const installer = new SkillInstaller(config);
  return installer.install(entry, installId);
}

/**
 * 检查 Skill 依赖是否满足
 */
export function checkDependencies(entry: SkillEntry): {
  satisfied: boolean;
  missing: string[];
} {
  const requiredBins = entry.metadata?.requires?.bins || [];
  const missing: string[] = [];

  const pathEnv = process.env.PATH || '';
  const parts = pathEnv.split(path.delimiter).filter(Boolean);
  const extensions = process.platform === 'win32' ? ['.exe', '.cmd', '.bat', ''] : [''];

  for (const bin of requiredBins) {
    let found = false;

    for (const part of parts) {
      for (const ext of extensions) {
        const candidate = path.join(part, bin + ext);
        try {
          fs.accessSync(candidate, fs.constants.X_OK);
          found = true;
          break;
        } catch {
          continue;
        }
      }
      if (found) break;
    }

    if (!found) {
      missing.push(bin);
    }
  }

  return {
    satisfied: missing.length === 0,
    missing,
  };
}
