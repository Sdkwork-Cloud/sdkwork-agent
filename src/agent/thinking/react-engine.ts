/**
 * ReAct Thinking Engine - ReAct 思考引擎
 *
 * 支持并行工具调用、自我反思、失败恢复、动态Skill选择
 *
 * @module ReActEngine
 * @version 6.0.0
 */

import type {
  LLMService,
  ToolRegistry,
  SkillRegistry,
  MemoryService,
  Logger,
  ThinkingStep,
  Action,
  ThinkingResult,
  AgentId,
  ExecutionId,
  MessageContentPart,
} from '../domain/types.js';
import { EventBus, createEventBus } from '../domain/events.js';
import {
  ExecutionContextManager,
  createExecutionContext,
  removeExecutionContext,
  type ExecutionLimits,
} from '../../execution/execution-context.js';
import { DynamicSkillSelector, createDynamicSelector } from '../../skills/core/dynamic-selector.js';
import { 
  SkillToolAdapter, 
  createSkillToolAdapter,
  type SkillToolDefinition 
} from '../../skills/skill-tool-adapter.js';

export interface ReActConfig {
  maxSteps?: number;
  timeout?: number;
  enableReflection?: boolean;
  reflectionInterval?: number;
  maxReflections?: number;
  systemPrompt?: string;
  temperature?: number;
  /** 是否启用并行工具调用 */
  enableParallelTools?: boolean;
  /** 执行限制 */
  executionLimits?: Partial<ExecutionLimits>;
  /** 启用动态Skill选择 */
  enableDynamicSkillSelection?: boolean;
  /** Skill选择置信度阈值 */
  skillSelectionThreshold?: number;
  /** 最大选择的Skill数量 */
  maxSelectedSkills?: number;
}

/**
 * 提取文本内容
 */
function extractTextContent(content: string | MessageContentPart[]): string {
  if (typeof content === 'string') {
    return content;
  }
  return content
    .filter((part): part is { type: 'text'; text: string } => part.type === 'text')
    .map(part => part.text)
    .join('');
}

export interface ReActState {
  currentStep: number;
  steps: ThinkingStep[];
  reflections: string[];
  toolsUsed: Set<string>;
  startTime: number;
  isComplete: boolean;
  answer?: string;
  executionContext?: ExecutionContextManager;
  /** 当前选择的Skill列表 */
  selectedSkills: string[];
  /** Skill选择结果 */
  skillSelectionResult?: {
    selectedSkills: string[];
    confidence: number;
    reasoning: string;
    shouldLoad: boolean;
  };
}

export class ReActEngine {
  private config: Required<Omit<ReActConfig, 'executionLimits'>> & { executionLimits: ExecutionLimits };
  private state: ReActState;
  private eventBus: EventBus;
  private abortController: AbortController;
  private skillSelector?: DynamicSkillSelector;
  private skillToolAdapter: SkillToolAdapter;
  private _cachedToolsDescription?: string;
  private _toolsCacheKey?: string;

  constructor(
    private llm: LLMService,
    private tools: ToolRegistry,
    private skills: SkillRegistry,
    private memory: MemoryService,
    private logger: Logger,
    config: ReActConfig = {},
    eventBus?: EventBus
  ) {
    const defaultLimits: ExecutionLimits = {
      maxDepth: 20, // 增加到 20 层
      maxSteps: 100, // 增加到 100 步
      maxSameActionRepeat: 10, // 增加到 10 次
      timeout: 300000, // 增加到 5 分钟
      maxTotalTime: 600000, // 增加到 10 分钟
    };

    const executionLimits: ExecutionLimits = {
      maxDepth: config.executionLimits?.maxDepth ?? defaultLimits.maxDepth,
      maxSteps: config.executionLimits?.maxSteps ?? defaultLimits.maxSteps,
      maxSameActionRepeat: config.executionLimits?.maxSameActionRepeat ?? defaultLimits.maxSameActionRepeat,
      timeout: config.executionLimits?.timeout ?? defaultLimits.timeout,
      maxTotalTime: config.executionLimits?.maxTotalTime ?? defaultLimits.maxTotalTime,
    };

    const { executionLimits: _executionLimits, ...restConfig } = config;

    this.config = {
      maxSteps: 20, // 增加到 20 步
      timeout: 300000, // 增加到 5 分钟
      enableReflection: true,
      reflectionInterval: 3,
      maxReflections: 5, // 增加到 5 次
      systemPrompt: this.getDefaultSystemPrompt(),
      temperature: 0.7,
      enableParallelTools: false,
      enableDynamicSkillSelection: true,
      skillSelectionThreshold: 0.6,
      maxSelectedSkills: 3,
      executionLimits,
      ...restConfig,
    };

    this.state = {
      currentStep: 0,
      steps: [],
      reflections: [],
      toolsUsed: new Set(),
      startTime: Date.now(),
      isComplete: false,
      selectedSkills: [],
    };

    this.eventBus = eventBus || createEventBus();
    this.abortController = new AbortController(); // 每次构造时重置
    this.skillToolAdapter = createSkillToolAdapter({ prefix: 'skill_' });

    if (this.config.enableDynamicSkillSelection) {
      this.skillSelector = createDynamicSelector({
        confidenceThreshold: this.config.skillSelectionThreshold,
        maxSelectedSkills: this.config.maxSelectedSkills,
        logger: this.logger,
        enablePreload: true,
        preloadThreshold: 0.7,
      });
    }
  }

