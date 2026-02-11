#!/usr/bin/env node
/**
 * SDKWork Enhanced CLI - 极致级终端交互界面
 *
 * 参考 Claude Code、Codex CLI、OpenCode 等顶级智能体 CLI 设计
 * 功能包括：智能补全、语法高亮、实时预览、富文本表格、进度动画等
 *
 * @module TUI
 * @version 3.0.0
 */

import { createInterface } from 'readline';
import { stdin, stdout, exit } from 'process';
import { platform, homedir } from 'os';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import { AgentImpl } from '../core/application/agent-impl.js';
import { createLogger } from '../utils/logger.js';
import type { AgentConfig } from '../core/domain/agent.js';
import type { Skill } from '../core/domain/skill.js';
import type { Tool } from '../core/domain/tool.js';
import { loadAllSkills, formatSkillsList } from '../skills/skill-loader.js';
import { 
  EnhancedTUIRenderer, 
  createEnhancedRenderer, 
  THEMES, 
  SmartInput,
  type SpinnerStyle,
  type Theme 
} from './renderer-enhanced.js';
import { renderMarkdown } from './markdown-renderer.js';
import { PREDEFINED_PROVIDERS, type ModelProvider, type ModelDefinition } from '../config/model-config.js';

const logger = createLogger({ name: 'SDKWorkCLI' });

// 配置目录
const CONFIG_DIR = join(homedir(), '.sdkwork');
const HISTORY_FILE = join(CONFIG_DIR, 'history.json');
const CONFIG_FILE = join(CONFIG_DIR, 'config.json');
const SESSIONS_DIR = join(CONFIG_DIR, 'sessions');

interface SDKWorkConfig {
  name: string;
  llm: AgentConfig['llm'];
  description?: string;
  theme?: string;
  spinnerStyle?: SpinnerStyle;
  showTokenUsage?: boolean;
  autoSave?: boolean;
  maxHistory?: number;
}

interface Session {
  id: string;
  name: string;
  messages: Array<{ role: 'user' | 'assistant'; content: string; timestamp: number }>;
  createdAt: number;
  updatedAt: number;
  model: string;
}

// 命令定义
const COMMANDS = [
  { name: 'help', description: 'Show available commands', alias: 'h' },
  { name: 'clear', description: 'Clear conversation history', alias: 'c' },
  { name: 'exit', description: 'Exit the CLI', alias: 'quit, q' },
  { name: 'config', description: 'Show configuration information' },
  { name: 'skills', description: 'List available skills' },
  { name: 'tools', description: 'List available tools' },
  { name: 'model', description: 'Switch to a different model' },
  { name: 'theme', description: 'Change the color theme' },
  { name: 'session', description: 'Session management (list, save, load, delete)' },
  { name: 'settings', description: 'Change CLI settings' },
];

// 模型补全列表
const MODEL_COMPLETIONS = Object.values(PREDEFINED_PROVIDERS).flatMap(p => 
  p.models.map(m => m.id)
);

// 命令补全列表
const COMMAND_COMPLETIONS = COMMANDS.map(c => `/${c.name}`);

/**
 * 确保配置目录存在
 */
function ensureConfigDir(): void {
  if (!existsSync(CONFIG_DIR)) {
    mkdirSync(CONFIG_DIR, { recursive: true });
  }
  if (!existsSync(SESSIONS_DIR)) {
    mkdirSync(SESSIONS_DIR, { recursive: true });
  }
}

/**
 * 加载历史记录
 */
function loadHistory(): string[] {
  try {
    if (existsSync(HISTORY_FILE)) {
      const data = JSON.parse(readFileSync(HISTORY_FILE, 'utf-8'));
      return data.history || [];
    }
  } catch (error) {
    logger.error('Failed to load history', { error });
  }
  return [];
}

/**
 * 保存历史记录
 */
function saveHistory(history: string[]): void {
  try {
    ensureConfigDir();
    writeFileSync(HISTORY_FILE, JSON.stringify({ history }, null, 2));
  } catch (error) {
    logger.error('Failed to save history', { error });
  }
}

/**
 * 加载配置
 */
function loadCLIConfig(): Partial<SDKWorkConfig> {
  try {
    if (existsSync(CONFIG_FILE)) {
      return JSON.parse(readFileSync(CONFIG_FILE, 'utf-8'));
    }
  } catch (error) {
    logger.error('Failed to load CLI config', { error });
  }
  return {};
}

/**
 * 保存配置
 */
function saveCLIConfig(config: Partial<SDKWorkConfig>): void {
  try {
    ensureConfigDir();
    writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
  } catch (error) {
    logger.error('Failed to save CLI config', { error });
  }
}

/**
 * 加载会话列表
 */
function loadSessions(): Session[] {
  try {
    ensureConfigDir();
    const sessions: Session[] = [];
    if (existsSync(SESSIONS_DIR)) {
      const files = require('fs').readdirSync(SESSIONS_DIR);
      for (const file of files) {
        if (file.endsWith('.json')) {
          const session = JSON.parse(readFileSync(join(SESSIONS_DIR, file), 'utf-8'));
          sessions.push(session);
        }
      }
    }
    return sessions.sort((a, b) => b.updatedAt - a.updatedAt);
  } catch (error) {
    logger.error('Failed to load sessions', { error });
    return [];
  }
}

/**
 * 保存会话
 */
