/**
 * 意图识别引擎
 * 
 * 基于大模型的智能意图识别，支持：
 * 1. 语义意图匹配
 * 2. 多意图识别
 * 3. 意图置信度评估
 * 4. 上下文感知意图理解
 * 
 * 参考：
 * - OpenClaw的意图识别
 * - Claude Code的语义理解
 * - LangChain的Intent chains
 */

import { EventEmitter } from 'events';
import { Logger } from '../../utils/logger.js';
import { Skill } from '../core/types.js';
import { CacheManager } from './cache-manager.js';

const logger = new Logger('IntentRecognizer');

/** LLM服务接口 */
export interface LLMService {
  complete(prompt: string, options?: { temperature?: number; maxTokens?: number }): Promise<string>;
  embed(text: string): Promise<number[]>;
}

/** 意图识别缓存配置 */
export interface IntentCacheConfig {
  /** 是否启用缓存 */
  enabled: boolean;
  /** 缓存最大条目数 */
  maxSize: number;
  /** 缓存TTL (ms) */
  ttl: number;
  /** 是否启用持久化 */
  enablePersistence: boolean;
  /** 持久化路径 */
  persistencePath: string;
}

/** 意图识别结果 */
export interface IntentRecognitionResult {
  /** 主要意图 */
  primaryIntent: {
    skill: Skill;
    confidence: number;
    reasoning: string;
  };
  /** 备选意图 */
  alternativeIntents: Array<{
    skill: Skill;
    confidence: number;
  }>;
  /** 是否需要澄清 */
  needsClarification: boolean;
  /** 澄清提示 */
  clarificationPrompt?: string;
  /** 提取的实体 */
  entities: Record<string, unknown>;
  /** 原始输入 */
  originalInput: string;
}

/** 意图识别配置 */
export interface IntentRecognizerConfig {
  llm: LLMService;
  confidenceThreshold?: number;
  maxAlternatives?: number;
  enableEntityExtraction?: boolean;
  enableContextEnhancement?: boolean;
  /** 缓存配置 */
  cache?: Partial<IntentCacheConfig>;
}

/** 对话上下文 */
export interface DialogueContext {
  history: Array<{
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
  }>;
  userPreferences?: Record<string, unknown>;
  lastSkill?: string;
}

/**
 * 意图识别引擎
 *
 * 使用大模型进行语义级别的意图理解
 */
export class IntentRecognizer extends EventEmitter {
  private config: Required<IntentRecognizerConfig>;
  private cache?: CacheManager<string, IntentRecognitionResult>;

  constructor(config: IntentRecognizerConfig) {
    super();
    this.config = {
      confidenceThreshold: 0.6,
      maxAlternatives: 3,
      enableEntityExtraction: true,
      enableContextEnhancement: true,
      cache: {
        enabled: true,
        maxSize: 500,
        ttl: 10 * 60 * 1000, // 10分钟
        enablePersistence: false,
        persistencePath: './cache/intent',
      },
      ...config,
    };

    // 初始化缓存
    if (this.config.cache.enabled) {
      this.cache = new CacheManager<string, IntentRecognitionResult>({
        maxSize: this.config.cache.maxSize,
        defaultTTL: this.config.cache.ttl,
        enablePersistence: this.config.cache.enablePersistence,
        persistencePath: this.config.cache.persistencePath,
        name: 'intent-recognizer',
      });

      // 恢复缓存
      this.cache.restore().catch(() => {});
    }
  }

