/**
 * Unified Execution Engine
 * 统一执行引擎 - 协调所有可执行单元的执行
 * 
 * 核心职责：
 * 1. 执行路由 - 根据Executable类型分发到对应执行器
 * 2. 上下文管理 - 构建和维护执行上下文
 * 3. 资源监控 - 跟踪和控制资源使用
 * 4. 执行追踪 - 记录完整的执行链路
 * 5. 错误处理 - 统一的错误恢复策略
 */

import { EventEmitter } from '../utils/event-emitter.js';
import type {
  Executable,
  ExecutableType,
  ExecutionContext,
  ExecutionResult,
  ExecutionLogger,
  LLMService,
  MemoryService,
  ToolRegistry,
  MCPClient,
  PluginManager,
  ResourceLimits,
} from './index.js';
import { ScriptExecutor } from './script-executor.js';
import { MCPExecutor } from './mcp-executor.js';
import { PluginExecutor } from './plugin-executor.js';
import { ExecutionTracer } from './tracer.js';
import { ResourceMonitor } from './resource-monitor.js';
import { Logger } from '../utils/logger.js';

/**
 * 执行引擎配置
 */
export interface ExecutionEngineConfig {
  /** 默认资源限制 */
  defaultLimits?: ResourceLimits;
  
  /** 是否启用追踪 */
  enableTracing?: boolean;
  
  /** 是否启用资源监控 */
  enableResourceMonitor?: boolean;
  
  /** 最大并发执行数 */
  maxConcurrency?: number;
  
  /** 执行超时（毫秒） */
  defaultTimeout?: number;
}

/**
 * 执行事件
 */
export interface ExecutionEvent {
  executionId: string;
  executableName: string;
  executableType: ExecutableType;
  timestamp: Date;
  data?: unknown;
}

/**
 * 统一执行引擎
 */
export class ExecutionEngine extends EventEmitter {
  private config: Required<ExecutionEngineConfig>;
  private logger: Logger;
  
  // 专用执行器
  private scriptExecutor: ScriptExecutor;
  private mcpExecutor: MCPExecutor;
  private pluginExecutor: PluginExecutor;
  
  // 监控和追踪
  private tracer: ExecutionTracer;
  private resourceMonitor: ResourceMonitor;
  
  // 服务依赖
  private llmService: LLMService;
  private memoryService: MemoryService;
  private toolRegistry: ToolRegistry;
  private mcpClient?: MCPClient;
  private pluginManager?: PluginManager;
  
  // 执行状态
  private activeExecutions = new Map<string, AbortController>();
  private executionCount = 0;

  constructor(config: ExecutionEngineConfig = {}) {
    super();
    
    this.config = {
      defaultLimits: {
        maxExecutionTime: 300000, // 5分钟
        maxMemory: 512 * 1024 * 1024, // 512MB
        maxRecursionDepth: 10,
        maxConcurrency: 10,
      },
      enableTracing: true,
      enableResourceMonitor: true,
      maxConcurrency: 10,
      defaultTimeout: 300000,
      ...config,
    };
    
    this.logger = new Logger({ level: 'info', enableConsole: true }, 'ExecutionEngine');
    
    // 初始化执行器
    this.scriptExecutor = new ScriptExecutor();
    this.mcpExecutor = new MCPExecutor();
    this.pluginExecutor = new PluginExecutor();
    
    // 初始化监控组件
    this.tracer = new ExecutionTracer();
    this.resourceMonitor = new ResourceMonitor();
    
    // 初始化默认服务（会被后续注入覆盖）
    this.llmService = this.createDefaultLLMService();
    this.memoryService = this.createDefaultMemoryService();
    this.toolRegistry = this.createDefaultToolRegistry();
  }

  /**
   * 注入服务依赖
   */
  injectServices(services: {
    llm?: LLMService;
    memory?: MemoryService;
    tools?: ToolRegistry;
    mcp?: MCPClient;
    plugins?: PluginManager;
  }): void {
    if (services.llm) this.llmService = services.llm;
    if (services.memory) this.memoryService = services.memory;
    if (services.tools) this.toolRegistry = services.tools;
    if (services.mcp) {
      this.mcpClient = services.mcp;
      this.mcpExecutor.setClient(services.mcp);
    }
    if (services.plugins) {
      this.pluginManager = services.plugins;
      this.pluginExecutor.setManager(services.plugins);
    }
  }

