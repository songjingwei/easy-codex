import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { INITIAL_WORKFLOW_STATE, WorkflowState } from "./workflow";

/**
 * Recoverable workflow state (User story 8): persisted next to the durable
 * session in `.easy-codex/`, reopened after a process restart.
 */

export const STATE_PATH = ".easy-codex/workflow.json";

export async function loadState(path: string = STATE_PATH): Promise<WorkflowState> {
    try {
        const raw = await readFile(path, "utf8");
        const parsed = JSON.parse(raw) as Partial<WorkflowState>;
        if (!parsed.currentPhase) return { ...INITIAL_WORKFLOW_STATE };
        return {
            currentPhase: parsed.currentPhase,
            approvedAt: parsed.approvedAt ?? {},
            createdAt: parsed.createdAt ?? new Date().toISOString(),
            updatedAt: parsed.updatedAt ?? new Date().toISOString(),
        };
    } catch (err) {
        if (
            (err as NodeJS.ErrnoException).code === "ENOENT" ||
            err instanceof SyntaxError
        ) {
            return { ...INITIAL_WORKFLOW_STATE };
        }
        throw err;
    }
}

export async function saveState(
    state: WorkflowState,
    path: string = STATE_PATH,
): Promise<void> {
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, JSON.stringify(state, null, 2), "utf8");
}
