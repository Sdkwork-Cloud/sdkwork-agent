/**
 * Dynamic Skill Loader - 动态按需加载管理器
 *
 * 实现渐进式披露和懒加载策略
 *
 * @module DynamicSkillLoader
 * @version 5.0.0
 */

import * as fs from 'fs';
import * as path from 'path';
import { promisify } from 'util';
import type {
  Skill,
  SkillEntry,
  SkillId,
  SkillSource,
  ParsedSkillFrontmatter,
  OpenClawSkillMetadata,
  SkillInvocationPolicy,
} from './types.js';
import { FrontmatterParser } from './frontmatter.js';
import { SkillCache, hashContent } from './cache.js';

const readFile = promisify(fs.readFile);
const stat = promisify(fs.stat);
const readdir = promisify(fs.readdir);

// ============================================================================
// Types
// ============================================================================

export interface LazySkillEntry {
  id: SkillId;
  name: string;
  description: string;
  source: SkillSource;
  filePath: string;
  baseDir: string;
  // 元数据（轻量级，常驻内存）
  frontmatter?: ParsedSkillFrontmatter;
  metadata?: OpenClawSkillMetadata;
  invocation?: SkillInvocationPolicy;
  // 内容哈希，用于缓存验证
  contentHash?: string;
  // 是否已加载完整内容
  loaded: boolean;
}

export interface LoadContentOptions {
  forceReload?: boolean;
  cacheOnly?: boolean;
}

export interface DynamicLoaderStats {
  totalEntries: number;
  loadedEntries: number;
  cachedEntries: number;
  memoryUsage: number;
}

// ============================================================================
// Dynamic Skill Loader
// ============================================================================

export class DynamicSkillLoader {
  private entries = new Map<SkillId, LazySkillEntry>();
  private nameToId = new Map<string, SkillId>();
  private cache: SkillCache;
  private frontmatterParser: FrontmatterParser;

  constructor(
    private config?: {
      cacheTTL?: number;
      maxCacheSize?: number;
    },
    private logger?: {
      debug: (msg: string, meta?: Record<string, unknown>) => void;
      info: (msg: string, meta?: Record<string, unknown>) => void;
      warn: (msg: string, meta?: Record<string, unknown>) => void;
      error: (msg: string, meta?: Record<string, unknown>) => void;
    }
  ) {
    this.cache = new SkillCache(config?.cacheTTL, config?.maxCacheSize);
    this.frontmatterParser = new FrontmatterParser();
  }

  // ============================================================================
  // Metadata Loading (Lightweight)
  // ============================================================================

  /**
   * 扫描并加载 Skill 元数据（轻量级）
   * 只解析 frontmatter，不加载完整内容
   */
  async scanMetadata(dir: string, source: SkillSource): Promise<LazySkillEntry[]> {
    const entries: LazySkillEntry[] = [];

    try {
      const dirStat = await stat(dir);
      if (!dirStat.isDirectory()) {
        return entries;
      }
    } catch {
      return entries;
    }

    const files = await this.scanSkillFiles(dir);

    for (const filePath of files) {
      try {
        const entry = await this.loadMetadataOnly(filePath, source);
        if (entry) {
          entries.push(entry);
          this.entries.set(entry.id, entry);
          this.nameToId.set(entry.name, entry.id);
        }
      } catch (error) {
        this.logger?.warn(`[DynamicLoader] Failed to load metadata from ${filePath}`, {
          error: (error as Error).message,
        });
      }
    }

    this.logger?.info(`[DynamicLoader] Scanned ${entries.length} skills from ${dir}`);
    return entries;
  }

  /**
   * 仅加载元数据（渐进式披露）
   */
  private async loadMetadataOnly(
    filePath: string,
    source: SkillSource
  ): Promise<LazySkillEntry | null> {
    // 检查缓存
    const cached = this.cache.getSkillEntry(filePath);
    if (cached) {
      return this.convertToLazyEntry(cached, filePath, source);
    }

    try {
      const content = await readFile(filePath, 'utf-8');
      const contentHash = hashContent(content);

      // 只解析 frontmatter（前 10KB）
      const frontmatterContent = content.slice(0, 10 * 1024);
      const parsed = this.frontmatterParser.parse(frontmatterContent);

      const id = `skill:${parsed.frontmatter.name}`;

      return {
        id,
        name: parsed.frontmatter.name,
        description: parsed.frontmatter.description,
        source,
        filePath,
        baseDir: path.dirname(filePath),
        frontmatter: parsed.frontmatter,
        metadata: parsed.metadata,
        invocation: parsed.invocation,
        contentHash,
        loaded: false,
      };
    } catch (error) {
      this.logger?.warn(`[DynamicLoader] Failed to parse ${filePath}`, {
        error: (error as Error).message,
      });
      return null;
    }
  }

