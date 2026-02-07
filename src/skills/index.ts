/**
 * SDKWork Skills - 完美 Skill 体系
 *
 * 参考业界最佳实践 (OpenCode / Codex / Claude Code / AgentSkills.io)
 * 构建业界领先的 Skill 生态系统
 *
 * @module Skills
 * @version 3.0.0
 * @standard Industry Leading
 */

// ============================================================================
// Core System
// ============================================================================

export * from './core/types.js';
export * from './core/registry.js';
export * from './core/loader.js';
export * from './core/scheduler.js';
export * from './core/executor.js';

// ============================================================================
// Built-in Skills
// ============================================================================

export {
  PromptOptimizationSkill,
  createPromptOptimizationSkill,
  promptOptimizationSkill,
} from './prompt-optimization/index.js';

// ============================================================================
// Factories
// ============================================================================

import { SkillRegistry, createSkillRegistry } from './core/registry.js';
import { SkillLoader, createSkillLoader } from './core/loader.js';
import { SkillScheduler, createSkillScheduler } from './core/scheduler.js';
import type { Logger } from './core/types.js';

/**
 * 创建完整的 Skill 系统
 *
 * 包含：
 * - Registry: Skill 注册表
 * - Loader: 动态加载器
 * - Scheduler: 调度器
 *
 * @example
 * ```typescript
 * const skills = createSkillSystem(logger);
 *
 * // 注册 Skill
 * await skills.registry.registerFromPath('./my-skill');
 *
 * // 调度执行
 * const result = await skills.scheduler.schedule({
 *   skillName: 'my-skill',
 *   input: { file: 'data.pdf' },
 * });
 * ```
 */
export function createSkillSystem(logger: Logger) {
  const registry = createSkillRegistry();
  const loader = createSkillLoader({
    enableCache: true,
    enableLazyLoad: true,
  });
  const scheduler = createSkillScheduler(loader, logger, {
    maxConcurrentExecutions: 5,
    enableQueue: true,
    enableExecutionCache: true,
  });

  return {
    registry,
    loader,
    scheduler,
  };
}

// ============================================================================
// Class Exports
// ============================================================================

export { SkillRegistry, SkillLoader, SkillScheduler };
