/**
 * Skill Core Module
 *
 * Unified exports for the skill system
 * Based on OpenClaw architecture with dynamic skill selection
 */

// ============================================================================
// Original Types (保持向后兼容)
// ============================================================================
export type {
  Skill,
  SkillResult,
  SkillErrorJSON,
  ExecutionContext,
  ExecutionMetadata,
  SkillManifest,
  ISkillRegistry,
  SkillIndex,
  ISkillLoader,
  ISkillExecutor,
  LoadedSkill,
  ScriptFile,
  ReferenceFile,
  AssetFile,
  DisclosureLevel,
  Logger,
  LLMService,
  LLMOptions,
  MemoryService,
  ToolRegistry,
  SkillEvent,
  SkillEventType,
  SkillEventListener,
} from './types';

export { SkillError, isValidSkillName, validateSkillManifest } from './types';

// ============================================================================
// Original Components (保持向后兼容)
// ============================================================================
export { SkillRegistry, createSkillRegistry, getGlobalRegistry, resetGlobalRegistry } from './registry.js';
export type { RegistryConfig } from './registry.js';

export { SkillExecutor, createSkillExecutor } from './executor.js';
export type { ExecutorConfig } from './executor.js';

export {
  SkillLoader,
  createSkillLoader,
  getGlobalLoader,
} from './loader.js';
export type {
  SkillLoadResult,
  SkillSource,
  SkillLoaderConfig,
} from './loader.js';

export { SkillScheduler, createSkillScheduler } from './scheduler.js';
export type {
  SkillSchedulerConfig as SchedulerConfig,
  SkillScheduleResult as SchedulerStats,
  SkillScheduleRequest as ScheduledTask,
} from './scheduler.js';

// ============================================================================
// OpenClaw-inspired Types (新架构类型)
// ============================================================================
export type {
  SkillSourceType,
  SkillEntry,
  ParsedSkillFrontmatter,
  OpenClawSkillMetadata,
  SkillInstallSpec,
  SkillInvocationPolicy,
  SkillSnapshot,
  SnapshotVersionManager,
  SkillEligibilityContext,
  EligibilityResult,
  SkillCommandSpec,
  ParsedSkillCommand,
  SkillsConfig,
  SkillSpecificConfig,
  SkillSystemEvent,
  SkillSelectionContext,
  SkillSelectionResult,
  IDynamicSkillSelector,
  HotReloadConfig,
  SkillFileChangeEvent,
} from './openclaw-types.js';
// Note: SkillSource is exported from loader.js, not from openclaw-types.js

// ============================================================================
// OpenClaw-inspired Components (新架构组件)
// ============================================================================

// Multi-Location Skill Loader
export {
  MultiLocationSkillLoader,
  createMultiLocationLoader,
} from './multi-location-loader.js';
export type { MultiLocationLoaderConfig } from './multi-location-loader.js';

// Skill Snapshot Manager
export {
  SkillSnapshotManager,
  createSnapshotManager,
} from './snapshot-manager.js';
export type { SnapshotManagerConfig } from './snapshot-manager.js';

// Dynamic Skill Selector
export {
  DynamicSkillSelector,
  createDynamicSelector,
} from './dynamic-selector.js';
export type { DynamicSelectorConfig } from './dynamic-selector.js';

// Skill Command Dispatcher
export {
  SkillCommandDispatcher,
  createCommandDispatcher,
} from './command-dispatch.js';
export type {
  CommandDispatchConfig,
  CommandDispatchResult,
} from './command-dispatch.js';

// Skill Hot Reload Manager
export {
  SkillHotReloadManager,
  createHotReloadManager,
} from './hot-reload.js';
export type { HotReloadManagerConfig } from './hot-reload.js';

// Unified Skill System
export {
  UnifiedSkillSystem,
  createSkillSystem,
} from './skill-system.js';
export type {
  UnifiedSkillSystemConfig,
  SkillSystemState,
} from './skill-system.js';

// Enhanced Skill System
export {
  EnhancedSkillSystem,
  createEnhancedSkillSystem,
  SemanticCache,
  ABTestManager,
} from './enhanced-skill-system.js';
export type {
  EnhancedSkillSystemConfig,
} from './enhanced-skill-system.js';

// Skill Engine
export {
  SkillEngine,
  createSkillEngine,
} from './skill-engine.js';
export type {
  SkillEngineConfig,
  SkillDependency,
  SkillLifecycleHooks,
  SandboxConfig,
  ExecuteOptions,
} from './skill-engine.js';

// Skill Dependency Resolver
export {
  SkillDependencyResolver,
  createDependencyResolver,
} from './skill-dependency-resolver.js';
export type {
  DependencyResolverConfig,
  DependencyResolutionResult,
} from './skill-dependency-resolver.js';
