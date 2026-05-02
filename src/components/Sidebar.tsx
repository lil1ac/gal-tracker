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
  const { filterStatus, setFilterStatus, viewMode, setViewMode } = useGameStore()

  return (
    <div className="w-48 bg-[var(--bg-secondary)] p-4 flex flex-col gap-4">
      <h1 className="text-xl font-bold text-[var(--accent)]">GAL Tracker</h1>

      <nav className="flex flex-col gap-1">
        {(Object.keys(statusLabels) as (GameStatus | 'all')[]).map((status) => (
          <button
            key={status}
            onClick={() => setFilterStatus(status)}
            className={`px-3 py-2 rounded text-left ${
              filterStatus === status
                ? 'bg-[var(--accent)] text-white'
                : 'hover:bg-[var(--bg-primary)]'
            }`}
          >
            {statusLabels[status]}
          </button>
        ))}
      </nav>

      <div className="mt-auto flex gap-2">
        <button
          onClick={() => setViewMode('card')}
          className={`px-2 py-1 rounded ${viewMode === 'card' ? 'bg-[var(--accent)] text-white' : ''}`}
        >
          卡片
        </button>
        <button
          onClick={() => setViewMode('list')}
          className={`px-2 py-1 rounded ${viewMode === 'list' ? 'bg-[var(--accent)] text-white' : ''}`}
        >
          列表
        </button>
      </div>
    </div>
  )
}