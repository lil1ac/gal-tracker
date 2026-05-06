import { useState, useEffect } from 'react'
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
import { VIEW_TITLES } from './types'
import './styles/themes.css'

function AppContent() {
  const [showSearch, setShowSearch] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [activeView, setActiveView] = useState<'dashboard' | 'library' | 'browse' | 'memory'>('dashboard')
  const [detailFocusTarget, setDetailFocusTarget] = useState<GameActionKey | null>(null)
  const [ready, setReady] = useState(false)
  const [startupError, setStartupError] = useState<string | null>(null)
  const { load, selectedGame, setSelectedGame, setFilterStatus, lastError, clearError } = useGameStore()
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
    setFilterStatus('all')
  }

  const handleOpenBrowse = () => {
    setActiveView('browse')
    setShowSettings(false)
    setDetailFocusTarget(null)
    setSelectedGame(null)
  }

  const handleOpenMemory = () => {
    setActiveView('memory')
    setShowSettings(false)
    setDetailFocusTarget(null)
    setSelectedGame(null)
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
        onOpenBrowse={handleOpenBrowse}
        onOpenMemory={handleOpenMemory}
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
              <h2 className="text-sm font-semibold text-[var(--text-primary)]">
                {VIEW_TITLES[activeView]}
              </h2>
              <div className="flex items-center gap-2">
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
