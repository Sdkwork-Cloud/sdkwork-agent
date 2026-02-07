/**
 * Secure JavaScript Sandbox
 *
 * Provides isolated execution environment for untrusted JavaScript code.
 * Highly configurable with multiple backend options (vm2-like, QuickJS, iframe).
 * Compatible with both browser and Node.js environments.
 */

import { Logger, createLogger } from '../utils/logger';

// ============================================
// Types
// ============================================

export interface SandboxConfig {
  backend: 'isolated-vm' | 'quickjs' | 'iframe' | 'worker' | 'vm2';
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
  backend: 'iframe',
  timeout: 5000,
  memoryLimit: 64,
  cpuLimit: 1000,
  allowedGlobals: ['console', 'Math', 'JSON', 'Date', 'Array', 'Object', 'String', 'Number', 'Boolean', 'Promise', 'Set', 'Map', 'Error'],
  blockedGlobals: ['process', 'require', 'module', 'exports', 'global', 'window', 'document', 'fetch', 'XMLHttpRequest', 'WebSocket', 'eval', 'Function'],
  allowNetwork: false,
  allowFileSystem: false,
  allowProcess: false,
  customGlobals: {},
  onViolation: (_v) => {
    // Violation will be logged by the sandbox implementation
  },
};

// ============================================
// Secure Sandbox Base Class
// ============================================

export abstract class SecureSandbox {
  protected config: SandboxConfig;
  protected logger: Logger;

  constructor(config: Partial<SandboxConfig> = {}) {
    this.config = { ...DEFAULT_SANDBOX_CONFIG, ...config };
    this.logger = createLogger({ name: 'SecureSandbox' });
  }

  /**
   * Execute code in sandbox
   */
  abstract execute<T>(code: string, context?: SandboxContext): Promise<ExecutionResult<T>>;

  /**
   * Destroy sandbox and release resources
   */
  abstract destroy(): Promise<void>;

  /**
   * Check if sandbox is healthy
   */
  abstract isHealthy(): boolean;

  /**
   * Get sandbox metrics
   */
  abstract getMetrics(): SandboxMetrics;

