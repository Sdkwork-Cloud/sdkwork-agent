/**
 * Skill Loader - 多源 Skill 加载器
 *
 * 支持从多个来源加载 Skill（extra dirs, bundled, managed, workspace, plugin）
 *
 * @module SkillLoader
 * @version 5.0.0
 */

import * as fs from 'fs';
import * as path from 'path';
import { promisify } from 'util';
import type {
  Skill,
  SkillEntry,
  SkillSource,
  ParsedSkillFrontmatter,
  OpenClawSkillMetadata,
  SkillInvocationPolicy,
  LoadSkillOptions,
  SkillsConfig,
} from './types.js';
import { FrontmatterParser } from './frontmatter.js';
import { SkillEligibilityChecker } from './eligibility.js';
import { z } from 'zod';

const readdir = promisify(fs.readdir);
const readFile = promisify(fs.readFile);
const stat = promisify(fs.stat);

// ============================================================================
// Constants
// ============================================================================

/** 来源优先级（数字越大优先级越高） */
const SOURCE_PRIORITY: Record<SkillSource, number> = {
  'openclaw-extra': 0,
  'openclaw-bundled': 1,
  'openclaw-managed': 2,
  'openclaw-workspace': 3,
  'openclaw-plugin': 4,
};

/** 默认 Skill 目录名 */
const DEFAULT_SKILL_DIR = 'skills';

/** SKILL.md 文件名 */
const SKILL_FILE_NAME = 'SKILL.md';

// ============================================================================
// Load Parameters
// ============================================================================

interface LoadParams {
  dir: string;
  source: SkillSource;
  priority: number;
}

// ============================================================================
// Skill Loader
// ============================================================================

export class SkillLoader {
  private frontmatterParser: FrontmatterParser;
  private eligibilityChecker: SkillEligibilityChecker;

  constructor(
    private config?: SkillsConfig,
    private logger?: {
      debug: (msg: string, meta?: Record<string, unknown>) => void;
      info: (msg: string, meta?: Record<string, unknown>) => void;
      warn: (msg: string, meta?: Record<string, unknown>) => void;
      error: (msg: string, meta?: Record<string, unknown>, err?: Error) => void;
    }
  ) {
    this.frontmatterParser = new FrontmatterParser();
    this.eligibilityChecker = new SkillEligibilityChecker(config);
  }

  /**
   * 从工作区加载所有 Skill
   */
  async loadFromWorkspace(
    workspaceDir: string,
    options?: LoadSkillOptions
  ): Promise<SkillEntry[]> {
    const sources: LoadParams[] = [];

    // 1. Extra Dirs (最低优先级)
    const extraDirs = options?.config?.load?.extraDirs || this.config?.load?.extraDirs || [];
    for (const dir of extraDirs) {
      sources.push({
        dir: this.resolveUserPath(dir),
        source: 'openclaw-extra',
        priority: SOURCE_PRIORITY['openclaw-extra'],
      });
    }

    // 2. Bundled (内置)
    const bundledDir = this.resolveBundledSkillsDir();
    if (bundledDir) {
      sources.push({
        dir: bundledDir,
        source: 'openclaw-bundled',
        priority: SOURCE_PRIORITY['openclaw-bundled'],
      });
    }

    // 3. Managed (用户目录)
    const managedDir = this.resolveManagedSkillsDir();
    if (managedDir) {
      sources.push({
        dir: managedDir,
        source: 'openclaw-managed',
        priority: SOURCE_PRIORITY['openclaw-managed'],
      });
    }

    // 4. Workspace (工作区，最高优先级)
    if (workspaceDir) {
      const workspaceSkillsDir = path.join(workspaceDir, DEFAULT_SKILL_DIR);
      sources.push({
        dir: workspaceSkillsDir,
        source: 'openclaw-workspace',
        priority: SOURCE_PRIORITY['openclaw-workspace'],
      });
    }

    // 并行加载所有来源
    const loadedSkills = await Promise.all(
      sources.map(params => this.loadFromSource(params))
    );

    // 优先级合并（高优先级覆盖低优先级）
    const merged = this.mergeByPriority(loadedSkills);

    // 转换为 SkillEntry
    const entries = await Promise.all(
      Array.from(merged.values()).map(skill => this.createSkillEntry(skill))
    );

    // 过滤符合条件的 Skill
    const eligible = options?.skillFilter
      ? entries.filter(options.skillFilter)
      : this.eligibilityChecker.filter(entries, options?.eligibility);

    this.logger?.info(`[SkillLoader] Loaded ${eligible.length} eligible skills from ${sources.length} sources`);

    return eligible;
  }

