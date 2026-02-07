import { useState } from 'react'
import type { AgentConfigType } from '../types'
import './AgentConfig.css'

interface AgentConfigProps {
  config: AgentConfigType
  onUpdate: (updates: Partial<AgentConfigType>) => void
  onInitialize: () => Promise<void>
  onClearConfig?: () => void
  isReady: boolean
  onClose: () => void
}

export function AgentConfig({
  config,
  onUpdate,
  onInitialize,
  onClearConfig,
  isReady,
  onClose,
}: AgentConfigProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleInitialize = async () => {
    setIsLoading(true)
    setError(null)
    try {
      await onInitialize()
      // Wait a bit for state to propagate before closing
      setTimeout(() => {
        onClose()
      }, 500)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to initialize')
      // Don't close on error so user can see the error message
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="config-overlay" onClick={onClose}>
      <div className="config-panel" onClick={(e) => e.stopPropagation()}>
        <div className="config-header">
          <h2>Agent Configuration</h2>
          <button className="close-button" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="config-content">
          {error && <div className="error-message">{error}</div>}

          <div className="config-section">
            <h3>LLM Provider</h3>
            <div className="form-group">
              <label>Provider</label>
              <select
                value={config.provider}
                onChange={(e) =>
                  onUpdate({ provider: e.target.value as AgentConfigType['provider'] })
                }
              >
                <option value="openai">OpenAI</option>
                <option value="anthropic">Anthropic</option>
                <option value="gemini">Google Gemini</option>
                <option value="deepseek">DeepSeek</option>
                <option value="doubao">豆包 (Doubao)</option>
              </select>
            </div>

            <div className="form-group">
              <label>API Key</label>
              <input
                type="password"
                value={config.apiKey}
                onChange={(e) => onUpdate({ apiKey: e.target.value })}
                placeholder="Enter your API key"
              />
            </div>

            <div className="form-group">
              <label>Model (optional)</label>
              <input
                type="text"
                value={config.model || ''}
                onChange={(e) => onUpdate({ model: e.target.value })}
                placeholder={
                  config.provider === 'openai'
                    ? 'gpt-4o-mini'
                    : config.provider === 'anthropic'
                    ? 'claude-3-sonnet-20240229'
                    : config.provider === 'deepseek'
                    ? 'deepseek-chat'
                    : config.provider === 'doubao'
                    ? 'doubao-seed-1-8-251228'
                    : 'gemini-pro'
                }
              />
            </div>

            <div className="form-group">
              <label>Base URL (optional)</label>
              <input
                type="text"
                value={config.baseUrl || ''}
                onChange={(e) => onUpdate({ baseUrl: e.target.value })}
                placeholder={
                  config.provider === 'doubao'
                    ? 'https://ark.cn-beijing.volces.com/api/v3'
                    : 'https://api.openai.com/v1'
                }
              />
            </div>
          </div>

          <div className="config-section">
            <h3>Evaluation</h3>
            <div className="form-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={config.evaluationEnabled}
                  onChange={(e) =>
                    onUpdate({ evaluationEnabled: e.target.checked })
                  }
                />
                Enable result evaluation
              </label>
            </div>

            {config.evaluationEnabled && (
              <div className="form-group">
                <label>Evaluation Level</label>
                <select
                  value={config.evaluationLevel}
                  onChange={(e) =>
                    onUpdate({
                      evaluationLevel: e.target.value as AgentConfigType['evaluationLevel'],
                    })
                  }
                >
                  <option value="none">None</option>
                  <option value="basic">Basic</option>
                  <option value="standard">Standard</option>
                  <option value="strict">Strict</option>
                </select>
              </div>
            )}
          </div>
        </div>

        <div className="config-footer">
          <div className="footer-left">
            <div className="status-indicator">
              Status: <span className={isReady ? 'ready' : 'not-ready'}>
                {isReady ? 'Ready ✓' : 'Not Configured'}
              </span>
            </div>
            {isReady && onClearConfig && (
              <button
                className="clear-config-button"
                onClick={() => {
                  if (confirm('Are you sure you want to clear all settings?')) {
                    onClearConfig()
                    onClose()
                  }
                }}
              >
                Clear Settings
              </button>
            )}
          </div>
          <button
            className="initialize-button"
            onClick={handleInitialize}
            disabled={isLoading || !config.apiKey}
          >
            {isLoading ? 'Initializing...' : isReady ? 'Reinitialize' : 'Initialize'}
          </button>
        </div>
      </div>
    </div>
  )
}
