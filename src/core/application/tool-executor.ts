/**
 * Tool Executor - 工具执行器实现
 *
 * 完美实现 Tool 执行
 * 支持分类、确认级别、执行链
 *
 * @application Tool
 * @version 4.1.0
 * @standard Industry Leading
 */

import { EventEmitter } from '../../utils/event-emitter';
import type {
  Tool,
  ToolExecutionContext,
  ToolResult,
  ToolError,
  ToolExecutionMeta,
  ValidationResult,
  ToolChain,
  ToolChainResult,
  ToolEvent,
  ToolEventType,
} from '../domain/tool';

/**
 * Tool 执行器配置
 */
export interface ToolExecutorConfig {
  /** 超时时间 (毫秒) */
  timeout?: number;
  /** 确认回调 */
  onConfirm?: (tool: Tool, input: unknown) => Promise<boolean>;
}

/**
 * 完美 Tool 执行器
 */
export class ToolExecutorImpl extends EventEmitter {
  private _timeout: number;
  private _onConfirm?: (tool: Tool, input: unknown) => Promise<boolean>;
  private _abortControllers: Map<string, AbortController> = new Map();
  private _registry: Map<string, Tool> = new Map();

  constructor(config: ToolExecutorConfig = {}) {
    super();
    this._timeout = config.timeout || 30000;
    this._onConfirm = config.onConfirm;
  }

  /**
   * 注册 Tool
   */
  registerTool(tool: Tool): void {
    this._registry.set(tool.id, tool);
  }

  /**
   * 执行 Tool
   *
   * @example
   * ```typescript
   * const result = await executor.execute(tool, input, context);
   * if (result.success) {
   *   console.log(result.data);
   * }
   * ```
   */
  async execute(
    tool: Tool,
    input: unknown,
    context: ToolExecutionContext
  ): Promise<ToolResult> {
    const startTime = Date.now();
    const executionId = context.executionId;

    // 创建中止控制器
    const abortController = new AbortController();
    this._abortControllers.set(executionId, abortController);

    // 发射调用中事件
    this._emitEvent('tool:invoking', { toolId: tool.id, input }, tool.id, executionId);

    try {
      // 1. 验证输入
      const validation = this.validateInput(tool, input);
      if (!validation.valid) {
        throw new Error(`Input validation failed: ${validation.errors.map(e => e.message).join(', ')}`);
      }

      // 2. 确认操作
      if (this.needsConfirmation(tool)) {
        const confirmed = await this._confirm(tool, input);
        if (!confirmed) {
          throw new Error('Tool execution cancelled by user');
        }
      }

      // 3. 执行 Tool
      const result = await this._executeWithTimeout(
        tool,
        input,
        context,
        abortController.signal
      );

      // 4. 构建成功结果
      const meta: ToolExecutionMeta = {
        executionId,
        toolId: tool.id,
        toolName: tool.name,
        startTime,
        endTime: Date.now(),
        duration: Date.now() - startTime,
      };

      const toolResult: ToolResult = {
        success: true,
        data: result,
        meta,
      };

      // 发射完成事件
      this._emitEvent('tool:completed', { toolId: tool.id, result }, tool.id, executionId);

      return toolResult;
    } catch (error) {
      // 构建错误结果
      const toolError: ToolError = {
        code: 'EXECUTION_ERROR',
        message: error instanceof Error ? error.message : String(error),
        recoverable: false,
      };

      const meta: ToolExecutionMeta = {
        executionId,
        toolId: tool.id,
        toolName: tool.name,
        startTime,
        endTime: Date.now(),
        duration: Date.now() - startTime,
      };

      const toolResult: ToolResult = {
        success: false,
        error: toolError,
        meta,
      };

      // 发射失败事件
      this._emitEvent('tool:failed', { toolId: tool.id, error: toolError }, tool.id, executionId);

      return toolResult;
    } finally {
      this._abortControllers.delete(executionId);
    }
  }

