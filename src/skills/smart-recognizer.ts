/**
 * Smart Skill Recognizer - 智能技能识别器
 *
 * 提供自动识别用户输入并匹配到相应技能的能力
 * - 基于关键词的快速匹配
 * - 基于语义的深度匹配
 * - 自动参数提取
 * - 技能推荐
 *
 * @module Skills/SmartRecognizer
 * @version 1.0.0
 */

import { createLogger, type ILogger } from '../utils/logger.js';
import type { Skill } from '../core/domain/skill.js';

export interface RecognizerConfig {
  name?: string;
  confidenceThreshold?: number;
  maxSuggestions?: number;
  enableCache?: boolean;
  logger?: ILogger;
}

export interface SkillMatch {
  skill: Skill;
  confidence: number;
  matchedKeywords: string[];
  extractedParams: Record<string, unknown>;
  reasoning: string;
}

export interface RecognitionResult {
  bestMatch: SkillMatch | null;
  alternatives: SkillMatch[];
  needsClarification: boolean;
  clarificationPrompt?: string;
  originalInput: string;
}

interface SkillPattern {
  id: string;
  keywords: string[];
  patterns: RegExp[];
  paramPatterns: Record<string, RegExp>;
  priority: number;
  category: string;
}

const DEFAULT_PATTERNS: Record<string, SkillPattern> = {
  'image-generation': {
    id: 'image-generation',
    keywords: [
      '生成图片', '生成图像', '画图', '画一张', '创建图片', '创建图像',
      'generate image', 'create image', 'draw', 'make image',
      '图片提示词', '图像提示词', 'image prompt', 'prompt',
      '生成一张图', '画个图', '帮我画', 'AI画图',
    ],
    patterns: [
      /生成[一]?[张个]?[图片图像]/i,
      /画[一]?[张个]?[图片图像]?/i,
      /[创建制作][一]?[张个]?[图片图像]/i,
      /图片提示词/i,
      /generate\s+image/i,
      /create\s+image/i,
      /image\s+prompt/i,
      /draw\s+(me\s+)?a/i,
    ],
    paramPatterns: {
      prompt: /[:：]\s*(.+)$/,
      description: /[:：]\s*(.+)$/,
    },
    priority: 10,
    category: 'creative',
  },
  'code-generation': {
    id: 'code-generation',
    keywords: [
      '写代码', '生成代码', '编写代码', '代码生成', '编程',
      'write code', 'generate code', 'coding', 'program',
      '实现一个', '实现功能', '帮我写',
    ],
    patterns: [
      /写[一]?[段个]?代码/i,
      /生成[一]?[段个]?代码/i,
      /[编写实现][一]?[段个]?代码/i,
      /write\s+code/i,
      /generate\s+code/i,
    ],
    paramPatterns: {
      description: /[:：]\s*(.+)$/,
    },
    priority: 9,
    category: 'development',
  },
  'text-analysis': {
    id: 'text-analysis',
    keywords: [
      '分析', '解析', '理解', '解释', '总结', '摘要',
      'analyze', 'parse', 'understand', 'explain', 'summarize',
    ],
    patterns: [
      /分析[一]?[下段]?/i,
      /总结[一]?[下段]?/i,
      /解释[一]?[下段]?/i,
      /analyze/i,
      /summarize/i,
    ],
    paramPatterns: {
      text: /[:：]\s*(.+)$/,
    },
    priority: 8,
    category: 'analysis',
  },
  'translation': {
    id: 'translation',
    keywords: [
      '翻译', 'translate', '转换语言', '译成',
    ],
    patterns: [
      /翻译[成为]?/i,
      /translate/i,
      /译[成为]/i,
    ],
    paramPatterns: {
      text: /[:：]\s*(.+)$/,
      targetLang: /[成为](.+?)语/i,
    },
    priority: 8,
    category: 'language',
  },
  'math': {
    id: 'math',
    keywords: [
      '计算', '算', '数学', '求值', '等于',
      'calculate', 'compute', 'math', 'equals',
      '+', '-', '*', '/', '加减乘除',
    ],
    patterns: [
      /计算/i,
      /^[0-9+\-*/().\s]+$/,
      /算[一]?[下]?/i,
      /calculate/i,
    ],
    paramPatterns: {
      expression: /(.+)/,
    },
    priority: 9,
    category: 'utility',
  },
  'search': {
    id: 'search',
    keywords: [
      '搜索', '查找', '寻找', '查询', '检索',
      'search', 'find', 'lookup', 'query',
    ],
    patterns: [
      /搜索/i,
      /查找/i,
      /寻找/i,
      /search/i,
      /find/i,
    ],
    paramPatterns: {
      query: /[:：]\s*(.+)$/,
    },
    priority: 7,
    category: 'information',
  },
  'weather': {
    id: 'weather',
    keywords: [
      '天气', '气温', '预报', '下雨', '晴天',
      'weather', 'temperature', 'forecast',
    ],
    patterns: [
      /天气/i,
      /气温/i,
      /weather/i,
    ],
    paramPatterns: {
      location: /[在](.+?)的?天气/i,
    },
    priority: 7,
    category: 'information',
  },
  'list-skills': {
    id: 'list-skills',
    keywords: [
      '有什么技能', '有哪些技能', '列出技能', '技能列表', '可用技能',
      'what skills', 'list skills', 'available skills', 'show skills',
      '有什么skill', '有哪些skill', '列出skill', 'skill列表',
      '你能做什么', '你会什么', '你能干什么', '你的能力',
      'what can you do', 'your abilities', 'your skills',
      '帮助', 'help', '功能列表', '功能介绍', '你能帮我什么',
    ],
    patterns: [
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
    ],
    paramPatterns: {},
    priority: 10,
    category: 'system',
  },
};

