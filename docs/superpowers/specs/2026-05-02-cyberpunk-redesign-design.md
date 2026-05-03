# GAL Tracker 高科技二次元赛博朋克风格美化设计

## 概述

为 GAL Tracker 项目重新设计 UI，采用赛博朋克风格（高科技+二次元），涉及配色、布局、组件视觉全面重新设计。

## 配色系统

| 用途 | 颜色 | CSS 变量 |
|------|------|----------|
| 主背景 | 深邃暗夜黑 | `--bg-primary: #0a0a0f` |
| 次背景 | 面板/卡片底色 | `--bg-secondary: #12121a` |
| 强调色 | 青色霓虹光效 | `--accent: #00f0ff` |
| 辅助强调 | 品红霓虹 | `--accent-secondary: #ff00a0` |
| 第三强调 | 紫色 | `--accent-tertiary: #8b5cf6` |
| 文字主色 | 冷白发光文字 | `--text-primary: #e0e7ff` |
| 文字次色 | 暗灰辅助文字 | `--text-secondary: #64748b` |
| 边框 | 暗紫边框 | `--border: #1e1e2e` |

## 视觉元素

1. **霓虹发光边框** — `box-shadow: 0 0 20px var(--accent)` 产生光晕效果
2. **网格/扫描线背景** — CSS 渐变模拟 HUD 网格纹理
3. **RGB 渐变装饰线** — `linear-gradient(90deg, #00f0ff, #ff00a0, #8b5cf6)`
4. **玻璃态毛玻璃** — `backdrop-filter: blur(10px)` + 半透明背景
5. **动画微交互** — hover 时边框发光增强、按钮脉冲动画

## 组件设计

### App 整体
- 深色背景 + 网格纹理
- 主背景 `#0a0a0f` + 细微网格线

### Sidebar
- 玻璃态面板 `backdrop-filter: blur(12px)`
- 标题 "GAL Tracker" 加霓虹 glow 效果
- 状态按钮 hover 时发光增强

### GameCard
- 封面图片加霓虹边框
- hover 时 glow 扩散动画
- 状态标签用渐变背景

### GameList
- 卡片网格布局
- 空状态提示居中

### GameDetail
- 右侧面板玻璃态
- 标签页霓虹下划线
- Tab 内容区有内边距

### SearchModal
- 玻璃态弹窗
- 搜索框聚焦时霓虹发光

### ThemeToggle
- 霓虹风格切换按钮

### 通用按钮
- 渐变边框
- hover 时发光增强 + 轻微缩放

## 字体

- 主字体：`Rajdhani, Orbitron, sans-serif`
- 中文回退：`Microsoft YaHei`

## 实现文件

- `src/styles/themes.css` — 更新 CSS 变量和暗色主题
- `src/index.css` — 添加网格背景纹理
- `src/components/*.tsx` — 各组件样式调整
