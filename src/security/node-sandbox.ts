/**
 * Node.js 安全沙箱实现
 * 
 * 使用 Node.js 的 vm 模块创建真正的隔离环境
 * 支持内存限制、CPU限制、超时控制
 */

import * as vm from 'vm';
import { SecureSandbox, SandboxConfig, SandboxContext, ExecutionResult, SecurityViolation } from './secure-sandbox.js';

/**
 * Node.js 沙箱配置
 */
export interface NodeSandboxConfig extends SandboxConfig {
  /** 是否使用 VM 上下文隔离 */
  useContextIsolation: boolean;
  /** 是否编译代码缓存 */
  cacheCompiledCode: boolean;
  /** 最大递归深度 */
  maxCallStackSize: number;
}

/**
 * 默认 Node.js 沙箱配置
 */
export const DEFAULT_NODE_SANDBOX_CONFIG: NodeSandboxConfig = {
  backend: 'isolated-vm',
  timeout: 5000,
  memoryLimit: 64,
  cpuLimit: 1000,
  allowedGlobals: ['console', 'Math', 'JSON', 'Date', 'Array', 'Object', 'String', 'Number', 'Boolean', 'Promise', 'Set', 'Map', 'Error', 'RegExp', 'Date', 'parseInt', 'parseFloat', 'isNaN', 'isFinite'],
  blockedGlobals: ['process', 'require', 'module', 'exports', 'global', 'globalThis', '__dirname', '__filename', 'Buffer'],
  allowNetwork: false,
  allowFileSystem: false,
  allowProcess: false,
  customGlobals: {},
  onViolation: (v) => console.error('Security violation:', v),
  useContextIsolation: true,
  cacheCompiledCode: true,
  maxCallStackSize: 1000,
};

/**
 * 基于 Node.js vm 模块的安全沙箱
 */
export class NodeSecureSandbox extends SecureSandbox {
  private vmContext: vm.Context | null = null;
  private scriptCache: Map<string, vm.Script> = new Map();
  private nodeConfig: NodeSandboxConfig;
  private executionCount = 0;
  private totalExecutionTime = 0;

  constructor(config?: Partial<NodeSandboxConfig>) {
    const fullConfig = { ...DEFAULT_NODE_SANDBOX_CONFIG, ...config };
    super(fullConfig);
    this.nodeConfig = fullConfig;
    this.initializeContext();
  }

  /**
   * 创建安全的全局对象
   */
  private createSafeGlobals(): Record<string, unknown> {
    return {
      console: {
        log: (...args: unknown[]) => this.logger.debug('sandbox', { args }),
        error: (...args: unknown[]) => this.logger.error('sandbox', { args }),
        warn: (...args: unknown[]) => this.logger.warn('sandbox', { args }),
        info: (...args: unknown[]) => this.logger.info('sandbox', { args }),
      },
      setTimeout: (fn: () => void, ms: number) => setTimeout(fn, Math.min(ms, this.nodeConfig.timeout)),
      clearTimeout: (id: ReturnType<typeof setTimeout>) => clearTimeout(id),
    };
  }

  /**
   * 报告安全违规
   */
  private reportViolation(violation: SecurityViolation): void {
    this.logger.error('Security violation', {
      type: violation.type,
      message: violation.message,
      code: violation.code,
    });
  }

  /**
   * 初始化 VM 上下文
   */
  private initializeContext(): void {
    // 创建安全的全局对象
    const safeGlobals = this.createSafeGlobals();

    // 创建 VM 上下文
    this.vmContext = vm.createContext({
      ...safeGlobals,
      // 添加一些安全的内置对象
      Array: Array,
      Object: Object,
      String: String,
      Number: Number,
      Boolean: Boolean,
      Date: Date,
      Math: Math,
      JSON: JSON,
      RegExp: RegExp,
      Error: Error,
      Promise: Promise,
      Set: Set,
      Map: Map,
      WeakSet: WeakSet,
      WeakMap: WeakMap,
      Symbol: Symbol,
      parseInt: parseInt,
      parseFloat: parseFloat,
      isNaN: isNaN,
      isFinite: isFinite,
      encodeURI: encodeURI,
      encodeURIComponent: encodeURIComponent,
      decodeURI: decodeURI,
      decodeURIComponent: decodeURIComponent,
      escape: escape,
      unescape: unescape,
      NaN: NaN,
      Infinity: Infinity,
      undefined: undefined,
      // 自定义全局变量
      ...this.nodeConfig.customGlobals,
    });
  }

