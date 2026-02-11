/**
 * Google Gemini Provider Implementation
 * Updated with Gemini 2.0/3.0 series models (2025)
 */

import {
  LLMProvider,
  LLMProviderConfig as LLMProviderConfigType,
  LLMRequest,
  LLMResponse,
  LLMStreamChunk,
} from '../provider.js';

export interface GeminiConfig extends LLMProviderConfigType {
  apiVersion?: string;
}

export class GeminiProvider implements LLMProvider {
  readonly name = 'gemini';
  readonly supportedModels = [
    // Gemini 3.0 系列 (最新 - 2025)
    'gemini-3.0-pro',
    'gemini-3.0-pro-001',
    'gemini-3.0-pro-latest',
    'gemini-3.0-pro-exp',

    'gemini-3.0-flash',
    'gemini-3.0-flash-001',
    'gemini-3.0-flash-latest',
    'gemini-3.0-flash-exp',

    'gemini-3.0-ultra',
    'gemini-3.0-ultra-001',
    'gemini-3.0-ultra-latest',

    // Gemini 2.5 系列
    'gemini-2.5-pro',
    'gemini-2.5-pro-001',
    'gemini-2.5-pro-latest',
    'gemini-2.5-pro-exp',

    'gemini-2.5-flash',
    'gemini-2.5-flash-001',
    'gemini-2.5-flash-latest',

    // Gemini 2.0 系列
    'gemini-2.0-flash',
    'gemini-2.0-flash-001',
    'gemini-2.0-flash-latest',
    'gemini-2.0-flash-exp',
    'gemini-2.0-flash-lite',
    'gemini-2.0-flash-thinking-exp',
    'gemini-2.0-flash-thinking-exp-01-21',

    'gemini-2.0-pro',
    'gemini-2.0-pro-001',
    'gemini-2.0-pro-latest',
    'gemini-2.0-pro-exp',
    'gemini-2.0-pro-exp-02-05',

    'gemini-2.0-ultra',
    'gemini-2.0-ultra-001',
    'gemini-2.0-ultra-latest',

    // Gemini 1.5 系列 (旧版)
    'gemini-1.5-flash',
    'gemini-1.5-flash-002',
    'gemini-1.5-flash-8b',
    'gemini-1.5-flash-8b-latest',
    'gemini-1.5-flash-8b-001',
    'gemini-1.5-flash-latest',

    'gemini-1.5-pro',
    'gemini-1.5-pro-002',
    'gemini-1.5-pro-latest',

    'gemini-1.5-ultra',

    // Gemini 1.0 系列 (旧版)
    'gemini-1.0-pro',
    'gemini-1.0-pro-002',
    'gemini-1.0-pro-vision-latest',
    'gemini-1.0-pro-vision',
  ];

  private _apiKey: string;
  private _baseUrl: string;
  private _defaultParams: Partial<LLMRequest>;
  private _timeout: number;
  private _apiVersion: string;

  constructor(config: GeminiConfig) {
    this._apiKey = config.apiKey || '';
    this._baseUrl = config.baseUrl || 'https://generativelanguage.googleapis.com';
    this._defaultParams = config.defaultParams || {};
    this._timeout = config.timeout || 60000;
    this._apiVersion = config.apiVersion || 'v1beta';
  }

  validateConfig(): boolean {
    return !!this._apiKey;
  }

  private async makeRequest(endpoint: string, body: unknown): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this._timeout);

    try {
      const response = await fetch(
        `${this._baseUrl}/${this._apiVersion}/${endpoint}?key=${this._apiKey}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(body),
          signal: controller.signal,
        }
      );

      clearTimeout(timeoutId);

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Gemini API error: ${response.status} - ${error}`);
      }

      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

  async complete(request: LLMRequest): Promise<LLMResponse> {
    const model = request.model || this._defaultParams.model || 'gemini-3.0-flash';
    const body = this.buildRequestBody(request);
    const response = await this.makeRequest(`models/${model}:generateContent`, body);
    const data = await response.json() as Record<string, unknown>;

    return this.parseResponse(data, model);
  }

  async *stream(request: LLMRequest): AsyncIterableIterator<LLMStreamChunk> {
    const model = request.model || this._defaultParams.model || 'gemini-3.0-flash';
    const body = this.buildRequestBody(request);
    const response = await this.makeRequest(`models/${model}:streamGenerateContent`, body);

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
          if (line.trim()) {
            try {
              const event = JSON.parse(line);
              yield this.parseStreamChunk(event, model);
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

  private buildRequestBody(request: LLMRequest): Record<string, unknown> {
    const systemMessage = request.messages.find(m => m.role === 'system');
    const messages = request.messages.filter(m => m.role !== 'system');

    const contents = messages.map(msg => ({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.content }],
    }));

    const body: Record<string, unknown> = {
      contents,
      generationConfig: {
        temperature: request.temperature ?? this._defaultParams.temperature ?? 0.7,
        maxOutputTokens: request.max_tokens ?? this._defaultParams.max_tokens ?? 2048,
        topP: request.top_p ?? this._defaultParams.top_p ?? 0.95,
      },
    };

    if (systemMessage) {
      body.systemInstruction = {
        parts: [{ text: systemMessage.content }],
      };
    }

    if (request.tools) {
      body.tools = [
        {
          functionDeclarations: request.tools.map(tool => ({
            name: tool.function.name,
            description: tool.function.description,
            parameters: tool.function.parameters,
          })),
        },
      ];
    }

    return body;
  }

  private parseResponse(data: Record<string, unknown>, model: string): LLMResponse {
    const candidates = (data.candidates as Array<Record<string, unknown>>) || [];
    const firstCandidate = candidates[0];
    const content = firstCandidate?.content as Record<string, unknown>;
    const parts = (content?.parts as Array<Record<string, unknown>>) || [];
    const textPart = parts.find(p => p.text);

    return {
      id: data.id as string,
      model,
      content: (textPart?.text as string) || '',
      role: 'assistant',
      usage: {
        prompt_tokens: (data.usageMetadata as Record<string, number>)?.promptTokenCount || 0,
        completion_tokens:
          (data.usageMetadata as Record<string, number>)?.candidatesTokenCount || 0,
        total_tokens: (data.usageMetadata as Record<string, number>)?.totalTokenCount || 0,
      },
      finish_reason: firstCandidate?.finishReason === 'STOP' ? 'stop' : 'length',
    };
  }

  private parseStreamChunk(event: Record<string, unknown>, model: string): LLMStreamChunk {
    const candidates = (event.candidates as Array<Record<string, unknown>>) || [];
    const firstCandidate = candidates[0];
    const content = firstCandidate?.content as Record<string, unknown>;
    const parts = (content?.parts as Array<Record<string, unknown>>) || [];
    const textPart = parts.find(p => p.text);

    return {
      id: event.id as string,
      model,
      delta: {
        content: textPart?.text as string | undefined,
      },
      finish_reason: firstCandidate?.finishReason === 'STOP' ? 'stop' : undefined,
    };
  }
}

// Register provider
import { globalProviderRegistry } from '../provider.js';
globalProviderRegistry.register(
  'gemini',
  (config: LLMProviderConfigType) => new GeminiProvider(config as GeminiConfig)
);
