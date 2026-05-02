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

export async function saveGames(games: Game[]): Promise<void> {
  // 保留此函数用于向后兼容旧的 localStorage 数据迁移
  // 新功能应该使用 query/execute 直接操作数据库
}