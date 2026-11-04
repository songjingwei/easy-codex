import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { SpecResult, slugify } from "./spec.js";

/**
 * Phase 4 — tickets (`to-tickets`).
 *
 * Turns the approved spec/design into trackable tickets with explicit
 * dependency ordering (tracer bullets). Artifacts land in
 * `tickets/<feature>/01-<slug>.md`, `02-<slug>.md`, …
 */

export interface Ticket {
    id: string;
    slug: string;
    title: string;
    dependsOn: string[];
    body: string;
}

export interface TicketsInput {
    feature: string;
    spec: SpecResult;
    design?: { design: string };
}

export interface TicketsResult {
    feature: string;
    tickets: Ticket[];
}

export type TicketsGenerator = (input: TicketsInput) => TicketsResult;

function acceptanceItems(spec: SpecResult): string[] {
    const lines = spec.spec
        .split("\n")
        .map((l) => l.trim())
        .filter((l) => l.startsWith("- [ ] AC-"));
    if (lines.length === 0) {
        return ["实现并验证已批准的 Spec 行为规则"];
    }
    return lines.map((l) => l.replace(/^- \[ \] /, ""));
}

function titleFor(item: string): string {
    const text = item.replace(/^AC-\d+:\s*/, "").trim();
    return text.length > 60 ? `${text.slice(0, 57)}…` : text;
}

export const defaultTicketsGenerator: TicketsGenerator = ({ feature, spec }) => {
    const items = acceptanceItems(spec);
    const tickets: Ticket[] = items.map((item, i) => {
        const n = String(i + 1).padStart(2, "0");
        const slug = slugify(titleFor(item));
        const id = n;
        const dependsOn = i === 0 ? [] : [String(i).padStart(2, "0")];
        const body = [
            `# Ticket ${n} — ${titleFor(item)}`,
            "",
            `Feature: ${feature}`,
            `Depends on: ${dependsOn.length ? dependsOn.map((d) => `#${d}`).join(", ") : "无"}`,
            "",
            "## Scope",
            `- ${item}`,
            "",
            "## Acceptance",
            `- [ ] ${item}`,
            "- [ ] `tsc --noEmit` 通过",
            "- [ ] `vitest run` 通过",
            "",
        ].join("\n");
        return { id, slug, title: titleFor(item), dependsOn, body };
    });
    return { feature, tickets };
};

export function runTickets(
    input: TicketsInput,
    generate: TicketsGenerator = defaultTicketsGenerator,
): TicketsResult {
    return generate(input);
}

export async function writeTickets(
    result: TicketsResult,
    baseDir: string = "tickets",
): Promise<string[]> {
    const dir = join(baseDir, slugify(result.feature));
    await mkdir(dir, { recursive: true });
    const paths: string[] = [];
    for (const ticket of result.tickets) {
        const path = join(dir, `${ticket.id}-${ticket.slug}.md`);
        await writeFile(path, ticket.body, "utf8");
        paths.push(path);
    }
    return paths;
}
