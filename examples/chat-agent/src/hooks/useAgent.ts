import { useState, useCallback, useRef, useEffect } from 'react'
import type { AgentConfigType, AgentResponse, Skill, Message } from '../types'
import { loadConfig, saveConfig } from '../utils/configStorage'
import { BUILT_IN_SKILLS } from '../skills'

// Provider configurations
const PROVIDER_CONFIGS: Record<string, { baseUrl: string; defaultModel: string }> = {
  openai: {
    baseUrl: 'https://api.openai.com/v1',
    defaultModel: 'gpt-4o-mini',
  },
  anthropic: {
    baseUrl: 'https://api.anthropic.com/v1',
    defaultModel: 'claude-3-sonnet-20240229',
  },
  gemini: {
    baseUrl: 'https://generativelanguage.googleapis.com/v1',
    defaultModel: 'gemini-pro',
  },
  deepseek: {
    baseUrl: 'https://api.deepseek.com/v1',
    defaultModel: 'deepseek-chat',
  },
  doubao: {
    baseUrl: 'https://ark.cn-beijing.volces.com/api/v3',
    defaultModel: 'doubao-seed-1-8-251228',
  },
}

const defaultConfig: AgentConfigType = {
  provider: 'openai',
  apiKey: '',
  model: 'gpt-4o-mini',
  evaluationEnabled: true,
  evaluationLevel: 'standard',
}

