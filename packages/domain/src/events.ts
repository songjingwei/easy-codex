import type {
  DomainEvent,
  DomainEventPayload,
  DomainEventType,
  RequirementWorkflowState,
} from "./types";

export function createInitialState(requirementId: string): RequirementWorkflowState {
  return {
    requirementId,
    stage: "discuss",
    status: "running",
    lastSequence: 0,
    comprehensionScore: null,
    designApproved: false,
    failureReason: null,
  };
}

export function makeEvent(
  state: RequirementWorkflowState,
  type: DomainEventType,
  payload: DomainEventPayload,
  occurredAt: string,
): { event: DomainEvent; nextSequence: number } {
  const sequence = state.lastSequence + 1;
  return {
    event: {
      sequence,
      requirementId: state.requirementId,
      type,
      occurredAt,
      payload,
    },
    nextSequence: sequence,
  };
}

export function applyDomainEvent(
  state: RequirementWorkflowState,
  event: DomainEvent,
): RequirementWorkflowState {
  if (event.requirementId !== state.requirementId) {
    throw new Error("Domain event requirementId does not match state");
  }
  if (event.sequence <= state.lastSequence) {
    throw new Error("Domain event sequence must be monotonic");
  }

  const base = { ...state, lastSequence: event.sequence };

  switch (event.type) {
    case "requirement.created":
      return {
        ...base,
        stage: "discuss",
        status: "running",
        comprehensionScore: null,
        designApproved: false,
        failureReason: null,
      };
    case "stage.advanced": {
      const toStage = event.payload.toStage;
      if (typeof toStage !== "string") {
        throw new Error("stage.advanced requires toStage");
      }
      return {
        ...base,
        stage: toStage as RequirementWorkflowState["stage"],
        status: base.status === "waiting_user" ? "running" : base.status,
        failureReason: null,
      };
    }
    case "stage.rolled_back": {
      const toStage = event.payload.toStage;
      if (typeof toStage !== "string") {
        throw new Error("stage.rolled_back requires toStage");
      }
      return {
        ...base,
        stage: toStage as RequirementWorkflowState["stage"],
        status: "running",
        designApproved: false,
        failureReason: null,
      };
    }
    case "gate.passed":
      return applyGatePassed(base, event.payload);
    case "gate.failed":
      return applyGateFailed(base, event.payload);
    case "user.waiting":
      return { ...base, status: "waiting_user" };
    case "user.resumed":
      return { ...base, status: "running" };
    case "run.failed": {
      const reason = event.payload.reason;
      return {
        ...base,
        status: "failed",
        failureReason: typeof reason === "string" ? reason : "failed",
      };
    }
    case "run.cancelled":
      return {
        ...base,
        status: "cancelled",
        failureReason: null,
      };
    case "run.recovered":
      return { ...base, status: "running", failureReason: null };
    case "workflow.completed":
      return { ...base, stage: "completed", status: "completed" };
    default: {
      const _exhaustive: never = event.type;
      throw new Error(`Unhandled domain event type: ${String(_exhaustive)}`);
    }
  }
}

function applyGatePassed(
  state: RequirementWorkflowState,
  payload: DomainEventPayload,
): RequirementWorkflowState {
  const gate = payload.gate;
  if (gate === "comprehension") {
    const score = payload.score;
    if (typeof score !== "number") {
      throw new Error("comprehension gate.passed requires score");
    }
    return { ...state, comprehensionScore: score };
  }
  if (gate === "design_approved") {
    return { ...state, designApproved: true };
  }
  return state;
}

function applyGateFailed(
  state: RequirementWorkflowState,
  payload: DomainEventPayload,
): RequirementWorkflowState {
  const gate = payload.gate;
  if (gate === "comprehension") {
    const score = payload.score;
    if (typeof score !== "number") {
      throw new Error("comprehension gate.failed requires score");
    }
    return { ...state, comprehensionScore: score };
  }
  return state;
}

export function replayEvents(
  requirementId: string,
  events: DomainEvent[],
): RequirementWorkflowState {
  let state = createInitialState(requirementId);
  for (const event of events) {
    state = applyDomainEvent(state, event);
  }
  return state;
}
