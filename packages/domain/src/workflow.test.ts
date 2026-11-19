import { describe, expect, it } from "vitest";
import { replayEvents } from "./events";
import type { RequirementWorkflowState, SuccessfulTransitionResult, TransitionResult } from "./types";
import {
  approveDesign,
  beginRequirementWorkflow,
  cancelRequirementRun,
  completeDiscussion,
  completeImplementation,
  confirmRequirementRestatement,
  failRequirementRun,
  markWaitingForUser,
  passReviewAndDeliver,
  publishSpecAndTickets,
  recordComprehensionAttempt,
  recoverFailedRun,
  rejectRequirementRestatement,
  resumeAfterUser,
} from "./workflow";

const AT = "2026-11-19T00:00:00.000Z";
const REQ = "req-1";

function assertSuccess(result: TransitionResult): SuccessfulTransitionResult {
  expect(result.ok).toBe(true);
  if (!result.ok) {
    throw new Error("expected successful transition");
  }
  return result;
}

function nextState(
  state: RequirementWorkflowState,
  result: TransitionResult,
): RequirementWorkflowState {
  return assertSuccess(result).state;
}

describe("requirement workflow", () => {
  it("begins at discuss with monotonic events", () => {
    const result = assertSuccess(beginRequirementWorkflow(REQ, AT));
    expect(result.state.stage).toBe("discuss");
    expect(result.state.status).toBe("running");
    expect(result.state.lastSequence).toBe(1);
    expect(result.events[0]?.type).toBe("requirement.created");
    expect(result.events[0]?.sequence).toBe(1);
  });

  it("replays the same state from emitted events", () => {
    const began = assertSuccess(beginRequirementWorkflow(REQ, AT));
    const replayed = replayEvents(REQ, began.events);
    expect(replayed).toEqual(began.state);
  });

  it("advances through the seven stages when gates pass", () => {
    let state = assertSuccess(beginRequirementWorkflow(REQ, AT)).state;

    state = nextState(state, completeDiscussion(state, AT));
    expect(state.stage).toBe("confirm");

    state = nextState(state, confirmRequirementRestatement(state, AT));
    expect(state.stage).toBe("comprehension");

    state = nextState(state, recordComprehensionAttempt(state, 80, AT));
    expect(state.stage).toBe("design");
    expect(state.comprehensionScore).toBe(80);

    state = nextState(state, approveDesign(state, AT));
    expect(state.designApproved).toBe(true);
    expect(state.stage).toBe("spec");

    state = nextState(state, publishSpecAndTickets(state, AT));
    expect(state.stage).toBe("implement");

    state = nextState(state, completeImplementation(state, AT));
    expect(state.stage).toBe("review");

    state = nextState(state, passReviewAndDeliver(state, AT));
    expect(state.stage).toBe("completed");
    expect(state.status).toBe("completed");
  });

  it("rolls back from confirm to discuss when restatement is rejected", () => {
    let state = assertSuccess(beginRequirementWorkflow(REQ, AT)).state;
    state = nextState(state, completeDiscussion(state, AT));

    const rejected = assertSuccess(rejectRequirementRestatement(state, AT));
    expect(rejected.state.stage).toBe("discuss");
    expect(rejected.state.designApproved).toBe(false);
  });

  it("blocks comprehension advance below 80 but records the score", () => {
    let state = assertSuccess(beginRequirementWorkflow(REQ, AT)).state;
    state = nextState(state, completeDiscussion(state, AT));
    state = nextState(state, confirmRequirementRestatement(state, AT));

    const fail = assertSuccess(recordComprehensionAttempt(state, 79, AT));
    expect(fail.state.stage).toBe("comprehension");
    expect(fail.state.comprehensionScore).toBe(79);
    expect(fail.events.at(-1)?.type).toBe("gate.failed");
  });

  it("supports waiting for user and resume", () => {
    const began = assertSuccess(beginRequirementWorkflow(REQ, AT));
    const waiting = assertSuccess(markWaitingForUser(began.state, AT, "need input"));
    expect(waiting.state.status).toBe("waiting_user");

    const resumed = assertSuccess(resumeAfterUser(waiting.state, AT));
    expect(resumed.state.status).toBe("running");
  });

  it("handles fail, cancel, and recover", () => {
    const began = assertSuccess(beginRequirementWorkflow(REQ, AT));

    const failed = assertSuccess(failRequirementRun(began.state, "agent error", AT));
    expect(failed.state.status).toBe("failed");
    expect(failed.state.failureReason).toBe("agent error");

    const recovered = assertSuccess(recoverFailedRun(failed.state, AT));
    expect(recovered.state.status).toBe("running");

    const cancelled = assertSuccess(cancelRequirementRun(recovered.state, AT));
    expect(cancelled.state.status).toBe("cancelled");

    const again = cancelRequirementRun(cancelled.state, AT);
    expect(again.ok).toBe(false);
    if (!again.ok) {
      expect(again.code).toBe("noop");
    }
  });

  it("rejects non-monotonic event replay", () => {
    const began = assertSuccess(beginRequirementWorkflow(REQ, AT));
    const dup = { ...began.events[0]!, sequence: 1 };
    expect(() => replayEvents(REQ, [dup, dup])).toThrow(/monotonic/i);
  });
});
