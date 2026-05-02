import { useEffect } from 'react'

interface KeyboardShortcuts {
  onEscape?: () => void
  onEnter?: () => void
  onSearch?: () => void
}

export function useKeyboardShortcuts({ onEscape, onEnter, onSearch }: KeyboardShortcuts) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return
      }

      if (e.key === 'Escape' && onEscape) {
        onEscape()
      } else if (e.key === 'Enter' && onEnter) {
        onEnter()
      } else if (e.key === '/' && onSearch) {
        e.preventDefault()
        onSearch()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onEscape, onEnter, onSearch])
}