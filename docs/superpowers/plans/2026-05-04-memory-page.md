# Memory Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a standalone “回忆” page that lets users review what they played on specific dates through a calendar and day detail view.

**Architecture:** Add a pure service module that turns local games and play sessions into year/month/day memory data, then render it through a new React page. Wire the page into the existing `activeView` flow and sidebar without changing database schema.

**Tech Stack:** React 18, TypeScript, Zustand, Vite, Tailwind CSS.

---

### Task 1: Memory Data Service

**Files:**
- Create: `src/services/memoryStats.ts`
- Create: `src/services/memoryStats.test.ts`
- Modify: `package.json`
- Modify: `tsconfig.test.json`

- [ ] Build pure functions for local date keys, yearly summaries, monthly calendar cells, and selected-day entries.
- [ ] Test aggregation by day, game, duration, and selected year.

### Task 2: Memory Page Component

**Files:**
- Create: `src/components/MemoryView.tsx`
- Modify: `src/index.css`

- [ ] Render year/month controls, yearly summary metrics, month calendar, and selected day detail.
- [ ] Keep layout dense and readable, with stable calendar cells and no nested cards.

### Task 3: Navigation Wiring

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/components/Sidebar.tsx`
- Modify: `src/components/GameList.tsx`

- [ ] Extend `activeView` with `memory`.
- [ ] Add a sidebar entry named `回忆`.
- [ ] Route `memory` to `MemoryView`.

### Task 4: Verification

**Files:**
- Existing touched files only.

- [ ] Run `npm run build`.
- [ ] Run `npm test`.
