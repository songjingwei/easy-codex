// Thin re-export of the root package's phase list — ONE source of truth.
import { PHASE_ORDER, type Phase } from 'easy-codex'

export { PHASE_ORDER }

/** Backwards-compatible names kept for existing web imports. */
export const PHASES: readonly Phase[] = PHASE_ORDER
export type PhaseName = Phase
export type { Phase }

export function isPhaseName(value: unknown): value is PhaseName {
  return typeof value === 'string' && (PHASE_ORDER as readonly string[]).includes(value)
}
