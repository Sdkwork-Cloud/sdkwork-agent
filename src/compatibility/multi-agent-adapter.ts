/**
 * Multi-Agent Compatibility Adapter
 *
 * 多智能体兼容性适配器
 *
 * 支持 Claude Code、Codex、OpenCode 等主流 AI 编程助手
 *
 * @module MultiAgentAdapter
 * @version 1.0.0
 */

import { EventEmitter } from '../utils/event-emitter.js';
import { Logger } from '../skills/core/types.js';

// ============================================================================
// Common Types
// ============================================================================

export interface AgentTool {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
}

export interface AgentMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  toolCalls?: AgentToolCall[];
  toolResults?: AgentToolResult[];
}

export interface AgentToolCall {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
}

export interface AgentToolResult {
  callId: string;
  result: unknown;
  error?: string;
}

export interface AgentSession {
  id: string;
  messages: AgentMessage[];
  context: Record<string, unknown>;
}

// ============================================================================
// Claude Code Adapter
// ============================================================================

export interface ClaudeConfig {
  enabled: boolean;
  allowedTools?: string[];
  maxIterations?: number;
  model?: string;
  apiKey?: string;
}

export class ClaudeAdapter extends EventEmitter {
  private config: Required<ClaudeConfig>;

  constructor(config: ClaudeConfig, _logger?: Logger) {
    super();
    this.config = {
      allowedTools: [],
      maxIterations: 10,
      model: 'claude-3-opus-20240229',
      apiKey: process.env.ANTHROPIC_API_KEY || '',
      ...config,
    };
  }

  /**
   * 转换 SDKWork 工具为 Claude 工具格式
   */
  convertTools(tools: AgentTool[]): Array<{
    name: string;
    description: string;
    input_schema: Record<string, unknown>;
  }> {
    return tools
      .filter(tool => this.isToolAllowed(tool.name))
      .map(tool => ({
        name: tool.name,
        description: tool.description,
        input_schema: {
          type: 'object',
          properties: tool.parameters,
          required: Object.keys(tool.parameters).filter(key => {
            const param = tool.parameters[key] as Record<string, unknown>;
            return param?.required === true;
          }),
        },
      }));
  }

  /**
   * 解析 Claude 响应
   */
  parseResponse(response: unknown): {
    content: string;
    toolCalls: AgentToolCall[];
  } {
    const claudeResponse = response as {
      content: Array<{ type: string; text?: string; name?: string; input?: Record<string, unknown> }>;
      id?: string;
    };

    let content = '';
    const toolCalls: AgentToolCall[] = [];

    for (const block of claudeResponse.content || []) {
      if (block.type === 'text' && block.text) {
        content += block.text;
      } else if (block.type === 'tool_use') {
        toolCalls.push({
          id: `claude-${Date.now()}-${Math.random().toString(36).slice(2)}`,
          name: block.name || 'unknown',
          arguments: block.input || {},
        });
      }
    }

    return { content, toolCalls };
  }

  /**
   * 构建 Claude 系统提示词
   */
  buildSystemPrompt(context: {
    skills: string[];
    tools: AgentTool[];
    customInstructions?: string;
  }): string {
    const lines: string[] = [
      'You are Claude Code, an AI assistant integrated with SDKWork Browser Agent.',
      '',
      '## Available Skills',
      ...context.skills.map(s => `- ${s}`),
      '',
      '## Available Tools',
      ...context.tools.map(t => `- ${t.name}: ${t.description}`),
      '',
    ];

    if (context.customInstructions) {
      lines.push('## Custom Instructions', context.customInstructions, '');
    }

    lines.push(
      '## Guidelines',
      '- Use tools when appropriate to accomplish tasks',
      '- Be concise and helpful',
      '- Ask for clarification if needed'
    );

    return lines.join('\n');
  }

  private isToolAllowed(toolName: string): boolean {
    if (this.config.allowedTools.length === 0) return true;
    return this.config.allowedTools.includes(toolName);
  }
}

// ============================================================================
// Codex Adapter
// ============================================================================

export interface CodexConfig {
  enabled: boolean;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  apiKey?: string;
}

export class CodexAdapter extends EventEmitter {
  constructor(config: CodexConfig, _logger?: Logger) {
    super();
    // Config is used for initialization
    void config;
  }

  /**
   * 转换 SDKWork 工具为 OpenAI 函数格式
   */
  convertTools(tools: AgentTool[]): Array<{
    type: 'function';
    function: {
      name: string;
      description: string;
      parameters: Record<string, unknown>;
    };
  }> {
    return tools.map(tool => ({
      type: 'function',
      function: {
        name: tool.name,
        description: tool.description,
        parameters: {
          type: 'object',
          properties: tool.parameters,
          required: Object.keys(tool.parameters).filter(key => {
            const param = tool.parameters[key] as Record<string, unknown>;
            return param?.required === true;
          }),
        },
      },
    }));
  }

  /**
   * 解析 OpenAI 响应
   */
  parseResponse(response: unknown): {
    content: string;
    toolCalls: AgentToolCall[];
  } {
    const openaiResponse = response as {
      choices: Array<{
        message: {
          content?: string;
          tool_calls?: Array<{
            id: string;
            function: { name: string; arguments: string };
          }>;
        };
      }>;
    };

    const message = openaiResponse.choices?.[0]?.message || {};
    const content = message.content || '';
    const toolCalls: AgentToolCall[] = [];

    for (const call of message.tool_calls || []) {
      try {
        toolCalls.push({
          id: call.id,
          name: call.function.name,
          arguments: JSON.parse(call.function.arguments),
        });
      } catch {
        toolCalls.push({
          id: call.id,
          name: call.function.name,
          arguments: {},
        });
      }
    }

    return { content, toolCalls };
  }

