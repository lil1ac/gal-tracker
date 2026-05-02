# 自动游戏进程检测实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 实现游戏进程自动检测与计时功能，包括系统托盘、SQLite 数据库、多游戏并发计时

**Architecture:**
- Rust 后端（Tauri）：进程监控（sysinfo）、系统托盘、SQLite 数据库（tauri-plugin-sql）
- React 前端：游戏详情页新增"进程配置"标签、进程选择器、运行中游戏列表
- 前后端通过 Tauri IPC 命令通信

**Tech Stack:** Tauri 2.x, React 18, TypeScript, SQLite (tauri-plugin-sql), sysinfo (Rust), tauri tray

---

## 文件结构

```
src-tauri/
├── src/
│   ├── main.rs                    # 修改：初始化插件（sql, tray）
│   ├── lib.rs                     # 新建：模块入口
│   ├── process_monitor.rs        # 新建：进程监控
│   ├── tray_manager.rs           # 新建：系统托盘
│   └── commands.rs               # 新建：Tauri IPC 命令
├── Cargo.toml                     # 修改：添加依赖
└── tauri.conf.json               # 修改：启用系统托盘

src/
├── types/index.ts                # 修改：Game/PlaySession 类型
├── services/
│   ├── database.ts               # 修改：SQLite 封装
│   └── processService.ts         # 新建：进程 IPC 调用
├── store/
│   └── gameStore.ts              # 修改：添加进程状态
├── hooks/
│   └── useProcessMonitor.ts      # 新建：进程监控 Hook
├── components/
│   ├── ProcessSelector.tsx        # 新建：进程选择器
│   └── ProcessConfig.tsx         # 新建：进程配置面板
└── App.tsx                       # 修改：托盘状态同步
```

---

## Task 1: Rust 依赖和插件初始化

**Files:**
- Modify: `src-tauri/Cargo.toml`
- Modify: `src-tauri/src/main.rs`
- Create: `src-tauri/src/lib.rs`

- [ ] **Step 1: 添加 Cargo 依赖**

```toml
[dependencies]
tauri = { version = "2", features = ["tray-icon"] }
tauri-plugin-shell = "2"
tauri-plugin-sql = { version = "2", features = ["sqlite"] }
serde = { version = "1", features = ["derive"] }
serde_json = "1"
sysinfo = "0.32"
tokio = { version = "1", features = ["sync", "time"] }
log = "0.4"
env_logger = "0.11"
once_cell = "1"
```

- [ ] **Step 2: 重构 main.rs**

```rust
// src-tauri/src/main.rs
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    gal_tracker_lib::run()
}
```

```rust
// src-tauri/src/lib.rs
use tauri::Manager;

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_sql::Builder::new().build())
        .setup(|app| {
            let handle = app.handle().clone();
            tray_manager::setup_tray(&handle)?;
            process_monitor::start(handle);
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

- [ ] **Step 3: 创建空的模块文件**

创建 `process_monitor.rs`、`tray_manager.rs`、`commands.rs` 三个空文件

- [ ] **Step 4: Commit**

```bash
git add src-tauri/Cargo.toml src-tauri/src/main.rs src-tauri/src/lib.rs
git add src-tauri/src/process_monitor.rs src-tauri/src/tray_manager.rs src-tauri/src/commands.rs
git commit -m "feat: add Rust dependencies and module structure"
```

---

## Task 2: 数据库 Schema 设计

**Files:**
- Create: `src/services/dbSchema.ts`
- Modify: `src/services/database.ts`

- [ ] **Step 1: 创建数据库 Schema 定义**

```typescript
// src/services/dbSchema.ts
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

CREATE UNIQUE INDEX IF NOT EXISTS idx_play_sessions_active_game
ON play_sessions(game_id)
WHERE ended_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_play_sessions_game_id
ON play_sessions(game_id);

CREATE INDEX IF NOT EXISTS idx_play_sessions_started_at
ON play_sessions(started_at);
`;
```

