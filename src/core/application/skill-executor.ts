/**
 * Skill Executor - 完美技能执行器实现
 * 
 * 行业标准 Skill 执行系统
 * 支持 Reference + Script + 注入 API
 * 高内聚低耦合，消除重复代码
 * 
 * @application Skill
 * @version 5.1.0
 * @standard Industry Leading (Claude Code / OpenCode / OpenClaw)
 * 
 * 安全特性：
 * - 使用 Node.js VM 沙箱隔离执行
 * - 阻止危险操作 (require, eval, process 等)
 * - 内存和 CPU 限制
 * - 超时控制
 */

import type {
  Skill,
  SkillExecutionContext,
  SkillResult,
  SkillError,
  SkillInjectedAPI,
  SkillLogger,
  SkillMemoryAPI,
  SkillRegistry,
} from '../domain/skill.js';
import type { ToolRegistry } from '../domain/tool.js';
import type { LLMProvider } from '../../llm/provider.js';
import type {
  ExecutionId,
  AgentId,
  UnifiedLogger,
  SkillId,
} from '../domain/unified.js';
import { createExecutionId } from '../domain/unified.js';
import { AgentEventEmitter } from '../../utils/typed-event-emitter.js';
import { createLogger } from '../../utils/logger.js';
import { NodeSecureSandbox, type NodeSandboxConfig } from '../../security/node-sandbox.js';

// ============================================
// Skill Executor Config
// ============================================

/**
 * Skill 执行器配置
 */
export interface SkillExecutorConfig {
  /** LLM Provider */
  llm: LLMProvider;
  /** Tool Registry */
  toolRegistry: ToolRegistry;
  /** Skill Registry (用于嵌套调用) */
  skillRegistry?: SkillRegistry;
  /** 内存存储 */
  memory?: SkillMemoryAPI;
  /** 事件发射器 */
  eventEmitter?: AgentEventEmitter;
  /** 超时时间 (毫秒) */
  timeout?: number;
  /** 最大内存 (MB) */
  maxMemory?: number;
  /** CPU 限制 (毫秒) */
  cpuLimit?: number;
  /** 是否启用沙箱隔离 (默认 true) */
  enableSandbox?: boolean;
  /** 自定义沙箱配置 */
  sandboxConfig?: Partial<NodeSandboxConfig>;
}

// ============================================
// Perfect Skill Executor
// ============================================

/**
 * 完美 Skill 执行器
 * 
 * 特性：
 * 1. 依赖注入完善
 * 2. 类型安全
 * 3. 错误处理完善
 * 4. 性能优化
 * 5. 可观测性
 * 6. 沙箱安全隔离
 */
export class SkillExecutorImpl {
  private readonly llm: LLMProvider;
  private readonly toolRegistry: ToolRegistry;
  private readonly skillRegistry?: SkillRegistry;
  private readonly memory?: SkillMemoryAPI;
  private readonly eventEmitter: AgentEventEmitter;
  private readonly timeout: number;
  private readonly maxMemory: number;
  private readonly cpuLimit: number;
  private readonly enableSandbox: boolean;
  private readonly sandboxConfig?: Partial<NodeSandboxConfig>;
  private readonly logger: UnifiedLogger;
  private readonly abortControllers = new Map<ExecutionId, AbortController>();
  private sandbox: NodeSecureSandbox | null = null;

  constructor(config: SkillExecutorConfig) {
    this.llm = config.llm;
    this.toolRegistry = config.toolRegistry;
    this.skillRegistry = config.skillRegistry;
    this.memory = config.memory;
    this.eventEmitter = config.eventEmitter ?? new AgentEventEmitter();
    this.timeout = config.timeout ?? 60000; // 增加到 60 秒，支持复杂 LLM 调用
    this.maxMemory = config.maxMemory ?? 64;
    this.cpuLimit = config.cpuLimit ?? 300000; // 增加到 300 秒 (10倍)，支持长时间 LLM 调用
    this.enableSandbox = config.enableSandbox ?? true;
    this.sandboxConfig = config.sandboxConfig;
    this.logger = createLogger({ name: 'SkillExecutor' });

    if (this.enableSandbox) {
      this.initializeSandbox();
    }
  }