function saveSession(session: Session): void {
  try {
    ensureConfigDir();
    writeFileSync(
      join(SESSIONS_DIR, `${session.id}.json`),
      JSON.stringify(session, null, 2)
    );
  } catch (error) {
    logger.error('Failed to save session', { error });
  }
}

/**
 * 删除会话
 */
function deleteSession(sessionId: string): void {
  try {
    const filePath = join(SESSIONS_DIR, `${sessionId}.json`);
    if (existsSync(filePath)) {
      require('fs').unlinkSync(filePath);
    }
  } catch (error) {
    logger.error('Failed to delete session', { error });
  }
}

/**
 * 检测操作系统平台
 */
function getPlatform(): 'win32' | 'darwin' | 'linux' | 'other' {
  const p = platform();
  if (p === 'win32') return 'win32';
  if (p === 'darwin') return 'darwin';
  if (p === 'linux') return 'linux';
  return 'other';
}

/**
 * 获取设置 API Key 的命令提示
 */
function getApiKeySetupInstructions(): string {
  const os = getPlatform();
  
  switch (os) {
    case 'win32':
      return `
📋 Windows 设置方法:

方法 1 - PowerShell (当前窗口有效):
  $env:OPENAI_API_KEY="your-api-key"

方法 2 - CMD (当前窗口有效):
  set OPENAI_API_KEY=your-api-key

方法 3 - 系统环境变量 (永久有效):
  1. 打开 "系统属性" -> "高级" -> "环境变量"
  2. 点击 "新建" 添加用户变量
  3. 变量名: OPENAI_API_KEY
  4. 变量值: your-api-key
`;
    case 'darwin':
      return `
📋 macOS 设置方法:

方法 1 - 临时设置 (当前终端有效):
  export OPENAI_API_KEY=your-api-key

方法 2 - 永久设置 (添加到 ~/.zshrc 或 ~/.bash_profile):
  echo 'export OPENAI_API_KEY=your-api-key' >> ~/.zshrc
  source ~/.zshrc
`;
    case 'linux':
      return `
📋 Linux 设置方法:

方法 1 - 临时设置 (当前终端有效):
  export OPENAI_API_KEY=your-api-key

方法 2 - 永久设置 (添加到 ~/.bashrc 或 ~/.zshrc):
  echo 'export OPENAI_API_KEY=your-api-key' >> ~/.bashrc
  source ~/.bashrc
`;
    default:
      return `
📋 设置方法:

临时设置 (当前终端有效):
  export OPENAI_API_KEY=your-api-key
`;
  }
}

/**
 * 显示配置向导
 */