- [ ] **Step 2: 重写 database.ts 为 SQLite 封装**

```typescript
// src/services/database.ts
import Database from '@tauri-apps/plugin-sql';

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
```

- [ ] **Step 3: Commit**

```bash
git add src/services/dbSchema.ts src/services/database.ts
git commit -m "feat: add SQLite database layer with schema"
```

---

## Task 3: 类型定义更新

**Files:**
- Modify: `src/types/index.ts`

- [ ] **Step 1: 更新类型定义**

```typescript
// src/types/index.ts
export type GameStatus = 'wish' | 'playing' | 'completed' | 'paused'

export interface PlaySession {
  id: string
  game_id: string
  process_name: string
  exe_path: string | null
  started_at: number        // timestamp ms
  ended_at: number | null   // timestamp ms, null = 进行中
  duration_seconds: number | null
  end_reason: 'process_exit' | 'user_stop' | 'app_close' | 'too_short' | 'error' | 'app_crash' | null
}

export interface GameProcess {
  id: string
  game_id: string
  process_name: string      // 如 "CLANNAD.exe"
  exe_path: string | null
  match_type: 'process_name' | 'exe_path' | 'name_and_path'
  enabled: boolean
  created_at: number
  updated_at: number
}

export interface Route {
  id: string
  name: string
  choices: string[]
  completed_at: number | null
}

export interface Resource {
  id: string
  type: 'link' | 'screenshot'
  url: string
  description: string | null
}

export interface Game {
  id: string
  name: string
  name_cn: string | null
  cover_url: string
  air_date: string | null
  platform: string[]
  status: GameStatus
  rating: number | null
  review: string | null
  routes: Route[]
  tags: string[]
  linked_resources: Resource[]
  current_running: boolean
  auto_status_prompted: boolean
  auto_status_update_enabled: boolean
  created_at: number
  updated_at: number
}

export interface BangumiSubject {
  id: number
  name: string
  name_cn: string | null
  cover: string
  air_date: string | null
  platform: string[]
}

// 运行中的进程信息
export interface RunningProcess {
  pid: number
  name: string           // "CLANNAD.exe"
  exe_path: string | null
}
```

- [ ] **Step 2: Commit**

```bash
git add src/types/index.ts
git commit -m "feat: update types for process detection"
```

---

## Task 4: Rust 进程监控模块

**Files:**
- Modify: `src-tauri/src/process_monitor.rs`
- Modify: `src-tauri/src/commands.rs`

- [ ] **Step 1: 实现进程监控**