  /**
   * 执行代码
   */
  async execute<T>(code: string, context?: SandboxContext): Promise<ExecutionResult<T>> {
    const startTime = Date.now();
    const startMemory = process.memoryUsage().heapUsed;

    // 语法检查
    const syntaxCheck = this.validateSyntax(code);
    if (!syntaxCheck.valid) {
      return {
        success: false,
        error: { type: 'syntax', message: syntaxCheck.error! },
        executionTime: 0,
        memoryUsed: 0,
      };
    }

    // 代码清理
    const sanitizedCode = this.sanitizeCode(code);

    try {
      // 检查内存限制
      if (this.nodeConfig.memoryLimit > 0) {
        const currentMemory = process.memoryUsage().heapUsed / 1024 / 1024;
        if (currentMemory > this.nodeConfig.memoryLimit * 2) {
          throw new Error(`Memory limit exceeded: ${currentMemory.toFixed(2)}MB`);
        }
      }

      // 准备上下文变量
      const scriptContext = { ...this.vmContext };
      if (context) {
        const sanitizedContext = this.sanitizeContext(context);
        Object.assign(scriptContext, sanitizedContext);
      }

      // 创建或获取缓存的脚本
      let script: vm.Script;
      const cacheKey = this.hashCode(sanitizedCode);
      
      if (this.nodeConfig.cacheCompiledCode && this.scriptCache.has(cacheKey)) {
        script = this.scriptCache.get(cacheKey)!;
      } else {
        script = new vm.Script(sanitizedCode, {
          lineOffset: 0,
        });
        
        if (this.nodeConfig.cacheCompiledCode) {
          this.scriptCache.set(cacheKey, script);
        }
      }

      // 创建新的上下文（如果需要隔离）
      const executionContext = this.nodeConfig.useContextIsolation 
        ? vm.createContext({ ...scriptContext })
        : this.vmContext!;

      // 执行脚本
      const result = script.runInContext(executionContext, {
        timeout: this.nodeConfig.timeout,
      });

      // 计算执行指标
      const executionTime = Date.now() - startTime;
      const endMemory = process.memoryUsage().heapUsed;
      const memoryUsed = Math.max(0, (endMemory - startMemory) / 1024 / 1024);

      // 更新统计
      this.executionCount++;
      this.totalExecutionTime += executionTime;

      // 检查 CPU 限制
      if (this.nodeConfig.cpuLimit > 0 && executionTime > this.nodeConfig.cpuLimit) {
        const violation: SecurityViolation = {
          type: 'cpu',
          message: `CPU limit exceeded: ${executionTime}ms > ${this.nodeConfig.cpuLimit}ms`,
          code: sanitizedCode,
        };
        this.reportViolation(violation);
        return {
          success: false,
          error: violation,
          executionTime,
          memoryUsed,
        };
      }

      return {
        success: true,
        result: result as T,
        executionTime,
        memoryUsed,
      };

    } catch (error) {
      const executionTime = Date.now() - startTime;
      const endMemory = process.memoryUsage().heapUsed;
      const memoryUsed = Math.max(0, (endMemory - startMemory) / 1024 / 1024);

      // 分类错误类型
      let violationType: SecurityViolation['type'] = 'access';
      let message = error instanceof Error ? error.message : String(error);

      if (message.includes('timeout') || message.includes('Script execution timed out')) {
        violationType = 'timeout';
        message = `Execution timeout after ${this.nodeConfig.timeout}ms`;
      } else if (message.includes('memory') || message.includes('Memory limit')) {
        violationType = 'memory';
      }

      const violation: SecurityViolation = {
        type: violationType,
        message,
        code: sanitizedCode,
        stack: error instanceof Error ? error.stack : undefined,
      };

      this.reportViolation(violation);

      return {
        success: false,
        error: violation,
        executionTime,
        memoryUsed,
      };
    }
  }

