import { Game } from '../types'

const STORAGE_KEY = 'gal-tracker-games'

export function saveGames(games: Game[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(games))
}

export function loadGames(): Game[] {
  const stored = localStorage.getItem(STORAGE_KEY)
  if (!stored) return []
  try {
    return JSON.parse(stored) as Game[]
  } catch {
    return []
  }
}

export function exportData(): string {
  const games = loadGames()
  return JSON.stringify(games, null, 2)
}

export function importData(json: string): Game[] {
  const games = JSON.parse(json) as Game[]
  saveGames(games)
  return games
}

export function initDatabase(): Promise<void> {
  return Promise.resolve()
}