  // ============================================================================
  // Content Loading (On-Demand)
  // ============================================================================

  /**
   * 按需加载完整 Skill 内容
   */
  async loadContent(
    skillId: SkillId,
    options: LoadContentOptions = {}
  ): Promise<Skill | null> {
    const lazyEntry = this.entries.get(skillId);
    if (!lazyEntry) {
      return null;
    }

    // 如果已加载且不需要强制重载，直接返回
    if (lazyEntry.loaded && !options.forceReload) {
      const cached = this.cache.getSkillEntry(skillId);
      if (cached) {
        return cached.skill;
      }
    }

    // 如果只允许缓存，不实际加载
    if (options.cacheOnly) {
      return null;
    }

    try {
      const skill = await this.loadFullContent(lazyEntry);
      
      // 更新状态
      lazyEntry.loaded = true;
      
      // 缓存完整 entry
      const fullEntry = this.convertToSkillEntry(lazyEntry, skill);
      this.cache.setSkillEntry(skillId, fullEntry);

      this.logger?.debug(`[DynamicLoader] Loaded full content for ${lazyEntry.name}`);
      
      return skill;
    } catch (error) {
      this.logger?.error(`[DynamicLoader] Failed to load content for ${skillId}`, {
        error: (error as Error).message,
      });
      return null;
    }
  }

  /**
   * 加载完整内容
   */
  private async loadFullContent(lazyEntry: LazySkillEntry): Promise<Skill> {
    const content = await readFile(lazyEntry.filePath, 'utf-8');
    
    // 验证内容是否变更
    const currentHash = hashContent(content);
    if (lazyEntry.contentHash && lazyEntry.contentHash !== currentHash) {
      this.logger?.info(`[DynamicLoader] Content changed for ${lazyEntry.name}, reloading metadata`);
      // 重新加载元数据
      const refreshed = await this.loadMetadataOnly(lazyEntry.filePath, lazyEntry.source);
      if (refreshed) {
        Object.assign(lazyEntry, refreshed);
      }
    }

    // 解析完整内容
    const parsed = this.frontmatterParser.parse(content);

    // 创建 Skill 对象
    const skill: Skill = {
      id: lazyEntry.id,
      name: lazyEntry.name,
      description: lazyEntry.description,
      version: '1.0.0',
      source: lazyEntry.source,
      filePath: lazyEntry.filePath,
      baseDir: lazyEntry.baseDir,
      inputSchema: parsed.frontmatter.metadata ? this.inferSchemaFromMetadata(parsed.frontmatter.metadata) : {},
      metadata: {
        openclaw: lazyEntry.metadata,
      },
      execute: async () => ({
        success: false,
        error: {
          code: 'NOT_IMPLEMENTED',
          message: 'Skill execution not implemented for file-based skills',
          skillId: lazyEntry.id,
          recoverable: false,
        },
      }),
    };

    return skill;
  }

  // ============================================================================
  // Batch Operations
  // ============================================================================

  /**
   * 批量预加载指定 Skills
   */
  async preload(skillIds: SkillId[]): Promise<Map<SkillId, Skill | null>> {
    const results = new Map<SkillId, Skill | null>();

    await Promise.all(
      skillIds.map(async (id) => {
        const skill = await this.loadContent(id);
        results.set(id, skill);
      })
    );

    return results;
  }

  /**
   * 批量卸载释放内存
   */
  unload(skillIds?: SkillId[]): void {
    const idsToUnload = skillIds || Array.from(this.entries.keys());

    for (const id of idsToUnload) {
      const entry = this.entries.get(id);
      if (entry) {
        entry.loaded = false;
        this.cache.deleteSkillEntry(id);
      }
    }

    this.logger?.debug(`[DynamicLoader] Unloaded ${idsToUnload.length} skills`);
  }

  // ============================================================================
  // Query Methods
  // ============================================================================

  /**
   * 获取轻量级元数据（始终可用）
   */
  getMetadata(skillId: SkillId): LazySkillEntry | undefined {
    return this.entries.get(skillId);
  }

  /**
   * 根据名称获取元数据
   */
  getMetadataByName(name: string): LazySkillEntry | undefined {
    const id = this.nameToId.get(name);
    return id ? this.entries.get(id) : undefined;
  }

