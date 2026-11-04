import { describe, it, expect, vi, afterEach } from "vitest";
import {
    Phase,
    INITIAL_WORKFLOW_STATE,
    advancePhase,
    recordApproval,
} from "./workflow";

afterEach(() => {
    vi.useRealTimers();
});

describe("INITIAL_WORKFLOW_STATE", () => {
    it("starts at clarify phase", () => {
        expect(INITIAL_WORKFLOW_STATE.currentPhase).toBe("clarify");
    });

    it("initializes with empty approvedAt", () => {
        expect(INITIAL_WORKFLOW_STATE.approvedAt).toEqual({});
    });

    it("has ISO timestamps for createdAt and updatedAt", () => {
        expect(INITIAL_WORKFLOW_STATE.createdAt).toMatch(
            /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/,
        );
        expect(INITIAL_WORKFLOW_STATE.updatedAt).toMatch(
            /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/,
        );
    });
});

describe("advancePhase", () => {
    it("moves to the specified phase only", () => {
        const after = advancePhase(INITIAL_WORKFLOW_STATE, "spec");
        expect(after.currentPhase).toBe("spec");
    });

    it("updates updatedAt to the current time", () => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date("2026-01-01T00:00:00.000Z"));
        const s1 = advancePhase(INITIAL_WORKFLOW_STATE, "spec");
        vi.setSystemTime(new Date("2026-01-01T00:00:01.000Z"));
        const s2 = advancePhase(s1, "design");
        expect(s2.updatedAt).toBe("2026-01-01T00:00:01.000Z");
    });

    it("does not change createdAt or approvedAt", () => {
        const after = advancePhase(INITIAL_WORKFLOW_STATE, "design");
        expect(after.createdAt).toBe(INITIAL_WORKFLOW_STATE.createdAt);
        expect(after.approvedAt).toEqual({});
    });
});

describe("recordApproval", () => {
    it("records approval timestamp for the given phase", () => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date("2026-02-03T04:05:06.000Z"));
        const after = recordApproval(INITIAL_WORKFLOW_STATE, "clarify");
        expect(after.approvedAt?.clarify).toBe("2026-02-03T04:05:06.000Z");
    });

    it("adds approvals for multiple phases cumulatively", () => {
        let s = INITIAL_WORKFLOW_STATE;
        s = advancePhase(s, "spec");
        s = recordApproval(s, "spec");
        s = advancePhase(s, "design");
        s = recordApproval(s, "design");
        expect(Object.keys(s.approvedAt ?? {})).toEqual(["spec", "design"]);
    });

    it("updates updatedAt to the current time", () => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date("2026-03-04T05:06:07.000Z"));
        const after = recordApproval(INITIAL_WORKFLOW_STATE, "accept");
        expect(after.updatedAt).toBe("2026-03-04T05:06:07.000Z");
    });
});

describe("Phase ordering", () => {
    const EXPECTED: Phase[] = ["clarify", "spec", "design", "tickets", "implement", "accept", "retro"];

    it("advancePhase reaches every phase in sequence", () => {
        let s = INITIAL_WORKFLOW_STATE;
        expect(s.currentPhase).toBe("clarify");
        for (const p of EXPECTED.slice(1)) {
            s = advancePhase(s, p);
            expect(s.currentPhase).toBe(p);
        }
        expect(s.currentPhase).toBe("retro");
    });
});
