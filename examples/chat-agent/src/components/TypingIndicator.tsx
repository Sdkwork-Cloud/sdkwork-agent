import './TypingIndicator.css'

export function TypingIndicator() {
  return (
    <div className="typing-indicator">
      <div className="message-container">
        <div className="message-avatar">
          <div className="avatar-assistant">AI</div>
        </div>
        <div className="message-content">
          <div className="message-header">
            <span className="message-author">Assistant</span>
          </div>
          <div className="typing-dots">
            <span></span>
            <span></span>
            <span></span>
          </div>
        </div>
      </div>
    </div>
  )
}
