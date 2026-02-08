/**
 * Reflection System
 * Self-improvement through observation, evaluation, and refinement
 * Reference: Reflexion, Self-Refine, Voyager
 */

import { EventEmitter } from '../../../utils/event-emitter';
import { v4 as uuidv4 } from 'uuid';

// ============================================================================
// Core Types
// ============================================================================

export interface ReflectionContext {
  task: string;
  input: unknown;
  output: unknown;
  metadata: Record<string, unknown>;
  timestamp: number;
}

export interface ReflectionOutcome {
  success: boolean;
  score: number;
  feedback: string;
  improvements: string[];
}

export interface ReflectionRecord {
  id: string;
  context: ReflectionContext;
  outcome: ReflectionOutcome;
  lessons: Lesson[];
  createdAt: number;
}

export interface Lesson {
  id: string;
  category: string;
  insight: string;
  applicability: string[];
  confidence: number;
  usageCount: number;
}

export interface RefinementStrategy {
  id: string;
  name: string;
  description: string;
  condition: (context: ReflectionContext) => boolean;
  apply: (input: unknown, lessons: Lesson[]) => Promise<unknown>;
}

export interface ReflectionConfig {
  maxReflections: number;
  minConfidence: number;
  similarityThreshold: number;
  enableSelfCorrection: boolean;
  maxIterations: number;
}

// ============================================================================
// Evaluator Interface
// ============================================================================

export interface Evaluator {
  evaluate(context: ReflectionContext): Promise<ReflectionOutcome>;
}

export class LLMEvaluator implements Evaluator {
  constructor(_llm: unknown) {
    // LLM is used for evaluation
    void _llm;
  }

  async evaluate(context: ReflectionContext): Promise<ReflectionOutcome> {
    // Use LLM to evaluate output quality
    // This is a placeholder - actual implementation would call LLM
    // Build prompt from context (used for LLM evaluation)
    void `Evaluate the following output for task: ${context.task}
Input: ${JSON.stringify(context.input)}
Output: ${JSON.stringify(context.output)}

Provide:
1. Success (true/false)
2. Score (0-1)
3. Feedback
4. Improvement suggestions`;

    // Mock evaluation - use context to avoid unused variable warning
    void context;

    return {
      success: true,
      score: 0.85,
      feedback: 'Good output with minor improvements possible',
      improvements: ['Be more concise', 'Add examples'],
    };
  }
}

// ============================================================================
// Memory System
// ============================================================================

export interface ReflectionMemory {
  save(record: ReflectionRecord): Promise<void>;
  findSimilar(context: ReflectionContext, threshold: number): Promise<ReflectionRecord[]>;
  getLessons(category?: string): Promise<Lesson[]>;
  updateLesson(lesson: Lesson): Promise<void>;
}

export class InMemoryReflectionMemory implements ReflectionMemory {
  private records: ReflectionRecord[] = [];
  private lessons = new Map<string, Lesson>();

  async save(record: ReflectionRecord): Promise<void> {
    this.records.push(record);

    // Extract and save lessons
    for (const lesson of record.lessons) {
      this.lessons.set(lesson.id, lesson);
    }
  }

  async findSimilar(context: ReflectionContext, threshold: number): Promise<ReflectionRecord[]> {
    // Simple similarity based on task matching
    return this.records.filter(record => {
      const taskSimilarity = this._calculateSimilarity(record.context.task, context.task);
      return taskSimilarity >= threshold;
    });
  }

  async getLessons(category?: string): Promise<Lesson[]> {
    const allLessons = Array.from(this.lessons.values());
    if (category) {
      return allLessons.filter(l => l.category === category);
    }
    return allLessons;
  }

  async updateLesson(lesson: Lesson): Promise<void> {
    this.lessons.set(lesson.id, lesson);
  }

  private _calculateSimilarity(a: string, b: string): number {
    // Simple Jaccard similarity
    const setA = new Set(a.toLowerCase().split(/\s+/));
    const setB = new Set(b.toLowerCase().split(/\s+/));
    const intersection = new Set([...setA].filter(x => setB.has(x)));
    const union = new Set([...setA, ...setB]);
    return intersection.size / union.size;
  }
}

