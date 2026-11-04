# easy-codex 开发 Agent — 实现 Spec

基于 D1–D9 决策（#2–#10 已关闭，全部决策已记录在 #1 Decisions-so-far，研究分支 `research/d1-llm-provider`）。

## Problem Statement

开发者需要将一句需求转化为经过审查和验收的功能，但现有工作流程缺乏可恢复、有人参与决策的串联机制：需求澄清、PRD/Spec、UI/UX 设计、技术方案、实现、验收、复盘各阶段孤立，进度无法恢复，副作用可能盲目重放，关键节点缺乏人工确认。

## Solution

构建基于 Pi Durable 的开发 Agent（easy-codex），将七阶段串成可恢复的工作流：需求澄清（`grill-with-docs`）→ PRD/Spec（`to-spec`）→ UI/UX 设计（Impeccable，强制用于设计阶段）→ 技术方案与 Tickets（`to-tickets`）→ 实现与自检（`implement`）→ 用户验收 → Review 与 Retro（`retro` + `code-review`）。

- 持久化底座：Pi Durable + SQLite（`.easy-codex/agent.sqlite`，`gitignore`，不提交会话状态）
- LLM：OpenAI 主提供（`openaiProvider`），默认模型 `gpt-5-mini`，思考等级 `medium`，Anthropic 预留多模型切换
- 交互入口：CLI + Web 并行（D2），后期延伸 Kanban 多客户端并行开发
- 产物：`docs/` 下 `specs/`、`tickets/`、`acceptance/`，与 Git 版本绑定（D8），人工确认通过 `Hook` + `memo`（D7）

## User Stories

1. 作为开发者，我输入一句需求文案，Agent 结合项目文档追问，明确目标、使用场景、范围、非目标和待决问题。
2. 作为开发者，我认可需求理解后，Agent 生成 PRD 与可执行规格，明确行为规则、边界情况与验收标准。
3. 作为开发者，我批准设计后，Agent 结合 Impeccable 产出可 review 的设计或交互原型，支持迭代反馈。
4. 作为开发者，我确认技术方案后，Agent 生成依赖关系明确、可追踪的 tickets。
5. 作为开发者，我逐项实现 tickets，Agent 运行测试与代码 review，并生成面向用户的验收文档。
6. 作为用户，我按验收文档验证功能，反馈结果：不符合已确认 Spec 在当前范围修复；小调整在流程内处理；新增能力建议新需求重新走流程。
7. 作为开发者，我在关键节点确认后，Agent 记录“已批准”绑定到具体提交版本，产物变更时自动识别受影响方案并重新询问确认。
8. 作为开发者，我可以在进程退出后重新打开同一 SQLite 文件，Agent 从上一个检查点继续，不丢失上下文。
9. 作为开发者，我可以多客户端同时附接同一会话（CLI + Web），Agent 在关键确认点暂停，等待我确认后再继续。
10. 作为开发者，我可以通过 `pnpm run dev` 启动 CLI 入口，通过 Web 查看 Kanban 状态，并在每个阶段查看已批准的产物版本。

## Implementation Decisions

- 模块：`src/index.ts`（CLI/Web 入口）、`src/harness.ts`（Pi Durable 初始化，SQLite 存储、OpenAI 提供商、Node 执行环境）、`src/workflow.ts`（7 阶段状态机，含批准时间戳）、`src/phases/*.ts`（各阶段实现，预留目录已建）
- 接口：`Harness.open()` 传入存储 + 模型 + 工具注册表；`createHarness()` 返回 `{ harness, context }`；`WorkflowState` 记录 `currentPhase` / `approvedAt` / `createdAt` / `updatedAt`
- 技术：pnpm + TypeScript + Node LTS；`@earendil-works/pi-durable` 1.5.0；`skills-lock.json` 已锁定技能版本；`impeccable` 通过 `.codex/hooks.json` 接入 UI 变更检查
- 添加 `docs/agents/issue-tracker.md`、`docs/agents/domain.md`、`docs/agents/triage-labels.md` 以及 `AGENTS.md` / `CLAUDE.md` 的 `## Agent skills` 块
- GitHub 标签已创建：`needs-triage`、`needs-info`、`ready-for-agent`、`ready-for-human`、`wontfix`，以及 `wayfinder:map`、`wayfinder:research`、`wayfinder:prototype`、`wayfinder:grilling`、`wayfinder:task`

## Testing Decisions

- 测试框架：Vitest（已安装 `vitest`，`pnpm test` 可用）；类型检查：`tsc --noEmit`（已通过）
- 测试目标：外部行为（harness 初始化、阶段转换、approval memo 读写、Git 提交标识识别），不测试内部实现细节
- 先写验收标准模板（`docs/acceptance-template.md`），每阶段实现后补充具体测试
- 现有代码无测试文件（预期），待 `clarify` 阶段实现后逐步添加

## Out of Scope

- 部署、CI/CD 流水线配置
- 多租户、团队协作、计费
- 数据库迁移工具（Pi Durable 自带 SQLite，暂不引入外部 DB）
- 具体 Web / Kanban 前端代码（作为下一阶段的设计 + 实现决策，不在本 Spec 内）

## Further Notes

- 研究分支 `research/d1-llm-provider` 已推送（无 PR），保存 LLM 配置决策的原始依据
- Map #1 上所有 9 张 ticket（#2–#10）已关闭，Decisions-so-far 已追加全部决策摘要与上下文指针
- 下一步：从 `clarify` 阶段开始实现，接入 `grill-with-docs`，逐步填充 `src/phases/`
