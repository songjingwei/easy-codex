# PRD — Web Kanban 入口

## Problem Statement

通过 Web 查看七阶段 Kanban 状态，并在每个阶段查看已批准的产物版本；支持多客户端附接同一会话。

## Goal

为 easy-codex 提供 Web 入口（TanStack Start）：浏览器中实时查看当前工作流的七阶段 Kanban、每阶段已批准的 Git 版本与产物，并可直接在 Web 上批准当前阶段（复用 CLI 的 `--approve` 逻辑）。

## User Stories

1. 开发者运行 `pnpm run web`，浏览器打开 Kanban：七列对应七个阶段，当前阶段高亮。
2. 每列显示该阶段的批准记录（commit SHA、批准时间）与关联产物路径；未批准显示「未批准」。
3. 开发者点击当前阶段的「批准」按钮 → 生成 `approved:<phase>` 提交 + memo → Kanban 自动刷新进入下一阶段。
4. 开发者点击产物路径，只读查看该产物的 Markdown 内容。
5. 开发者开两个浏览器标签：一个批准后，另一个在轮询周期内看到相同状态（多客户端附接同一会话）。

## Scope

- `web/` pnpm workspace 包：TanStack Start 应用（React + Vite）
- Server functions 读取 `.easy-codex/`（workflow.json、memos.json）与产物目录（specs/、tickets/、acceptance/）
- 批准操作复用主包 `runCli(["--approve", phase])`（memo + Git 提交逻辑只有一份实现）
- 轮询刷新（2s），多标签共享状态
- 产物只读查看器（Markdown 文本）

## Non-Goals

- 鉴权 / HTTPS / 远程部署（本地开发工具）
- WebSocket 实时推送（下一期）
- Web 端编辑产物
- 多工作流并行看板（一次只展示当前活动工作流）
- CLI/Web 共享进程内会话（本期通过共享磁盘状态达成附接语义）

## 人工澄清记录（2026-11-05）

- 操作范围：**只读 + Web 批准**（用户确认，超出用户故事 10 的只读基线，贴近用户故事 9 的「等待我确认」）
- 技术栈：**TanStack Start**（用户指定；覆盖零依赖建议）
- 实时性：**轮询刷新**（用户确认）