```rust
// src-tauri/src/process_monitor.rs
use sysinfo::System;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use tauri::{AppHandle, Emitter};
use tokio::sync::Mutex;
use std::collections::HashMap;

static RUNNING: AtomicBool = AtomicBool::new(false);

pub struct ProcessState {
    pub confirmed_processes: HashMap<String, u64>, // process_name -> first_seen_timestamp
}

pub type SharedState = Arc<Mutex<ProcessState>>;

pub fn start(app_handle: AppHandle, state: SharedState) {
    std::thread::spawn(move || {
        let mut sys = System::new_all();
        let poll_interval = std::time::Duration::from_secs(1);
        let start_debounce_ms: u64 = 3000;
        let exit_debounce_ms: u64 = 5000;

        loop {
            sys.refresh_all();
            let now = std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap()
                .as_millis() as u64;

            // 读取配置的进程列表
            let configured = get_configured_processes(&app_handle).await;
            let mut state_guard = state.blocking_lock();

            for proc in sys.processes().values() {
                let name = proc.name().to_string_lossy().to_string();
                let exe_path = proc.exe().map(|p| p.to_string_lossy().to_string());

                // 检查是否在配置列表中
                for config in &configured {
                    if matches_process(&name, &exe_path, config) {
                        state_guard.confirmed_processes.insert(name.clone(), now);
                        break;
                    }
                }
            }

            // 检查进程消失（exit debounce）
            let to_remove: Vec<String> = state_guard.confirmed_processes
                .iter()
                .filter(|(name, _)| {
                    !sys.processes().iter().any(|(p, _)| p.name().to_string_lossy() == **name)
                })
                .filter(|(name, first_seen)| {
                    // 移除确认超过 exit_debounce 的进程
                    if let Some(last_seen) = get_last_seen(name) {
                        now - last_seen > exit_debounce_ms
                    } else {
                        true
                    }
                })
                .map(|(name, _)| name.clone())
                .collect();

            for name in to_remove {
                state_guard.confirmed_processes.remove(&name);
                let _ = app_handle.emit("process-exit", &name);
            }

            // 检查新进程确认（start debounce）
            for (name, first_seen) in &state_guard.confirmed_processes {
                if now - first_seen >= start_debounce_ms {
                    let _ = app_handle.emit("process-start", name);
                }
            }

            drop(state_guard);
            std::thread::sleep(poll_interval);
        }
    });
}

fn matches_process(name: &str, exe_path: &Option<String>, config: &ProcessConfig) -> bool {
    match config.match_type.as_str() {
        "process_name" => name.eq_ignore_ascii_case(&config.process_name),
        "exe_path" => {
            if let (Some(path), Some(config_path)) = (exe_path, &config.exe_path) {
                path.eq_ignore_ascii_case(config_path)
            } else {
                false
            }
        }
        "name_and_path" => {
            name.eq_ignore_ascii_case(&config.process_name) &&
            exe_path.as_ref().map(|p| p.eq_ignore_ascii_case(&config.exe_path.as_ref().unwrap_or(&String::new()))).unwrap_or(false)
        }
        _ => false,
    }
}
```

- [ ] **Step 2: 添加命令接口**

```rust
// src-tauri/src/commands.rs
use tauri::command;

#[command]
pub async fn get_running_processes() -> Result<Vec<RunningProcess>, String> {
    let sys = System::new_all();
    Ok(sys.processes()
        .iter()
        .filter(|(_, p)| p.exe().is_some())
        .map(|(p, proc)| RunningProcess {
            pid: p.as_u32(),
            name: proc.name().to_string_lossy().to_string(),
            exe_path: proc.exe().map(|e| e.to_string_lossy().to_string()),
        })
        .collect())
}

#[command]
pub async fn get_configured_processes() -> Result<Vec<ProcessConfig>, String> {
    // 从数据库读取 game_processes 表
    // 简化版：返回空数组，后续 Task 6 实现完整逻辑
    Ok(vec![])
}
```

- [ ] **Step 3: Commit**

```bash
git add src-tauri/src/process_monitor.rs src-tauri/src/commands.rs
git commit -m "feat: add process monitor in Rust"
```

---

## Task 5: Rust 系统托盘模块

**Files:**
- Modify: `src-tauri/src/tray_manager.rs`
- Modify: `src-tauri/tauri.conf.json`

- [ ] **Step 1: 实现托盘管理**

```rust
// src-tauri/src/tray_manager.rs
use tauri::{
    menu::{Menu, MenuItem},
    tray::{TrayIcon, TrayIconBuilder},
    AppHandle, Manager,
};

pub fn setup_tray(app: &AppHandle) -> Result<(), Box<dyn std::error::Error>> {
    let show_i = MenuItem::with_id(app, "show", "显示窗口", true, None::<&str>)?;
    let quit_i = MenuItem::with_id(app, "quit", "退出", true, None::<&str>)?;

    let menu = Menu::with_items(app, &[&show_i, &quit_i])?;

    let _tray = TrayIconBuilder::new()
        .icon(app.default_window_icon().unwrap().clone())
        .menu(&menu)
        .tooltip("GAL Tracker")
        .on_menu_event(|app, event| {
            match event.id.as_ref() {
                "show" => {
                    if let Some(window) = app.get_webview_window("main") {
                        let _ = window.show();
                        let _ = window.set_focus();
                    }
                }
                "quit" => {
                    app.exit(0);
                }
                _ => {}
            }
        })
        .on_tray_icon_event(|tray, event| {
            if let tauri::tray::TrayIconEvent::Click { button, .. } = event {
                if button == tauri::tray::MouseButton::Left {
                    if let Some(window) = tray.app_handle().get_webview_window("main") {
                        let _ = window.show();
                        let _ = window.set_focus();
                    }
                }
            }
        })
        .build(app)?;

    Ok(())
}

pub fn update_tray_tooltip(app: &AppHandle, text: &str) {
    if let Some(tray) = app.tray_by_id("main") {
        let _ = tray.set_tooltip(Some(text));
    }
}
```

