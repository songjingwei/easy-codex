import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, rm, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { slugify, runSpec, writeSpec } from "./spec";
import { ClarifyResult } from "./clarify";

const clarify: ClarifyResult = {
    requirement: "做一个可恢复的开发 Agent",
    goal: "将七阶段串成可恢复工作流",
    scenarios: ["开发者输入一句需求", "开发者确认产物版本"],
    scope: ["七阶段状态机"],
    nonGoals: ["不做多租户"],
    openQuestions: [],
    docsUsed: ["AGENTS.md"],
};

describe("slugify", () => {
    it("slugs latin feature names", () => {
        expect(slugify("Recoverable Workflow")).toBe("recoverable-workflow");
    });

    it("keeps CJK characters", () => {
        expect(slugify("七阶段工作流")).toBe("七阶段工作流");
    });

    it("falls back when nothing remains", () => {
        expect(slugify("***")).toBe("feature");
    });
});

describe("runSpec", () => {
    it("produces a PRD with problem, goal, stories, scope and non-goals", () => {
        const { prd } = runSpec({ feature: "Easy Codex", clarify });
        expect(prd).toContain("## Problem Statement");
        expect(prd).toContain("做一个可恢复的开发 Agent");
        expect(prd).toContain("## User Stories");
        expect(prd).toContain("开发者输入一句需求");
        expect(prd).toContain("## Scope");
        expect(prd).toContain("## Non-Goals");
        expect(prd).toContain("不做多租户");
    });

    it("produces an executable spec with rules, edge cases and acceptance criteria", () => {
        const { spec } = runSpec({ feature: "Easy Codex", clarify });
        expect(spec).toContain("## Behaviour rules");
        expect(spec).toContain("BR-1");
        expect(spec).toContain("## Edge cases");
        expect(spec).toContain("## Acceptance criteria");
        expect(spec).toContain("AC-1");
    });

    it("provides fallback stories when clarification had none", () => {
        const bare: ClarifyResult = { ...clarify, scenarios: [], scope: [], nonGoals: [] };
        const { prd, spec } = runSpec({ feature: "Easy Codex", clarify: bare });
        expect(prd).toContain("输入一句需求「做一个可恢复的开发 Agent」，进入七阶段工作流");
        expect(prd).toContain("按澄清确认的范围执行");
        expect(spec).toContain("AC-1");
    });

    it("carries open questions into the spec", () => {
        const withQuestions: ClarifyResult = {
            ...clarify,
            openQuestions: ["非目标有哪些？"],
        };
        const { spec } = runSpec({ feature: "Easy Codex", clarify: withQuestions });
        expect(spec).toContain("非目标有哪些？");
    });

    it("accepts an injected generator (LLM seam)", () => {
        const result = runSpec(
            { feature: "Easy Codex", clarify },
            (input) => ({ feature: input.feature, prd: "P", spec: "S" }),
        );
        expect(result.prd).toBe("P");
    });
});

describe("writeSpec", () => {
    let dir: string;

    beforeEach(async () => {
        dir = await mkdtemp(join(tmpdir(), "easy-codex-spec-"));
    });

    afterEach(async () => {
        await rm(dir, { recursive: true, force: true });
    });

    it("writes prd.md and spec.md under specs/<slug>/", async () => {
        const result = runSpec({ feature: "Easy Codex", clarify });
        const written = await writeSpec(result, dir);
        expect(written.prdPath.endsWith(join("easy-codex", "prd.md"))).toBe(true);
        expect(written.specPath.endsWith(join("easy-codex", "spec.md"))).toBe(true);
        expect(await readFile(written.prdPath, "utf8")).toContain("Problem Statement");
        expect(await readFile(written.specPath, "utf8")).toContain("Acceptance criteria");
    });
});
