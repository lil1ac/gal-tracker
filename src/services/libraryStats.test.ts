import assert from 'node:assert/strict'
import test from 'node:test'
import { buildSessionSummaryMap, enrichGames, formatDuration, getGameActionItems, getRouteProgress, sortLibraryGames } from './libraryStats.js'
import type { Game, PlaySession, Route } from '../types/index.js'

test('buildSessionSummaryMap totals completed sessions and keeps latest session', () => {
  const sessions: PlaySession[] = [
    { id: 's1', game_id: 'g1', process_name: 'a.exe', exe_path: null, started_at: 1000, ended_at: 4000, duration_seconds: 3, end_reason: 'process_exit' },
    { id: 's2', game_id: 'g1', process_name: 'a.exe', exe_path: null, started_at: 8000, ended_at: 10000, duration_seconds: 2, end_reason: 'process_exit' },
    { id: 's3', game_id: 'g2', process_name: 'b.exe', exe_path: null, started_at: 5000, ended_at: null, duration_seconds: null, end_reason: null },
  ]

  const summaries = buildSessionSummaryMap(sessions, 11000)

  assert.equal(summaries.g1.total_seconds, 5)
  assert.equal(summaries.g1.session_count, 2)
  assert.equal(summaries.g1.last_played_at, 8000)
  assert.equal(summaries.g1.running_seconds, 0)
  assert.equal(summaries.g2.total_seconds, 6)
  assert.equal(summaries.g2.session_count, 1)
  assert.equal(summaries.g2.running_seconds, 6)
})

test('formatDuration renders compact Chinese durations', () => {
  assert.equal(formatDuration(0), '-')
  assert.equal(formatDuration(59), '1分钟')
  assert.equal(formatDuration(3600 + 120), '1小时2分钟')
})

test('getRouteProgress counts completed routes', () => {
  const routes: Route[] = [
    { id: 'r1', name: 'A', choices: [], completed_at: 100 },
    { id: 'r2', name: 'B', choices: [], completed_at: null },
  ]

  assert.deepEqual(getRouteProgress(routes), { completed: 1, total: 2, percent: 50 })
})

test('enrichGames attaches session and route summaries', () => {
  const games: Game[] = [
    {
      id: 'g1',
      name: 'Game A',
      name_cn: null,
      cover_url: '',
      air_date: null,
      platform: [],
      status: 'playing',
      rating: 8,
      review: null,
      routes: [{ id: 'r1', name: 'A', choices: [], completed_at: 1 }],
      tags: [],
      linked_resources: [],
      current_running: false,
      auto_status_prompted: false,
      auto_status_update_enabled: false,
      completed_at: null,
      created_at: 1,
      updated_at: 2,
    },
  ]

  const enriched = enrichGames(games, {
    g1: { game_id: 'g1', total_seconds: 3600, session_count: 2, last_played_at: 100, running_seconds: 0 },
  })

  assert.equal(enriched[0].total_seconds, 3600)
  assert.equal(enriched[0].session_count, 2)
  assert.equal(enriched[0].route_progress.percent, 100)
})

test('sortLibraryGames sorts by playtime descending', () => {
  const base = {
    name_cn: null,
    cover_url: '',
    air_date: null,
    platform: [],
    status: 'wish' as const,
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
    session_count: 0,
    last_played_at: null,
    running_seconds: 0,
    route_progress: { completed: 0, total: 0, percent: 0 },
  }

  const sorted = sortLibraryGames([
    { ...base, id: 'short', name: 'Short', total_seconds: 60 },
    { ...base, id: 'long', name: 'Long', total_seconds: 3600 },
  ], 'playtime_desc')

  assert.equal(sorted[0].id, 'long')
})

test('sortLibraryGames sorts completed games by completion date descending', () => {
  const base = {
    name_cn: null,
    cover_url: '',
    air_date: null,
    platform: [],
    status: 'completed' as const,
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

  const sorted = sortLibraryGames([
    { ...base, id: 'older', name: 'Older', completed_at: 1000 },
    { ...base, id: 'newer', name: 'Newer', completed_at: 2000 },
  ], 'completed_desc')

  assert.equal(sorted[0].id, 'newer')
})

test('getGameActionItems asks for completion date only when completed game misses it', () => {
  const baseGame: Game = {
    id: 'g1',
    name: 'Game A',
    name_cn: null,
    cover_url: '',
    air_date: null,
    platform: [],
    status: 'completed',
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
    updated_at: 2,
  }

  assert.deepEqual(
    getGameActionItems(baseGame).map(item => item.key),
    ['rating', 'tags', 'review', 'completed_at']
  )

  assert.deepEqual(
    getGameActionItems({ ...baseGame, status: 'playing', completed_at: null }).map(item => item.key),
    ['rating', 'tags']
  )
})