  /**
   * 执行可执行单元
   * 核心方法 - 所有执行请求的入口
   */
  async execute<T = unknown>(
    executable: Executable,
    input: unknown,
    options: {
      sessionId?: string;
      parentExecutionId?: string;
      limits?: ResourceLimits;
      timeout?: number;
      context?: Record<string, unknown>;
    } = {}
  ): Promise<ExecutionResult<T>> {
    const executionId = this.generateExecutionId();
    const startTime = new Date();
    
    // 检查并发限制
    if (this.activeExecutions.size >= this.config.maxConcurrency) {
      return this.createErrorResult(
        executionId,
        executable,
        'CONCURRENCY_LIMIT',
        'Maximum concurrent executions reached',
        startTime
      ) as ExecutionResult<T>;
    }
    
    // 创建AbortController用于超时控制
    const abortController = new AbortController();
    this.activeExecutions.set(executionId, abortController);
    
    // 设置超时
    const timeout = options.timeout || this.config.defaultTimeout;
    const timeoutId = setTimeout(() => {
      abortController.abort(new Error(`Execution timeout after ${timeout}ms`));
    }, timeout);
    
    try {
      // 构建执行上下文
      const context = await this.buildExecutionContext(
        executionId,
        executable,
        options,
        abortController.signal
      );
      
      // 记录执行开始
      this.emit('execution:started', {
        executionId,
        executableName: executable.name,
        executableType: executable.type,
        timestamp: startTime,
      } as ExecutionEvent);
      
      if (this.config.enableTracing) {
        this.tracer.startTrace(executionId, executable, input);
      }
      
      if (this.config.enableResourceMonitor) {
        this.resourceMonitor.startMonitoring(executionId);
      }
      
      // 路由到对应执行器
      const result = await this.routeExecution<T>(executable, input, context);
      
      // 添加元数据
      const enrichedResult: ExecutionResult<T> = {
        ...result,
        metadata: {
          ...result.metadata,
          executionId,
          executableName: executable.name,
          executableType: executable.type,
          startTime,
          endTime: new Date(),
          duration: Date.now() - startTime.getTime(),
          resources: this.config.enableResourceMonitor
            ? this.resourceMonitor.getUsage(executionId)
            : undefined,
        },
      };
      
      // 记录执行完成
      this.emit('execution:completed', {
        executionId,
        executableName: executable.name,
        executableType: executable.type,
        timestamp: new Date(),
        data: { success: result.success, duration: enrichedResult.metadata.duration },
      } as ExecutionEvent);
      
      if (this.config.enableTracing) {
        this.tracer.endTrace(executionId, enrichedResult);
      }
      
      return enrichedResult;
      
    } catch (error) {
      const errorResult = this.createErrorResult(
        executionId,
        executable,
        'EXECUTION_ERROR',
        (error as Error).message,
        startTime,
        error as Error
      ) as ExecutionResult<T>;
      
      this.emit('execution:failed', {
        executionId,
        executableName: executable.name,
        executableType: executable.type,
        timestamp: new Date(),
        data: { error: (error as Error).message },
      } as ExecutionEvent);
      
      if (this.config.enableTracing) {
        this.tracer.endTrace(executionId, errorResult);
      }
      
      return errorResult;
    } finally {
      clearTimeout(timeoutId);
      this.activeExecutions.delete(executionId);
      
      if (this.config.enableResourceMonitor) {
        this.resourceMonitor.stopMonitoring(executionId);
      }
      
      this.executionCount++;
    }
  }

  /**
   * 批量执行
   */
  async executeBatch(
    executions: Array<{
      executable: Executable;
      input: unknown;
      options?: Parameters<ExecutionEngine['execute']>[2];
    }>,
    options: {
      concurrency?: number;
      stopOnError?: boolean;
    } = {}
  ): Promise<ExecutionResult[]> {
    const { concurrency = 5, stopOnError = false } = options;
    const results: ExecutionResult[] = [];
    
    // 分批执行
    for (let i = 0; i < executions.length; i += concurrency) {
      const batch = executions.slice(i, i + concurrency);
      
      const batchPromises = batch.map(({ executable, input, options }) =>
        this.execute(executable, input, options)
      );
      
      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
      
      // 如果设置了stopOnError且有错误，停止后续执行
      if (stopOnError && batchResults.some(r => !r.success)) {
        break;
      }
    }
    
    return results;
  }

  /**
   * 取消执行
   */
  cancel(executionId: string): boolean {
    const controller = this.activeExecutions.get(executionId);
    if (controller) {
      controller.abort(new Error('Execution cancelled by user'));
      this.activeExecutions.delete(executionId);
      return true;
    }
    return false;
  }

  /**
   * 获取执行追踪
   */
  getExecutionTrace(executionId: string): unknown | undefined {
    return this.tracer.getTrace(executionId);
  }

  /**
   * 获取所有追踪
   */
  getAllTraces(): unknown[] {
    return this.tracer.getAllTraces();
  }

  /**
   * 获取执行统计
   */
  getStats(): {
    totalExecutions: number;
    activeExecutions: number;
    successRate: number;
    averageDuration: number;
  } {
    return {
      totalExecutions: this.executionCount,
      activeExecutions: this.activeExecutions.size,
      successRate: this.tracer.getSuccessRate(),
      averageDuration: this.tracer.getAverageDuration(),
    };
  }

