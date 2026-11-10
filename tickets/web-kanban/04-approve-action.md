# Ticket 04 — Web 批准动作（复用 runCli）

Feature: web-kanban
Depends on: #03

## Scope

- Server function `approvePhase({phase})`：调用主包 `runCli(["--approve", phase, "--artifacts", ...])`（workspace 依赖 `easy-codex`），成功返回新 commit；失败透传错误消息
- 当前阶段列「批准」按钮 → 确认文案 → 调用 → 成功后立即 invalidate；失败展示错误且不刷新阶段
- 校验 phase ∈ PHASE_ORDER（防注入任意参数）

## Acceptance

- [ ] Web 点击批准 → `.easy-codex/memos.json` 新增该阶段 memo、生成 `approved:<phase>` 提交、看板推进（AC-3）
- [ ] 非 Git 仓库场景错误原样展示（spec Edge cases）
- [ ] 根包 `pnpm run build` 与 `pnpm test` 通过
