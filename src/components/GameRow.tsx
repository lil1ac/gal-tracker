import { useGameStore } from '../store/gameStore'
import { formatDuration, LibraryGame } from '../services/libraryStats'

interface GameRowProps {
  game: LibraryGame
}

function formatDate(timestamp: number | null) {
  if (!timestamp) return '-'
  return new Date(timestamp).toLocaleDateString('zh-CN')
}

export function GameRow({ game }: GameRowProps) {
  const { setSelectedGame } = useGameStore()

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
      <td className="py-3">{formatDuration(game.total_seconds)}</td>
      <td className="py-3 text-sm text-[var(--text-secondary)]">{formatDate(game.last_played_at)}</td>
      <td className="py-3 text-sm text-[var(--text-secondary)]">{formatDate(game.completed_at)}</td>
      <td className="py-3">{game.rating ? `★ ${game.rating}` : '-'}</td>
    </tr>
  )
}
