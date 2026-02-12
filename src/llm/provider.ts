/**
 * LLM Provider Interface
 * Supports various LLM providers: OpenAI, Anthropic, Google, local models, etc.
 */

// Message types for LLM communication
export interface LLMMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  name?: string;
  tool_calls?: ToolCall[];
  tool_call_id?: string;
}

export interface ToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string;
  };
}

// LLM Request configuration
export interface LLMRequest {
  messages: LLMMessage[];
  model?: string;
  temperature?: number;
  max_tokens?: number;
  top_p?: number;
  stream?: boolean;
  tools?: ToolDefinition[];
  tool_choice?: 'auto' | 'none' | { type: 'function'; function: { name: string } };
}

export interface ToolDefinition {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
}

// LLM Response
export interface LLMResponse {
  id: string;
  model: string;
  content: string;
  role: 'assistant';
  tool_calls?: ToolCall[];
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  finish_reason: 'stop' | 'length' | 'tool_calls' | 'content_filter';
}

// Streaming response chunk
export interface LLMStreamChunk {
  id: string;
  model: string;
  delta: {
    content?: string;
    role?: 'assistant';
    tool_calls?: ToolCall[];
  };
  finish_reason?: 'stop' | 'length' | 'tool_calls' | 'content_filter';
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

// Provider configuration
export interface LLMProviderConfig {
  apiKey?: string;
  baseUrl?: string;
  model?: string;
  defaultParams?: Partial<LLMRequest>;
  timeout?: number;
  retries?: number;
}

// Abstract LLM Provider interface
export interface LLMProvider {
  readonly name: string;
  readonly supportedModels: string[];

  complete(request: LLMRequest): Promise<LLMResponse>;
  stream(request: LLMRequest): AsyncIterableIterator<LLMStreamChunk>;
  validateConfig(): boolean;
}

// Provider factory type
export type LLMProviderFactory = (config: LLMProviderConfig) => LLMProvider;

// Provider registry
export class LLMProviderRegistry {
  private providers = new Map<string, LLMProviderFactory>();
  private instances = new Map<string, LLMProvider>();

  register(name: string, factory: LLMProviderFactory): void {
    this.providers.set(name, factory);
  }

  create(name: string, config: LLMProviderConfig): LLMProvider {
    const factory = this.providers.get(name);
    if (!factory) {
      throw new Error(`Unknown LLM provider: ${name}`);
    }
    const instance = factory(config);
    this.instances.set(name, instance);
    return instance;
  }

  get(name: string): LLMProvider | undefined {
    return this.instances.get(name);
  }

  listProviders(): string[] {
    return Array.from(this.providers.keys());
  }

  isRegistered(name: string): boolean {
    return this.providers.has(name);
  }
}

// Global provider registry
export const globalProviderRegistry = new LLMProviderRegistry();

// LLM Manager for handling multiple providers
export class LLMManager {
  private providers = new Map<string, LLMProvider>();
  private defaultProvider?: string;

  constructor(private registry: LLMProviderRegistry = globalProviderRegistry) {}

  addProvider(name: string, config: LLMProviderConfig): LLMProvider {
    const provider = this.registry.create(name, config);
    this.providers.set(name, provider);
    return provider;
  }

  setDefaultProvider(name: string): void {
    if (!this.providers.has(name)) {
      throw new Error(`Provider '${name}' not found. Add it first.`);
    }
    this.defaultProvider = name;
  }

  getProvider(name?: string): LLMProvider {
    const providerName = name || this.defaultProvider;
    if (!providerName) {
      throw new Error('No provider specified and no default provider set');
    }
    const provider = this.providers.get(providerName);
    if (!provider) {
      throw new Error(`Provider '${providerName}' not found`);
    }
    return provider;
  }

  async complete(request: LLMRequest, providerName?: string): Promise<LLMResponse> {
    const provider = this.getProvider(providerName);
    return provider.complete(request);
  }

  async *stream(request: LLMRequest, providerName?: string): AsyncIterableIterator<LLMStreamChunk> {
    const provider = this.getProvider(providerName);
    yield* provider.stream(request);
  }

  listProviders(): string[] {
    return Array.from(this.providers.keys());
  }
}
