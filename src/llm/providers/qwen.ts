/**
 * Qwen (通义千问) Provider Implementation
 * API: https://dashscope.aliyun.com
 * Updated with latest Qwen3 series models (2025)
 */

import {
  LLMProvider,
  LLMProviderConfig,
  LLMRequest,
  LLMResponse,
  LLMStreamChunk,
} from '../provider.js';

export interface QwenConfig extends LLMProviderConfig {}

export class QwenProvider implements LLMProvider {
  readonly name = 'qwen';
  readonly supportedModels = [
    // Qwen3 Max 系列 (最新旗舰)
    'qwen3-max',
    'qwen3-max-2026-01-23',
    'qwen3-max-2025-09-23',
    'qwen3-max-latest',
    'qwen3-max-preview',

    // Qwen3 Plus 系列
    'qwen3-plus',
    'qwen3-plus-2025-12-01',
    'qwen3-plus-2025-09-11',
    'qwen3-plus-2025-07-28',
    'qwen3-plus-2025-07-14',
    'qwen3-plus-2025-04-28',
    'qwen3-plus-latest',

    // Qwen3 Flash 系列
    'qwen3-flash',
    'qwen3-flash-2025-07-28',
    'qwen3-flash-latest',

    // Qwen3 Omni 系列 (多模态)
    'qwen3-omni-flash',
    'qwen3-omni-flash-2025-12-01',
    'qwen3-omni-flash-2025-09-15',
    'qwen3-omni-flash-realtime',
    'qwen3-omni-flash-realtime-2025-12-01',
    'qwen3-omni-flash-realtime-2025-09-15',

    // Qwen3 VL 系列 (视觉)
    'qwen3-vl-plus',
    'qwen3-vl-plus-2025-12-19',
    'qwen3-vl-plus-2025-09-23',
    'qwen3-vl-flash',
    'qwen3-vl-flash-2026-01-22',
    'qwen3-vl-flash-2025-10-15',

    // Qwen Max 系列 (旧版)
    'qwen-max',
    'qwen-max-2025-01-25',
    'qwen-max-2024-09-19',
    'qwen-max-latest',

    // Qwen Plus 系列 (旧版)
    'qwen-plus',
    'qwen-plus-2025-01-25',
    'qwen-plus-2025-01-12',
    'qwen-plus-2024-12-20',
    'qwen-plus-2024-11-27',
    'qwen-plus-2024-11-25',
    'qwen-plus-2024-09-19',
    'qwen-plus-2024-08-06',
    'qwen-plus-2024-07-23',
    'qwen-plus-latest',

    // Qwen Turbo 系列 (旧版)
    'qwen-turbo',
    'qwen-turbo-2025-04-28',
    'qwen-turbo-2025-02-11',
    'qwen-turbo-2024-11-01',
    'qwen-turbo-2024-09-19',
    'qwen-turbo-2024-06-24',
    'qwen-turbo-latest',

    // Qwen Long 系列 (长上下文)
    'qwen-long',
    'qwen-long-2025-01-25',
    'qwen-long-latest',

    // QwQ 推理模型
    'qwq-plus',
    'qwq-plus-2025-05-15',
    'qwq-plus-2025-03-05',
    'qwq-plus-latest',

    // QVQ 视觉推理
    'qvq-max',
    'qvq-max-2025-05-15',
    'qvq-max-2025-03-25',
    'qvq-plus',
    'qvq-plus-2025-05-15',

    // Qwen VL 系列 (视觉旧版)
    'qwen-vl-max',
    'qwen-vl-max-2025-08-13',
    'qwen-vl-max-2025-04-08',
    'qwen-vl-max-2025-04-02',
    'qwen-vl-max-2025-01-25',
    'qwen-vl-max-2024-12-30',
    'qwen-vl-max-2024-11-19',
    'qwen-vl-max-2024-10-30',
    'qwen-vl-max-2024-08-09',
    'qwen-vl-max-latest',

    'qwen-vl-plus',
    'qwen-vl-plus-2025-08-15',
    'qwen-vl-plus-2025-07-10',
    'qwen-vl-plus-2025-05-07',
    'qwen-vl-plus-2025-01-25',
    'qwen-vl-plus-2025-01-02',
    'qwen-vl-plus-2024-08-09',
    'qwen-vl-plus-latest',

    // Qwen OCR
    'qwen-vl-ocr',
    'qwen-vl-ocr-2025-11-20',
    'qwen-vl-ocr-2025-08-28',
    'qwen-vl-ocr-2025-04-13',
    'qwen-vl-ocr-2024-10-28',
    'qwen-vl-ocr-latest',

    // Qwen Audio
    'qwen-audio-turbo',
    'qwen-audio-turbo-2024-12-04',
    'qwen-audio-turbo-2024-08-07',
    'qwen-audio-turbo-latest',

    // 嵌入模型
    'text-embedding-v3',
    'text-embedding-v2',
    'text-embedding-v1',
  ];

