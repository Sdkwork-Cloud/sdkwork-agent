/**
 * Plugin Manager Implementation
 * Professional plugin system with complete lifecycle management
 * Reference: VSCode Extension Host, Rollup Plugin System
 */

import { EventEmitter } from '../../utils/event-emitter';
import { Logger, createLogger } from '../../utils/logger';
import {
  Plugin,
  PluginConfig,
  PluginState,
  PluginType,
  PluginContext,
  PluginStorage,
  PluginLogger,
  PluginRegistry,
  PluginManager,
  Disposable,
  HookHandler,
  HookContext,
  CommandHandler,
  CommandContext,
  HookResult,
  PluginValidationResult,
} from '../domain/plugin';

// ============================================================================
// Plugin Storage Implementation
// ============================================================================

class PluginStorageImpl implements PluginStorage {
  private _global = new Map<string, unknown>();
  private _session = new Map<string, unknown>();

  get<T>(key: string): T | undefined {
    return this._global.get(key) as T | undefined;
  }

  set<T>(key: string, value: T): void {
    this._global.set(key, value);
  }

  delete(key: string): void {
    this._global.delete(key);
  }

  clear(): void {
    this._global.clear();
  }

  getSession<T>(key: string): T | undefined {
    return this._session.get(key) as T | undefined;
  }

  setSession<T>(key: string, value: T): void {
    this._session.set(key, value);
  }

  deleteSession(key: string): void {
    this._session.delete(key);
  }

  clearSession(): void {
    this._session.clear();
  }
}

// ============================================================================
// Plugin Logger Implementation
// ============================================================================

class PluginLoggerImpl implements PluginLogger {
  private _logger: Logger;

  constructor(private _pluginId: string) {
    this._logger = createLogger({ name: `Plugin:${this._pluginId}` });
  }

  debug(message: string, ...args: unknown[]): void {
    this._logger.debug(message, { args });
  }

  info(message: string, ...args: unknown[]): void {
    this._logger.info(message, { args });
  }

  warn(message: string, ...args: unknown[]): void {
    this._logger.warn(message, { args });
  }

  error(message: string, context?: Record<string, unknown>, _error?: Error): void {
    this._logger.error(message, context);
  }
}

// ============================================================================
// Plugin Context Implementation
// ============================================================================

class PluginContextImpl implements PluginContext {
  readonly id: string;
  readonly name: string;
  readonly version: string;
  readonly storage: PluginStorage;
  readonly logger: PluginLogger;

  private _state: PluginState = 'registered';
  private _config: Map<string, unknown> = new Map();
  private _hooks = new Map<string, Array<{ handler: HookHandler; priority: number }>>();
  private _commands = new Map<string, CommandHandler>();
  private _services = new Map<string, unknown>();
  private _disposables: Disposable[] = [];
  private _eventHandlers = new Map<string, Set<(data: unknown) => void | Promise<void>>>();

  private _manager: PluginManagerImpl;

  constructor(
    config: PluginConfig,
    manager: PluginManagerImpl
  ) {
    this.id = config.id;
    this.name = config.name;
    this.version = config.version;
    this.storage = new PluginStorageImpl();
    this.logger = new PluginLoggerImpl(config.id);
    this._manager = manager;
  }

  get state(): PluginState {
    return this._state;
  }

  setState(state: PluginState): void {
    this._state = state;
  }

  getConfig<T>(key: string, defaultValue?: T): T {
    return (this._config.get(key) as T) ?? defaultValue!;
  }

  setConfig<T>(key: string, value: T): void {
    this._config.set(key, value);
  }

  onEvent<T>(event: string, handler: (data: T) => void | Promise<void>): void {
    if (!this._eventHandlers.has(event)) {
      this._eventHandlers.set(event, new Set());
    }
    this._eventHandlers.get(event)!.add(handler as (data: unknown) => void | Promise<void>);
  }

  offEvent<T>(event: string, handler: (data: T) => void | Promise<void>): void {
    this._eventHandlers.get(event)?.delete(handler as (data: unknown) => void | Promise<void>);
  }

  async emitEvent<T>(event: string, data: T): Promise<void> {
    const handlers = this._eventHandlers.get(event);
    if (handlers) {
      for (const handler of handlers) {
        try {
          await handler(data);
        } catch (error) {
          this.logger.error(`Error in event handler for ${event}`, { error: (error as Error).message });
        }
      }
    }
  }

