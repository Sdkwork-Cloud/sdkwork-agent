/**
 * Built-in Tools - 内置工具集
 *
 * 提供文件系统、HTTP 请求、命令执行等基础工具
 *
 * @module BuiltinTools
 * @version 2.0.0
 */

import { z } from 'zod';
import type { Tool, ToolResult, ToolPlugin } from './core/types.js';

// ============================================================================
// File System Tools
// ============================================================================

export const fileReadTool: Tool = {
  id: 'fs:read',
  name: 'file_read',
  description: 'Read content from a file',
  category: 'filesystem',
  parameters: z.object({
    path: z.string().describe('Path to the file'),
    encoding: z.string().default('utf-8').describe('File encoding'),
  }),
  execute: async (input, context): Promise<ToolResult> => {
    try {
      const fs = await import('fs/promises');
      const { path, encoding = 'utf-8' } = input as { path: string; encoding?: string };
      const content = await fs.readFile(path, { encoding: encoding as BufferEncoding });
      
      return {
        success: true,
        data: content,
        output: {
          content: [{ type: 'text', text: content }],
        },
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'FILE_READ_ERROR',
          message: error instanceof Error ? error.message : 'Failed to read file',
          recoverable: false,
        },
      };
    }
  },
  metadata: {
    version: '2.0.0',
    tags: ['file', 'read', 'filesystem'],
  },
};

export const fileWriteTool: Tool = {
  id: 'fs:write',
  name: 'file_write',
  description: 'Write content to a file',
  category: 'filesystem',
  parameters: z.object({
    path: z.string().describe('Path to the file'),
    content: z.string().describe('Content to write'),
    encoding: z.string().default('utf-8').describe('File encoding'),
  }),
  execute: async (input, context): Promise<ToolResult> => {
    try {
      const fs = await import('fs/promises');
      const { path, content, encoding = 'utf-8' } = input as { 
        path: string; 
        content: string; 
        encoding?: string 
      };
      
      await fs.writeFile(path, content, { encoding: encoding as BufferEncoding });
      
      return {
        success: true,
        data: { path, bytesWritten: content.length },
        output: {
          content: [{ type: 'text', text: `Successfully wrote to ${path}` }],
        },
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'FILE_WRITE_ERROR',
          message: error instanceof Error ? error.message : 'Failed to write file',
          recoverable: false,
        },
      };
    }
  },
  metadata: {
    version: '2.0.0',
    tags: ['file', 'write', 'filesystem'],
    requiresConfirmation: true,
  },
};

export const fileListTool: Tool = {
  id: 'fs:list',
  name: 'file_list',
  description: 'List files in a directory',
  category: 'filesystem',
  parameters: z.object({
    path: z.string().describe('Directory path'),
    recursive: z.boolean().default(false).describe('List recursively'),
  }),
  execute: async (input, context): Promise<ToolResult> => {
    try {
      const fs = await import('fs/promises');
      const { path, recursive = false } = input as { path: string; recursive?: boolean };
      
      const entries = await fs.readdir(path, { withFileTypes: true, recursive });
      const files = entries.map(entry => ({
        name: entry.name,
        isDirectory: entry.isDirectory(),
        isFile: entry.isFile(),
      }));
      
      return {
        success: true,
        data: files,
        output: {
          content: [{ type: 'json', text: JSON.stringify(files, null, 2) }],
        },
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'FILE_LIST_ERROR',
          message: error instanceof Error ? error.message : 'Failed to list directory',
          recoverable: false,
        },
      };
    }
  },
  metadata: {
    version: '2.0.0',
    tags: ['file', 'list', 'directory'],
  },
};

// ============================================================================
// Network Tools
// ============================================================================

