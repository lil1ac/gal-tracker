import { useTheme } from '../context/ThemeContext'

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()

  return (
    <div className="flex gap-2 glass neon-button p-1 rounded-lg">
      <button
        onClick={() => setTheme('light')}
        className={`px-3 py-1 rounded transition-all duration-300 ${
          theme === 'light'
            ? 'bg-[var(--accent)] text-white shadow-[0_0_10px_var(--accent)]'
            : 'hover:text-[var(--accent)]'
        }`}
      >
        浅色
      </button>
      <button
        onClick={() => setTheme('dark')}
        className={`px-3 py-1 rounded transition-all duration-300 ${
          theme === 'dark'
            ? 'bg-[var(--accent)] text-white shadow-[0_0_10px_var(--accent)]'
            : 'hover:text-[var(--accent)]'
        }`}
      >
        深色
      </button>
      <button
        onClick={() => setTheme('system')}
        className={`px-3 py-1 rounded transition-all duration-300 ${
          theme === 'system'
            ? 'bg-[var(--accent)] text-white shadow-[0_0_10px_var(--accent)]'
            : 'hover:text-[var(--accent)]'
        }`}
      >
        系统
      </button>
    </div>
  )
}