  registerHook(point: string, handler: HookHandler, priority: number = 100): void {
    if (!this._hooks.has(point)) {
      this._hooks.set(point, []);
    }
    const hooks = this._hooks.get(point)!;
    hooks.push({ handler, priority });
    hooks.sort((a, b) => a.priority - b.priority);
  }

  unregisterHook(point: string, handler: HookHandler): void {
    const hooks = this._hooks.get(point);
    if (hooks) {
      const index = hooks.findIndex(h => h.handler === handler);
      if (index !== -1) {
        hooks.splice(index, 1);
      }
    }
  }

  getHooks(point: string): Array<{ handler: HookHandler; priority: number }> {
    return this._hooks.get(point) || [];
  }

  registerCommand(id: string, handler: CommandHandler): void {
    this._commands.set(id, handler);
    this._manager.registerCommand(id, this.id, handler);
  }

  unregisterCommand(id: string): void {
    this._commands.delete(id);
    this._manager.unregisterCommand(id);
  }

  getService<T>(id: string): T | undefined {
    return this._services.get(id) as T | undefined;
  }

  registerService<T>(id: string, service: T): void {
    this._services.set(id, service);
  }

  subscribe(disposable: Disposable): void {
    this._disposables.push(disposable);
  }

  async dispose(): Promise<void> {
    for (const disposable of this._disposables) {
      try {
        await disposable.dispose();
      } catch (error) {
        this.logger.error('Error disposing resource', { error: (error as Error).message });
      }
    }
    this._disposables = [];
    this._hooks.clear();
    this._commands.clear();
    this._services.clear();
    this._eventHandlers.clear();
  }
}

// ============================================================================
// Plugin Registry Implementation
// ============================================================================

export class PluginRegistryImpl implements PluginRegistry {
  private _plugins = new Map<string, Plugin>();

  register(plugin: Plugin): void {
    if (this._plugins.has(plugin.config.id)) {
      throw new Error(`Plugin already registered: ${plugin.config.id}`);
    }
    this._plugins.set(plugin.config.id, plugin);
  }

  unregister(pluginId: string): void {
    this._plugins.delete(pluginId);
  }

  get(pluginId: string): Plugin | undefined {
    return this._plugins.get(pluginId);
  }

  list(): Plugin[] {
    return Array.from(this._plugins.values());
  }

  listByType(type: PluginType): Plugin[] {
    return this.list().filter(p => p.config.type === type);
  }

  listByState(state: PluginState): Plugin[] {
    return this.list().filter(p => p.state === state);
  }

  has(pluginId: string): boolean {
    return this._plugins.has(pluginId);
  }

  clear(): void {
    this._plugins.clear();
  }
}

// ============================================================================
// Plugin Manager Implementation
// ============================================================================

export class PluginManagerImpl extends EventEmitter implements PluginManager {
  private _registry: PluginRegistry;
  private _contexts = new Map<string, PluginContextImpl>();
  private _commands = new Map<string, { pluginId: string; handler: CommandHandler }>();
  private _eventEmitter = new EventEmitter();
  private _pluginLogger: Logger;

  constructor(registry?: PluginRegistry) {
    super();
    this._registry = registry || new PluginRegistryImpl();
    this._pluginLogger = createLogger({ name: 'PluginManager' });
  }

  get plugins(): Map<string, Plugin> {
    return new Map(this._registry.list().map(p => [p.config.id, p]));
  }

  get context(): Map<string, PluginContext> {
    return new Map(this._contexts);
  }

  // ============================================
  // Lifecycle Management
  // ============================================

  async initialize(pluginId: string): Promise<void> {
    const plugin = this._registry.get(pluginId);
    if (!plugin) {
      throw new Error(`Plugin not found: ${pluginId}`);
    }

    const context = this._contexts.get(pluginId);
    if (!context) {
      throw new Error(`Plugin context not found: ${pluginId}`);
    }

    if (context.state !== 'registered') {
      throw new Error(`Cannot initialize plugin in state: ${context.state}`);
    }

    context.setState('initializing');
    this.emit('plugin:initializing', { pluginId });

    try {
      if (plugin.initialize) {
        await plugin.initialize(context);
      }

      context.setState('initialized');
      this.emit('plugin:initialized', { pluginId });
    } catch (error) {
      context.setState('error');
      this.emit('plugin:error', { pluginId, error: error as Error });
      throw error;
    }
  }

  async initializeAll(): Promise<void> {
    const plugins = this._registry.list();
    // Sort by priority (lower number = higher priority)
    plugins.sort((a, b) => (a.config.priority || 100) - (b.config.priority || 100));

    for (const plugin of plugins) {
      if (plugin.config.enabled !== false) {
        await this.initialize(plugin.config.id);
      }
    }
  }