  /**
   * 从单个目录加载 Skill
   */
  async loadFromDirectory(dir: string, source: SkillSource): Promise<Skill[]> {
    return this.loadFromSource({ dir, source, priority: SOURCE_PRIORITY[source] });
  }

  /**
   * 从单个来源加载
   */
  private async loadFromSource(params: LoadParams): Promise<Skill[]> {
    const { dir, source, priority } = params;

    try {
      const stats = await stat(dir);
      if (!stats.isDirectory()) {
        return [];
      }
    } catch {
      // 目录不存在，返回空数组
      return [];
    }

    const skills: Skill[] = [];

    try {
      const entries = await readdir(dir, { withFileTypes: true });

      for (const entry of entries) {
        if (entry.isDirectory()) {
          // 子目录中的 SKILL.md
          const skillPath = path.join(dir, entry.name, SKILL_FILE_NAME);
          const skill = await this.loadSkillFile(skillPath, source, priority);
          if (skill) {
            skills.push(skill);
          }
        } else if (entry.isFile() && entry.name.endsWith('.md') && entry.name !== SKILL_FILE_NAME) {
          // 直接子目录中的 .md 文件
          const skillPath = path.join(dir, entry.name);
          const skill = await this.loadSkillFile(skillPath, source, priority);
          if (skill) {
            skills.push(skill);
          }
        }
      }
    } catch (error) {
      this.logger?.warn(`[SkillLoader] Failed to load from ${dir}`, { error: (error as Error).message });
    }

    return skills;
  }

  /**
   * 加载单个 Skill 文件
   */
  private async loadSkillFile(
    filePath: string,
    source: SkillSource,
    priority: number
  ): Promise<Skill | null> {
    try {
      const content = await readFile(filePath, 'utf-8');
      const parsed = this.frontmatterParser.parse(content);

      const skill: Skill = {
        id: `skill:${parsed.frontmatter.name}`,
        name: parsed.frontmatter.name,
        description: parsed.frontmatter.description,
        version: '1.0.0',
        source,
        filePath,
        baseDir: path.dirname(filePath),
        inputSchema: z.object({}), // 默认空 schema
        metadata: {
          openclaw: parsed.metadata,
        },
        execute: async () => ({
          success: false,
          error: {
            code: 'NOT_IMPLEMENTED',
            message: 'Skill execution not implemented for file-based skills',
            skillId: `skill:${parsed.frontmatter.name}`,
            recoverable: false,
          },
        }),
      };

      return skill;
    } catch (error) {
      this.logger?.warn(`[SkillLoader] Failed to parse ${filePath}`, { error: (error as Error).message });
      return null;
    }
  }

  /**
   * 创建 SkillEntry
   */
  private async createSkillEntry(skill: Skill): Promise<SkillEntry> {
    const frontmatter: ParsedSkillFrontmatter = {
      name: skill.name,
      description: skill.description,
      homepage: skill.metadata?.openclaw?.homepage,
      userInvocable: true,
      disableModelInvocation: false,
    };

    const metadata = skill.metadata?.openclaw;
    const invocation: SkillInvocationPolicy = {
      userInvocable: true,
      disableModelInvocation: false,
    };

    return {
      skill,
      frontmatter,
      metadata,
      invocation,
      source: skill.source,
      priority: SOURCE_PRIORITY[skill.source],
    };
  }

  /**
   * 按优先级合并 Skill（高优先级覆盖低优先级）
   */
  private mergeByPriority(skillLists: Skill[][]): Map<string, Skill> {
    const merged = new Map<string, Skill>();

    // 按优先级排序（低到高）
    const sorted = skillLists
      .flat()
      .sort((a, b) => SOURCE_PRIORITY[a.source] - SOURCE_PRIORITY[b.source]);

    for (const skill of sorted) {
      merged.set(skill.name, skill);
    }

    return merged;
  }

