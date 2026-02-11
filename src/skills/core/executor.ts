/**
 * Skill Executor
 *
 * Handles skill execution with validation, timeout, and error handling
 */

import {
  Skill,
  SkillResult,
  ExecutionContext,
  ISkillExecutor,
  SkillError,
  ExecutionMetadata,
  Logger,
} from './types';

/**
 * Executor configuration
 */
export interface ExecutorConfig {
  /** Default timeout in milliseconds */
  defaultTimeout?: number;
  /** Enable input validation */
  enableValidation?: boolean;
  /** Enable metrics collection */
  enableMetrics?: boolean;
}

/**
 * Skill Executor Implementation
 */
export class SkillExecutor implements ISkillExecutor {
  private config: Required<ExecutorConfig>;
  private logger: Logger;

  constructor(logger: Logger, config: ExecutorConfig = {}) {
    this.logger = logger;
    this.config = {
      defaultTimeout: 30000,
      enableValidation: true,
      enableMetrics: true,
      ...config,
    };
  }

  /**
   * Execute a skill
   */
  async execute(
    skill: Skill,
    input: unknown,
    context: ExecutionContext
  ): Promise<SkillResult> {
    const startTime = Date.now();

    try {
      // Validate input if enabled
      if (this.config.enableValidation) {
        input = await this.validateInput(skill, input);
      }

      // Execute skill
      this.logger.info(`Executing skill: ${skill.name}`, {
        executionId: context.executionId,
      });

      const result = await skill.execute(input, context);

      // Add metadata
      const metadata: ExecutionMetadata = {
        startTime: new Date(startTime),
        endTime: new Date(),
        duration: Date.now() - startTime,
      };

      return {
        ...result,
        metadata,
      };
    } catch (error) {
      this.logger.error(`Skill execution failed: ${skill.name}`, {
        error,
        executionId: context.executionId,
      });

      return {
        success: false,
        error: this.normalizeError(error),
        metadata: {
          startTime: new Date(startTime),
          endTime: new Date(),
          duration: Date.now() - startTime,
        },
      };
    }
  }

  /**
   * Execute with timeout
   */
  async executeWithTimeout(
    skill: Skill,
    input: unknown,
    context: ExecutionContext,
    timeoutMs: number
  ): Promise<SkillResult> {
    const startTime = Date.now();

    // Create timeout promise
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new SkillError(
          `Skill execution timed out after ${timeoutMs}ms`,
          'TIMEOUT',
          false
        ));
      }, timeoutMs);
    });

    try {
      // Race between execution and timeout
      const result = await Promise.race([
        this.execute(skill, input, context),
        timeoutPromise,
      ]);

      return result;
    } catch (error) {
      this.logger.error(`Skill execution failed or timed out: ${skill.name}`, {
        error,
        executionId: context.executionId,
      });

      return {
        success: false,
        error: this.normalizeError(error),
        metadata: {
          startTime: new Date(startTime),
          endTime: new Date(),
          duration: Date.now() - startTime,
        },
      };
    }
  }

  /**
   * Validate input against skill schema
   */
  private async validateInput(skill: Skill, input: unknown): Promise<unknown> {
    try {
      return skill.inputSchema.parse(input);
    } catch (error) {
      if (error instanceof Error) {
        throw new SkillError(
          `Input validation failed: ${error.message}`,
          'VALIDATION_ERROR',
          true,
          error
        );
      }
      throw error;
    }
  }

  /**
   * Normalize error to SkillError
   */
  private normalizeError(error: unknown): SkillError {
    if (error instanceof SkillError) {
      return error;
    }

    if (error instanceof Error) {
      return new SkillError(
        error.message,
        'EXECUTION_ERROR',
        false,
        error
      );
    }

    return new SkillError(
      String(error) || 'Unknown error',
      'UNKNOWN_ERROR',
      false
    );
  }
}

/**
 * Create a new SkillExecutor instance
 */
export function createSkillExecutor(logger: Logger, config?: ExecutorConfig): SkillExecutor {
  return new SkillExecutor(logger, config);
}
