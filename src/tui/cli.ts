#!/usr/bin/env node
/**
 * SDKWork TUI CLI - 专业级终端交互界面
 *
 * 命令行入口: sdkwork
 * 参考 Claude Code、Codex CLI、OpenCode 等顶级智能体 CLI 设计
 *
 * @module TUI
 * @version 2.0.0
 */

import { createInterface } from 'readline';
import { stdin, stdout, exit } from 'process';
import { platform } from 'os';
import { AgentImpl } from '../core/application/agent-impl.js';
import { createLogger } from '../utils/logger.js';
import type { AgentConfig } from '../core/domain/agent.js';
import type { Skill } from '../core/domain/skill.js';
import type { Tool } from '../core/domain/tool.js';
import { loadAllSkills, formatSkillsList } from '../skills/skill-loader.js';
import { TUIRenderer, createRenderer, DEFAULT_THEME } from './renderer.js';

const logger = createLogger({ name: 'SDKWorkCLI' });

interface SDKWorkConfig {
  name: string;
  llm: AgentConfig['llm'];
  description?: string;
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
];

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
async function showConfigWizard(renderer: TUIRenderer): Promise<SDKWorkConfig | null> {
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
  console.log('  • OpenAI (GPT-4, GPT-3.5)');
  console.log('  • Anthropic (Claude)');
  console.log('  • Google (Gemini)');
  console.log('  • 以及更多...');
  console.log('');
  
  // 创建 readline 接口用于输入
  const rl = createInterface({
    input: stdin,
    output: stdout,
  });
  
  const apiKey = await new Promise<string>((resolve) => {
    rl.question(renderer.primary('🔑 请输入您的 OpenAI API Key (或按 Enter 退出): '), (answer) => {
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
  process.env.OPENAI_API_KEY = apiKey;
  
  console.log('');
  console.log(renderer.success('✅ API Key 已设置！'));
  console.log('');
  
  return {
    name: process.env.AGENT_NAME || 'SDKWork Agent',
    description: process.env.AGENT_DESCRIPTION,
    llm: {
      provider: (process.env.LLM_PROVIDER as any) || 'openai',
      apiKey,
      model: process.env.LLM_MODEL || 'gpt-4',
    },
  };
}

/**
 * 加载配置
 */
async function loadConfig(renderer: TUIRenderer): Promise<SDKWorkConfig | null> {
  // 从环境变量读取 API Key
  const apiKey = process.env.OPENAI_API_KEY;
  
  if (!apiKey) {
    // 未配置 API Key，显示配置向导
    return await showConfigWizard(renderer);
  }

  return {
    name: process.env.AGENT_NAME || 'SDKWork Agent',
    description: process.env.AGENT_DESCRIPTION,
    llm: {
      provider: (process.env.LLM_PROVIDER as any) || 'openai',
      apiKey,
      model: process.env.LLM_MODEL || 'gpt-4',
    },
  };
}

/**
 * 显示配置信息
 */
function showConfigInfo(config: SDKWorkConfig, renderer: TUIRenderer): void {
  const pairs: Record<string, string> = {
    'Agent Name': config.name,
  };

  // 安全地访问 llm 配置属性
  const llmConfig = config.llm;
  if (typeof llmConfig === 'object' && 'provider' in llmConfig) {
    pairs['Provider'] = llmConfig.provider;
    pairs['Model'] = llmConfig.model || 'default';
    pairs['API Key'] = llmConfig.apiKey ? llmConfig.apiKey.substring(0, 8) + '...' : 'not set';
  }

  renderer.newline();
  console.log(renderer.bold('⚙️  Configuration:'));
  renderer.newline();
  renderer.keyValue(pairs);
  renderer.newline();
  
  console.log(renderer.secondary('💡 To change configuration, set environment variables:'));
  console.log('  - OPENAI_API_KEY');
  console.log('  - AGENT_NAME');
  console.log('  - LLM_MODEL');
  renderer.newline();
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
  const renderer = createRenderer();
  
  try {
    // 加载配置（如果没有 API Key，会显示配置向导）
    const config = await loadConfig(renderer);
    
    if (!config) {
      // 用户未提供 API Key，退出
      process.exit(0);
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

    // 显示欢迎信息
    renderer.welcome({ name: config.name });

    // 创建 readline 接口
    const rl = createInterface({
      input: stdin,
      output: stdout,
      prompt: renderer.primary('> '),
    });

    // 对话历史
    const messages: Array<{ role: 'user' | 'assistant'; content: string }> = [];

    // 处理输入
    rl.on('line', async (input) => {
      const trimmed = input.trim();

      if (!trimmed) {
        rl.prompt();
        return;
      }

      // 处理命令
      if (trimmed.startsWith('/')) {
        const command = trimmed.slice(1).toLowerCase().split(' ')[0];
        
        switch (command) {
          case 'help':
          case 'h':
            renderer.help(COMMANDS);
            break;
            
          case 'clear':
          case 'c':
            renderer.clear();
            renderer.welcome({ name: config.name });
            messages.length = 0;
            console.log(renderer.success('✅ Conversation history cleared'));
            break;
            
          case 'exit':
          case 'quit':
          case 'q':
            console.log(renderer.secondary('👋 Goodbye!'));
            rl.close();
            await agent.destroy();
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
            
          default:
            console.log(renderer.error(`❌ Unknown command: /${command}`));
            console.log(renderer.secondary('Type /help for available commands'));
        }
        
        rl.prompt();
        return;
      }

      // 添加用户消息到历史
      messages.push({ role: 'user', content: trimmed });

      // 显示用户消息
      renderer.message('user', trimmed);

      try {
        // 显示加载状态
        renderer.startLoading('Thinking...');
        
        // 发送消息到 Agent
        const response = await agent.chat({
          messages: messages.map((m) => ({
            role: m.role,
            content: m.content,
            id: crypto.randomUUID(),
            timestamp: Date.now(),
          })),
        });

        // 清除加载状态
        renderer.stopLoading();

        // 获取助手回复
        const assistantMessage = response.choices[0]?.message?.content;
        
        if (assistantMessage && typeof assistantMessage === 'string') {
          // 添加到历史
          messages.push({ role: 'assistant', content: assistantMessage });
          
          // 显示回复
          renderer.message('assistant', assistantMessage);
          
          // 显示 Token 使用情况
          if (response.usage) {
            renderer.tokenUsage(response.usage.promptTokens, response.usage.completionTokens);
            renderer.newline();
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

      rl.prompt();
    });

    // 处理 Ctrl+C
    rl.on('SIGINT', () => {
      console.log('\n' + renderer.secondary('👋 Goodbye!'));
      rl.close();
      agent.destroy().then(() => exit(0));
    });

    // 启动提示
    rl.prompt();

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
