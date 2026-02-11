/**
 * OpenClaw Compatibility Adapter
 *
 * OpenClaw 兼容性适配器
 *
 * 提供与 OpenClaw 技能系统的无缝集成：
 * 1. OpenClaw 技能格式转换
 * 2. 命令映射
 * 3. 元数据适配
 * 4. 执行桥接
 *
 * @module OpenClawAdapter
 * @version 1.0.0
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { EventEmitter } from '../utils/event-emitter.js';
import { Logger } from '../skills/core/types.js';
import {
  SkillEntry,
  OpenClawSkillMetadata,
  SkillSourceType,
} from '../skills/core/openclaw-types.js';

// ============================================================================
// OpenClaw Types
// ============================================================================

/**
 * OpenClaw 原始技能结构
 */
export interface OpenClawRawSkill {
  /** 技能名称 */
  name: string;
  /** 技能描述 */
  description?: string;
  /** 技能文件路径 */
  filePath: string;
  /** 技能目录 */
  directory: string;
  /** Frontmatter 原始内容 */
  frontmatter: Record<string, unknown>;
  /** 技能内容 */
  content: string;
}

/**
 * OpenClaw 命令定义
 */
export interface OpenClawCommand {
  /** 命令名称 */
  name: string;
  /** 命令描述 */
  description: string;
  /** 命令别名 */
  aliases?: string[];
  /** 参数定义 */
  args?: Array<{
    name: string;
    required: boolean;
    description?: string;
  }>;
  /** 执行处理器 */
  handler: string;
}

/**
 * OpenClaw 工具调用
 */
export interface OpenClawToolCall {
  /** 工具名称 */
  tool: string;
  /** 工具参数 */
  params: Record<string, unknown>;
  /** 调用ID */
  id?: string;
}

// ============================================================================
// Adapter Configuration
// ============================================================================

export interface OpenClawAdapterConfig {
  /** OpenClaw 技能目录 */
  skillsDir: string;
  /** 命令前缀 */
  commandPrefix?: string;
  /** 启用命令映射 */
  enableCommandMapping: boolean;
  /** 日志器 */
  logger?: Logger;
  /** 工具桥接器 */
  toolBridge?: OpenClawToolBridge;
}

/**
 * OpenClaw 工具桥接接口
 */
export interface OpenClawToolBridge {
  /** 调用工具 */
  callTool(name: string, params: Record<string, unknown>): Promise<unknown>;
  /** 检查工具是否可用 */
  hasTool(name: string): boolean;
  /** 获取工具列表 */
  listTools(): string[];
}

// ============================================================================
// OpenClaw Adapter
// ============================================================================

export class OpenClawAdapter extends EventEmitter {
  private config: Required<OpenClawAdapterConfig>;
  private commandMap: Map<string, OpenClawCommand> = new Map();
  private skillCache: Map<string, OpenClawRawSkill> = new Map();

  constructor(config: OpenClawAdapterConfig) {
    super();
    this.config = {
      commandPrefix: 'oc-',
      logger: this.createDefaultLogger(),
      toolBridge: undefined as unknown as OpenClawToolBridge,
      ...config,
      enableCommandMapping: config.enableCommandMapping ?? true,
    };
  }

  /**
   * 初始化适配器
   */
  async initialize(): Promise<void> {
    this.config.logger.info('Initializing OpenClaw adapter');

    // 扫描 OpenClaw 技能
    await this.scanSkills();

    // 构建命令映射
    if (this.config.enableCommandMapping) {
      this.buildCommandMap();
    }

    this.config.logger.info(`OpenClaw adapter initialized with ${this.skillCache.size} skills`);
  }

  /**
   * 将 OpenClaw 技能转换为 SDKWork 技能
   */
  convertSkill(openClawSkill: OpenClawRawSkill): SkillEntry {
    const frontmatter = this.convertFrontmatter(openClawSkill.frontmatter);
    const metadata = this.extractMetadata(openClawSkill.frontmatter);

    return {
      name: this.normalizeSkillName(openClawSkill.name),
      description: openClawSkill.description || '',
      filePath: openClawSkill.filePath,
      source: this.resolveSourceType(openClawSkill.directory),
      frontmatter,
      metadata,
      invocation: {
        userInvocable: frontmatter['user-invocable'] !== false,
        disableModelInvocation: frontmatter['disable-model-invocation'] === true,
      },
    };
  }

  /**
   * 转换技能列表
   */
  convertSkills(skills: OpenClawRawSkill[]): SkillEntry[] {
    return skills.map(skill => this.convertSkill(skill));
  }

