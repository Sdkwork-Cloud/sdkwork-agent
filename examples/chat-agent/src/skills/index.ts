import type { Skill } from '../types'
import { filmSkills } from './film'

// Math skill - performs calculations
export const mathSkill: Skill = {
  name: 'math',
  description: 'Perform mathematical calculations and solve math problems. Supports basic arithmetic, algebra, and complex expressions.',
  parameters: {
    type: 'object',
    properties: {
      expression: {
        type: 'string',
        description: 'The mathematical expression to evaluate (e.g., "2 + 2", "sin(45)", "sqrt(16)")',
      },
      precision: {
        type: 'number',
        description: 'Number of decimal places for the result',
        default: 2,
      },
    },
    required: ['expression'],
  },
  handler: async (params) => {
    try {
      const expression = params.expression as string
      const precision = (params.precision as number) ?? 2
      
      // Safe evaluation using Function constructor
      // Note: In production, use a proper math library like mathjs
      const sanitized = expression
        .replace(/[^0-9+\-*/().\s]/g, '')
        .replace(/\*\*/g, '^')
      
      if (!sanitized) {
        return { success: false, error: 'Invalid expression' }
      }
      
      // eslint-disable-next-line no-new-func
      const result = new Function(`return ${sanitized}`)()
      
      return {
        success: true,
        data: {
          expression,
          result: Number(result).toFixed(precision),
          formatted: `${expression} = ${Number(result).toFixed(precision)}`,
        },
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Calculation failed',
      }
    }
  },
  metadata: { category: 'utility', tags: ['math', 'calculate'], icon: '🧮' },
}

// Translate skill - translates text
export const translateSkill: Skill = {
  name: 'translate',
  description: 'Translate text between different languages. Supports major languages like English, Chinese, Spanish, French, German, Japanese, etc.',
  parameters: {
    type: 'object',
    properties: {
      text: {
        type: 'string',
        description: 'The text to translate',
      },
      targetLanguage: {
        type: 'string',
        description: 'Target language code or name (e.g., "zh", "Chinese", "es", "Spanish")',
      },
      sourceLanguage: {
        type: 'string',
        description: 'Source language code or name (optional, auto-detect if not provided)',
      },
    },
    required: ['text', 'targetLanguage'],
  },
  handler: async (params) => {
    try {
      const text = params.text as string
      const targetLanguage = params.targetLanguage as string
      const sourceLanguage = params.sourceLanguage as string | undefined
      
      // This is a mock implementation
      // In production, integrate with a real translation API
      const languageMap: Record<string, string> = {
        'zh': 'Chinese',
        'en': 'English',
        'es': 'Spanish',
        'fr': 'French',
        'de': 'German',
        'ja': 'Japanese',
        'ko': 'Korean',
        'ru': 'Russian',
        'ar': 'Arabic',
        'pt': 'Portuguese',
        'it': 'Italian',
      }
      
      const targetLang = languageMap[targetLanguage.toLowerCase()] || targetLanguage
      
      return {
        success: true,
        data: {
          original: text,
          translated: `[Translated to ${targetLang}]: ${text}`,
          targetLanguage: targetLang,
          sourceLanguage: sourceLanguage || 'auto-detected',
        },
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Translation failed',
      }
    }
  },
  metadata: { category: 'language', tags: ['translate', 'language'], icon: '🌐' },
}

// Code assistant skill - helps with coding
export const codeAssistantSkill: Skill = {
  name: 'code-assistant',
  description: 'Help with coding tasks, debugging, code explanation, and code review. Supports multiple programming languages.',
  parameters: {
    type: 'object',
    properties: {
      code: {
        type: 'string',
        description: 'The code to analyze or work with',
      },
      language: {
        type: 'string',
        description: 'Programming language (e.g., "javascript", "python", "java", "cpp")',
      },
      task: {
        type: 'string',
        description: 'The task to perform',
        enum: ['explain', 'debug', 'optimize', 'review', 'generate'],
      },
      requirements: {
        type: 'string',
        description: 'Additional requirements or context for the task',
      },
    },
    required: ['task'],
  },
  handler: async (params) => {
    try {
      const task = params.task as string
      const code = params.code as string | undefined
      const language = params.language as string | undefined
      const requirements = params.requirements as string | undefined
      
      const taskDescriptions: Record<string, string> = {
        'explain': 'Explain what the code does',
        'debug': 'Find and fix bugs in the code',
        'optimize': 'Optimize the code for better performance',
        'review': 'Review code quality and suggest improvements',
        'generate': 'Generate code based on requirements',
      }
      
      return {
        success: true,
        data: {
          task,
          taskDescription: taskDescriptions[task] || task,
          language: language || 'not specified',
          code: code || 'No code provided',
          requirements: requirements || 'None',
          note: 'This skill provides context for the AI to better assist with coding tasks.',
        },
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Code assistance failed',
      }
    }
  },
  metadata: { category: 'development', tags: ['code', 'programming'], icon: '💻' },
}

