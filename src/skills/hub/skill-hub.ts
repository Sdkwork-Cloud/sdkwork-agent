/**
 * Skill Hub - Centralized Skill Management System
 *
 * Skill Hub - 中心化技能管理系统
 *
 * 核心特性：
 * 1. 技能发现与搜索 (Skill Discovery & Search)
 * 2. 技能安装与管理 (Skill Installation & Management)
 * 3. 技能版本控制 (Version Control)
 * 4. 技能评分与评论 (Rating & Reviews)
 * 5. 技能推荐系统 (Recommendation System)
 * 6. 技能市场 (Skill Marketplace)
 *
 * @module SkillHub
 * @version 3.0.0
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { EventEmitter } from '../../utils/event-emitter.js';
import { Logger } from '../core/types.js';

// ============================================================================
// Skill Hub Types
// ============================================================================

/**
 * Skill Hub 配置
 */
export interface SkillHubConfig {
  /** Hub 名称 */
  name: string;
  /** Hub 类型 */
  type: 'local' | 'remote' | 'hybrid';
  /** 存储路径 */
  storagePath: string;
  /** 远程 URL */
  remoteUrl?: string;
  /** API Key */
  apiKey?: string;
  /** 日志器 */
  logger?: Logger;
  /** 启用缓存 */
  enableCache?: boolean;
  /** 缓存 TTL (ms) */
  cacheTTL?: number;
}

/**
 * Skill 包信息
 */
export interface SkillPackage {
  /** 包 ID */
  id: string;
  /** 技能名称 */
  name: string;
  /** 显示名称 */
  displayName: string;
  /** 描述 */
  description: string;
  /** 版本 */
  version: string;
  /** 作者 */
  author: string;
  /** 许可证 */
  license: string;
  /** 标签 */
  tags: string[];
  /** 分类 */
  category: string;
  /** 下载次数 */
  downloads: number;
  /** 评分 */
  rating: number;
  /** 评论数 */
  reviews: number;
  /** 依赖 */
  dependencies: string[];
  /** 创建时间 */
  createdAt: Date;
  /** 更新时间 */
  updatedAt: Date;
  /** 图标 URL */
  iconUrl?: string;
  /** 主页 URL */
  homepage?: string;
  /** 仓库 URL */
  repository?: string;
}

/**
 * 搜索选项
 */
export interface SearchOptions {
  /** 关键词 */
  query?: string;
  /** 分类 */
  category?: string;
  /** 标签 */
  tags?: string[];
  /** 作者 */
  author?: string;
  /** 排序方式 */
  sortBy?: 'relevance' | 'downloads' | 'rating' | 'updated';
  /** 排序方向 */
  sortOrder?: 'asc' | 'desc';
  /** 分页 - 页码 */
  page?: number;
  /** 分页 - 每页数量 */
  limit?: number;
}

/**
 * 搜索结果
 */
export interface SearchResult {
  /** 结果列表 */
  packages: SkillPackage[];
  /** 总数 */
  total: number;
  /** 页码 */
  page: number;
  /** 每页数量 */
  limit: number;
  /** 总页数 */
  totalPages: number;
}

/**
 * 安装选项
 */
export interface InstallOptions {
  /** 版本 */
  version?: string;
  /** 强制安装 */
  force?: boolean;
  /** 安装到全局 */
  global?: boolean;
  /** 依赖处理策略 */
  dependencyStrategy?: 'install' | 'skip' | 'prompt';
}

/**
 * 安装结果
 */
export interface InstallResult {
  /** 是否成功 */
  success: boolean;
  /** 安装路径 */
  path?: string;
  /** 安装版本 */
  version?: string;
  /** 安装的依赖 */
  installedDependencies?: string[];
  /** 错误信息 */
  error?: string;
}

// ============================================================================
// Skill Hub Implementation
// ============================================================================

export class SkillHub extends EventEmitter {
  private hubConfig: SkillHubConfig & { enableCache: boolean; cacheTTL: number; logger: Logger };
  private hubLogger: Logger;
  private cache: Map<string, { data: unknown; timestamp: number }> = new Map();
  private installedSkills: Map<string, { package: SkillPackage; path: string }> = new Map();

  constructor(config: SkillHubConfig) {
    super();
    this.hubConfig = {
      enableCache: true,
      cacheTTL: 3600000, // 1 hour
      logger: this.createDefaultLogger(),
      ...config,
    };
    this.hubLogger = this.hubConfig.logger;

    // 确保存储目录存在
    this.ensureStoragePath();
  }

