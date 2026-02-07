/**
 * Multi-Location Skill Loader
 *
 * 基于 OpenClaw 架构的多位置技能加载器
 * 支持从多个位置加载技能，并按优先级合并
 *
 * 优先级: workspace > managed > bundled > plugin > extra
 *
 * @module MultiLocationSkillLoader
 * @version 1.0.0
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { EventEmitter } from '../../utils/event-emitter.js';
import type {
  SkillSourceType,
  SkillEntry,
  SkillsConfig,
  ParsedSkillFrontmatter,
  OpenClawSkillMetadata,
  SkillInvocationPolicy,
  SkillSystemEvent,
} from './openclaw-types.js';
import { Logger } from './types.js';

/**
 * 多位置加载器配置
 */
export interface MultiLocationLoaderConfig {
  /** 工作区目录 */
  workspaceDir: string;
  /** 配置目录 (默认: ~/.sdkwork) */
  configDir?: string;
  /** 内置技能目录 */
  bundledDir?: string;
  /** 插件技能目录解析器 */
  pluginSkillResolver?: () => string[];
  /** 技能配置 */
  skillsConfig?: SkillsConfig;
  /** 日志器 */
  logger?: Logger;
}

/**
 * 加载的原始技能
 */
interface RawSkill {
  name: string;
  description: string;
  filePath: string;
  source: SkillSourceType;
}

/**
 * 多位置技能加载器
 *
 * 实现 OpenClaw 的多位置加载机制：
 * 1. 扫描多个位置的技能目录
 * 2. 按优先级合并同名技能
 * 3. 解析 SKILL.md frontmatter
 * 4. 提取 OpenClaw 元数据
 */
export class MultiLocationSkillLoader extends EventEmitter {
  private config: Required<MultiLocationLoaderConfig>;

  constructor(config: MultiLocationLoaderConfig) {
    super();
    this.config = {
      configDir: this.getDefaultConfigDir(),
      bundledDir: '',
      pluginSkillResolver: () => [],
      skillsConfig: {},
      logger: this.createDefaultLogger(),
      ...config,
    };
  }

  /**
   * 加载所有位置的技能
   *
   * 加载顺序（从低到高优先级）：
   * 1. extra - 额外配置目录
   * 2. bundled - 内置技能
   * 3. managed - 托管技能 (~/.sdkwork/skills)
   * 4. workspace - 工作区技能
   * 5. plugin - 插件技能
   *
   * 后加载的会覆盖先加载的同名技能
   */
  async loadAllSkills(): Promise<SkillEntry[]> {
    const loadStartTime = Date.now();
    this.config.logger.debug('Starting multi-location skill loading');

    // 1. 加载额外目录技能 (最低优先级)
    const extraSkills = await this.loadExtraSkills();

    // 2. 加载内置技能
    const bundledSkills = this.config.bundledDir
      ? await this.loadSkillsFromDir(this.config.bundledDir, 'bundled')
      : [];

    // 3. 加载托管技能
    const managedDir = path.join(this.config.configDir, 'skills');
    const managedSkills = await this.loadSkillsFromDir(managedDir, 'managed');

    // 4. 加载工作区技能 (高优先级)
    const workspaceDir = path.join(this.config.workspaceDir, 'skills');
    const workspaceSkills = await this.loadSkillsFromDir(workspaceDir, 'workspace');

    // 5. 加载插件技能 (最高优先级)
    const pluginDirs = this.config.pluginSkillResolver();
    const pluginSkills: RawSkill[] = [];
    for (const dir of pluginDirs) {
      const skills = await this.loadSkillsFromDir(dir, 'plugin');
      pluginSkills.push(...skills);
    }

    // 按优先级合并 (后加载的覆盖先加载的)
    const merged = new Map<string, RawSkill>();

    // 优先级从低到高
    for (const skill of extraSkills) merged.set(skill.name, skill);
    for (const skill of bundledSkills) merged.set(skill.name, skill);
    for (const skill of managedSkills) merged.set(skill.name, skill);
    for (const skill of workspaceSkills) merged.set(skill.name, skill);
    for (const skill of pluginSkills) merged.set(skill.name, skill);

    // 转换为 SkillEntry
    const entries: SkillEntry[] = [];
    for (const skill of merged.values()) {
      try {
        const entry = await this.parseSkillEntry(skill);
        entries.push(entry);

        this.emit('skill:loaded' as SkillSystemEvent['type'], {
          type: 'skill:loaded',
          skillName: entry.name,
          source: entry.source,
        });
      } catch (error) {
        this.config.logger.warn(`Failed to parse skill ${skill.name}: ${(error as Error).message}`);
      }
    }

    const duration = Date.now() - loadStartTime;
    this.config.logger.info(`Loaded ${entries.length} skills from ${merged.size} unique names in ${duration}ms`);

    return entries;
  }

