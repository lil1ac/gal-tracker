import { useMemo } from 'react'
import type { PlaySession } from '../types'
import {
  buildDashboardStats,
  DashboardActionGroup,
} from '../services/dashboardStats'
import { formatDuration, GameActionKey, LibraryGame } from '../services/libraryStats'
import { useGameStore } from '../store/gameStore'
import { DistributionBars } from './dashboard/DistributionBars'
import { MetricTile } from './dashboard/MetricTile'
import { playtimeMetric, RankingList } from './dashboard/RankingList'
import { TrendChart } from './dashboard/TrendChart'

interface DashboardProps {
  games: LibraryGame[]
  sessions: PlaySession[]
  onOpenGameAction: (game: LibraryGame, target?: GameActionKey) => void
}

function formatPercent(value: number | null) {
  return value === null ? '-' : `${value}%`
}

function formatAverageRating(value: number | null) {
  return value === null ? '-' : value.toFixed(1)
}

function formatDate(timestamp: number | null) {
  if (!timestamp) return '-'
  return new Date(timestamp).toLocaleDateString('zh-CN')
}

function ratingMetric(game: LibraryGame) {
  return game.rating === null ? '-' : `${game.rating} 分`
}

function recentMetric(game: LibraryGame) {
  return formatDate(game.last_played_at)
}

function ActionItems({
  groups,
  onOpenGame,
  onOpenGameAction,
}: {
  groups: DashboardActionGroup[]
  onOpenGame: (game: LibraryGame) => void
  onOpenGameAction: (game: LibraryGame, target?: GameActionKey) => void
}) {
  return (
    <section className="dashboard-panel">
      <div className="dashboard-section-head">
        <h2 className="dashboard-section-title">待补信息</h2>
        <span>{groups.length} 项</span>
      </div>
      {groups.length === 0 ? (
        <div className="dashboard-empty">资料完整</div>
      ) : (
        <div className="dashboard-action-list">
          {groups.map(group => (
            <div key={group.game.id} className="dashboard-action-row">
              <button
                type="button"
                onClick={() => onOpenGame(group.game)}
                className="dashboard-action-title"
              >
                {group.game.name_cn || group.game.name}
              </button>
              <div className="dashboard-action-chips">
                {group.actions.map(action => (
                  <button
                    key={action.key}
                    type="button"
                    onClick={() => onOpenGameAction(group.game, action.key)}
                    className={`dashboard-action-chip ${action.tone === 'important' ? 'is-important' : ''}`}
                  >
                    {action.label}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}

export function Dashboard({ games, sessions, onOpenGameAction }: DashboardProps) {
  const { setSelectedGame } = useGameStore()
  const stats = useMemo(() => buildDashboardStats(games, sessions), [games, sessions])

  const openGame = (game: LibraryGame) => {
    setSelectedGame(game)
  }

  if (games.length === 0) {
    return (
      <div className="dashboard-shell">
        <div className="dashboard-empty mx-auto max-w-xl py-12">
          还没有游戏。添加游戏后，这里会显示游玩趋势、评分和通关统计。
        </div>
      </div>
    )
  }

  return (
    <div className="dashboard-shell">
      <div className="dashboard-workbench">
        <div className="dashboard-header">
          <div>
            <h1>总览</h1>
            <p>基于本地游戏库与游玩记录生成</p>
          </div>
          <span>{new Date().toLocaleDateString('zh-CN')}</span>
        </div>

        <div className="dashboard-metric-strip">
          <MetricTile label="游戏总数" value={String(stats.metrics.totalGames)} />
          <MetricTile label="总游玩时长" value={formatDuration(stats.metrics.totalPlaySeconds)} tone="accent" />
          <MetricTile label="通关率" value={formatPercent(stats.metrics.completionRate)} />
          <MetricTile label="平均评分" value={formatAverageRating(stats.metrics.averageRating)} />
          <MetricTile label="本月通关" value={String(stats.metrics.completedThisMonth)} hint="本地自然月" />
        </div>

        <div className="dashboard-main-grid">
          <TrendChart points={stats.trend} />
          <div className="dashboard-side-stack">
            <DistributionBars title="状态分布" items={stats.statusDistribution} emptyText="暂无状态数据" />
            <DistributionBars title="平台分布" items={stats.platformDistribution} emptyText="暂无平台数据" />
          </div>
        </div>

        <div className="dashboard-rank-grid">
          <RankingList
            title="游玩时长 Top 5"
            games={stats.rankings.playtimeTop}
            emptyText="暂无游玩时长"
            metric={playtimeMetric}
            onOpenGame={openGame}
          />
          <RankingList
            title="评分 Top 5"
            games={stats.rankings.ratingTop}
            emptyText="暂无评分"
            metric={ratingMetric}
            onOpenGame={openGame}
          />
          <RankingList
            title="最近游玩"
            games={stats.rankings.recentPlayed}
            emptyText="暂无游玩记录"
            metric={recentMetric}
            onOpenGame={openGame}
          />
        </div>

        <div className="dashboard-bottom-grid">
          <DistributionBars title="评分分布" items={stats.ratingDistribution} emptyText="暂无评分" compact />
          <ActionItems groups={stats.actionItems} onOpenGame={openGame} onOpenGameAction={onOpenGameAction} />
        </div>
      </div>
    </div>
  )
}
