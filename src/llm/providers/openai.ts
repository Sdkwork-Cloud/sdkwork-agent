/**
 * OpenAI Provider Implementation
 * Updated with latest GPT-5 series models (2025)
 */

import {
  LLMProvider,
  LLMProviderConfig,
  LLMRequest,
  LLMResponse,
  LLMStreamChunk,
} from '../provider.js';

export interface OpenAIConfig extends LLMProviderConfig {
  organization?: string;
  project?: string;
}

export class OpenAIProvider implements LLMProvider {
  readonly name = 'openai';
  readonly supportedModels = [
    // GPT-5.2 系列 (最新旗舰模型 - 2025)
    'gpt-5.2',
    'gpt-5.2-2025-01-28',
    'gpt-5.2-pro',
    'gpt-5.2-pro-2025-01-28',
    'gpt-5.2-codex',
    'gpt-5.2-codex-2025-01-28',

    // GPT-5.1 系列
    'gpt-5.1',
    'gpt-5.1-2025-01-28',
    'gpt-5.1-codex',
    'gpt-5.1-codex-2025-01-28',
    'gpt-5.1-codex-max',

    // GPT-5 系列
    'gpt-5',
    'gpt-5-2025-01-28',
    'gpt-5-pro',

    // GPT-5 Mini/Nano (轻量版)
    'gpt-5-mini',
    'gpt-5-mini-2025-01-28',
    'gpt-5-nano',
    'gpt-5-nano-2025-01-28',

    // GPT-4.1 系列
    'gpt-4.1',
    'gpt-4.1-2025-01-28',
    'gpt-4.1-mini',
    'gpt-4.1-nano',

    // GPT-4o 系列 (旧版但仍支持)
    'gpt-4o',
    'gpt-4o-2024-11-20',
    'gpt-4o-2024-08-06',
    'gpt-4o-mini',
    'gpt-4o-mini-2024-07-18',

    // o 系列 (推理模型)
    'o3',
    'o3-2025-01-28',
    'o3-pro',
    'o4-mini',
    'o4-mini-2025-01-28',
    'o1',
    'o1-2024-12-17',
    'o1-pro',

    // 开源模型
    'gpt-oss-120b',
    'gpt-oss-20b',

    // 专用模型
    'o3-deep-research',
    'o4-mini-deep-research',
    'computer-use-preview',
  ];

  private _apiKey: string;
  private _baseUrl: string;
  private _defaultParams: Partial<LLMRequest>;
  private _timeout: number;
  private _organization?: string;
  private _project?: string;

  constructor(config: OpenAIConfig) {
    this._apiKey = config.apiKey || '';
    this._baseUrl = config.baseUrl || 'https://api.openai.com/v1';
    this._defaultParams = config.defaultParams || {};
    this._timeout = config.timeout || 60000;
    this._organization = config.organization;
    this._project = config.project;
  }

  validateConfig(): boolean {
    return !!this._apiKey;
  }

  private async makeRequest(endpoint: string, body: unknown): Promise<Response> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${this._apiKey}`,
    };

    if (this._organization) {
      headers['OpenAI-Organization'] = this._organization;
    }
    if (this._project) {
      headers['OpenAI-Project'] = this._project;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this._timeout);

    try {
      const response = await fetch(`${this._baseUrl}${endpoint}`, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`OpenAI API error: ${response.status} - ${error}`);
      }

      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

  async complete(request: LLMRequest): Promise<LLMResponse> {
    const body = this.buildRequestBody(request);
    const response = await this.makeRequest('/chat/completions', body);
    const data = await response.json() as Record<string, unknown>;

    return this.parseResponse(data);
  }

  async *stream(request: LLMRequest): AsyncIterableIterator<LLMStreamChunk> {
    const body = this.buildRequestBody(request, true);
    const response = await this.makeRequest('/chat/completions', body);

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('No response body');
    }

    const decoder = new TextDecoder();
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') return;

            try {
              const chunk = JSON.parse(data);
              yield this.parseStreamChunk(chunk);
            } catch {
              // Ignore parse errors for malformed chunks
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }

  private buildRequestBody(request: LLMRequest, stream = false): Record<string, unknown> {
    return {
      model: request.model || this._defaultParams.model || 'gpt-5.2',
      messages: this.formatMessages(request.messages),
      temperature: request.temperature ?? this._defaultParams.temperature ?? 0.7,
      max_tokens: request.max_tokens ?? this._defaultParams.max_tokens,
      top_p: request.top_p ?? this._defaultParams.top_p ?? 1,
      stream,
      tools: request.tools,
      tool_choice: request.tool_choice,
    };
  }

  private formatMessages(
    messages: Array<{
      role: string;
      content: string;
      name?: string;
      tool_calls?: unknown;
      tool_call_id?: string;
    }>
  ): Array<Record<string, unknown>> {
    return messages.map(msg => {
      const formatted: Record<string, unknown> = {
        role: msg.role,
        content: msg.content,
      };
      if (msg.name) formatted.name = msg.name;
      if (msg.tool_calls) formatted.tool_calls = msg.tool_calls;
      if (msg.tool_call_id) formatted.tool_call_id = msg.tool_call_id;
      return formatted;
    });
  }

  private parseResponse(data: Record<string, unknown>): LLMResponse {
    const choice = (data.choices as Record<string, unknown>[])[0];
    const message = choice.message as Record<string, unknown>;

    return {
      id: data.id as string,
      model: data.model as string,
      content: (message.content as string) || '',
      role: 'assistant',
      tool_calls: message.tool_calls as LLMResponse['tool_calls'],
      usage: data.usage as LLMResponse['usage'],
      finish_reason: choice.finish_reason as LLMResponse['finish_reason'],
    };
  }

  private parseStreamChunk(data: Record<string, unknown>): LLMStreamChunk {
    const choice = (data.choices as Record<string, unknown>[])[0];
    const delta = choice.delta as Record<string, unknown>;

    return {
      id: data.id as string,
      model: data.model as string,
      delta: {
        content: delta.content as string | undefined,
        role: delta.role as 'assistant' | undefined,
        tool_calls: delta.tool_calls as LLMStreamChunk['delta']['tool_calls'],
      },
      finish_reason: choice.finish_reason as LLMStreamChunk['finish_reason'],
    };
  }
}

// Register provider
import { globalProviderRegistry } from '../provider.js';
globalProviderRegistry.register(
  'openai',
  (config: LLMProviderConfig) => new OpenAIProvider(config as OpenAIConfig)
);