// Summarize skill - summarizes text
export const summarizeSkill: Skill = {
  name: 'summarize',
  description: 'Summarize long texts into concise summaries. Useful for articles, documents, and long conversations.',
  parameters: {
    type: 'object',
    properties: {
      text: {
        type: 'string',
        description: 'The text to summarize',
      },
      maxLength: {
        type: 'number',
        description: 'Maximum length of the summary in words',
        default: 100,
      },
      style: {
        type: 'string',
        description: 'Summary style',
        enum: ['concise', 'detailed', 'bullet-points'],
        default: 'concise',
      },
    },
    required: ['text'],
  },
  handler: async (params) => {
    try {
      const text = params.text as string
      const maxLength = (params.maxLength as number) ?? 100
      const style = (params.style as string) ?? 'concise'
      
      return {
        success: true,
        data: {
          originalLength: text.length,
          wordCount: text.split(/\s+/).length,
          maxLength,
          style,
          summary: `Summary of ${text.split(/\s+/).length} words in ${style} style (max ${maxLength} words)`,
          note: 'The AI will generate the actual summary based on this context.',
        },
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Summarization failed',
      }
    }
  },
  metadata: { category: 'language', tags: ['summarize', 'text'], icon: '📝' },
}

// Weather skill - gets weather info
export const weatherSkill: Skill = {
  name: 'weather',
  description: 'Get weather information for a location. Provides current conditions and forecasts.',
  parameters: {
    type: 'object',
    properties: {
      location: {
        type: 'string',
        description: 'City name or location (e.g., "Beijing", "New York", "London")',
      },
      units: {
        type: 'string',
        description: 'Temperature units',
        enum: ['celsius', 'fahrenheit'],
        default: 'celsius',
      },
      days: {
        type: 'number',
        description: 'Number of forecast days (1-7)',
        default: 1,
      },
    },
    required: ['location'],
  },
  handler: async (params) => {
    try {
      const location = params.location as string
      const units = (params.units as string) ?? 'celsius'
      const days = Math.min(Math.max((params.days as number) ?? 1, 1), 7)
      
      // This is a mock implementation
      // In production, integrate with a real weather API
      const mockWeather = {
        location,
        temperature: units === 'celsius' ? 22 : 72,
        condition: ['Sunny', 'Cloudy', 'Rainy', 'Partly Cloudy'][Math.floor(Math.random() * 4)],
        humidity: 60 + Math.floor(Math.random() * 20),
        windSpeed: 5 + Math.floor(Math.random() * 15),
        units,
        forecast: Array.from({ length: days }, (_, i) => ({
          day: `Day ${i + 1}`,
          temp: units === 'celsius' ? 20 + Math.floor(Math.random() * 10) : 68 + Math.floor(Math.random() * 18),
          condition: ['Sunny', 'Cloudy', 'Rainy'][Math.floor(Math.random() * 3)],
        })),
      }
      
      return {
        success: true,
        data: mockWeather,
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Weather fetch failed',
      }
    }
  },
  metadata: { category: 'utility', tags: ['weather', 'info'], icon: '🌤️' },
}

// Web search skill - searches the web
export const webSearchSkill: Skill = {
  name: 'web-search',
  description: 'Search the web for information. Useful for finding current events, facts, and general knowledge.',
  parameters: {
    type: 'object',
    properties: {
      query: {
        type: 'string',
        description: 'The search query',
      },
      numResults: {
        type: 'number',
        description: 'Number of results to return',
        default: 5,
      },
    },
    required: ['query'],
  },
  handler: async (params) => {
    try {
      const query = params.query as string
      const numResults = (params.numResults as number) ?? 5
      
      return {
        success: true,
        data: {
          query,
          numResults,
          results: [
            { title: `Search result for "${query}"`, url: 'https://example.com/1' },
            { title: `Related information about ${query}`, url: 'https://example.com/2' },
          ],
          note: 'This is a mock implementation. In production, integrate with a real search API.',
        },
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Search failed',
      }
    }
  },
  metadata: { category: 'utility', tags: ['search', 'web'], icon: '🔍' },
}

