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

export type Phase = (typeof PHASES)[number]
