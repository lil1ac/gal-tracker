import { useGameStore } from '../store/gameStore'
import { formatDuration, LibraryGame } from '../services/libraryStats'

interface GameRowProps {
  game: LibraryGame
}

const STATUS_MAP: Record<string, { label: string; className: string }> = {
  wish: { label: '想玩', className: 'status-wish' },
  playing: { label: '在玩', className: 'status-playing' },
  completed: { label: '已完成', className: 'status-completed' },
  paused: { label: '搁置', className: 'status-paused' },
}

function formatDate(timestamp: number | null) {
  if (!timestamp) return null
  return new Date(timestamp).toLocaleDateString('zh-CN')
}

function RatingStars({ rating }: { rating: number | null }) {
  if (rating === null || rating === 0) return <span className="text-xs text-[var(--text-secondary)]">未评分</span>
  const stars = Math.round(rating / 2)
  return (
    <span className="inline-flex items-center gap-0.5">
      {Array.from({ length: 5 }, (_, i) => (
        <svg
          key={i}
          className={`w-3.5 h-3.5 ${i < stars ? 'text-amber-500' : 'text-[var(--border)]'}`}
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
      <span className="ml-1 text-xs font-medium text-amber-600">{rating}</span>
    </span>
  )
}

function StatusBadge({ status }: { status: string }) {
  const info = STATUS_MAP[status] ?? { label: status, className: '' }
  return (
    <span className={`status-badge ${info.className}`}>
      <span className="status-dot" />
      {info.label}
    </span>
  )
}

export function GameRow({ game }: GameRowProps) {
  const { setSelectedGame } = useGameStore()
  const completedDate = formatDate(game.completed_at)
  const visibleTags = game.tags.slice(0, 3)

  return (
    <div
      onClick={() => setSelectedGame(game)}
      className="game-list-row group"
    >
      <div className="game-list-row-inner">
        <div className="relative shrink-0">
          <img
            src={game.cover_url}
            alt=""
            className="game-list-cover"
            loading="lazy"
          />
          {game.current_running && (
            <span className="absolute -top-1 -right-1 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-3 w-3 bg-teal-500 border-2 border-[var(--bg-secondary)]" />
            </span>
          )}
        </div>

        <div className="game-list-info">
          <div className="game-list-title-row">
            <h3 className="game-list-title">{game.name_cn || game.name}</h3>
            {game.name_cn && game.name_cn !== game.name && (
              <span className="game-list-subtitle">{game.name}</span>
            )}
          </div>
          <div className="game-list-meta-row">
            <StatusBadge status={game.status} />
            {game.platform.length > 0 && (
              <span className="game-list-platform">{game.platform[0]}</span>
            )}
            {game.session_count > 0 && (
              <span className="game-list-sessions">{game.session_count} 次游玩</span>
            )}
          </div>
          {visibleTags.length > 0 && (
            <div className="game-list-tags">
              {visibleTags.map((tag, i) => (
                <span key={`${tag}-${i}`} className="game-list-tag">{tag}</span>
              ))}
              {game.tags.length > 3 && (
                <span className="game-list-tag-more">+{game.tags.length - 3}</span>
              )}
            </div>
          )}
        </div>

        <div className="game-list-stats">
          <div className="game-list-stat">
            <span className="text-[11px] text-[var(--text-secondary)]">时长</span>
            <span className="text-sm font-medium tabular-nums">
              {game.total_seconds > 0 ? formatDuration(game.total_seconds) : '-'}
            </span>
          </div>
          <div className="game-list-stat">
            <span className="text-[11px] text-[var(--text-secondary)]">评分</span>
            <RatingStars rating={game.rating} />
          </div>
          {completedDate && (
            <div className="game-list-stat">
              <span className="text-[11px] text-[var(--text-secondary)]">通关</span>
              <span className="text-sm font-medium tabular-nums">{completedDate}</span>
            </div>
          )}
        </div>

        <div className="game-list-chevron">
          <svg className="w-4 h-4 text-[var(--border)] group-hover:text-[var(--text-secondary)] transition-colors" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
          </svg>
        </div>
      </div>
    </div>
  )
}
