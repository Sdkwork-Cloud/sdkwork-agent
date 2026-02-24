/**
 * Pipeline and Workflow Engine - 管道和工作流引擎
 *
 * 提供灵活的数据处理流水线
 * - 管道模式
 * - 工作流编排
 * - 条件分支
 * - 并行执行
 *
 * @module Framework/Pipeline
 * @version 1.0.0
 */

import { createLogger, type ILogger } from '../utils/logger.js';

export type PipelineStep<T, R = T> = (input: T) => R | Promise<R>;

export interface PipelineStepConfig<T, R = T> {
  name: string;
  handler: PipelineStep<T, R>;
  condition?: (input: T) => boolean;
  onError?: (error: Error, input: T) => T | R;
  timeout?: number;
  retry?: number;
}

export interface PipelineConfig {
  name?: string;
  continueOnError?: boolean;
  logger?: ILogger;
}

export interface PipelineResult<T> {
  success: boolean;
  result?: T;
  error?: Error;
  steps: Array<{
    name: string;
    success: boolean;
    duration: number;
    error?: Error;
  }>;
  totalDuration: number;
}

export interface WorkflowConfig {
  name?: string;
  logger?: ILogger;
}

export interface WorkflowStep<T = unknown> {
  id: string;
  name: string;
  handler: (context: WorkflowContext<T>) => unknown | Promise<unknown>;
  dependencies?: string[];
  condition?: (context: WorkflowContext<T>) => boolean;
  onSkip?: (context: WorkflowContext<T>) => void;
  onError?: (error: Error, context: WorkflowContext<T>) => void;
  timeout?: number;
  retry?: number;
  optional?: boolean;
}

export interface WorkflowContext<T = unknown> {
  id: string;
  data: T;
  results: Map<string, unknown>;
  errors: Map<string, Error>;
  metadata: Record<string, unknown>;
  startTime: number;
  currentStep?: string;
}

export interface WorkflowResult<T = unknown> {
  success: boolean;
  context: WorkflowContext<T>;
  completedSteps: string[];
  skippedSteps: string[];
  failedSteps: string[];
  totalDuration: number;
}

export class Pipeline<T = unknown> {
  private steps: Array<PipelineStepConfig<unknown, unknown>> = [];
  private config: { name: string; continueOnError: boolean };
  private logger: ILogger;

  constructor(config: PipelineConfig = {}) {
    this.config = {
      name: config.name ?? 'Pipeline',
      continueOnError: config.continueOnError ?? false,
    };
    this.logger = config.logger ?? createLogger({ name: this.config.name });
  }

  pipe<R>(step: PipelineStep<T, R> | PipelineStepConfig<T, R>): Pipeline<T & R> {
    const stepConfig: PipelineStepConfig<unknown, unknown> = typeof step === 'function'
      ? { name: `step_${this.steps.length}`, handler: step as PipelineStep<unknown, unknown> }
      : step as PipelineStepConfig<unknown, unknown>;

    this.steps.push(stepConfig);
    return this as unknown as Pipeline<T & R>;
  }

  pipeIf<R>(
    condition: (input: T) => boolean,
    trueStep: PipelineStep<T, R>,
    falseStep?: PipelineStep<T, R>
  ): Pipeline<T & R> {
    this.steps.push({
      name: `conditional_${this.steps.length}`,
      handler: async (input: unknown) => {
        const typedInput = input as T;
        if (condition(typedInput)) {
          return trueStep(typedInput);
        } else if (falseStep) {
          return falseStep(typedInput);
        }
        return input;
      },
    });
    return this as unknown as Pipeline<T & R>;
  }

  pipeParallel<R extends Record<string, unknown>>(
    steps: Record<string, PipelineStep<T, unknown>>
  ): Pipeline<T & R> {
    this.steps.push({
      name: `parallel_${this.steps.length}`,
      handler: async (input: unknown) => {
        const typedInput = input as T;
        const entries = Object.entries(steps);
        const results = await Promise.all(
          entries.map(async ([key, step]) => [key, await step(typedInput)])
        );
        return Object.fromEntries(results) as R;
      },
    });
    return this as unknown as Pipeline<T & R>;
  }

