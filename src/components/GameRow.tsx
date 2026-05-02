import { Game } from '../types'
import { useGameStore } from '../store/gameStore'

interface GameRowProps {
  game: Game
}

export function GameRow({ game }: GameRowProps) {
  const { setSelectedGame } = useGameStore()
  const totalMinutes = game.sessions.reduce((sum, s) => sum + s.duration_minutes, 0)
  const hours = Math.floor(totalMinutes / 60)

  return (
    <tr
      onClick={() => setSelectedGame(game)}
      className="border-b border-[var(--border)] cursor-pointer hover:bg-[var(--bg-secondary)]"
    >
      <td className="py-3 flex items-center gap-3">
        <img src={game.cover_url} alt="" className="w-10 h-14 object-cover rounded" />
        <span>{game.name_cn || game.name}</span>
      </td>
      <td className="py-3">
        {game.status === 'wish' ? '想玩' : game.status === 'playing' ? '在玩' : game.status === 'completed' ? '已完成' : '搁置'}
      </td>
      <td className="py-3">{hours > 0 ? `${hours}h` : '-'}</td>
      <td className="py-3">{game.rating ? `★ ${game.rating}` : '-'}</td>
    </tr>
  )
}