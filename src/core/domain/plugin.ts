/**
 * Plugin Domain Model
 * Professional plugin system with lifecycle management
 * Reference: VSCode Extension API, Rollup Plugin System
 */

import type { JSONSchema } from '../../types';

// ============================================================================
// Plugin Core Types
// ============================================================================

export type PluginType = 'extension' | 'adapter' | 'middleware' | 'provider' | 'custom';

export type PluginState =
  | 'registered'    // 已注册但未初始化
  | 'initializing'  // 正在初始化
  | 'initialized'   // 已初始化但未激活
  | 'activating'    // 正在激活
  | 'active'        // 已激活
  | 'deactivating'  // 正在停用
  | 'inactive'      // 已停用
  | 'error';        // 错误状态

// ============================================================================
// Plugin Configuration
// ============================================================================

export interface PluginConfig {
  id: string;
  name: string;
  version: string;
  description?: string;
  author?: string;
  type: PluginType;
  
  // Dependencies
  dependencies?: string[];           // 依赖的其他插件ID
  conflicts?: string[];              // 冲突的插件ID
  
  // Activation
  activationEvents?: string[];       // 激活事件列表
  
  // Capabilities
  contributes?: PluginContributes;
  
  // Configuration schema
  configuration?: JSONSchema;
  
  // Runtime settings
  enabled?: boolean;
  priority?: number;                 // 优先级，数字越小优先级越高
}

export interface PluginContributes {
  // Commands contributed by plugin
  commands?: Array<{
    id: string;
    title: string;
    category?: string;
    keybinding?: string;
  }>;
  
  // Event handlers
  events?: Array<{
    type: string;
    handler: string;
  }>;
  
  // Hooks
  hooks?: Array<{
    point: string;
    handler: string;
    priority?: number;
  }>;
  
  // UI contributions
  ui?: {
    panels?: Array<{
      id: string;
      title: string;
      icon?: string;
    }>;
    statusBarItems?: Array<{
      id: string;
      alignment: 'left' | 'right';
      priority?: number;
    }>;
  };
  
  // Data providers
  providers?: Array<{
    type: string;
    id: string;
  }>;
}

// ============================================================================
// Plugin Context
// ============================================================================

export interface PluginContext {
  // Plugin identity
  readonly id: string;
  readonly name: string;
  readonly version: string;
  
  // State
  readonly state: PluginState;
  
  // Storage
  readonly storage: PluginStorage;
  
  // Logger
  readonly logger: PluginLogger;
  
  // Configuration
  getConfig<T = unknown>(key: string, defaultValue?: T): T;
  setConfig<T = unknown>(key: string, value: T): void;
  
  // Event subscription
  onEvent<T = unknown>(event: string, handler: (data: T) => void | Promise<void>): void;
  offEvent<T = unknown>(event: string, handler: (data: T) => void | Promise<void>): void;
  
  // Hook registration
  registerHook(point: string, handler: HookHandler, priority?: number): void;
  unregisterHook(point: string, handler: HookHandler): void;
  
  // Command registration
  registerCommand(id: string, handler: CommandHandler): void;
  unregisterCommand(id: string): void;
  
  // Service access
  getService<T>(id: string): T | undefined;
  registerService<T>(id: string, service: T): void;
  
  // Disposables
  subscribe(disposable: Disposable): void;
}

export interface PluginStorage {
  // Global storage (shared across all sessions)
  get<T>(key: string): T | undefined;
  set<T>(key: string, value: T): void;
  delete(key: string): void;
  clear(): void;
  
  // Session storage (per session)
  getSession<T>(key: string): T | undefined;
  setSession<T>(key: string, value: T): void;
  deleteSession(key: string): void;
  clearSession(): void;
}

/**
 * Plugin 日志 - 使用统一的 ILogger 接口
 */
export type PluginLogger = import('../../utils/logger').ILogger;

// ============================================================================
// Plugin Interface
// ============================================================================

export interface Disposable {
  dispose(): void | Promise<void>;
}

export type HookHandler<T = unknown, R = unknown> = (
  data: T,
  context: HookContext
) => R | Promise<R>;

