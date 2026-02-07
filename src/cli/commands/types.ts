/**
 * CLI Commands Types - 命令类型定义
 *
 * @module CLI
 * @version 1.0.0
 */

/**
 * 命令上下文
 */
export interface CommandContext {
  /** 命令名称 */
  name: string;
  /** 命令参数 */
  args: string[];
  /** 命令选项 */
  options: Record<string, unknown>;
}

/**
 * 命令结果
 */
export interface CommandResult {
  /** 是否成功 */
  success: boolean;
  /** 输出消息 */
  message?: string;
  /** 错误信息 */
  error?: string;
  /** 附加数据 */
  data?: unknown;
}

/**
 * 命令处理器
 */
export type CommandHandler = (context: CommandContext) => Promise<CommandResult>;
