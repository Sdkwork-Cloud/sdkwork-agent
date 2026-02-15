#!/usr/bin/env node
/**
 * SDKWork CLI - 专业级终端交互界面
 *
 * 命令: sdkwork
 * 参考 Claude Code、Codex CLI、OpenCode 等顶级智能体 CLI 设计
 * 
 * 核心特性:
 * - 交互式多行输入
 * - 智能命令补全
 * - 历史记录持久化
 * - 会话自动保存
 * - 流式输出
 * - 上下文感知提示
 *
 * @module TUI
 * @version 5.0.0
 */

import * as readline from 'readline';
import { stdin, stdout, exit } from 'process';
import { platform, homedir } from 'os';
import { existsSync, readFileSync, writeFileSync, mkdirSync, readdirSync, unlinkSync } from 'fs';
import { join } from 'path';
import { AgentImpl } from '../core/application/agent-impl.js';
import { createLogger } from '../utils/logger.js';
import type { AgentConfig, AgentEvent, AgentEventType } from '../core/domain/agent.js';
import type { Skill } from '../core/domain/skill.js';
import type { Tool } from '../core/domain/tool.js';
import { loadAllSkills } from '../skills/skill-loader.js';
import { TUIRenderer, createRenderer, THEMES } from './renderer.js';
import { select, confirm, prompt } from './selector.js';
import { PREDEFINED_PROVIDERS, type ModelProvider } from '../config/model-config.js';
import { createEventLogger } from './event-logger.js';
import { createConversationManager } from './conversation-manager.js';
import {
  getEventIcon,
  getEventCategory,
  getEventPriority,
  formatDuration,
  type TUIEvent,
} from './tui-events.js';

const logger = createLogger({ name: 'SDKWorkCLI' });

// ============================================
// 技能相关配置
// ============================================

const SKILL_ICONS: Record<string, string> = {
  'translate': '🌐',
  'code': '💻',
  'write': '✍️',
  'edit': '✏️',
  'analyze': '🔍',
  'search': '🔎',
  'file': '📁',
  'git': '🐙',
  'test': '🧪',
  'build': '🔨',
  'deploy': '🚀',
  'refactor': '♻️',
  'document': '📚',
  'explain': '💡',
  'help': '❓',
  'list': '📋',
  'create': '✨',
  'delete': '🗑️',
  'read': '📖',
  'update': '🔄',
  'math': '🧮',
  'data': '📊',
  'api': '🔌',
  'web': '🌍',
  'image': '🖼️',
  'audio': '🎵',
  'video': '🎬',
  'default': '⚡'
};

const SKILL_CATEGORIES: Record<string, string[]> = {
  '文本处理': ['translate', 'write', 'edit', 'document', 'explain'],
  '代码开发': ['code', 'refactor', 'test', 'build', 'deploy'],
  '文件操作': ['file', 'read', 'create', 'delete', 'update', 'list'],
  '分析搜索': ['analyze', 'search', 'data'],
  '工具集成': ['api', 'web', 'git'],
  '其他': []
};

function getSkillIcon(skillName: string): string {
  const lowerName = skillName.toLowerCase();
  for (const [key, icon] of Object.entries(SKILL_ICONS)) {
    if (lowerName.includes(key)) {
      return icon;
    }
  }
  return SKILL_ICONS.default;
}

function getSkillCategory(skillName: string): string {
  const lowerName = skillName.toLowerCase();
  for (const [category, keywords] of Object.entries(SKILL_CATEGORIES)) {
    if (keywords.some(keyword => lowerName.includes(keyword))) {
      return category;
    }
  }
  return '其他';
}

function formatSkillDescription(skill: Skill, maxLength: number = 60): string {
  let desc = skill.description || '';
  if (desc.length > maxLength) {
    desc = desc.slice(0, maxLength - 3) + '...';
  }
  return desc;
}

function getSkillParameterHint(skill: Skill): string {
  const input = skill.input;
  if (!input) return '';
  const required = input.required || [];
  const properties = input.properties || {};
  const totalParams = Object.keys(properties).length;
  
  if (totalParams === 0) return '无需参数';
  if (required.length === 0) return `${totalParams} 个可选参数`;
  return `${required.length}/${totalParams} 个必填参数`;
}

// ============================================
// 常量配置
// ============================================

const CONFIG_CONSTANTS = {
  HISTORY_MAX_ENTRIES: 1000,
  HISTORY_EXPORT_LIMIT: 100,
  AUTOSAVE_INTERVAL_MS: 30000,
  MAX_KEEP_MESSAGES: 100,
  DEFAULT_KEEP_MESSAGES: 10,
} as const;

// ============================================
// 配置和存储
// ============================================

const CONFIG_DIR = join(homedir(), '.sdkwork');
const CONFIG_FILE = join(CONFIG_DIR, 'config.json');
const SESSIONS_DIR = join(CONFIG_DIR, 'sessions');
const HISTORY_FILE = join(CONFIG_DIR, 'history');
const AUTOSAVE_SESSION = join(CONFIG_DIR, 'autosave.json');

interface SDKWorkConfig {
  name: string;
  llm: AgentConfig['llm'];
  description?: string;
  theme?: string;
  provider?: ModelProvider;
  model?: string;
  autoSave?: boolean;
  showTokens?: boolean;
  streamOutput?: boolean;
}

interface Session {
  id: string;
  name: string;
  messages: Array<{ role: 'user' | 'assistant'; content: string; timestamp: number }>;
  createdAt: number;
  updatedAt: number;
  model: string;
}

interface HistoryEntry {
  input: string;
  timestamp: number;
}

// ============================================
// 命令定义
// ============================================

interface Command {
  name: string;
  description: string;
  alias?: string[];
  usage?: string;
  examples?: string[];
  category?: string;
}

const COMMANDS: Command[] = [
  { name: 'help', description: '显示帮助信息', alias: ['h', '?'], category: 'general' },
  { name: 'clear', description: '清空对话历史', alias: ['c'], category: 'general' },
  { name: 'exit', description: '退出 CLI', alias: ['quit', 'q'], category: 'general' },
  { name: 'config', description: '显示/修改配置', usage: 'config [key=value]', examples: ['config', 'config theme=dark', 'config baseUrl=https://api.example.com'], category: 'settings' },
  { name: 'setup', description: '配置向导', category: 'settings' },
  { name: 'skills', description: '列出可用技能', alias: ['ls'], category: 'capabilities' },
  { name: 'skill', description: '执行技能', usage: 'skill <name> [params]', examples: ['skill translate text="Hello" targetLanguage="zh"', 'skill code --help'], category: 'capabilities' },
  { name: 'active', description: '管理活动技能', usage: 'active [skill-name|clear]', examples: ['active', 'active translate', 'active clear'], category: 'capabilities' },
  { name: 'tools', description: '列出可用工具', category: 'capabilities' },
  { name: 'model', description: '切换/显示模型', usage: 'model [model-id]', examples: ['model', 'model gpt-4'], category: 'settings' },
  { name: 'provider', description: '切换提供商', usage: 'provider [name] [--baseUrl=url]', examples: ['provider', 'provider openai', 'provider openai --baseUrl=https://api.example.com/v1'], category: 'settings' },
  { name: 'theme', description: '切换主题', usage: 'theme [theme-name]', examples: ['theme', 'theme dark'], category: 'settings' },
  { name: 'session', description: '会话管理', usage: 'session <list|save|load|delete|auto>', examples: ['session list', 'session save', 'session load', 'session delete'], category: 'session' },
  { name: 'status', description: '显示当前状态', category: 'info' },
  { name: 'stats', description: '显示使用统计', category: 'info' },
  { name: 'events', description: '显示事件日志', usage: 'events [clear|summary]', examples: ['events', 'events clear', 'events summary'], category: 'info' },
  { name: 'history', description: '显示命令历史', alias: ['hist'], category: 'info' },
  { name: 'export', description: '导出对话', usage: 'export [format]', examples: ['export', 'export markdown', 'export json', 'export txt'], category: 'session' },
  { name: 'redo', description: '重新执行上一条命令', category: 'general' },
  { name: 'undo', description: '撤销上一条消息', category: 'general' },
  { name: 'compact', description: '压缩对话历史 (保留最近N条消息)', usage: 'compact [count]', examples: ['compact', 'compact 10'], category: 'general' },
];

// ============================================
// 工具函数
// ============================================

function ensureConfigDir(): void {
  if (!existsSync(CONFIG_DIR)) mkdirSync(CONFIG_DIR, { recursive: true });
  if (!existsSync(SESSIONS_DIR)) mkdirSync(SESSIONS_DIR, { recursive: true });
}

function loadCLIConfig(): Partial<SDKWorkConfig> {
  try {
    if (existsSync(CONFIG_FILE)) return JSON.parse(readFileSync(CONFIG_FILE, 'utf-8'));
  } catch (error) {
    logger.error('Failed to load config', { error });
  }
  return {};
}

function saveCLIConfig(config: Partial<SDKWorkConfig>): void {
  try {
    ensureConfigDir();
    writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
  } catch (error) {
    logger.error('Failed to save config', { error });
  }
}

function loadHistory(): HistoryEntry[] {
  try {
    if (existsSync(HISTORY_FILE)) {
      const content = readFileSync(HISTORY_FILE, 'utf-8');
      const history = JSON.parse(content);
      if (Array.isArray(history)) {
        return history.filter(h => h && typeof h.input === 'string');
      }
    }
  } catch (e) {
    logger.debug('Failed to load history', { error: e });
  }
  return [];
}

function saveHistory(history: HistoryEntry[]): void {
  try {
    ensureConfigDir();
    const trimmed = history.slice(-CONFIG_CONSTANTS.HISTORY_MAX_ENTRIES);
    writeFileSync(HISTORY_FILE, JSON.stringify(trimmed, null, 2));
  } catch (e) {
    logger.debug('Failed to save history', { error: e });
  }
}

function addToHistory(history: HistoryEntry[], input: string): HistoryEntry[] {
  if (input.trim() && history[history.length - 1]?.input !== input) {
    history.push({ input: input.trim(), timestamp: Date.now() });
    if (history.length > CONFIG_CONSTANTS.HISTORY_MAX_ENTRIES) history.shift();
  }
  return history;
}

function loadSessions(): Session[] {
  try {
    ensureConfigDir();
    const sessions: Session[] = [];
    if (existsSync(SESSIONS_DIR)) {
      for (const file of readdirSync(SESSIONS_DIR)) {
        if (file.endsWith('.json')) {
          try {
            const content = readFileSync(join(SESSIONS_DIR, file), 'utf-8');
            const session = JSON.parse(content);
            if (session && session.id && Array.isArray(session.messages)) {
              sessions.push(session);
            }
          } catch (err) {
            logger.debug('Skipping invalid session file', { file, error: err instanceof Error ? err.message : String(err) });
          }
        }
      }
    }
    return sessions.sort((a, b) => b.updatedAt - a.updatedAt);
  } catch (error) {
    logger.error('Failed to load sessions', { error });
    return [];
  }
}

function saveSession(session: Session): void {
  try {
    ensureConfigDir();
    writeFileSync(join(SESSIONS_DIR, `${session.id}.json`), JSON.stringify(session, null, 2));
  } catch (error) {
    logger.error('Failed to save session', { error });
  }
}

function deleteSession(sessionId: string): void {
  try {
    const filePath = join(SESSIONS_DIR, `${sessionId}.json`);
    if (existsSync(filePath)) unlinkSync(filePath);
  } catch (error) {
    logger.error('Failed to delete session', { error });
  }
}

function loadAutosave(): Session | null {
  try {
    if (existsSync(AUTOSAVE_SESSION)) {
      return JSON.parse(readFileSync(AUTOSAVE_SESSION, 'utf-8'));
    }
  } catch (e) {
    logger.debug('Failed to load autosave', { error: e });
  }
  return null;
}

function saveAutosave(session: Session): void {
  try {
    ensureConfigDir();
    writeFileSync(AUTOSAVE_SESSION, JSON.stringify(session, null, 2));
  } catch (e) {
    logger.debug('Failed to save autosave', { error: e });
  }
}

// ============================================
// 配置向导
// ============================================

function getApiKeySetupInstructions(): string {
  const os = platform();
  if (os === 'win32') {
    return `
📋 Windows 设置方法:
方法 1 - PowerShell: $env:OPENAI_API_KEY="your-api-key"
方法 2 - CMD: set OPENAI_API_KEY=your-api-key
方法 3 - 系统环境变量: 设置 OPENAI_API_KEY
`;
  }
  return `
📋 macOS/Linux 设置方法:
方法 1 - 临时: export OPENAI_API_KEY=your-api-key
方法 2 - 永久: echo 'export OPENAI_API_KEY=your-api-key' >> ~/.bashrc
`;
}

