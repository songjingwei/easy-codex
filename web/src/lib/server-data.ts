// Disk-backed data layer for the web kanban (ticket 03). Everything that
// touches the filesystem lives here — route components and server functions
// only call these functions — so the whole layer stays TDD-able without a
// running server.
//
// Two invariants:
// - loadKanban is tolerant: missing or corrupt .easy-codex/ JSON degrades to
//   fresh-workflow defaults (spec Edge cases); corruption is surfaced as a
//   warning so the UI can show a banner instead of crashing.
// - artifact reads are jail-checked: resolveArtifactPath only ever returns
//   paths inside <rootDir>/{specs,tickets,acceptance}, throwing an
//   ArtifactError with an HTTP-ish status (403 escape / 404 missing) that the
//   server function maps to a serializable error shape.
import { readFileSync, readdirSync, realpathSync, statSync, type Dirent } from 'node:fs'
import { basename, dirname, isAbsolute, join, relative, resolve, sep } from 'node:path'
import { buildKanban, type KanbanModel } from './kanban'
import type { ApprovalMemoLite, WorkflowStateLite } from './types'

/** Repo-relative dirs artifact requests may read from. */
const ARTIFACT_DIRS = ['specs', 'tickets', 'acceptance'] as const

/** Walk-up markers used to locate the repo root from an arbitrary cwd. */
const ROOT_MARKERS = ['.easy-codex', '.git'] as const

/** Error carrying an HTTP-ish status the server fn maps to a response shape. */
export class ArtifactError extends Error {
  readonly status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = 'ArtifactError'
    this.status = status
  }
}

export interface KanbanLoadResult {
  model: KanbanModel
  /** Human-readable notices (e.g. corrupt workflow.json) for the error banner. */
  warnings: string[]
}

/** Tolerant convenience wrapper: never warns, never throws for corrupt JSON. */
export function loadKanban(rootDir: string): KanbanModel {
  return loadKanbanReport(rootDir).model
}

/**
 * Like loadKanban but also reports corruption notices so the UI can show a
 * banner while the board still renders with defaults.
 */
export function loadKanbanReport(rootDir: string): KanbanLoadResult {
  const warnings: string[] = []
  const easyCodexDir = join(rootDir, '.easy-codex')

  const state = readJsonFile<WorkflowStateLite>(join(easyCodexDir, 'workflow.json'), warnings)
  const memos = normalizeMemos(readJsonFile<unknown>(join(easyCodexDir, 'memos.json'), warnings))

  return {
    model: buildKanban({ state, memos, artifactFiles: listArtifactFiles(rootDir) }),
    warnings,
  }
}

/**
 * List every file under <rootDir>/{specs,tickets,acceptance} as a sorted
 * repo-relative path (spec BR-3: the board shows a phase's artifacts even when
 * the approval memo did not record them). Missing dirs are skipped silently;
 * hidden entries and symlinks are skipped so the listing can never point
 * outside the artifact dirs.
 */
export function listArtifactFiles(rootDir: string): string[] {
  const resolvedRoot = resolve(rootDir)
  const files: string[] = []
  for (const dir of ARTIFACT_DIRS) {
    collectArtifactFiles(join(resolvedRoot, dir), resolvedRoot, files)
  }
  return files.sort()
}

/**
 * Resolve a client-supplied artifact path against the repo root, allowing only
 * files inside <rootDir>/specs, <rootDir>/tickets or <rootDir>/acceptance.
 * Throws ArtifactError(403) for anything else (traversal, absolute paths
 * outside the jail, non-artifact locations, empty input).
 */
export function resolveArtifactPath(rootDir: string, requestPath: string): string {
  if (typeof requestPath !== 'string' || requestPath.length === 0) {
    throw new ArtifactError('invalid artifact path', 403)
  }

  const resolvedRoot = resolve(rootDir)
  // path.resolve keeps absolute requestPath as-is, so /etc/hostname lands
  // outside the jail below; relative requests anchor at the repo root.
  const resolved = resolve(resolvedRoot, requestPath)

  // Lexical check first (cheap; rejects traversal, absolute paths and paths
  // that never enter an artifact dir), then a realpath check so a symlink
  // whose *spelling* sits under specs/ can't escape the jail.
  const allowed = ARTIFACT_DIRS.some((dir) => isInside(resolve(resolvedRoot, dir), resolved))
  if (!allowed) {
    throw new ArtifactError(`path escapes the artifact directories: ${requestPath}`, 403)
  }

  const realTarget = realResolvePath(resolved)
  const reallyInside = ARTIFACT_DIRS.some((dir) =>
    isInside(realResolvePath(join(resolvedRoot, dir)), realTarget),
  )
  if (!reallyInside) {
    throw new ArtifactError(`path escapes the artifact directories: ${requestPath}`, 403)
  }
  return resolved
}

