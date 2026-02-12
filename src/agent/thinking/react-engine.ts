/**
 * ReAct Thinking Engine - ReAct 思考引擎
 *
 * 支持并行工具调用、自我反思、失败恢复
 *
 * @module ReActEngine
 * @version 5.0.0
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
}

export interface ReActState {
  currentStep: number;
  steps: ThinkingStep[];
  reflections: string[];
  toolsUsed: Set<string>;
  startTime: number;
  isComplete: boolean;
  answer?: string;
}

export class ReActEngine {
  private config: Required<ReActConfig>;
  private state: ReActState;
  private eventBus: EventBus;
  private abortController: AbortController;

  constructor(
    private llm: LLMService,
    private tools: ToolRegistry,
    private skills: SkillRegistry,
    private memory: MemoryService,
    private logger: Logger,
    config: ReActConfig = {},
    eventBus?: EventBus
  ) {
    this.config = {
      maxSteps: 10,
      timeout: 60000,
      enableReflection: true,
      reflectionInterval: 3,
      maxReflections: 3,
      systemPrompt: this.getDefaultSystemPrompt(),
      temperature: 0.7,
      enableParallelTools: false,
      ...config,
    };

    this.state = {
      currentStep: 0,
      steps: [],
      reflections: [],
      toolsUsed: new Set(),
      startTime: Date.now(),
      isComplete: false,
    };

    this.eventBus = eventBus || createEventBus();
    this.abortController = new AbortController();
  }

  async think(
    input: string,
    context: {
      agentId: AgentId;
      executionId: ExecutionId;
      sessionId?: string;
    }
  ): Promise<ThinkingResult> {
    this.reset();

    this.logger.info('[ReAct] Starting thinking process', { input });

    this.eventBus.publish(
      'thinking:started',
      { input, maxSteps: this.config.maxSteps },
      { agentId: context.agentId, executionId: context.executionId }
    );

    try {
      const timeoutId = setTimeout(() => {
        this.abortController.abort();
      }, this.config.timeout);

      const relevantMemories = await this.retrieveRelevantMemories(input);
      const memoryContext = relevantMemories.length > 0
        ? `\n\nRelevant past experiences:\n${relevantMemories.map(m => `- ${m.content}`).join('\n')}`
        : '';

      for (let step = 1; step <= this.config.maxSteps; step++) {
        if (this.abortController.signal.aborted) {
          throw new Error('Thinking process aborted');
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

          clearTimeout(timeoutId);

          const result = this.buildResult(true, answer);

          this.eventBus.publish(
            'thinking:completed',
            { result, steps: this.state.steps },
            { agentId: context.agentId, executionId: context.executionId }
          );

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

      clearTimeout(timeoutId);
      const partialAnswer = this.synthesizePartialAnswer();
      const result = this.buildResult(false, partialAnswer, 'Max steps reached');

      this.eventBus.publish(
        'thinking:completed',
        { result, steps: this.state.steps },
        { agentId: context.agentId, executionId: context.executionId }
      );

      return result;
    } catch (error) {
      this.logger.error('[ReAct] Thinking process failed', {}, error as Error);

      this.eventBus.publish(
        'thinking:failed',
        { error: (error as Error).message },
        { agentId: context.agentId, executionId: context.executionId }
      );

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

    yield { type: 'start', input };

    try {
      const relevantMemories = await this.retrieveRelevantMemories(input);
      const memoryContext = relevantMemories.length > 0
        ? `\n\nRelevant past experiences:\n${relevantMemories.map(m => `- ${m.content}`).join('\n')}`
        : '';

      for (let step = 1; step <= this.config.maxSteps; step++) {
        if (this.abortController.signal.aborted) {
          throw new Error('Thinking process aborted');
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
    } catch (error) {
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
    this.state = {
      currentStep: 0,
      steps: [],
      reflections: [],
      toolsUsed: new Set(),
      startTime: Date.now(),
      isComplete: false,
    };
    this.abortController = new AbortController();
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

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
      this.logger.error(`[ReAct] Action failed: ${action.type}:${action.name}`, {}, error as Error);
      return `Error: ${(error as Error).message}`;
    }
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
    const history = this.formatHistory();
    const tools = this.formatTools();

    return `Task: ${input}${memoryContext}

Available Tools:
${tools}

Previous Actions:
${history}

Step ${step}: Analyze the current situation and think about what to do next.
Provide your thought process:`;
  }

  private buildActionPrompt(thought: string, step: number): string {
    const tools = this.formatTools();

    return `Your Thought: ${thought}

Available Tools:
${tools}

Choose actions (you can select multiple for parallel execution):
1. tool:tool_name(param1=value1) - Execute a tool
2. skill:skill_name(param1=value1) - Execute a skill
3. finish:answer - Complete the task with the answer
4. think:thought - Continue thinking

For multiple parallel actions, list them separated by newlines.

Your action(s):`;
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
    const tools = this.tools.list?.() || [];
    const skills = this.skills.list?.() || [];

    let result = 'Tools:\n';
    tools.forEach((t) => {
      result += `- ${t.name}: ${t.description}\n`;
      if (t.parameters && 'shape' in t.parameters) {
        const shape = (t.parameters as { shape?: () => Record<string, unknown> }).shape?.();
        if (shape) {
          result += `  Parameters: ${JSON.stringify(Object.keys(shape))}\n`;
        }
      }
    });

    result += '\nSkills:\n';
    skills.forEach((s) => {
      result += `- ${s.name}: ${s.description}\n`;
      if (s.inputSchema && 'shape' in s.inputSchema) {
        const shape = (s.inputSchema as { shape?: () => Record<string, unknown> }).shape?.();
        if (shape) {
          result += `  Parameters: ${JSON.stringify(Object.keys(shape))}\n`;
        }
      }
    });

    return result;
  }

  private synthesizePartialAnswer(): string {
    if (this.state.steps.length === 0) return 'No progress made.';

    const lastStep = this.state.steps[this.state.steps.length - 1];
    return `Partial result after ${this.state.steps.length} steps: ${lastStep.observation}`;
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
    };
  }

  private getDefaultSystemPrompt(): string {
    return `You are an AI assistant that solves problems through reasoning and acting.
You follow the ReAct pattern: Thought → Action → Observation.

Guidelines:
1. Think step by step about the problem
2. Choose appropriate actions (tools/skills) to gather information
3. You can execute multiple independent tools in parallel
4. Observe the results and adapt your strategy
5. When you have enough information, provide the final answer
6. Be concise but thorough in your reasoning

Output Format for Actions:
- For tools: tool:tool_name({"param1": "value1", "param2": "value2"})
- For skills: skill:skill_name({"param1": "value1"})
- To finish: finish:{"answer": "your final answer"}
- To think more: think:{"thought": "your reasoning"}

Examples:
User: What is the weather in Tokyo?
Thought: I need to check the current weather in Tokyo.
Action: tool:weather({"city": "Tokyo"})
Observation: Temperature: 22°C, Clear sky
Thought: I have the weather information.
Action: finish:{"answer": "The current weather in Tokyo is 22°C with clear skies."}`;
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
