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
import { existsSync, readFileSync, writeFileSync, mkdirSync, readdirSync, unlinkSync, appendFileSync } from 'fs';
import { join } from 'path';
import { AgentImpl } from '../core/application/agent-impl.js';
import { createLogger } from '../utils/logger.js';
import type { AgentConfig } from '../core/domain/agent.js';
import type { Skill } from '../core/domain/skill.js';
import type { Tool } from '../core/domain/tool.js';
import { loadAllSkills } from '../skills/skill-loader.js';
import { TUIRenderer, createRenderer, THEMES, type Theme } from './renderer.js';
import { InteractiveSelector, select, confirm, prompt } from './selector.js';
import { PREDEFINED_PROVIDERS, type ModelProvider } from '../config/model-config.js';

const logger = createLogger({ name: 'SDKWorkCLI' });

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
  { name: 'skills', description: '列出可用技能', alias: ['ls'], category: 'capabilities' },
  { name: 'skill', description: '执行技能', usage: 'skill <name> [params]', examples: ['skill translate text="Hello" targetLanguage="zh"', 'skill code --help'], category: 'capabilities' },
  { name: 'tools', description: '列出可用工具', category: 'capabilities' },
  { name: 'model', description: '切换/显示模型', usage: 'model [model-id]', examples: ['model', 'model gpt-4'], category: 'settings' },
  { name: 'provider', description: '切换提供商', usage: 'provider [name] [--baseUrl=url]', examples: ['provider', 'provider openai', 'provider openai --baseUrl=https://api.example.com/v1'], category: 'settings' },
  { name: 'theme', description: '切换主题', usage: 'theme [theme-name]', examples: ['theme', 'theme dark'], category: 'settings' },
  { name: 'session', description: '会话管理', usage: 'session <list|save|load|delete|auto>', examples: ['session list', 'session save', 'session load', 'session delete'], category: 'session' },
  { name: 'stats', description: '显示使用统计', category: 'info' },
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
  } catch {}
  return [];
}

function saveHistory(history: HistoryEntry[]): void {
  try {
    ensureConfigDir();
    // 只保留最近 1000 条
    const trimmed = history.slice(-1000);
    writeFileSync(HISTORY_FILE, JSON.stringify(trimmed, null, 2));
  } catch {}
}

function addToHistory(history: HistoryEntry[], input: string): HistoryEntry[] {
  if (input.trim() && history[history.length - 1]?.input !== input) {
    history.push({ input: input.trim(), timestamp: Date.now() });
    if (history.length > 1000) history.shift();
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
          } catch {
            // 跳过无效的会话文件
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
  } catch {}
  return null;
}

function saveAutosave(session: Session): void {
  try {
    ensureConfigDir();
    writeFileSync(AUTOSAVE_SESSION, JSON.stringify(session, null, 2));
  } catch {}
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
  } catch {}
  return defaultStats;
}

function saveStats(stats: UsageStats): void {
  try {
    ensureConfigDir();
    writeFileSync(join(CONFIG_DIR, 'stats.json'), JSON.stringify(stats, null, 2));
  } catch {}
}

