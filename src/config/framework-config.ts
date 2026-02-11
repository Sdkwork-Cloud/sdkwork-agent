/**
 * SDKWork Framework Configuration
 *
 * 框架级配置系统，管理整个 SDKWork 框架的全局设置。
 *
 * 配置层级（优先级从高到低）：
 * 1. 命令行参数
 * 2. 环境变量
 * 3. 项目配置: <project>/.sdkwork/config.json
 * 4. 全局配置: ~/.sdkwork/config.json
 * 5. 默认配置
 *
 * @module FrameworkConfig
 * @version 3.0.0
 * @standard SDKWork Architecture Standard
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { EventEmitter } from '../utils/event-emitter.js';

// ============================================================================
// Core Configuration Types
// ============================================================================

/**
 * 框架配置 - 全局框架设置
 */
export interface FrameworkConfig {
  /** 配置版本 */
  version: string;
  /** 运行环境 */
  environment: 'development' | 'production' | 'testing';
  /** 日志配置 */
  logging: LoggingConfig;
  /** 兼容性配置 */
  compatibility: CompatibilityConfig;
  /** 技能系统配置 */
  skills: SkillSystemConfig;
  /** LLM配置 */
  llm: LLMConfig;
  /** 内存配置 */
  memory: MemoryConfig;
  /** 安全配置 */
  security: SecurityConfig;
  /** 实验性功能 */
  experimental: ExperimentalConfig;
}

/**
 * 日志配置
 */
export interface LoggingConfig {
  level: 'debug' | 'info' | 'warn' | 'error';
  format?: 'json' | 'text';
  output?: 'console' | 'file' | 'both';
  file?: string;
}

/**
 * 兼容性配置
 */
export interface CompatibilityConfig {
  /** OpenClaw 兼容模式 */
  openclaw?: {
    enabled: boolean;
    skillsDir?: string;
    commandMapping?: Record<string, string>;
  };
  /** Claude Code 兼容模式 */
  claude?: {
    enabled: boolean;
    settings?: {
      allowedTools?: string[];
      maxIterations?: number;
    };
  };
  /** Codex 兼容模式 */
  codex?: {
    enabled: boolean;
    settings?: {
      model?: string;
      temperature?: number;
    };
  };
  /** OpenCode 兼容模式 */
  opencode?: {
    enabled: boolean;
    settings?: {
      autoUpdate?: boolean;
    };
  };
}

/**
 * 技能系统配置
 */
export interface SkillSystemConfig {
  enabled: boolean;
  load: {
    extraDirs: string[];
    watch: boolean;
    watchDebounceMs: number;
    maxConcurrentLoads: number;
  };
  eligibility: {
    checkOS: boolean;
    checkBinaries: boolean;
    checkEnvVars: boolean;
  };
  selection: {
    enabled: boolean;
    confidenceThreshold: number;
    maxSelectedSkills: number;
    enablePreload: boolean;
    useLLM: boolean;
  };
  snapshot: {
    enableCache: boolean;
    cacheTTL: number;
  };
}

/**
 * LLM配置
 */
export interface LLMConfig {
  defaultProvider?: string;
  providers: Record<string, LLMProviderConfig>;
  routing?: {
    enabled?: boolean;
    taskRouting?: Record<string, string>;
  };
}

/**
 * LLM Provider配置
 */
export interface LLMProviderConfig {
  apiKey?: string;
  baseUrl?: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  timeout?: number;
}

/**
 * 内存配置
 */
export interface MemoryConfig {
  enabled: boolean;
  type: 'in-memory' | 'persistent' | 'hybrid';
  maxSize: number;
}

/**
 * 安全配置
 */
export interface SecurityConfig {
  enableSandbox: boolean;
  allowedCommands: string[];
  blockedCommands: string[];
  maxExecutionTime: number;
}

/**
 * 实验性功能配置
 */
export interface ExperimentalConfig {
  enableStreaming: boolean;
  enableMultiAgent: boolean;
  enableReflection: boolean;
}

// ============================================================================
// Default Configuration
// ============================================================================