  async think(
    input: string,
    context: {
      agentId: AgentId;
      executionId: ExecutionId;
      sessionId?: string;
    }
  ): Promise<ThinkingResult> {
    // 重置状态和 AbortController（每次 think 调用时重置）
    this.abortController = new AbortController();
    this.state = {
      currentStep: 0,
      steps: [],
      reflections: [],
      toolsUsed: new Set(),
      startTime: Date.now(),
      isComplete: false,
      selectedSkills: [],
    };

    // 创建执行上下文
    this.state.executionContext = createExecutionContext({
      executionId: context.executionId,
      agentId: context.agentId,
      sessionId: context.sessionId,
      limits: this.config.executionLimits,
      eventBus: this.eventBus,
    });

    this.logger.info('[ReAct] Starting thinking process', { input, executionId: context.executionId });

    this.eventBus.publish(
      'thinking:started',
      { input, maxSteps: this.config.maxSteps, executionId: context.executionId },
      { agentId: context.agentId, executionId: context.executionId }
    );

    let timeoutId: ReturnType<typeof setTimeout> | undefined;

    try {
      timeoutId = setTimeout(() => {
        this.abortController.abort();
        this.state.executionContext?.abort('timeout', `Execution timeout after ${this.config.timeout}ms`);
      }, this.config.timeout);

      // 特殊意图处理：技能列表查询
      if (this.isSkillListQuery(input)) {
        return this.handleSkillListQuery();
      }

      const relevantMemories = await this.retrieveRelevantMemories(input);
      const memoryContext = relevantMemories.length > 0
        ? `\n\nRelevant past experiences:\n${relevantMemories.map(m => `- ${m.content}`).join('\n')}`
        : '';

      // 动态Skill选择 (Claude Code / Codex / OpenCode 风格)
      if (this.skillSelector && this.config.enableDynamicSkillSelection) {
        await this.performDynamicSkillSelection(input, context);
      }

      for (let step = 1; step <= this.config.maxSteps; step++) {
        // 检查执行上下文是否已中止
        if (this.abortController.signal.aborted || this.state.executionContext?.isAborted()) {
          const reason = this.state.executionContext?.getAbortReason();
          this.logger.warn('[ReAct] Thinking process aborted', { reason });
          throw new Error(`Thinking process aborted: ${reason?.message || 'Unknown reason'}`);
        }

        // 检查是否可以继续执行
        if (!this.state.executionContext?.canContinue()) {
          const reason = this.state.executionContext?.getAbortReason();
          this.logger.warn('[ReAct] Execution limits reached', { reason });
          throw new Error(`Execution limits reached: ${reason?.message || 'Unknown reason'}`);
        }

        this.state.currentStep = step;
        const stepStartTime = Date.now();

        // 1. 生成思考
        const thought = await this.generateThought(input, step, memoryContext);
        this.logger.debug(`[ReAct Step ${step}] Thought: ${thought}`);

        // 2. 选择动作（支持并行）
        const actions = await this.selectActions(thought, step);
        this.logger.debug(`[ReAct Step ${step}] Actions: ${actions.length}`);

        // 检查是否完成
        const finishAction = actions.find(a => a.type === 'finish');
        if (finishAction) {
          const answer = finishAction.parameters.answer as string;
          this.state.isComplete = true;
          this.state.answer = answer;

          if (timeoutId) clearTimeout(timeoutId);

          const result = this.buildResult(true, answer);

          this.eventBus.publish(
            'thinking:completed',
            { result, steps: this.state.steps },
            { agentId: context.agentId, executionId: context.executionId }
          );

          // 清理执行上下文
          removeExecutionContext(context.executionId);

          return result;
        }

        // 3. 执行动作（支持并行）
        const observations = await this.executeActions(actions, step, context);
        const stepDuration = Date.now() - stepStartTime;

        // 记录步骤
        const thinkingStep: ThinkingStep = {
          step,
          thought,
          action: actions[0], // 主动作
          observation: observations.join('\n'),
          duration: stepDuration,
        };
        this.state.steps.push(thinkingStep);

        this.eventBus.publish(
          'thinking:step',
          { step: thinkingStep },
          { agentId: context.agentId, executionId: context.executionId }
        );

        // 4. 反思
        if (
          this.config.enableReflection &&
          step % this.config.reflectionInterval === 0 &&
          this.state.reflections.length < this.config.maxReflections
        ) {
          await this.reflect(step, context);
        }

        // 存储到记忆
        await this.memory.store({
          id: `thought-${Date.now()}`,
          content: `Step ${step}: ${thought}\nActions: ${actions.map(a => `${a.type}:${a.name}`).join(', ')}\nObservations: ${observations.join('; ')}`,
          type: 'thought',
          timestamp: Date.now(),
          importance: 0.8,
        });
      }

      if (timeoutId) clearTimeout(timeoutId);
      const partialAnswer = this.synthesizePartialAnswer();
      const result = this.buildResult(false, partialAnswer, 'Max steps reached');

      this.eventBus.publish(
        'thinking:completed',
        { result, steps: this.state.steps },
        { agentId: context.agentId, executionId: context.executionId }
      );

      // 清理执行上下文
      removeExecutionContext(context.executionId);

      return result;
    } catch (error) {
      if (timeoutId) clearTimeout(timeoutId);
      this.logger.error('[ReAct] Thinking process failed', {}, error as Error);

      this.eventBus.publish(
        'thinking:failed',
        { error: (error as Error).message },
        { agentId: context.agentId, executionId: context.executionId }
      );

      // 清理执行上下文
      removeExecutionContext(context.executionId);

      const partialAnswer = this.synthesizePartialAnswer();
      return this.buildResult(false, partialAnswer, (error as Error).message);
    }
  }

