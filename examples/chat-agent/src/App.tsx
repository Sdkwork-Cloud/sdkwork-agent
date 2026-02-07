import { useState, useRef, useEffect } from 'react'
import { Sidebar } from './components/Sidebar'
import { ChatMessage } from './components/ChatMessage'
import { ChatInput } from './components/ChatInput'
import { SkillPanel } from './components/SkillPanel'
import { AgentConfig } from './components/AgentConfig'
import { TypingIndicator } from './components/TypingIndicator'
import { ExportDialog } from './components/ExportDialog'
import { SmartChat } from './components/SmartChat'
import { useAgent } from './hooks/useAgent'
import { useConversations } from './hooks/useConversations'
import { useTheme } from './hooks/useTheme'
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts'
import { Brain, MessageSquare, Sparkles } from 'lucide-react'
import type { Message, Skill } from './types'
import './App.css'

/**
 * 应用模式
 */
type AppMode = 'standard' | 'smart'

function App() {
  const [inputValue, setInputValue] = useState('')
  const [showSkillPanel, setShowSkillPanel] = useState(false)
  const [showConfig, setShowConfig] = useState(false)
  const [selectedSkills, setSelectedSkills] = useState<string[]>([])
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [showExport, setShowExport] = useState(false)
  const [appMode, setAppMode] = useState<AppMode>('standard')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const { theme, resolvedTheme, toggleTheme, isDark } = useTheme()

  const {
    conversations,
    currentConversation,
    currentConversationId,
    isLoaded,
    createConversation,
    deleteConversation,
    addMessage,
    updateMessage,
    regenerateMessage,
    setCurrentConversationId,
  } = useConversations()

  const {
    isReady,
    isProcessing,
    availableSkills,
    config,
    updateConfig,
    initializeAgent,
    streamMessage,
    stopProcessing,
    clearConfig,
    switchConversation,
    syncConversationContext,
  } = useAgent()

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [currentConversation?.messages])

  // Create initial conversation if none exists
  useEffect(() => {
    if (isLoaded && conversations.length === 0) {
      createConversation()
    }
  }, [isLoaded, conversations.length, createConversation])

  // Sync conversation context when switching conversations
  useEffect(() => {
    if (currentConversationId && currentConversation) {
      switchConversation(currentConversationId)
      // Sync context from existing messages
      syncConversationContext(currentConversationId, currentConversation.messages)
    }
  }, [currentConversationId, currentConversation, switchConversation, syncConversationContext])

  const handleNewChat = () => {
    createConversation()
    setSidebarOpen(false)
  }

  // Keyboard shortcuts
  useKeyboardShortcuts({
    onNewChat: handleNewChat,
    onFocusInput: () => inputRef.current?.focus(),
    onToggleSidebar: () => setSidebarOpen(prev => !prev),
    onToggleTheme: toggleTheme,
    onEscape: () => {
      setShowSkillPanel(false)
      setShowConfig(false)
    },
  })

  const handleSendMessage = async (content: string) => {
    if (!content.trim() || isProcessing || !currentConversationId) return

    if (!isReady) {
      setShowConfig(true)
      return
    }

    // Generate unique IDs using timestamp + random suffix
    const timestamp = Date.now()
    const userMessageId = `user-${timestamp}-${Math.random().toString(36).substr(2, 9)}`
    const assistantMessageId = `assistant-${timestamp + 1}-${Math.random().toString(36).substr(2, 9)}`

    // Add user message
    const userMessage: Message = {
      id: userMessageId,
      role: 'user',
      content,
      timestamp: timestamp,
    }
    addMessage(currentConversationId, userMessage)
    setInputValue('')

    // Create placeholder for assistant response
    const assistantMessage: Message = {
      id: assistantMessageId,
      role: 'assistant',
      content: '',
      timestamp: timestamp + 1,
      isStreaming: true,
    }
    addMessage(currentConversationId, assistantMessage)

    // Stream response
    try {
      const response = await streamMessage(content, selectedSkills, (chunk) => {
        updateMessage(currentConversationId, assistantMessageId, {
          content: chunk,
        })
      }, currentConversationId)

      // Update final message
      updateMessage(currentConversationId, assistantMessageId, {
        content: response.content,
        skillsUsed: response.skillsUsed,
        evaluation: response.evaluation,
        isStreaming: false,
      })
    } catch (error) {
      updateMessage(currentConversationId, assistantMessageId, {
        content: `Error: ${error instanceof Error ? error.message : 'Something went wrong'}`,
        isError: true,
        isStreaming: false,
      })
    }
  }

  const handleInputChange = (value: string) => {
    setInputValue(value)
    if (value === '/') {
      setShowSkillPanel(true)
    } else if (!value.startsWith('/')) {
      setShowSkillPanel(false)
    }
  }

  const handleSkillSelect = (skill: Skill) => {
    setSelectedSkills((prev) =>
      prev.includes(skill.name)
        ? prev.filter((s) => s !== skill.name)
        : [...prev, skill.name]
    )
    setShowSkillPanel(false)
    setInputValue('')
  }

  const handleRegenerate = async (messageId: string) => {
    if (!currentConversationId || isProcessing) return

    // Get the user message content for regeneration
    const userContent = regenerateMessage(currentConversationId, messageId)
    if (!userContent) return

    // Create new assistant message placeholder with unique ID
    const timestamp = Date.now()
    const assistantMessageId = `assistant-${timestamp}-${Math.random().toString(36).substr(2, 9)}`
    const assistantMessage: Message = {
      id: assistantMessageId,
      role: 'assistant',
      content: '',
      timestamp: timestamp,
      isStreaming: true,
    }
    addMessage(currentConversationId, assistantMessage)

    // Stream response
    try {
      const response = await streamMessage(userContent, selectedSkills, (chunk) => {
        updateMessage(currentConversationId, assistantMessageId, {
          content: chunk,
        })
      }, currentConversationId)

      updateMessage(currentConversationId, assistantMessageId, {
        content: response.content,
        skillsUsed: response.skillsUsed,
        evaluation: response.evaluation,
        isStreaming: false,
      })
    } catch (error) {
      updateMessage(currentConversationId, assistantMessageId, {
        content: `Error: ${error instanceof Error ? error.message : 'Something went wrong'}`,
        isError: true,
        isStreaming: false,
      })
    }
  }

  // 渲染智能模式
  if (appMode === 'smart') {
    return (
      <div className="app smart-mode">
        <SmartChat />
        <button
          className="mode-switcher"
          onClick={() => setAppMode('standard')}
          title="切换到标准模式"
        >
          <MessageSquare size={18} />
          <span>标准模式</span>
        </button>
      </div>
    )
  }

  return (
    <div className="app">
      <Sidebar
        conversations={conversations}
        currentConversationId={currentConversationId}
        onSelectConversation={(id) => {
          setCurrentConversationId(id)
          setSidebarOpen(false)
        }}
        onCreateConversation={handleNewChat}
        onDeleteConversation={deleteConversation}
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
      />

      <main className="main-content">
        {/* Header */}
        <header className="app-header">
          <div className="header-left">
            <button
              className="menu-button"
              onClick={() => setSidebarOpen(true)}
              title="Open sidebar"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="3" y1="12" x2="21" y2="12"></line>
                <line x1="3" y1="6" x2="21" y2="6"></line>
                <line x1="3" y1="18" x2="21" y2="18"></line>
              </svg>
            </button>
            <h1 className="header-title">
              {currentConversation?.title || 'New Chat'}
            </h1>
          </div>
          <div className="header-actions">
            {/* 智能模式切换按钮 */}
            <button
              className="smart-mode-btn"
              onClick={() => setAppMode('smart')}
              title="切换到智能模式 (MCTS + 向量记忆)"
            >
              <Brain size={18} />
              <span>智能模式</span>
              <Sparkles size={14} className="sparkle" />
            </button>

            <button
              className={`status-indicator ${isReady ? 'ready' : 'not-ready'}`}
              onClick={() => setShowConfig(true)}
              title="Configure agent"
            >
              <span className="status-dot"></span>
              {isReady ? 'Ready' : 'Setup Required'}
            </button>
            <button
              className="icon-button"
              onClick={toggleTheme}
              title={`Theme: ${theme} (${resolvedTheme})`}
            >
              {isDark ? (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="5"></circle>
                  <line x1="12" y1="1" x2="12" y2="3"></line>
                  <line x1="12" y1="21" x2="12" y2="23"></line>
                  <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
                  <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
                  <line x1="1" y1="12" x2="3" y2="12"></line>
                  <line x1="21" y1="12" x2="23" y2="12"></line>
                  <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
                  <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
                </svg>
              ) : (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
                </svg>
              )}
            </button>
            {currentConversation && (
              <button
                className="icon-button"
                onClick={() => setShowExport(true)}
                title="Export conversation"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                  <polyline points="7 10 12 15 17 10"></polyline>
                  <line x1="12" y1="15" x2="12" y2="3"></line>
                </svg>
              </button>
            )}
            <button
              className="icon-button"
              onClick={() => setShowConfig(true)}
              title="Settings"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="3"></circle>
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
              </svg>
            </button>
          </div>
        </header>

        {/* Messages */}
        <div className="messages-area">
          {currentConversation?.messages.length === 0 ? (
            <div className="welcome-screen">
              <div className="welcome-content">
                <h2>How can I help you today?</h2>
                <p>Type a message to start a conversation</p>
                
                {/* 智能模式推广 */}
                <div className="smart-mode-promo">
                  <button
                    className="promo-btn"
                    onClick={() => setAppMode('smart')}
                  >
                    <Brain size={24} />
                    <div className="promo-text">
                      <strong>尝试智能模式</strong>
                      <span>体验 MCTS 决策 + 向量记忆 + 安全检测</span>
                    </div>
                    <Sparkles size={16} />
                  </button>
                </div>

                <div className="quick-actions">
                  <button onClick={() => handleSendMessage('Hello!')}>
                    👋 Say hello
                  </button>
                  <button onClick={() => handleSendMessage('Can you help with math?')}>
                    🧮 Math help
                  </button>
                  <button onClick={() => handleSendMessage('Translate to Chinese')}>
                    🌐 Translate
                  </button>
                  <button onClick={() => handleSendMessage('Write some code')}>
                    💻 Code help
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <>
              {currentConversation?.messages.map((message) => (
                <ChatMessage 
                  key={message.id} 
                  message={message} 
                  onRegenerate={message.role === 'assistant' ? () => handleRegenerate(message.id) : undefined}
                />
              ))}
              {isProcessing && <TypingIndicator />}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        {/* Input Area */}
        <div className="input-area">
          {selectedSkills.length > 0 && (
            <div className="selected-skills-bar">
              <span className="skills-label">Skills:</span>
              {selectedSkills.map((skill) => (
                <span key={skill} className="skill-tag-mini">
                  {skill}
                  <button onClick={() => handleSkillSelect({ name: skill } as Skill)}>
                    ×
                  </button>
                </span>
              ))}
              <button className="clear-skills-btn" onClick={() => setSelectedSkills([])}>
                Clear all
              </button>
            </div>
          )}

          <ChatInput
            value={inputValue}
            onChange={handleInputChange}
            onSend={handleSendMessage}
            disabled={!isReady}
            placeholder={isReady ? 'Message...' : 'Please configure API key first...'}
            isProcessing={isProcessing}
            onStop={stopProcessing}
          />

          {showSkillPanel && (
            <SkillPanel
              skills={availableSkills}
              selectedSkills={selectedSkills}
              onSelect={handleSkillSelect}
              onClose={() => setShowSkillPanel(false)}
            />
          )}
        </div>
      </main>

      {showConfig && (
        <AgentConfig
          config={config}
          onUpdate={updateConfig}
          onInitialize={initializeAgent}
          onClearConfig={clearConfig}
          isReady={isReady}
          onClose={() => setShowConfig(false)}
        />
      )}

      {showExport && currentConversation && (
        <ExportDialog
          conversation={currentConversation}
          onClose={() => setShowExport(false)}
        />
      )}
    </div>
  )
}

export default App
