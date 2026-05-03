import { GameStatus } from '../types'
import { useGameStore } from '../store/gameStore'

const statusLabels: Record<GameStatus | 'all', string> = {
  all: '全部',
  wish: '想玩',
  playing: '在玩',
  completed: '已完成',
  paused: '搁置',
}

const statusIcons: Record<GameStatus | 'all', string> = {
  all: 'ALL',
  wish: 'W',
  playing: 'P',
  completed: 'C',
  paused: 'H',
}

interface SidebarProps {
  onOpenSettings: () => void
  onOpenDashboard: () => void
  onOpenLibrary: () => void
  activeView: 'dashboard' | 'library'
}

export function Sidebar({ onOpenSettings, onOpenDashboard, onOpenLibrary, activeView }: SidebarProps) {
  const { games, filterStatus, setFilterStatus, viewMode, setViewMode, setSelectedGame } = useGameStore()

  const totalGames = games.length
  const completedCount = games.filter(g => g.status === 'completed').length
  const playingCount = games.filter(g => g.status === 'playing').length

  const statusCounts = games.reduce((acc, game) => {
    acc[game.status] = (acc[game.status] || 0) + 1
    return acc
  }, {} as Record<GameStatus, number>)

  return (
    <div className="w-52 bg-[var(--bg-secondary)] border-r border-[var(--border)] flex flex-col shrink-0">
      <div className="p-4 border-b border-[var(--border)]">
        <h1 className="text-lg font-bold tracking-tight">
          <span className="text-[var(--accent)]">GAL</span> Tracker
        </h1>
        <p className="text-xs text-[var(--text-secondary)] mt-0.5">视觉小说游戏管理</p>
      </div>

      <nav className="flex flex-col gap-0.5 p-3">
        <button
          type="button"
          onClick={onOpenDashboard}
          className={`flex items-center justify-between px-3 py-2 rounded-md text-sm transition-colors ${
            activeView === 'dashboard'
              ? 'bg-[var(--accent-soft)] text-[var(--accent)] font-medium'
              : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-primary)]'
          }`}
        >
          <span className="flex items-center gap-2">
            <span className="text-[10px] font-semibold tracking-wider">DB</span>
            <span>总览</span>
          </span>
        </button>
        {(Object.keys(statusLabels) as (GameStatus | 'all')[]).map((status) => {
          const count = status === 'all' ? totalGames : (statusCounts[status as GameStatus] || 0)
          const active = activeView === 'library' && filterStatus === status
          return (
            <button
              key={status}
              onClick={() => { setFilterStatus(status); setSelectedGame(null); onOpenLibrary() }}
              className={`flex items-center justify-between px-3 py-2 rounded-md text-sm transition-colors ${
                active
                  ? 'bg-[var(--accent-soft)] text-[var(--accent)] font-medium'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-primary)]'
              }`}
            >
              <span className="flex items-center gap-2">
                <span className="w-5 text-[10px] font-semibold tracking-wider text-[var(--text-secondary)]">{statusIcons[status]}</span>
                <span>{statusLabels[status]}</span>
              </span>
              <span className={`text-xs tabular-nums ${active ? 'text-[var(--accent)]' : ''}`}>
                {count}
              </span>
            </button>
          )
        })}
      </nav>

      <div className="mx-3 p-3 rounded-lg bg-[var(--bg-primary)]">
        <h2 className="text-xs font-medium mb-2 text-[var(--text-secondary)] uppercase tracking-wider">统计</h2>
        <div className="space-y-1.5 text-sm">
          <div className="flex justify-between">
            <span className="text-[var(--text-secondary)]">游戏总数</span>
            <span>{totalGames}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[var(--text-secondary)]">游玩中</span>
            <span className="text-[var(--accent)]">{playingCount}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[var(--text-secondary)]">已完成</span>
            <span className="text-emerald-600">{completedCount}</span>
          </div>
        </div>
      </div>

      <div className="mt-auto p-3 space-y-2">
        <div className="flex rounded-md bg-[var(--bg-primary)] p-0.5">
          <button
            type="button"
            onClick={() => setViewMode('card')}
            className={`flex-1 py-1.5 text-xs rounded font-medium transition-colors ${
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
            className={`flex-1 py-1.5 text-xs rounded font-medium transition-colors ${
              viewMode === 'list'
                ? 'bg-[var(--bg-secondary)] text-[var(--accent)] shadow-sm'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            列表
          </button>
        </div>

        <button
          type="button"
          onClick={onOpenSettings}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-primary)] transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          设置
        </button>
      </div>
    </div>
  )
}
