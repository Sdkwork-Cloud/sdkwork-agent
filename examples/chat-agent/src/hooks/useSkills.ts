import { useState, useCallback, useEffect } from 'react'
import { BUILT_IN_SKILLS, skillRegistry, executeSkill } from '../skills'
import type { Skill } from '../types'

const STORAGE_KEY = 'chat-agent-selected-skills'

export interface UseSkillsReturn {
  // All available skills
  availableSkills: Skill[]
  // Currently selected skill names
  selectedSkills: string[]
  // Toggle skill selection
  toggleSkill: (skillName: string) => void
  // Select multiple skills
  selectSkills: (skillNames: string[]) => void
  // Clear all selections
  clearSelection: () => void
  // Get selected skill objects
  getSelectedSkillObjects: () => Skill[]
  // Execute a skill
  executeSkill: (skillName: string, params: Record<string, unknown>) => Promise<{
    success: boolean
    data?: unknown
    error?: string
  }>
  // Check if skill is selected
  isSelected: (skillName: string) => boolean
  // Get skill by name
  getSkill: (skillName: string) => Skill | undefined
}

export function useSkills(): UseSkillsReturn {
  // Initialize with default skills (math, translate, code-assistant)
  const [selectedSkills, setSelectedSkills] = useState<string[]>(['math', 'translate', 'code-assistant'])
  const [isLoaded, setIsLoaded] = useState(false)

  // Load from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      try {
        const parsed = JSON.parse(stored)
        if (Array.isArray(parsed) && parsed.length > 0) {
          setSelectedSkills(parsed)
        }
      } catch {
        // Invalid storage data, use defaults
      }
    }
    setIsLoaded(true)
  }, [])

  // Save to localStorage whenever selection changes
  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(selectedSkills))
    }
  }, [selectedSkills, isLoaded])

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

  const getSelectedSkillObjects = useCallback(() => {
    return selectedSkills
      .map(name => skillRegistry.get(name))
      .filter((skill): skill is Skill => skill !== undefined)
  }, [selectedSkills])

  const isSelected = useCallback((skillName: string) => {
    return selectedSkills.includes(skillName)
  }, [selectedSkills])

  const getSkill = useCallback((skillName: string) => {
    return skillRegistry.get(skillName)
  }, [])

  const executeSkillByName = useCallback(async (skillName: string, params: Record<string, unknown>) => {
    return executeSkill(skillName, params)
  }, [])

  return {
    availableSkills: BUILT_IN_SKILLS,
    selectedSkills,
    toggleSkill,
    selectSkills,
    clearSelection,
    getSelectedSkillObjects,
    executeSkill: executeSkillByName,
    isSelected,
    getSkill,
  }
}