  private initializeSandbox(): void {
    this.sandbox = new NodeSecureSandbox({
      timeout: this.timeout,
      memoryLimit: this.maxMemory,
      cpuLimit: this.cpuLimit,
      useContextIsolation: true,
      cacheCompiledCode: true,
      ...this.sandboxConfig,
    });
  }

  /**
   * 执行 Skill（支持渐进式披露）
   * 
   * 渐进式披露能力：
   * 1. 执行前发射 skill:executing 事件
   * 2. 执行中通过 $progress() API 报告进度
   * 3. 执行后发射 skill:completed 事件
   * 4. 支持 abortController 中止执行
   * 
   * @example
   * const result = await executor.execute({
   *   skillId: 'my-skill',
   *   input: { query: 'hello' },
   *   context: { agentId: 'agent-1', sessionId: 'session-1' }
   * });
   * 
   * // 监听进度
   * executor.on('skill:progress', (data) => {
   *   console.log(`进度: ${data.progress}% - ${data.message}`);
   * });
   */
  async execute(params: {
    skill: Skill;
    input: unknown;
    context: {
      agentId: AgentId;
      sessionId?: string;
      parentExecutionId?: ExecutionId;
    };
  }): Promise<SkillResult> {
    const { skill, input, context } = params;
    const executionId = createExecutionId(this.generateId());
    const abortController = new AbortController();
    this.abortControllers.set(executionId, abortController);

    // 发射执行开始事件
    this.eventEmitter.emit('skill:executing', {
      skillId: skill.id as SkillId,
      executionId,
      input,
    });

    // 设置超时
    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    
    try {
      timeoutId = setTimeout(() => {
        abortController.abort();
        this.eventEmitter.emit('skill:aborted', {
          skillId: skill.id as SkillId,
          executionId,
        });
      }, this.timeout);

      // 构建执行上下文
      const executionContext = this.buildExecutionContext(
        skill,
        input,
        context,
        executionId,
        abortController
      );

      // 执行 Skill Script
      const result = await this.runSkillScript(skill, executionContext);

      if (timeoutId) clearTimeout(timeoutId);

      // 发射执行完成事件
      this.eventEmitter.emit('skill:completed', {
        skillId: skill.id as SkillId,
        executionId,
        result,
      });

      return result;
    } catch (error) {
      if (timeoutId) clearTimeout(timeoutId);
      
      const skillError = this.createSkillError(error, skill.id);

      // 发射执行失败事件
      this.eventEmitter.emit('skill:failed', {
        skillId: skill.id as SkillId,
        executionId,
        error: skillError,
      });

      // 返回失败的 SkillResult
      return {
        success: false,
        error: skillError,
        meta: {
          executionId,
          skillId: skill.id,
          skillName: skill.name,
          startTime: Date.now(),
          endTime: Date.now(),
          duration: 0,
        },
      };
    } finally {
      this.abortControllers.delete(executionId);
    }
  }

  /**
   * 中止执行
   */
  abort(executionId: ExecutionId): boolean {
    const controller = this.abortControllers.get(executionId);
    if (controller) {
      controller.abort();
      this.abortControllers.delete(executionId);
      return true;
    }
    return false;
  }

  /**
   * 中止所有执行
   */
  abortAll(): void {
    for (const [executionId, controller] of this.abortControllers) {
      controller.abort();
      this.abortControllers.delete(executionId);
    }
  }

