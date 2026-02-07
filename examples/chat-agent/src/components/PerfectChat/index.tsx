import React, { useState, useRef, useEffect } from 'react'
import {
  Brain,
  Sparkles,
  Zap,
  Clock,
  RotateCcw,
  Trash2,
  Send,
  Square,
  Lightbulb,
  Activity,
} from 'lucide-react'
import { useConversationEngine, MessageState } from '../../hooks/useConversationEngine'
import './styles.css'

/**
 * 完美对话组件
 * 
 * 提供极致的对话体验：
 * - 打字机效果
 * - 思考过程可视化
 * - 意图识别显示
 * - 流畅的动画
 */
export const PerfectChat: React.FC = () => {
  const [inputValue, setInputValue] = useState('')
  const [showThinking, setShowThinking] = useState(true)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const {
    messages,
    isProcessing,
    currentIntent,
    sendMessage,
    stopProcessing,
    clearMessages,
    regenerateMessage,
  } = useConversationEngine({
    conversationId: 'perfect-chat',
    enableStreaming: true,
    enableThinking: true,
    typingSpeed: 25,
  })

  // 自动滚动
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // 聚焦输入框
  useEffect(() => {
    inputRef.current?.focus()
  }, [isProcessing])

  // 发送消息
  const handleSend = async () => {
    if (!inputValue.trim() || isProcessing) return
    const content = inputValue.trim()
    setInputValue('')
    await sendMessage(content)
  }

  // 键盘处理
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="perfect-chat">
      {/* 头部 */}
      <header className="perfect-chat-header">
        <div className="header-brand">
          <div className="brand-icon">
            <Brain size={24} />
            <Sparkles size={12} className="sparkle" />
          </div>
          <div className="brand-text">
            <h1>Perfect Chat</h1>
            <span>极致对话体验</span>
          </div>
        </div>

        <div className="header-actions">
          {currentIntent && (
            <div className="intent-badge">
              <Zap size={14} />
              <span>{getIntentLabel(currentIntent.primary)}</span>
              <span className="confidence">{Math.round(currentIntent.confidence * 100)}%</span>
            </div>
          )}

          <button
            className={`toggle-btn ${showThinking ? 'active' : ''}`}
            onClick={() => setShowThinking(!showThinking)}
            title="显示思考过程"
          >
            <Lightbulb size={16} />
          </button>

          <button
            className="action-btn"
            onClick={clearMessages}
            disabled={messages.length === 0}
            title="清空对话"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </header>

      {/* 消息区域 */}
      <div className="messages-container">
        {messages.length === 0 ? (
          <WelcomeScreen onSuggestion={sendMessage} />
        ) : (
          <>
            {messages.map((message) => (
              <MessageItem
                key={message.id}
                message={message}
                showThinking={showThinking}
                onRegenerate={() => regenerateMessage(message.id)}
              />
            ))}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* 输入区域 */}
      <div className="input-area">
        <div className="input-wrapper">
          <textarea
            ref={inputRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="输入消息，体验完美的对话..."
            disabled={isProcessing}
            rows={1}
          />
          <div className="input-actions">
            {isProcessing ? (
              <button
                className="btn-stop"
                onClick={stopProcessing}
                title="停止生成"
              >
                <Square size={18} fill="currentColor" />
              </button>
            ) : (
              <button
                className="btn-send"
                onClick={handleSend}
                disabled={!inputValue.trim()}
                title="发送"
              >
                <Send size={18} />
              </button>
            )}
          </div>
        </div>
        <div className="input-hint">
          按 Enter 发送，Shift + Enter 换行
        </div>
      </div>
    </div>
  )
}

/**
 * 欢迎屏幕
 */
const WelcomeScreen: React.FC<{ onSuggestion: (content: string) => void }> = ({
  onSuggestion,
}) => {
  const suggestions = [
    { icon: '👋', text: '你好，请介绍一下自己', desc: '问候与介绍' },
    { icon: '💻', text: '写一段快速排序代码', desc: '代码生成' },
    { icon: '📊', text: '分析一下人工智能的发展趋势', desc: '分析推理' },
    { icon: '✍️', text: '写一首关于春天的诗', desc: '创意写作' },
  ]

  return (
    <div className="welcome-screen">
      <div className="welcome-icon">
        <Brain size={64} />
        <div className="icon-glow" />
      </div>
      <h2>开始完美对话</h2>
      <p>体验打字机效果、思考可视化、意图识别</p>

      <div className="suggestions">
        {suggestions.map((item, index) => (
          <button
            key={index}
            className="suggestion-card"
            onClick={() => onSuggestion(item.text)}
            style={{ animationDelay: `${index * 0.1}s` }}
          >
            <span className="suggestion-icon">{item.icon}</span>
            <div className="suggestion-text">
              <span className="suggestion-main">{item.text}</span>
              <span className="suggestion-desc">{item.desc}</span>
            </div>
          </button>
        ))}
      </div>

      <div className="features">
        <div className="feature">
          <Activity size={16} />
          <span>打字机效果</span>
        </div>
        <div className="feature">
          <Lightbulb size={16} />
          <span>思考可视化</span>
        </div>
        <div className="feature">
          <Zap size={16} />
          <span>意图识别</span>
        </div>
      </div>
    </div>
  )
}

/**
 * 消息项
 */
const MessageItem: React.FC<{
  message: MessageState
  showThinking: boolean
  onRegenerate: () => void
}> = ({ message, showThinking, onRegenerate }) => {
  const isUser = message.role === 'user'

  return (
    <div className={`message ${message.role} ${message.isStreaming ? 'streaming' : ''}`}>
      <div className="message-avatar">
        {isUser ? (
          <div className="avatar user">U</div>
        ) : (
          <div className="avatar assistant">
            <Brain size={20} />
          </div>
        )}
      </div>

      <div className="message-content">
        <div className="message-header">
          <span className="message-role">{isUser ? '用户' : '智能体'}</span>
          <span className="message-time">
            {new Date(message.timestamp).toLocaleTimeString()}
          </span>
        </div>

        {/* 思考过程 */}
        {!isUser && showThinking && message.isThinking && message.thinkingContent && (
          <div className="thinking-bubble">
            <Clock size={14} className="thinking-icon" />
            <span>{message.thinkingContent}</span>
          </div>
        )}

        {/* 动作指示 */}
        {!isUser && message.isAction && message.actionContent && (
          <div className="action-bubble">
            <Activity size={14} className="action-icon" />
            <span>{message.actionContent}</span>
          </div>
        )}

        {/* 消息内容 */}
        <div className="message-body">
          {message.content ? (
            <div className="message-text">{message.content}</div>
          ) : message.isStreaming ? (
            <TypingIndicator />
          ) : null}
        </div>

        {/* 元数据 */}
        {!isUser && message.metadata && !message.isStreaming && (
          <div className="message-meta">
            {message.metadata.confidence && (
              <span className="meta-item">
                置信度: {Math.round(message.metadata.confidence * 100)}%
              </span>
            )}
            <button
              className="regenerate-btn"
              onClick={onRegenerate}
              title="重新生成"
            >
              <RotateCcw size={12} />
              <span>重新生成</span>
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

/**
 * 打字指示器
 */
const TypingIndicator: React.FC = () => {
  return (
    <div className="typing-indicator">
      <span className="dot" />
      <span className="dot" />
      <span className="dot" />
    </div>
  )
}

/**
 * 获取意图标签
 */
function getIntentLabel(intent: string): string {
  const labels: Record<string, string> = {
    question: '问题',
    command: '命令',
    code_generation: '代码',
    analysis: '分析',
    clarification: '澄清',
    greeting: '问候',
    creative: '创作',
    information_seeking: '查询',
  }
  return labels[intent] || intent
}

export default PerfectChat
