/**
 * Plugin Executor
 * 插件执行器 - 执行插件扩展
 */

import type { Executable, ExecutionContext, ExecutionResult, PluginManager } from './index';

export interface PluginExecutable extends Executable {
  type: 'plugin';
  pluginName: string;
}

export interface PluginManifest {
  name: string;
  version: string;
  description?: string;
  author?: string;
  hooks?: PluginHook[];
}

export interface PluginHook {
  name: string;
  trigger: string;
  handler: (...args: unknown[]) => unknown;
}

export class PluginExecutor {
  private manager?: PluginManager;

  setManager(manager: PluginManager): void {
    this.manager = manager;
  }

  async execute(
    executable: PluginExecutable,
    input: unknown,
    context: ExecutionContext
  ): Promise<ExecutionResult> {
    const startTime = new Date();

    try {
      if (!this.manager) {
        throw new Error('Plugin manager not configured');
      }

      const result = await this.manager.execute(executable.pluginName, input, context);
      
      return {
        success: true,
        data: result,
        metadata: {
          executionId: context.executionId,
          executableName: executable.name,
          executableType: 'plugin',
          startTime,
          endTime: new Date(),
          duration: Date.now() - startTime.getTime(),
        },
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'PLUGIN_EXECUTION_ERROR',
          message: (error as Error).message,
          recoverable: false,
        },
        metadata: {
          executionId: context.executionId,
          executableName: executable.name,
          executableType: 'plugin',
          startTime,
          endTime: new Date(),
          duration: Date.now() - startTime.getTime(),
        },
      };
    }
  }
}

export default PluginExecutor;
