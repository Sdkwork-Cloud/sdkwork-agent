/**
 * Skill Command Dispatch System
 *
 * 技能命令分发系统 - 将用户命令映射到技能执行
 *
 * 核心特性：
 * - 命令规范化 (sanitize)
 * - 唯一性保证 (deduplication)
 * - 工具分发 (tool dispatch)
 * - 长度限制和验证
 *
 * @module SkillCommandDispatch
 * @version 1.0.0
 */

import { EventEmitter } from '../../utils/event-emitter.js';
import {
  SkillEntry,
  SkillCommandSpec,
  ParsedSkillCommand,
  SkillEligibilityContext,
  SkillsConfig,
  SkillSystemEvent,
} from './openclaw-types.js';
import { Logger } from './types';

/**
 * 命令分发器配置
 */
export interface CommandDispatchConfig {
  /** 保留的命令名称 */
  reservedNames?: Set<string>;
  /** 技能配置 */
  skillsConfig?: SkillsConfig;
  /** 日志器 */
  logger?: Logger;
  /** 最大描述长度 */
  maxDescriptionLength?: number;
}

/**
 * 命令执行结果
 */
export interface CommandDispatchResult {
  /** 是否成功 */
  success: boolean;
  /** 执行结果 */
  result?: unknown;
  /** 错误信息 */
  error?: string;
  /** 执行的命令规范 */
  spec?: SkillCommandSpec;
}

/**
 * 技能命令分发器
 *
 * 实现 OpenClaw 的 buildWorkspaceSkillCommandSpecs 机制：
 * 1. 加载技能条目
 * 2. 过滤用户可调用的技能
 * 3. 规范化命令名称
 * 4. 确保唯一性
 * 5. 解析命令分发配置
 */
export class SkillCommandDispatcher extends EventEmitter {
  private config: Required<CommandDispatchConfig>;
  private commandSpecs: Map<string, SkillCommandSpec> = new Map();
  private usedNames: Set<string> = new Set();

  constructor(config: CommandDispatchConfig = {}) {
    super();
    this.config = {
      reservedNames: new Set(),
      skillsConfig: {},
      logger: this.createDefaultLogger(),
      maxDescriptionLength: 100,
      ...config,
    };

    // 初始化保留名称
    for (const name of this.config.reservedNames) {
      this.usedNames.add(name.toLowerCase());
    }
  }

  /**
   * 构建命令规范
   *
   * 核心方法，实现 OpenClaw 的 buildWorkspaceSkillCommandSpecs 逻辑
   */
  buildCommandSpecs(
    entries: SkillEntry[],
    eligibility?: SkillEligibilityContext
  ): SkillCommandSpec[] {
    const buildStartTime = Date.now();
    this.config.logger.debug('Building skill command specs');

    // 1. 过滤符合条件的技能
    const eligibleEntries = this.filterEligibleEntries(entries, eligibility);

    // 2. 过滤用户可调用的技能
    const userInvocable = eligibleEntries.filter(
      entry => entry.invocation?.userInvocable !== false
    );

    // 3. 构建命令规范
    const specs: SkillCommandSpec[] = [];

    for (const entry of userInvocable) {
      try {
        const spec = this.buildSpecForEntry(entry);
        if (spec) {
          specs.push(spec);
          this.commandSpecs.set(spec.name, spec);

          this.emit('command:registered' as SkillSystemEvent['type'], {
            type: 'command:registered',
            command: spec.name,
            skillName: entry.name,
          });
        }
      } catch (error) {
        this.config.logger.warn(
          `Failed to build command spec for ${entry.name}: ${(error as Error).message}`
        );
      }
    }

    const duration = Date.now() - buildStartTime;
    this.config.logger.info(`Built ${specs.length} command specs in ${duration}ms`);

    return specs;
  }

