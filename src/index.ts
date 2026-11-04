import { BACKGROUND_CONTEXT } from "@earendil-works/chord/context";
import { createHarness } from "./harness";
import {
    Phase,
    PHASE_ORDER,
    advancePhase,
    nextPhase,
    recordApproval,
    WorkflowState,
} from "./workflow";
import { loadState, saveState } from "./state";
import {
    ClarifyResult,
    DocReference,
    loadProjectDocs,
    runClarify,
} from "./phases/clarify";

/**
 * CLI / Web entry (D2). `pnpm run dev` starts here:
 *   - initializes the Pi Durable harness (SQLite session persistence)
 *   - enters the seven-phase workflow at `clarify`
 *   - resumes from the persisted checkpoint after a restart (User story 8)
 */

export interface CliDeps {
    initHarness?: () => Promise<unknown>;
    loadStateFn?: (path?: string) => Promise<WorkflowState>;
    saveStateFn?: (state: WorkflowState, path?: string) => Promise<void>;
    loadDocs?: () => Promise<DocReference[]>;
    statePath?: string;
}

export interface CliResult {
    output: string;
    state: WorkflowState;
    clarify?: ClarifyResult;
}

export const USAGE = [
    "easy-codex — 从一句需求，到经过审查和验收的功能。",
    "",
    "用法:",
    '  pnpm run dev "你的需求"          进入 clarify 阶段',
    "  pnpm run dev --status            查看当前阶段与批准记录",
    "  pnpm run dev --approve <phase>   记录阶段批准并推进到下一阶段",
    "",
    `阶段顺序: ${PHASE_ORDER.join(" → ")}`,
].join("\n");

function statusText(state: WorkflowState): string {
    const approvals = Object.entries(state.approvedAt ?? {});
    return [
        `当前阶段: ${state.currentPhase}`,
        `已批准: ${approvals.length ? approvals.map(([p, t]) => `${p}@${t}`).join(", ") : "无"}`,
        `最后更新: ${state.updatedAt}`,
    ].join("\n");
}

function clarifyText(clarify: ClarifyResult, state: WorkflowState): string {
    const list = (items: string[], empty: string) =>
        items.length ? items.map((i) => `  - ${i}`).join("\n") : `  - ${empty}`;
    return [
        `需求: ${clarify.requirement}`,
        "",
        "## Goal",
        `  ${clarify.goal}`,
        "",
        "## 已识别使用场景",
        list(clarify.scenarios, "（待澄清）"),
        "",
        "## 范围",
        list(clarify.scope, "（待澄清）"),
        "",
        "## 非目标",
        list(clarify.nonGoals, "（待澄清）"),
        "",
        "## 待决问题（需人工回答）",
        list(clarify.openQuestions, "无"),
        "",
        "## 参考的项目文档",
        list(clarify.docsUsed, "（无匹配文档）"),
        "",
        `当前阶段: ${state.currentPhase}。回答完待决问题后运行: pnpm run dev --approve clarify`,
    ].join("\n");
}

export async function runCli(argv: string[], deps: CliDeps = {}): Promise<CliResult> {
    const initHarness = deps.initHarness ?? (async () => createHarness());
    const load = deps.loadStateFn ?? loadState;
    const save = deps.saveStateFn ?? saveState;
    const statePath = deps.statePath;

    await initHarness();
    let state = await load(statePath);

    if (argv.includes("--status")) {
        return { output: statusText(state), state };
    }

    const approveIndex = argv.indexOf("--approve");
    if (approveIndex >= 0) {
        const phase = argv[approveIndex + 1] as Phase | undefined;
        if (!phase || !PHASE_ORDER.includes(phase)) {
            throw new Error(
                `未知阶段: ${phase ?? "(缺少参数)"}；可选: ${PHASE_ORDER.join(", ")}`,
            );
        }
        const approved = recordApproval(state, phase);
        const next = nextPhase(phase);
        state = next ? advancePhase(approved, next) : approved;
        await save(state, statePath);
        return {
            output: `已批准 ${phase} → 当前阶段: ${state.currentPhase}`,
            state,
        };
    }

    const requirement = argv
        .filter((a) => !a.startsWith("--"))
        .join(" ")
        .trim();
    if (!requirement) {
        return { output: USAGE, state };
    }

    const docs = deps.loadDocs ? await deps.loadDocs() : await loadProjectDocs();
    const clarify = runClarify({ requirement, docs });
    await save(state, statePath);
    return { output: clarifyText(clarify, state), state, clarify };
}

async function main(): Promise<void> {
    const { output } = await runCli(process.argv.slice(2));
    console.log(output);
}

const isDirectRun =
    process.argv[1] !== undefined &&
    import.meta.url === new URL(`file://${process.argv[1]}`).href;

if (isDirectRun) {
    main().catch((err) => {
        console.error("easy-codex failed:", err);
        process.exit(1);
    });
}
