import { create } from 'zustand'
import { Game, GameStatus } from '../types'
import { loadGames, saveGames } from '../services/database'

interface GameStore {
  games: Game[]
  selectedGame: Game | null
  filterStatus: GameStatus | 'all'
  viewMode: 'card' | 'list'
  searchQuery: string

  load: () => void
  addGame: (game: Game) => void
  updateGame: (id: string, updates: Partial<Game>) => void
  deleteGame: (id: string) => void
  setSelectedGame: (game: Game | null) => void
  setFilterStatus: (status: GameStatus | 'all') => void
  setViewMode: (mode: 'card' | 'list') => void
  setSearchQuery: (query: string) => void
  filteredGames: () => Game[]
}

export const useGameStore = create<GameStore>((set, get) => ({
  games: [],
  selectedGame: null,
  filterStatus: 'all',
  viewMode: 'card',
  searchQuery: '',

  load: async () => {
    const games = await loadGames()
    set({ games })
  },

  addGame: (game: Game) => {
    const games = [...get().games, game]
    saveGames(games)
    set({ games })
  },

  updateGame: (id: string, updates: Partial<Game>) => {
    const games = get().games.map((g) =>
      g.id === id ? { ...g, ...updates, updated_at: Date.now() } : g
    )
    saveGames(games)
    set({ games })
  },

  deleteGame: (id: string) => {
    const games = get().games.filter((g) => g.id !== id)
    saveGames(games)
    set({ games })
  },

  setSelectedGame: (game) => set({ selectedGame: game }),
  setFilterStatus: (status) => set({ filterStatus: status }),
  setViewMode: (mode) => set({ viewMode: mode }),
  setSearchQuery: (query) => set({ searchQuery: query }),

  filteredGames: () => {
    const { games, filterStatus, searchQuery } = get()
    return games.filter((game) => {
      const matchesStatus = filterStatus === 'all' || game.status === filterStatus
      const matchesSearch = !searchQuery ||
        game.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (game.name_cn && game.name_cn.includes(searchQuery))
      return matchesStatus && matchesSearch
    })
  },
}))