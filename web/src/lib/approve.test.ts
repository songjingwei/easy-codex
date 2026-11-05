// TDD for approvePhaseAt (web-kanban ticket 04): every test runs against a
// fresh mkdtemp git repo, so the real repository's .easy-codex/ state is
// never touched. Mirrors the root src/phases/accept.test.ts git pattern.
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { execFile } from 'node:child_process'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { promisify } from 'node:util'
import { approvePhaseAt, type ApproveResult } from './approve'

const exec = promisify(execFile)

let dir: string
const extraDirs: string[] = []

async function git(args: string[]): Promise<string> {
  const { stdout } = await exec('git', args, { cwd: dir })
  return stdout.trim()
}

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'easy-codex-approve-'))
  await git(['init', '-q'])
  await git(['config', 'user.email', 'test@example.com'])
  await git(['config', 'user.name', 'Test'])
  await exec('git', ['commit', '-q', '--allow-empty', '-m', 'base'], { cwd: dir })
})

afterEach(async () => {
  await rm(dir, { recursive: true, force: true })
  await Promise.all(extraDirs.splice(0).map((d) => rm(d, { recursive: true, force: true })))
})

async function readJson<T>(path: string): Promise<T | undefined> {
  try {
    return JSON.parse(await readFile(path, 'utf8')) as T
  } catch {
    return undefined
  }
}

function expectOk(result: ApproveResult): asserts result is Extract<ApproveResult, { ok: true }> {
  if (!result.ok) expect.fail(`expected ok, got error: ${result.error}`)
}

describe('approvePhaseAt', () => {
  it('approving a phase writes an approved:<phase> commit, a memo, and advances state', async () => {
    const result = await approvePhaseAt(dir, 'clarify')
    expectOk(result)

    // approved:<phase> commit at the temp repo root
    expect(await git(['log', '-1', '--format=%B'])).toContain('approved:clarify')
    expect(await git(['rev-parse', 'HEAD'])).toBe(result.commit)

    // memo recorded in <tmp>/.easy-codex/memos.json
    const memos = await readJson<{ memos: Array<{ phase: string; commit: string }> }>(
      join(dir, '.easy-codex/memos.json'),
    )
    expect(memos?.memos).toHaveLength(1)
    expect(memos?.memos[0]?.phase).toBe('clarify')
    expect(memos?.memos[0]?.commit).toBe(result.commit)

    // workflow advanced to the next phase
    const state = await readJson<{ currentPhase: string; approvedAt: Record<string, string> }>(
      join(dir, '.easy-codex/workflow.json'),
    )
    expect(state?.currentPhase).toBe('spec')
    expect(state?.approvedAt.clarify).toBeDefined()
  })

  it('rejects an unknown phase without side effects', async () => {
    const result = await approvePhaseAt(dir, 'nope')
    expect(result.ok).toBe(false)
    if (result.ok) expect.fail('expected failure for unknown phase')
    expect(result.error).toContain('未知阶段')

    // No commit, no state dir, no memo.
    expect(await git(['log', '-1', '--format=%s'])).toBe('base')
    await expect(readFile(join(dir, '.easy-codex/memos.json'), 'utf8')).rejects.toThrow()
    await expect(readFile(join(dir, '.easy-codex/workflow.json'), 'utf8')).rejects.toThrow()
  })

  it('fails with the verbatim git error and writes no memo outside a git repo', async () => {
    const plain = await mkdtemp(join(tmpdir(), 'easy-codex-nogit-'))
    extraDirs.push(plain)

    const result = await approvePhaseAt(plain, 'clarify')
    expect(result.ok).toBe(false)
    if (result.ok) expect.fail('expected failure outside a git repo')
    // Original error surfaced as-is (spec Edge case: shown verbatim to the user).
    expect(result.error).toMatch(/git/i)

    await expect(readFile(join(plain, '.easy-codex/memos.json'), 'utf8')).rejects.toThrow()
  })

  it('stays on retro after approving retro', async () => {
    const now = new Date().toISOString()
    await mkdir(join(dir, '.easy-codex'), { recursive: true })
    await writeFile(
      join(dir, '.easy-codex/workflow.json'),
      JSON.stringify({ currentPhase: 'retro', approvedAt: {}, createdAt: now, updatedAt: now }),
      'utf8',
    )

    const result = await approvePhaseAt(dir, 'retro')
    expectOk(result)

    const state = await readJson<{ currentPhase: string; approvedAt: Record<string, string> }>(
      join(dir, '.easy-codex/workflow.json'),
    )
    expect(state?.currentPhase).toBe('retro')
    expect(state?.approvedAt.retro).toBeDefined()
    expect(await git(['log', '-1', '--format=%B'])).toContain('approved:retro')
  })

  it('runs the full flow twice (clarify then spec) and keeps advancing state', async () => {
    const first = await approvePhaseAt(dir, 'clarify')
    expectOk(first)
    let state = await readJson<{ currentPhase: string }>(join(dir, '.easy-codex/workflow.json'))
    expect(state?.currentPhase).toBe('spec')

    const second = await approvePhaseAt(dir, 'spec')
    expectOk(second)
    state = await readJson<{ currentPhase: string }>(join(dir, '.easy-codex/workflow.json'))
    expect(state?.currentPhase).toBe('design')

    const memos = await readJson<{ memos: Array<{ phase: string }> }>(
      join(dir, '.easy-codex/memos.json'),
    )
    expect(memos?.memos.map((m) => m.phase)).toEqual(['clarify', 'spec'])

    const log = await git(['log', '--format=%B'])
    expect(log).toContain('approved:clarify')
    expect(log).toContain('approved:spec')
  })
})
