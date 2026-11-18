# Fixtures（切片 1）

本目录为 Easy Codex **切片 1：样例与验证仓库** 的固定样例，供后续切片重复使用。

## 组成

| 路径 | 说明 |
| --- | --- |
| `target-app/` | 独立 Git 仓库；Vite + React + TypeScript 最小任务列表 |
| `requirements/add-priority-label.md` | 标准需求样例（在现有 Task List 上增加优先级） |
| `scripts/verify.sh` | 一键基础检查 |

## 默认 fixture 仓库

- **路径**：`fixtures/target-app`
- **Git**：在 `target-app` 目录内执行 `git status` 应显示独立仓库历史
- **页面**：标题为 **Task List** 的任务列表

## 最少命令

```bash
# 安装与测试
cd fixtures/target-app
pnpm install
pnpm test

# 本地预览
pnpm dev
# 默认 http://localhost:5173

# 构建检查
pnpm build
```

或从仓库根目录：

```bash
./fixtures/scripts/verify.sh
```

## 重置

`target-app` 为演示/验证用小型应用，可随时：

```bash
cd fixtures/target-app
git checkout -- .
rm -rf node_modules
git clean -fdX  # 仅清除忽略文件（如 node_modules）
pnpm install
```

## 与 easy-codex 主仓库的 Git 关系

`target-app` 内有独立 `.git`（切片 1 要求）。若在 **easy-codex 根仓库** 提交 `fixtures/`，Git 可能把 `target-app` 记为 **gitlink**（嵌套仓库条目），而不会展开其文件。可按团队偏好二选一：

- **保留嵌套仓库**：在根仓库用 submodule / 文档约定，只登记 `target-app` 的提交 SHA；或
- **作为普通目录提交**：不保留 `target-app/.git`（会违背切片 1「独立 Git」——仅在你明确改为非嵌套策略时采用）。

当前切片 1 默认保留 `target-app` 独立 Git 历史。

## 切片 1 完成标准（对照）

- [ ] `verify.sh` 或等价命令通过
- [ ] 需求文档中的 **Task List**、**localStorage** 与代码一致
- [ ] 后续切片默认绑定本 fixture 与 `add-priority-label.md`
