/**
 * Prompt Optimization Skill
 *
 * Optimizes prompts for better results with LLMs and generative AI.
 * Use when the user wants to improve a prompt or make it more effective.
 */

import { z } from 'zod';
import { SkillError, type Skill, type SkillResult, type ExecutionContext } from '../core/types.js';

// ============================================================================
// Input/Output Schemas
// ============================================================================

const inputSchema = z.object({
  /** The prompt to optimize */
  prompt: z.string().min(1).describe('The prompt to optimize'),

  /** What the prompt is for */
  for: z
    .enum(['text', 'image', 'video', 'code', 'system', 'reasoning', 'creative'])
    .optional()
    .describe('What the prompt is for (auto-detected if not specified)'),

  /** Style preference */
  style: z
    .enum(['clear', 'detailed', 'concise', 'creative', 'technical'])
    .optional()
    .describe('Optimization style preference'),
});

const outputSchema = z.object({
  /** The optimized prompt */
  optimized: z.string().describe('The optimized prompt'),

  /** Detected or specified type */
  type: z.string().describe('The detected prompt type'),

  /** List of improvements made */
  improvements: z.array(z.string()).describe('What was improved'),

  /** Confidence score */
  confidence: z.number().min(0).max(1).describe('Confidence in the optimization'),
});

// ============================================================================
// Type Definitions
// ============================================================================

type OptimizeInput = z.infer<typeof inputSchema>;
type OptimizeOutput = z.infer<typeof outputSchema>;

// ============================================================================
// Optimizer Functions
// ============================================================================

const optimizers: Record<string, (prompt: string, style?: string) => string> = {
  text: optimizeText,
  image: optimizeImage,
  video: optimizeVideo,
  code: optimizeCode,
  system: optimizeSystem,
  reasoning: optimizeReasoning,
  creative: optimizeCreative,
};

function optimizeText(prompt: string, style?: string): string {
  let result = prompt;

  // Add clarity if too short
  if (prompt.length < 30) {
    result += '. Please provide a detailed and well-structured response.';
  }

  // Add structure guidance
  if (!prompt.includes('format') && !prompt.includes('structure')) {
    result += ' Use clear sections and bullet points where appropriate.';
  }

  // Apply style
  switch (style) {
    case 'detailed':
      result += ' Include examples and thorough explanations.';
      break;
    case 'concise':
      result = result.replace(/\.\s+Please provide.*$/, '. Be brief and to the point.');
      break;
    case 'technical':
      result += ' Use precise terminology and technical accuracy.';
      break;
  }

  return result;
}

function optimizeImage(prompt: string): string {
  const enhancers = ['masterpiece', 'best quality', 'highly detailed'];
  const hasEnhancers = enhancers.some((e) => prompt.toLowerCase().includes(e));

  if (!hasEnhancers) {
    return `masterpiece, best quality, highly detailed, ${prompt}, 8k, sharp focus`;
  }
  return prompt;
}

function optimizeVideo(prompt: string): string {
  if (!prompt.toLowerCase().includes('motion')) {
    return `${prompt}, smooth motion, cinematic camera movement, high fidelity`;
  }
  return prompt;
}

function optimizeCode(prompt: string): string {
  let result = prompt;

  if (!prompt.includes('language') && !prompt.includes('in ')) {
    result = `Write clean, well-documented code to ${prompt}`;
  }

  if (!prompt.includes('error') && !prompt.includes('handle')) {
    result += '. Include proper error handling and input validation.';
  }

  return result;
}

function optimizeSystem(prompt: string): string {
  if (!prompt.toLowerCase().startsWith('you are')) {
    return `You are ${prompt}\n\nProvide helpful, accurate, and safe responses.`;
  }
  return prompt;
}

function optimizeReasoning(prompt: string): string {
  if (!prompt.includes('step') && !prompt.includes('think')) {
    return `${prompt}\n\nThink through this step-by-step, showing your reasoning.`;
  }
  return prompt;
}

