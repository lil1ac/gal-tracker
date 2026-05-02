# GAL Tracker - 自动游戏进程检测设计

## 概述

通过监控游戏进程实现自动计时：用户打开游戏 → APP 自动识别 → 开始记录游玩时间，不需要手动在 APP 里点开游戏。

## 核心概念区分

| 字段 | 含义 | 操作权限 |
|------|------|---------|
| `status` | 用户的游玩进度状态：想玩 / 在玩 / 已通关 / 搁置 | 用户手动管理 |
| `current_running` | 当前是否在运行：true / false | 由系统自动设置 |

检测到进程运行 → 设置 `current_running = true`；进程消失 → 设置 `current_running = false`。**不会自动覆盖 `status`**。

## 架构

```
用户打开游戏
    ↓
Windows 检测到进程运行 (Rust 端 ProcessMonitor)
    ↓
进程名/路径匹配 game_processes 表
    ↓
托盘图标变色 + Tooltip 显示状态
    ↓
设置 current_running = true，自动开始计时
    ↓
首次检测到时询问用户：是否将游玩状态改为"在玩"
```

## 模块职责

| 模块 | 职责 |
|------|------|
| `ProcessMonitor` (Rust) | 后台循环检测进程，轮询系统进程列表 |
| `TrayManager` (Rust) | 系统托盘图标、菜单、Tooltip |
| `DatabaseService` (SQLite) | 游戏配置、计时会话、进程映射存储 |
| `GameStore` (Zustand) | 前端状态，UI 反应 |

## 数据模型

### games 表

新增字段：

| 字段 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `current_running` | BOOLEAN | FALSE | 当前是否在运行（系统自动管理） |
| `auto_status_prompted` | BOOLEAN | FALSE | 是否已询问过自动改状态 |
| `auto_status_update_enabled` | BOOLEAN | FALSE | 用户是否允许自动改 status 为"在玩" |

### game_processes 表

```sql
CREATE TABLE game_processes (
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

CREATE INDEX idx_game_processes_game_id ON game_processes(game_id);
CREATE INDEX idx_game_processes_enabled_process ON game_processes(enabled, process_name);
```

| 字段 | 说明 |
|------|------|
| `process_name` | Windows 进程名，如 "CLANNAD.exe" |
| `exe_path` | 完整路径，可为空（如后台进程无法获取路径时） |
| `match_type` | 匹配方式：process_name / exe_path / name_and_path |
| `enabled` | 是否启用检测 |

**约束说明：**

- `game_id` 上有索引，外键设置 ON DELETE CASCADE，删除游戏时自动清理进程配置
- `enabled + process_name` 组合索引，加速进程匹配查询
- Windows 下进程名和路径匹配默认大小写不敏感

### play_sessions 表

```sql
CREATE TABLE play_sessions (
  id TEXT PRIMARY KEY,
  game_id TEXT NOT NULL,
  process_name TEXT NOT NULL,
  exe_path TEXT,
  started_at INTEGER NOT NULL,
  ended_at INTEGER,              -- NULL 表示当前正在计时
  duration_seconds INTEGER,
  end_reason TEXT
    CHECK(end_reason IN ('process_exit', 'user_stop', 'app_close', 'too_short', 'error', 'app_crash')),
  FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE
);

CREATE UNIQUE INDEX idx_play_sessions_active_game
ON play_sessions(game_id)
WHERE ended_at IS NULL;

CREATE INDEX idx_play_sessions_game_id
ON play_sessions(game_id);

CREATE INDEX idx_play_sessions_started_at
ON play_sessions(started_at);
```

#### 计时规则

**同一 game_id 同一时间只允许一个 ended_at IS NULL 的 play_session。**

通过部分唯一索引 `idx_play_sessions_active_game` 保证：`WHERE ended_at IS NULL`。

同一游戏多个进程导致重复计时的情况（需避免）：例如游戏主程序 `CLANNAD.exe` 和启动器 `CLANNAD_launcher.exe` 同时运行，应只创建一条计时记录。

#### 最短计时规则

进程运行少于 60 秒的会话：
- 保留记录，`end_reason` 标记为 `'too_short'`
- 默认不计入总时长统计（统计时过滤 `end_reason = 'too_short'` 的记录）
- 用户可手动删除这类记录

#### end_reason 枚举