async function showConfigWizard(renderer: EnhancedTUIRenderer): Promise<SDKWorkConfig | null> {
  renderer.clear();

  renderer.box([
    '',
    renderer.bold(renderer.primary('🚀 SDKWork Agent CLI')),
    '',
    '欢迎使用 SDKWork Agent 交互界面',
    '',
  ], '配置向导');

  console.log(renderer.warning('⚠️  未检测到 API Key 配置'));
  console.log('');
  console.log('SDKWork Agent 需要一个 LLM API Key 才能工作。');
  console.log('');
  console.log(getApiKeySetupInstructions());
  console.log('');
  console.log(renderer.secondary('支持的提供商:'));

  // 显示所有支持的提供商
  Object.entries(PREDEFINED_PROVIDERS).forEach(([key, provider]) => {
    const modelCount = provider.models.length;
    console.log(`  • ${provider.displayName} (${modelCount} 个模型)`);
  });
  console.log('');

  // 创建 readline 接口用于输入
  const rl = createInterface({
    input: stdin,
    output: stdout,
  });

  // 选择提供商
  console.log(renderer.secondary('请选择提供商:'));
  const providers = Object.entries(PREDEFINED_PROVIDERS);
  providers.forEach(([key, provider], index) => {
    const defaultBaseUrl = provider.defaultBaseUrl ? renderer.muted(` - ${provider.defaultBaseUrl}`) : '';
    console.log(`  ${index + 1}. ${provider.displayName}${defaultBaseUrl}`);
  });
  console.log(`  ${providers.length + 1}. ${renderer.primary('自定义 (Custom)')} - 输入自定义模型和Base URL`);

  const providerIndex = await new Promise<number>((resolve) => {
    rl.question(renderer.primary('\n请输入数字选择 (默认 1): '), (answer) => {
      const index = parseInt(answer) - 1;
      resolve(isNaN(index) || index < 0 || index > providers.length ? 0 : index);
    });
  });

  // 处理自定义提供商
  let providerKey: ModelProvider;
  let providerConfig: typeof providers[0][1];
  let selectedModel: { id: string; name: string };
  let customBaseUrl: string | undefined;

  if (providerIndex === providers.length) {
    // 自定义提供商
    providerKey = 'custom';
    providerConfig = {
      name: 'custom',
      displayName: 'Custom',
      defaultBaseUrl: '',
      requiresApiKey: true,
      models: [],
    };

    // 输入自定义模型名称
    const customModelId = await new Promise<string>((resolve) => {
      rl.question(renderer.primary('\n📝 请输入自定义模型 ID (例如: gpt-4, claude-3-opus-20240229): '), (answer) => {
        resolve(answer.trim() || 'custom-model');
      });
    });

    selectedModel = { id: customModelId, name: customModelId };

    // 输入自定义 Base URL
    console.log(renderer.secondary('\n默认 Base URL 示例:'));
    console.log('  • OpenAI: https://api.openai.com/v1');
    console.log('  • Anthropic: https://api.anthropic.com/v1');
    console.log('  • Local: http://localhost:11434/v1 (Ollama)');
    console.log('  • Azure: https://{your-resource}.openai.azure.com/openai/deployments/{deployment}');

    customBaseUrl = await new Promise<string | undefined>((resolve) => {
      rl.question(renderer.primary('\n🔗 请输入 Base URL (直接回车使用默认): '), (answer) => {
        resolve(answer.trim() || undefined);
      });
    });
  } else {
    [providerKey, providerConfig] = providers[providerIndex] as [ModelProvider, typeof providers[0][1]];

    // 选择模型
    console.log(renderer.secondary(`\n${providerConfig.displayName} 可用模型:`));
    console.log(renderer.muted(`默认 Base URL: ${providerConfig.defaultBaseUrl || '无'}\n`));

    providerConfig.models.forEach((model, index) => {
      const pricing = model.inputPrice ? ` ($${model.inputPrice}/1M tokens)` : '';
      const context = model.contextWindow ? renderer.muted(` [${(model.contextWindow / 1000).toFixed(0)}K ctx]`) : '';
      console.log(`  ${index + 1}. ${model.name}${pricing}${context}`);
      if (model.description) {
        console.log(`     ${renderer.muted(model.description)}`);
      }
    });
    console.log(`  ${providerConfig.models.length + 1}. ${renderer.primary('自定义模型')} - 输入其他模型ID`);

    const modelIndex = await new Promise<number>((resolve) => {
      rl.question(renderer.primary('\n请输入数字选择模型 (默认 1): '), (answer) => {
        const index = parseInt(answer) - 1;
        resolve(isNaN(index) || index < 0 || index > providerConfig.models.length ? 0 : index);
      });
    });

    if (modelIndex === providerConfig.models.length) {
      // 自定义模型
      const customModelId = await new Promise<string>((resolve) => {
        rl.question(renderer.primary('\n📝 请输入自定义模型 ID: '), (answer) => {
          resolve(answer.trim() || 'custom-model');
        });
      });
      selectedModel = { id: customModelId, name: customModelId };
    } else {
      selectedModel = providerConfig.models[modelIndex];
    }

    // 询问是否使用自定义 Base URL
    console.log(renderer.secondary(`\n当前默认 Base URL: ${providerConfig.defaultBaseUrl || '无'}`));
    const useCustomBaseUrl = await new Promise<string>((resolve) => {
      rl.question(renderer.primary('是否使用自定义 Base URL? (y/n, 默认 n): '), (answer) => {
        resolve(answer.trim().toLowerCase());
      });
    });

    if (useCustomBaseUrl === 'y') {
      customBaseUrl = await new Promise<string>((resolve) => {
        rl.question(renderer.primary('🔗 请输入自定义 Base URL: '), (answer) => {
          resolve(answer.trim());
        });
      });
    }
  }

  // 输入 API Key
  const apiKeyEnvVar = `${providerKey.toUpperCase()}_API_KEY`;
  const apiKey = await new Promise<string>((resolve) => {
    rl.question(renderer.primary(`\n🔑 请输入您的 ${providerConfig.displayName} API Key (或按 Enter 退出): `), (answer) => {
      resolve(answer.trim());
    });
  });

  rl.close();

  if (!apiKey) {
    console.log('');
    console.log(renderer.secondary('👋 未提供 API Key，退出程序。'));
    console.log('');
    console.log('您可以在设置好环境变量后重新运行 sdkwork。');
    return null;
  }

  // 设置环境变量供当前会话使用
  process.env[apiKeyEnvVar] = apiKey;

  console.log('');
  console.log(renderer.success(`✅ API Key 已设置！`));
  console.log(renderer.info(`   提供商: ${providerConfig.displayName}`));
  console.log(renderer.info(`   模型: ${selectedModel.name}`));
  if (customBaseUrl) {
    console.log(renderer.info(`   Base URL: ${customBaseUrl}`));
  } else if (providerConfig.defaultBaseUrl) {
    console.log(renderer.info(`   Base URL: ${providerConfig.defaultBaseUrl} (默认)`));
  }
  console.log('');

  return {
    name: process.env.AGENT_NAME || 'SDKWork Agent',
    description: process.env.AGENT_DESCRIPTION,
    llm: {
      provider: providerKey as ModelProvider,
      apiKey,
      model: selectedModel.id,
      baseUrl: customBaseUrl,
    },
  };
}

/**
 * 加载配置
 */
