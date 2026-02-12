/**
 * Skill Core Module
 *
 * Re-exports from main skills module for backward compatibility.
 * All implementations are now unified in the main skills module.
 *
 * @deprecated Import directly from '../../skills/index.js' instead
 */

// ============================================================================
// Re-export from main skills module (Unified Implementation)
// ============================================================================
export {
  SkillRegistry,
  createSkillRegistry,
} from '../registry.js';

export type { SkillIndex } from '../registry.js';

export {
  ExecutionPool,
  ExecutionMonitor,
  createExecutionPool,
  createExecutionMonitor,
  calculateBackoffDelay,
} from '../executor.js';

export type {
  ExecutionOptions,
  ExecutionTask,
  ExecutionStats,
  RetryConfig,
} from '../executor.js';

export {
  SkillLoader,
  createSkillLoader,
} from '../loader.js';

// ============================================================================
// Types (re-exported from main types)
// ============================================================================
export type {
  Skill,
  SkillId,
  SkillName,
  SkillEntry,
  SkillContext,
  SkillResult,
  ExecutionMetadata,
  SkillMetadata,
  SkillStreamChunk,
  SkillSource,
  Logger,
  LLMService,
  MemoryService,
  ToolRegistry,
} from '../types.js';

// ============================================================================
// Additional Types from core/types.ts (for backward compatibility)
// ============================================================================
export type {
  SkillManifest,
  ISkillRegistry,
  ISkillLoader,
  ISkillExecutor,
  LoadedSkill,
  ScriptFile,
  ReferenceFile,
  AssetFile,
  DisclosureLevel,
  SkillEvent,
  SkillEventType,
  SkillEventListener,
  LLMOptions,
} from './types';

export { SkillError, isValidSkillName, validateSkillManifest } from './types';

// ============================================================================
// OpenClaw-inspired Types (新架构类型)
// ============================================================================
export type {
  SkillSourceType,
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

// Scheduler
export { SkillScheduler, createSkillScheduler } from './scheduler.js';
export type {
  SkillSchedulerConfig as SchedulerConfig,
  SkillScheduleResult as SchedulerStats,
  SkillScheduleRequest as ScheduledTask,
} from './scheduler.js';
