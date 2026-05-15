# AGENTS.md

本文件是本仓库的工程协作规范。所有代理在本项目内工作时，优先遵守这里的要求。

## 沟通

- 始终用中文回复。
- 先说明正在做什么和为什么，再进行有风险或大范围改动。
- 不要把不确定的事情说成已完成；完成声明必须有新鲜的验证证据。

## 产品标准

本项目按“可交付的用户软件”处理，而不是一次性原型。

- 用户可见流程要有稳定的信息架构。列表、详情、角色/人物、关联游戏这类 drill-down 流程应使用明确的页面状态或导航栈，不要用多层全屏 overlay 互相覆盖。
- 左侧主导航是应用骨架，应在普通浏览、详情、角色/人物和关联内容之间保持常驻。
- 返回按钮只做一件事：回到上一层业务页面。关闭、返回列表、切换模块要有清晰区别。
- 每个页面自己拥有滚动区域，避免多个嵌套全屏层抢滚动、抢焦点或遮挡导航。
- 空状态、加载态、错误态都要是用户可理解的界面状态，不要只依赖 console。

## 技术栈

- 前端：React 18、TypeScript、Vite、Tailwind CSS。
- 桌面壳：Tauri 2.x，Rust 后端在 `src-tauri/`。
- 状态管理：Zustand，核心 store 在 `src/store/gameStore.ts`。
- 数据：SQL.js SQLite，数据库逻辑在 `src/services/database.ts`。
- Bangumi 相关服务位于 `src/services/bangumi*.ts`。

## 常用命令

```bash
npm run dev
npm test
npm run build
npm run tauri
```

当前测试由 `tsconfig.test.json` 编译到 `.tmp-tests/` 后用 Node 执行。新增行为时优先补小而明确的回归测试。

## 实现原则

- 先读现有代码和局部模式，再改。
- 保持改动边界清晰，不做无关重构。
- React 组件中，业务导航状态应集中在拥有该流程的父组件里；子组件通过回调表达“打开某对象”“返回上一层”等意图。
- 能用纯函数描述的状态转移，优先抽成可测试 helper。
- 不在组件内部制造隐藏的二级历史或局部导航栈，除非该组件就是这个流程的所有者。
- 样式上优先使用已有 CSS 变量和组件类；新增布局类要表达真实页面结构，而不是靠 z-index 修补。
- 不引入新的大型依赖，除非它直接解决核心问题并且比本地实现更可靠。

## 测试与验证

- Bug 修复要先写能复现问题的测试；如果是视觉/交互问题，至少补状态 helper 测试或样式结构回归测试。
- 改 React 页面后，运行 `npm test`。
- 涉及真实界面体验时，启动 Vite 并用浏览器验证关键路径，包括页面非空、无框架错误覆盖层、console 无相关 error/warn、目标交互可完成。
- `npm run build` 是最终交付检查；如果失败，要说明失败命令和根因，不要掩盖。

## 文件定位

| 路径 | 作用 |
| --- | --- |
| `src/App.tsx` | 应用根布局，Sidebar、主视图和全局弹窗入口 |
| `src/components/BrowseView.tsx` | Bangumi 浏览和详情 drill-down 流程 |
| `src/components/BrowseDetailPanel.tsx` | 浏览中的游戏详情页面 |
| `src/components/BangumiEntityDetailPanel.tsx` | 角色/人物详情页面 |
| `src/components/browseNavigation.ts` | 浏览详情导航栈纯函数 |
| `src/store/gameStore.ts` | 游戏库状态和 CRUD |
| `src/services/database.ts` | SQL.js 初始化和持久化 |
| `src/types/index.ts` | 共享类型 |
| `src/index.css` | Tailwind component classes 和页面布局样式 |
| `src-tauri/tauri.conf.json` | Tauri 窗口、CSP、构建配置 |

## Git 与工作区

- 工作区可能已有用户改动。不要回滚不是自己做的修改。
- 修改同一文件前先看 diff，确认不会覆盖用户工作。
- 不要使用 `git reset --hard` 或 `git checkout --` 清理工作区，除非用户明确要求。
- 生成的临时验证文件不要提交到源码目录；测试编译输出放在 `.tmp-tests/`。