  /**
   * 执行 Tool 链
   *
   * @example
   * ```typescript
   * const chain: ToolChain = {
   *   id: 'chain-1',
   *   nodes: [
   *     { id: 'node-1', toolId: 'tool-a', input: {}, dependencies: [], state: 'pending' },
   *     { id: 'node-2', toolId: 'tool-b', input: {}, dependencies: ['node-1'], state: 'pending' },
   *   ],
   *   strategy: 'sequential',
   * };
   * const result = await executor.executeChain(chain);
   * ```
   */
  async executeChain(chain: ToolChain): Promise<ToolChainResult> {
    // 发射链开始事件
    this._emitEvent('tool:chain:started', { chainId: chain.id, nodeCount: chain.nodes.length }, 'chain');

    try {
      let finalResult: unknown;

      switch (chain.strategy) {
        case 'sequential':
          finalResult = await this._executeSequential(chain);
          break;
        case 'parallel':
          finalResult = await this._executeParallel(chain);
          break;
        case 'dag':
          finalResult = await this._executeDAG(chain);
          break;
        default:
          throw new Error(`Unknown chain strategy: ${chain.strategy}`);
      }

      // 发射链完成事件
      this._emitEvent('tool:chain:completed', { chainId: chain.id }, 'chain');

      return {
        success: true,
        nodes: chain.nodes,
        finalResult,
      };
    } catch (error) {
      // 发射链失败事件
      this._emitEvent('tool:chain:failed', {
        chainId: chain.id,
        error: error instanceof Error ? error.message : String(error),
      }, 'chain');

      return {
        success: false,
        nodes: chain.nodes,
        error: {
          code: 'CHAIN_ERROR',
          message: error instanceof Error ? error.message : String(error),
          recoverable: false,
        },
      };
    }
  }

