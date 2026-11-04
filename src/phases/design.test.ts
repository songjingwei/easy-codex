import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, rm, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runDesign, writeDesign, IMPECCABLE_NOTE } from "./design";
import { runSpec } from "./spec";
import { ClarifyResult } from "./clarify";

const clarify: ClarifyResult = {
    requirement: "做一个可恢复的开发 Agent",
    goal: "将七阶段串成可恢复工作流",
    scenarios: ["开发者输入一句需求"],
    scope: ["七阶段状态机"],
    nonGoals: ["不做多租户"],
    openQuestions: [],
    docsUsed: [],
};

const spec = runSpec({ feature: "Easy Codex", clarify });

describe("runDesign", () => {
    it("flags impeccable as required for UI changes", () => {
        const result = runDesign({ feature: "Easy Codex", spec, uiChange: true });
        expect(result.impeccableRequired).toBe(true);
        expect(result.notes).toContain(IMPECCABLE_NOTE);
        expect(result.design).toContain("已通过 Impeccable 检查");
    });

    it("does not require impeccable without UI changes", () => {
        const result = runDesign({ feature: "Easy Codex", spec, uiChange: false });
        expect(result.impeccableRequired).toBe(false);
        expect(result.notes).toEqual([]);
        expect(result.design).toContain("无需 Impeccable");
    });

    it("embeds the feature reference in the design", () => {
        const result = runDesign({ feature: "Easy Codex", spec, uiChange: false });
        expect(result.design).toContain("# Design — Easy Codex");
        expect(result.design).toContain("支撑可执行规格：Easy Codex");
    });

    it("accepts an injected generator (LLM seam)", () => {
        const result = runDesign(
            { feature: "Easy Codex", spec, uiChange: false },
            (input) => ({
                feature: input.feature,
                design: "D",
                impeccableRequired: input.uiChange,
                notes: [],
            }),
        );
        expect(result.design).toBe("D");
    });
});

describe("writeDesign", () => {
    let dir: string;

    beforeEach(async () => {
        dir = await mkdtemp(join(tmpdir(), "easy-codex-design-"));
    });

    afterEach(async () => {
        await rm(dir, { recursive: true, force: true });
    });

    it("writes design.md under specs/<slug>/", async () => {
        const result = runDesign({ feature: "Easy Codex", spec, uiChange: true });
        const written = await writeDesign(result, dir);
        expect(written.designPath.endsWith(join("easy-codex", "design.md"))).toBe(true);
        expect(await readFile(written.designPath, "utf8")).toContain("Review checklist");
    });
});
