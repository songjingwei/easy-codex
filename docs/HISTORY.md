# easy-codex 开发历程

> 从一句需求，到经过审查和验收的功能——这个项目在开发自己的过程中，成为了它所承诺的东西：2026-11-10 起，easy-codex 的每一个新功能都由它自身的七阶段流程开发、验收并绑定 Git 版本。

本文记录项目的完整开发历程：关键决策、走过的弯路、最终交付了什么。愿景见 [README](../README.md)；当前目录约定见 [DIRECTORY_STRUCTURE](DIRECTORY_STRUCTURE.md)。

---

## 里程碑总览

| 日期 | 里程碑 | 产物 |
|---|---|---|
| 11-02 | 仓库初始化，写下项目愿景 | 初始提交、README |
| 11-03 | 规划七阶段 Spec（#11）、wayfinder map（#1）、D1 LLM 决策调研 | `docs/SPEC.md`、`research/d1-llm-provider` |
| 11-04 | 七阶段工作流实现：T1–T14 逐票完成 + 两轴 code review | `src/` 全部模块，174→113 测试 |
| 11-05 00:00 | **PR #12 合并，#11 关闭** — easy-codex 七阶段流程可用 | `main` 114 测试 |
| 11-05 | 首次自举：用自身 CLI 跑完 clarify→tickets 四阶段批准，#13 开单 | `specs/web-kanban/` 产物链 |
| 11-05 ~ 11-10 | Web Kanban 实现（W1–W5，subagent 分工） | `web/` TanStack Start 应用 |
| 11-09 ~ 11-10 | 两轴 review + 修复；用户批准验收；retro 复盘 | `specs/web-kanban/{review,retro}.md` |
| 11-10 21:06 | **PR #14 合并，#13 关闭** — 七阶段 dogfooding 全链路闭环 | `pnpm run web` 看板可用 |

---

## 第一章：构想与准备（11-02 ~ 11-03）