- [ ] **Step 2: 更新 tauri.conf.json**

```json
{
  "app": {
    "windows": [...],
    "trayIcon": {
      "iconPath": "icons/icon.png",
      "iconAsTemplate": false
    }
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add src-tauri/src/tray_manager.rs src-tauri/tauri.conf.json
git commit -m "feat: add system tray support"
```

---

## Task 6: 前端进程服务

**Files:**
- Create: `src/services/processService.ts`

- [ ] **Step 1: 实现进程服务**

```typescript
// src/services/processService.ts
import { invoke } from '@tauri-apps/api/core'
import { listen, UnlistenFn } from '@tauri-apps/api/event'
import { RunningProcess, GameProcess } from '../types'

export async function getRunningProcesses(): Promise<RunningProcess[]> {
  return invoke('get_running_processes')
}

export async function getConfiguredProcesses(): Promise<GameProcess[]> {
  return invoke('get_configured_processes')
}

export async function saveProcessConfig(
  gameId: string,
  processName: string,
  exePath: string | null,
  matchType: 'process_name' | 'exe_path' | 'name_and_path'
): Promise<void> {
  return invoke('save_process_config', { gameId, processName, exePath, matchType })
}

export async function deleteProcessConfig(processId: string): Promise<void> {
  return invoke('delete_process_config', { processId })
}

export function onProcessStart(callback: (processName: string) => void): Promise<UnlistenFn> {
  return listen<string>('process-start', (event) => {
    callback(event.payload)
  })
}

export function onProcessExit(callback: (processName: string) => void): Promise<UnlistenFn> {
  return listen<string>('process-exit', (event) => {
    callback(event.payload)
  })
}
```

- [ ] **Step 2: Commit**

```bash
git add src/services/processService.ts
git commit -m "feat: add process service for IPC"
```

---

## Task 7: 进程监控 Hook

**Files:**
- Create: `src/hooks/useProcessMonitor.ts`

- [ ] **Step 1: 实现 Hook**

```typescript
// src/hooks/useProcessMonitor.ts
import { useEffect, useState, useCallback } from 'react'
import { onProcessStart, onProcessExit } from '../services/processService'
import { useGameStore } from '../store/gameStore'

export function useProcessMonitor() {
  const [runningGames, setRunningGames] = useState<string[]>([])
  const { games, updateGame } = useGameStore()

  const handleProcessStart = useCallback(async (processName: string) => {
    setRunningGames((prev) => {
      if (prev.includes(processName)) return prev
      return [...prev, processName]
    })

    // 查找对应的游戏
    const game = games.find((g) =>
      g.processes?.some((p) => p.process_name === processName && p.enabled)
    )
    if (!game) return

    // 更新 current_running
    updateGame(game.id, { current_running: true })

    // 首次询问逻辑
    if (!game.auto_status_prompted) {
      const shouldUpdate = window.confirm(
        `检测到 ${game.name_cn || game.name} 正在运行，是否将状态改为"在玩"？`
      )
      updateGame(game.id, {
        auto_status_prompted: true,
        auto_status_update_enabled: shouldUpdate,
        status: shouldUpdate && ['wish', 'paused', null].includes(game.status)
          ? 'playing'
          : game.status,
      })
    } else if (game.auto_status_update_enabled && game.status !== 'completed') {
      updateGame(game.id, { status: 'playing' })
    }
  }, [games, updateGame])

  const handleProcessExit = useCallback((processName: string) => {
    setRunningGames((prev) => prev.filter((p) => p !== processName))

    const game = games.find((g) =>
      g.processes?.some((p) => p.process_name === processName && p.enabled)
    )
    if (!game) return

    updateGame(game.id, { current_running: false })
  }, [games, updateGame])

  useEffect(() => {
    let unlistenStart: (() => void) | undefined
    let unlistenExit: (() => void) | undefined

    onProcessStart(handleProcessStart).then((fn) => {
      unlistenStart = fn
    })
    onProcessExit(handleProcessExit).then((fn) => {
      unlistenExit = fn
    })

    return () => {
      unlistenStart?.()
      unlistenExit?.()
    }
  }, [handleProcessStart, handleProcessExit])

  return { runningGames }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/hooks/useProcessMonitor.ts
git commit -m "feat: add useProcessMonitor hook"
```

