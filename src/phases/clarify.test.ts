import { describe, it, expect } from "vitest";
import {
    DocReference,
    keywords,
    selectDocs,
    runClarify,
    applyClarifyAnswers,
    remainingQuestions,
    DEFAULT_OPEN_QUESTIONS,
} from "./clarify";

const docs: DocReference[] = [
    { path: "AGENTS.md", content: "easy-codex builds a development agent with a workflow。" },
    { path: "docs/SPEC.md", content: "持久化底座使用 SQLite，产物与 Git 版本绑定。" },
];

describe("keywords", () => {
    it("extracts latin and CJK keywords and drops stop words", () => {
        const words = keywords("构建基于 Pi Durable 的 workflow agent");
        expect(words).toContain("pi");
        expect(words).toContain("workflow");
        expect(words).toContain("构建基于");
        expect(words).not.toContain("的");
    });
});

describe("selectDocs", () => {
    it("selects docs whose vocabulary overlaps the requirement", () => {
        const selected = selectDocs("希望 workflow 可恢复", docs);
        expect(selected.map((d) => d.path)).toEqual(["AGENTS.md"]);
    });

    it("selects nothing for an unrelated requirement", () => {
        expect(selectDocs("银行卡密码重置", docs)).toEqual([]);
    });
});

describe("runClarify", () => {
    it("returns the requirement as the working goal", () => {
        const result = runClarify({ requirement: "做一个可恢复的开发 Agent", docs });
        expect(result.goal).toBe("做一个可恢复的开发 Agent");
        expect(result.requirement).toBe("做一个可恢复的开发 Agent");
    });

    it("cites the project docs used for interrogation", () => {
        const result = runClarify({ requirement: "workflow 要能持久化", docs });
        expect(result.docsUsed).toContain("AGENTS.md");
    });

    it("asks about missing scenarios/scope/non-goals", () => {
        const result = runClarify({ requirement: "做一个 Agent", docs: [] });
        expect(result.openQuestions).toContain(DEFAULT_OPEN_QUESTIONS[0]);
        expect(result.openQuestions).toContain(DEFAULT_OPEN_QUESTIONS[1]);
        expect(result.openQuestions).toContain(DEFAULT_OPEN_QUESTIONS[2]);
    });

    it("does not ask what the requirement already states", () => {
        const result = runClarify({
            requirement:
                "场景：开发者输入需求。范围包含七个阶段。非目标：不做多租户。",
            docs: [],
        });
        expect(result.scenarios).toHaveLength(1);
        expect(result.scope).toHaveLength(1);
        expect(result.nonGoals).toHaveLength(1);
        expect(result.openQuestions).not.toContain(DEFAULT_OPEN_QUESTIONS[0]);
        expect(result.openQuestions).not.toContain(DEFAULT_OPEN_QUESTIONS[1]);
        expect(result.openQuestions).not.toContain(DEFAULT_OPEN_QUESTIONS[2]);
    });

    it("accepts an injected generator (LLM seam)", () => {
        const result = runClarify(
            { requirement: "x", docs: [] },
            (input) => ({
                requirement: input.requirement,
                goal: "custom goal",
                scenarios: [],
                scope: [],
                nonGoals: [],
                openQuestions: [],
                docsUsed: [],
            }),
        );
        expect(result.goal).toBe("custom goal");
    });
});

describe("remainingQuestions", () => {
    it("asks for every unanswered field plus the catch-all question", () => {
        expect(
            remainingQuestions({ scenarios: [], scope: [], nonGoals: [] }),
        ).toEqual(DEFAULT_OPEN_QUESTIONS);
    });

    it("keeps only the catch-all question once fields are answered", () => {
        expect(
            remainingQuestions({ scenarios: ["s"], scope: ["s"], nonGoals: ["s"] }),
        ).toEqual([DEFAULT_OPEN_QUESTIONS[3]]);
    });
});

describe("applyClarifyAnswers", () => {
    it("merges answers and clears resolved questions", () => {
        const base = runClarify({ requirement: "做一个 Agent", docs: [] });
        const after = applyClarifyAnswers(base, {
            scenarios: ["开发者输入一句需求"],
            scope: ["七阶段工作流"],
            nonGoals: ["不做多租户"],
        });
        expect(after.scenarios).toEqual(["开发者输入一句需求"]);
        expect(after.openQuestions).not.toContain(DEFAULT_OPEN_QUESTIONS[0]);
        expect(after.openQuestions).not.toContain(DEFAULT_OPEN_QUESTIONS[1]);
        expect(after.openQuestions).not.toContain(DEFAULT_OPEN_QUESTIONS[2]);
    });

    it("keeps unresolved questions open", () => {
        const base = runClarify({ requirement: "做一个 Agent", docs: [] });
        const after = applyClarifyAnswers(base, {});
        expect(after.openQuestions).toContain(DEFAULT_OPEN_QUESTIONS[0]);
    });

    it("can override the open question list wholesale", () => {
        const base = runClarify({ requirement: "做一个 Agent", docs: [] });
        const after = applyClarifyAnswers(base, { openQuestions: ["只剩这一个"] });
        expect(after.openQuestions).toEqual(["只剩这一个"]);
    });
});
