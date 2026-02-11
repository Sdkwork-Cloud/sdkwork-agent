/**
 * Moonshot (月之暗面) Provider Implementation
 * API: https://platform.moonshot.cn
 */

import {
  LLMProvider,
  LLMProviderConfig,
  LLMRequest,
  LLMResponse,
  LLMStreamChunk,
} from '../provider.js';

export interface MoonshotConfig extends LLMProviderConfig {}

export class MoonshotProvider implements LLMProvider {
  readonly name = 'moonshot';
  readonly supportedModels = [
    // Kimi K2.5 系列 (最新旗舰)
    'kimi-k2.5',
    'kimi-k2.5-20250128',
    'kimi-k2.5-latest',

    // Kimi K2 系列
    'kimi-k2',
    'kimi-k2-20250128',
    'kimi-k2-latest',

    // Kimi K1.5 系列
    'kimi-k1.5',
    'kimi-k1.5-20250128',
    'kimi-k1.5-latest',

    // Kimi K1 系列
    'kimi-k1',
    'kimi-k1-20250128',
    'kimi-k1-latest',

    // Kimi 标准系列
    'kimi-latest',
    'kimi-2025-01-28',

    // 上下文长度版本
    'moonshot-v1-128k',
    'moonshot-v1-32k',
    'moonshot-v1-8k',
  ];

  private _apiKey: string;
  private _baseUrl: string;
  private _defaultParams: Partial<LLMRequest>;
  private _timeout: number;

  constructor(config: MoonshotConfig) {
    this._apiKey = config.apiKey || '';
    this._baseUrl = config.baseUrl || 'https://api.moonshot.cn/v1';
    this._defaultParams = config.defaultParams || {};
    this._timeout = config.timeout || 60000;
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
          Authorization: `Bearer ${this._apiKey}`,
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Moonshot API error: ${response.status} - ${error}`);
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
    return {
      model: request.model || this._defaultParams.model || 'kimi-k2.5',
      messages: request.messages,
      temperature: request.temperature ?? this._defaultParams.temperature ?? 0.7,
      max_tokens: request.max_tokens ?? this._defaultParams.max_tokens ?? 4096,
      top_p: request.top_p ?? this._defaultParams.top_p ?? 1,
      stream,
    };
  }

  private parseResponse(data: Record<string, unknown>): LLMResponse {
    const choice = (data.choices as Record<string, unknown>[])[0];
    const message = choice.message as Record<string, unknown>;

    return {
      id: data.id as string,
      model: data.model as string,
      content: (message.content as string) || '',
      role: 'assistant',
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
      },
      finish_reason: choice.finish_reason as LLMStreamChunk['finish_reason'],
    };
  }
}

// Register provider
import { globalProviderRegistry } from '../provider.js';
globalProviderRegistry.register(
  'moonshot',
  (config: LLMProviderConfig) => new MoonshotProvider(config as MoonshotConfig)
);
