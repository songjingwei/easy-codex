# Acceptance — Web Kanban 入口

Feature: web-kanban（Issue #13）
Spec: `specs/web-kanban/spec.md`（AC-1..AC-6）· PRD: `specs/web-kanban/prd.md` · Design: `specs/web-kanban/design.md`

## 环境准备

- Node LTS + pnpm（workspace：根包 `easy-codex` + `web/` 包 `@easy-codex/web`）。
- 安装依赖：`pnpm install`（workspace 链接生效，`Scope: all N workspace projects`）。
- 启动 Web：`pnpm run web`（= `pnpm --filter @easy-codex/web dev`），dev server 监听 http://localhost:3000。
- 停止：终端 Ctrl-C；或 `pkill -f "vite"`。

## 操作步骤与预期结果（逐条 AC）

### AC-1 七列 Kanban + 当前阶段高亮

- [x] 自动化证据（dev smoke，2026-11-09）：`curl http://localhost:3000` → **HTTP 200**，HTML 含标题 `easy-codex — Web Kanban` 与全部七个阶段名（clarify / spec / design / tickets / implement / accept / retro）。
- 操作：浏览器打开 http://localhost:3000。
- 预期：七列等宽排列；当前阶段列有蓝色边框 + 「当前阶段」徽章。本次真实状态为 `implement`（前四阶段已批准）。

### AC-2 每列显示批准 SHA + 产物路径（未批准显示「未批准」）

- [x] 自动化证据（dev smoke）：HTML 含 `sha`（commit 短 SHA 元素）、`未批准`、`当前阶段` 标记，以及已批准阶段的产物路径 `specs/web-kanban/{prd,spec,design}.md`。
- 操作：观察各列。
- 预期：已批准列显示 7 位短 SHA + 批准时间 + 产物路径列表（来自 `.easy-codex/memos.json` 的 artifacts）；未批准列显示「未批准」，无产物时显示「无产物」。

### AC-3 Web 批准 → memo + `approved:<phase>` 提交 → 看板推进

- [x] 自动化证据（unit tests，`web/src/lib/approve.test.ts`，5/5 通过）：
  - 「approving a phase writes an approved:<phase> commit, a memo, and advances state」——临时 git 仓库中批准 clarify：生成 `approved:clarify` 提交、写入 `memos.json`、`workflow.json` 推进到下一阶段；
  - 「runs the full flow twice (clarify then spec) and keeps advancing state」——连续两次批准状态持续推进；
  - 「stays on retro after approving retro」——retro 是最后一阶段，批准后停留。
- 手动浏览器步骤（本次未实际点击，见「未验证内容」）：当前阶段列点「批准」→ 确认弹窗 → `.easy-codex/memos.json` 新增该阶段 memo、`git log` 出现 `approved:<phase>` 提交、看板在 2s 轮询周期内推进到下一阶段。
- 失败路径：错误信息原样展示在横幅（不静默），按钮在请求期间禁用（「批准中…」）。

### AC-4 产物只读查看 + 防路径逃逸

- [x] 自动化证据（unit tests，`web/src/lib/server-data.test.ts`，17/17 通过）：
  - happy path：`readArtifact` 返回 utf8 内容；
  - 逃逸拒绝（403）：`../` 逃出仓库根、仓库内穿越到产物目录之外（`specs/../../package.json`）、绝对路径 `/etc/hostname`、未进入产物目录的路径、经允许前缀穿越进 `.easy-codex/`；
  - 缺失文件（404）：「throws a 404-style error for a missing artifact file」。
- [x] dev smoke：HTML 含 `artifact-link` 按钮与产物路径。
- 操作：点击产物路径 → 弹窗显示 Markdown 原文（只读、等宽字体）；Esc 或点击遮罩关闭。

### AC-5 多标签轮询共享状态

- [x] 实现证据：`web/src/routes/index.tsx` 每 2s `router.invalidate()` 重跑 loader（`getKanban` 重读磁盘）；页面隐藏（`document.hidden`）时暂停，恢复可见时立即刷新一次；组件卸载时清理 interval 与监听器。
- 手动步骤（本次未实际双标签验证，见「未验证内容」）：开两个标签 → 在 A 批准 → B 在 2s 内显示相同新状态（两者读同一份磁盘状态，无第二份状态源）。

### AC-6 根包门禁不受影响 + web 包自身门禁

- [x] 全部通过（2026-11-09 实测，见「质量门禁」）。

## 异常场景与边界情况

- `.easy-codex/` 不存在（首次运行）：全部列「未批准」，当前 clarify，不报错（unit test: 「returns fresh-workflow defaults when .easy-codex/ is missing」）。
- `workflow.json` / `memos.json` 损坏：按默认状态渲染 + 页面顶部黄色警告横幅，不崩溃（unit tests: corrupt JSON 两项；`loadKanbanReport` 的 `warnings`）。
- 目录不存在 / 首次 clone（无 `.git` 外层目录也能定位）：`findRepoRoot` 向上查找 `.easy-codex/` 或 `.git/` 标记，dev server cwd 为 `web/` 时也能找到仓库根。
- 非 Git 仓库中批准：错误原样展示（unit test: 「fails with the verbatim git error and writes no memo outside a git repo」）。
- 未知阶段注入：`approvePhaseAt` 在产生任何副作用前校验 `phase ∈ PHASE_ORDER`（unit test: 「rejects an unknown phase without side effects」）。
- 产物被并发修改：读取即当前内容，无需加锁（设计决策，无测试）。
- 路径逃逸（`../`、绝对路径、跨目录）：403 拒绝，含 `.easy-codex/` 保护（见 AC-4 证据）。

## 已知限制 / 未验证内容

- **未实际浏览器点击**：AC-3 的浏览器点击批准与 AC-5 的双标签轮询由单元测试 + 实现代码 + smoke markup 佐证；本次验收未在真实浏览器中执行点击交互，合并前建议人工走查一次。
- **无鉴权 / HTTPS / 远程部署**：本地开发工具定位（PRD 非目标）。
- **轮询非推送**：2s 轮询（用户确认）；WebSocket 留待下一期。
- **Web 批准不带 `--artifacts`**：Ticket 04 函数签名为 `{phase}`；产物路径由更早阶段的 CLI 批准记录，Web 端不重新选择。
- **`runCli` 注释**：web 端注入 `initHarness: no-op`（approve 路径不用 harness 结果；否则会在 `web/` 下打开 SQLite 产生游离 `.easy-codex/`）。CLI 默认路径行为不变。
- **Impeccable 设计检查待补**：本期 UI 为内部工具极简样式；`impeccable` skill 在本环境不可用，未做正式设计检查（记录于 design.md）。
- **多工作流并行看板**：一次只展示当前活动工作流（PRD 非目标）。

## 质量门禁（2026-11-09 实测）

- [x] 根包 `pnpm run build`（tsc build，`tsconfig.build.json`）通过
- [x] 根包 `pnpm test`（Vitest）通过：**114/114**（15 个测试文件）
- [x] web 包 `pnpm --filter @easy-codex/web test` 通过：**37/37**（4 个测试文件）
- [x] web 包 `pnpm --filter @easy-codex/web build` 通过
- [x] web 包 `tsc --noEmit` 通过
- [x] dev smoke：`pnpm run web` → HTTP 200，七阶段名 + 批准按钮 + 产物链接 markup 齐全
- [x] 代码已提交 Git；阶段批准带 `approved:<phase>` 标识（D8）：`.easy-codex/memos.json` 记录 clarify/spec/design/tickets 四阶段批准提交
