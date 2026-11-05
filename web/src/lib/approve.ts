// Web approval action (web-kanban ticket 04, spec BR-4).
//
// Reuse, don't fork: this calls the root package's `runCli(['--approve', …])`,
// so the memo + `approved:<phase>` commit + phase advance logic exists exactly
// once in src/index.ts. Wiring notes:
// - `easy-codex` is a workspace dependency; root package.json exports "." →
//   ./src/index.ts (source, not dist) so the web dev server and vitest can
//   import it without requiring a root build first. `main: dist/index.js` and
//   `pnpm start` are untouched — nothing resolves the package by name at
//   runtime except web (Vite/vitest transform TS).
// - cwd: the dev server runs with cwd = web/, but .easy-codex/ and the git
//   repo live at the repo root, so we pass `cwd: rootDir` (CliDeps.cwd, added
//   in root src/index.ts) instead of process.chdir — race-free under
//   concurrent requests.
// - initHarness: runCli's approve path never uses the session harness, and the
//   default createHarness() would open SQLite at process.cwd() (= web/), so we
//   inject a no-op. Tests still get a pure temp-dir function: every runCli dep
//   that touches disk resolves under rootDir.
import { PHASE_ORDER, runCli, type CliDeps } from 'easy-codex'

export type ApproveResult =
  | { ok: true; phase: string; commit: string }
  | { ok: false; error: string }

/** Extra runCli deps for tests only; production callers pass nothing. */
export type ApproveDeps = Omit<CliDeps, 'cwd'>

/**
 * Approve `phase` inside the repo rooted at `rootDir`: writes the
 * `approved:<phase>` commit, records the memo and advances workflow.json —
 * or returns {ok:false} with the original error message (spec Edge case:
 * non-git repos surface the git error verbatim).
 */
export async function approvePhaseAt(
  rootDir: string,
  phase: string,
  deps: ApproveDeps = {},
): Promise<ApproveResult> {
  // Validate against the root package's PHASE_ORDER (one source of truth) so
  // arbitrary client input never reaches the CLI argument list.
  if (typeof phase !== 'string' || !(PHASE_ORDER as readonly string[]).includes(phase)) {
    return {
      ok: false,
      error: `未知阶段: ${String(phase)}；可选: ${PHASE_ORDER.join(', ')}`,
    }
  }

  try {
    const result = await runCli(['--approve', phase], {
      cwd: rootDir,
      initHarness: async () => ({}),
      ...deps,
    })
    if (typeof result.commit !== 'string') {
      return { ok: false, error: `批准 ${phase} 未返回提交` }
    }
    return { ok: true, phase, commit: result.commit }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) }
  }
}
