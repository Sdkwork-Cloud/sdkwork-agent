import type { TUIRenderer } from './renderer.js';
import type { SDKWorkConfig, Command } from './types.js';
import type { Session, UsageStats } from './storage.js';

export interface CommandContext {
  config: SDKWorkConfig;
  messages: Array<{ role: string; content: string }>;
  history: Array<{ input: string; timestamp: number }>;
  stats: UsageStats;
  currentSession: Session | null;
  renderer: TUIRenderer;
  agent: unknown;
  skills: unknown[];
  eventLogger: unknown;
  conversationManager: unknown;
}

export interface CommandResult {
  success: boolean;
  message?: string;
  shouldContinue?: boolean;
}

export type CommandHandler = (ctx: CommandContext, args: string) => Promise<CommandResult>;

export interface CommandDefinition {
  name: string;
  description: string;
  alias?: string[];
  category: 'general' | 'session' | 'capabilities' | 'settings' | 'info';
  usage?: string;
  examples?: string[];
  handler: CommandHandler;
}

export class CommandRegistry {
  private commands: Map<string, CommandDefinition> = new Map();

  register(cmd: CommandDefinition): void {
    this.commands.set(cmd.name, cmd);
    cmd.alias?.forEach(alias => this.commands.set(alias, cmd));
  }

  get(name: string): CommandDefinition | undefined {
    return this.commands.get(name);
  }

  has(name: string): boolean {
    return this.commands.has(name);
  }

  getAll(): CommandDefinition[] {
    return Array.from(this.commands.values());
  }

  getByCategory(category: string): CommandDefinition[] {
    return this.getAll().filter(cmd => cmd.category === category);
  }

  getCategories(): string[] {
    return [...new Set(this.getAll().map(cmd => cmd.category))];
  }

  parse(input: string): { command: string; args: string } {
    const trimmed = input.trim();
    if (!trimmed.startsWith('/')) {
      return { command: '', args: trimmed };
    }
    
    const spaceIdx = trimmed.indexOf(' ');
    if (spaceIdx === -1) {
      return { command: trimmed.slice(1), args: '' };
    }
    
    return {
      command: trimmed.slice(1, spaceIdx),
      args: trimmed.slice(spaceIdx + 1)
    };
  }
}

export function createCommandHelp(commands: CommandDefinition[], renderer: TUIRenderer): string[] {
  const categoryNames: Record<string, string> = {
    general: '通用',
    session: '会话',
    capabilities: '功能',
    settings: '设置',
    info: '信息',
  };

  const categoryOrder = ['general', 'session', 'capabilities', 'settings', 'info'];
  const categorized = new Map<string, CommandDefinition[]>();

  commands.forEach(cmd => {
    const cat = cmd.category || 'general';
    if (!categorized.has(cat)) categorized.set(cat, []);
    categorized.get(cat)!.push(cmd);
  });

  const helpLines: string[] = ['', renderer.bold('📋 可用命令:'), ''];
  
  categoryOrder.forEach(cat => {
    const cmds = categorized.get(cat);
    if (cmds && cmds.length > 0) {
      helpLines.push(renderer.dim(`  ${categoryNames[cat] || cat}:`));
      cmds.forEach(cmd => {
        const aliases = cmd.alias ? renderer.dim(` (${cmd.alias.join(', ')})`) : '';
        helpLines.push(`    ${renderer.primary(`/${cmd.name}`.padEnd(12))} - ${cmd.description}${aliases}`);
      });
      helpLines.push('');
    }
  });

  helpLines.push(renderer.bold('💡 提示:'));
  helpLines.push(`  输入 ${renderer.primary('/help <command>')} 查看详细用法`);
  helpLines.push('');

  return helpLines;
}

export function createCommandParser() {
  return {
    parse: (input: string): { command: string; args: string } => {
      const trimmed = input.trim();
      if (!trimmed.startsWith('/')) {
        return { command: '', args: trimmed };
      }
      
      const spaceIdx = trimmed.indexOf(' ');
      if (spaceIdx === -1) {
        return { command: trimmed.slice(1), args: '' };
      }
      
      return {
        command: trimmed.slice(1, spaceIdx),
        args: trimmed.slice(spaceIdx + 1)
      };
    },
    
    parseKeyValue: (args: string): Record<string, string> => {
      const result: Record<string, string> = {};
      const pairs = args.split(/[, ]+/);
      
      for (const pair of pairs) {
        const [key, ...valueParts] = pair.split('=');
        if (key && valueParts.length > 0) {
          result[key.trim()] = valueParts.join('=').trim();
        }
      }
      
      return result;
    },
    
    extractFlags: (args: string): { flags: Set<string>; rest: string } => {
      const flags = new Set<string>();
      const parts = args.split(/\s+/);
      const restParts: string[] = [];
      
      for (const part of parts) {
        if (part.startsWith('--')) {
          flags.add(part.slice(2));
        } else if (part.startsWith('-') && part.length > 1) {
          part.slice(1).split('').forEach(f => flags.add(f));
        } else {
          restParts.push(part);
        }
      }
      
      return { flags, rest: restParts.join(' ') };
    }
  };
}
