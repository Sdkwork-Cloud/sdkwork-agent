/**
 * Secure JavaScript Sandbox - Node.js 专用版本
 *
 * 提供隔离的 JavaScript 代码执行环境
 * 专为 Node.js 服务端环境设计，使用 isolated-vm 或 vm2
 *
 * @security Sandbox
 * @version 3.0.0
 * @architecture Node.js Native Only
 */

import { Logger, createLogger } from '../utils/logger.js';

// ============================================
// Types
// ============================================

export interface SandboxConfig {
  backend: 'isolated-vm' | 'vm2';
  timeout: number;
  memoryLimit: number; // MB
  cpuLimit: number; // ms
  allowedGlobals: string[];
  blockedGlobals: string[];
  allowNetwork: boolean;
  allowFileSystem: boolean;
  allowProcess: boolean;
  customGlobals: Record<string, unknown>;
  onViolation: (violation: SecurityViolation) => void;
}

export interface SecurityViolation {
  type: 'timeout' | 'memory' | 'cpu' | 'access' | 'syntax';
  message: string;
  code?: string;
  stack?: string;
}

export interface ExecutionResult<T = unknown> {
  success: boolean;
  result?: T;
  error?: SecurityViolation;
  executionTime: number;
  memoryUsed: number;
}

export interface SandboxContext {
  [key: string]: unknown;
}

// ============================================
// Default Configuration
// ============================================

export const DEFAULT_SANDBOX_CONFIG: SandboxConfig = {
  backend: 'isolated-vm',
  timeout: 300000, // 增加到 5 分钟，支持长时间 LLM 调用
  memoryLimit: 512, // 增加到 512MB
  cpuLimit: 600000, // 增加到 10 分钟，支持复杂操作
  allowedGlobals: ['console', 'Math', 'JSON', 'Date', 'Array', 'Object', 'String', 'Number', 'Boolean', 'Promise', 'Set', 'Map', 'Error', 'RegExp', 'Symbol', 'BigInt', 'Proxy', 'Reflect'],
  blockedGlobals: ['process', 'require', 'module', 'exports', 'global', 'globalThis', 'window', 'document', 'eval', 'Function'],
  allowNetwork: false,
  allowFileSystem: false,
  allowProcess: false,
  customGlobals: {},
  onViolation: (violation) => {
    // 只记录严重违规，减少噪音
    if (violation.type === 'memory' || violation.type === 'cpu') {
      console.warn('[Sandbox] Resource limit warning:', violation.type, violation.message);
    } else {
      console.error('[Sandbox] Security violation:', violation.type, violation.message);
    }
  },
};

// ============================================
// Abstract Sandbox
// ============================================

export abstract class SecureSandbox {
  protected config: SandboxConfig;
  protected logger: Logger;

  constructor(config?: Partial<SandboxConfig>) {
    this.config = { ...DEFAULT_SANDBOX_CONFIG, ...config };
    this.logger = createLogger({ name: 'SecureSandbox' });
  }

  abstract execute<T>(code: string, context?: SandboxContext): Promise<ExecutionResult<T>>;
  abstract destroy(): Promise<void>;
  abstract getStats(): { backend: string; healthy: boolean; [key: string]: unknown };

  /**
   * Validate JavaScript syntax
   */
  protected validateSyntax(code: string): { valid: boolean; error?: string } {
    try {
      // Use Function constructor to validate syntax without executing
      new Function(code);
      return { valid: true };
    } catch (error) {
      return {
        valid: false,
        error: error instanceof Error ? error.message : 'Syntax error',
      };
    }
  }

  /**
   * Sanitize context to prevent prototype pollution
   */
  protected sanitizeContext(context: SandboxContext): SandboxContext {
    const sanitized: SandboxContext = {};

    for (const [key, value] of Object.entries(context)) {
      // Skip prototype pollution attempts
      if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
        continue;
      }
      sanitized[key] = value;
    }

    return sanitized;
  }

  /**
   * Check if sandbox is healthy
   */
  isHealthy(): boolean {
    return true;
  }
}

// ============================================
// Sandbox Factory
// ============================================

export class SandboxFactory {
  /**
   * Create appropriate sandbox for Node.js environment
   */
  static create(config?: Partial<SandboxConfig>): SecureSandbox {
    const backend = config?.backend || 'isolated-vm';

    switch (backend) {
      case 'isolated-vm':
      case 'vm2':
        // Use the NodeSecureSandbox implementation
        const { NodeSecureSandbox } = require('./node-sandbox.js');
        return new NodeSecureSandbox(config);
      default:
        throw new Error(`Unknown sandbox backend: ${backend}. Node.js only supports 'isolated-vm' or 'vm2'`);
    }
  }

  /**
   * Create sandbox pool for high-throughput scenarios
   */
  static createPool(size: number, config?: Partial<SandboxConfig>): SandboxPool {
    return new SandboxPool(size, config);
  }
}

// ============================================
// Sandbox Pool
// ============================================

export class SandboxPool {
  private sandboxes: SecureSandbox[] = [];
  private available: SecureSandbox[] = [];
  private waiting: Array<(sandbox: SecureSandbox) => void> = [];

  constructor(
    private size: number,
    private config?: Partial<SandboxConfig>
  ) {
    this.initialize();
  }

  private initialize(): void {
    for (let i = 0; i < this.size; i++) {
      const sandbox = SandboxFactory.create(this.config);
      this.sandboxes.push(sandbox);
      this.available.push(sandbox);
    }
  }

  /**
   * Acquire a sandbox from the pool
   */
  async acquire(): Promise<SecureSandbox> {
    if (this.available.length > 0) {
      return this.available.pop()!;
    }

    // Wait for an available sandbox
    return new Promise((resolve) => {
      this.waiting.push(resolve);
    });
  }

  /**
   * Release a sandbox back to the pool
   */
  release(sandbox: SecureSandbox): void {
    if (this.waiting.length > 0) {
      const resolve = this.waiting.shift()!;
      resolve(sandbox);
    } else {
      this.available.push(sandbox);
    }
  }

  /**
   * Execute code using a sandbox from the pool
   */
  async execute<T>(code: string, context?: SandboxContext): Promise<ExecutionResult<T>> {
    const sandbox = await this.acquire();
    try {
      const result = await sandbox.execute<T>(code, context);
      return result;
    } finally {
      this.release(sandbox);
    }
  }

  /**
   * Destroy all sandboxes in the pool
   */
  async destroy(): Promise<void> {
    await Promise.all(this.sandboxes.map(s => s.destroy()));
    this.sandboxes = [];
    this.available = [];
  }

  /**
   * Get pool statistics
   */
  getStats(): { total: number; available: number; waiting: number } {
    return {
      total: this.sandboxes.length,
      available: this.available.length,
      waiting: this.waiting.length,
    };
  }
}

// ============================================
// Exports
// ============================================

export { NodeSecureSandbox } from './node-sandbox.js';