  /**
   * 构建 Codex 系统提示词
   */
  buildSystemPrompt(context: {
    skills: string[];
    tools: AgentTool[];
    customInstructions?: string;
  }): string {
    const lines: string[] = [
      'You are Codex, an AI coding assistant integrated with SDKWork Browser Agent.',
      '',
      '## Available Skills',
      ...context.skills.map(s => `- ${s}`),
      '',
    ];

    if (context.customInstructions) {
      lines.push('## Custom Instructions', context.customInstructions, '');
    }

    lines.push(
      '## Guidelines',
      '- Write clean, efficient code',
      '- Explain your reasoning',
      '- Use available tools when helpful'
    );

    return lines.join('\n');
  }
}

// ============================================================================
// OpenCode Adapter
// ============================================================================

export interface OpenCodeConfig {
  enabled: boolean;
  registry?: string;
  autoUpdate?: boolean;
  apiKey?: string;
}

export class OpenCodeAdapter extends EventEmitter {
  constructor(config: OpenCodeConfig, _logger?: Logger) {
    super();
    // Config is used for initialization
    void config;
  }

  /**
   * 转换 SDKWork 技能为 OpenCode 扩展格式
   */
  convertSkills(skills: Array<{ name: string; description: string }>): Array<{
    id: string;
    name: string;
    description: string;
    version: string;
  }> {
    return skills.map(skill => ({
      id: `sdkwork-${skill.name}`,
      name: skill.name,
      description: skill.description,
      version: '1.0.0',
    }));
  }

  /**
   * 解析 OpenCode 命令
   */
  parseCommand(input: string): {
    extension: string;
    command: string;
    args: string[];
  } | null {
    // OpenCode 格式: @extension/command args...
    const match = input.match(/^@([^/]+)\/([^\s]+)(?:\s+(.*))?$/);
    if (!match) return null;

    const [, extension, command, argsStr = ''] = match;
    return {
      extension,
      command,
      args: argsStr.split(/\s+/).filter(Boolean),
    };
  }

  /**
   * 构建 OpenCode 系统提示词
   */
  buildSystemPrompt(context: {
    skills: string[];
    extensions: string[];
    customInstructions?: string;
  }): string {
    const lines: string[] = [
      'You are OpenCode, an AI assistant integrated with SDKWork Browser Agent.',
      '',
      '## Available Extensions',
      ...context.extensions.map(e => `- ${e}`),
      '',
      '## Available Skills',
      ...context.skills.map(s => `- ${s}`),
      '',
    ];

    if (context.customInstructions) {
      lines.push('## Custom Instructions', context.customInstructions, '');
    }

    lines.push(
      '## Command Format',
      'Use @extension/command to invoke extensions',
      'Example: @git/status'
    );

    return lines.join('\n');
  }
}

// ============================================================================
// Unified Adapter Factory
// ============================================================================

export interface MultiAgentConfig {
  claude?: ClaudeConfig;
  codex?: CodexConfig;
  opencode?: OpenCodeConfig;
}

export class MultiAgentAdapter extends EventEmitter {
  private claudeAdapter?: ClaudeAdapter;
  private codexAdapter?: CodexAdapter;
  private opencodeAdapter?: OpenCodeAdapter;
  private logger: Logger;

  constructor(config: MultiAgentConfig, logger?: Logger) {
    super();
    this.logger = logger || this.createDefaultLogger();

    if (config.claude?.enabled) {
      this.claudeAdapter = new ClaudeAdapter(config.claude, this.logger);
    }

    if (config.codex?.enabled) {
      this.codexAdapter = new CodexAdapter(config.codex, this.logger);
    }

    if (config.opencode?.enabled) {
      this.opencodeAdapter = new OpenCodeAdapter(config.opencode, this.logger);
    }
  }

  /**
   * 获取启用的适配器列表
   */
  getEnabledAdapters(): string[] {
    const adapters: string[] = [];
    if (this.claudeAdapter) adapters.push('claude');
    if (this.codexAdapter) adapters.push('codex');
    if (this.opencodeAdapter) adapters.push('opencode');
    return adapters;
  }

  /**
   * 检查适配器是否启用
   */
  isAdapterEnabled(name: 'claude' | 'codex' | 'opencode'): boolean {
    switch (name) {
      case 'claude':
        return !!this.claudeAdapter;
      case 'codex':
        return !!this.codexAdapter;
      case 'opencode':
        return !!this.opencodeAdapter;
      default:
        return false;
    }
  }

  /**
   * 获取 Claude 适配器
   */
  getClaudeAdapter(): ClaudeAdapter | undefined {
    return this.claudeAdapter;
  }

  /**
   * 获取 Codex 适配器
   */
  getCodexAdapter(): CodexAdapter | undefined {
    return this.codexAdapter;
  }

  /**
   * 获取 OpenCode 适配器
   */
  getOpenCodeAdapter(): OpenCodeAdapter | undefined {
    return this.opencodeAdapter;
  }

  private createDefaultLogger(): Logger {
    return {
      debug: () => {},
      info: console.info,
      warn: console.warn,
      error: console.error,
    };
  }
}

/**
 * 创建多智能体适配器
 */
export function createMultiAgentAdapter(
  config: MultiAgentConfig,
  logger?: Logger
): MultiAgentAdapter {
  return new MultiAgentAdapter(config, logger);
}

// Note: Adapters are already exported with 'export class' above
