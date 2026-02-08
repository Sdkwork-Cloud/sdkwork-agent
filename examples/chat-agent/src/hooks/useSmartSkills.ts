import { useState, useCallback, useEffect, useRef } from 'react'
import { BUILT_IN_SKILLS, skillRegistry, executeSkill } from '../skills'
import type { Skill, SkillMatch } from '../types'
import {
  StrategyFactory,
  createStrategyFactory,
  DEFAULT_SKILL_LOADING_CONFIG,
  type SkillLoadingStrategyType,
  type SkillLoadingResult,
} from '../skills/loading-strategies'

const STORAGE_KEY = 'chat-agent-smart-skills-config'

export interface SmartSkillConfig {
  enabled: boolean
  autoLoadThreshold: number // 匹配阈值 0-1
  maxAutoSkills: number // 最大自动加载技能数
  preferredCategories: string[] // 优先类别
  strategy: SkillLoadingStrategyType // 策略类型
}

const defaultConfig: SmartSkillConfig = {
  enabled: true,
  autoLoadThreshold: 0.3,
  maxAutoSkills: 3,
  preferredCategories: ['utility', 'language', 'development'],
  strategy: 'super-intelligent', // 默认使用超级智能策略
}

// 关键词提取和匹配（作为备用）
function extractKeywords(text: string): string[] {
  // 提取中文和英文词汇
  const chineseWords = text.match(/[\u4e00-\u9fa5]{2,}/g) || []
  const englishWords = text.toLowerCase().match(/[a-z]{3,}/g) || []
  return [...chineseWords, ...englishWords]
}

// 计算技能匹配分数（作为备用）
function calculateSkillMatch(skill: Skill, userInput: string): SkillMatch | null {
  const inputLower = userInput.toLowerCase()
  const keywords = extractKeywords(userInput)
  const matchedKeywords: string[] = []
  let score = 0

  // 1. 技能名称匹配 (权重: 0.4)
  const nameLower = skill.name.toLowerCase()
  if (inputLower.includes(nameLower)) {
    score += 0.4
    matchedKeywords.push(skill.name)
  }

  // 2. 描述关键词匹配 (权重: 0.3)
  const descLower = skill.description.toLowerCase()
  const descWords = descLower.split(/\s+/)
  let descMatches = 0
  for (const word of keywords) {
    if (descWords.some((dw: string) => dw.includes(word.toLowerCase()) || word.toLowerCase().includes(dw))) {
      descMatches++
      if (!matchedKeywords.includes(word)) matchedKeywords.push(word)
    }
  }
  score += Math.min(descMatches * 0.1, 0.3)

  // 3. 标签匹配 (权重: 0.2)
  if (skill.metadata?.tags) {
    let tagMatches = 0
    for (const tag of skill.metadata.tags) {
      if (inputLower.includes(tag.toLowerCase())) {
        tagMatches++
        if (!matchedKeywords.includes(tag)) matchedKeywords.push(tag)
      }
    }
    score += Math.min(tagMatches * 0.1, 0.2)
  }

  // 4. 类别匹配 (权重: 0.1)
  if (skill.metadata?.category && inputLower.includes(skill.metadata.category.toLowerCase())) {
    score += 0.1
  }

  // 5. 特殊关键词加分
  const specialKeywords: Record<string, string[]> = {
    'math': ['计算', '数学', 'calculat', 'math', '公式', '加减乘除', '平方', '根号'],
    'translate': ['翻译', 'translate', '中文', '英文', '语言', '转换'],
    'code-assistant': ['代码', '编程', 'code', 'program', 'bug', 'debug', '函数'],
    'weather': ['天气', 'weather', '温度', '下雨', '晴天'],
    'summarize': ['总结', 'summar', '摘要', '概括', '归纳'],
    'web-search': ['搜索', 'search', '查询', '查找', 'google', '百度'],
    'time': ['时间', '日期', 'time', 'date', '现在几点'],
  }

  const specialWords = specialKeywords[skill.name] || []
  for (const word of specialWords) {
    if (inputLower.includes(word.toLowerCase())) {
      score += 0.15
      if (!matchedKeywords.includes(word)) matchedKeywords.push(word)
      break // 只加一次
    }
  }

  if (score > 0) {
    return {
      skill,
      score: Math.min(score, 1),
      matchedKeywords,
    }
  }

  return null
}

export interface UseSmartSkillsReturn {
  // 配置
  config: SmartSkillConfig
  updateConfig: (updates: Partial<SmartSkillConfig>) => void
  toggleEnabled: () => void

  // 策略相关
  currentStrategy: SkillLoadingStrategyType
  strategyReasoning: string
  lastStrategyResult: SkillLoadingResult | null
  switchStrategy: (strategy: SkillLoadingStrategyType) => void

  // 所有可用技能
  availableSkills: Skill[]

  // 手动选择
  selectedSkills: string[]
  toggleSkill: (skillName: string) => void
  selectSkills: (skillNames: string[]) => void
  clearSelection: () => void

  // 智能匹配
  matchedSkills: SkillMatch[]
  refreshMatches: (userInput: string) => void

  // 最终使用的技能（智能 + 手动）
  getActiveSkills: () => Skill[]

  // 执行技能
  executeSkill: (skillName: string, params: Record<string, unknown>) => Promise<{
    success: boolean
    data?: unknown
    error?: string
  }>
}