async function loadConfig(renderer: EnhancedTUIRenderer): Promise<SDKWorkConfig | null> {
  // 从环境变量读取 API Key
  const apiKey = process.env.OPENAI_API_KEY || 
                 process.env.ANTHROPIC_API_KEY || 
                 process.env.GOOGLE_API_KEY ||
                 process.env.MOONSHOT_API_KEY ||
                 process.env.DEEPSEEK_API_KEY ||
                 process.env.QWEN_API_KEY ||
                 process.env.ZHIPU_API_KEY ||
                 process.env.MINIMAX_API_KEY ||
                 process.env.DOUBAO_API_KEY;
  
  if (!apiKey) {
    // 未配置 API Key，显示配置向导
    return await showConfigWizard(renderer);
  }

  const cliConfig = loadCLIConfig();

  // 获取 CLI 配置中的 LLM 设置
  const cliLLM = cliConfig.llm as { provider?: string; model?: string } | undefined;

  return {
    name: process.env.AGENT_NAME || cliConfig.name || 'SDKWork Agent',
    description: process.env.AGENT_DESCRIPTION || cliConfig.description,
    llm: {
      provider: (process.env.LLM_PROVIDER as any) || cliLLM?.provider || 'openai',
      apiKey,
      model: process.env.LLM_MODEL || cliLLM?.model || 'gpt-4',
    },
    theme: cliConfig.theme || 'default',
    spinnerStyle: cliConfig.spinnerStyle || 'dots',
    showTokenUsage: cliConfig.showTokenUsage ?? true,
    autoSave: cliConfig.autoSave ?? true,
    maxHistory: cliConfig.maxHistory || 100,
  };
}

/**
 * 显示配置信息
 */
function showConfigInfo(config: SDKWorkConfig, renderer: EnhancedTUIRenderer): void {
  const pairs: Record<string, string> = {
    'Agent Name': config.name,
    'Theme': config.theme || 'default',
    'Spinner Style': config.spinnerStyle || 'dots',
    'Show Token Usage': config.showTokenUsage ? 'Yes' : 'No',
    'Auto Save': config.autoSave ? 'Yes' : 'No',
    'Max History': String(config.maxHistory || 100),
  };

  // 安全地访问 llm 配置属性
  const llmConfig = config.llm;
  if (llmConfig && typeof llmConfig === 'object' && 'apiKey' in llmConfig) {
    pairs['Provider'] = String(llmConfig.provider);
    pairs['Model'] = String(llmConfig.model || 'default');
    pairs['API Key'] = llmConfig.apiKey ? llmConfig.apiKey.substring(0, 8) + '...' : 'not set';
    
    // 显示 Base URL
    if ('baseUrl' in llmConfig && llmConfig.baseUrl) {
      pairs['Base URL'] = String(llmConfig.baseUrl);
    } else {
      // 显示默认的 Base URL
      const providerKey = String(llmConfig.provider);
      const provider = PREDEFINED_PROVIDERS[providerKey as keyof typeof PREDEFINED_PROVIDERS];
      if (provider?.defaultBaseUrl) {
        pairs['Base URL'] = `${provider.defaultBaseUrl} (default)`;
      }
    }
  }

  renderer.newline();
  console.log(renderer.bold('⚙️  Configuration:'));
  renderer.newline();
  
  // 使用表格样式显示
  const maxKeyLength = Math.max(...Object.keys(pairs).map(k => k.length));
  Object.entries(pairs).forEach(([key, value]) => {
    const paddedKey = key.padEnd(maxKeyLength);
    console.log(`  ${renderer.secondary(paddedKey)}  ${renderer.primary(value)}`);
  });
  
  renderer.newline();
  console.log(renderer.secondary('💡 To change configuration, use /settings or set environment variables:'));
  console.log('  - OPENAI_API_KEY, ANTHROPIC_API_KEY, etc.');
  console.log('  - AGENT_NAME, LLM_MODEL, LLM_PROVIDER');
  console.log('  - LLM_BASE_URL (for custom endpoints)');
  renderer.newline();
}

/**
 * 显示模型选择界面
 */
