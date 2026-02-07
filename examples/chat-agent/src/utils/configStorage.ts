import type { AgentConfigType } from '../types'

const CONFIG_STORAGE_KEY = 'chat-agent-config'

// Simple obfuscation for API key (not encryption, just to prevent casual viewing)
function obfuscate(str: string): string {
  return btoa(str.split('').reverse().join(''))
}

function deobfuscate(str: string): string {
  try {
    return atob(str).split('').reverse().join('')
  } catch {
    return ''
  }
}

export interface StoredConfig extends AgentConfigType {
  _timestamp?: number
}

export function saveConfig(config: AgentConfigType): void {
  try {
    const configToStore: StoredConfig = {
      ...config,
      // Obfuscate API key before storing
      apiKey: config.apiKey ? obfuscate(config.apiKey) : '',
      _timestamp: Date.now(),
    }
    localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(configToStore))
  } catch (error) {
    console.error('Failed to save config:', error)
  }
}

export function loadConfig(): Partial<AgentConfigType> | null {
  try {
    const stored = localStorage.getItem(CONFIG_STORAGE_KEY)
    if (!stored) return null

    const parsed: StoredConfig = JSON.parse(stored)
    
    // Deobfuscate API key
    if (parsed.apiKey) {
      parsed.apiKey = deobfuscate(parsed.apiKey)
    }

    // Remove internal fields
    delete parsed._timestamp

    return parsed
  } catch (error) {
    console.error('Failed to load config:', error)
    return null
  }
}

export function clearConfig(): void {
  try {
    localStorage.removeItem(CONFIG_STORAGE_KEY)
  } catch (error) {
    console.error('Failed to clear config:', error)
  }
}

export function hasConfig(): boolean {
  try {
    const stored = localStorage.getItem(CONFIG_STORAGE_KEY)
    if (!stored) return false
    
    const parsed = JSON.parse(stored)
    return !!parsed.apiKey
  } catch {
    return false
  }
}

// Export/Import functionality for backup
export function exportConfig(): string {
  const config = loadConfig()
  if (!config) return ''
  
  return JSON.stringify({
    ...config,
    // Don't export API key in plain text for security
    apiKey: config.apiKey ? '***' : '',
  }, null, 2)
}