  /**
   * 识别用户意图
   *
   * 主入口方法，使用大模型进行语义匹配
   */
  async recognizeIntent(
    userInput: string,
    availableSkills: Skill[],
    dialogueContext?: DialogueContext
  ): Promise<IntentRecognitionResult> {
    // 输入验证
    if (!userInput?.trim()) {
      throw new Error('User input is required for intent recognition');
    }

    if (!availableSkills || availableSkills.length === 0) {
      throw new Error('At least one skill must be available for intent recognition');
    }

    // 生成缓存键
    const cacheKey = this.generateCacheKey(userInput, availableSkills);

    // 检查缓存
    if (this.cache) {
      const cached = this.cache.get(cacheKey);
      if (cached) {
        logger.debug('Intent recognition cache hit', { input: userInput });
        this.emit('cacheHit', { input: userInput, result: cached });
        return cached;
      }
    }

    logger.debug('Starting intent recognition', {
      input: userInput,
      skillCount: availableSkills.length
    });

    // 1. 构建意图识别提示词
    const prompt = this.buildRecognitionPrompt(userInput, availableSkills, dialogueContext);

    // 2. 调用LLM进行意图识别
    const llmResponse = await this.config.llm.complete(prompt, {
      temperature: 0.2,
      maxTokens: 1000,
    });

    // 3. 解析LLM响应
    const parsed = this.parseLLMResponse(llmResponse, availableSkills);

    // 4. 计算语义相似度进行验证
    const semanticScores = await this.calculateSemanticScores(
      userInput,
      parsed.candidates,
      availableSkills
    );

    // 5. 融合分数并排序
    const rankedIntents = this.rankIntents(parsed.candidates, semanticScores);

    // 6. 提取实体
    const entities = this.config.enableEntityExtraction
      ? await this.extractEntities(userInput, rankedIntents[0]?.skill)
      : {};

    // 7. 判断是否需要澄清
    const needsClarification = this.shouldRequestClarification(rankedIntents);

    const result: IntentRecognitionResult = {
      primaryIntent: rankedIntents[0] || {
        skill: availableSkills[0],
        confidence: 0.3,
        reasoning: 'Fallback to first available skill',
      },
      alternativeIntents: rankedIntents.slice(1, this.config.maxAlternatives + 1),
      needsClarification,
      clarificationPrompt: needsClarification
        ? this.generateClarificationPrompt(rankedIntents)
        : undefined,
      entities,
      originalInput: userInput,
    };

    // 缓存结果
    if (this.cache) {
      this.cache.set(cacheKey, result, this.config.cache.ttl);
    }

    this.emit('intentRecognized', result);
    logger.info('Intent recognition completed', {
      primarySkill: result.primaryIntent.skill.name,
      confidence: result.primaryIntent.confidence,
      needsClarification,
      cached: false,
    });

    return result;
  }

  /**
   * 生成缓存键
   */
  private generateCacheKey(userInput: string, skills: Skill[]): string {
    // 使用输入文本和技能名称列表生成缓存键
    const skillNames = skills.map(s => s.name).sort().join(',');
    const normalizedInput = userInput.toLowerCase().trim();
    return `${normalizedInput}::${skillNames}`;
  }

  /**
   * 获取缓存统计
   */
  getCacheStats() {
    return this.cache?.getStats();
  }

  /**
   * 清理过期缓存
   */
  cleanupCache(): number {
    return this.cache?.cleanup() ?? 0;
  }

  /**
   * 销毁意图识别器
   */
  async destroy(): Promise<void> {
    if (this.cache) {
      await this.cache.destroy();
    }
    this.removeAllListeners();
  }