async function showModelSelector(renderer: EnhancedTUIRenderer, currentModel: string, currentBaseUrl?: string): Promise<{ model: string; baseUrl?: string } | null> {
  renderer.clear();
  renderer.title('Model Selection', 'Choose from 65+ AI models across 10 providers or use custom');

  console.log(renderer.secondary(`Current model: ${renderer.primary(currentModel)}`));
  if (currentBaseUrl) {
    console.log(renderer.secondary(`Current Base URL: ${renderer.primary(currentBaseUrl)}`));
  }
  console.log('');

  const providers = Object.entries(PREDEFINED_PROVIDERS);

  // 显示提供商列表
  console.log(renderer.secondary('Providers:'));
  providers.forEach(([key, provider], index) => {
    const isActive = provider.models.some(m => m.id === currentModel);
    const marker = isActive ? renderer.success('●') : ' ';
    const baseUrl = provider.defaultBaseUrl ? renderer.muted(` - ${provider.defaultBaseUrl}`) : '';
    console.log(`  ${marker} ${index + 1}. ${renderer.bold(provider.displayName)} ${renderer.muted(`(${provider.models.length} models)`)}${baseUrl}`);
  });
  console.log(`  ${renderer.primary(`${providers.length + 1}. Custom Model`)} - 输入自定义模型ID和Base URL`);

  renderer.newline();

  const rl = createInterface({
    input: stdin,
    output: stdout,
  });

  const providerIndex = await new Promise<number | null>((resolve) => {
    rl.question(renderer.primary('Select provider (number) or press Enter to cancel: '), (answer) => {
      if (!answer.trim()) {
        resolve(null);
        return;
      }
      const index = parseInt(answer) - 1;
      resolve(isNaN(index) || index < 0 || index > providers.length ? null : index);
    });
  });

  if (providerIndex === null) {
    rl.close();
    return null;
  }

  // 处理自定义模型
  if (providerIndex === providers.length) {
    // 自定义模型
    const customModelId = await new Promise<string>((resolve) => {
      rl.question(renderer.primary('\n📝 请输入自定义模型 ID: '), (answer) => {
        resolve(answer.trim() || 'custom-model');
      });
    });

    console.log(renderer.secondary('\nBase URL 示例:'));
    console.log('  • OpenAI: https://api.openai.com/v1');
    console.log('  • Anthropic: https://api.anthropic.com/v1');
    console.log('  • Local: http://localhost:11434/v1 (Ollama)');
    console.log('  • Azure: https://{your-resource}.openai.azure.com/openai/deployments/{deployment}');

    const customBaseUrl = await new Promise<string | undefined>((resolve) => {
      rl.question(renderer.primary('\n🔗 请输入 Base URL (直接回车跳过): '), (answer) => {
        resolve(answer.trim() || undefined);
      });
    });

    rl.close();
    return { model: customModelId, baseUrl: customBaseUrl };
  }

  const [providerKey, providerConfig] = providers[providerIndex];

  // 显示该提供商的模型
  renderer.clear();
  renderer.title(`${providerConfig.displayName} Models`, 'Select a model to use');
  console.log(renderer.muted(`Default Base URL: ${providerConfig.defaultBaseUrl || 'None'}\n`));

  providerConfig.models.forEach((model, index) => {
    const isCurrent = model.id === currentModel;
    const marker = isCurrent ? renderer.success('→') : ' ';
    const pricing = model.inputPrice ? renderer.muted(`$${model.inputPrice}/1M in`) : '';
    const context = model.contextWindow ? renderer.muted(`${(model.contextWindow / 1000).toFixed(0)}K ctx`) : '';

    console.log(`  ${marker} ${index + 1}. ${renderer.bold(model.name)} ${pricing} ${context}`);
    if (model.description) {
      console.log(`     ${renderer.muted(model.description)}`);
    }
    // 显示模型能力
    const caps: string[] = [];
    if (model.supportsTools) caps.push('TOOL');
    if (model.supportsVision) caps.push('VIS');
    if (model.supportsStreaming) caps.push('STRM');
    if (model.supportsJsonMode) caps.push('JSON');
    if (caps.length > 0) {
      console.log(`     ${renderer.secondary('Capabilities:')} ${renderer.muted(caps.join(', '))}`);
    }
    console.log('');
  });
  console.log(`  ${providerConfig.models.length + 1}. ${renderer.primary('Custom Model')} - 输入其他模型ID`);

  const modelIndex = await new Promise<number | null>((resolve) => {
    rl.question(renderer.primary('Select model (number) or press Enter to cancel: '), (answer) => {
      if (!answer.trim()) {
        resolve(null);
        return;
      }
      const index = parseInt(answer) - 1;
      resolve(isNaN(index) || index < 0 || index > providerConfig.models.length ? null : index);
    });
  });

  if (modelIndex === null) {
    rl.close();
    return null;
  }

  // 处理自定义模型
  if (modelIndex === providerConfig.models.length) {
    const customModelId = await new Promise<string>((resolve) => {
      rl.question(renderer.primary('\n📝 请输入自定义模型 ID: '), (answer) => {
        resolve(answer.trim() || 'custom-model');
      });
    });

    // 询问是否使用自定义 Base URL
    console.log(renderer.secondary(`\n当前默认 Base URL: ${providerConfig.defaultBaseUrl || '无'}`));
    const useCustomBaseUrl = await new Promise<string>((resolve) => {
      rl.question(renderer.primary('是否使用自定义 Base URL? (y/n, 默认 n): '), (answer) => {
        resolve(answer.trim().toLowerCase());
      });
    });

    let customBaseUrl: string | undefined;
    if (useCustomBaseUrl === 'y') {
      customBaseUrl = await new Promise<string>((resolve) => {
        rl.question(renderer.primary('🔗 请输入自定义 Base URL: '), (answer) => {
          resolve(answer.trim());
        });
      });
    }

    rl.close();
    return { model: customModelId, baseUrl: customBaseUrl };
  }
  
  rl.close();
  
  if (modelIndex === null) {
    return null;
  }

  return { model: providerConfig.models[modelIndex].id };
}

/**
 * 显示主题选择器
 */
async function showThemeSelector(renderer: EnhancedTUIRenderer, currentTheme: string): Promise<string | null> {
  renderer.clear();
  renderer.title('Theme Selection', 'Choose your preferred color theme');
  
  console.log(renderer.secondary(`Current theme: ${renderer.primary(currentTheme)}\n`));
  
  const themes = Object.entries(THEMES);
  themes.forEach(([key, theme], index) => {
    const isCurrent = key === currentTheme;
    const marker = isCurrent ? renderer.success('→') : ' ';
    console.log(`  ${marker} ${index + 1}. ${renderer.bold(theme.name)}`);
  });
  
  renderer.newline();
  
  const rl = createInterface({
    input: stdin,
    output: stdout,
  });
  
  const themeIndex = await new Promise<number | null>((resolve) => {
    rl.question(renderer.primary('Select theme (number) or press Enter to cancel: '), (answer) => {
      if (!answer.trim()) {
        resolve(null);
        return;
      }
      const index = parseInt(answer) - 1;
      resolve(isNaN(index) || index < 0 || index >= themes.length ? null : index);
    });
  });
  
  rl.close();
  
  if (themeIndex === null) {
    return null;
  }
  
  return themes[themeIndex][0];
}

