import { useState, useCallback, useRef, useEffect } from 'react'
import type { AgentConfigType } from '../types'
import { loadConfig, saveConfig } from '../utils/configStorage'

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
  temperature: 0.7,
  maxTokens: 2000,
}

export function useAgent() {
  const [isReady, setIsReady] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [config, setConfig] = useState<AgentConfigType>(defaultConfig)
  const [isConfigLoaded, setIsConfigLoaded] = useState(false)

  const configRef = useRef(config)
  const abortControllerRef = useRef<AbortController | null>(null)

  configRef.current = config

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
      saveConfig(newConfig)
      return newConfig
    })
  }, [])

  const initializeAgent = useCallback(async () => {
    const currentConfig = configRef.current

    if (!currentConfig.apiKey) {
      throw new Error('API key is required')
    }

    saveConfig(currentConfig)
    setIsReady(true)
  }, [])

  const streamMessage = useCallback(
    async (
      messages: { role: string; content: string }[],
      onChunk: (chunk: string) => void
    ): Promise<{ content: string; usage?: { promptTokens: number; completionTokens: number; totalTokens: number } }> => {
      const currentConfig = configRef.current
      
      if (!currentConfig.apiKey) {
        throw new Error('Agent not initialized')
      }

      setIsProcessing(true)
      abortControllerRef.current = new AbortController()

      try {
        const providerConfig = PROVIDER_CONFIGS[currentConfig.provider] || PROVIDER_CONFIGS.openai
        const model = currentConfig.model || providerConfig.defaultModel

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
            temperature: currentConfig.temperature || 0.7,
            max_tokens: currentConfig.maxTokens || 2000,
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

        return {
          content: fullContent,
          usage: {
            promptTokens: Math.ceil(JSON.stringify(messages).length / 4),
            completionTokens: Math.ceil(fullContent.length / 4),
            totalTokens: Math.ceil((JSON.stringify(messages).length + fullContent.length) / 4),
          }
        }
      } catch (error) {
        console.error('Stream error:', error)
        throw error
      } finally {
        setIsProcessing(false)
        abortControllerRef.current = null
      }
    },
    []
  )

  const stopProcessing = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
    }
    setIsProcessing(false)
  }, [])

  const clearConfig = useCallback(() => {
    setConfig(defaultConfig)
    configRef.current = defaultConfig
    setIsReady(false)
  }, [])

  return {
    isReady,
    isProcessing,
    isConfigLoaded,
    config,
    updateConfig,
    initializeAgent,
    streamMessage,
    stopProcessing,
    clearConfig,
  }
}
