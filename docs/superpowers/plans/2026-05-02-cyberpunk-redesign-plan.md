# GAL Tracker 赛博朋克风格美化实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 GAL Tracker UI 重新设计为赛博朋克风格（高科技+二次元），包括深色主题、霓虹发光效果、玻璃态面板、网格背景纹理

**Architecture:** 通过更新 CSS 变量系统添加赛博朋克配色，修改 index.css 添加网格背景纹理，更新各组件样式添加霓虹光效和玻璃态效果

**Tech Stack:** CSS Variables, Tailwind CSS, CSS Animations, backdrop-filter

---

## 文件结构

- 修改: `src/styles/themes.css` — 更新 CSS 变量（赛博朋克配色）
- 修改: `src/index.css` — 添加网格背景纹理
- 修改: `src/App.tsx` — header 区域赛博朋克样式
- 修改: `src/components/Sidebar.tsx` — 玻璃态面板 + 霓虹效果
- 修改: `src/components/GameCard.tsx` — 霓虹边框 + glow 动画
- 修改: `src/components/GameList.tsx` — 网格布局调整
- 修改: `src/components/GameDetail.tsx` — 玻璃态面板 + 标签页霓虹
- 修改: `src/components/SearchModal.tsx` — 玻璃态弹窗 + 发光输入框
- 修改: `src/components/ThemeToggle.tsx` — 霓虹风格切换
- 修改: `src/components/ProcessConfig.tsx` — 进程配置面板样式

---

### Task 1: 更新 CSS 变量（赛博朋克配色）

**Files:**
- Modify: `src/styles/themes.css`

- [ ] **Step 1: 重写 themes.css**

```css
:root {
  --bg-primary: #0a0a0f;
  --bg-secondary: #12121a;
  --text-primary: #e0e7ff;
  --text-secondary: #64748b;
  --accent: #00f0ff;
  --accent-secondary: #ff00a0;
  --accent-tertiary: #8b5cf6;
  --border: #1e1e2e;
  --glow-accent: 0 0 20px #00f0ff, 0 0 40px #00f0ff40;
  --glow-secondary: 0 0 15px #ff00a0, 0 0 30px #ff00a040;
  --glass-bg: rgba(18, 18, 26, 0.85);
}

.dark {
  --bg-primary: #0a0a0f;
  --bg-secondary: #12121a;
  --text-primary: #e0e7ff;
  --text-secondary: #64748b;
  --accent: #00f0ff;
  --accent-secondary: #ff00a0;
  --accent-tertiary: #8b5cf6;
  --border: #1e1e2e;
  --glow-accent: 0 0 20px #00f0ff, 0 0 40px #00f0ff40;
  --glow-secondary: 0 0 15px #ff00a0, 0 0 30px #ff00a040;
  --glass-bg: rgba(18, 18, 26, 0.85);
}
```

- [ ] **Step 2: 提交**

```bash
git add src/styles/themes.css
git commit -m "style: update CSS variables for cyberpunk theme"
```

---

### Task 2: 添加网格背景纹理

**Files:**
- Modify: `src/index.css`

- [ ] **Step 1: 更新 index.css**

