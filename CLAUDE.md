# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # Vite dev server on port 1420
npm run build    # TypeScript check + Vite production build
npm run tauri    # Tauri CLI (dev/build)
```

No test suite exists yet.

## Architecture

- **Frontend**: React 18 + TypeScript + Vite + Tailwind CSS 3
- **Desktop shell**: Tauri 2.x (Rust backend, `src-tauri/`)
- **State management**: Zustand store in `src/store/gameStore.ts`
- **Database**: SQL.js (WASM SQLite) via `src/services/database.ts`. Future migration: Tauri SQL plugin.
- **API**: Bangumi (bgm.tv) — `src/services/bangumiApi.ts`. Search uses `POST /v0/search/subjects`. Optional Bearer token for rate limits.

## Key patterns

- **CSS variables**: Theme system via `src/styles/themes.css` — defines `--bg-primary`, `--bg-secondary`, `--text-primary`, `--text-secondary`, `--accent`, `--border`, etc. Light/dark variants in `.dark` class.
- **Theme context**: `src/context/ThemeContext.tsx` manages `light | dark | system` mode, persisted to localStorage.
- **Game data flow**: Bangumi search → add to local SQLite → edit metadata locally. Export/Import uses JSON.
- **GameDetail tabs**: `info | sessions | routes | resources | processes` — each tab renders inline in the component.
- **CSP**: The Tauri `tauri.conf.json` has a strict Content Security Policy. If adding external resources (fonts, images, styles), update the CSP.

## Important files

| File | Purpose |
|------|---------|
| `src/store/gameStore.ts` | Central state: games list, filter, search, CRUD actions |
| `src/services/database.ts` | SQL.js init, CRUD for games/persistence |
| `src/services/bangumiApi.ts` | Bangumi API search |
| `src/services/processService.ts` | Process monitoring config CRUD |
| `src/types/index.ts` | All TypeScript interfaces |
| `src/App.tsx` | Root layout: Sidebar + Header + GameList + GameDetail panel |
| `src-tauri/tauri.conf.json` | Tauri window config, CSP, build settings |
| `SPEC.md` | Full project specification |