  /**
   * 解析用户路径（支持 ~ 展开）
   */
  private resolveUserPath(inputPath: string): string {
    if (inputPath.startsWith('~/')) {
      return path.join(process.env.HOME || process.env.USERPROFILE || '', inputPath.slice(2));
    }
    return path.resolve(inputPath);
  }

  /**
   * 解析内置 Skill 目录
   */
  private resolveBundledSkillsDir(): string | undefined {
    // 从环境变量或配置中获取
    const bundledDir = process.env.OPENCLAW_BUNDLED_SKILLS_DIR;
    if (bundledDir) {
      return bundledDir;
    }

    // 默认路径：可执行文件所在目录的 skills 子目录
    try {
      const execDir = path.dirname(process.argv[1] || '');
      const defaultDir = path.join(execDir, 'skills');
      if (fs.existsSync(defaultDir)) {
        return defaultDir;
      }
    } catch {
      // ignore
    }

    return undefined;
  }

  /**
   * 解析用户管理的 Skill 目录
   */
  private resolveManagedSkillsDir(): string | undefined {
    const homeDir = process.env.HOME || process.env.USERPROFILE;
    if (!homeDir) {
      return undefined;
    }

    return path.join(homeDir, '.sdkwork', 'skills');
  }

  /**
   * 构建 Skill 快照
   */
  buildSnapshot(entries: SkillEntry[]): {
    prompt: string;
    skills: Array<{ name: string; primaryEnv?: string }>;
    version: number;
  } {
    const eligible = entries.filter(
      entry => entry.invocation?.disableModelInvocation !== true
    );

    const skillList = eligible.map(entry => ({
      name: entry.skill.name,
      primaryEnv: entry.metadata?.primaryEnv,
    }));

    const prompt = this.formatSkillsForPrompt(eligible);

    return {
      prompt,
      skills: skillList,
      version: Date.now(),
    };
  }

  /**
   * 格式化 Skill 为提示文本
   */
  private formatSkillsForPrompt(entries: SkillEntry[]): string {
    if (entries.length === 0) {
      return '';
    }

    const lines = ['Available Skills:'];

    for (const entry of entries) {
      const emoji = entry.metadata?.emoji || '🔧';
      const name = entry.skill.name;
      const desc = entry.skill.description;
      lines.push(`  ${emoji} ${name}: ${desc}`);
    }

    return lines.join('\n');
  }
}

// ============================================================================
// Factory
// ============================================================================

export function createSkillLoader(
  config?: SkillsConfig,
  logger?: {
    debug: (msg: string, meta?: Record<string, unknown>) => void;
    info: (msg: string, meta?: Record<string, unknown>) => void;
    warn: (msg: string, meta?: Record<string, unknown>) => void;
    error: (msg: string, meta?: Record<string, unknown>, err?: Error) => void;
  }
): SkillLoader {
  return new SkillLoader(config, logger);
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * 快速加载单个 Skill 文件
 */
export async function loadSkillFile(filePath: string): Promise<SkillEntry | null> {
  const loader = new SkillLoader();
  const skills = await loader.loadFromDirectory(path.dirname(filePath), 'openclaw-extra');
  const skill = skills.find(s => s.filePath === filePath);
  return skill ? loader['createSkillEntry'](skill) : null;
}

/**
 * 扫描目录中的 Skill 文件
 */
export async function scanSkillFiles(dir: string): Promise<string[]> {
  const files: string[] = [];

  try {
    const entries = await readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      if (entry.isDirectory()) {
        const skillPath = path.join(dir, entry.name, SKILL_FILE_NAME);
        try {
          await stat(skillPath);
          files.push(skillPath);
        } catch {
          // ignore
        }
      } else if (entry.isFile() && entry.name.endsWith('.md')) {
        files.push(path.join(dir, entry.name));
      }
    }
  } catch {
    // ignore
  }

  return files;
}

/**
 * 获取 Skill 来源优先级
 */
export function getSourcePriority(source: SkillSource): number {
  return SOURCE_PRIORITY[source];
}
