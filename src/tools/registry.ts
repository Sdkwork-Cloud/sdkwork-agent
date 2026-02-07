/**
 * Tool Registry for managing and discovering tools
 */

import { Tool, ToolOutput, ExecutionContext } from './core/types.js';

export interface ToolRegistryConfig {
  autoDiscover?: boolean;
  toolDirectory?: string;
}

export class ToolRegistry {
  private tools = new Map<string, Tool>();
  private categories = new Map<string, Set<string>>();

  constructor(_config: ToolRegistryConfig = {}) {
    // Config stored for future use
    void _config;
  }

  register(tool: Tool): void {
    this.tools.set(tool.name, tool);

    // Categorize tool
    if (tool.metadata?.category) {
      const category = tool.metadata.category;
      if (!this.categories.has(category)) {
        this.categories.set(category, new Set());
      }
      this.categories.get(category)!.add(tool.name);
    }
  }

  unregister(name: string): boolean {
    const tool = this.tools.get(name);
    if (!tool) return false;

    // Remove from categories
    if (tool.metadata?.category) {
      this.categories.get(tool.metadata.category)?.delete(name);
    }

    return this.tools.delete(name);
  }

  get(name: string): Tool | undefined {
    return this.tools.get(name);
  }

  has(name: string): boolean {
    return this.tools.has(name);
  }

  list(): Tool[] {
    return Array.from(this.tools.values());
  }

  listNames(): string[] {
    return Array.from(this.tools.keys());
  }

  findByCategory(category: string): Tool[] {
    const names = this.categories.get(category);
    if (!names) return [];
    return Array.from(names)
      .map(name => this.tools.get(name))
      .filter((tool): tool is Tool => tool !== undefined);
  }

  findByTag(tag: string): Tool[] {
    return this.list().filter(tool => tool.metadata?.tags?.includes(tag));
  }

  findByConfirmation(needsConfirmation: boolean): Tool[] {
    return this.list().filter(
      tool => (tool.metadata?.requiresConfirmation ?? false) === needsConfirmation
    );
  }

  search(query: string): Tool[] {
    const lowerQuery = query.toLowerCase();
    return this.list().filter(
      tool =>
        tool.name.toLowerCase().includes(lowerQuery) ||
        tool.description.toLowerCase().includes(lowerQuery) ||
        tool.metadata?.tags?.some((tag: string) => tag.toLowerCase().includes(lowerQuery))
    );
  }

  async execute(name: string, input: unknown, context: ExecutionContext): Promise<ToolOutput> {
    const tool = this.tools.get(name);
    if (!tool) {
      return {
        content: [{ type: 'error', text: `Tool '${name}' not found in registry` }],
        isError: true,
      };
    }
    return tool.execute(input, context);
  }

  clear(): void {
    this.tools.clear();
    this.categories.clear();
  }

  getCategories(): string[] {
    return Array.from(this.categories.keys());
  }

  getStats(): { total: number; categories: number; requireConfirmation: number } {
    return {
      total: this.tools.size,
      categories: this.categories.size,
      requireConfirmation: this.list().filter(t => t.metadata?.requiresConfirmation).length,
    };
  }
}
