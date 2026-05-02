import initSqlJs, { Database } from 'sql.js'
import { Game } from '../types'

let db: Database | null = null

export async function initDatabase(): Promise<void> {
  const SQL = await initSqlJs({
    locateFile: (file: string) => `https://sql.js.org/dist/${file}`,
  })
  const stored = localStorage.getItem('gal-tracker-db')
  if (stored) {
    const data = new Uint8Array(JSON.parse(stored))
    db = new SQL.Database(data)
  } else {
    db = new SQL.Database()
    db.run(`
      CREATE TABLE IF NOT EXISTS games (
        id TEXT PRIMARY KEY,
        data TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      )
    `)
  }
}

export function saveGames(games: Game[]): void {
  if (!db) return
  db.run('DELETE FROM games')
  const stmt = db.prepare('INSERT INTO games (id, data, created_at, updated_at) VALUES (?, ?, ?, ?)')
  for (const game of games) {
    stmt.run([game.id, JSON.stringify(game), game.created_at, game.updated_at])
  }
  stmt.free()
  const data = db.export()
  localStorage.setItem('gal-tracker-db', JSON.stringify(Array.from(data)))
}

export function loadGames(): Game[] {
  if (!db) return []
  const results = db.exec('SELECT data FROM games')
  if (!results.length) return []
  return results[0].values.map((row) => JSON.parse(row[0] as string) as Game)
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