  async execute(input: T): Promise<PipelineResult<T>> {
    const stepResults: PipelineResult<T>['steps'] = [];
    let currentInput: unknown = input;
    const startTime = Date.now();
    let success = true;
    let finalError: Error | undefined;

    for (const step of this.steps) {
      const stepStart = Date.now();
      let stepSuccess = true;
      let stepError: Error | undefined;

      try {
        if (step.condition && !step.condition(currentInput)) {
          stepResults.push({
            name: step.name,
            success: true,
            duration: Date.now() - stepStart,
          });
          continue;
        }

        const result = await this.executeStep(step, currentInput);
        currentInput = result;
      } catch (error) {
        stepSuccess = false;
        stepError = error as Error;
        success = false;
        finalError = stepError;

        if (step.onError) {
          try {
            currentInput = step.onError(stepError, currentInput as T);
            stepSuccess = true;
            success = true;
            finalError = undefined;
          } catch (recoveryError) {
            this.logger.error(`Recovery failed for step ${step.name}`, { error: recoveryError });
          }
        }

        if (!stepSuccess && !this.config.continueOnError) {
          stepResults.push({
            name: step.name,
            success: false,
            duration: Date.now() - stepStart,
            error: stepError,
          });
          break;
        }
      }

      stepResults.push({
        name: step.name,
        success: stepSuccess,
        duration: Date.now() - stepStart,
        error: stepError,
      });
    }

    return {
      success,
      result: success ? currentInput as T : undefined,
      error: finalError,
      steps: stepResults,
      totalDuration: Date.now() - startTime,
    };
  }

  private async executeStep(
    step: PipelineStepConfig<unknown, unknown>,
    input: unknown
  ): Promise<unknown> {
    if (step.timeout) {
      return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
          reject(new Error(`Step ${step.name} timed out after ${step.timeout}ms`));
        }, step.timeout);

        Promise.resolve(step.handler(input))
          .then(result => {
            clearTimeout(timer);
            resolve(result);
          })
          .catch(error => {
            clearTimeout(timer);
            reject(error);
          });
      });
    }

    return step.handler(input);
  }

  getStepNames(): string[] {
    return this.steps.map(s => s.name);
  }

  getStepCount(): number {
    return this.steps.length;
  }
}

export class WorkflowEngine<T = unknown> {
  private steps: Map<string, WorkflowStep<T>> = new Map();
  private config: { name: string };
  private logger: ILogger;
  private idCounter = 0;

  constructor(config: WorkflowConfig = {}) {
    this.config = {
      name: config.name ?? 'WorkflowEngine',
    };
    this.logger = config.logger ?? createLogger({ name: this.config.name });
  }

  addStep(step: WorkflowStep<T>): this {
    this.steps.set(step.id, step);
    return this;
  }

  removeStep(id: string): boolean {
    return this.steps.delete(id);
  }

  async execute(data: T): Promise<WorkflowResult<T>> {
    const context: WorkflowContext<T> = {
      id: this.generateId(),
      data,
      results: new Map(),
      errors: new Map(),
      metadata: {},
      startTime: Date.now(),
    };

    const completedSteps: string[] = [];
    const skippedSteps: string[] = [];
    const failedSteps: string[] = [];

    const sortedSteps = this.topologicalSort();

    for (const step of sortedSteps) {
      context.currentStep = step.id;

      const dependenciesMet = this.checkDependencies(step, completedSteps);
      if (!dependenciesMet) {
        skippedSteps.push(step.id);
        if (step.onSkip) {
          step.onSkip(context);
        }
        continue;
      }

      if (step.condition && !step.condition(context)) {
        skippedSteps.push(step.id);
        if (step.onSkip) {
          step.onSkip(context);
        }
        continue;
      }

      try {
        const result = await this.executeStep(step, context);
        context.results.set(step.id, result);
        completedSteps.push(step.id);
        this.logger.debug(`Step completed: ${step.name}`);
      } catch (error) {
        context.errors.set(step.id, error as Error);
        failedSteps.push(step.id);

        if (step.onError) {
          step.onError(error as Error, context);
        }

        if (!step.optional) {
          this.logger.error(`Workflow failed at step: ${step.name}`, { error });
          break;
        }

        this.logger.warn(`Optional step failed: ${step.name}`, { error });
      }
    }

    return {
      success: failedSteps.filter(id => !this.steps.get(id)?.optional).length === 0,
      context,
      completedSteps,
      skippedSteps,
      failedSteps,
      totalDuration: Date.now() - context.startTime,
    };
  }

