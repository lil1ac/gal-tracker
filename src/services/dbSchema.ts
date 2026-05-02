export const CREATE_TABLES_SQL = `
CREATE TABLE IF NOT EXISTS games (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  name_cn TEXT,
  cover_url TEXT DEFAULT '',
  air_date TEXT,
  platform TEXT DEFAULT '[]',
  status TEXT DEFAULT 'wish',
  rating INTEGER,
  review TEXT,
  tags TEXT DEFAULT '[]',
  linked_resources TEXT DEFAULT '[]',
  current_running INTEGER DEFAULT 0,
  auto_status_prompted INTEGER DEFAULT 0,
  auto_status_update_enabled INTEGER DEFAULT 0,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS game_processes (
  id TEXT PRIMARY KEY,
  game_id TEXT NOT NULL,
  process_name TEXT NOT NULL,
  exe_path TEXT,
  match_type TEXT DEFAULT 'process_name'
    CHECK(match_type IN ('process_name', 'exe_path', 'name_and_path')),
  enabled INTEGER DEFAULT 1,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS play_sessions (
  id TEXT PRIMARY KEY,
  game_id TEXT NOT NULL,
  process_name TEXT NOT NULL,
  exe_path TEXT,
  started_at INTEGER NOT NULL,
  ended_at INTEGER,
  duration_seconds INTEGER,
  end_reason TEXT
    CHECK(end_reason IN ('process_exit', 'user_stop', 'app_close', 'too_short', 'error', 'app_crash')),
  FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_play_sessions_active_game
ON play_sessions(game_id)
WHERE ended_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_play_sessions_game_id
ON play_sessions(game_id);

CREATE INDEX IF NOT EXISTS idx_play_sessions_started_at
ON play_sessions(started_at);

CREATE INDEX IF NOT EXISTS idx_game_processes_game_id
ON game_processes(game_id);

CREATE INDEX IF NOT EXISTS idx_game_processes_enabled_process
ON game_processes(enabled, process_name);
`;