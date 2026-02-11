/**
 * Intelligent Parameter Extractor
 *
 * 智能参数提取器 - 实现多层级参数传递
 *
 * 核心特性：
 * 1. 结构化参数解析 (JSON Schema验证)
 * 2. 自然语言参数提取 (Few-shot Learning)
 * 3. 上下文隐式参数推断
 * 4. 资源引用解析
 * 5. 多模态参数支持
 *
 * @module IntelligentParameterExtractor
 * @version 1.0.0
 * @standard Industry Leading
 */

import * as z from 'zod';
import type { LLMService } from './intent-recognizer.js';

/** Logger interface */
interface Logger {
  debug: (...args: any[]) => void;
  info: (...args: any[]) => void;
  warn: (...args: any[]) => void;
  error: (...args: any[]) => void;
}

// ============================================================================
// Types
// ============================================================================

/**
 * 参数定义
 */
export interface ParameterDefinition {
  name: string;
  description: string;
  type: 'string' | 'number' | 'boolean' | 'array' | 'object' | 'file' | 'url' | 'integer' | 'email' | 'date';
  required?: boolean;
  default?: unknown;
  enum?: unknown[];
  examples?: unknown[];
  minimum?: number;
  maximum?: number;
  items?: ParameterDefinition;
  properties?: Record<string, ParameterDefinition>;
}

/**
 * 提取上下文
 */
export interface ExtractionContext {
  /** 对话历史 */
  history: Array<{
    role: 'user' | 'assistant' | 'skill';
    content: string;
    timestamp: Date;
    metadata?: Record<string, unknown>;
  }>;
  /** 用户偏好 */
  userPreferences: Record<string, unknown>;
  /** 环境上下文 */
  environment: {
    cwd: string;
    variables: Record<string, string>;
    platform: string;
  };
  /** 之前的尝试 */
  previousAttempts?: Array<{
    params: Record<string, unknown>;
    error: string;
  }>;
  /** Few-shot示例 */
  examples?: Array<{
    input: string;
    output: Record<string, unknown>;
    description?: string;
  }>;
}

/**
 * 提取结果
 */
export interface ExtractionResult {
  success: boolean;
  params: Record<string, unknown>;
  missing: string[];
  confidence: number;
  reasoning: string;
  source: 'structured' | 'natural_language' | 'context' | 'default' | 'mixed';
  errors?: Array<{
    param: string;
    error: string;
    suggestion?: string;
  }>;
}

/**
 * 输入类型
 */
export type InputType = 'structured' | 'natural_language' | 'mixed' | 'referential' | 'multimodal';

/**
 * 验证结果
 */
export interface ValidationResult {
  valid: boolean;
  errors: Array<{
    path: string;
    message: string;
    code: string;
  }>;
  data?: unknown;
}

// ============================================================================
// Intelligent Parameter Extractor
// ============================================================================

export interface ParameterExtractorConfig {
  llm: LLMService;
  logger?: Logger;
  /** 置信度阈值 */
  confidenceThreshold?: number;
  /** 最大重试次数 */
  maxRetries?: number;
  /** 启用Few-shot学习 */
  enableFewShot?: boolean;
  /** 启用上下文推断 */
  enableContextInference?: boolean;
  /** 启用自动修正 */
  enableAutoCorrection?: boolean;
}

/**
 * 智能参数提取器
 */
export class IntelligentParameterExtractor {
  private config: Required<ParameterExtractorConfig>;
  private logger: Logger;

  constructor(config: ParameterExtractorConfig) {
    this.config = {
      confidenceThreshold: 0.7,
      maxRetries: 3,
      enableFewShot: true,
      enableContextInference: true,
      enableAutoCorrection: true,
      logger: this.createDefaultLogger(),
      ...config,
    };
    this.logger = this.config.logger;
  }

