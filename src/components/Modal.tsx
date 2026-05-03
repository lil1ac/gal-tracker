import { useEffect, useCallback } from 'react'

interface ModalProps {
  open: boolean
  onClose: () => void
  title?: string
  children: React.ReactNode
}

export function Modal({ open, onClose, title, children }: ModalProps) {
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') onClose()
  }, [onClose])

  useEffect(() => {
    if (open) {
      document.addEventListener('keydown', handleKeyDown)
      return () => document.removeEventListener('keydown', handleKeyDown)
    }
  }, [open, handleKeyDown])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-[var(--bg-secondary)] rounded-xl shadow-[var(--shadow-md)] border border-[var(--border)] w-[32rem] max-h-[80vh] flex flex-col m-4">
        {title && (
          <div className="flex justify-between items-center px-5 py-4 border-b border-[var(--border)] shrink-0">
            <h2 className="font-semibold">{title}</h2>
            <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded hover:bg-[var(--bg-primary)] transition-colors text-lg leading-none">&times;</button>
          </div>
        )}
        <div className="flex-1 overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  )
}
