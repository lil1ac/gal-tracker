import { useGameStore } from '../store/gameStore'
import { formatDuration, LibraryGame } from '../services/libraryStats'

interface GameCardProps {
  game: LibraryGame
}

const STATUS_MAP: Record<string, { label: string; className: string }> = {
  wish: { label: '想玩', className: 'status-wish' },
  playing: { label: '在玩', className: 'status-playing' },
  completed: { label: '已完成', className: 'status-completed' },
  paused: { label: '搁置', className: 'status-paused' },
}

export function GameCard({ game }: GameCardProps) {
  const { setSelectedGame } = useGameStore()
  const badge = STATUS_MAP[game.status] ?? { label: game.status, className: '' }

  return (
    <div
      onClick={() => setSelectedGame(game)}
      className="card-hover rounded-lg overflow-hidden cursor-pointer bg-[var(--bg-secondary)] border border-[var(--border)] group"
    >
      <div className="aspect-[3/4] relative bg-[var(--bg-primary)]">
        {game.cover_url ? (
          <img
            src={game.cover_url}
            alt={game.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-[var(--text-secondary)] text-sm">
            无封面
          </div>
        )}
        <span className={`status-badge absolute top-2 right-2 ${badge.className}`}>
          <span className="status-dot" />
          {badge.label}
        </span>
        {game.current_running && (
          <span className="absolute top-2 left-2 flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium bg-emerald-500 text-white">
            <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
            运行中
          </span>
        )}
      </div>
      <div className="p-2.5">
        <h3 className="text-sm font-medium truncate">{game.name_cn || game.name}</h3>
        <div className="flex items-center gap-2 mt-1 text-xs text-[var(--text-secondary)]">
          {game.rating && (
            <span className="flex items-center gap-0.5">
              <svg className="w-3 h-3 text-amber-500" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
              {game.rating}
            </span>
          )}
          {game.air_date && <span>{game.air_date.split('-')[0]}</span>}
        </div>
        <div className="mt-2 flex items-center justify-between gap-2 text-[11px] text-[var(--text-secondary)]">
          <span>{formatDuration(game.total_seconds)}</span>
          <span className="truncate text-right">
            {game.completed_at
              ? new Date(game.completed_at).toLocaleDateString('zh-CN')
              : game.route_progress.total > 0
                ? `${game.route_progress.completed}/${game.route_progress.total} 路线`
                : ''}
          </span>
        </div>
      </div>
    </div>
  )
}