// Time skill - gets current time
export const timeSkill: Skill = {
  name: 'time',
  description: 'Get current time and date information for any timezone.',
  parameters: {
    type: 'object',
    properties: {
      timezone: {
        type: 'string',
        description: 'Timezone (e.g., "UTC", "America/New_York", "Asia/Shanghai")',
        default: 'local',
      },
      format: {
        type: 'string',
        description: 'Time format',
        enum: ['full', 'time-only', 'date-only'],
        default: 'full',
      },
    },
    required: [],
  },
  handler: async (params) => {
    try {
      const timezone = (params.timezone as string) ?? 'local'
      const format = (params.format as string) ?? 'full'
      
      const now = new Date()
      
      let formatted: string
      switch (format) {
        case 'time-only':
          formatted = now.toLocaleTimeString()
          break
        case 'date-only':
          formatted = now.toLocaleDateString()
          break
        default:
          formatted = now.toLocaleString()
      }
      
      return {
        success: true,
        data: {
          timestamp: now.toISOString(),
          timezone,
          format,
          formatted,
          unix: Math.floor(now.getTime() / 1000),
        },
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Time fetch failed',
      }
    }
  },
  metadata: { category: 'utility', tags: ['time', 'date'], icon: '🕐' },
}

// Export all skills
export const BUILT_IN_SKILLS: Skill[] = [
  mathSkill,
  translateSkill,
  codeAssistantSkill,
  summarizeSkill,
  weatherSkill,
  webSearchSkill,
  timeSkill,
  ...filmSkills,
]

// Skill registry for dynamic lookup
export const skillRegistry = new Map<string, Skill>()

// Register all skills
BUILT_IN_SKILLS.forEach(skill => {
  skillRegistry.set(skill.name, skill)
})

// Execute a skill by name
export async function executeSkill(
  skillName: string,
  params: Record<string, unknown>
): Promise<{ success: boolean; data?: unknown; error?: string }> {
  const skill = skillRegistry.get(skillName)
  
  if (!skill) {
    return { success: false, error: `Skill '${skillName}' not found` }
  }
  
  if (!skill.handler) {
    return { success: false, error: `Skill '${skillName}' has no handler` }
  }
  
  try {
    // Create a minimal execution context
    const context = {
      agent: {
        executeMCPTool: async () => {
          throw new Error('MCP not available in this context')
        },
        readMCPResource: async () => {
          throw new Error('MCP not available in this context')
        },
      },
      skillName: skill.name,
      timestamp: new Date(),
    }
    return await skill.handler(params, context)
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Skill execution failed',
    }
  }
}

// Get skill definitions for LLM function calling
export function getSkillDefinitions(): Array<{
  name: string
  description: string
  parameters: Record<string, unknown>
}> {
  return BUILT_IN_SKILLS.map(skill => ({
    name: skill.name,
    description: skill.description,
    parameters: skill.parameters || { type: 'object', properties: {} },
  }))
}

// Re-export dynamic loader
export {
  skillLoader,
  SkillLoader,
  parseSkillFromMarkdown,
  parseSkillFromJSON,
  loadSkillFromURL,
  loadSkillFromModule,
} from './loader'
export type { SkillLoadResult, SkillSource } from './loader'

// Re-export loading strategies
export {
  KeywordStrategy,
  RuleStrategy,
  HybridStrategy,
  AdaptiveStrategy,
  StrategyFactory,
  createStrategyFactory,
  getStrategyFactory,
  resetStrategyFactory,
  DEFAULT_SKILL_LOADING_CONFIG,
} from './loading-strategies'
export type {
  SkillLoadingStrategyType,
  SkillLoadingContext,
  SkillLoadingResult,
  ISkillLoadingStrategy,
  IStrategyFactory,
  SkillLoadingConfig,
  StrategyConfig,
  KeywordStrategyOptions,
  SemanticStrategyOptions,
  LLMStrategyOptions,
  RuleStrategyOptions,
  HybridStrategyOptions,
  MCTSStrategyOptions,
  AdaptiveStrategyOptions,
  EnvironmentType,
  PerformanceMetrics,
  StrategyPerformance,
  AdaptiveConfig,
} from './loading-strategies'

// Re-export cache
export {
  SkillCache,
  createSkillCache,
  getSkillCache,
  resetSkillCache,
} from './skill-cache'
export type { CacheEntry, SkillCacheConfig } from './skill-cache'
