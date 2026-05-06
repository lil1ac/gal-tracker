import initSqlJs, { type Database as SqlJsDatabase, type SqlJsStatic, type BindParams } from 'sql.js';
import { CREATE_TABLES_SQL } from './dbSchema';
import type { BackupData, BangumiSnapshot, Game, GameProcess, ImportResult, PlaySession } from '../types';

declare global {
  interface Window { __TAURI_INTERNALS__?: unknown }
}

interface TauriDb {
  load(s: string): Promise<TauriDb>;
  execute(sql: string, params?: unknown[]): Promise<void>;
  select<T>(sql: string, params?: unknown[]): Promise<T>;
}

let db: TauriDb | SqlJsDatabase | null = null;
let isTauri = false;
let sqlMod: SqlJsStatic | null = null;
let initPromise: Promise<void> | null = null;

const DB_KEY = 'gal_tracker_db_data';
const DB_VERSION_KEY = 'gal_tracker_db_version';
const DB_VERSION = 1;

function isTauriEnv(): boolean {
  return !!(typeof window !== 'undefined' && window.__TAURI_INTERNALS__);
}

function persistBrowserDb() {
  if (!isTauri && db) {
    const data = (db as SqlJsDatabase).export();
    localStorage.setItem(DB_KEY, JSON.stringify(Array.from(data)));
    localStorage.setItem(DB_VERSION_KEY, String(DB_VERSION));
  }
}

export async function initDatabase(): Promise<void> {
  if (initPromise) return initPromise;
  initPromise = (async () => {
    isTauri = isTauriEnv();

    if (isTauri) {
      const { default: Database } = await import('@tauri-apps/plugin-sql');
      db = (await Database.load('sqlite:gal_tracker.db')) as unknown as TauriDb;
    } else {
      sqlMod = await initSqlJs({ locateFile: file => `/${file}` });
      const savedVersion = localStorage.getItem(DB_VERSION_KEY);
      const saved = localStorage.getItem(DB_KEY);
      if (saved && savedVersion === String(DB_VERSION)) {
        try {
          db = new sqlMod.Database(new Uint8Array(JSON.parse(saved)));
        } catch {
          db = new sqlMod.Database();
        }
      } else {
        db = new sqlMod.Database();
      }
    }

    await executeRaw(CREATE_TABLES_SQL);
    await runMigrations();

    await executeRaw(`
      UPDATE play_sessions
      SET ended_at = strftime('%s', 'now') * 1000,
          duration_seconds = (strftime('%s', 'now') * 1000 - started_at) / 1000,
          end_reason = 'app_crash'
      WHERE ended_at IS NULL
    `);

    await executeRaw(`UPDATE games SET current_running = 0`);
    persistBrowserDb();
  })();
  return initPromise;
}

async function executeRaw(sql: string, params: unknown[] = []): Promise<void> {
  if (isTauri) {
    await (db as TauriDb).execute(sql, params);
  } else {
    (db as SqlJsDatabase).exec(sql, params as BindParams);
  }
}

async function columnExists(table: string, column: string): Promise<boolean> {
  const rows = await selectRaw<{ name: string }>(`PRAGMA table_info(${table})`);
  return rows.some(row => row.name === column);
}

async function runMigrations(): Promise<void> {
  if (!(await columnExists('games', 'routes'))) {
    await executeRaw(`ALTER TABLE games ADD COLUMN routes TEXT DEFAULT '[]'`);
  }
  if (!(await columnExists('games', 'completed_at'))) {
    await executeRaw(`ALTER TABLE games ADD COLUMN completed_at INTEGER`);
  }

  const processRows = await selectRaw<{ id: string; game_id: string }>(
    `SELECT id, game_id
     FROM game_processes
     ORDER BY game_id, enabled DESC, updated_at DESC, created_at DESC`
  );
  const seenGameIds = new Set<string>();
  for (const row of processRows) {
    if (seenGameIds.has(row.game_id)) {
      await executeRaw('DELETE FROM game_processes WHERE id = ?', [row.id]);
    } else {
      seenGameIds.add(row.game_id);
    }
  }
  await executeRaw(
    'CREATE UNIQUE INDEX IF NOT EXISTS idx_game_processes_one_per_game ON game_processes(game_id)'
  );

  await executeRaw(`
    CREATE TABLE IF NOT EXISTS bangumi_meta (
      game_id TEXT PRIMARY KEY,
      subject_id INTEGER NOT NULL,
      meta_json TEXT,
      persons_json TEXT DEFAULT '[]',
      characters_json TEXT DEFAULT '[]',
      relations_json TEXT DEFAULT '[]',
      episodes_json TEXT DEFAULT '[]',
      collection_json TEXT,
      synced_at INTEGER NOT NULL,
      FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE
    )
  `);
}

