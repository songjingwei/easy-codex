// The seven phases of the easy-codex workflow, in execution order.
// Static placeholder for ticket 01; ticket 02 replaces this with the
// pure data model in web/src/lib/kanban.ts backed by .easy-codex/ facts.
export const PHASES = [
  'clarify',
  'spec',
  'design',
  'tickets',
  'implement',
  'accept',
  'retro',
] as const

export type PhaseName = (typeof PHASES)[number]

// Backwards-compatible alias from the ticket 01 scaffold.
export type Phase = PhaseName

/** Fixed column order for the kanban board (mirrors root PHASE_ORDER). */
export const PHASE_ORDER: readonly PhaseName[] = PHASES

export function isPhaseName(value: unknown): value is PhaseName {
  return typeof value === 'string' && (PHASE_ORDER as readonly string[]).includes(value)
}
