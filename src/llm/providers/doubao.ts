/**
 * Doubao (豆包) Provider Implementation
 * API: https://console.volcengine.com/ark
 * Updated with latest Doubao 1.8 series models (2025)
 */

import {
  LLMProvider,
  LLMProviderConfig,
  LLMRequest,
  LLMResponse,
  LLMStreamChunk,
} from '../provider';

export interface DoubaoConfig extends LLMProviderConfig {
  region?: string;
}

export class DoubaoProvider implements LLMProvider {
  readonly name = 'doubao';
  readonly supportedModels = [
    // Doubao Seed 1.8 系列 (最新)
    'doubao-seed-1-8-251228',

    // Doubao 1.8 系列 (最新)
    'doubao-1.8-pro-32k',
    'doubao-1.8-pro-32k-20250128',
    'doubao-1.8-pro-32k-latest',

    'doubao-1.8-pro-256k',
    'doubao-1.8-pro-256k-20250128',
    'doubao-1.8-pro-256k-latest',

    'doubao-1.8-lite-32k',
    'doubao-1.8-lite-32k-20250128',
    'doubao-1.8-lite-32k-latest',

    'doubao-1.8-vision-pro-32k',
    'doubao-1.8-vision-pro-32k-20250128',
    'doubao-1.8-vision-pro-32k-latest',

    // Doubao 1.5 系列
    'doubao-1.5-pro-32k',
    'doubao-1.5-pro-32k-20250128',
    'doubao-1.5-pro-32k-latest',

    'doubao-1.5-pro-256k',
    'doubao-1.5-pro-256k-20250128',
    'doubao-1.5-pro-256k-latest',

    'doubao-1.5-lite-32k',
    'doubao-1.5-lite-32k-20250128',
    'doubao-1.5-lite-32k-latest',

    'doubao-1.5-vision-pro-32k',
    'doubao-1.5-vision-pro-32k-20250128',
    'doubao-1.5-vision-pro-32k-latest',

    // Doubao Pro 系列
    'doubao-pro-4k',
    'doubao-pro-4k-20250128',
    'doubao-pro-4k-latest',

    'doubao-pro-32k',
    'doubao-pro-32k-20250128',
    'doubao-pro-32k-latest',

    'doubao-pro-128k',
    'doubao-pro-128k-20250128',
    'doubao-pro-128k-latest',

    'doubao-pro-256k',
    'doubao-pro-256k-20250128',
    'doubao-pro-256k-latest',

    // Doubao Lite 系列
    'doubao-lite-4k',
    'doubao-lite-4k-20250128',
    'doubao-lite-4k-latest',

    'doubao-lite-32k',
    'doubao-lite-32k-20250128',
    'doubao-lite-32k-latest',

    'doubao-lite-128k',
    'doubao-lite-128k-20250128',
    'doubao-lite-128k-latest',

    // Doubao Vision 系列
    'doubao-vision-lite-32k',
    'doubao-vision-lite-32k-20250128',
    'doubao-vision-lite-32k-latest',

    'doubao-vision-pro-32k',
    'doubao-vision-pro-32k-20250128',
    'doubao-vision-pro-32k-latest',

    // 角色扮演系列
    'doubao-character-pro-32k',
    'doubao-character-pro-32k-20250128',
    'doubao-character-pro-32k-latest',

    'doubao-character-lite-32k',
    'doubao-character-lite-32k-20250128',
    'doubao-character-lite-32k-latest',

    // 语音模型
    'doubao-asr',
    'doubao-tts',

    // 嵌入模型
    'doubao-embedding',
    'doubao-embedding-large',
  ];

  private _apiKey: string;
  private _baseUrl: string;
  private _defaultParams: Partial<LLMRequest>;
  private _timeout: number;

  constructor(config: DoubaoConfig) {
    this._apiKey = config.apiKey || '';
    this._baseUrl = config.baseUrl || 'https://ark.cn-beijing.volces.com/api/v3';
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
        throw new Error(`Doubao API error: ${response.status} - ${error}`);
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
      model: request.model || this._defaultParams.model || 'doubao-1.8-pro-32k',
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
  'doubao',
  (config: LLMProviderConfig) => new DoubaoProvider(config as DoubaoConfig)
);
