import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, rm, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runRetro, writeRetro } from "./retro";
import { ImplementResult } from "./implement";

const implement: ImplementResult = {
    feature: "Easy Codex",
    completed: [
        { id: "01", slug: "a", title: "第一个 ticket", dependsOn: [], body: "" },
        { id: "02", slug: "b", title: "第二个 ticket", dependsOn: ["01"], body: "" },
    ],
    tests: { command: "vitest run", passed: true },
    review: { summary: "ok", issues: [] },
    acceptance: "# Acceptance",
};

describe("runRetro", () => {
    it("lists delivered tickets in the review", () => {
        const { review } = runRetro({ feature: "Easy Codex", implement });
        expect(review).toContain("Ticket 01: 第一个 ticket");
        expect(review).toContain("Ticket 02: 第二个 ticket");
    });

    it("records test status", () => {
        const { review } = runRetro({ feature: "Easy Codex", implement });
        expect(review).toContain("vitest run: passed");
    });

    it("names the two-axis code review in the checklist", () => {
        const { review } = runRetro({ feature: "Easy Codex", implement });
        expect(review).toContain("## Review checklist");
        expect(review).toContain("- [ ] code-review 已完成（两轴：Standards / Spec）");
    });

    it("carries review issues into the retro", () => {
        const failing: ImplementResult = {
            ...implement,
            tests: { command: "vitest run", passed: false },
            review: { summary: "bad", issues: ["测试未通过，需修复后再进入验收。"] },
        };
        const { retro } = runRetro({ feature: "Easy Codex", implement: failing });
        expect(retro).toContain("测试未通过，需修复后再进入验收。");
    });

    it("includes explicit retro notes as actions", () => {
        const { retro } = runRetro({
            feature: "Easy Codex",
            implement,
            retroNotes: ["补充端到端用例"],
        });
        expect(retro).toContain("补充端到端用例");
    });

    it("accepts an injected generator (LLM seam)", () => {
        const result = runRetro(
            { feature: "Easy Codex", implement },
            (input) => ({ feature: input.feature, review: "R", retro: "T" }),
        );
        expect(result.review).toBe("R");
        expect(result.retro).toBe("T");
    });
});

describe("writeRetro", () => {
    let dir: string;

    beforeEach(async () => {
        dir = await mkdtemp(join(tmpdir(), "easy-codex-retro-"));
    });

    afterEach(async () => {
        await rm(dir, { recursive: true, force: true });
    });

    it("writes review.md and retro.md under specs/<slug>/", async () => {
        const result = runRetro({ feature: "Easy Codex", implement });
        const written = await writeRetro(result, dir);
        expect(written.reviewPath.endsWith(join("easy-codex", "review.md"))).toBe(true);
        expect(written.retroPath.endsWith(join("easy-codex", "retro.md"))).toBe(true);
        expect(await readFile(written.reviewPath, "utf8")).toContain("# Review — Easy Codex");
        expect(await readFile(written.retroPath, "utf8")).toContain("# Retro — Easy Codex");
    });
});