  /**
   * 执行 OpenClaw 命令
   */
  async executeCommand(
    commandName: string,
    args: string[]
  ): Promise<{ success: boolean; result?: unknown; error?: string }> {
    const command = this.commandMap.get(commandName);

    if (!command) {
      return { success: false, error: `Unknown command: ${commandName}` };
    }

    try {
      // 解析参数
      const params = this.parseCommandArgs(command, args);

      // 调用工具桥
      if (this.config.toolBridge) {
        const result = await this.config.toolBridge.callTool(command.handler, params);
        return { success: true, result };
      }

      return { success: false, error: 'Tool bridge not configured' };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }

  /**
   * 解析 OpenClaw 工具调用
   */
  parseToolCall(content: string): OpenClawToolCall | null {
    // 支持格式: @tool_name(param1=value1, param2=value2)
    const toolCallRegex = /@(\w+)\s*\(([^)]*)\)/;
    const match = content.match(toolCallRegex);

    if (!match) return null;

    const [, toolName, paramsStr] = match;
    const params = this.parseParams(paramsStr);

    return {
      tool: toolName,
      params,
      id: this.generateCallId(),
    };
  }

  /**
   * 获取所有 OpenClaw 技能
   */
  getSkills(): OpenClawRawSkill[] {
    return Array.from(this.skillCache.values());
  }

  /**
   * 获取命令列表
   */
  getCommands(): OpenClawCommand[] {
    return Array.from(this.commandMap.values());
  }

  /**
   * 检查命令是否存在
   */
  hasCommand(name: string): boolean {
    return this.commandMap.has(name);
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  private async scanSkills(): Promise<void> {
    if (!fs.existsSync(this.config.skillsDir)) {
      this.config.logger.warn(`OpenClaw skills directory not found: ${this.config.skillsDir}`);
      return;
    }

    const entries = fs.readdirSync(this.config.skillsDir, { withFileTypes: true });

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;

      const skillName = entry.name;
      const skillDir = path.join(this.config.skillsDir, skillName);
      const skillFile = path.join(skillDir, 'SKILL.md');

      if (!fs.existsSync(skillFile)) {
        continue;
      }

      try {
        const content = fs.readFileSync(skillFile, 'utf-8');
        const { frontmatter, body } = this.parseSkillContent(content);

        const skill: OpenClawRawSkill = {
          name: skillName,
          description: this.extractDescription(body),
          filePath: skillFile,
          directory: skillDir,
          frontmatter,
          content: body,
        };

        this.skillCache.set(skillName, skill);
      } catch (error) {
        this.config.logger.warn(`Failed to parse skill ${skillName}: ${(error as Error).message}`);
      }
    }
  }

  private parseSkillContent(content: string): { frontmatter: Record<string, unknown>; body: string } {
    const frontmatterRegex = /^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/;
    const match = content.match(frontmatterRegex);

    if (!match) {
      return { frontmatter: {}, body: content };
    }

    const [, frontmatterYaml, body] = match;
    const frontmatter = this.parseYAML(frontmatterYaml);

    return { frontmatter, body: body.trim() };
  }

  private parseYAML(yaml: string): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    const lines = yaml.split('\n');

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;

      const colonIndex = trimmed.indexOf(':');
      if (colonIndex === -1) continue;

      const key = trimmed.slice(0, colonIndex).trim();
      let value: unknown = trimmed.slice(colonIndex + 1).trim();

      // 尝试解析值
      if (value === 'true') value = true;
      else if (value === 'false') value = false;
      else if (value === 'null') value = null;
      else if (!isNaN(Number(value))) value = Number(value);
      else if ((value as string).startsWith('[') && (value as string).endsWith(']')) {
        try {
          value = JSON.parse(value as string);
        } catch { /* ignore */ }
      }

