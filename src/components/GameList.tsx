import { useGameStore } from '../store/gameStore'
import { GameCard } from './GameCard'
import { GameRow } from './GameRow'
import { formatDuration, GameActionKey, getGameActionItems, LibraryGame } from '../services/libraryStats'

interface GameListProps {
  activeView: 'dashboard' | 'library'
  onOpenGameAction: (game: LibraryGame, target?: GameActionKey) => void
}

function formatDate(timestamp: number | null) {
  if (!timestamp) return '暂无记录'
  return new Date(timestamp).toLocaleDateString('zh-CN')
}

function Dashboard({ games, onOpenGameAction }: { games: LibraryGame[]; onOpenGameAction: (game: LibraryGame, target?: GameActionKey) => void }) {
  const { setSelectedGame } = useGameStore()
  const totalPlaytime = games.reduce((sum, game) => sum + game.total_seconds, 0)
  const runningGames = games.filter(game => game.current_running)
  const completedGames = games.filter(game => game.status === 'completed')
  const completedWithDate = completedGames.filter(game => game.completed_at)
  const recentlyPlayed = games
    .filter(game => game.last_played_at)
    .sort((a, b) => (b.last_played_at ?? 0) - (a.last_played_at ?? 0))
    .slice(0, 5)
  const needsAttention = games.filter(game =>
    getGameActionItems(game).length > 0
  ).slice(0, 5)
  const recentlyCompleted = completedGames
    .filter(game => game.completed_at)
    .sort((a, b) => (b.completed_at ?? 0) - (a.completed_at ?? 0))
    .slice(0, 5)
  const completedRoutes = games.reduce((sum, game) => sum + game.route_progress.completed, 0)
  const totalRoutes = games.reduce((sum, game) => sum + game.route_progress.total, 0)

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)] p-4">
          <div className="text-xs text-[var(--text-secondary)]">游戏总数</div>
          <div className="text-2xl font-bold mt-1">{games.length}</div>
        </div>
        <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)] p-4">
          <div className="text-xs text-[var(--text-secondary)]">累计游玩</div>
          <div className="text-2xl font-bold mt-1">{formatDuration(totalPlaytime)}</div>
        </div>
        <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)] p-4">
          <div className="text-xs text-[var(--text-secondary)]">运行中</div>
          <div className="text-2xl font-bold mt-1 text-emerald-600">{runningGames.length}</div>
        </div>
        <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)] p-4">
          <div className="text-xs text-[var(--text-secondary)]">通关记录</div>
          <div className="text-2xl font-bold mt-1">{completedWithDate.length}/{completedGames.length}</div>
        </div>
      </div>

      <div className="grid xl:grid-cols-[1fr_1fr_1.1fr] gap-6">
        <section className="rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)] p-4">
          <h2 className="font-semibold mb-3">最近游玩</h2>
          {recentlyPlayed.length === 0 ? (
            <p className="text-sm text-[var(--text-secondary)] py-6 text-center">暂无游玩记录</p>
          ) : (
            <div className="space-y-2">
              {recentlyPlayed.map(game => (
                <button
                  key={game.id}
                  type="button"
                  onClick={() => setSelectedGame(game)}
                  className="flex w-full items-center justify-between gap-3 rounded-md px-2 py-1.5 text-left text-sm hover:bg-[var(--surface-subtle)]"
                >
                  <span className="truncate">{game.name_cn || game.name}</span>
                  <span className="text-[var(--text-secondary)] shrink-0">{formatDate(game.last_played_at)}</span>
                </button>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)] p-4">
          <h2 className="font-semibold mb-3">最近通关</h2>
          {recentlyCompleted.length === 0 ? (
            <p className="text-sm text-[var(--text-secondary)] py-6 text-center">暂无通关时间</p>
          ) : (
            <div className="space-y-2">
              {recentlyCompleted.map(game => (
                <button
                  key={game.id}
                  type="button"
                  onClick={() => setSelectedGame(game)}
                  className="flex w-full items-center justify-between gap-3 rounded-md px-2 py-1.5 text-left text-sm hover:bg-[var(--surface-subtle)]"
                >
                  <span className="truncate">{game.name_cn || game.name}</span>
                  <span className="text-[var(--text-secondary)] shrink-0">{formatDate(game.completed_at)}</span>
                </button>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)] p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="font-semibold">待补信息</h2>
            <span className="text-xs text-[var(--text-secondary)]">{needsAttention.length} 项</span>
          </div>
          {needsAttention.length === 0 ? (
            <p className="text-sm text-[var(--text-secondary)] py-6 text-center">资料很完整</p>
          ) : (
            <div className="space-y-2">
              {needsAttention.map(game => {
                const actions = getGameActionItems(game).slice(0, 3)
                return (
                  <div key={game.id} className="rounded-md border border-[var(--border)] p-2.5 transition-colors hover:border-[var(--accent)]">
                    <button
                      type="button"
                      onClick={() => setSelectedGame(game)}
                      className="block w-full truncate text-left text-sm font-medium hover:text-[var(--accent)]"
                    >
                      {game.name_cn || game.name}
                    </button>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {actions.map(action => (
                        <button
                          key={action.key}
                          type="button"
                          onClick={() => onOpenGameAction(game, action.key)}
                          className={`rounded-full border px-2 py-0.5 text-[11px] transition-all hover:-translate-y-0.5 ${
                            action.tone === 'important'
                              ? 'border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]'
                              : 'border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                          }`}
                        >
                          {action.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </section>
      </div>

      {totalRoutes > 0 && (
        <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)] p-4">
          <div className="flex items-center justify-between text-sm">
            <span className="font-semibold">路线进度</span>
            <span className="text-[var(--text-secondary)]">{completedRoutes}/{totalRoutes}</span>
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-[var(--bg-primary)]">
            <div className="h-full rounded-full bg-[var(--accent)] transition-all duration-500" style={{ width: `${Math.round((completedRoutes / totalRoutes) * 100)}%` }} />
          </div>
        </div>
      )}
    </div>
  )
}

export function GameList({ activeView, onOpenGameAction }: GameListProps) {
  const { filteredGames, libraryGames, viewMode } = useGameStore()
  const visibleGames = filteredGames()

  if (activeView === 'dashboard') {
    return <Dashboard games={libraryGames()} onOpenGameAction={onOpenGameAction} />
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
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {visibleGames.map((game) => (
          <GameCard key={game.id} game={game} />
        ))}
      </div>
      {visibleGames.length === 0 && (
        <div className="text-center text-[var(--text-secondary)] py-20">
          还没有游戏，点击右上角添加
        </div>
      )}
    </div>
  )
}
