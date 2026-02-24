/**
 * Command System - 统一命令系统
 *
 * 提供命令模式的标准实现
 * - 命令注册和发现
 * - 命令执行和撤销
 * - 命令历史和重做
 * - 命令组合和宏
 *
 * @module Framework/Command
 * @version 1.0.0
 */

import { createLogger, type ILogger } from '../utils/logger.js';

export interface CommandContext {
  id: string;
  timestamp: number;
  metadata: Record<string, unknown>;
}

export interface CommandResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: Error;
  undoable: boolean;
}

export interface Command<T = unknown, R = unknown> {
  id: string;
  name: string;
  description?: string;
  category?: string;
  execute(context: CommandContext, args: T): Promise<CommandResult<R>>;
  undo?(context: CommandContext, result: CommandResult<R>): Promise<void>;
  canExecute?(context: CommandContext, args: T): boolean;
}

export interface CommandDefinition<T = unknown, R = unknown> {
  name: string;
  description?: string;
  category?: string;
  handler: (args: T, context: CommandContext) => Promise<R>;
  undoHandler?: (result: R, context: CommandContext) => Promise<void>;
  canExecute?: (args: T, context: CommandContext) => boolean;
}

export interface CommandHistoryEntry {
  id: string;
  commandId: string;
  commandName: string;
  args: unknown;
  result: CommandResult;
  timestamp: number;
  undone: boolean;
  metadata?: Record<string, unknown>;
}

export interface CommandRegistryConfig {
  maxHistorySize?: number;
  enableHistory?: boolean;
  enableUndo?: boolean;
  logger?: ILogger;
}

export class CommandRegistry {
  private commands: Map<string, Command> = new Map();
  private categories: Map<string, Set<string>> = new Map();
  private history: CommandHistoryEntry[] = [];
  private logger: ILogger;
  private config: Required<CommandRegistryConfig>;
  private idCounter = 0;

  constructor(config: CommandRegistryConfig = {}) {
    this.config = {
      maxHistorySize: config.maxHistorySize ?? 100,
      enableHistory: config.enableHistory ?? true,
      enableUndo: config.enableUndo ?? true,
      logger: config.logger ?? createLogger({ name: 'CommandRegistry' }),
    };
    this.logger = this.config.logger;
  }

  register<T = unknown, R = unknown>(
    definition: CommandDefinition<T, R>
  ): string {
    const id = `cmd_${definition.name}_${Date.now()}`;

    const command: Command<T, R> = {
      id,
      name: definition.name,
      description: definition.description,
      category: definition.category,
      execute: async (context, args) => {
        try {
          const data = await definition.handler(args, context);
          return { success: true, data, undoable: !!definition.undoHandler };
        } catch (error) {
          return { success: false, error: error as Error, undoable: false };
        }
      },
      undo: definition.undoHandler
        ? async (context, result) => {
            if (result.success && result.data !== undefined) {
              await definition.undoHandler!(result.data as R, context);
            }
          }
        : undefined,
      canExecute: definition.canExecute
        ? (context, args) => definition.canExecute!(args, context)
        : undefined,
    };

    this.commands.set(id, command);

    if (definition.category) {
      if (!this.categories.has(definition.category)) {
        this.categories.set(definition.category, new Set());
      }
      this.categories.get(definition.category)!.add(id);
    }

    this.logger.debug(`Command registered: ${definition.name}`, { id, category: definition.category });

    return id;
  }

  unregister(commandId: string): boolean {
    const command = this.commands.get(commandId);
    if (!command) return false;

    this.commands.delete(commandId);

    if (command.category) {
      this.categories.get(command.category)?.delete(commandId);
    }

    this.logger.debug(`Command unregistered: ${command.name}`, { id: commandId });
    return true;
  }

  getCommand(commandId: string): Command | undefined {
    return this.commands.get(commandId);
  }

  getCommandByName(name: string): Command | undefined {
    for (const command of this.commands.values()) {
      if (command.name === name) return command;
    }
    return undefined;
  }

  getCommandsByCategory(category: string): Command[] {
    const ids = this.categories.get(category);
    if (!ids) return [];
    return Array.from(ids)
      .map(id => this.commands.get(id))
      .filter((c): c is Command => c !== undefined);
  }

  getAllCommands(): Command[] {
    return Array.from(this.commands.values());
  }

  getCategories(): string[] {
    return Array.from(this.categories.keys());
  }

  async execute<T = unknown, R = unknown>(
    commandIdOrName: string,
    args: T,
    metadata?: Record<string, unknown>
  ): Promise<CommandResult<R>> {
    let command = this.commands.get(commandIdOrName);
    if (!command) {
      command = this.getCommandByName(commandIdOrName);
    }

    if (!command) {
      return {
        success: false,
        error: new Error(`Command not found: ${commandIdOrName}`),
        undoable: false,
      };
    }

    const context: CommandContext = {
      id: this.generateId(),
      timestamp: Date.now(),
      metadata: metadata ?? {},
    };

    if (command.canExecute && !command.canExecute(context, args)) {
      return {
        success: false,
        error: new Error(`Command cannot be executed: ${command.name}`),
        undoable: false,
      };
    }

    this.logger.debug(`Executing command: ${command.name}`, { contextId: context.id });

    const result = await command.execute(context, args) as CommandResult<R>;

    if (this.config.enableHistory) {
      this.history.push({
        id: context.id,
        commandId: command.id,
        commandName: command.name,
        args,
        result,
        timestamp: context.timestamp,
        undone: false,
        metadata: context.metadata,
      });

      if (this.history.length > this.config.maxHistorySize) {
        this.history.shift();
      }
    }

    if (result.success) {
      this.logger.debug(`Command executed successfully: ${command.name}`);
    } else {
      this.logger.error(`Command execution failed: ${command.name}`, { error: result.error });
    }

    return result;
  }

