import { applyDomainEvent, makeEvent } from "./events";
import { nextStage } from "./stages";
import { COMPREHENSION_PASS_SCORE } from "./types";
import type {
  DomainEvent,
  RequirementWorkflowState,
  TransitionResult,
} from "./types";


type EmitInput = {
  state: RequirementWorkflowState;
  occurredAt: string;
  events: Array<{
    type: DomainEvent["type"];
    payload: DomainEvent["payload"];
  }>;
};

function emitSequential(input: EmitInput): TransitionResult {
  const { state, occurredAt, events: pending } = input;
  let current = state;
  const emitted: DomainEvent[] = [];

  for (const pendingEvent of pending) {
    const { event, nextSequence } = makeEvent(
      current,
      pendingEvent.type,
      pendingEvent.payload,
      occurredAt,
    );
    if (event.sequence !== nextSequence) {
      throw new Error("Event sequence mismatch");
    }
    current = applyDomainEvent(current, event);
    emitted.push(event);
  }

  return { ok: true, state: current, events: emitted };
}

function rejectTerminal(status: RequirementWorkflowState["status"]): TransitionResult | null {
  if (status === "cancelled") {
    return { ok: false, code: "terminal_status", message: "Requirement run is cancelled" };
  }
  if (status === "completed") {
    return { ok: false, code: "terminal_status", message: "Requirement workflow is completed" };
  }
  return null;
}

export function beginRequirementWorkflow(
  requirementId: string,
  occurredAt: string,
): TransitionResult {
  const state = {
    requirementId,
    stage: "discuss" as const,
    status: "running" as const,
    lastSequence: 0,
    comprehensionScore: null,
    designApproved: false,
    failureReason: null,
  };
  return emitSequential({
    state,
    occurredAt,
    events: [{ type: "requirement.created", payload: {} }],
  });
}

export function markWaitingForUser(
  state: RequirementWorkflowState,
  occurredAt: string,
  reason?: string,
): TransitionResult {
  const terminal = rejectTerminal(state.status);
  if (terminal) {
    return terminal;
  }
  if (state.status === "failed") {
    return { ok: false, code: "invalid_status", message: "Cannot wait for user while failed" };
  }
  if (state.status === "waiting_user") {
    return { ok: false, code: "noop", message: "Already waiting for user" };
  }
  return emitSequential({
    state,
    occurredAt,
    events: [
      {
        type: "user.waiting",
        payload: reason ? { reason } : {},
      },
    ],
  });
}

export function resumeAfterUser(
  state: RequirementWorkflowState,
  occurredAt: string,
): TransitionResult {
  const terminal = rejectTerminal(state.status);
  if (terminal) {
    return terminal;
  }
  if (state.status !== "waiting_user") {
    return { ok: false, code: "invalid_status", message: "Requirement is not waiting for user" };
  }
  return emitSequential({
    state,
    occurredAt,
    events: [{ type: "user.resumed", payload: {} }],
  });
}

export function completeDiscussion(
  state: RequirementWorkflowState,
  occurredAt: string,
): TransitionResult {
  const terminal = rejectTerminal(state.status);
  if (terminal) {
    return terminal;
  }
  if (state.status === "failed") {
    return { ok: false, code: "invalid_status", message: "Cannot advance while failed" };
  }
  if (state.stage !== "discuss") {
    return { ok: false, code: "invalid_stage", message: "Discussion can only complete in discuss stage" };
  }
  const toStage = nextStage("discuss");
  return emitSequential({
    state,
    occurredAt,
    events: [
      { type: "stage.advanced", payload: { fromStage: "discuss", toStage } },
      { type: "gate.passed", payload: { gate: "discussion_complete" } },
    ],
  });
}

export function confirmRequirementRestatement(
  state: RequirementWorkflowState,
  occurredAt: string,
): TransitionResult {
  const terminal = rejectTerminal(state.status);
  if (terminal) {
    return terminal;
  }
  if (state.status === "failed") {
    return { ok: false, code: "invalid_status", message: "Cannot advance while failed" };
  }
  if (state.stage !== "confirm") {
    return {
      ok: false,
      code: "invalid_stage",
      message: "Requirement confirmation only applies in confirm stage",
    };
  }
  const toStage = nextStage("confirm");
  return emitSequential({
    state,
    occurredAt,
    events: [
      { type: "stage.advanced", payload: { fromStage: "confirm", toStage } },
      { type: "gate.passed", payload: { gate: "requirement_confirmed" } },
    ],
  });
}

export function rejectRequirementRestatement(
  state: RequirementWorkflowState,
  occurredAt: string,
): TransitionResult {
  const terminal = rejectTerminal(state.status);
  if (terminal) {
    return terminal;
  }
  if (state.status === "failed") {
    return { ok: false, code: "invalid_status", message: "Cannot roll back while failed" };
  }
  if (state.stage !== "confirm") {
    return {
      ok: false,
      code: "invalid_stage",
      message: "Rejection only applies in confirm stage",
    };
  }
  return emitSequential({
    state,
    occurredAt,
    events: [
      {
        type: "stage.rolled_back",
        payload: { fromStage: "confirm", toStage: "discuss", reason: "user_rejected_restatement" },
      },
    ],
  });
}