  /**
   * 初始化 Skill Hub
   */
  async initialize(): Promise<void> {
    this.hubLogger.info(`Initializing Skill Hub: ${this.hubConfig.name}`);

    // 加载已安装的技能
    await this.loadInstalledSkills();

    this.emit('hub:initialized', { name: this.hubConfig.name });
  }

  /**
   * 关闭 Skill Hub
   */
  async shutdown(): Promise<void> {
    this.hubLogger.info(`Shutting down Skill Hub: ${this.hubConfig.name}`);
    this.emit('hub:shutdown', { name: this.hubConfig.name });
  }

  /**
   * 搜索技能
   */
  async search(options: SearchOptions = {}): Promise<SearchResult> {
    const {
      query,
      category,
      tags,
      author,
      sortBy = 'relevance',
      sortOrder = 'desc',
      page = 1,
      limit = 20,
    } = options;

    this.hubLogger.debug(`Searching skills: ${query || 'all'}`);

    // 获取所有包
    let packages = await this.getAllPackages();

    // 应用过滤条件
    if (query) {
      const lowerQuery = query.toLowerCase();
      packages = packages.filter(
        (pkg) =>
          pkg.name.toLowerCase().includes(lowerQuery) ||
          pkg.displayName.toLowerCase().includes(lowerQuery) ||
          pkg.description.toLowerCase().includes(lowerQuery)
      );
    }

    if (category) {
      packages = packages.filter((pkg) => pkg.category === category);
    }

    if (tags && tags.length > 0) {
      packages = packages.filter((pkg) => tags.some((tag) => pkg.tags.includes(tag)));
    }

    if (author) {
      packages = packages.filter((pkg) => pkg.author === author);
    }

    // 排序
    packages = this.sortPackages(packages, sortBy, sortOrder);

    // 分页
    const total = packages.length;
    const totalPages = Math.ceil(total / limit);
    const start = (page - 1) * limit;
    const paginatedPackages = packages.slice(start, start + limit);

    return {
      packages: paginatedPackages,
      total,
      page,
      limit,
      totalPages,
    };
  }

  /**
   * 获取技能详情
   */
  async getPackage(name: string): Promise<SkillPackage | null> {
    // 检查缓存
    const cacheKey = `package:${name}`;
    const cached = this.getCache(cacheKey);
    if (cached) {
      return cached as SkillPackage;
    }

    // 从存储获取
    const packages = await this.getAllPackages();
    const pkg = packages.find((p) => p.name === name) || null;

    if (pkg) {
      this.setCache(cacheKey, pkg);
    }

    return pkg;
  }

  /**
   * 安装技能
   */
  async install(name: string, options: InstallOptions = {}): Promise<InstallResult> {
    this.hubLogger.info(`Installing skill: ${name}`);

    try {
      // 获取包信息
      const pkg = await this.getPackage(name);
      if (!pkg) {
        return { success: false, error: `Skill not found: ${name}` };
      }

      // 检查是否已安装
      if (this.installedSkills.has(name) && !options.force) {
        return { success: false, error: `Skill already installed: ${name}` };
      }

      // 确定安装路径
      const installPath = options.global
        ? path.join(this.hubConfig.storagePath, 'global', name)
        : path.join(this.hubConfig.storagePath, 'local', name);

      // 下载并安装
      await this.downloadAndInstall(pkg, installPath, options);

      // 记录安装
      this.installedSkills.set(name, { package: pkg, path: installPath });

      this.emit('skill:installed', { name, version: pkg.version, path: installPath });

      return {
        success: true,
        path: installPath,
        version: pkg.version,
        installedDependencies: [],
      };
    } catch (error) {
      this.hubLogger.error(`Failed to install skill ${name}: ${(error as Error).message}`);
      return {
        success: false,
        error: (error as Error).message,
      };
    }
  }

  /**
   * 卸载技能
   */
  async uninstall(name: string): Promise<boolean> {
    this.hubLogger.info(`Uninstalling skill: ${name}`);

    const installed = this.installedSkills.get(name);
    if (!installed) {
      this.hubLogger.warn(`Skill not installed: ${name}`);
      return false;
    }

    try {
      // 删除安装目录
      if (fs.existsSync(installed.path)) {
        fs.rmSync(installed.path, { recursive: true });
      }

      // 移除记录
      this.installedSkills.delete(name);

      this.emit('skill:uninstalled', { name });

      return true;
    } catch (error) {
      this.hubLogger.error(`Failed to uninstall skill ${name}: ${(error as Error).message}`);
      return false;
    }
  }

