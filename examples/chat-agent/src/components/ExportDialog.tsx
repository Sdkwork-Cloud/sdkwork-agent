import { exportConversation } from '../utils/export'
import type { Conversation } from '../types'
import './ExportDialog.css'

interface ExportDialogProps {
  conversation: Conversation
  onClose: () => void
}

export function ExportDialog({ conversation, onClose }: ExportDialogProps) {
  const handleExport = (format: 'json' | 'markdown' | 'txt') => {
    exportConversation(conversation, format)
    onClose()
  }

  return (
    <div className="export-overlay" onClick={onClose}>
      <div className="export-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="export-header">
          <h3>Export Conversation</h3>
          <button className="close-button" onClick={onClose}>×</button>
        </div>
        
        <div className="export-content">
          <p className="export-description">
            Export "{conversation.title}" in your preferred format:
          </p>
          
          <div className="export-options">
            <button 
              className="export-option"
              onClick={() => handleExport('markdown')}
            >
              <div className="export-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                  <polyline points="14 2 14 8 20 8"></polyline>
                  <line x1="16" y1="13" x2="8" y2="13"></line>
                  <line x1="16" y1="17" x2="8" y2="17"></line>
                  <polyline points="10 9 9 9 8 9"></polyline>
                </svg>
              </div>
              <div className="export-info">
                <span className="export-name">Markdown</span>
                <span className="export-desc">Best for sharing and documentation</span>
              </div>
            </button>
            
            <button 
              className="export-option"
              onClick={() => handleExport('json')}
            >
              <div className="export-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                  <polyline points="14 2 14 8 20 8"></polyline>
                  <line x1="16" y1="13" x2="8" y2="13"></line>
                  <line x1="16" y1="17" x2="8" y2="17"></line>
                </svg>
              </div>
              <div className="export-info">
                <span className="export-name">JSON</span>
                <span className="export-desc">Complete data with metadata</span>
              </div>
            </button>
            
            <button 
              className="export-option"
              onClick={() => handleExport('txt')}
            >
              <div className="export-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                  <polyline points="14 2 14 8 20 8"></polyline>
                  <line x1="16" y1="13" x2="8" y2="13"></line>
                  <line x1="16" y1="17" x2="8" y2="17"></line>
                </svg>
              </div>
              <div className="export-info">
                <span className="export-name">Plain Text</span>
                <span className="export-desc">Simple text format</span>
              </div>
            </button>
          </div>
        </div>
        
        <div className="export-footer">
          <button className="cancel-button" onClick={onClose}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}
