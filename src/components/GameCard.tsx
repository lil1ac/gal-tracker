import { Game } from '../types'
import { useGameStore } from '../store/gameStore'

interface GameCardProps {
  game: Game
}

export function GameCard({ game }: GameCardProps) {
  const { setSelectedGame } = useGameStore()
  const statusColors = {
    wish: 'bg-blue-500',
    playing: 'bg-yellow-500',
    completed: 'bg-green-500',
    paused: 'bg-gray-500',
  }

  const totalMinutes = 0 // Sessions stored in SQLite, not on Game object
  const hours = Math.floor(totalMinutes / 60)

  return (
    <div
      onClick={() => setSelectedGame(game)}
      className="relative rounded-lg overflow-hidden cursor-pointer transition-all duration-300 hover:scale-105 group"
      style={{
        background: 'var(--bg-secondary)',
        boxShadow: '0 0 0 1px var(--border)'
      }}
    >
      {/* Hover glow overlay */}
      <div
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
        style={{ boxShadow: 'inset 0 0 30px var(--accent)', mixBlendMode: 'screen' }}
      />
      <div className="aspect-[3/4] relative overflow-hidden">
        {game.cover_url ? (
          <img src={game.cover_url} alt={game.name} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-[var(--text-secondary)]">无封面</div>
        )}
        {/* Neon border overlay */}
        <div className="absolute inset-0 border-2 border-transparent group-hover:border-[var(--accent)] transition-all duration-300" style={{ boxShadow: 'inset 0 0 10px var(--accent)' }} />
        <span
          className="absolute top-2 right-2 px-2 py-1 rounded text-xs font-bold"
          style={{
            background: game.status === 'playing' ? 'var(--accent-secondary)' : game.status === 'completed' ? 'var(--accent-tertiary)' : 'var(--accent)',
            boxShadow: game.status === 'playing' ? 'var(--glow-secondary)' : 'var(--glow-accent)'
          }}
        >
          {game.status === 'wish' ? '想玩' : game.status === 'playing' ? '在玩' : game.status === 'completed' ? '已完成' : '搁置'}
        </span>
      </div>
      <div className="p-3">
        <h3 className="font-medium text-sm truncate">{game.name_cn || game.name}</h3>
        <p className="text-xs text-[var(--text-secondary)] mt-1">
          {hours > 0 ? `${hours}小时` : ''} {game.rating ? `★ ${game.rating}` : ''}
        </p>
      </div>
    </div>
  )
}