export interface LLMConfig {
  provider?: string;
  model?: string;
  apiKey?: string;
  baseUrl?: string;
}

export interface SDKWorkConfig {
  name: string;
  llm: LLMConfig;
  description?: string;
  theme?: string;
  provider?: string;
  model?: string;
  autoSave?: boolean;
  showTokens?: boolean;
  streamOutput?: boolean;
}

export interface Session {
  id: string;
  name: string;
  messages: Array<{ role: 'user' | 'assistant'; content: string; timestamp: number }>;
  createdAt: number;
  updatedAt: number;
  model: string;
}

export interface HistoryEntry {
  input: string;
  timestamp: number;
}

export interface UsageStats {
  totalTokens: number;
  totalRequests: number;
  sessionsCount: number;
  commandsUsed: Record<string, number>;
  skillsUsed: Record<string, number>;
}

export interface Command {
  name: string;
  description: string;
  alias?: string[];
  usage?: string;
  examples?: string[];
  category?: string;
}

export function getLLMBaseUrl(config: LLMConfig | undefined): string | undefined {
  return config?.baseUrl;
}

export function getLLMApiKey(config: LLMConfig | undefined): string | undefined {
  return config?.apiKey;
}

export function isLLMConfigured(config: LLMConfig | undefined): boolean {
  return !!(config?.apiKey);
}
