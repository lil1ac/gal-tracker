import type { Game, PlaySession, Route } from '../types'

export interface SessionSummary {
  game_id: string
  total_seconds: number
  session_count: number
  last_played_at: number | null
  running_seconds: number
}

export interface RouteProgress {
  completed: number
  total: number
  percent: number
}

export type GameSortField = 'updated' | 'title' | 'playtime' | 'last_played' | 'rating' | 'completed'
export type SortDirection = 'asc' | 'desc'

export type GameActionKey = 'rating' | 'tags' | 'review' | 'completed_at' | 'routes'

export interface GameActionItem {
  key: GameActionKey
  label: string
  tone: 'neutral' | 'important'
}

export interface LibraryGame extends Game {
  total_seconds: number
  session_count: number
  last_played_at: number | null
  running_seconds: number
  route_progress: RouteProgress
}

export function getGameActionItems(game: Game): GameActionItem[] {
  const items: GameActionItem[] = []
  if (!game.rating) items.push({ key: 'rating', label: '补评分', tone: 'neutral' })
  if (game.tags.length === 0) items.push({ key: 'tags', label: '补标签', tone: 'neutral' })
  if (game.status === 'completed' && !game.review?.trim()) {
    items.push({ key: 'review', label: '补评价', tone: 'important' })
  }
  if (game.status === 'completed' && !game.completed_at) {
    items.push({ key: 'completed_at', label: '补通关时间', tone: 'important' })
  }
  if (game.routes.length > 0 && game.routes.some(route => route.completed_at === null)) {
    items.push({ key: 'routes', label: '补路线', tone: 'neutral' })
  }
  return items
}

export function buildSessionSummaryMap(
  sessions: PlaySession[],
  now = Date.now()
): Record<string, SessionSummary> {
  const result: Record<string, SessionSummary> = {}

  for (const session of sessions) {
    const current = result[session.game_id] ?? {
      game_id: session.game_id,
      total_seconds: 0,
      session_count: 0,
      last_played_at: null,
      running_seconds: 0,
    }

    const duration = session.duration_seconds ?? (
      session.ended_at === null ? Math.max(0, Math.floor((now - session.started_at) / 1000)) : 0
    )

    current.total_seconds += duration
    current.session_count += 1
    if (session.ended_at === null) current.running_seconds += duration
    if (current.last_played_at === null || session.started_at > current.last_played_at) {
      current.last_played_at = session.started_at
    }

    result[session.game_id] = current
  }

  return result
}

export function formatDuration(seconds: number): string {
  if (seconds <= 0) return '-'
  const minutes = Math.max(1, Math.floor(seconds / 60))
  const hours = Math.floor(minutes / 60)
  const restMinutes = minutes % 60
  if (hours > 0 && restMinutes > 0) return `${hours}小时${restMinutes}分钟`
  if (hours > 0) return `${hours}小时`
  return `${minutes}分钟`
}

export function getRouteProgress(routes: Route[]): RouteProgress {
  const total = routes.length
  const completed = routes.filter(route => route.completed_at !== null).length
  return {
    completed,
    total,
    percent: total === 0 ? 0 : Math.round((completed / total) * 100),
  }
}

export function enrichGames(games: Game[], summaries: Record<string, SessionSummary>): LibraryGame[] {
  return games.map(game => {
    const summary = summaries[game.id]
    return {
      ...game,
      total_seconds: summary?.total_seconds ?? 0,
      session_count: summary?.session_count ?? 0,
      last_played_at: summary?.last_played_at ?? null,
      running_seconds: summary?.running_seconds ?? 0,
      route_progress: getRouteProgress(game.routes),
    }
  })
}

export function sortLibraryGames(games: LibraryGame[], field: GameSortField, direction: SortDirection): LibraryGame[] {
  return [...games].sort((a, b) => {
    let cmp: number
    if (field === 'title') {
      cmp = (a.name_cn || a.name).localeCompare(b.name_cn || b.name, 'zh-Hans-CN')
    } else if (field === 'playtime') {
      cmp = a.total_seconds - b.total_seconds
    } else if (field === 'last_played') {
      cmp = (a.last_played_at ?? 0) - (b.last_played_at ?? 0)
    } else if (field === 'rating') {
      cmp = (a.rating ?? 0) - (b.rating ?? 0)
    } else if (field === 'completed') {
      cmp = (a.completed_at ?? 0) - (b.completed_at ?? 0)
    } else {
      cmp = a.updated_at - b.updated_at
    }
    return direction === 'asc' ? cmp : -cmp
  })
}
