import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, rm, writeFile, mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { loadState, saveState } from "./state";
import { WorkflowState, INITIAL_WORKFLOW_STATE } from "./workflow";

let dir: string;
let path: string;

beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), "easy-codex-state-"));
    path = join(dir, "workflow.json");
});

afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
});

describe("workflow state persistence", () => {
    it("returns the initial state when nothing was saved", async () => {
        const state = await loadState(path);
        expect(state.currentPhase).toBe(INITIAL_WORKFLOW_STATE.currentPhase);
        expect(state.approvedAt).toEqual({});
    });

    it("round-trips a saved state", async () => {
        const saved: WorkflowState = {
            currentPhase: "tickets",
            approvedAt: { clarify: "2026-01-01T00:00:00.000Z" },
            createdAt: "2026-01-01T00:00:00.000Z",
            updatedAt: "2026-01-02T00:00:00.000Z",
        };
        await saveState(saved, path);
        expect(await loadState(path)).toEqual(saved);
    });

    it("creates parent directories when saving", async () => {
        const nested = join(dir, "a", "b", "workflow.json");
        await saveState(INITIAL_WORKFLOW_STATE, nested);
        expect((await loadState(nested)).currentPhase).toBe("clarify");
    });

    it("recovers the initial state from a malformed file", async () => {
        await mkdir(dir, { recursive: true });
        await writeFile(path, "{not json", "utf8");
        expect((await loadState(path)).currentPhase).toBe("clarify");
    });
});
