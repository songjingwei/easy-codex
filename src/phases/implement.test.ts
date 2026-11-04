import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, rm, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runImplement, writeAcceptance, TestRunner } from "./implement";
import { Ticket } from "./tickets";

const tickets: Ticket[] = [
    { id: "01", slug: "a", title: "第一个 ticket", dependsOn: [], body: "" },
    { id: "02", slug: "b", title: "第二个 ticket", dependsOn: ["01"], body: "" },
];

const passing: TestRunner = async (cwd) => ({
    command: "test --cwd",
    passed: true,
    output: `cwd=${cwd}`,
});

const failing: TestRunner = async () => ({
    command: "test",
    passed: false,
    output: "boom",
});

describe("runImplement", () => {
    it("runs the injected test runner against the working directory", async () => {
        const result = await runImplement(
            { feature: "Easy Codex", tickets, cwd: "/tmp/x" },
            passing,
        );
        expect(result.tests.passed).toBe(true);
        expect(result.tests.output).toContain("/tmp/x");
    });

    it("marks all tickets completed", async () => {
        const result = await runImplement({ feature: "Easy Codex", tickets }, passing);
        expect(result.completed).toHaveLength(2);
        expect(result.completed[1].id).toBe("02");
    });

    it("flags failing tests in the review and acceptance doc", async () => {
        const result = await runImplement({ feature: "Easy Codex", tickets }, failing);
        expect(result.tests.passed).toBe(false);
        expect(result.review.issues).toContain("测试未通过，需修复后再进入验收。");
        expect(result.acceptance).toContain("- [ ] `test` 通过");
    });

    it("generates an acceptance doc with the template sections", async () => {
        const result = await runImplement({ feature: "Easy Codex", tickets }, passing);
        expect(result.acceptance).toContain("## 环境准备");
        expect(result.acceptance).toContain("## 操作步骤与预期结果");
        expect(result.acceptance).toContain("## 异常场景与边界情况");
        expect(result.acceptance).toContain("## 已知限制 / 未验证内容");
        expect(result.acceptance).toContain("- [x] `test --cwd` 通过");
        expect(result.acceptance).toContain("- [ ] `pnpm run build` 通过");
    });

    it("lists each ticket as a verification step", async () => {
        const result = await runImplement({ feature: "Easy Codex", tickets }, passing);
        expect(result.acceptance).toContain("第一个 ticket（ticket 01）");
        expect(result.acceptance).toContain("第二个 ticket（ticket 02）");
    });
});

describe("writeAcceptance", () => {
    let dir: string;

    beforeEach(async () => {
        dir = await mkdtemp(join(tmpdir(), "easy-codex-acceptance-"));
    });

    afterEach(async () => {
        await rm(dir, { recursive: true, force: true });
    });

    it("writes acceptance.md under acceptance/<slug>/", async () => {
        const result = await runImplement({ feature: "Easy Codex", tickets }, passing);
        const written = await writeAcceptance(result, dir);
        expect(written.acceptancePath.endsWith(join("easy-codex", "acceptance.md"))).toBe(true);
        expect(await readFile(written.acceptancePath, "utf8")).toContain("# Acceptance — Easy Codex");
    });
});