  async *thinkStream(
    input: string,
    context: {
      agentId: AgentId;
      executionId: ExecutionId;
      sessionId?: string;
    }
  ): AsyncGenerator<ThinkingStreamEvent> {
    this.reset();

    // 创建执行上下文
    this.state.executionContext = createExecutionContext({
      executionId: context.executionId,
      agentId: context.agentId,
      sessionId: context.sessionId,
      limits: this.config.executionLimits,
      eventBus: this.eventBus,
    });

    yield { type: 'start', input };

    try {
      const relevantMemories = await this.retrieveRelevantMemories(input);
      const memoryContext = relevantMemories.length > 0
        ? `\n\nRelevant past experiences:\n${relevantMemories.map(m => `- ${m.content}`).join('\n')}`
        : '';

      for (let step = 1; step <= this.config.maxSteps; step++) {
        // 检查执行上下文是否已中止
        if (this.abortController.signal.aborted || this.state.executionContext?.isAborted()) {
          const reason = this.state.executionContext?.getAbortReason();
          yield { type: 'error', error: `Thinking process aborted: ${reason?.message || 'Unknown reason'}` };
          return;
        }

        // 检查是否可以继续执行
        if (!this.state.executionContext?.canContinue()) {
          const reason = this.state.executionContext?.getAbortReason();
          yield { type: 'error', error: `Execution limits reached: ${reason?.message || 'Unknown reason'}` };
          return;
        }

        this.state.currentStep = step;
        const stepStartTime = Date.now();

        const thought = await this.generateThought(input, step, memoryContext);
        yield { type: 'thought', step, thought };

        const actions = await this.selectActions(thought, step);
        yield { type: 'actions', step, actions };

        const finishAction = actions.find(a => a.type === 'finish');
        if (finishAction) {
          const answer = finishAction.parameters.answer as string;
          yield { type: 'complete', answer, steps: this.state.steps };
          // 清理执行上下文
          removeExecutionContext(context.executionId);
          return;
        }

        const observations = await this.executeActions(actions, step, context);
        const stepDuration = Date.now() - stepStartTime;

        this.state.steps.push({
          step,
          thought,
          action: actions[0],
          observation: observations.join('\n'),
          duration: stepDuration,
        });

        yield { type: 'observations', step, observations };

        if (
          this.config.enableReflection &&
          step % this.config.reflectionInterval === 0 &&
          this.state.reflections.length < this.config.maxReflections
        ) {
          const reflection = await this.reflect(step, context);
          yield { type: 'reflection', step, reflection };
        }
      }

      const partialAnswer = this.synthesizePartialAnswer();
      yield { type: 'complete', answer: partialAnswer, steps: this.state.steps, incomplete: true };
      // 清理执行上下文
      removeExecutionContext(context.executionId);
    } catch (error) {
      // 清理执行上下文
      if (this.state.executionContext) {
        removeExecutionContext(this.state.executionContext['executionId']);
      }
      yield { type: 'error', error: (error as Error).message };
    }
  }

