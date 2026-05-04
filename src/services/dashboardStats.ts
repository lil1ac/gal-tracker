import type { GameStatus, PlaySession } from '../types'
import { getGameActionItems } from './libraryStats.js'
import type { GameActionItem, LibraryGame } from './libraryStats.js'

export interface DashboardMetricStats {
  totalGames: number
  totalPlaySeconds: number
  completionRate: number | null
  averageRating: number | null
  completedThisMonth: number
}

export interface DashboardTrendPoint {
  date: string
  label: string
  seconds: number
}

export interface DashboardDistributionItem {
  key: string
  label: string
  count: number
  percent: number
}

export interface DashboardActionGroup {
  game: LibraryGame
  actions: GameActionItem[]
}

export interface DashboardRankings {
  playtimeTop: LibraryGame[]
  ratingTop: LibraryGame[]
  recentPlayed: LibraryGame[]
}

export interface DashboardStats {
  metrics: DashboardMetricStats
  trend: DashboardTrendPoint[]
  statusDistribution: DashboardDistributionItem[]
  platformDistribution: DashboardDistributionItem[]
  ratingDistribution: DashboardDistributionItem[]
  rankings: DashboardRankings
  actionItems: DashboardActionGroup[]
}

const STATUS_LABELS: Record<GameStatus, string> = {
  wish: '想玩',
  playing: '在玩',
  completed: '已通关',
  paused: '搁置',
}

const STATUS_ORDER: GameStatus[] = ['wish', 'playing', 'completed', 'paused']

function startOfLocalDay(timestamp: number): Date {
  const date = new Date(timestamp)
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

function localDateKey(timestamp: number): string {
  const date = startOfLocalDay(timestamp)
  const year = date.getFullYear()
  const month = `${date.getMonth() + 1}`.padStart(2, '0')
  const day = `${date.getDate()}`.padStart(2, '0')
  return `${year}-${month}-${day}`
}

function localDayLabel(timestamp: number): string {
  const date = new Date(timestamp)
  return `${date.getMonth() + 1}/${date.getDate()}`
}

function getSessionDurationSeconds(session: PlaySession, now: number): number {
  if (session.duration_seconds !== null) return Math.max(0, session.duration_seconds)
  if (session.ended_at === null) return Math.max(0, Math.floor((now - session.started_at) / 1000))
  return 0
}

function percent(count: number, total: number): number {
  return total === 0 ? 0 : Math.round((count / total) * 100)
}

function byTitle(game: LibraryGame): string {
  return game.name_cn || game.name
}

function buildMetrics(games: LibraryGame[], now: number): DashboardMetricStats {
  const ratedGames = games.filter(game => game.rating !== null)
  const completedGames = games.filter(game => game.status === 'completed')
  const current = new Date(now)
  const monthStart = new Date(current.getFullYear(), current.getMonth(), 1).getTime()
  const nextMonthStart = new Date(current.getFullYear(), current.getMonth() + 1, 1).getTime()

  return {
    totalGames: games.length,
    totalPlaySeconds: games.reduce((sum, game) => sum + game.total_seconds, 0),
    completionRate: games.length === 0 ? null : percent(completedGames.length, games.length),
    averageRating: ratedGames.length === 0
      ? null
      : Math.round((ratedGames.reduce((sum, game) => sum + (game.rating ?? 0), 0) / ratedGames.length) * 10) / 10,
    completedThisMonth: games.filter(game =>
      game.completed_at !== null &&
      game.completed_at >= monthStart &&
      game.completed_at < nextMonthStart
    ).length,
  }
}

function buildTrend(sessions: PlaySession[], now: number): DashboardTrendPoint[] {
  const todayStart = startOfLocalDay(now).getTime()
  const points = Array.from({ length: 30 }, (_, index) => {
    const timestamp = todayStart - (29 - index) * 24 * 60 * 60 * 1000
    return {
      date: localDateKey(timestamp),
      label: localDayLabel(timestamp),
      seconds: 0,
    }
  })
  const pointMap = new Map(points.map(point => [point.date, point]))

  for (const session of sessions) {
    const key = localDateKey(session.started_at)
    const point = pointMap.get(key)
    if (!point) continue

    // 第一版把跨天会话全部计入 started_at 所在日期，后续如需精确拆分可在这里扩展。
    point.seconds += getSessionDurationSeconds(session, now)
  }

  return points
}

function buildStatusDistribution(games: LibraryGame[]): DashboardDistributionItem[] {
  const counts = new Map<GameStatus, number>(STATUS_ORDER.map(status => [status, 0]))
  for (const game of games) {
    counts.set(game.status, (counts.get(game.status) ?? 0) + 1)
  }

  return STATUS_ORDER.map(status => ({
    key: status,
    label: STATUS_LABELS[status],
    count: counts.get(status) ?? 0,
    percent: percent(counts.get(status) ?? 0, games.length),
  }))
}

function buildPlatformDistribution(games: LibraryGame[]): DashboardDistributionItem[] {
  const counts = new Map<string, number>()

  for (const game of games) {
    const platforms = game.platform.length === 0 ? ['未标注'] : game.platform
    for (const platform of platforms) {
      counts.set(platform, (counts.get(platform) ?? 0) + 1)
    }
  }

  const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'zh-Hans-CN'))
  const top = sorted.slice(0, 6)
  const rest = sorted.slice(6)
  if (rest.length > 0) {
    top.push(['其他', rest.reduce((sum, [, count]) => sum + count, 0)])
  }

  const total = top.reduce((sum, [, count]) => sum + count, 0)
  return top.map(([label, count]) => ({
    key: label,
    label,
    count,
    percent: percent(count, total),
  }))
}

