import { useTheme } from '../context/ThemeContext'

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()

  return (
    <div className="flex gap-2">
      <button
        onClick={() => setTheme('light')}
        className={`px-3 py-1 rounded ${theme === 'light' ? 'bg-[var(--accent)] text-white' : ''}`}
      >
        浅色
      </button>
      <button
        onClick={() => setTheme('dark')}
        className={`px-3 py-1 rounded ${theme === 'dark' ? 'bg-[var(--accent)] text-white' : ''}`}
      >
        深色
      </button>
      <button
        onClick={() => setTheme('system')}
        className={`px-3 py-1 rounded ${theme === 'system' ? 'bg-[var(--accent)] text-white' : ''}`}
      >
        系统
      </button>
    </div>
  )
}