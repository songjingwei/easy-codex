# 验收文档模板（D9 测试与类型检查策略）
测试框架: Vitest (单测试文件 + 全套)
类型检查: TypeScript 严格模式 (tsc --noEmit)
门槛: 每阶段实现前运行 `pnpm run build`; 实现后运行 `pnpm test`
验收标准模板:
- [ ] 环境准备步骤已在 acceptance/<feature>/acceptance.md 记录
- [ ] 操作步骤与预期结果已写明
- [ ] 异常场景与边界情况已覆盖
- [ ] 已知限制 / 未验证内容已记录
- [ ] 代码已提交 Git 并带 approved:<phase> 标识（D8）
- [ ] `pnpm run build` 通过
- [ ] `pnpm test` 通过（若有测试文件）

