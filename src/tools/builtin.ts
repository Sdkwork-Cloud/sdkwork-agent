/**
 * Built-in Tools
 */

import { Tool, ToolOutput } from './core/types.js';

export const fileReadTool: Tool = {
  name: 'file_read',
  description: 'Read content from a file (Node.js only)',
  parameters: {
    type: 'object',
    properties: {
      path: {
        type: 'string',
        description: 'Path to the file',
      },
      encoding: {
        type: 'string',
        description: 'File encoding',
        default: 'utf-8',
      },
    },
    required: ['path'],
  },
  execute: async (input: unknown): Promise<ToolOutput> => {
    // Check if running in Node.js
    if (typeof window !== 'undefined') {
      return {
        content: [{ type: 'error', text: 'File operations not supported in browser' }],
        isError: true,
      };
    }

    try {
      // Dynamic import to avoid browser bundling issues
      const fs = await import('fs/promises');
      const { path, encoding = 'utf-8' } = input as { path: string; encoding?: string };
      const content = await fs.readFile(path, { encoding: encoding as BufferEncoding });
      return {
        content: [{ type: 'text', text: content }],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'error',
            text: error instanceof Error ? error.message : 'Failed to read file',
          },
        ],
        isError: true,
      };
    }
  },
  metadata: {
    category: 'filesystem',
    tags: ['file', 'read'],
    version: '1.0.0',
  },
};

export const fileWriteTool: Tool = {
  name: 'file_write',
  description: 'Write content to a file (Node.js only)',
  parameters: {
    type: 'object',
    properties: {
      path: {
        type: 'string',
        description: 'Path to the file',
      },
      content: {
        type: 'string',
        description: 'Content to write',
      },
      encoding: {
        type: 'string',
        description: 'File encoding',
        default: 'utf-8',
      },
    },
    required: ['path', 'content'],
  },
  execute: async (input: unknown): Promise<ToolOutput> => {
    if (typeof window !== 'undefined') {
      return {
        content: [{ type: 'error', text: 'File operations not supported in browser' }],
        isError: true,
      };
    }

    try {
      const fs = await import('fs/promises');
      const {
        path,
        content,
        encoding = 'utf-8',
      } = input as {
        path: string;
        content: string;
        encoding?: string;
      };
      await fs.writeFile(path, content, { encoding: encoding as BufferEncoding });
      return {
        content: [{ type: 'text', text: `Successfully wrote to ${path}` }],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'error',
            text: error instanceof Error ? error.message : 'Failed to write file',
          },
        ],
        isError: true,
      };
    }
  },
  metadata: {
    category: 'filesystem',
    tags: ['file', 'write'],
    requiresConfirmation: true,
    version: '1.0.0',
  },
};

export const httpRequestTool: Tool = {
  name: 'http_request',
  description: 'Make HTTP requests',
  parameters: {
    type: 'object',
    properties: {
      url: {
        type: 'string',
        description: 'URL to request',
      },
      method: {
        type: 'string',
        description: 'HTTP method',
        enum: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
        default: 'GET',
      },
      headers: {
        type: 'object',
        description: 'Request headers',
      },
      body: {
        type: 'string',
        description: 'Request body',
      },
    },
    required: ['url'],
  },
  execute: async (input: unknown): Promise<ToolOutput> => {
    try {
      const {
        url,
        method = 'GET',
        headers,
        body,
      } = input as {
        url: string;
        method?: string;
        headers?: Record<string, string>;
        body?: string;
      };

      const response = await fetch(url, {
        method,
        headers,
        body,
      });

      const text = await response.text();

      return {
        content: [
          {
            type: 'text',
            text: `Status: ${response.status}\n\n${text}`,
          },
        ],
        metadata: {
          status: response.status,
          statusText: response.statusText,
          headers: Object.fromEntries(response.headers.entries()),
        },
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'error',
            text: error instanceof Error ? error.message : 'HTTP request failed',
          },
        ],
        isError: true,
      };
    }
  },
  metadata: {
    category: 'network',
    tags: ['http', 'request', 'api'],
    version: '1.0.0',
  },
};

export const builtInTools = [fileReadTool, fileWriteTool, httpRequestTool];