  /**
   * 更新技能
   */
  async update(name: string): Promise<InstallResult> {
    this.hubLogger.info(`Updating skill: ${name}`);

    const installed = this.installedSkills.get(name);
    if (!installed) {
      return { success: false, error: `Skill not installed: ${name}` };
    }

    // 获取最新版本
    const pkg = await this.getPackage(name);
    if (!pkg) {
      return { success: false, error: `Skill not found: ${name}` };
    }

    // 检查版本
    if (pkg.version === installed.package.version) {
      return { success: true, version: pkg.version, error: 'Already up to date' };
    }

    // 重新安装
    return this.install(name, { force: true });
  }

  /**
   * 获取已安装的技能
   */
  getInstalledSkills(): SkillPackage[] {
    return Array.from(this.installedSkills.values()).map((item) => item.package);
  }

  /**
   * 检查技能是否已安装
   */
  isInstalled(name: string): boolean {
    return this.installedSkills.has(name);
  }

  /**
   * 获取技能安装路径
   */
  getInstallPath(name: string): string | undefined {
    return this.installedSkills.get(name)?.path;
  }

  /**
   * 获取分类列表
   */
  async getCategories(): Promise<string[]> {
    const packages = await this.getAllPackages();
    const categories = new Set(packages.map((pkg) => pkg.category));
    return Array.from(categories).sort();
  }

  /**
   * 获取标签列表
   */
  async getTags(): Promise<string[]> {
    const packages = await this.getAllPackages();
    const tags = new Set<string>();
    packages.forEach((pkg) => pkg.tags.forEach((tag) => tags.add(tag)));
    return Array.from(tags).sort();
  }

  /**
   * 获取推荐技能
   */
  async getRecommendations(_userId?: string): Promise<SkillPackage[]> {
    // 基于用户历史行为和热门技能推荐
    const packages = await this.getAllPackages();

    // 按下载量和评分排序
    return packages
      .filter((pkg) => pkg.rating >= 4.0)
      .sort((a, b) => b.downloads - a.downloads)
      .slice(0, 10);
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  private ensureStoragePath(): void {
    if (!fs.existsSync(this.hubConfig.storagePath)) {
      fs.mkdirSync(this.hubConfig.storagePath, { recursive: true });
    }

    // 创建子目录
    const subdirs = ['global', 'local', 'cache', 'temp'];
    for (const dir of subdirs) {
      const dirPath = path.join(this.hubConfig.storagePath, dir);
      if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
      }
    }
  }

  private async loadInstalledSkills(): Promise<void> {
    const localPath = path.join(this.hubConfig.storagePath, 'local');
    const globalPath = path.join(this.hubConfig.storagePath, 'global');

    for (const basePath of [localPath, globalPath]) {
      if (!fs.existsSync(basePath)) continue;

      const entries = fs.readdirSync(basePath, { withFileTypes: true });
      for (const entry of entries) {
        if (!entry.isDirectory()) continue;

        const skillPath = path.join(basePath, entry.name);
        const manifestPath = path.join(skillPath, 'SKILL.md');

        if (fs.existsSync(manifestPath)) {
          try {
            const content = fs.readFileSync(manifestPath, 'utf-8');
            const pkg = this.parseSkillManifest(content, entry.name);
            if (pkg) {
              this.installedSkills.set(entry.name, { package: pkg, path: skillPath });
            }
          } catch {
            // 忽略解析失败的技能
          }
        }
      }
    }

    this.hubLogger.info(`Loaded ${this.installedSkills.size} installed skills`);
  }

  private async getAllPackages(): Promise<SkillPackage[]> {
    // 检查缓存
    const cacheKey = 'all-packages';
    const cached = this.getCache(cacheKey);
    if (cached) {
      return cached as SkillPackage[];
    }

    // 从远程或本地获取
    let packages: SkillPackage[] = [];

    if (this.hubConfig.type === 'remote' || this.hubConfig.type === 'hybrid') {
      packages = await this.fetchRemotePackages();
    }

    if (this.hubConfig.type === 'local' || this.hubConfig.type === 'hybrid') {
      const localPackages = await this.fetchLocalPackages();
      packages = this.mergePackages(packages, localPackages);
    }

    this.setCache(cacheKey, packages);
    return packages;
  }

  private async fetchRemotePackages(): Promise<SkillPackage[]> {
    // 模拟远程获取
    // 实际实现应调用远程 API
    return [];
  }