  abort(): void {
    this.abortController.abort();
  }

  getState(): ReActState {
    return { ...this.state };
  }

  reset(): void {
    this.abortController = new AbortController(); // 重置 AbortController
    this.state = {
      currentStep: 0,
      steps: [],
      reflections: [],
      toolsUsed: new Set(),
      startTime: Date.now(),
      isComplete: false,
      executionContext: undefined,
      selectedSkills: [],
      skillSelectionResult: undefined,
    };
    this.abortController = new AbortController();
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  /**
   * 动态Skill选择 - 实现Claude Code / Codex / OpenCode风格
   * 
   * 根据用户输入和上下文，智能选择需要激活的Skill
   * 支持渐进式披露，只加载必要的Skill
   */
  private async performDynamicSkillSelection(
    input: string,
    context: { agentId: AgentId; executionId: ExecutionId; sessionId?: string }
  ): Promise<void> {
    if (!this.skillSelector) return;

    try {
      const skills = this.skills.list();
      
      // 智能Skill选择算法 (Claude Code / Codex / OpenCode 风格)
      const inputLower = input.toLowerCase();
      const skillMatches: { name: string; score: number; reason: string }[] = [];

      for (const skill of skills) {
        let score = 0;
        const reasons: string[] = [];
        const skillNameLower = skill.name.toLowerCase();
        const skillNameWords = skillNameLower.split('-');
        const descLower = skill.description.toLowerCase();
        
        // 1. 精确名称匹配 (最高优先级)
        if (skillNameLower === inputLower) {
          score += 1.0;
          reasons.push('exact name match');
        }
        // 2. 名称完整包含
        else if (inputLower.includes(skillNameLower)) {
          score += 0.8;
          reasons.push('name contained in input');
        }
        // 3. 输入完整包含名称
        else if (skillNameLower.includes(inputLower)) {
          score += 0.7;
          reasons.push('input contained in name');
        }
        // 4. 名称单词匹配
        else {
          for (const word of skillNameWords) {
            if (word.length > 2) {
              // 精确匹配
              if (inputLower.split(/\s+/).includes(word)) {
                score += 0.4;
                reasons.push(`name word "${word}" match`);
              }
              // 模糊匹配 (包含)
              else if (inputLower.includes(word)) {
                score += 0.25;
                reasons.push(`name word "${word}" partial match`);
              }
            }
          }
        }
        
        // 5. 描述关键词匹配
        const inputWords = inputLower.split(/\s+/);
        const descWords = descLower.split(/\s+/);
        for (const word of descWords) {
          if (word.length > 3) {
            if (inputWords.includes(word)) {
              score += 0.15;
              reasons.push(`description word "${word}" match`);
            }
          }
        }

        // 6. 元数据匹配 (标签/分类)
        if (skill.metadata) {
          const tags = skill.metadata.tags || [];
          for (const tag of tags) {
            if (inputLower.includes(tag.toLowerCase())) {
              score += 0.2;
              reasons.push(`tag "${tag}" match`);
            }
          }
          if (skill.metadata.category && inputLower.includes(skill.metadata.category.toLowerCase())) {
            score += 0.15;
            reasons.push(`category match`);
          }
        }

        if (score > 0) {
          skillMatches.push({ 
            name: skill.name, 
            score: Math.min(score, 1.0),
            reason: reasons.join(', ')
          });
        }
      }

      // 按分数排序并选择前N个
      skillMatches.sort((a, b) => b.score - a.score);
      const selectedSkills = skillMatches
        .filter(m => m.score >= this.config.skillSelectionThreshold)
        .slice(0, this.config.maxSelectedSkills)
        .map(m => m.name);

      this.state.selectedSkills = selectedSkills;
      this.state.skillSelectionResult = {
        selectedSkills,
        confidence: selectedSkills.length > 0 ? skillMatches[0]?.score || 0 : 0,
        reasoning: selectedSkills.length > 0 
          ? skillMatches[0]?.reason || `Selected ${selectedSkills.length} skills based on semantic matching`
          : 'No skills matched the input',
        shouldLoad: selectedSkills.length > 0,
      };

      this.logger.info('[ReAct] Dynamic skill selection completed', {
        selectedSkills: this.state.selectedSkills,
        confidence: this.state.skillSelectionResult.confidence,
        reasoning: this.state.skillSelectionResult.reasoning,
      });

      // 发射Skill选择事件 (使用通用事件类型)
      this.eventBus.publish(
        'thinking:step' as any,
        { 
          type: 'skill_selection',
          selectedSkills: this.state.selectedSkills,
          confidence: this.state.skillSelectionResult.confidence,
          reasoning: this.state.skillSelectionResult.reasoning,
        },
        { agentId: context.agentId, executionId: context.executionId }
      );
    } catch (error) {
      this.logger.warn('[ReAct] Dynamic skill selection failed, continuing without it', {
        error: (error as Error).message,
      });
    }
  }

  private async retrieveRelevantMemories(input: string): Promise<Array<{ content: string; importance: number }>> {
    try {
      const memories = await this.memory.search(input, { limit: 5 });
      return memories
        .filter(m => m.importance && m.importance > 0.5)
        .map(m => ({ content: m.content, importance: m.importance || 0 }));
    } catch {
      return [];
    }
  }

  private async generateThought(input: string, step: number, memoryContext: string = ''): Promise<string> {
    const prompt = this.buildThoughtPrompt(input, step, memoryContext);

    const response = await this.llm.complete({
      messages: [
        { role: 'system', content: this.config.systemPrompt, id: 'system', timestamp: Date.now() },
        { role: 'user', content: prompt, id: 'user', timestamp: Date.now() },
      ],
      temperature: this.config.temperature,
    });

    return extractTextContent(response.choices[0]?.message?.content || '');
  }

  private async selectActions(thought: string, step: number): Promise<Action[]> {
    const prompt = this.buildActionPrompt(thought, step);

    const response = await this.llm.complete({
      messages: [
        { role: 'system', content: this.config.systemPrompt, id: 'system', timestamp: Date.now() },
        { role: 'user', content: prompt, id: 'user', timestamp: Date.now() },
      ],
      temperature: 0.3,
    });

    const content = extractTextContent(response.choices[0]?.message?.content || '');
    return this.parseActions(content);
  }

  private async executeActions(
    actions: Action[],
    step: number,
    context: { agentId: AgentId; executionId: ExecutionId; sessionId?: string }
  ): Promise<string[]> {
    // 过滤出可执行的动作
    const executableActions = actions.filter(a => a.type !== 'think' && a.type !== 'reflect');

    if (executableActions.length === 0) {
      return Promise.all(actions.map(a => this.executeSingleAction(a, step, context)));
    }

    // 如果启用并行且只有一个动作，或者禁用并行，则串行执行
    if (!this.config.enableParallelTools || executableActions.length === 1) {
      const results: string[] = [];
      for (const action of actions) {
        results.push(await this.executeSingleAction(action, step, context));
      }
      return results;
    }

    // 并行执行
    const executions = executableActions.map(action =>
      this.executeSingleAction(action, step, context)
    );

    return Promise.all(executions);
  }

  private async executeSingleAction(
    action: Action,
    step: number,
    context: { agentId: AgentId; executionId: ExecutionId; sessionId?: string }
  ): Promise<string> {
    this.logger.info(`[ReAct Step ${step}] Executing: ${action.type}:${action.name}`);

    // 检查执行上下文是否允许进入
    if (!this.state.executionContext?.enterAction(action.type, action.name)) {
      const reason = this.state.executionContext?.getAbortReason();
      return `Error: Execution blocked - ${reason?.message || 'Unknown reason'}`;
    }

    const maxRetries = 3;
    let lastError: Error | undefined;

    try {
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          switch (action.type) {
            case 'tool': {
              this.state.toolsUsed.add(action.name);

              const toolResult = await this.tools.execute(
                action.name,
                action.parameters,
                {
                  executionId: context.executionId,
                  agentId: context.agentId,
                  sessionId: context.sessionId,
                  toolId: action.name,
                  toolName: action.name,
                  logger: this.logger,
                  signal: this.abortController.signal,
                  executionContext: this.state.executionContext,
                }
              );

              return JSON.stringify(toolResult.data || toolResult);
            }

            case 'skill': {
              const skill = this.skills.getByName?.(action.name) || this.skills.get?.(action.name);
              if (!skill) {
                return `Error: Skill '${action.name}' not found`;
              }

              this.state.toolsUsed.add(action.name);

              // 检查是否在动态选择的 Skills 中 (Claude Code / Codex / OpenCode 风格)
              const isDynamicSelected = this.state.selectedSkills.includes(action.name);
              
              if (isDynamicSelected) {
                this.logger.info(`[ReAct] Executing dynamically selected skill: ${action.name}`);
              } else if (this.state.selectedSkills.length > 0) {
                this.logger.warn(`[ReAct] Skill '${action.name}' was not in dynamically selected list, executing anyway`);
              }

              const skillResult = await skill.execute(action.parameters, {
                executionId: context.executionId,
                agentId: context.agentId,
                sessionId: context.sessionId,
                input: action.parameters,
                logger: this.logger,
                llm: this.llm,
                memory: this.memory,
                tools: this.tools,
                signal: this.abortController.signal,
                executionContext: this.state.executionContext,
              });

              return JSON.stringify(skillResult.data || skillResult);
            }

            case 'think': {
              return `Thought: ${action.parameters.thought || action.name}`;
            }

            case 'reflect': {
              return `Reflection: ${action.parameters.reflection || ''}`;
            }

            default:
              return `Unknown action type: ${action.type}`;
          }
        } catch (error) {
          lastError = error as Error;
          
          // 检查是否可重试
          if (this.isRetryableError(error) && attempt < maxRetries) {
            this.logger.warn(`[ReAct] Retrying action ${action.name}, attempt ${attempt}/${maxRetries}`);
            await this._sleep(1000 * attempt); // 指数退避
            continue;
          }
          break;
        }
      }

      this.logger.error(`[ReAct] Action failed after ${maxRetries} attempts: ${action.type}:${action.name}`, {}, lastError!);
      return `Error after ${maxRetries} attempts: ${lastError?.message}`;
    } finally {
      // 退出执行层级
      this.state.executionContext?.exitAction(action.type, action.name);
    }
  }

  private isRetryableError(error: unknown): boolean {
    const message = (error as Error).message.toLowerCase();
    return message.includes('timeout') || 
           message.includes('rate limit') ||
           message.includes('network') ||
           message.includes('econnreset') ||
           message.includes('econnrefused');
  }

  private _sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private async reflect(
    step: number,
    context: { agentId: AgentId; executionId: ExecutionId }
  ): Promise<string> {
    const history = this.formatHistory();

    const prompt = `Based on the execution history so far, reflect on:
1. Are we making progress toward the goal?
2. Are there any mistakes or inefficiencies?
3. Should we adjust our strategy?

History:
${history}

Provide a brief reflection:`;

    const response = await this.llm.complete({
      messages: [
        { role: 'system', content: this.config.systemPrompt, id: 'system', timestamp: Date.now() },
        { role: 'user', content: prompt, id: 'user', timestamp: Date.now() },
      ],
      temperature: 0.5,
    });

    const reflection = extractTextContent(response.choices[0]?.message?.content || '');
    this.state.reflections.push(reflection);

    this.eventBus.publish(
      'thinking:reflected',
      { step, reflection },
      { agentId: context.agentId, executionId: context.executionId }
    );

    return reflection;
  }

  private buildThoughtPrompt(input: string, step: number, memoryContext: string = ''): string {
    const tools = this.formatTools();
    const history = this.formatHistory();

    return `Task: ${input}

${tools}

History:
${history}

${memoryContext ? `Context:\n${memoryContext}\n\n` : ''}Step ${step}: Think and act.`;
  }

  private buildActionPrompt(thought: string, _step: number): string {
    const tools = this.formatTools();

    return `Thought: ${thought}

${tools}

Action:`;
  }

  private parseActions(response: string): Action[] {
    const actions: Action[] = [];
    const lines = response.split('\n').filter(line => line.trim());

    for (const line of lines) {
      const action = this.parseActionLine(line.trim());
      if (action) {
        actions.push(action);
      }
    }

    // 如果没有解析到任何动作，返回默认思考动作
    if (actions.length === 0) {
      actions.push({
        type: 'think',
        name: 'think',
        parameters: { thought: response },
      });
    }

    return actions;
  }

  private parseActionLine(line: string): Action | null {
    // 尝试解析完整 JSON
    try {
      const parsed = JSON.parse(line);
      if (parsed.action) {
        return {
          type: parsed.action.type || 'think',
          name: parsed.action.name || 'default',
          parameters: parsed.action.parameters || {},
        };
      }
    } catch {
      // 不是完整 JSON，继续文本解析
    }

    // 解析 XML 格式: <skill name="xxx" param1="value1" />
    // 或 <tool name="xxx" param1="value1" />
    // 或 <action type="skill" name="xxx" param1="value1" />
    const xmlMatch = line.match(/<(skill|tool|action)\s+([^>]+)\s*\/?>/i);
    if (xmlMatch) {
      const tagType = xmlMatch[1].toLowerCase();
      const attrStr = xmlMatch[2];
      const attrs = this.parseXmlAttributes(attrStr);
      
      if (tagType === 'action') {
        const actionType = ((attrs.type as string) || 'think') as Action['type'];
        const name = (attrs.name as string) || 'default';
        const parameters = { ...attrs };
        delete parameters.type;
        delete parameters.name;
        return { type: actionType, name, parameters };
      }
      
      return {
        type: tagType as 'skill' | 'tool',
        name: (attrs.name as string) || '',
        parameters: { ...attrs, name: undefined },
      };
    }

    // 解析 finish:{"answer": "..."} 格式
    const finishJsonMatch = line.match(/finish\s*[:：]\s*(\{.+\})/i);
    if (finishJsonMatch) {
      try {
        const params = JSON.parse(finishJsonMatch[1]);
        return {
          type: 'finish',
          name: 'finish',
          parameters: params,
        };
      } catch {
        // JSON 解析失败，使用文本格式
      }
    }

    // 解析 finish:answer 文本格式
    const finishMatch = line.match(/finish\s*[:：]\s*(?!{)(.+)/i);
    if (finishMatch) {
      return {
        type: 'finish',
        name: 'finish',
        parameters: { answer: finishMatch[1].trim() },
      };
    }

    // 解析 tool:name({"key": "value"}) JSON 格式
    const toolJsonMatch = line.match(/tool\s*[:：]\s*(\w+)\s*\((\{.+\})\)/i);
    if (toolJsonMatch) {
      try {
        const params = JSON.parse(toolJsonMatch[2]);
        return {
          type: 'tool',
          name: toolJsonMatch[1],
          parameters: params,
        };
      } catch {
        // JSON 解析失败，继续尝试其他格式
      }
    }

    // 解析 tool:name(key=value) 文本格式
    const toolMatch = line.match(/tool\s*[:：]\s*(\w+)\s*\(([^)]*)\)/i);
    if (toolMatch) {
      return {
        type: 'tool',
        name: toolMatch[1],
        parameters: this.parseParameters(toolMatch[2]),
      };
    }

    // 解析 skill:name({"key": "value"}) JSON 格式
    const skillJsonMatch = line.match(/skill\s*[:：]\s*(\w+)\s*\((\{.+\})\)/i);
    if (skillJsonMatch) {
      try {
        const params = JSON.parse(skillJsonMatch[2]);
        return {
          type: 'skill',
          name: skillJsonMatch[1],
          parameters: params,
        };
      } catch {
        // JSON 解析失败，继续尝试其他格式
      }
    }

    // 解析 skill:name(key=value) 文本格式
    const skillMatch = line.match(/skill\s*[:：]\s*(\w+)\s*\(([^)]*)\)/i);
    if (skillMatch) {
      return {
        type: 'skill',
        name: skillMatch[1],
        parameters: this.parseParameters(skillMatch[2]),
      };
    }

    return null;
  }

  private parseXmlAttributes(attrStr: string): Record<string, unknown> {
    const attrs: Record<string, unknown> = {};
    const attrPattern = /(\w+)\s*=\s*"([^"]*)"/g;
    let match;
    while ((match = attrPattern.exec(attrStr)) !== null) {
      const key = match[1];
      let value: string | number | boolean = match[2];
      
      if (value === 'true') value = true;
      else if (value === 'false') value = false;
      else if (!isNaN(Number(value)) && value !== '') value = Number(value);
      
      attrs[key] = value;
    }
    return attrs;
  }

  private parseParameters(paramStr: string): Record<string, unknown> {
    const params: Record<string, unknown> = {};
    if (!paramStr.trim()) return params;

    const pairs = paramStr.split(',');

    for (const pair of pairs) {
      const [key, value] = pair.split('=').map((s) => s.trim());
      if (key && value) {
        if (value === 'true') params[key] = true;
        else if (value === 'false') params[key] = false;
        else if (!isNaN(Number(value))) params[key] = Number(value);
        else params[key] = value.replace(/^["']|["']$/g, '');
      }
    }

    return params;
  }

  private formatHistory(): string {
    if (this.state.steps.length === 0) return 'No previous steps.';

    return this.state.steps
      .map(
        (s) =>
          `Step ${s.step}:\n` +
          `Thought: ${s.thought}\n` +
          `Action: ${s.action.type} ${s.action.name}\n` +
          `Observation: ${s.observation}`
      )
      .join('\n\n');
  }

  private formatTools(): string {
    // 生成缓存键
    const toolsCount = this.tools.list?.()?.length || 0;
    const skillsCount = this.skills.list?.()?.length || 0;
    const selectedSkillsKey = this.state.selectedSkills.join(',');
    const cacheKey = `${toolsCount}-${skillsCount}-${selectedSkillsKey}`;

    // 检查缓存
    if (this._toolsCacheKey === cacheKey && this._cachedToolsDescription) {
      return this._cachedToolsDescription;
    }

    const tools = this.tools.list?.() || [];
    const skills = this.skills.list?.() || [];
    const selectedSkillNames = this.state.selectedSkills;

    let result = 'Tools:\n';
    tools.forEach((t) => {
      result += `- ${t.name}: ${t.description}\n`;
    });

    // 只输出一次 Skills 列表，标记选中状态
    if (skills.length > 0) {
      result += '\nSkills:\n';
      skills.forEach((s) => {
        const isSelected = selectedSkillNames.includes(s.name);
        const marker = isSelected ? '*' : '-';
        result += `${marker} ${s.name}: ${s.description}\n`;
      });
    }

    // 缓存结果
    this._cachedToolsDescription = result;
    this._toolsCacheKey = cacheKey;

    return result;
  }

  getToolDefinitionsForLLM(): SkillToolDefinition[] {
    const skills = this.skills.list?.() || [];
    return this.skillToolAdapter.skillsToToolDefinitions(skills);
  }

  private synthesizePartialAnswer(): string {
    if (this.state.steps.length === 0) return 'No progress made.';

    const lastStep = this.state.steps[this.state.steps.length - 1];
    return `Partial result after ${this.state.steps.length} steps: ${lastStep.observation}`;
  }

  private isSkillListQuery(input: string): boolean {
    const patterns = [
      /有[什么哪些][技能skill]/i,
      /列出[所有]?[技能skill]/i,
      /[显示查看]?技能列表/i,
      /你[能会]做?什么/i,
      /你[的]?能力[是有哪些]/i,
      /what\s+skills/i,
      /list\s+skills/i,
      /available\s+skills/i,
      /what\s+can\s+you\s+do/i,
      /^help$/i,
      /^帮助$/i,
    ];
    
    return patterns.some(p => p.test(input.trim()));
  }

  private handleSkillListQuery(): ThinkingResult {
    const skills = this.skills.list?.() || [];
    const tools = this.tools.list?.() || [];
    
    const skillList = skills.map(s => {
      const desc = s.description?.slice(0, 60) || 'No description';
      return `  • ${s.name}: ${desc}${s.description && s.description.length > 60 ? '...' : ''}`;
    }).join('\n');
    
    const toolList = tools.map(t => {
      const desc = t.description?.slice(0, 40) || 'No description';
      return `  • ${t.name}: ${desc}`;
    }).join('\n');
    
    const answer = `## 📋 可用技能列表

### Skills (${skills.length}个)
${skillList || '  (暂无可用技能)'}

### Tools (${tools.length}个)
${toolList || '  (暂无可用工具)'}

---
💡 提示：直接告诉我您想做什么，我会自动选择合适的技能来帮助您。`;

    return this.buildResult(true, answer);
  }

  private buildResult(success: boolean, answer: string, error?: string): ThinkingResult {
    return {
      success,
      answer,
      steps: this.state.steps,
      totalSteps: this.state.steps.length,
      totalDuration: Date.now() - this.state.startTime,
      toolsUsed: Array.from(this.state.toolsUsed),
      reflections: this.state.reflections,
      error,
      selectedSkills: this.state.selectedSkills,
      skillSelectionConfidence: this.state.skillSelectionResult?.confidence,
      skillSelectionReasoning: this.state.skillSelectionResult?.reasoning,
    };
  }

  private getDefaultSystemPrompt(): string {
    return `You are a ReAct agent. Think step-by-step, use tools/skills, then respond.

Actions:
- <tool name="name" param="value" />
- <skill name="name" param="value" />
- <action type="finish" answer="result" />

Rules:
1. Use exact names, provide all params
2. Execute independent actions in parallel
3. Wait for results before proceeding`;
  }
}

export type ThinkingStreamEvent =
  | { type: 'start'; input: string }
  | { type: 'thought'; step: number; thought: string }
  | { type: 'actions'; step: number; actions: Action[] }
  | { type: 'observations'; step: number; observations: string[] }
  | { type: 'reflection'; step: number; reflection: string }
  | { type: 'complete'; answer: string; steps: ThinkingStep[]; incomplete?: boolean }
  | { type: 'error'; error: string };

export interface ReActEngineConfig {
  llm: LLMService;
  tools: ToolRegistry;
  skills: SkillRegistry;
  memory: MemoryService;
  logger: Logger;
  config?: ReActConfig;
  eventBus?: EventBus;
}

export function createReActEngine(config: ReActEngineConfig): ReActEngine {
  return new ReActEngine(
    config.llm,
    config.tools,
    config.skills,
    config.memory,
    config.logger,
    config.config,
    config.eventBus
  );
}
