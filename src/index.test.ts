import { describe, it, expect, vi } from "vitest";
import { runCli, USAGE, CliDeps } from "./index";
import { INITIAL_WORKFLOW_STATE, WorkflowState } from "./workflow";
import { DocReference } from "./phases/clarify";

const noopHarness = async () => ({});

function deps(overrides: Partial<CliDeps> = {}): CliDeps {
    return {
        initHarness: noopHarness,
        loadStateFn: async () => ({ ...INITIAL_WORKFLOW_STATE, approvedAt: {} }),
        saveStateFn: async () => {},
        loadDocs: async () => [],
        ...overrides,
    };
}

describe("runCli", () => {
    it("prints usage when no requirement is given", async () => {
        const { output } = await runCli([], deps());
        expect(output).toBe(USAGE);
    });

    it("initializes the durable harness", async () => {
        const initHarness = vi.fn(noopHarness);
        await runCli([], deps({ initHarness }));
        expect(initHarness).toHaveBeenCalledOnce();
    });

    it("enters clarify for a requirement and shows questions", async () => {
        const { output, clarify, state } = await runCli(
            ["做一个可恢复的开发 Agent"],
            deps(),
        );
        expect(clarify?.goal).toBe("做一个可恢复的开发 Agent");
        expect(output).toContain("## 待决问题（需人工回答）");
        expect(state.currentPhase).toBe("clarify");
    });

    it("cites project docs in the clarification", async () => {
        const docs: DocReference[] = [
            { path: "AGENTS.md", content: "workflow is recoverable" },
        ];
        const { clarify } = await runCli(["workflow 可恢复"], deps({ loadDocs: async () => docs }));
        expect(clarify?.docsUsed).toContain("AGENTS.md");
    });

    it("persists the workflow state", async () => {
        const saveStateFn = vi.fn(async () => {});
        await runCli(["一些需求"], deps({ saveStateFn }));
        expect(saveStateFn).toHaveBeenCalled();
    });

    it("reports status with the current phase and approvals", async () => {
        const state: WorkflowState = {
            ...INITIAL_WORKFLOW_STATE,
            currentPhase: "tickets",
            approvedAt: { clarify: "t1", spec: "t2", design: "t3" },
        };
        const { output } = await runCli(["--status"], deps({ loadStateFn: async () => state }));
        expect(output).toContain("当前阶段: tickets");
        expect(output).toContain("clarify@t1");
    });

    it("records approval and advances to the next phase", async () => {
        const saveStateFn = vi.fn(async () => {});
        const { output, state } = await runCli(
            ["--approve", "clarify"],
            deps({ saveStateFn }),
        );
        expect(state.currentPhase).toBe("spec");
        expect(state.approvedAt?.clarify).toBeDefined();
        expect(output).toContain("已批准 clarify");
        expect(saveStateFn).toHaveBeenCalledOnce();
    });

    it("stays on the final phase after approving retro", async () => {
        const state: WorkflowState = { ...INITIAL_WORKFLOW_STATE, currentPhase: "retro" };
        const { state: after } = await runCli(
            ["--approve", "retro"],
            deps({ loadStateFn: async () => state }),
        );
        expect(after.currentPhase).toBe("retro");
        expect(after.approvedAt?.retro).toBeDefined();
    });

    it("rejects unknown phases", async () => {
        await expect(runCli(["--approve", "nope"], deps())).rejects.toThrow(/未知阶段/);
    });

    it("resumes from a persisted checkpoint (User story 8)", async () => {
        const saved: WorkflowState = {
            ...INITIAL_WORKFLOW_STATE,
            currentPhase: "design",
            approvedAt: { clarify: "x", spec: "y" },
        };
        const { output } = await runCli(["--status"], deps({ loadStateFn: async () => saved }));
        expect(output).toContain("当前阶段: design");
    });
});
