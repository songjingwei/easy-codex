import { createFileRoute } from '@tanstack/react-router'
import { PHASES } from '../lib/phases'

export const Route = createFileRoute('/')({
  component: Home,
})

// Placeholder page for ticket 01: static seven-phase list.
// Ticket 02 replaces this with the Kanban model + server functions.
function Home() {
  return (
    <main>
      <h1>easy-codex — Web Kanban</h1>
      <p>Seven-phase flow: clarify → spec → design → tickets → implement → accept → retro</p>
      <ol>
        {PHASES.map((phase) => (
          <li key={phase}>{phase}</li>
        ))}
      </ol>
    </main>
  )
}