  /**
   * 流式调用 LLM
   */
  private async * streamLLM(
    prompt: string,
    options: unknown,
    context: SkillExecutionContext,
    emitProgress: (progress: number, message: string, data?: Record<string, unknown>) => void
  ): AsyncGenerator<string, void, unknown> {
    emitProgress(10, '🤔 流式思考中...');
    
    if (context.signal?.aborted) {
      throw new Error('Skill execution aborted');
    }

    const stream = this.llm.stream({
      messages: [{ role: 'user', content: prompt }],
      ...((options as Record<string, unknown>) ?? {}),
    });

    let fullContent = '';
    let chunkCount = 0;
    
    for await (const chunk of stream) {
      const delta = chunk.delta?.content;
      if (delta) {
        fullContent += delta;
        chunkCount++;
        if (chunkCount % 5 === 0 || delta.length > 50) {
          emitProgress(30 + Math.min(50, chunkCount), `💭 思考中... ${fullContent.length} 字符`);
        }
        yield delta;
      }
    }

    emitProgress(80, '✨ 流式响应完成');
  }

  /**
   * 销毁执行器，释放资源
   */
  async destroy(): Promise<void> {
    this.abortAll();
    if (this.sandbox) {
      await this.sandbox.destroy();
      this.sandbox = null;
    }
  }

  /**
   * 获取沙箱统计信息
   */
  getSandboxStats(): { backend: string; healthy: boolean; executionCount: number } | null {
    if (!this.sandbox) return null;
    const stats = this.sandbox.getStats();
    return {
      backend: stats.backend as string,
      healthy: stats.healthy as boolean,
      executionCount: stats.executionCount as number,
    };
  }

  // ============================================
  // Private Methods
  // ============================================

  private buildExecutionContext(
    skill: Skill,
    input: unknown,
    context: { agentId: AgentId; sessionId?: string; parentExecutionId?: ExecutionId },
    executionId: ExecutionId,
    abortController: AbortController
  ): SkillExecutionContext {
    const logger = this.createSkillLogger(skill.id, executionId);

    // 解析输入：如果是 JSON 字符串，则解析为对象
    let parsedInput = input;
    if (typeof input === 'string') {
      try {
        parsedInput = JSON.parse(input);
      } catch {
        // 如果解析失败，保持原字符串
        parsedInput = input;
      }
    }

    return {
      executionId,
      agentId: context.agentId,
      sessionId: context.sessionId,
      parentExecutionId: context.parentExecutionId,
      input: parsedInput,
      references: this.buildReferencesMap(skill.references),
      logger,
      signal: abortController.signal,
      startedAt: new Date(),
    };
  }

  private createSkillLogger(skillId: string, executionId: ExecutionId): SkillLogger {
    const prefix = `[Skill:${skillId}][Exec:${executionId}]`;

    return {
      debug: (message: string, meta?: Record<string, unknown>) => {
        this.logger.debug(`${prefix} ${message}`, meta);
      },
      info: (message: string, meta?: Record<string, unknown>) => {
        this.logger.info(`${prefix} ${message}`, meta);
      },
      warn: (message: string, meta?: Record<string, unknown>) => {
        this.logger.warn(`${prefix} ${message}`, meta);
      },
      error: (message: string, context?: Record<string, unknown>, _error?: Error) => {
        this.logger.error(`${prefix} ${message}`, context);
      },
    };
  }

  private buildReferencesMap(references?: Skill['references']): Record<string, string> {
    if (!references) return {};

    return references.reduce((map, ref) => {
      map[ref.name] = ref.content;
      return map;
    }, {} as Record<string, string>);
  }

  private async runSkillScript(
    skill: Skill,
    context: SkillExecutionContext
  ): Promise<SkillResult> {
    const { script } = skill;

    switch (script.lang) {
      case 'javascript':
      case 'typescript':
        return this.runJavaScript(skill, context);
      case 'python':
        return this.runPython(skill, context);
      case 'bash':
      case 'shell':
        return this.runShell(skill, context);
      default:
        throw new Error(`Unsupported language: ${script.lang}`);
    }
  }

