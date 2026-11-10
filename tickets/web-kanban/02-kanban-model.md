# Ticket 02 — Kanban 数据模型（buildKanban）

Feature: web-kanban
Depends on: #01

## Scope

- `web/src/lib/kanban.ts`：纯函数 `buildKanban({state, memos, artifactFiles})` → `KanbanModel`
  - 七列固定顺序（PHASE_ORDER），当前阶段高亮标记
  - 每列：批准状态（未批准 / commit SHA + approvedAt）、产物路径列表
  - 容错：state/memos 缺失或损坏按空处理（对应 spec Edge cases）
- `web/src/lib/kanban.test.ts`：Vitest 单测（空输入、部分批准、全部批准、损坏 JSON）

## Acceptance

- [ ] `pnpm --filter @easy-codex/web test` 通过（新单测全绿）
- [ ] 模型不直接读磁盘（磁盘读取在 server functions，保持纯函数可测）
- [ ] `pnpm run build` 与 `pnpm test`（根包）通过
