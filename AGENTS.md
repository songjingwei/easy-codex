# AGENTS.md

## 项目概览

Easy Codex 是面向真实 Git 仓库的 coding agent 项目。当前仓库处于产品与技术方案阶段，主要内容是文档；正式代码尚未开始搭建。

开始工作前先阅读：

- `README.md`
- `docs/PROJECT_GOALS.md`
- `docs/TECH_STACK.md`
- `docs/DEVELOPMENT_SEQUENCE.md`

产品定义以 `PROJECT_GOALS.md` 为准，技术选型以 `TECH_STACK.md` 为准，开发顺序以 `DEVELOPMENT_SEQUENCE.md` 为准。

## Git 仓库维护原则

当前 Git 仓库就是项目上下文，必须谨慎维护。任何 agent 在本仓库工作时都应把仓库状态视为高风险资源。

- 修改前先查看 `git status`、相关 diff 和最近提交，确认没有覆盖用户已有改动。
- 不执行破坏性 Git 操作，包括 `reset --hard`、`clean -fd`、强制推送、删除分支、丢弃未提交改动等，除非用户明确要求。
- 不提交密钥、凭据、本地环境文件或敏感信息。
- 不主动 commit 或 push；只有用户明确要求时才创建提交。
- 创建提交前检查 staged 内容，避免把无关文件（如 `.DS_Store`）带入。
- 删除文件、移动目录、重命名核心文档前先确认影响范围。
- 解决冲突时保留用户意图，必要时先说明冲突点和建议处理方式。
- 如果工作区存在不属于当前任务的改动，不要顺手修改或清理。

## 文档协作规则

- 文档是当前阶段的主要产物，修改时保持术语、流程和阶段定义一致。
- 更新 `docs/` 下的规划文档时，同步检查 `PROJECT_GOALS.md`、`TECH_STACK.md` 和 `DEVELOPMENT_SEQUENCE.md` 是否需要保持一致。
- 新增文档应放在 `docs/` 下，并使用中文标题与清晰结构。
- 文档中区分“已确定”“建议方案”“待确认”，不要把待确认内容写成既定事实。
- 修改日期、状态说明等元信息在内容变化较大时更新。

## 全局文档与每日 Changelog

以下文档是全局使用文档，开发过程中必须随实际变化同步更新：

- `README.md`
- `AGENTS.md`
- `docs/PROJECT_GOALS.md`
- `docs/TECH_STACK.md`
- `docs/DEVELOPMENT_SEQUENCE.md`

规则：

- 产品定义、流程、阶段通过条件变化时更新 `PROJECT_GOALS.md`。
- 技术选型、部署形态、Agent/工具方案变化时更新 `TECH_STACK.md`。
- 开发顺序、切片范围、优先级或完成标志变化时更新 `DEVELOPMENT_SEQUENCE.md`。
- 仓库协作规则、验证要求或禁止事项变化时更新 `AGENTS.md`。
- 每次完成任务、切片或重要文档变更后，在 `docs/changelog/YYYY-MM-DD.md` 追加当天记录；没有当天文件时创建。
- Changelog 至少记录变更摘要、影响文档、验证方式和遗留问题。

## 开发约定

当前尚无代码工程。进入实现阶段后：

- 优先遵循 `docs/DEVELOPMENT_SEQUENCE.md` 的增量切片顺序。
- 每次只实现一个可验证切片，不提前创建用不到的模块。
- 工程结构、依赖选型和部署形态以 `docs/TECH_STACK.md` 为准；如需偏离，应先更新文档或说明原因。
- 阶段通过条件由业务后端强制，前端只负责展示和收集输入。
- Git 仓库、worktree、分支、产物目录和验收证据都必须可追溯。

## 验证要求

文档改动：

- 检查内部链接和文件路径是否有效。
- 检查术语是否与 `PROJECT_GOALS.md`、`TECH_STACK.md` 一致。
- 检查受影响的全局文档是否需要同步更新。
- 检查是否需要在 `docs/changelog/YYYY-MM-DD.md` 追加当天记录。
- 使用 `git diff` 检查改动范围是否符合任务。

代码改动（实现阶段后）：

- 运行与改动范围相适应的 lint、typecheck、unit test 或端到端验证。
- 不把未验证的能力描述为已完成。
- 交付前说明验证方式和结果。

## 禁止事项

- 不绕过阶段闸门把需求直接标记为完成。
- 不把模型判断当作实际验收结果。
- 不在没有证据的情况下标记验收通过。
- 不为了推进进度而删除、覆盖或重写用户已有内容。
- 不引入与 `TECH_STACK.md` 冲突的新框架、新 Agent SDK 或新部署形态，除非先更新技术选型文档。
