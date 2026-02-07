/**
 * Plugin System
 * Extensible architecture for adding capabilities
 */

export interface PluginManagerConfig {
  autoLoad?: boolean;
  pluginDirectory?: string;
  allowedPlugins?: string[];
}

// Simple plugin interface for this manager
export interface Plugin {
  name: string;
  initialize(context: PluginContext): Promise<void>;
  destroy?(): Promise<void>;
}

// Simple plugin context - using generic agent interface
export interface PluginContext {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  agent: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  registerSkill: (skill: any) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  registerTool: (tool: any) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  registerMCPResource: (resource: any) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  registerMCPTool: (tool: any) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getLLMProvider: () => any;
  config: Record<string, unknown>;
}

export class PluginManager {
  private plugins = new Map<string, Plugin>();
  private contexts = new Map<string, PluginContext>();

  constructor(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    private agent: any,
    private config: PluginManagerConfig = {}
  ) {}

  async load(plugin: Plugin, config: Record<string, unknown> = {}): Promise<void> {
    // Check if plugin is allowed
    if (this.config.allowedPlugins && !this.config.allowedPlugins.includes(plugin.name)) {
      throw new Error(`Plugin '${plugin.name}' is not in the allowed list`);
    }

    // Create plugin context
    const context: PluginContext = {
      agent: this.agent,
      registerSkill: (skill) => this.agent.registerSkill?.(skill),
      registerTool: (tool) => this.agent.registerTool?.(tool),
      registerMCPResource: (resource) => this.agent.registerMCPResource?.(resource),
      registerMCPTool: (tool) => this.agent.registerMCPTool?.(tool),
      getLLMProvider: () => this.agent.llmProvider,
      config,
    };

    // Initialize plugin
    await plugin.initialize(context);

    // Store plugin and context
    this.plugins.set(plugin.name, plugin);
    this.contexts.set(plugin.name, context);
  }

  async unload(name: string): Promise<void> {
    const plugin = this.plugins.get(name);
    if (!plugin) {
      throw new Error(`Plugin '${name}' not found`);
    }

    // Call destroy hook if available
    await plugin.destroy?.();

    // Remove plugin
    this.plugins.delete(name);
    this.contexts.delete(name);
  }

  get(name: string): Plugin | undefined {
    return this.plugins.get(name);
  }

  getContext(name: string): PluginContext | undefined {
    return this.contexts.get(name);
  }

  list(): Plugin[] {
    return Array.from(this.plugins.values());
  }

  listNames(): string[] {
    return Array.from(this.plugins.keys());
  }

  isLoaded(name: string): boolean {
    return this.plugins.has(name);
  }

  async reload(name: string): Promise<void> {
    const plugin = this.plugins.get(name);
    if (!plugin) {
      throw new Error(`Plugin '${name}' not found`);
    }

    const context = this.contexts.get(name);
    if (!context) {
      throw new Error(`Context for plugin '${name}' not found`);
    }

    // Destroy and reinitialize
    await plugin.destroy?.();
    await plugin.initialize(context);
  }

  async unloadAll(): Promise<void> {
    for (const [name] of this.plugins) {
      await this.unload(name);
    }
  }

  getStats(): {
    total: number;
    withDestroy: number;
  } {
    return {
      total: this.plugins.size,
      withDestroy: this.list().filter(p => p.destroy !== undefined).length,
    };
  }
}

// Plugin Factory for creating plugins from different sources
export interface PluginFactory {
  create(config: Record<string, unknown>): Plugin | Promise<Plugin>;
}

export class PluginLoader {
  private factories = new Map<string, PluginFactory>();

  registerFactory(type: string, factory: PluginFactory): void {
    this.factories.set(type, factory);
  }

  async loadFromSource(
    type: string,
    source: string,
    config: Record<string, unknown> = {}
  ): Promise<Plugin> {
    const factory = this.factories.get(type);
    if (!factory) {
      throw new Error(`Unknown plugin type: ${type}`);
    }

    // Load plugin configuration from source
    // This could be a file path, URL, or other source
    const pluginConfig = await this.loadConfig(source);

    return factory.create({ ...pluginConfig, ...config });
  }

  private async loadConfig(source: string): Promise<Record<string, unknown>> {
    // Implementation depends on source type
    // Could load from JSON, YAML, remote URL, etc.
    if (source.startsWith('http')) {
      const response = await fetch(source);
      return response.json();
    }

    // Default: assume it's a JSON file
    // Note: File system operations are only available in Node.js
    // Browser environments should use URLs or pass config objects directly
    throw new Error(
      'Loading config from file path is not supported. ' +
        'Use a URL (http/https) or pass config object directly.'
    );
  }
}
