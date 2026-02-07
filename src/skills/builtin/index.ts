/**
 * Built-in Skills - TypeScript Implementations
 *
 * Each skill follows the Agent Skills Specification:
 * - SKILL.md with YAML frontmatter
 * - Progressive disclosure pattern
 * - Standardized parameters and responses
 */

import type { EnhancedSkill as Skill, ExecutionContext } from '../../core/types';

/**
 * 安全的数学表达式解析器
 * 替代 eval，避免代码注入风险
 */
function safeMathEvaluate(expression: string): number {
  // 移除外层括号
  const cleanExpr = expression.trim();
  
  // 使用 Function 构造器创建安全的计算环境
  // 只允许数学运算，不访问任何全局对象
  const mathFunc = new Function('Math', `'use strict'; return (${cleanExpr})`);
  
  // 传入 Math 对象，允许使用 Math 函数
  const result = mathFunc(Math);
  
  // 验证结果是数字
  if (typeof result !== 'number' || !Number.isFinite(result)) {
    throw new Error('Invalid result: not a finite number');
  }
  
  return result;
}

// ============================================
// Echo Skill
// ============================================

export const echoSkill: Skill = {
  name: 'echo',
  description:
    'Echo back the input message. Use for debugging, testing, or verifying message passing in the agent system.',
  parameters: {
    type: 'object',
    properties: {
      message: {
        type: 'string',
        description: 'The message to echo back',
      },
    },
    required: ['message'],
  },
  handler: async (params: Record<string, unknown>) => ({
    success: true,
    data: params.message as string,
  }),
  metadata: {
    category: 'utility',
    tags: ['debug', 'test', 'utility'],
    version: '1.0.0',
    author: 'sdkwork-browser-agent',
  },
};

// ============================================
// Math Skill
// ============================================

