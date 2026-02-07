import { describe, it, expect } from 'vitest';
import { LLMManager, LLMProviderRegistry, globalProviderRegistry } from '../src/llm';
import { OpenAIProvider } from '../src/llm/providers/openai';
import { AnthropicProvider } from '../src/llm/providers/anthropic';
import { GeminiProvider } from '../src/llm/providers/gemini';

describe('LLM Providers', () => {
  describe('Provider Registry', () => {
    it('should register providers', () => {
      const registry = new LLMProviderRegistry();
      registry.register('test', config => new OpenAIProvider(config));

      expect(registry.listProviders()).toContain('test');
    });

    it('should create provider instances', () => {
      const registry = new LLMProviderRegistry();
      registry.register('openai', config => new OpenAIProvider(config));

      const provider = registry.create('openai', { apiKey: 'test' });
      expect(provider.name).toBe('openai');
    });

    it('should throw for unknown providers', () => {
      const registry = new LLMProviderRegistry();
      expect(() => registry.create('unknown', {})).toThrow('Unknown LLM provider');
    });
  });

  describe('LLM Manager', () => {
    it('should manage multiple providers', () => {
      const manager = new LLMManager();
      manager.addProvider('openai', { apiKey: 'test' });

      expect(manager.listProviders()).toContain('openai');
    });

    it('should set default provider', () => {
      const manager = new LLMManager();
      manager.addProvider('openai', { apiKey: 'test' });
      manager.setDefaultProvider('openai');

      const provider = manager.getProvider();
      expect(provider.name).toBe('openai');
    });

    it('should throw if no default provider', () => {
      const manager = new LLMManager();
      expect(() => manager.getProvider()).toThrow('No provider specified');
    });
  });

  describe('OpenAI Provider', () => {
    it('should validate config', () => {
      const provider = new OpenAIProvider({ apiKey: 'test', baseUrl: 'https://api.openai.com/v1' });
      expect(provider.validateConfig()).toBe(true);
    });

    it('should invalidate empty config', () => {
      const provider = new OpenAIProvider({ apiKey: '', baseUrl: 'https://api.openai.com/v1' });
      expect(provider.validateConfig()).toBe(false);
    });

    it('should list supported models', () => {
      const provider = new OpenAIProvider({ apiKey: 'test', baseUrl: 'https://api.openai.com/v1' });
      expect(provider.supportedModels).toContain('gpt-5.2');
      expect(provider.supportedModels).toContain('gpt-4o');
    });
  });

  describe('Anthropic Provider', () => {
    it('should validate config', () => {
      const provider = new AnthropicProvider({
        apiKey: 'test',
        baseUrl: 'https://api.anthropic.com/v1',
      });
      expect(provider.validateConfig()).toBe(true);
    });

    it('should list supported models', () => {
      const provider = new AnthropicProvider({
        apiKey: 'test',
        baseUrl: 'https://api.anthropic.com/v1',
      });
      expect(provider.supportedModels).toContain('claude-3-5-sonnet-20241022');
    });
  });

  describe('Gemini Provider', () => {
    it('should validate config', () => {
      const provider = new GeminiProvider({
        apiKey: 'test',
        baseUrl: 'https://generativelanguage.googleapis.com',
      });
      expect(provider.validateConfig()).toBe(true);
    });

    it('should list supported models', () => {
      const provider = new GeminiProvider({
        apiKey: 'test',
        baseUrl: 'https://generativelanguage.googleapis.com',
      });
      expect(provider.supportedModels).toContain('gemini-1.5-flash');
    });
  });

  describe('Global Registry', () => {
    it('should have providers registered', () => {
      expect(globalProviderRegistry.isRegistered('openai')).toBe(true);
      expect(globalProviderRegistry.isRegistered('anthropic')).toBe(true);
      expect(globalProviderRegistry.isRegistered('gemini')).toBe(true);
    });
  });
});
