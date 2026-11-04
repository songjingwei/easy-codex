import { dirname } from "node:path";
import { writeArtifact } from "./artifacts.js";
import { ClarifyResult } from "./clarify.js";

/**
 * Phase 2 — spec (`to-spec`).
 *
 * Turns an approved clarification into a PRD plus an executable spec:
 * behaviour rules, edge cases, and acceptance criteria.
 * Artifacts land in `specs/<feature>/prd.md` and `specs/<feature>/spec.md`.
 */

export interface SpecInput {
    feature: string;
    clarify: ClarifyResult;
}

export interface SpecResult {
    feature: string;
    prd: string;
    spec: string;
}

export type SpecGenerator = (input: SpecInput) => SpecResult;

export function slugify(feature: string): string {
    const slug = feature
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9\u4e00-\u9fff]+/g, "-")
        .replace(/^-+|-+$/g, "");
    return slug || "feature";
}

function numbered(items: string[], fallback: string): string {
    if (items.length === 0) return `1. ${fallback}`;
    return items.map((item, i) => `${i + 1}. ${item}`).join("\n");
}

export const defaultSpecGenerator: SpecGenerator = ({ feature, clarify }) => {
    const scenarios = clarify.scenarios.length
        ? clarify.scenarios
        : [`输入一句需求「${clarify.requirement}」，进入七阶段工作流`];
    const scope = clarify.scope.length ? clarify.scope : ["按澄清确认的范围执行"];
    const nonGoals = clarify.nonGoals.length ? clarify.nonGoals : ["不在本次范围内的能力另行开单"];

    const prd = [
        `# PRD — ${feature}`,
        "",
        "## Problem Statement",
        clarify.requirement,
        "",
        "## Goal",
        clarify.goal,
        "",
        "## User Stories",
        numbered(scenarios, "开发者输入需求并得到可验收的功能"),
        "",
        "## Scope",
        numbered(scope, "本次范围以澄清结果为准"),
        "",
        "## Non-Goals",
        numbered(nonGoals, "超出澄清范围的变更不进入本次实现"),
        "",
    ].join("\n");

    const spec = [
        `# Executable Spec — ${feature}`,
        "",
        `来源：${clarify.requirement}`,
        "",
        "## Behaviour rules",
        scenarios.map((s, i) => `- BR-${i + 1}: ${s}`).join("\n"),
        "",
        "## Edge cases",
        "- 输入为空或模糊时，回到 clarify 阶段补充问题，不进入实现。",
        "- 产物与已批准版本冲突时，标记受影响批准并重新询问确认。",
        "- 进程中断后，从 SQLite 检查点恢复，不重放已完成副作用。",
        "",
        "## Acceptance criteria",
        scenarios
            .map((s, i) => `- [ ] AC-${i + 1}: ${s} 可被验证`)
            .join("\n"),
        "",
        "## Open questions",
        clarify.openQuestions.length
            ? clarify.openQuestions.map((q) => `- ${q}`).join("\n")
            : "- 无",
        "",
    ].join("\n");

    return { feature, prd, spec };
};

export function runSpec(
    input: SpecInput,
    generate: SpecGenerator = defaultSpecGenerator,
): SpecResult {
    return generate(input);
}

export interface WrittenSpec {
    dir: string;
    prdPath: string;
    specPath: string;
}

export async function writeSpec(
    result: SpecResult,
    baseDir: string = "specs",
): Promise<WrittenSpec> {
    const prdPath = await writeArtifact(baseDir, result.feature, "prd.md", result.prd);
    const specPath = await writeArtifact(baseDir, result.feature, "spec.md", result.spec);
    return { dir: dirname(prdPath), prdPath, specPath };
}
