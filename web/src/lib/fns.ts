// Thin server functions (ticket 03 + 04). Disk access and validation live in
// server-data.ts / approve.ts; these only wire them to createServerFn and map
// thrown errors to serializable {error} shapes the UI can render as a
// banner/toast.
import { createServerFn } from '@tanstack/react-start'
import type { KanbanModel } from './kanban'
import { approvePhaseAt, type ApproveResult } from './approve'
import { ArtifactError, findRepoRoot, loadKanbanReport, readArtifact } from './server-data'

export type KanbanResult =
  | { ok: true; model: KanbanModel; warnings: string[] }
  | { ok: false; error: string }

export type ArtifactResult =
  | { ok: true; path: string; content: string }
  | { ok: false; status: number; error: string }

/**
 * The dev server runs with cwd = web/, but workflow state lives at the repo
 * root, so walk up from cwd looking for .easy-codex/ or .git/ markers.
 */
function repoRoot(): string {
  return findRepoRoot(process.cwd())
}

function message(err: unknown): string {
  return err instanceof Error ? err.message : String(err)
}

export const getKanban = createServerFn({ method: 'GET' }).handler((): KanbanResult => {
  try {
    const { model, warnings } = loadKanbanReport(repoRoot())
    return { ok: true, model, warnings }
  } catch (err) {
    // Unexpected I/O failure → page-level error banner instead of a crash.
    return { ok: false, error: message(err) }
  }
})

export const readArtifactFn = createServerFn({ method: 'GET' })
  .validator((p: { path: string }) => p)
  .handler(({ data }): ArtifactResult => {
    try {
      return { ok: true, ...readArtifact(repoRoot(), data.path) }
    } catch (err) {
      if (err instanceof ArtifactError) {
        return { ok: false, status: err.status, error: err.message }
      }
      return { ok: false, status: 500, error: message(err) }
    }
  })

/**
 * POST approve (spec BR-4): delegates to approvePhaseAt (root runCli reuse).
 * approvePhaseAt never throws — failures come back as {ok:false, error} with
 * the original message so the UI can show them verbatim in a banner.
 */
export const approvePhase = createServerFn({ method: 'POST' })
  .validator((p: { phase: string }) => p)
  .handler(({ data }): Promise<ApproveResult> => approvePhaseAt(repoRoot(), data.phase))