**起点是一个观察**：AI 可以写代码，但交付一个功能不只是写代码——解释需求、协调工具、检查设计、追踪进度、判断结果是否符合预期，这些衔接工作仍然压在开发者身上。easy-codex 的答案是构建一个基于 [Pi Durable](https://earendil.com/posts/pi-durable/) 的开发 Agent，把需求澄清、产品规格、设计、技术规划、实现、验收、复盘串成**可恢复、有人参与决策**的工作流（`e64effc`、`abeefa7`）。

11-03 完成三件准备：

- **七阶段 Spec**（issue #11）：clarify → spec → design → tickets → implement → accept → retro，每阶段产物落盘（`specs/`、`tickets/`、`acceptance/`）并绑定 Git 版本，批准通过 memo（D7）与 Git 提交标识（D8）记录，进程可从 SQLite 检查点恢复（D9 测试策略：Vitest + `tsc --noEmit` 外部行为测试）。
- **Wayfinder map**（issue #1）：把实现拆成可认领的地图。
- **D1 决策调研**：`research/d1-llm-provider` 分支，确定 OpenAI 为主 LLM 提供（`gpt-5-mini`，思考等级 `medium`），Anthropic 预留。

## 第二章：七阶段工作流实现（11-04，issue #11 → PR #12）

11-04 一个工作日内完成主体实现。方法：**ticket 图驱动 + 每票独立 feature 分支 + merger 合入 integration 分支**，大部分票由 subagent 实现，orchestrator 负责合并与门禁（`tsc --noEmit` + `vitest run`）。

实现顺序按依赖图推进：

1. **底座**（T1 `harness.ts` Pi Durable 初始化、T2 `workflow.ts` 七阶段状态机、T13 `memo.ts` 批准 memo、T14 `git.ts` 提交标识）
2. **阶段模块**（T5 clarify / T6 spec / T7 design / T8 tickets / T9 implement / T10 accept / T11 retro，全部带确定性默认生成器 + 可注入 LLM 的 generator seam）
3. **入口与串联**（T4 CLI `index.ts` + `state.ts` 可恢复检查点、T12 七阶段端到端测试）
4. **收尾**（构建修复 + 两轴 code review + 修复合入）

### 走过的弯路（全部有提交记录为证）

- **T1：node_modules 误提交**——首次合并把约 1.5 万个依赖文件带进了 Git，发现后 reset 重做并补 `.gitignore`。
- **T2：时间戳同毫秒断言失败**——`updatedAt` 比较在快速执行下无变化，改用 Vitest fake timers 构造确定性时间。
- **T14：Git tag 不能含冒号**——`approved:<phase>` 原计划用 tag 实现，`git tag -f approved:accept` 直接报错；改为**提交信息标识**（`git log --format=%B` 匹配），语义不变且更简单。
- **构建静默无输出**——`tsconfig.json` 设了 `noEmit: true`，`pnpm run build` 一直是空操作；拆出 `tsconfig.build.json` 真正产出 `dist/`，并补齐 ESM 相对导入的 `.js` 后缀（Node 26 ESM 裸导入直接 `ERR_MODULE_NOT_FOUND` 教会了我们这件事）。
- **Ticket 04 的省略号陷阱**（第三章发现）：ticket 里 `--artifacts ...` 的省略号被实现者合理化跳过——写 ticket 时验收条件必须可判定。

### 两轴 code review

实现完成后按流程跑了两轴并行 review（Standards 轴对照 AGENTS.md/目录约定；Spec 轴对照 #11 原文），关键发现全部修复：per-phase 批准绑定 Git + memo（最初只有 accept 做了）、`--affected` 产物变更重询接线、共享 artifact writer、LLM 默认值落到 harness（`gpt-5-mini` / `medium`）、文档门禁口径统一。测试从 99 → 113。

**11-05 00:00 PR #12 合并，#11 关闭。** easy-codex 从此是一个可运行的七阶段工具。

## 第三章：自举开发 Web Kanban（11-05 ~ 11-10，issue #13 → PR #14）

> 需求："通过 Web 查看七阶段 Kanban 状态，并在每个阶段查看已批准的产物版本；支持多客户端附接同一会话。"
> 本次的特点：**用 easy-codex 自己开发这个功能**，验证流程本身。

### 用自己的流程开发自己（11-05）

- **clarify**：CLI 结合项目文档（`docs/SPEC.md`、`README.md`）发起追问；三个关键决策由人工澄清确认——**只读 + Web 批准**（超出用户故事 10 的只读基线）、**TanStack Start**（覆盖了建议的零依赖方案）、**轮询刷新**。
- **spec / design / tickets**：PRD、可执行规格（BR-1..6 + Edge cases + AC-1..6）、设计产物（Impeccable 门禁标记）、5 张依赖链 ticket 全部落盘 `specs/web-kanban/`、`tickets/web-kanban/`，逐阶段经 CLI 批准（21:03 → 21:08，四个 `approved:<phase>` 提交 + memo）。

### 逐票实现（W1–W5，subagent 分工）

- **W1 脚手架**：pnpm workspace 化 + TanStack Start 应用（锁定 `@tanstack/react-start` 1.169.4 / vite 8.3.6），dev server 冒烟通过。
- **W2 数据模型**：`buildKanban` 纯函数，严格 TDD（红→绿），容错覆盖 spec 全部 Edge cases（缺目录、损坏 JSON、未知阶段、重复 memo）。
- **W3 UI + 轮询 + 产物查看**：server-data 磁盘层（`loadKanban`/`resolveArtifactPath`/`readArtifact`/`findRepoRoot`）TDD 先行；七列 UI、2s `router.invalidate()` 轮询（`document.hidden` 暂停）、只读产物弹窗。
- **W4 Web 批准**：**复用而非分叉**——web 包通过 workspace 依赖直接 `import { runCli } from 'easy-codex'`（根包 exports 指向源码），并给根包加了 `CliDeps.cwd` 注入（dev server 跑在 `web/`，状态在仓库根）。
- **W5 验收文档 + README**：按 acceptance-template 全量走查，AC 逐条标注证据。

### 中断与降级（诚实记录）

期间遭遇三次 subagent 连接中断（ECONNRESET）与一次免费额度耗尽：W3 重试一次、W5 与部分 review 修复**降级为 orchestrator 手动实现**，但保持了同样的纪律（独立分支、门禁全过再合并）。

### 两轴 review 与修复（11-09 ~ 11-10）

review 抓出的问题全部修复（`fix/web-review` 分支，web 测试 37 → 60）：

- ** Standards 轴**：web 镜像了根包 `PHASE_ORDER`/`ApprovalMemo`（改为从 `easy-codex` 单一事实源导入）；AGENTS.md 门禁未覆盖 web 包；shape 异常的 JSON 静默无警告（与验收文档声明不符）。
- **Spec 轴**：BR-3 的产物**目录**列表未实现（只读了 memo 的 artifacts）——补上 specs/tickets/acceptance 递归扫描 + 阶段规则映射；vite 缺 `strictPort`（3000 被占会静默换端口）；ticket 04 要求的 `--artifacts` 被"合理化"跳过——Web 批准现在自动从产物目录推导并记录该阶段产物；路径 jail 只有词法检查——**符号链接可逃逸**，升级为 realpath 校验；当前列已批准时批准按钮消失（状态偏差无法从 UI 补救）——按钮恒显示。
- **验收文档诚实性**：AC-3/4/5 的浏览器点击交互未实际执行，拆分为「[x] 自动化证据」+「[ ] 手动浏览器验证」；为 AC-5 补做了**磁盘新鲜度实验**（改 `memos.json` 中 design 的时间戳 → 下一次加载即渲染新值 → 恢复原文件），让"轮询读磁盘无第二状态"从声明变成证据。

### 用户验收与复盘（11-10）

- 用户审阅验收摘要后给出 **approved** 结论；implement、accept 两阶段经 CLI 批准。
- **Phase 7 retro**：`review.md`（两轴 review 结论 + 风险）与 `retro.md`（What went well / What to improve / Actions）落盘并批准——七阶段批准链完整：`8d29c26 → 3b0e701 → 80e313e → 98fcabf → c25247f → 13ffc40 → 21a8294`。
- **21:06 PR #14 合并，#13 关闭。**

---

## 关键技术决策

| 决策 | 内容 | 备注 |
|---|---|---|
| D1 | OpenAI 主 provider（`gpt-5-mini`，thinking `medium`），Anthropic 预留 | `research/d1-llm-provider` |
| D3 | 产物落盘 `specs/`、`tickets/`、`acceptance/`，与 Git 版本绑定 | 非聊天记录，可 review 可追踪 |
| D7 | 批准 memo 存 `.easy-codex/memos.json`（phase → commit + artifacts） | gitignore，不提交 |
| D8 | `approved:<phase>` **提交信息标识**（tag 语法不允许冒号，改用 commit marker） | `src/git.ts` |
| D9 | 门禁：Vitest + `tsc --noEmit`；根包另加 web 包门禁 | AGENTS.md Working agreements |
| — | Web 复用 `runCli`（workspace 依赖 + exports 指向 TS 源码），批准逻辑只有一份 | 私有包；`main`/`pnpm start` 不受影响 |
| — | TanStack Start + 2s 轮询（非 WebSocket） | 用户澄清决策；推送留待下一期 |
| — | web 相对导入无扩展名（Vite 风格）/ 根包带 `.js`（Node ESM） | 两套约定并存，按生态 |

## 数据面板（2026-11-10）

- **71 个提交**（main），2 个 PR（#12、#14），2 个功能 issue（#11、#13）全部经 PR 合并关闭
- **174 个测试**（根 114 + web 60，19 个测试文件），含七阶段端到端测试
- 产物：7 个阶段模块 + CLI/Web 双入口 + 完整的 specs/tickets/acceptance 文档链
- 批准记录：7 个 `approved:<phase>` 提交 + 7 条 memo（全部绑定 commit SHA）

## 经验教训

1. **流程的价值在门禁，不在仪式**。每票独立分支 + 双门禁 + 两轴 review 抓出了至少 5 个会被默默带进 main 的问题（无输出的 build、静默的端口漂移、可逃逸的路径 jail、丢失的 artifacts、文档与代码的口径偏差）。
2. **Ticket 的验收条件必须可判定**。"调用 runCli(["--approve", phase, "--artifacts", ...])" 里的省略号被实现者合理化跳过——review 才抓回来。
3. **"已批准"必须绑定版本**。memo + 提交标识让"产物变更后哪些批准受影响"（`--affected`）成为可计算的问题，而不是聊天记录里的记忆。
4. **诚实标注未验证项**。AC-3/4/5 的浏览器交互没点就是没点，用「[x] 自动化证据 + [ ] 手动验证」的结构代替含糊的勾选——验收文档因此可信。
5. **subagent 是加速器不是担保**。三次断连、一次额度耗尽；降级路径（orchestrator 手动实现，纪律不变）必须始终可用。