export function useSmartSkills(): UseSmartSkillsReturn {
  // 配置状态
  const [config, setConfig] = useState<SmartSkillConfig>(defaultConfig)
  const [isConfigLoaded, setIsConfigLoaded] = useState(false)

  // 手动选择的技能
  const [selectedSkills, setSelectedSkills] = useState<string[]>(['math', 'translate', 'code-assistant'])

  // 智能匹配的技能
  const [matchedSkills, setMatchedSkills] = useState<SkillMatch[]>([])

  // 策略相关状态
  const [strategyReasoning, setStrategyReasoning] = useState<string>('')
  const [lastStrategyResult, setLastStrategyResult] = useState<SkillLoadingResult | null>(null)

  // 策略工厂（使用 ref 避免重复创建）
  const factoryRef = useRef<StrategyFactory | null>(null)

  // 初始化策略工厂
  useEffect(() => {
    if (!factoryRef.current) {
      factoryRef.current = createStrategyFactory(DEFAULT_SKILL_LOADING_CONFIG)
    }
  }, [])

  // 加载配置
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      try {
        const parsed = JSON.parse(stored)
        setConfig({ ...defaultConfig, ...parsed })
        if (parsed.selectedSkills) {
          setSelectedSkills(parsed.selectedSkills)
        }
      } catch {
        // 使用默认配置
      }
    }
    setIsConfigLoaded(true)
  }, [])

  // 保存配置
  useEffect(() => {
    if (isConfigLoaded) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        ...config,
        selectedSkills,
      }))
    }
  }, [config, selectedSkills, isConfigLoaded])

  const updateConfig = useCallback((updates: Partial<SmartSkillConfig>) => {
    setConfig(prev => ({ ...prev, ...updates }))
  }, [])

  const toggleEnabled = useCallback(() => {
    setConfig(prev => ({ ...prev, enabled: !prev.enabled }))
  }, [])

  const toggleSkill = useCallback((skillName: string) => {
    setSelectedSkills(prev => {
      if (prev.includes(skillName)) {
        return prev.filter(name => name !== skillName)
      } else {
        return [...prev, skillName]
      }
    })
  }, [])

  const selectSkills = useCallback((skillNames: string[]) => {
    setSelectedSkills(skillNames)
  }, [])

  const clearSelection = useCallback(() => {
    setSelectedSkills([])
  }, [])

  // 切换策略
  const switchStrategy = useCallback((strategy: SkillLoadingStrategyType) => {
    setConfig(prev => ({ ...prev, strategy }))
  }, [])

  // 刷新智能匹配 - 使用策略模式
  const refreshMatches = useCallback(async (userInput: string) => {
    if (!config.enabled || !userInput.trim()) {
      setMatchedSkills([])
      setStrategyReasoning('')
      setLastStrategyResult(null)
      return
    }

    // 使用策略工厂进行智能匹配
    if (factoryRef.current) {
      try {
        const result = await factoryRef.current.selectSkills(userInput, BUILT_IN_SKILLS)

        // 转换结果为 SkillMatch[]
        const matches: SkillMatch[] = result.selectedSkills.map(skill => {
          const matchResult = result.matches.find(m => m.skill.name === skill.name)
          return {
            skill,
            score: matchResult?.score || result.confidence,
            matchedKeywords: matchResult?.matchedKeywords || [],
          }
        }).filter(m => m.score >= config.autoLoadThreshold)
          .slice(0, config.maxAutoSkills)

        setMatchedSkills(matches)
        setStrategyReasoning(result.reasoning)
        setLastStrategyResult(result)
      } catch (error) {
        console.error('Strategy selection error:', error)
        // 降级到原始匹配逻辑
        fallbackToOriginalMatching(userInput)
      }
    } else {
      // 工厂未初始化，使用原始匹配逻辑
      fallbackToOriginalMatching(userInput)
    }
  }, [config.enabled, config.autoLoadThreshold, config.maxAutoSkills])

  // 备用匹配逻辑
  const fallbackToOriginalMatching = useCallback((userInput: string) => {
    const matches: SkillMatch[] = []

    for (const skill of BUILT_IN_SKILLS) {
      const match = calculateSkillMatch(skill, userInput)
      if (match && match.score >= config.autoLoadThreshold) {
        matches.push(match)
      }
    }

    // 按分数排序，取前 N 个
    matches.sort((a, b) => b.score - a.score)
    const topMatches = matches.slice(0, config.maxAutoSkills)

    setMatchedSkills(topMatches)
    setStrategyReasoning('使用备用关键词匹配策略')
    setLastStrategyResult(null)
  }, [config.autoLoadThreshold, config.maxAutoSkills])

  // 获取最终激活的技能（手动选择 + 智能匹配）
  const getActiveSkills = useCallback((): Skill[] => {
    const skillNames = new Set(selectedSkills)

    // 如果开启智能选择，添加匹配的技能
    if (config.enabled) {
      for (const match of matchedSkills) {
        skillNames.add(match.skill.name)
      }
    }

    return Array.from(skillNames)
      .map(name => skillRegistry.get(name))
      .filter((skill): skill is Skill => skill !== undefined)
  }, [selectedSkills, matchedSkills, config.enabled])

  const executeSkillByName = useCallback(async (skillName: string, params: Record<string, unknown>) => {
    return executeSkill(skillName, params)
  }, [])

  return {
    config,
    updateConfig,
    toggleEnabled,
    currentStrategy: config.strategy,
    strategyReasoning,
    lastStrategyResult,
    switchStrategy,
    availableSkills: BUILT_IN_SKILLS,
    selectedSkills,
    toggleSkill,
    selectSkills,
    clearSelection,
    matchedSkills,
    refreshMatches,
    getActiveSkills,
    executeSkill: executeSkillByName,
  }
}
