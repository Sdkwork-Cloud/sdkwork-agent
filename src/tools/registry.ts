/**
 * Tool Registry - 工具注册表
 *
 * 插件化架构，支持并行执行、重试策略
 *
 * @module ToolRegistry
 * @version 2.0.0
 */

import type {
  Tool,
  ToolId,
  ToolName,
  ToolCategory,
  ToolResult,
  ExecutionContext,
  ToolExecutionOptions,
  IToolRegistry,
  ToolPlugin,
} from './core/types.js';

export class ToolRegistry implements IToolRegistry {
  private tools = new Map<ToolId, Tool>();
  private nameToId = new Map<ToolName, ToolId>();
  private categories = new Map<ToolCategory, Set<ToolId>>();
  private plugins = new Map<string, ToolPlugin>();

  // ============================================================================
  // Tool Management
  // ============================================================================

  register(tool: Tool): void {
    this.tools.set(tool.id, tool);
    this.nameToId.set(tool.name, tool.id);

    // 按分类索引
    if (!this.categories.has(tool.category)) {
      this.categories.set(tool.category, new Set());
    }
    this.categories.get(tool.category)!.add(tool.id);
  }

  unregister(toolId: ToolId): boolean {
    const tool = this.tools.get(toolId);
    if (!tool) return false;

    this.nameToId.delete(tool.name);
    this.categories.get(tool.category)?.delete(toolId);
    this.tools.delete(toolId);

    return true;
  }

  get(toolId: ToolId): Tool | undefined {
    return this.tools.get(toolId);
  }

  getByName(name: ToolName): Tool | undefined {
    const id = this.nameToId.get(name);
    return id ? this.tools.get(id) : undefined;
  }

  has(toolId: ToolId): boolean {
    return this.tools.has(toolId);
  }

  list(): Tool[] {
    return Array.from(this.tools.values());
  }

  listByCategory(category: ToolCategory): Tool[] {
    const ids = this.categories.get(category);
    if (!ids) return [];
    return Array.from(ids)
      .map(id => this.tools.get(id))
      .filter((tool): tool is Tool => tool !== undefined);
  }

  search(query: string): Tool[] {
    const lowerQuery = query.toLowerCase();
    return this.list().filter(
      tool =>
        tool.name.toLowerCase().includes(lowerQuery) ||
        tool.description.toLowerCase().includes(lowerQuery) ||
        tool.metadata?.tags?.some(tag => tag.toLowerCase().includes(lowerQuery))
    );
  }

  clear(): void {
    this.tools.clear();
    this.nameToId.clear();
    this.categories.clear();
  }

  // ============================================================================
  // Plugin Management
  // ============================================================================

  async loadPlugin(plugin: ToolPlugin): Promise<void> {
    if (this.plugins.has(plugin.name)) {
      throw new Error(`Plugin '${plugin.name}' is already loaded`);
    }

    // 注册插件的所有工具
    for (const tool of plugin.tools) {
      this.register(tool);
    }

    // 初始化插件
    if (plugin.initialize) {
      await plugin.initialize(this);
    }

    this.plugins.set(plugin.name, plugin);
  }

  async unloadPlugin(pluginName: string): Promise<void> {
    const plugin = this.plugins.get(pluginName);
    if (!plugin) return;

    // 销毁插件
    if (plugin.destroy) {
      await plugin.destroy();
    }

    // 注销插件的所有工具
    for (const tool of plugin.tools) {
      this.unregister(tool.id);
    }

    this.plugins.delete(pluginName);
  }

  getLoadedPlugins(): string[] {
    return Array.from(this.plugins.keys());
  }

  // ============================================================================
  // Execution
  // ============================================================================

  async execute(
    toolId: ToolId,
    input: unknown,
    context: ExecutionContext,
    options: ToolExecutionOptions = {}
  ): Promise<ToolResult> {
    const tool = this.tools.get(toolId);
    if (!tool) {
      return {
        success: false,
        error: {
          code: 'TOOL_NOT_FOUND',
          message: `Tool not found: ${toolId}`,
          recoverable: false,
        },
      };
    }

    // 合并选项（工具元数据 + 传入选项）
    const timeout = options.timeout ?? tool.metadata?.timeout ?? 30000;
    const retries = options.retries ?? tool.metadata?.retries ?? 0;
    const retryDelay = options.retryDelay ?? 1000;

    let lastError: Error | undefined;

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const startTime = Date.now();

        // 创建带超时的执行
        const executePromise = tool.execute(input, context);
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error(`Tool execution timeout after ${timeout}ms`)), timeout);
        });

        const result = await Promise.race([executePromise, timeoutPromise]);

        return {
          ...result,
          metadata: {
            ...result.metadata,
            duration: Date.now() - startTime,
            attempts: attempt + 1,
          },
        };
      } catch (error) {
        lastError = error as Error;

        if (attempt < retries) {
          context.logger.warn(
            `[Tool:${tool.name}] Execution failed, retrying (${attempt + 1}/${retries})`,
            { error: lastError.message }
          );
          await this.delay(retryDelay * Math.pow(2, attempt)); // 指数退避
        }
      }
    }

    return {
      success: false,
      error: {
        code: 'TOOL_EXECUTION_FAILED',
        message: lastError?.message || 'Unknown error',
        recoverable: false,
        details: { attempts: retries + 1 },
      },
      metadata: {
        attempts: retries + 1,
      },
    };
  }

  async executeParallel(
    calls: Array<{ toolId: ToolId; input: unknown }>,
    context: ExecutionContext,
    options: ToolExecutionOptions = {}
  ): Promise<ToolResult[]> {
    const executions = calls.map(({ toolId, input }) =>
      this.execute(toolId, input, context, options)
    );

    return Promise.all(executions);
  }

  // ============================================================================
  // Stats
  // ============================================================================

  getStats(): {
    totalTools: number;
    categories: Record<ToolCategory, number>;
    loadedPlugins: number;
  } {
    const categories: Record<string, number> = {};
    for (const [category, ids] of this.categories) {
      categories[category] = ids.size;
    }

    return {
      totalTools: this.tools.size,
      categories: categories as Record<ToolCategory, number>,
      loadedPlugins: this.plugins.size,
    };
  }

  // ============================================================================
  // Private
  // ============================================================================

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// ============================================================================
// Factory
// ============================================================================

export function createToolRegistry(): ToolRegistry {
  return new ToolRegistry();
}

// 全局注册表实例
let globalRegistry: ToolRegistry | null = null;

export function getGlobalToolRegistry(): ToolRegistry {
  if (!globalRegistry) {
    globalRegistry = createToolRegistry();
  }
  return globalRegistry;
}

export function resetGlobalToolRegistry(): void {
  globalRegistry = null;
}