  async activate(pluginId: string): Promise<void> {
    const plugin = this._registry.get(pluginId);
    if (!plugin) {
      throw new Error(`Plugin not found: ${pluginId}`);
    }

    const context = this._contexts.get(pluginId);
    if (!context) {
      throw new Error(`Plugin context not found: ${pluginId}`);
    }

    if (context.state !== 'initialized' && context.state !== 'inactive') {
      throw new Error(`Cannot activate plugin in state: ${context.state}`);
    }

    context.setState('activating');
    this.emit('plugin:activating', { pluginId });

    try {
      if (plugin.activate) {
        await plugin.activate(context);
      }

      context.setState('active');
      this.emit('plugin:activated', { pluginId });
    } catch (error) {
      context.setState('error');
      this.emit('plugin:error', { pluginId, error: error as Error });
      throw error;
    }
  }

  async activateAll(): Promise<void> {
    const plugins = this._registry.list();
    plugins.sort((a, b) => (a.config.priority || 100) - (b.config.priority || 100));

    for (const plugin of plugins) {
      const context = this._contexts.get(plugin.config.id);
      if (context?.state === 'initialized' || context?.state === 'inactive') {
        await this.activate(plugin.config.id);
      }
    }
  }

  async deactivate(pluginId: string): Promise<void> {
    const plugin = this._registry.get(pluginId);
    if (!plugin) {
      throw new Error(`Plugin not found: ${pluginId}`);
    }

    const context = this._contexts.get(pluginId);
    if (!context) {
      throw new Error(`Plugin context not found: ${pluginId}`);
    }

    if (context.state !== 'active') {
      return; // Already inactive
    }

    context.setState('deactivating');
    this.emit('plugin:deactivating', { pluginId });

    try {
      if (plugin.deactivate) {
        await plugin.deactivate(context);
      }

      context.setState('inactive');
      this.emit('plugin:deactivated', { pluginId });
    } catch (error) {
      context.setState('error');
      this.emit('plugin:error', { pluginId, error: error as Error });
      throw error;
    }
  }

  async deactivateAll(): Promise<void> {
    const plugins = this._registry.list();
    // Reverse order for deactivation
    plugins.sort((a, b) => (b.config.priority || 100) - (a.config.priority || 100));

    for (const plugin of plugins) {
      await this.deactivate(plugin.config.id);
    }
  }

  async destroyPlugin(pluginId: string): Promise<void> {
    await this.deactivate(pluginId);

    const plugin = this._registry.get(pluginId);
    const context = this._contexts.get(pluginId);

    if (plugin && context) {
      try {
        if (plugin.destroy) {
          await plugin.destroy(context);
        }
        await context.dispose();
      } catch (error) {
        this.emit('plugin:error', { pluginId, error: error as Error });
      }
    }

    this._contexts.delete(pluginId);
    this._registry.unregister(pluginId);
    this.emit('plugin:destroyed', { pluginId });
  }

  async destroyAll(): Promise<void> {
    const pluginIds = this._registry.list().map(p => p.config.id);
    for (const pluginId of pluginIds) {
      await this.destroyPlugin(pluginId);
    }
  }

  // ============================================
  // Registration
  // ============================================

  register(plugin: Plugin): void {
    // Validate plugin
    const validation = this._validatePlugin(plugin.config);
    if (!validation.valid) {
      throw new Error(`Invalid plugin: ${validation.errors.join(', ')}`);
    }

    // Check dependencies
    const depValidation = this._validateDependencies(plugin.config);
    if (!depValidation.valid) {
      throw new Error(`Dependency check failed: ${depValidation.errors.join(', ')}`);
    }

    // Register
    this._registry.register(plugin);

    // Create context
    const context = new PluginContextImpl(plugin.config, this);
    this._contexts.set(plugin.config.id, context);

    this.emit('plugin:registered', { pluginId: plugin.config.id, config: plugin.config });
  }

  async unregister(pluginId: string): Promise<void> {
    await this.destroyPlugin(pluginId);
  }

  get(pluginId: string): Plugin | undefined {
    return this._registry.get(pluginId);
  }

  list(): Plugin[] {
    return this._registry.list();
  }

  listByType(type: PluginType): Plugin[] {
    return this._registry.listByType(type);
  }

  // ============================================
  // Event System
  // ============================================