  /**
   * 构建意图识别提示词
   */
  private buildRecognitionPrompt(
    userInput: string,
    skills: Skill[],
    context?: DialogueContext
  ): string {
    const lines: string[] = [
      'You are an intent recognition assistant. Analyze the user input and match it to the most appropriate skill.',
      '',
      '## Available Skills:',
    ];

    for (const skill of skills) {
      lines.push(`\n### ${skill.name}`);
      lines.push(`Description: ${skill.description || 'No description'}`);
      if (skill.parameters && skill.parameters.length > 0) {
        lines.push('Parameters:');
        for (const param of skill.parameters) {
          lines.push(`  - ${param.name}: ${param.description} (${param.type})${param.required ? ' [required]' : ''}`);
        }
      }
      if (skill.keywords) {
        lines.push(`Keywords: ${skill.keywords.join(', ')}`);
      }
    }

    // 添加上下文
    if (this.config.enableContextEnhancement && context?.history.length) {
      lines.push('\n## Conversation History:');
      for (const msg of context.history.slice(-5)) {
        lines.push(`${msg.role}: ${msg.content}`);
      }
    }

    if (context?.lastSkill) {
      lines.push(`\nLast used skill: ${context.lastSkill}`);
    }

    lines.push('\n## User Input:');
    lines.push(`"${userInput}"`);

    lines.push('\n## Instructions:');
    lines.push('1. Analyze the user input and identify the primary intent');
    lines.push('2. Match the intent to the most appropriate skill');
    lines.push('3. Provide a confidence score (0-1)');
    lines.push('4. Explain your reasoning');
    lines.push('5. List up to 3 alternative skills if the intent is ambiguous');
    lines.push('6. Extract any relevant entities from the input');

    lines.push('\n## Output Format (JSON):');
    lines.push(JSON.stringify({
      primarySkill: 'skill_name',
      confidence: 0.85,
      reasoning: 'Explanation of why this skill matches',
      alternatives: [
        { skill: 'alternative_skill', confidence: 0.6 }
      ],
      entities: {
        entityName: 'extracted value'
      }
    }, null, 2));

    lines.push('\n## Your Response:');

    return lines.join('\n');
  }