  private async fetchLocalPackages(): Promise<SkillPackage[]> {
    // 从本地索引文件获取
    const indexPath = path.join(this.hubConfig.storagePath, 'index.json');
    if (!fs.existsSync(indexPath)) {
      return [];
    }

    try {
      const content = fs.readFileSync(indexPath, 'utf-8');
      return JSON.parse(content);
    } catch {
      return [];
    }
  }

  private mergePackages(remote: SkillPackage[], local: SkillPackage[]): SkillPackage[] {
    const merged = new Map<string, SkillPackage>();

    // 先添加远程包
    for (const pkg of remote) {
      merged.set(pkg.name, pkg);
    }

    // 本地包覆盖远程包
    for (const pkg of local) {
      merged.set(pkg.name, pkg);
    }

    return Array.from(merged.values());
  }

  private sortPackages(
    packages: SkillPackage[],
    sortBy: string,
    sortOrder: string
  ): SkillPackage[] {
    const multiplier = sortOrder === 'asc' ? 1 : -1;

    return packages.sort((a, b) => {
      let comparison = 0;

      switch (sortBy) {
        case 'downloads':
          comparison = a.downloads - b.downloads;
          break;
        case 'rating':
          comparison = a.rating - b.rating;
          break;
        case 'updated':
          comparison = new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();
          break;
        default:
          // relevance - 默认按名称排序
          comparison = a.name.localeCompare(b.name);
      }

      return comparison * multiplier;
    });
  }

  private async downloadAndInstall(
    pkg: SkillPackage,
    installPath: string,
    _options: InstallOptions
  ): Promise<void> {
    // 确保目录存在
    if (!fs.existsSync(installPath)) {
      fs.mkdirSync(installPath, { recursive: true });
    }

    // 创建 SKILL.md
    const skillContent = this.generateSkillContent(pkg);
    fs.writeFileSync(path.join(installPath, 'SKILL.md'), skillContent, 'utf-8');

    // 创建 package.json
    const packageJson = {
      name: pkg.name,
      version: pkg.version,
      description: pkg.description,
      author: pkg.author,
      license: pkg.license,
      dependencies: pkg.dependencies,
    };
    fs.writeFileSync(
      path.join(installPath, 'package.json'),
      JSON.stringify(packageJson, null, 2),
      'utf-8'
    );
  }

  private generateSkillContent(pkg: SkillPackage): string {
    return `---
name: ${pkg.name}
description: ${pkg.description}
license: ${pkg.license}
metadata:
  version: "${pkg.version}"
  author: "${pkg.author}"
  tags: [${pkg.tags.map((t) => `"${t}"`).join(', ')}]
  category: "${pkg.category}"
---

# ${pkg.displayName}

${pkg.description}

## Installation

\`\`\`bash
sdkwork skill install ${pkg.name}
\`\`\`

## Usage

See documentation at ${pkg.homepage || pkg.repository || 'N/A'}
`;
  }

  private parseSkillManifest(content: string, name: string): SkillPackage | null {
    // 简化实现：解析 frontmatter
    const frontmatterMatch = content.match(/^---\s*\n([\s\S]*?)\n---\s*\n/);
    if (!frontmatterMatch) return null;

    try {
      const yaml = frontmatterMatch[1];
      const metadata: Record<string, unknown> = {};

      // 简单的 YAML 解析
      const lines = yaml.split('\n');
      for (const line of lines) {
        const colonIndex = line.indexOf(':');
        if (colonIndex === -1) continue;

        const key = line.slice(0, colonIndex).trim();
        let value: unknown = line.slice(colonIndex + 1).trim();

        // 移除引号
        if (
          (value as string).startsWith('"') &&
          (value as string).endsWith('"')
        ) {
          value = (value as string).slice(1, -1);
        }

        metadata[key] = value;
      }

      return {
        id: `${name}@local`,
        name,
        displayName: (metadata.name as string) || name,
        description: (metadata.description as string) || '',
        version: '1.0.0',
        author: 'local',
        license: (metadata.license as string) || 'MIT',
        tags: [],
        category: 'local',
        downloads: 0,
        rating: 0,
        reviews: 0,
        dependencies: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    } catch {
      return null;
    }
  }

  private getCache(key: string): unknown | null {
    if (!this.hubConfig.enableCache) return null;

    const entry = this.cache.get(key);
    if (!entry) return null;

    // 检查是否过期
    if (Date.now() - entry.timestamp > this.hubConfig.cacheTTL) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  private setCache(key: string, data: unknown): void {
    if (!this.hubConfig.enableCache) return;

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
    });
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
 * 创建 Skill Hub
 */
export function createSkillHub(config: SkillHubConfig): SkillHub {
  return new SkillHub(config);
}
