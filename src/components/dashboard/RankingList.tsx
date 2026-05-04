import { formatDuration, LibraryGame } from '../../services/libraryStats'

interface RankingListProps {
  title: string
  games: LibraryGame[]
  emptyText: string
  metric: (game: LibraryGame) => string
  onOpenGame: (game: LibraryGame) => void
}

export function RankingList({ title, games, emptyText, metric, onOpenGame }: RankingListProps) {
  return (
    <section className="dashboard-panel">
      <h2 className="dashboard-section-title">{title}</h2>
      {games.length === 0 ? (
        <div className="dashboard-empty">{emptyText}</div>
      ) : (
        <div className="dashboard-rank-list">
          {games.map((game, index) => (
            <button
              key={game.id}
              type="button"
              onClick={() => onOpenGame(game)}
              className="dashboard-rank-row"
            >
              <span className="dashboard-rank-index">
                {index + 1}
              </span>
              <span className="dashboard-rank-title">{game.name_cn || game.name}</span>
              <span className="dashboard-rank-value">{metric(game)}</span>
            </button>
          ))}
        </div>
      )}
    </section>
  )
}

export function playtimeMetric(game: LibraryGame) {
  return formatDuration(game.total_seconds)
}
