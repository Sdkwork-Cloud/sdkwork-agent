import { useState, useRef, useEffect, useCallback } from 'react'
import { Sidebar } from './components/Sidebar'
import { ChatMessage } from './components/ChatMessage'
import { ChatInput } from './components/ChatInput'
import { AgentConfig } from './components/AgentConfig'
import { TypingIndicator } from './components/TypingIndicator'
import { ExportDialog } from './components/ExportDialog'
import { SkillSelector } from './components/SkillSelector'
import { useAgent } from './hooks/useAgent'
import { useConversations } from './hooks/useConversations'
import { useTheme } from './hooks/useTheme'
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts'
import { useSmartSkills } from './hooks/useSmartSkills'
import { 
  emitSkillStart,
  emitSkillComplete,
} from './agent/events'
import type { Message, Skill } from './types'
import './App.css'

// Detect which skills were actually used based on user input and response content
function detectUsedSkills(
  userInput: string,
  _responseContent: string,
  availableSkills: Skill[]
): string[] {
  const usedSkills: string[] = []
  const inputLower = userInput.toLowerCase()
  
  for (const skill of availableSkills) {
    let shouldInclude = false
    
    // Check skill-specific keywords in user input
    switch (skill.name) {
      case 'math':
        // Math: check for calculation patterns
        if (/\d+\s*[+\-*/]\s*\d+/.test(userInput) || 
            /计算|calculat|math|等于|多少|结果/.test(inputLower)) {
          shouldInclude = true
        }
        break
      case 'translate':
        // Translate: check for translation requests
        if (/翻译|translate|中文|英文|english|chinese|日文|韩文/.test(inputLower)) {
          shouldInclude = true
        }
        break
      case 'time':
        // Time: check for time/date queries
        if (/时间|日期|time|date|几点|今天|现在/.test(inputLower)) {
          shouldInclude = true
        }
        break
      case 'weather':
        // Weather: check for weather queries
        if (/天气|weather|温度|下雨|forecast/.test(inputLower)) {
          shouldInclude = true
        }
        break
      case 'code-assistant':
        // Code: check for code-related queries
        if (/代码|code|编程|program|bug|debug|error|function/.test(inputLower)) {
          shouldInclude = true
        }
        break
      case 'summarize':
        // Summarize: check for summary requests
        if (/总结|summar|摘要|概括|summary/.test(inputLower)) {
          shouldInclude = true
        }
        break
      case 'web-search':
        // Web search: check for search queries
        if (/搜索|search|查询|查找|google|百度/.test(inputLower)) {
          shouldInclude = true
        }
        break
      default:
        // For other skills, check if skill name or keywords appear in input
        if (inputLower.includes(skill.name.toLowerCase())) {
          shouldInclude = true
        }
        // Check tags
        if (skill.metadata?.tags?.some(tag => inputLower.includes(tag.toLowerCase()))) {
          shouldInclude = true
        }
    }
    
    if (shouldInclude) {
      usedSkills.push(skill.name)
    }
  }
  
  return [...new Set(usedSkills)]
}

// Track processed message IDs to prevent duplicates in StrictMode
const processedMessageIds = new Set<string>()

