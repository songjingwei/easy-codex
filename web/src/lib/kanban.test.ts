import { describe, expect, it } from 'vitest'
import { buildKanban } from './kanban'
import { PHASES } from './phases'
import type { ApprovalMemoLite, PhaseName, WorkflowStateLite } from './types'

function memo(phase: PhaseName, overrides: Partial<ApprovalMemoLite> = {}): ApprovalMemoLite {
  const index = PHASES.indexOf(phase)
  return {
    phase,
    commit: `c-${phase}`,
    approvedAt: `2026-01-0${index + 1}T00:00:00Z`,
    ...overrides,
  }
}

const state = (currentPhase: PhaseName, approvedAt?: WorkflowStateLite['approvedAt']): WorkflowStateLite =>
  approvedAt ? { currentPhase, approvedAt } : { currentPhase }

describe('buildKanban', () => {
  it('renders seven columns in phase order for empty input', () => {
    const model = buildKanban({ state: state('clarify'), memos: [] })

    expect(model.columns.map((c) => c.phase)).toEqual([...PHASES])
    expect(model.currentPhase).toBe('clarify')
  })

  it('treats missing state and memos as a fresh workflow (edge case: no .easy-codex/)', () => {
    const model = buildKanban({})

    expect(model.currentPhase).toBe('clarify')
    expect(model.columns.every((c) => c.status === 'pending' || c.status === 'awaiting')).toBe(true)
    expect(model.columns.every((c) => c.commit === undefined && c.approvedAt === undefined)).toBe(true)
    expect(model.columns.every((c) => c.artifacts.length === 0)).toBe(true)
  })

  it('marks the current phase as awaiting when it has no memo yet', () => {
    const model = buildKanban({ state: state('clarify'), memos: [] })

    expect(model.columns[0]?.status).toBe('awaiting')
    expect(model.columns.slice(1).every((c) => c.status === 'pending')).toBe(true)
  })

  it('marks an approved past phase with its memo commit and timestamp', () => {
    const model = buildKanban({
      state: state('spec', { clarify: '2026-01-01T09:00:00Z' }),
      memos: [memo('clarify')],
    })

    expect(model.currentPhase).toBe('spec')
    expect(model.columns[0]).toMatchObject({
      phase: 'clarify',
      status: 'approved',
      commit: 'c-clarify',
      approvedAt: '2026-01-01T00:00:00Z',
    })
    expect(model.columns[1]?.status).toBe('awaiting')
    expect(model.columns.slice(2).every((c) => c.status === 'pending')).toBe(true)
  })

  it('falls back to state.approvedAt when the memo has no timestamp', () => {
    const model = buildKanban({
      state: state('spec', { clarify: '2026-01-01T09:00:00Z' }),
      memos: [memo('clarify', { approvedAt: undefined })],
    })

    expect(model.columns[0]?.approvedAt).toBe('2026-01-01T09:00:00Z')
  })

  it('marks every column approved when all seven phases have memos and current is retro', () => {
    const model = buildKanban({
      state: state('retro'),
      memos: PHASES.map((p) => memo(p)),
    })

    expect(model.columns.every((c) => c.status === 'approved')).toBe(true)
    expect(model.currentPhase).toBe('retro')
  })

  it('keeps future phases pending even if a stray memo exists for them', () => {
    const model = buildKanban({
      state: state('clarify'),
      memos: [memo('design')],
    })

    expect(model.columns[2]?.status).toBe('pending')
    expect(model.columns[0]?.status).toBe('awaiting')
  })

  it('ignores memos for unknown phases', () => {
    const bogus = { phase: 'bogus' as PhaseName, commit: 'c-bogus', approvedAt: '2026-02-01T00:00:00Z' }
    const model = buildKanban({
      state: state('spec'),
      memos: [memo('clarify'), bogus],
    })

    expect(model.columns).toHaveLength(7)
    expect(model.columns.map((c) => c.phase)).toEqual([...PHASES])
    expect(model.columns[0]?.status).toBe('approved')
    expect(model.columns[1]?.status).toBe('awaiting')
  })

  it('lets the last memo win when a phase has duplicates', () => {
    const model = buildKanban({
      state: state('spec'),
      memos: [memo('clarify', { commit: 'first' }), memo('clarify', { commit: 'second' })],
    })

    expect(model.columns[0]?.commit).toBe('second')
  })

  it('defaults to clarify when state.currentPhase is not one of the seven phases', () => {
    const model = buildKanban({
      state: { currentPhase: 'nonsense' as PhaseName },
      memos: [memo('clarify')],
    })

    expect(model.currentPhase).toBe('clarify')
    expect(model.columns[0]?.status).toBe('approved')
    expect(model.columns.slice(1).every((c) => c.status === 'pending')).toBe(true)
  })

  it('tolerates corrupt or missing memo fields without crashing', () => {
    const corrupt = [
      { phase: 'clarify' as PhaseName }, // missing commit + approvedAt
      { phase: 'spec' as PhaseName, commit: 42, approvedAt: null, artifacts: 'nope' } as unknown as ApprovalMemoLite,
    ]
    const model = buildKanban({
      state: state('design'),
      memos: corrupt as unknown as ApprovalMemoLite[],
    })

    expect(model.columns[0]?.status).toBe('approved')
    expect(model.columns[0]?.commit).toBeUndefined()
    expect(model.columns[0]?.approvedAt).toBeUndefined()
    expect(model.columns[0]?.artifacts).toEqual([])
    expect(model.columns[1]?.status).toBe('approved')
    expect(model.columns[1]?.commit).toBeUndefined()
    expect(model.columns[1]?.artifacts).toEqual([])
    expect(model.columns[2]?.status).toBe('awaiting')
  })

  it('treats a non-array memos value as no approvals', () => {
    const model = buildKanban({
      state: state('clarify'),
      memos: { memos: [] } as unknown as ApprovalMemoLite[],
    })

    expect(model.columns[0]?.status).toBe('awaiting')
    expect(model.columns.every((c) => c.status !== 'approved')).toBe(true)
  })

  it('tolerates a corrupt state.approvedAt map', () => {
    const model = buildKanban({
      state: { currentPhase: 'retro', approvedAt: 'nope' } as unknown as WorkflowStateLite,
      memos: PHASES.map((p) => memo(p)),
    })

    expect(model.columns.every((c) => c.status === 'approved')).toBe(true)
  })

  it('surfaces artifact paths on the column of their phase', () => {
    const model = buildKanban({
      state: state('implement'),
      memos: [
        memo('clarify', { artifacts: ['specs/clarify-notes.md'] }),
        memo('design', { artifacts: ['specs/web-kanban/design.md', 'specs/web-kanban/spec.md'] }),
        memo('spec'), // no artifacts key
      ],
    })

    expect(model.columns[0]?.artifacts).toEqual(['specs/clarify-notes.md'])
    expect(model.columns[2]?.artifacts).toEqual(['specs/web-kanban/design.md', 'specs/web-kanban/spec.md'])
    expect(model.columns[1]?.artifacts).toEqual([])
    expect(model.columns.slice(3).every((c) => c.artifacts.length === 0)).toBe(true)
  })
})