export interface HookContext {
  readonly name: string;
  readonly priority: number;
  skip(): void;
  stopPropagation(): void;
}

export type CommandHandler<T = unknown, R = unknown> = (
  args: T,
  context: CommandContext
) => R | Promise<R>;

export interface CommandContext {
  readonly commandId: string;
  readonly pluginId: string;
}

export interface Plugin {
  readonly config: PluginConfig;
  readonly state: PluginState;
  
  // Lifecycle hooks
  initialize?(context: PluginContext): void | Promise<void>;
  activate?(context: PluginContext): void | Promise<void>;
  deactivate?(context: PluginContext): void | Promise<void>;
  destroy?(context: PluginContext): void | Promise<void>;
  
  // Event handlers
  onEvent?(event: string, data: unknown, context: PluginContext): void | Promise<void>;
}

// ============================================================================
// Plugin Registry
// ============================================================================

export interface PluginRegistry {
  register(plugin: Plugin): void;
  unregister(pluginId: string): void;
  get(pluginId: string): Plugin | undefined;
  list(): Plugin[];
  listByType(type: PluginType): Plugin[];
  listByState(state: PluginState): Plugin[];
  has(pluginId: string): boolean;
  clear(): void;
}

// ============================================================================
// Plugin Manager
// ============================================================================

export interface PluginManager {
  readonly plugins: Map<string, Plugin>;
  readonly context: Map<string, PluginContext>;
  
  // Lifecycle management
  initialize(pluginId: string): Promise<void>;
  initializeAll(): Promise<void>;
  
  activate(pluginId: string): Promise<void>;
  activateAll(): Promise<void>;
  
  deactivate(pluginId: string): Promise<void>;
  deactivateAll(): Promise<void>;
  
  destroyPlugin(pluginId: string): Promise<void>;
  destroyAll(): Promise<void>;
  
  // Event system
  emitEvent<T>(event: string, data: T): Promise<void>;
  
  // Hook system
  executeHook<T, R>(point: string, data: T): Promise<HookResult<R>>;
  
  // Command system
  executeCommand<T, R>(commandId: string, args: T): Promise<R>;
  hasCommand(commandId: string): boolean;
}

export interface HookResult<T> {
  data: T;
  stopped: boolean;
  skipped: boolean;
  results: Array<{
    pluginId: string;
    priority: number;
    result: unknown;
  }>;
}

// ============================================================================
// Plugin Events
// ============================================================================

export interface PluginEvents {
  'plugin:registered': { pluginId: string; config: PluginConfig };
  'plugin:unregistered': { pluginId: string };
  'plugin:initializing': { pluginId: string };
  'plugin:initialized': { pluginId: string };
  'plugin:activating': { pluginId: string };
  'plugin:activated': { pluginId: string };
  'plugin:deactivating': { pluginId: string };
  'plugin:deactivated': { pluginId: string };
  'plugin:error': { pluginId: string; error: Error };
  'plugin:destroyed': { pluginId: string };
  
  'hook:executing': { point: string; pluginId: string };
  'hook:executed': { point: string; pluginId: string; duration: number };
  'hook:error': { point: string; pluginId: string; error: Error };
  
  'command:executing': { commandId: string; pluginId: string };
  'command:executed': { commandId: string; pluginId: string; duration: number };
  'command:error': { commandId: string; pluginId: string; error: Error };
}

// ============================================================================
// Plugin Factory
// ============================================================================

export type PluginFactory = (config?: Partial<PluginConfig>) => Plugin;

export interface PluginModule {
  default?: PluginFactory;
  factory?: PluginFactory;
  create?: PluginFactory;
}

// ============================================================================
// Plugin Loader
// ============================================================================

export interface PluginLoader {
  load(path: string): Promise<Plugin>;
  loadMultiple(paths: string[]): Promise<Plugin[]>;
  resolve(id: string): string | undefined;
}

// ============================================================================
// Plugin Validation
// ============================================================================

export interface PluginValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export interface PluginValidator {
  validate(config: PluginConfig): PluginValidationResult;
  validateDependencies(plugins: Plugin[]): PluginValidationResult;
}
