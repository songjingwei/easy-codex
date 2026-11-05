// Local mirrors of the root package shapes (src/workflow.ts, src/memo.ts).
// The web package does not depend on `easy-codex` yet, so only the minimal
// fields the kanban model needs are mirrored here. Keep in sync by hand.
import type { PhaseName } from './phases'

export type { PhaseName }

/** Minimal mirror of root `WorkflowState` (.easy-codex/workflow.json). */
export interface WorkflowStateLite {
  currentPhase: PhaseName
  /** phase -> ISO timestamp of user approval */
  approvedAt?: Partial<Record<PhaseName, string>>
}

/** Minimal mirror of root `ApprovalMemo` (.easy-codex/memos.json). */
export interface ApprovalMemoLite {
  phase: PhaseName
  commit: string
  approvedAt: string
  artifacts?: string[]
}
