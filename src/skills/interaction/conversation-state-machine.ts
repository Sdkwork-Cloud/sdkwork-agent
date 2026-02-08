/**
 * Skill Conversation State Machine
 *
 * 技能对话状态机 - 管理多轮对话状态
 *
 * 核心特性：
 * 1. 完整的状态流转管理
 * 2. 上下文保持和恢复
 * 3. 参数收集和确认流程
 * 4. 错误恢复和重试机制
 * 5. 状态持久化支持
 *
 * @module SkillConversationStateMachine
 * @version 2.0.0
 * @standard Industry Leading
 */

import type { Logger } from '../../utils/logger.js';
import { Skill, SkillResult } from '../core/types.js';

// ============================================================================
// Types
// ============================================================================

/**
 * 对话状态
 */
export type ConversationState =
  | 'IDLE'                    // 空闲状态，等待用户输入
  | 'INTENT_RECOGNITION'      // 意图识别中
  | 'SKILL_SELECTION'         // 技能选择中
  | 'GATHERING_PARAMS'        // 收集参数中
  | 'CONFIRMING'              // 等待用户确认
  | 'EXECUTING'               // 执行技能中
  | 'PRESENTING_RESULT'       // 展示结果
  | 'ERROR_RECOVERY'          // 错误恢复
  | 'CLARIFYING'              // 需要澄清
  | 'FOLLOW_UP';              // 处理后续请求

/**
 * 状态转换事件
 */
export interface StateTransitionEvent {
  from: ConversationState;
  to: ConversationState;
  trigger: string;
  data?: Record<string, unknown>;
  timestamp: Date;
}

/**
 * 对话上下文
 */
export interface ConversationContext {
  /** 会话ID */
  sessionId: string;
  /** 当前任务ID */
  currentTaskId?: string;
  /** 当前选中的技能 */
  selectedSkill?: Skill;
  /** 已收集的参数 */
  collectedParams: Record<string, unknown>;
  /** 待收集的参数 */
  pendingParams: string[];
  /** 参数定义 */
  paramDefinitions?: Array<{
    name: string;
    description: string;
    type: string;
    required?: boolean;
    default?: unknown;
  }>;
  /** 执行结果 */
  executionResult?: SkillResult;
  /** 最后错误 */
  lastError?: Error;
  /** 执行ID */
  executionId?: string;
  /** 当前步骤 */
  currentStep?: string;
  /** 历史记录 */
  history: Array<{
    role: 'user' | 'assistant' | 'skill' | 'system';
    content: string;
    state: ConversationState;
    timestamp: Date;
    metadata?: Record<string, unknown>;
  }>;
  /** 用户偏好 */
  userPreferences: Record<string, unknown>;
  /** 重试次数 */
  retryCount: number;
  /** 最大重试次数 */
  maxRetries: number;
  /** 创建时间 */
  createdAt: Date;
  /** 最后更新时间 */
  lastUpdated: Date;
}

/**
 * 状态处理器
 */
export interface StateHandler {
  onEnter?: (context: ConversationContext, data?: unknown) => Promise<void>;
  onExit?: (context: ConversationContext, nextState: ConversationState) => Promise<void>;
  processInput: (input: string, context: ConversationContext) => Promise<StateTransitionResult>;
}

/**
 * 状态转换结果
 */
export interface StateTransitionResult {
  success: boolean;
  newState?: ConversationState;
  response?: string;
  data?: Record<string, unknown>;
  error?: string;
}

/**
 * 状态机配置
 */
export interface StateMachineConfig {
  logger?: Logger;
  maxHistoryLength?: number;
  enablePersistence?: boolean;
  defaultMaxRetries?: number;
}

// ============================================================================
// State Transition Rules
// ============================================================================