```css
@import url('https://fonts.googleapis.com/css2?family=Rajdhani:wght@400;500;600;700&family=Orbitron:wght@400;500;700&display=swap');

@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  font-family: 'Rajdhani', 'Orbitron', 'Microsoft YaHei', system-ui, sans-serif;
  line-height: 1.6;
  font-weight: 400;
}

body {
  margin: 0;
  min-width: 320px;
  min-height: 100vh;
  background-color: var(--bg-primary);
}

/* Grid background texture */
body::before {
  content: '';
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 0;
  background-image:
    linear-gradient(rgba(0, 240, 255, 0.03) 1px, transparent 1px),
    linear-gradient(90deg, rgba(0, 240, 255, 0.03) 1px, transparent 1px);
  background-size: 50px 50px;
}

/* Scanline effect */
body::after {
  content: '';
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 1;
  background: repeating-linear-gradient(
    0deg,
    transparent,
    transparent 2px,
    rgba(0, 0, 0, 0.1) 2px,
    rgba(0, 0, 0, 0.1) 4px
  );
}

/* Neon glow utility classes */
.neon-glow {
  box-shadow: var(--glow-accent);
}

.neon-glow-secondary {
  box-shadow: var(--glow-secondary);
}

.glass {
  background: var(--glass-bg);
  backdrop-filter: blur(12px);
  border: 1px solid var(--border);
}

/* Gradient border effect */
.gradient-border {
  position: relative;
  background: var(--bg-secondary);
}

.gradient-border::before {
  content: '';
  position: absolute;
  inset: 0;
  padding: 1px;
  border-radius: inherit;
  background: linear-gradient(135deg, var(--accent), var(--accent-secondary), var(--accent-tertiary));
  -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
  mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
  -webkit-mask-composite: xor;
  mask-composite: exclude;
}

/* Neon text effect */
.neon-text {
  color: var(--accent);
  text-shadow: 0 0 10px var(--accent), 0 0 20px var(--accent);
}

/* Button hover animation */
.neon-button {
  transition: all 0.3s ease;
}

.neon-button:hover {
  box-shadow: var(--glow-accent);
  transform: translateY(-2px);
}

/* Pulse animation for accent elements */
@keyframes pulse-glow {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.7; }
}

.pulse-glow {
  animation: pulse-glow 2s ease-in-out infinite;
}

/* Card hover glow effect */
@keyframes glow-expand {
  0% { box-shadow: 0 0 5px var(--accent); }
  100% { box-shadow: 0 0 30px var(--accent), 0 0 60px var(--accent) 40%; }
}
```

- [ ] **Step 2: 提交**

```bash
git add src/index.css
git commit -m "style: add grid background texture and cyberpunk utilities"
```

---

### Task 3: 更新 App.tsx Header 样式

**Files:**
- Modify: `src/App.tsx:61-99`

- [ ] **Step 1: 更新 App.tsx header 区域**

将 header 区域的 `<header className="p-4 border-b ...">` 改为：

```tsx
<header className="p-4 border-b glass relative z-10 flex justify-between items-center">
  {/* 左侧搜索框保持，但更新样式 */}
  <div className="relative">
    <input
      ref={searchInputRef}
      type="text"
      placeholder="搜索游戏... (按 / 聚焦)"
      className="px-4 py-2 pl-10 rounded glass text-[var(--text-primary)] w-72 border border-[var(--border)] focus:border-[var(--accent)] focus:outline-none transition-all duration-300"
      style={{ boxShadow: 'none' }}
      onFocus={(e) => e.target.style.boxShadow = 'var(--glow-accent)'}
      onBlur={(e) => e.target.style.boxShadow = 'none'}
      onChange={(e) => setSearchQuery(e.target.value)}
    />
    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--accent)]">⬡</span>
  </div>

  {/* 右侧按钮组 */}
  <div className="flex gap-3 items-center">
    <input
      type="text"
      placeholder="API Key"
      value={apiKey}
      onChange={(e) => handleApiKeyChange(e.target.value)}
      className="px-3 py-2 rounded glass border border-[var(--border)] text-sm w-36 text-[var(--text-primary)] focus:border-[var(--accent)] focus:outline-none transition-all"
    />
    <ThemeToggle />
    <button type="button" onClick={handleExport} className="neon-button glass px-3 py-2 rounded text-[var(--text-primary)]">
      导出
    </button>
    <label className="neon-button glass px-3 py-2 rounded cursor-pointer text-[var(--text-primary)]">
      导入
      <input type="file" accept=".json" onChange={handleImport} className="hidden" />
    </label>
    <button
      type="button"
      onClick={() => setShowSearch(true)}
      className="neon-button px-4 py-2 rounded font-bold text-[#0a0a0f] transition-all"
      style={{ background: 'var(--accent)', boxShadow: 'var(--glow-accent)' }}
    >
      添加游戏
    </button>
  </div>
</header>
```

- [ ] **Step 2: 提交**

```bash
git add src/App.tsx
git commit -m "style: update App header with glass and neon effects"
```

---

### Task 4: 更新 Sidebar.tsx 玻璃态 + 霓虹效果

**Files:**
- Modify: `src/components/Sidebar.tsx`

- [ ] **Step 1: 重写 Sidebar.tsx 样式部分**

将 `<div className="w-52 bg-[var(--bg-secondary)] p-4 flex flex-col gap-4">` 改为：

```tsx
<div className="w-56 glass p-4 flex flex-col gap-4 relative z-10">
  <h1 className="text-2xl font-bold neon-text" style={{ fontFamily: "'Orbitron', sans-serif" }}>
    GAL Tracker
  </h1>
```

