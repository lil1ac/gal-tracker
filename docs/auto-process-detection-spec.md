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
  process_name TEXT NOT NULL,          -- 如 "CLANNAD.exe"
  exe_path TEXT,                       -- 可空，有些进程只能获取进程名
  match_type TEXT DEFAULT 'process_name',  -- 'process_name' | 'exe_path' | 'name_and_path'
  enabled INTEGER DEFAULT 1,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (game_id) REFERENCES games(id)
);
```

| 字段 | 说明 |
|------|------|
| `process_name` | Windows 进程名，如 "CLANNAD.exe" |
| `exe_path` | 完整路径，可为空（如后台进程无法获取路径时） |
| `match_type` | 匹配方式：process_name / exe_path / name_and_path |
| `enabled` | 是否启用检测 |

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
  end_reason TEXT,              -- 'process_exit' | 'user_stop' | 'app_close' | 'too_short' | 'error'
  FOREIGN KEY (game_id) REFERENCES games(id)
);
```

#### 计时规则

**同一 game_id 同一时间只能有一个 ended_at IS NULL 的 play_session。**

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
| `error` | 异常结束 |

## 流程

### 应用启动

```
1. UPDATE games SET current_running = false
2. ProcessMonitor 开始轮询当前进程
3. TrayManager 初始化系统托盘
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
      - true 且 enabled → status = 'playing'
5. 更新托盘Tooltip
```

### 首次询问弹窗

用户首次检测到游戏运行时，询问：

> "检测到 [游戏名] 正在运行，是否将游玩状态改为'在玩'？"

- **同意** → `auto_status_prompted=true`, `auto_status_update_enabled=true`, `status='playing'`
- **拒绝** → `auto_status_prompted=true`, `auto_status_update_enabled=false`，不修改 status

后续自动处理，不再询问。

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