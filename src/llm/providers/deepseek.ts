/**
 * DeepSeek Provider Implementation
 * API: https://platform.deepseek.com
 * Updated with latest DeepSeek-V3.2 models (2025)
 */

import {
  LLMProvider,
  LLMProviderConfig,
  LLMRequest,
  LLMResponse,
  LLMStreamChunk,
} from '../provider';

export interface DeepSeekConfig extends LLMProviderConfig {}

export class DeepSeekProvider implements LLMProvider {
  readonly name = 'deepseek';
  readonly supportedModels = [
    // DeepSeek-V3.2 系列 (最新)
    'deepseek-v3.2',
    'deepseek-v3.2-20251201',
    'deepseek-v3.2-latest',

    'deepseek-v3.2-exp',
    'deepseek-v3.2-exp-20250929',

    // DeepSeek-V3.1 系列
    'deepseek-v3.1',
    'deepseek-v3.1-20250922',
    'deepseek-v3.1-20250821',
    'deepseek-v3.1-latest',

    // DeepSeek-V3 系列
    'deepseek-v3',
    'deepseek-v3-20250325',
    'deepseek-v3-20241226',
    'deepseek-v3-latest',

    // DeepSeek-R1 系列 (推理模型)
    'deepseek-r1',
    'deepseek-r1-20250528',
    'deepseek-r1-20250120',
    'deepseek-r1-latest',

    // DeepSeek-R1-Lite 系列
    'deepseek-r1-lite',
    'deepseek-r1-lite-20241120',
    'deepseek-r1-lite-latest',

    // DeepSeek-V2.5 系列
    'deepseek-v2.5',
    'deepseek-v2.5-1210',
    'deepseek-v2.5-20240905',
    'deepseek-v2.5-latest',

    // DeepSeek-V2 系列
    'deepseek-v2',
    'deepseek-v2-20250128',
    'deepseek-v2-20240802',
    'deepseek-v2-latest',

    // DeepSeek-Coder-V2 系列
    'deepseek-coder-v2',
    'deepseek-coder-v2-20250128',
    'deepseek-coder-v2-20240725',
    'deepseek-coder-v2-latest',

    // DeepSeek-Coder 系列
    'deepseek-coder',
    'deepseek-coder-20250128',
    'deepseek-coder-6.7b',
    'deepseek-coder-33b',
    'deepseek-coder-latest',

    // 别名 (API 兼容)
    'deepseek-chat',
    'deepseek-reasoner',
  ];

  private _apiKey: string;
  private _baseUrl: string;
  private _defaultParams: Partial<LLMRequest>;
  private _timeout: number;

  constructor(config: DeepSeekConfig) {
    this._apiKey = config.apiKey || '';
    this._baseUrl = config.baseUrl || 'https://api.deepseek.com';
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
        throw new Error(`DeepSeek API error: ${response.status} - ${error}`);
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
    const data = await response.json();

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
      model: request.model || this._defaultParams.model || 'deepseek-v3.2',
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
import { globalProviderRegistry } from '../provider';
globalProviderRegistry.register(
  'deepseek',
  (config: LLMProviderConfig) => new DeepSeekProvider(config as DeepSeekConfig)
);
