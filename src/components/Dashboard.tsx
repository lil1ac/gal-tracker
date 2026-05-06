import { useMemo } from 'react'
import type { PlaySession } from '../types'
import {
  buildDashboardStats,
  DashboardActionGroup,
  DashboardDistributionItem,
  DashboardTrendPoint,
} from '../services/dashboardStats'
import { GameActionKey, LibraryGame } from '../services/libraryStats'
import { useGameStore } from '../store/gameStore'

interface DashboardProps {
  games: LibraryGame[]
  sessions: PlaySession[]
  onOpenGameAction: (game: LibraryGame, target?: GameActionKey) => void
}

const statusLabels: Record<LibraryGame['status'], string> = {
  wish: '想玩',
  playing: '在玩',
  completed: '已通关',
  paused: '搁置',
}

const actionLabels: Record<GameActionKey, string> = {
  rating: '补评分',
  tags: '补标签',
  review: '写评价',
  completed_at: '补通关时间',
  routes: '更新路线',
}

function titleOf(game: LibraryGame) {
  return game.name_cn || game.name
}

function formatPercent(value: number | null) {
  return value === null ? '-' : `${value}%`
}

function formatAverageRating(value: number | null) {
  return value === null ? '-' : value.toFixed(1)
}

function formatDurationZh(seconds: number) {
  if (seconds <= 0) return '-'
  const minutes = Math.max(1, Math.floor(seconds / 60))
  const hours = Math.floor(minutes / 60)
  const restMinutes = minutes % 60
  if (hours > 0 && restMinutes > 0) return `${hours}小时 ${restMinutes}分钟`
  if (hours > 0) return `${hours}小时`
  return `${minutes}分钟`
}

function formatDate(timestamp: number | null) {
  if (!timestamp) return '暂无记录'
  return new Date(timestamp).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })
}

function getMonthPlaySeconds(sessions: PlaySession[], now = Date.now()) {
  const current = new Date(now)
  const monthStart = new Date(current.getFullYear(), current.getMonth(), 1).getTime()
  return sessions.reduce((sum, session) => {
    if (session.started_at < monthStart) return sum
    const duration = session.duration_seconds ?? (
      session.ended_at === null ? Math.max(0, Math.floor((now - session.started_at) / 1000)) : 0
    )
    return sum + duration
  }, 0)
}

function getWeekPlaySeconds(sessions: PlaySession[], now = Date.now()) {
  const weekStart = now - 7 * 24 * 60 * 60 * 1000
  return sessions.reduce((sum, session) => {
    if (session.started_at < weekStart) return sum
    const duration = session.duration_seconds ?? (
      session.ended_at === null ? Math.max(0, Math.floor((now - session.started_at) / 1000)) : 0
    )
    return sum + duration
  }, 0)
}

function pickFocusGame(games: LibraryGame[]) {
  const playing = games
    .filter(game => game.status === 'playing')
    .sort((a, b) => (b.last_played_at ?? 0) - (a.last_played_at ?? 0) || b.updated_at - a.updated_at)
  if (playing[0]) return playing[0]

  const recent = games
    .filter(game => game.last_played_at !== null)
    .sort((a, b) => (b.last_played_at ?? 0) - (a.last_played_at ?? 0))
  if (recent[0]) return recent[0]

  return [...games].sort((a, b) => b.updated_at - a.updated_at)[0] || null
}

function MiniMetric({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="dashboard-mini-metric">
      <span>{label}</span>
      <strong>{value}</strong>
      {hint ? <p>{hint}</p> : null}
    </div>
  )
}

function FocusGameCard({
  game,
  onOpen,
}: {
  game: LibraryGame | null
  onOpen: (game: LibraryGame) => void
}) {
  if (!game) {
    return (
      <div className="dashboard-focus-empty">
        <h2>还没有可继续的游戏</h2>
        <p>添加游戏后，这里会优先显示正在玩或最近游玩的作品。</p>
      </div>
    )
  }

  return (
    <div className="dashboard-focus-card">
      <div className="dashboard-focus-cover">
        {game.cover_url ? <img src={game.cover_url} alt="" /> : <span>无封面</span>}
      </div>
      <div className="dashboard-focus-copy">
        <div className="dashboard-focus-status">
          <span className={`dashboard-status-dot is-${game.status}`} />
          {statusLabels[game.status]}
        </div>
        <h2>{titleOf(game)}</h2>
        {game.name_cn && <p className="dashboard-focus-subtitle">{game.name}</p>}
        <div className="dashboard-focus-facts">
          <span>累计 {formatDurationZh(game.total_seconds)}</span>
          <span>最近 {formatDate(game.last_played_at)}</span>
          {game.route_progress.total > 0 && (
            <span>路线 {game.route_progress.completed}/{game.route_progress.total}</span>
          )}
        </div>
        <button type="button" onClick={() => onOpen(game)} className="dashboard-primary-action">
          打开详情
        </button>
      </div>
    </div>
  )
}

