import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SkillRegistry, createSkillRegistry } from '../src/skills/registry.js';
import type { Skill, SkillContext, SkillId, SkillSource } from '../src/skills/types.js';
import { z } from 'zod';

const createMockSkill = (overrides: Partial<Skill> = {}): Skill => ({
  id: `skill-${Date.now()}-${Math.random().toString(36).slice(2, 9)}` as SkillId,
  name: 'test-skill',
  description: 'A test skill for unit testing',
  version: '1.0.0',
  source: 'openclaw-workspace' as SkillSource,
  inputSchema: z.object({ input: z.string() }),
  execute: vi.fn().mockResolvedValue({ success: true, data: 'test result' }),
  ...overrides,
});

const createMockContext = (): SkillContext => ({
  executionId: `exec-${Date.now()}`,
  agentId: 'test-agent',
  input: {},
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
  llm: {
    complete: vi.fn().mockResolvedValue({ choices: [{ message: { content: 'test response' } }] }),
    completeStream: vi.fn(),
  },
  memory: {
    store: vi.fn(),
    search: vi.fn().mockResolvedValue([]),
    retrieve: vi.fn(),
  },
  tools: {
    execute: vi.fn(),
    list: vi.fn().mockReturnValue([]),
  },
});

describe('SkillRegistry', () => {
  let registry: SkillRegistry;

  beforeEach(() => {
    registry = createSkillRegistry();
  });

  describe('Registration', () => {
    it('should register a skill', () => {
      const skill = createMockSkill();
      registry.register(skill);

      expect(registry.get(skill.id)).toBe(skill);
    });

    it('should register skill by name', () => {
      const skill = createMockSkill({ name: 'my-skill' });
      registry.register(skill);

      expect(registry.getByName('my-skill')).toBe(skill);
    });

    it('should unregister a skill', () => {
      const skill = createMockSkill();
      registry.register(skill);
      registry.unregister(skill.id);

      expect(registry.get(skill.id)).toBeUndefined();
    });

    it('should check if skill exists', () => {
      const skill = createMockSkill();
      registry.register(skill);

      expect(registry.has(skill.id)).toBe(true);
      expect(registry.has('non-existent' as SkillId)).toBe(false);
    });

    it('should register multiple skills', () => {
      const skills = [
        createMockSkill({ name: 'skill-1' }),
        createMockSkill({ name: 'skill-2' }),
        createMockSkill({ name: 'skill-3' }),
      ];

      registry.registerMany(skills);

      expect(registry.list()).toHaveLength(3);
    });
  });

  describe('Retrieval', () => {
    it('should list all skills', () => {
      const skill1 = createMockSkill({ name: 'skill-1' });
      const skill2 = createMockSkill({ name: 'skill-2' });

      registry.register(skill1);
      registry.register(skill2);

      const list = registry.list();
      expect(list).toHaveLength(2);
      expect(list).toContainEqual(skill1);
      expect(list).toContainEqual(skill2);
    });

    it('should search skills by name', () => {
      const skill1 = createMockSkill({ name: 'search-skill' });
      const skill2 = createMockSkill({ name: 'other-skill' });

      registry.register(skill1);
      registry.register(skill2);

      const results = registry.search('search');
      expect(results).toHaveLength(1);
      expect(results[0]).toBe(skill1);
    });

    it('should search skills by description', () => {
      const skill1 = createMockSkill({ description: 'Search for files' });
      const skill2 = createMockSkill({ description: 'Do something else' });

      registry.register(skill1);
      registry.register(skill2);

      const results = registry.search('files');
      expect(results).toHaveLength(1);
      expect(results[0]).toBe(skill1);
    });

    it('should search skills by tags', () => {
      const skill1 = createMockSkill({
        metadata: { tags: ['search', 'files'] }
      });
      const skill2 = createMockSkill({
        metadata: { tags: ['other'] }
      });

      registry.register(skill1);
      registry.register(skill2);

      const results = registry.search('files');
      expect(results).toHaveLength(1);
      expect(results[0]).toBe(skill1);
    });
  });

  describe('Indexing', () => {
    it('should get skills by category', () => {
      const skill1 = createMockSkill({
        name: 'skill-1',
        metadata: { category: 'search' }
      });
      const skill2 = createMockSkill({
        name: 'skill-2',
        metadata: { category: 'utility' }
      });

      registry.register(skill1);
      registry.register(skill2);

      const searchSkills = registry.getByCategory('search');
      expect(searchSkills).toHaveLength(1);
      expect(searchSkills[0]).toBe(skill1);
    });

    it('should get skills by tag', () => {
      const skill1 = createMockSkill({
        name: 'skill-1',
        metadata: { tags: ['file', 'io'] }
      });
      const skill2 = createMockSkill({
        name: 'skill-2',
        metadata: { tags: ['network'] }
      });

      registry.register(skill1);
      registry.register(skill2);

      const fileSkills = registry.getByTag('file');
      expect(fileSkills).toHaveLength(1);
      expect(fileSkills[0]).toBe(skill1);
    });

    it('should return empty array for non-existent category', () => {
      const results = registry.getByCategory('non-existent');
      expect(results).toEqual([]);
    });

    it('should return empty array for non-existent tag', () => {
      const results = registry.getByTag('non-existent');
      expect(results).toEqual([]);
    });
  });

  describe('Statistics', () => {
    it('should return registry stats', () => {
      const skill1 = createMockSkill({
        name: 'skill-1',
        metadata: { category: 'search', tags: ['file'] }
      });
      const skill2 = createMockSkill({
        name: 'skill-2',
        metadata: { category: 'utility', tags: ['network'] }
      });

      registry.register(skill1);
      registry.register(skill2);

      const stats = registry.getStats();

      expect(stats.totalSkills).toBe(2);
      expect(stats.totalCategories).toBe(2);
      expect(stats.totalTags).toBe(2);
    });

    it('should track most accessed skills', () => {
      const skill1 = createMockSkill({ name: 'popular-skill' });
      const skill2 = createMockSkill({ name: 'unpopular-skill' });

      registry.register(skill1);
      registry.register(skill2);

      registry.get(skill1.id);
      registry.get(skill1.id);
      registry.get(skill1.id);
      registry.get(skill2.id);

      const stats = registry.getStats();

      expect(stats.mostAccessed[0].skillId).toBe(skill1.id);
      expect(stats.mostAccessed[0].accessCount).toBe(3);
    });
  });

  describe('Execution', () => {
    it('should execute a skill', async () => {
      const skill = createMockSkill();
      registry.register(skill);

      const context = createMockContext();
      const result = await registry.execute(skill.id, { input: 'test' }, context);

      expect(result.success).toBe(true);
      expect(skill.execute).toHaveBeenCalledWith({ input: 'test' }, context);
    });

    it('should return error for non-existent skill', async () => {
      const context = createMockContext();
      const result = await registry.execute('non-existent' as SkillId, {}, context);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('SKILL_NOT_FOUND');
    });

    it('should handle execution timeout', async () => {
      const slowSkill = createMockSkill({
        execute: vi.fn().mockImplementation(() =>
          new Promise(resolve => setTimeout(resolve, 1000))
        ),
      });

      registry.register(slowSkill);
      const context = createMockContext();

      const result = await registry.execute(slowSkill.id, {}, context, {
        timeout: 100,
      });

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('SKILL_EXECUTION_FAILED');
    });

    it('should retry on failure', async () => {
      let attempts = 0;
      const failingSkill = createMockSkill({
        execute: vi.fn().mockImplementation(() => {
          attempts++;
          if (attempts < 3) {
            throw new Error('Temporary failure');
          }
          return { success: true };
        }),
      });

      registry.register(failingSkill);
      const context = createMockContext();

      const result = await registry.execute(failingSkill.id, {}, context, {
        retries: 3,
        retryDelay: 10,
      });

      expect(attempts).toBe(3);
      expect(result.success).toBe(true);
    });
  });
});

describe('createSkillRegistry', () => {
  it('should create a registry instance', () => {
    const registry = createSkillRegistry();
    expect(registry).toBeInstanceOf(SkillRegistry);
  });

  it('should accept config and logger', () => {
    const logger = {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    };

    const registry = createSkillRegistry({}, logger);
    const skill = createMockSkill();
    registry.register(skill);

    expect(logger.info).toHaveBeenCalled();
  });
});
