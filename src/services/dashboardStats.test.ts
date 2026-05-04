import assert from 'node:assert/strict'
import test from 'node:test'
import { buildDashboardStats } from './dashboardStats.js'
import type { PlaySession } from '../types/index.js'
import type { LibraryGame } from './libraryStats.js'

const day = 24 * 60 * 60 * 1000
const now = new Date(2026, 4, 15, 12, 0, 0).getTime()

function game(overrides: Partial<LibraryGame>): LibraryGame {
  return {
    id: 'game',
    name: 'Game',
    name_cn: null,
    cover_url: '',
    air_date: null,
    platform: [],
    status: 'wish',
    rating: null,
    review: null,
    routes: [],
    tags: [],
    linked_resources: [],
    current_running: false,
    auto_status_prompted: false,
    auto_status_update_enabled: false,
    completed_at: null,
    created_at: now,
    updated_at: now,
    total_seconds: 0,
    session_count: 0,
    last_played_at: null,
    running_seconds: 0,
    route_progress: { completed: 0, total: 0, percent: 0 },
    ...overrides,
  }
}

test('buildDashboardStats calculates top metrics', () => {
  const stats = buildDashboardStats([
    game({ id: 'a', status: 'completed', rating: 8, total_seconds: 3600, completed_at: now - day }),
    game({ id: 'b', status: 'completed', rating: 9, total_seconds: 1800, completed_at: new Date(2026, 3, 30).getTime() }),
    game({ id: 'c', status: 'playing', rating: null, total_seconds: 600 }),
  ], [], now)

  assert.equal(stats.metrics.totalGames, 3)
  assert.equal(stats.metrics.totalPlaySeconds, 6000)
  assert.equal(stats.metrics.completionRate, 67)
  assert.equal(stats.metrics.averageRating, 8.5)
  assert.equal(stats.metrics.completedThisMonth, 1)
})

test('buildDashboardStats returns null percentages and averages for empty game data', () => {
  const stats = buildDashboardStats([], [], now)

  assert.equal(stats.metrics.totalGames, 0)
  assert.equal(stats.metrics.completionRate, null)
  assert.equal(stats.metrics.averageRating, null)
  assert.equal(stats.metrics.completedThisMonth, 0)
})

test('buildDashboardStats aggregates last 30 days sessions including running sessions', () => {
  const sessions: PlaySession[] = [
    {
      id: 'done',
      game_id: 'a',
      process_name: 'a.exe',
      exe_path: null,
      started_at: now - day,
      ended_at: now - day + 1000,
      duration_seconds: 120,
      end_reason: 'process_exit',
    },
    {
      id: 'running',
      game_id: 'a',
      process_name: 'a.exe',
      exe_path: null,
      started_at: now - 2000,
      ended_at: null,
      duration_seconds: null,
      end_reason: null,
    },
    {
      id: 'old',
      game_id: 'a',
      process_name: 'a.exe',
      exe_path: null,
      started_at: now - 35 * day,
      ended_at: now - 35 * day + 1000,
      duration_seconds: 999,
      end_reason: 'process_exit',
    },
  ]

  const stats = buildDashboardStats([], sessions, now)
  const yesterday = stats.trend[stats.trend.length - 2]
  const today = stats.trend[stats.trend.length - 1]

  assert.equal(stats.trend.length, 30)
  assert.equal(yesterday?.seconds, 120)
  assert.equal(today?.seconds, 2)
})

test('buildDashboardStats builds status and platform distributions with top 6 plus other', () => {
  const stats = buildDashboardStats([
    game({ id: 'wish', status: 'wish', platform: ['PC'] }),
    game({ id: 'playing', status: 'playing', platform: ['Steam'] }),
    game({ id: 'completed', status: 'completed', platform: ['Switch'] }),
    game({ id: 'paused', status: 'paused', platform: ['PS5'] }),
    game({ id: 'p5', platform: ['PS4'] }),
    game({ id: 'p6', platform: ['Vita'] }),
    game({ id: 'p7', platform: ['PSP'] }),
    game({ id: 'blank', platform: [] }),
  ], [], now)

  assert.deepEqual(stats.statusDistribution.map(item => [item.key, item.count]), [
    ['wish', 5],
    ['playing', 1],
    ['completed', 1],
    ['paused', 1],
  ])
  assert.equal(stats.platformDistribution.length, 7)
  assert.equal(stats.platformDistribution[stats.platformDistribution.length - 1]?.label, '其他')
  assert.equal(stats.platformDistribution.reduce((sum, item) => sum + item.count, 0), 8)
})

test('buildDashboardStats builds rating distribution and rating top sorted by updated_at tie breaker', () => {
  const stats = buildDashboardStats([
    game({ id: 'old-nine', name: 'Old', rating: 9, updated_at: 1 }),
    game({ id: 'new-nine', name: 'New', rating: 9, updated_at: 2 }),
    game({ id: 'eight', name: 'Eight', rating: 8, updated_at: 3 }),
    game({ id: 'empty', name: 'Empty', rating: null }),
  ], [], now)

  assert.equal(stats.ratingDistribution[8].count, 2)
  assert.equal(stats.ratingDistribution[8].percent, 67)
  assert.deepEqual(stats.rankings.ratingTop.map(item => item.id), ['new-nine', 'old-nine', 'eight'])
})

test('buildDashboardStats builds playtime and recent played rankings', () => {
  const stats = buildDashboardStats([
    game({ id: 'short', total_seconds: 60, last_played_at: now - 1000 }),
    game({ id: 'long', total_seconds: 3600, last_played_at: now - 500 }),
    game({ id: 'zero', total_seconds: 0, last_played_at: null }),
  ], [], now)

  assert.deepEqual(stats.rankings.playtimeTop.map(item => item.id), ['long', 'short'])
  assert.deepEqual(stats.rankings.recentPlayed.map(item => item.id), ['long', 'short'])
})

test('buildDashboardStats returns action item groups for games needing metadata', () => {
  const stats = buildDashboardStats([
    game({ id: 'clean', rating: 8, tags: ['tag'], status: 'playing' }),
    game({ id: 'needs', rating: null, tags: [], status: 'completed', review: '', completed_at: null }),
  ], [], now)

  assert.equal(stats.actionItems.length, 1)
  assert.equal(stats.actionItems[0].game.id, 'needs')
  assert.deepEqual(stats.actionItems[0].actions.map(action => action.key), ['rating', 'tags', 'review'])
})
