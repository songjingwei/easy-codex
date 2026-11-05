import { describe, expect, it } from 'vitest'
import { PHASES } from './phases'

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
})