  private async runJavaScript(
    skill: Skill,
    context: SkillExecutionContext
  ): Promise<SkillResult> {
    const api = this.buildInjectedAPI(skill, context);
    const startTime = Date.now();

    if (this.enableSandbox && this.sandbox) {
      return this.runJavaScriptInSandbox(skill, context, api, startTime);
    }

    return this.runJavaScriptDirect(skill, context, api, startTime);
  }

  private async runJavaScriptInSandbox(
    skill: Skill,
    context: SkillExecutionContext,
    api: SkillInjectedAPI,
    startTime: number
  ): Promise<SkillResult> {
    const sandboxContext = {
      $context: api.$context,
      $input: api.$input,
      $llm: api.$llm,
      $memory: api.$memory,
      $tool: api.$tool,
      $skill: api.$skill,
      $log: {
        debug: (msg: string, meta?: Record<string, unknown>) => api.$log.debug(msg, meta),
        info: (msg: string, meta?: Record<string, unknown>) => api.$log.info(msg, meta),
        warn: (msg: string, meta?: Record<string, unknown>) => api.$log.warn(msg, meta),
        error: (msg: string, meta?: Record<string, unknown>) => api.$log.error(msg, meta),
      },
      $ref: api.$ref,
      $references: api.$references,
    };

    const wrappedCode = `
      (async function() {
        ${skill.script.code}
      })()
    `;

    const result = await this.sandbox!.execute(wrappedCode, sandboxContext);

    if (!result.success) {
      const error = result.error!;
      return {
        success: false,
        error: {
          code: error.type.toUpperCase(),
          message: error.message,
          skillId: skill.id,
          recoverable: error.type === 'timeout',
        },
        meta: {
          executionId: context.executionId,
          skillId: skill.id,
          skillName: skill.name,
          startTime,
          endTime: Date.now(),
          duration: result.executionTime,
        },
      };
    }

    return {
      success: true,
      data: result.result,
      meta: {
        executionId: context.executionId,
        skillId: skill.id,
        skillName: skill.name,
        startTime,
        endTime: Date.now(),
        duration: result.executionTime,
      },
    };
  }

  private async runJavaScriptDirect(
    skill: Skill,
    context: SkillExecutionContext,
    api: SkillInjectedAPI,
    startTime: number
  ): Promise<SkillResult> {
    const sandbox = new Function(
      '$context',
      '$input',
      '$llm',
      '$memory',
      '$tool',
      '$skill',
      '$log',
      '$ref',
      skill.script.code
    );

    const result = await sandbox(
      api.$context,
      api.$input,
      api.$llm,
      api.$memory,
      api.$tool,
      api.$skill,
      api.$log,
      api.$ref
    );

    return {
      success: true,
      data: result,
      meta: {
        executionId: context.executionId,
        skillId: skill.id,
        skillName: skill.name,
        startTime,
        endTime: Date.now(),
        duration: Date.now() - startTime,
      },
    };
  }

  private async runPython(
    _skill: Skill,
    _context: SkillExecutionContext
  ): Promise<SkillResult> {
    // Python 执行需要外部进程
    throw new Error('Python execution not implemented in this environment');
  }

  private async runShell(
    _skill: Skill,
    _context: SkillExecutionContext
  ): Promise<SkillResult> {
    // Shell 执行需要外部进程
    throw new Error('Shell execution not implemented in this environment');
  }

