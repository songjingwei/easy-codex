// Pure kanban data model: turns .easy-codex/ facts (workflow state + approval
// memos) into the seven-column board. No disk access, no node imports — disk
// reading belongs to server functions, so this stays trivially testable.
// Input arrives from JSON on disk and may be missing or corrupt; every field
// is defensively validated (spec Edge cases).
import { PHASE_ORDER, isPhaseName, type PhaseName } from './phases'
import type { ApprovalMemoLite, WorkflowStateLite } from './types'

export type KanbanStatus = 'pending' | 'awaiting' | 'approved'

export interface KanbanColumn {
  phase: PhaseName
  status: KanbanStatus
  commit?: string
  approvedAt?: string
  artifacts: string[]
}

export interface KanbanModel {
  columns: KanbanColumn[]
  currentPhase: PhaseName
}

export interface KanbanInput {
  state?: WorkflowStateLite | null
  memos?: ReadonlyArray<ApprovalMemoLite> | null
  /** Repo-relative files listed from specs/, tickets/, acceptance/ (spec BR-3). */
  artifactFiles?: readonly string[] | null
}

interface NormalizedMemo {
  commit?: string
  approvedAt?: string
  artifacts: string[]
}

export function buildKanban(input: KanbanInput): KanbanModel {
  const state = input?.state
  const currentPhase = state && isPhaseName(state.currentPhase) ? state.currentPhase : 'clarify'
  const memosByPhase = collectMemos(input?.memos)
  const files = asFileList(input?.artifactFiles)
  const currentIdx = PHASE_ORDER.indexOf(currentPhase)

  const columns = PHASE_ORDER.map((phase) => {
    const idx = PHASE_ORDER.indexOf(phase)
    const memo = memosByPhase.get(phase)

    let status: KanbanStatus
    if (idx < currentIdx) {
      status = memo ? 'approved' : 'pending'
    } else if (idx === currentIdx) {
      status = memo ? 'approved' : 'awaiting'
    } else {
      status = 'pending'
    }

    // BR-3: artifacts come from the approval memo (CLI-recorded) and from the
    // artifact dirs themselves. Memo paths keep their order; dir-mapped files
    // are appended (sorted) with duplicates removed.
    const artifacts = Array.from(
      new Set([...(memo?.artifacts ?? []), ...artifactFilesForPhase(phase, files)]),
    )

    const column: KanbanColumn = { phase, status, artifacts }
    if (memo?.commit !== undefined) column.commit = memo.commit
    const approvedAt = memo?.approvedAt ?? stateApprovedAt(state, phase)
    if (approvedAt !== undefined) column.approvedAt = approvedAt
    return column
  })

  return { columns, currentPhase }
}

/** Files under the artifact dirs that belong to each phase (spec BR-3). */
export function artifactFilesForPhase(phase: PhaseName, files: readonly string[]): string[] {
  const patterns: Record<PhaseName, RegExp[]> = {
    clarify: [], // conversational phase; no disk artifact
    spec: [/^specs\/[^/]+\/prd\.md$/, /^specs\/[^/]+\/spec\.md$/],
    design: [/^specs\/[^/]+\/design\.md$/],
    tickets: [/^tickets\//],
    implement: [/^acceptance\//],
    accept: [/^acceptance\//],
    retro: [/^specs\/[^/]+\/(review|retro)\.md$/],
  }
  return files
    .filter((f): f is string => typeof f === 'string' && f.length > 0)
    .filter((f) => patterns[phase].some((re) => re.test(f)))
    .sort()
}

/** artifactFiles may arrive from JSON; non-arrays degrade to an empty list. */
function asFileList(value: unknown): readonly string[] {
  return Array.isArray(value) ? (value as readonly string[]) : []
}

/** Index memos by phase, ignoring unknown phases; the last memo wins. */
function collectMemos(memos: unknown): Map<PhaseName, NormalizedMemo> {
  const byPhase = new Map<PhaseName, NormalizedMemo>()
  if (!Array.isArray(memos)) return byPhase
  for (const raw of memos) {
    if (typeof raw !== 'object' || raw === null) continue
    const phase = (raw as { phase?: unknown }).phase
    if (!isPhaseName(phase)) continue
    byPhase.set(phase, normalizeMemo(raw))
  }
  return byPhase
}

function normalizeMemo(raw: object): NormalizedMemo {
  const { commit, approvedAt, artifacts } = raw as {
    commit?: unknown
    approvedAt?: unknown
    artifacts?: unknown
  }
  return {
    commit: typeof commit === 'string' ? commit : undefined,
    approvedAt: typeof approvedAt === 'string' ? approvedAt : undefined,
    artifacts: Array.isArray(artifacts)
      ? artifacts.filter((a): a is string => typeof a === 'string')
      : [],
  }
}

function stateApprovedAt(state: WorkflowStateLite | null | undefined, phase: PhaseName): string | undefined {
  const approvedAt: unknown = state?.approvedAt
  if (typeof approvedAt !== 'object' || approvedAt === null) return undefined
  const value = (approvedAt as Partial<Record<PhaseName, unknown>>)[phase]
  return typeof value === 'string' ? value : undefined
}
