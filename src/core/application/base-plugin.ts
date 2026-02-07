import type {
  Plugin,
  PluginConfig,
  PluginState,
  PluginContext,
} from '../domain/plugin';

/**
 * Base Plugin Implementation
 * 插件基类，提供默认实现
 *
 * @example
 * ```typescript
 * class MyPlugin extends BasePlugin {
 *   constructor() {
 *     super({
 *       id: 'my-plugin',
 *       name: 'My Plugin',
 *       version: '1.0.0',
 *       type: 'custom',
 *     });
 *   }
 *
 *   async onInitialize(): Promise<void> {
 *     // Custom initialization logic
 *   }
 * }
 * ```
 */
export abstract class BasePlugin implements Plugin {
  readonly config: PluginConfig;
  private _state: PluginState = 'registered' as PluginState;
  protected _context?: PluginContext;

  constructor(config: PluginConfig) {
    this.config = config;
  }

  get state(): PluginState {
    return this._state;
  }

  /**
   * Initialize the plugin
   * Called once when the plugin is first loaded
   */
  async initialize(context: PluginContext): Promise<void> {
    this._state = 'initializing' as PluginState;
    this._context = context;

    try {
      await this.onInitialize();
      this._state = 'active' as PluginState;
    } catch (error) {
      this._state = 'error' as PluginState;
      throw error;
    }
  }

  /**
   * Activate the plugin
   * Called when the plugin should start processing
   */
  async activate(): Promise<void> {
    if (this._state !== 'active' && this._state !== 'inactive') {
      throw new Error(`Cannot activate plugin in state: ${this._state}`);
    }

    await this.onActivate();
    this._state = 'active' as PluginState;
  }

  /**
   * Deactivate the plugin
   * Called when the plugin should pause processing
   */
  async deactivate(): Promise<void> {
    if (this._state !== 'active') {
      return;
    }

    await this.onDeactivate();
    this._state = 'inactive' as PluginState;
  }

  /**
   * Destroy the plugin
   * Called when the plugin is being removed
   */
  async destroy(): Promise<void> {
    if (this._state === 'error') {
      return;
    }

    await this.onDestroy();
    this._state = 'error' as PluginState;
    this._context = undefined;
  }

  /**
   * Health check
   * Override to provide custom health check logic
   */
  async healthCheck(): Promise<{ healthy: boolean; message: string; timestamp: number }> {
    return {
      healthy: this._state === 'active',
      message: `Plugin is ${this._state}`,
      timestamp: Date.now(),
    };
  }

  // ============================================
  // Protected Methods - Override in subclass
  // ============================================

  /**
   * Called during initialization
   * Override to implement custom initialization logic
   */
  protected async onInitialize(): Promise<void> {
    // Default: no-op
  }

  /**
   * Called when the plugin is activated
   * Override to implement custom activation logic
   */
  protected async onActivate(): Promise<void> {
    // Default: no-op
  }

  /**
   * Called when the plugin is deactivated
   * Override to implement custom deactivation logic
   */
  protected async onDeactivate(): Promise<void> {
    // Default: no-op
  }

  /**
   * Called when the plugin is destroyed
   * Override to implement custom cleanup logic
   */
  protected async onDestroy(): Promise<void> {
    // Default: no-op
  }

  // ============================================
  // Utility Methods
  // ============================================

  /**
   * Get a configuration value
   */
  protected getConfig<T>(key: string, defaultValue?: T): T {
    if (!this._context) {
      throw new Error('Plugin not initialized');
    }
    return this._context.getConfig(key, defaultValue);
  }

  /**
   * Set a configuration value
   */
  protected setConfig<T>(key: string, value: T): void {
    if (!this._context) {
      throw new Error('Plugin not initialized');
    }
    this._context.setConfig(key, value);
  }

  /**
   * Get the logger
   */
  protected get logger() {
    if (!this._context) {
      throw new Error('Plugin not initialized');
    }
    return this._context.logger;
  }

  /**
   * Get the storage
   */
  protected get storage() {
    if (!this._context) {
      throw new Error('Plugin not initialized');
    }
    return this._context.storage;
  }
}

export default BasePlugin;
