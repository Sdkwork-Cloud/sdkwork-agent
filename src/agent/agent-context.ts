/**
 * Agent Context - 智能体上下文
 *
 * 所有智能体共享的上下文，包含：
 * - Skill 管理
 * - MCP 客户端
 * - Plugin 系统
 * - Memory 存储
 * - Tool 注册表
 * - LLM 服务
 *
 * @module AgentContext
 * @version 1.0.0
 */

import type { LLMService } from '../skills/core/types.js';
import type { SkillDefinition } from './types.js';

// ============================================================================
/**
 * Simple logger interface for agent context
 */
export type ContextLogger = import('../utils/logger').ILogger;

// ============================================================================
// Tool Registry
// ============================================================================

/**
 * 工具注册表接口
 */
export interface ToolRegistry {
  /** 获取工具 */
  get(name: string): unknown | undefined;
  /** 执行工具 */
  execute(name: string, params: unknown): Promise<unknown>;
  /** 列出所有工具 */
  list(): string[];
}

// ============================================================================
// MCP Client
// ============================================================================

/**
 * MCP 客户端接口
 */
export interface MCPClient {
  /** 调用工具 */
  callTool(server: string, tool: string, params: unknown): Promise<unknown>;
  /** 获取可用工具 */
  getTools(server: string): Promise<string[]>;
  /** 列出所有服务器 */
  listServers(): string[];
}

// ============================================================================
// Plugin Manager
// ============================================================================

/**
 * Plugin 管理器接口
 */
export interface PluginManager {
  /** 加载插件 */
  load(pluginId: string): Promise<boolean>;
  /** 卸载插件 */
  unload(pluginId: string): Promise<boolean>;
  /** 获取插件 */
  get(pluginId: string): unknown | undefined;
  /** 列出所有插件 */
  list(): string[];
}

// ============================================================================
// Memory Store
// ============================================================================

/**
 * Memory 存储接口
 */
export interface MemoryStore {
  /** 保存记忆 */
  save(key: string, value: unknown): Promise<void>;
  /** 读取记忆 */
  load(key: string): Promise<unknown | undefined>;
  /** 删除记忆 */
  delete(key: string): Promise<void>;
  /** 搜索记忆 */
  search(query: string): Promise<Array<{ key: string; value: unknown }>>;
  /** 清空记忆 */
  clear(): Promise<void>;
}

// ============================================================================
// Skill Registry
// ============================================================================

/**
 * Skill 注册表接口
 */
export interface SkillRegistry {
  /** 注册技能 */
  register(skill: SkillDefinition): void;
  /** 注销技能 */
  unregister(name: string): boolean;
  /** 获取技能 */
  get(name: string): SkillDefinition | undefined;
  /** 列出所有技能 */
  list(): SkillDefinition[];
  /** 执行技能 */
  execute(name: string, input: unknown): Promise<unknown>;
}

// ============================================================================
// Agent Context Config
// ============================================================================

/**
 * 智能体上下文配置
 */
export interface AgentContextConfig {
  /** LLM 服务 */
  llm: LLMService;
  /** 日志器 */
  logger?: ContextLogger;
  /** 工具注册表 */
  tools?: ToolRegistry;
  /** MCP 客户端 */
  mcp?: MCPClient;
  /** 插件管理器 */
  plugins?: PluginManager;
  /** 记忆存储 */
  memory?: MemoryStore;
  /** 技能注册表 */
  skills?: SkillRegistry;
}

// ============================================================================
// Agent Context
// ============================================================================

/**
 * 智能体上下文
 *
 * 所有智能体共享的上下文环境
 */
export class AgentContext {
  /** LLM 服务 */
  readonly llm: LLMService;
  /** 日志器 */
  readonly logger: ContextLogger;
  /** 工具注册表 */
  readonly tools: ToolRegistry;
  /** MCP 客户端 */
  readonly mcp: MCPClient;
  /** 插件管理器 */
  readonly plugins: PluginManager;
  /** 记忆存储 */
  readonly memory: MemoryStore;
  /** 技能注册表 */
  readonly skills: SkillRegistry;

