/**
 * 优化的Skill交互管理器
 * 
 * 这是整个交互优化架构的核心集成组件，整合：
 * 1. 意图识别引擎 (IntentRecognizer) - 基于大模型的语义理解
 * 2. 智能参数提取器 (IntelligentParameterExtractor)
 * 3. 对话状态机 (SkillConversationStateMachine)
 * 4. 长期记忆系统 (LongTermMemorySystem)
 * 5. 错误恢复管理器 (ErrorRecoveryManager)
 * 
 * 设计目标：
 * - 提供统一的Skill交互入口
 * - 实现多轮对话能力
 * - 支持上下文感知
 * - 具备优雅的错误恢复
 * 
 * 参考：
 * - OpenClaw的交互模式
 * - Claude Code的对话管理
 * - OpenCode的上下文传递
 */

import { EventEmitter } from 'events';
import { z } from 'zod';
import { Logger } from '../../utils/logger.js';
import { Skill, SkillResult } from '../core/types.js';
import { SkillRegistry } from '../core/registry.js';
import { SkillScheduler } from '../core/scheduler.js';

import {
  IntentRecognizer,
  IntentRecognitionResult,
  LLMService,
  DialogueContext,
  createIntentRecognizer,
} from './intent-recognizer.js';

import {
  IntelligentParameterExtractor,
  ExtractionResult,
  ExtractionContext,
} from './parameter-extractor.js';

import {
  SkillConversationStateMachine,
  ConversationContext,
  ConversationState,
  StateTransitionResult,
  createConversationStateMachine,
} from './conversation-state-machine.js';

import {
  LongTermMemorySystem,
  MemoryType,
  MemoryLayer,
  MemoryEntry,
} from './long-term-memory.js';

import {
  ErrorRecoveryManager,
  SkillError,
  RecoveryResult,
  RecoveryConfig,
} from './error-recovery.js';

const logger = new Logger('OptimizedSkillInteractionManager');

// ============================================================================
// Types
// ============================================================================

/** 交互配置 */
export interface InteractionConfig {
  // LLM配置
  llm: LLMService;

  // 参数提取配置
  enableMultiLayerExtraction: boolean;
  enableFewShotLearning: boolean;
  maxExtractionAttempts: number;

  // 对话配置
  enableMultiTurnDialog: boolean;
  maxConversationDepth: number;
  contextWindowSize: number;
  /** 最大历史记录数 */
  maxHistoryLength: number;

  // 记忆配置
  enableLongTermMemory: boolean;
  memoryImportanceThreshold: number;
  autoSummarizeThreshold: number;

  // 错误恢复配置
  recoveryConfig: Partial<RecoveryConfig>;

  // 意图识别配置
  confidenceThreshold: number;
  maxAlternatives: number;
}

/** 默认配置 */
const DEFAULT_CONFIG: Omit<InteractionConfig, 'llm'> = {
  enableMultiLayerExtraction: true,
  enableFewShotLearning: true,
  maxExtractionAttempts: 3,

  enableMultiTurnDialog: true,
  maxConversationDepth: 10,
  contextWindowSize: 10,
  maxHistoryLength: 100, // 最大保留100条历史记录

  enableLongTermMemory: true,
  memoryImportanceThreshold: 0.6,
  autoSummarizeThreshold: 5,

  recoveryConfig: {
    maxRetries: 3,
    enableAutoFix: true,
    enableLearning: true,
  },

  confidenceThreshold: 0.6,
  maxAlternatives: 3,
};

/** 用户输入 */
export interface UserInput {
  text: string;
  attachments?: Array<{
    type: 'image' | 'file' | 'code';
    content: string;
    name?: string;
  }>;
  metadata?: Record<string, any>;
}

/** 交互结果 */
export interface InteractionResult {
  success: boolean;
  skillName?: string;
  params?: Record<string, any>;
  executionResult?: SkillResult;
  response: string;
  state: ConversationState;
  requiresUserInput: boolean;
  clarificationNeeded?: boolean;
  clarificationPrompt?: string;
  suggestions?: string[];
  context: {
    conversationId: string;
    turnCount: number;
    extractedParams: Record<string, any>;
    missingParams: string[];
  };
}

/** 交互会话 */
export interface InteractionSession {
  id: string;
  userId?: string;
  startTime: Date;
  lastActivity: Date;
  turnCount: number;
  stateMachine: SkillConversationStateMachine;
  memory: LongTermMemorySystem;
  context: ConversationContext;
  history: Array<{
    role: 'user' | 'assistant' | 'system';
    content: string;
    timestamp: Date;
  }>;
}

