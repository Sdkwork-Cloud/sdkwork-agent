/**
 * OpenClaw-inspired Skill System Types
 *
 * 基于 OpenClaw 架构的高级技能类型系统
 * 特性：
 * - 多位置技能源支持 (Multi-location skill sources)
 * - 技能快照机制 (Skill snapshot mechanism)
 * - 渐进式披露加载 (Progressive disclosure)
 * - 资格检查系统 (Eligibility checking)
 * - 命令分发系统 (Command dispatch)
 */

// ============================================================================
// Skill Source Types (多位置加载)
// ============================================================================

/**
 * 技能源类型
 * 优先级: workspace > managed > bundled > plugin > extra
 */
export type SkillSourceType =
  | 'bundled'      // 内置技能，随应用发布
  | 'managed'      // 托管技能，~/.sdkwork/skills
  | 'workspace'    // 工作区技能，<workspace>/skills
  | 'plugin'       // 插件技能
  | 'extra';       // 额外配置目录

/**
 * 技能源定义
 */
export interface SkillSource {
  /** 源类型 */
  readonly type: SkillSourceType;
  /** 源名称 */
  readonly name: string;
  /** 源路径 */
  readonly path: string;
  /** 版本（可选） */
  readonly version?: string;
}

/**
 * 技能条目 (内部使用)
 */
export interface SkillEntry {
  /** 技能名称 */
  readonly name: string;
  /** 技能描述 */
  readonly description: string;
  /** 文件路径 */
  readonly filePath: string;
  /** 源类型 */
  readonly source: SkillSourceType;
  /** 解析后的 frontmatter */
  readonly frontmatter: ParsedSkillFrontmatter;
  /** OpenClaw 元数据 */
  readonly metadata?: OpenClawSkillMetadata;
  /** 调用策略 */
  readonly invocation?: SkillInvocationPolicy;
}

// ============================================================================
// Frontmatter & Metadata
// ============================================================================

/**
 * 解析后的 Skill Frontmatter
 */
export interface ParsedSkillFrontmatter {
  /** 技能名称 */
  name?: string;
  /** 技能描述 */
  description?: string;
  /** 许可证 */
  license?: string;
  /** 兼容性说明 */
  compatibility?: string;
  /** 元数据 (JSON5 格式) */
  metadata?: string;
  /** 允许的工具列表 */
  'allowed-tools'?: string;
  /** 用户是否可直接调用 */
  'user-invocable'?: boolean;
  /** 是否禁用模型调用 */
  'disable-model-invocation'?: boolean;
  /** 命令分发类型 */
  'command-dispatch'?: 'tool' | string;
  /** 命令工具名称 */
  'command-tool'?: string;
  /** 命令参数模式 */
  'command-arg-mode'?: 'raw' | string;
}

/**
 * OpenClaw 技能元数据
 */
export interface OpenClawSkillMetadata {
  /** 是否总是包含 */
  readonly always?: boolean;
  /** Emoji 标识 */
  readonly emoji?: string;
  /** 主页链接 */
  readonly homepage?: string;
  /** 技能键名 */
  readonly skillKey?: string;
  /** 主要环境变量 */
  readonly primaryEnv?: string;
  /** 支持的操作系统 */
  readonly os?: string[];
  /** 依赖要求 */
  readonly requires?: {
    /** 必需的二进制文件 */
    readonly bins?: string[];
    /** 任一即可的二进制文件 */
    readonly anyBins?: string[];
    /** 必需的环境变量 */
    readonly env?: string[];
    /** 必需的配置路径 */
    readonly config?: string[];
  };
  /** 安装规范 */
  readonly install?: SkillInstallSpec[];
}

/**
 * 技能安装规范
 */
export interface SkillInstallSpec {
  /** 安装命令 */
  readonly command: string;
  /** 描述 */
  readonly description?: string;
  /** 平台限制 */
  readonly platforms?: string[];
}

/**
 * 技能调用策略
 */
export interface SkillInvocationPolicy {
  /** 用户是否可直接调用 */
  readonly userInvocable: boolean;
  /** 是否禁用模型调用 */
  readonly disableModelInvocation: boolean;
}

// ============================================================================
// Skill Snapshot (技能快照)
// ============================================================================

/**
 * 技能快照
 * 会话开始时创建，避免重复加载
 */
export interface SkillSnapshot {
  /** 为 LLM 生成的提示词 */
  readonly prompt: string;
  /** 技能列表 (简化信息) */
  readonly skills: Array<{
    name: string;
    primaryEnv?: string;
  }>;
  /** 完整技能条目 */
  readonly entries: SkillEntry[];
  /** 快照版本 */
  readonly version: number;
  /** 创建时间 */
  readonly createdAt: Date;
}

/**
 * 快照版本管理
 */
export interface SnapshotVersionManager {
  /** 获取当前版本 */
  getVersion(workspaceDir: string): number;
  /** 递增版本 */
  bumpVersion(workspaceDir: string, reason: string, changedPath?: string): number;
}

// ============================================================================
// Skill Eligibility (资格检查)
// ============================================================================

/**
 * 资格检查上下文
 */