| 值 | 含义 |
|----|------|
| `process_exit` | 进程正常退出 |
| `user_stop` | 用户手动停止计时 |
| `app_close` | 应用关闭时未结束的会话 |
| `too_short` | 运行时间少于 60 秒 |
| `app_crash` | 应用异常退出（如崩溃、断电），启动时批量处理 |
| `error` | 其他异常结束 |

## 流程

### 应用启动

```
1. UPDATE games SET current_running = false
2. 处理历史遗留的 ended_at IS NULL 会话：
   - end_reason = 'app_crash'
   - ended_at = now
   - duration_seconds 计算
3. ProcessMonitor 开始轮询当前进程
4. TrayManager 初始化系统托盘
```

### 检测到进程运行

```
1. 查找匹配的 game_processes (enabled=1, match_type 匹配)
2. 检查 games.current_running 是否已为 true
3. 检查是否已有 ended_at IS NULL 的 play_session
   - 若有 → 跳过，不重复计时
4. 若 current_running = false 且无进行中 session → 新游戏开始
   a. 插入 play_session (ended_at = null)
   b. games.current_running = true
   c. 检查 auto_status_prompted
      - false → 弹窗询问用户
      - true 且 auto_status_update_enabled = true
        → 根据状态更新规则决定是否将 status 改为 playing
5. 更新托盘Tooltip
```

### 首次询问弹窗

用户首次检测到游戏运行时，询问：

> "检测到 [游戏名] 正在运行，是否将游玩状态改为'在玩'？"

- **同意** → `auto_status_prompted=true`, `auto_status_update_enabled=true`
  - 仅当 status 为空、想玩、搁置等非完成状态时，才自动改为 playing
  - 已通关状态不自动覆盖
- **拒绝** → `auto_status_prompted=true`, `auto_status_update_enabled=false`，不修改 status

后续自动处理，不再询问。

### 防抖机制

进程检测增加防抖，避免瞬间启动/关闭导致频繁状态切换：

| 参数                           | 默认值 | 说明                               |
| ------------------------------ | ------ | ---------------------------------- |
| `process_start_debounce_seconds` | 3 秒   | 进程连续存在此时间后开始计时         |
| `process_exit_debounce_seconds`  | 5 秒   | 进程消失后延迟此时间确认再结束计时   |
| `min_session_seconds`            | 60 秒  | 少于此时长的会话标记为 `too_short`  |

参数可后续在设置页配置。

### 进程结束

```
1. ProcessMonitor 发现进程消失
2. 查找 games.current_running = true 且 ended_at IS NULL 的 session
3. 检查时长：
   - < 60 秒 → end_reason = 'too_short'
   - >= 60 秒 → end_reason = 'process_exit'
4. 更新 ended_at, duration_seconds
5. games.current_running = false
```

### 应用关闭

```
1. 所有 current_running = true 的游戏：
   - 标记对应 play_session end_reason = 'app_close'
   - ended_at = now
   - duration_seconds 计算
2. current_running = false
3. 应用退出
```

## UI 交互

### 系统托盘

- **图标**：空闲时灰色/默认图标，运行中变绿色/高亮
- **Tooltip**：显示当前运行的游戏名，多个显示数量
- **左键点击**：恢复主窗口
- **右键菜单**：
  - 显示窗口
  - 当前运行的游戏列表（子菜单）
  - 退出

### 游戏配置界面

入口：游戏详情页 → 新增"进程配置"标签页

用户操作流程：
1. 点击"添加进程监控"
2. APP 列出当前运行的进程（带图标、路径）
3. 用户点击选择一个
4. 保存 process_name + exe_path

### 配置进程

用户选择游戏exe后，存储：
- `process_name`: 从 exe 文件名提取（保留扩展名，如 "CLANNAD.exe"）
- `exe_path`: 完整路径
- `match_type`: 默认 'process_name'

## 托盘图标状态

| 状态 | 图标 | Tooltip |
|------|------|---------|
| 空闲 | 默认灰色图标 | "GAL Tracker" |
| 单游戏运行 | 绿色图标 | "CLANNAD - 运行中" |
| 多游戏运行 | 绿色图标 | "2 个游戏运行中" |

## 多游戏同时计时

支持多个游戏同时运行，各自独立计时。

检测到新进程 → 检查是否已计时 → 无则开始

## 错误处理

- 应用异常退出：启动时重置 current_running 状态
- 进程检测失败：日志记录，继续下次轮询
- 数据库错误：显示提示，APP 继续运行