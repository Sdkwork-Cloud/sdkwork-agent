/**
 * Agent Skill System Integration Example
 *
 * 展示如何在Agent自我思考过程中集成技能系统
 *
 * 使用场景：
 * 1. Agent接收用户输入
 * 2. 动态选择适合的技能
 * 3. 加载技能指令到上下文
 * 4. 执行技能或分发命令
 */

import {
  UnifiedSkillSystem,
  createSkillSystem,
  SkillSelectionResult,
  SkillSystemState,
} from '../core/skill-system.js';
import { CommandDispatchResult } from '../core/command-dispatch.js';
import { Logger, LLMService } from '../core/types.js';

/**
 * Agent 配置
 */
interface AgentConfig {
  /** 工作区目录 */
  workspaceDir: string;
  /** LLM 服务 */
  llm: LLMService;
  /** 日志器 */
  logger: Logger;
}

/**
 * 用户消息
 */
interface UserMessage {
  id: string;
  content: string;
  timestamp: Date;
}

/**
 * Agent 响应
 */
interface AgentResponse {
  content: string;
  usedSkills?: string[];
  executedCommand?: CommandDispatchResult;
}

/**
 * Agent 思考上下文
 */
interface ThinkingContext {
  userInput: string;
  conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }>;
  currentTask?: string;
}

/**
 * 集成技能系统的 Agent
 *
 * 演示动态技能选择和工作流程
 */
export class SkillEnabledAgent {
  private skillSystem: UnifiedSkillSystem;
  private config: AgentConfig;
  private conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }> = [];

  constructor(config: AgentConfig) {
    this.config = {
      ...config,
      logger: config.logger ?? this.createDefaultLogger(),
    };

    // 初始化技能系统
    this.skillSystem = createSkillSystem({
      workspaceDir: config.workspaceDir,
      logger: this.config.logger,
    });
  }

  /**
   * 初始化 Agent
   */
  async initialize(): Promise<void> {
    this.config.logger.info('Initializing skill-enabled agent');

    // 初始化技能系统
    await this.skillSystem.initialize();

    const state = this.skillSystem.getState();
    this.config.logger.info(
      `Agent ready with ${state.loadedSkillCount} skills and ${state.availableCommandCount} commands`
    );
  }

  /**
   * 关闭 Agent
   */
  async shutdown(): Promise<void> {
    this.config.logger.info('Shutting down agent');
    await this.skillSystem.shutdown();
  }

  /**
   * 处理用户消息
   *
   * 核心流程：
   * 1. 接收用户输入
   * 2. 检查是否是命令
   * 3. 动态选择技能
   * 4. 构建 LLM 提示词
   * 5. 生成响应
   */
  async handleMessage(message: UserMessage): Promise<AgentResponse> {
    this.config.logger.debug(`Handling message: ${message.content}`);

    // 1. 检查是否是技能命令 (/skill-name)
    const commandResult = await this.tryHandleCommand(message.content);
    if (commandResult) {
      return {
        content: `Executed command: ${message.content}`,
        executedCommand: commandResult,
      };
    }

    // 2. 构建思考上下文
    const thinkingContext: ThinkingContext = {
      userInput: message.content,
      conversationHistory: this.conversationHistory,
    };

    // 3. 动态选择技能 (核心：Agent自我思考过程)
    const skillSelection = await this.selectSkills(thinkingContext);

    // 4. 构建 LLM 提示词
    const prompt = this.buildPrompt(message.content, skillSelection);

    // 5. 调用 LLM 生成响应
    const response = await this.config.llm.complete(prompt, {
      temperature: 0.7,
      maxTokens: 2000,
    });

    // 6. 更新对话历史
    this.conversationHistory.push(
      { role: 'user', content: message.content },
      { role: 'assistant', content: response }
    );

    // 7. 限制历史长度
    if (this.conversationHistory.length > 20) {
      this.conversationHistory = this.conversationHistory.slice(-20);
    }

    return {
      content: response,
      usedSkills: skillSelection.selectedSkills,
    };
  }

  /**
   * 动态选择技能
   *
   * 在Agent自我思考过程中决定调用哪些技能
   */
  private async selectSkills(
    context: ThinkingContext
  ): Promise<SkillSelectionResult> {
    this.config.logger.debug('Selecting skills for context');

    const result = await this.skillSystem.selectSkills({
      userInput: context.userInput,
      history: context.conversationHistory,
      currentTask: context.currentTask,
      llm: this.config.llm,
    });

    if (result.shouldLoad && result.selectedSkills.length > 0) {
      this.config.logger.info(
        `Selected skills: ${result.selectedSkills.join(', ')} (confidence: ${result.confidence.toFixed(2)})`
      );
    } else {
      this.config.logger.debug('No skills selected for this context');
    }

    return result;
  }

  /**
   * 尝试处理命令
   */
  private async tryHandleCommand(input: string): Promise<CommandDispatchResult | null> {
    // 检查是否是命令格式 (/command 或 \command)
    if (!input.match(/^[\\/]\S+/)) {
      return null;
    }

    this.config.logger.debug(`Processing command: ${input}`);

    const result = await this.skillSystem.handleCommand(input);

    if (result.success) {
      this.config.logger.info(`Command executed successfully: ${input}`);
    } else {
      this.config.logger.warn(`Command failed: ${result.error}`);
    }

    return result;
  }

  /**
   * 构建 LLM 提示词
   */
  private buildPrompt(
    userInput: string,
    skillSelection: SkillSelectionResult
  ): string {
    const lines: string[] = [];

    // 1. 系统提示词
    lines.push('You are a helpful AI assistant with access to specialized skills.');
    lines.push('');

    // 2. 技能提示词
    const skillPrompt = this.skillSystem.getSkillPrompt();
    if (skillPrompt) {
      lines.push(skillPrompt);
      lines.push('');
    }

    // 3. 选中的技能
    if (skillSelection.selectedSkills.length > 0) {
      lines.push('### Selected Skills for This Task');
      lines.push(`Based on your input, the following skills may be relevant:`);
      lines.push(skillSelection.selectedSkills.map(s => `- ${s}`).join('\n'));
      lines.push('');
      lines.push(`Reasoning: ${skillSelection.reasoning}`);
      lines.push('');
    }

    // 4. 用户输入
    lines.push('### User Input');
    lines.push(userInput);
    lines.push('');

    // 5. 指令
    lines.push('### Instructions');
    lines.push('1. Analyze the user input carefully');
    if (skillSelection.selectedSkills.length > 0) {
      lines.push('2. Use the selected skills to help answer the question');
      lines.push('3. If you need to use a skill, explain your reasoning');
    } else {
      lines.push('2. Answer based on your general knowledge');
    }
    lines.push('4. Be concise and helpful');

    return lines.join('\n');
  }

  /**
   * 获取技能系统状态
   */
  getSkillSystemState(): SkillSystemState {
    return this.skillSystem.getState();
  }

  /**
   * 获取可用命令列表
   */
  getAvailableCommands(): string[] {
    return this.skillSystem.getCommandSpecs().map(spec => `/${spec.name}`);
  }

  /**
   * 手动触发技能重载
   */
  async reloadSkills(): Promise<void> {
    this.config.logger.info('Manually reloading skills');
    await this.skillSystem.reload();
  }

  /**
   * 创建默认日志器
   */
  private createDefaultLogger(): Logger {
    return {
      debug: () => {},
      info: console.info,
      warn: console.warn,
      error: console.error,
    };
  }
}