export interface SkillEligibilityContext {
  /** 远程环境信息 */
  readonly remote?: {
    /** 平台列表 */
    readonly platforms?: string[];
    /** 备注 */
    readonly note?: string;
    /** 检查二进制是否存在 */
    readonly hasBin?: (bin: string) => boolean;
    /** 检查任一二进制是否存在 */
    readonly hasAnyBin?: (bins: string[]) => boolean;
  };
  /** 当前平台 */
  readonly currentPlatform?: string;
  /** 环境变量 */
  readonly env?: Record<string, string | undefined>;
}

/**
 * 资格检查结果
 */
export interface EligibilityResult {
  /** 是否合格 */
  readonly eligible: boolean;
  /** 不合格原因 */
  readonly reason?: string;
  /** 检查详情 */
  readonly details: {
    osCheck: boolean;
    binChecks: Record<string, boolean>;
    envChecks: Record<string, boolean>;
    configChecks: Record<string, boolean>;
  };
}

// ============================================================================
// Command Dispatch (命令分发)
// ============================================================================

/**
 * 技能命令规范
 */
export interface SkillCommandSpec {
  /** 命令名称 */
  readonly name: string;
  /** 原始技能名称 */
  readonly skillName: string;
  /** 命令描述 */
  readonly description: string;
  /** 命令分发配置 */
  readonly dispatch?: {
    /** 分发类型 */
    readonly kind: 'tool';
    /** 工具名称 */
    readonly toolName: string;
    /** 参数模式 */
    readonly argMode: 'raw';
  };
}

/**
 * 命令解析结果
 */
export interface ParsedSkillCommand {
  /** 命令名称 */
  readonly name: string;
  /** 参数 */
  readonly args: string;
  /** 匹配的命令规范 */
  readonly spec?: SkillCommandSpec;
}

// ============================================================================
// Configuration
// ============================================================================

/**
 * 技能配置
 */
export interface SkillsConfig {
  /** 加载配置 */
  readonly load?: {
    /** 额外目录 */
    readonly extraDirs?: string[];
    /** 是否启用文件监控 */
    readonly watch?: boolean;
    /** 防抖时间 (ms) */
    readonly watchDebounceMs?: number;
  };
  /** 允许的内置技能列表 */
  readonly allowBundled?: string[];
  /** 技能特定配置 */
  readonly skills?: Record<string, SkillSpecificConfig>;
}

/**
 * 技能特定配置
 */
export interface SkillSpecificConfig {
  /** 是否启用 */
  readonly enabled?: boolean;
  /** 环境变量覆盖 */
  readonly env?: Record<string, string>;
  /** API 密钥 */
  readonly apiKey?: string;
}

// ============================================================================
// Events
// ============================================================================

/**
 * 技能系统事件
 */
export type SkillSystemEvent =
  | { type: 'skill:loaded'; skillName: string; source: SkillSourceType }
  | { type: 'skill:unloaded'; skillName: string; reason: string }
  | { type: 'skill:reload'; skillName: string; changedPath: string }
  | { type: 'snapshot:created'; version: number; skillCount: number }
  | { type: 'snapshot:updated'; version: number; reason: string }
  | { type: 'eligibility:check'; skillName: string; eligible: boolean; reason?: string }
  | { type: 'command:dispatch'; command: string; toolName: string };

// ============================================================================
// Dynamic Skill Selection (动态技能选择)
// ============================================================================

/**
 * 技能选择上下文
 */
export interface SkillSelectionContext {
  /** 用户输入 */
  readonly userInput: string;
  /** 会话历史 */
  readonly history: Array<{ role: 'user' | 'assistant'; content: string }>;
  /** 当前任务 */
  readonly currentTask?: string;
  /** 已加载的技能 */
  readonly availableSkills: SkillEntry[];
  /** LLM 服务 */
  readonly llm: {
    complete(prompt: string, options?: unknown): Promise<string>;
  };
}

/**
 * 技能选择结果
 */
export interface SkillSelectionResult {
  /** 选中的技能 */
  readonly selectedSkills: string[];
  /** 选择置信度 */
  readonly confidence: number;
  /** 选择理由 */
  readonly reasoning: string;
  /** 是否需要加载 */
  readonly shouldLoad: boolean;
}

/**
 * 动态技能选择器接口
 */
export interface IDynamicSkillSelector {
  /** 选择适合当前上下文的技能 */
  select(context: SkillSelectionContext): Promise<SkillSelectionResult>;
  /** 预加载推荐技能 */
  preloadRecommended(context: Partial<SkillSelectionContext>): Promise<string[]>;
}

// ============================================================================
// Hot Reload
// ============================================================================

/**
 * 热重载配置
 */
export interface HotReloadConfig {
  /** 是否启用 */
  readonly enabled: boolean;
  /** 防抖时间 (ms) */
  readonly debounceMs: number;
  /** 忽略模式 */
  readonly ignored: string[];
  /** 监控路径 */
  readonly watchPaths: string[];
}

/**
 * 文件变更事件
 */
export interface SkillFileChangeEvent {
  /** 变更类型 */
  readonly type: 'add' | 'change' | 'unlink';
  /** 文件路径 */
  readonly path: string;
  /** 技能名称 */
  readonly skillName?: string;
}
