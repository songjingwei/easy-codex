import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, rm, readFile, readdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runTickets, writeTickets } from "./tickets";
import { runSpec } from "./spec";
import { ClarifyResult } from "./clarify";

const clarify: ClarifyResult = {
    requirement: "做一个可恢复的开发 Agent",
    goal: "将七阶段串成可恢复工作流",
    scenarios: ["开发者输入一句需求", "开发者确认产物版本", "进程退出后可恢复"],
    scope: ["七阶段状态机"],
    nonGoals: ["不做多租户"],
    openQuestions: [],
    docsUsed: [],
};

const spec = runSpec({ feature: "Easy Codex", clarify });

describe("runTickets", () => {
    it("creates one ticket per acceptance criterion", () => {
        const result = runTickets({ feature: "Easy Codex", spec });
        const acCount = spec.spec
            .split("\n")
            .filter((l) => l.trim().startsWith("- [ ] AC-")).length;
        expect(result.tickets).toHaveLength(acCount);
    });

    it("numbers tickets and orders slugs", () => {
        const { tickets } = runTickets({ feature: "Easy Codex", spec });
        expect(tickets[0].id).toBe("01");
        expect(tickets[1].id).toBe("02");
        expect(tickets[0].slug.length).toBeGreaterThan(0);
    });

    it("chains dependencies as tracer bullets", () => {
        const { tickets } = runTickets({ feature: "Easy Codex", spec });
        expect(tickets[0].dependsOn).toEqual([]);
        expect(tickets[1].dependsOn).toEqual(["01"]);
        expect(tickets[tickets.length - 1].dependsOn).toEqual([
            String(tickets.length - 1).padStart(2, "0"),
        ]);
    });

    it("records feature and dependency info in the body", () => {
        const { tickets } = runTickets({ feature: "Easy Codex", spec });
        expect(tickets[0].body).toContain("Feature: Easy Codex");
        expect(tickets[0].body).toContain("Depends on: 无");
        expect(tickets[1].body).toContain("Depends on: #01");
    });

    it("falls back to a single ticket when the spec has no AC lines", () => {
        const emptySpec = { feature: "X", prd: "P", spec: "# S\n" };
        const { tickets } = runTickets({ feature: "X", spec: emptySpec });
        expect(tickets).toHaveLength(1);
        expect(tickets[0].body).toContain("实现并验证已批准的 Spec 行为规则");
    });

    it("accepts an injected generator (LLM seam)", () => {
        const result = runTickets(
            { feature: "X", spec },
            () => ({ feature: "X", tickets: [] }),
        );
        expect(result.tickets).toEqual([]);
    });
});

describe("writeTickets", () => {
    let dir: string;

    beforeEach(async () => {
        dir = await mkdtemp(join(tmpdir(), "easy-codex-tickets-"));
    });

    afterEach(async () => {
        await rm(dir, { recursive: true, force: true });
    });

    it("writes numbered ticket files under tickets/<slug>/", async () => {
        const result = runTickets({ feature: "Easy Codex", spec });
        const paths = await writeTickets(result, dir);
        expect(paths.length).toBe(result.tickets.length);
        const files = (await readdir(join(dir, "easy-codex"))).sort();
        expect(files[0]).toMatch(/^01-/);
        expect(await readFile(paths[0], "utf8")).toContain("## Acceptance");
    });
});