export const httpRequestTool: Tool = {
  id: 'net:http',
  name: 'http_request',
  description: 'Make HTTP requests',
  category: 'network',
  parameters: z.object({
    url: z.string().describe('URL to request'),
    method: z.enum(['GET', 'POST', 'PUT', 'DELETE', 'PATCH']).default('GET'),
    headers: z.record(z.string(), z.string()).optional().describe('Request headers'),
    body: z.string().optional().describe('Request body'),
    timeout: z.number().default(30000).describe('Timeout in milliseconds'),
  }),
  execute: async (input, context): Promise<ToolResult> => {
    try {
      const { url, method = 'GET', headers = {}, body, timeout = 30000 } = input as {
        url: string;
        method?: string;
        headers?: Record<string, string>;
        body?: string;
        timeout?: number;
      };

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      const response = await fetch(url, {
        method,
        headers,
        body,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      const text = await response.text();

      return {
        success: response.ok,
        data: {
          status: response.status,
          statusText: response.statusText,
          headers: Object.fromEntries(response.headers.entries()),
          body: text,
        },
        output: {
          content: [{ type: 'text', text: `Status: ${response.status}\n\n${text}` }],
          metadata: {
            status: response.status,
            statusText: response.statusText,
          },
        },
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'HTTP_ERROR',
          message: error instanceof Error ? error.message : 'HTTP request failed',
          recoverable: true,
        },
      };
    }
  },
  metadata: {
    version: '2.0.0',
    tags: ['http', 'request', 'network', 'api'],
    timeout: 30000,
    retries: 2,
  },
};

// ============================================================================
// System Tools
// ============================================================================

export const executeCommandTool: Tool = {
  id: 'sys:exec',
  name: 'execute_command',
  description: 'Execute a shell command',
  category: 'system',
  parameters: z.object({
    command: z.string().describe('Command to execute'),
    args: z.array(z.string()).default([]).describe('Command arguments'),
    cwd: z.string().optional().describe('Working directory'),
    timeout: z.number().default(30000).describe('Timeout in milliseconds'),
  }),
  execute: async (input, context): Promise<ToolResult> => {
    try {
      const { spawn } = await import('child_process');
      const { command, args = [], cwd, timeout = 30000 } = input as {
        command: string;
        args?: string[];
        cwd?: string;
        timeout?: number;
      };

      return new Promise((resolve) => {
        const child = spawn(command, args, { cwd, shell: true });

        let stdout = '';
        let stderr = '';

        child.stdout?.on('data', (data: Buffer) => {
          stdout += data.toString();
        });

        child.stderr?.on('data', (data: Buffer) => {
          stderr += data.toString();
        });

        const timeoutId = setTimeout(() => {
          child.kill();
          resolve({
            success: false,
            error: {
              code: 'COMMAND_TIMEOUT',
              message: `Command timed out after ${timeout}ms`,
              recoverable: true,
            },
          });
        }, timeout);

        child.on('close', (code) => {
          clearTimeout(timeoutId);
          resolve({
            success: code === 0,
            data: { exitCode: code, stdout, stderr },
            output: {
              content: [{ 
                type: 'text', 
                text: `Exit code: ${code}\n\nStdout:\n${stdout}\n\nStderr:\n${stderr}` 
              }],
              isError: code !== 0,
            },
          });
        });

        child.on('error', (error) => {
          clearTimeout(timeoutId);
          resolve({
            success: false,
            error: {
              code: 'COMMAND_ERROR',
              message: error.message,
              recoverable: false,
            },
          });
        });
      });
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'COMMAND_FAILED',
          message: error instanceof Error ? error.message : 'Failed to execute command',
          recoverable: false,
        },
      };
    }
  },
  metadata: {
    version: '2.0.0',
    tags: ['command', 'shell', 'execute', 'system'],
    requiresConfirmation: true,
    timeout: 30000,
  },
};

// ============================================================================
// Data Tools
// ============================================================================

export const jsonParseTool: Tool = {
  id: 'data:json-parse',
  name: 'json_parse',
  description: 'Parse and validate JSON',
  category: 'data',
  parameters: z.object({
    text: z.string().describe('JSON string to parse'),
    schema: z.record(z.string(), z.any()).optional().describe('Optional validation schema'),
  }),
  execute: async (input, context): Promise<ToolResult> => {
    try {
      const { text } = input as { text: string; schema?: Record<string, unknown> };
      const data = JSON.parse(text);
      
      return {
        success: true,
        data,
        output: {
          content: [{ type: 'json', text: JSON.stringify(data, null, 2) }],
        },
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'JSON_PARSE_ERROR',
          message: error instanceof Error ? error.message : 'Failed to parse JSON',
          recoverable: false,
        },
      };
    }
  },
  metadata: {
    version: '2.0.0',
    tags: ['json', 'parse', 'data'],
  },
};

// ============================================================================
// All Built-in Tools
// ============================================================================

export const builtinTools: Tool[] = [
  fileReadTool,
  fileWriteTool,
  fileListTool,
  httpRequestTool,
  executeCommandTool,
  jsonParseTool,
];

// ============================================================================
// Built-in Plugin
// ============================================================================

export const builtinPlugin: ToolPlugin = {
  name: 'builtin',
  version: '2.0.0',
  tools: builtinTools,
  initialize: async (registry) => {
    console.log('[BuiltinPlugin] Initialized with', builtinTools.length, 'tools');
  },
};

export default builtinPlugin;
