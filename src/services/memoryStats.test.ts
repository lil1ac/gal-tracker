import assert from 'node:assert/strict'
import test from 'node:test'
import { buildMemoryStats, getSessionDurationSeconds, localDateKey } from './memoryStats.js'
import type { PlaySession } from '../types/index.js'
import type { LibraryGame } from './libraryStats.js'

const baseGame: LibraryGame = {
  id: 'g1',
  name: 'Game A',
  name_cn: '游戏 A',
  cover_url: '',
  air_date: null,
  platform: [],
  status: 'playing',
  rating: null,
  review: null,
  routes: [],
  tags: [],
  linked_resources: [],
  current_running: false,
  auto_status_prompted: false,
  auto_status_update_enabled: false,
  completed_at: null,
  created_at: 1,
  updated_at: 1,
  total_seconds: 0,
  session_count: 0,
  last_played_at: null,
  running_seconds: 0,
  route_progress: { completed: 0, total: 0, percent: 0 },
}

test('localDateKey formats local calendar dates', () => {
  assert.equal(localDateKey(new Date(2025, 7, 14, 22, 30).getTime()), '2025-08-14')
})

test('getSessionDurationSeconds handles running sessions', () => {
  const session: PlaySession = {
    id: 's1',
    game_id: 'g1',
    process_name: 'game.exe',
    exe_path: null,
    started_at: 1000,
    ended_at: null,
    duration_seconds: null,
    end_reason: null,
  }
  assert.equal(getSessionDurationSeconds(session, 61000), 60)
})

test('buildMemoryStats groups sessions by selected year and day', () => {
  const games: LibraryGame[] = [
    baseGame,
    { ...baseGame, id: 'g2', name: 'Game B', name_cn: '游戏 B' },
  ]
  const sessions: PlaySession[] = [
    {
      id: 's1',
      game_id: 'g1',
      process_name: 'a.exe',
      exe_path: null,
      started_at: new Date(2025, 7, 14, 20, 0).getTime(),
      ended_at: new Date(2025, 7, 14, 21, 0).getTime(),
      duration_seconds: 3600,
      end_reason: 'process_exit',
    },
    {
      id: 's2',
      game_id: 'g2',
      process_name: 'b.exe',
      exe_path: null,
      started_at: new Date(2025, 7, 14, 22, 0).getTime(),
      ended_at: new Date(2025, 7, 14, 22, 30).getTime(),
      duration_seconds: 1800,
      end_reason: 'process_exit',
    },
    {
      id: 's3',
      game_id: 'g1',
      process_name: 'a.exe',
      exe_path: null,
      started_at: new Date(2024, 0, 1, 12, 0).getTime(),
      ended_at: new Date(2024, 0, 1, 13, 0).getTime(),
      duration_seconds: 3600,
      end_reason: 'process_exit',
    },
  ]

  const stats = buildMemoryStats(games, sessions, 2025)
  const day = stats.daysByDate['2025-08-14']

  assert.deepEqual(stats.years, [2025, 2024])
  assert.equal(stats.summary.totalSeconds, 5400)
  assert.equal(stats.summary.activeDays, 1)
  assert.equal(stats.summary.gameCount, 2)
  assert.equal(stats.summary.topGame?.game.id, 'g1')
  assert.equal(day.entries.length, 2)
  assert.equal(day.entries[0].game.id, 'g1')
  assert.equal(stats.months[7].days[13].seconds, 5400)
})
