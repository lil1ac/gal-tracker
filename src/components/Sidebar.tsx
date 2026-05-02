import { GameStatus } from '../types'
import { useGameStore } from '../store/gameStore'

const statusLabels: Record<GameStatus | 'all', string> = {
  all: '全部',
  wish: '想玩',
  playing: '在玩',
  completed: '已完成',
  paused: '搁置',
}

export function Sidebar() {
  const { games, filterStatus, setFilterStatus, viewMode, setViewMode } = useGameStore()

  const totalGames = games.length
  const totalPlaytime = games.reduce((sum, g) =>
    sum + g.sessions.reduce((s, session) => s + session.duration_minutes, 0), 0)
  const hours = Math.floor(totalPlaytime / 60)
  const completedCount = games.filter(g => g.status === 'completed').length
  const playingCount = games.filter(g => g.status === 'playing').length

  const statusCounts = games.reduce((acc, game) => {
    acc[game.status] = (acc[game.status] || 0) + 1
    return acc
  }, {} as Record<GameStatus, number>)

  return (
    <div className="w-52 bg-[var(--bg-secondary)] p-4 flex flex-col gap-4">
      <h1 className="text-xl font-bold text-[var(--accent)]">GAL Tracker</h1>

      <nav className="flex flex-col gap-1">
        {(Object.keys(statusLabels) as (GameStatus | 'all')[]).map((status) => {
          const count = status === 'all' ? totalGames : (statusCounts[status as GameStatus] || 0)
          return (
            <button
              key={status}
              onClick={() => setFilterStatus(status)}
              className={`px-3 py-2 rounded text-left flex justify-between items-center ${
                filterStatus === status
                  ? 'bg-[var(--accent)] text-white'
                  : 'hover:bg-[var(--bg-primary)]'
              }`}
            >
              <span>{statusLabels[status]}</span>
              <span className={`text-xs ${filterStatus === status ? 'opacity-80' : 'opacity-60'}`}>{count}</span>
            </button>
          )
        })}
      </nav>

      <div className="mt-2 p-3 bg-[var(--bg-primary)] rounded">
        <h2 className="text-sm font-medium mb-2 text-[var(--text-secondary)]">统计</h2>
        <div className="space-y-1 text-sm">
          <div className="flex justify-between">
            <span className="text-[var(--text-secondary)]">游戏总数</span>
            <span className="font-medium">{totalGames}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[var(--text-secondary)]">游玩中</span>
            <span className="font-medium text-yellow-500">{playingCount}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[var(--text-secondary)]">已完成</span>
            <span className="font-medium text-green-500">{completedCount}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[var(--text-secondary)]">总时长</span>
            <span className="font-medium">{hours > 0 ? `${hours}小时` : '-'}</span>
          </div>
        </div>
      </div>

      <div className="mt-auto flex gap-2">
        <button
          type="button"
          onClick={() => setViewMode('card')}
          className={`flex-1 px-2 py-1 rounded text-sm ${viewMode === 'card' ? 'bg-[var(--accent)] text-white' : ''}`}
        >
          卡片
        </button>
        <button
          type="button"
          onClick={() => setViewMode('list')}
          className={`flex-1 px-2 py-1 rounded text-sm ${viewMode === 'list' ? 'bg-[var(--accent)] text-white' : ''}`}
        >
          列表
        </button>
      </div>
    </div>
  )
}