async function showConfigWizard(renderer: TUIRenderer): Promise<SDKWorkConfig | null> {
  renderer.clear();
  renderer.box([
    '',
    renderer.bold(renderer.primary('🚀 SDKWork Agent CLI')),
    '',
    '欢迎使用 SDKWork Agent',
    '让我们开始配置...',
    '',
  ], '配置向导');

  console.log(renderer.warning('⚠️  未检测到 API Key 配置'));
  console.log(getApiKeySetupInstructions());
  console.log(renderer.secondary('支持的提供商:'));
  Object.entries(PREDEFINED_PROVIDERS).forEach(([_, provider]) => {
    console.log(`  ${renderer.primary('•')} ${provider.displayName} (${provider.models.length} 个模型)`);
  });
  console.log('');

  const rl = readline.createInterface({ input: stdin, output: stdout });

  // 选择提供商
  console.log(renderer.primary('请选择提供商:'));
  const providers = Object.entries(PREDEFINED_PROVIDERS);
  providers.forEach(([key, p], i) => {
    const current = key === 'openai' ? renderer.dim(' (推荐)') : '';
    console.log(`  ${renderer.primary(`[${i + 1}]`)} ${p.displayName}${current}`);
  });

  const providerIdx = await new Promise<number>((resolve) => {
    rl.question(renderer.primary('> '), (answer) => {
      const idx = parseInt(answer) - 1;
      resolve(isNaN(idx) || idx < 0 || idx >= providers.length ? 0 : idx);
    });
  });
  const selectedProvider = (providers[providerIdx]?.[0] as ModelProvider) || 'openai';
  const provider = PREDEFINED_PROVIDERS[selectedProvider];

  // 选择模型
  console.log('');
  console.log(renderer.primary('请选择模型:'));
  provider.models.forEach((m, i) => {
    const recommended = m.id.includes('gpt-4') ? renderer.dim(' (推荐)') : '';
    console.log(`  ${renderer.primary(`[${i + 1}]`)} ${m.name} ${renderer.dim(`(${m.id})`)}${recommended}`);
  });

  const modelIdx = await new Promise<number>((resolve) => {
    rl.question(renderer.primary('> '), (answer) => {
      const idx = parseInt(answer) - 1;
      resolve(isNaN(idx) || idx < 0 || idx >= provider.models.length ? 0 : idx);
    });
  });
  const selectedModel = provider.models[modelIdx]?.id || provider.models[0]?.id;

  // 输入 API Key
  console.log('');
  const apiKey = await new Promise<string>((resolve) => {
    rl.question(renderer.primary('🔑 请输入 API Key: '), (answer) => resolve(answer.trim()));
  });

  // 询问是否启用自动保存
  console.log('');
  console.log(renderer.primary('是否启用自动保存会话?'));
  console.log(`  ${renderer.primary('[1]')} 是`);
  console.log(`  ${renderer.primary('[2]')} 否`);

  const autoSaveChoice = await new Promise<string>((resolve) => {
    rl.question(renderer.primary('> '), (answer) => resolve(answer.trim()));
  });
  const autoSave = autoSaveChoice !== '2';

  rl.close();

  if (!apiKey) {
    console.log(renderer.secondary('👋 未提供 API Key，退出程序。'));
    return null;
  }

  const config: SDKWorkConfig = {
    name: 'SDKWork Agent',
    provider: selectedProvider,
    model: selectedModel,
    llm: { provider: selectedProvider, apiKey, model: selectedModel },
    theme: 'default',
    autoSave,
    showTokens: true,
    streamOutput: true,
  };

  saveCLIConfig(config);
  renderer.successBox('配置完成', '配置已保存！即将启动...');
  return config;
}

async function loadConfig(renderer: TUIRenderer): Promise<SDKWorkConfig | null> {
  const cliConfig = loadCLIConfig();
  
  // 支持多个提供商的 API Key 环境变量
  const envApiKeys: Record<string, string | undefined> = {
    openai: process.env.OPENAI_API_KEY,
    anthropic: process.env.ANTHROPIC_API_KEY,
    google: process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY,
    moonshot: process.env.MOONSHOT_API_KEY,
    minimax: process.env.MINIMAX_API_KEY,
    zhipu: process.env.ZHIPU_API_KEY,
    qwen: process.env.QWEN_API_KEY || process.env.DASHSCOPE_API_KEY,
    deepseek: process.env.DEEPSEEK_API_KEY,
    doubao: process.env.DOUBAO_API_KEY,
  };
  
  // 优先使用配置文件中的 API Key，其次使用环境变量
  const configApiKey = cliConfig.llm && typeof cliConfig.llm === 'object' && 'apiKey' in cliConfig.llm 
    ? cliConfig.llm.apiKey 
    : undefined;
  
  const provider = cliConfig.provider || 'openai';
  const apiKey = configApiKey || envApiKeys[provider] || envApiKeys.openai;

  if (!apiKey) {
    return await showConfigWizard(renderer);
  }

  return {
    name: cliConfig.name || 'SDKWork Agent',
    provider: cliConfig.provider || 'openai',
    model: cliConfig.model || 'gpt-4',
    theme: cliConfig.theme || 'default',
    llm: cliConfig.llm || { provider: cliConfig.provider || 'openai', apiKey, model: cliConfig.model || 'gpt-4' },
    autoSave: cliConfig.autoSave ?? true,
    showTokens: cliConfig.showTokens ?? true,
    streamOutput: cliConfig.streamOutput ?? true,
  };
}

async function loadCapabilities(): Promise<{ skills: Skill[]; tools: Tool[] }> {
  try {
    const { skills } = await loadAllSkills();
    return { skills, tools: [] };
  } catch (error) {
    logger.error('Failed to load capabilities', { error });
    return { skills: [], tools: [] };
  }
}

// ============================================
// 统计信息
// ============================================

interface UsageStats {
  totalMessages: number;
  totalTokens: number;
  sessionsCount: number;
  toolsUsed: Record<string, number>;
  commandsUsed: Record<string, number>;
  startTime: number;
}

function loadStats(): UsageStats {
  const defaultStats: UsageStats = { totalMessages: 0, totalTokens: 0, sessionsCount: 0, toolsUsed: {}, commandsUsed: {}, startTime: Date.now() };
  try {
    const statsFile = join(CONFIG_DIR, 'stats.json');
    if (existsSync(statsFile)) {
      const loaded = JSON.parse(readFileSync(statsFile, 'utf-8'));
      return { ...defaultStats, ...loaded };
    }
  } catch (e) {
    logger.debug('Failed to load stats', { error: e });
  }
  return defaultStats;
}

function saveStats(stats: UsageStats): void {
  try {
    ensureConfigDir();
    writeFileSync(join(CONFIG_DIR, 'stats.json'), JSON.stringify(stats, null, 2));
  } catch (e) {
    logger.debug('Failed to save stats', { error: e });
  }
}

// ============================================
// 自动补全
// ============================================

function parseNaturalLanguageInput(input: string, properties: Record<string, unknown>): Record<string, unknown> {
  const params: Record<string, unknown> = {};
  const propNames = Object.keys(properties);
  
  for (const propName of propNames) {
    const def = properties[propName] as { type?: string; description?: string; enum?: unknown[] };
    
    const patterns = [
      new RegExp(`${propName}[=:\\s]+["']?([^"'\n]+)["']?`, 'i'),
      new RegExp(`["']${propName}["']?[=:\\s]+["']?([^"'\n]+)["']?`, 'i'),
      new RegExp(`--${propName}[=\\s]+["']?([^"'\n]+)["']?`, 'i'),
      new RegExp(`-${propName[0]}[=\\s]+["']?([^"'\n]+)["']?`, 'i'),
    ];
    
    for (const pattern of patterns) {
      const match = input.match(pattern);
      if (match) {
        let value: string | number | boolean = match[1].trim();
        
        if (def.type === 'number' && !isNaN(Number(value))) {
          params[propName] = Number(value);
        } else if (def.type === 'boolean') {
          params[propName] = value.toLowerCase() === 'true' || value === '1' || value === 'yes';
        } else if (def.enum && def.enum.includes(value)) {
          params[propName] = value;
        } else {
          if ((value.startsWith('"') && value.endsWith('"')) || 
              (value.startsWith("'") && value.endsWith("'"))) {
            value = value.slice(1, -1);
          }
          params[propName] = value;
        }
        break;
      }
    }
  }
  
  if (Object.keys(params).length === 0 && input.length > 0) {
    const words = input.split(/\s+/);
    const propArray = Object.entries(properties);
    
    for (let i = 0; i < Math.min(words.length, propArray.length); i++) {
      const [propName, def] = propArray[i];
      const defTyped = def as { type?: string };
      const value: string | number | boolean = words[i];
      
      if (defTyped.type === 'number' && !isNaN(Number(value))) {
        params[propName] = Number(value);
      } else if (defTyped.type === 'boolean') {
        params[propName] = value.toLowerCase() === 'true';
      } else {
        params[propName] = value;
      }
    }
  }
  
  return params;
}

function getSelectorTheme(renderer: TUIRenderer) {
  return {
    primary: renderer.primary(''),
    secondary: renderer.secondary(''),
    selected: renderer.success(''),
    disabled: renderer.muted(''),
    pointer: renderer.primary('❯'),
    active: '',
  };
}

async function showModelSettings(
  renderer: TUIRenderer,
  config: SDKWorkConfig,
  agentInstance: AgentImpl
): Promise<void> {
  let loop = true;

  while (loop) {
    renderer.clear();

    const currentProvider = PREDEFINED_PROVIDERS[config.provider || 'openai'];
    const currentBaseUrl = (config.llm as { baseUrl?: string })?.baseUrl;

    const settingsBox: string[] = [
      '',
      `${renderer.bold(renderer.primary('🤖 模型设置'))}`,
      '',
      `${renderer.dim('当前配置:')}`,
      `  ${renderer.primary('提供商:')} ${currentProvider?.displayName || config.provider}`,
      `  ${renderer.primary('模型:')} ${config.model}`,
      `  ${renderer.primary('Base URL:')} ${currentBaseUrl ? renderer.info(currentBaseUrl) : renderer.muted('使用默认')}`,
      '',
    ];

    renderer.box(settingsBox, '⚙️ 模型配置');

    const options = [
      { value: 'provider', label: '🔌 切换提供商', description: '选择不同的 AI 提供商' },
      { value: 'model', label: '🤖 选择模型', description: `当前: ${config.model}` },
      { value: 'baseurl', label: '🌐 设置 Base URL', description: currentBaseUrl ? '修改 API 地址' : '设置自定义 API 地址' },
      { value: 'custom', label: '📝 自定义模型', description: '输入任意模型 ID' },
      { value: 'done', label: '✅ 完成设置', description: '保存并返回' },
    ];

    const choice = await select('选择操作:', options, {
      pageSize: 6,
      theme: getSelectorTheme(renderer),
    });

    if (!choice || choice === 'done') {
      loop = false;
      break;
    }

    switch (choice) {
      case 'provider':
        const providerOptions = Object.entries(PREDEFINED_PROVIDERS).map(([key, p]) => ({
          value: key,
          label: p.displayName,
          description: key === config.provider ? '(当前)' : `${p.models.length} 个模型`,
        }));

        const newProvider = await select('选择提供商:', providerOptions, {
          pageSize: 6,
          theme: getSelectorTheme(renderer),
        });

        if (newProvider && newProvider !== config.provider) {
          const provider = PREDEFINED_PROVIDERS[newProvider as ModelProvider];
          config.provider = newProvider as ModelProvider;
          config.model = provider.models[0]?.id;
          config.llm = {
            ...config.llm,
            provider: newProvider,
            model: config.model,
            baseUrl: undefined,
          } as SDKWorkConfig['llm'];
          agentInstance.setLLM(config.llm);
          saveCLIConfig(config);
          renderer.successBox('配置已更新', `提供商: ${provider.displayName}\n模型: ${config.model}`);
        }
        break;

      case 'model':
        const providerForModels = PREDEFINED_PROVIDERS[config.provider || 'openai'];
        const modelOptions = providerForModels?.models.map((m) => ({
          value: m.id,
          label: m.name,
          description: m.id === config.model ? '(当前)' : '',
        })) || [];

        const newModel = await select('选择模型:', modelOptions, {
          pageSize: 8,
          theme: getSelectorTheme(renderer),
        });

        if (newModel && newModel !== config.model) {
          config.model = newModel;
          config.llm = { ...config.llm, model: config.model } as SDKWorkConfig['llm'];
          agentInstance.setLLM(config.llm);
          saveCLIConfig(config);
          renderer.successBox('模型已切换', `当前模型: ${newModel}`);
        }
        break;

      case 'baseurl':
        const providerForUrl = PREDEFINED_PROVIDERS[config.provider || 'openai'];
        const defaultUrl = providerForUrl?.defaultBaseUrl || '官方 API';

        console.log('');
        console.log(`  ${renderer.dim('当前设置:')} ${currentBaseUrl ? renderer.info(currentBaseUrl) : renderer.muted('未设置 (使用默认)')}`);
        console.log(`  ${renderer.dim('默认地址:')} ${renderer.secondary(defaultUrl)}`);
        console.log('');

        const newBaseUrl = await prompt(
          '请输入 Base URL (留空重置为默认，输入 "-" 清除)',
          currentBaseUrl || ''
        );

        if (newBaseUrl !== null) {
          if (newBaseUrl === '-') {
            config.llm = { ...config.llm, baseUrl: undefined } as SDKWorkConfig['llm'];
            agentInstance.setLLM(config.llm);
            saveCLIConfig(config);
            renderer.successBox('Base URL 已清除', '将使用默认地址');
          } else if (newBaseUrl === '') {
            config.llm = { ...config.llm, baseUrl: undefined } as SDKWorkConfig['llm'];
            agentInstance.setLLM(config.llm);
            saveCLIConfig(config);
            renderer.successBox('Base URL 已重置', `默认地址: ${defaultUrl}`);
          } else {
            try {
              new URL(newBaseUrl);
              config.llm = { ...config.llm, baseUrl: newBaseUrl } as SDKWorkConfig['llm'];
              agentInstance.setLLM(config.llm);
              saveCLIConfig(config);
              renderer.successBox('Base URL 已设置', `地址: ${newBaseUrl}`);
            } catch (_err) {
              renderer.errorBox('无效的 URL', '请输入有效的 URL (如 https://api.example.com/v1)');
            }
          }
        }
        break;

      case 'custom':
        console.log('');
        console.log(renderer.dim('提示: 输入任意模型 ID，如 gpt-4-turbo、claude-3-opus 等'));
        console.log(renderer.dim(`当前模型: ${config.model || '无'}`));
        console.log('');

        const customModel = await prompt('📝 模型 ID', config.model);

        if (customModel && customModel.trim()) {
          const trimmedModel = customModel.trim();
          config.model = trimmedModel;
          config.llm = { ...config.llm, model: config.model } as SDKWorkConfig['llm'];
          agentInstance.setLLM(config.llm);
          saveCLIConfig(config);
          renderer.successBox('模型已设置', `当前模型: ${trimmedModel}`);
        } else if (customModel !== null) {
          renderer.systemMessage('模型 ID 不能为空', 'error');
        }
        break;
    }

    if (loop) {
      const continueConfig = await confirm('继续配置?', true);
      loop = continueConfig;
    }
  }
}

