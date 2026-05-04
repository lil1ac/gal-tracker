import { useGameStore } from '../store/gameStore'
import { Dashboard } from './Dashboard'
import { GameCard } from './GameCard'
import { GameRow } from './GameRow'
import { GameActionKey, LibraryGame } from '../services/libraryStats'

interface GameListProps {
  activeView: 'dashboard' | 'library'
  onOpenGameAction: (game: LibraryGame, target?: GameActionKey) => void
}

export function GameList({ activeView, onOpenGameAction }: GameListProps) {
  const { filteredGames, libraryGames, sessions, viewMode } = useGameStore()
  const visibleGames = filteredGames()

  if (activeView === 'dashboard') {
    return <Dashboard games={libraryGames()} sessions={sessions} onOpenGameAction={onOpenGameAction} />
  }

  if (viewMode === 'list') {
    return (
      <div className="flex-1 p-4">
        <table className="w-full">
          <thead>
            <tr className="text-left text-sm text-[var(--text-secondary)]">
              <th className="pb-2">游戏</th>
              <th className="pb-2">状态</th>
              <th className="pb-2">时长</th>
              <th className="pb-2">最近游玩</th>
              <th className="pb-2">通关时间</th>
              <th className="pb-2">评分</th>
            </tr>
          </thead>
          <tbody>
            {visibleGames.map((game) => (
              <GameRow key={game.id} game={game} />
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  return (
    <div className="flex-1 p-4">
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4 lg:grid-cols-6">
        {visibleGames.map((game) => (
          <GameCard key={game.id} game={game} />
        ))}
      </div>
      {visibleGames.length === 0 && (
        <div className="py-20 text-center text-[var(--text-secondary)]">
          还没有游戏，点击右上角添加
        </div>
      )}
    </div>
  )
}
