# GAL Tracker Library Workbench Design

## Goal

Turn GAL Tracker from a basic game list into a complete local galgame library workbench for long-term collection management, playtime tracking, route progress, resource organization, and process-based session recording.

## Product Scope

The app keeps the current desktop shape: a left navigation rail, a primary library surface, and a focused game detail workspace. The first version of this workbench should include:

- A library dashboard showing collection counts, active games, total playtime, recently played games, route progress, and games missing key metadata.
- A game library with search, status filters, card/list views, and sort controls.
- A detail workspace with editable metadata, rating, review, tags, real session history, route progress, linked resources, and process monitoring.
- Complete local persistence and backup for games, play sessions, and process configs.
- Tauri process monitoring preserved, but made safer around duplicate process names.

Out of scope for this pass:

- Full local directory scanning.
- Launching games from the app.
- Patch, save-folder, or external-tool management.
- Cloud sync or remote accounts.

These can be a second phase after the local database and workbench behavior are solid.

## Data Model

The existing SQLite schema needs to match the TypeScript model. `games.routes` is currently used by the store but missing from the schema, so migrations must add it for existing databases.

The app should treat `play_sessions` as first-class data rather than hidden implementation detail. The frontend needs summary data:

- Total seconds per game.
- Session count per game.
- Latest session start/end.
- Running session, if present.
- Per-game session list sorted newest first.

Backups should export:

- `games`
- `play_sessions`
- `game_processes`
- non-sensitive settings

The Bangumi API key is sensitive and should not be exported by default.

## Core UI

The recommended structure is the "desktop library workbench" direction:

- Sidebar: dashboard, status buckets, statistics, settings.
- Header: search, sort, view switch, add game.
- Library content: cards or table rows enriched with real total playtime, recent play date, route progress, current running state, and rating.
- Detail workspace: overview header plus tabs for info, sessions, routes, resources, and processes.

The UI should stay utilitarian and dense enough for repeated use. Cover images remain the main visual signal, but operational data should be easy to scan.

## Process Tracking

Process config should avoid using only `process_name` as a unique monitor key. The frontend and backend should identify configs by config id, while still matching runtime processes by configured name/path/match type. This prevents two games that use a common executable name from overwriting each other.

Process events should carry:

- config id
- game id
- process name
- exe path when available

The current one-minute minimum session threshold can remain.

## Error Handling

- Database migration should be idempotent.
- Import should validate JSON shape before mutating local tables.
- Bangumi search errors should show a user-visible message instead of only logging to console.
- Deleting games, routes, resources, and process configs should keep the existing two-step confirmation pattern.

## Testing

The project currently has no test suite. Add focused tests around pure data logic:

- Session summary calculations.
- Backup import/export serialization shape.
- Game filtering and sorting helpers.

The Tauri process monitor can keep Rust unit tests for pure state behavior; UI-level process behavior can be verified manually in Tauri until a broader integration setup exists.
