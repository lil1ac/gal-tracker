import Database from '@tauri-apps/plugin-sql';
import { CREATE_TABLES_SQL } from './dbSchema';
import { Game } from '../types';

let db: Database | null = null;

export async function initDatabase(): Promise<void> {
  db = await Database.load('sqlite:gal_tracker.db');
  await db.execute(CREATE_TABLES_SQL);

  // 处理遗留的 ended_at IS NULL 会话
  await db.execute(`
    UPDATE play_sessions
    SET ended_at = strftime('%s', 'now') * 1000,
        duration_seconds = (strftime('%s', 'now') * 1000 - started_at) / 1000,
        end_reason = 'app_crash'
    WHERE ended_at IS NULL
  `);

  await db.execute(`UPDATE games SET current_running = 0`);
}

export async function query<T>(sql: string, params: unknown[] = []): Promise<T[]> {
  if (!db) throw new Error('Database not initialized');
  return db.select(sql, params);
}

export async function execute(sql: string, params: unknown[] = []): Promise<void> {
  if (!db) throw new Error('Database not initialized');
  await db.execute(sql, params);
}

export async function saveGames(_games: Game[]): Promise<void> {
  // 保留此函数用于向后兼容旧的 localStorage 数据迁移
  // 新功能应该使用 query/execute 直接操作数据库
}

export async function loadGames(): Promise<Game[]> {
  if (!db) throw new Error('Database not initialized');
  return db.select<Game[]>('SELECT * FROM games ORDER BY updated_at DESC');
}

export async function exportData(): Promise<string> {
  if (!db) throw new Error('Database not initialized');
  const games = await db.select<Game[]>('SELECT * FROM games ORDER BY updated_at DESC');
  return JSON.stringify(games, null, 2);
}

export async function importData(jsonStr: string): Promise<Game[]> {
  if (!db) throw new Error('Database not initialized');
  const games: Game[] = JSON.parse(jsonStr);
  for (const game of games) {
    await db.execute(
      `INSERT OR REPLACE INTO games (id, name, name_cn, cover_url, air_date, platform, status, rating, review, routes, tags, linked_resources, current_running, auto_status_prompted, auto_status_update_enabled, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [game.id, game.name, game.name_cn, game.cover_url, game.air_date, JSON.stringify(game.platform), game.status, game.rating, game.review, JSON.stringify(game.routes), JSON.stringify(game.tags), JSON.stringify(game.linked_resources), game.current_running ? 1 : 0, game.auto_status_prompted ? 1 : 0, game.auto_status_update_enabled ? 1 : 0, game.created_at, game.updated_at]
    );
  }
  return games;
}