/**
 * Compatibility Module
 *
 * 兼容性模块 - 支持多种 AI 编程助手
 *
 * 支持的兼容层：
 * - OpenClaw: OpenClaw 技能系统兼容
 * - Claude Code: Anthropic Claude Code 兼容
 * - Codex: OpenAI Codex 兼容
 * - OpenCode: OpenCode 兼容
 *
 * @module Compatibility
 * @version 1.0.0
 */

// ============================================================================
// OpenClaw Compatibility
// ============================================================================
export {
  OpenClawAdapter,
  createOpenClawAdapter,
} from './openclaw-adapter.js';
export type {
  OpenClawRawSkill,
  OpenClawCommand,
  OpenClawToolCall,
  OpenClawAdapterConfig,
  OpenClawToolBridge,
} from './openclaw-adapter.js';

// ============================================================================
// Multi-Agent Compatibility
// ============================================================================
export {
  MultiAgentAdapter,
  createMultiAgentAdapter,
  ClaudeAdapter,
  CodexAdapter,
  OpenCodeAdapter,
} from './multi-agent-adapter.js';
export type {
  AgentTool,
  AgentMessage,
  AgentToolCall,
  AgentToolResult,
  AgentSession,
  ClaudeConfig,
  CodexConfig,
  OpenCodeConfig,
  MultiAgentConfig,
} from './multi-agent-adapter.js';

// ============================================================================
// Unified Compatibility Layer
// ============================================================================

import { FrameworkConfigManager } from '../config/index.js';
import { OpenClawAdapter } from './openclaw-adapter.js';
import { MultiAgentAdapter } from './multi-agent-adapter.js';
import { Logger } from '../skills/core/types.js';

export interface UnifiedCompatibilityLayerConfig {
  configManager: FrameworkConfigManager;
  logger?: Logger;
}

/**
 * 统一兼容性层
 *
 * 根据配置自动启用相应的兼容适配器
 */
export class UnifiedCompatibilityLayer {
  private configManager: FrameworkConfigManager;
  private logger: Logger;
  private openclawAdapter?: OpenClawAdapter;
  private multiAgentAdapter?: MultiAgentAdapter;

  constructor(config: UnifiedCompatibilityLayerConfig) {
    this.configManager = config.configManager;
    this.logger = config.logger || this.createDefaultLogger();
  }

  /**
   * 初始化兼容性层
   */
  async initialize(): Promise<void> {
    this.logger.info('Initializing unified compatibility layer');

    const config = this.configManager.getConfig();

    // 初始化 OpenClaw 适配器
    if (config.compatibility.openclaw?.enabled) {
      const { createOpenClawAdapter } = await import('./openclaw-adapter.js');
      this.openclawAdapter = createOpenClawAdapter({
        skillsDir: config.compatibility.openclaw.skillsDir || '~/.openclaw/skills',
        enableCommandMapping: true,
        logger: this.logger,
      });
      await this.openclawAdapter.initialize();
      this.logger.info('OpenClaw compatibility enabled');
    }

    // 初始化多智能体适配器
    const multiAgentConfig = {
      claude: config.compatibility.claude,
      codex: config.compatibility.codex,
      opencode: config.compatibility.opencode,
    };

    if (
      multiAgentConfig.claude?.enabled ||
      multiAgentConfig.codex?.enabled ||
      multiAgentConfig.opencode?.enabled
    ) {
      const { createMultiAgentAdapter } = await import('./multi-agent-adapter.js');
      this.multiAgentAdapter = createMultiAgentAdapter(multiAgentConfig, this.logger);
      this.logger.info(
        `Multi-agent compatibility enabled: ${this.multiAgentAdapter.getEnabledAdapters().join(', ')}`
      );
    }
  }

  /**
   * 获取 OpenClaw 适配器
   */
  getOpenClawAdapter(): OpenClawAdapter | undefined {
    return this.openclawAdapter;
  }

  /**
   * 获取多智能体适配器
   */
  getMultiAgentAdapter(): MultiAgentAdapter | undefined {
    return this.multiAgentAdapter;
  }

  /**
   * 检查 OpenClaw 兼容性是否启用
   */
  isOpenClawEnabled(): boolean {
    return !!this.openclawAdapter;
  }

  /**
   * 检查多智能体兼容性是否启用
   */
  isMultiAgentEnabled(): boolean {
    return !!this.multiAgentAdapter;
  }

  /**
   * 获取启用的兼容模式列表
   */
  getEnabledModes(): string[] {
    const modes: string[] = [];
    if (this.openclawAdapter) modes.push('openclaw');
    if (this.multiAgentAdapter) {
      modes.push(...this.multiAgentAdapter.getEnabledAdapters());
    }
    return modes;
  }

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
 * 创建统一兼容性层
 */
export function createCompatibilityLayer(
  config: UnifiedCompatibilityLayerConfig
): UnifiedCompatibilityLayer {
  return new UnifiedCompatibilityLayer(config);
}
