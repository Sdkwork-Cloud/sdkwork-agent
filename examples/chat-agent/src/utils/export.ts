import type { Conversation } from '../types'

export function exportToJSON(conversation: Conversation): string {
  const exportData = {
    version: '1.0',
    exportedAt: new Date().toISOString(),
    conversation: {
      id: conversation.id,
      title: conversation.title,
      createdAt: conversation.createdAt,
      updatedAt: conversation.updatedAt,
      messages: conversation.messages.map(msg => ({
        role: msg.role,
        content: msg.content,
        timestamp: msg.timestamp,
        skillsUsed: msg.skillsUsed,
        evaluation: msg.evaluation,
      })),
    },
  }
  return JSON.stringify(exportData, null, 2)
}

export function exportToMarkdown(conversation: Conversation): string {
  const lines: string[] = []
  
  // Header
  lines.push(`# ${conversation.title}`)
  lines.push('')
  lines.push(`> Exported on ${new Date().toLocaleString()}`)
  lines.push('')
  lines.push('---')
  lines.push('')
  
  // Messages
  for (const message of conversation.messages) {
    const date = new Date(message.timestamp).toLocaleString()
    
    if (message.role === 'user') {
      lines.push(`## 👤 User (${date})`)
    } else {
      lines.push(`## 🤖 Assistant (${date})`)
    }
    lines.push('')
    lines.push(message.content)
    lines.push('')
    
    // Add skills used
    if (message.skillsUsed && message.skillsUsed.length > 0) {
      lines.push(`*Skills: ${message.skillsUsed.join(', ')}*`)
      lines.push('')
    }
    
    // Add evaluation
    if (message.evaluation) {
      lines.push(`> Evaluation: ${(message.evaluation.score * 100).toFixed(0)}% - ${message.evaluation.feedback}`)
      lines.push('')
    }
    
    lines.push('---')
    lines.push('')
  }
  
  return lines.join('\n')
}

export function exportToText(conversation: Conversation): string {
  const lines: string[] = []
  
  lines.push(`Conversation: ${conversation.title}`)
  lines.push(`Exported: ${new Date().toLocaleString()}`)
  lines.push('')
  lines.push('=' .repeat(50))
  lines.push('')
  
  for (const message of conversation.messages) {
    const prefix = message.role === 'user' ? 'You:' : 'Assistant:'
    lines.push(`${prefix}`)
    lines.push(message.content)
    lines.push('')
  }
  
  return lines.join('\n')
}

export function downloadFile(content: string, filename: string, type: string) {
  const blob = new Blob([content], { type })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

export function exportConversation(conversation: Conversation, format: 'json' | 'markdown' | 'txt' = 'markdown') {
  let content: string
  let filename: string
  let mimeType: string
  
  const sanitizedTitle = conversation.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()
  const timestamp = new Date().toISOString().split('T')[0]
  
  switch (format) {
    case 'json':
      content = exportToJSON(conversation)
      filename = `${sanitizedTitle}_${timestamp}.json`
      mimeType = 'application/json'
      break
    case 'txt':
      content = exportToText(conversation)
      filename = `${sanitizedTitle}_${timestamp}.txt`
      mimeType = 'text/plain'
      break
    case 'markdown':
    default:
      content = exportToMarkdown(conversation)
      filename = `${sanitizedTitle}_${timestamp}.md`
      mimeType = 'text/markdown'
      break
  }
  
  downloadFile(content, filename, mimeType)
}
