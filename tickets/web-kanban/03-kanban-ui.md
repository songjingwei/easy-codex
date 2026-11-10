# Ticket 03 — Kanban UI + 轮询 + 产物查看

Feature: web-kanban
Depends on: #02

## Scope

- Server functions：`getKanban()`（读 workflow.json / memos.json / 产物目录 → buildKanban）、`readArtifact({path})`（路径校验防逃逸：解析后必须位于 specs/、tickets/、acceptance/ 内，否则抛 403）
- `src/routes/index.tsx`：七列 Kanban 渲染（当前列高亮、批准状态、产物路径列表）、产物只读查看器、2s 轮询（`router.invalidate()`，`document.hidden` 时暂停）
- 错误横幅：workflow 读取异常时展示，不崩溃

## Acceptance

- [ ] 页面显示七列，当前阶段高亮；无批准显示「未批准」（AC-1、AC-2）
- [ ] 产物路径可查看内容；构造 `../` 逃逸请求被拒（AC-4，手动+server fn 单测）
- [ ] 轮询：修改 workflow.json 后页面 2s 内更新（AC-5 的单客户端前提）
- [ ] 根包 `pnpm run build` 与 `pnpm test` 通过
