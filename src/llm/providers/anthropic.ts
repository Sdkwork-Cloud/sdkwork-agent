/**
 * Anthropic Claude Provider Implementation
 * Updated with Claude 4.5 series models (2025)
 */

import {
  LLMProvider,
  LLMProviderConfig as LLMProviderConfigType,
  LLMRequest,
  LLMResponse,
  LLMStreamChunk,
} from '../provider.js';

export interface AnthropicConfig extends LLMProviderConfigType {
  anthropicVersion?: string;
}

export class AnthropicProvider implements LLMProvider {
  readonly name = 'anthropic';
  readonly supportedModels = [
    // Claude 4.5 系列 (最新 - 2025)
    'claude-sonnet-4-5',
    'claude-sonnet-4-5-20250929',
    'claude-sonnet-4-5-latest',

    'claude-haiku-4-5',
    'claude-haiku-4-5-20251001',
    'claude-haiku-4-5-latest',

    'claude-opus-4-5',
    'claude-opus-4-5-20251101',
    'claude-opus-4-5-latest',

    // Claude 4.1/4.0 系列
    'claude-opus-4-1',
    'claude-opus-4-1-20250805',
    'claude-opus-4-1-latest',

    'claude-sonnet-4',
    'claude-sonnet-4-20250514',
    'claude-sonnet-4-0',
    'claude-sonnet-4-latest',

    // Claude 3.7 系列
    'claude-3-7-sonnet',
    'claude-3-7-sonnet-20250219',
    'claude-3-7-sonnet-latest',

    // Claude 3.5 系列 (旧版)
    'claude-3-5-sonnet',
    'claude-3-5-sonnet-20241022',
    'claude-3-5-sonnet-20240620',

    'claude-3-5-haiku',
    'claude-3-5-haiku-20241022',

    // Claude 3 系列 (旧版)
    'claude-3-opus',
    'claude-3-opus-20240229',
    'claude-3-opus-4',
    'claude-3-opus-4-20250514',

    'claude-3-sonnet',
    'claude-3-sonnet-20240229',

    'claude-3-haiku',
    'claude-3-haiku-20240307',
  ];

  private _apiKey: string;
  private _baseUrl: string;
  private _defaultParams: Partial<LLMRequest>;
  private _timeout: number;
  private _anthropicVersion: string;

  constructor(config: AnthropicConfig) {
    this._apiKey = config.apiKey || '';
    this._baseUrl = config.baseUrl || 'https://api.anthropic.com/v1';
    this._defaultParams = config.defaultParams || {};
    this._timeout = config.timeout || 60000;
    this._anthropicVersion = config.anthropicVersion || '2023-06-01';
  }

  validateConfig(): boolean {
    return !!this._apiKey;
  }

  private async makeRequest(endpoint: string, body: unknown): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this._timeout);

    try {
      const response = await fetch(`${this._baseUrl}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Api-Key': this._apiKey,
          'Anthropic-Version': this._anthropicVersion,
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Anthropic API error: ${response.status} - ${error}`);
      }

      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

  async complete(request: LLMRequest): Promise<LLMResponse> {
    const body = this.buildRequestBody(request);
    const response = await this.makeRequest('/messages', body);
    const data = await response.json() as Record<string, unknown>;

    return this.parseResponse(data);
  }

  async *stream(request: LLMRequest): AsyncIterableIterator<LLMStreamChunk> {
    const body = this.buildRequestBody(request, true);
    const response = await this.makeRequest('/messages', body);

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
              const event = JSON.parse(data);
              if (event.type === 'content_block_delta') {
                yield this.parseStreamChunk(event);
              }
            } catch {
              // Ignore parse errors
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }

  private buildRequestBody(request: LLMRequest, stream = false): Record<string, unknown> {
    const systemMessage = request.messages.find(m => m.role === 'system');
    const messages = request.messages.filter(m => m.role !== 'system');

    const body: Record<string, unknown> = {
      model: request.model || this._defaultParams.model || 'claude-sonnet-4-5-latest',
      messages: messages.map(msg => ({
        role: msg.role === 'assistant' ? 'assistant' : 'user',
        content: msg.content,
      })),
      max_tokens: request.max_tokens ?? this._defaultParams.max_tokens ?? 4096,
      stream,
    };

    if (systemMessage) {
      body.system = systemMessage.content;
    }

    if (request.temperature !== undefined) {
      body.temperature = request.temperature;
    }

    if (request.tools) {
      body.tools = request.tools.map(tool => ({
        name: tool.function.name,
        description: tool.function.description,
        input_schema: tool.function.parameters,
      }));
    }

    return body;
  }

  private parseResponse(data: Record<string, unknown>): LLMResponse {
    const content = (data.content as Array<Record<string, unknown>>) || [];
    const textContent = content.find(c => c.type === 'text');

    return {
      id: data.id as string,
      model: data.model as string,
      content: (textContent?.text as string) || '',
      role: 'assistant',
      usage: {
        prompt_tokens: (data.usage as Record<string, number>)?.input_tokens || 0,
        completion_tokens: (data.usage as Record<string, number>)?.output_tokens || 0,
        total_tokens:
          ((data.usage as Record<string, number>)?.input_tokens || 0) +
          ((data.usage as Record<string, number>)?.output_tokens || 0),
      },
      finish_reason: 'stop',
    };
  }

  private parseStreamChunk(event: Record<string, unknown>): LLMStreamChunk {
    return {
      id: event.id as string,
      model: event.model as string,
      delta: {
        content: (event.delta as Record<string, string>)?.text,
      },
    };
  }
}

// Register provider
import { globalProviderRegistry } from '../provider.js';
globalProviderRegistry.register(
  'anthropic',
  (config: LLMProviderConfigType) => new AnthropicProvider(config as AnthropicConfig)
);