function QueueList({ games, onOpen }: { games: LibraryGame[]; onOpen: (game: LibraryGame) => void }) {
  const queue = games
    .filter(game => game.status === 'playing' || game.status === 'paused')
    .sort((a, b) => {
      if (a.status !== b.status) return a.status === 'playing' ? -1 : 1
      return (b.last_played_at ?? 0) - (a.last_played_at ?? 0) || b.updated_at - a.updated_at
    })
    .slice(0, 6)

  return (
    <section className="dashboard-panel dashboard-queue-panel">
      <div className="dashboard-section-head">
        <div>
          <h2>游玩队列</h2>
          <p>正在玩和近期搁置的作品</p>
        </div>
        <span>{queue.length} 个</span>
      </div>
      {queue.length === 0 ? (
        <div className="dashboard-empty">暂无正在推进的游戏</div>
      ) : (
        <div className="dashboard-game-list">
          {queue.map(game => (
            <button key={game.id} type="button" onClick={() => onOpen(game)} className="dashboard-game-row">
              <img src={game.cover_url} alt="" />
              <span className="dashboard-game-row-main">
                <strong>{titleOf(game)}</strong>
                <small>{statusLabels[game.status]} / {formatDurationZh(game.total_seconds)}</small>
              </span>
              <span className="dashboard-game-row-date">{formatDate(game.last_played_at)}</span>
            </button>
          ))}
        </div>
      )}
    </section>
  )
}

