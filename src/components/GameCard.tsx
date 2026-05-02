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
      className="bg-[var(--bg-secondary)] rounded-lg overflow-hidden cursor-pointer hover:scale-105 transition-transform"
    >
      <div className="aspect-[3/4] bg-gray-200 relative">
        {game.cover_url ? (
          <img src={game.cover_url} alt={game.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-400">无封面</div>
        )}
        <span className={`absolute top-2 right-2 px-2 py-1 rounded text-xs text-white ${statusColors[game.status]}`}>
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