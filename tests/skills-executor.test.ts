import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  ExecutionPool,
  ExecutionMonitor,
  createExecutionPool,
  createExecutionMonitor,
  calculateBackoffDelay,
} from '../src/skills/executor.js';
import type { Skill, SkillContext, SkillId, SkillSource } from '../src/skills/types.js';
import { z } from 'zod';

const createMockSkill = (overrides: Partial<Skill> = {}): Skill => ({
  id: `skill-${Date.now()}` as SkillId,
  name: 'test-skill',
  description: 'A test skill',
  version: '1.0.0',
  source: 'openclaw-workspace' as SkillSource,
  inputSchema: z.object({}),
  execute: vi.fn().mockResolvedValue({ success: true, data: 'result' }),
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

describe('ExecutionPool', () => {
  let pool: ExecutionPool;

  beforeEach(() => {
    pool = createExecutionPool(5);
  });

  describe('Execution', () => {
    it('should execute a skill', async () => {
      const skill = createMockSkill();
      const context = createMockContext();

      const result = await pool.execute(skill, {}, context);

      expect(result.success).toBe(true);
      expect(result.data).toBe('result');
    });

    it('should track execution stats', async () => {
      const skill = createMockSkill();
      const context = createMockContext();

      await pool.execute(skill, {}, context);
      await pool.execute(skill, {}, context);

      const stats = pool.getStats();

      expect(stats.totalExecuted).toBe(2);
      expect(stats.successful).toBe(2);
      expect(stats.failed).toBe(0);
    });

    it('should handle execution errors', async () => {
      const failingSkill = createMockSkill({
        execute: vi.fn().mockRejectedValue(new Error('Execution failed')),
      });
      const context = createMockContext();

      const result = await pool.execute(failingSkill, {}, context);

      expect(result.success).toBe(false);
    });

    it('should handle timeout', async () => {
      const slowSkill = createMockSkill({
        execute: vi.fn().mockImplementation(
          () => new Promise(resolve => setTimeout(resolve, 1000))
        ),
      });
      const context = createMockContext();

      const result = await pool.execute(slowSkill, {}, context, {
        timeout: 100,
      });

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('EXECUTION_FAILED');
    });
  });

  describe('Retry', () => {
    it('should retry on failure', async () => {
      let attempts = 0;
      const flakySkill = createMockSkill({
        execute: vi.fn().mockImplementation(() => {
          attempts++;
          if (attempts < 3) {
            return Promise.resolve({
              success: false,
              error: { message: 'Temporary failure', recoverable: true },
            });
          }
          return Promise.resolve({ success: true });
        }),
      });
      const context = createMockContext();

      const result = await pool.execute(flakySkill, {}, context, {
        retries: 3,
        retryDelay: 10,
      });

      expect(result.success).toBe(true);
      expect(attempts).toBe(3);
    });

    it('should not retry non-recoverable errors', async () => {
      let attempts = 0;
      const failingSkill = createMockSkill({
        execute: vi.fn().mockImplementation(() => {
          attempts++;
          return Promise.resolve({
            success: false,
            error: { message: 'Fatal error', recoverable: false },
          });
        }),
      });
      const context = createMockContext();

      const result = await pool.execute(failingSkill, {}, context, {
        retries: 3,
        retryDelay: 10,
      });

      expect(result.success).toBe(false);
      expect(attempts).toBe(1);
    });

    it('should track retry stats', async () => {
      const flakySkill = createMockSkill({
        execute: vi.fn().mockResolvedValue({
          success: false,
          error: { message: 'Error', recoverable: true },
        }),
      });
      const context = createMockContext();

      await pool.execute(flakySkill, {}, context, {
        retries: 2,
        retryDelay: 10,
      });

      const stats = pool.getStats();
      expect(stats.retried).toBe(2);
    });
  });

  describe('Cancellation', () => {
    it('should cancel execution by skill id', async () => {
      const skill = createMockSkill({
        id: 'cancel-test' as SkillId,
        execute: vi.fn().mockImplementation(
          () => new Promise(resolve => setTimeout(resolve, 1000))
        ),
      });
      const context = createMockContext();

      const executePromise = pool.execute(skill, {}, context, { timeout: 2000 });

      pool.cancel(skill.id);

      const result = await executePromise;
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('EXECUTION_ABORTED');
    });

    it('should cancel all executions', async () => {
      const skill1 = createMockSkill({
        id: 'skill-1' as SkillId,
        execute: vi.fn().mockImplementation(
          () => new Promise(resolve => setTimeout(resolve, 1000))
        ),
      });
      const skill2 = createMockSkill({
        id: 'skill-2' as SkillId,
        execute: vi.fn().mockImplementation(
          () => new Promise(resolve => setTimeout(resolve, 1000))
        ),
      });
      const context = createMockContext();

      const promise1 = pool.execute(skill1, {}, context, { timeout: 2000 });
      const promise2 = pool.execute(skill2, {}, context, { timeout: 2000 });

      pool.cancelAll();

      const [result1, result2] = await Promise.all([promise1, promise2]);

      expect(result1.success).toBe(false);
      expect(result2.success).toBe(false);
    });
  });

  describe('Concurrency', () => {
    it('should limit concurrent executions', async () => {
      const smallPool = createExecutionPool(2);
      const executionTimes: number[] = [];

      const slowSkill = createMockSkill({
        execute: vi.fn().mockImplementation(async () => {
          executionTimes.push(Date.now());
          await new Promise(resolve => setTimeout(resolve, 100));
          return { success: true };
        }),
      });
      const context = createMockContext();

      const promises = [
        smallPool.execute(slowSkill, {}, context),
        smallPool.execute(slowSkill, {}, context),
        smallPool.execute(slowSkill, {}, context),
        smallPool.execute(slowSkill, {}, context),
      ];

      await Promise.all(promises);

      const stats = smallPool.getStats();
      expect(stats.totalExecuted).toBe(4);
    });
  });
});

describe('ExecutionMonitor', () => {
  let monitor: ExecutionMonitor;

  beforeEach(() => {
    monitor = createExecutionMonitor();
  });

  it('should track running executions', () => {
    const task = {
      id: 'task-1',
      skillId: 'skill-1' as SkillId,
      skill: createMockSkill(),
      input: {},
      context: createMockContext(),
      options: {},
      resolve: vi.fn(),
      reject: vi.fn(),
      startTime: Date.now(),
      attempts: 0,
    };

    monitor.startMonitoring(task);

    const running = monitor.getRunningExecutions();
    expect(running).toHaveLength(1);
    expect(running[0].id).toBe('task-1');
  });

  it('should track completed executions', () => {
    const task = {
      id: 'task-1',
      skillId: 'skill-1' as SkillId,
      skill: createMockSkill(),
      input: {},
      context: createMockContext(),
      options: {},
      resolve: vi.fn(),
      reject: vi.fn(),
      startTime: Date.now(),
      attempts: 0,
    };

    monitor.startMonitoring(task);
    monitor.completeExecution('task-1', { success: true });

    const running = monitor.getRunningExecutions();
    expect(running).toHaveLength(0);
  });

  it('should emit events', () => {
    const handler = vi.fn();
    monitor.on('execution:started', handler);

    const task = {
      id: 'task-1',
      skillId: 'skill-1' as SkillId,
      skill: createMockSkill(),
      input: {},
      context: createMockContext(),
      options: {},
      resolve: vi.fn(),
      reject: vi.fn(),
      startTime: Date.now(),
      attempts: 0,
    };

    monitor.startMonitoring(task);

    expect(handler).toHaveBeenCalled();
  });

  it('should return execution history', () => {
    const task = {
      id: 'task-1',
      skillId: 'skill-1' as SkillId,
      skill: createMockSkill({ name: 'test-skill' }),
      input: {},
      context: createMockContext(),
      options: {},
      resolve: vi.fn(),
      reject: vi.fn(),
      startTime: Date.now(),
      attempts: 0,
    };

    monitor.startMonitoring(task);
    monitor.completeExecution('task-1', { success: true });

    const history = monitor.getExecutionHistory();
    expect(history).toHaveLength(1);
    expect(history[0].skillName).toBe('test-skill');
    expect(history[0].status).toBe('completed');
  });
});

describe('calculateBackoffDelay', () => {
  it('should calculate exponential backoff', () => {
    const delay1 = calculateBackoffDelay(1, { maxAttempts: 5, minDelayMs: 100, maxDelayMs: 10000, jitter: 0 });
    const delay2 = calculateBackoffDelay(2, { maxAttempts: 5, minDelayMs: 100, maxDelayMs: 10000, jitter: 0 });
    const delay3 = calculateBackoffDelay(3, { maxAttempts: 5, minDelayMs: 100, maxDelayMs: 10000, jitter: 0 });

    expect(delay1).toBe(100);
    expect(delay2).toBe(200);
    expect(delay3).toBe(400);
  });

  it('should cap at max delay', () => {
    const delay = calculateBackoffDelay(10, { maxAttempts: 15, minDelayMs: 100, maxDelayMs: 1000, jitter: 0 });

    expect(delay).toBeLessThanOrEqual(1000);
  });

  it('should apply jitter', () => {
    const delays = new Set<number>();

    for (let i = 0; i < 100; i++) {
      const delay = calculateBackoffDelay(1, { maxAttempts: 5, minDelayMs: 100, maxDelayMs: 1000, jitter: 0.1 });
      delays.add(delay);
    }

    expect(delays.size).toBeGreaterThan(1);
  });

  it('should return non-negative delay', () => {
    const delay = calculateBackoffDelay(0, { maxAttempts: 5, minDelayMs: 100, maxDelayMs: 1000, jitter: 0.5 });

    expect(delay).toBeGreaterThanOrEqual(0);
  });
});

describe('Factory functions', () => {
  it('should create ExecutionPool with default concurrency', () => {
    const pool = createExecutionPool();
    expect(pool).toBeInstanceOf(ExecutionPool);
  });

  it('should create ExecutionPool with custom concurrency', () => {
    const pool = createExecutionPool(10);
    expect(pool).toBeInstanceOf(ExecutionPool);
  });

  it('should create ExecutionMonitor', () => {
    const monitor = createExecutionMonitor();
    expect(monitor).toBeInstanceOf(ExecutionMonitor);
  });
});