/**
 * 显示会话管理界面
 */
async function showSessionManager(
  renderer: EnhancedTUIRenderer, 
  currentSession: Session | null,
  messages: Array<{ role: 'user' | 'assistant'; content: string }>
): Promise<{ action: 'load' | 'save' | 'delete' | 'cancel'; session?: Session }> {
  renderer.clear();
  renderer.title('Session Manager', 'Manage your conversation sessions');
  
  const sessions = loadSessions();
  
  if (sessions.length === 0) {
    console.log(renderer.muted('No saved sessions yet.'));
  } else {
    console.log(renderer.secondary('Saved sessions:\n'));
    sessions.forEach((session, index) => {
      const isCurrent = currentSession?.id === session.id;
      const marker = isCurrent ? renderer.success('→') : ' ';
      const date = new Date(session.updatedAt).toLocaleString();
      const msgCount = session.messages.length;
      console.log(`  ${marker} ${index + 1}. ${renderer.bold(session.name)}`);
      console.log(`     ${renderer.muted(`${msgCount} messages · ${date} · ${session.model}`)}`);
      console.log('');
    });
  }
  
  renderer.newline();
  console.log(renderer.secondary('Actions:'));
  console.log(`  ${renderer.primary('save')}    Save current conversation`);
  console.log(`  ${renderer.primary('load')}    Load a saved session`);
  console.log(`  ${renderer.primary('delete')}  Delete a session`);
  console.log(`  ${renderer.primary('cancel')}  Return to chat`);
  renderer.newline();
  
  const rl = createInterface({
    input: stdin,
    output: stdout,
  });
  
  const action = await new Promise<string>((resolve) => {
    rl.question(renderer.primary('Enter action: '), (answer) => {
      resolve(answer.trim().toLowerCase());
    });
  });
  
  if (action === 'cancel' || !action) {
    rl.close();
    return { action: 'cancel' };
  }
  
  if (action === 'save') {
    const name = await new Promise<string>((resolve) => {
      rl.question(renderer.primary('Enter session name: '), (answer) => {
        resolve(answer.trim() || `Session ${new Date().toLocaleString()}`);
      });
    });
    
    rl.close();
    
    const session: Session = {
      id: crypto.randomUUID(),
      name,
      messages: messages.map(m => ({ ...m, timestamp: Date.now() })),
      createdAt: Date.now(),
      updatedAt: Date.now(),
      model: currentSession?.model || 'unknown',
    };
    
    saveSession(session);
    renderer.notifySuccess('Session Saved', `Saved as "${name}"`);
    return { action: 'save', session };
  }
  
  if (action === 'load' || action === 'delete') {
    const index = await new Promise<number | null>((resolve) => {
      rl.question(renderer.primary('Enter session number: '), (answer) => {
        const idx = parseInt(answer) - 1;
        resolve(isNaN(idx) || idx < 0 || idx >= sessions.length ? null : idx);
      });
    });
    
    rl.close();
    
    if (index === null) {
      return { action: 'cancel' };
    }
    
    const session = sessions[index];
    
    if (action === 'delete') {
      deleteSession(session.id);
      renderer.notifySuccess('Session Deleted', `Deleted "${session.name}"`);
      return { action: 'delete' };
    }
    
    return { action: 'load', session };
  }
  
  rl.close();
  return { action: 'cancel' };
}

/**
 * 显示设置界面
 */
async function showSettings(renderer: EnhancedTUIRenderer, config: SDKWorkConfig): Promise<Partial<SDKWorkConfig>> {
  renderer.clear();
  renderer.title('Settings', 'Customize your CLI experience');
  
  console.log(renderer.secondary('Current settings:\n'));
  console.log(`  1. Spinner Style: ${renderer.primary(config.spinnerStyle || 'dots')}`);
  console.log(`  2. Show Token Usage: ${renderer.primary(config.showTokenUsage ? 'Yes' : 'No')}`);
  console.log(`  3. Auto Save: ${renderer.primary(config.autoSave ? 'Yes' : 'No')}`);
  console.log(`  4. Max History: ${renderer.primary(String(config.maxHistory || 100))}`);
  renderer.newline();
  
  const rl = createInterface({
    input: stdin,
    output: stdout,
  });
  
  const setting = await new Promise<string>((resolve) => {
    rl.question(renderer.primary('Enter setting number to change (or press Enter to cancel): '), (answer) => {
      resolve(answer.trim());
    });
  });
  
  const updates: Partial<SDKWorkConfig> = {};
  
  switch (setting) {
    case '1': {
      const styles = ['dots', 'line', 'arrow', 'bounce', 'pulse'];
      console.log(renderer.secondary('\nAvailable styles:'));
      styles.forEach((s, i) => console.log(`  ${i + 1}. ${s}`));
      const styleIndex = await new Promise<number>((resolve) => {
        rl.question(renderer.primary('\nSelect style: '), (answer) => {
          const idx = parseInt(answer) - 1;
          resolve(isNaN(idx) || idx < 0 || idx >= styles.length ? 0 : idx);
        });
      });
      updates.spinnerStyle = styles[styleIndex] as SpinnerStyle;
      break;
    }
    case '2': {
      const answer = await new Promise<string>((resolve) => {
        rl.question(renderer.primary('Show token usage? (y/n): '), resolve);
      });
      updates.showTokenUsage = answer.toLowerCase() === 'y';
      break;
    }
    case '3': {
      const answer = await new Promise<string>((resolve) => {
        rl.question(renderer.primary('Auto save sessions? (y/n): '), resolve);
      });
      updates.autoSave = answer.toLowerCase() === 'y';
      break;
    }
    case '4': {
      const answer = await new Promise<string>((resolve) => {
        rl.question(renderer.primary('Max history size: '), resolve);
      });
      const num = parseInt(answer);
      if (!isNaN(num) && num > 0) {
        updates.maxHistory = num;
      }
      break;
    }
  }
  
  rl.close();
  
  // 保存更新
  const newConfig = { ...config, ...updates };
  saveCLIConfig(newConfig);
  
  if (Object.keys(updates).length > 0) {
    renderer.notifySuccess('Settings Updated', 'Your preferences have been saved');
  }
  
  return updates;
}

