# GAL Tracker - MVP Specification

**Date:** 2026-05-02
**Project:** GAL Game Record Tool Desktop Application

---

## 1. Overview

A personal GAL game record tool with playtime tracking, library management, and review capabilities. Uses Bangumi API for game data and local SQLite for personal records. Target: desktop (Tauri + React), future mobile support.

---

## 2. Core Features

### 2.1 Game Library Management
- Game status: 想玩 / 在玩 / 已完成 / 搁置
- Add games via Bangumi search or manual entry
- Display: cover image, title, status, playtime summary
- Views: Card grid (default) / List view, user-switchable

### 2.2 Play Time Tracking
- Start date: when user began playing
- Play sessions: multiple time ranges (start/end timestamps)
- Total playtime: auto-calculated from sessions
- Completion time: date user finished the game
- Session history with add/edit/delete

### 2.3 Game Details & Reviews
- Personal rating (1-10 scale)
- Short review text (supports spoilers in private notes)
- Route records: which routes completed, choices made
- Tags: personal labels (神作/雷作/etc.), genre tags (恋爱/悬疑/治愈/致郁)
- Linked resources: 攻略链接, 本地截图 paths

### 2.4 Search & Filter
- Search by game name
- Quick filter tabs: 全部 / 在玩 / 已完成 / 想玩 / 搁置
- Filter by tags, rating range

### 2.5 Data Management
- Import/Export: JSON format
- Local SQLite database with SQLite.js
- Bangumi API integration for game metadata (title, cover, basic info)
- Data caching: basic info local, details fetched on demand

---

## 3. UI/UX Design

### 3.1 Layout
- **Navigation**: Left sidebar with status tabs
- **Main area**: Game list (card/grid hybrid, switchable)
- **Detail panel**: Slide-out panel or modal for game details

### 3.2 Theme System
- Three themes: 深色 / 浅色 / 跟随系统
- User-toggleable via settings
- Stored in local preferences

### 3.3 Visual Style
- Clean, modern, content-focused
- Cover images as primary visual element
- Consistent spacing and typography

---

## 4. Technical Architecture

### 4.1 Tech Stack
- **Frontend**: React 18 + TypeScript + Vite
- **Desktop**: Tauri 2.x
- **Database**: SQLite via sql.js WASM solution
- **API**: Bangumi API (bgm.tv/v0)

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

## 5. MVP Scope

### Included in MVP
- Game list with card/list view toggle
- Add game via Bangumi search
- Status management (wish/playing/completed/paused)
- Basic playtime tracking
- Rating and review
- Tags
- Theme switching (dark/light/system)
- Local data persistence
- Import/Export JSON

### Deferred to future versions
- Multiple play sessions per game
- Route/choice tracking
- Screenshot linking
- Mobile app
- Sync across devices

---

## 6. API Integration

### Bangumi API (bgm.tv/v0)
- Search subjects: `GET /v0/search/subjects?keyword={query}&type=4`
- Subject details: `GET /v0/subjects/{id}`
- Fields used: id, name, name_cn, cover, air_date, platform

### Data Flow
1. User searches → query Bangumi API
2. Select game → fetch details → cache locally
3. Local edits → save to SQLite
4. Periodic sync → optional refresh from API

---

## 7. Success Criteria

- User can add games from Bangumi
- User can track playtime
- User can rate and review games
- Data persists locally
- Theme switching works
- Export/Import works
- Builds successfully for Windows