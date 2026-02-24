import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { homedir } from 'os';

export interface CLIConfig {
  name: string;
  llm: {
    provider?: string;
    model?: string;
    apiKey?: string;
    baseUrl?: string;
  };
  theme?: string;
  provider?: string;
  model?: string;
  autoSave?: boolean;
  showTokens?: boolean;
  streamOutput?: boolean;
}

const CONFIG_DIR = join(homedir(), '.sdkwork');
const CONFIG_FILE = join(CONFIG_DIR, 'config.json');

class ConfigManager {
  private config: CLIConfig | null = null;
  private listeners: Set<(config: CLIConfig) => void> = new Set();

  constructor() {
    this.ensureConfigDir();
  }

  private ensureConfigDir(): void {
    if (!existsSync(CONFIG_DIR)) {
      mkdirSync(CONFIG_DIR, { recursive: true });
    }
  }

  load(): CLIConfig {
    if (this.config) return this.config;
    
    try {
      if (existsSync(CONFIG_FILE)) {
        this.config = JSON.parse(readFileSync(CONFIG_FILE, 'utf-8'));
        return this.config!;
      }
    } catch (error) {
      console.error('Failed to load config:', error);
    }
    
    this.config = this.getDefaultConfig();
    return this.config;
  }

  save(config: Partial<CLIConfig>): void {
    this.ensureConfigDir();
    this.config = { ...this.load(), ...config };
    writeFileSync(CONFIG_FILE, JSON.stringify(this.config, null, 2));
    this.notifyListeners();
  }

  get<T = unknown>(key: string): T | undefined {
    const config = this.load();
    const keys = key.split('.');
    let value: unknown = config;
    
    for (const k of keys) {
      if (value && typeof value === 'object' && k in value) {
        value = (value as Record<string, unknown>)[k];
      } else {
        return undefined;
      }
    }
    
    return value as T;
  }

  set(key: string, value: unknown): void {
    const config = this.load();
    const keys = key.split('.');
    const lastKey = keys.pop()!;
    
    let target: Record<string, unknown> = config as unknown as Record<string, unknown>;
    for (const k of keys) {
      if (!(k in target)) {
        target[k] = {};
      }
      target = target[k] as Record<string, unknown>;
    }
    
    target[lastKey] = value;
    this.save(config);
  }

  update(updates: Partial<CLIConfig>): void {
    this.save(updates);
  }

  reset(): void {
    this.config = this.getDefaultConfig();
    this.save(this.config);
  }

  subscribe(listener: (config: CLIConfig) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners(): void {
    if (this.config) {
      this.listeners.forEach(listener => listener(this.config!));
    }
  }

  private getDefaultConfig(): CLIConfig {
    return {
      name: 'SDKWork Agent',
      provider: 'openai',
      model: 'gpt-4o-mini',
      llm: {
        provider: 'openai',
        model: 'gpt-4o-mini',
      },
      theme: 'default',
      autoSave: true,
      showTokens: true,
      streamOutput: true,
    };
  }

  validate(): { valid: boolean; errors: string[] } {
    const config = this.load();
    const errors: string[] = [];

    if (!config.llm?.apiKey) {
      errors.push('API Key is required');
    }

    if (!config.provider) {
      errors.push('Provider is required');
    }

    if (config.llm?.baseUrl) {
      try {
        new URL(config.llm.baseUrl);
      } catch {
        errors.push('Invalid Base URL format');
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  getProvider(): string {
    return this.load().provider || 'openai';
  }

  getModel(): string {
    return this.load().model || 'gpt-4o-mini';
  }

  getApiKey(): string | undefined {
    return this.load().llm?.apiKey;
  }

  getBaseUrl(): string | undefined {
    return this.load().llm?.baseUrl;
  }

  getTheme(): string {
    return this.load().theme || 'default';
  }
}

export const cliConfig = new ConfigManager();
