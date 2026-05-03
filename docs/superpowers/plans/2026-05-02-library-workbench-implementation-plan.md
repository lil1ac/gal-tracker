# GAL Tracker Library Workbench Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the approved library workbench by fixing persistence, exposing real playtime data, enriching the library/detail UI, and completing local backup behavior.

**Architecture:** Keep the existing React + Zustand + SQLite shape, but move reusable data calculations into pure helpers so they can be tested. Database APIs will expose session summaries and full backup data while UI components consume enriched game view models.

**Tech Stack:** React 18, TypeScript, Vite, Zustand, SQL.js / Tauri SQL, Tauri 2, Node test runner through compiled TypeScript.

---

## File Structure

- `src/services/dbSchema.ts`: add missing `routes` column to base schema.
- `src/services/database.ts`: add idempotent migrations, session queries, backup export/import, and safer JSON parsing.
- `src/services/libraryStats.ts`: new pure helper module for session totals, route progress, filtering, sorting, and dashboard stats.
- `src/services/libraryStats.test.ts`: new tests for pure helper behavior.
- `src/types/index.ts`: add session summary, enriched library item, backup, and sort types.
- `src/store/gameStore.ts`: store session summaries and sort mode; expose enriched filtered games and reload session summaries.
- `src/components/Sidebar.tsx`: add dashboard navigation and better statistics.
- `src/components/GameList.tsx`: render dashboard mode, sort controls, and enriched list/card data.
- `src/components/GameCard.tsx`: show real playtime, route progress, and running state.
- `src/components/GameRow.tsx`: show real playtime and recent play date instead of hardcoded zero.
- `src/components/GameDetail.tsx`: load and display session history; allow manual session add/delete; keep tabs focused.
- `src/components/SearchModal.tsx`: add user-visible search errors and duplicate handling.
- `src/components/Settings.tsx`: export/import complete backups.
- `package.json` and `tsconfig.test.json`: add a minimal test command without changing the app build path.

## Task 1: Add Test Harness and Library Stats Helpers

**Files:**
- Create: `src/services/libraryStats.ts`
- Create: `src/services/libraryStats.test.ts`
- Create: `tsconfig.test.json`
- Modify: `package.json`

- [ ] **Step 1: Write failing tests for summary calculations**

Create `src/services/libraryStats.test.ts`:

```ts
import assert from 'node:assert/strict'
import test from 'node:test'
import { buildSessionSummaryMap, formatDuration, getRouteProgress } from './libraryStats.js'
import type { PlaySession, Route } from '../types/index.js'

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
```

- [ ] **Step 2: Add test TypeScript config and npm script**

Create `tsconfig.test.json`:

```json
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "outDir": ".tmp-tests",
    "rootDir": "src",
    "types": ["node"],
    "noEmit": false
  },
  "include": ["src/**/*.test.ts", "src/services/libraryStats.ts", "src/types/**/*.ts"]
}
```

Modify `package.json` scripts and dev dependencies:

```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "tauri": "tauri",
    "test": "tsc -p tsconfig.test.json && node --test .tmp-tests/**/*.test.js"
  },
  "devDependencies": {
    "@types/node": "^22.0.0"
  }
}
```

- [ ] **Step 3: Run test and verify it fails because helper is missing**

Run: `npm test`

Expected: FAIL with an error that `src/services/libraryStats.ts` or its exports are missing.

- [ ] **Step 4: Implement minimal helper module**

Create `src/services/libraryStats.ts`:

```ts
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

export type GameSortMode = 'updated_desc' | 'title_asc' | 'playtime_desc' | 'last_played_desc' | 'rating_desc'

export interface LibraryGame extends Game {
  total_seconds: number
  session_count: number
  last_played_at: number | null
  running_seconds: number
  route_progress: RouteProgress
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
```

- [ ] **Step 5: Run test and verify it passes**

Run: `npm test`

Expected: PASS.

## Task 2: Fix Database Schema and Add Session APIs