  private _apiKey: string;
  private _baseUrl: string;
  private _defaultParams: Partial<LLMRequest>;
  private _timeout: number;

  constructor(config: QwenConfig) {
    this._apiKey = config.apiKey || '';
    this._baseUrl = config.baseUrl || 'https://dashscope.aliyuncs.com/api/v1';
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
        throw new Error(`Qwen API error: ${response.status} - ${error}`);
      }

      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

  async complete(request: LLMRequest): Promise<LLMResponse> {
    const body = this.buildRequestBody(request);
    const response = await this.makeRequest('/services/aigc/text-generation/generation', body);
    const data = await response.json() as Record<string, unknown>;

    return this.parseResponse(data);
  }

  async *stream(request: LLMRequest): AsyncIterableIterator<LLMStreamChunk> {
    const body = this.buildRequestBody(request, true);
    const response = await this.makeRequest('/services/aigc/text-generation/generation', body);

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

  private buildRequestBody(request: LLMRequest, _stream = false): Record<string, unknown> {
    return {
      model: request.model || this._defaultParams.model || 'qwen3-max',
      input: {
        messages: request.messages,
      },
      parameters: {
        temperature: request.temperature ?? this._defaultParams.temperature ?? 0.7,
        max_tokens: request.max_tokens ?? this._defaultParams.max_tokens ?? 4096,
        top_p: request.top_p ?? this._defaultParams.top_p ?? 1,
        result_format: 'message',
      },
    };
  }

  private parseResponse(data: Record<string, unknown>): LLMResponse {
    const output = data.output as Record<string, unknown>;
    const choice = (output.choices as Record<string, unknown>[])[0];
    const message = choice.message as Record<string, unknown>;
    const usage = data.usage as Record<string, number>;

    return {
      id: data.request_id as string,
      model: data.model as string,
      content: (message.content as string) || '',
      role: 'assistant',
      usage: {
        prompt_tokens: usage?.input_tokens || 0,
        completion_tokens: usage?.output_tokens || 0,
        total_tokens: (usage?.input_tokens || 0) + (usage?.output_tokens || 0),
      },
      finish_reason: choice.finish_reason as LLMResponse['finish_reason'],
    };
  }

  private parseStreamChunk(data: Record<string, unknown>): LLMStreamChunk {
    const output = data.output as Record<string, unknown>;
    const choice = (output.choices as Record<string, unknown>[])[0];
    const message = choice.message as Record<string, unknown>;

    return {
      id: data.request_id as string,
      model: data.model as string,
      delta: {
        content: message.content as string | undefined,
        role: message.role as 'assistant' | undefined,
      },
      finish_reason: choice.finish_reason as LLMStreamChunk['finish_reason'],
    };
  }
}

// Register provider
import { globalProviderRegistry } from '../provider.js';
globalProviderRegistry.register(
  'qwen',
  (config: LLMProviderConfig) => new QwenProvider(config as QwenConfig)
);
