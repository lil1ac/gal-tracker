import { useState, useEffect, useRef } from 'react'
import { ThemeProvider } from './context/ThemeContext'
import { ThemeToggle } from './components/ThemeToggle'
import { Sidebar } from './components/Sidebar'
import { GameList } from './components/GameList'
import { SearchModal } from './components/SearchModal'
import { GameDetail } from './components/GameDetail'
import { Settings } from './components/Settings'
import { useGameStore } from './store/gameStore'
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts'
import { initDatabase } from './services/database'
import { setApiKey } from './services/bangumiApi'
import './styles/themes.css'

function AppContent() {
  const [showSearch, setShowSearch] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const { load, setSearchQuery, selectedGame, setSelectedGame } = useGameStore()
  const searchInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const key = localStorage.getItem('bgm_api_key')
    if (key) setApiKey(key)
    initDatabase().then(load)
  }, [])

  useKeyboardShortcuts({
    onEscape: () => {
      if (selectedGame) {
        setSelectedGame(null)
      } else if (showSearch) {
        setShowSearch(false)
      } else if (showSettings) {
        setShowSettings(false)
      }
    },
    onSearch: () => {
      searchInputRef.current?.focus()
    },
  })

  const handleOpenSettings = () => {
    setShowSettings(true)
    setSelectedGame(null)
  }

  const handleCloseSettings = () => {
    setShowSettings(false)
  }

  return (
    <div className="flex h-screen bg-[var(--bg-primary)] text-[var(--text-primary)]">
      <Sidebar onOpenSettings={handleOpenSettings} />
      <div className="flex-1 flex flex-col min-w-0">
        {showSettings ? (
          <Settings onClose={handleCloseSettings} />
        ) : (
          <>
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
                <ThemeToggle />
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
          </>
        )}
      </div>
      {selectedGame && !showSettings && (
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