  constructor(config: AgentContextConfig) {
    this.llm = config.llm;
    this.logger = config.logger || this.createDefaultLogger();
    this.tools = config.tools || this.createDefaultToolRegistry();
    this.mcp = config.mcp || this.createDefaultMCPClient();
    this.plugins = config.plugins || this.createDefaultPluginManager();
    this.memory = config.memory || this.createDefaultMemoryStore();
    this.skills = config.skills || this.createDefaultSkillRegistry();
  }

  /**
   * 创建默认日志器
   */
  private createDefaultLogger(): ContextLogger {
    return {
      debug: () => {},
      info: console.info,
      warn: console.warn,
      error: console.error,
    };
  }

  /**
   * 创建默认工具注册表
   */
  private createDefaultToolRegistry(): ToolRegistry {
    const tools = new Map<string, unknown>();
    return {
      get: (name: string) => tools.get(name),
      execute: async (name: string, _params: unknown) => {
        const tool = tools.get(name);
        if (!tool) throw new Error(`Tool not found: ${name}`);
        return tool;
      },
      list: () => Array.from(tools.keys()),
    };
  }

  /**
   * 创建默认 MCP 客户端
   */
  private createDefaultMCPClient(): MCPClient {
    const servers = new Map<string, string[]>();
    return {
      callTool: async (server: string, tool: string, _params: unknown) => {
        throw new Error(`MCP not configured: ${server}.${tool}`);
      },
      getTools: async (server: string) => servers.get(server) || [],
      listServers: () => Array.from(servers.keys()),
    };
  }

  /**
   * 创建默认插件管理器
   */
  private createDefaultPluginManager(): PluginManager {
    const plugins = new Map<string, unknown>();
    return {
      load: async (pluginId: string) => {
        this.logger.debug(`Loading plugin: ${pluginId}`);
        return true;
      },
      unload: async (pluginId: string) => {
        plugins.delete(pluginId);
        return true;
      },
      get: (pluginId: string) => plugins.get(pluginId),
      list: () => Array.from(plugins.keys()),
    };
  }

  /**
   * 创建默认记忆存储
   */
  private createDefaultMemoryStore(): MemoryStore {
    const memory = new Map<string, unknown>();
    return {
      save: async (key: string, value: unknown) => {
        memory.set(key, value);
      },
      load: async (key: string) => memory.get(key),
      delete: async (key: string) => {
        memory.delete(key);
      },
      search: async (query: string) => {
        const results: Array<{ key: string; value: unknown }> = [];
        for (const [key, value] of memory) {
          if (key.includes(query) || String(value).includes(query)) {
            results.push({ key, value });
          }
        }
        return results;
      },
      clear: async () => {
        memory.clear();
      },
    };
  }

  /**
   * 创建默认技能注册表
   */
  private createDefaultSkillRegistry(): SkillRegistry {
    const skills = new Map<string, SkillDefinition>();
    return {
      register: (skill: SkillDefinition) => {
        skills.set(skill.name, skill);
      },
      unregister: (name: string) => skills.delete(name),
      get: (name: string) => skills.get(name),
      list: () => Array.from(skills.values()),
      execute: async (name: string, input: unknown) => {
        const skill = skills.get(name);
        if (!skill) throw new Error(`Skill not found: ${name}`);
        if (skill.run) {
          // Return execution configuration and input
          return { skill: skill.run, input };
        }
        throw new Error(`Skill has no run configuration: ${name}`);
      },
    };
  }
}

// ============================================================================
// Factory Function
// ============================================================================

/**
 * 创建智能体上下文
 */
export function createAgentContext(config: AgentContextConfig): AgentContext {
  return new AgentContext(config);
}