  async undo(historyId?: string): Promise<boolean> {
    if (!this.config.enableUndo) {
      this.logger.warn('Undo is disabled');
      return false;
    }

    const entry = historyId
      ? this.history.find(e => e.id === historyId)
      : [...this.history].reverse().find(e => !e.undone && e.result.undoable);

    if (!entry) {
      this.logger.debug('No undoable command found');
      return false;
    }

    const command = this.commands.get(entry.commandId);
    if (!command || !command.undo) {
      this.logger.warn('Command does not support undo', { commandId: entry.commandId });
      return false;
    }

    try {
      const context: CommandContext = {
        id: this.generateId(),
        timestamp: Date.now(),
        metadata: { undoOf: entry.id },
      };

      await command.undo(context, entry.result);
      entry.undone = true;

      this.logger.info(`Command undone: ${entry.commandName}`, { historyId: entry.id });
      return true;
    } catch (error) {
      this.logger.error(`Undo failed: ${entry.commandName}`, { error });
      return false;
    }
  }

  async redo(historyId?: string): Promise<boolean> {
    const entry = historyId
      ? this.history.find(e => e.id === historyId)
      : [...this.history].reverse().find(e => e.undone);

    if (!entry) {
      this.logger.debug('No redoable command found');
      return false;
    }

    const result = await this.execute(entry.commandId, entry.args, entry.metadata);

    if (result.success) {
      entry.undone = false;
      this.logger.info(`Command redone: ${entry.commandName}`);
      return true;
    }

    return false;
  }

  getHistory(): CommandHistoryEntry[] {
    return [...this.history];
  }

  getUndoStack(): CommandHistoryEntry[] {
    return this.history.filter(e => !e.undone && e.result.undoable);
  }

  getRedoStack(): CommandHistoryEntry[] {
    return this.history.filter(e => e.undone);
  }

  clearHistory(): void {
    this.history = [];
    this.logger.debug('Command history cleared');
  }

  canUndo(): boolean {
    return this.history.some(e => !e.undone && e.result.undoable);
  }

  canRedo(): boolean {
    return this.history.some(e => e.undone);
  }

  private generateId(): string {
    return `ctx_${Date.now()}_${++this.idCounter}`;
  }
}

export class CommandBuilder<T = unknown, R = unknown> {
  private definition: Partial<CommandDefinition<T, R>> = {};

  name(name: string): this {
    this.definition.name = name;
    return this;
  }

  description(desc: string): this {
    this.definition.description = desc;
    return this;
  }

  category(cat: string): this {
    this.definition.category = cat;
    return this;
  }

  handler(fn: CommandDefinition<T, R>['handler']): this {
    this.definition.handler = fn;
    return this;
  }

  undo(fn: CommandDefinition<T, R>['undoHandler']): this {
    this.definition.undoHandler = fn;
    return this;
  }

  canExecute(fn: CommandDefinition<T, R>['canExecute']): this {
    this.definition.canExecute = fn;
    return this;
  }

  build(): CommandDefinition<T, R> {
    if (!this.definition.name || !this.definition.handler) {
      throw new Error('Command name and handler are required');
    }
    return this.definition as CommandDefinition<T, R>;
  }
}

export function command<T = unknown, R = unknown>(): CommandBuilder<T, R> {
  return new CommandBuilder();
}

export class MacroCommand implements Command<unknown[], unknown[]> {
  id: string;
  name: string;
  description?: string;
  private commands: Command[];
  private results: Map<number, CommandResult> = new Map();

  constructor(name: string, commands: Command[]) {
    this.id = `macro_${name}_${Date.now()}`;
    this.name = name;
    this.commands = commands;
    this.description = `Macro: ${commands.map(c => c.name).join(' -> ')}`;
  }

  async execute(context: CommandContext, args: unknown[]): Promise<CommandResult<unknown[]>> {
    const results: unknown[] = [];
    this.results.clear();

    for (let i = 0; i < this.commands.length; i++) {
      const cmd = this.commands[i];
      const cmdArgs = args[i];

      if (cmd.canExecute && !cmd.canExecute(context, cmdArgs)) {
        return {
          success: false,
          error: new Error(`Command ${cmd.name} cannot be executed`),
          undoable: false,
        };
      }

      const result = await cmd.execute(context, cmdArgs);
      this.results.set(i, result);

      if (!result.success) {
        for (let j = i - 1; j >= 0; j--) {
          const prevCmd = this.commands[j];
          const prevResult = this.results.get(j);
          if (prevCmd.undo && prevResult?.undoable) {
            await prevCmd.undo(context, prevResult);
          }
        }

        return {
          success: false,
          error: result.error,
          undoable: false,
        };
      }

      results.push(result.data);
    }

    return {
      success: true,
      data: results,
      undoable: this.commands.every(c => c.undo !== undefined),
    };
  }

  async undo(context: CommandContext, result: CommandResult<unknown[]>): Promise<void> {
    if (!result.success) return;

    for (let i = this.commands.length - 1; i >= 0; i--) {
      const cmd = this.commands[i];
      const cmdResult = this.results.get(i);

      if (cmd.undo && cmdResult?.undoable) {
        await cmd.undo(context, cmdResult);
      }
    }
  }
}

let globalRegistry: CommandRegistry | null = null;

export function getGlobalCommandRegistry(): CommandRegistry {
  if (!globalRegistry) {
    globalRegistry = new CommandRegistry();
  }
  return globalRegistry;
}

export function createCommandRegistry(config?: CommandRegistryConfig): CommandRegistry {
  return new CommandRegistry(config);
}
