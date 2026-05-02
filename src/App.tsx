import { useState, useEffect } from 'react'
import { ThemeProvider } from './context/ThemeContext'
import { ThemeToggle } from './components/ThemeToggle'
import { Sidebar } from './components/Sidebar'
import { GameList } from './components/GameList'
import { SearchModal } from './components/SearchModal'
import { GameDetail } from './components/GameDetail'
import { useGameStore } from './store/gameStore'
import { initDatabase, exportData, importData } from './services/database'
import { setApiKey } from './services/bangumiApi'
import './styles/themes.css'

function AppContent() {
  const [showSearch, setShowSearch] = useState(false)
  const [apiKey, setApiKeyState] = useState(localStorage.getItem('bgm_api_key') || '')
  const { load, setSearchQuery, selectedGame, setSelectedGame } = useGameStore()

  useEffect(() => {
    initDatabase().then(load)
  }, [])

  const handleApiKeyChange = (key: string) => {
    setApiKeyState(key)
    setApiKey(key)
  }

  const handleExport = () => {
    const data = exportData()
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
    const games = importData(text)
    load()
    alert(`导入了 ${games.length} 个游戏`)
  }

  return (
    <div className="flex h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <header className="p-4 border-b border-[var(--border)] flex justify-between items-center">
          <input
            type="text"
            placeholder="搜索游戏..."
            className="px-3 py-2 rounded border border-[var(--border)] bg-[var(--bg-secondary)] w-64"
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <div className="flex gap-2 items-center">
            <input
              type="text"
              placeholder="Bangumi API Key"
              value={apiKey}
              onChange={(e) => handleApiKeyChange(e.target.value)}
              className="px-2 py-1 rounded border border-[var(--border)] bg-[var(--bg-secondary)] w-40 text-sm"
            />
            <ThemeToggle />
            <button type="button" onClick={handleExport} className="px-3 py-2 rounded bg-[var(--bg-secondary)]">
              导出
            </button>
            <label className="px-3 py-2 rounded bg-[var(--bg-secondary)] cursor-pointer">
              导入
              <input type="file" accept=".json" onChange={handleImport} className="hidden" />
            </label>
            <button
              type="button"
              onClick={() => setShowSearch(true)}
              className="px-4 py-2 bg-[var(--accent)] text-white rounded"
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