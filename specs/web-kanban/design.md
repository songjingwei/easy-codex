# Design — Web Kanban 入口

支撑可执行规格：specs/web-kanban/spec.md（TanStack Start · 只读+批准 · 轮询）

## Interfaces

- 新增 pnpm workspace 包 `web/`（`@easy-codex/web`），主包 `easy-codex` 保持 CLI 职责不变。
- `web/package.json` 依赖 `easy-codex: workspace:*`，server functions 直接调用 `runCli` —— **批准逻辑只有一份实现**（复用而非复制）。
- 数据模型 `web/src/lib/kanban.ts`：纯函数 `buildKanban({state, memos, artifactFiles}) → KanbanModel`，磁盘读取集中在 server functions，UI 只消费模型。

## User flows

- 打开页面 → server function `getKanban()` 读 workflow.json + memos.json + 产物目录 → 七列渲染。
- 点击批准 → `approvePhase({phase})` → `runCli(["--approve", phase])` → invalidate + 轮询刷新。
- 点击产物 → `readArtifact({path})` → 路径校验（必须位于 specs/、tickets/、acceptance/ 下）→ 返回文本。

## States

- 列状态：`pending`（未到达）/ `current`（当前阶段，显示批准按钮）/ `approved`（有 memo）/ `awaiting`（已到达未批准，仅当前阶段出现）。
- 页面级：`loading` / `ready` / `error`（workflow.json 读取异常时横幅提示，复用 loadState 容错语义）。

## UI / interaction

- 存在 UI 变更：七列等宽 Kanban、当前阶段高亮边框、批准按钮仅出现在当前列、产物以路径列表呈现、点击在模态/侧栏显示 Markdown 原文。
- 本期不引入组件库，使用 TanStack Start 默认 + 少量自定义 CSS；样式走系统字体与简洁卡片。
- ⚠️ Impeccable 门禁：本期 UI 为内部工具极简样式；如需更高质量视觉，需在 Impeccable 技能可用后补一轮设计检查（记录为已知限制）。

## Polling

- 客户端 `setInterval(2s)` → `router.invalidate()` 重新执行 loader（`getKanban`）；批准动作成功后立即 invalidate 一次。
- 页面隐藏（`document.hidden`）时暂停轮询，避免无谓请求。

## Risks / notes

- `runCli` 每次调用会初始化 Pi Durable harness（打开 SQLite）：本地工具频率下可接受；若成为瓶颈，后续给 `runCli` 加 `skipHarness` 选项（记录为已知限制）。
- pnpm workspace 引入后根 `node_modules` 布局变化：根包构建/测试门禁（AC-6）必须在 CI 前手动验证。
- TanStack Start 迭代较快：以 `web/` 包内锁定的版本为准，不在根包传播依赖。