  /**
   * 列出所有元数据
   */
  listMetadata(): LazySkillEntry[] {
    return Array.from(this.entries.values());
  }

  /**
   * 搜索元数据
   */
  searchMetadata(query: string): LazySkillEntry[] {
    const lowerQuery = query.toLowerCase();
    return this.listMetadata().filter(
      entry =>
        entry.name.toLowerCase().includes(lowerQuery) ||
        entry.description.toLowerCase().includes(lowerQuery)
    );
  }

  /**
   * 获取已加载的 Skill
   */
  getLoadedSkill(skillId: SkillId): Skill | undefined {
    const entry = this.entries.get(skillId);
    if (!entry || !entry.loaded) {
      return undefined;
    }

    const cached = this.cache.getSkillEntry(skillId);
    return cached?.skill;
  }

  // ============================================================================
  // Cache Management
  // ============================================================================

  /**
   * 刷新指定 Skill
   */
  async refresh(skillId: SkillId): Promise<boolean> {
    const entry = this.entries.get(skillId);
    if (!entry) {
      return false;
    }

    entry.loaded = false;
    this.cache.deleteSkillEntry(skillId);

    const skill = await this.loadContent(skillId, { forceReload: true });
    return skill !== null;
  }

  /**
   * 清理过期缓存
   */
  cleanup(): void {
    this.cache.clearExpired();
  }

  /**
   * 清空所有缓存
   */
  clearCache(): void {
    this.cache.clear();
    for (const entry of this.entries.values()) {
      entry.loaded = false;
    }
  }

  /**
   * 获取统计信息
   */
  getStats(): DynamicLoaderStats {
    const totalEntries = this.entries.size;
    const loadedEntries = Array.from(this.entries.values()).filter(e => e.loaded).length;
    const cacheStats = this.cache.getStats();

    return {
      totalEntries,
      loadedEntries,
      cachedEntries: cacheStats.skillEntries,
      memoryUsage: this.estimateMemoryUsage(),
    };
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  private async scanSkillFiles(dir: string): Promise<string[]> {
    const files: string[] = [];

    try {
      const entries = await readdir(dir, { withFileTypes: true });

      for (const entry of entries) {
        if (entry.isDirectory()) {
          // 子目录中的 SKILL.md
          const skillPath = path.join(dir, entry.name, 'SKILL.md');
          try {
            await stat(skillPath);
            files.push(skillPath);
          } catch {
            // ignore
          }
        } else if (entry.isFile() && entry.name.endsWith('.md')) {
          // 直接子目录中的 .md 文件
          files.push(path.join(dir, entry.name));
        }
      }
    } catch {
      // ignore
    }

    return files;
  }

  private convertToLazyEntry(
    cached: any,
    filePath: string,
    source: SkillSource
  ): LazySkillEntry {
    return {
      id: cached.skill.id,
      name: cached.skill.name,
      description: cached.skill.description,
      source,
      filePath,
      baseDir: path.dirname(filePath),
      frontmatter: cached.frontmatter,
      metadata: cached.metadata,
      invocation: cached.invocation,
      loaded: true,
    };
  }

  private convertToSkillEntry(lazyEntry: LazySkillEntry, skill: Skill): any {
    return {
      skill,
      frontmatter: lazyEntry.frontmatter || {
        name: lazyEntry.name,
        description: lazyEntry.description,
      },
      metadata: lazyEntry.metadata,
      invocation: lazyEntry.invocation,
      source: lazyEntry.source,
      priority: 0,
    };
  }

  private inferSchemaFromMetadata(metadata: string): any {
    // 简化实现，实际应该从 metadata 推断
    return {};
  }

  private estimateMemoryUsage(): number {
    // 简化估算
    const entrySize = 500; // 平均每个 entry 500 bytes
    return this.entries.size * entrySize;
  }
}

// ============================================================================
// Factory
// ============================================================================

export function createDynamicLoader(
  config?: {
    cacheTTL?: number;
    maxCacheSize?: number;
  },
  logger?: {
    debug: (msg: string, meta?: Record<string, unknown>) => void;
    info: (msg: string, meta?: Record<string, unknown>) => void;
    warn: (msg: string, meta?: Record<string, unknown>) => void;
    error: (msg: string, meta?: Record<string, unknown>) => void;
  }
): DynamicSkillLoader {
  return new DynamicSkillLoader(config, logger);
}
