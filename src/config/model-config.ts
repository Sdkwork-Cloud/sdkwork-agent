/**
 * Model Configuration - 模型配置管理
 *
 * 支持多提供商、多模型版本的完整配置系统
 * 基于2025年8月最新官方模型版本
 *
 * @module Config
 * @version 3.1.0
 */

// ============================================
// 支持的模型提供商
// ============================================

export type ModelProvider =
  | 'openai'
  | 'anthropic'
  | 'google'
  | 'moonshot'
  | 'minimax'
  | 'zhipu'
  | 'qwen'
  | 'deepseek'
  | 'doubao'
  | 'custom';

// ============================================
// 模型定义
// ============================================

export interface ModelDefinition {
  /** 模型 ID */
  id: string;
  /** 显示名称 */
  name: string;
  /** 提供商 */
  provider: ModelProvider;
  /** 模型版本 */
  version?: string;
  /** 上下文长度 */
  contextWindow: number;
  /** 最大输出 tokens */
  maxOutputTokens?: number;
  /** 是否支持工具调用 */
  supportsTools: boolean;
  /** 是否支持视觉 */
  supportsVision: boolean;
  /** 是否支持流式输出 */
  supportsStreaming: boolean;
  /** 是否支持 JSON 模式 */
  supportsJsonMode: boolean;
  /** 输入价格 (每 1M tokens) */
  inputPrice?: number;
  /** 输出价格 (每 1M tokens) */
  outputPrice?: number;
  /** 描述 */
  description?: string;
  /** 推荐用途 */
  recommendedFor?: string[];
}

// ============================================
// 提供商配置
// ============================================

export interface ProviderConfig {
  /** 提供商名称 */
  name: string;
  /** 显示名称 */
  displayName: string;
  /** 默认基础 URL */
  defaultBaseUrl?: string;
  /** 支持的模型 */
  models: ModelDefinition[];
  /** 是否需要 API Key */
  requiresApiKey: boolean;
  /** API Key 获取链接 */
  apiKeyUrl?: string;
  /** 文档链接 */
  docsUrl?: string;
}

// ============================================
// 用户模型配置
// ============================================

export interface UserModelConfig {
  /** 配置 ID */
  id: string;
  /** 配置名称 */
  name: string;
  /** 提供商 */
  provider: ModelProvider;
  /** 模型 ID */
  modelId: string;
  /** API Key */
  apiKey: string;
  /** 基础 URL (可选，用于自定义端点) */
  baseUrl?: string;
  /** 默认参数 */
  defaults?: {
    temperature?: number;
    maxTokens?: number;
    topP?: number;
    frequencyPenalty?: number;
    presencePenalty?: number;
  };
  /** 是否默认配置 */
  isDefault?: boolean;
  /** 创建时间 */
  createdAt: number;
  /** 更新时间 */
  updatedAt: number;
}

// ============================================
// 预定义的模型配置 (2025年8月最新官方版本)
// ============================================

