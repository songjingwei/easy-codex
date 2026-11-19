/** Seven user-facing workflow steps plus terminal completion. */
export const STAGE_ORDER = [
  "discuss",
  "confirm",
  "comprehension",
  "design",
  "spec",
  "implement",
  "review",
] as const;

export type ActiveStage = (typeof STAGE_ORDER)[number];

export type WorkflowStage = ActiveStage | "completed";

export type RunStatus =
  | "running"
  | "waiting_user"
  | "failed"
  | "cancelled"
  | "completed";

export const COMPREHENSION_PASS_SCORE = 80;

export type RequirementWorkflowState = {
  requirementId: string;
  stage: WorkflowStage;
  status: RunStatus;
  /** Monotonic domain event sequence for this requirement. */
  lastSequence: number;
  /** Latest comprehension score, if stage three was attempted. */
  comprehensionScore: number | null;
  /** Whether the current design version is approved for stage five. */
  designApproved: boolean;
  /** Optional human-readable blocker while status is failed. */
  failureReason: string | null;
};

export type DomainEventType =
  | "requirement.created"
  | "stage.advanced"
  | "stage.rolled_back"
  | "gate.passed"
  | "gate.failed"
  | "user.waiting"
  | "user.resumed"
  | "run.failed"
  | "run.cancelled"
  | "run.recovered"
  | "workflow.completed";

export type DomainEventPayload = Record<string, unknown>;

export type DomainEvent = {
  sequence: number;
  requirementId: string;
  type: DomainEventType;
  occurredAt: string;
  payload: DomainEventPayload;
};

export type TransitionErrorCode =
  | "terminal_status"
  | "invalid_stage"
  | "invalid_status"
  | "gate_not_satisfied"
  | "noop";

export type TransitionResult =
  | {
      ok: true;
      state: RequirementWorkflowState;
      events: DomainEvent[];
    }
  | {
      ok: false;
      code: TransitionErrorCode;
      message: string;
    };

export type SuccessfulTransitionResult = Extract<TransitionResult, { ok: true }>;
