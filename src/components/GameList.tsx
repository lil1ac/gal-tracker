import { useRef, useEffect, useMemo } from 'react'
import { useGameStore } from '../store/gameStore'
import { GameStatus } from '../types'
import { Dashboard } from './Dashboard'
import { BrowseView } from './BrowseView'
import { GameCard } from './GameCard'
import { GameRow } from './GameRow'
import { MemoryView } from './MemoryView'
import {
  enrichGames,
  filterLibraryGames,
  GameActionKey,
  LibraryGame,
  sortLibraryGames,
} from '../services/libraryStats'

const statusLabels: Record<GameStatus | 'all', string> = {
  all: '全部',
  wish: '想玩',
  playing: '在玩',
  completed: '已完成',
  paused: '搁置',
}

interface GameListProps {
  activeView: 'dashboard' | 'library' | 'browse' | 'memory'
  onOpenGameAction: (game: LibraryGame, target?: GameActionKey) => void
}

function LibraryToolbar() {
  const setSearchQuery = useGameStore(s => s.setSearchQuery)
  const sortField = useGameStore(s => s.sortField)
  const setSortField = useGameStore(s => s.setSortField)
  const sortDirection = useGameStore(s => s.sortDirection)
  const setSortDirection = useGameStore(s => s.setSortDirection)
  const viewMode = useGameStore(s => s.viewMode)
  const setViewMode = useGameStore(s => s.setViewMode)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === '/' && document.activeElement !== inputRef.current && document.activeElement?.tagName !== 'INPUT') {
        e.preventDefault()
        inputRef.current?.focus()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  return (
    <div className="px-4 pt-3 md:px-6 flex items-center gap-3 flex-wrap">
      <div className="relative flex-1 min-w-[200px] max-w-xs">
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-secondary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          ref={inputRef}
          type="text"
          placeholder="搜索游戏..."
          className="field w-full py-1.5 pl-9"
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>
      <div className="flex items-center gap-2">
        <select
          title="排序"
          value={sortField}
          onChange={(e) => setSortField(e.target.value as typeof sortField)}
          className="field w-auto py-1.5"
        >
          <option value="updated">最近更新</option>
          <option value="title">标题</option>
          <option value="playtime">游玩时长</option>
          <option value="last_played">最近游玩</option>
          <option value="rating">评分</option>
          <option value="completed">通关时间</option>
        </select>
        <button
          type="button"
          title={sortDirection === 'asc' ? '升序' : '降序'}
          onClick={() => setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')}
          className="w-7 h-7 flex items-center justify-center rounded text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-primary)] transition-colors"
        >
          {sortDirection === 'asc' ? '↑' : '↓'}
        </button>
        <div className="flex rounded-md bg-[var(--bg-primary)] p-0.5">
          <button
            type="button"
            onClick={() => setViewMode('card')}
            className={`px-2 py-1 text-xs rounded font-medium transition-colors ${
              viewMode === 'card'
                ? 'bg-[var(--bg-secondary)] text-[var(--accent)] shadow-sm'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            卡片
          </button>
          <button
            type="button"
            onClick={() => setViewMode('list')}
            className={`px-2 py-1 text-xs rounded font-medium transition-colors ${
              viewMode === 'list'
                ? 'bg-[var(--bg-secondary)] text-[var(--accent)] shadow-sm'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            列表
          </button>
        </div>
      </div>
    </div>
  )
}

function StatusTabs() {
  const games = useGameStore(s => s.games)
  const filterStatus = useGameStore(s => s.filterStatus)
  const setFilterStatus = useGameStore(s => s.setFilterStatus)
  const setSelectedGame = useGameStore(s => s.setSelectedGame)

  const { totalGames, statusCounts } = useMemo(() => {
    const totalGames = games.length
    const statusCounts = games.reduce((acc, game) => {
      acc[game.status] = (acc[game.status] || 0) + 1
      return acc
    }, {} as Record<GameStatus, number>)
    return { totalGames, statusCounts }
  }, [games])

  const tabs = (Object.keys(statusLabels) as (GameStatus | 'all')[]).map((status) => ({
    status,
    label: statusLabels[status],
    count: status === 'all' ? totalGames : (statusCounts[status as GameStatus] || 0),
  }))

  return (
    <div className="px-4 pt-3 md:px-6">
      <div className="flex items-center gap-1 border-b border-[var(--border)]">
        {tabs.map((tab) => (
          <button
            key={tab.status}
            type="button"
            onClick={() => { setFilterStatus(tab.status); setSelectedGame(null) }}
            className={`relative px-3 py-2 text-sm font-medium transition-colors border-b-2 -mb-[1px] ${
              filterStatus === tab.status
                ? 'border-[var(--accent)] text-[var(--accent)]'
                : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            {tab.label}
            <span className={`ml-1.5 text-xs tabular-nums ${
              filterStatus === tab.status ? 'text-[var(--accent)]' : 'text-[var(--text-secondary)]'
            }`}>
              {tab.count}
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}

export function GameList({ activeView, onOpenGameAction }: GameListProps) {
  const games = useGameStore(s => s.games)
  const sessionSummaries = useGameStore(s => s.sessionSummaries)
  const sessions = useGameStore(s => s.sessions)
  const viewMode = useGameStore(s => s.viewMode)
  const filterStatus = useGameStore(s => s.filterStatus)
  const searchQuery = useGameStore(s => s.searchQuery)
  const sortField = useGameStore(s => s.sortField)
  const sortDirection = useGameStore(s => s.sortDirection)
  const setSelectedGame = useGameStore(s => s.setSelectedGame)
  const libraryGames = useMemo(
    () => sortLibraryGames(enrichGames(games, sessionSummaries), sortField, sortDirection),
    [games, sessionSummaries, sortField, sortDirection]
  )
  const visibleGames = useMemo(
    () => filterLibraryGames(libraryGames, filterStatus, searchQuery),
    [libraryGames, filterStatus, searchQuery]
  )

  if (activeView === 'dashboard') {
    return <Dashboard games={libraryGames} sessions={sessions} onOpenGameAction={onOpenGameAction} />
  }

  if (activeView === 'browse') {
    return <BrowseView />
  }

  if (activeView === 'memory') {
    return <MemoryView games={libraryGames} sessions={sessions} onOpenGame={setSelectedGame} />
  }

  return (
    <div className="library-shell">
      <LibraryToolbar />
      <StatusTabs />
      {visibleGames.length === 0 ? (
        <div className="library-empty-state">
          <div className="library-empty-mark">
            <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 7.5A2.5 2.5 0 0 1 6.5 5h11A2.5 2.5 0 0 1 20 7.5v9A2.5 2.5 0 0 1 17.5 19h-11A2.5 2.5 0 0 1 4 16.5v-9Z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h3m-1.5-1.5v3M15.5 11.25h.01M17.25 13.25h.01" />
            </svg>
          </div>
          <h2>{searchQuery ? '没有匹配的游戏' : '还没有游戏'}</h2>
          <p>{searchQuery ? '换个关键词或切换状态筛选试试。' : '点击右上角“添加游戏”，把正在玩、想玩或已完成的作品加入库中。'}</p>
        </div>
      ) : viewMode === 'list' ? (
        <div className="px-4 py-4 md:px-6">
          <div className="game-list-container">
            {visibleGames.map((game) => (
              <GameRow key={game.id} game={game} />
            ))}
          </div>
        </div>
      ) : (
        <div className="p-4">
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4 lg:grid-cols-6">
            {visibleGames.map((game) => (
              <GameCard key={game.id} game={game} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
