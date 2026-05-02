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
    <div className="flex h-screen bg-[var(--bg-primary)] text-[var(--text-primary)]">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-14 px-5 flex items-center justify-between border-b border-[var(--border)] bg-[var(--bg-secondary)] shrink-0">
          <div className="relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-secondary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              ref={searchInputRef}
              type="text"
              placeholder="搜索游戏... (按 / 聚焦)"
              className="pl-9 pr-3 py-1.5 rounded-md bg-[var(--bg-primary)] border border-[var(--border)] text-sm w-64 focus:border-[var(--accent)] focus:outline-none transition-colors"
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2">
            <input
              type="text"
              placeholder="API Key"
              value={apiKey}
              onChange={(e) => handleApiKeyChange(e.target.value)}
              className="px-2 py-1 rounded-md bg-[var(--bg-primary)] border border-[var(--border)] text-xs w-32 focus:border-[var(--accent)] focus:outline-none transition-colors"
            />
            <ThemeToggle />
            <button
              type="button"
              onClick={handleExport}
              className="px-3 py-1.5 text-sm rounded-md border border-[var(--border)] hover:bg-[var(--bg-primary)] transition-colors"
            >
              导出
            </button>
            <label className="px-3 py-1.5 text-sm rounded-md border border-[var(--border)] hover:bg-[var(--bg-primary)] transition-colors cursor-pointer">
              导入
              <input type="file" accept=".json" onChange={handleImport} className="hidden" />
            </label>
            <button
              type="button"
              onClick={() => setShowSearch(true)}
              className="px-4 py-1.5 text-sm rounded-md font-medium bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)] transition-colors"
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
