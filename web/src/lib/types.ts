// Web-facing type aliases for the root package's on-disk shapes.
// - ApprovalMemo is re-used from `easy-codex` (one source of truth; the
//   web package depends on it as a workspace package).
// - WorkflowStateLite stays local and deliberately lenient: web tolerates
//   workflow.json entries missing createdAt/updatedAt (and only needs
//   currentPhase + approvedAt, which buildKanban validates defensively).
import type { ApprovalMemo } from 'easy-codex'
import type { PhaseName } from './phases'

export type { PhaseName }

/** Minimal mirror of root `WorkflowState` (.easy-codex/workflow.json). */
export interface WorkflowStateLite {
  currentPhase: PhaseName
  /** phase -> ISO timestamp of user approval */
  approvedAt?: Partial<Record<PhaseName, string>>
}

/** Re-export of the root `ApprovalMemo` under the web-local alias. */
export type ApprovalMemoLite = ApprovalMemo
