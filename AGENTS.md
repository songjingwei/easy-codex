# AGENTS.md

Easy Codex 是面向真实 Git 仓库的 coding agent。当前以文档规划为主，代码尚未开始。

开始前阅读并以此为准：

- `README.md`
- `docs/PROJECT_GOALS.md`
- `docs/TECH_STACK.md`
- `docs/DEVELOPMENT_SEQUENCE.md`

## 仓库维护

当前 Git 仓库就是项目上下文，高风险资源。

- 改动前查看 `git status`、相关 diff 和最近提交，避免覆盖用户已有改动。
- 禁止破坏性 Git 操作、强制推送、删除分支、丢弃未提交改动，除非用户明确要求。
- 不主动 commit 或 push；不提交密钥、凭据、本地环境文件或无关文件（如 `.DS_Store`）。
- 删除、移动、重命名前确认影响范围；解决冲突时保留用户意图。

## 文档与 Changelog

全局文档：`README.md`、`AGENTS.md`、`docs/PROJECT_GOALS.md`、`docs/TECH_STACK.md`、`docs/DEVELOPMENT_SEQUENCE.md`。开发中必须随实际变化同步更新：

- 产品定义、流程、阶段通过条件 → `PROJECT_GOALS.md`
- 技术选型、部署形态、Agent/工具方案 → `TECH_STACK.md`
- 开发顺序、切片范围、优先级、完成标志 → `DEVELOPMENT_SEQUENCE.md`
- 协作规则、验证要求、禁止事项 → `AGENTS.md`

文档中区分“已确定”“建议方案”“待确认”。每次完成任务、切片或重要文档变更，在 `docs/changelog/YYYY-MM-DD.md` 追加记录：变更摘要、影响文档、验证方式、遗留问题。当天 changelog 可以精简合并重复内容；过往日期的 changelog 只读，不允许修改。

## 开发约定

- 按 `docs/DEVELOPMENT_SEQUENCE.md` 的增量切片推进，一次只做一个可验证切片。
- 不提前创建用不到的模块；偏离 `TECH_STACK.md` 前先更新文档或说明原因。
- 阶段闸门由业务后端强制；Git、worktree、分支、产物目录和验收证据必须可追溯。

## 验证

- 文档改动：检查链接、术语一致性、全局文档与当天 changelog 是否需要更新，用 `git diff` 检查范围。
- 代码改动：运行与改动相适应的 lint、typecheck、test 或端到端验证；未验证不写成已完成。

## 禁止事项

- 不绕过阶段闸门把需求标记为完成。
- 不把模型判断当作实际验收结果。
- 不在没有证据的情况下标记验收通过。
- 不删除、覆盖或重写用户已有内容。
- 不引入与 `TECH_STACK.md` 冲突的新框架、新 Agent SDK 或新部署形态，除非先更新技术选型文档。
