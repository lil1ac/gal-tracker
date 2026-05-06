import type { PlaySession } from '../types'
import type { LibraryGame } from './libraryStats'

export interface MemoryGameEntry {
  game: LibraryGame
  seconds: number
  sessionCount: number
  firstStartedAt: number
  lastEndedAt: number | null
}

export interface MemoryDay {
  date: string
  timestamp: number
  seconds: number
  sessionCount: number
  entries: MemoryGameEntry[]
}

export interface MemoryMonth {
  year: number
  month: number
  days: MemoryDay[]
  calendarDays: Array<MemoryDay | null>
}

export interface MemoryYearSummary {
  year: number
  totalSeconds: number
  activeDays: number
  gameCount: number
  sessionCount: number
  topGame: MemoryGameEntry | null
}

export interface MemoryStats {
  years: number[]
  selectedYear: number
  summary: MemoryYearSummary
  months: MemoryMonth[]
  daysByDate: Record<string, MemoryDay>
}

function startOfLocalDay(timestamp: number): Date {
  const date = new Date(timestamp)
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

export function localDateKey(timestamp: number): string {
  const date = startOfLocalDay(timestamp)
  const year = date.getFullYear()
  const month = `${date.getMonth() + 1}`.padStart(2, '0')
  const day = `${date.getDate()}`.padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function getSessionDurationSeconds(session: PlaySession, now = Date.now()): number {
  if (session.duration_seconds !== null) return Math.max(0, session.duration_seconds)
  if (session.ended_at === null) return Math.max(0, Math.floor((now - session.started_at) / 1000))
  return Math.max(0, Math.floor((session.ended_at - session.started_at) / 1000))
}

function emptyDay(date: string): MemoryDay {
  return {
    date,
    timestamp: new Date(`${date}T00:00:00`).getTime(),
    seconds: 0,
    sessionCount: 0,
    entries: [],
  }
}

function addSessionToDay(day: MemoryDay, game: LibraryGame, session: PlaySession, seconds: number) {
  let entry = day.entries.find(item => item.game.id === game.id)
  if (!entry) {
    entry = {
      game,
      seconds: 0,
      sessionCount: 0,
      firstStartedAt: session.started_at,
      lastEndedAt: session.ended_at,
    }
    day.entries.push(entry)
  }

  entry.seconds += seconds
  entry.sessionCount += 1
  entry.firstStartedAt = Math.min(entry.firstStartedAt, session.started_at)
  if (session.ended_at !== null) {
    entry.lastEndedAt = entry.lastEndedAt === null ? session.ended_at : Math.max(entry.lastEndedAt, session.ended_at)
  }
  day.seconds += seconds
  day.sessionCount += 1
}

function buildMonth(year: number, month: number, daysByDate: Record<string, MemoryDay>): MemoryMonth {
  const first = new Date(year, month, 1)
  const lastDate = new Date(year, month + 1, 0).getDate()
  const days = Array.from({ length: lastDate }, (_, index) => {
    const day = index + 1
    const key = `${year}-${`${month + 1}`.padStart(2, '0')}-${`${day}`.padStart(2, '0')}`
    return daysByDate[key] || emptyDay(key)
  })
  const calendarDays = [
    ...Array.from({ length: first.getDay() }, () => null),
    ...days,
  ]
  return { year, month, days, calendarDays }
}

function summarizeYear(year: number, days: MemoryDay[]): MemoryYearSummary {
  const activeDays = days.filter(day => day.seconds > 0)
  const byGame = new Map<string, MemoryGameEntry>()

  for (const day of activeDays) {
    for (const entry of day.entries) {
      const current = byGame.get(entry.game.id)
      if (!current) {
        byGame.set(entry.game.id, { ...entry })
      } else {
        current.seconds += entry.seconds
        current.sessionCount += entry.sessionCount
        current.firstStartedAt = Math.min(current.firstStartedAt, entry.firstStartedAt)
        current.lastEndedAt = current.lastEndedAt === null
          ? entry.lastEndedAt
          : entry.lastEndedAt === null
            ? current.lastEndedAt
            : Math.max(current.lastEndedAt, entry.lastEndedAt)
      }
    }
  }

  const topGame = [...byGame.values()].sort((a, b) => b.seconds - a.seconds || a.game.name.localeCompare(b.game.name, 'zh-Hans-CN'))[0] || null

  return {
    year,
    totalSeconds: activeDays.reduce((sum, day) => sum + day.seconds, 0),
    activeDays: activeDays.length,
    gameCount: byGame.size,
    sessionCount: activeDays.reduce((sum, day) => sum + day.sessionCount, 0),
    topGame,
  }
}

export function buildMemoryStats(
  games: LibraryGame[],
  sessions: PlaySession[],
  selectedYear: number,
  now = Date.now()
): MemoryStats {
  const gameMap = new Map(games.map(game => [game.id, game]))
  const allYears = new Set<number>([selectedYear])
  const daysByDate: Record<string, MemoryDay> = {}

  for (const session of sessions) {
    const game = gameMap.get(session.game_id)
    if (!game) continue
    const date = localDateKey(session.started_at)
    const year = new Date(session.started_at).getFullYear()
    allYears.add(year)
    if (year !== selectedYear) continue

    const seconds = getSessionDurationSeconds(session, now)
    const day = daysByDate[date] || emptyDay(date)
    addSessionToDay(day, game, session, seconds)
    daysByDate[date] = day
  }

  for (const day of Object.values(daysByDate)) {
    day.entries.sort((a, b) => a.firstStartedAt - b.firstStartedAt)
  }

  const months = Array.from({ length: 12 }, (_, month) => buildMonth(selectedYear, month, daysByDate))
  return {
    years: [...allYears].sort((a, b) => b - a),
    selectedYear,
    summary: summarizeYear(selectedYear, Object.values(daysByDate)),
    months,
    daysByDate,
  }
}