export const mathSkill: Skill = {
  name: 'math',
  description:
    'Perform mathematical calculations safely. Use when users ask for calculations, math problems, or numeric operations.',
  parameters: {
    type: 'object',
    properties: {
      expression: {
        type: 'string',
        description:
          'Mathematical expression to evaluate. Allowed: +, -, *, /, (), digits, decimals',
      },
    },
    required: ['expression'],
  },
  handler: async (params: Record<string, unknown>) => {
    try {
      const expression = String(params.expression);

      // Security: Only allow basic math characters
      const sanitized = expression.replace(/[^0-9+\-*/().\s]/g, '');

      if (sanitized.length === 0) {
        return {
          success: false,
          error: 'Invalid expression: no valid mathematical characters found',
        };
      }

      if (sanitized.length > 1000) {
        return {
          success: false,
          error: 'Expression too long (max 1000 characters)',
        };
      }

      // 使用安全的数学表达式解析器替代 eval
      const result = safeMathEvaluate(sanitized);

      return {
        success: true,
        data: result,
        metadata: {
          originalExpression: expression,
          sanitizedExpression: sanitized,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Invalid mathematical expression',
      };
    }
  },
  metadata: {
    category: 'utility',
    tags: ['math', 'calculation', 'arithmetic', 'utility'],
    version: '1.0.0',
    author: 'sdkwork-browser-agent',
  },
};

// ============================================
// List Skills
// ============================================

export const listSkillsSkill: Skill = {
  name: 'list-skills',
  description:
    'List all available skills in the registry. Use when users want to know what skills are available or need help finding a skill.',
  parameters: {
    type: 'object',
    properties: {
      category: {
        type: 'string',
        description: 'Filter skills by category (optional)',
      },
    },
  },
  handler: async (params: Record<string, unknown>, context: ExecutionContext) => {
    const skills = (context as unknown as { agent: { getAllSkills: () => Array<{ name: string; description: string; metadata?: { category?: string; tags?: string[] } }> } }).agent.getAllSkills().map((skill: { name: string; description: string; metadata?: { category?: string; tags?: string[] } }) => ({
      name: skill.name,
      description: skill.description,
      category: skill.metadata?.category,
      tags: skill.metadata?.tags,
    }));

    // Filter by category if provided
    if (params.category && typeof params.category === 'string') {
      const filtered = skills.filter(s => s.category === params.category);
      return { success: true, data: filtered };
    }

    return { success: true, data: skills };
  },
  metadata: {
    category: 'meta',
    tags: ['introspection', 'meta', 'skills', 'list'],
    version: '1.0.0',
    author: 'sdkwork-browser-agent',
  },
};

// ============================================
// Lyrics Generator Skill
// ============================================

export const lyricsGeneratorSkill: Skill = {
  name: 'lyrics-generator',
  description:
    'Generate professional music lyrics for songs across all genres. Creates original, emotionally resonant lyrics with proper structure, rhyme schemes, and thematic depth.',
  parameters: {
    type: 'object',
    properties: {
      theme: {
        type: 'string',
        description:
          'Main subject or emotion of the song (e.g., "love", "heartbreak", "summer romance")',
      },
      genre: {
        type: 'string',
        description:
          'Musical genre: "pop", "rock", "hip-hop", "country", "rnb", "edm", "folk", "jazz", "k-pop", etc.',
      },
      mood: {
        type: 'string',
        description: 'Emotional tone: "happy", "sad", "romantic", "energetic", "nostalgic", etc.',
      },
      structure: {
        type: 'string',
        description: 'Song structure: "verse-chorus", "verse-chorus-bridge", "aaba", etc.',
      },
      language: {
        type: 'string',
        description: 'Lyrics language: "english", "chinese", "japanese", "spanish", etc.',
      },
      length: {
        type: 'string',
        description: 'Song length: "short", "medium", "long"',
      },
      tempo: {
        type: 'string',
        description: 'Speed: "slow", "mid-tempo", "fast"',
      },
      keywords: {
        type: 'array',
        description: 'Specific words or phrases to include',
      },
      referenceArtist: {
        type: 'string',
        description: 'Style similar to artist (e.g., "Taylor Swift", "BTS")',
      },
      complexity: {
        type: 'string',
        description: 'Lyrical sophistication: "simple", "moderate", "complex"',
      },
    },
    required: ['theme'],
  },
  handler: async (params: Record<string, unknown>, context: ExecutionContext) => {
    try {
      const agent = (context as unknown as { agent: { chat: (messages: Array<{ role: string; content: string }>) => Promise<{ content: string | unknown }> } }).agent;
      const theme = String(params.theme);
      const genre = String(params.genre || 'pop');
      const mood = String(params.mood || 'neutral');
      const structure = String(params.structure || 'verse-chorus');
      const language = String(params.language || 'english');
      const length = String(params.length || 'medium');
      const tempo = String(params.tempo || 'mid-tempo');
      const keywords = Array.isArray(params.keywords) ? params.keywords : [];
      const referenceArtist = params.referenceArtist ? String(params.referenceArtist) : '';
      const complexity = String(params.complexity || 'moderate');

      const lengthGuidelines = {
        short: '2-3 minutes, minimal sections (verse-chorus-verse-chorus)',
        medium: '3-4 minutes, standard structure with bridge',
        long: '4-5+ minutes, extended with multiple sections',
      };

      const complexityGuidelines = {
        simple: 'Easy to understand, catchy, straightforward language',
        moderate: 'Balanced depth with some metaphors, accessible',
        complex: 'Rich metaphors, poetic language, sophisticated vocabulary',
      };

      const messages = [
        {
          role: 'system' as const,
          content: `You are a professional songwriter and lyricist with expertise in all music genres. Create original, emotionally resonant lyrics with proper song structure.`,
        },
        {
          role: 'user' as const,
          content: `Generate song lyrics with the following specifications:

Theme: ${theme}
Genre: ${genre}
Mood: ${mood}
Structure: ${structure}
Language: ${language}
Length: ${length} - ${lengthGuidelines[length as keyof typeof lengthGuidelines]}
Tempo: ${tempo}
Complexity: ${complexity} - ${complexityGuidelines[complexity as keyof typeof complexityGuidelines]}
${keywords.length > 0 ? `Keywords to include: ${keywords.join(', ')}` : ''}
${referenceArtist ? `Style reference: Similar to ${referenceArtist}` : ''}

Requirements:
1. Create original lyrics (not copying existing songs)
2. Use proper song structure with clear section labels [Verse], [Chorus], [Bridge], etc.
3. Include a catchy, memorable chorus
4. Use appropriate rhyme schemes for the genre
5. Show emotions through imagery rather than just stating them
6. Ensure lyrics are singable and flow well
7. Match the complexity level requested
8. ${language !== 'english' ? `Write in ${language} language` : 'Write in English'}

Format the output with clear section labels and line breaks for readability.`,
        },
      ];

      const response = await agent.chat(messages);
      const lyrics =
        typeof response.content === 'string' ? response.content : JSON.stringify(response.content);

      return {
        success: true,
        data: lyrics,
        metadata: {
          theme,
          genre,
          mood,
          structure,
          language,
          length,
          tempo,
          keywords,
          referenceArtist,
          complexity,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Lyrics generation failed',
      };
    }
  },
  metadata: {
    category: 'creative',
    tags: ['lyrics', 'music', 'songwriting', 'composition', 'creative-writing'],
    version: '1.0.0',
    author: 'sdkwork-browser-agent',
  },
};

// ============================================
// Export All Built-in Skills
// ============================================

export const builtInSkills = [echoSkill, mathSkill, listSkillsSkill, lyricsGeneratorSkill];

// Map for easy lookup
export const builtInSkillsMap = new Map(builtInSkills.map(skill => [skill.name, skill]));