/**
 * 加载所有技能和工具
 */
async function loadAllCapabilities(): Promise<{ skills: Skill[]; tools: Tool[]; stats: { bySource: Record<string, number> } }> {
  try {
    // 使用通用技能加载器加载所有位置的技能
    const { skills, stats } = await loadAllSkills();

    logger.info(`Loaded ${stats.total} skills:`);
    logger.info(`  - Builtin: ${stats.bySource.builtin}`);
    logger.info(`  - Managed (~/.sdkwork/skills): ${stats.bySource.managed}`);
    logger.info(`  - Workspace (./.sdkwork/skills): ${stats.bySource.workspace}`);

    // TODO: 加载工具
    const tools: Tool[] = [];

    return { skills, tools, stats: { bySource: stats.bySource } };
  } catch (error) {
    logger.error(`Failed to load capabilities: ${error instanceof Error ? error.message : String(error)}`);
    return { skills: [], tools: [], stats: { bySource: { builtin: 0, managed: 0, workspace: 0 } } };
  }
}

/**
 * 主函数
 */
export async function main(): Promise<void> {
  // 创建渲染器
  const renderer = createEnhancedRenderer();
  
  try {
    // 加载配置（如果没有 API Key，会显示配置向导）
    const config = await loadConfig(renderer);
    
    if (!config) {
      // 用户未提供 API Key，退出
      process.exit(0);
    }
    
    // 应用主题
    if (config.theme && THEMES[config.theme]) {
      renderer.setTheme(THEMES[config.theme]);
    }
    
    // 加载所有技能和工具
    const { skills, tools } = await loadAllCapabilities();
    logger.info(`Loaded ${skills.length} skills and ${tools.length} tools`);
    
    // 创建 Agent
    const agent = new AgentImpl({
      name: config.name,
      description: config.description,
      llm: config.llm,
      skills,
      tools,
    });

    // 初始化 Agent
    await agent.initialize();
    logger.info('Agent initialized');

    // 加载历史记录
    const history = loadHistory();

    // 显示欢迎信息
    renderer.welcome({ 
      name: config.name,
      version: '3.0.0',
      description: config.description || 'Your AI-powered development companion'
    });

    // 对话历史
    const messages: Array<{ role: 'user' | 'assistant'; content: string; timestamp?: number }> = [];
    let currentSession: Session | null = null;

    // 创建智能输入
    const smartInput = new SmartInput({
      prompt: renderer.primary('> '),
      completions: [...COMMAND_COMPLETIONS, ...MODEL_COMPLETIONS],
      history,
      maxHistory: config.maxHistory || 100,
    });

    // 主循环
    while (true) {
      try {
        // 读取输入
        const input = await smartInput.read();
        const trimmed = input.trim();

        if (!trimmed) {
          continue;
        }

        // 处理命令
        if (trimmed.startsWith('/')) {
          const command = trimmed.slice(1).toLowerCase().split(' ')[0];
          
          switch (command) {
            case 'help':
            case 'h':
              renderer.box([
                '',
                ...COMMANDS.map(cmd => `  /${cmd.name.padEnd(10)} ${cmd.description}`),
                '',
                renderer.muted('Shortcuts:'),
                `  ${renderer.primary('Ctrl+C')}    Exit`,
                `  ${renderer.primary('Ctrl+L')}    Clear screen`,
                `  ${renderer.primary('Tab')}       Auto-complete`,
                `  ${renderer.primary('↑/↓')}       Navigate history`,
                '',
              ], 'Available Commands');
              break;
              
            case 'clear':
            case 'c':
              renderer.clear();
              renderer.welcome({ 
                name: config.name,
                version: '3.0.0',
                description: config.description || 'Your AI-powered development companion'
              });
              messages.length = 0;
              currentSession = null;
              renderer.notifySuccess('Cleared', 'Conversation history cleared');
              break;
              
            case 'exit':
            case 'quit':
            case 'q':
              renderer.notifyInfo('Goodbye', 'Shutting down...');
              await agent.destroy();
              // 保存历史
              saveHistory(smartInput.getHistory());
              exit(0);
              break;
              
            case 'config':
              showConfigInfo(config, renderer);
              break;
              
            case 'tools':
              renderer.newline();
              console.log(renderer.bold('🔧 Available Tools:'));
              const tools = agent.tools.list();
              if (tools.length === 0) {
                console.log(renderer.secondary('  No tools registered'));
              } else {
                tools.forEach((tool) => {
                  console.log(`  ${renderer.primary('•')} ${tool.name}: ${tool.description}`);
                });
              }
              renderer.newline();
              break;
              
            case 'skills':
              const skillsList = agent.skills.list();
              console.log(formatSkillsList(skillsList));
              break;
              
            case 'model': {
              const currentModel = config.llm && typeof config.llm === 'object' && 'model' in config.llm 
                ? config.llm.model 
                : 'gpt-4';
              const currentBaseUrl = config.llm && typeof config.llm === 'object' && 'baseUrl' in config.llm 
                ? config.llm.baseUrl 
                : undefined;
              const result = await showModelSelector(renderer, String(currentModel), currentBaseUrl as string | undefined);
              if (result && config.llm && typeof config.llm === 'object' && 'model' in config.llm) {
                config.llm.model = result.model;
                if (result.baseUrl) {
                  (config.llm as any).baseUrl = result.baseUrl;
                }
                saveCLIConfig(config);
                const baseUrlMsg = result.baseUrl ? `\nBase URL: ${result.baseUrl}` : '';
                renderer.notifySuccess('Model Changed', `Now using: ${result.model}${baseUrlMsg}`);
              }
              break;
            }
            
            case 'theme': {
              const newTheme = await showThemeSelector(renderer, config.theme || 'default');
              if (newTheme) {
                config.theme = newTheme;
                renderer.setTheme(THEMES[newTheme]);
                saveCLIConfig(config);
                renderer.notifySuccess('Theme Changed', `Now using: ${THEMES[newTheme].name}`);
              }
              break;
            }
            
            case 'session': {
              const result = await showSessionManager(renderer, currentSession, messages);
              if (result.action === 'load' && result.session) {
                messages.length = 0;
                messages.push(...result.session.messages.map(m => ({ 
                  role: m.role, 
                  content: m.content 
                })));
                currentSession = result.session;
                renderer.notifySuccess('Session Loaded', `Loaded "${result.session.name}"`);
                // 显示加载的消息
                messages.forEach(m => {
                  if (m.role === 'user') {
                    renderer.message('user', m.content);
                  } else {
                    renderer.message('assistant', m.content);
                  }
                });
              }
              break;
            }
            
            case 'settings': {
              const updates = await showSettings(renderer, config);
              Object.assign(config, updates);
              break;
            }
              
            default:
              renderer.notifyError('Unknown Command', `/${command} is not recognized`);
              console.log(renderer.secondary('Type /help for available commands'));
          }
          
          continue;
        }

        // 添加用户消息到历史
        messages.push({ role: 'user', content: trimmed, timestamp: Date.now() });

        // 显示用户消息
        renderer.message('user', trimmed);

        // 显示加载状态
        renderer.startLoading('Thinking...', config.spinnerStyle);
        
        try {
          // 发送消息到 Agent
          const response = await agent.chat({
            messages: messages.map((m) => ({
              role: m.role,
              content: m.content,
              id: crypto.randomUUID(),
              timestamp: m.timestamp || Date.now(),
            })),
          });

          // 清除加载状态
          renderer.stopLoading();

          // 获取助手回复
          const assistantMessage = response.choices[0]?.message?.content;
          
          if (assistantMessage && typeof assistantMessage === 'string') {
            // 添加到历史
            messages.push({ 
              role: 'assistant', 
              content: assistantMessage,
              timestamp: Date.now()
            });
            
            // 显示回复
            renderer.message('assistant', assistantMessage);
            
            // 显示 Token 使用情况
            if (config.showTokenUsage && response.usage) {
              renderer.tokenUsage(response.usage.promptTokens, response.usage.completionTokens);
              renderer.newline();
            }
            
            // 自动保存
            if (config.autoSave && messages.length > 2) {
              const modelName = config.llm && typeof config.llm === 'object' && 'model' in config.llm 
                ? config.llm.model 
                : 'unknown';
              const session: Session = {
                id: currentSession?.id || crypto.randomUUID(),
                name: currentSession?.name || `Session ${new Date().toLocaleString()}`,
                messages: messages as Session['messages'],
                createdAt: currentSession?.createdAt || Date.now(),
                updatedAt: Date.now(),
                model: String(modelName),
              };
              saveSession(session);
              currentSession = session;
            }
          }
        } catch (error) {
          // 清除加载状态
          renderer.stopLoading();
          
          // 显示错误
          const errorMessage = error instanceof Error ? error.message : String(error);
          renderer.errorBox(
            'Chat Error',
            errorMessage,
            'Check your API key and network connection, then try again.'
          );
        }

      } catch (error) {
        if (error instanceof Error && error.message === 'Interrupted') {
          // Ctrl+C pressed, exit gracefully
          renderer.notifyInfo('Goodbye', 'Shutting down...');
          await agent.destroy();
          saveHistory(smartInput.getHistory());
          exit(0);
        }
        throw error;
      }
    }

  } catch (error) {
    logger.error('Failed to start CLI', { error });
    renderer.errorBox(
      'Startup Error',
      error instanceof Error ? error.message : String(error),
      'Check your configuration and try again.'
    );
    process.exit(1);
  }
}

// 如果直接运行此文件
// 注意：在 ES Module 中，我们使用 import.meta.url 来检测
// 这里由 bin/sdkwork.js 调用 main() 函数