  /**
   * 解析LLM响应
   */
  private parseLLMResponse(
    response: string,
    skills: Skill[]
  ): { candidates: Array<{ skill: Skill; confidence: number; reasoning: string }> } {
    try {
      // 提取JSON
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }

      const parsed = JSON.parse(jsonMatch[0]);
      const candidates: Array<{ skill: Skill; confidence: number; reasoning: string }> = [];

      // 主要意图
      if (parsed.primarySkill) {
        const skill = skills.find(s => 
          s.name.toLowerCase() === parsed.primarySkill.toLowerCase()
        );
        if (skill) {
          candidates.push({
            skill,
            confidence: parsed.confidence || 0.5,
            reasoning: parsed.reasoning || 'No reasoning provided',
          });
        }
      }

      // 备选意图
      if (parsed.alternatives && Array.isArray(parsed.alternatives)) {
        for (const alt of parsed.alternatives) {
          const skill = skills.find(s => 
            s.name.toLowerCase() === alt.skill.toLowerCase()
          );
          if (skill) {
            candidates.push({
              skill,
              confidence: alt.confidence || 0.3,
              reasoning: 'Alternative match',
            });
          }
        }
      }

      return { candidates };
    } catch (error) {
      logger.error('Failed to parse LLM response', { error, response });
      // 降级到关键词匹配
      return { candidates: this.fallbackKeywordMatching(response, skills) };
    }
  }

  /**
   * 关键词匹配降级方案
   */
  private fallbackKeywordMatching(
    input: string,
    skills: Skill[]
  ): Array<{ skill: Skill; confidence: number; reasoning: string }> {
    const lowerInput = input.toLowerCase();
    const candidates: Array<{ skill: Skill; confidence: number; reasoning: string }> = [];

    for (const skill of skills) {
      let score = 0;
      let matchedKeywords: string[] = [];

      // 名称匹配
      if (lowerInput.includes(skill.name.toLowerCase())) {
        score += 0.5;
        matchedKeywords.push(skill.name);
      }

      // 描述匹配
      if (skill.description) {
        const descWords = skill.description.toLowerCase().split(/\s+/);
        for (const word of descWords) {
          if (word.length > 3 && lowerInput.includes(word)) {
            score += 0.1;
            matchedKeywords.push(word);
          }
        }
      }

      // 关键词匹配
      if (skill.keywords) {
        for (const keyword of skill.keywords) {
          if (lowerInput.includes(keyword.toLowerCase())) {
            score += 0.2;
            matchedKeywords.push(keyword);
          }
        }
      }

      if (score > 0) {
        candidates.push({
          skill,
          confidence: Math.min(score, 1),
          reasoning: `Matched keywords: ${matchedKeywords.join(', ')}`,
        });
      }
    }

    return candidates.sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * 计算语义相似度分数
   * 
   * 使用并行处理优化性能
   */
  private async calculateSemanticScores(
    userInput: string,
    candidates: Array<{ skill: Skill }>,
    allSkills: Skill[]
  ): Promise<Map<string, number>> {
    const scores = new Map<string, number>();

    try {
      // 并行获取输入和候选技能的 embedding
      const [inputEmbedding, ...skillEmbeddings] = await Promise.all([
        this.config.llm.embed(userInput),
        ...candidates.map(async (candidate) => {
          const skillText = `${candidate.skill.name} ${candidate.skill.description || ''} ${(candidate.skill.keywords || []).join(' ')}`;
          return this.config.llm.embed(skillText);
        }),
      ]);

      // 计算相似度
      candidates.forEach((candidate, index) => {
        const similarity = this.cosineSimilarity(inputEmbedding, skillEmbeddings[index]);
        scores.set(candidate.skill.name, similarity);
      });
    } catch (error) {
      logger.error('Semantic scoring failed', { error });
      // 返回默认分数
      for (const candidate of candidates) {
        scores.set(candidate.skill.name, 0.5);
      }
    }

    return scores;
  }

  /**
   * 排序意图
   */
  private rankIntents(
    candidates: Array<{ skill: Skill; confidence: number; reasoning: string }>,
    semanticScores: Map<string, number>
  ): Array<{ skill: Skill; confidence: number; reasoning: string }> {
    return candidates
      .map(c => ({
        skill: c.skill,
        // 融合LLM置信度和语义相似度
        confidence: (c.confidence + (semanticScores.get(c.skill.name) || 0.5)) / 2,
        reasoning: c.reasoning,
      }))
      .sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * 提取实体
   */
  private async extractEntities(
    userInput: string,
    skill?: Skill
  ): Promise<Record<string, unknown>> {
    if (!skill || !skill.parameters || skill.parameters.length === 0) {
      return {};
    }

    const prompt = `Extract the following parameters from the user input:

Skill: ${skill.name}
Parameters:
${skill.parameters.map(p => `- ${p.name}: ${p.description} (${p.type})`).join('\n')}

User Input: "${userInput}"

Respond with JSON only:
{
  "paramName": "extracted value"
}`;

    try {
      const response = await this.config.llm.complete(prompt, {
        temperature: 0.1,
        maxTokens: 500,
      });

      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (error) {
      logger.error('Entity extraction failed', { error });
    }

    return {};
  }

  /**
   * 判断是否需要澄清
   */
  private shouldRequestClarification(
    rankedIntents: Array<{ confidence: number }>
  ): boolean {
    if (rankedIntents.length === 0) return true;
    if (rankedIntents[0].confidence < this.config.confidenceThreshold) return true;

    // 如果前两个意图置信度接近，需要澄清
    if (rankedIntents.length >= 2) {
      const diff = rankedIntents[0].confidence - rankedIntents[1].confidence;
      if (diff < 0.15) return true;
    }

    return false;
  }

  /**
   * 生成澄清提示
   */
  private generateClarificationPrompt(
    rankedIntents: Array<{ skill: { name: string; description?: string }; confidence: number }>
  ): string {
    if (rankedIntents.length === 0) {
      return "I'm not sure what you'd like to do. Could you please provide more details?";
    }

    if (rankedIntents[0].confidence < this.config.confidenceThreshold) {
      return `I'm not quite sure I understand. Did you mean to:\n\n` +
        rankedIntents.slice(0, 3).map((intent, i) => 
          `${i + 1}. ${intent.skill.name} - ${intent.skill.description || 'No description'}`
        ).join('\n') +
        `\n\nPlease clarify or provide more details.`;
    }

    return `I think you want to use "${rankedIntents[0].skill.name}", but I'm not entirely sure. Could you confirm?`;
  }

  /**
   * 计算余弦相似度
   */
  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) return 0;

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    if (normA === 0 || normB === 0) return 0;
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }
}

// Factory function
export function createIntentRecognizer(
  config: IntentRecognizerConfig
): IntentRecognizer {
  return new IntentRecognizer(config);
}