  async emitEvent<T>(event: string, data: T): Promise<void> {
    this._eventEmitter.emit(event, data);

    for (const [pluginId, context] of this._contexts) {
      if (context.state === 'active') {
        try {
          await context.emitEvent(event, data);
        } catch (error) {
          this._pluginLogger.error(`Error emitting event to plugin ${pluginId}`, { error });
        }
      }
    }
  }

  onEvent<T>(event: string, handler: (data: T) => void): void {
    this._eventEmitter.on(event, handler);
  }

  offEvent<T>(event: string, handler: (data: T) => void): void {
    this._eventEmitter.off(event, handler);
  }

  // ============================================
  // Hook System
  // ============================================

  async executeHook<T, R>(point: string, data: T): Promise<HookResult<R>> {
    const results: HookResult<R>['results'] = [];
    let currentData = data as unknown as R;
    let stopped = false;
    let skipped = false;

    // Collect all hooks from all active plugins
    const allHooks: Array<{ pluginId: string; handler: HookHandler; priority: number }> = [];

    for (const [pluginId, context] of this._contexts) {
      if (context.state === 'active') {
        const hooks = context.getHooks(point);
        for (const hook of hooks) {
          allHooks.push({ pluginId, handler: hook.handler, priority: hook.priority });
        }
      }
    }

    // Sort by priority
    allHooks.sort((a, b) => a.priority - b.priority);

    // Execute hooks
    for (const { pluginId, handler, priority } of allHooks) {
      if (stopped || skipped) break;

      this.emit('hook:executing', { point, pluginId });
      const startTime = Date.now();

      const hookContext: HookContext = {
        name: point,
        priority,
        skip: () => { skipped = true; },
        stopPropagation: () => { stopped = true; },
      };

      try {
        const result = await handler(currentData, hookContext);
        if (result !== undefined) {
          currentData = result as R;
        }

        results.push({ pluginId, priority, result });
        this.emit('hook:executed', { point, pluginId, duration: Date.now() - startTime });
      } catch (error) {
        this.emit('hook:error', { point, pluginId, error: error as Error });
        throw error;
      }
    }

    return {
      data: currentData,
      stopped,
      skipped,
      results,
    };
  }

  // ============================================
  // Command System
  // ============================================

  registerCommand(commandId: string, pluginId: string, handler: CommandHandler): void {
    if (this._commands.has(commandId)) {
      throw new Error(`Command already registered: ${commandId}`);
    }
    this._commands.set(commandId, { pluginId, handler });
  }

  unregisterCommand(commandId: string): void {
    this._commands.delete(commandId);
  }

  async executeCommand<T, R>(commandId: string, args: T): Promise<R> {
    const command = this._commands.get(commandId);
    if (!command) {
      throw new Error(`Command not found: ${commandId}`);
    }

    this.emit('command:executing', { commandId, pluginId: command.pluginId });
    const startTime = Date.now();

    const context: CommandContext = {
      commandId,
      pluginId: command.pluginId,
    };

    try {
      const result = await command.handler(args, context);
      this.emit('command:executed', { commandId, pluginId: command.pluginId, duration: Date.now() - startTime });
      return result as R;
    } catch (error) {
      this.emit('command:error', { commandId, pluginId: command.pluginId, error: error as Error });
      throw error;
    }
  }

  hasCommand(commandId: string): boolean {
    return this._commands.has(commandId);
  }

  // ============================================
  // Private Methods
  // ============================================

  private _validatePlugin(config: PluginConfig): PluginValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!config.id) {
      errors.push('Plugin ID is required');
    }

    if (!config.name) {
      errors.push('Plugin name is required');
    }

    if (!config.version) {
      errors.push('Plugin version is required');
    }

    if (!config.type) {
      errors.push('Plugin type is required');
    }

    return { valid: errors.length === 0, errors, warnings };
  }

  private _validateDependencies(config: PluginConfig): PluginValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check dependencies
    if (config.dependencies) {
      for (const depId of config.dependencies) {
        if (!this._registry.has(depId)) {
          errors.push(`Missing dependency: ${depId}`);
        }
      }
    }

    // Check conflicts
    if (config.conflicts) {
      for (const conflictId of config.conflicts) {
        if (this._registry.has(conflictId)) {
          errors.push(`Conflicting plugin installed: ${conflictId}`);
        }
      }
    }

    return { valid: errors.length === 0, errors, warnings };
  }
}

// ============================================================================
// Factory Function
// ============================================================================

export function createPluginManager(registry?: PluginRegistry): PluginManagerImpl {
  return new PluginManagerImpl(registry);
}

export default PluginManagerImpl;