/** Read an artifact as utf8. 403 on escape, 404 when the file is missing. */
export function readArtifact(rootDir: string, requestPath: string): { path: string; content: string } {
  const resolved = resolveArtifactPath(rootDir, requestPath)

  let content: string
  try {
    content = readFileSync(resolved, 'utf8')
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code
    if (code === 'ENOENT' || code === 'ENOTDIR' || code === 'EISDIR') {
      throw new ArtifactError(`artifact not found: ${requestPath}`, 404)
    }
    throw err
  }

  const repoRelative = relative(resolve(rootDir), resolved).split(sep).join('/')
  return { path: repoRelative, content }
}

/**
 * Locate the repo root by walking up from startDir until a directory holds
 * .easy-codex/ or .git/; falls back to startDir. Needed because the dev
 * server runs with cwd = web/, while workflow state lives at the repo root.
 */
export function findRepoRoot(startDir: string): string {
  let dir = resolve(startDir)
  for (;;) {
    if (ROOT_MARKERS.some((marker) => exists(join(dir, marker)))) return dir
    const parent = dirname(dir)
    if (parent === dir) return resolve(startDir)
    dir = parent
  }
}

// --- internals -------------------------------------------------------------

/**
 * memos.json is persisted by the root package as `{ "memos": [...] }`
 * (src/memo.ts); tolerate a bare array too so hand-edited files still work.
 */
function normalizeMemos(parsed: unknown): ApprovalMemoLite[] | undefined {
  if (Array.isArray(parsed)) return parsed as ApprovalMemoLite[]
  if (parsed !== null && typeof parsed === 'object') {
    const wrapped = (parsed as { memos?: unknown }).memos
    if (Array.isArray(wrapped)) return wrapped as ApprovalMemoLite[]
  }
  return undefined
}

/**
 * Read + parse a JSON file tolerantly:
 * - missing file → undefined (first run is normal, no warning)
 * - corrupt file → undefined + warning (spec Edge case: banner, no crash)
 * - non-object / wrong-shape payload → undefined (buildKanban validates)
 * - unreadable file (permissions etc.) → rethrows: unexpected I/O errors
 *   should reach the server fn and become the page-level error banner.
 */
function readJsonFile<T>(file: string, warnings: string[]): T | undefined {
  let raw: string
  try {
    raw = readFileSync(file, 'utf8')
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code
    if (code === 'ENOENT' || code === 'ENOTDIR') return undefined
    throw err
  }

  try {
    const parsed: unknown = JSON.parse(raw)
    if (parsed === null || typeof parsed !== 'object') return undefined
    return parsed as T
  } catch {
    warnings.push(`corrupt JSON in ${file}`)
    return undefined
  }
}

/** Recursive walk for listArtifactFiles; see its doc comment for the rules. */
function collectArtifactFiles(absDir: string, root: string, out: string[]): void {
  let entries: Dirent[]
  try {
    entries = readdirSync(absDir, { withFileTypes: true })
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code
    if (code === 'ENOENT' || code === 'ENOTDIR') return
    throw err
  }
  for (const entry of entries) {
    if (entry.name.startsWith('.')) continue
    const abs = join(absDir, entry.name)
    // isFile() is false for symlinks (and dirs): both are skipped, so the
    // walk never leaves the artifact dirs through a link.
    if (entry.isFile()) out.push(relative(root, abs).split(sep).join('/'))
    else if (entry.isDirectory()) collectArtifactFiles(abs, root, out)
  }
}

/**
 * Resolve symlinks of the closest existing ancestor, then re-append the
 * remaining (possibly missing) segments. Used to check that a request inside
 * the artifact dirs does not escape them through a symlink.
 */
function realResolvePath(path: string): string {
  let current = resolve(path)
  const suffix: string[] = []
  for (;;) {
    try {
      return join(realpathSync.native(current), ...suffix.reverse())
    } catch (err) {
      const code = (err as NodeJS.ErrnoException).code
      if (code !== 'ENOENT' && code !== 'ENOTDIR') throw err
      const parent = dirname(current)
      if (parent === current) return resolve(path)
      suffix.push(basename(current))
      current = parent
    }
  }
}

function exists(path: string): boolean {
  try {
    statSync(path)
    return true
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code
    if (code === 'ENOENT' || code === 'ENOTDIR') return false
    throw err
  }
}

/** True when target is a strict descendant of base (lexically, no symlinks). */
function isInside(base: string, target: string): boolean {
  const rel = relative(base, target)
  if (rel === '' || isAbsolute(rel)) return false
  return rel !== '..' && !rel.startsWith(`..${sep}`)
}
