import { describe, expect, it } from 'vitest'
import { PHASE_ORDER, PHASES, isPhaseName } from './phases'

describe('PHASES', () => {
  it('lists the seven workflow phases in execution order', () => {
    expect(PHASES).toEqual([
      'clarify',
      'spec',
      'design',
      'tickets',
      'implement',
      'accept',
      'retro',
    ])
  })

  it('is the root package PHASE_ORDER itself (single source of truth)', () => {
    expect(PHASES).toBe(PHASE_ORDER)
  })

  it('isPhaseName accepts the seven phases and rejects other values', () => {
    for (const phase of PHASES) expect(isPhaseName(phase)).toBe(true)
    expect(isPhaseName('nope')).toBe(false)
    expect(isPhaseName(42)).toBe(false)
    expect(isPhaseName(null)).toBe(false)
    expect(isPhaseName(undefined)).toBe(false)
  })
})
