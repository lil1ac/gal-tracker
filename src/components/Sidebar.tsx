import { useGameStore } from '../store/gameStore'
import { VIEW_TITLES } from '../types'

interface SidebarProps {
  onOpenSettings: () => void
  onOpenDashboard: () => void
  onOpenLibrary: () => void
  onOpenBrowse: () => void
  onOpenMemory: () => void
  activeView: 'dashboard' | 'library' | 'browse' | 'memory'
}

export function Sidebar({ onOpenSettings, onOpenDashboard, onOpenLibrary, onOpenBrowse, onOpenMemory, activeView }: SidebarProps) {
  const { games } = useGameStore()

  const totalGames = games.length
  const completedCount = games.filter(g => g.status === 'completed').length
  const playingCount = games.filter(g => g.status === 'playing').length

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
            <span>{VIEW_TITLES.dashboard}</span>
          </span>
        </button>
        <button
          type="button"
          onClick={onOpenBrowse}
          className={`flex items-center justify-between px-3 py-2 rounded-md text-sm transition-colors ${
            activeView === 'browse'
              ? 'bg-[var(--accent-soft)] text-[var(--accent)] font-medium'
              : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-primary)]'
          }`}
        >
          <span className="flex items-center gap-2">
            <span className="text-[10px] font-semibold tracking-wider">BR</span>
            <span>{VIEW_TITLES.browse}</span>
          </span>
        </button>
        <button
          type="button"
          onClick={onOpenMemory}
          className={`flex items-center justify-between px-3 py-2 rounded-md text-sm transition-colors ${
            activeView === 'memory'
              ? 'bg-[var(--accent-soft)] text-[var(--accent)] font-medium'
              : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-primary)]'
          }`}
        >
          <span className="flex items-center gap-2">
            <span className="text-[10px] font-semibold tracking-wider">MEM</span>
            <span>{VIEW_TITLES.memory}</span>
          </span>
        </button>
        <button
          type="button"
          onClick={onOpenLibrary}
          className={`flex items-center justify-between px-3 py-2 rounded-md text-sm transition-colors ${
            activeView === 'library'
              ? 'bg-[var(--accent-soft)] text-[var(--accent)] font-medium'
              : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-primary)]'
          }`}
        >
          <span className="flex items-center gap-2">
            <span className="text-[10px] font-semibold tracking-wider">LIB</span>
            <span>{VIEW_TITLES.library}</span>
          </span>
          <span className="text-xs tabular-nums">{totalGames}</span>
        </button>
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

      <div className="mt-auto p-3">
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
