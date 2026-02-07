import { useEffect, useCallback } from 'react'

interface KeyboardShortcutsOptions {
  onNewChat?: () => void
  onFocusInput?: () => void
  onToggleSidebar?: () => void
  onToggleTheme?: () => void
  onSearch?: () => void
  onEscape?: () => void
}

export function useKeyboardShortcuts(options: KeyboardShortcutsOptions) {
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    // Ignore shortcuts when typing in input/textarea
    if (event.target instanceof HTMLInputElement || 
        event.target instanceof HTMLTextAreaElement) {
      // Allow Escape even in inputs
      if (event.key === 'Escape' && options.onEscape) {
        options.onEscape()
      }
      return
    }

    const { onNewChat, onFocusInput, onToggleSidebar, onToggleTheme, onSearch, onEscape } = options

    switch (event.key) {
      case 'n':
      case 'N':
        if (event.ctrlKey || event.metaKey) {
          event.preventDefault()
          onNewChat?.()
        }
        break

      case '/':
        if (!event.ctrlKey && !event.metaKey) {
          event.preventDefault()
          onFocusInput?.()
        }
        break

      case 'b':
      case 'B':
        if (event.ctrlKey || event.metaKey) {
          event.preventDefault()
          onToggleSidebar?.()
        }
        break

      case 'd':
      case 'D':
        if (event.ctrlKey || event.metaKey) {
          event.preventDefault()
          onToggleTheme?.()
        }
        break

      case 'k':
      case 'K':
        if (event.ctrlKey || event.metaKey) {
          event.preventDefault()
          onSearch?.()
        }
        break

      case 'Escape':
        onEscape?.()
        break
    }
  }, [options])

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])
}

export function getShortcutLabel(key: string, ctrl = true): string {
  const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0
  const modifier = isMac ? '⌘' : 'Ctrl'
  return ctrl ? `${modifier}+${key.toUpperCase()}` : key
}