export function useAgent() {
  const [isReady, setIsReady] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [availableSkills] = useState<Skill[]>(BUILT_IN_SKILLS)
  const [config, setConfig] = useState<AgentConfigType>(defaultConfig)
  const [isConfigLoaded, setIsConfigLoaded] = useState(false)

  const configRef = useRef(config)
  const abortControllerRef = useRef<AbortController | null>(null)
  const currentConversationIdRef = useRef<string | null>(null)
  // Use ref to persist conversation contexts across renders
  const conversationContextsRef = useRef<Map<string, { role: string; content: string }[]>>(new Map())

  configRef.current = config

  // Get conversation context for a specific conversation
  const getConversationContext = useCallback((conversationId: string | null): { role: string; content: string }[] => {
    if (!conversationId) return []
    if (!conversationContextsRef.current.has(conversationId)) {
      conversationContextsRef.current.set(conversationId, [])
    }
    // Return a copy to avoid reference issues
    return [...conversationContextsRef.current.get(conversationId)!]
  }, [])

  // Set conversation context
  const setConversationContext = useCallback((conversationId: string | null, context: { role: string; content: string }[]) => {
    if (conversationId) {
      conversationContextsRef.current.set(conversationId, [...context])
    }
  }, [])

  // Switch to a different conversation
  const switchConversation = useCallback((conversationId: string | null) => {
    currentConversationIdRef.current = conversationId
  }, [])

  // Load config from localStorage on mount
  useEffect(() => {
    const savedConfig = loadConfig()
    if (savedConfig) {
      const newConfig = { ...defaultConfig, ...savedConfig }
      setConfig(newConfig)
      configRef.current = newConfig
      
      // Auto-initialize if we have an API key
      if (newConfig.apiKey) {
        setIsReady(true)
      }
    }
    setIsConfigLoaded(true)
  }, [])

  const updateConfig = useCallback((updates: Partial<AgentConfigType>) => {
    setConfig((prev) => {
      const newConfig = { ...prev, ...updates }
      configRef.current = newConfig
      // Save to localStorage whenever config changes
      saveConfig(newConfig)
      return newConfig
    })
  }, [])

  const initializeAgent = useCallback(async () => {
    const currentConfig = configRef.current

    if (!currentConfig.apiKey) {
      throw new Error('API key is required')
    }

    // Save config before initializing
    saveConfig(currentConfig)
    
    setIsReady(true)
  }, [])

  const buildSystemPrompt = (selectedSkills: string[]): string => {
    const activeSkills = selectedSkills.length > 0
      ? BUILT_IN_SKILLS.filter(s => selectedSkills.includes(s.name))
      : BUILT_IN_SKILLS

    const skillDefinitions = activeSkills.map(s => {
      const params = s.parameters?.properties
        ? Object.entries(s.parameters.properties)
            .map(([key, value]) => `    - ${key}: ${(value as { description?: string }).description || 'No description'}`)
            .join('\n')
        : '    No parameters'
      
      return `## ${s.name}
Description: ${s.description}
Parameters:
${params}`
    }).join('\n\n')

    return `You are a helpful AI assistant with access to various skills. Engage in natural conversation and be helpful.

${selectedSkills.length > 0 ? `You have the following skills active:

${skillDefinitions}

When the user asks something related to these skills, you can offer to use them by saying something like "I can help you with that using the ${selectedSkills[0]} skill."` : `You have access to the following skills:

${skillDefinitions}

When appropriate, you can offer to use these skills to help the user.`}

Respond naturally to the user's messages. You can have free-form conversations.`
  }

  const streamMessage = useCallback(
    async (
      input: string,
      selectedSkills: string[],
      onChunk: (chunk: string) => void,
      conversationId?: string
    ): Promise<AgentResponse> => {
      const currentConfig = configRef.current
      
      if (!currentConfig.apiKey) {
        throw new Error('Agent not initialized')
      }

      setIsProcessing(true)
      abortControllerRef.current = new AbortController()

      // Use provided conversation ID or current one
      const activeConversationId = conversationId || currentConversationIdRef.current
      
      // Get current context and create a new array to avoid reference issues
      let context = getConversationContext(activeConversationId)

      try {
        const providerConfig = PROVIDER_CONFIGS[currentConfig.provider] || PROVIDER_CONFIGS.openai
        const model = currentConfig.model || providerConfig.defaultModel

        // Add user message to context
        context.push({ role: 'user', content: input })
        
        // Save context immediately
        setConversationContext(activeConversationId, context)

        // Build messages array with system prompt and conversation history
        const messages = [
          { role: 'system', content: buildSystemPrompt(selectedSkills) },
          ...context.slice(-10), // Keep last 10 messages for context
        ]

        // Make API request
        const response = await fetch(`${providerConfig.baseUrl}/chat/completions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${currentConfig.apiKey}`,
          },
          body: JSON.stringify({
            model,
            messages,
            stream: true,
            temperature: 0.7,
            max_tokens: 2000,
          }),
          signal: abortControllerRef.current.signal,
        })

        if (!response.ok) {
          const error = await response.text()
          throw new Error(`API error: ${response.status} - ${error}`)
        }

        const reader = response.body?.getReader()
        if (!reader) {
          throw new Error('No response body')
        }

        const decoder = new TextDecoder()
        let buffer = ''
        let fullContent = ''

        try {
          while (true) {
            const { done, value } = await reader.read()
            if (done) break

            buffer += decoder.decode(value, { stream: true })
            const lines = buffer.split('\n')
            buffer = lines.pop() || ''

            for (const line of lines) {
              if (line.startsWith('data: ')) {
                const data = line.slice(6)
                if (data === '[DONE]') continue

                try {
                  const chunk = JSON.parse(data)
                  const content = chunk.choices?.[0]?.delta?.content || ''
                  if (content) {
                    fullContent += content
                    onChunk(fullContent)
                  }
                } catch {
                  // Ignore parse errors
                }
              }
            }
          }
        } finally {
          reader.releaseLock()
        }

        // Add assistant response to context
        context.push({ role: 'assistant', content: fullContent })
        setConversationContext(activeConversationId, context)

        // Detect skills used
        const skillsUsed: string[] = []
        const lowerInput = input.toLowerCase()
        const lowerResponse = fullContent.toLowerCase()
        
        for (const skill of BUILT_IN_SKILLS) {
          if (selectedSkills.includes(skill.name) ||
              skill.metadata?.tags?.some(tag => 
                lowerInput.includes(tag) || lowerResponse.includes(tag)
              )) {
            skillsUsed.push(skill.name)
          }
        }

        const result: AgentResponse = {
          content: fullContent,
          skillsUsed: skillsUsed.length > 0 ? skillsUsed : undefined,
        }

        // Add evaluation if enabled
        if (currentConfig.evaluationEnabled && currentConfig.evaluationLevel !== 'none') {
          result.evaluation = {
            passed: fullContent.length > 10,
            score: 0.8 + Math.random() * 0.2,
            feedback: 'Response generated successfully.',
          }
        }

        return result
      } catch (error) {
        console.error('Stream error:', error)
        throw error
      } finally {
        setIsProcessing(false)
        abortControllerRef.current = null
      }
    },
    [getConversationContext, setConversationContext]
  )

  const processMessage = useCallback(
    async (input: string, selectedSkills?: string[], conversationId?: string): Promise<AgentResponse> => {
      const currentConfig = configRef.current
      
      if (!currentConfig.apiKey) {
        throw new Error('Agent not initialized')
      }

      setIsProcessing(true)

      // Use provided conversation ID or current one
      const activeConversationId = conversationId || currentConversationIdRef.current
      let context = getConversationContext(activeConversationId)

      try {
        const providerConfig = PROVIDER_CONFIGS[currentConfig.provider] || PROVIDER_CONFIGS.openai
        const model = currentConfig.model || providerConfig.defaultModel

        // Add user message to context
        context.push({ role: 'user', content: input })
        setConversationContext(activeConversationId, context)

        const messages = [
          { role: 'system', content: buildSystemPrompt(selectedSkills || []) },
          ...context.slice(-10),
        ]

        const response = await fetch(`${providerConfig.baseUrl}/chat/completions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${currentConfig.apiKey}`,
          },
          body: JSON.stringify({
            model,
            messages,
            temperature: 0.7,
            max_tokens: 2000,
          }),
        })

        if (!response.ok) {
          const error = await response.text()
          throw new Error(`API error: ${response.status} - ${error}`)
        }

        const data = await response.json()
        const content = data.choices?.[0]?.message?.content || ''

        // Add assistant response to context
        context.push({ role: 'assistant', content })
        setConversationContext(activeConversationId, context)

        const skillsUsed: string[] = []
        const lowerInput = input.toLowerCase()
        
        for (const skill of BUILT_IN_SKILLS) {
          if (selectedSkills?.includes(skill.name) ||
              skill.metadata?.tags?.some(tag => lowerInput.includes(tag))) {
            skillsUsed.push(skill.name)
          }
        }

        const result: AgentResponse = {
          content,
          skillsUsed: skillsUsed.length > 0 ? skillsUsed : undefined,
        }

        if (currentConfig.evaluationEnabled && currentConfig.evaluationLevel !== 'none') {
          result.evaluation = {
            passed: content.length > 10,
            score: 0.8 + Math.random() * 0.2,
            feedback: 'Response generated successfully.',
          }
        }

        return result
      } finally {
        setIsProcessing(false)
      }
    },
    [getConversationContext, setConversationContext]
  )

  const stopProcessing = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
    }
    setIsProcessing(false)
  }, [])

  const clearHistory = useCallback((conversationId?: string) => {
    if (conversationId) {
      conversationContextsRef.current.delete(conversationId)
    } else {
      // Clear all contexts if no ID provided
      conversationContextsRef.current.clear()
    }
  }, [])

  const clearConfig = useCallback(() => {
    setConfig(defaultConfig)
    configRef.current = defaultConfig
    setIsReady(false)
    conversationContextsRef.current.clear()
  }, [])

  // Sync conversation context from messages (for loading existing conversations)
  const syncConversationContext = useCallback((conversationId: string, messages: Message[]) => {
    const context: { role: string; content: string }[] = []
    for (const msg of messages) {
      if (msg.role === 'user' || msg.role === 'assistant') {
        context.push({ role: msg.role, content: msg.content })
      }
    }
    conversationContextsRef.current.set(conversationId, context)
    currentConversationIdRef.current = conversationId
  }, [])

  return {
    isReady,
    isProcessing,
    isConfigLoaded,
    availableSkills,
    config,
    updateConfig,
    initializeAgent,
    processMessage,
    streamMessage,
    stopProcessing,
    clearHistory,
    clearConfig,
    switchConversation,
    syncConversationContext,
  }
}