  /**
   * 从指定目录加载技能
   */
  private async loadSkillsFromDir(dir: string, source: SkillSourceType): Promise<RawSkill[]> {
    if (!fs.existsSync(dir)) {
      return [];
    }

    const skills: RawSkill[] = [];

    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });

      for (const entry of entries) {
        if (!entry.isDirectory()) continue;

        // 验证目录名称格式
        const skillName = entry.name;
        if (!this.isValidSkillDirName(skillName)) {
          this.config.logger.debug(`Skipping invalid skill directory name: ${skillName}`);
          continue;
        }

        const skillPath = path.join(dir, skillName);
        const skillFile = path.join(skillPath, 'SKILL.md');

        // 检查 SKILL.md 是否存在
        if (!fs.existsSync(skillFile)) {
          this.config.logger.debug(`SKILL.md not found in ${skillPath}`);
          continue;
        }

        // 读取并解析 SKILL.md
        try {
          const content = fs.readFileSync(skillFile, 'utf-8');
          const { name, description } = this.parseBasicInfo(content, skillName);

          skills.push({
            name,
            description,
            filePath: skillFile,
            source,
          });
        } catch (error) {
          this.config.logger.warn(`Failed to read ${skillFile}: ${(error as Error).message}`);
        }
      }
    } catch (error) {
      this.config.logger.error(`Failed to read directory ${dir}: ${(error as Error).message}`);
    }

    this.config.logger.debug(`Loaded ${skills.length} skills from ${source} (${dir})`);
    return skills;
  }

  /**
   * 加载额外目录的技能
   */
  private async loadExtraSkills(): Promise<RawSkill[]> {
    const extraDirs = this.config.skillsConfig?.load?.extraDirs ?? [];
    const skills: RawSkill[] = [];

    for (const dir of extraDirs) {
      const trimmed = dir.trim();
      if (!trimmed) continue;

      const resolved = path.resolve(trimmed);
      const extraSkills = await this.loadSkillsFromDir(resolved, 'extra');
      skills.push(...extraSkills);
    }

    return skills;
  }

  /**
   * 解析技能条目
   */
  private async parseSkillEntry(raw: RawSkill): Promise<SkillEntry> {
    const content = fs.readFileSync(raw.filePath, 'utf-8');
    const frontmatter = this.parseFrontmatter(content);

    // 验证名称匹配
    if (frontmatter.name && frontmatter.name !== raw.name) {
      this.config.logger.warn(
        `Skill name mismatch: directory "${raw.name}" vs frontmatter "${frontmatter.name}"`
      );
    }

    return {
      name: raw.name,
      description: frontmatter.description || raw.description,
      filePath: raw.filePath,
      source: raw.source,
      frontmatter,
      metadata: this.resolveOpenClawMetadata(frontmatter),
      invocation: this.resolveInvocationPolicy(frontmatter),
    };
  }

  /**
   * 解析 frontmatter
   */
  private parseFrontmatter(content: string): ParsedSkillFrontmatter {
    const frontmatterRegex = /^---\s*\n([\s\S]*?)\n---\s*\n/;
    const match = content.match(frontmatterRegex);

    if (!match) {
      return {};
    }

    const yamlContent = match[1];
    const frontmatter: ParsedSkillFrontmatter = {};

    // 简单的 YAML 解析 (支持基本类型)
    const lines = yamlContent.split('\n');
    for (const line of lines) {
      const colonIndex = line.indexOf(':');
      if (colonIndex === -1) continue;

      const key = line.slice(0, colonIndex).trim();
      let value: string | boolean = line.slice(colonIndex + 1).trim();

      // 移除引号
      if ((value.startsWith('"') && value.endsWith('"')) ||
          (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }

      // 布尔值转换
      if (value === 'true') value = true;
      if (value === 'false') value = false;

      (frontmatter as Record<string, unknown>)[key] = value;
    }

    return frontmatter;
  }

  /**
   * 解析 OpenClaw 元数据
   */
  private resolveOpenClawMetadata(frontmatter: ParsedSkillFrontmatter): OpenClawSkillMetadata | undefined {
    const raw = frontmatter.metadata;
    if (!raw) return undefined;

    try {
      // 使用 JSON5 解析 (这里简化处理，实际应使用 json5 库)
      const parsed = this.parseJSON5(raw);
      if (!parsed || typeof parsed !== 'object') return undefined;

      const metadataObj = parsed as Record<string, unknown>;

      return {
        always: typeof metadataObj.always === 'boolean' ? metadataObj.always : undefined,
        emoji: typeof metadataObj.emoji === 'string' ? metadataObj.emoji : undefined,
        homepage: typeof metadataObj.homepage === 'string' ? metadataObj.homepage : undefined,
        skillKey: typeof metadataObj.skillKey === 'string' ? metadataObj.skillKey : undefined,
        primaryEnv: typeof metadataObj.primaryEnv === 'string' ? metadataObj.primaryEnv : undefined,
        os: this.normalizeStringList(metadataObj.os),
        requires: this.parseRequires(metadataObj.requires),
        install: this.parseInstall(metadataObj.install),
      };
    } catch {
      return undefined;
    }
  }

  /**
   * 解析调用策略
   */
  private resolveInvocationPolicy(frontmatter: ParsedSkillFrontmatter): SkillInvocationPolicy {
    return {
      userInvocable: frontmatter['user-invocable'] !== false,
      disableModelInvocation: frontmatter['disable-model-invocation'] === true,
    };
  }

  /**
   * 解析基本技能信息
   */
  private parseBasicInfo(content: string, defaultName: string): { name: string; description: string } {
    const frontmatter = this.parseFrontmatter(content);

    return {
      name: frontmatter.name || defaultName,
      description: frontmatter.description || '',
    };
  }

  /**
   * 简化的 JSON5 解析
   */
  private parseJSON5(json5: string): unknown {
    // 移除注释
    let cleaned = json5
      .replace(/\/\/.*$/gm, '') // 单行注释
      .replace(/\/\*[\s\S]*?\*\//g, '') // 多行注释
      .replace(/,\s*([}\]])/g, '$1'); // 尾随逗号

    return JSON.parse(cleaned);
  }

  /**
   * 规范化字符串列表
   */
  private normalizeStringList(value: unknown): string[] {
    if (typeof value === 'string') {
      return value.split(/\s+/).filter(Boolean);
    }
    if (Array.isArray(value)) {
      return value.filter((v): v is string => typeof v === 'string');
    }
    return [];
  }

  /**
   * 解析 requires
   */
  private parseRequires(value: unknown): OpenClawSkillMetadata['requires'] {
    if (!value || typeof value !== 'object') return undefined;

    const obj = value as Record<string, unknown>;
    return {
      bins: this.normalizeStringList(obj.bins),
      anyBins: this.normalizeStringList(obj.anyBins),
      env: this.normalizeStringList(obj.env),
      config: this.normalizeStringList(obj.config),
    };
  }

  /**
   * 解析 install
   */
  private parseInstall(value: unknown): OpenClawSkillMetadata['install'] {
    if (!Array.isArray(value)) return undefined;

    return value
      .filter((item): item is Record<string, unknown> =>
        typeof item === 'object' && item !== null && typeof (item as Record<string, unknown>).command === 'string'
      )
      .map(item => ({
        command: item.command as string,
        description: typeof item.description === 'string' ? item.description : undefined,
        platforms: this.normalizeStringList(item.platforms),
      }));
  }

  /**
   * 验证技能目录名称
   */
  private isValidSkillDirName(name: string): boolean {
    // 1-64 字符
    if (name.length < 1 || name.length > 64) return false;

    // 只能包含小写字母、数字和连字符
    if (!/^[a-z0-9-]+$/.test(name)) return false;

    // 不能以连字符开头或结尾
    if (name.startsWith('-') || name.endsWith('-')) return false;

    // 不能包含连续连字符
    if (name.includes('--')) return false;

    return true;
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
 * 创建多位置技能加载器
 */
export function createMultiLocationLoader(
  config: MultiLocationLoaderConfig
): MultiLocationSkillLoader {
  return new MultiLocationSkillLoader(config);
}
