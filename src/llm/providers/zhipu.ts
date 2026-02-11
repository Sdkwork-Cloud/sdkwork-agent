/**
 * Zhipu AI (智谱AI) Provider Implementation
 * API: https://open.bigmodel.cn
 */

import {
  LLMProvider,
  LLMProviderConfig,
  LLMRequest,
  LLMResponse,
  LLMStreamChunk,
} from '../provider.js';

export interface ZhipuConfig extends LLMProviderConfig {}

export class ZhipuProvider implements LLMProvider {
  readonly name = 'zhipu';
  readonly supportedModels = [
    // GLM-4.5 系列 (最新)
    'glm-4.5',
    'glm-4.5-20250128',
    'glm-4.5-latest',

    // GLM-4 系列
    'glm-4',
    'glm-4-20250128',
    'glm-4-latest',
    'glm-4-plus',
    'glm-4-plus-20250128',
    'glm-4-flash',
    'glm-4-flash-20250128',
    'glm-4-air',
    'glm-4-air-20250128',
    'glm-4-airx',
    'glm-4-airx-20250128',
    'glm-4-long',
    'glm-4-long-20250128',
    'glm-4-alltools',
    'glm-4-alltools-20250128',

    // GLM-3 系列
    'glm-3-turbo',
    'glm-3-turbo-20250128',
    'glm-3-turbo-latest',

    // ChatGLM3 系列
    'chatglm3-6b',
    'chatglm3-6b-32k',

    // 代码模型
    'codegeex-4',
    'codegeex-4-20250128',

    // 视觉模型
    'glm-4v',
    'glm-4v-20250128',
    'glm-4v-plus',
    'glm-4v-plus-20250128',

    // 嵌入模型
    'embedding-3',
    'embedding-2',
  ];

  private _apiKey: string;
  private _baseUrl: string;
  private _defaultParams: Partial<LLMRequest>;
  private _timeout: number;

  constructor(config: ZhipuConfig) {
    this._apiKey = config.apiKey || '';
    this._baseUrl = config.baseUrl || 'https://open.bigmodel.cn/api/paas/v4';
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
        throw new Error(`Zhipu API error: ${response.status} - ${error}`);
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
      model: request.model || this._defaultParams.model || 'glm-4.5',
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
  'zhipu',
  (config: LLMProviderConfig) => new ZhipuProvider(config as ZhipuConfig)
);