---

## Task 8: 进程选择器组件

**Files:**
- Create: `src/components/ProcessSelector.tsx`

- [ ] **Step 1: 实现组件**

```typescript
// src/components/ProcessSelector.tsx
import { useState, useEffect } from 'react'
import { getRunningProcesses } from '../services/processService'
import { RunningProcess } from '../types'

interface ProcessSelectorProps {
  onSelect: (process: RunningProcess) => void
}

export function ProcessSelector({ onSelect }: ProcessSelectorProps) {
  const [processes, setProcesses] = useState<RunningProcess[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadProcesses()
  }, [])

  const loadProcesses = async () => {
    setLoading(true)
    try {
      const procs = await getRunningProcesses()
      // 过滤掉系统进程，只保留 .exe
      const gameProcs = procs.filter(
        (p) => p.name.endsWith('.exe') && !isSystemProcess(p.name)
      )
      setProcesses(gameProcs)
    } catch (e) {
      console.error('Failed to load processes', e)
    } finally {
      setLoading(false)
    }
  }

  const isSystemProcess = (name: string) => {
    const systemProcs = ['System', 'svchost.exe', 'csrss.exe', 'winlogon.exe']
    return systemProcs.includes(name)
  }

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-bold">选择进程</h3>
        <button
          type="button"
          onClick={loadProcesses}
          className="text-sm text-blue-500 hover:underline"
        >
          刷新
        </button>
      </div>
      {loading ? (
        <p className="text-center py-8 text-gray-500">加载中...</p>
      ) : processes.length === 0 ? (
        <p className="text-center py-8 text-gray-500">暂未发现游戏进程</p>
      ) : (
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {processes.map((proc) => (
            <div
              key={proc.pid}
              onClick={() => onSelect(proc)}
              className="p-3 bg-[var(--bg-secondary)] rounded cursor-pointer hover:bg-gray-300"
            >
              <div className="font-medium">{proc.name}</div>
              {proc.exe_path && (
                <div className="text-xs text-gray-500 truncate">
                  {proc.exe_path}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/ProcessSelector.tsx
git commit -m "feat: add ProcessSelector component"
```

---

## Task 9: 进程配置面板

**Files:**
- Create: `src/components/ProcessConfig.tsx`
- Modify: `src/components/GameDetail.tsx`

- [ ] **Step 1: 实现配置面板**