function getCompletions(input: string, skills: Skill[], commands: Command[]): string[] {
  const completions: string[] = [];

  if (input.startsWith('/skill ')) {
    // 技能名称补全
    const partial = input.slice(7).toLowerCase();
    skills.forEach(skill => {
      if (skill.name.toLowerCase().startsWith(partial)) {
        completions.push(`/skill ${skill.name}`);
      }
    });
  } else if (input.startsWith('/session ')) {
    // 会话命令补全
    const partial = input.slice(9).toLowerCase();
    ['list', 'save', 'load', 'delete', 'auto'].forEach(cmd => {
      if (cmd.startsWith(partial)) {
        completions.push(`/session ${cmd}`);
      }
    });
  } else if (input.startsWith('/provider ')) {
    // 提供商补全
    const partial = input.slice(10).toLowerCase();
    Object.keys(PREDEFINED_PROVIDERS).forEach(provider => {
      if (provider.startsWith(partial)) {
        completions.push(`/provider ${provider}`);
      }
    });
  } else if (input.startsWith('/theme ')) {
    // 主题补全
    const partial = input.slice(7).toLowerCase();
    Object.keys(THEMES).forEach(theme => {
      if (theme.startsWith(partial)) {
        completions.push(`/theme ${theme}`);
      }
    });
  } else if (input.startsWith('/config ')) {
    // 配置项补全
    const partial = input.slice(8).toLowerCase();
    ['theme=', 'model=', 'provider=', 'baseUrl=', 'autoSave=', 'showTokens=', 'streamOutput='].forEach(cfg => {
      if (cfg.toLowerCase().startsWith(partial)) {
        completions.push(`/config ${cfg}`);
      }
    });
  } else if (input.startsWith('/events ')) {
    // 事件命令补全
    const partial = input.slice(8).toLowerCase();
    ['summary', 'clear'].forEach(cmd => {
      if (cmd.startsWith(partial)) {
        completions.push(`/events ${cmd}`);
      }
    });
  } else if (input.startsWith('/export ')) {
    // 导出格式补全
    const partial = input.slice(8).toLowerCase();
    ['json', 'markdown', 'txt', 'events'].forEach(fmt => {
      if (fmt.startsWith(partial)) {
        completions.push(`/export ${fmt}`);
      }
    });
  } else if (input.startsWith('/')) {
    // 命令补全
    const partial = input.slice(1).toLowerCase();
    commands.forEach(cmd => {
      if (cmd.name.startsWith(partial)) {
        completions.push(`/${cmd.name}`);
      }
      cmd.alias?.forEach(alias => {
        if (alias.startsWith(partial)) {
          completions.push(`/${alias}`);
        }
      });
    });
  }

  return completions;
}

// ============================================
// 主函数
// ============================================