function ActivityChart({ points }: { points: DashboardTrendPoint[] }) {
  const maxSeconds = Math.max(...points.map(point => point.seconds), 0)
  const hasData = maxSeconds > 0
  const activeDays = points.filter(point => point.seconds > 0).length

  return (
    <section className="dashboard-panel dashboard-activity-panel">
      <div className="dashboard-section-head">
        <div>
          <h2>30 天游玩节奏</h2>
          <p>{activeDays > 0 ? `${activeDays} 天有记录` : '还没有形成趋势'}</p>
        </div>
        <span>按开始日期统计</span>
      </div>
      {!hasData ? (
        <div className="dashboard-empty is-tall">暂无游玩记录</div>
      ) : (
        <div className="dashboard-activity-chart">
          <div className="dashboard-activity-grid" />
          <div className="dashboard-activity-bars">
            {points.map(point => {
              const height = Math.max(5, Math.round((point.seconds / maxSeconds) * 100))
              return (
                <div key={point.date} className="dashboard-activity-column group">
                  <div className="dashboard-tooltip">{point.label} / {formatDurationZh(point.seconds)}</div>
                  <div className="dashboard-activity-bar" style={{ height: `${height}%` }} />
                </div>
              )
            })}
          </div>
          <div className="dashboard-chart-labels">
            <span>{points[0]?.label}</span>
            <span>{points[Math.floor(points.length / 2)]?.label}</span>
            <span>{points[points.length - 1]?.label}</span>
          </div>
        </div>
      )}
    </section>
  )
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
    <section className="dashboard-panel dashboard-action-panel">
      <div className="dashboard-section-head">
        <div>
          <h2>整理建议</h2>
          <p>优先补齐影响回顾的数据</p>
        </div>
        <span>{groups.length} 项</span>
      </div>
      {groups.length === 0 ? (
        <div className="dashboard-empty">资料已经比较完整</div>
      ) : (
        <div className="dashboard-action-list">
          {groups.map(group => (
            <div key={group.game.id} className="dashboard-action-row">
              <button type="button" onClick={() => onOpenGame(group.game)} className="dashboard-action-title">
                {titleOf(group.game)}
              </button>
              <div className="dashboard-action-chips">
                {group.actions.map(action => (
                  <button
                    key={action.key}
                    type="button"
                    onClick={() => onOpenGameAction(group.game, action.key)}
                    className={`dashboard-action-chip ${action.tone === 'important' ? 'is-important' : ''}`}
                  >
                    {actionLabels[action.key]}
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

function RankingPanel({
  title,
  games,
  emptyText,
  metric,
  onOpenGame,
}: {
  title: string
  games: LibraryGame[]
  emptyText: string
  metric: (game: LibraryGame) => string
  onOpenGame: (game: LibraryGame) => void
}) {
  return (
    <section className="dashboard-panel">
      <h2 className="dashboard-section-title">{title}</h2>
      {games.length === 0 ? (
        <div className="dashboard-empty">{emptyText}</div>
      ) : (
        <div className="dashboard-rank-list">
          {games.map((game, index) => (
            <button key={game.id} type="button" onClick={() => onOpenGame(game)} className="dashboard-rank-row">
              <span className="dashboard-rank-index">{String(index + 1).padStart(2, '0')}</span>
              <span className="dashboard-rank-title">{titleOf(game)}</span>
              <span className="dashboard-rank-value">{metric(game)}</span>
            </button>
          ))}
        </div>
      )}
    </section>
  )
}

function DistributionPanel({
  title,
  items,
  emptyText,
  compact = false,
}: {
  title: string
  items: DashboardDistributionItem[]
  emptyText: string
  compact?: boolean
}) {
  const visibleItems = items.filter(item => item.count > 0)
  return (
    <section className="dashboard-panel">
      <h2 className="dashboard-section-title">{title}</h2>
      {visibleItems.length === 0 ? (
        <div className="dashboard-empty">{emptyText}</div>
      ) : (
        <div className={compact ? 'dashboard-distribution-grid' : 'dashboard-distribution-list'}>
          {visibleItems.map(item => (
            <div key={item.key} className="dashboard-bar-row">
              <div className="dashboard-bar-meta">
                <span>{item.label}</span>
                <span>{item.count} / {item.percent}%</span>
              </div>
              <div className="dashboard-bar-track">
                <div className="dashboard-bar-fill" style={{ width: `${Math.max(4, item.percent)}%` }} />
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
  const focusGame = useMemo(() => pickFocusGame(games), [games])
  const monthPlaySeconds = useMemo(() => getMonthPlaySeconds(sessions), [sessions])
  const weekPlaySeconds = useMemo(() => getWeekPlaySeconds(sessions), [sessions])
  const playingCount = games.filter(game => game.status === 'playing').length
  const wishCount = games.filter(game => game.status === 'wish').length

  const openGame = (game: LibraryGame) => {
    setSelectedGame(game)
  }

  if (games.length === 0) {
    return (
      <div className="dashboard-shell">
        <div className="dashboard-onboarding">
          <h1>开始建立你的 GAL 游玩记录</h1>
          <p>添加游戏后，这里会汇总最近游玩、通关进度、评分分布和待补资料。</p>
        </div>
      </div>
    )
  }

  return (
    <div className="dashboard-shell">
      <div className="dashboard-workbench">
        <section className="dashboard-hero">
          <div className="dashboard-hero-copy">
            <p>{new Date().toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
            <h1>总览</h1>
            <span>把正在玩的作品、近期节奏和资料整理集中在一个首页里。</span>
          </div>
          <div className="dashboard-metric-cluster">
            <MiniMetric label="本月游玩" value={formatDurationZh(monthPlaySeconds)} hint={`近 7 天 ${formatDurationZh(weekPlaySeconds)}`} />
            <MiniMetric label="正在推进" value={`${playingCount} 个`} hint={`想玩 ${wishCount} 个`} />
            <MiniMetric label="通关率" value={formatPercent(stats.metrics.completionRate)} hint={`本月通关 ${stats.metrics.completedThisMonth} 个`} />
            <MiniMetric label="平均评分" value={formatAverageRating(stats.metrics.averageRating)} hint={`总计 ${stats.metrics.totalGames} 个游戏`} />
          </div>
        </section>

        <div className="dashboard-priority-grid">
          <FocusGameCard game={focusGame} onOpen={openGame} />
          <QueueList games={games} onOpen={openGame} />
          <ActionItems groups={stats.actionItems} onOpenGame={openGame} onOpenGameAction={onOpenGameAction} />
        </div>

        <div className="dashboard-analysis-grid">
          <ActivityChart points={stats.trend} />
          <DistributionPanel title="状态分布" items={stats.statusDistribution} emptyText="暂无状态数据" />
        </div>

        <div className="dashboard-rank-grid">
          <RankingPanel
            title="游玩时长 Top 5"
            games={stats.rankings.playtimeTop}
            emptyText="暂无游玩时长"
            metric={game => formatDurationZh(game.total_seconds)}
            onOpenGame={openGame}
          />
          <RankingPanel
            title="评分 Top 5"
            games={stats.rankings.ratingTop}
            emptyText="暂无评分"
            metric={game => game.rating === null ? '-' : `${game.rating} 分`}
            onOpenGame={openGame}
          />
          <RankingPanel
            title="最近游玩"
            games={stats.rankings.recentPlayed}
            emptyText="暂无游玩记录"
            metric={game => formatDate(game.last_played_at)}
            onOpenGame={openGame}
          />
        </div>

        <div className="dashboard-distribution-row">
          <DistributionPanel title="平台分布" items={stats.platformDistribution} emptyText="暂无平台数据" />
          <DistributionPanel title="评分分布" items={stats.ratingDistribution} emptyText="暂无评分" compact />
        </div>
      </div>
    </div>
  )
}
