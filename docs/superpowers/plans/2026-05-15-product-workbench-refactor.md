# Product Workbench Refactor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the current GAL Tracker app into a stable product-workbench experience with shared layout patterns, readable Chinese UI, and lower-cost data/backend operations.

**Architecture:** Keep the existing React + Zustand + SQL.js/Tauri stack and the persistent left navigation. Make the first pass narrow: preserve existing page routes, extract reusable derived data, repair user-facing text, and optimize batch/database/process-monitor logic without changing storage shape.

**Tech Stack:** React 18, TypeScript, Vite, Tailwind CSS, Zustand, SQL.js, Tauri 2.x, Rust `sysinfo`.

---

## File Structure

- Modify `src/services/libraryStats.ts`: add tested helpers for filtering sorted library games without recomputing search normalization repeatedly.
- Modify `src/services/libraryStats.test.ts`: cover case-insensitive search and status filtering through the shared helper.
- Modify `src/store/gameStore.ts`: use the helper from the store getter so dashboard/library/memory share one derivation path.
- Modify `src/services/database.ts`: batch import writes inside one transaction and persist browser SQL.js only once.
- Modify `src-tauri/src/process_monitor.rs`: avoid `refresh_all()` in the polling loop and refresh only process data.
- Modify page components and `src/index.css`: repair garbled Chinese strings and tighten product-workbench page chrome while keeping existing navigation.

## Tasks

### Task 1: Shared Library Derivation

**Files:**
- Modify: `src/services/libraryStats.ts`
- Modify: `src/services/libraryStats.test.ts`
- Modify: `src/store/gameStore.ts`

- [ ] Add a failing test for `filterLibraryGames` combining status and search query.
- [ ] Run `npm test` and confirm the new test fails because the helper is missing.
- [ ] Implement `filterLibraryGames(games, status, query)` with lowercased query once per call.
- [ ] Update `gameStore.filteredGames()` to call the helper.
- [ ] Run `npm test`.

### Task 2: Database Batch Import

**Files:**
- Modify: `src/services/database.ts`

- [ ] Add transaction helpers that no-op safely through SQL.js and Tauri SQL.
- [ ] Wrap `importData` inserts in one transaction.
- [ ] Ensure `persistBrowserDb()` runs once after import, not after every row.
- [ ] Run `npm test` and `npm run build`.

### Task 3: Backend Process Polling

**Files:**
- Modify: `src-tauri/src/process_monitor.rs`

- [ ] Replace `sys.refresh_all()` in the monitor loop with process-only refresh supported by the current `sysinfo` version.
- [ ] Keep matching behavior unchanged.
- [ ] Run `npm test`; if Rust tests are available locally, run `cargo test` in `src-tauri`.

### Task 4: Product Workbench UI Cleanup

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/components/Dashboard.tsx`
- Modify: `src/components/GameList.tsx`
- Modify: `src/components/MemoryView.tsx`
- Modify: `src/components/GameDetailPage.tsx`
- Modify: `src/index.css`

- [ ] Repair garbled Chinese text in primary pages.
- [ ] Normalize empty/loading/error states to visible product UI instead of bare text.
- [ ] Keep the left sidebar persistent and page-owned scrolling intact.
- [ ] Run `npm test`, `npm run build`, then launch Vite and check dashboard/library/browse/detail/memory paths.
