# Ticket 05 — 验收文档 + README + 全量门禁

Feature: web-kanban
Depends on: #04

## Scope

- `acceptance/web-kanban/acceptance.md`：环境准备（pnpm install、`pnpm run web`）、操作步骤（查看/批准/产物查看/双标签轮询）、异常场景（.easy-codex 缺失、损坏 JSON、非 Git 仓库）、已知限制（无鉴权、轮询非推送、runCli 每次开 SQLite、Impeccable 待补检）
- `README.md` 增加 Web 入口说明
- 全量门禁走查：根包 `pnpm run build` + `pnpm test`；web 包 build + test

## Acceptance

- [ ] 验收文档覆盖 acceptance-template.md 全部勾选项
- [ ] AC-1..AC-6 逐条人工走查通过并记录
- [ ] 根包与 web 包门禁全绿