// ============================================================================
// Reflection Engine
// ============================================================================

export class ReflectionEngine extends EventEmitter {
  private config: ReflectionConfig;
  private evaluator: Evaluator;
  private memory: ReflectionMemory;
  private strategies: RefinementStrategy[] = [];

  constructor(
    config: Partial<ReflectionConfig>,
    evaluator: Evaluator,
    memory: ReflectionMemory
  ) {
    super();
    this.config = {
      maxReflections: 1000,
      minConfidence: 0.7,
      similarityThreshold: 0.8,
      enableSelfCorrection: true,
      maxIterations: 3,
      ...config,
    };
    this.evaluator = evaluator;
    this.memory = memory;
  }

  /**
   * Register a refinement strategy
   */
  registerStrategy(strategy: RefinementStrategy): void {
    this.strategies.push(strategy);
    this.emit('strategy:registered', { strategyId: strategy.id });
  }

  /**
   * Execute with reflection and self-improvement
   */
  async execute<TInput, TOutput>(
    task: string,
    input: TInput,
    executor: (input: TInput) => Promise<TOutput>
  ): Promise<{
    output: TOutput;
    iterations: number;
    improvements: string[];
    finalScore: number;
  }> {
    let currentInput: unknown = input;
    let currentOutput: unknown;
    let iteration = 0;
    const allImprovements: string[] = [];

    this.emit('execution:started', { task, input });

    while (iteration < this.config.maxIterations) {
      iteration++;

      // Execute
      currentOutput = await executor(currentInput as TInput);

      // Create reflection context
      const context: ReflectionContext = {
        task,
        input: currentInput,
        output: currentOutput,
        metadata: { iteration },
        timestamp: Date.now(),
      };

      // Evaluate
      const outcome = await this.evaluator.evaluate(context);
      this.emit('evaluation:completed', { iteration, score: outcome.score });

      // Store reflection
      await this._reflect(context, outcome);

      allImprovements.push(...outcome.improvements);

      // Check if good enough
      if (outcome.success && outcome.score >= this.config.minConfidence) {
        this.emit('execution:completed', { iterations: iteration, score: outcome.score });
        return {
          output: currentOutput as TOutput,
          iterations: iteration,
          improvements: allImprovements,
          finalScore: outcome.score,
        };
      }

      // Try to improve if self-correction is enabled
      if (this.config.enableSelfCorrection && iteration < this.config.maxIterations) {
        const refined = await this._refine(context, outcome);
        if (refined !== undefined) {
          currentInput = refined;
          this.emit('refinement:applied', { iteration });
        } else {
          break;
        }
      } else {
        break;
      }
    }

    this.emit('execution:completed', { iterations: iteration });
    return {
      output: currentOutput as TOutput,
      iterations: iteration,
      improvements: allImprovements,
      finalScore: 0,
    };
  }

  /**
   * Reflect on an outcome and extract lessons
   */
  private async _reflect(
    context: ReflectionContext,
    outcome: ReflectionOutcome
  ): Promise<void> {
    // Find similar past reflections
    const similar = await this.memory.findSimilar(context, this.config.similarityThreshold);

    // Extract lessons
    const lessons: Lesson[] = [];

    if (!outcome.success) {
      // Learn from failure
      lessons.push({
        id: uuidv4(),
        category: 'failure',
        insight: outcome.feedback,
        applicability: [context.task],
        confidence: outcome.score,
        usageCount: 0,
      });
    }

    for (const improvement of outcome.improvements) {
      lessons.push({
        id: uuidv4(),
        category: 'improvement',
        insight: improvement,
        applicability: [context.task],
        confidence: outcome.score,
        usageCount: 0,
      });
    }

    // Use similar to avoid unused variable warning
    void similar;

    // Create reflection record
    const record: ReflectionRecord = {
      id: uuidv4(),
      context,
      outcome,
      lessons,
      createdAt: Date.now(),
    };

    await this.memory.save(record);
    this.emit('reflection:saved', { recordId: record.id, lessons: lessons.length });
  }

