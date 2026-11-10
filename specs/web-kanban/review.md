# Review — Web Kanban 入口

Feature: web-kanban（Issue #13）· 流程：easy-codex 自身七阶段 dogfooding

## Delivered

- Ticket 01: TanStack Start 脚手架（web/ pnpm workspace 包 @easy-codex/web，React + Vite）
- Ticket 02: Kanban 数据模型 buildKanban（纯函数 + TDD，容错处理 spec 全部 Edge cases）
- Ticket 03: Kanban UI + 2s 轮询 + 产物只读查看器（server-data 磁盘层 TDD）
- Ticket 04: Web 批准动作（复用根包 runCli——memo + `approved:<phase>` 提交 + 推进只有一份实现）
- Ticket 05: 验收文档 + README + 全量门禁走查

## Review 修复（两轴 code review 后落地）

- Standards：web 不再镜像根包 PHASE_ORDER / ApprovalMemo（单一事实源，从 `easy-codex` 导入）；AGENTS.md 门禁补 web 包命令；shape 异常 JSON 也产生警告横幅（与验收文档声明一致）。
- Spec：BR-3 产物目录列表落地（specs/tickets/acceptance 递归扫描 + 阶段规则映射，memo artifacts 合并去重）；vite `strictPort: 3000`（BR-1）；Web 批准自动记录该阶段产物（ticket-04 `--artifacts` 漂移修复）；路径 jail 升级为 realpath 校验（符号链接逃逸 403）；批准按钮在当前列恒显示（memo/状态偏差可从 UI 补救）。

## Test status

- 根包 `pnpm test`（Vitest）：114/114 passed（15 files）
- web 包 `pnpm --filter @easy-codex/web test`：60/60 passed（4 files）
- 类型检查：根 `tsc -p tsconfig.build.json` + web `tsc --noEmit` 均通过；web build 通过
- dev smoke：HTTP 200；BR-3 产物列表端到端；磁盘状态变更即时反映（新鲜度实验）

## Risks / notes

- AC-3/AC-4/AC-5 的浏览器点击交互未实际执行（单元测试 + smoke + 实现审查佐证）——日常使用中如发现交互问题按 minor-adjustment 处理。
- `runCli` 每次批准都注入 no-op harness（不触 SQLite）；CLI 默认路径不受影响。
- `minimumReleaseAgeExclude: vite@8.3.6` 为安装所锁版本所需（pnpm release-age 政策豁免）。
- 根包 `exports["."]` 指向 TS 源码（私有包，Vite/vitest 消费；`main: dist/index.js` 与 `pnpm start` 不受影响）——若未来有 plain-Node 裸导入消费者需改为 conditions 映射。
- Impeccable 设计检查未做（skill 不可用）；UI 为内部工具极简样式。
