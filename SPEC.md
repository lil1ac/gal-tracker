# GAL Tracker - Specification

**Date:** 2026-05-02
**Project:** GAL Game Record Tool Desktop Application

---

## 1. Overview

A personal GAL game record tool with playtime tracking, library management, and review capabilities. Uses Bangumi API for game data and local localStorage for personal records. Target: desktop (Tauri + React), future mobile support.

---

## 2. Core Features

### 2.1 Game Library Management
- Game status: 想玩 / 在玩 / 已完成 / 搁置
- Add games via Bangumi search
- Display: cover image, title, status, playtime summary
- Views: Card grid (default) / List view, user-switchable

### 2.2 Play Time Tracking
- Multiple play sessions with timestamps
- Total playtime: auto-calculated from sessions
- Session history with add/delete

### 2.3 Game Details & Reviews
- Personal rating (1-10 scale)
- Short review text
- Route tracking: mark routes as completed
- Tags: personal labels (神作/雷作/etc.), genre tags
- Linked resources: 攻略链接, 截图路径

### 2.4 Search & Filter
- Search by game name
- Quick filter tabs: 全部 / 在玩 / 已完成 / 想玩 / 搁置

### 2.5 Data Management
- Import/Export: JSON format
- Local localStorage persistence
- Bangumi API integration for game metadata

---

## 3. UI/UX Design

### 3.1 Layout
- **Navigation**: Left sidebar with status tabs
- **Main area**: Game list (card/grid hybrid, switchable)
- **Detail panel**: Slide-out panel with tabs (信息/游玩/路线/资源)

### 3.2 Theme System
- Three themes: 深色 / 浅色 / 跟随系统
- User-toggleable via settings
- Stored in local preferences

### 3.3 Visual Style
- Clean, modern, content-focused
- Cover images as primary visual element
- Tabbed detail panel for organizing game data

---

## 4. Technical Architecture

### 4.1 Tech Stack
- **Frontend**: React 18 + TypeScript + Vite
- **Desktop**: Tauri 2.x
- **Database**: localStorage (WASM SQLite deferred)
- **API**: Bangumi API (bgm.tv/v0) with POST search

### 4.2 Data Model

```
Game {
  id: string (Bangumi subject ID)
  name: string
  name_cn: string | null
  cover_url: string
  air_date: string | null
  platform: string[]
  status: 'wish' | 'playing' | 'completed' | 'paused'
  rating: number | null (1-10)
  review: string | null
  routes: Route[]
  tags: string[]
  linked_resources: Resource[]
  sessions: PlaySession[]
  created_at: timestamp
  updated_at: timestamp
}

PlaySession {
  id: string
  start_time: timestamp
  end_time: timestamp | null
  duration_minutes: number
}

Route {
  id: string
  name: string
  choices: string[]
  completed_at: timestamp | null
}

Resource {
  id: string
  type: 'link' | 'screenshot'
  url: string
  description: string | null
}
```

---

## 5. Completed Features

- Game list with card/list view toggle
- Add game via Bangumi search
- Status management (wish/playing/completed/paused)
- Multiple playtime sessions with add/delete
- Rating and review
- Tags
- Route tracking (add routes, mark as completed)
- Resource linking (links, screenshots)
- Theme switching (dark/light/system)
- Local data persistence
- Import/Export JSON
- Bangumi API key configuration

---

## 6. API Integration

### Bangumi API (bgm.tv/v0)
- Search: `POST /v0/search/subjects` with JSON body `{keyword, type: 4, limit: 20}`
- Details: `GET /v0/subjects/{id}`
- Requires optional Bearer token for higher rate limits

### Data Flow
1. User searches → query Bangumi API (POST)
2. Select game → add to local storage
3. Local edits → save to localStorage
4. Export/Import → JSON files

---

## 7. Success Criteria

- User can add games from Bangumi
- User can track playtime (multiple sessions)
- User can mark routes as completed
- User can link resources (links, screenshots)
- User can rate and review games
- Data persists locally
- Theme switching works
- Export/Import works
- Builds successfully for Windows