/**
 * 创建技能启用的 Agent
 */
export function createSkillEnabledAgent(config: AgentConfig): SkillEnabledAgent {
  return new SkillEnabledAgent(config);
}

// ============================================================================
// 使用示例
// ============================================================================

/**
 * 示例：基本使用
 */
export async function exampleBasicUsage(): Promise<void> {
  // 模拟 LLM 服务
  const mockLLM: LLMService = {
    async complete(prompt: string): Promise<string> {
      // 实际应用中这里调用真实的 LLM API
      return `Response based on prompt length: ${prompt.length} chars`;
    },
    async *completeStream(prompt: string): AsyncIterable<string> {
      yield `Streaming response for: ${prompt.slice(0, 50)}...`;
    },
  };

  // 创建 Agent
  const agent = createSkillEnabledAgent({
    workspaceDir: './workspace',
    llm: mockLLM,
    logger: console,
  });

  // 初始化
  await agent.initialize();

  // 查看可用命令
  console.log('Available commands:', agent.getAvailableCommands());

  // 处理用户消息
  const response1 = await agent.handleMessage({
    id: '1',
    content: 'How do I analyze a CSV file?',
    timestamp: new Date(),
  });
  console.log('Response 1:', response1);

  // 使用命令
  const response2 = await agent.handleMessage({
    id: '2',
    content: '/data-analysis help',
    timestamp: new Date(),
  });
  console.log('Response 2:', response2);

  // 关闭
  await agent.shutdown();
}

/**
 * 示例：高级配置
 */
export async function exampleAdvancedConfig(): Promise<void> {
  const mockLLM: LLMService = {
    async complete(prompt: string): Promise<string> {
      return `Advanced response: ${prompt.slice(0, 100)}...`;
    },
    async *completeStream(): AsyncIterable<string> {
      yield 'Streaming...';
    },
  };

  // 创建带有自定义配置的技能系统
  void createSkillSystem({
    workspaceDir: './workspace',
    configDir: './config',
    bundledDir: './builtin-skills',
    skillsConfig: {
      load: {
        extraDirs: ['./custom-skills'],
        watch: true,
        watchDebounceMs: 500,
      },
      skills: {
        'data-analysis': {
          enabled: true,
          env: { DATA_PATH: './data' },
        },
      },
    },
    reservedCommandNames: new Set(['help', 'exit', 'reload']),
    pluginSkillResolver: () => ['./plugins/plugin-a/skills', './plugins/plugin-b/skills'],
  });

  // 创建 Agent
  const agent = createSkillEnabledAgent({
    workspaceDir: './workspace',
    llm: mockLLM,
    logger: console,
  });

  await agent.initialize();

  // 使用...

  await agent.shutdown();
}
