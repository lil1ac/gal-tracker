import { create } from 'zustand'
import { Game, GameStatus, PlaySession } from '../types'
import { addManualPlaySession, deletePlaySession, loadGames, loadPlaySessions, execute } from '../services/database'
import {
  buildSessionSummaryMap,
  enrichGames,
  GameSortMode,
  LibraryGame,
  SessionSummary,
  sortLibraryGames,
} from '../services/libraryStats'

interface GameStore {
  games: Game[]
  sessions: PlaySession[]
  sessionSummaries: Record<string, SessionSummary>
  selectedGame: Game | null
  filterStatus: GameStatus | 'all'
  viewMode: 'card' | 'list'
  sortMode: GameSortMode
  searchQuery: string
  lastError: string | null

  load: () => Promise<void>
  addGame: (game: Game) => Promise<void>
  updateGame: (id: string, updates: Partial<Game>) => Promise<void>
  deleteGame: (id: string) => Promise<void>
  addManualSession: (gameId: string, startedAt: number, durationSeconds: number) => Promise<void>
  deleteSession: (sessionId: string) => Promise<void>
  setSelectedGame: (game: Game | null) => void
  setFilterStatus: (status: GameStatus | 'all') => void
  setViewMode: (mode: 'card' | 'list') => void
  setSortMode: (mode: GameSortMode) => void
  setSearchQuery: (query: string) => void
  clearError: () => void
  libraryGames: () => LibraryGame[]
  filteredGames: () => LibraryGame[]
}