function optimizeCreative(prompt: string): string {
  if (!prompt.includes('creative') && !prompt.includes('original')) {
    return `${prompt}\n\nBe creative and original. Use vivid imagery and engaging language.`;
  }
  return prompt;
}

// ============================================================================
// Helper Functions
// ============================================================================

function detectType(prompt: string): string {
  const p = prompt.toLowerCase();

  if (p.includes('image') || p.includes('picture') || p.includes('photo') || p.includes('draw')) {
    return 'image';
  }
  if (p.includes('video') || p.includes('animation') || p.includes('motion')) {
    return 'video';
  }
  if (p.includes('code') || p.includes('function') || p.includes('program') || p.includes('script')) {
    return 'code';
  }
  if (p.includes('system') || p.includes('you are') || p.includes('act as')) {
    return 'system';
  }
  if (p.includes('solve') || p.includes('calculate') || p.includes('analyze') || p.includes('reason')) {
    return 'reasoning';
  }
  if (p.includes('story') || p.includes('poem') || p.includes('creative') || p.includes('write')) {
    return 'creative';
  }

  return 'text';
}

function generateImprovements(original: string, optimized: string, type: string): string[] {
  const improvements: string[] = [];

  if (optimized.length > original.length) {
    improvements.push('Added clarity and detail');
  }

  if (type === 'image' && !original.includes('quality')) {
    improvements.push('Added quality modifiers');
  }

  if (type === 'code' && !original.includes('error')) {
    improvements.push('Added error handling guidance');
  }

  if (type === 'text' && !original.includes('format')) {
    improvements.push('Added output format guidance');
  }

  return improvements;
}

function calculateConfidence(input: OptimizeInput, _type: string): number {
  let confidence = 0.8;

  // Higher confidence if type is explicitly specified
  if (input.for) {
    confidence += 0.1;
  }

  // Higher confidence for longer prompts
  if (input.prompt.length > 50) {
    confidence += 0.05;
  }

  // Lower confidence for very short prompts
  if (input.prompt.length < 10) {
    confidence -= 0.1;
  }

  return Math.min(0.95, confidence);
}

// ============================================================================
// Skill Implementation
// ============================================================================

export class PromptOptimizationSkill implements Skill {
  readonly name = 'prompt-optimization';
  readonly description =
    'Optimize prompts for better results with LLMs and generative AI. Use when the user wants to improve a prompt, make it more effective, or adapt it for a specific purpose.';
  readonly version = '2.0.0';
  readonly inputSchema = inputSchema;

  async execute(input: OptimizeInput, context: ExecutionContext): Promise<SkillResult<OptimizeOutput>> {
    try {
      context.logger.debug('Optimizing prompt', { prompt: input.prompt });

      // Detect type if not provided
      const type = input.for || detectType(input.prompt);

      // Get optimizer
      const optimizer = optimizers[type] || optimizers.text;

      // Optimize
      const optimized = optimizer(input.prompt, input.style);

      // Generate results
      const result: OptimizeOutput = {
        optimized,
        type,
        improvements: generateImprovements(input.prompt, optimized, type),
        confidence: calculateConfidence(input, type),
      };

      context.logger.info('Prompt optimized', {
        type,
        confidence: result.confidence,
        improvements: result.improvements.length,
      });

      return {
        success: true,
        data: result,
      };
    } catch (error) {
      context.logger.error('Prompt optimization failed', { error });

      return {
        success: false,
        error: new SkillError(
          error instanceof Error ? error.message : 'Unknown error',
          'OPTIMIZATION_FAILED',
          false
        ),
      };
    }
  }
}

// ============================================================================
// Factory
// ============================================================================

export function createPromptOptimizationSkill(): PromptOptimizationSkill {
  return new PromptOptimizationSkill();
}

// ============================================================================
// Default Export
// ============================================================================

export const promptOptimizationSkill = new PromptOptimizationSkill();
export default promptOptimizationSkill;
