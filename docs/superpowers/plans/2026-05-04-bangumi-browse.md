# Bangumi Browse Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a stable Bangumi game browsing view for searching, filtering, paging, viewing details, and adding games to the local library.

**Architecture:** Keep Bangumi API concerns in `src/services/bangumiMeta.ts`, local conversion helpers in a small service module, and UI state in focused Browse components. Browse should keep previous results during transitions and use explicit request state to avoid stale responses.

**Tech Stack:** React 18, TypeScript, Zustand, Vite, Tailwind CSS, Bangumi v0 API.

---

### Task 1: Service Tests And Conversion Helper

**Files:**
- Modify: `src/services/bangumiMeta.test.ts`
- Create: `src/services/bangumiGame.ts`
- Create: `src/services/bangumiGame.test.ts`
- Modify: `package.json`

- [ ] Add tests for default game search body, query pagination, and conversion from Bangumi data to local `Game`.
- [ ] Implement `createGameFromBangumiSubject` and `createGameFromBangumiMeta` with one responsibility: produce a valid local `Game`.
- [ ] Add `bangumiGame.test.js` to the test script.

### Task 2: API Request Shape

**Files:**
- Modify: `src/services/bangumiMeta.ts`
- Modify: `src/services/bangumiMeta.test.ts`

- [ ] Make `buildSubjectSearchBody` trim tags, clamp `limit` to 1-50, and keep `offset >= 0`.
- [ ] Send `limit` and `offset` as query parameters for `/v0/search/subjects`, matching the public API documentation.
- [ ] Default blank browse keywords to `galgame`.

### Task 3: Browse State Refactor

**Files:**
- Modify: `src/components/BrowseView.tsx`
- Modify: `src/types/index.ts`

- [ ] Add an explicit browse keyword to `BrowseFilterState`.
- [ ] Replace ad hoc retry logic with one `runSearch` function that builds stable options.
- [ ] Track `requestId` to ignore stale responses.
- [ ] Keep previous results during page transitions and clear details when filters change.

### Task 4: Filter Bar UX

**Files:**
- Modify: `src/components/BrowseFilterBar.tsx`

- [ ] Add a keyword input scoped to Browse.
- [ ] Add reset button and make category presets update keyword/tags/sort coherently.
- [ ] Keep controls compact and responsive.

### Task 5: Cards And Detail Panel

**Files:**
- Modify: `src/components/BrowseGameCard.tsx`
- Modify: `src/components/BrowseDetailPanel.tsx`
- Modify: `src/components/BangumiPanel.tsx`

- [ ] Use the shared Bangumi-to-Game helper everywhere Browse/Search-like additions need a local `Game`.
- [ ] Improve no-cover, score/rank, and in-library states.
- [ ] Keep detail panel readable on small screens.

### Task 6: Styling And Verification

**Files:**
- Modify: `src/index.css`

- [ ] Update Browse layout CSS for stable grid dimensions, compact toolbar, sticky pagination, and non-overlapping detail content.
- [ ] Run `npm run build`.
- [ ] Run targeted TypeScript tests for Bangumi services.
- [ ] Run `npm test` and report any remaining unrelated failures.