  /**
   * Refine input based on past lessons
   */
  private async _refine(
    context: ReflectionContext,
    _outcome: ReflectionOutcome
  ): Promise<unknown | undefined> {
    // Get relevant lessons
    const lessons = await this.memory.getLessons();
    const relevantLessons = lessons.filter(l =>
      l.applicability.some(a => context.task.includes(a)) ||
      l.confidence >= this.config.minConfidence
    );

    if (relevantLessons.length === 0) {
      return undefined;
    }

    // Find applicable strategy
    for (const strategy of this.strategies) {
      if (strategy.condition(context)) {
        try {
          const refined = await strategy.apply(context.input, relevantLessons);
          return refined;
        } catch (error) {
          this.emit('refinement:failed', { strategyId: strategy.id, error });
        }
      }
    }

    return undefined;
  }

  /**
   * Get insights from past reflections
   */
  async getInsights(): Promise<{
    totalReflections: number;
    successRate: number;
    topLessons: Lesson[];
    commonFailures: string[];
  }> {
    const allLessons = await this.memory.getLessons();
    const failureLessons = allLessons.filter(l => l.category === 'failure');
    const improvementLessons = allLessons.filter(l => l.category === 'improvement');

    // Sort by confidence and usage
    const topLessons = [...allLessons]
      .sort((a, b) => b.confidence * b.usageCount - a.confidence * a.usageCount)
      .slice(0, 10);

    return {
      totalReflections: allLessons.length,
      successRate: improvementLessons.length / (allLessons.length || 1),
      topLessons,
      commonFailures: failureLessons.map(l => l.insight).slice(0, 5),
    };
  }

  /**
   * Generate self-improvement report
   */
  async generateReport(): Promise<string> {
    const insights = await this.getInsights();

    return `# Self-Improvement Report

## Statistics
- Total Reflections: ${insights.totalReflections}
- Success Rate: ${(insights.successRate * 100).toFixed(1)}%

## Top Lessons Learned
${insights.topLessons.map((l, i) => `${i + 1}. ${l.insight} (confidence: ${(l.confidence * 100).toFixed(0)}%)`).join('\n')}

## Common Failure Patterns
${insights.commonFailures.map((f, i) => `${i + 1}. ${f}`).join('\n')}

## Recommendations
Based on reflections, focus on:
${insights.topLessons.slice(0, 3).map(l => `- ${l.insight}`).join('\n')}
`;
  }
}

// ============================================================================
// Self-Improvement Loop
// ============================================================================

export class SelfImprovementLoop extends EventEmitter {
  private engine: ReflectionEngine;
  private isRunning = false;
  private interval?: NodeJS.Timeout;

  constructor(engine: ReflectionEngine) {
    super();
    this.engine = engine;
  }

  /**
   * Start continuous self-improvement
   */
  start(intervalMs: number = 60000): void {
    if (this.isRunning) return;

    this.isRunning = true;
    this.emit('loop:started');

    this.interval = setInterval(async () => {
      await this._improvementCycle();
    }, intervalMs);
  }

  /**
   * Stop self-improvement loop
   */
  stop(): void {
    if (!this.isRunning) return;

    this.isRunning = false;
    if (this.interval) {
      clearInterval(this.interval);
    }
    this.emit('loop:stopped');
  }

  /**
   * Run one improvement cycle
   */
  private async _improvementCycle(): Promise<void> {
    this.emit('cycle:started');

    try {
      const insights = await this.engine.getInsights();
      this.emit('cycle:insights', insights);

      // Generate and log report
      const report = await this.engine.generateReport();
      this.emit('cycle:report', report);

    } catch (error) {
      this.emit('cycle:error', error);
    }

    this.emit('cycle:completed');
  }
}

// ============================================================================
// Factory Functions
// ============================================================================

export function createReflectionEngine(
  evaluator: Evaluator,
  config?: Partial<ReflectionConfig>
): ReflectionEngine {
  const memory = new InMemoryReflectionMemory();
  return new ReflectionEngine(config || {}, evaluator, memory);
}

export function createLLMEvaluator(llm: unknown): LLMEvaluator {
  return new LLMEvaluator(llm);
}

export default ReflectionEngine;
