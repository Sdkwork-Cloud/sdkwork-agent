import { useState, useCallback, useEffect } from 'react'
import type { Conversation, Message } from '../types'

const STORAGE_KEY = 'chat-agent-conversations'

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2)
}

function generateTitle(messages: Message[]): string {
  const firstUserMessage = messages.find(m => m.role === 'user')
  if (firstUserMessage) {
    const title = firstUserMessage.content.slice(0, 30)
    return title.length < firstUserMessage.content.length ? title + '...' : title
  }
  return 'New Chat'
}

export function useConversations() {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null)
  const [isLoaded, setIsLoaded] = useState(false)

  // Load from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      try {
        const parsed = JSON.parse(stored)
        setConversations(parsed.conversations || [])
        setCurrentConversationId(parsed.currentConversationId || null)
      } catch {
        // Invalid storage data, start fresh
      }
    }
    setIsLoaded(true)
  }, [])

  // Save to localStorage whenever conversations change
  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        conversations,
        currentConversationId
      }))
    }
  }, [conversations, currentConversationId, isLoaded])

  const createConversation = useCallback((): string => {
    const newConversation: Conversation = {
      id: generateId(),
      title: 'New Chat',
      messages: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }
    setConversations(prev => [newConversation, ...prev])
    setCurrentConversationId(newConversation.id)
    return newConversation.id
  }, [])

  const deleteConversation = useCallback((id: string) => {
    setConversations(prev => prev.filter(c => c.id !== id))
    if (currentConversationId === id) {
      setCurrentConversationId(null)
    }
  }, [currentConversationId])

  const updateConversation = useCallback((id: string, updates: Partial<Conversation>) => {
    setConversations(prev => prev.map(c => {
      if (c.id === id) {
        const updated = { ...c, ...updates, updatedAt: Date.now() }
        // Auto-update title if messages changed
        if (updates.messages && updates.messages.length > 1) {
          updated.title = generateTitle(updated.messages)
        }
        return updated
      }
      return c
    }))
  }, [])

  const addMessage = useCallback((conversationId: string, message: Message) => {
    setConversations(prev => prev.map(c => {
      if (c.id === conversationId) {
        const messages = [...c.messages, message]
        return {
          ...c,
          messages,
          title: c.title === 'New Chat' ? generateTitle(messages) : c.title,
          updatedAt: Date.now(),
        }
      }
      return c
    }))
  }, [])

  const updateMessage = useCallback((conversationId: string, messageId: string, updates: Partial<Message>) => {
    setConversations(prev => prev.map(c => {
      if (c.id === conversationId) {
        return {
          ...c,
          messages: c.messages.map(m => m.id === messageId ? { ...m, ...updates } : m),
          updatedAt: Date.now(),
        }
      }
      return c
    }))
  }, [])

  const clearAllConversations = useCallback(() => {
    setConversations([])
    setCurrentConversationId(null)
  }, [])

  const deleteMessage = useCallback((conversationId: string, messageId: string) => {
    setConversations(prev => prev.map(c => {
      if (c.id === conversationId) {
        return {
          ...c,
          messages: c.messages.filter(m => m.id !== messageId),
          updatedAt: Date.now(),
        }
      }
      return c
    }))
  }, [])

  const regenerateMessage = useCallback((conversationId: string, assistantMessageId: string): string | null => {
    // Find the user message that triggered this assistant response
    const conversation = conversations.find(c => c.id === conversationId)
    if (!conversation) return null

    const assistantIndex = conversation.messages.findIndex(m => m.id === assistantMessageId)
    if (assistantIndex <= 0) return null

    // Find the preceding user message
    let userMessageIndex = -1
    for (let i = assistantIndex - 1; i >= 0; i--) {
      if (conversation.messages[i].role === 'user') {
        userMessageIndex = i
        break
      }
    }

    if (userMessageIndex === -1) return null

    const userMessage = conversation.messages[userMessageIndex]

    // Delete the assistant message
    deleteMessage(conversationId, assistantMessageId)

    return userMessage.content
  }, [conversations, deleteMessage])

  const currentConversation = conversations.find(c => c.id === currentConversationId) || null

  return {
    conversations,
    currentConversation,
    currentConversationId,
    isLoaded,
    createConversation,
    deleteConversation,
    updateConversation,
    addMessage,
    updateMessage,
    deleteMessage,
    regenerateMessage,
    setCurrentConversationId,
    clearAllConversations,
  }
}