export class SmartSkillRecognizer {
  private config: Required<Omit<RecognizerConfig, 'logger'>> & { logger?: ILogger };
  private logger: ILogger;
  private skills: Map<string, Skill> = new Map();
  private patterns: Map<string, SkillPattern> = new Map();
  private cache: Map<string, RecognitionResult> = new Map();

  constructor(config: RecognizerConfig = {}) {
    this.config = {
      name: config.name ?? 'SmartSkillRecognizer',
      confidenceThreshold: config.confidenceThreshold ?? 0.5,
      maxSuggestions: config.maxSuggestions ?? 3,
      enableCache: config.enableCache ?? true,
      logger: config.logger,
    };
    this.logger = config.logger ?? createLogger({ name: this.config.name });

    for (const [id, pattern] of Object.entries(DEFAULT_PATTERNS)) {
      this.patterns.set(id, pattern);
    }
  }

  registerSkill(skill: Skill, pattern?: Partial<SkillPattern>): void {
    this.skills.set(skill.name, skill);

    if (pattern) {
      const existingPattern = this.patterns.get(skill.name) || {
        id: skill.name,
        keywords: [],
        patterns: [],
        paramPatterns: {},
        priority: 5,
        category: (skill.meta?.category as string) || 'general',
      };

      this.patterns.set(skill.name, {
        ...existingPattern,
        ...pattern,
        keywords: [...new Set([...existingPattern.keywords, ...(pattern.keywords || [])])],
      });
    }

    this.logger.debug(`Skill registered: ${skill.name}`);
  }

  registerPattern(skillId: string, pattern: Partial<SkillPattern>): void {
    const existing = this.patterns.get(skillId) || {
      id: skillId,
      keywords: [],
      patterns: [],
      paramPatterns: {},
      priority: 5,
      category: 'general',
    };

    this.patterns.set(skillId, {
      ...existing,
      ...pattern,
      keywords: [...new Set([...existing.keywords, ...(pattern.keywords || [])])],
    });
  }

  recognize(input: string): RecognitionResult {
    const cacheKey = input.toLowerCase().trim();
    if (this.config.enableCache && this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!;
    }

    const matches: SkillMatch[] = [];
    const normalizedInput = input.toLowerCase().trim();

    for (const [skillId, pattern] of this.patterns) {
      const match = this.matchPattern(normalizedInput, input, pattern);
      if (match && match.confidence >= this.config.confidenceThreshold) {
        matches.push(match);
      }
    }

    for (const [skillName, skill] of this.skills) {
      const match = this.matchSkillKeywords(normalizedInput, input, skill);
      if (match && match.confidence >= this.config.confidenceThreshold) {
        const existing = matches.find(m => m.skill.name === skillName);
        if (!existing) {
          matches.push(match);
        } else {
          existing.confidence = Math.max(existing.confidence, match.confidence);
          existing.matchedKeywords = [...new Set([...existing.matchedKeywords, ...match.matchedKeywords])];
        }
      }
    }

    matches.sort((a, b) => {
      const priorityDiff = (this.patterns.get(b.skill.name)?.priority || 5) - (this.patterns.get(a.skill.name)?.priority || 5);
      if (priorityDiff !== 0) return priorityDiff;
      return b.confidence - a.confidence;
    });

    const bestMatch = matches[0] || null;
    const alternatives = matches.slice(1, this.config.maxSuggestions + 1);

    const needsClarification = matches.length > 1 &&
      matches[0].confidence > 0.5 &&
      matches[1].confidence > 0.5 &&
      Math.abs(matches[0].confidence - matches[1].confidence) < 0.2;

    const result: RecognitionResult = {
      bestMatch,
      alternatives,
      needsClarification,
      clarificationPrompt: needsClarification
        ? `您是想要使用 "${matches[0].skill.name}" 还是 "${matches[1].skill.name}"？`
        : undefined,
      originalInput: input,
    };

    if (this.config.enableCache) {
      this.cache.set(cacheKey, result);
      if (this.cache.size > 1000) {
        const firstKey = this.cache.keys().next().value;
        if (firstKey) this.cache.delete(firstKey);
      }
    }

    return result;
  }