// ============================================
// 自动补全
// ============================================

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

    // 将 agent 保存到闭包变量，避免打包后变量名冲突
    const agentInstance = agent;

    // 加载历史和统计
    let history = loadHistory();
    let stats = loadStats();
    let historyIndex = history.length;

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
      description: `Provider: ${config.provider} | Model: ${config.model}`,
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
      history: history.map(h => h.input).slice(-100),
      completer: (line: string) => {
        const completions = getCompletions(line, skills, COMMANDS);
        return [completions, line];
      },
    });

    // 自动保存定时器
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
      }, 30000); // 每 30 秒自动保存
    }

    // 显示提示
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
      ];
      const hint = hints[Math.floor(Math.random() * hints.length)];
      console.log(renderer.dim(`💡 ${hint}`));
    }

    // 每隔几次交互显示一次提示
    let interactionCount = 0;

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
          renderer.systemMessage('对话历史已清空', 'success');
          break;

        case 'exit':
        case 'quit':
        case 'q':
          // 保存最终状态
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
          console.log(renderer.secondary('👋 Goodbye!'));
          rl.close();
          renderer.destroy();
          await agentInstance.destroy();
          exit(0);
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
            const configOptions = [
              { value: 'theme', label: '主题', description: String(config.theme) },
              { value: 'model', label: '模型', description: String(config.model) },
              { value: 'provider', label: '提供商', description: String(config.provider) },
              { value: 'baseUrl', label: 'Base URL', description: (config.llm as { baseUrl?: string })?.baseUrl ? '已设置' : '默认' },
              { value: 'autoSave', label: '自动保存', description: config.autoSave ? '启用' : '禁用' },
              { value: 'showTokens', label: '显示Token', description: config.showTokens ? '启用' : '禁用' },
              { value: 'streamOutput', label: '流式输出', description: config.streamOutput ? '启用' : '禁用' },
            ];
            
            const selectedConfig = await select('⚙️ 选择要修改的配置:', configOptions, {
              pageSize: 5,
              theme: {
                primary: renderer.primary(''),
                secondary: renderer.secondary(''),
                selected: renderer.success(''),
                disabled: renderer.muted(''),
                pointer: renderer.primary('❯'),
                active: '',
              },
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
                // 设置 Base URL
                const currentBaseUrl = (config.llm as { baseUrl?: string })?.baseUrl || '';
                const newBaseUrl = await prompt('请输入 Base URL (留空使用默认)', currentBaseUrl);
                if (newBaseUrl !== null) {
                  config.llm = { ...config.llm, baseUrl: newBaseUrl || undefined } as SDKWorkConfig['llm'];
                  agentInstance.setLLM(config.llm);
                  saveCLIConfig(config);
                  renderer.systemMessage(`Base URL 已${newBaseUrl ? '设置为: ' + newBaseUrl : '重置为默认'}`, 'success');
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
          const skillsList = agentInstance.skills.list();
          if (skillsList.length === 0) {
            renderer.systemMessage('暂无可用技能', 'warning');
          } else {
            // 按类别分组
            const byCategory = new Map<string, typeof skillsList>();
            skillsList.forEach(s => {
              const cat = (s.meta?.category as string) || 'other';
              if (!byCategory.has(cat)) byCategory.set(cat, []);
              byCategory.get(cat)!.push(s);
            });
            
            const lines: string[] = ['', renderer.bold(`可用技能 (${skillsList.length}):`), ''];
            byCategory.forEach((skillGroup, cat) => {
              lines.push(renderer.dim(`  ${cat}:`));
              skillGroup.slice(0, 5).forEach((s, i) => {
                const tagsArr = Array.isArray(s.meta?.tags) ? s.meta?.tags as string[] : [];
                const tags = tagsArr.slice(0, 2).map((t: string) => renderer.dim(`#${t}`)).join(' ');
                lines.push(`    ${renderer.primary(`[${i + 1}]`)} ${s.name} ${tags}`);
              });
              if (skillGroup.length > 5) {
                lines.push(`    ${renderer.dim(`... 还有 ${skillGroup.length - 5} 个`)}`);
              }
            });
            lines.push('');
            lines.push(renderer.dim('  使用 /skill <name> 执行技能'));
            lines.push(renderer.dim('  使用 /skill <name> --help 查看帮助'));
            lines.push('');
            
            renderer.box(lines, '🔧 技能列表');
          }
          break;

        case 'skill':
          if (!args) {
            // 显示技能选择器
            const allSkills = agentInstance.skills.list();
            if (allSkills.length === 0) {
              renderer.systemMessage('暂无可用技能', 'warning');
              break;
            }
            
            // 按类别分组
            const skillOptions = allSkills.map(s => ({
              value: s.name,
              label: s.name,
              description: (s.description || '').slice(0, 50),
            }));
            
            const selectedSkill = await select('🔧 选择技能:', skillOptions, {
              pageSize: 10,
              theme: {
                primary: renderer.primary(''),
                secondary: renderer.secondary(''),
                selected: renderer.success(''),
                disabled: renderer.muted(''),
                pointer: renderer.primary('❯'),
                active: '',
              },
            });
            
            if (selectedSkill) {
              // 显示技能帮助
              const skill = agentInstance.skills.getByName(selectedSkill);
              if (skill) {
                const inputSchema = skill.input;
                const requiredParams: string[] = inputSchema?.required || [];
                const properties = inputSchema?.properties || {};
                const hasParameters = Object.keys(properties).length > 0;
                
                if (hasParameters) {
                  renderer.box([
                    '',
                    renderer.bold(skill.name) + (skill.version ? renderer.dim(` v${skill.version}`) : ''),
                    '',
                    skill.description,
                    '',
                  ], '📋 技能帮助');

                  console.log(renderer.bold('参数:'));
                  Object.entries(properties).forEach(([paramName, paramDef]) => {
                    const def = paramDef as { type?: string; description?: string; enum?: string[]; default?: unknown };
                    const isRequired = requiredParams.includes(paramName);
                    const requiredMark = isRequired ? renderer.error(' *必填') : renderer.dim(' (可选)');
                    const typeInfo = def.type || 'any';
                    const enumInfo = def.enum ? ` [${def.enum.join(', ')}]` : '';
                    const defaultInfo = def.default !== undefined ? renderer.dim(` 默认: ${def.default}`) : '';

                    console.log(`  ${renderer.highlight(paramName)}${requiredMark}`);
                    console.log(`    ${renderer.dim(`类型: ${typeInfo}${enumInfo}`)}${defaultInfo}`);
                    if (def.description) {
                      console.log(`    ${def.description}`);
                    }
                  });
                  console.log('');
                  console.log(renderer.dim('使用 /skill ' + selectedSkill + ' <param>=<value> 执行技能'));
                } else {
                  // 无参数技能，直接执行
                  console.log('');
                  const shouldExecute = await confirm(`执行技能 "${skill.name}"?`, true);
                  if (shouldExecute) {
                    try {
                      renderer.startLoading('执行中...', '⚡');
                      const skillResult = await agentInstance.executeSkill(skill.id, '{}');
                      renderer.succeedLoading('执行完成');

                      if (skillResult.success) {
                        renderer.successBox('执行成功',
                          typeof skillResult.data === 'string'
                            ? skillResult.data
                            : JSON.stringify(skillResult.data, null, 2)
                        );
                      } else {
                        renderer.errorBox('执行失败', skillResult.error?.message || '未知错误');
                      }
                    } catch (skillError) {
                      renderer.failLoading('执行失败');
                      renderer.errorBox('错误', skillError instanceof Error ? skillError.message : String(skillError));
                    }
                  }
                }
              }
            }
            break;
          }

          const skillArgs = args.trim().split(/\s+/);
          const skillName = skillArgs[0];
          const skill = agentInstance.skills.getByName(skillName);

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

          const isHelpRequest = skillArgs.length === 1 || skillArgs[1] === '--help' || skillArgs[1] === '-h';
          const params: Record<string, unknown> = {};
          
          for (let i = 1; i < skillArgs.length; i++) {
            const arg = skillArgs[i];
            if (arg === '--help' || arg === '-h') continue;
            const match = arg.match(/^(\w+)=(.+)$/);
            if (match) {
              let value: string | number | boolean = match[2];
              if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
                value = value.slice(1, -1);
              }
              if (value === 'true') value = true;
              else if (value === 'false') value = false;
              else if (!isNaN(Number(value))) value = Number(value);
              params[match[1]] = value;
            }
          }

          const inputSchema = skill.input;
          const requiredParams: string[] = inputSchema?.required || [];
          const properties = inputSchema?.properties || {};
          const hasParameters = Object.keys(properties).length > 0;

          if (isHelpRequest && Object.keys(params).length === 0 && hasParameters) {
            renderer.box([
              '',
              renderer.bold(skill.name) + (skill.version ? renderer.dim(` v${skill.version}`) : ''),
              '',
              skill.description,
              '',
            ], '📋 技能帮助');

            console.log(renderer.bold('参数:'));
            Object.entries(properties).forEach(([paramName, paramDef]) => {
              const def = paramDef as { type?: string; description?: string; enum?: string[]; default?: unknown };
              const isRequired = requiredParams.includes(paramName);
              const requiredMark = isRequired ? renderer.error(' *必填') : renderer.dim(' (可选)');
              const typeInfo = def.type || 'any';
              const enumInfo = def.enum ? ` [${def.enum.join(', ')}]` : '';
              const defaultInfo = def.default !== undefined ? renderer.dim(` 默认: ${def.default}`) : '';

              console.log(`  ${renderer.highlight(paramName)}${requiredMark}`);
              console.log(`    ${renderer.dim(`类型: ${typeInfo}${enumInfo}`)}${defaultInfo}`);
              if (def.description) {
                console.log(`    ${def.description}`);
              }
            });
            console.log('');

            console.log(renderer.bold('用法:'));
            if (requiredParams.length > 0) {
              const exampleParams = requiredParams.map((p: string) => {
                const def = properties[p] as { type?: string; enum?: string[] };
                if (def?.enum?.length) return `${p}="${def.enum[0]}"`;
                return `${p}="<${def?.type || 'value'}>"`;
              }).join(' ');
              console.log(`  ${renderer.primary(`/skill ${skillName} ${exampleParams}`)}`);
            } else {
              console.log(`  ${renderer.primary(`/skill ${skillName}`)}`);
            }
            console.log('');
            break;
          }

          const missingParams = requiredParams.filter((p: string) => !(p in params));
          if (missingParams.length > 0) {
            renderer.systemMessage(`缺少必填参数: ${missingParams.join(', ')}`, 'warning');
            console.log('');
            console.log(renderer.bold('参数说明:'));
            missingParams.forEach((p: string) => {
              const def = properties[p] as { type?: string; description?: string; enum?: string[] };
              const typeInfo = def?.type || 'any';
              const enumInfo = def?.enum ? ` [${def.enum.join(', ')}]` : '';
              console.log(`  ${renderer.highlight(p)} ${renderer.dim(`<${typeInfo}>${enumInfo}`)}`);
              if (def?.description) {
                console.log(`    ${def.description}`);
              }
            });
            console.log('');
            console.log(renderer.secondary('用法示例:'));
            const exampleParams = requiredParams.map((p: string) => {
              const def = properties[p] as { type?: string; enum?: string[] };
              if (def?.enum?.length) return `${p}="${def.enum[0]}"`;
              return `${p}="<${def?.type || 'value'}>"`;
            }).join(' ');
            console.log(`  ${renderer.primary(`/skill ${skillName} ${exampleParams}`)}`);
            break;
          }

          renderer.divider(`执行技能: ${skill.name}`);
          console.log(`${renderer.primary('描述:')} ${skill.description}`);

          if (Object.keys(params).length > 0) {
            console.log(`${renderer.primary('参数:')}`);
            Object.entries(params).forEach(([k, v]) => {
              console.log(`  ${renderer.dim(k)} = ${renderer.highlight(String(v))}`);
            });
          }
          console.log('');

          try {
            renderer.startLoading('执行中...', '⚡');
            const skillResult = await agentInstance.executeSkill(skill.id, JSON.stringify(params));
            renderer.succeedLoading('执行完成');

            if (skillResult.success) {
              renderer.successBox('执行成功',
                typeof skillResult.data === 'string'
                  ? skillResult.data
                  : JSON.stringify(skillResult.data, null, 2)
              );
              stats.toolsUsed[skillName] = (stats.toolsUsed[skillName] || 0) + 1;
              saveStats(stats);
            } else {
              renderer.errorBox('执行失败', skillResult.error?.message || '未知错误');
            }
          } catch (skillError) {
            renderer.failLoading('执行失败');
            renderer.errorBox('错误', skillError instanceof Error ? skillError.message : String(skillError));
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
              theme: {
                primary: renderer.primary(''),
                secondary: renderer.secondary(''),
                selected: renderer.success(''),
                disabled: renderer.muted(''),
                pointer: renderer.primary('❯'),
                active: '',
              },
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
            const provider = PREDEFINED_PROVIDERS[config.provider || 'openai'];
            const modelOptions = provider?.models.map(m => ({
              value: m.id,
              label: m.name,
              description: m.id === config.model ? '(当前)' : '',
            })) || [];

            // 添加自定义输入选项
            modelOptions.push({
              value: '__custom__',
              label: '📝 自定义模型',
              description: '输入自定义模型 ID',
            });

            const currentIdx = provider?.models.findIndex(m => m.id === config.model) || 0;

            const selectedModel = await select('🤖 选择模型:', modelOptions, {
              defaultIndex: currentIdx >= 0 ? currentIdx : 0,
              pageSize: 8,
              theme: {
                primary: renderer.primary(''),
                secondary: renderer.secondary(''),
                selected: renderer.success(''),
                disabled: renderer.muted(''),
                pointer: renderer.primary('❯'),
                active: '',
              },
            });

            if (selectedModel === '__custom__') {
              // 自定义模型输入 - 优化交互体验
              console.log('');
              renderer.systemMessage('自定义模型模式', 'info');
              console.log(renderer.dim('提示: 输入任意模型 ID，如 gpt-4-turbo、claude-3-opus 等'));
              console.log(renderer.dim(`当前模型: ${config.model || '无'}`));
              console.log('');

              const customModel = await prompt('📝 模型 ID', config.model);

              if (customModel && customModel.trim()) {
                const trimmedModel = customModel.trim();

                // 确认切换
                const confirmed = await confirm(`确认切换到模型: ${trimmedModel}?`, true);

                if (confirmed) {
                  try {
                    config.model = trimmedModel;
                    config.llm = { ...config.llm, model: config.model } as SDKWorkConfig['llm'];
                    agentInstance.setLLM(config.llm);
                    saveCLIConfig(config);
                    renderer.successBox('模型切换成功', `当前模型: ${trimmedModel}`);
                  } catch (error) {
                    renderer.errorBox('模型切换失败', error instanceof Error ? error.message : String(error), '请检查模型 ID 是否正确');
                  }
                } else {
                  renderer.systemMessage('已取消切换', 'warning');
                }
              } else if (customModel !== null) {
                renderer.systemMessage('模型 ID 不能为空', 'error');
              }
            } else if (selectedModel) {
              // 预设模型切换
              try {
                config.model = selectedModel;
                config.llm = { ...config.llm, model: config.model } as SDKWorkConfig['llm'];
                agentInstance.setLLM(config.llm);
                saveCLIConfig(config);
                renderer.successBox('模型切换成功', `当前模型: ${selectedModel}`);
              } catch (error) {
                renderer.errorBox('模型切换失败', error instanceof Error ? error.message : String(error), '请检查模型配置');
              }
            }
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
              const sessionOptions = sessions.map((s, i) => ({
                value: s.id,
                label: s.name,
                description: `${new Date(s.updatedAt).toLocaleDateString()} | ${s.messages.length} 条消息`,
              }));
              
              const selectedSessionId = await select('💾 选择会话 (Enter 加载, Esc 返回):', sessionOptions, {
                pageSize: 8,
                theme: {
                  primary: renderer.primary(''),
                  secondary: renderer.secondary(''),
                  selected: renderer.success(''),
                  disabled: renderer.muted(''),
                  pointer: renderer.primary('❯'),
                  active: '',
                },
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

        case 'stats':
          const uptime = Math.floor((Date.now() - stats.startTime) / 1000);
          const hours = Math.floor(uptime / 3600);
          const minutes = Math.floor((uptime % 3600) / 60);
          
          renderer.box([
            '',
            `${renderer.primary('运行时间:')} ${hours}h ${minutes}m`,
            `${renderer.primary('总消息数:')} ${stats.totalMessages}`,
            `${renderer.primary('总 Token 数:')} ${stats.totalTokens.toLocaleString()}`,
            `${renderer.primary('会话数:')} ${stats.sessionsCount}`,
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

        case 'history':
        case 'hist':
          const recentHistory = history.slice(-20);
          if (recentHistory.length === 0) {
            renderer.systemMessage('暂无历史记录', 'info');
          } else {
            console.log(renderer.bold('📜 命令历史:'));
            recentHistory.forEach((h, i) => {
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
          
          // 交互式选择导出格式
          let format = args.trim();
          if (!format || !['markdown', 'md', 'json', 'txt'].includes(format.toLowerCase())) {
            const formatOptions = [
              { value: 'markdown', label: 'Markdown', description: '.md 文件' },
              { value: 'json', label: 'JSON', description: '.json 文件' },
              { value: 'txt', label: '纯文本', description: '.txt 文件' },
            ];
            
            const selectedFormat = await select('📄 选择导出格式:', formatOptions, {
              pageSize: 3,
              theme: {
                primary: renderer.primary(''),
                secondary: renderer.secondary(''),
                selected: renderer.success(''),
                disabled: renderer.muted(''),
                pointer: renderer.primary('❯'),
                active: '',
              },
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
            
            if (format === 'json') {
              filename = `export-${timestamp}.json`;
              content = JSON.stringify({
                exportedAt: new Date().toISOString(),
                model: config.model,
                messageCount: messages.length,
                messages,
              }, null, 2);
            } else if (format === 'txt') {
              filename = `export-${timestamp}.txt`;
              content = messages.map(m => `[${m.role.toUpperCase()}]\n${m.content}`).join('\n\n---\n\n');
            } else {
              filename = `export-${timestamp}.md`;
              const header = `# 会话导出\n\n导出时间: ${new Date().toLocaleString()}\n模型: ${config.model}\n消息数: ${messages.length}\n\n---\n`;
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
            const providerOptions = Object.entries(PREDEFINED_PROVIDERS).map(([key, p]) => ({
              value: key,
              label: p.displayName,
              description: key === config.provider ? '(当前)' : `${p.models.length} 个模型`,
            }));

            const selectedProvider = await select('🔌 选择提供商:', providerOptions, {
              pageSize: 6,
              theme: {
                primary: renderer.primary(''),
                secondary: renderer.secondary(''),
                selected: renderer.success(''),
                disabled: renderer.muted(''),
                pointer: renderer.primary('❯'),
                active: '',
              },
            });

            if (selectedProvider) {
              if (selectedProvider === config.provider) {
                // 选择相同提供商，询问是否修改 Base URL
                const currentBaseUrl = (config.llm as { baseUrl?: string })?.baseUrl;
                const modifyBaseUrl = await confirm(`当前提供商已是 ${PREDEFINED_PROVIDERS[selectedProvider].displayName}，是否修改 Base URL?`, false);
                if (modifyBaseUrl) {
                  const newBaseUrl = await prompt('请输入 Base URL (留空重置)', currentBaseUrl || '');
                  if (newBaseUrl !== null) {
                    config.llm = { ...config.llm, baseUrl: newBaseUrl || undefined } as SDKWorkConfig['llm'];
                    agentInstance.setLLM(config.llm);
                    saveCLIConfig(config);
                    renderer.systemMessage(`Base URL 已${newBaseUrl ? '设置为: ' + newBaseUrl : '重置为默认'}`, 'success');
                  }
                }
              } else {
                // 切换提供商
                const provider = selectedProvider as ModelProvider;
                config.provider = provider;
                config.model = PREDEFINED_PROVIDERS[provider].models[0]?.id;
                config.llm = { ...config.llm, provider: provider, model: config.model } as SDKWorkConfig['llm'];
                agentInstance.setLLM(config.llm);
                saveCLIConfig(config);
                renderer.systemMessage(`提供商已切换为: ${PREDEFINED_PROVIDERS[provider].displayName}`, 'success');
                renderer.systemMessage(`模型已切换为: ${config.model}`, 'info');

                // 询问是否设置 Base URL
                const setBaseUrl = await confirm(`是否设置 Base URL?`, false);
                if (setBaseUrl) {
                  const newBaseUrl = await prompt('请输入 Base URL', '');
                  if (newBaseUrl !== null && newBaseUrl.trim()) {
                    config.llm = { ...config.llm, baseUrl: newBaseUrl.trim() } as SDKWorkConfig['llm'];
                    agentInstance.setLLM(config.llm);
                    saveCLIConfig(config);
                    renderer.systemMessage(`Base URL 已设置为: ${newBaseUrl.trim()}`, 'success');
                  }
                }
              }
            }
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
          
          const keepCount = args ? parseInt(args.trim()) : 10;
          if (isNaN(keepCount) || keepCount < 1) {
            renderer.systemMessage('无效的消息数量', 'error');
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
        // 确保光标可见
        process.stdout.write('\x1b[?25h');
        // 确保提示符显示
        rl.prompt(true);
      } catch {
        // 忽略错误
      }
    };

    // 处理输入
    rl.on('line', async (input) => {
      const trimmed = input.trim();
      if (!trimmed) { ensureReadlineReady(); return; }

      // 添加到历史
      history = addToHistory(history, trimmed);
      historyIndex = history.length;

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

      // 添加用户消息
      messages.push({ role: 'user', content: trimmed, timestamp: Date.now() });
      renderer.userMessage(trimmed);

      let requestFailed = false;

      try {
        if (config.streamOutput) {
          // 流式输出模式
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
            // 捕获 usage 信息 (通常在最后一个 chunk)
            if (chunk.usage) {
              promptTokens = chunk.usage.promptTokens;
              completionTokens = chunk.usage.completionTokens;
            }
          }

          process.stdout.write('\n\n');

          if (fullContent) {
            messages.push({ role: 'assistant', content: fullContent, timestamp: Date.now() });
            stats.totalMessages += 2;
            stats.totalTokens += promptTokens + completionTokens;
            if (config.showTokens && (promptTokens || completionTokens)) {
              renderer.tokenUsage(promptTokens, completionTokens);
            }
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
        requestFailed = true;

        if (!config.streamOutput) {
          renderer.failLoading('失败');
        }

        // 确保输出换行，避免错误框与流式输出混在一起
        if (config.streamOutput) {
          process.stdout.write('\n\n');
        }

        // 根据错误类型提供不同的提示
        let errorMessage = error instanceof Error ? error.message : String(error);
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
      console.log('\n' + renderer.secondary('👋 Goodbye!'));
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