  /**
   * 主提取方法
   *
   * 智能分析输入类型并选择最佳提取策略
   */
  async extract(
    userInput: string,
    schema: z.ZodSchema<unknown>,
    definitions: ParameterDefinition[],
    context: ExtractionContext
  ): Promise<ExtractionResult> {
    this.logger.debug('Starting parameter extraction', { inputLength: userInput.length });

    // 1. 分析输入类型
    const inputType = this.classifyInput(userInput);
    this.logger.debug(`Input classified as: ${inputType}`);

    // 2. 根据类型选择提取策略
    switch (inputType) {
      case 'structured':
        return this.extractStructured(userInput, schema, definitions, context);
      case 'natural_language':
        return this.extractNaturalLanguage(userInput, schema, definitions, context);
      case 'mixed':
        return this.extractMixed(userInput, schema, definitions, context);
      case 'referential':
        return this.extractReferential(userInput, schema, definitions, context);
      case 'multimodal':
        return this.extractMultimodal(userInput, schema, definitions, context);
      default:
        return this.extractNaturalLanguage(userInput, schema, definitions, context);
    }
  }

  /**
   * 分类输入类型
   */
  private classifyInput(input: string): InputType {
    const trimmed = input.trim();

    // 检查是否为纯JSON
    if ((trimmed.startsWith('{') && trimmed.endsWith('}')) ||
        (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
      try {
        JSON.parse(trimmed);
        return 'structured';
      } catch {
        // 不是有效JSON，继续检查
      }
    }

    // 检查是否包含JSON + 自然语言 (混合模式)
    const jsonMatches = trimmed.match(/\{[\s\S]*?\}/g);
    if (jsonMatches && jsonMatches.length > 0) {
      const nonJsonParts = trimmed.replace(/\{[\s\S]*?\}/g, '').trim();
      if (nonJsonParts.length > 10) {
        return 'mixed';
      }
    }

    // 检查是否为引用 (如 "使用刚才的文件")
    const referentialPatterns = [
      /刚才|之前|上文|前面|这个|那个/i,
      /(?:它|他|她|它们)/i,
      /同样的|相同的|类似的/i,
    ];
    if (referentialPatterns.some(p => p.test(trimmed))) {
      return 'referential';
    }

    // 检查是否为多模态 (包含文件路径、URL等)
    const multimodalPatterns = [
      /\.(jpg|jpeg|png|gif|pdf|doc|docx|csv|json)\b/i,
      /https?:\/\/\S+/i,
      /file:\/\/\S+/i,
      /\/\w+\/[^\s]+/,  // Unix路径
      /[A-Za-z]:\\[^\s]+/,  // Windows路径
    ];
    if (multimodalPatterns.some(p => p.test(trimmed))) {
      return 'multimodal';
    }

    return 'natural_language';
  }

  /**
   * 提取结构化参数
   */
  private async extractStructured(
    userInput: string,
    schema: z.ZodSchema<unknown>,
    _definitions: ParameterDefinition[],
    _context: ExtractionContext
  ): Promise<ExtractionResult> {
    try {
      const parsed = JSON.parse(userInput);
      const validation = await this.validateWithSchema(parsed, schema);

      if (validation.valid) {
        return {
          success: true,
          params: parsed as Record<string, unknown>,
          missing: [],
          confidence: 1.0,
          reasoning: 'Direct JSON parsing with schema validation',
          source: 'structured',
        };
      }

      return {
        success: false,
        params: parsed as Record<string, unknown>,
        missing: [],
        confidence: 0.5,
        reasoning: 'JSON parsed but schema validation failed',
        source: 'structured',
        errors: (validation.errors?.map((e: any) => ({
          param: e.path,
          error: e.message,
        })) ?? []),
      };
    } catch (error) {
      return {
        success: false,
        params: {},
        missing: [],
        confidence: 0,
        reasoning: `JSON parsing failed: ${(error as Error).message}`,
        source: 'structured',
      };
    }
  }

  /**
   * 自然语言参数提取
   *
   * 使用Few-shot Learning和Chain-of-Thought
   */
  private async extractNaturalLanguage(
    userInput: string,
    schema: z.ZodSchema<unknown>,
    definitions: ParameterDefinition[],
    context: ExtractionContext
  ): Promise<ExtractionResult> {
    const prompt = this.buildFewShotPrompt(userInput, definitions, context);

    try {
      const response = await this.config.llm.complete(prompt, {
        temperature: 0.2,
        maxTokens: 1000,
      });

      // 解析LLM响应
      const extracted = this.parseLLMResponse(response);

      // 验证提取的参数
      const validation = await this.validateWithSchema(extracted, schema);

      // 识别缺失的参数
      const missing = this.identifyMissingParams(extracted, definitions);

      // 尝试从上下文推断缺失参数
      let finalParams = extracted;
      let inferenceSource: ExtractionResult['source'] = 'natural_language';

      if (missing.length > 0 && this.config.enableContextInference) {
        const inferred = await this.inferFromContext(missing, context);
        finalParams = { ...extracted, ...inferred.params };
        if (Object.keys(inferred.params).length > 0) {
          inferenceSource = 'mixed';
        }
      }

      // 填充默认值
      const withDefaults = this.fillDefaults(finalParams, definitions);

      // 计算置信度
      const confidence = this.calculateConfidence(
        withDefaults,
        definitions,
        validation.valid,
        missing.length
      );

      return {
        success: validation.valid && missing.length === 0,
        params: withDefaults,
        missing: this.identifyMissingParams(withDefaults, definitions),
        confidence,
        reasoning: `Extracted using few-shot learning${inferenceSource === 'mixed' ? ' + context inference' : ''}`,
        source: inferenceSource,
        errors: validation.valid ? undefined : validation.errors.map(e => ({
          param: e.path,
          error: e.message,
        })),
      };
    } catch (error) {
      this.logger.error('Natural language extraction failed', { error });
      return {
        success: false,
        params: {},
        missing: definitions.filter(d => d.required !== false).map(d => d.name),
        confidence: 0,
        reasoning: `Extraction failed: ${(error as Error).message}`,
        source: 'natural_language',
      };
    }
  }

  /**
   * 混合模式提取
   *
   * 同时处理结构化部分和自然语言部分
   */
  private async extractMixed(
    userInput: string,
    schema: z.ZodSchema<unknown>,
    definitions: ParameterDefinition[],
    context: ExtractionContext
  ): Promise<ExtractionResult> {
    // 1. 提取JSON部分
    const jsonMatches = userInput.match(/\{[\s\S]*?\}/g) || [];
    let structuredParams: Record<string, unknown> = {};

    for (const json of jsonMatches) {
      try {
        const parsed = JSON.parse(json);
        structuredParams = { ...structuredParams, ...parsed };
      } catch {
        // 忽略无效的JSON
      }
    }

    // 2. 提取自然语言部分
    const naturalLanguagePart = userInput.replace(/\{[\s\S]*?\}/g, '').trim();

    if (naturalLanguagePart.length > 0) {
      // 获取尚未填充的参数定义
      const remainingDefs = definitions.filter(
        d => !(d.name in structuredParams)
      );

      if (remainingDefs.length > 0) {
        const nlResult = await this.extractNaturalLanguage(
          naturalLanguagePart,
          schema,
          remainingDefs,
          context
        );

        structuredParams = { ...structuredParams, ...nlResult.params };
      }
    }

    // 3. 验证和填充
    const validation = await this.validateWithSchema(structuredParams, schema);
    const withDefaults = this.fillDefaults(structuredParams, definitions);
    const missing = this.identifyMissingParams(withDefaults, definitions);

    return {
      success: validation.valid && missing.length === 0,
      params: withDefaults,
      missing,
      confidence: validation.valid ? 0.9 : 0.6,
      reasoning: 'Mixed extraction: structured JSON + natural language processing',
      source: 'mixed',
      errors: validation.valid ? undefined : validation.errors.map(e => ({
        param: e.path,
        error: e.message,
      })),
    };
  }

  /**
   * 引用式提取
   *
   * 从对话历史中提取引用内容
   */
  private async extractReferential(
    userInput: string,
    schema: z.ZodSchema<unknown>,
    definitions: ParameterDefinition[],
    context: ExtractionContext
  ): Promise<ExtractionResult> {
    // 分析引用意图
    const referentialPatterns: Array<{ pattern: RegExp; type: string }> = [
      { pattern: /刚才|之前提到的?/, type: 'recent' },
      { pattern: /上文的?|前面说的?/, type: 'previous_context' },
      { pattern: /同样的|相同的/, type: 'same_as_before' },
      { pattern: /这个|那个/, type: 'anaphora' },
    ];

    const matchedPattern = referentialPatterns.find(p => p.pattern.test(userInput));

    if (!matchedPattern) {
      // 无法识别引用模式，降级为自然语言提取
      return this.extractNaturalLanguage(userInput, schema, definitions, context);
    }

    // 从历史中查找相关参数
    const historicalParams = await this.findHistoricalParams(
      matchedPattern.type,
      context.history,
      definitions
    );

    // 合并当前输入中明确提到的参数
    const explicitParams = await this.extractNaturalLanguage(
      userInput,
      schema,
      definitions,
      context
    );

    const mergedParams = { ...historicalParams, ...explicitParams.params };
    const withDefaults = this.fillDefaults(mergedParams, definitions);
    const missing = this.identifyMissingParams(withDefaults, definitions);

    return {
      success: missing.length === 0,
      params: withDefaults,
      missing,
      confidence: 0.85,
      reasoning: `Referential extraction: ${matchedPattern.type} reference resolved`,
      source: 'context',
    };
  }

  /**
   * 多模态参数提取
   *
   * 处理文件、URL等资源引用
   */
  private async extractMultimodal(
    userInput: string,
    schema: z.ZodSchema<unknown>,
    definitions: ParameterDefinition[],
    context: ExtractionContext
  ): Promise<ExtractionResult> {
    const params: Record<string, unknown> = {};

    // 1. 提取文件路径
    const filePatterns = [
      /\/\w+\/[^\s]+/g,  // Unix绝对路径
      /[A-Za-z]:\\[^\s]+/g,  // Windows路径
      /\.\/[\w\-\.\/]+/g,  // 相对路径
      /[\w\-]+\.(jpg|jpeg|png|gif|pdf|doc|docx|csv|json|txt|md)/gi,  // 文件名
    ];

    for (const pattern of filePatterns) {
      const matches = userInput.match(pattern);
      if (matches) {
        // 查找对应的参数定义
        const fileParam = definitions.find(d =>
          d.type === 'file' ||
          d.name.includes('file') ||
          d.name.includes('path') ||
          d.name.includes('document')
        );
        if (fileParam) {
          params[fileParam.name] = matches[0];
        }
      }
    }

    // 2. 提取URL
    const urlPattern = /https?:\/\/[^\s]+/g;
    const urls = userInput.match(urlPattern);
    if (urls) {
      const urlParam = definitions.find(d =>
        d.type === 'url' ||
        d.name.includes('url') ||
        d.name.includes('link') ||
        d.name.includes('website')
      );
      if (urlParam) {
        params[urlParam.name] = urls[0];
      }
    }

    // 3. 提取剩余的自然语言参数
    const cleanedInput = userInput
      .replace(/\/\w+\/[^\s]+/g, '')
      .replace(/[A-Za-z]:\\[^\s]+/g, '')
      .replace(/https?:\/\/[^\s]+/g, '')
      .trim();

    if (cleanedInput.length > 0) {
      const remainingDefs = definitions.filter(d => !(d.name in params));
      const nlResult = await this.extractNaturalLanguage(
        cleanedInput,
        schema,
        remainingDefs,
        context
      );
      Object.assign(params, nlResult.params);
    }

    const withDefaults = this.fillDefaults(params, definitions);
    const missing = this.identifyMissingParams(withDefaults, definitions);

    return {
      success: missing.length === 0,
      params: withDefaults,
      missing,
      confidence: 0.88,
      reasoning: 'Multimodal extraction: files, URLs, and natural language',
      source: 'mixed',
    };
  }

  /**
   * 从上下文推断参数
   */
  private async inferFromContext(
    missingParams: string[],
    context: ExtractionContext
  ): Promise<{ params: Record<string, unknown>; confidence: number }> {
    const inferred: Record<string, unknown> = {};
    let totalConfidence = 0;

    for (const paramName of missingParams) {
      // 1. 从历史对话中查找
      const fromHistory = this.findInHistory(paramName, context.history);
      if (fromHistory.found) {
        inferred[paramName] = fromHistory.value;
        totalConfidence += fromHistory.confidence;
        continue;
      }

      // 2. 从用户偏好中查找
      if (paramName in context.userPreferences) {
        inferred[paramName] = context.userPreferences[paramName];
        totalConfidence += 0.9;
        continue;
      }

      // 3. 从环境变量中查找
      const envKey = paramName.toUpperCase();
      if (envKey in context.environment.variables) {
        inferred[paramName] = context.environment.variables[envKey];
        totalConfidence += 0.95;
      }
    }

    const avgConfidence = Object.keys(inferred).length > 0
      ? totalConfidence / Object.keys(inferred).length
      : 0;

    return { params: inferred, confidence: avgConfidence };
  }

  /**
   * 构建Few-shot提示词
   */
  private buildFewShotPrompt(
    userInput: string,
    definitions: ParameterDefinition[],
    context: ExtractionContext
  ): string {
    const lines: string[] = [
      'You are a parameter extraction assistant. Extract parameters from user input.',
      '',
      '## Parameter Definitions:',
    ];

    for (const def of definitions) {
      lines.push(`- ${def.name}: ${def.description} (${def.type})${def.required !== false ? ' [required]' : ''}`);
      if (def.examples) {
        lines.push(`  Examples: ${JSON.stringify(def.examples)}`);
      }
      if (def.enum) {
        lines.push(`  Allowed values: ${def.enum.join(', ')}`);
      }
    }

    // 添加Few-shot示例
    if (this.config.enableFewShot && context.examples && context.examples.length > 0) {
      lines.push('', '## Examples:');
      for (const example of context.examples.slice(0, 3)) {
        lines.push(`Input: "${example.input}"`);
        lines.push(`Output: ${JSON.stringify(example.output, null, 2)}`);
        if (example.description) {
          lines.push(`Note: ${example.description}`);
        }
        lines.push('');
      }
    }

    // 添加对话历史上下文
    if (context.history.length > 0) {
      lines.push('## Conversation History:');
      for (const msg of context.history.slice(-3)) {
        lines.push(`${msg.role}: ${msg.content}`);
      }
      lines.push('');
    }

    lines.push('## Current Input:');
    lines.push(`"${userInput}"`);
    lines.push('');
    lines.push('## Instructions:');
    lines.push('1. Extract all parameters from the input');
    lines.push('2. Use conversation history for context if needed');
    lines.push('3. Respond with valid JSON only');
    lines.push('4. Use null for missing required parameters');
    lines.push('');
    lines.push('## Output (JSON only):');

    return lines.join('\n');
  }

  /**
   * 解析LLM响应
   */
  private parseLLMResponse(response: string): Record<string, unknown> {
    // 尝试直接解析
    try {
      return JSON.parse(response.trim());
    } catch {
      // 尝试提取JSON代码块
      const jsonMatch = response.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (jsonMatch) {
        try {
          return JSON.parse(jsonMatch[1].trim());
        } catch {
          // 继续尝试其他方法
        }
      }

      // 尝试提取花括号内容
      const braceMatch = response.match(/\{[\s\S]*\}/);
      if (braceMatch) {
        try {
          return JSON.parse(braceMatch[0]);
        } catch {
          // 解析失败
        }
      }
    }

    return {};
  }

  /**
   * 使用Zod验证参数
   */
  private async validateWithSchema(
    params: Record<string, unknown>,
    schema: z.ZodSchema<unknown>
  ): Promise<ValidationResult> {
    try {
      const valid = await schema.parseAsync(params);
      return { valid: true, errors: [], data: valid };
    } catch (error) {
      if (error instanceof z.ZodError) {
        return {
          valid: false,
          errors: ((error as any).issues?.map((e: any) => ({
            path: e.path.join('.'),
            message: e.message,
            code: e.code,
          })) ?? []),
        };
      }
      return {
        valid: false,
        errors: [{ path: '', message: String(error), code: 'UNKNOWN' }],
      };
    }
  }

  /**
   * 识别缺失的参数
   */
  private identifyMissingParams(
    params: Record<string, unknown>,
    definitions: ParameterDefinition[]
  ): string[] {
    return definitions
      .filter(def => {
        if (def.required === false) return false;
        const value = params[def.name];
        return value === undefined || value === null;
      })
      .map(def => def.name);
  }

  /**
   * 填充默认值
   */
  private fillDefaults(
    params: Record<string, unknown>,
    definitions: ParameterDefinition[]
  ): Record<string, unknown> {
    const result = { ...params };

    for (const def of definitions) {
      if ((result[def.name] === undefined || result[def.name] === null) &&
          def.default !== undefined) {
        result[def.name] = def.default;
      }
    }

    return result;
  }

  /**
   * 从历史对话中查找参数
   */
  private findInHistory(
    paramName: string,
    history: ExtractionContext['history']
  ): { found: boolean; value?: unknown; confidence: number } {
    // 查找最近的助手或Skill消息
    for (let i = history.length - 1; i >= 0; i--) {
      const msg = history[i];
      if (msg.role === 'assistant' || msg.role === 'skill') {
        // 检查metadata中是否有该参数
        if (msg.metadata && paramName in msg.metadata) {
          return {
            found: true,
            value: msg.metadata[paramName],
            confidence: 0.8 - (history.length - i) * 0.1,  // 越近置信度越高
          };
        }

        // 尝试从内容中解析
        const patterns = [
          new RegExp(`${paramName}[:=]\\s*([^,\\s]+)`, 'i'),
          new RegExp(`${paramName}\\s+is\\s+(.+?)(?:\\.|$)`, 'i'),
        ];

        for (const pattern of patterns) {
          const match = msg.content.match(pattern);
          if (match) {
            return {
              found: true,
              value: match[1].trim(),
              confidence: 0.7,
            };
          }
        }
      }
    }

    return { found: false, confidence: 0 };
  }

  /**
   * 查找历史参数
   */
  private async findHistoricalParams(
    referenceType: string,
    history: ExtractionContext['history'],
    definitions: ParameterDefinition[]
  ): Promise<Record<string, unknown>> {
    const params: Record<string, unknown> = {};

    switch (referenceType) {
      case 'recent':
        // 查找最近一轮的参数
        for (let i = history.length - 1; i >= 0; i--) {
          const msg = history[i];
          if (msg.metadata && 'params' in msg.metadata) {
            return msg.metadata.params as Record<string, unknown>;
          }
        }
        break;

      case 'previous_context':
        // 查找上文提到的所有参数
        for (const msg of history.slice().reverse()) {
          if (msg.metadata) {
            for (const def of definitions) {
              if (def.name in msg.metadata && !(def.name in params)) {
                params[def.name] = msg.metadata[def.name];
              }
            }
          }
        }
        break;

      case 'same_as_before':
        // 查找完全相同的参数集
        for (let i = history.length - 1; i >= 0; i--) {
          const msg = history[i];
          if (msg.metadata && 'params' in msg.metadata) {
            const historicalParams = msg.metadata.params as Record<string, unknown>;
            // 检查是否匹配当前需要的参数
            const matches = definitions.every(def =>
              def.name in historicalParams || def.required === false
            );
            if (matches) {
              return historicalParams;
            }
          }
        }
        break;
    }

    return params;
  }

  /**
   * 计算整体置信度
   */
  private calculateConfidence(
    params: Record<string, unknown>,
    definitions: ParameterDefinition[],
    isValid: boolean,
    missingCount: number
  ): number {
    let confidence = 0.5;

    // 验证通过增加置信度
    if (isValid) {
      confidence += 0.3;
    }

    // 无缺失参数增加置信度
    if (missingCount === 0) {
      confidence += 0.2;
    } else {
      confidence -= missingCount * 0.1;
    }

    // 必填参数填充率
    const requiredDefs = definitions.filter(d => d.required !== false);
    const filledRequired = requiredDefs.filter(d =>
      params[d.name] !== undefined && params[d.name] !== null
    ).length;
    const fillRate = requiredDefs.length > 0
      ? filledRequired / requiredDefs.length
      : 1;
    confidence += fillRate * 0.1;

    return Math.min(Math.max(confidence, 0), 1);
  }

  /**
   * 创建默认日志器
   */
  private createDefaultLogger(): Logger {
    return {
      debug: () => {},
      info: () => {},
      warn: console.warn,
      error: console.error,
    };
  }
}

// ============================================================================
// Factory Functions
// ============================================================================

export function createParameterExtractor(
  config: ParameterExtractorConfig
): IntelligentParameterExtractor {
  return new IntelligentParameterExtractor(config);
}

// Types are exported from index.ts
