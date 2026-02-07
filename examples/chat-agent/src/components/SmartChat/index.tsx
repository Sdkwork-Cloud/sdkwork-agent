import React, { useState, useRef, useEffect } from 'react'
import { 
  Brain, 
  Shield, 
  Database, 
  Zap, 
  Activity,
  MessageSquare,
  Cpu,
  Clock,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Loader2,
  Settings,
  BarChart3,
  MemoryStick,
  Terminal
} from 'lucide-react'
import { useSmartAgent, useSmartConversation, useAgentMemory } from '../../hooks/useSmartAgent'
import type { AgentEvent } from '../../types/smart-agent'
import './styles.css'

/**
 * 智能聊天组件 - 展示MCTS决策、向量记忆、安全检测等高级能力
 */
export const SmartChat: React.FC = () => {
  // 使用智能对话管理
  const { conversation, addMessage, updateMessage } = useSmartConversation()
  
  // 使用智能体
  const {
    isReady,
    isProcessing,
    agentState,
    metrics,
    currentIntent,
    processMessage,
    cancelProcessing,
    streamingContent,
    isStreaming,
    debugInfo,
  } = useSmartAgent({
    config: {
      mcts: {
        enabled: true,
        maxIterations: 100,
        explorationConstant: 1.414,
        simulationDepth: 5,
        useRAVE: true,
      },
      memory: {
        enabled: true,
        maxShortTermMessages: 10,
        similarityThreshold: 0.7,
        topK: 5,
      },
      security: {
        enablePromptInjectionCheck: true,
        sensitivityLevel: 'medium',
      },
    },
    onEvent: handleAgentEvent,
  })

  // 使用记忆管理
  const { getRelevantContext } = useAgentMemory(agentState)

  // 本地状态
  const [inputValue, setInputValue] = useState('')
  const [showDebugPanel, setShowDebugPanel] = useState(false)
  const [activeTab, setActiveTab] = useState<'chat' | 'memory' | 'metrics'>('chat')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // 自动滚动
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [conversation.messages, streamingContent])

  // 处理智能体事件
  function handleAgentEvent(event: AgentEvent) {
    console.log('Agent Event:', event.type, event.payload)
  }

  // 发送消息
  const handleSend = async () => {
    if (!inputValue.trim() || isProcessing) return

    const content = inputValue.trim()
    setInputValue('')

    // 添加用户消息
    const userMessage = addMessage({
      role: 'user',
      content,
    })

    // 添加助手消息占位
    const assistantMessage = addMessage({
      role: 'assistant',
      content: '',
      isStreaming: true,
    })

    // 处理消息
    await processMessage(content, conversation, {
      enableStreaming: true,
      onStream: (chunk) => {
        updateMessage(assistantMessage.id, {
          content: chunk,
          isStreaming: true,
        })
      },
    })

    // 完成流式
    updateMessage(assistantMessage.id, {
      content: streamingContent || '处理完成',
      isStreaming: false,
    })
  }

  // 获取状态颜色
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'idle': return '#10b981'
      case 'thinking': return '#f59e0b'
      case 'planning': return '#3b82f6'
      case 'executing': return '#8b5cf6'
      case 'reflecting': return '#ec4899'
      case 'error': return '#ef4444'
      default: return '#6b7280'
    }
  }

  // 获取状态图标
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'idle': return <CheckCircle size={16} />
      case 'thinking': return <Brain size={16} className="animate-pulse" />
      case 'planning': return <Cpu size={16} className="animate-spin" />
      case 'executing': return <Zap size={16} className="animate-pulse" />
      case 'reflecting': return <Activity size={16} />
      case 'error': return <AlertTriangle size={16} />
      default: return <Loader2 size={16} />
    }
  }

  return (
    <div className="smart-chat-container">
      {/* 头部 */}
      <header className="smart-chat-header">
        <div className="header-left">
          <Brain className="header-icon" size={28} />
          <div className="header-title">
            <h1>智能体对话</h1>
            <span className="header-subtitle">
              集成 MCTS + 向量记忆 + 安全检测
            </span>
          </div>
        </div>
        
        <div className="header-center">
          {agentState && (
            <div className="status-badge" style={{ 
              backgroundColor: `${getStatusColor(agentState.status)}20`,
              color: getStatusColor(agentState.status),
              borderColor: getStatusColor(agentState.status)
            }}>
              {getStatusIcon(agentState.status)}
              <span>{getStatusLabel(agentState.status)}</span>
            </div>
          )}
        </div>

        <div className="header-right">
          <button
            className={`tab-btn ${activeTab === 'chat' ? 'active' : ''}`}
            onClick={() => setActiveTab('chat')}
          >
            <MessageSquare size={18} />
            <span>对话</span>
          </button>
          <button
            className={`tab-btn ${activeTab === 'memory' ? 'active' : ''}`}
            onClick={() => setActiveTab('memory')}
          >
            <Database size={18} />
            <span>记忆</span>
          </button>
          <button
            className={`tab-btn ${activeTab === 'metrics' ? 'active' : ''}`}
            onClick={() => setActiveTab('metrics')}
          >
            <BarChart3 size={18} />
            <span>指标</span>
          </button>
          <button
            className={`debug-toggle ${showDebugPanel ? 'active' : ''}`}
            onClick={() => setShowDebugPanel(!showDebugPanel)}
            title="调试面板"
          >
            <Terminal size={18} />
          </button>
        </div>
      </header>

      {/* 主内容区 */}
      <div className="smart-chat-main">
        {/* 左侧：对话区 */}
        <div className={`chat-section ${showDebugPanel ? 'with-debug' : ''}`}>
          {activeTab === 'chat' && (
            <>
              {/* 消息列表 */}
              <div className="messages-container">
                {conversation.messages.length === 0 ? (
                  <div className="empty-state">
                    <Brain size={64} className="empty-icon" />
                    <h3>开始智能对话</h3>
                    <p>智能体将使用 MCTS 决策算法和向量记忆为您提供最佳回答</p>
                    
                    <div className="feature-cards">
                      <div className="feature-card">
                        <Cpu size={24} />
                        <span>MCTS 决策</span>
                      </div>
                      <div className="feature-card">
                        <Database size={24} />
                        <span>向量记忆</span>
                      </div>
                      <div className="feature-card">
                        <Shield size={24} />
                        <span>安全检测</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <>
                    {conversation.messages.map((message) => (
                      <div
                        key={message.id}
                        className={`message ${message.role} ${message.isStreaming ? 'streaming' : ''}`}
                      >
                        <div className="message-avatar">
                          {message.role === 'user' ? (
                            <div className="avatar user">U</div>
                          ) : (
                            <div className="avatar assistant">
                              <Brain size={20} />
                            </div>
                          )}
                        </div>
                        <div className="message-content">
                          <div className="message-header">
                            <span className="message-role">
                              {message.role === 'user' ? '用户' : '智能体'}
                            </span>
                            <span className="message-time">
                              {new Date(message.timestamp).toLocaleTimeString()}
                            </span>
                          </div>
                          <div className="message-body">
                            {message.content || (message.isStreaming ? (
                              <span className="typing-indicator">
                                <span></span>
                                <span></span>
                                <span></span>
                              </span>
                            ) : null)}
                          </div>
                          {message.skillsUsed && message.skillsUsed.length > 0 && (
                            <div className="message-skills">
                              {message.skillsUsed.map(skill => (
                                <span key={skill} className="skill-tag">{skill}</span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                    <div ref={messagesEndRef} />
                  </>
                )}
              </div>

              {/* 输入区 */}
              <div className="input-section">
                {currentIntent && (
                  <div className="intent-indicator">
                    <Zap size={14} />
                    <span>检测到意图: {getIntentLabel(currentIntent.primary)}</span>
                    <span className="confidence">({Math.round(currentIntent.confidence * 100)}%)</span>
                  </div>
                )}
                
                <div className="input-wrapper">
                  <textarea
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault()
                        handleSend()
                      }
                    }}
                    placeholder="输入消息，智能体将使用 MCTS 和向量记忆进行推理..."
                    disabled={isProcessing}
                    rows={3}
                  />
                  <div className="input-actions">
                    {isProcessing ? (
                      <button
                        className="btn-cancel"
                        onClick={cancelProcessing}
                        title="取消"
                      >
                        <XCircle size={20} />
                      </button>
                    ) : (
                      <button
                        className="btn-send"
                        onClick={handleSend}
                        disabled={!inputValue.trim()}
                        title="发送"
                      >
                        <Zap size={20} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </>
          )}

          {activeTab === 'memory' && (
            <MemoryPanel agentState={agentState} />
          )}

          {activeTab === 'metrics' && (
            <MetricsPanel metrics={metrics} debugInfo={debugInfo} />
          )}
        </div>

        {/* 右侧：调试面板 */}
        {showDebugPanel && (
          <DebugPanel
            agentState={agentState}
            metrics={metrics}
            debugInfo={debugInfo}
            currentIntent={currentIntent}
          />
        )}
      </div>
    </div>
  )
}

/**
 * 记忆面板
 */
const MemoryPanel: React.FC<{ agentState: AgentState | null }> = ({ agentState }) => {
  if (!agentState) {
    return (
      <div className="panel-empty">
        <MemoryStick size={48} />
        <p>智能体尚未初始化</p>
      </div>
    )
  }

  const { shortTerm, longTerm, episodic, semantic } = agentState.memory

  return (
    <div className="memory-panel">
      <div className="memory-sections">
        {/* 短期记忆 */}
        <div className="memory-section">
          <h4>
            <Clock size={18} />
            短期记忆
            <span className="count">{shortTerm.recentMessages.length} 条</span>
          </h4>
          <div className="memory-content">
            {shortTerm.recentMessages.length === 0 ? (
              <p className="empty">暂无短期记忆</p>
            ) : (
              shortTerm.recentMessages.slice(-5).map((msg, idx) => (
                <div key={idx} className={`memory-item ${msg.role}`}>
                  <span className="role">{msg.role === 'user' ? 'U' : 'A'}</span>
                  <span className="content">{msg.content.slice(0, 50)}...</span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* 长期记忆 */}
        <div className="memory-section">
          <h4>
            <Database size={18} />
            长期记忆
          </h4>
          <div className="memory-stats">
            <div className="stat">
              <span className="stat-label">对话摘要</span>
              <span className="stat-value">{longTerm.conversationSummaries.length}</span>
            </div>
            <div className="stat">
              <span className="stat-label">学习模式</span>
              <span className="stat-value">{longTerm.learnedPatterns.length}</span>
            </div>
            <div className="stat">
              <span className="stat-label">重要事实</span>
              <span className="stat-value">{longTerm.importantFacts.length}</span>
            </div>
          </div>
        </div>

        {/* 情景记忆 */}
        <div className="memory-section">
          <h4>
            <Activity size={18} />
            情景记忆
            <span className="count">{episodic.length} 条</span>
          </h4>
          <div className="memory-content">
            {episodic.length === 0 ? (
              <p className="empty">暂无情景记忆</p>
            ) : (
              episodic.slice(-5).map((ep, idx) => (
                <div key={idx} className="memory-item episodic">
                  <span className="timestamp">
                    {new Date(ep.timestamp).toLocaleTimeString()}
                  </span>
                  <span className="content">{ep.event.slice(0, 40)}...</span>
                  <span className="importance" style={{
                    backgroundColor: ep.importance > 0.8 ? '#10b981' : '#f59e0b'
                  }}>
                    {Math.round(ep.importance * 100)}%
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* 语义记忆 */}
        <div className="memory-section">
          <h4>
            <Brain size={18} />
            语义记忆
            <span className="count">{semantic.length} 条</span>
          </h4>
          <div className="memory-content">
            {semantic.length === 0 ? (
              <p className="empty">暂无语义记忆</p>
            ) : (
              semantic.slice(-5).map((sem, idx) => (
                <div key={idx} className="memory-item semantic">
                  <span className="concept">{sem.concept}</span>
                  <span className="confidence">{Math.round(sem.confidence * 100)}%</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * 指标面板
 */
const MetricsPanel: React.FC<{ 
  metrics: AgentMetrics | null
  debugInfo: { processingSteps: unknown[]; securityChecks: unknown[] }
}> = ({ metrics, debugInfo }) => {
  if (!metrics) {
    return (
      <div className="panel-empty">
        <BarChart3 size={48} />
        <p>暂无指标数据</p>
      </div>
    )
  }

  return (
    <div className="metrics-panel">
      <div className="metrics-grid">
        {/* 交互统计 */}
        <div className="metric-card">
          <h4>交互统计</h4>
          <div className="metric-values">
            <div className="metric">
              <span className="value">{metrics.totalInteractions}</span>
              <span className="label">总交互</span>
            </div>
            <div className="metric success">
              <span className="value">{metrics.successfulTasks}</span>
              <span className="label">成功</span>
            </div>
            <div className="metric error">
              <span className="value">{metrics.failedTasks}</span>
              <span className="label">失败</span>
            </div>
          </div>
        </div>

        {/* 性能指标 */}
        <div className="metric-card">
          <h4>性能指标</h4>
          <div className="metric-values">
            <div className="metric">
              <span className="value">{Math.round(metrics.averageResponseTime)}ms</span>
              <span className="label">平均响应</span>
            </div>
            <div className="metric">
              <span className="value">{metrics.userSatisfactionScore.toFixed(1)}</span>
              <span className="label">满意度</span>
            </div>
          </div>
        </div>

        {/* MCTS统计 */}
        <div className="metric-card">
          <h4>MCTS 统计</h4>
          <div className="metric-values">
            <div className="metric">
              <span className="value">{metrics.mctsStats.totalSimulations}</span>
              <span className="label">模拟次数</span>
            </div>
            <div className="metric">
              <span className="value">{Math.round(metrics.mctsStats.averageDecisionTime)}ms</span>
              <span className="label">决策时间</span>
            </div>
            <div className="metric">
              <span className="value">{(metrics.mctsStats.successRate * 100).toFixed(0)}%</span>
              <span className="label">成功率</span>
            </div>
          </div>
        </div>

        {/* Token使用 */}
        <div className="metric-card">
          <h4>Token 使用</h4>
          <div className="metric-values">
            <div className="metric">
              <span className="value">{metrics.tokenUsage.totalInput}</span>
              <span className="label">输入</span>
            </div>
            <div className="metric">
              <span className="value">{metrics.tokenUsage.totalOutput}</span>
              <span className="label">输出</span>
            </div>
            <div className="metric">
              <span className="value">${metrics.tokenUsage.totalCost.toFixed(4)}</span>
              <span className="label">成本</span>
            </div>
          </div>
        </div>
      </div>

      {/* 处理步骤 */}
      <div className="processing-steps">
        <h4>处理步骤</h4>
        <div className="steps-list">
          {debugInfo.processingSteps.length === 0 ? (
            <p className="empty">暂无处理步骤</p>
          ) : (
            debugInfo.processingSteps.map((step: { id: string; name: string; status: string; duration?: number }, idx) => (
              <div key={idx} className={`step ${step.status}`}>
                <span className="step-status">
                  {step.status === 'completed' ? <CheckCircle size={14} /> :
                   step.status === 'failed' ? <XCircle size={14} /> :
                   step.status === 'in_progress' ? <Loader2 size={14} className="spin" /> :
                   <Clock size={14} />}
                </span>
                <span className="step-name">{step.name}</span>
                {step.duration && (
                  <span className="step-duration">{step.duration}ms</span>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

/**
 * 调试面板
 */
const DebugPanel: React.FC<{
  agentState: AgentState | null
  metrics: AgentMetrics | null
  debugInfo: {
    lastDecision: unknown
    lastPlan: unknown
    processingSteps: unknown[]
    memoryRetrievals: unknown[]
    securityChecks: unknown[]
  }
  currentIntent: UserIntent | null
}> = ({ agentState, metrics, debugInfo, currentIntent }) => {
  return (
    <aside className="debug-panel">
      <div className="debug-header">
        <Terminal size={18} />
        <span>调试信息</span>
      </div>

      <div className="debug-content">
        {/* 当前状态 */}
        <div className="debug-section">
          <h5>当前状态</h5>
          <div className="debug-item">
            <span className="label">状态:</span>
            <span className="value" style={{ color: getStatusColor(agentState?.status || 'idle') }}>
              {agentState?.status || '未初始化'}
            </span>
          </div>
          <div className="debug-item">
            <span className="label">智能体ID:</span>
            <span className="value">{agentState?.id.slice(0, 8)}...</span>
          </div>
        </div>

        {/* 当前意图 */}
        {currentIntent && (
          <div className="debug-section">
            <h5>当前意图</h5>
            <div className="debug-item">
              <span className="label">主要意图:</span>
              <span className="value">{currentIntent.primary}</span>
            </div>
            <div className="debug-item">
              <span className="label">置信度:</span>
              <span className="value">{Math.round(currentIntent.confidence * 100)}%</span>
            </div>
            <div className="debug-item">
              <span className="label">情感:</span>
              <span className="value">{currentIntent.sentiment}</span>
            </div>
            <div className="debug-item">
              <span className="label">紧急度:</span>
              <span className="value">{currentIntent.urgency}</span>
            </div>
          </div>
        )}

        {/* MCTS决策 */}
        {debugInfo.lastDecision && (
          <div className="debug-section">
            <h5>MCTS 决策</h5>
            <pre className="debug-json">
              {JSON.stringify(debugInfo.lastDecision, null, 2)}
            </pre>
          </div>
        )}

        {/* 执行计划 */}
        {debugInfo.lastPlan && (
          <div className="debug-section">
            <h5>执行计划</h5>
            <pre className="debug-json">
              {JSON.stringify(debugInfo.lastPlan, null, 2)}
            </pre>
          </div>
        )}

        {/* 安全检查 */}
        {debugInfo.securityChecks.length > 0 && (
          <div className="debug-section">
            <h5>安全检查</h5>
            {debugInfo.securityChecks.map((check: unknown, idx) => (
              <div key={idx} className="security-check">
                <pre className="debug-json">
                  {JSON.stringify(check, null, 2)}
                </pre>
              </div>
            ))}
          </div>
        )}
      </div>
    </aside>
  )
}

// 辅助函数
function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    idle: '空闲',
    thinking: '思考中',
    planning: '规划中',
    executing: '执行中',
    reflecting: '反思中',
    error: '错误',
  }
  return labels[status] || status
}

function getIntentLabel(intent: string): string {
  const labels: Record<string, string> = {
    question: '问题',
    command: '命令',
    code_generation: '代码生成',
    analysis: '分析',
    clarification: '澄清',
    greeting: '问候',
    information_seeking: '信息查询',
    problem_solving: '问题解决',
    creative_writing: '创意写作',
  }
  return labels[intent] || intent
}

export default SmartChat
