import { useState, useEffect, useRef } from 'react'
import { ThemeProvider } from './context/ThemeContext'
import { ThemeToggle } from './components/ThemeToggle'
import { Sidebar } from './components/Sidebar'
import { GameList } from './components/GameList'
import { SearchModal } from './components/SearchModal'
import { GameDetail } from './components/GameDetail'
import { useGameStore } from './store/gameStore'
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts'
import { initDatabase, exportData, importData } from './services/database'
import { setApiKey } from './services/bangumiApi'
import './styles/themes.css'

function AppContent() {
  const [showSearch, setShowSearch] = useState(false)
  const [apiKey, setApiKeyState] = useState(localStorage.getItem('bgm_api_key') || '')
  const { load, setSearchQuery, selectedGame, setSelectedGame } = useGameStore()
  const searchInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    initDatabase().then(load)
  }, [])

  useKeyboardShortcuts({
    onEscape: () => {
      if (selectedGame) {
        setSelectedGame(null)
      } else if (showSearch) {
        setShowSearch(false)
      }
    },
    onSearch: () => {
      searchInputRef.current?.focus()
    },
  })

  const handleApiKeyChange = (key: string) => {
    setApiKeyState(key)
    setApiKey(key)
  }

  const handleExport = async () => {
    const data = await exportData()
    const blob = new Blob([data], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `gal-tracker-backup-${new Date().toISOString().split('T')[0]}.json`
    a.click()
  }

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const text = await file.text()
    const games = await importData(text)
    load()
    alert(`导入了 ${games.length} 个游戏`)
  }

  return (
    <div className="flex h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <header className="p-4 border-b glass relative z-10 flex justify-between items-center">
          {/* 左侧搜索框保持，但更新样式 */}
          <div className="relative">
            <input
              ref={searchInputRef}
              type="text"
              placeholder="搜索游戏... (按 / 聚焦)"
              className="px-4 py-2 pl-10 rounded glass text-[var(--text-primary)] w-72 border border-[var(--border)] focus:border-[var(--accent)] focus:outline-none transition-all duration-300"
              style={{ boxShadow: 'none' }}
              onFocus={(e) => e.target.style.boxShadow = 'var(--glow-accent)'}
              onBlur={(e) => e.target.style.boxShadow = 'none'}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--accent)]">⬡</span>
          </div>

          {/* 右侧按钮组 */}
          <div className="flex gap-3 items-center">
            <input
              type="text"
              placeholder="API Key"
              value={apiKey}
              onChange={(e) => handleApiKeyChange(e.target.value)}
              className="px-3 py-2 rounded glass border border-[var(--border)] text-sm w-36 text-[var(--text-primary)] focus:border-[var(--accent)] focus:outline-none transition-all"
            />
            <ThemeToggle />
            <button type="button" onClick={handleExport} className="neon-button glass px-3 py-2 rounded text-[var(--text-primary)]">
              导出
            </button>
            <label className="neon-button glass px-3 py-2 rounded cursor-pointer text-[var(--text-primary)]">
              导入
              <input type="file" accept=".json" onChange={handleImport} className="hidden" />
            </label>
            <button
              type="button"
              onClick={() => setShowSearch(true)}
              className="neon-button px-4 py-2 rounded font-bold text-[#0a0a0f] transition-all"
              style={{ background: 'var(--accent)', boxShadow: 'var(--glow-accent)' }}
            >
              添加游戏
            </button>
          </div>
        </header>
        <GameList />
      </div>
      {selectedGame && (
        <GameDetail game={selectedGame} onClose={() => setSelectedGame(null)} />
      )}
      {showSearch && <SearchModal onClose={() => setShowSearch(false)} />}
    </div>
  )
}

function App() {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  )
}

export default App