**Files:**
- Modify: `src/types/index.ts`
- Modify: `src/services/database.ts`
- Modify: `src/services/dbSchema.ts`

- [ ] **Step 1: Extend types**

Add to `src/types/index.ts`:

```ts
export interface BackupData {
  version: number
  exported_at: number
  games: Game[]
  play_sessions: PlaySession[]
  game_processes: GameProcess[]
  settings: Record<string, string>
}
```

- [ ] **Step 2: Add routes column to base schema**

In `src/services/dbSchema.ts`, add `routes TEXT DEFAULT '[]',` after `review TEXT,`.

- [ ] **Step 3: Add idempotent migrations and session serializers**

In `src/services/database.ts`, add:

```ts
async function columnExists(table: string, column: string): Promise<boolean> {
  const rows = await selectRaw<{ name: string }>(`PRAGMA table_info(${table})`)
  return rows.some(row => row.name === column)
}

async function runMigrations(): Promise<void> {
  if (!(await columnExists('games', 'routes'))) {
    await executeRaw(`ALTER TABLE games ADD COLUMN routes TEXT DEFAULT '[]'`)
  }
}
```

Call `await runMigrations()` immediately after `await executeRaw(CREATE_TABLES_SQL);`.

Add row interfaces and functions:

```ts
interface DbSessionRow {
  id: string
  game_id: string
  process_name: string
  exe_path: string | null
  started_at: number
  ended_at: number | null
  duration_seconds: number | null
  end_reason: PlaySession['end_reason']
}

export async function loadPlaySessions(gameId?: string): Promise<PlaySession[]> {
  const sql = gameId
    ? 'SELECT * FROM play_sessions WHERE game_id = ? ORDER BY started_at DESC'
    : 'SELECT * FROM play_sessions ORDER BY started_at DESC'
  const rows = await selectRaw<DbSessionRow>(sql, gameId ? [gameId] : [])
  return rows
}
```

- [ ] **Step 4: Replace export/import with full backup shape**

Update `exportData()` to return `BackupData` JSON with games, sessions, process configs, and settings excluding `bgm_api_key`.

Update `importData(jsonStr)` so it accepts both old `Game[]` backups and new `BackupData`, inserts games first, then sessions and process configs.

- [ ] **Step 5: Run verification**

Run: `npm run build`

Expected: PASS.

## Task 3: Enrich Store with Session Summaries and Sorting

**Files:**
- Modify: `src/store/gameStore.ts`
- Modify: `src/services/libraryStats.ts`
- Test: `src/services/libraryStats.test.ts`

- [ ] **Step 1: Add tests for enrich and sorting behavior**

Append tests that assert `enrichGames()` adds total seconds and `sortLibraryGames()` orders by playtime descending.

- [ ] **Step 2: Verify test fails**

Run: `npm test`

Expected: FAIL because `enrichGames` and `sortLibraryGames` do not exist.

- [ ] **Step 3: Implement pure functions**

Add to `src/services/libraryStats.ts`:

```ts
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

export function sortLibraryGames(games: LibraryGame[], mode: GameSortMode): LibraryGame[] {
  return [...games].sort((a, b) => {
    if (mode === 'title_asc') return (a.name_cn || a.name).localeCompare(b.name_cn || b.name, 'zh-Hans-CN')
    if (mode === 'playtime_desc') return b.total_seconds - a.total_seconds
    if (mode === 'last_played_desc') return (b.last_played_at ?? 0) - (a.last_played_at ?? 0)
    if (mode === 'rating_desc') return (b.rating ?? 0) - (a.rating ?? 0)
    return b.updated_at - a.updated_at
  })
}
```

- [ ] **Step 4: Update Zustand store**

Add `sessions`, `sessionSummaries`, `sortMode`, `setSortMode`, `libraryGames`, and make `load()` load games and sessions in parallel, then build summaries.

- [ ] **Step 5: Run tests and build**

Run: `npm test`

Expected: PASS.

Run: `npm run build`