async function selectRaw<T>(sql: string, params: unknown[] = []): Promise<T[]> {
  if (isTauri) {
    return (db as TauriDb).select<T[]>(sql, params);
  } else {
    const stmt = (db as SqlJsDatabase).prepare(sql, params as BindParams);
    const results: T[] = [];
    while (stmt.step()) {
      results.push(stmt.getAsObject() as unknown as T);
    }
    stmt.free();
    return results;
  }
}

export async function query<T>(sql: string, params: unknown[] = []): Promise<T[]> {
  if (initPromise) await initPromise;
  return selectRaw<T>(sql, params);
}

export async function execute(sql: string, params: unknown[] = []): Promise<void> {
  if (initPromise) await initPromise;
  await executeRaw(sql, params);
  persistBrowserDb();
}

interface DbGameRow {
  id: string; name: string; name_cn: string | null; cover_url: string; air_date: string | null;
  platform: string; status: string; rating: number | null; review: string | null;
  routes: string; tags: string; linked_resources: string;
  current_running: number; auto_status_prompted: number; auto_status_update_enabled: number;
  completed_at: number | null;
  created_at: number; updated_at: number;
}

interface DbSessionRow {
  id: string;
  game_id: string;
  process_name: string;
  exe_path: string | null;
  started_at: number;
  ended_at: number | null;
  duration_seconds: number | null;
  end_reason: PlaySession['end_reason'];
}

interface DbProcessRow {
  id: string;
  game_id: string;
  process_name: string;
  exe_path: string | null;
  match_type: GameProcess['match_type'];
  enabled: number;
  created_at: number;
  updated_at: number;
}

interface DbBangumiMetaRow {
  game_id: string;
  subject_id: number;
  meta_json: string | null;
  persons_json: string;
  characters_json: string;
  relations_json: string;
  episodes_json: string;
  collection_json: string | null;
  synced_at: number;
}