  private checkDependencies(step: WorkflowStep<T>, completedSteps: string[]): boolean {
    if (!step.dependencies || step.dependencies.length === 0) {
      return true;
    }

    return step.dependencies.every(depId => completedSteps.includes(depId));
  }

  private async executeStep(step: WorkflowStep<T>, context: WorkflowContext<T>): Promise<unknown> {
    if (step.timeout) {
      return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
          reject(new Error(`Step ${step.name} timed out after ${step.timeout}ms`));
        }, step.timeout);

        Promise.resolve(step.handler(context))
          .then(result => {
            clearTimeout(timer);
            resolve(result);
          })
          .catch(error => {
            clearTimeout(timer);
            reject(error);
          });
      });
    }

    return step.handler(context);
  }

  private topologicalSort(): WorkflowStep<T>[] {
    const sorted: WorkflowStep<T>[] = [];
    const visited = new Set<string>();
    const visiting = new Set<string>();

    const visit = (id: string): void => {
      if (visited.has(id)) return;
      if (visiting.has(id)) {
        throw new Error(`Circular dependency detected at step: ${id}`);
      }

      visiting.add(id);
      const step = this.steps.get(id);
      if (step) {
        for (const depId of step.dependencies ?? []) {
          visit(depId);
        }
        sorted.push(step);
      }
      visiting.delete(id);
      visited.add(id);
    };

    for (const [id] of this.steps) {
      visit(id);
    }

    return sorted;
  }

  private generateId(): string {
    return `wf_${Date.now()}_${++this.idCounter}`;
  }
}

export class PipelineBuilder<T = unknown> {
  private pipeline: Pipeline<T>;

  constructor(config?: PipelineConfig) {
    this.pipeline = new Pipeline<T>(config);
  }

  step<R>(handler: PipelineStep<T, R>, name?: string): PipelineBuilder<T & R> {
    this.pipeline.pipe<R>({ name: name ?? `step_${this.pipeline.getStepCount()}`, handler });
    return this as unknown as PipelineBuilder<T & R>;
  }

  stepIf<R>(
    condition: (input: T) => boolean,
    trueHandler: PipelineStep<T, R>,
    falseHandler?: PipelineStep<T, R>
  ): PipelineBuilder<T & R> {
    this.pipeline.pipeIf(condition, trueHandler, falseHandler);
    return this as unknown as PipelineBuilder<T & R>;
  }

  parallel<R extends Record<string, unknown>>(
    steps: Record<string, PipelineStep<T, unknown>>
  ): PipelineBuilder<T & R> {
    this.pipeline.pipeParallel<R>(steps);
    return this as unknown as PipelineBuilder<T & R>;
  }

  build(): Pipeline<T> {
    return this.pipeline;
  }
}

export class WorkflowBuilder<T = unknown> {
  private engine: WorkflowEngine<T>;
  private steps: WorkflowStep<T>[] = [];

  constructor(config?: WorkflowConfig) {
    this.engine = new WorkflowEngine<T>(config);
  }

  addStep(config: Omit<WorkflowStep<T>, 'id'>): this {
    const step: WorkflowStep<T> = {
      ...config,
      id: `step_${this.steps.length}`,
    };
    this.steps.push(step);
    this.engine.addStep(step);
    return this;
  }

  build(): WorkflowEngine<T> {
    return this.engine;
  }
}

export function pipeline<T = unknown>(config?: PipelineConfig): PipelineBuilder<T> {
  return new PipelineBuilder<T>(config);
}

export function workflow<T = unknown>(config?: WorkflowConfig): WorkflowBuilder<T> {
  return new WorkflowBuilder<T>(config);
}

export function createPipeline<T = unknown>(config?: PipelineConfig): Pipeline<T> {
  return new Pipeline<T>(config);
}

export function createWorkflowEngine<T = unknown>(config?: WorkflowConfig): WorkflowEngine<T> {
  return new WorkflowEngine<T>(config);
}
