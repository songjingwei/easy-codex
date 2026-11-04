import { dirname } from "node:path";
import { writeArtifact } from "./artifacts.js";
import { SpecResult } from "./spec.js";

/**
 * Phase 3 — design.
 *
 * Produces a reviewable design artifact before implementation. The Spec makes
 * Impeccable mandatory for UI changes; when this project has the `impeccable`
 * skill available, `impeccableRequired` marks the artifact that must pass it.
 */

export interface DesignInput {
    feature: string;
    spec: SpecResult;
    uiChange: boolean;
}

export interface DesignResult {
    feature: string;
    design: string;
    impeccableRequired: boolean;
    notes: string[];
}

export type DesignGenerator = (input: DesignInput) => DesignResult;

export const IMPECCABLE_NOTE =
    "UI 变更必须经过 Impeccable（设计阶段强制检查）后再进入实现。";

export const defaultDesignGenerator: DesignGenerator = ({ feature, spec, uiChange }) => {
    const notes: string[] = [];
    if (uiChange) notes.push(IMPECCABLE_NOTE);

    const design = [
        `# Design — ${feature}`,
        "",
        "## Purpose",
        `支撑可执行规格：${spec.feature}`,
        "",
        "## Interfaces",
        "- 阶段入口/出口以 src/phases/*.ts 的函数签名为准。",
        "- 产物落盘位置见 docs/DIRECTORY_STRUCTURE.md。",
        "",
        "## User flows",
        "- 输入需求 → 澄清 → PRD/Spec → 设计 → Tickets → 实现 → 验收 → Retro。",
        "",
        "## States",
        "- 每个阶段有 pending / in-progress / awaiting-approval / approved 四态。",
        "",
        "## UI / interaction",
        uiChange
            ? "- 存在 UI 变更：交互稿、状态与空态需在设计产物中逐项 review。"
            : "- 无 UI 变更，不需要 Impeccable 检查。",
        "",
        "## Review checklist",
        "- [ ] 设计与已批准的 Spec 一致",
        "- [ ] 边界情况在设计中可见",
        uiChange ? "- [ ] 已通过 Impeccable 检查" : "- [x] 无需 Impeccable",
        "",
    ].join("\n");

    return { feature, design, impeccableRequired: uiChange, notes };
};

export function runDesign(
    input: DesignInput,
    generate: DesignGenerator = defaultDesignGenerator,
): DesignResult {
    return generate(input);
}

export interface WrittenDesign {
    dir: string;
    designPath: string;
}

export async function writeDesign(
    result: DesignResult,
    baseDir: string = "specs",
): Promise<WrittenDesign> {
    const designPath = await writeArtifact(baseDir, result.feature, "design.md", result.design);
    return { dir: dirname(designPath), designPath };
}