function App() {
  const [inputValue, setInputValue] = useState('')
  const [showConfig, setShowConfig] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [showExport, setShowExport] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  
  // Use state to track if we're currently processing a message (for UI updates)
  const [isSending, setIsSending] = useState(false)

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
    setCurrentConversationId,
  } = useConversations()

  const {
    isReady,
    isProcessing,
    config,
    updateConfig,
    initializeAgent,
    streamMessage,
    stopProcessing,
    clearConfig,
  } = useAgent()

  const {
    config: smartSkillConfig,
    toggleEnabled: toggleSmartMode,
    availableSkills,
    selectedSkills,
    toggleSkill,
    clearSelection,
    matchedSkills,
    refreshMatches,
    getActiveSkills,
  } = useSmartSkills()

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
      setShowConfig(false)
    },
  })

  const handleSendMessage = useCallback(async (content: string) => {
    // Prevent any processing if already processing
    if (isSending) {
      console.log('[App] Already processing, skipping duplicate')
      return
    }
    
    if (!content.trim() || !currentConversationId) return

    if (!isReady) {
      setShowConfig(true)
      return
    }

    // Set processing flag
    setIsSending(true)
    
    // Generate unique IDs
    const timestamp = Date.now()
    const userMessageId = `user-${timestamp}-${Math.random().toString(36).substr(2, 9)}`
    const assistantMessageId = `assistant-${timestamp + 1}-${Math.random().toString(36).substr(2, 9)}`
    
    // Check if we've already processed this exact content in this conversation
    const messageKey = `${currentConversationId}-${content}-${timestamp}`
    if (processedMessageIds.has(messageKey)) {
      console.log('[App] Duplicate message detected, skipping')
      setIsSending(false)
      return
    }
    processedMessageIds.add(messageKey)
    
    // Clean up old processed IDs (keep last 100)
    if (processedMessageIds.size > 100) {
      const iterator = processedMessageIds.values()
      const firstValue = iterator.next().value
      if (firstValue) {
        processedMessageIds.delete(firstValue)
      }
    }

    // Refresh smart skill matches based on user input
    refreshMatches(content)
    
    // Build system prompt with active skills (manual + smart matched)
    const activeSkillObjects = getActiveSkills()
    let systemPrompt = 'You are a helpful AI assistant.'
    
    if (activeSkillObjects.length > 0) {
      systemPrompt += '\n\nYou have access to the following capabilities:\n'
      activeSkillObjects.forEach(skill => {
        systemPrompt += `- ${skill.description}\n`
      })
      systemPrompt += '\nUse these capabilities naturally in your responses without explicitly mentioning you are using them. Just provide helpful answers as if these are your inherent abilities.'
      
      // Add instruction for skill calling format
      systemPrompt += '\n\nWhen you need to use a capability, you can call it using this format: [[skill_name|{"param": "value"}]]'
      systemPrompt += '\nFor example: [[math|{"expression": "2+2"}]] or [[time|{"timezone": "UTC"}]]'
    }

    // Build messages array BEFORE adding new messages to state
    const currentMessages = currentConversation?.messages || []
    const messages = [
      { role: 'system', content: systemPrompt },
      ...currentMessages.slice(-10).map(m => ({
        role: m.role,
        content: m.content,
      })),
      { role: 'user', content },
    ]

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
      const response = await streamMessage(messages, (chunk) => {
        updateMessage(currentConversationId, assistantMessageId, {
          content: chunk,
        })
      })

      // Detect which skills were actually used based on user input and response
      const usedSkillNames = detectUsedSkills(content, response.content, activeSkillObjects)
      
      // Emit events for detected skills
      usedSkillNames.forEach(skillName => {
        emitSkillStart(assistantMessageId, currentConversationId, skillName, {})
        // Emit complete event after a short delay to simulate execution
        setTimeout(() => {
          emitSkillComplete(assistantMessageId, currentConversationId, skillName, { success: true }, 100)
        }, 500)
      })

      // Update final message with skills used
      updateMessage(currentConversationId, assistantMessageId, {
        content: response.content,
        isStreaming: false,
        skillsUsed: usedSkillNames.length > 0 ? usedSkillNames : undefined,
      })
    } catch (error) {
      updateMessage(currentConversationId, assistantMessageId, {
        content: `Error: ${error instanceof Error ? error.message : 'Something went wrong'}`,
        isError: true,
        isStreaming: false,
      })
    } finally {
      // Reset processing flag
      setIsSending(false)
    }
  }, [currentConversationId, currentConversation?.messages, isReady, isSending, addMessage, updateMessage, streamMessage, refreshMatches, getActiveSkills])

  const handleRegenerate = useCallback(async (messageId: string) => {
    if (isSending || !currentConversationId || !currentConversation) return

    setIsSending(true)

    // Find the user message before this assistant message
    const messageIndex = currentConversation.messages.findIndex(m => m.id === messageId)
    if (messageIndex <= 0) {
      setIsSending(false)
      return
    }

    const userMessage = currentConversation.messages[messageIndex - 1]
    if (userMessage.role !== 'user') {
      setIsSending(false)
      return
    }

    // Build messages array BEFORE adding new message
    const messages = [
      { role: 'system', content: 'You are a helpful AI assistant.' },
      ...currentConversation.messages
        .slice(0, messageIndex)
        .slice(-10)
        .map(m => ({
          role: m.role,
          content: m.content,
        })),
    ]

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
      const response = await streamMessage(messages, (chunk) => {
        updateMessage(currentConversationId, assistantMessageId, {
          content: chunk,
        })
      })

      updateMessage(currentConversationId, assistantMessageId, {
        content: response.content,
        isStreaming: false,
      })
    } catch (error) {
      updateMessage(currentConversationId, assistantMessageId, {
        content: `Error: ${error instanceof Error ? error.message : 'Something went wrong'}`,
        isError: true,
        isStreaming: false,
      })
    } finally {
      setIsSending(false)
    }
  }, [currentConversationId, currentConversation, isSending, addMessage, updateMessage, streamMessage])

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
                  conversationId={currentConversationId || ''}
                  onRegenerate={message.role === 'assistant' ? () => handleRegenerate(message.id) : undefined}
                />
              ))}
              {/* Only show TypingIndicator when there's no streaming message in the list */}
              {isProcessing && !currentConversation?.messages.some(m => m.isStreaming) && <TypingIndicator />}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        {/* Input Area */}
        <div className="input-area">
          {/* Skill Selector */}
          <div className="skill-selector-container">
            <SkillSelector
              availableSkills={availableSkills}
              selectedSkills={selectedSkills}
              matchedSkills={matchedSkills}
              isSmartMode={smartSkillConfig.enabled}
              onToggleSmartMode={toggleSmartMode}
              onToggleSkill={toggleSkill}
              onClearSelection={clearSelection}
            />
          </div>
          <ChatInput
            value={inputValue}
            onChange={setInputValue}
            onSend={handleSendMessage}
            disabled={!isReady || isSending}
            placeholder={isReady ? 'Message...' : 'Please configure API key first...'}
            isProcessing={isProcessing || isSending}
            onStop={stopProcessing}
          />
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
