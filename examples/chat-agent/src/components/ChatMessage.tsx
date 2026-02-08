import { useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { CodeBlock } from './CodeBlock'
import { ExecutionEvents } from './ExecutionEvents'
import { SkillCardsList } from './SkillCard'
import type { Message, Skill } from '../types'
import { skillRegistry } from '../skills'
import './ChatMessage.css'

interface ChatMessageProps {
  message: Message
  conversationId: string
  onRegenerate?: () => void
}

export function ChatMessage({ message, conversationId, onRegenerate }: ChatMessageProps) {
  const [isCopied, setIsCopied] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message.content)
      setIsCopied(true)
      setTimeout(() => setIsCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  // Custom renderer for code blocks
  const components = {
    code({ node, inline, className, children, ...props }: any) {
      const match = /language-(\w+)/.exec(className || '')
      const language = match ? match[1] : 'text'
      const code = String(children).replace(/\n$/, '')
      
      if (!inline && code) {
        return <CodeBlock code={code} language={language} />
      }
      return (
        <code className={className} {...props}>
          {children}
        </code>
      )
    },
  }

  return (
    <div className={`message ${message.role} ${message.isError ? 'error' : ''}`}>
      <div className="message-container">
        <div className="message-avatar">
          {message.role === 'user' ? (
            <div className="avatar-user">U</div>
          ) : (
            <div className="avatar-assistant">AI</div>
          )}
        </div>
        <div className="message-content">
          <div className="message-header">
            <span className="message-author">
              {message.role === 'user' ? 'You' : 'Assistant'}
            </span>
            <span className="message-time">{formatTime(message.timestamp)}</span>
          </div>
          <div className="message-body">
            <div className="message-text">
              {message.role === 'assistant' ? (
                <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
                  {message.content || ' '}
                </ReactMarkdown>
              ) : (
                message.content
              )}
              {message.isStreaming && <span className="cursor">▋</span>}
            </div>
            
            {/* Skills Used */}
            {message.skillsUsed && message.skillsUsed.length > 0 && (
              <SkillCardsList 
                skills={message.skillsUsed
                  .map(name => skillRegistry.get(name))
                  .filter((skill): skill is Skill => skill !== undefined)
                } 
              />
            )}
            
            {message.evaluation && (
              <div className={`message-evaluation ${message.evaluation.passed ? 'passed' : 'failed'}`}>
                <div className="evaluation-score">
                  {(message.evaluation.score * 100).toFixed(0)}%
                </div>
                <div className="evaluation-feedback">{message.evaluation.feedback}</div>
              </div>
            )}
            
            {/* Execution Events */}
            {message.role === 'assistant' && (
              <ExecutionEvents 
                messageId={message.id} 
                conversationId={conversationId} 
              />
            )}
          </div>
          
          <div className="message-actions">
            <button 
              className={`action-button ${isCopied ? 'copied' : ''}`}
              onClick={handleCopy}
              title="Copy message"
            >
              {isCopied ? (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
              ) : (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                </svg>
              )}
              {isCopied ? 'Copied!' : 'Copy'}
            </button>
            
            {message.role === 'assistant' && onRegenerate && !message.isStreaming && (
              <button 
                className="action-button"
                onClick={onRegenerate}
                title="Regenerate response"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="23 4 23 10 17 10"></polyline>
                  <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path>
                </svg>
                Regenerate
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