状态按钮样式更新（`className` 中的 `px-3 py-2 rounded text-left`）改为：

```tsx
<button
  key={status}
  onClick={() => setFilterStatus(status)}
  className={`px-3 py-2 rounded text-left transition-all duration-300 ${
    filterStatus === status
      ? 'glass neon-glow text-[var(--accent)]'
      : 'hover:bg-[var(--bg-primary)] hover:text-[var(--accent)]'
  }`}
>
```

统计面板 `className="mt-2 p-3 bg-[var(--bg-primary)] rounded"` 改为：

```tsx
<div className="mt-2 p-3 glass rounded">
```

视图切换按钮保持玻璃态风格。

- [ ] **Step 2: 提交**

```bash
git add src/components/Sidebar.tsx
git commit -m "style: apply glass and neon effects to Sidebar"
```

---

### Task 5: 更新 GameCard.tsx 霓虹边框 + Glow 动画

**Files:**
- Modify: `src/components/GameCard.tsx`

- [ ] **Step 1: 更新 GameCard.tsx**

卡片容器 `className="bg-[var(--bg-secondary)] rounded-lg overflow-hidden cursor-pointer hover:scale-105 transition-transform"` 改为：

```tsx
<div
  onClick={() => setSelectedGame(game)}
  className="relative rounded-lg overflow-hidden cursor-pointer transition-all duration-300 hover:scale-105 group"
  style={{
    background: 'var(--bg-secondary)',
    boxShadow: '0 0 0 1px var(--border)'
  }}
>
  {/* Hover glow overlay */}
  <div
    className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
    style={{ boxShadow: 'inset 0 0 30px var(--accent)', mixBlendMode: 'screen' }}
  />
```

封面区域 `<div className="aspect-[3/4] bg-gray-200 relative">` 改为：

```tsx
<div className="aspect-[3/4] relative overflow-hidden">
  {game.cover_url ? (
    <img src={game.cover_url} alt={game.name} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110" />
  ) : (
    <div className="w-full h-full flex items-center justify-center text-[var(--text-secondary)]">无封面</div>
  )}
  {/* Neon border overlay */}
  <div className="absolute inset-0 border-2 border-transparent group-hover:border-[var(--accent)] transition-all duration-300" style={{ boxShadow: 'inset 0 0 10px var(--accent)' }} />
</div>
```

状态标签 `className="absolute top-2 right-2 px-2 py-1 rounded text-xs text-white ...">` 改为霓虹渐变样式：

```tsx
<span
  className="absolute top-2 right-2 px-2 py-1 rounded text-xs font-bold"
  style={{
    background: game.status === 'playing' ? 'var(--accent-secondary)' : game.status === 'completed' ? 'var(--accent-tertiary)' : 'var(--accent)',
    boxShadow: game.status === 'playing' ? 'var(--glow-secondary)' : 'var(--glow-accent)'
  }}
>
```

- [ ] **Step 2: 提交**

```bash
git add src/components/GameCard.tsx
git commit -m "style: add neon border and glow effects to GameCard"
```

---

### Task 6: 更新 GameDetail.tsx 玻璃态面板 + 标签页霓虹

**Files:**
- Modify: `src/components/GameDetail.tsx`

- [ ] **Step 1: 更新面板容器**

主面板 `<div className="w-[28rem] border-l border-[var(--border)] bg-[var(--bg-primary)] overflow-y-auto">` 改为：

```tsx
<div className="w-[28rem] border-l glass overflow-y-auto relative z-10">
```

Header 区域 `<div className="p-4 flex justify-between items-center border-b ...">` 改为：

```tsx
<div className="p-4 flex justify-between items-center glass">
  <h2 className="font-bold text-lg neon-text">游戏详情</h2>
```

封面区域保持。

标签页容器 `<div className="flex border-b ...">` 改为：

```tsx
<div className="flex glass">
  {(['info', 'sessions', 'routes', 'resources', 'processes'] as const).map((tab) => (
    <button
      key={tab}
      onClick={() => setActiveTab(tab)}
      className={`flex-1 py-3 text-sm transition-all duration-300 ${
        activeTab === tab
          ? 'text-[var(--accent)] border-b-2'
          : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
      }`}
      style={activeTab === tab ? { borderColor: 'var(--accent)', boxShadow: '0 2px 10px var(--accent)' } : {}}
    >
```

