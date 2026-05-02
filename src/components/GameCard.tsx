import { Game } from '../types'
import { useGameStore } from '../store/gameStore'

interface GameCardProps {
  game: Game
}

const statusBadge: Record<string, { label: string; className: string }> = {
  wish: { label: '想玩', className: 'bg-sky-100 text-sky-700 dark:bg-sky-900 dark:text-sky-300' },
  playing: { label: '在玩', className: 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300' },
  completed: { label: '已完成', className: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300' },
  paused: { label: '搁置', className: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400' },
}

export function GameCard({ game }: GameCardProps) {
  const { setSelectedGame } = useGameStore()
  const badge = statusBadge[game.status]

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
        <span className={`absolute top-2 right-2 px-1.5 py-0.5 rounded text-xs font-medium ${badge.className}`}>
          {badge.label}
        </span>
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
      </div>
    </div>
  )
}
