/**
 * Built-in Skills Loader
 *
 * 标准内置技能加载器 - 简化版本
 * 直接将 builtin skills 转换为 Domain Skill 格式
 *
 * @module Skills
 * @version 1.0.0
 */

import type { Skill as DomainSkill } from '../../core/domain/skill.js';
import { createLogger } from '../../utils/logger.js';

const logger = createLogger({ name: 'BuiltInSkillsLoader' });

/**
 * 获取内置技能列表（Domain Skill 格式）
 *
 * 这是标准的内置技能加载入口
 * 直接将 builtin/index.ts 中的技能转换为 Agent 可用的格式
 */
export async function getBuiltInSkillsAsArray(): Promise<DomainSkill[]> {
  try {
    // 动态导入内置技能
    const builtin = await import('./index.js');
    const builtInSkills = builtin.builtInSkills || [];

    logger.info(`Loading ${builtInSkills.length} built-in skills...`);

    const domainSkills: DomainSkill[] = [];

    for (const skill of builtInSkills) {
      try {
        const domainSkill: DomainSkill = {
          id: skill.name,
          name: skill.name,
          description: skill.description,
          version: skill.metadata?.version || '1.0.0',
          script: {
            code: `// ${skill.name} skill`,
            lang: 'typescript',
          },
          input: skill.parameters,
          meta: {
            category: skill.metadata?.category || 'utility',
            tags: skill.metadata?.tags || [],
            author: skill.metadata?.author || 'sdkwork-browser-agent',
          },
        };
        domainSkills.push(domainSkill);
        logger.debug(`Loaded skill: ${skill.name}`);
      } catch (error) {
        logger.error(`Failed to load skill ${skill.name}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    logger.info(`Successfully loaded ${domainSkills.length} built-in skills`);
    return domainSkills;
  } catch (error) {
    logger.error(`Failed to load built-in skills: ${error instanceof Error ? error.message : String(error)}`);
    return [];
  }
}

/**
 * 默认导出
 */
export default {
  getAsArray: getBuiltInSkillsAsArray,
};