function buildRatingDistribution(games: LibraryGame[]): DashboardDistributionItem[] {
  const counts = new Map<number, number>()
  for (let rating = 1; rating <= 10; rating += 1) counts.set(rating, 0)

  for (const game of games) {
    if (game.rating === null) continue
    counts.set(game.rating, (counts.get(game.rating) ?? 0) + 1)
  }

  const total = games.filter(game => game.rating !== null).length
  return Array.from({ length: 10 }, (_, index) => {
    const rating = index + 1
    const count = counts.get(rating) ?? 0
    return {
      key: String(rating),
      label: `${rating} 分`,
      count,
      percent: percent(count, total),
    }
  })
}

function buildRankings(games: LibraryGame[]): DashboardRankings {
  return {
    playtimeTop: games
      .filter(game => game.total_seconds > 0)
      .sort((a, b) => b.total_seconds - a.total_seconds || byTitle(a).localeCompare(byTitle(b), 'zh-Hans-CN'))
      .slice(0, 5),
    ratingTop: games
      .filter(game => game.rating !== null)
      .sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0) || b.updated_at - a.updated_at)
      .slice(0, 5),
    recentPlayed: games
      .filter(game => game.last_played_at !== null)
      .sort((a, b) => (b.last_played_at ?? 0) - (a.last_played_at ?? 0))
      .slice(0, 5),
  }
}

function buildActionItems(games: LibraryGame[]): DashboardActionGroup[] {
  return games
    .map(game => ({ game, actions: getGameActionItems(game).slice(0, 3) }))
    .filter(group => group.actions.length > 0)
    .slice(0, 5)
}

export function buildDashboardStats(
  games: LibraryGame[],
  sessions: PlaySession[] = [],
  now = Date.now()
): DashboardStats {
  return {
    metrics: buildMetrics(games, now),
    trend: buildTrend(sessions, now),
    statusDistribution: buildStatusDistribution(games),
    platformDistribution: buildPlatformDistribution(games),
    ratingDistribution: buildRatingDistribution(games),
    rankings: buildRankings(games),
    actionItems: buildActionItems(games),
  }
}