  private buildInjectedAPI(_skill: Skill, context: SkillExecutionContext): SkillInjectedAPI {
    const self = this;
    const emitProgress = (progress: number, message: string, data?: Record<string, unknown>) => {
      self.eventEmitter.emit('skill:progress', {
        executionId: context.executionId,
        skillId: _skill.id,
        progress: Math.min(100, Math.max(0, progress)),
        message,
        data,
      });
    };

    return {
      $context: context,
      $input: context.input,
      $references: context.references,

      $llm: Object.assign(
        async (prompt: string, options?: unknown): Promise<string> => {
          emitProgress(10, '🤔 思考中...');
          
          if (context.signal?.aborted) {
            throw new Error('Skill execution aborted');
          }

          const response = await self.llm.complete({
            messages: [{ role: 'user', content: prompt }],
            ...((options as Record<string, unknown>) ?? {}),
          });

          emitProgress(80, '✨ 响应完成');
          return response.content ?? '';
        },
        {
          stream: (prompt: string, options?: unknown): AsyncGenerator<string, void, unknown> => {
            return this.streamLLM(prompt, options, context, emitProgress);
          }
        }
      ),

      $memory: {
        get: async (key: string) => {
          emitProgress(5, '读取内存...');
          return this.memory?.get(key);
        },
        set: async (key: string, value: unknown) => {
          emitProgress(5, '写入内存...');
          await this.memory?.set(key, value);
        },
        delete: async (key: string) => {
          emitProgress(5, '删除内存...');
          await this.memory?.delete(key);
        },
        search: async (query: string, limit?: number) => {
          emitProgress(5, '搜索内存...');
          return this.memory?.search(query, limit) ?? [];
        },
        clear: async () => {
          emitProgress(5, '清除内存...');
        },
      },

      $tool: async (name: string, input: unknown) => {
        emitProgress(20, `执行工具: ${name}...`);
        
        if (context.signal?.aborted) {
          throw new Error('Skill execution aborted');
        }

        const toolResult = await this.toolRegistry.execute(name, input, {
          executionId: context.executionId,
          agentId: context.agentId,
          sessionId: context.sessionId,
          toolId: name,
          toolName: name,
          logger: context.logger,
          signal: context.signal,
        });

        context.logger.info(`Tool executed: ${name}`, { input, result: toolResult });
        emitProgress(40, `工具 ${name} 执行完成`);
        return toolResult;
      },

      $skill: async (name: string, input: unknown) => {
        if (context.signal?.aborted) {
          throw new Error('Skill execution aborted');
        }

        emitProgress(30, `调用嵌套技能: ${name}...`);
        context.logger.info(`Nested skill call: ${name}`, { input });

        if (!this.skillRegistry) {
          throw new Error('Skill registry not configured for nested calls');
        }

        try {
          const skill = await this.skillRegistry.getByName(name);
          if (!skill) {
            throw new Error(`Skill not found: ${name}`);
          }

          const result = await (this.execute as (params: {
            skill: typeof skill;
            input: unknown;
            context: {
              agentId: string;
              sessionId?: string;
              parentExecutionId?: string;
            };
          }) => Promise<SkillResult>)({
            skill,
            input,
            context: {
              agentId: context.agentId,
              sessionId: context.sessionId,
              parentExecutionId: context.executionId,
            },
          });

          emitProgress(60, `嵌套技能 ${name} 执行完成`);
          return result;
        } catch (error) {
          context.logger.error(`Nested skill execution failed: ${name}`, { error });
          throw error;
        }
      },

      $progress: (progress: number, message?: string, data?: Record<string, unknown>) => {
        emitProgress(progress, message || '处理中...', data);
      },

      $log: context.logger,

      $ref: (name: string) => {
        const content = context.references[name];
        if (!content) {
          throw new Error(`Reference not found: ${name}`);
        }
        return content;
      },
    };
  }

  private createSkillError(error: unknown, skillId: string): SkillError {
    if (error instanceof Error) {
      return {
        code: 'SKILL_EXECUTION_ERROR',
        message: error.message,
        skillId,
        recoverable: false,
      };
    }

    return {
      code: 'SKILL_EXECUTION_ERROR',
      message: String(error),
      skillId,
      recoverable: false,
    };
  }

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
  }
}

// ============================================
// Factory
// ============================================

/**
 * 创建 Skill 执行器
 */
export function createSkillExecutor(config: SkillExecutorConfig): SkillExecutorImpl {
  return new SkillExecutorImpl(config);
}
