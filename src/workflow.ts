export type Phase =
    | "clarify"
    | "spec"
    | "design"
    | "tickets"
    | "implement"
    | "accept"
    | "retro";

export interface WorkflowState {
    currentPhase: Phase;
    approvedAt?: Partial<Record<Phase, string>>; // phase -> ISO timestamp of user approval
    createdAt: string;
    updatedAt: string;
}

export const INITIAL_WORKFLOW_STATE: WorkflowState = {
    currentPhase: "clarify",
    approvedAt: {},
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
};

export function advancePhase(state: WorkflowState, phase: Phase): WorkflowState {
    return {
        ...state,
        currentPhase: phase,
        updatedAt: new Date().toISOString(),
    };
}

export function recordApproval(state: WorkflowState, phase: Phase): WorkflowState {
    return {
        ...state,
        approvedAt: {
            ...state.approvedAt,
            [phase]: new Date().toISOString(),
        },
        updatedAt: new Date().toISOString(),
    };
}