  /**
   * 解析用户命令
   */
  parseCommand(input: string): ParsedSkillCommand | null {
    // 支持 /command 和 \command 格式
    const commandMatch = input.match(/^[\\/](\S+)(?:\s+(.*))?$/);

    if (!commandMatch) {
      return null;
    }

    const [, name, args = ''] = commandMatch;
    const normalizedName = this.sanitizeCommandName(name);

    // 查找匹配的命令规范
    const spec = this.commandSpecs.get(normalizedName);

    return {
      name: normalizedName,
      args: args.trim(),
      spec,
    };
  }

  /**
   * 分发命令
   */
  async dispatch(command: ParsedSkillCommand): Promise<CommandDispatchResult> {
    if (!command.spec) {
      return {
        success: false,
        error: `Unknown command: /${command.name}`,
      };
    }

    const { spec } = command;

    // 触发分发事件
    this.emit('command:dispatch' as SkillSystemEvent['type'], {
      type: 'command:dispatch',
      command: command.name,
      toolName: spec.dispatch?.toolName || 'none',
    });

    // 如果有工具分发配置，分发到工具
    if (spec.dispatch?.kind === 'tool') {
      return this.dispatchToTool(spec, command.args);
    }

    // 否则作为技能指令处理
    return this.dispatchToSkill(spec, command.args);
  }

  /**
   * 获取所有命令规范
   */
  getAllSpecs(): SkillCommandSpec[] {
    return Array.from(this.commandSpecs.values());
  }

  /**
   * 获取命令规范
   */
  getSpec(name: string): SkillCommandSpec | undefined {
    return this.commandSpecs.get(this.sanitizeCommandName(name));
  }

  /**
   * 检查命令是否存在
   */
  hasCommand(name: string): boolean {
    return this.commandSpecs.has(this.sanitizeCommandName(name));
  }

  /**
   * 搜索命令
   */
  searchCommands(query: string): SkillCommandSpec[] {
    const lowerQuery = query.toLowerCase();
    return this.getAllSpecs().filter(
      spec =>
        spec.name.toLowerCase().includes(lowerQuery) ||
        spec.description.toLowerCase().includes(lowerQuery) ||
        spec.skillName.toLowerCase().includes(lowerQuery)
    );
  }

  /**
   * 清除所有命令规范
   */
  clear(): void {
    this.commandSpecs.clear();
    this.usedNames.clear();

    // 重新添加保留名称
    for (const name of this.config.reservedNames) {
      this.usedNames.add(name.toLowerCase());
    }

    this.config.logger.debug('Cleared all command specs');
  }

  /**
   * 过滤符合条件的技能条目
   */
  private filterEligibleEntries(
    entries: SkillEntry[],
    eligibility?: SkillEligibilityContext
  ): SkillEntry[] {
    // 简化实现，实际应使用资格检查器
    return entries.filter(entry => {
      // 检查配置中是否禁用
      const skillConfig = this.config.skillsConfig?.skills?.[entry.name];
      if (skillConfig?.enabled === false) {
        return false;
      }

      // 检查操作系统兼容性
      const osList = entry.metadata?.os ?? [];
      if (osList.length > 0 && eligibility?.currentPlatform) {
        return osList.includes(eligibility.currentPlatform);
      }

      return true;
    });
  }

  /**
   * 为技能条目构建命令规范
   */
  private buildSpecForEntry(entry: SkillEntry): SkillCommandSpec | null {
    const rawName = entry.name;

    // 1. 规范化命令名称
    const baseName = this.sanitizeCommandName(rawName);
    if (baseName !== rawName) {
      this.config.logger.debug(`Sanitized command name "${rawName}" to "${baseName}"`);
    }

    // 2. 确保唯一性
    const uniqueName = this.resolveUniqueName(baseName);
    if (uniqueName !== baseName) {
      this.config.logger.debug(`De-duplicated command name "${rawName}" to "${uniqueName}"`);
    }

    // 标记为已使用
    this.usedNames.add(uniqueName.toLowerCase());

    // 3. 处理描述
    const rawDescription = entry.description?.trim() || rawName;
    const description = this.truncateDescription(rawDescription);

    // 4. 解析命令分发配置
    const dispatch = this.parseDispatchConfig(entry);

    return {
      name: uniqueName,
      skillName: rawName,
      description,
      ...(dispatch ? { dispatch } : {}),
    };
  }