function parseJson<T>(value: string | null | undefined, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function deserializeGame(row: DbGameRow): Game {
  return {
    id: row.id,
    name: row.name,
    name_cn: row.name_cn,
    cover_url: row.cover_url,
    air_date: row.air_date,
    platform: parseJson(row.platform, []),
    status: row.status as Game['status'],
    rating: row.rating,
    review: row.review,
    routes: parseJson(row.routes, []),
    tags: parseJson(row.tags, []),
    linked_resources: parseJson(row.linked_resources, []),
    current_running: row.current_running === 1,
    auto_status_prompted: row.auto_status_prompted === 1,
    auto_status_update_enabled: row.auto_status_update_enabled === 1,
    completed_at: row.completed_at,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function deserializeProcess(row: DbProcessRow): GameProcess {
  return {
    ...row,
    enabled: row.enabled === 1,
  };
}

export async function loadGames(): Promise<Game[]> {
  if (initPromise) await initPromise;
  const rows = await selectRaw<DbGameRow>('SELECT * FROM games ORDER BY updated_at DESC');
  return rows.map(deserializeGame);
}

export async function loadPlaySessions(gameId?: string): Promise<PlaySession[]> {
  if (initPromise) await initPromise;
  const rows = await selectRaw<DbSessionRow>(
    gameId
      ? 'SELECT * FROM play_sessions WHERE game_id = ? ORDER BY started_at DESC'
      : 'SELECT * FROM play_sessions ORDER BY started_at DESC',
    gameId ? [gameId] : []
  );
  return rows;
}

export async function loadGameProcesses(): Promise<GameProcess[]> {
  if (initPromise) await initPromise;
  const rows = await selectRaw<DbProcessRow>('SELECT * FROM game_processes ORDER BY created_at DESC');
  return rows.map(deserializeProcess);
}

function deserializeBangumiSnapshot(row: DbBangumiMetaRow): BangumiSnapshot {
  return {
    game_id: row.game_id,
    meta: parseJson(row.meta_json, null),
    persons: parseJson(row.persons_json, []),
    characters: parseJson(row.characters_json, []),
    relations: parseJson(row.relations_json, []),
    episodes: parseJson(row.episodes_json, []),
    collection: parseJson(row.collection_json, null),
    synced_at: row.synced_at,
  };
}

export async function loadBangumiSnapshot(gameId: string): Promise<BangumiSnapshot | null> {
  if (initPromise) await initPromise;
  const rows = await selectRaw<DbBangumiMetaRow>('SELECT * FROM bangumi_meta WHERE game_id = ?', [gameId]);
  return rows[0] ? deserializeBangumiSnapshot(rows[0]) : null;
}

export async function saveBangumiSnapshot(snapshot: BangumiSnapshot): Promise<void> {
  if (initPromise) await initPromise;
  const subjectId = snapshot.meta?.subject_id || Number(snapshot.game_id);
  await executeRaw(
    `INSERT OR REPLACE INTO bangumi_meta (game_id, subject_id, meta_json, persons_json, characters_json, relations_json, episodes_json, collection_json, synced_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      snapshot.game_id,
      subjectId,
      snapshot.meta ? JSON.stringify(snapshot.meta) : null,
      JSON.stringify(snapshot.persons),
      JSON.stringify(snapshot.characters),
      JSON.stringify(snapshot.relations),
      JSON.stringify(snapshot.episodes),
      snapshot.collection ? JSON.stringify(snapshot.collection) : null,
      snapshot.synced_at,
    ]
  );
  persistBrowserDb();
}

export async function addManualPlaySession(
  gameId: string,
  startedAt: number,
  durationSeconds: number,
  sessionId?: string
): Promise<void> {
  if (initPromise) await initPromise;
  const safeDuration = Math.max(60, Math.floor(durationSeconds));
  const id = sessionId || String(Date.now()) + '_' + Math.random().toString(36).slice(2, 8);
  await executeRaw(
    `INSERT INTO play_sessions (id, game_id, process_name, exe_path, started_at, ended_at, duration_seconds, end_reason)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, gameId, 'manual', null, startedAt, startedAt + safeDuration * 1000, safeDuration, 'user_stop']
  );
  persistBrowserDb();
}

export async function deletePlaySession(sessionId: string): Promise<void> {
  if (initPromise) await initPromise;
  await executeRaw('DELETE FROM play_sessions WHERE id = ?', [sessionId]);
  persistBrowserDb();
}

export async function getSetting(key: string): Promise<string | null> {
  if (initPromise) await initPromise;
  const rows = await selectRaw<{ value: string }>('SELECT value FROM settings WHERE key = ?', [key]);
  return rows.length > 0 ? rows[0].value : null;
}

export async function setSetting(key: string, value: string): Promise<void> {
  if (initPromise) await initPromise;
  await executeRaw('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', [key, value]);
  persistBrowserDb();
}

export async function deleteSetting(key: string): Promise<void> {
  if (initPromise) await initPromise;
  await executeRaw('DELETE FROM settings WHERE key = ?', [key]);
  persistBrowserDb();
}

export async function exportData(): Promise<string> {
  if (initPromise) await initPromise;
  const games = (await selectRaw<DbGameRow>('SELECT * FROM games ORDER BY updated_at DESC')).map(deserializeGame);
  const sessions = await loadPlaySessions();
  const processes = await loadGameProcesses();
  const settingRows = await selectRaw<{ key: string; value: string }>(
    `SELECT key, value FROM settings WHERE key != 'bgm_api_key' ORDER BY key`
  );
  const settings = Object.fromEntries(settingRows.map(row => [row.key, row.value]));
  const backup: BackupData = {
    version: 2,
    exported_at: Date.now(),
    games,
    play_sessions: sessions,
    game_processes: processes,
    settings,
  };
  return JSON.stringify(backup, null, 2);
}

export async function importData(jsonStr: string): Promise<ImportResult> {
  if (initPromise) await initPromise;
  const parsed = JSON.parse(jsonStr) as BackupData | Game[];
  const games: Game[] = Array.isArray(parsed) ? parsed : parsed.games;
  const sessions: PlaySession[] = Array.isArray(parsed) ? [] : (parsed.play_sessions || []);
  const processes: GameProcess[] = Array.isArray(parsed) ? [] : (parsed.game_processes || []);
  const settings: Record<string, string> = Array.isArray(parsed) ? {} : (parsed.settings || {});

  if (!Array.isArray(games)) {
    throw new Error('Invalid backup: games must be an array');
  }

  for (const game of games) {
    await executeRaw(
      `INSERT OR REPLACE INTO games (id, name, name_cn, cover_url, air_date, platform, status, rating, review, routes, tags, linked_resources, current_running, auto_status_prompted, auto_status_update_enabled, completed_at, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [game.id, game.name, game.name_cn, game.cover_url, game.air_date, JSON.stringify(game.platform), game.status, game.rating, game.review, JSON.stringify(game.routes), JSON.stringify(game.tags), JSON.stringify(game.linked_resources), game.current_running ? 1 : 0, game.auto_status_prompted ? 1 : 0, game.auto_status_update_enabled ? 1 : 0, game.completed_at ?? null, game.created_at, game.updated_at]
    );
  }

  for (const session of sessions) {
    await executeRaw(
      `INSERT OR REPLACE INTO play_sessions (id, game_id, process_name, exe_path, started_at, ended_at, duration_seconds, end_reason)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [session.id, session.game_id, session.process_name, session.exe_path, session.started_at, session.ended_at, session.duration_seconds, session.end_reason]
    );
  }

  for (const process of processes) {
    await executeRaw(
      `INSERT OR REPLACE INTO game_processes (id, game_id, process_name, exe_path, match_type, enabled, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [process.id, process.game_id, process.process_name, process.exe_path, process.match_type, process.enabled ? 1 : 0, process.created_at, process.updated_at]
    );
  }

  for (const [key, value] of Object.entries(settings)) {
    if (key !== 'bgm_api_key') {
      await executeRaw('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', [key, value]);
    }
  }

  persistBrowserDb();
  return {
    games,
    play_sessions: sessions,
    game_processes: processes,
  };
}
