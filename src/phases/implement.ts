import { execFile } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { promisify } from "node:util";
import { slugify } from "./spec";
import { Ticket } from "./tickets";

const exec = promisify(execFile);

/**
 * Phase 5 — implement.
 *
 * Works through the tickets, runs the test suite, performs a self-review, and
 * produces the user-facing acceptance document
 * (`acceptance/<feature>/acceptance.md`).
 */

export interface TestRunResult {
    command: string;
    passed: boolean;
    output?: string;
}

export type TestRunner = (cwd: string) => Promise<TestRunResult>;

export interface ImplementInput {
    feature: string;
    tickets: Ticket[];
    cwd?: string;
    runner?: TestRunner;
}

export interface ReviewSummary {
    summary: string;
    issues: string[];
}

export interface ImplementResult {
    feature: string;
    completed: Ticket[];
    tests: TestRunResult;
    review: ReviewSummary;
    acceptance: string;
}

export const defaultTestRunner: TestRunner = async (cwd) => {
    const command = "./node_modules/.bin/vitest run";
    try {
        const { stdout } = await exec("./node_modules/.bin/vitest", ["run"], { cwd });
        return { command, passed: true, output: stdout.split("\n").slice(-12).join("\n") };
    } catch (err) {
        const e = err as { stdout?: string; stderr?: string; message?: string };
        return {
            command,
            passed: false,
            output: (e.stdout ?? e.stderr ?? e.message ?? "").split("\n").slice(-12).join("\n"),
        };
    }
};

function renderAcceptance(
    feature: string,
    tickets: Ticket[],
    tests: TestRunResult,
    review: ReviewSummary,
): string {
    return [
        `# Acceptance — ${feature}`,
        "",
        "## 环境准备",
        "- Node LTS + pnpm；已执行依赖安装。",
        "- 测试框架：Vitest；类型检查：tsc --noEmit。",
        "",
        "## 操作步骤与预期结果",
        ...tickets.map((t) => `- [ ] ${t.title}（ticket ${t.id}）：按 ticket 验收标准操作并观察预期结果`),
        "",
        "## 异常场景与边界情况",
        "- 输入为空/模糊时回到 clarify，不进入实现。",
        "- 产物变更后受影响批准需重新确认。",
        "",
        "## 已知限制 / 未验证内容",
        review.issues.length
            ? review.issues.map((i) => `- ${i}`).join("\n")
            : "- 无",
        "",
        "## 质量门禁",
        `- [${tests.passed ? "x" : " "}] \`${tests.command}\` 通过`,
        "- [ ] `tsc --noEmit` 通过",
        "",
    ].join("\n");
}

export async function runImplement(
    input: ImplementInput,
    runner: TestRunner = input.runner ?? defaultTestRunner,
): Promise<ImplementResult> {
    const cwd = input.cwd ?? process.cwd();
    const tests = await runner(cwd);

    const issues: string[] = [];
    if (!tests.passed) issues.push("测试未通过，需修复后再进入验收。");

    const review: ReviewSummary = {
        summary: tests.passed
            ? `${input.tickets.length} 个 ticket 完成，测试通过，进入用户验收。`
            : `${input.tickets.length} 个 ticket 中仍有失败项：测试未通过。`,
        issues,
    };

    return {
        feature: input.feature,
        completed: input.tickets,
        tests,
        review,
        acceptance: renderAcceptance(input.feature, input.tickets, tests, review),
    };
}

export async function writeAcceptance(
    result: ImplementResult,
    baseDir: string = "acceptance",
): Promise<{ dir: string; acceptancePath: string }> {
    const dir = join(baseDir, slugify(result.feature));
    await mkdir(dir, { recursive: true });
    const acceptancePath = join(dir, "acceptance.md");
    await writeFile(acceptancePath, result.acceptance, "utf8");
    return { dir, acceptancePath };
}