游玩计时区块 `<div className="mt-3 p-2 bg-[var(--accent)] bg-opacity-10 rounded ...">` 改为：

```tsx
<div
  className="mt-3 p-3 rounded text-center glass"
  style={{ border: '1px solid var(--accent)', boxShadow: 'var(--glow-accent)' }}
>
  <span className="text-sm font-bold neon-text">
    本次游玩: {formatElapsed(elapsedSeconds)}
  </span>
</div>
```

状态切换按钮 hover 效果增强。

路线完成状态 `bg-green-100 dark:bg-green-900` 改为赛博朋克紫色风格。

- [ ] **Step 2: 提交**

```bash
git add src/components/GameDetail.tsx
git commit -m "style: apply glass panel and neon tabs to GameDetail"
```

---

### Task 7: 更新 SearchModal.tsx 玻璃态弹窗 + 发光输入框

**Files:**
- Modify: `src/components/SearchModal.tsx`

- [ ] **Step 1: 更新 SearchModal.tsx**

遮罩层 `<div className="fixed inset-0 bg-black/50 ...">` 改为：

```tsx
<div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">
```

弹窗 `<div className="bg-[var(--bg-primary)] rounded-lg w-[600px] max-h-[80vh] flex flex-col">` 改为：

```tsx
<div className="glass rounded-lg w-[600px] max-h-[80vh] flex flex-col neon-glow">
```

搜索输入框 `<input className="flex-1 px-3 py-2 rounded border border-[var(--border)] bg-[var(--bg-secondary)]">` 改为：

```tsx
<input
  type="text"
  value={query}
  onChange={(e) => setQuery(e.target.value)}
  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
  placeholder="搜索游戏..."
  className="flex-1 px-4 py-2 rounded glass text-[var(--text-primary)] border border-[var(--border)] focus:border-[var(--accent)] focus:outline-none transition-all duration-300"
  style={{ background: 'var(--bg-secondary)' }}
  onFocus={(e) => {
    e.target.style.borderColor = 'var(--accent)'
    e.target.style.boxShadow = 'var(--glow-accent)'
  }}
  onBlur={(e) => {
    e.target.style.borderColor = 'var(--border)'
    e.target.style.boxShadow = 'none'
  }}
/>
```

搜索按钮 `className="px-4 py-2 bg-[var(--accent)] text-white rounded"` 改为：

```tsx
<button
  onClick={handleSearch}
  className="neon-button px-4 py-2 rounded font-bold text-[#0a0a0f] transition-all"
  style={{ background: 'var(--accent)', boxShadow: 'var(--glow-accent)' }}
>
  搜索
</button>
```

关闭按钮样式更新。

搜索结果 hover 效果 `className="... hover:bg-[var(--bg-secondary)] rounded cursor-pointer"` 改为玻璃态 hover。

- [ ] **Step 2: 提交**

```bash
git add src/components/SearchModal.tsx
git commit -m "style: apply glass modal and glowing search to SearchModal"
```

---

### Task 8: 更新 ThemeToggle.tsx 霓虹风格切换

**Files:**
- Modify: `src/components/ThemeToggle.tsx`

- [ ] **Step 1: 更新 ThemeToggle.tsx**

按钮整体加霓虹发光效果，切换动画增强。

- [ ] **Step 2: 提交**

```bash
git add src/components/ThemeToggle.tsx
git commit -m "style: update ThemeToggle with neon toggle effect"
```

---

### Task 9: 更新 ProcessConfig.tsx 玻璃态面板

**Files:**
- Modify: `src/components/ProcessConfig.tsx`

- [ ] **Step 1: 更新 ProcessConfig.tsx**

将各面板容器改为玻璃态，保持与其他组件风格一致。

- [ ] **Step 2: 提交**

```bash
git add src/components/ProcessConfig.tsx
git commit -m "style: apply glass panel style to ProcessConfig"
```

---

## 自检清单

- [ ] 所有 CSS 变量正确使用赛博朋克配色
- [ ] 霓虹发光效果在 hover 时正常工作
- [ ] 玻璃态面板 `backdrop-filter: blur()` 生效
- [ ] 网格背景纹理覆盖整个页面
- [ ] 动画效果流畅，无性能问题
- [ ] 深色/浅色主题切换正常工作

---

**Plan complete. Two execution options:**

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

Which approach?