      result[key] = value;
    }

    return result;
  }

  private extractDescription(content: string): string {
    // 提取第一行非空行作为描述
    const lines = content.split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        return trimmed.slice(0, 200);
      }
    }
    return '';
  }

  private convertFrontmatter(
    raw: Record<string, unknown>
  ): import('../skills/core/openclaw-types.js').ParsedSkillFrontmatter {
    return {
      name: typeof raw.name === 'string' ? raw.name : undefined,
      description: typeof raw.description === 'string' ? raw.description : undefined,
      license: typeof raw.license === 'string' ? raw.license : undefined,
      compatibility: typeof raw.compatibility === 'string' ? raw.compatibility : undefined,
      metadata: typeof raw.metadata === 'string' ? raw.metadata : undefined,
      'allowed-tools': Array.isArray(raw['allowed-tools'])
        ? raw['allowed-tools'].join(',')
        : typeof raw['allowed-tools'] === 'string'
        ? raw['allowed-tools']
        : undefined,
      'user-invocable': typeof raw['user-invocable'] === 'boolean' ? raw['user-invocable'] : undefined,
      'disable-model-invocation':
        typeof raw['disable-model-invocation'] === 'boolean'
          ? raw['disable-model-invocation']
          : undefined,
      'command-dispatch': typeof raw['command-dispatch'] === 'string' ? raw['command-dispatch'] : undefined,
      'command-tool': typeof raw['command-tool'] === 'string' ? raw['command-tool'] : undefined,
      'command-arg-mode': typeof raw['command-arg-mode'] === 'string' ? raw['command-arg-mode'] : undefined,
    };
  }

  private extractMetadata(raw: Record<string, unknown>): OpenClawSkillMetadata | undefined {
    const metadataRaw = raw.metadata;
    if (!metadataRaw || typeof metadataRaw !== 'object') {
      return undefined;
    }

    const meta = metadataRaw as Record<string, unknown>;

    return {
      always: typeof meta.always === 'boolean' ? meta.always : undefined,
      emoji: typeof meta.emoji === 'string' ? meta.emoji : undefined,
      homepage: typeof meta.homepage === 'string' ? meta.homepage : undefined,
      skillKey: typeof meta.skillKey === 'string' ? meta.skillKey : undefined,
      primaryEnv: typeof meta.primaryEnv === 'string' ? meta.primaryEnv : undefined,
      os: this.normalizeStringList(meta.os),
      requires: this.parseRequires(meta.requires),
      install: this.parseInstall(meta.install),
    };
  }

  private normalizeStringList(value: unknown): string[] | undefined {
    if (typeof value === 'string') {
      return value.split(/\s+/).filter(Boolean);
    }
    if (Array.isArray(value)) {
      return value.filter((v): v is string => typeof v === 'string');
    }
    return undefined;
  }

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

  private normalizeSkillName(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  }

  private resolveSourceType(directory: string): SkillSourceType {
    if (directory.includes('workspace')) return 'workspace';
    if (directory.includes('managed')) return 'managed';
    if (directory.includes('bundled')) return 'bundled';
    return 'extra';
  }

  private buildCommandMap(): void {
    for (const skill of this.skillCache.values()) {
      const commands = this.extractCommands(skill);

      for (const command of commands) {
        const mappedName = this.config.commandPrefix + command.name;
        this.commandMap.set(mappedName, command);

        // 也注册别名
        for (const alias of command.aliases || []) {
          this.commandMap.set(this.config.commandPrefix + alias, command);
        }
      }
    }

    this.config.logger.debug(`Built command map with ${this.commandMap.size} commands`);
  }

  private extractCommands(skill: OpenClawRawSkill): OpenClawCommand[] {
    const commands: OpenClawCommand[] = [];

    // 从 frontmatter 提取命令定义
    const commandsRaw = skill.frontmatter.commands;
    if (Array.isArray(commandsRaw)) {
      for (const cmd of commandsRaw) {
        if (typeof cmd === 'object' && cmd !== null) {
          commands.push({
            name: String(cmd.name || 'unnamed'),
            description: String(cmd.description || ''),
            aliases: Array.isArray(cmd.aliases) ? cmd.aliases.map(String) : undefined,
            handler: String(cmd.handler || ''),
          });
        }
      }
    }

    return commands;
  }

  private parseCommandArgs(
    command: OpenClawCommand,
    args: string[]
  ): Record<string, unknown> {
    const params: Record<string, unknown> = {};

    if (!command.args) {
      return { raw: args.join(' ') };
    }

    for (let i = 0; i < command.args.length; i++) {
      const argDef = command.args[i];
      if (i < args.length) {
        params[argDef.name] = args[i];
      } else if (argDef.required) {
        throw new Error(`Missing required argument: ${argDef.name}`);
      }
    }

    return params;
  }

  private parseParams(paramsStr: string): Record<string, unknown> {
    const params: Record<string, unknown> = {};
    const pairs = paramsStr.split(',');

    for (const pair of pairs) {
      const [key, value] = pair.split('=').map(s => s.trim());
      if (key) {
        params[key] = this.parseValue(value);
      }
    }

    return params;
  }

  private parseValue(value: string): unknown {
    if (!value) return true;
    if (value === 'true') return true;
    if (value === 'false') return false;
    if (value === 'null') return null;
    if (!isNaN(Number(value))) return Number(value);
    if ((value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))) {
      return value.slice(1, -1);
    }
    return value;
  }

  private generateCallId(): string {
    return `oc-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
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
 * 创建 OpenClaw 适配器
 */
export function createOpenClawAdapter(config: OpenClawAdapterConfig): OpenClawAdapter {
  return new OpenClawAdapter(config);
}