// ============================================================================
// OptimizedSkillInteractionManager
// ============================================================================

/**
 * 优化的Skill交互管理器
 * 
 * 这是整个系统的核心集成组件，协调所有子系统工作
 */
export class OptimizedSkillInteractionManager extends EventEmitter {
  private config: InteractionConfig;
  private skillRegistry: SkillRegistry;
  private skillScheduler: SkillScheduler;
  private intentRecognizer: IntentRecognizer;
  private parameterExtractor: IntelligentParameterExtractor;
  private errorRecoveryManager: ErrorRecoveryManager;
  private sessions: Map<string, InteractionSession> = new Map();

  constructor(
    skillRegistry: SkillRegistry,
    skillScheduler: SkillScheduler,
    config: Partial<InteractionConfig> & { llm: LLMService }
  ) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...config } as InteractionConfig;
    this.skillRegistry = skillRegistry;
    this.skillScheduler = skillScheduler;
    
    // 初始化意图识别器
    this.intentRecognizer = createIntentRecognizer({
      llm: this.config.llm,
      confidenceThreshold: this.config.confidenceThreshold,
      maxAlternatives: this.config.maxAlternatives,
      enableEntityExtraction: true,
      enableContextEnhancement: true,
    });
    
    // 初始化参数提取器
    this.parameterExtractor = new IntelligentParameterExtractor({
      llm: this.config.llm,
      enableFewShot: this.config.enableFewShotLearning,
      enableContextInference: true,
      enableAutoCorrection: true,
      confidenceThreshold: 0.7,
      maxRetries: this.config.maxExtractionAttempts,
    });
    
    // 初始化错误恢复管理器
    this.errorRecoveryManager = new ErrorRecoveryManager(
      this.config.recoveryConfig
    );

    // 设置事件监听
    this.setupEventListeners();

    logger.info('OptimizedSkillInteractionManager initialized');
  }

  /**
   * 设置事件监听
   */
  private setupEventListeners(): void {
    // 监听错误恢复事件
    this.errorRecoveryManager.on('recovered', ({ error, strategy }) => {
      logger.info(`Error recovered using strategy: ${strategy}`, {
        errorCategory: error.category,
      });
      this.emit('errorRecovered', { error, strategy });
    });

    this.errorRecoveryManager.on('escalated', (error) => {
      logger.error(`Error escalated: ${error.message}`);
      this.emit('errorEscalated', error);
    });

    // 监听意图识别事件
    this.intentRecognizer.on('intentRecognized', (result) => {
      this.emit('intentRecognized', result);
    });
  }

  /**
   * 创建新会话
   */
  createSession(userId?: string): InteractionSession {
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const memory = new LongTermMemorySystem({
      llm: this.config.llm,
      enableAutoSummarize: true,
    });
    const stateMachine = createConversationStateMachine(sessionId, {
      maxHistoryLength: this.config.contextWindowSize,
    });
    
    const session: InteractionSession = {
      id: sessionId,
      userId,
      startTime: new Date(),
      lastActivity: new Date(),
      turnCount: 0,
      stateMachine,
      memory,
      context: stateMachine.getContext(),
      history: [],
    };

    this.sessions.set(sessionId, session);

    logger.info(`Created new session: ${sessionId}`);
    this.emit('sessionCreated', session);

    // 注册实例到静态集合
    OptimizedSkillInteractionManager.instances.add(this);

    // 启动自动清理定时器（如果尚未启动）
    this.startCleanupTimer();

    return session;
  }

  private cleanupTimer?: NodeJS.Timeout;

  /**
   * 启动自动清理定时器
   */
  private startCleanupTimer(): void {
    if (this.cleanupTimer) return; // 已经启动

    // 每5分钟清理一次过期会话
    this.cleanupTimer = setInterval(() => {
      this.cleanupExpiredSessions(30).catch(err => {
        logger.error('Failed to cleanup expired sessions', { error: err });
      });
    }, 5 * 60 * 1000);

    // 只注册一次进程退出监听器
    if (!OptimizedSkillInteractionManager.processListenersRegistered) {
      OptimizedSkillInteractionManager.processListenersRegistered = true;

      const cleanup = () => {
        this.stopCleanupTimer();
        // 清理所有管理器实例的定时器
        OptimizedSkillInteractionManager.instances.forEach(instance => {
          instance.stopCleanupTimer();
        });
      };

      process.once('beforeExit', cleanup);
      process.once('SIGINT', cleanup);
      process.once('SIGTERM', cleanup);
    }
  }

  private static processListenersRegistered = false;
  private static instances: Set<OptimizedSkillInteractionManager> = new Set();

  /**
   * 停止自动清理定时器
   */
  private stopCleanupTimer(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = undefined;
    }
  }

  /**
   * 获取会话
   */
  getSession(sessionId: string): InteractionSession | undefined {
    return this.sessions.get(sessionId);
  }

  /**
   * 处理用户输入（主入口）
   */
  async processInput(
    sessionId: string | UserInput,
    input?: UserInput
  ): Promise<InteractionResult> {
    // 输入验证
    if (typeof sessionId === 'object') {
      if (!sessionId.text?.trim()) {
        throw new Error('User input text is required');
      }
      const session = this.createSession();
      return this.processInputWithSession(session, sessionId);
    }

    if (!sessionId || typeof sessionId !== 'string') {
      throw new Error('Session ID must be a non-empty string');
    }

    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    if (!input || !input.text?.trim()) {
      throw new Error('Input with non-empty text is required when sessionId is provided');
    }

    // 检查会话是否正在被处理（简单的并发控制）
    if ((session as any)._processing) {
      throw new Error('Session is already processing a request. Please wait.');
    }

    try {
      (session as any)._processing = true;
      return await this.processInputWithSession(session, input);
    } finally {
      (session as any)._processing = false;
    }
  }

  /**
   * 使用会话处理输入
   */
  private async processInputWithSession(
    session: InteractionSession,
    input: UserInput
  ): Promise<InteractionResult> {
    // 更新会话状态
    session.lastActivity = new Date();
    session.turnCount++;
    
    // 记录用户输入到历史
    session.history.push({
      role: 'user',
      content: input.text,
      timestamp: new Date(),
    });

    // 限制历史记录大小
    if (session.history.length > this.config.maxHistoryLength) {
      session.history = session.history.slice(-this.config.maxHistoryLength);
    }

    // 存储到长期记忆
    if (this.config.enableLongTermMemory) {
      await session.memory.store(
        input.text,
        'conversation',
        'short_term',
        { role: 'user', turn: session.turnCount },
        0.5
      );
    }

    try {
      // 使用状态机处理输入
      const stateResult = await session.stateMachine.processUserInput(input.text);

      // 根据当前状态执行相应逻辑
      const result = await this.handleState(session, stateResult, input);

      // 记录助手回复到历史
      session.history.push({
        role: 'assistant',
        content: result.response,
        timestamp: new Date(),
      });

      // 限制历史记录大小
      if (session.history.length > this.config.maxHistoryLength) {
        session.history = session.history.slice(-this.config.maxHistoryLength);
      }

      return result;
    } catch (error) {
      return this.handleError(session, error as Error, input);
    }
  }

  /**
   * 处理不同状态下的逻辑
   */
  private async handleState(
    session: InteractionSession,
    stateResult: StateTransitionResult,
    input: UserInput
  ): Promise<InteractionResult> {
    const state = session.stateMachine.getCurrentState();
    const context = session.stateMachine.getContext();

    switch (state) {
      case 'IDLE':
        return this.handleIdleState(session, input);

      case 'INTENT_RECOGNITION':
        return this.handleIntentRecognition(session, input);

      case 'SKILL_SELECTION':
        return this.handleSkillSelection(session, context);

      case 'GATHERING_PARAMS':
        return this.handleGatheringParams(session, input, context);

      case 'CONFIRMING':
        return this.handleConfirming(session, input, context);

      case 'EXECUTING':
        return this.handleExecuting(session, context);

      case 'PRESENTING_RESULT':
        return this.handlePresentingResult(session, context);

      case 'ERROR_RECOVERY':
        return this.handleErrorRecovery(session, context);

      case 'CLARIFYING':
        return this.handleClarifying(session, input, context);

      case 'FOLLOW_UP':
        return this.handleFollowUp(session, input, context);

      default:
        return this.createErrorResult(session, 'Unknown state');
    }
  }

  /**
   * 处理空闲状态
   */
  private async handleIdleState(
    session: InteractionSession,
    input: UserInput
  ): Promise<InteractionResult> {
    // 自动转换到意图识别状态
    await session.stateMachine.transitionTo('INTENT_RECOGNITION');
    return this.handleIntentRecognition(session, input);
  }

  /**
   * 处理意图识别 - 使用大模型进行语义理解
   */
  private async handleIntentRecognition(
    session: InteractionSession,
    input: UserInput
  ): Promise<InteractionResult> {
    // 获取所有可用skills
    const availableSkills = this.skillRegistry.getAllSkills();

    // 构建对话上下文
    const dialogueContext: DialogueContext = {
      history: session.history.slice(-5).map(h => ({
        role: h.role as 'user' | 'assistant',
        content: h.content,
        timestamp: h.timestamp,
      })),
      lastSkill: session.stateMachine.getContext().selectedSkill?.name,
    };

    // 使用意图识别引擎
    const recognitionResult = await this.intentRecognizer.recognizeIntent(
      input.text,
      availableSkills,
      dialogueContext
    );

    if (recognitionResult.needsClarification) {
      // 意图不明确，请求澄清
      await session.stateMachine.transitionTo('CLARIFYING');
      return {
        success: false,
        response: recognitionResult.clarificationPrompt || 'I\'m not sure what you want to do.',
        state: 'CLARIFYING',
        requiresUserInput: true,
        clarificationNeeded: true,
        clarificationPrompt: recognitionResult.clarificationPrompt,
        suggestions: recognitionResult.alternativeIntents.map(i => i.skill.name),
        context: {
          conversationId: session.id,
          turnCount: session.turnCount,
          extractedParams: {},
          missingParams: [],
        },
      };
    }

    // 设置选中的skill
    session.stateMachine.setSelectedSkill(recognitionResult.primaryIntent.skill);
    
    // 如果有预提取的实体，更新参数
    if (Object.keys(recognitionResult.entities).length > 0) {
      session.stateMachine.updateCollectedParams(recognitionResult.entities);
    }

    await session.stateMachine.transitionTo('SKILL_SELECTION');

    return this.handleSkillSelection(session, session.stateMachine.getContext());
  }

  /**
   * 处理Skill选择
   */
  private async handleSkillSelection(
    session: InteractionSession,
    context: ConversationContext
  ): Promise<InteractionResult> {
    const skill = context.selectedSkill;
    
    if (!skill) {
      return this.createErrorResult(session, 'No skill selected');
    }

    // 检查是否需要参数
    if (!skill.parameters || skill.parameters.length === 0) {
      // 无参数skill，直接执行
      await session.stateMachine.transitionTo('EXECUTING');
      return this.handleExecuting(session, context);
    }

    // 需要收集参数
    await session.stateMachine.transitionTo('GATHERING_PARAMS');
    
    return {
      success: true,
      skillName: skill.name,
      response: `I'll help you with "${skill.name}". ${skill.description ? `(${skill.description})` : ''}`,
      state: 'GATHERING_PARAMS',
      requiresUserInput: true,
      context: {
        conversationId: session.id,
        turnCount: session.turnCount,
        extractedParams: context.collectedParams,
        missingParams: context.pendingParams,
      },
    };
  }

  /**
   * 处理参数收集
   */
  private async handleGatheringParams(
    session: InteractionSession,
    input: UserInput,
    context: ConversationContext
  ): Promise<InteractionResult> {
    const skill = context.selectedSkill;
    
    if (!skill || !skill.parameters) {
      return this.createErrorResult(session, 'Invalid skill or parameters');
    }

    // 构建提取上下文
    const extractionContext: ExtractionContext = {
      conversationHistory: session.history.slice(-this.config.contextWindowSize),
      availableResources: [],
      userPreferences: context.userPreferences,
      currentParams: context.collectedParams,
      skillContext: {
        name: skill.name,
        description: skill.description,
        currentStep: context.currentStep,
      },
    };

    // 使用智能参数提取器
    const extractionResult = await this.parameterExtractor.extract(
      input.text,
      this.buildParamsSchema(skill.parameters),
      skill.parameters,
      extractionContext
    );

    // 合并提取的参数
    const mergedParams = { ...context.collectedParams, ...extractionResult.params };
    session.stateMachine.updateCollectedParams(mergedParams);

    // 检查是否所有必需参数都已收集
    const missingParams = this.getMissingRequiredParams(skill.parameters, mergedParams);

    if (missingParams.length === 0) {
      // 所有参数已收集，进入确认状态
      await session.stateMachine.transitionTo('CONFIRMING');
      return this.handleConfirming(session, input, session.stateMachine.getContext());
    }

    // 继续收集参数
    const nextParam = missingParams[0];
    const paramDef = skill.parameters.find(p => p.name === nextParam);

    return {
      success: true,
      skillName: skill.name,
      response: extractionResult.clarificationNeeded 
        ? extractionResult.clarificationPrompt!
        : this.generateParamPrompt(paramDef!, missingParams),
      state: 'GATHERING_PARAMS',
      requiresUserInput: true,
      context: {
        conversationId: session.id,
        turnCount: session.turnCount,
        extractedParams: mergedParams,
        missingParams,
      },
    };
  }

  /**
   * 生成参数提示
   */
  private generateParamPrompt(param: SkillParameter, missingParams: string[]): string {
    let prompt = `Please provide ${param.name}`;
    
    if (param.description) {
      prompt += ` (${param.description})`;
    }

    if (param.type) {
      prompt += ` [type: ${param.type}]`;
    }

    if (missingParams.length > 1) {
      prompt += `\n(Still need: ${missingParams.slice(1).join(', ')})`;
    }

    return prompt;
  }

  /**
   * 获取缺失的必需参数
   */
  private getMissingRequiredParams(
    params: SkillParameter[],
    collected: Record<string, any>
  ): string[] {
    return params
      .filter(p => p.required && !(p.name in collected))
      .map(p => p.name);
  }

  /**
   * 构建参数验证Schema
   * 
   * 支持更复杂的类型定义，包括嵌套对象和数组
   */
  private buildParamsSchema(params: SkillParameter[]): z.ZodSchema {
    const schemaObj: Record<string, z.ZodType<any>> = {};

    for (const param of params) {
      const validator = this.buildParamValidator(param);
      schemaObj[param.name] = validator;
    }

    return z.object(schemaObj);
  }

  /**
   * 构建单个参数的验证器
   */
  private buildParamValidator(param: SkillParameter): z.ZodType<any> {
    let validator: z.ZodType<any>;

    // 根据类型选择验证器
    switch (param.type) {
      case 'string':
        validator = z.string();
        // 如果提供了枚举值，使用枚举验证
        if (param.enum && param.enum.length > 0) {
          validator = z.enum(param.enum as [string, ...string[]]);
        }
        break;
      
      case 'number':
        validator = z.number();
        // 支持范围限制
        if (param.minimum !== undefined) {
          validator = (validator as z.ZodNumber).min(param.minimum);
        }
        if (param.maximum !== undefined) {
          validator = (validator as z.ZodNumber).max(param.maximum);
        }
        break;
      
      case 'boolean':
        validator = z.boolean();
        break;
      
      case 'array':
        // 支持数组项类型定义
        if (param.items) {
          const itemValidator = this.buildParamValidator({
            ...param.items,
            name: `${param.name}_item`,
          });
          validator = z.array(itemValidator);
        } else {
          validator = z.array(z.any());
        }
        break;
      
      case 'object':
        // 支持嵌套对象定义
        if (param.properties) {
          const nestedSchema: Record<string, z.ZodType<any>> = {};
          for (const [key, prop] of Object.entries(param.properties)) {
            nestedSchema[key] = this.buildParamValidator(prop as SkillParameter);
          }
          validator = z.object(nestedSchema);
        } else {
          validator = z.record(z.any());
        }
        break;
      
      case 'integer':
        validator = z.number().int();
        if (param.minimum !== undefined) {
          validator = (validator as z.ZodNumber).min(param.minimum);
        }
        if (param.maximum !== undefined) {
          validator = (validator as z.ZodNumber).max(param.maximum);
        }
        break;
      
      case 'file':
        validator = z.union([z.string(), z.instanceof(Buffer), z.instanceof(Uint8Array)]);
        break;
      
      case 'url':
        validator = z.string().url();
        break;
      
      case 'email':
        validator = z.string().email();
        break;
      
      case 'date':
        validator = z.union([z.string().datetime(), z.date()]);
        break;
      
      default:
        validator = z.any();
    }

    // 处理可选参数
    if (!param.required) {
      validator = validator.optional();
      // 如果有默认值，使用 default
      if (param.default !== undefined) {
        validator = validator.default(param.default);
      }
    }

    // 添加自定义验证消息
    if (param.description) {
      validator = validator.describe(param.description);
    }

    return validator;
  }

  /**
   * 处理确认状态
   */
  private async handleConfirming(
    session: InteractionSession,
    input: UserInput,
    context: ConversationContext
  ): Promise<InteractionResult> {
    const skill = context.selectedSkill;
    const params = context.collectedParams;

    // 检查用户是否确认
    const confirmation = this.parseConfirmation(input.text);

    if (confirmation === 'confirmed') {
      await session.stateMachine.transitionTo('EXECUTING');
      return this.handleExecuting(session, session.stateMachine.getContext());
    } else if (confirmation === 'cancelled') {
      await session.stateMachine.reset();
      return {
        success: false,
        response: 'Operation cancelled.',
        state: 'IDLE',
        requiresUserInput: true,
        context: {
          conversationId: session.id,
          turnCount: session.turnCount,
          extractedParams: {},
          missingParams: [],
        },
      };
    } else if (confirmation === 'modify') {
      // 用户想要修改参数
      await session.stateMachine.transitionTo('GATHERING_PARAMS');
      return {
        success: true,
        response: 'Which parameter would you like to modify?',
        state: 'GATHERING_PARAMS',
        requiresUserInput: true,
        context: {
          conversationId: session.id,
          turnCount: session.turnCount,
          extractedParams: params,
          missingParams: [],
        },
      };
    }

    // 显示确认信息
    const paramSummary = Object.entries(params)
      .map(([key, value]) => `  - ${key}: ${JSON.stringify(value)}`)
      .join('\n');

    return {
      success: true,
      skillName: skill?.name,
      response: `Please confirm:\n\nSkill: ${skill?.name}\nParameters:\n${paramSummary}\n\nProceed? (yes/no/modify)`,
      state: 'CONFIRMING',
      requiresUserInput: true,
      context: {
        conversationId: session.id,
        turnCount: session.turnCount,
        extractedParams: params,
        missingParams: [],
      },
    };
  }

  /**
   * 解析确认输入
   */
  private parseConfirmation(input: string): 'confirmed' | 'cancelled' | 'modify' | 'unknown' {
    const lower = input.toLowerCase().trim();
    
    if (/^(yes|y|correct|ok|confirm|是|确认|确定)$/.test(lower)) {
      return 'confirmed';
    }
    
    if (/^(no|n|cancel|否|取消|算了)$/.test(lower)) {
      return 'cancelled';
    }
    
    if (/^(modify|change|edit|修改|改)$/.test(lower)) {
      return 'modify';
    }
    
    return 'unknown';
  }

  /**
   * 处理执行状态
   */
  private async handleExecuting(
    session: InteractionSession,
    context: ConversationContext
  ): Promise<InteractionResult> {
    const skill = context.selectedSkill;
    const params = context.collectedParams;

    if (!skill) {
      return this.createErrorResult(session, 'No skill to execute');
    }

    try {
      // 记录执行开始
      logger.info(`Executing skill: ${skill.name}`, { params });

      // 使用调度器执行skill
      const executionResult = await this.skillScheduler.execute(skill, params);

      // 存储执行结果到记忆
      if (this.config.enableLongTermMemory) {
        await session.memory.store(
          `Executed ${skill.name} with params: ${JSON.stringify(params)}`,
          'skill_execution',
          'medium_term',
          { skillName: skill.name, result: executionResult.success },
          executionResult.success ? 0.7 : 0.4
        );
      }

      // 更新上下文
      session.stateMachine.setExecutionResult(executionResult);
      await session.stateMachine.transitionTo('PRESENTING_RESULT');

      return this.handlePresentingResult(session, session.stateMachine.getContext());
    } catch (error) {
      // 执行失败，进入错误恢复
      session.stateMachine.setLastError(error as Error);
      await session.stateMachine.transitionTo('ERROR_RECOVERY');
      return this.handleErrorRecovery(session, session.stateMachine.getContext());
    }
  }

  /**
   * 处理结果展示
   */
  private async handlePresentingResult(
    session: InteractionSession,
    context: ConversationContext
  ): Promise<InteractionResult> {
    const skill = context.selectedSkill;
    const result = context.executionResult;

    if (!result) {
      return this.createErrorResult(session, 'No execution result');
    }

    // 格式化结果
    let response = '';
    if (result.success) {
      response = `✅ ${skill?.name} executed successfully!\n\n`;
      if (result.data) {
        response += `Result:\n${JSON.stringify(result.data, null, 2)}`;
      }
    } else {
      response = `❌ ${skill?.name} execution failed.\n\nError: ${result.error}`;
    }

    // 转换到跟进状态
    await session.stateMachine.transitionTo('FOLLOW_UP');

    return {
      success: result.success,
      skillName: skill?.name,
      params: context.collectedParams,
      executionResult: result,
      response,
      state: 'FOLLOW_UP',
      requiresUserInput: true,
      context: {
        conversationId: session.id,
        turnCount: session.turnCount,
        extractedParams: context.collectedParams,
        missingParams: [],
      },
    };
  }

  /**
   * 处理错误恢复
   */
  private async handleErrorRecovery(
    session: InteractionSession,
    context: ConversationContext
  ): Promise<InteractionResult> {
    const error = context.lastError;
    
    if (!error) {
      return this.createErrorResult(session, 'No error to recover from');
    }

    // 分析错误
    const skillError = this.errorRecoveryManager.analyzeError(error, {
      skillName: context.selectedSkill?.name,
      params: context.collectedParams,
      executionId: context.executionId,
    });

    // 尝试恢复
    const recoveryResult = await this.errorRecoveryManager.recover(skillError);

    // 学习错误模式
    this.errorRecoveryManager.learnFromError(skillError, recoveryResult);

    if (recoveryResult.resolved) {
      // 恢复成功
      if (recoveryResult.newParams) {
        session.stateMachine.updateCollectedParams(recoveryResult.newParams);
      }

      if (recoveryResult.fallbackSkill) {
        // 使用降级skill
        const fallbackSkill = this.skillRegistry.getSkill(recoveryResult.fallbackSkill);
        if (fallbackSkill) {
          session.stateMachine.setSelectedSkill(fallbackSkill);
        }
      }

      // 重试执行
      await session.stateMachine.transitionTo('EXECUTING');
      return this.handleExecuting(session, session.stateMachine.getContext());
    }

    if (recoveryResult.clarificationNeeded) {
      // 需要用户澄清
      await session.stateMachine.transitionTo('CLARIFYING');
      return {
        success: false,
        response: recoveryResult.clarificationPrompt!,
        state: 'CLARIFYING',
        requiresUserInput: true,
        clarificationNeeded: true,
        context: {
          conversationId: session.id,
          turnCount: session.turnCount,
          extractedParams: context.collectedParams,
          missingParams: [],
        },
      };
    }

    // 恢复失败
    return {
      success: false,
      response: `An error occurred and could not be automatically recovered.\n\nError: ${skillError.message}\n\nPlease try rephrasing your request or contact support.`,
      state: 'ERROR_RECOVERY',
      requiresUserInput: true,
      context: {
        conversationId: session.id,
        turnCount: session.turnCount,
        extractedParams: context.collectedParams,
        missingParams: [],
      },
    };
  }

  /**
   * 处理澄清状态
   */
  private async handleClarifying(
    session: InteractionSession,
    input: UserInput,
    context: ConversationContext
  ): Promise<InteractionResult> {
    // 用户提供了澄清信息，重新进行意图识别
    await session.stateMachine.transitionTo('INTENT_RECOGNITION');
    return this.handleIntentRecognition(session, input);
  }

  /**
   * 处理跟进状态
   */
  private async handleFollowUp(
    session: InteractionSession,
    input: UserInput,
    context: ConversationContext
  ): Promise<InteractionResult> {
    // 检查用户是否想要继续其他操作
    const lowerInput = input.text.toLowerCase();

    if (/^(exit|quit|bye|goodbye|结束|退出|再见)$/.test(lowerInput)) {
      // 结束会话
      await this.closeSession(session.id);
      return {
        success: true,
        response: 'Thank you! Goodbye!',
        state: 'IDLE',
        requiresUserInput: false,
        context: {
          conversationId: session.id,
          turnCount: session.turnCount,
          extractedParams: {},
          missingParams: [],
        },
      };
    }

    if (/^(new|start|restart|新的|开始)$/.test(lowerInput)) {
      // 开始新的操作
      await session.stateMachine.reset();
      await session.stateMachine.transitionTo('INTENT_RECOGNITION');
      return this.handleIntentRecognition(session, input);
    }

    // 默认继续当前对话流程
    return {
      success: true,
      response: 'Is there anything else I can help you with? (Type "new" for a new task, "exit" to end)',
      state: 'FOLLOW_UP',
      requiresUserInput: true,
      context: {
        conversationId: session.id,
        turnCount: session.turnCount,
        extractedParams: context.collectedParams,
        missingParams: [],
      },
    };
  }

  /**
   * 处理错误
   */
  private async handleError(
    session: InteractionSession,
    error: Error,
    input: UserInput
  ): Promise<InteractionResult> {
    logger.error('Interaction error', error);

    // 分析并尝试恢复
    const skillError = this.errorRecoveryManager.analyzeError(error, {
      sessionId: session.id,
    });

    const recoveryResult = await this.errorRecoveryManager.recover(skillError);

    return {
      success: false,
      response: recoveryResult.clarificationNeeded 
        ? recoveryResult.clarificationPrompt!
        : `Sorry, an error occurred while processing your request: ${error.message}`,
      state: 'ERROR_RECOVERY',
      requiresUserInput: true,
      clarificationNeeded: recoveryResult.clarificationNeeded,
      context: {
        conversationId: session.id,
        turnCount: session.turnCount,
        extractedParams: {},
        missingParams: [],
      },
    };
  }

  /**
   * 创建错误结果
   */
  private createErrorResult(
    session: InteractionSession,
    message: string
  ): InteractionResult {
    return {
      success: false,
      response: `Error: ${message}`,
      state: 'ERROR_RECOVERY',
      requiresUserInput: true,
      context: {
        conversationId: session.id,
        turnCount: session.turnCount,
        extractedParams: {},
        missingParams: [],
      },
    };
  }

  /**
   * 关闭会话
   */
  async closeSession(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    // 归档长期记忆 - 将所有短期/中期记忆迁移到长期记忆
    if (this.config.enableLongTermMemory) {
      await this.archiveSessionMemories(session);
    }

    this.sessions.delete(sessionId);
    this.emit('sessionClosed', sessionId);
    logger.info(`Session closed: ${sessionId}`);
  }

  /**
   * 归档会话记忆
   */
  private async archiveSessionMemories(session: InteractionSession): Promise<void> {
    try {
      // 获取会话相关的所有记忆
      const sessionMemories = await session.memory.retrieve(`session ${session.id}`, {
        layer: ['working', 'short_term', 'medium_term'],
        limit: 100,
      });

      // 将重要记忆迁移到长期记忆
      for (const mem of sessionMemories) {
        if (mem.entry.importance >= this.config.memoryImportanceThreshold) {
          await session.memory.store(
            mem.entry.content,
            mem.entry.type,
            'long_term',
            {
              ...mem.entry.metadata,
              archivedFrom: mem.entry.layer,
              sessionId: session.id,
            },
            mem.entry.importance
          );
        }
      }

      logger.info(`Archived ${sessionMemories.length} memories for session ${session.id}`);
    } catch (error) {
      logger.error('Failed to archive session memories', { error, sessionId: session.id });
    }
  }

  /**
   * 清理过期会话
   */
  async cleanupExpiredSessions(maxAgeMinutes: number = 30): Promise<number> {
    const now = new Date();
    const expiredSessions: string[] = [];

    for (const [id, session] of this.sessions) {
      const ageMinutes = (now.getTime() - session.lastActivity.getTime()) / (1000 * 60);
      if (ageMinutes > maxAgeMinutes) {
        expiredSessions.push(id);
      }
    }

    for (const id of expiredSessions) {
      await this.closeSession(id);
    }

    logger.info(`Cleaned up ${expiredSessions.length} expired sessions`);
    return expiredSessions.length;
  }

  /**
   * 获取会话统计
   */
  getSessionStats() {
    return {
      activeSessions: this.sessions.size,
      totalTurns: Array.from(this.sessions.values())
        .reduce((sum, s) => sum + s.turnCount, 0),
      recoveryStats: this.errorRecoveryManager.getRecoveryStats(),
    };
  }
}

// ============================================================================
// Factory Functions
// ============================================================================

export function createOptimizedInteractionManager(
  skillRegistry: SkillRegistry,
  skillScheduler: SkillScheduler,
  config: Partial<Omit<InteractionConfig, 'llm'>> & { llm: LLMService }
): OptimizedSkillInteractionManager {
  return new OptimizedSkillInteractionManager(skillRegistry, skillScheduler, config);
}
