/**
 * Skills Module - OpenClaw 兼容的 Skill 系统
 *
 * 完整的 Skill 管理解决方案，支持动态按需加载和智能决策
 *
 * @module Skills
 * @version 5.0.0
 */

// Core Registry
export {
  SkillRegistry,
  createSkillRegistry,
} from './registry.js';

export type { SkillIndex } from './registry.js';

// Types
export type {
  // Value Objects
  SkillId,
  SkillName,

  // Core Interfaces
  Skill,
  SkillEntry,
  SkillContext,
  SkillResult,
  SkillError,
  ExecutionMetadata,
  SkillMetadata,
  SkillStreamChunk,

  // Frontmatter
  ParsedSkillFrontmatter,
  OpenClawSkillMetadata,
  SkillInvocationPolicy,
  SkillCommandDispatchSpec,
  DispatchKind,

  // Requirements & Install
  SkillRequirements,
  SkillInstallSpec,
  InstallKind,

  // Config
  SkillConfig,
  SkillsConfig,

  // Eligibility
  EligibilityContext,
  RemoteEligibility,
  EligibilityResult,

  // Security
  SecurityRule,
  SecurityWarning,
  SecurityScanResult,

  // Execution
  SkillExecutionOptions,
  LoadSkillOptions,

  // Snapshot
  SkillSnapshot,

  // Source
  SkillSource,

  // Services
  Logger,
  LLMService,
  MemoryService,
  ToolRegistry,
} from './types.js';

// Loader
export {
  SkillLoader,
  createSkillLoader,
  loadSkillFile,
  scanSkillFiles,
  getSourcePriority,
} from './loader.js';

// Eligibility Checker
export {
  SkillEligibilityChecker,
  createEligibilityChecker,
  isEligible,
  getCurrentPlatform,
  checkRemoteEligibility,
} from './eligibility.js';

// Frontmatter Parser
export {
  FrontmatterParser,
  createFrontmatterParser,
  parseSkillContent,
  extractFrontmatterRaw,
  extractBody,
  validateFrontmatter,
} from './frontmatter.js';

// Watcher
export {
  SkillWatcher,
  createSkillWatcher,
  watchAllSkills,
  waitForFileStability,
} from './watcher.js';

// Security Scanner
export {
  SkillSecurityScanner,
  createSecurityScanner,
  quickScan,
  isSafe,
  formatScanResult,
  getDefaultSecurityRules,
} from './security.js';

// Installer
export {
  SkillInstaller,
  createSkillInstaller,
  quickInstall,
  checkDependencies,
} from './installer.js';

// Cache
export {
  SkillCache,
  createSkillCache,
  hashContext,
  hashContent,
} from './cache.js';

// Config Manager
export {
  SkillConfigManager,
  createSkillConfigManager,
  getDefaultConfigPath,
  configExists,
  createDefaultConfig,
} from './config.js';

// Executor (高性能执行引擎)
export {
  ExecutionPool,
  ExecutionMonitor,
  createExecutionPool,
  createExecutionMonitor,
  calculateBackoffDelay,
} from './executor.js';

// Dynamic Loader (动态按需加载)
export {
  DynamicSkillLoader,
  createDynamicLoader,
} from './dynamic-loader.js';

// Prompt Builder (Prompt 构建器)
export {
  SkillPromptBuilder,
  createPromptBuilder,
  buildLightweightSkillPrompt,
  buildDetailedSkillPrompt,
  estimatePromptTokens,
} from './prompt-builder.js';

// Decision Engine (决策引擎)
export {
  SkillDecisionEngine,
  createDecisionEngine,
  quickDecide,
} from './decision-engine.js';

// Skill Loader (通用加载器)
export {
  loadAllSkills,
  getSkillStats,
  formatSkillsList,
} from './skill-loader.js';

// Re-export types from installer
export type {
  InstallResult,
  InstallOptions,
} from './installer.js';

// Re-export types from watcher
export type {
  SkillChangeEvent,
  WatcherState,
} from './watcher.js';

// Re-export types from executor
export type {
  ExecutionOptions,
  ExecutionTask,
  ExecutionStats,
  RetryConfig,
} from './executor.js';

// Re-export types from dynamic-loader
export type {
  LazySkillEntry,
  LoadContentOptions,
  DynamicLoaderStats,
} from './dynamic-loader.js';

// Re-export types from prompt-builder
export type {
  PromptBuildOptions,
  BuiltPrompt,
  SkillContextPrompt,
} from './prompt-builder.js';

// Re-export types from decision-engine
export type {
  DecisionContext,
  SkillDecision,
  ExecutionPlan,
  DecisionEngineConfig,
} from './decision-engine.js';