const DEFAULT_FRAMEWORK_CONFIG: FrameworkConfig = {
  version: '3.0.0',
  environment: 'development',
  logging: {
    level: 'info',
    format: 'text',
    output: 'console',
  },
  compatibility: {
    openclaw: {
      enabled: false,
      skillsDir: '~/.openclaw/skills',
    },
    claude: {
      enabled: false,
      settings: {
        maxIterations: 10,
      },
    },
    codex: {
      enabled: false,
      settings: {
        model: 'gpt-4',
        temperature: 0.7,
      },
    },
    opencode: {
      enabled: false,
      settings: {
        autoUpdate: true,
      },
    },
  },
  skills: {
    enabled: true,
    load: {
      extraDirs: [],
      watch: true,
      watchDebounceMs: 250,
      maxConcurrentLoads: 5,
    },
    eligibility: {
      checkOS: true,
      checkBinaries: true,
      checkEnvVars: true,
    },
    selection: {
      enabled: true,
      confidenceThreshold: 0.6,
      maxSelectedSkills: 3,
      enablePreload: true,
      useLLM: true,
    },
    snapshot: {
      enableCache: true,
      cacheTTL: 3600000, // 1 hour
    },
  },
  llm: {
    defaultProvider: 'openai',
    providers: {},
    routing: {
      enabled: false,
      taskRouting: {},
    },
  },
  memory: {
    enabled: true,
    type: 'hybrid',
    maxSize: 1000000,
  },
  security: {
    enableSandbox: true,
    allowedCommands: [],
    blockedCommands: ['rm -rf /', 'format', 'del /f /s /q'],
    maxExecutionTime: 30000,
  },
  experimental: {
    enableStreaming: true,
    enableMultiAgent: false,
    enableReflection: true,
  },
};

// ============================================================================
// Configuration Manager
// ============================================================================

export interface FrameworkConfigManagerOptions {
  /** 项目根目录 */
  projectDir?: string;
  /** 全局配置目录 */
  globalConfigDir?: string;
  /** 配置文件名 */
  configFileName?: string;
  /** 启用热更新 */
  enableHotReload?: boolean;
}

/**
 * 框架配置管理器
 */
export class FrameworkConfigManager extends EventEmitter {
  private config: FrameworkConfig;
  private managerOptions: Required<FrameworkConfigManagerOptions>;
  private fileWatcher?: fs.FSWatcher;

  constructor(options: FrameworkConfigManagerOptions = {}) {
    super();
    this.managerOptions = {
      projectDir: process.cwd(),
      globalConfigDir: this.getDefaultGlobalConfigDir(),
      configFileName: 'config.json',
      enableHotReload: true,
      ...options,
    };
    this.config = { ...DEFAULT_FRAMEWORK_CONFIG };
  }

  /**
   * 获取默认全局配置目录
   */
  private getDefaultGlobalConfigDir(): string {
    const homeDir = process.env.HOME || process.env.USERPROFILE || '.';
    return path.join(homeDir, '.sdkwork');
  }

  /**
   * 加载配置
   */
  async load(): Promise<FrameworkConfig> {
    // 1. 从默认配置开始
    let config = { ...DEFAULT_FRAMEWORK_CONFIG };

    // 2. 加载全局配置
    const globalConfig = await this.loadGlobalConfig();
    config = this.mergeConfig(config, globalConfig);

    // 3. 加载项目配置
    const projectConfig = await this.loadProjectConfig();
    config = this.mergeConfig(config, projectConfig);

    // 4. 从环境变量加载
    const envConfig = this.loadFromEnvironment();
    config = this.mergeConfig(config, envConfig);

    this.config = config;
    this.emit('config:loaded', config);

    // 5. 启用热更新
    if (this.managerOptions.enableHotReload) {
      this.enableHotReload();
    }

    return config;
  }

  /**
   * 获取当前配置
   */
  getConfig(): FrameworkConfig {
    return { ...this.config };
  }

  /**
   * 更新配置
   */
  updateConfig(updates: Partial<FrameworkConfig>): void {
    this.config = this.mergeConfig(this.config, updates);
    this.emit('config:updated', this.config);
  }

  /**
   * 加载全局配置
   */
  private async loadGlobalConfig(): Promise<Partial<FrameworkConfig>> {
    const configPath = path.join(this.managerOptions.globalConfigDir, this.managerOptions.configFileName);
    return this.loadConfigFile(configPath);
  }

  /**
   * 加载项目配置
   */
  private async loadProjectConfig(): Promise<Partial<FrameworkConfig>> {
    const configPath = path.join(this.managerOptions.projectDir, '.sdkwork', this.managerOptions.configFileName);
    return this.loadConfigFile(configPath);
  }

