import { createContext, useContext, useEffect, useState, useCallback } from 'react'

type Theme = 'light' | 'dark' | 'system'
export type AccentId = 'warm-brown' | 'amber' | 'rose' | 'violet' | 'mint' | 'night-blue' | 'graphite'

interface AccentColors {
  accent: string
  accentHover: string
  accentSoft: string
}

interface AccentPalette {
  label: string
  light: AccentColors
  dark: AccentColors
}

export const ACCENT_PALETTES: Record<AccentId, AccentPalette> = {
  'warm-brown': {
    label: '暖棕',
    light:  { accent: '#8b5d4b', accentHover: '#744c3e', accentSoft: '#f3ece7' },
    dark:   { accent: '#c49a7c', accentHover: '#d2aa8d', accentSoft: '#2e2824' },
  },
  'amber': {
    label: '琥珀',
    light:  { accent: '#b45309', accentHover: '#92400e', accentSoft: '#fef3c7' },
    dark:   { accent: '#f59e0b', accentHover: '#fbbf24', accentSoft: '#2a2418' },
  },
  'rose': {
    label: '玫瑰',
    light:  { accent: '#be123c', accentHover: '#9f1239', accentSoft: '#ffe4e6' },
    dark:   { accent: '#fda4af', accentHover: '#fecdd3', accentSoft: '#2d1e22' },
  },
  'violet': {
    label: '紫藤',
    light:  { accent: '#6d28d9', accentHover: '#5b21b6', accentSoft: '#ede9fe' },
    dark:   { accent: '#a78bfa', accentHover: '#c4b5fd', accentSoft: '#24203a' },
  },
  'mint': {
    label: '薄荷',
    light:  { accent: '#0f766e', accentHover: '#115e59', accentSoft: '#ccfbf1' },
    dark:   { accent: '#2dd4bf', accentHover: '#5eead4', accentSoft: '#192b28' },
  },
  'night-blue': {
    label: '夜幕蓝',
    light:  { accent: '#4338ca', accentHover: '#3730a3', accentSoft: '#e0e7ff' },
    dark:   { accent: '#818cf8', accentHover: '#a5b4fc', accentSoft: '#1e203a' },
  },
  'graphite': {
    label: '石墨',
    light:  { accent: '#57534e', accentHover: '#44403c', accentSoft: '#f5f5f4' },
    dark:   { accent: '#d6d3d1', accentHover: '#e7e5e4', accentSoft: '#252525' },
  },
}

const DEFAULT_ACCENT: AccentId = 'warm-brown'

function applyAccent(accentId: AccentId, effectiveTheme: 'light' | 'dark') {
  const palette = ACCENT_PALETTES[accentId]
  if (!palette) return
  const colors = palette[effectiveTheme]
  const root = document.documentElement
  root.style.setProperty('--accent', colors.accent)
  root.style.setProperty('--accent-hover', colors.accentHover)
  root.style.setProperty('--accent-soft', colors.accentSoft)
}

interface ThemeContextType {
  theme: Theme
  setTheme: (theme: Theme) => void
  effectiveTheme: 'light' | 'dark'
  accentId: AccentId
  setAccentId: (id: AccentId) => void
}

const ThemeContext = createContext<ThemeContextType | null>(null)

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>('system')
  const [effectiveTheme, setEffectiveTheme] = useState<'light' | 'dark'>('light')
  const [accentId, setAccentIdRaw] = useState<AccentId>(DEFAULT_ACCENT)

  useEffect(() => {
    const stored = localStorage.getItem('theme') as Theme | null
    if (stored) setTheme(stored)
    const storedAccent = localStorage.getItem('accentId') as AccentId | null
    if (storedAccent && ACCENT_PALETTES[storedAccent]) setAccentIdRaw(storedAccent)
  }, [])

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const updateEffective = () => {
      const effective = theme === 'system'
        ? (mediaQuery.matches ? 'dark' : 'light')
        : theme
      setEffectiveTheme(effective)
      document.documentElement.classList.toggle('dark', effective === 'dark')
    }
    updateEffective()
    mediaQuery.addEventListener('change', updateEffective)
    return () => mediaQuery.removeEventListener('change', updateEffective)
  }, [theme])

  useEffect(() => {
    applyAccent(accentId, effectiveTheme)
  }, [accentId, effectiveTheme])

  const handleSetTheme = useCallback((newTheme: Theme) => {
    setTheme(newTheme)
    localStorage.setItem('theme', newTheme)
  }, [])

  const handleSetAccentId = useCallback((id: AccentId) => {
    setAccentIdRaw(id)
    localStorage.setItem('accentId', id)
  }, [])

  return (
    <ThemeContext.Provider value={{ theme, setTheme: handleSetTheme, effectiveTheme, accentId, setAccentId: handleSetAccentId }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (!context) throw new Error('useTheme must be used within ThemeProvider')
  return context
}