  /**
   * 清空追踪记录
   */
  clearTraces(): void {
    this.tracer.clear();
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  /**
   * 路由执行到对应执行器
   */
  private async routeExecution<T>(
    executable: Executable,
    input: unknown,
    context: ExecutionContext
  ): Promise<ExecutionResult<T>> {
    switch (executable.type) {
      case 'skill':
        return this.scriptExecutor.execute(executable as import('./index').ScriptExecutable, input, context) as Promise<ExecutionResult<T>>;
      
      case 'tool':
        // Tool execution is handled by the executable itself
        return executable.execute(input, context) as Promise<ExecutionResult<T>>;
      
      case 'mcp':
        return this.mcpExecutor.execute(executable as import('./index').MCPExecutable, input, context) as Promise<ExecutionResult<T>>;
      
      case 'plugin':
        return this.pluginExecutor.execute(executable as import('./index').PluginExecutable, input, context) as Promise<ExecutionResult<T>>;
      
      default:
        // 如果executable自身有execute方法，直接调用
        if (typeof executable.execute === 'function') {
          return executable.execute(input, context) as Promise<ExecutionResult<T>>;
        }
        
        throw new Error(`Unknown executable type: ${executable.type}`);
    }
  }

  /**
   * 构建执行上下文
   */
  private async buildExecutionContext(
    executionId: string,
    executable: Executable,
    options: Parameters<ExecutionEngine['execute']>[2],
    abortSignal: AbortSignal
  ): Promise<ExecutionContext> {
    const startTime = new Date();
    
    return {
      executionId,
      parentExecutionId: options?.parentExecutionId,
      sessionId: options?.sessionId || this.generateSessionId(),
      agent: this,
      executableName: executable.name,
      executableType: executable.type,
      startTime,
      abortSignal,
      logger: this.createExecutionLogger(executionId, executable.name),
      llm: this.llmService,
      memory: this.memoryService,
      tools: this.toolRegistry,
      mcp: this.mcpClient,
      plugins: this.pluginManager,
      limits: { ...this.config.defaultLimits, ...options?.limits },
      metadata: options?.context,
    };
  }

  /**
   * 创建执行日志记录器
   */
  private createExecutionLogger(executionId: string, executableName: string): ExecutionLogger {
    const childLogger = this.logger.child({ executionId, executableName });
    
    const logger: import('../utils/logger').ILogger = {
      debug: (message: string, meta?: Record<string, unknown>) => {
        childLogger.debug(message, meta);
      },
      info: (message: string, meta?: Record<string, unknown>) => {
        childLogger.info(message, meta);
      },
      warn: (message: string, meta?: Record<string, unknown>) => {
        childLogger.warn(message, meta);
      },
      error: (message: string, meta?: Record<string, unknown>, _error?: Error) => {
        childLogger.error(message, meta, _error);
      },
    };
    return logger;
  }

  /**
   * 创建错误结果
   */
  private createErrorResult(
    executionId: string,
    executable: Executable,
    code: string,
    message: string,
    startTime: Date,
    error?: Error
  ): ExecutionResult {
    return {
      success: false,
      error: {
        code,
        message,
        recoverable: false,
        stack: error?.stack,
        details: error,
      },
      metadata: {
        executionId,
        executableName: executable.name,
        executableType: executable.type,
        startTime,
        endTime: new Date(),
        duration: Date.now() - startTime.getTime(),
      },
    };
  }

  /**
   * 生成执行ID
   */
  private generateExecutionId(): string {
    return `exec-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 生成会话ID
   */
  private generateSessionId(): string {
    return `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 创建默认LLM服务（占位符）
   */
  private createDefaultLLMService(): LLMService {
    return {
      complete: async () => ({ content: '' }),
      completeStream: async function* () {
        yield { content: '', isComplete: true };
      },
    };
  }

  /**
   * 创建默认内存服务（占位符）
   */
  private createDefaultMemoryService(): MemoryService {
    const store = new Map<string, unknown>();
    return {
      get: async <T>(key: string) => store.get(key) as T,
      set: async <T>(key: string, value: T) => {
        store.set(key, value);
      },
      delete: async (key: string) => {
        store.delete(key);
      },
      search: async () => [],
    };
  }

  /**
   * 创建默认工具注册表（占位符）
   */
  private createDefaultToolRegistry(): ToolRegistry {
    const tools = new Map<string, Executable>();
    return {
      get: (name: string) => tools.get(name),
      register: (tool: Executable) => {
        tools.set(tool.name, tool);
      },
      unregister: (name: string) => tools.delete(name),
      list: () => Array.from(tools.values()),
      execute: async (name: string, input: unknown, context: ExecutionContext) => {
        const tool = tools.get(name);
        if (!tool) {
          return {
            success: false,
            error: {
              code: 'TOOL_NOT_FOUND',
              message: `Tool '${name}' not found`,
              recoverable: false,
            },
            metadata: {
              executionId: context.executionId,
              executableName: name,
              executableType: 'tool',
              startTime: new Date(),
              endTime: new Date(),
              duration: 0,
            },
          };
        }
        return tool.execute(input, context);
      },
    };
  }
}

export default ExecutionEngine;
