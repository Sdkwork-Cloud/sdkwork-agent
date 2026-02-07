import { useState, useEffect, useCallback } from 'react'
import {
  executionEvents,
  type AnyExecutionEvent,
  type SkillExecutionEvent,
  type MCPExecutionEvent,
} from '../agent/events'
import { filmProductionWorkflow } from '../mcp/film-server'
import './FilmExecutionPanel.css'

interface FilmExecutionPanelProps {
  messageId: string
  conversationId: string
  onClose?: () => void
}

interface WorkflowStep {
  id: string
  name: string
  description: string
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped'
  startTime?: number
  endTime?: number
  duration?: number
  output?: unknown
}

interface GeneratedAsset {
  type: 'script' | 'scene' | 'image' | 'storyboard' | 'audio' | 'video' | 'character'
  name: string
  url?: string
  preview?: string
  metadata?: Record<string, unknown>
}

export function FilmExecutionPanel({ messageId, conversationId, onClose }: FilmExecutionPanelProps) {
  const [workflowSteps, setWorkflowSteps] = useState<WorkflowStep[]>(
    filmProductionWorkflow.map(step => ({
      id: step.id,
      name: step.name,
      description: step.description,
      status: 'pending',
    }))
  )
  const [, setCurrentStep] = useState(0)
  const [assets, setAssets] = useState<GeneratedAsset[]>([])
  const [isExpanded, setIsExpanded] = useState(true)
  const [activeTab, setActiveTab] = useState<'workflow' | 'assets' | 'logs'>('workflow')
  const [logs, setLogs] = useState<string[]>([])

  const addLog = useCallback((message: string) => {
    setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${message}`])
  }, [])

  const updateStep = useCallback((stepId: string, updates: Partial<WorkflowStep>) => {
    setWorkflowSteps(prev =>
      prev.map(step => (step.id === stepId ? { ...step, ...updates } : step))
    )
  }, [])

  const addAsset = useCallback((asset: GeneratedAsset) => {
    setAssets(prev => [...prev, asset])
  }, [])

  // Listen to execution events
  useEffect(() => {
    const unsubscribe = executionEvents.onFilter(
      { messageId, conversationId },
      (event: AnyExecutionEvent) => {
        switch (event.type) {
          case 'execution:skill': {
            const skillEvent = event as SkillExecutionEvent
            const stepId = skillEvent.skillName.toLowerCase().replace(/\s+/g, '-')
            
            if (skillEvent.phase === 'start') {
              updateStep(stepId, { status: 'running', startTime: Date.now() })
              addLog(`🎬 Starting: ${skillEvent.skillName}`)
            } else if (skillEvent.phase === 'complete') {
              updateStep(stepId, {
                status: skillEvent.result?.success ? 'completed' : 'failed',
                endTime: Date.now(),
                duration: skillEvent.duration,
                output: skillEvent.result?.data,
              })
              addLog(`✅ Completed: ${skillEvent.skillName} (${skillEvent.duration}ms)`)
            }
            break
          }

          case 'execution:mcp': {
            const mcpEvent = event as MCPExecutionEvent
            const toolMap: Record<string, string> = {
              'script-generator': 'scriptwriting',
              'scene-breakdown': 'breakdown',
              'character-designer': 'characters',
              'storyboard-generator': 'storyboard',
              'image-generator': 'visuals',
              'audio-generator': 'audio',
              'video-generator': 'video',
            }
            
            const stepId = toolMap[mcpEvent.toolName]
            
            if (mcpEvent.phase === 'start') {
              if (stepId) {
                updateStep(stepId, { status: 'running', startTime: Date.now() })
              }
              addLog(`🔌 MCP Tool: ${mcpEvent.toolName} - Starting`)
            } else if (mcpEvent.phase === 'complete') {
              if (stepId) {
                updateStep(stepId, {
                  status: mcpEvent.result?.success ? 'completed' : 'failed',
                  endTime: Date.now(),
                  duration: mcpEvent.duration,
                })
              }
              addLog(`✅ MCP Tool: ${mcpEvent.toolName} - Completed (${mcpEvent.duration}ms)`)
              
              // Add generated asset
              if (mcpEvent.result?.success) {
                const assetType = mcpEvent.toolName.replace('-generator', '') as GeneratedAsset['type']
                addAsset({
                  type: assetType,
                  name: `${mcpEvent.toolName} output`,
                  metadata: mcpEvent.result.content as Record<string, unknown>,
                })
              }
            }
            break
          }

          case 'execution:progress': {
            const completedSteps = workflowSteps.filter(s => s.status === 'completed').length
            setCurrentStep(completedSteps)
            break
          }
        }
      }
    )

    return () => unsubscribe()
  }, [messageId, conversationId, workflowSteps, updateStep, addLog, addAsset])

  const formatDuration = (ms?: number): string => {
    if (!ms) return ''
    if (ms < 1000) return `${ms}ms`
    return `${(ms / 1000).toFixed(1)}s`
  }

  const getStepIcon = (stepId: string): string => {
    const icons: Record<string, string> = {
      ideation: '💡',
      scriptwriting: '📝',
      breakdown: '📋',
      characters: '👥',
      storyboard: '🎨',
      visuals: '🖼️',
      audio: '🔊',
      video: '🎬',
    }
    return icons[stepId] || '⚙️'
  }

  const getAssetIcon = (type: string): string => {
    const icons: Record<string, string> = {
      script: '📝',
      scene: '📍',
      image: '🖼️',
      storyboard: '🎨',
      audio: '🔊',
      video: '🎬',
      character: '👤',
    }
    return icons[type] || '📄'
  }

  const completedSteps = workflowSteps.filter(s => s.status === 'completed').length
  const progress = Math.round((completedSteps / workflowSteps.length) * 100)

  return (
    <div className={`film-execution-panel ${isExpanded ? 'expanded' : 'collapsed'}`}>
      <div className="panel-header" onClick={() => setIsExpanded(!isExpanded)}>
        <div className="header-title">
          <span className="header-icon">🎬</span>
          <span>Film Production</span>
          <span className="step-badge">{completedSteps}/{workflowSteps.length}</span>
        </div>
        <div className="header-progress">
          <div className="mini-progress-bar">
            <div className="mini-progress-fill" style={{ width: `${progress}%` }} />
          </div>
          <span className="progress-percent">{progress}%</span>
        </div>
        <div className="header-actions">
          <button className="toggle-btn">{isExpanded ? '▼' : '▶'}</button>
          {onClose && (
            <button className="close-btn" onClick={(e) => { e.stopPropagation(); onClose() }}>
              ×
            </button>
          )}
        </div>
      </div>

      {isExpanded && (
        <>
          <div className="panel-tabs">
            <button
              className={`tab ${activeTab === 'workflow' ? 'active' : ''}`}
              onClick={() => setActiveTab('workflow')}
            >
              Workflow
            </button>
            <button
              className={`tab ${activeTab === 'assets' ? 'active' : ''}`}
              onClick={() => setActiveTab('assets')}
            >
              Assets ({assets.length})
            </button>
            <button
              className={`tab ${activeTab === 'logs' ? 'active' : ''}`}
              onClick={() => setActiveTab('logs')}
            >
              Logs ({logs.length})
            </button>
          </div>

          <div className="panel-content">
            {activeTab === 'workflow' && (
              <div className="workflow-steps">
                {workflowSteps.map((step, index) => (
                  <div
                    key={step.id}
                    className={`workflow-step ${step.status}`}
                    style={{ animationDelay: `${index * 100}ms` }}
                  >
                    <div className="step-indicator">
                      <span className="step-icon">{getStepIcon(step.id)}</span>
                      {index < workflowSteps.length - 1 && (
                        <div className={`step-line ${step.status === 'completed' ? 'active' : ''}`} />
                      )}
                    </div>
                    <div className="step-content">
                      <div className="step-header">
                        <span className="step-name">{step.name}</span>
                        <span className={`step-status ${step.status}`}>
                          {step.status === 'running' && <span className="spinner" />}
                          {step.status}
                        </span>
                      </div>
                      <p className="step-description">{step.description}</p>
                      {step.duration && (
                        <span className="step-duration">⏱️ {formatDuration(step.duration)}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {activeTab === 'assets' && (
              <div className="assets-grid">
                {assets.length === 0 ? (
                  <div className="empty-assets">
                    <span className="empty-icon">📂</span>
                    <p>No assets generated yet</p>
                  </div>
                ) : (
                  assets.map((asset, index) => (
                    <div key={index} className="asset-card">
                      <div className="asset-icon">{getAssetIcon(asset.type)}</div>
                      <div className="asset-info">
                        <span className="asset-type">{asset.type.toUpperCase()}</span>
                        <span className="asset-name">{asset.name}</span>
                      </div>
                      {asset.metadata && (
                        <button className="asset-preview-btn">View</button>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}

            {activeTab === 'logs' && (
              <div className="logs-container">
                {logs.length === 0 ? (
                  <div className="empty-logs">
                    <span className="empty-icon">📋</span>
                    <p>No logs yet</p>
                  </div>
                ) : (
                  <div className="logs-list">
                    {logs.map((log, index) => (
                      <div key={index} className="log-entry">
                        {log}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
