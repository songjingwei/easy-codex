# Retro — Web Kanban 入口

Feature: web-kanban（Issue #13）· 本次是 easy-codex 首次用自身七阶段流程开发新功能（dogfooding）

## What went well

- **流程自举成立**：clarify（人工澄清三问）→ spec/design/tickets 产物落盘并绑定 `approved:<phase>` 提交 → tickets 逐票实现 → 验收文档 → 用户批准。全链路的门禁都是 easy-codex 自己的 CLI 跑出来的，memo + 提交标识完整可追溯（六阶段批准记录在案）。
- **复用而非分叉**：Web 批准直接 `import { runCli } from 'easy-codex'`（workspace 依赖 + 源码 exports），批准逻辑只有一份；两轴 review 确认无第二状态源。
- **TDD 纪律**：kanban 模型与 server-data 磁盘层均红→绿（60/60 web 测试，其中 40+ 为本次新增）；路径逃逸、损坏 JSON、符号链接等 Edge cases 都有测试锚定。
- **subagent 分工有效**：W1–W4 每票一个 implementer subagent，orchestrator 只做合并与门禁；上下文未爆炸。

## What to improve

- **subagent 稳定性**：三次 ECONNRESET、一次免费额度耗尽——W5 与 review 修复回退为 orchestrator 手动实现；重试机制与预算余量需要预案。
- **产物-阶段映射是启发式**：`artifactFilesForPhase` 用文件名规则映射目录列表到阶段（acceptance/** 同时出现在 implement 与 accept 两列）；若未来产物布局变化需同步规则——值得在 GLOSSARY/ADR 里记录该映射决策。
- **浏览器交互验证缺口**：AC-3/4/5 依赖人工点击，自动化只覆盖到 markup 与单元层；可考虑后续加 Playwright 冒烟（超出本期范围）。
- **review 发现的 ticket 漂移**：ticket 04 写了 `--artifacts` 但实现初版没传——ticket 文本的"..."省略号被实现者合理化跳过。写 ticket 时验收条件应更明确可判定。

## Actions

- [ ] 开 PR 合并 `integration/web-kanban` → main，关闭 #13（本次 retro 后执行）。
- [ ] 日常使用中检验浏览器交互（AC-3/4/5），问题按 minor-adjustment 处理。
- [ ] 若做 WebSocket 推送 / Playwright 冒烟 / Impeccable 设计检查，新建需求走完整七阶段流程。