export function recordComprehensionAttempt(
  state: RequirementWorkflowState,
  score: number,
  occurredAt: string,
): TransitionResult {
  const terminal = rejectTerminal(state.status);
  if (terminal) {
    return terminal;
  }
  if (state.status === "failed") {
    return { ok: false, code: "invalid_status", message: "Cannot record score while failed" };
  }
  if (state.stage !== "comprehension") {
    return {
      ok: false,
      code: "invalid_stage",
      message: "Comprehension scoring only applies in comprehension stage",
    };
  }
  if (score < COMPREHENSION_PASS_SCORE) {
    return emitSequential({
      state,
      occurredAt,
      events: [
        {
          type: "gate.failed",
          payload: { gate: "comprehension", score, requiredScore: 80 },
        },
      ],
    });
  }
  const toStage = nextStage("comprehension");
  return emitSequential({
    state,
    occurredAt,
    events: [
      { type: "gate.passed", payload: { gate: "comprehension", score } },
      { type: "stage.advanced", payload: { fromStage: "comprehension", toStage } },
    ],
  });
}

export function approveDesign(
  state: RequirementWorkflowState,
  occurredAt: string,
): TransitionResult {
  const terminal = rejectTerminal(state.status);
  if (terminal) {
    return terminal;
  }
  if (state.status === "failed") {
    return { ok: false, code: "invalid_status", message: "Cannot approve design while failed" };
  }
  if (state.stage !== "design") {
    return { ok: false, code: "invalid_stage", message: "Design approval only applies in design stage" };
  }
  const toStage = nextStage("design");
  return emitSequential({
    state,
    occurredAt,
    events: [
      { type: "gate.passed", payload: { gate: "design_approved" } },
      { type: "stage.advanced", payload: { fromStage: "design", toStage } },
    ],
  });
}

export function publishSpecAndTickets(
  state: RequirementWorkflowState,
  occurredAt: string,
): TransitionResult {
  const terminal = rejectTerminal(state.status);
  if (terminal) {
    return terminal;
  }
  if (state.status === "failed") {
    return { ok: false, code: "invalid_status", message: "Cannot publish spec while failed" };
  }
  if (state.stage !== "spec") {
    return { ok: false, code: "invalid_stage", message: "Spec publish only applies in spec stage" };
  }
  const toStage = nextStage("spec");
  return emitSequential({
    state,
    occurredAt,
    events: [
      { type: "gate.passed", payload: { gate: "spec_published" } },
      { type: "stage.advanced", payload: { fromStage: "spec", toStage } },
    ],
  });
}

export function completeImplementation(
  state: RequirementWorkflowState,
  occurredAt: string,
): TransitionResult {
  const terminal = rejectTerminal(state.status);
  if (terminal) {
    return terminal;
  }
  if (state.status === "failed") {
    return { ok: false, code: "invalid_status", message: "Cannot complete implementation while failed" };
  }
  if (state.stage !== "implement") {
    return {
      ok: false,
      code: "invalid_stage",
      message: "Implementation completion only applies in implement stage",
    };
  }
  const toStage = nextStage("implement");
  return emitSequential({
    state,
    occurredAt,
    events: [
      { type: "gate.passed", payload: { gate: "implementation_complete" } },
      { type: "stage.advanced", payload: { fromStage: "implement", toStage } },
    ],
  });
}

export function passReviewAndDeliver(
  state: RequirementWorkflowState,
  occurredAt: string,
): TransitionResult {
  const terminal = rejectTerminal(state.status);
  if (terminal) {
    return terminal;
  }
  if (state.status === "failed") {
    return { ok: false, code: "invalid_status", message: "Cannot deliver while failed" };
  }
  if (state.stage !== "review") {
    return { ok: false, code: "invalid_stage", message: "Delivery only applies in review stage" };
  }
  return emitSequential({
    state,
    occurredAt,
    events: [
      { type: "gate.passed", payload: { gate: "review_passed" } },
      { type: "workflow.completed", payload: {} },
    ],
  });
}

export function failRequirementRun(
  state: RequirementWorkflowState,
  reason: string,
  occurredAt: string,
): TransitionResult {
  if (state.status === "cancelled" || state.status === "completed") {
    return { ok: false, code: "terminal_status", message: "Cannot fail a terminal run" };
  }
  if (state.status === "failed") {
    return { ok: false, code: "noop", message: "Requirement run is already failed" };
  }
  return emitSequential({
    state,
    occurredAt,
    events: [{ type: "run.failed", payload: { reason } }],
  });
}

export function cancelRequirementRun(
  state: RequirementWorkflowState,
  occurredAt: string,
  reason?: string,
): TransitionResult {
  if (state.status === "cancelled") {
    return { ok: false, code: "noop", message: "Requirement run is already cancelled" };
  }
  if (state.status === "completed") {
    return { ok: false, code: "terminal_status", message: "Cannot cancel a completed workflow" };
  }
  return emitSequential({
    state,
    occurredAt,
    events: [{ type: "run.cancelled", payload: reason ? { reason } : {} }],
  });
}

export function recoverFailedRun(
  state: RequirementWorkflowState,
  occurredAt: string,
): TransitionResult {
  if (state.status !== "failed") {
    return { ok: false, code: "invalid_status", message: "Recovery only applies to failed runs" };
  }
  return emitSequential({
    state,
    occurredAt,
    events: [{ type: "run.recovered", payload: {} }],
  });
}

export function canAdvanceFrom(state: RequirementWorkflowState): boolean {
  return (
    state.stage !== "completed" &&
    state.status !== "cancelled" &&
    state.status !== "completed" &&
    state.status !== "failed"
  );
}
