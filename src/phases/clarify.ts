import { readFile } from "node:fs/promises";

/**
 * Phase 1 — clarify (`grill-with-docs`).
 *
 * Input: one requirement sentence plus the project's own documents.
 * Output: goal / usage scenarios / scope / non-goals / open questions.
 *
 * The `docs` context is what makes the interrogation "with docs": questions are
 * informed by material the project already recorded. An LLM can be plugged in
 * at `ClarifyGenerator`; the default generator is deterministic so the phase is
 * testable offline.
 */

export interface DocReference {
    path: string;
    content: string;
}

export interface ClarifyInput {
    requirement: string;
    docs?: DocReference[];
}

export interface ClarifyResult {
    requirement: string;
    goal: string;
    scenarios: string[];
    scope: string[];
    nonGoals: string[];
    openQuestions: string[];
    docsUsed: string[];
}

export type ClarifyGenerator = (input: ClarifyInput) => ClarifyResult;

export const DEFAULT_PROJECT_DOCS = ["AGENTS.md", "docs/SPEC.md", "README.md"];

export async function loadProjectDocs(
    paths: string[] = DEFAULT_PROJECT_DOCS,
): Promise<DocReference[]> {
    const docs: DocReference[] = [];
    for (const path of paths) {
        try {
            docs.push({ path, content: await readFile(path, "utf8") });
        } catch (err) {
            if ((err as NodeJS.ErrnoException).code !== "ENOENT") throw err;
        }
    }
    return docs;
}

const STOP_WORDS = new Set([
    "the", "a", "an", "and", "or", "of", "to", "in", "for", "on", "with",
    "我", "的", "了", "和", "与", "在", "是", "一个", "需求", "功能",
]);

export function keywords(text: string): string[] {
    const latin = text.toLowerCase().match(/[a-z0-9][a-z0-9_-]+/g) ?? [];
    const cjk = text.match(/[\u4e00-\u9fff]{2,}/g) ?? [];
    const raw = [...latin, ...cjk];
    return [...new Set(raw)].filter((w) => !STOP_WORDS.has(w));
}

/** Docs whose vocabulary overlaps the requirement are the ones cited back. */
export function selectDocs(requirement: string, docs: DocReference[]): DocReference[] {
    const words = keywords(requirement);
    if (words.length === 0) return [];
    return docs.filter((doc) => {
        const haystack = doc.content.toLowerCase();
        return words.some((w) => haystack.includes(w));
    });
}

function sentences(text: string): string[] {
    return text
        .split(/[。；;！!？?\n]/)
        .map((s) => s.trim())
        .filter(Boolean);
}

function pickByKeywords(text: string, markers: string[]): string[] {
    return sentences(text).filter((s) => markers.some((m) => s.includes(m)));
}

export const DEFAULT_OPEN_QUESTIONS = [
    "目标使用场景有哪些？",
    "本次范围（scope）包含哪些内容？",
    "非目标（non-goals）有哪些？",
    "还有哪些待决问题（open questions）需要确认？",
];

export const defaultClarifyGenerator: ClarifyGenerator = (input) => {
    const focusDocs = selectDocs(input.requirement, input.docs ?? []);
    const scope = pickByKeywords(input.requirement, ["范围", "包含", "scope", "include"]);
    const nonGoals = pickByKeywords(input.requirement, ["非目标", "不包含", "除外", "out of scope", "exclude"]);
    const scenarios = pickByKeywords(input.requirement, ["场景", "作为", "scenario", "as a"]);

    const openQuestions: string[] = [];
    if (scenarios.length === 0) openQuestions.push(DEFAULT_OPEN_QUESTIONS[0]);
    if (scope.length === 0) openQuestions.push(DEFAULT_OPEN_QUESTIONS[1]);
    if (nonGoals.length === 0) openQuestions.push(DEFAULT_OPEN_QUESTIONS[2]);
    openQuestions.push(DEFAULT_OPEN_QUESTIONS[3]);

    return {
        requirement: input.requirement.trim(),
        goal: input.requirement.trim(),
        scenarios,
        scope,
        nonGoals,
        openQuestions,
        docsUsed: focusDocs.map((d) => d.path),
    };
};

export function runClarify(
    input: ClarifyInput,
    generate: ClarifyGenerator = defaultClarifyGenerator,
): ClarifyResult {
    return generate(input);
}

export interface ClarifyAnswers {
    goal?: string;
    scenarios?: string[];
    scope?: string[];
    nonGoals?: string[];
    openQuestions?: string[];
}

/** Merge user answers back in — the iterative feedback loop of the phase. */
export function applyClarifyAnswers(
    result: ClarifyResult,
    answers: ClarifyAnswers,
): ClarifyResult {
    const goal = answers.goal ?? result.goal;
    const scenarios = answers.scenarios ?? result.scenarios;
    const scope = answers.scope ?? result.scope;
    const nonGoals = answers.nonGoals ?? result.nonGoals;

    const remaining = DEFAULT_OPEN_QUESTIONS.filter((q) => {
        if (q === DEFAULT_OPEN_QUESTIONS[0]) return scenarios.length === 0;
        if (q === DEFAULT_OPEN_QUESTIONS[1]) return scope.length === 0;
        if (q === DEFAULT_OPEN_QUESTIONS[2]) return nonGoals.length === 0;
        return true;
    });

    return {
        ...result,
        goal,
        scenarios,
        scope,
        nonGoals,
        openQuestions: answers.openQuestions ?? remaining,
    };
}