  /**
   * 规范化命令名称
   *
   * 将技能名称转换为符合命令规范的格式
   */
  private sanitizeCommandName(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '-') // 替换非法字符为连字符
      .replace(/-+/g, '-') // 合并连续连字符
      .replace(/^-|-$/g, ''); // 移除首尾连字符
  }

  /**
   * 解析唯一名称
   *
   * 处理命令名称冲突
   */
  private resolveUniqueName(base: string): string {
    const lowerBase = base.toLowerCase();

    // 检查是否已使用
    if (!this.usedNames.has(lowerBase)) {
      return base;
    }

    // 尝试添加数字后缀
    let counter = 2;
    let candidate = `${base}-${counter}`;

    while (this.usedNames.has(candidate.toLowerCase())) {
      counter++;
      candidate = `${base}-${counter}`;
    }

    return candidate;
  }

  /**
   * 截断描述
   */
  private truncateDescription(description: string): string {
    const maxLength = this.config.maxDescriptionLength;

    if (description.length <= maxLength) {
      return description;
    }

    return description.slice(0, maxLength - 1) + '…';
  }

  /**
   * 解析分发配置
   */
  private parseDispatchConfig(
    entry: SkillEntry
  ): { kind: 'tool'; toolName: string; argMode: 'raw' } | undefined {
    const frontmatter = entry.frontmatter;

    // 检查命令分发类型
    const kindRaw = (
      frontmatter['command-dispatch'] ??
      ''
    )
      .trim()
      .toLowerCase();

    if (!kindRaw || kindRaw !== 'tool') {
      return undefined;
    }

    // 获取工具名称
    const toolName = (
      frontmatter['command-tool'] ??
      ''
    ).trim();

    if (!toolName) {
      this.config.logger.warn(
        `Skill "${entry.name}" requested tool dispatch but did not provide command-tool`
      );
      return undefined;
    }

    // 获取参数模式
    const argModeRaw = (
      frontmatter['command-arg-mode'] ??
      ''
    )
      .trim()
      .toLowerCase();

    const argMode = !argModeRaw || argModeRaw === 'raw' ? 'raw' : null;

    if (!argMode) {
      this.config.logger.warn(
        `Skill "${entry.name}" has unknown command-arg-mode "${argModeRaw}", falling back to raw`
      );
    }

    return {
      kind: 'tool',
      toolName,
      argMode: 'raw',
    };
  }

  /**
   * 分发到工具
   */
  private async dispatchToTool(
    spec: SkillCommandSpec,
    args: string
  ): Promise<CommandDispatchResult> {
    if (!spec.dispatch) {
      return {
        success: false,
        error: 'No dispatch configuration',
        spec,
      };
    }

    // 这里应该调用工具注册表
    // 简化实现
    this.config.logger.debug(`Dispatching to tool: ${spec.dispatch.toolName}`);

    return {
      success: true,
      result: {
        tool: spec.dispatch.toolName,
        args,
        skillName: spec.skillName,
      },
      spec,
    };
  }

  /**
   * 分发到技能
   */
  private async dispatchToSkill(
    spec: SkillCommandSpec,
    args: string
  ): Promise<CommandDispatchResult> {
    // 这里应该调用技能执行器
    // 简化实现
    this.config.logger.debug(`Dispatching to skill: ${spec.skillName}`);

    return {
      success: true,
      result: {
        skillName: spec.skillName,
        args,
        command: spec.name,
      },
      spec,
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
 * 创建命令分发器
 */
export function createCommandDispatcher(
  config?: CommandDispatchConfig
): SkillCommandDispatcher {
  return new SkillCommandDispatcher(config);
}