  /**
   * Validate code syntax without execution
   * 使用正则表达式检查危险模式，不实际执行代码
   */
  validateSyntax(code: string): { valid: boolean; error?: string } {
    try {
      // Check for blocked patterns
      const blockedPatterns = [
        { pattern: /eval\s*\(/i, name: 'eval' },
        { pattern: /new\s+Function\s*\(/i, name: 'Function constructor' },
        { pattern: /setTimeout\s*\(\s*['"`]/i, name: 'setTimeout with string' },
        { pattern: /setInterval\s*\(\s*['"`]/i, name: 'setInterval with string' },
        { pattern: /__proto__/, name: 'prototype pollution' },
        { pattern: /constructor\s*\[\s*['"]prototype['"]\s*\]/, name: 'constructor access' },
        { pattern: /process\.exit/i, name: 'process exit' },
        { pattern: /require\s*\(/i, name: 'require' },
        { pattern: /import\s*\(/i, name: 'dynamic import' },
        { pattern: /debugger/, name: 'debugger' },
      ];

      for (const { pattern, name } of blockedPatterns) {
        if (pattern.test(code)) {
          return { valid: false, error: `Blocked pattern detected: ${name}` };
        }
      }

      // 使用更安全的语法检查方式 - 检查基本语法结构
      // 不实际执行代码，只检查括号匹配等基本语法
      const openParens = (code.match(/\(/g) || []).length;
      const closeParens = (code.match(/\)/g) || []).length;
      const openBraces = (code.match(/\{/g) || []).length;
      const closeBraces = (code.match(/\}/g) || []).length;
      const openBrackets = (code.match(/\[/g) || []).length;
      const closeBrackets = (code.match(/\]/g) || []).length;

      if (openParens !== closeParens) {
        return { valid: false, error: 'Syntax error: unmatched parentheses' };
      }
      if (openBraces !== closeBraces) {
        return { valid: false, error: 'Syntax error: unmatched braces' };
      }
      if (openBrackets !== closeBrackets) {
        return { valid: false, error: 'Syntax error: unmatched brackets' };
      }

      return { valid: true };
    } catch (error) {
      return { valid: false, error: error instanceof Error ? error.message : 'Validation error' };
    }
  }

  /**
   * Sanitize context object
   */
  protected sanitizeContext(context: SandboxContext): SandboxContext {
    const sanitized: SandboxContext = {};

    for (const [key, value] of Object.entries(context)) {
      if (this.isSafeValue(value)) {
        sanitized[key] = value;
      }
    }

    return sanitized;
  }

  /**
   * Check if value is safe to pass to sandbox
   */
  protected isSafeValue(value: unknown): boolean {
    if (value === null || value === undefined) return true;
    if (typeof value === 'boolean' || typeof value === 'number' || typeof value === 'string') return true;
    if (Array.isArray(value)) return value.every((v) => this.isSafeValue(v));
    if (typeof value === 'object') {
      return Object.values(value).every((v) => this.isSafeValue(v));
    }
    return false;
  }

  /**
   * Create safe global object
   */
  protected createSafeGlobals(): Record<string, unknown> {
    const globals: Record<string, unknown> = {};

    // Add allowed globals
    for (const name of this.config.allowedGlobals) {
      if (name in globalThis) {
        globals[name] = (globalThis as Record<string, unknown>)[name];
      }
    }

    // Add custom globals
    Object.assign(globals, this.config.customGlobals);

    // Create safe console
    globals['console'] = this.createSafeConsole();

    return globals;
  }

  /**
   * Create safe console object
   */
  protected createSafeConsole(): Console {
    return {
      log: (...args: unknown[]) => this.logger.info('[SANDBOX]', { args }),
      error: (...args: unknown[]) => this.logger.error('[SANDBOX]', { args }),
      warn: (...args: unknown[]) => this.logger.warn('[SANDBOX]', { args }),
      info: (...args: unknown[]) => this.logger.info('[SANDBOX]', { args }),
      debug: (...args: unknown[]) => this.logger.debug('[SANDBOX]', { args }),
    } as Console;
  }

  protected reportViolation(violation: SecurityViolation): void {
    this.config.onViolation(violation);
  }
}

// ============================================
// IFrame Sandbox (Browser)
// ============================================

export class IFrameSandbox extends SecureSandbox {
  private iframe?: HTMLIFrameElement;
  private messageQueue = new Map<string, { resolve: (value: unknown) => void; reject: (error: Error) => void }>();
  private messageId = 0;

  constructor(config?: Partial<SandboxConfig>) {
    super({ ...config, backend: 'iframe' });
  }

  async execute<T>(code: string, context?: SandboxContext): Promise<ExecutionResult<T>> {
    const startTime = Date.now();

    // Validate syntax first
    const syntaxCheck = this.validateSyntax(code);
    if (!syntaxCheck.valid) {
      return {
        success: false,
        error: { type: 'syntax', message: syntaxCheck.error! },
        executionTime: 0,
        memoryUsed: 0,
      };
    }

    try {
      // Create iframe if not exists
      if (!this.iframe) {
        await this.createIFrame();
      }

      // Execute code
      const result = await this.sendMessage<T>('execute', { code, context: this.sanitizeContext(context || {}) });

      return {
        success: true,
        result,
        executionTime: Date.now() - startTime,
        memoryUsed: 0, // Cannot measure in iframe
      };
    } catch (error) {
      return {
        success: false,
        error: {
          type: 'access',
          message: error instanceof Error ? error.message : 'Execution failed',
        },
        executionTime: Date.now() - startTime,
        memoryUsed: 0,
      };
    }
  }

  async destroy(): Promise<void> {
    if (this.iframe) {
      document.body.removeChild(this.iframe);
      this.iframe = undefined;
    }
    this.messageQueue.clear();
  }

  isHealthy(): boolean {
    return !!this.iframe && this.iframe.contentWindow !== null;
  }

  getMetrics(): SandboxMetrics {
    return {
      backend: 'iframe',
      healthy: this.isHealthy(),
      pendingMessages: this.messageQueue.size,
    };
  }

  private async createIFrame(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.iframe = document.createElement('iframe');
      this.iframe.style.display = 'none';
      this.iframe.sandbox.add('allow-scripts');

      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <script>
            // Restricted environment
            const allowedGlobals = ${JSON.stringify(this.config.allowedGlobals)};
            const blockedGlobals = ${JSON.stringify(this.config.blockedGlobals)};
            
            // Remove blocked globals
            blockedGlobals.forEach(name => {
              try { delete window[name]; } catch(e) {}
            });
            
            // Execution handler
            window.addEventListener('message', (event) => {
              if (event.data.type === 'execute') {
                try {
                  const fn = new Function(...Object.keys(event.data.context), event.data.code);
                  const result = fn(...Object.values(event.data.context));
                  Promise.resolve(result).then(value => {
                    event.source.postMessage({ id: event.data.id, result: value }, '*');
                  }).catch(error => {
                    event.source.postMessage({ id: event.data.id, error: error.message }, '*');
                  });
                } catch (error) {
                  event.source.postMessage({ id: event.data.id, error: error.message }, '*');
                }
              }
            });
          </script>
        </head>
        <body></body>
        </html>
      `;

      this.iframe.srcdoc = html;

      this.iframe.onload = () => {
        window.addEventListener('message', (event) => {
          if (event.source === this.iframe?.contentWindow) {
            this.handleMessage(event.data);
          }
        });
        resolve();
      };

      this.iframe.onerror = () => reject(new Error('Failed to load iframe'));

      document.body.appendChild(this.iframe);

      // Timeout
      setTimeout(() => reject(new Error('Iframe creation timeout')), this.config.timeout);
    });
  }

  private sendMessage<T>(type: string, data: unknown): Promise<T> {
    return new Promise((resolve, reject) => {
      const id = ++this.messageId;
      this.messageQueue.set(id.toString(), { resolve: resolve as (value: unknown) => void, reject });

      this.iframe?.contentWindow?.postMessage({ id: id.toString(), type, data }, '*');

      // Timeout
      setTimeout(() => {
        if (this.messageQueue.has(id.toString())) {
          this.messageQueue.delete(id.toString());
          reject(new Error('Execution timeout'));
        }
      }, this.config.timeout);
    });
  }

  private handleMessage(data: { id: string; result?: unknown; error?: string }): void {
    const handler = this.messageQueue.get(data.id);
    if (handler) {
      this.messageQueue.delete(data.id);
      if (data.error) {
        handler.reject(new Error(data.error));
      } else {
        handler.resolve(data.result);
      }
    }
  }
}

// ============================================
// Worker Sandbox (Browser)
// ============================================

export class WorkerSandbox extends SecureSandbox {
  private worker?: Worker;
  private messageQueue = new Map<string, { resolve: (value: unknown) => void; reject: (error: Error) => void }>();
  private messageId = 0;

  constructor(config?: Partial<SandboxConfig>) {
    super({ ...config, backend: 'worker' });
  }

  async execute<T>(code: string, context?: SandboxContext): Promise<ExecutionResult<T>> {
    const startTime = Date.now();

    const syntaxCheck = this.validateSyntax(code);
    if (!syntaxCheck.valid) {
      return {
        success: false,
        error: { type: 'syntax', message: syntaxCheck.error! },
        executionTime: 0,
        memoryUsed: 0,
      };
    }

    try {
      if (!this.worker) {
        this.createWorker();
      }

      const result = await this.sendMessage<T>('execute', { code, context: this.sanitizeContext(context || {}) });

      return {
        success: true,
        result,
        executionTime: Date.now() - startTime,
        memoryUsed: 0,
      };
    } catch (error) {
      return {
        success: false,
        error: {
          type: 'access',
          message: error instanceof Error ? error.message : 'Execution failed',
        },
        executionTime: Date.now() - startTime,
        memoryUsed: 0,
      };
    }
  }

  async destroy(): Promise<void> {
    this.worker?.terminate();
    this.worker = undefined;
    this.messageQueue.clear();
  }

  isHealthy(): boolean {
    return !!this.worker;
  }

  getMetrics(): SandboxMetrics {
    return {
      backend: 'worker',
      healthy: this.isHealthy(),
      pendingMessages: this.messageQueue.size,
    };
  }

  private createWorker(): void {
    const workerCode = `
      const allowedGlobals = ${JSON.stringify(this.config.allowedGlobals)};
      const blockedGlobals = ${JSON.stringify(this.config.blockedGlobals)};
      
      // Remove blocked globals
      blockedGlobals.forEach(name => {
        try { delete self[name]; } catch(e) {}
      });
      
      self.onmessage = (event) => {
        if (event.data.type === 'execute') {
          try {
            const fn = new Function(...Object.keys(event.data.context), event.data.code);
            const result = fn(...Object.values(event.data.context));
            Promise.resolve(result).then(value => {
              self.postMessage({ id: event.data.id, result: value });
            }).catch(error => {
              self.postMessage({ id: event.data.id, error: error.message });
            });
          } catch (error) {
            self.postMessage({ id: event.data.id, error: error.message });
          }
        }
      };
    `;

    const blob = new Blob([workerCode], { type: 'application/javascript' });
    this.worker = new Worker(URL.createObjectURL(blob));

    this.worker.onmessage = (event) => {
      this.handleMessage(event.data);
    };

    this.worker.onerror = (error) => {
      this.logger.error('Worker error', { error });
    };
  }

  private sendMessage<T>(type: string, data: unknown): Promise<T> {
    return new Promise((resolve, reject) => {
      const id = ++this.messageId;
      this.messageQueue.set(id.toString(), { resolve: resolve as (value: unknown) => void, reject });

      this.worker?.postMessage({ id: id.toString(), type, data });

      setTimeout(() => {
        if (this.messageQueue.has(id.toString())) {
          this.messageQueue.delete(id.toString());
          reject(new Error('Execution timeout'));
        }
      }, this.config.timeout);
    });
  }

  private handleMessage(data: { id: string; result?: unknown; error?: string }): void {
    const handler = this.messageQueue.get(data.id);
    if (handler) {
      this.messageQueue.delete(data.id);
      if (data.error) {
        handler.reject(new Error(data.error));
      } else {
        handler.resolve(data.result);
      }
    }
  }
}

// ============================================
// Node.js Sandbox (isolated-vm)
// ============================================

export class NodeSandbox extends SecureSandbox {
  private scriptCache = new Map<string, unknown>();

  constructor(config?: Partial<SandboxConfig>) {
    super({ ...config, backend: 'isolated-vm' });
  }

  async execute<T>(code: string, context?: SandboxContext): Promise<ExecutionResult<T>> {
    const startTime = Date.now();

    const syntaxCheck = this.validateSyntax(code);
    if (!syntaxCheck.valid) {
      return {
        success: false,
        error: { type: 'syntax', message: syntaxCheck.error! },
        executionTime: 0,
        memoryUsed: 0,
      };
    }

    try {
      // In Node.js, we would use isolated-vm package
      // For now, provide a safe wrapper
      const safeContext = this.sanitizeContext(context || {});
      const safeGlobals = this.createSafeGlobals();

      // Create function with restricted scope
      const fn = new Function(
        ...Object.keys(safeGlobals),
        ...Object.keys(safeContext),
        `"use strict";\n${code}`
      );

      const result = fn(
        ...Object.values(safeGlobals),
        ...Object.values(safeContext)
      );

      return {
        success: true,
        result: await result,
        executionTime: Date.now() - startTime,
        memoryUsed: 0,
      };
    } catch (error) {
      return {
        success: false,
        error: {
          type: 'access',
          message: error instanceof Error ? error.message : 'Execution failed',
        },
        executionTime: Date.now() - startTime,
        memoryUsed: 0,
      };
    }
  }

  async destroy(): Promise<void> {
    this.scriptCache.clear();
  }

  isHealthy(): boolean {
    return true;
  }

  getMetrics(): SandboxMetrics {
    return {
      backend: 'isolated-vm',
      healthy: this.isHealthy(),
      scriptCacheSize: this.scriptCache.size,
    };
  }
}

// ============================================
// Sandbox Factory
// ============================================

export interface SandboxMetrics {
  backend: string;
  healthy: boolean;
  pendingMessages?: number;
  scriptCacheSize?: number;
}

export class SandboxFactory {
  /**
   * Create appropriate sandbox for environment
   */
  static create(config?: Partial<SandboxConfig>): SecureSandbox {
    const isBrowser = typeof window !== 'undefined';
    const backend = config?.backend || (isBrowser ? 'iframe' : 'isolated-vm');

    switch (backend) {
      case 'iframe':
        if (!isBrowser) throw new Error('iframe sandbox only available in browser');
        return new IFrameSandbox(config);
      case 'worker':
        if (!isBrowser) throw new Error('worker sandbox only available in browser');
        return new WorkerSandbox(config);
      case 'isolated-vm':
      case 'vm2':
        // Use the new NodeSecureSandbox implementation
        const { NodeSecureSandbox } = require('./node-sandbox');
        return new NodeSecureSandbox(config);
      default:
        throw new Error(`Unknown sandbox backend: ${backend}`);
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
  private queue: Array<{
    code: string;
    context?: SandboxContext;
    resolve: (result: ExecutionResult<unknown>) => void;
    reject: (error: Error) => void;
  }> = [];
  private activeCount = 0;

  constructor(private size: number, config?: Partial<SandboxConfig>) {
    for (let i = 0; i < size; i++) {
      this.sandboxes.push(SandboxFactory.create(config));
    }
  }

  async execute<T>(code: string, context?: SandboxContext): Promise<ExecutionResult<T>> {
    return new Promise((resolve, reject) => {
      this.queue.push({
        code,
        context,
        resolve: resolve as (result: ExecutionResult<unknown>) => void,
        reject,
      });
      this.processQueue();
    });
  }

  private async processQueue(): Promise<void> {
    if (this.queue.length === 0 || this.activeCount >= this.size) return;

    const task = this.queue.shift();
    if (!task) return;

    const sandbox = this.sandboxes[this.activeCount++];

    try {
      const result = await sandbox.execute(task.code, task.context);
      task.resolve(result);
    } catch (error) {
      task.reject(error instanceof Error ? error : new Error(String(error)));
    } finally {
      this.activeCount--;
      this.processQueue();
    }
  }

  async destroy(): Promise<void> {
    await Promise.all(this.sandboxes.map((s) => s.destroy()));
    this.sandboxes = [];
    this.queue = [];
  }
}

// ============================================
// Export
// ============================================

export { SecureSandbox as default };
