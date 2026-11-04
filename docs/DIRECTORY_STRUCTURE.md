## easy-codex 产物落盘目录约定

基于 D3 决策（#4），所有阶段产物落盘到项目目录（非聊天记录），与 Git 版本绑定，可 review、可追踪。

```
/
├── README.md              # 当前项目说明（已存在）
├── package.json           # 依赖与脚本（已存在）
├── tsconfig.json          # TypeScript 配置（已存在）
├── .gitignore             # 忽略 .easy-codex/agent.sqlite（已存在）
├── docs/
│   ├── agents/            # agent 技能设置（已存在）
│   ├── adr/               # 架构决策记录（预留，空）
│   ├── DIRECTORY_STRUCTURE.md  # 本文件
│   └── GLOSSARY.md        # 领域词汇表（预留，后续创建）
├── specs/                 # PRD + Spec（每需求一个子目录）
│   └── <feature>/
│       ├── prd.md         # 需求文档
│       └── spec.md        # 可执行规格（行为规则、边界、验收标准）
├── tickets/               # 技术方案 + 可追踪 tickets（每需求一个子目录）
│   └── <feature>/
│       ├── 01-<slug>.md   # 依赖顺序编号的 tracer-bullet 票
│       └── 02-<slug>.md
├── acceptance/            # 用户验收文档
│   └── <feature>/
│       └── acceptance.md  # 环境准备、操作步骤、异常场景、已知限制
├── src/                   # 实现代码（已存在）
│   ├── harness.ts         # Pi Durable Harness 初始化
│   ├── workflow.ts        # 七阶段状态机
│   ├── index.ts           # CLI/Web 入口
│   └── phases/            # 各阶段实现
│       ├── clarify.ts
│       ├── spec.ts
│       ├── design.ts
│       ├── tickets.ts
│       ├── implement.ts
│       ├── accept.ts
│       └── retro.ts
└── .easy-codex/           # Pi Durable SQLite 持久化（已存在，gitignore）
    └── agent.sqlite