export const PREDEFINED_PROVIDERS: Record<ModelProvider, ProviderConfig> = {
  openai: {
    name: 'openai',
    displayName: 'OpenAI',
    defaultBaseUrl: 'https://api.openai.com/v1',
    requiresApiKey: true,
    apiKeyUrl: 'https://platform.openai.com/api-keys',
    docsUrl: 'https://platform.openai.com/docs',
    models: [
      {
        id: 'gpt-5.3',
        name: 'GPT-5.3',
        provider: 'openai',
        contextWindow: 256000,
        maxOutputTokens: 32768,
        supportsTools: true,
        supportsVision: true,
        supportsStreaming: true,
        supportsJsonMode: true,
        inputPrice: 15,
        outputPrice: 60,
        description: 'Latest GPT-5.3 with 256K context and advanced reasoning',
        recommendedFor: ['complex reasoning', 'coding', 'long documents'],
      },
      {
        id: 'gpt-5.3-codex',
        name: 'GPT-5.3 Codex',
        provider: 'openai',
        contextWindow: 256000,
        maxOutputTokens: 32768,
        supportsTools: true,
        supportsVision: true,
        supportsStreaming: true,
        supportsJsonMode: true,
        inputPrice: 15,
        outputPrice: 60,
        description: 'Most advanced agentic coding model, 25% faster than 5.2',
        recommendedFor: ['coding', 'software development', 'code review'],
      },
      {
        id: 'gpt-5.2',
        name: 'GPT-5.2',
        provider: 'openai',
        contextWindow: 256000,
        maxOutputTokens: 32768,
        supportsTools: true,
        supportsVision: true,
        supportsStreaming: true,
        supportsJsonMode: true,
        inputPrice: 10,
        outputPrice: 40,
        description: 'GPT-5.2 with 256K context, 38% lower error rate',
        recommendedFor: ['professional work', 'document analysis', 'coding'],
      },
      {
        id: 'gpt-5.2-codex',
        name: 'GPT-5.2 Codex',
        provider: 'openai',
        contextWindow: 256000,
        maxOutputTokens: 32768,
        supportsTools: true,
        supportsVision: true,
        supportsStreaming: true,
        supportsJsonMode: true,
        inputPrice: 10,
        outputPrice: 40,
        description: 'Agentic coding model with long-range task handling',
        recommendedFor: ['coding', 'large-scale refactoring', 'windows dev'],
      },
      {
        id: 'gpt-5.1',
        name: 'GPT-5.1',
        provider: 'openai',
        contextWindow: 128000,
        maxOutputTokens: 16384,
        supportsTools: true,
        supportsVision: true,
        supportsStreaming: true,
        supportsJsonMode: true,
        inputPrice: 5,
        outputPrice: 15,
        description: 'Balanced performance and cost',
        recommendedFor: ['general tasks', 'writing', 'analysis'],
      },
      {
        id: 'gpt-5',
        name: 'GPT-5',
        provider: 'openai',
        contextWindow: 128000,
        maxOutputTokens: 16384,
        supportsTools: true,
        supportsVision: true,
        supportsStreaming: true,
        supportsJsonMode: true,
        inputPrice: 2.5,
        outputPrice: 10,
        description: 'Standard GPT-5 model',
        recommendedFor: ['everyday tasks', 'chat', 'content creation'],
      },
      {
        id: 'gpt-5-mini',
        name: 'GPT-5 Mini',
        provider: 'openai',
        contextWindow: 128000,
        maxOutputTokens: 16384,
        supportsTools: true,
        supportsVision: true,
        supportsStreaming: true,
        supportsJsonMode: true,
        inputPrice: 0.5,
        outputPrice: 2,
        description: 'Fast and cost-effective',
        recommendedFor: ['quick tasks', 'high volume', 'mobile apps'],
      },
      {
        id: 'gpt-4.1',
        name: 'GPT-4.1',
        provider: 'openai',
        contextWindow: 1047576,
        maxOutputTokens: 32768,
        supportsTools: true,
        supportsVision: true,
        supportsStreaming: true,
        supportsJsonMode: true,
        inputPrice: 2.0,
        outputPrice: 8.0,
        description: '1M context window model',
        recommendedFor: ['long documents', 'knowledge base'],
      },
      {
        id: 'o3',
        name: 'o3',
        provider: 'openai',
        contextWindow: 200000,
        maxOutputTokens: 100000,
        supportsTools: true,
        supportsVision: false,
        supportsStreaming: true,
        supportsJsonMode: true,
        inputPrice: 15,
        outputPrice: 60,
        description: 'Advanced reasoning model',
        recommendedFor: ['complex reasoning', 'math', 'science'],
      },
      {
        id: 'o4-mini',
        name: 'o4 Mini',
        provider: 'openai',
        contextWindow: 200000,
        maxOutputTokens: 100000,
        supportsTools: true,
        supportsVision: false,
        supportsStreaming: true,
        supportsJsonMode: true,
        inputPrice: 1.1,
        outputPrice: 4.4,
        description: 'Fast reasoning model',
        recommendedFor: ['quick reasoning', 'coding', 'math'],
      },
    ],
  },

  anthropic: {
    name: 'anthropic',
    displayName: 'Anthropic Claude',
    defaultBaseUrl: 'https://api.anthropic.com',
    requiresApiKey: true,
    apiKeyUrl: 'https://console.anthropic.com/settings/keys',
    docsUrl: 'https://docs.anthropic.com',
    models: [
      {
        id: 'claude-opus-4-6-20260205',
        name: 'Claude Opus 4.6',
        provider: 'anthropic',
        contextWindow: 200000,
        maxOutputTokens: 8192,
        supportsTools: true,
        supportsVision: true,
        supportsStreaming: true,
        supportsJsonMode: true,
        inputPrice: 15,
        outputPrice: 75,
        description: 'Latest Claude Opus 4.6 with enhanced agentic capabilities',
        recommendedFor: ['enterprise workflows', 'complex tasks', 'research'],
      },
      {
        id: 'claude-opus-4-5-20251101',
        name: 'Claude Opus 4.5',
        provider: 'anthropic',
        contextWindow: 200000,
        maxOutputTokens: 8192,
        supportsTools: true,
        supportsVision: true,
        supportsStreaming: true,
        supportsJsonMode: true,
        inputPrice: 7.5,
        outputPrice: 37.5,
        description: 'Best model for coding, agents, and computer use',
        recommendedFor: ['coding', 'agents', 'computer use', 'enterprise'],
      },
      {
        id: 'claude-sonnet-4-5-20250930',
        name: 'Claude Sonnet 4.5',
        provider: 'anthropic',
        contextWindow: 200000,
        maxOutputTokens: 8192,
        supportsTools: true,
        supportsVision: true,
        supportsStreaming: true,
        supportsJsonMode: true,
        inputPrice: 3,
        outputPrice: 15,
        description: 'Strong coding and reasoning capabilities',
        recommendedFor: ['coding', 'reasoning', 'general tasks'],
      },
      {
        id: 'claude-haiku-4-5-20251016',
        name: 'Claude Haiku 4.5',
        provider: 'anthropic',
        contextWindow: 200000,
        maxOutputTokens: 4096,
        supportsTools: true,
        supportsVision: true,
        supportsStreaming: true,
        supportsJsonMode: true,
        inputPrice: 1,
        outputPrice: 5,
        description: 'Fast, efficient, near-frontier performance at low cost',
        recommendedFor: ['quick tasks', 'high volume', 'real-time'],
      },
      {
        id: 'claude-3-7-sonnet-20250219',
        name: 'Claude 3.7 Sonnet',
        provider: 'anthropic',
        contextWindow: 200000,
        maxOutputTokens: 8192,
        supportsTools: true,
        supportsVision: true,
        supportsStreaming: true,
        supportsJsonMode: true,
        inputPrice: 3,
        outputPrice: 15,
        description: 'Hybrid reasoning with extended thinking mode',
        recommendedFor: ['complex reasoning', 'coding', 'analysis'],
      },
      {
        id: 'claude-3-5-sonnet-20241022',
        name: 'Claude 3.5 Sonnet',
        provider: 'anthropic',
        contextWindow: 200000,
        maxOutputTokens: 8192,
        supportsTools: true,
        supportsVision: true,
        supportsStreaming: true,
        supportsJsonMode: true,
        inputPrice: 3,
        outputPrice: 15,
        description: 'Intelligent and fast Claude model',
        recommendedFor: ['general tasks', 'coding', 'writing'],
      },
    ],
  },

  google: {
    name: 'google',
    displayName: 'Google Gemini',
    defaultBaseUrl: 'https://generativelanguage.googleapis.com/v1beta',
    requiresApiKey: true,
    apiKeyUrl: 'https://aistudio.google.com/app/apikey',
    docsUrl: 'https://ai.google.dev/gemini-api/docs',
    models: [
      {
        id: 'gemini-3.0-pro',
        name: 'Gemini 3.0 Pro',
        provider: 'google',
        contextWindow: 2097152,
        maxOutputTokens: 8192,
        supportsTools: true,
        supportsVision: true,
        supportsStreaming: true,
        supportsJsonMode: true,
        inputPrice: 3.5,
        outputPrice: 10.5,
        description: 'Latest Gemini 3.0 Pro with 2M context',
        recommendedFor: ['complex reasoning', 'long documents', 'coding'],
      },
      {
        id: 'gemini-3.0-flash',
        name: 'Gemini 3.0 Flash',
        provider: 'google',
        contextWindow: 1048576,
        maxOutputTokens: 8192,
        supportsTools: true,
        supportsVision: true,
        supportsStreaming: true,
        supportsJsonMode: true,
        inputPrice: 0.35,
        outputPrice: 1.05,
        description: 'Fast multimodal model with 1M context',
        recommendedFor: ['quick tasks', 'multimodal', 'high volume'],
      },
      {
        id: 'gemini-2.5-pro',
        name: 'Gemini 2.5 Pro',
        provider: 'google',
        contextWindow: 1048576,
        maxOutputTokens: 8192,
        supportsTools: true,
        supportsVision: true,
        supportsStreaming: true,
        supportsJsonMode: true,
        inputPrice: 1.25,
        outputPrice: 10,
        description: 'Gemini 2.5 Pro with advanced reasoning',
        recommendedFor: ['complex reasoning', 'coding', 'long documents'],
      },
      {
        id: 'gemini-2.5-flash',
        name: 'Gemini 2.5 Flash',
        provider: 'google',
        contextWindow: 1048576,
        maxOutputTokens: 8192,
        supportsTools: true,
        supportsVision: true,
        supportsStreaming: true,
        supportsJsonMode: true,
        inputPrice: 0.15,
        outputPrice: 0.6,
        description: 'Fast multimodal model with 1M context',
        recommendedFor: ['quick tasks', 'multimodal', 'high volume'],
      },
      {
        id: 'gemini-2.0-flash',
        name: 'Gemini 2.0 Flash',
        provider: 'google',
        contextWindow: 1048576,
        maxOutputTokens: 8192,
        supportsTools: true,
        supportsVision: true,
        supportsStreaming: true,
        supportsJsonMode: true,
        inputPrice: 0.1,
        outputPrice: 0.4,
        description: 'Fast multimodal model with 1M context',
        recommendedFor: ['multimodal tasks', 'long context', 'quick response'],
      },
      {
        id: 'gemini-1.5-pro',
        name: 'Gemini 1.5 Pro',
        provider: 'google',
        contextWindow: 2097152,
        maxOutputTokens: 8192,
        supportsTools: true,
        supportsVision: true,
        supportsStreaming: true,
        supportsJsonMode: true,
        inputPrice: 1.25,
        outputPrice: 5,
        description: 'Advanced reasoning with 2M context',
        recommendedFor: ['long documents', 'complex reasoning'],
      },
    ],
  },

  moonshot: {
    name: 'moonshot',
    displayName: 'Moonshot (月之暗面)',
    defaultBaseUrl: 'https://api.moonshot.cn/v1',
    requiresApiKey: true,
    apiKeyUrl: 'https://platform.moonshot.cn/console/api-keys',
    docsUrl: 'https://platform.moonshot.cn/docs',
    models: [
      {
        id: 'kimi-k2.5-0127-preview',
        name: 'Kimi K2.5',
        provider: 'moonshot',
        contextWindow: 256000,
        maxOutputTokens: 16384,
        supportsTools: true,
        supportsVision: true,
        supportsStreaming: true,
        supportsJsonMode: true,
        inputPrice: 10,
        outputPrice: 30,
        description: 'Latest Kimi K2.5 - Top open-source multimodal agent model',
        recommendedFor: ['agent tasks', 'coding', 'multimodal', 'long documents'],
      },
      {
        id: 'kimi-k2.5-thinking-0127-preview',
        name: 'Kimi K2.5 Thinking',
        provider: 'moonshot',
        contextWindow: 256000,
        maxOutputTokens: 16384,
        supportsTools: true,
        supportsVision: true,
        supportsStreaming: true,
        supportsJsonMode: true,
        inputPrice: 10,
        outputPrice: 30,
        description: 'Kimi K2.5 with thinking mode - Surpasses GPT-5.2 in coding',
        recommendedFor: ['complex reasoning', 'math', 'coding', 'analysis'],
      },
      {
        id: 'kimi-k2-0711-preview',
        name: 'Kimi K2',
        provider: 'moonshot',
        contextWindow: 256000,
        maxOutputTokens: 16384,
        supportsTools: true,
        supportsVision: true,
        supportsStreaming: true,
        supportsJsonMode: true,
        inputPrice: 10,
        outputPrice: 30,
        description: 'Kimi K2 with 256K context and tool calling (1T parameters)',
        recommendedFor: ['long documents', 'complex tasks', 'coding'],
      },
      {
        id: 'kimi-k2-thinking-0711-preview',
        name: 'Kimi K2 Thinking',
        provider: 'moonshot',
        contextWindow: 256000,
        maxOutputTokens: 16384,
        supportsTools: true,
        supportsVision: true,
        supportsStreaming: true,
        supportsJsonMode: true,
        inputPrice: 10,
        outputPrice: 30,
        description: 'Kimi K2 with thinking mode for complex reasoning',
        recommendedFor: ['complex reasoning', 'math', 'analysis'],
      },
      {
        id: 'kimi-k1.5-0711-preview',
        name: 'Kimi K1.5',
        provider: 'moonshot',
        contextWindow: 128000,
        maxOutputTokens: 16384,
        supportsTools: true,
        supportsVision: true,
        supportsStreaming: true,
        supportsJsonMode: true,
        inputPrice: 8,
        outputPrice: 24,
        description: 'Kimi K1.5 series with strong reasoning',
        recommendedFor: ['general tasks', 'coding', 'analysis'],
      },
      {
        id: 'moonshot-v1-128k',
        name: 'Moonshot v1 128K',
        provider: 'moonshot',
        contextWindow: 131072,
        maxOutputTokens: 8192,
        supportsTools: true,
        supportsVision: false,
        supportsStreaming: true,
        supportsJsonMode: true,
        inputPrice: 6,
        outputPrice: 18,
        description: '128K context version',
        recommendedFor: ['long documents', 'knowledge base'],
      },
      {
        id: 'moonshot-v1-32k',
        name: 'Moonshot v1 32K',
        provider: 'moonshot',
        contextWindow: 32768,
        maxOutputTokens: 8192,
        supportsTools: true,
        supportsVision: false,
        supportsStreaming: true,
        supportsJsonMode: true,
        inputPrice: 3,
        outputPrice: 9,
        description: '32K context version',
        recommendedFor: ['medium documents', 'multi-turn chat'],
      },
      {
        id: 'moonshot-v1-8k',
        name: 'Moonshot v1 8K',
        provider: 'moonshot',
        contextWindow: 8192,
        maxOutputTokens: 4096,
        supportsTools: true,
        supportsVision: false,
        supportsStreaming: true,
        supportsJsonMode: true,
        inputPrice: 1,
        outputPrice: 3,
        description: '8K context for short tasks',
        recommendedFor: ['short text', 'quick chat'],
      },
    ],
  },

  deepseek: {
    name: 'deepseek',
    displayName: 'DeepSeek',
    defaultBaseUrl: 'https://api.deepseek.com',
    requiresApiKey: true,
    apiKeyUrl: 'https://platform.deepseek.com/api_keys',
    docsUrl: 'https://platform.deepseek.com/docs',
    models: [
      {
        id: 'deepseek-v3.2',
        name: 'DeepSeek V3.2',
        provider: 'deepseek',
        contextWindow: 128000,
        maxOutputTokens: 8192,
        supportsTools: true,
        supportsVision: false,
        supportsStreaming: true,
        supportsJsonMode: true,
        inputPrice: 0.07,
        outputPrice: 0.14,
        description: 'DeepSeek V3.2 - Price reduced by 50%, 128K context',
        recommendedFor: ['chinese chat', 'coding', 'general tasks'],
      },
      {
        id: 'deepseek-v3.2-special',
        name: 'DeepSeek V3.2 Special',
        provider: 'deepseek',
        contextWindow: 128000,
        maxOutputTokens: 8192,
        supportsTools: true,
        supportsVision: false,
        supportsStreaming: true,
        supportsJsonMode: true,
        inputPrice: 0.07,
        outputPrice: 0.14,
        description: 'Enhanced reasoning version of V3.2',
        recommendedFor: ['complex reasoning', 'analysis'],
      },
      {
        id: 'deepseek-v3',
        name: 'DeepSeek V3',
        provider: 'deepseek',
        contextWindow: 64000,
        maxOutputTokens: 8192,
        supportsTools: true,
        supportsVision: false,
        supportsStreaming: true,
        supportsJsonMode: true,
        inputPrice: 0.5,
        outputPrice: 2,
        description: 'DeepSeek V3 - MoE architecture, 64K context',
        recommendedFor: ['chinese chat', 'coding', 'general tasks'],
      },
      {
        id: 'deepseek-r1',
        name: 'DeepSeek R1',
        provider: 'deepseek',
        contextWindow: 64000,
        maxOutputTokens: 8192,
        supportsTools: false,
        supportsVision: false,
        supportsStreaming: true,
        supportsJsonMode: false,
        inputPrice: 2,
        outputPrice: 8,
        description: 'Reasoning model with chain-of-thought',
        recommendedFor: ['complex reasoning', 'math', 'logic'],
      },
      {
        id: 'deepseek-coder',
        name: 'DeepSeek Coder',
        provider: 'deepseek',
        contextWindow: 64000,
        maxOutputTokens: 8192,
        supportsTools: true,
        supportsVision: false,
        supportsStreaming: true,
        supportsJsonMode: true,
        inputPrice: 0.5,
        outputPrice: 2,
        description: 'Code-specialized model',
        recommendedFor: ['coding', 'code review', 'debugging'],
      },
    ],
  },

  qwen: {
    name: 'qwen',
    displayName: 'Qwen (通义千问)',
    defaultBaseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    requiresApiKey: true,
    apiKeyUrl: 'https://dashscope.console.aliyun.com/apiKey',
    docsUrl: 'https://help.aliyun.com/dashscope',
    models: [
      {
        id: 'qwen3-max',
        name: 'Qwen3-Max',
        provider: 'qwen',
        contextWindow: 131072,
        maxOutputTokens: 8192,
        supportsTools: true,
        supportsVision: true,
        supportsStreaming: true,
        supportsJsonMode: true,
        inputPrice: 10,
        outputPrice: 30,
        description: 'Qwen3-Max 1T+ parameters MoE model, price reduced 50%',
        recommendedFor: ['complex tasks', 'multimodal', 'enterprise'],
      },
      {
        id: 'qwen3-max-thinking',
        name: 'Qwen3-Max Thinking',
        provider: 'qwen',
        contextWindow: 131072,
        maxOutputTokens: 8192,
        supportsTools: true,
        supportsVision: true,
        supportsStreaming: true,
        supportsJsonMode: true,
        inputPrice: 10,
        outputPrice: 30,
        description: 'Qwen3-Max with thinking mode for reasoning',
        recommendedFor: ['complex reasoning', 'math', 'coding'],
      },
      {
        id: 'qwen3-omni',
        name: 'Qwen3-Omni',
        provider: 'qwen',
        contextWindow: 131072,
        maxOutputTokens: 8192,
        supportsTools: true,
        supportsVision: true,
        supportsStreaming: true,
        supportsJsonMode: true,
        inputPrice: 15,
        outputPrice: 45,
        description: 'End-to-end native multimodal model',
        recommendedFor: ['multimodal', 'vision', 'audio', 'text'],
      },
      {
        id: 'qwen-max',
        name: 'Qwen Max',
        provider: 'qwen',
        contextWindow: 131072,
        maxOutputTokens: 8192,
        supportsTools: true,
        supportsVision: true,
        supportsStreaming: true,
        supportsJsonMode: true,
        inputPrice: 20,
        outputPrice: 60,
        description: 'Most powerful Qwen model (qwen-max-2025-01-25)',
        recommendedFor: ['complex tasks', 'multimodal'],
      },
      {
        id: 'qwen-plus',
        name: 'Qwen Plus',
        provider: 'qwen',
        contextWindow: 131072,
        maxOutputTokens: 8192,
        supportsTools: true,
        supportsVision: false,
        supportsStreaming: true,
        supportsJsonMode: true,
        inputPrice: 2,
        outputPrice: 6,
        description: 'Balanced performance and cost (qwen-plus-2025-01-25)',
        recommendedFor: ['daily tasks', 'long text'],
      },
      {
        id: 'qwen-turbo',
        name: 'Qwen Turbo',
        provider: 'qwen',
        contextWindow: 131072,
        maxOutputTokens: 8192,
        supportsTools: true,
        supportsVision: false,
        supportsStreaming: true,
        supportsJsonMode: true,
        inputPrice: 0.5,
        outputPrice: 2,
        description: 'High cost performance',
        recommendedFor: ['quick response', 'high concurrency'],
      },
      {
        id: 'qwen-long',
        name: 'Qwen Long',
        provider: 'qwen',
        contextWindow: 1000000,
        maxOutputTokens: 8192,
        supportsTools: true,
        supportsVision: false,
        supportsStreaming: true,
        supportsJsonMode: true,
        inputPrice: 5,
        outputPrice: 15,
        description: '1M context for long documents',
        recommendedFor: ['long documents', 'knowledge base'],
      },
      {
        id: 'qwq-32b-preview',
        name: 'QwQ (Preview)',
        provider: 'qwen',
        contextWindow: 32768,
        maxOutputTokens: 16384,
        supportsTools: false,
        supportsVision: false,
        supportsStreaming: true,
        supportsJsonMode: false,
        inputPrice: 10,
        outputPrice: 30,
        description: 'Qwen reasoning model',
        recommendedFor: ['complex reasoning', 'math', 'coding'],
      },
    ],
  },

  zhipu: {
    name: 'zhipu',
    displayName: 'Zhipu (智谱)',
    defaultBaseUrl: 'https://open.bigmodel.cn/api/paas/v4',
    requiresApiKey: true,
    apiKeyUrl: 'https://open.bigmodel.cn/usercenter/apikeys',
    docsUrl: 'https://open.bigmodel.cn/dev/howuse/glm-4',
    models: [
      {
        id: 'glm-4.5',
        name: 'GLM-4.5',
        provider: 'zhipu',
        contextWindow: 131072,
        maxOutputTokens: 4096,
        supportsTools: true,
        supportsVision: true,
        supportsStreaming: true,
        supportsJsonMode: true,
        inputPrice: 5,
        outputPrice: 15,
        description: 'Latest GLM-4.5 flagship model',
        recommendedFor: ['complex tasks', 'multimodal'],
      },
      {
        id: 'glm-4-plus',
        name: 'GLM-4 Plus',
        provider: 'zhipu',
        contextWindow: 131072,
        maxOutputTokens: 4096,
        supportsTools: true,
        supportsVision: true,
        supportsStreaming: true,
        supportsJsonMode: true,
        inputPrice: 5,
        outputPrice: 15,
        description: 'GLM-4 Plus - Price reduced 90% to 5 yuan/million',
        recommendedFor: ['complex tasks', 'multimodal'],
      },
      {
        id: 'glm-z1-air',
        name: 'GLM-Z1 Air',
        provider: 'zhipu',
        contextWindow: 131072,
        maxOutputTokens: 4096,
        supportsTools: true,
        supportsVision: false,
        supportsStreaming: true,
        supportsJsonMode: true,
        inputPrice: 0.5,
        outputPrice: 1.5,
        description: 'GLM-Z1 Air - 50 yuan per 100M tokens',
        recommendedFor: ['daily tasks', 'quick response'],
      },
      {
        id: 'glm-z1-airx',
        name: 'GLM-Z1 AirX',
        provider: 'zhipu',
        contextWindow: 131072,
        maxOutputTokens: 4096,
        supportsTools: true,
        supportsVision: false,
        supportsStreaming: true,
        supportsJsonMode: true,
        inputPrice: 5,
        outputPrice: 15,
        description: 'GLM-Z1 AirX - 500 yuan per 100M tokens, enhanced',
        recommendedFor: ['complex tasks', 'reasoning'],
      },
      {
        id: 'glm-4-flashx',
        name: 'GLM-4 FlashX',
        provider: 'zhipu',
        contextWindow: 131072,
        maxOutputTokens: 4096,
        supportsTools: true,
        supportsVision: false,
        supportsStreaming: true,
        supportsJsonMode: true,
        inputPrice: 0.1,
        outputPrice: 0.3,
        description: 'GLM-4 FlashX - 10 yuan per 100M tokens, ultra fast',
        recommendedFor: ['high volume', 'real-time'],
      },
      {
        id: 'glm-4-air',
        name: 'GLM-4 Air',
        provider: 'zhipu',
        contextWindow: 131072,
        maxOutputTokens: 4096,
        supportsTools: true,
        supportsVision: false,
        supportsStreaming: true,
        supportsJsonMode: true,
        inputPrice: 1,
        outputPrice: 3,
        description: 'High cost performance',
        recommendedFor: ['daily tasks', 'quick response'],
      },
      {
        id: 'glm-4-flash',
        name: 'GLM-4 Flash',
        provider: 'zhipu',
        contextWindow: 131072,
        maxOutputTokens: 4096,
        supportsTools: true,
        supportsVision: false,
        supportsStreaming: true,
        supportsJsonMode: true,
        inputPrice: 0.5,
        outputPrice: 1.5,
        description: 'Fast and cheap',
        recommendedFor: ['high volume', 'real-time'],
      },
      {
        id: 'glm-4-long',
        name: 'GLM-4 Long',
        provider: 'zhipu',
        contextWindow: 1000000,
        maxOutputTokens: 4096,
        supportsTools: true,
        supportsVision: false,
        supportsStreaming: true,
        supportsJsonMode: true,
        inputPrice: 5,
        outputPrice: 15,
        description: '1M context for long documents',
        recommendedFor: ['long documents', 'knowledge base'],
      },
      {
        id: 'glm-4v-plus',
        name: 'GLM-4V Plus',
        provider: 'zhipu',
        contextWindow: 8192,
        maxOutputTokens: 4096,
        supportsTools: true,
        supportsVision: true,
        supportsStreaming: true,
        supportsJsonMode: true,
        inputPrice: 10,
        outputPrice: 30,
        description: 'Vision-enhanced model',
        recommendedFor: ['vision tasks', 'multimodal'],
      },
    ],
  },

  doubao: {
    name: 'doubao',
    displayName: 'Doubao (豆包)',
    defaultBaseUrl: 'https://ark.cn-beijing.volces.com/api/v3',
    requiresApiKey: true,
    apiKeyUrl: 'https://console.volcengine.com/ark/region:ark+cn-beijing/apiKey',
    docsUrl: 'https://www.volcengine.com/docs/82379',
    models: [
      {
        id: 'doubao-1.8-pro-32k',
        name: 'Doubao 1.8 Pro 32K',
        provider: 'doubao',
        contextWindow: 32768,
        maxOutputTokens: 4096,
        supportsTools: true,
        supportsVision: false,
        supportsStreaming: true,
        supportsJsonMode: true,
        inputPrice: 8,
        outputPrice: 24,
        description: 'Doubao 1.8 Pro - Latest version with 50% gross margin',
        recommendedFor: ['professional tasks', 'chinese optimized'],
      },
      {
        id: 'doubao-1.8-pro-256k',
        name: 'Doubao 1.8 Pro 256K',
        provider: 'doubao',
        contextWindow: 262144,
        maxOutputTokens: 4096,
        supportsTools: true,
        supportsVision: false,
        supportsStreaming: true,
        supportsJsonMode: true,
        inputPrice: 16,
        outputPrice: 48,
        description: 'Doubao 1.8 Pro 256K context',
        recommendedFor: ['long documents', 'knowledge base'],
      },
      {
        id: 'doubao-1.8-lite-32k',
        name: 'Doubao 1.8 Lite 32K',
        provider: 'doubao',
        contextWindow: 32768,
        maxOutputTokens: 4096,
        supportsTools: true,
        supportsVision: false,
        supportsStreaming: true,
        supportsJsonMode: true,
        inputPrice: 2,
        outputPrice: 6,
        description: 'Doubao 1.8 Lite - Cost effective',
        recommendedFor: ['quick response', 'high concurrency'],
      },
      {
        id: 'doubao-1.5-pro-32k',
        name: 'Doubao 1.5 Pro 32K',
        provider: 'doubao',
        contextWindow: 32768,
        maxOutputTokens: 4096,
        supportsTools: true,
        supportsVision: false,
        supportsStreaming: true,
        supportsJsonMode: true,
        inputPrice: 6,
        outputPrice: 18,
        description: 'Doubao 1.5 Pro version',
        recommendedFor: ['professional tasks', 'chinese optimized'],
      },
      {
        id: 'doubao-1.5-pro-256k',
        name: 'Doubao 1.5 Pro 256K',
        provider: 'doubao',
        contextWindow: 262144,
        maxOutputTokens: 4096,
        supportsTools: true,
        supportsVision: false,
        supportsStreaming: true,
        supportsJsonMode: true,
        inputPrice: 12,
        outputPrice: 36,
        description: '256K context version',
        recommendedFor: ['long documents', 'knowledge base'],
      },
      {
        id: 'doubao-1.5-lite-32k',
        name: 'Doubao 1.5 Lite 32K',
        provider: 'doubao',
        contextWindow: 32768,
        maxOutputTokens: 4096,
        supportsTools: true,
        supportsVision: false,
        supportsStreaming: true,
        supportsJsonMode: true,
        inputPrice: 1.5,
        outputPrice: 4.5,
        description: 'Lightweight version',
        recommendedFor: ['quick response', 'high concurrency'],
      },
      {
        id: 'doubao-1.5-vision-pro-32k',
        name: 'Doubao 1.5 Vision Pro 32K',
        provider: 'doubao',
        contextWindow: 32768,
        maxOutputTokens: 4096,
        supportsTools: true,
        supportsVision: true,
        supportsStreaming: true,
        supportsJsonMode: true,
        inputPrice: 12,
        outputPrice: 36,
        description: 'Vision-enabled version',
        recommendedFor: ['vision tasks', 'multimodal'],
      },
    ],
  },

  minimax: {
    name: 'minimax',
    displayName: 'MiniMax',
    defaultBaseUrl: 'https://api.minimax.chat/v1',
    requiresApiKey: true,
    apiKeyUrl: 'https://platform.minimaxi.com/user-center/basic-information/interface-key',
    docsUrl: 'https://platform.minimaxi.com/document/announcement',
    models: [
      {
        id: 'minimax-m2',
        name: 'MiniMax M2',
        provider: 'minimax',
        contextWindow: 1000000,
        maxOutputTokens: 8192,
        supportsTools: true,
        supportsVision: true,
        supportsStreaming: true,
        supportsJsonMode: true,
        inputPrice: 1,
        outputPrice: 8,
        description: 'MiniMax M2 - Latest flagship model with 1M context',
        recommendedFor: ['complex tasks', 'multimodal', 'long documents'],
      },
      {
        id: 'minimax-m1',
        name: 'MiniMax M1',
        provider: 'minimax',
        contextWindow: 1000000,
        maxOutputTokens: 8192,
        supportsTools: true,
        supportsVision: false,
        supportsStreaming: true,
        supportsJsonMode: true,
        inputPrice: 0.8,
        outputPrice: 6.4,
        description: 'MiniMax M1 - Reasoning model (0.8-2.4 yuan/million based on context)',
        recommendedFor: ['complex reasoning', 'math', 'coding'],
      },
      {
        id: 'minimax-text-01',
        name: 'MiniMax Text-01',
        provider: 'minimax',
        contextWindow: 4000000,
        maxOutputTokens: 8192,
        supportsTools: true,
        supportsVision: false,
        supportsStreaming: true,
        supportsJsonMode: true,
        inputPrice: 1,
        outputPrice: 8,
        description: 'MiniMax Text-01 - 4M context with linear attention architecture',
        recommendedFor: ['ultra-long documents', 'knowledge base', 'research'],
      },
      {
        id: 'minimax-vl-01',
        name: 'MiniMax VL-01',
        provider: 'minimax',
        contextWindow: 4000000,
        maxOutputTokens: 8192,
        supportsTools: true,
        supportsVision: true,
        supportsStreaming: true,
        supportsJsonMode: true,
        inputPrice: 2,
        outputPrice: 16,
        description: 'MiniMax VL-01 - Vision-language model with 4M context',
        recommendedFor: ['multimodal', 'vision tasks', 'long documents'],
      },
      {
        id: 'abab6.5s-chat',
        name: 'MiniMax abab 6.5s',
        provider: 'minimax',
        contextWindow: 245760,
        maxOutputTokens: 4096,
        supportsTools: false,
        supportsVision: false,
        supportsStreaming: true,
        supportsJsonMode: true,
        inputPrice: 10,
        outputPrice: 10,
        description: 'abab 6.5s - Ultra-long context model (legacy naming)',
        recommendedFor: ['long documents', 'knowledge base'],
      },
      {
        id: 'abab6.5t-chat',
        name: 'MiniMax abab 6.5t',
        provider: 'minimax',
        contextWindow: 8192,
        maxOutputTokens: 4096,
        supportsTools: false,
        supportsVision: false,
        supportsStreaming: true,
        supportsJsonMode: true,
        inputPrice: 5,
        outputPrice: 5,
        description: 'abab 6.5t - Standard version (legacy naming)',
        recommendedFor: ['general tasks', 'chat'],
      },
    ],
  },

  custom: {
    name: 'custom',
    displayName: 'Custom Provider',
    requiresApiKey: true,
    models: [
      {
        id: 'custom',
        name: 'Custom Model',
        provider: 'custom',
        contextWindow: 4096,
        supportsTools: false,
        supportsVision: false,
        supportsStreaming: true,
        supportsJsonMode: false,
        description: 'Custom model configuration',
        recommendedFor: ['self-hosted', 'local models'],
      },
    ],
  },
};