const VALID_TRANSITIONS: Record<ConversationState, ConversationState[]> = {
  IDLE: ['INTENT_RECOGNITION'],
  INTENT_RECOGNITION: ['SKILL_SELECTION', 'CLARIFYING', 'IDLE'],
  SKILL_SELECTION: ['GATHERING_PARAMS', 'EXECUTING', 'CLARIFYING', 'IDLE'],
  GATHERING_PARAMS: ['GATHERING_PARAMS', 'CONFIRMING', 'CLARIFYING', 'IDLE'],
  CONFIRMING: ['EXECUTING', 'GATHERING_PARAMS', 'IDLE'],
  EXECUTING: ['PRESENTING_RESULT', 'ERROR_RECOVERY'],
  PRESENTING_RESULT: ['FOLLOW_UP', 'IDLE'],
  ERROR_RECOVERY: ['EXECUTING', 'CLARIFYING', 'FOLLOW_UP', 'IDLE'],
  CLARIFYING: ['INTENT_RECOGNITION', 'GATHERING_PARAMS', 'IDLE'],
  FOLLOW_UP: ['INTENT_RECOGNITION', 'IDLE'],
};

// ============================================================================
// Conversation State Machine
// ============================================================================

export class SkillConversationStateMachine {
  private config: Required<StateMachineConfig>;
  private logger: Logger;
  private currentState: ConversationState = 'IDLE';
  private context: ConversationContext;
  private stateHandlers: Map<ConversationState, StateHandler>;
  private transitionListeners: Array<(event: StateTransitionEvent) => void> = [];

  constructor(sessionId: string, config: StateMachineConfig = {}) {
    this.config = {
      maxHistoryLength: 100,
      enablePersistence: false,
      defaultMaxRetries: 3,
      logger: {
        debug: () => {},
        info: () => {},
        warn: console.warn,
        error: console.error,
      },
      ...config,
    };
    this.logger = this.config.logger;

    // 初始化上下文
    this.context = {
      sessionId,
      collectedParams: {},
      pendingParams: [],
      history: [],
      userPreferences: {},
      retryCount: 0,
      maxRetries: this.config.defaultMaxRetries,
      createdAt: new Date(),
      lastUpdated: new Date(),
    };

    // 初始化状态处理器
    this.stateHandlers = this.initializeStateHandlers();
  }

  /**
   * 获取当前状态
   */
  getCurrentState(): ConversationState {
    return this.currentState;
  }

  /**
   * 获取对话上下文
   */
  getContext(): Readonly<ConversationContext> {
    return { ...this.context };
  }

  /**
   * 设置选中的技能
   */
  setSelectedSkill(skill: Skill): void {
    this.context.selectedSkill = skill;
    this.context.paramDefinitions = skill.parameters?.map(p => ({
      name: p.name,
      description: p.description || '',
      type: p.type || 'string',
      required: p.required,
      default: p.default,
    }));
    this.context.pendingParams = skill.parameters
      ?.filter(p => p.required)
      .map(p => p.name) || [];
    this.context.lastUpdated = new Date();
  }

  /**
   * 更新收集的参数
   */
  updateCollectedParams(params: Record<string, unknown>): void {
    this.context.collectedParams = { ...this.context.collectedParams, ...params };
    // 更新待收集参数列表
    this.context.pendingParams = this.context.pendingParams.filter(
      p => !(p in this.context.collectedParams)
    );
    this.context.lastUpdated = new Date();
  }

  /**
   * 设置执行结果
   */
  setExecutionResult(result: SkillResult): void {
    this.context.executionResult = result;
    this.context.lastUpdated = new Date();
  }

  /**
   * 设置最后错误
   */
  setLastError(error: Error): void {
    this.context.lastError = error;
    this.context.lastUpdated = new Date();
  }

