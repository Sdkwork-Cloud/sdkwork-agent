/**
 * Skill Registry - Agent 内部 Skill 注册表
 *
 * 代理到主 Skill 注册表，保持统一接口
 *
 * @module AgentSkillRegistry
 * @version 5.0.0
 */

import type {
  Skill,
  SkillId,
  SkillResult,
  SkillContext,
} from '../domain/types.js';
import { SkillRegistry as MainSkillRegistry } from '../../skills/index.js';

// 从 skills 模块导入类型
import type { SkillExecutionOptions } from '../../skills/index.js';

export type { SkillExecutionOptions };

/**
 * Agent Skill Registry
 *
 * 代理到主 Skill 注册表，确保与主系统保持一致
 */
export class SkillRegistryImpl {
  private registry: MainSkillRegistry;

  constructor(registry?: MainSkillRegistry) {
    this.registry = registry || new MainSkillRegistry();
  }

  register(skill: Skill): void {
    // 使用类型断言来兼容不同模块的 Skill 类型
    this.registry.register(skill as unknown as import('../../skills/index.js').Skill);
  }

  unregister(skillId: SkillId): void {
    this.registry.unregister(skillId);
  }

  get(skillId: SkillId): Skill | undefined {
    return this.registry.get(skillId) as unknown as Skill | undefined;
  }

  getByName(name: string): Skill | undefined {
    return this.registry.getByName(name) as unknown as Skill | undefined;
  }

  list(): Skill[] {
    return this.registry.list() as unknown as Skill[];
  }

  search(query: string): Skill[] {
    return this.registry.search(query) as unknown as Skill[];
  }

  async execute(
    skillId: SkillId,
    input: unknown,
    context: SkillContext,
    options: SkillExecutionOptions = {}
  ): Promise<SkillResult> {
    // 使用类型断言来兼容不同模块的 SkillContext 类型
    return this.registry.execute(
      skillId,
      input,
      context as unknown as import('../../skills/index.js').SkillContext,
      options
    ) as Promise<SkillResult>;
  }
}

export function createSkillRegistry(registry?: MainSkillRegistry): SkillRegistryImpl {
  return new SkillRegistryImpl(registry);
}