// ============================================
// 便捷函数
// ============================================

/**
 * 获取所有支持的提供商
 */
export function getSupportedProviders(): ModelProvider[] {
  return Object.keys(PREDEFINED_PROVIDERS) as ModelProvider[];
}

/**
 * 获取提供商配置
 */
export function getProviderConfig(provider: ModelProvider): ProviderConfig {
  return PREDEFINED_PROVIDERS[provider];
}

/**
 * 获取模型定义
 */
export function getModelDefinition(provider: ModelProvider, modelId: string): ModelDefinition | undefined {
  const config = PREDEFINED_PROVIDERS[provider];
  return config.models.find(m => m.id === modelId);
}

/**
 * 获取提供商的所有模型
 */
export function getProviderModels(provider: ModelProvider): ModelDefinition[] {
  return PREDEFINED_PROVIDERS[provider].models;
}

/**
 * 获取默认模型
 */
export function getDefaultModel(provider: ModelProvider): ModelDefinition {
  return PREDEFINED_PROVIDERS[provider].models[0];
}

/**
 * 验证模型配置
 */
export function validateModelConfig(config: UserModelConfig): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!config.provider) {
    errors.push('Provider is required');
  }

  if (!config.modelId) {
    errors.push('Model ID is required');
  }

  if (!config.apiKey) {
    errors.push('API Key is required');
  }

  // 验证模型是否存在
  if (config.provider && config.modelId) {
    const model = getModelDefinition(config.provider, config.modelId);
    if (!model) {
      errors.push(`Model ${config.modelId} not found for provider ${config.provider}`);
    }
  }

  return { valid: errors.length === 0, errors };
}

/**
 * 转换为 LLM 配置格式
 */
export function toLLMConfig(userConfig: UserModelConfig): {
  provider: ModelProvider;
  apiKey: string;
  model: string;
  baseUrl?: string;
  defaults?: Record<string, number>;
} {
  const model = getModelDefinition(userConfig.provider, userConfig.modelId);
  const providerConfig = getProviderConfig(userConfig.provider);

  return {
    provider: userConfig.provider,
    apiKey: userConfig.apiKey,
    model: userConfig.modelId,
    baseUrl: userConfig.baseUrl || providerConfig.defaultBaseUrl,
    defaults: userConfig.defaults,
  };
}

export default {
  PREDEFINED_PROVIDERS,
  getSupportedProviders,
  getProviderConfig,
  getModelDefinition,
  getProviderModels,
  getDefaultModel,
  validateModelConfig,
  toLLMConfig,
};