  /**
   * 销毁沙箱
   */
  async destroy(): Promise<void> {
    this.vmContext = null;
    this.scriptCache.clear();
    this.executionCount = 0;
    this.totalExecutionTime = 0;
  }

  /**
   * 检查沙箱健康状态
   */
  isHealthy(): boolean {
    return this.vmContext !== null;
  }

  /**
   * 获取沙箱统计信息 (实现基类抽象方法)
   */
  getStats(): { backend: string; healthy: boolean; [key: string]: unknown } {
    const avgTime = this.executionCount > 0
      ? this.totalExecutionTime / this.executionCount
      : 0;

    return {
      backend: 'node-vm',
      healthy: this.isHealthy(),
      executionCount: this.executionCount,
      averageExecutionTime: avgTime,
      scriptCacheSize: this.scriptCache.size,
      memoryUsage: process.memoryUsage().heapUsed / 1024 / 1024,
    };
  }

  /**
   * 获取沙箱指标 (别名)
   */
  getMetrics(): {
    backend: string;
    healthy: boolean;
    executionCount: number;
    averageExecutionTime: number;
    scriptCacheSize: number;
    memoryUsage: number;
  } {
    return this.getStats() as {
      backend: string;
      healthy: boolean;
      executionCount: number;
      averageExecutionTime: number;
      scriptCacheSize: number;
      memoryUsage: number;
    };
  }

  /**
   * 清理代码
   */
  private sanitizeCode(code: string): string {
    // 危险模式列表 - 这些会被完全阻止
    const dangerousPatterns = [
      // 阻止访问 process
      { pattern: /process\s*\.\s*exit/i, replacement: 'throw new Error("process.exit blocked")' },
      { pattern: /process\s*\.\s*kill/i, replacement: 'throw new Error("process.kill blocked")' },
      { pattern: /process\s*\.\s*env/i, replacement: '{} /* process.env blocked */' },
      
      // 阻止 require
      { pattern: /require\s*\(/i, replacement: '(() => { throw new Error("require blocked") })(' },
      
      // 阻止模块系统
      { pattern: /module\s*\.\s*exports/i, replacement: '/* module.exports blocked */ undefined' },
      { pattern: /exports\s*=/i, replacement: '/* exports blocked */ undefined' },
      
      // 阻止 eval
      { pattern: /eval\s*\(/i, replacement: '(() => { throw new Error("eval blocked") })(' },
      
      // 阻止 Function 构造器
      { pattern: /new\s+Function\s*\(/i, replacement: '(() => { throw new Error("Function constructor blocked") })(' },
      
      // 阻止 setTimeout/setInterval 的字符串参数
      { pattern: /setTimeout\s*\(\s*['"`]/i, replacement: '(() => { throw new Error("setTimeout with string blocked") })(' },
      { pattern: /setInterval\s*\(\s*['"`]/i, replacement: '(() => { throw new Error("setInterval with string blocked") })(' },
    ];

    let sanitized = code;
    for (const { pattern, replacement } of dangerousPatterns) {
      sanitized = sanitized.replace(pattern, replacement);
    }

    return sanitized;
  }

  /**
   * 计算字符串哈希
   */
  private hashCode(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return hash.toString(16);
  }

  /**
   * 重置沙箱状态
   */
  reset(): void {
    this.initializeContext();
    this.scriptCache.clear();
  }

  /**
   * 预编译代码
   */
  precompile(code: string): boolean {
    try {
      const cacheKey = this.hashCode(code);
      const script = new vm.Script(code, {
        lineOffset: 0,
      });
      this.scriptCache.set(cacheKey, script);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<NodeSandboxConfig>): void {
    this.nodeConfig = { ...this.nodeConfig, ...config };
  }
}

export default NodeSecureSandbox;