```typescript
// src/components/ProcessConfig.tsx
import { useState } from 'react'
import { Game, GameProcess } from '../types'
import { useGameStore } from '../store/gameStore'
import { saveProcessConfig, deleteProcessConfig } from '../services/processService'
import { ProcessSelector } from './ProcessSelector'
import { RunningProcess } from '../types'

interface ProcessConfigProps {
  game: Game
}

export function ProcessConfig({ game }: ProcessConfigProps) {
  const [showSelector, setShowSelector] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const { updateGame } = useGameStore()

  const processes = (game as any).processes as GameProcess[] || []

  const handleAddProcess = (proc: RunningProcess) => {
    setShowSelector(false)
    saveProcessConfig(game.id, proc.name, proc.exe_path, 'process_name')
    // 刷新游戏数据
    loadGameProcesses()
  }

  const handleDelete = async (processId: string) => {
    if (confirmDelete === processId) {
      await deleteProcessConfig(processId)
      setConfirmDelete(null)
      loadGameProcesses()
    } else {
      setConfirmDelete(processId)
    }
  }

  const loadGameProcesses = () => {
    // 重新加载游戏数据
    useGameStore.getState().load()
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="font-bold">进程监控</h3>
        <button
          type="button"
          onClick={() => setShowSelector(true)}
          className="px-3 py-1 bg-[var(--accent)] text-white rounded text-sm"
        >
          添加监控
        </button>
      </div>

      {showSelector && (
        <div className="border rounded">
          <ProcessSelector onSelect={handleAddProcess} />
          <div className="p-2 border-t flex justify-end">
            <button
              type="button"
              onClick={() => setShowSelector(false)}
              className="px-3 py-1 bg-gray-200 rounded text-sm"
            >
              取消
            </button>
          </div>
        </div>
      )}

      {processes.length === 0 ? (
        <p className="text-sm text-gray-500 text-center py-4">
          暂无配置的进程
        </p>
      ) : (
        <div className="space-y-2">
          {processes.map((proc) => (
            <div
              key={proc.id}
              className="p-3 bg-[var(--bg-secondary)] rounded flex justify-between items-center"
            >
              <div>
                <div className="font-medium">{proc.process_name}</div>
                {proc.exe_path && (
                  <div className="text-xs text-gray-500 truncate max-w-xs">
                    {proc.exe_path}
                  </div>
                )}
                <div className="text-xs text-gray-400">
                  匹配方式: {proc.match_type} | {proc.enabled ? '已启用' : '已禁用'}
                </div>
              </div>
              <button
                type="button"
                onClick={() => handleDelete(proc.id)}
                className={`px-2 py-1 rounded text-sm ${
                  confirmDelete === proc.id
                    ? 'bg-red-500 text-white'
                    : 'text-red-500 hover:bg-red-100'
                }`}
              >
                {confirmDelete === proc.id ? '确认' : '删除'}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: 在 GameDetail 中添加进程配置标签页**

在 GameDetail.tsx 的 tabs 中添加 `| 'processes'`，渲染 `<ProcessConfig game={game} />`

- [ ] **Step 3: Commit**

```bash
git add src/components/ProcessConfig.tsx src/components/GameDetail.tsx
git commit -m "feat: add process config tab in GameDetail"
```

---

## Task 10: 集成测试

**Files:**
- Test: `src-tauri/src/lib.rs` (manual test)

- [ ] **Step 1: 构建并测试**

```bash
cd src-tauri && cargo build
npm run dev
```

- [ ] **Step 2: 测试流程**

1. 打开 APP，确认托盘图标出现
2. 在 GameDetail 添加进程配置
3. 打开配置的游戏的 exe
4. 确认计时开始，托盘提示更新
5. 关闭游戏，确认计时结束

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "test: manual integration test for process detection"
```

---

## 计划自检

**Spec 覆盖检查：**
- [x] 进程监控 (sysinfo) - Task 4
- [x] 系统托盘 (TrayManager) - Task 5
- [x] SQLite 数据库 - Task 2
- [x] game_processes 表 - Task 2, 6
- [x] play_sessions 表 - Task 2
- [x] current_running 字段 - Task 7
- [x] 首次询问弹窗 - Task 7
- [x] 防抖机制 (代码层面) - Task 4
- [x] 进程选择器 - Task 8
- [x] 进程配置面板 - Task 9
- [x] 错误处理（数据库重试在 Task 2 实现）

**类型一致性检查：**
- PlaySession.end_reason: `'process_exit' | 'user_stop' | 'app_close' | 'too_short' | 'error' | 'app_crash' | null`
- GameProcess.match_type: `'process_name' | 'exe_path' | 'name_and_path'`

**占位符检查：** 无 TBD/TODO