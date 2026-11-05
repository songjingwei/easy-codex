# Ticket 01 — TanStack Start 脚手架（web/ workspace 包）

Feature: web-kanban
Depends on: 无

## Scope

- pnpm workspace 化：`pnpm-workspace.yaml` 增加 `packages: ["web"]`
- 新建 `web/` 包（`@easy-codex/web`）：TanStack Start（React + Vite），`vite.config.ts` 按 `tanstackStart()` + `viteReact()`（顺序：start 在前）
- 最小路由：`src/routes/__root.tsx` + `src/routes/index.tsx`（占位「Web Kanban」标题）
- 根包 `package.json` 增加 `web` 脚本（`pnpm --filter @easy-codex/web dev`）
- 更新 `docs/DIRECTORY_STRUCTURE.md`：补 `web/` 包位置

## Acceptance

- [ ] `pnpm install` 成功（workspace 链接生效）
- [ ] `pnpm run web` 启动 dev server，http://localhost:3000 渲染占位页
- [ ] `pnpm --filter @easy-codex/web build` 通过
- [ ] 根包 `pnpm run build` 与 `pnpm test` 通过（AC-6）
