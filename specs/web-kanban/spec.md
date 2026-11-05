# Executable Spec — Web Kanban 入口

来源：通过 Web 查看七阶段 Kanban 状态，并在每个阶段查看已批准的产物版本；支持多客户端附接同一会话
参考：specs/web-kanban/prd.md；主 Spec #11 用户故事 9、10

## Behaviour rules

- BR-1: `pnpm run web` 启动 TanStack Start dev server（localhost:3000），页面渲染七列 Kanban（clarify → spec → design → tickets → implement → accept → retro），当前阶段高亮。
- BR-2: 每列展示：阶段名、批准状态（未批准 / commit SHA + 批准时间）、关联产物路径列表。
- BR-3: 数据源为磁盘事实：`.easy-codex/workflow.json`（阶段与批准时间戳）、`.easy-codex/memos.json`（phase → commit + artifacts）、产物目录文件列表；Web 不引入第二份状态。
- BR-4: 当前阶段列提供「批准」按钮；点击后调用主包 `runCli(["--approve", phase])`（生成 memo + `approved:<phase>` 提交并推进阶段），成功后刷新看板；失败时向用户展示错误信息，不静默。
- BR-5: 产物路径可点开只读查看 Markdown 内容（server function 读取仓库内文件，拒绝路径逃逸）。
- BR-6: 页面每 2s 轮询刷新，多标签/多客户端看到一致状态。

## Edge cases

- `.easy-codex/` 不存在（首次运行）：全部列显示「未批准」，当前阶段 clarify，不报错。
- `workflow.json` 损坏：页面显示错误横幅，其余功能不崩溃（loadState 已容错，返回初始状态）。
- `memos.json` 缺失或损坏：按无批准渲染。
- 非 Git 仓库中批准：`runCli --approve` 抛错，错误原样展示。
- 产物文件被并发修改：读取返回当前内容即可，无需加锁。
- 路径逃逸（`../`）：server function 校验解析后路径必须位于仓库产物目录内，否则 403。

## Acceptance criteria

- [ ] AC-1: `pnpm run web` 启动后，浏览器 http://localhost:3000 显示七列 Kanban 且当前阶段高亮
- [ ] AC-2: 每列显示批准 commit SHA 与产物路径；无批准时显示「未批准」
- [ ] AC-3: 点击当前阶段「批准」→ `approved:<phase>` 提交 + memo 生成 → 看板在轮询周期内推进到下一阶段
- [ ] AC-4: 点击产物路径可只读查看内容；尝试路径逃逸被拒绝
- [ ] AC-5: 两个浏览器标签共享状态（一个批准，另一个轮询后一致）
- [ ] AC-6: 根包门禁不受影响：`pnpm run build` 与 `pnpm test` 通过；web 包自身 build 通过

## Open questions

- 无（2026-11-05 人工澄清已确认：只读+Web 批准 / TanStack Start / 轮询）