  /**
   * 验证输入
   */
  validateInput(tool: Tool, input: unknown): ValidationResult {
    const errors: { field: string; message: string }[] = [];

    if (!tool.input) {
      return { valid: true, errors: [] };
    }

    // 验证对象类型
    if (tool.input.type === 'object') {
      if (typeof input !== 'object' || input === null) {
        errors.push({ field: 'input', message: 'Input must be an object' });
        return { valid: false, errors };
      }

      const inputObj = input as Record<string, unknown>;

      // 验证必填字段
      if (tool.input.required) {
        for (const field of tool.input.required) {
          if (!(field in inputObj)) {
            errors.push({ field, message: `Field '${field}' is required` });
          }
        }
      }

      // 验证字段类型
      if (tool.input.properties) {
        for (const [field, schema] of Object.entries(tool.input.properties)) {
          const value = inputObj[field];
          if (value !== undefined) {
            const typeError = this._validateType(value, schema, field);
            if (typeError) {
              errors.push(typeError);
            }
          }
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * 需要确认
   */
  needsConfirmation(tool: Tool): boolean {
    return tool.confirm !== 'none';
  }

  /**
   * 中止执行
   */
  abort(executionId: string): void {
    const controller = this._abortControllers.get(executionId);
    if (controller) {
      controller.abort();
      this._abortControllers.delete(executionId);
    }
  }

  // ============================================
  // Private Methods
  // ============================================

  private async _confirm(tool: Tool, input: unknown): Promise<boolean> {
    if (this._onConfirm) {
      return this._onConfirm(tool, input);
    }
    // 默认确认
    return true;
  }

  private async _executeWithTimeout(
    tool: Tool,
    input: unknown,
    context: ToolExecutionContext,
    signal: AbortSignal
  ): Promise<unknown> {
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error(`Tool execution timeout after ${this._timeout}ms`));
      }, this._timeout);

      const onAbort = () => {
        clearTimeout(timeoutId);
        reject(new Error('Tool execution aborted'));
      };

      signal.addEventListener('abort', onAbort);

      tool
        .execute(input, { ...context, signal })
        .then((result) => {
          clearTimeout(timeoutId);
          signal.removeEventListener('abort', onAbort);
          resolve(result);
        })
        .catch((error) => {
          clearTimeout(timeoutId);
          signal.removeEventListener('abort', onAbort);
          reject(error);
        });
    });
  }

  private _validateType(
    value: unknown,
    schema: { type: string; enum?: unknown[] },
    field: string
  ): { field: string; message: string } | null {
    const typeMap: Record<string, string> = {
      string: 'string',
      number: 'number',
      boolean: 'boolean',
      object: 'object',
      array: 'object',
    };

    const expectedType = typeMap[schema.type];
    const actualType = typeof value;

    if (expectedType && actualType !== expectedType) {
      return {
        field,
        message: `Field '${field}' must be of type ${schema.type}, got ${actualType}`,
      };
    }

    if (schema.enum && !schema.enum.includes(value)) {
      return {
        field,
        message: `Field '${field}' must be one of: ${schema.enum.join(', ')}`,
      };
    }

    return null;
  }

  private async _executeSequential(chain: ToolChain): Promise<unknown> {
    let lastResult: unknown;

    for (const node of chain.nodes) {
      node.state = 'executing';
      
      try {
        // 获取 Tool 并执行
        const tool = this._registry.get(node.toolId);
        if (!tool) {
          throw new Error(`Tool not found: ${node.toolId}`);
        }
        
        const context: ToolExecutionContext = {
          executionId: `chain-${chain.id}-${node.id}`,
          agentId: 'chain-agent',
          toolId: tool.id,
          toolName: tool.name,
          logger: {
            debug: () => {},
            info: () => {},
            warn: () => {},
            error: () => {},
          },
        };
        const result = await tool.execute(node.input, context);
        node.result = result;
        node.state = 'completed';
        lastResult = result;
      } catch (error) {
        node.state = 'failed';
        node.error = error instanceof Error ? error.message : String(error);
        throw error;
      }
    }

    return lastResult;
  }

  private async _executeParallel(chain: ToolChain): Promise<unknown> {
    // 并行执行所有节点
    const promises = chain.nodes.map(async (node) => {
      node.state = 'executing';
      
      try {
        // 获取 Tool 并执行
        const tool = this._registry.get(node.toolId);
        if (!tool) {
          throw new Error(`Tool not found: ${node.toolId}`);
        }
        
        const context: ToolExecutionContext = {
          executionId: `chain-${chain.id}-${node.id}`,
          agentId: 'chain-agent',
          toolId: tool.id,
          toolName: tool.name,
          logger: {
            debug: () => {},
            info: () => {},
            warn: () => {},
            error: () => {},
          },
        };
        const result = await tool.execute(node.input, context);
        node.result = result;
        node.state = 'completed';
        return result;
      } catch (error) {
        node.state = 'failed';
        node.error = error instanceof Error ? error.message : String(error);
        throw error;
      }
    });

    const results = await Promise.all(promises);
    return results[results.length - 1];
  }

  private async _executeDAG(chain: ToolChain): Promise<unknown> {
    // DAG 执行 - 按依赖关系执行
    const completed = new Set<string>();
    const results = new Map<string, unknown>();

    while (completed.size < chain.nodes.length) {
      // 找到可以执行的节点（依赖已完成）
      const readyNodes = chain.nodes.filter(
        (node) =>
          node.state === 'pending' &&
          node.dependencies.every((dep) => completed.has(dep))
      );

      if (readyNodes.length === 0) {
        throw new Error('Circular dependency detected or missing dependencies');
      }

      // 并行执行就绪节点
      await Promise.all(
        readyNodes.map(async (node) => {
          node.state = 'executing';
          
          try {
            // 获取 Tool 并执行，传递依赖结果
            const tool = this._registry.get(node.toolId);
            if (!tool) {
              throw new Error(`Tool not found: ${node.toolId}`);
            }
            
            // 构建输入（包含依赖结果）
            const inputWithDeps = {
              ...(typeof node.input === 'object' && node.input !== null ? node.input : {}),
              _dependencies: Object.fromEntries(
                node.dependencies.map(depId => [depId, results.get(depId)])
              ),
            };
            
            const context: ToolExecutionContext = {
              executionId: `chain-${chain.id}-${node.id}`,
              agentId: 'chain-agent',
              toolId: tool.id,
              toolName: tool.name,
              logger: {
                debug: () => {},
                info: () => {},
                warn: () => {},
                error: () => {},
              },
            };
            const result = await tool.execute(inputWithDeps, context);
            node.result = result;
            node.state = 'completed';
            completed.add(node.id);
            results.set(node.id, result);
          } catch (error) {
            node.state = 'failed';
            node.error = error instanceof Error ? error.message : String(error);
            throw error;
          }
        })
      );
    }

    // 返回最后一个节点的结果
    const lastNode = chain.nodes[chain.nodes.length - 1];
    return results.get(lastNode.id);
  }

  private _emitEvent<T>(
    type: ToolEventType,
    payload: T,
    toolId: string,
    executionId?: string
  ): void {
    const event: ToolEvent<T> = {
      type,
      timestamp: Date.now(),
      payload,
      toolId,
      executionId,
    };
    this.emit(type, event);
  }
}

export default ToolExecutorImpl;