export async function main(): Promise<void> {
  const renderer = createRenderer();

  try {
    const config = await loadConfig(renderer);
    if (!config) return;

    // 应用主题
    if (config.theme && THEMES[config.theme]) {
      renderer.setTheme(THEMES[config.theme]);
    }

    const { skills, tools } = await loadCapabilities();
    logger.info(`Loaded ${skills.length} skills`);

    const agent = new AgentImpl({
      name: config.name,
      description: config.description,
      llm: config.llm,
      skills,
      tools,
    });

    await agent.initialize();
    logger.info('Agent initialized');

    const eventLogger = createEventLogger({
      maxEvents: 200,
      showTimestamp: true,
      showCategory: true,
      compact: false,
      theme: THEMES[config.theme || 'default'],
    });

    const conversationManager = createConversationManager({
      maxSessions: 10,
      autoSave: config.autoSave,
      eventLogger,
      onEvent: (event: TUIEvent) => {
        const priority = getEventPriority(event.type);
        if (priority === 'high' || priority === 'medium') {
          const icon = getEventIcon(event.type);
          const category = getEventCategory(event.type);
          const timestamp = new Date(event.timestamp).toLocaleTimeString();
          logger.debug(`[${timestamp}] ${icon} [${category}] ${event.type}`);
        }
      },
    });

    const allAgentEvents: AgentEventType[] = [
      'agent:initialized', 'agent:started', 'agent:stopped', 'agent:destroyed', 'agent:error', 'agent:reset',
      'chat:started', 'chat:message', 'chat:stream', 'chat:completed', 'chat:aborted', 'chat:error',
      'execution:started', 'execution:step', 'execution:progress', 'execution:completed', 'execution:failed',
      'tool:invoking', 'tool:invoked', 'tool:completed', 'tool:failed',
      'skill:invoking', 'skill:invoked', 'skill:completed', 'skill:failed',
      'memory:stored', 'memory:retrieved', 'memory:searched',
    ];

    for (const eventType of allAgentEvents) {
      agent.on(eventType, (event: AgentEvent) => {
        conversationManager.handleAgentEvent(event);
      });
    }

    agent.on('*', (event: AgentEvent) => {
      logger.debug(`Event: ${event.type}`, { payload: event.payload });
    });

    const agentInstance = agent;

    conversationManager.createSession('Main Session');

    let history = loadHistory();
    const stats = loadStats();

    // 加载自动保存的会话
    let messages: Array<{ role: 'user' | 'assistant'; content: string; timestamp: number }> = [];
    let currentSession: Session | null = null;
    
    const autosave = loadAutosave();
    if (autosave && autosave.messages.length > 0) {
      messages = autosave.messages;
      currentSession = autosave;
      stats.sessionsCount++;
    }

    // 显示欢迎信息
    renderer.welcome({
      name: config.name,
      version: '5.0.0',
      description: 'AI-powered development companion',
      provider: config.provider,
      model: config.model,
    });

    // 如果有自动保存的会话，显示恢复提示
    if (autosave && autosave.messages.length > 0) {
      renderer.systemMessage(`已恢复上次会话 (${autosave.messages.length} 条消息)`, 'info');
    }

    // 创建 readline 接口
    const rl = readline.createInterface({
      input: stdin,
      output: stdout,
      prompt: renderer.primary('❯ '),
      history: history.map(h => h.input).slice(-CONFIG_CONSTANTS.HISTORY_EXPORT_LIMIT),
      completer: (line: string) => {
        const completions = getCompletions(line, skills, COMMANDS);
        return [completions, line];
      },
    });

    let autosaveInterval: NodeJS.Timeout | null = null;
    if (config.autoSave) {
      autosaveInterval = setInterval(() => {
        if (messages.length > 0) {
          saveAutosave({
            id: currentSession?.id || 'autosave',
            name: 'Autosave',
            messages,
            createdAt: currentSession?.createdAt || Date.now(),
            updatedAt: Date.now(),
            model: config.model || 'unknown',
          });
        }
      }, CONFIG_CONSTANTS.AUTOSAVE_INTERVAL_MS);
    }

    function showHint(): void {
      const hints = [
        '输入 /help 查看可用命令',
        '按 Tab 键自动补全命令',
        '按 ↑/↓ 浏览历史记录',
        '使用 /skill <name> 执行技能',
        '使用 /session save 保存会话',
        '使用 /model 切换 AI 模型',
        '使用 /config 查看和修改配置',
        '使用 /compact 压缩对话历史',
        '使用 /export 导出对话记录',
        '使用 /events 查看事件日志',
        '使用 /stats 查看使用统计',
        '使用 /events summary 查看事件摘要',
        '所有技能、工具、MCP调用都会被追踪记录',
        '使用 /active 查看当前活动技能',
        '使用 /active clear 清除活动技能',
        '设置活动技能后，直接输入内容即可使用',
        '活动技能模式下输入 /clear 快速退出',
        '活动技能模式下输入 /active 查看状态',
      ];
      const hint = hints[Math.floor(Math.random() * hints.length)];
      console.log(renderer.dim(`💡 ${hint}`));
    }

    // 活动技能跟踪 - 保持上下文的技能系统
    let activeSkill: string | null = null;
    let lastSkillExecution: { name: string; params: Record<string, unknown>; result?: unknown } | null = null;

    // 每隔几次交互显示一次提示
    let interactionCount = 0;

    // 更新提示符函数，显示当前活动技能
    function updatePrompt(): void {
      if (activeSkill) {
        const icon = getSkillIcon(activeSkill);
        rl.setPrompt(`${renderer.dim(`${icon} ${activeSkill}`)} ${renderer.primary('❯ ')}`);
      } else {
        rl.setPrompt(renderer.primary('❯ '));
      }
    }

    // 命令处理
    const handleCommand = async (command: string, args: string): Promise<boolean> => {
      // 检查 agent 是否已初始化
      if (!agentInstance) {
        renderer.systemMessage('Agent 未初始化', 'error');
        return false;
      }
      
      stats.commandsUsed[command] = (stats.commandsUsed[command] || 0) + 1;
      
      // 处理 --help 参数
      if (args.trim() === '--help') {
        const cmd = COMMANDS.find(c => c.name === command);
        if (cmd) {
          const helpDetail = [
            '',
            renderer.bold(`📖 /${cmd.name}`),
            '',
            `  ${cmd.description}`,
            '',
            renderer.bold('用法:'),
            `  ${renderer.primary(cmd.usage || `/${cmd.name}`)}`,
          ];
          if (cmd.alias && cmd.alias.length > 0) {
            helpDetail.push('');
            helpDetail.push(renderer.bold('别名:'));
            helpDetail.push(`  ${cmd.alias.map(a => renderer.primary('/' + a)).join(', ')}`);
          }
          if (cmd.examples && cmd.examples.length > 0) {
            helpDetail.push('');
            helpDetail.push(renderer.bold('示例:'));
            cmd.examples.forEach(ex => {
              helpDetail.push(`  ${renderer.primary('$')} ${ex}`);
            });
          }
          helpDetail.push('');
          renderer.box(helpDetail, '❓ 命令帮助');
          return true;
        }
      }

      // 处理 /help <command>
      if (command === 'help' && args.trim()) {
        const targetCmd = args.trim().replace(/^\//, '');
        const cmd = COMMANDS.find(c => c.name === targetCmd || c.alias?.includes(targetCmd));
        if (cmd) {
          const helpDetail = [
            '',
            renderer.bold(`📖 /${cmd.name}`),
            '',
            `  ${cmd.description}`,
            '',
            renderer.bold('用法:'),
            `  ${renderer.primary(cmd.usage || `/${cmd.name}`)}`,
          ];
          if (cmd.alias && cmd.alias.length > 0) {
            helpDetail.push('');
            helpDetail.push(renderer.bold('别名:'));
            helpDetail.push(`  ${cmd.alias.map(a => renderer.primary('/' + a)).join(', ')}`);
          }
          if (cmd.examples && cmd.examples.length > 0) {
            helpDetail.push('');
            helpDetail.push(renderer.bold('示例:'));
            cmd.examples.forEach(ex => {
              helpDetail.push(`  ${renderer.primary('$')} ${ex}`);
            });
          }
          helpDetail.push('');
          renderer.box(helpDetail, '❓ 命令帮助');
          return true;
        } else {
          renderer.systemMessage(`未知命令: ${args}`, 'error');
          return true;
        }
      }

      // 处理 /skills 或 /ls 命令
      if ((command === 'skills' || command === 'ls') && !args) {
        const skillsList = agentInstance.skills.list();
        if (skillsList.length > 0) {
          const categorized = new Map<string, Skill[]>();
          skillsList.forEach(skill => {
            const category = getSkillCategory(skill.name);
            if (!categorized.has(category)) {
              categorized.set(category, []);
            }
            categorized.get(category)!.push(skill);
          });
          
          const categoryOrder = ['文本处理', '代码开发', '文件操作', '分析搜索', '工具集成', '其他'];
          const allSkillOptions: Array<{ value: string; label: string; description: string }> = [];
          
          categoryOrder.forEach(category => {
            const skillsInCategory = categorized.get(category);
            if (skillsInCategory && skillsInCategory.length > 0) {
              skillsInCategory.forEach(s => {
                const icon = getSkillIcon(s.name);
                const paramHint = getSkillParameterHint(s);
                const desc = `${category} | ${paramHint} | ${formatSkillDescription(s, 40)}`;
                allSkillOptions.push({
                  value: s.name,
                  label: `${icon} ${s.name}`,
                  description: desc
                });
              });
            }
          });
          
          const selectOptions = [
            { value: '__cancel__', label: '❌ 返回命令行', description: '不选择任何技能' },
            ...allSkillOptions
          ];
          
          const selectedSkill = await select('⬇️ 选择要执行的技能 (或返回):', selectOptions, {
            pageSize: 15,
            theme: getSelectorTheme(renderer),
          });
          
          if (selectedSkill && selectedSkill !== '__cancel__') {
            return await handleCommand('skill', selectedSkill);
          }
          return true;
        }
      }

      switch (command) {
        case 'help':
        case 'h':
        case '?':
          const categoryOrder = ['general', 'session', 'capabilities', 'settings', 'info'];
          const categorized = new Map<string, Command[]>();
          COMMANDS.forEach(cmd => {
            const cat = cmd.category || 'general';
            if (!categorized.has(cat)) categorized.set(cat, []);
            categorized.get(cat)!.push(cmd);
          });

          const helpLines: string[] = ['', renderer.bold('📋 可用命令:'), ''];
          categoryOrder.forEach(cat => {
            const cmds = categorized.get(cat);
            if (cmds && cmds.length > 0) {
              const catNames: Record<string, string> = {
                general: '通用',
                session: '会话',
                capabilities: '功能',
                settings: '设置',
                info: '信息',
              };
              helpLines.push(renderer.dim(`  ${catNames[cat] || cat}:`));
              cmds.forEach(cmd => {
                const aliases = cmd.alias ? renderer.dim(` (${cmd.alias.join(', ')})`) : '';
                helpLines.push(`    ${renderer.primary(`/${cmd.name}`.padEnd(12))} - ${cmd.description}${aliases}`);
              });
              helpLines.push('');
            }
          });

          helpLines.push(renderer.bold('💡 提示:'));
          helpLines.push(`  输入 ${renderer.primary('/help <command>')} 查看详细用法`);
          helpLines.push(`  输入 ${renderer.primary('/<command> --help')} 查看命令帮助`);
          helpLines.push('');

          helpLines.push(renderer.bold('⌨️  快捷键:'));
          helpLines.push(`  ${renderer.primary('Tab')}        自动补全命令/技能`);
          helpLines.push(`  ${renderer.primary('Ctrl+C')}    退出 (按两次确认)`);
          helpLines.push(`  ${renderer.primary('Ctrl+L')}    清屏`);
          helpLines.push(`  ${renderer.primary('↑/↓')}       浏览历史记录`);
          helpLines.push('');

          renderer.box(helpLines, '❓ 帮助');
          break;

        case 'clear':
        case 'c':
          renderer.clear();
          messages = [];
          currentSession = null;
          conversationManager.clearCurrentSession();
          eventLogger.clear();
          renderer.systemMessage('对话历史已清空', 'success');
          break;

        case 'exit':
        case 'quit':
        case 'q':
          if (config.autoSave && messages.length > 0) {
            saveAutosave({
              id: currentSession?.id || 'autosave',
              name: 'Autosave',
              messages,
              createdAt: currentSession?.createdAt || Date.now(),
              updatedAt: Date.now(),
              model: config.model || 'unknown',
            });
          }
          saveHistory(history);
          saveStats(stats);
          
          if (autosaveInterval) clearInterval(autosaveInterval);
          
          const eventStats = eventLogger.getStats();
          if (eventStats.totalEvents > 0) {
            console.log('');
            console.log(renderer.dim(`📊 本次会话: ${eventStats.totalEvents} 个事件, ${formatDuration(eventStats.uptime)}`));
          }
          
          console.log(renderer.secondary('👋 再见!'));
          rl.close();
          renderer.destroy();
          await agentInstance.destroy();
          exit(0);
          break;

        case 'setup':
          renderer.header('⚙️ Configuration Wizard', 'Interactive Setup');
          
          const setupProvider = await select('1. 选择 AI 提供商:', 
            Object.entries(PREDEFINED_PROVIDERS).map(([key, p]) => ({
              value: key,
              label: p.name,
              description: key === config?.provider ? '(当前)' : '',
            })),
            { pageSize: 6 }
          );
          
          if (setupProvider) {
            config.provider = setupProvider as ModelProvider;
            const provider = PREDEFINED_PROVIDERS[setupProvider as ModelProvider];
            
            const setupModel = await select('2. 选择模型:', 
              provider.models.map((m: { id: string; name: string }) => ({
                value: m.id,
                label: m.name,
                description: m.id === config?.model ? '(当前)' : '',
              })),
              { pageSize: 8 }
            );
            
            if (setupModel) {
              config.model = setupModel;
              
              const setupTheme = await select('3. 选择主题:', 
                Object.entries(THEMES).map(([key, t]) => ({
                  value: key,
                  label: t.name,
                  description: key === config?.theme ? '(当前)' : '',
                })),
                { pageSize: 6 }
              );
              
              if (setupTheme) {
                config.theme = setupTheme;
                renderer.setTheme(THEMES[setupTheme]);
                
                const setupStream = await confirm('4. 启用流式输出?', config.streamOutput !== false);
                config.streamOutput = setupStream;
                
                const setupTokens = await confirm('5. 显示 Token 统计?', config.showTokens !== false);
                config.showTokens = setupTokens;
                
                const setupAutoSave = await confirm('6. 启用自动保存?', config.autoSave !== false);
                config.autoSave = setupAutoSave;
                
                saveCLIConfig(config);
                
                renderer.successBox('配置完成', 
                  `Provider: ${config.provider}\n` +
                  `Model: ${config.model}\n` +
                  `Theme: ${config.theme}\n` +
                  `Stream: ${config.streamOutput ? 'enabled' : 'disabled'}\n` +
                  `Show Tokens: ${config.showTokens ? 'enabled' : 'disabled'}\n` +
                  `Auto Save: ${config.autoSave ? 'enabled' : 'disabled'}`
                );
              }
            }
          }
          break;

        case 'config':
          if (args) {
            const [key, ...valueParts] = args.split('=');
            const value = valueParts.join('=');
            if (key && value) {
              // 验证配置键
              const validKeys = ['theme', 'model', 'provider', 'baseUrl', 'autoSave', 'showTokens', 'streamOutput'];
              const trimmedKey = key.trim();

              if (!validKeys.includes(trimmedKey)) {
                renderer.systemMessage(`无效的配置项: ${trimmedKey}`, 'error');
                console.log(renderer.secondary('有效配置项: ' + validKeys.join(', ')));
                break;
              }

              const configObj = config as unknown as Record<string, unknown>;

              // 类型转换
              let parsedValue: unknown = value.trim();
              if (trimmedKey === 'autoSave' || trimmedKey === 'showTokens' || trimmedKey === 'streamOutput') {
                parsedValue = value.trim().toLowerCase() === 'true';
              }

              configObj[trimmedKey] = parsedValue;

              // 如果设置 baseUrl，同时更新 llm 配置
              if (trimmedKey === 'baseUrl') {
                config.llm = { ...config.llm, baseUrl: value.trim() } as SDKWorkConfig['llm'];
                agentInstance.setLLM(config.llm);
              }

              saveCLIConfig(config);
              renderer.systemMessage(`配置已更新: ${trimmedKey} = ${parsedValue}`, 'success');
            } else if (key && !value) {
              // 显示单个配置项
              const configObj = config as unknown as Record<string, unknown>;
              const val = configObj[key.trim()];
              console.log(`${key.trim()} = ${val}`);
            }
          } else {
            // 交互式配置
            const currentBaseUrl = (config.llm as { baseUrl?: string })?.baseUrl;
            const provider = PREDEFINED_PROVIDERS[config.provider || 'openai'];
            const defaultBaseUrl = provider?.defaultBaseUrl || '官方 API';
            
            const configOptions = [
              { value: 'theme', label: '主题', description: String(config.theme) },
              { value: 'model', label: '模型', description: String(config.model) },
              { value: 'provider', label: '提供商', description: String(config.provider) },
              { 
                value: 'baseUrl', 
                label: 'Base URL', 
                description: currentBaseUrl 
                  ? (currentBaseUrl.length > 30 ? currentBaseUrl.slice(0, 30) + '...' : currentBaseUrl)
                  : `默认 (${defaultBaseUrl})`
              },
              { value: 'autoSave', label: '自动保存', description: config.autoSave ? '启用' : '禁用' },
              { value: 'showTokens', label: '显示Token', description: config.showTokens ? '启用' : '禁用' },
              { value: 'streamOutput', label: '流式输出', description: config.streamOutput ? '启用' : '禁用' },
            ];
            
            const selectedConfig = await select('⚙️ 选择要修改的配置:', configOptions, {
              pageSize: 5,
              theme: getSelectorTheme(renderer),
            });
            
            if (selectedConfig) {
              if (selectedConfig === 'theme') {
                // 切换主题
                const themeOptions = Object.entries(THEMES).map(([key, t]) => ({
                  value: key,
                  label: t.name,
                  description: key === config.theme ? '(当前)' : '',
                }));
                const newTheme = await select('选择主题:', themeOptions);
                if (newTheme && THEMES[newTheme]) {
                  renderer.setTheme(THEMES[newTheme]);
                  config.theme = newTheme;
                  saveCLIConfig(config);
                }
              } else if (selectedConfig === 'model') {
                // 切换模型
                const provider = PREDEFINED_PROVIDERS[config.provider || 'openai'];
                const modelOptions = provider?.models.map(m => ({
                  value: m.id,
                  label: m.name,
                  description: m.id === config.model ? '(当前)' : '',
                })) || [];
                const newModel = await select('选择模型:', modelOptions);
                if (newModel) {
                  config.model = newModel;
                  saveCLIConfig(config);
                }
              } else if (selectedConfig === 'baseUrl') {
                const currentBaseUrl = (config.llm as { baseUrl?: string })?.baseUrl || '';
                const providerForUrl = PREDEFINED_PROVIDERS[config.provider || 'openai'];
                const defaultUrl = providerForUrl?.defaultBaseUrl || '官方 API';
                
                console.log('');
                console.log(`  ${renderer.dim('当前设置:')} ${currentBaseUrl ? renderer.info(currentBaseUrl) : renderer.muted('未设置 (使用默认)')}`);
                console.log(`  ${renderer.dim('默认地址:')} ${renderer.secondary(defaultUrl)}`);
                console.log('');
                
                const newBaseUrl = await prompt(
                  '请输入新的 Base URL (留空重置为默认，输入 "-" 清除)',
                  currentBaseUrl
                );
                
                if (newBaseUrl !== null) {
                  if (newBaseUrl === '-') {
                    config.llm = { ...config.llm, baseUrl: undefined } as SDKWorkConfig['llm'];
                    agentInstance.setLLM(config.llm);
                    saveCLIConfig(config);
                    renderer.systemMessage('Base URL 已清除，将使用默认地址', 'success');
                  } else if (newBaseUrl === '') {
                    config.llm = { ...config.llm, baseUrl: undefined } as SDKWorkConfig['llm'];
                    agentInstance.setLLM(config.llm);
                    saveCLIConfig(config);
                    renderer.systemMessage(`Base URL 已重置为默认: ${defaultUrl}`, 'success');
                  } else {
                    try {
                      new URL(newBaseUrl);
                      config.llm = { ...config.llm, baseUrl: newBaseUrl } as SDKWorkConfig['llm'];
                      agentInstance.setLLM(config.llm);
                      saveCLIConfig(config);
                      renderer.systemMessage(`Base URL 已设置为: ${newBaseUrl}`, 'success');
                    } catch (err) {
                      logger.debug('Invalid URL format', { url: newBaseUrl, error: err instanceof Error ? err.message : String(err) });
                      renderer.systemMessage('无效的 URL 格式，请输入有效的 URL (如 https://api.example.com/v1)', 'error');
                    }
                  }
                }
              } else if (selectedConfig === 'autoSave' || selectedConfig === 'showTokens' || selectedConfig === 'streamOutput') {
                // 切换布尔值
                const boolOptions = [
                  { value: 'true', label: '启用' },
                  { value: 'false', label: '禁用' },
                ];
                const configObj = config as unknown as Record<string, unknown>;
                const currentVal = configObj[selectedConfig];
                const newVal = await select(`设置 ${selectedConfig}:`, boolOptions, {
                  defaultIndex: currentVal ? 0 : 1,
                });
                if (newVal) {
                  configObj[selectedConfig] = newVal === 'true';
                  saveCLIConfig(config);
                  renderer.systemMessage(`${selectedConfig} 已${newVal === 'true' ? '启用' : '禁用'}`, 'success');
                }
              }
            }
          }
          break;

        case 'skills':
        case 'ls':
          if (!args) {
            break;
          }
          
          const skillsList = agentInstance.skills.list();
          if (skillsList.length === 0) {
            renderer.systemMessage('暂无可用技能', 'warning');
          } else {
            let filteredSkills = [...skillsList];
            let activeCategory: string | null = null;
            let searchQuery: string | null = null;
            
            const trimmedArgs = args.trim();
            const categoryOrder = ['文本处理', '代码开发', '文件操作', '分析搜索', '工具集成', '其他'];
            
            if (categoryOrder.includes(trimmedArgs)) {
              activeCategory = trimmedArgs;
              filteredSkills = filteredSkills.filter(s => getSkillCategory(s.name) === activeCategory);
            } else {
              searchQuery = trimmedArgs.toLowerCase();
              filteredSkills = filteredSkills.filter(s => 
                s.name.toLowerCase().includes(searchQuery!) || 
                (s.description && s.description.toLowerCase().includes(searchQuery!))
              );
            }
            
            console.log('');
            const headerTitle = searchQuery 
              ? `🔍 搜索结果: "${searchQuery}"` 
              : activeCategory 
                ? `📁 ${activeCategory}` 
                : '🔧 可用技能';
            console.log(`${renderer.bold(headerTitle)} ${renderer.dim(`(${filteredSkills.length} 个)`)}`);
            console.log('');
            
            if (filteredSkills.length === 0) {
              console.log(renderer.dim('  没有找到匹配的技能'));
              console.log('');
            } else {
              const categorized = new Map<string, Skill[]>();
              filteredSkills.forEach(skill => {
                const category = getSkillCategory(skill.name);
                if (!categorized.has(category)) {
                  categorized.set(category, []);
                }
                categorized.get(category)!.push(skill);
              });
              
              const maxNameLen = Math.max(...filteredSkills.map(s => s.name.length));
              
              categoryOrder.forEach(category => {
                const skillsInCategory = categorized.get(category);
                if (skillsInCategory && skillsInCategory.length > 0) {
                  if (!activeCategory) {
                    console.log(`  ${renderer.secondary('📁 ' + category)}`);
                  }
                  skillsInCategory.forEach((s) => {
                    const icon = getSkillIcon(s.name);
                    const name = renderer.primary(s.name.padEnd(maxNameLen + 2));
                    const desc = formatSkillDescription(s, 55);
                    const paramHint = renderer.dim(`[${getSkillParameterHint(s)}]`);
                    const version = s.version ? renderer.dim(` v${s.version}`) : '';
                    const prefix = activeCategory ? '  ' : '    ';
                    console.log(`${prefix}${icon} ${name} ${desc} ${paramHint}${version}`);
                  });
                  console.log('');
                }
              });
              
              if (filteredSkills.length > 0) {
                const allSkillOptions: Array<{ value: string; label: string; description: string }> = [];
                
                categoryOrder.forEach(category => {
                  const skillsInCategory = categorized.get(category);
                  if (skillsInCategory && skillsInCategory.length > 0) {
                    skillsInCategory.forEach(s => {
                      const icon = getSkillIcon(s.name);
                      const paramHint = getSkillParameterHint(s);
                      const desc = `${category} | ${paramHint} | ${formatSkillDescription(s, 40)}`;
                      allSkillOptions.push({
                        value: s.name,
                        label: `${icon} ${s.name}`,
                        description: desc
                      });
                    });
                  }
                });
                
                const selectOptions = [
                  { value: '__cancel__', label: '❌ 返回命令行', description: '不选择任何技能' },
                  ...allSkillOptions
                ];
                
                const selectedSkill = await select('⬇️ 选择要执行的技能 (或返回):', selectOptions, {
                  pageSize: 15,
                  theme: getSelectorTheme(renderer),
                });
                
                if (selectedSkill && selectedSkill !== '__cancel__') {
                  return await handleCommand('skill', selectedSkill);
                }
              }
            }
          }
          break;

        case 'active':
          const activeCmd = args.trim().toLowerCase();
          
          if (activeCmd === 'clear') {
            activeSkill = null;
            lastSkillExecution = null;
            updatePrompt();
            renderer.systemMessage('已清除活动技能，返回普通对话模式', 'success');
          } else if (activeCmd) {
            const targetSkill = await agentInstance.skills.getByName(activeCmd);
            if (targetSkill) {
              activeSkill = targetSkill.name;
              lastSkillExecution = null;
              updatePrompt();
              const icon = getSkillIcon(targetSkill.name);
              renderer.successBox('活动技能已设置', `${icon} ${targetSkill.name}\n现在可以直接输入内容来使用此技能`);
            } else {
              renderer.systemMessage(`技能未找到: ${activeCmd}`, 'error');
            }
          } else {
            if (activeSkill) {
              const icon = getSkillIcon(activeSkill);
              const skillInfo: string[] = ['', `${icon} ${renderer.bold(activeSkill)}`, ''];
              
              if (lastSkillExecution) {
                skillInfo.push(renderer.dim('  上次执行参数:'));
                Object.entries(lastSkillExecution.params).forEach(([k, v]) => {
                  const valueStr = typeof v === 'object' 
                    ? JSON.stringify(v).slice(0, 40) 
                    : String(v).slice(0, 40);
                  skillInfo.push(`    ${renderer.primary(k)}: ${valueStr}`);
                });
                skillInfo.push('');
              }
              
              skillInfo.push(renderer.dim('  命令:'));
              skillInfo.push(`    ${renderer.primary('/active clear')} - 清除活动技能`);
              skillInfo.push(`    ${renderer.primary('/active <name>')} - 切换到其他技能`);
              skillInfo.push('');
              skillInfo.push(renderer.dim('  直接输入内容即可使用此技能'));
              skillInfo.push('');
              
              renderer.box(skillInfo, '⚡ 当前活动技能');
            } else {
              const noActiveSkillInfo: string[] = ['', renderer.dim('  当前没有活动技能'), '', renderer.dim('  使用:'), `    ${renderer.primary('/skill <name>')} - 执行技能后可设为活动`, `    ${renderer.primary('/active <name>')} - 直接设置活动技能`, ''];
              renderer.box(noActiveSkillInfo, '⚡ 活动技能');
            }
          }
          break;

        case 'skill':
          let skillRetry = true;
          let skillRetryArgs = args;
          
          while (skillRetry) {
            skillRetry = false;
            args = skillRetryArgs;
          
          if (!args) {
            const allSkills = agentInstance.skills.list();
            if (allSkills.length === 0) {
              renderer.systemMessage('暂无可用技能', 'warning');
              break;
            }
            
            const categorized = new Map<string, Skill[]>();
            allSkills.forEach(skill => {
              const category = getSkillCategory(skill.name);
              if (!categorized.has(category)) {
                categorized.set(category, []);
              }
              categorized.get(category)!.push(skill);
            });
            
            const categoryOrder = ['文本处理', '代码开发', '文件操作', '分析搜索', '工具集成', '其他'];
            const allSkillOptions: Array<{ value: string; label: string; description: string }> = [];
            
            categoryOrder.forEach(category => {
              const skillsInCategory = categorized.get(category);
              if (skillsInCategory && skillsInCategory.length > 0) {
                skillsInCategory.forEach(s => {
                  const icon = getSkillIcon(s.name);
                  const paramHint = getSkillParameterHint(s);
                  const desc = `${category} | ${paramHint} | ${formatSkillDescription(s, 40)}`;
                  allSkillOptions.push({
                    value: s.name,
                    label: `${icon} ${s.name}`,
                    description: desc
                  });
                });
              }
            });
            
            const selectedSkill = await select('⚡ 选择技能:', allSkillOptions, {
              pageSize: 12,
              theme: getSelectorTheme(renderer),
            });
            
            if (selectedSkill) {
              args = selectedSkill;
            } else {
              break;
            }
          }

          if (args) {
            const skillArgs = args.trim();
            const firstSpace = skillArgs.indexOf(' ');
            const skillName = firstSpace > 0 ? skillArgs.slice(0, firstSpace) : skillArgs;
            const naturalInput = firstSpace > 0 ? skillArgs.slice(firstSpace + 1).trim() : '';
            
            const skill = await agentInstance.skills.getByName(skillName);

            if (!skill) {
              renderer.systemMessage(`技能未找到: ${skillName}`, 'error');
              const similar = agentInstance.skills.list().filter(s => 
                s.name.toLowerCase().includes(skillName.toLowerCase()) ||
                skillName.toLowerCase().includes(s.name.toLowerCase())
              );
              if (similar.length > 0) {
                console.log(renderer.secondary('您是否想要:'));
                similar.slice(0, 5).forEach(s => console.log(`  ${renderer.primary('•')} ${s.name}`));
              }
              break;
            }

            if (naturalInput === '--help' || naturalInput === '-h') {
              const icon = getSkillIcon(skill.name);
              const category = getSkillCategory(skill.name);
              const inputSchema = skill.input;
              const requiredParams: string[] = inputSchema?.required || [];
              const properties = inputSchema?.properties || {};
              
              console.log('');
              const helpLines: string[] = [
                '',
                `${icon} ${renderer.bold(skill.name)}${skill.version ? renderer.dim(` v${skill.version}`) : ''}`,
                `${renderer.dim('📁 分类:')} ${category}`,
                `${renderer.dim('📝 描述:')} ${skill.description}`,
                '',
              ];
              
              if (Object.keys(properties).length > 0) {
                helpLines.push(renderer.bold('📋 参数:'));
                const maxParamLen = Math.max(...Object.keys(properties).map(p => p.length));
                
                Object.entries(properties).forEach(([paramName, paramDef]) => {
                  const def = paramDef as { type?: string; description?: string; enum?: string[]; default?: unknown };
                  const isRequired = requiredParams.includes(paramName);
                  const requiredMark = isRequired ? renderer.error('*') : ' ';
                  const typeInfo = def.type || 'any';
                  const defaultInfo = def.default !== undefined ? renderer.dim(` (默认: ${def.default})`) : '';
                  const enumInfo = def.enum ? renderer.dim(` [${def.enum.join('|')}]`) : '';
                  
                  helpLines.push(`  ${renderer.primary(paramName.padEnd(maxParamLen))}${requiredMark} ${renderer.dim(`<${typeInfo}>`)} ${def.description || ''}${defaultInfo}${enumInfo}`);
                });
                helpLines.push('');
                helpLines.push(`${renderer.dim('*')} ${renderer.dim('必填参数')}`);
              }
              
              helpLines.push('');
              helpLines.push(`${renderer.dim('💡 用法:')} /skill ${skillName} [params]`);
              helpLines.push(`${renderer.dim('   示例:')} /skill ${skillName} param1=value1 param2=value2`);
              helpLines.push('');
              
              renderer.box(helpLines, '📖 技能帮助');
              break;
            }

            const inputSchema = skill.input;
            const requiredParams: string[] = inputSchema?.required || [];
            const properties = inputSchema?.properties || {};
            const params: Record<string, unknown> = {};

            if (naturalInput) {
              const parsedParams = parseNaturalLanguageInput(naturalInput, properties);
              Object.assign(params, parsedParams);
            }

            const missingParams = requiredParams.filter((p: string) => !(p in params) && !(properties[p] as { default?: unknown })?.default);
            
            if (missingParams.length > 0) {
              console.log('');
              console.log(renderer.bold('📝 请填写必填参数:'));
              
              if (lastSkillExecution && lastSkillExecution.name === skillName) {
                console.log(renderer.dim('  💡 提示: 按 Enter 使用上次的值'));
              }
              console.log('');
              
              for (const paramName of missingParams) {
                const def = properties[paramName] as { 
                  type?: string; 
                  description?: string; 
                  enum?: string[];
                  default?: unknown;
                };
                
                const typeInfo = def.type ? `<${def.type}>` : '';
                const descInfo = def.description ? ` - ${def.description}` : '';
                const promptText = `${renderer.primary(paramName)}${typeInfo}${descInfo}`;
                
                let inputValue: string | null | undefined;
                
                const hasLastValue = lastSkillExecution && 
                                     lastSkillExecution.name === skillName && 
                                     lastSkillExecution.params[paramName] !== undefined;
                const lastValue = hasLastValue ? lastSkillExecution!.params[paramName] : undefined;
                
                if (def.enum && def.enum.length > 0) {
                  console.log(`  ${renderer.dim('请选择:')}`);
                  const enumOptions = def.enum.map(v => ({
                    value: String(v),
                    label: String(v),
                  }));
                  const defaultIndex = hasLastValue 
                    ? enumOptions.findIndex(opt => opt.value === String(lastValue))
                    : -1;
                  inputValue = await select(promptText, enumOptions, {
                    theme: getSelectorTheme(renderer),
                    defaultIndex: defaultIndex >= 0 ? defaultIndex : 0
                  });
                } else if (def.type === 'boolean') {
                  console.log(`  ${renderer.dim('请选择:')}`);
                  const boolOptions = [
                    { value: 'true', label: '是 (true)' },
                    { value: 'false', label: '否 (false)' }
                  ];
                  const defaultIndex = hasLastValue 
                    ? (lastValue ? 0 : 1)
                    : (def.default ? 0 : 1);
                  inputValue = await select(promptText, boolOptions, {
                    theme: getSelectorTheme(renderer),
                    defaultIndex
                  });
                } else {
                  let defaultValue: string | undefined;
                  let defaultHint: string = '';
                  
                  if (hasLastValue) {
                    defaultValue = typeof lastValue === 'object' 
                      ? JSON.stringify(lastValue) 
                      : String(lastValue);
                    defaultHint = ` (上次: ${defaultValue})`;
                  } else if (def.default !== undefined) {
                    defaultValue = String(def.default);
                    defaultHint = ` (默认: ${defaultValue})`;
                  }
                  
                  inputValue = await prompt(`${promptText}${defaultHint}`, defaultValue || '');
                }
                
                if (inputValue !== null && inputValue !== undefined) {
                  if (inputValue.trim() !== '') {
                    try {
                      if (def.type === 'number') {
                        const numValue = Number(inputValue);
                        if (isNaN(numValue)) {
                          renderer.systemMessage(`参数 ${paramName} 必须是数字，请重新输入`, 'error');
                          continue;
                        }
                        params[paramName] = numValue;
                      } else if (def.type === 'boolean') {
                        params[paramName] = inputValue.toLowerCase() === 'true' || inputValue === '1' || inputValue.toLowerCase() === 'yes';
                      } else {
                        params[paramName] = inputValue;
                      }
                    } catch (e) {
                      renderer.systemMessage(`参数 ${paramName} 格式错误，请重新输入`, 'error');
                      continue;
                    }
                  } else if (def.default !== undefined) {
                    params[paramName] = def.default;
                  }
                }
              }
            }

            const stillMissing = requiredParams.filter((p: string) => !(p in params));
            if (stillMissing.length > 0) {
              renderer.systemMessage(`缺少必填参数: ${stillMissing.join(', ')}`, 'error');
              break;
            }

            const allParams = { ...properties };
            for (const [key, def] of Object.entries(allParams)) {
              const defTyped = def as { default?: unknown };
              if (!(key in params) && defTyped.default !== undefined) {
                params[key] = defTyped.default;
              }
            }

            console.log('');
            const icon = getSkillIcon(skill.name);
            console.log(`${icon} ${renderer.bold(skill.name)}${skill.version ? renderer.dim(` v${skill.version}`) : ''}`);
            if (Object.keys(params).length > 0) {
              console.log('');
              console.log(renderer.dim('  参数:'));
              Object.entries(params).forEach(([k, v]) => {
                const valueStr = typeof v === 'object' 
                  ? JSON.stringify(v).slice(0, 50) 
                  : String(v).slice(0, 50);
                console.log(`    ${renderer.primary(k)}: ${renderer.highlight(valueStr)}`);
              });
            }

            const executionStartTime = Date.now();

            try {
              renderer.startLoading('执行中...', '⚡');
              const skillResult = await agentInstance.executeSkill(skill.id, JSON.stringify(params));
              const executionDuration = Date.now() - executionStartTime;
              renderer.succeedLoading(`${formatDuration(executionDuration)}`);

              if (skillResult.success) {
                const resultData = skillResult.data;
                console.log('');
                console.log(renderer.bold('✅ 执行成功!'));
                console.log('');
                
                if (typeof resultData === 'string') {
                  if (resultData.includes('\n')) {
                    console.log(resultData);
                  } else {
                    console.log(`${renderer.success('→')} ${resultData}`);
                  }
                } else if (resultData !== undefined && resultData !== null) {
                  const jsonStr = JSON.stringify(resultData, null, 2);
                  if (jsonStr.length > 500) {
                    const lines = jsonStr.split('\n');
                    console.log(lines.slice(0, 20).join('\n'));
                    if (lines.length > 20) {
                      console.log('');
                      console.log(renderer.dim(`  ... (${lines.length - 20} 行已省略, 共 ${lines.length} 行)`));
                    }
                  } else {
                    console.log(jsonStr);
                  }
                } else {
                  console.log(renderer.dim('  (无返回数据)'));
                }
                
                console.log('');
                stats.toolsUsed[skillName] = (stats.toolsUsed[skillName] || 0) + 1;
                saveStats(stats);
                
                // 设置活动技能，保持上下文
                activeSkill = skillName;
                lastSkillExecution = {
                  name: skillName,
                  params: { ...params },
                  result: resultData
                };
                updatePrompt();
                
                // 询问用户是否继续使用此技能
                const continueOptions = [
                  { value: 'continue', label: '🔄 继续使用此技能', description: '保持上下文，继续执行' },
                  { value: 'new', label: '📝 新参数执行', description: '使用新参数重新执行' },
                  { value: 'chat', label: '💬 返回对话模式', description: '保持活动技能，返回普通对话' },
                  { value: 'clear', label: '❌ 清除活动技能', description: '完全清除活动技能' },
                ];
                
                const continueChoice = await select('接下来做什么?', continueOptions, {
                  pageSize: 4,
                  theme: getSelectorTheme(renderer)
                });
                
                if (continueChoice === 'continue') {
                  skillRetryArgs = skillName;
                  skillRetry = true;
                } else if (continueChoice === 'new') {
                  args = skillName;
                  skillRetry = true;
                } else if (continueChoice === 'chat') {
                  renderer.systemMessage('已返回对话模式，活动技能保持激活', 'info');
                  renderer.systemMessage('直接输入内容会使用活动技能处理', 'info');
                } else if (continueChoice === 'clear') {
                  activeSkill = null;
                  lastSkillExecution = null;
                  updatePrompt();
                  renderer.systemMessage('已清除活动技能，返回普通对话模式', 'info');
                }
              } else {
                console.log('');
                console.log(renderer.bold('❌ 执行失败'));
                console.log('');
                console.log(`${renderer.error('错误:')} ${skillResult.error?.message || '未知错误'}`);
                console.log('');
                
                const options = [
                  { value: 'retry', label: '🔄 重试', description: '使用相同参数重新执行' },
                  { value: 'params', label: '📝 修改参数', description: '重新输入参数后执行' },
                  { value: 'cancel', label: '❌ 取消', description: '返回命令行' },
                ];
                
                const choice = await select('请选择:', options, { 
                  pageSize: 3, 
                  theme: getSelectorTheme(renderer) 
                });
                
                if (choice === 'retry') {
                  skillRetryArgs = `${skillName} ${naturalInput}`;
                  skillRetry = true;
                } else if (choice === 'params') {
                  args = skillName;
                  skillRetry = true;
                }
              }
            } catch (skillError) {
              const executionDuration = Date.now() - executionStartTime;
              renderer.failLoading(`执行失败 (${formatDuration(executionDuration)})`);
              console.log('');
              
              const errorMessage = skillError instanceof Error ? skillError.message : String(skillError);
              let hint = '请检查配置或稍后重试';
              
              if (errorMessage.includes('401') || errorMessage.includes('Unauthorized') || errorMessage.includes('AuthenticationError')) {
                hint = 'API Key 配置无效，请使用 /setup 或 /config 重新配置 API Key';
              } else if (errorMessage.includes('429') || errorMessage.includes('rate limit')) {
                hint = '请求过于频繁，请稍后重试';
              } else if (errorMessage.includes('ENOTFOUND') || errorMessage.includes('ECONNREFUSED')) {
                hint = '网络连接失败，请检查网络设置或 Base URL 配置';
              } else if (errorMessage.includes('timeout')) {
                hint = '请求超时，请检查网络或稍后重试';
              } else if (errorMessage.includes('insufficient_quota')) {
                hint = 'API 配额不足，请充值后重试';
              } else if (errorMessage.includes('model')) {
                hint = '模型不可用，请使用 /model 切换模型';
              }
              
              renderer.errorBox('错误', errorMessage, hint);
              console.log('');
              
              const options = [
                { value: 'retry', label: '🔄 重试', description: '使用相同参数重试' },
                { value: 'params', label: '📝 修改参数', description: '重新输入参数' },
                { value: 'setup', label: '⚙️ 配置 API Key', description: '运行配置向导' },
                { value: 'cancel', label: '❌ 取消', description: '取消执行' },
              ];
              
              const choice = await select('请选择:', options, { 
                pageSize: 4, 
                theme: getSelectorTheme(renderer) 
              });
              
              if (choice === 'retry') {
                skillRetryArgs = `${skillName} ${naturalInput}`;
                skillRetry = true;
              } else if (choice === 'params') {
                args = skillName;
                skillRetry = true;
              } else if (choice === 'setup') {
                const setupResult = await showConfigWizard(renderer);
                if (setupResult) {
                  Object.assign(config, setupResult);
                  agentInstance.setLLM(config.llm);
                  skillRetryArgs = `${skillName} ${naturalInput}`;
                  skillRetry = true;
                }
              }
            }
          }
          }
          break;

        case 'tools':
          const toolsList = agentInstance.tools.list();
          renderer.box([
            '',
            renderer.bold(`可用工具 (${toolsList.length}):`),
            ...toolsList.map(t => `  ${renderer.primary('•')} ${t.name}: ${renderer.dim(t.description)}`),
            '',
          ], '🔨 工具');
          break;

        case 'theme':
          if (args) {
            const themeName = args.trim();
            if (THEMES[themeName]) {
              renderer.setTheme(THEMES[themeName]);
              config.theme = themeName;
              saveCLIConfig(config);
              renderer.systemMessage(`主题已切换为: ${themeName}`, 'success');
            } else {
              renderer.systemMessage(`未知主题: ${args}`, 'error');
              console.log(renderer.secondary('可用主题: ' + Object.keys(THEMES).join(', ')));
            }
          } else {
            // 使用交互式选择器
            const themeOptions = Object.entries(THEMES).map(([key, t]) => ({
              value: key,
              label: t.name,
              description: key === config.theme ? '(当前)' : '',
            }));
            
            const currentIdx = Object.keys(THEMES).indexOf(config.theme || 'default');
            
            const selectedTheme = await select('🎨 选择主题:', themeOptions, {
              defaultIndex: currentIdx >= 0 ? currentIdx : 0,
              pageSize: 6,
              theme: getSelectorTheme(renderer),
            });
            
            if (selectedTheme && THEMES[selectedTheme]) {
              renderer.setTheme(THEMES[selectedTheme]);
              config.theme = selectedTheme;
              saveCLIConfig(config);
            }
          }
          break;

        case 'model':
          if (args) {
            config.model = args.trim();
            config.llm = { ...config.llm, model: config.model } as SDKWorkConfig['llm'];
            agentInstance.setLLM(config.llm);
            saveCLIConfig(config);
            renderer.systemMessage(`模型已切换为: ${args}`, 'success');
          } else {
            await showModelSettings(renderer, config, agentInstance);
          }
          break;

        case 'session':
          const sessionCmd = args.trim() || 'list';
          const sessions = loadSessions();

          if (sessionCmd === 'list') {
            if (sessions.length === 0) {
              renderer.systemMessage('暂无保存的会话', 'info');
              console.log(renderer.dim('使用 /session save 保存当前会话'));
            } else {
              // 使用交互式选择器
              const sessionOptions = sessions.map((s, _i) => ({
                value: s.id,
                label: s.name,
                description: `${new Date(s.updatedAt).toLocaleDateString()} | ${s.messages.length} 条消息`,
              }));
              
              const selectedSessionId = await select('💾 选择会话 (Enter 加载, Esc 返回):', sessionOptions, {
                pageSize: 8,
                theme: getSelectorTheme(renderer),
              });
              
              if (selectedSessionId) {
                const session = sessions.find(s => s.id === selectedSessionId);
                if (session) {
                  messages = [...session.messages];
                  currentSession = session;
                  renderer.systemMessage(`已加载会话: ${session.name} (${session.messages.length} 条消息)`, 'success');
                  session.messages.slice(-3).forEach(m => renderer.message(m.role, m.content));
                }
              }
            }
          } else if (sessionCmd === 'save') {
            if (messages.length === 0) {
              renderer.systemMessage('当前会话为空', 'warning');
            } else {
              const session: Session = {
                id: currentSession?.id || `session-${Date.now()}`,
                name: currentSession?.name || `Session ${sessions.length + 1}`,
                messages: [...messages],
                createdAt: currentSession?.createdAt || Date.now(),
                updatedAt: Date.now(),
                model: config.model || 'unknown',
              };
              saveSession(session);
              currentSession = session;
              stats.sessionsCount++;
              saveStats(stats);
              renderer.systemMessage(`会话已保存: ${session.name}`, 'success');
            }
          } else if (sessionCmd === 'auto') {
            config.autoSave = !config.autoSave;
            saveCLIConfig(config);
            renderer.systemMessage(`自动保存已${config.autoSave ? '启用' : '禁用'}`, 'success');
          } else if (sessionCmd.startsWith('load ')) {
            const sessionId = sessionCmd.slice(5);
            const session = sessions.find(s => s.id === sessionId || s.name === sessionId || s.id === `session-${sessionId}`);
            if (session) {
              messages = [...session.messages];
              currentSession = session;
              renderer.systemMessage(`已加载会话: ${session.name} (${session.messages.length} 条消息)`, 'success');
              session.messages.slice(-3).forEach(m => renderer.message(m.role, m.content));
            } else {
              renderer.systemMessage('会话未找到', 'error');
            }
          } else if (sessionCmd.startsWith('delete ')) {
            const sessionId = sessionCmd.slice(7);
            deleteSession(sessionId);
            renderer.systemMessage('会话已删除', 'success');
          } else if (sessionCmd === 'delete') {
            // 交互式删除
            if (sessions.length === 0) {
              renderer.systemMessage('暂无可删除的会话', 'info');
            } else {
              const sessionOptions = sessions.map(s => ({
                value: s.id,
                label: s.name,
                description: `${s.messages.length} 条消息`,
              }));
              
              const selectedSessionId = await select('🗑️ 选择要删除的会话:', sessionOptions, {
                pageSize: 8,
                theme: {
                  primary: renderer.primary(''),
                  secondary: renderer.secondary(''),
                  selected: renderer.error(''),
                  disabled: renderer.muted(''),
                  pointer: renderer.error('❯'),
                  active: '',
                },
              });
              
              if (selectedSessionId) {
                const confirmed = await confirm('确定要删除此会话吗?', false);
                if (confirmed) {
                  deleteSession(selectedSessionId);
                  renderer.systemMessage('会话已删除', 'success');
                }
              }
            }
          }
          break;

        case 'status':
          const currentBaseUrlStatus = (config.llm as { baseUrl?: string })?.baseUrl;
          const providerStatus = PREDEFINED_PROVIDERS[config.provider || 'openai'];
          const defaultBaseUrlStatus = providerStatus?.defaultBaseUrl || '官方 API';
          
          const statusLines: string[] = [
            '',
            `${renderer.primary('●')} ${renderer.bold('Agent Status')}`,
            '',
          ];
          
          statusLines.push(`  ${renderer.dim('Provider:')} ${renderer.info(config.provider || 'default')}`);
          statusLines.push(`  ${renderer.dim('Model:')} ${renderer.success(config.model || 'unknown')}`);
          statusLines.push(`  ${renderer.dim('Base URL:')} ${currentBaseUrlStatus ? renderer.info(currentBaseUrlStatus) : renderer.muted(`默认 (${defaultBaseUrlStatus})`)}`);
          statusLines.push(`  ${renderer.dim('Theme:')} ${renderer.info(config?.theme || 'default')}`);
          statusLines.push(`  ${renderer.dim('Stream:')} ${config.streamOutput ? renderer.success('enabled') : renderer.warning('disabled')}`);
          statusLines.push(`  ${renderer.dim('Auto-save:')} ${config.autoSave ? renderer.success('enabled') : renderer.warning('disabled')}`);
          statusLines.push('');
          
          statusLines.push(`  ${renderer.dim('Messages:')} ${messages.length}`);
          statusLines.push(`  ${renderer.dim('Tokens:')} ${stats.totalTokens.toLocaleString()}`);
          statusLines.push(`  ${renderer.dim('Session:')} ${currentSession?.name || 'unnamed'}`);
          statusLines.push('');
          
          const eventStatsStatus = eventLogger.getStats();
          statusLines.push(`  ${renderer.dim('Events:')} ${eventStatsStatus.totalEvents}`);
          statusLines.push(`  ${renderer.dim('Uptime:')} ${formatDuration(eventStatsStatus.uptime)}`);
          statusLines.push('');
          
          renderer.box(statusLines, '📊 Current Status');
          break;

        case 'stats':
          const uptime = Math.floor((Date.now() - stats.startTime) / 1000);
          const hours = Math.floor(uptime / 3600);
          const minutes = Math.floor((uptime % 3600) / 60);
          
          const convStats = conversationManager.getStats();
          
          renderer.box([
            '',
            `${renderer.primary('运行时间:')} ${hours}h ${minutes}m`,
            `${renderer.primary('总消息数:')} ${stats.totalMessages}`,
            `${renderer.primary('总 Token 数:')} ${stats.totalTokens.toLocaleString()}`,
            `${renderer.primary('会话数:')} ${stats.sessionsCount}`,
            '',
            renderer.bold('对话统计:'),
            `  ${renderer.primary('•')} 用户消息: ${convStats.userMessages}`,
            `  ${renderer.primary('•')} 助手消息: ${convStats.assistantMessages}`,
            `  ${renderer.primary('•')} 工具调用: ${convStats.toolCalls}`,
            `  ${renderer.primary('•')} 技能调用: ${convStats.skillCalls}`,
            `  ${renderer.primary('•')} MCP 调用: ${convStats.mcpCalls}`,
            `  ${renderer.primary('•')} 思考步骤: ${convStats.thinkingSteps}`,
            '',
            renderer.bold('技能使用统计:'),
            ...Object.entries(stats.toolsUsed)
              .sort((a, b) => b[1] - a[1])
              .slice(0, 5)
              .map(([tool, count]) => `  ${renderer.primary('•')} ${tool}: ${count} 次`),
            '',
            renderer.bold('命令使用统计:'),
            ...Object.entries(stats.commandsUsed)
              .sort((a, b) => b[1] - a[1])
              .slice(0, 5)
              .map(([cmd, count]) => `  ${renderer.primary('•')} /${cmd}: ${count} 次`),
            '',
          ], '📊 使用统计');
          break;

        case 'events':
          const eventCmd = args.trim().toLowerCase();
          if (eventCmd === 'clear') {
            eventLogger.clear();
            renderer.systemMessage('事件日志已清空', 'success');
          } else if (eventCmd === 'summary') {
            eventLogger.printSummary();
          } else {
            const eventStats = eventLogger.getStats();
            const eventCounts = Array.from(eventStats.eventCounts.entries())
              .sort((a, b) => b[1] - a[1])
              .slice(0, 15);
            
            const eventLines: string[] = [
              '',
              `${renderer.primary('总事件数:')} ${eventStats.totalEvents}`,
              `${renderer.primary('运行时间:')} ${formatDuration(eventStats.uptime)}`,
              '',
              renderer.bold('事件统计 (Top 15):'),
            ];
            
            for (const [type, count] of eventCounts) {
              const icon = getEventIcon(type);
              const category = getEventCategory(type);
              eventLines.push(`  ${icon} ${renderer.dim(`[${category}]`)} ${type}: ${count}`);
            }
            
            if (eventCounts.length === 0) {
              eventLines.push(`  ${renderer.dim('暂无事件记录')}`);
            }
            
            eventLines.push('');
            eventLines.push(renderer.dim('使用 /events summary 查看详细摘要'));
            eventLines.push(renderer.dim('使用 /events clear 清空事件日志'));
            eventLines.push('');
            
            renderer.box(eventLines, '📋 事件日志');
          }
          break;

        case 'history':
        case 'hist':
          const recentHistory = history.slice(-20);
          if (recentHistory.length === 0) {
            renderer.systemMessage('暂无历史记录', 'info');
          } else {
            console.log(renderer.bold('📜 命令历史:'));
            recentHistory.forEach((h, _i) => {
              const time = new Date(h.timestamp).toLocaleTimeString();
              console.log(`  ${renderer.dim(`${time}`)} ${h.input}`);
            });
          }
          break;

        case 'export':
          if (messages.length === 0) {
            renderer.systemMessage('当前会话为空', 'warning');
            break;
          }
          
          let format = args.trim();
          if (!format || !['markdown', 'md', 'json', 'txt', 'events'].includes(format.toLowerCase())) {
            const formatOptions = [
              { value: 'markdown', label: 'Markdown', description: '.md 文件' },
              { value: 'json', label: 'JSON', description: '.json 文件 (含事件日志)' },
              { value: 'txt', label: '纯文本', description: '.txt 文件' },
              { value: 'events', label: '事件日志', description: '仅事件日志' },
            ];
            
            const selectedFormat = await select('📄 选择导出格式:', formatOptions, {
              pageSize: 4,
              theme: getSelectorTheme(renderer),
            });
            
            if (!selectedFormat) break;
            format = selectedFormat;
          }
          
          try {
            const exportDir = join(CONFIG_DIR, 'exports');
            mkdirSync(exportDir, { recursive: true });
            
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
            let filename: string;
            let content: string;
            
            if (format === 'events') {
              filename = `events-${timestamp}.json`;
              const events = eventLogger.getEvents();
              const sessionStats = conversationManager.getStats();
              content = JSON.stringify({
                exportedAt: new Date().toISOString(),
                sessionStats,
                eventCount: events.length,
                events,
              }, null, 2);
            } else if (format === 'json') {
              filename = `export-${timestamp}.json`;
              const events = eventLogger.getEvents();
              const sessionStats = conversationManager.getStats();
              content = JSON.stringify({
                exportedAt: new Date().toISOString(),
                model: config.model,
                messageCount: messages.length,
                sessionStats,
                messages,
                events: events.slice(-100),
              }, null, 2);
            } else if (format === 'txt') {
              filename = `export-${timestamp}.txt`;
              content = messages.map(m => `[${m.role.toUpperCase()}]\n${m.content}`).join('\n\n---\n\n');
            } else {
              filename = `export-${timestamp}.md`;
              const sessionStats = conversationManager.getStats();
              const header = `# 会话导出\n\n导出时间: ${new Date().toLocaleString()}\n模型: ${config.model}\n消息数: ${messages.length}\n\n## 统计\n\n- 用户消息: ${sessionStats.userMessages}\n- 助手消息: ${sessionStats.assistantMessages}\n- 工具调用: ${sessionStats.toolCalls}\n- 技能调用: ${sessionStats.skillCalls}\n- MCP 调用: ${sessionStats.mcpCalls}\n- 思考步骤: ${sessionStats.thinkingSteps}\n\n---\n`;
              content = header + messages.map(m => `## ${m.role === 'user' ? '👤 用户' : '🤖 助手'}\n\n${m.content}\n`).join('\n---\n\n');
            }
            
            const filepath = join(exportDir, filename);
            writeFileSync(filepath, content, 'utf-8');
            
            renderer.successBox('导出成功', `文件: ${filename}\n路径: ${filepath}\n消息数: ${messages.length}`);
          } catch (exportError) {
            renderer.errorBox('导出失败', exportError instanceof Error ? exportError.message : String(exportError));
          }
          break;

        case 'redo':
          if (history.length < 2) {
            renderer.systemMessage('没有可重新执行的命令', 'warning');
            break;
          }
          // 获取倒数第二条历史（最后一条是当前命令）
          const lastInput = history[history.length - 2]?.input;
          if (lastInput) {
            console.log(renderer.dim(`重新执行: ${lastInput}`));
            if (lastInput.startsWith('/')) {
              const parts = lastInput.slice(1).split(' ');
              await handleCommand(parts[0].toLowerCase(), parts.slice(1).join(' '));
            } else {
              // 重新处理为用户输入 - 需要执行完整的聊天流程
              messages.push({ role: 'user', content: lastInput, timestamp: Date.now() });
              renderer.userMessage(lastInput);
              
              try {
                renderer.startLoading('Thinking...', '🧠');
                const response = await agentInstance.chat({
                  messages: messages.map(m => ({
                    role: m.role,
                    content: m.content,
                    id: crypto.randomUUID(),
                    timestamp: m.timestamp,
                  })),
                });
                renderer.succeedLoading('完成');

                const content = response.choices[0]?.message?.content;
                if (content && typeof content === 'string') {
                  messages.push({ role: 'assistant', content, timestamp: Date.now() });
                  renderer.assistantMessage(content);
                  stats.totalMessages += 2;
                  if (response.usage) {
                    stats.totalTokens += response.usage.totalTokens;
                  }
                  saveStats(stats);
                }
              } catch (error) {
                renderer.failLoading('失败');
                renderer.errorBox('错误', error instanceof Error ? error.message : String(error));
              }
            }
          } else {
            renderer.systemMessage('没有可重新执行的命令', 'warning');
          }
          break;

        case 'provider':
          if (args) {
            // 解析参数，支持 providerName 或 providerName --baseUrl=url
            const parts = args.trim().split(/\s+/);
            const providerName = parts[0] as ModelProvider;
            const baseUrlMatch = args.match(/--baseUrl=(.+)/);
            const baseUrl = baseUrlMatch ? baseUrlMatch[1].trim() : undefined;

            if (PREDEFINED_PROVIDERS[providerName]) {
              config.provider = providerName;
              config.model = PREDEFINED_PROVIDERS[providerName].models[0]?.id;
              config.llm = {
                ...config.llm,
                provider: providerName,
                model: config.model,
                ...(baseUrl && { baseUrl }),
              } as SDKWorkConfig['llm'];
              agentInstance.setLLM(config.llm);
              saveCLIConfig(config);
              renderer.systemMessage(`提供商已切换为: ${PREDEFINED_PROVIDERS[providerName].displayName}`, 'success');
              renderer.systemMessage(`模型已切换为: ${config.model}`, 'info');
              if (baseUrl) {
                renderer.systemMessage(`Base URL 已设置为: ${baseUrl}`, 'info');
              }
            } else {
              renderer.systemMessage(`未知提供商: ${args}`, 'error');
              console.log(renderer.secondary('可用提供商: ' + Object.keys(PREDEFINED_PROVIDERS).join(', ')));
            }
          } else {
            await showModelSettings(renderer, config, agentInstance);
          }
          break;

        case 'undo':
          if (messages.length === 0) {
            renderer.systemMessage('没有可撤销的消息', 'warning');
          } else {
            // 移除最后一对消息（用户+助手）
            const lastRole = messages[messages.length - 1].role;
            let removedCount = 1;
            
            if (lastRole === 'assistant' && messages.length > 1 && messages[messages.length - 2].role === 'user') {
              messages.pop(); // 移除助手消息
              messages.pop(); // 移除用户消息
              removedCount = 2;
            } else {
              messages.pop();
            }
            
            renderer.systemMessage(`已撤销 ${removedCount} 条消息`, 'success');
            console.log(renderer.dim(`当前消息数: ${messages.length}`));
          }
          break;

        case 'compact':
          if (messages.length === 0) {
            renderer.systemMessage('对话历史为空', 'info');
            break;
          }
          
          const keepCount = args ? parseInt(args.trim()) : CONFIG_CONSTANTS.DEFAULT_KEEP_MESSAGES;
          if (isNaN(keepCount) || keepCount < 1) {
            renderer.systemMessage('无效的消息数量，请输入正整数', 'error');
            break;
          }
          
          if (keepCount > CONFIG_CONSTANTS.MAX_KEEP_MESSAGES) {
            renderer.systemMessage(`保留消息数不能超过 ${CONFIG_CONSTANTS.MAX_KEEP_MESSAGES}`, 'warning');
            break;
          }
          
          if (messages.length <= keepCount) {
            renderer.systemMessage(`当前消息数 (${messages.length}) 已小于保留数 (${keepCount})`, 'info');
            break;
          }
          
          const removedCount = messages.length - keepCount;
          const confirmed = await confirm(`确定要删除 ${removedCount} 条历史消息吗? (保留最近 ${keepCount} 条)`, false);
          
          if (confirmed) {
            messages = messages.slice(-keepCount);
            renderer.systemMessage(`已压缩对话历史，保留最近 ${keepCount} 条消息`, 'success');
          }
          break;

        default:
          renderer.systemMessage(`未知命令: /${command}`, 'error');
          console.log(renderer.secondary('输入 /help 查看可用命令'));
          
          // 建议相似命令
          const similar = COMMANDS.filter(cmd => {
            const name = cmd.name.toLowerCase();
            const input = command.toLowerCase();
            return name.includes(input) || input.includes(name) || 
                   cmd.alias?.some(a => a.includes(input) || input.includes(a));
          });
          if (similar.length > 0) {
            console.log(renderer.secondary('您是否想要:'));
            similar.slice(0, 3).forEach(cmd => {
              console.log(`  ${renderer.primary('•')} /${cmd.name}`);
            });
          }
      }
      return true;
    };

    // 确保 readline 状态正确的辅助函数
    const ensureReadlineReady = () => {
      try {
        process.stdout.write('\x1b[?25h');
        rl.prompt(true);
      } catch (e) {
        logger.debug('Failed to ensure readline ready', { error: e });
      }
    };

    // 处理输入
    rl.on('line', async (input) => {
      const trimmed = input.trim();
      if (!trimmed) { ensureReadlineReady(); return; }

      // 添加到历史
      history = addToHistory(history, trimmed);

      // 定期保存历史
      if (history.length % 10 === 0) {
        saveHistory(history);
      }

      // 显示提示
      interactionCount++;
      if (interactionCount % 5 === 0) {
        showHint();
      }

      // 命令处理
      if (trimmed.startsWith('/')) {
        const parts = trimmed.slice(1).split(' ');
        try {
          await handleCommand(parts[0].toLowerCase(), parts.slice(1).join(' '));
        } catch (cmdError) {
          renderer.errorBox('命令执行错误', cmdError instanceof Error ? cmdError.message : String(cmdError));
        }
        // 使用 setTimeout 确保 readline 状态恢复
        setTimeout(ensureReadlineReady, 10);
        return;
      }

      // 如果有活动技能，检查是否是特殊快捷命令
      if (activeSkill) {
        const lowerTrimmed = trimmed.toLowerCase();
        
        // 快捷命令：/clear, /exit, /normal, /reset
        if (lowerTrimmed === '/clear' || 
            lowerTrimmed === '/exit' || 
            lowerTrimmed === '/normal' || 
            lowerTrimmed === '/reset') {
          activeSkill = null;
          lastSkillExecution = null;
          updatePrompt();
          renderer.systemMessage('已清除活动技能，返回普通对话模式', 'success');
          setTimeout(ensureReadlineReady, 10);
          return;
        }
        
        // 快捷命令：/status 或 /active 查看当前状态
        if (lowerTrimmed === '/status' || lowerTrimmed === '/active') {
          await handleCommand('active', '');
          setTimeout(ensureReadlineReady, 10);
          return;
        }
        
        // 正常使用活动技能处理输入
        const icon = getSkillIcon(activeSkill);
        renderer.systemMessage(`${icon} 使用活动技能: ${activeSkill}`, 'info');
        
        try {
          await handleCommand('skill', `${activeSkill} ${trimmed}`);
        } catch (cmdError) {
          renderer.errorBox('技能执行错误', cmdError instanceof Error ? cmdError.message : String(cmdError));
        }
        
        setTimeout(ensureReadlineReady, 10);
        return;
      }

      // 添加用户消息
      messages.push({ role: 'user', content: trimmed, timestamp: Date.now() });
      renderer.userMessage(trimmed);

      try {
        conversationManager.addUserMessage(trimmed);
        const assistantMsgId = conversationManager.startAssistantMessage();

        if (config.streamOutput) {
          let fullContent = '';
          let promptTokens = 0;
          let completionTokens = 0;

          process.stdout.write(renderer.primary('\n🤖 '));

          const stream = agentInstance.chatStream({
            messages: messages.map(m => ({
              role: m.role,
              content: m.content,
              id: crypto.randomUUID(),
              timestamp: m.timestamp,
            })),
          });

          for await (const chunk of stream) {
            const delta = chunk.choices[0]?.delta;
            if (delta?.content) {
              process.stdout.write(delta.content);
              fullContent += delta.content;
            }
            if (chunk.usage) {
              promptTokens = chunk.usage.promptTokens;
              completionTokens = chunk.usage.completionTokens;
            }
          }

          process.stdout.write('\n');

          if (fullContent) {
            messages.push({ role: 'assistant', content: fullContent, timestamp: Date.now() });
            stats.totalMessages += 2;
            stats.totalTokens += promptTokens + completionTokens;
            
            if (assistantMsgId) {
              conversationManager.completeAssistantMessage(assistantMsgId, fullContent, {
                tokens: { prompt: promptTokens, completion: completionTokens },
                model: config.model,
              });
            }
            
            if (config.showTokens && (promptTokens || completionTokens)) {
              renderer.tokenUsage(promptTokens, completionTokens);
            }
            
            const eventStats = eventLogger.getStats();
            const recentEvents = eventStats.eventCounts;
            const hasEvents = recentEvents.size > 0;
            
            if (hasEvents) {
              const topEvents = Array.from(recentEvents.entries())
                .filter(([type]) => 
                  type.startsWith('skill:') || 
                  type.startsWith('tool:') || 
                  type.startsWith('mcp:') ||
                  type.startsWith('thinking:')
                )
                .slice(0, 3);
              
              if (topEvents.length > 0) {
                process.stdout.write(renderer.dim('  ─'.padEnd(40, '─') + '\n'));
                for (const [type, count] of topEvents) {
                  const icon = getEventIcon(type);
                  const category = getEventCategory(type);
                  process.stdout.write(`  ${icon} ${renderer.dim(`[${category}]`)} ${type.split(':')[0]}: ${count}\n`);
                }
              }
            }
            
            process.stdout.write('\n');
            
            saveStats(stats);
          }
        } else {
          // 非流式输出模式
          renderer.startLoading('Thinking...', '🧠');

          const response = await agentInstance.chat({
            messages: messages.map(m => ({
              role: m.role,
              content: m.content,
              id: crypto.randomUUID(),
              timestamp: m.timestamp,
            })),
          });

          renderer.succeedLoading('完成');

          const content = response.choices[0]?.message?.content;
          if (content && typeof content === 'string') {
            messages.push({ role: 'assistant', content, timestamp: Date.now() });
            renderer.assistantMessage(content);

            stats.totalMessages += 2;
            if (response.usage) {
              stats.totalTokens += response.usage.totalTokens;
              if (config.showTokens) {
                renderer.tokenUsage(response.usage.promptTokens, response.usage.completionTokens);
              }
            }
            saveStats(stats);
          }
        }
      } catch (error) {
        if (!config.streamOutput) {
          renderer.failLoading('失败');
        }

        // 确保输出换行，避免错误框与流式输出混在一起
        if (config.streamOutput) {
          process.stdout.write('\n\n');
        }

        // 根据错误类型提供不同的提示
        const errorMessage = error instanceof Error ? error.message : String(error);
        let hint = '请检查 API Key 和网络连接';

        if (errorMessage.includes('401') || errorMessage.includes('Unauthorized')) {
          hint = 'API Key 无效或已过期，请检查配置';
        } else if (errorMessage.includes('429') || errorMessage.includes('rate limit')) {
          hint = '请求过于频繁，请稍后重试';
        } else if (errorMessage.includes('ENOTFOUND') || errorMessage.includes('ECONNREFUSED')) {
          hint = '网络连接失败，请检查网络设置';
        } else if (errorMessage.includes('timeout')) {
          hint = '请求超时，请检查网络或稍后重试';
        } else if (errorMessage.includes('insufficient_quota')) {
          hint = 'API 配额不足，请充值后重试';
        } else if (errorMessage.includes('model')) {
          hint = '模型不可用，请使用 /model 切换模型';
        }

        renderer.errorBox('错误', errorMessage, hint);

        // 移除失败的用户消息
        if (messages.length > 0 && messages[messages.length - 1].role === 'user') {
          messages.pop();
        }
      }

      // 确保 readline 提示符正确显示
      setTimeout(ensureReadlineReady, 10);
    });

    // 处理 Ctrl+C
    let sigintCount = 0;
    rl.on('SIGINT', () => {
      sigintCount++;
      
      if (sigintCount === 1) {
        console.log('\n' + renderer.secondary('按 Ctrl+C 再次退出，或输入命令继续...'));
        setTimeout(() => { sigintCount = 0; }, 2000);
        rl.prompt();
        return;
      }
      
      // 保存状态
      if (config.autoSave && messages.length > 0) {
        saveAutosave({
          id: currentSession?.id || 'autosave',
          name: 'Autosave',
          messages,
          createdAt: currentSession?.createdAt || Date.now(),
          updatedAt: Date.now(),
          model: config.model || 'unknown',
        });
      }
      saveHistory(history);
      saveStats(stats);
      
      if (autosaveInterval) clearInterval(autosaveInterval);
      console.log('\n' + renderer.secondary('👋 再见!'));
      rl.close();
      renderer.destroy();
      agentInstance.destroy().then(() => exit(0)).catch(() => exit(0));
    });

    rl.prompt();

  } catch (error) {
    logger.error('Failed to start CLI', { error });
    renderer.errorBox('启动错误', error instanceof Error ? error.message : String(error), '请检查配置后重试');
    renderer.destroy();
    process.exit(1);
  }
}
