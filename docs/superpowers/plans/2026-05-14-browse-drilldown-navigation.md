# Browse Drilldown Navigation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace nested browse overlays with a right-pane drilldown navigation stack that keeps the app sidebar persistent.

**Architecture:** `BrowseView` owns a stack of detail routes: subject detail and entity detail. Detail components render as main-content pages, not viewport overlays, and route-opening callbacks push onto the stack while Back pops one level.

**Tech Stack:** React 18, TypeScript, Vite, Tailwind component classes, Node assertion tests.

---

### Task 1: Route Stack Regression Coverage

**Files:**
- Create: `src/components/browseNavigation.test.ts`
- Modify: `tsconfig.test.json`
- Modify: `package.json`

- [ ] Add pure route-stack helpers in the test file first: a local `pushRoute` and `popRoute` test shape matching the intended BrowseView behavior.
- [ ] Add assertions for `subject -> entity -> subject`, one-step back, and reset-to-results.
- [ ] Run `npm test` and confirm the new test fails until the production route helpers exist.

### Task 2: BrowseView Route Stack

**Files:**
- Modify: `src/components/BrowseView.tsx`

- [ ] Replace `selectedSnapshot` with `routeStack`.
- [ ] Add route handlers: `openSubject`, `openEntity`, `goBack`, and `closeDetail`.
- [ ] Render list controls only when the stack is empty.
- [ ] Render the top route as either `BrowseDetailPanel` or `BangumiEntityDetailPanel`.
- [ ] Keep search/filter changes resetting the route stack.

### Task 3: Convert Detail Components To Pages

**Files:**
- Modify: `src/components/BrowseDetailPanel.tsx`
- Modify: `src/components/BangumiEntityDetailPanel.tsx`
- Modify: `src/index.css`

- [ ] Remove outer overlay click-to-close wrappers.
- [ ] Keep a sticky detail header with Back and Bangumi actions.
- [ ] Convert nested subject/entity clicks into route callback calls.
- [ ] Replace overlay CSS with page-shell CSS scoped to the right content area.

### Task 4: Verify

**Files:**
- Modify if needed: `src/components/browseOverlayLayout.test.ts`

- [ ] Update the overlay layout regression so it asserts no browse detail class uses full-screen overlay positioning.
- [ ] Run `npm test`.
- [ ] Start Vite and browser-test: browse list -> game detail -> character detail -> related game detail -> back.
