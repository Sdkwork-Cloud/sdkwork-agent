/**
 * MCP Executor
 * MCP协议执行器 - 执行MCP工具
 */

import type { Executable, ExecutionContext, ExecutionResult, MCPClient } from './index.js';

export interface MCPExecutable extends Executable {
  type: 'mcp';
  serverUrl: string;
  toolName: string;
}

export interface MCPResource {
  uri: string;
  name: string;
  description?: string;
  mimeType?: string;
  read(): Promise<MCPResourceContent>;
}

export interface MCPResourceContent {
  uri: string;
  mimeType?: string;
  text?: string;
  blob?: string;
}

export class MCPExecutor {
  private client?: MCPClient;

  setClient(client: MCPClient): void {
    this.client = client;
  }

  async execute(
    executable: MCPExecutable,
    input: unknown,
    context: ExecutionContext
  ): Promise<ExecutionResult> {
    const startTime = new Date();

    try {
      if (!this.client) {
        throw new Error('MCP client not configured');
      }

      const result = await this.client.executeTool(executable.toolName, input);
      
      return {
        success: true,
        data: result,
        metadata: {
          executionId: context.executionId,
          executableName: executable.name,
          executableType: 'mcp',
          startTime,
          endTime: new Date(),
          duration: Date.now() - startTime.getTime(),
        },
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'MCP_EXECUTION_ERROR',
          message: (error as Error).message,
          recoverable: false,
        },
        metadata: {
          executionId: context.executionId,
          executableName: executable.name,
          executableType: 'mcp',
          startTime,
          endTime: new Date(),
          duration: Date.now() - startTime.getTime(),
        },
      };
    }
  }
}

export default MCPExecutor;
