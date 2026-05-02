import { useTheme } from '../context/ThemeContext'

const themes = [
  { key: 'light' as const, label: '浅色', icon: '☀️' },
  { key: 'dark' as const, label: '深色', icon: '🌙' },
  { key: 'system' as const, label: '系统', icon: '🖥️' },
]

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()

  return (
    <div className="flex bg-[var(--bg-primary)] rounded-md p-0.5 border border-[var(--border)]">
      {themes.map(({ key, label, icon }) => (
        <button
          key={key}
          onClick={() => setTheme(key)}
          title={label}
          className={`px-2 py-1 text-xs rounded transition-colors ${
            theme === key
              ? 'bg-[var(--bg-secondary)] text-[var(--accent)] shadow-sm font-medium'
              : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
          }`}
        >
          {icon}
        </button>
      ))}
    </div>
  )
}