  /**
   * 处理用户输入
   *
   * 主入口方法，根据当前状态路由到相应的处理器
   */
  async processUserInput(input: string): Promise<StateTransitionResult> {
    this.logger.debug(`Processing input in state: ${this.currentState}`, { inputLength: input.length });

    // 记录用户输入
    this.addToHistory('user', input, this.currentState);

    // 获取当前状态处理器
    const handler = this.stateHandlers.get(this.currentState);
    if (!handler) {
      return {
        success: false,
        error: `No handler for state: ${this.currentState}`,
      };
    }

    // 处理输入
    const result = await handler.processInput(input, this.context);

    // 如果需要状态转换
    if (result.success && result.newState && result.newState !== this.currentState) {
      const canTransition = VALID_TRANSITIONS[this.currentState]?.includes(result.newState);
      if (canTransition) {
        await this.transitionTo(result.newState, result.data);
      } else {
        this.logger.warn(`Invalid state transition: ${this.currentState} -> ${result.newState}`);
        result.error = `Cannot transition from ${this.currentState} to ${result.newState}`;
        result.success = false;
      }
    }

    // 记录助手响应
    if (result.response) {
      this.addToHistory('assistant', result.response, result.newState || this.currentState, result.data);
    }

    return result;
  }

  /**
   * 强制状态转换
   */
  async transitionTo(newState: ConversationState, data?: unknown): Promise<void> {
    const oldState = this.currentState;
    const handler = this.stateHandlers.get(oldState);
    const newHandler = this.stateHandlers.get(newState);

    // 验证转换是否有效
    if (!VALID_TRANSITIONS[oldState]?.includes(newState)) {
      this.logger.warn(`Attempting invalid transition: ${oldState} -> ${newState}`);
    }

    this.logger.debug(`Transitioning from ${oldState} to ${newState}`);

    // 执行退出钩子
    if (handler?.onExit) {
      try {
        await handler.onExit(this.context, newState);
      } catch (error) {
        this.logger.error('Error in onExit handler', { error });
      }
    }

    // 更新状态
    this.currentState = newState;
    this.context.lastUpdated = new Date();

    // 执行进入钩子
    if (newHandler?.onEnter) {
      try {
        await newHandler.onEnter(this.context, data);
      } catch (error) {
        this.logger.error('Error in onEnter handler', { error });
      }
    }

    // 触发转换事件
    const event: StateTransitionEvent = {
      from: oldState,
      to: newState,
      trigger: 'manual',
      data: data as Record<string, unknown> | undefined,
      timestamp: new Date(),
    };
    this.notifyTransitionListeners(event);
  }

  /**
   * 添加状态转换监听器
   */
  onTransition(listener: (event: StateTransitionEvent) => void): () => void {
    this.transitionListeners.push(listener);
    return () => {
      const index = this.transitionListeners.indexOf(listener);
      if (index > -1) {
        this.transitionListeners.splice(index, 1);
      }
    };
  }

  /**
   * 更新上下文
   */
  updateContext(updates: Partial<ConversationContext>): void {
    Object.assign(this.context, updates);
    this.context.lastUpdated = new Date();
  }

  /**
   * 获取最近的历史记录
   */
  getRecentHistory(count: number = 5): ConversationContext['history'] {
    return this.context.history.slice(-count);
  }

  /**
   * 重置状态机
   */
  async reset(): Promise<void> {
    this.currentState = 'IDLE';
    this.context = {
      sessionId: this.context.sessionId,
      collectedParams: {},
      pendingParams: [],
      history: [],
      userPreferences: this.context.userPreferences, // 保留用户偏好
      retryCount: 0,
      maxRetries: this.config.defaultMaxRetries,
      createdAt: new Date(),
      lastUpdated: new Date(),
    };
    this.logger.debug('State machine reset');
  }

  /**
   * 序列化状态
   */
  serialize(): string {
    return JSON.stringify({
      currentState: this.currentState,
      context: {
        ...this.context,
        history: this.context.history.slice(-20), // 只保留最近20条
      },
    });
  }

