import { useGameStore } from '../store/gameStore'
import { GameCard } from './GameCard'
import { GameRow } from './GameRow'

export function GameList() {
  const { filteredGames, viewMode } = useGameStore()

  if (viewMode === 'list') {
    return (
      <div className="flex-1 p-4">
        <table className="w-full">
          <thead>
            <tr className="text-left text-sm text-[var(--text-secondary)]">
              <th className="pb-2">游戏</th>
              <th className="pb-2">状态</th>
              <th className="pb-2">时长</th>
              <th className="pb-2">评分</th>
            </tr>
          </thead>
          <tbody>
            {filteredGames().map((game) => (
              <GameRow key={game.id} game={game} />
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  return (
    <div className="flex-1 p-4">
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {filteredGames().map((game) => (
          <GameCard key={game.id} game={game} />
        ))}
      </div>
      {filteredGames().length === 0 && (
        <div className="text-center text-[var(--text-secondary)] py-20">
          还没有游戏，点击右上角添加
        </div>
      )}
    </div>
  )
}