  /**
   * 从文件加载配置
   */
  private async loadConfigFile(configPath: string): Promise<Partial<FrameworkConfig>> {
    try {
      const content = await fs.promises.readFile(configPath, 'utf-8');
      return JSON.parse(content) as Partial<FrameworkConfig>;
    } catch {
      return {};
    }
  }

  /**
   * 从环境变量加载配置
   */
  private loadFromEnvironment(): Partial<FrameworkConfig> {
    const config: Partial<FrameworkConfig> = {};

    if (process.env.SDKWORK_ENV) {
      config.environment = process.env.SDKWORK_ENV as FrameworkConfig['environment'];
    }

    if (process.env.SDKWORK_LOG_LEVEL) {
      config.logging = {
        level: process.env.SDKWORK_LOG_LEVEL as LoggingConfig['level'],
      };
    }

    if (process.env.SDKWORK_LLM_API_KEY) {
      config.llm = {
        providers: {
          openai: {
            apiKey: process.env.SDKWORK_LLM_API_KEY,
          },
        },
      };
    }

    return config;
  }

  /**
   * 合并配置
   * 使用深度合并确保嵌套配置正确合并
   */
  private mergeConfig(
    base: FrameworkConfig,
    override: Partial<FrameworkConfig>
  ): FrameworkConfig {
    return {
      ...base,
      ...override,
      logging: { ...base.logging, ...override.logging },
      compatibility: { ...base.compatibility, ...override.compatibility },
      skills: override.skills
        ? {
            ...base.skills,
            ...override.skills,
            load: { ...base.skills.load, ...override.skills.load },
            eligibility: { ...base.skills.eligibility, ...override.skills.eligibility },
            selection: { ...base.skills.selection, ...override.skills.selection },
            snapshot: { ...base.skills.snapshot, ...override.skills.snapshot },
          }
        : base.skills,
      llm: override.llm
        ? {
            ...base.llm,
            ...override.llm,
            routing: override.llm.routing
              ? { ...base.llm.routing, ...override.llm.routing }
              : base.llm.routing,
          }
        : base.llm,
      memory: { ...base.memory, ...override.memory },
      security: { ...base.security, ...override.security },
      experimental: { ...base.experimental, ...override.experimental },
    };
  }

  /**
   * 启用热更新
   * 使用防抖处理避免重复加载
   */
  private enableHotReload(): void {
    const projectConfigPath = path.join(this.managerOptions.projectDir, '.sdkwork', this.managerOptions.configFileName);

    // 检查文件是否存在
    if (!fs.existsSync(projectConfigPath)) {
      return;
    }

    let reloadTimeout: NodeJS.Timeout | undefined;

    try {
      this.fileWatcher = fs.watch(projectConfigPath, (eventType) => {
        if (eventType === 'change') {
          // 防抖处理：延迟 100ms 避免重复触发
          if (reloadTimeout) {
            clearTimeout(reloadTimeout);
          }
          reloadTimeout = setTimeout(async () => {
            try {
              const newConfig = await this.loadProjectConfig();
              this.updateConfig(newConfig);
            } catch (error) {
              // 忽略加载错误，保持当前配置
            }
          }, 100);
        }
      });
    } catch {
      // 忽略文件不存在的情况
    }
  }

  /**
   * 销毁配置管理器
   */
  destroy(): void {
    if (this.fileWatcher) {
      this.fileWatcher.close();
      this.fileWatcher = undefined;
    }
    this.removeAllListeners();
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

let globalConfigManager: FrameworkConfigManager | null = null;

/**
 * 获取全局配置管理器实例
 */
export function getFrameworkConfigManager(): FrameworkConfigManager {
  if (!globalConfigManager) {
    globalConfigManager = new FrameworkConfigManager();
  }
  return globalConfigManager;
}

/**
 * 设置全局配置管理器实例
 */
export function setFrameworkConfigManager(manager: FrameworkConfigManager): void {
  globalConfigManager = manager;
}

// ============================================================================
// Convenience Functions
// ============================================================================

/**
 * 加载框架配置
 */
export async function loadFrameworkConfig(options?: FrameworkConfigManagerOptions): Promise<FrameworkConfig> {
  const manager = new FrameworkConfigManager(options);
  return manager.load();
}

/**
 * 获取当前框架配置
 */
export function getFrameworkConfig(): FrameworkConfig {
  return getFrameworkConfigManager().getConfig();
}

// Types are already exported via 'export interface' above