  /**
   * 反序列化状态
   */
  deserialize(serialized: string): void {
    const data = JSON.parse(serialized);
    this.currentState = data.currentState;
    this.context = {
      ...data.context,
      lastUpdated: new Date(),
    };
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  /**
   * 初始化状态处理器
   */
  private initializeStateHandlers(): Map<ConversationState, StateHandler> {
    const handlers = new Map<ConversationState, StateHandler>();

    // IDLE 状态
    handlers.set('IDLE', {
      onEnter: async () => {
        this.logger.debug('Entered IDLE state');
      },
      processInput: async (input, context) => {
        // 检查是否为后续请求
        if (this.isFollowUpRequest(input, context)) {
          return {
            success: true,
            newState: 'FOLLOW_UP',
            response: 'Processing your follow-up request...',
          };
        }

        // 开始意图识别
        return {
          success: true,
          newState: 'INTENT_RECOGNITION',
          data: { userInput: input },
        };
      },
    });

    // INTENT_RECOGNITION 状态
    handlers.set('INTENT_RECOGNITION', {
      onEnter: async (context, data) => {
        this.logger.debug('Recognizing intent', data);
      },
      processInput: async (_input, context) => {
        // 意图识别完成后，进入技能选择
        return {
          success: true,
          newState: 'SKILL_SELECTION',
          response: 'I understand your request. Let me find the best skill for this task.',
        };
      },
    });

    // SKILL_SELECTION 状态
    handlers.set('SKILL_SELECTION', {
      onEnter: async (context, data) => {
        this.logger.debug('Selecting skill', data);
      },
      processInput: async (input, context) => {
        // 如果用户明确选择了技能
        if (input.toLowerCase().includes('use ') || input.toLowerCase().includes('select ')) {
          const skillName = this.extractSkillName(input);
          if (skillName) {
            return {
              success: true,
              newState: 'GATHERING_PARAMS',
              data: { selectedSkill: skillName },
              response: `I'll use the ${skillName} skill. Now I need to collect some parameters.`,
            };
          }
        }

        // 自动选择技能后，检查是否需要参数
        if (context.pendingParams.length === 0 && Object.keys(context.collectedParams).length > 0) {
          return {
            success: true,
            newState: 'CONFIRMING',
            response: 'I have all the information needed. Shall I proceed?',
          };
        }

        return {
          success: true,
          newState: 'GATHERING_PARAMS',
          response: `I'll help you with that. I need some information: ${context.pendingParams[0] || 'Please provide the required parameters'}?`,
        };
      },
    });

    // GATHERING_PARAMS 状态
    handlers.set('GATHERING_PARAMS', {
      onEnter: async (context, data) => {
        this.logger.debug('Gathering parameters', { pending: context.pendingParams });
      },
      processInput: async (input, context) => {
        // 解析参数
        const paramUpdate = await this.parseParamInput(input, context);

        if (paramUpdate.success) {
          // 更新收集的参数
          Object.assign(context.collectedParams, paramUpdate.params);

          // 更新待收集参数列表
          context.pendingParams = context.pendingParams.filter(
            p => !(p in paramUpdate.params)
          );

          // 检查是否还有缺失的参数
          if (context.pendingParams.length > 0) {
            return {
              success: true,
              newState: 'GATHERING_PARAMS',
              response: `Got it. Next, I need: ${context.pendingParams[0]}?`,
            };
          }

          // 所有参数收集完成
          return {
            success: true,
            newState: 'CONFIRMING',
            response: `I have all the information:
${JSON.stringify(context.collectedParams, null, 2)}

Is this correct? (yes/no/modify)`,
          };
        }

        // 参数解析失败，需要澄清
        return {
          success: true,
          newState: 'CLARIFYING',
          data: { clarificationFor: context.pendingParams[0] },
          response: `I'm not sure I understood. ${paramUpdate.error}. Could you please clarify?`,
        };
      },
    });

    // CLARIFYING 状态
    handlers.set('CLARIFYING', {
      onEnter: async (context, data) => {
        this.logger.debug('Clarifying', data);
      },
      processInput: async (input, context) => {
        // 重新尝试解析参数
        const paramUpdate = await this.parseParamInput(input, context);

        if (paramUpdate.success) {
          Object.assign(context.collectedParams, paramUpdate.params);
          context.pendingParams = context.pendingParams.filter(
            p => !(p in paramUpdate.params)
          );

          if (context.pendingParams.length > 0) {
            return {
              success: true,
              newState: 'GATHERING_PARAMS',
              response: `Thank you. Next: ${context.pendingParams[0]}?`,
            };
          }

          return {
            success: true,
            newState: 'CONFIRMING',
            response: 'All set! Shall I proceed?',
          };
        }

        // 仍然无法理解，询问是否换种方式
        return {
          success: true,
          newState: 'CLARIFYING',
          response: 'I\'m still having trouble understanding. Could you rephrase or provide an example?',
        };
      },
    });

    // CONFIRMING 状态
    handlers.set('CONFIRMING', {
      onEnter: async (context) => {
        this.logger.debug('Waiting for confirmation', { params: context.collectedParams });
      },
      processInput: async (input, context) => {
        const normalized = input.toLowerCase().trim();

        if (normalized === 'yes' || normalized === 'y' || normalized === 'correct' || normalized === 'ok' || normalized === '是' || normalized === '确认') {
          return {
            success: true,
            newState: 'EXECUTING',
            response: 'Executing now...',
          };
        }

        if (normalized === 'no' || normalized === 'n' || normalized === 'cancel' || normalized === '否' || normalized === '取消') {
          await this.reset();
          return {
            success: true,
            newState: 'IDLE',
            response: 'Cancelled. How else can I help you?',
          };
        }

        if (normalized.includes('modify') || normalized.includes('change') || normalized.includes('edit') || normalized.includes('修改')) {
          return {
            success: true,
            newState: 'GATHERING_PARAMS',
            response: 'Which parameter would you like to modify?',
          };
        }

        // 不确定的响应，再次确认
        return {
          success: true,
          newState: 'CONFIRMING',
          response: 'Please confirm: yes (to proceed), no (to cancel), or specify what to modify.',
        };
      },
    });

    // EXECUTING 状态
    handlers.set('EXECUTING', {
      onEnter: async (context) => {
        this.logger.debug('Executing skill', { skill: context.selectedSkill?.name });
      },
      processInput: async (_input, context) => {
        // 正常情况下，执行完成后自动转换状态
        // 这里由外部调用 transitionTo 来更新状态
        return {
          success: true,
          newState: 'PRESENTING_RESULT',
          response: 'Execution completed.',
        };
      },
    });

    // PRESENTING_RESULT 状态
    handlers.set('PRESENTING_RESULT', {
      onEnter: async (context) => {
        this.logger.debug('Presenting result', { success: context.executionResult?.success });
      },
      processInput: async (input, context) => {
        const normalized = input.toLowerCase().trim();

        // 检查是否为后续请求
        if (this.isFollowUpRequest(input, context)) {
          return {
            success: true,
            newState: 'FOLLOW_UP',
            data: { followUpInput: input },
          };
        }

        // 用户想开始新任务
        await this.reset();
        return {
          success: true,
          newState: 'INTENT_RECOGNITION',
          data: { userInput: input },
        };
      },
    });

    // ERROR_RECOVERY 状态
    handlers.set('ERROR_RECOVERY', {
      onEnter: async (context) => {
        this.logger.debug('Error recovery', { retryCount: context.retryCount });
        context.retryCount++;
      },
      processInput: async (input, context) => {
        if (context.retryCount >= context.maxRetries) {
          await this.reset();
          return {
            success: true,
            newState: 'IDLE',
            response: 'I\'m having trouble with this request. Let\'s start fresh. How can I help?',
          };
        }

        // 尝试恢复
        return {
          success: true,
          newState: 'GATHERING_PARAMS',
          response: 'Let\'s try again. ' + (context.pendingParams[0] || 'Please provide the required information.'),
        };
      },
    });

    // FOLLOW_UP 状态
    handlers.set('FOLLOW_UP', {
      onEnter: async (context, data) => {
        this.logger.debug('Processing follow-up', data);
      },
      processInput: async (input, context) => {
        // 基于之前的执行结果处理后续请求
        const followUpResult = await this.processFollowUp(input, context);

        if (followUpResult.requiresNewSkill) {
          return {
            success: true,
            newState: 'SKILL_SELECTION',
            data: { userInput: input },
          };
        }

        return {
          success: true,
          newState: 'PRESENTING_RESULT',
          response: followUpResult.response,
        };
      },
    });

    return handlers;
  }

  /**
   * 添加到历史记录
   */
  private addToHistory(
    role: ConversationContext['history'][0]['role'],
    content: string,
    state: ConversationState,
    metadata?: Record<string, unknown>
  ): void {
    this.context.history.push({
      role,
      content,
      state,
      timestamp: new Date(),
      metadata,
    });

    // 限制历史长度
    if (this.context.history.length > this.config.maxHistoryLength) {
      this.context.history = this.context.history.slice(-this.config.maxHistoryLength);
    }
  }

  /**
   * 通知转换监听器
   */
  private notifyTransitionListeners(event: StateTransitionEvent): void {
    for (const listener of this.transitionListeners) {
      try {
        listener(event);
      } catch (error) {
        this.logger.error('Transition listener error', { error });
      }
    }
  }

  /**
   * 检查是否为后续请求
   */
  private isFollowUpRequest(input: string, context: ConversationContext): boolean {
    const followUpPatterns = [
      /^(?:and|also|plus|additionally)\s/i,
      /^(?:what|how)\s+about/i,
      /^(?:can|could)\s+you\s+also/i,
      /^(?:now|then)\s/i,
      /^(?:next|after\s+that)/i,
    ];

    return followUpPatterns.some(p => p.test(input.trim()));
  }

  /**
   * 提取技能名称
   */
  private extractSkillName(input: string): string | null {
    const patterns = [
      /use\s+(?:the\s+)?(\w+)(?:\s+skill)?/i,
      /select\s+(?:the\s+)?(\w+)/i,
      /with\s+(?:the\s+)?(\w+)(?:\s+skill)?/i,
    ];

    for (const pattern of patterns) {
      const match = input.match(pattern);
      if (match) {
        return match[1];
      }
    }

    return null;
  }

  /**
   * 解析参数输入
   */
  private async parseParamInput(
    input: string,
    context: ConversationContext
  ): Promise<{ success: boolean; params: Record<string, unknown>; error?: string }> {
    // 简化实现：尝试解析JSON
    try {
      const parsed = JSON.parse(input);
      return { success: true, params: parsed };
    } catch {
      // 不是JSON，尝试键值对格式
      const params: Record<string, unknown> = {};
      const keyValuePattern = /(\w+)[:=]\s*([^,\n]+)/g;
      let match;

      while ((match = keyValuePattern.exec(input)) !== null) {
        params[match[1]] = match[2].trim();
      }

      if (Object.keys(params).length > 0) {
        return { success: true, params };
      }

      // 单个值，分配给当前待收集的参数
      if (context.pendingParams.length > 0) {
        return {
          success: true,
          params: { [context.pendingParams[0]]: input.trim() },
        };
      }

      return { success: false, params: {}, error: 'Could not parse input' };
    }
  }

  /**
   * 处理后续请求
   */
  private async processFollowUp(
    input: string,
    context: ConversationContext
  ): Promise<{ requiresNewSkill: boolean; response: string }> {
    // 简化实现
    return {
      requiresNewSkill: false,
      response: `I processed your follow-up: "${input}"`,
    };
  }
}

// ============================================================================
// Factory Functions
// ============================================================================

export function createConversationStateMachine(
  sessionId: string,
  config?: StateMachineConfig
): SkillConversationStateMachine {
  return new SkillConversationStateMachine(sessionId, config);
}

// Export types
export type {
  ConversationState,
  ConversationContext,
  StateTransitionEvent,
  StateHandler,
  StateTransitionResult,
  StateMachineConfig,
};