Expected: PASS.

## Task 4: Build Dashboard and Enriched Library Views

**Files:**
- Modify: `src/components/Sidebar.tsx`
- Modify: `src/components/GameList.tsx`
- Modify: `src/components/GameCard.tsx`
- Modify: `src/components/GameRow.tsx`
- Modify: `src/App.tsx`

- [ ] **Step 1: Add dashboard navigation state**

Use existing store `filterStatus`; introduce `activeView: 'dashboard' | 'library'` locally in `AppContent` or in store. Dashboard click clears selected game.

- [ ] **Step 2: Add dashboard component inside `GameList`**

Render collection counts, total playtime, recently played games, active games, and games with no tags/rating/routes.

- [ ] **Step 3: Add sort control to header**

Expose sort modes: 最近更新、标题、游玩时长、最近游玩、评分.

- [ ] **Step 4: Update card/row props**

Change `GameCard` and `GameRow` to accept `LibraryGame` and render:

- total playtime via `formatDuration`.
- route progress when routes exist.
- running dot when `current_running` is true.
- latest played date when available.

- [ ] **Step 5: Verify build**

Run: `npm run build`

Expected: PASS.

## Task 5: Complete Detail Session History and Manual Sessions

**Files:**
- Modify: `src/components/GameDetail.tsx`
- Modify: `src/services/database.ts`
- Modify: `src/store/gameStore.ts`

- [ ] **Step 1: Add database helpers**

Add:

```ts
export async function addManualPlaySession(gameId: string, startedAt: number, durationSeconds: number): Promise<void>
export async function deletePlaySession(sessionId: string): Promise<void>
```

Manual sessions use `process_name = 'manual'`, `exe_path = null`, `ended_at = startedAt + durationSeconds * 1000`, `end_reason = 'user_stop'`.

- [ ] **Step 2: Update store with session mutations**

Expose `addManualSession(gameId, startedAt, durationSeconds)` and `deleteSession(sessionId)`, both followed by `load()`.

- [ ] **Step 3: Replace placeholder sessions tab**

Show a table/list of sessions with date, duration, process name, end reason. Add a compact form for manual duration in minutes and start date.

- [ ] **Step 4: Verify build**

Run: `npm run build`

Expected: PASS.

## Task 6: Finish Search, Backup, and Process Config Safety

**Files:**
- Modify: `src/components/SearchModal.tsx`
- Modify: `src/components/Settings.tsx`
- Modify: `src/components/ProcessConfig.tsx`
- Modify: `src/services/processService.ts`
- Modify: `src-tauri/src/commands.rs`
- Modify: `src-tauri/src/process_monitor.rs`

- [ ] **Step 1: Add search error and duplicate handling**

If Bangumi search fails, show `搜索失败，请稍后重试或检查 API Key`. If a game already exists, show disabled row text `已在库中`.

- [ ] **Step 2: Use complete backup in settings**

Update import success text to show games, sessions, and process configs count when importing new backup format.

- [ ] **Step 3: Make process config backend use config id**

Change `ProcessConfig` in Rust to include `id`. Save/delete commands accept `id`, and monitor state maps by `id` instead of `process_name`. Events include `config_id`.

- [ ] **Step 4: Update frontend process sync**

Pass config id in `saveProcessConfig`; delete process config by id; keep display labels unchanged.

- [ ] **Step 5: Verify frontend and Rust build**

Run: `npm run build`

Expected: PASS.

Run: `npm run tauri -- build`

Expected: PASS, or document if local Rust/Tauri packaging prerequisites fail.

## Self-Review

- Spec coverage: dashboard, enriched library, sessions, routes schema, full backup, process config safety, search errors, and scoped launcher exclusions are covered.
- Placeholder scan: no task uses `TBD`, vague "handle later", or unexplained implementation-only instructions.
- Type consistency: session summary names match `SessionSummary`; enriched games use `LibraryGame`; backup shape uses `BackupData`; sort modes use `GameSortMode`.
