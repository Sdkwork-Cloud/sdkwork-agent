import type { ModelProvider } from '../config/model-config.js';

export interface ProviderDisplayInfo {
  icon: string;
  description: string;
  recommended: boolean;
}

const PROVIDER_DISPLAY_MAP: Record<string, ProviderDisplayInfo> = {
  openai: {
    icon: '🔵',
    description: 'OpenAI GPT系列模型',
    recommended: true,
  },
  anthropic: {
    icon: '🟣',
    description: 'Anthropic Claude系列模型',
    recommended: false,
  },
  google: {
    icon: '🟢',
    description: 'Google Gemini系列模型',
    recommended: false,
  },
  moonshot: {
    icon: '🌙',
    description: '月之暗面 Moonshot AI',
    recommended: false,
  },
  deepseek: {
    icon: '🔷',
    description: 'DeepSeek V3/R1模型',
    recommended: true,
  },
  qwen: {
    icon: '🐰',
    description: '阿里云通义千问',
    recommended: false,
  },
  zhipu: {
    icon: '🦁',
    description: '智谱GLM系列模型',
    recommended: false,
  },
  doubao: {
    icon: '🐻',
    description: '字节跳动豆包模型',
    recommended: false,
  },
  minimax: {
    icon: '🧡',
    description: 'MiniMax海螺AI',
    recommended: false,
  },
};

export function getProviderIcon(provider: string | undefined): string {
  return PROVIDER_DISPLAY_MAP[provider || '']?.icon || '📦';
}

export function getProviderDescription(provider: string | undefined): string {
  return PROVIDER_DISPLAY_MAP[provider || '']?.description || '';
}

export function isProviderRecommended(provider: string | undefined): boolean {
  return PROVIDER_DISPLAY_MAP[provider || '']?.recommended || false;
}

export function getProviderDisplayInfo(provider: string | undefined): ProviderDisplayInfo {
  return PROVIDER_DISPLAY_MAP[provider || ''] || {
    icon: '📦',
    description: '',
    recommended: false,
  };
}

export function maskApiKey(apiKey: string | undefined): string {
  if (!apiKey) return '未设置';
  if (apiKey.length <= 8) return '****';
  return apiKey.substring(0, 4) + '****' + apiKey.substring(apiKey.length - 4);
}

export function formatBaseUrl(baseUrl: string | undefined, maxLength: number = 25): string {
  if (!baseUrl) return '使用默认地址';
  return baseUrl.length > maxLength ? baseUrl.substring(0, maxLength) + '...' : baseUrl;
}

export function formatContextWindow(contextWindow: number | undefined): string {
  if (!contextWindow) return '';
  return `上下文: ${(contextWindow / 1024 / 1024).toFixed(0)}M`;
}
