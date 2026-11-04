import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { slugify } from "./spec";
import { ImplementResult } from "./implement";

/**
 * Phase 7 — retro (`retro` + `code-review`).
 *
 * After acceptance: a review of what was delivered and a retrospective with
 * concrete follow-up actions. Artifacts land in
 * `specs/<feature>/review.md` and `specs/<feature>/retro.md`.
 */

export interface RetroInput {
    feature: string;
    implement: ImplementResult;
    reviewNotes?: string[];
    retroNotes?: string[];
}

export interface RetroResult {
    feature: string;
    review: string;
    retro: string;
}

export type RetroGenerator = (input: RetroInput) => RetroResult;

export const defaultRetroGenerator: RetroGenerator = ({
    feature,
    implement,
    reviewNotes = [],
    retroNotes = [],
}) => {
    const review = [
        `# Review — ${feature}`,
        "",
        "## Delivered",
        ...implement.completed.map((t) => `- Ticket ${t.id}: ${t.title}`),
        "",
        "## Test status",
        `- ${implement.tests.command}: ${implement.tests.passed ? "passed" : "FAILED"}`,
        "",
        "## Risks / notes",
        ...(reviewNotes.length ? reviewNotes.map((n) => `- ${n}`) : ["- 无"]),
        "",
    ].join("\n");

    const retro = [
        `# Retro — ${feature}`,
        "",
        "## What went well",
        "- 七阶段产物齐全，批准与 Git 提交绑定，可追溯。",
        "",
        "## What to improve",
        ...(implement.review.issues.length
            ? implement.review.issues.map((i) => `- ${i}`)
            : ["- 无阻塞项"]),
        "",
        "## Actions",
        ...(retroNotes.length ? retroNotes.map((n) => `- ${n}`) : ["- 保持当前节奏"]),
        "",
    ].join("\n");

    return { feature, review, retro };
};

export function runRetro(
    input: RetroInput,
    generate: RetroGenerator = defaultRetroGenerator,
): RetroResult {
    return generate(input);
}

export async function writeRetro(
    result: RetroResult,
    baseDir: string = "specs",
): Promise<{ dir: string; reviewPath: string; retroPath: string }> {
    const dir = join(baseDir, slugify(result.feature));
    await mkdir(dir, { recursive: true });
    const reviewPath = join(dir, "review.md");
    const retroPath = join(dir, "retro.md");
    await writeFile(reviewPath, result.review, "utf8");
    await writeFile(retroPath, result.retro, "utf8");
    return { dir, reviewPath, retroPath };
}