export const useGameStore = create<GameStore>((set, get) => ({
  games: [],
  sessions: [],
  sessionSummaries: {},
  selectedGame: null,
  filterStatus: 'all',
  viewMode: 'card',
  sortMode: 'updated_desc',
  searchQuery: '',
  lastError: null,

  load: async () => {
    const [games, sessions] = await Promise.all([loadGames(), loadPlaySessions()])
    const sessionSummaries = buildSessionSummaryMap(sessions)
    const selectedGame = get().selectedGame
    set({
      games,
      sessions,
      sessionSummaries,
      selectedGame: selectedGame ? games.find(game => game.id === selectedGame.id) || null : null,
    })
  },

  addGame: async (game: Game) => {
    const previousGames = get().games
    set({ games: [...previousGames, game], lastError: null })
    try {
      await execute(
        `INSERT INTO games (id, name, name_cn, cover_url, air_date, platform, status, rating, review, routes, tags, linked_resources, current_running, auto_status_prompted, auto_status_update_enabled, completed_at, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [game.id, game.name, game.name_cn, game.cover_url, game.air_date, JSON.stringify(game.platform), game.status, game.rating, game.review, JSON.stringify(game.routes), JSON.stringify(game.tags), JSON.stringify(game.linked_resources), game.current_running ? 1 : 0, game.auto_status_prompted ? 1 : 0, game.auto_status_update_enabled ? 1 : 0, game.completed_at ?? null, game.created_at, game.updated_at]
      )
    } catch (error) {
      set({ games: previousGames, lastError: error instanceof Error ? error.message : '添加游戏失败' })
      throw error
    }
  },

  updateGame: async (id: string, updates: Partial<Game>) => {
    const game = get().games.find(g => g.id === id)
    if (!game) return

    const merged = { ...game, ...updates, updated_at: Date.now() }
    const previousGames = get().games
    const previousSelected = get().selectedGame

    set({
      games: previousGames.map(g => g.id === id ? merged : g),
      selectedGame: previousSelected?.id === id ? merged : previousSelected,
      lastError: null,
    })
    try {
      await execute(
        `UPDATE games SET name = ?, name_cn = ?, cover_url = ?, air_date = ?, platform = ?, status = ?, rating = ?, review = ?, routes = ?, tags = ?, linked_resources = ?, current_running = ?, auto_status_prompted = ?, auto_status_update_enabled = ?, completed_at = ?, updated_at = ? WHERE id = ?`,
        [merged.name, merged.name_cn, merged.cover_url, merged.air_date, JSON.stringify(merged.platform), merged.status, merged.rating, merged.review, JSON.stringify(merged.routes), JSON.stringify(merged.tags), JSON.stringify(merged.linked_resources), merged.current_running ? 1 : 0, merged.auto_status_prompted ? 1 : 0, merged.auto_status_update_enabled ? 1 : 0, merged.completed_at ?? null, merged.updated_at, id]
      )
    } catch (error) {
      set({ games: previousGames, selectedGame: previousSelected, lastError: error instanceof Error ? error.message : '保存失败' })
      throw error
    }
  },

  deleteGame: async (id: string) => {
    const previousGames = get().games
    const previousSessions = get().sessions
    const previousSelected = get().selectedGame
    const games = previousGames.filter(g => g.id !== id)
    const sessions = previousSessions.filter(session => session.game_id !== id)
    set({
      games,
      sessions,
      sessionSummaries: buildSessionSummaryMap(sessions),
      selectedGame: previousSelected?.id === id ? null : previousSelected,
      lastError: null,
    })
    try {
      await execute('DELETE FROM games WHERE id = ?', [id])
    } catch (error) {
      set({
        games: previousGames,
        sessions: previousSessions,
        sessionSummaries: buildSessionSummaryMap(previousSessions),
        selectedGame: previousSelected,
        lastError: error instanceof Error ? error.message : '删除失败',
      })
      throw error
    }
  },

  addManualSession: async (gameId, startedAt, durationSeconds) => {
    const id = `manual_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
    const safeDuration = Math.max(60, Math.floor(durationSeconds))
    const session: PlaySession = {
      id,
      game_id: gameId,
      process_name: 'manual',
      exe_path: null,
      started_at: startedAt,
      ended_at: startedAt + safeDuration * 1000,
      duration_seconds: safeDuration,
      end_reason: 'user_stop',
    }
    const previousSessions = get().sessions
    const sessions = [session, ...previousSessions]
    set({ sessions, sessionSummaries: buildSessionSummaryMap(sessions), lastError: null })
    try {
      await addManualPlaySession(gameId, startedAt, safeDuration, id)
      await get().load()
    } catch (error) {
      set({
        sessions: previousSessions,
        sessionSummaries: buildSessionSummaryMap(previousSessions),
        lastError: error instanceof Error ? error.message : '添加游玩记录失败',
      })
      throw error
    }
  },

  deleteSession: async (sessionId) => {
    const previousSessions = get().sessions
    const sessions = previousSessions.filter(session => session.id !== sessionId)
    set({ sessions, sessionSummaries: buildSessionSummaryMap(sessions), lastError: null })
    try {
      await deletePlaySession(sessionId)
    } catch (error) {
      set({
        sessions: previousSessions,
        sessionSummaries: buildSessionSummaryMap(previousSessions),
        lastError: error instanceof Error ? error.message : '删除游玩记录失败',
      })
      throw error
    }
  },

  setSelectedGame: (game) => set({ selectedGame: game }),
  setFilterStatus: (status) => set({ filterStatus: status }),
  setViewMode: (mode) => set({ viewMode: mode }),
  setSortMode: (mode) => set({ sortMode: mode }),
  setSearchQuery: (query) => set({ searchQuery: query }),
  clearError: () => set({ lastError: null }),

  libraryGames: () => {
    const { games, sessionSummaries, sortMode } = get()
    return sortLibraryGames(enrichGames(games, sessionSummaries), sortMode)
  },

  filteredGames: () => {
    const { filterStatus, searchQuery } = get()
    return get().libraryGames().filter((game) => {
      const matchesStatus = filterStatus === 'all' || game.status === filterStatus
      const matchesSearch = !searchQuery ||
        game.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (game.name_cn && game.name_cn.includes(searchQuery))
      return matchesStatus && matchesSearch
    })
  },
}))
