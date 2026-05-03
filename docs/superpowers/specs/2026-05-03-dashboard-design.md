# 统计仪表盘第一版设计

日期：2026-05-03

## 背景

GAL Tracker 已经具备游戏库、状态管理、评分、通关时间、游玩记录和进程绑定能力。当前侧边栏已有“总览”入口，但实现主要是基础概览卡和几个列表，统计口径分散在 `GameList.tsx` 的局部组件里。下一阶段优先把“总览”升级为统计仪表盘，让现有 `games` 和 `play_sessions` 数据产生可复盘价值。

本阶段不实现启动参数、Locale Emulator、笔记、合集和同步功能。这些功能后续会独立设计，避免把无关数据模型混入仪表盘。

## 目标

1. 在现有“总览”入口中提供正式统计仪表盘。
2. 基于现有 `games`、`play_sessions`、`LibraryGame` 数据计算趋势、排行、状态分布、平台分布、评分和通关率。
3. 让统计口径集中在纯函数服务层，UI 只负责展示和交互。
4. 拆分当前 Dashboard 代码，避免继续在 `GameList.tsx` 内堆积大块业务逻辑。
5. 为关键统计口径补测试，覆盖空数据和边界情况。

## 非目标

1. 不新增图表库。第一版使用 React + CSS 绘制轻量条形图、分布条和趋势柱/线。
2. 不新增启动绑定页，也不处理启动参数或 Locale Emulator。
3. 不新增笔记、游玩日志、自定义合集数据表。
4. 不实现 WebDAV、本地文件夹同步或 SQLite 文件同步。
5. 不重写整个应用布局，只改“总览”相关边界和必要的统计服务。

## 数据口径

### 顶部指标

- 游戏总数：`games.length`。
- 总游玩时长：所有 `LibraryGame.total_seconds` 之和，包含当前仍在运行的会话秒数。
- 通关率：`status === 'completed'` 的游戏数量除以游戏总数。没有游戏时显示 `-`，不显示 `0%`。
- 平均评分：所有 `rating !== null` 的游戏评分平均值，保留 1 位小数。没有评分时显示 `-`。
- 本月通关：`completed_at` 落在当前本地自然月内的游戏数量。

### 趋势

- 近 30 天游玩趋势：按本地日期聚合 `play_sessions`。
- 已结束会话使用 `duration_seconds`。
- 未结束会话使用 `now - started_at` 的秒数。
- 如果一个会话跨天，第一版将全部时长计入 `started_at` 所在日期，保持实现简单并在函数注释中明确。后续如果需要更精确的跨天拆分，可单独增强。
- 空数据展示空状态，不渲染误导性的零值密集图。

### 分布

- 状态分布：按 `wish`、`playing`、`completed`、`paused` 统计数量和百分比。
- 平台分布：展开 `game.platform` 数组统计 Top 6；超过 6 个平台时把剩余平台合并为“其他”。空平台归为“未标注”。
- 评分分布：按 1-10 分统计数量。只统计非空评分。

### 排行

- 游玩时长 Top 5：按 `total_seconds` 降序，过滤总时长为 0 的游戏。
- 评分 Top 5：按 `rating` 降序，同分时按 `updated_at` 降序。
- 最近游玩：按 `last_played_at` 降序，过滤没有游玩记录的游戏。
- 待补信息：复用现有 `getGameActionItems`，展示最多 5 个游戏。

## 架构

### 文件边界

- `src/components/GameList.tsx`：只负责根据 `activeView` 决定显示仪表盘或游戏列表，不再包含 Dashboard 业务实现。
- `src/components/Dashboard.tsx`：仪表盘页面容器，组合各个展示组件。
- `src/components/dashboard/MetricTile.tsx`：顶部指标卡。
- `src/components/dashboard/TrendChart.tsx`：近 30 天游玩趋势。
- `src/components/dashboard/DistributionBars.tsx`：状态、平台、评分分布。
- `src/components/dashboard/RankingList.tsx`：排行和最近游玩列表。
- `src/services/dashboardStats.ts`：仪表盘纯统计函数和类型。
- `src/services/dashboardStats.test.ts`：统计口径测试。

如果实现时发现小组件拆分过细导致重复 props 或样式样板过多，可以合并同类展示组件，但统计服务和页面容器必须保持分离。

### 数据流

1. `useGameStore.libraryGames()` 生成包含游玩汇总的 `LibraryGame[]`。
2. `Dashboard` 调用 `buildDashboardStats(games, now)`。
3. `buildDashboardStats` 返回稳定结构：指标、趋势、分布、排行、待补信息。
4. 展示组件只消费统计结果，不直接遍历原始会话或重新计算业务口径。
5. 用户点击排行项或最近游玩项进入 `selectedGame` 详情。
6. 用户点击待补信息 chip 时继续调用现有 `onOpenGameAction(game, action.key)`，复用详情页焦点逻辑。

## UI 设计

仪表盘采用密度适中的工作台布局：

1. 顶部一行 5 个指标卡，移动端降为 2 列或 1 列。
2. 中部左侧为近 30 天游玩趋势，右侧为状态分布和平台分布。
3. 下部为游玩时长 Top 5、评分 Top 5、最近游玩。
4. 评分分布和待补信息放在后半区，避免抢占第一屏。

视觉上延续现有主题变量和 `panel`、`stat-tile` 风格，不新增大面积装饰色。图表使用当前 accent、border、surface token，保证深浅色主题一致。

## 错误和空状态

- 没有游戏：仪表盘显示空状态和添加游戏提示，不渲染空排行。
- 没有游玩记录：趋势和时长排行显示空状态。
- 没有评分：平均评分和评分分布显示空状态。
- 没有平台：平台分布显示“未标注”。
- 统计函数不得抛出普通空数据错误；异常只来自调用层数据结构损坏。

## 测试

新增 `dashboardStats.test.ts`，覆盖：

1. 顶部指标计算，包括通关率、平均评分、本月通关。
2. 近 30 天游玩趋势聚合，包括已结束会话和未结束会话。
3. 状态分布和平台 Top 6 + 其他。
4. 评分分布和评分 Top 5 排序。
5. 游玩时长 Top 5 和最近游玩排序。
6. 空游戏、空会话、空评分的返回结构。

现有 `npm test` 应继续通过，并把新测试加入 `package.json` 的 test 脚本。

## 实施顺序

1. 新建 `dashboardStats.ts` 和测试，先把统计口径固定。
2. 从 `GameList.tsx` 拆出 `Dashboard.tsx`，保持现有行为可用。
3. 增加仪表盘展示组件，接入统计结果。
4. 调整 `GameList.tsx` 只做视图分发。
5. 运行测试和构建，修复类型、布局和空状态问题。

## 验收标准

1. “总览”页显示顶部指标、趋势、状态分布、平台分布、评分分布、排行和最近游玩。
2. 统计结果与 `games` 和 `play_sessions` 数据口径一致。
3. 点击排行或最近游玩能打开游戏详情。
4. 点击待补信息 chip 能定位到对应详情动作。
5. 空数据状态清晰，不出现 `NaN`、`Infinity` 或错误百分比。
6. 统计计算有单元测试覆盖。
7. `npm test` 和 `npm run build` 通过。