  extractParams(input: string, skillName: string): Record<string, unknown> {
    const pattern = this.patterns.get(skillName);
    const params: Record<string, unknown> = {};

    if (!pattern) return params;

    for (const [paramName, regex] of Object.entries(pattern.paramPatterns)) {
      const match = input.match(regex);
      if (match && match[1]) {
        params[paramName] = match[1].trim();
      }
    }

    const colonIndex = input.indexOf('：');
    const colonIndex2 = input.indexOf(':');
    const splitIndex = Math.max(colonIndex, colonIndex2);

    if (splitIndex > 0 && Object.keys(params).length === 0) {
      params['prompt'] = input.slice(splitIndex + 1).trim();
      params['description'] = input.slice(splitIndex + 1).trim();
      params['input'] = input.slice(splitIndex + 1).trim();
    }

    return params;
  }

  suggestSkills(input: string, limit?: number): SkillMatch[] {
    const result = this.recognize(input);
    const allMatches = result.bestMatch ? [result.bestMatch, ...result.alternatives] : result.alternatives;
    return allMatches.slice(0, limit ?? this.config.maxSuggestions);
  }

  private matchPattern(
    normalizedInput: string,
    originalInput: string,
    pattern: SkillPattern
  ): SkillMatch | null {
    let confidence = 0;
    const matchedKeywords: string[] = [];

    for (const keyword of pattern.keywords) {
      if (normalizedInput.includes(keyword.toLowerCase())) {
        confidence += 0.15;
        matchedKeywords.push(keyword);
      }
    }

    for (const regex of pattern.patterns) {
      if (regex.test(normalizedInput) || regex.test(originalInput)) {
        confidence += 0.3;
      }
    }

    if (confidence === 0) return null;

    confidence = Math.min(1, confidence);

    const registeredSkill = this.skills.get(pattern.id);
    let skill: Skill;
    
    if (registeredSkill) {
      skill = registeredSkill;
    } else {
      skill = {
        id: pattern.id,
        name: pattern.id,
        description: `Auto-detected skill: ${pattern.id}`,
        script: {
          code: `// Auto-generated skill placeholder\nreturn { success: true, message: "Executed ${pattern.id}" };`,
          lang: 'javascript',
        },
        meta: { category: pattern.category },
      };
    }

    return {
      skill,
      confidence,
      matchedKeywords,
      extractedParams: this.extractParams(originalInput, pattern.id),
      reasoning: `Matched keywords: ${matchedKeywords.join(', ')}`,
    };
  }

  private matchSkillKeywords(
    normalizedInput: string,
    originalInput: string,
    skill: Skill
  ): SkillMatch | null {
    let confidence = 0;
    const matchedKeywords: string[] = [];

    const skillName = skill.name.toLowerCase();
    if (normalizedInput.includes(skillName)) {
      confidence += 0.4;
      matchedKeywords.push(skill.name);
    }

    if (skill.description) {
      const descWords = skill.description.toLowerCase().split(/\s+/);
      for (const word of descWords) {
        if (word.length > 2 && normalizedInput.includes(word)) {
          confidence += 0.05;
          matchedKeywords.push(word);
        }
      }
    }

    const skillKeywords = skill.meta?.keywords as string[] | undefined;
    if (skillKeywords && Array.isArray(skillKeywords)) {
      for (const keyword of skillKeywords) {
        if (normalizedInput.includes(keyword.toLowerCase())) {
          confidence += 0.1;
          matchedKeywords.push(keyword);
        }
      }
    }

    if (confidence === 0) return null;

    confidence = Math.min(1, confidence);

    return {
      skill,
      confidence,
      matchedKeywords,
      extractedParams: this.extractParams(originalInput, skill.name),
      reasoning: `Matched skill keywords: ${matchedKeywords.join(', ')}`,
    };
  }

  clearCache(): void {
    this.cache.clear();
  }

  getRegisteredSkills(): string[] {
    return Array.from(this.skills.keys());
  }

  getPatterns(): string[] {
    return Array.from(this.patterns.keys());
  }
}

export const defaultRecognizer = new SmartSkillRecognizer();

export function createSmartRecognizer(config?: RecognizerConfig): SmartSkillRecognizer {
  return new SmartSkillRecognizer(config);
}

export function recognizeSkill(input: string, recognizer?: SmartSkillRecognizer): RecognitionResult {
  return (recognizer || defaultRecognizer).recognize(input);
}
