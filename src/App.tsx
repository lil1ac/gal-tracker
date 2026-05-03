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
import { initDatabase, getSetting } from './services/database'
import { setApiKey } from './services/bangumiApi'
import { syncAllProcessConfigs } from './services/processService'
import { useProcessMonitor } from './hooks/useProcessMonitor'
import type { GameActionKey } from './services/libraryStats'
import type { Game } from './types'
import './styles/themes.css'

function AppContent() {
  const [showSearch, setShowSearch] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [activeView, setActiveView] = useState<'dashboard' | 'library'>('dashboard')
  const [detailFocusTarget, setDetailFocusTarget] = useState<GameActionKey | null>(null)
  const [ready, setReady] = useState(false)
  const [startupError, setStartupError] = useState<string | null>(null)
  const { load, setSearchQuery, selectedGame, setSelectedGame, sortMode, setSortMode, lastError, clearError } = useGameStore()
  const searchInputRef = useRef<HTMLInputElement>(null)
  const processMonitor = useProcessMonitor()

  useEffect(() => {
    initDatabase().then(async () => {
      const key = await getSetting('bgm_api_key')
      if (key) setApiKey(key)
      await syncAllProcessConfigs()
      load()
      setReady(true)
    }).catch((error) => {
      console.error('Failed to initialize GAL Tracker', error)
      setStartupError(error instanceof Error ? error.message : String(error))
    })
  }, [])

  useKeyboardShortcuts({
    onEscape: () => {
      if (showSearch) {
        setShowSearch(false)
      } else if (showSettings) {
        setShowSettings(false)
      } else if (selectedGame) {
        setDetailFocusTarget(null)
        setSelectedGame(null)
      }
    },
    onSearch: () => {
      searchInputRef.current?.focus()
    },
  })

  const handleOpenSettings = () => {
    setShowSettings(true)
    setDetailFocusTarget(null)
    setSelectedGame(null)
  }

  const handleOpenDashboard = () => {
    setActiveView('dashboard')
    setShowSettings(false)
    setDetailFocusTarget(null)
    setSelectedGame(null)
  }

  const handleOpenLibrary = () => {
    setActiveView('library')
    setShowSettings(false)
  }

  const handleBack = () => {
    setDetailFocusTarget(null)
    setSelectedGame(null)
  }

  const handleOpenGameAction = (game: Game, target?: GameActionKey) => {
    setActiveView('library')
    setShowSettings(false)
    setDetailFocusTarget(target ?? null)
    setSelectedGame(game)
  }

  if (!ready) {
    return (
      <div className="flex h-screen bg-[var(--bg-primary)] items-center justify-center">
        <div className="text-center">
          {startupError ? (
            <>
              <div className="text-base font-semibold text-red-500 mb-2">启动失败</div>
              <p className="max-w-md text-sm text-[var(--text-secondary)] break-words">{startupError}</p>
            </>
          ) : (
            <>
              <div className="w-8 h-8 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className="text-sm text-[var(--text-secondary)]">正在启动...</p>
            </>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-[var(--bg-primary)] text-[var(--text-primary)]">
      <Sidebar
        onOpenSettings={handleOpenSettings}
        onOpenDashboard={handleOpenDashboard}
        onOpenLibrary={handleOpenLibrary}
        activeView={activeView}
      />
      <div className="flex-1 flex flex-col min-w-0">
        {showSettings ? (
          <Settings onClose={() => setShowSettings(false)} />
        ) : selectedGame ? (
          <GameDetail
            game={selectedGame}
            onBack={handleBack}
            processElapsed={processMonitor.activeGameId === selectedGame.id ? processMonitor.elapsed : 0}
            isProcessRunning={processMonitor.activeGameId === selectedGame.id}
            focusTarget={detailFocusTarget}
          />
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
                  className="field w-64 py-1.5 pl-9"
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <div className="flex items-center gap-2">
                {activeView === 'library' && (
                  <select
                    title="排序"
                    value={sortMode}
                    onChange={(e) => setSortMode(e.target.value as typeof sortMode)}
                    className="field w-auto py-1.5"
                  >
                    <option value="updated_desc">最近更新</option>
                    <option value="title_asc">标题</option>
                    <option value="playtime_desc">游玩时长</option>
                    <option value="last_played_desc">最近游玩</option>
                    <option value="rating_desc">评分</option>
                    <option value="completed_desc">通关时间</option>
                  </select>
                )}
                <ThemeToggle />
                <button
                  type="button"
                  onClick={() => { setActiveView('library'); setShowSearch(true) }}
                  className="btn btn-primary btn-sm"
                >
                  添加游戏
                </button>
              </div>
            </header>
            <GameList activeView={activeView} onOpenGameAction={handleOpenGameAction} />
          </>
        )}
      </div>
      {lastError && (
        <div className="fixed bottom-4 right-4 z-50 max-w-sm rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 shadow-md dark:border-red-900 dark:bg-red-950 dark:text-red-300">
          <div className="flex items-start gap-3">
            <span className="min-w-0 flex-1 break-words">{lastError}</span>
            <button type="button" onClick={clearError} className="text-xs text-red-700 underline dark:text-red-300">关闭</button>
          </div>
        </div>
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
