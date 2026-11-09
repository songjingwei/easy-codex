// Disk-backed data layer tests (ticket 03, TDD core). Each test builds a
// throwaway repo fixture under mkdtemp so loadKanban / resolveArtifactPath /
// readArtifact run against real files with no shared state.
import { mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
  ArtifactError,
  findRepoRoot,
  listArtifactFiles,
  loadKanban,
  loadKanbanReport,
  readArtifact,
  resolveArtifactPath,
} from './server-data'

let root: string

function write(relPath: string, content: string): void {
  const full = join(root, relPath)
  mkdirSync(join(full, '..'), { recursive: true })
  writeFileSync(full, content, 'utf8')
}

function writeEasyCodex(files: Record<string, string>): void {
  for (const [name, content] of Object.entries(files)) {
    write(join('.easy-codex', name), content)
  }
}

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'easy-codex-web03-'))
})

afterEach(() => {
  rmSync(root, { recursive: true, force: true })
})

describe('loadKanban', () => {
  it('builds the model from workflow.json and memos.json (happy path)', () => {
    writeEasyCodex({
      'workflow.json': JSON.stringify({
        currentPhase: 'spec',
        approvedAt: { clarify: '2026-01-01T09:00:00Z' },
      }),
      // real on-disk shape written by root src/memo.ts: { memos: [...] }
      'memos.json': JSON.stringify({
        memos: [
          {
            phase: 'clarify',
            commit: 'abcdef1234567890',
            approvedAt: '2026-01-01T09:00:00Z',
            artifacts: ['specs/web-kanban/spec.md'],
          },
        ],
      }),
    })

    const model = loadKanban(root)

    expect(model.currentPhase).toBe('spec')
    expect(model.columns).toHaveLength(7)
    expect(model.columns[0]).toMatchObject({
      phase: 'clarify',
      status: 'approved',
      commit: 'abcdef1234567890',
      artifacts: ['specs/web-kanban/spec.md'],
    })
    expect(model.columns[1]?.status).toBe('awaiting')
    expect(model.columns.slice(2).every((c) => c.status === 'pending')).toBe(true)
    expect(loadKanbanReport(root).warnings).toEqual([])
  })

  it('returns fresh-workflow defaults when .easy-codex/ is missing (edge case: first run)', () => {
    const model = loadKanban(root)

    expect(model.currentPhase).toBe('clarify')
    expect(model.columns).toHaveLength(7)
    expect(model.columns.every((c) => c.commit === undefined)).toBe(true)
    expect(model.columns.every((c) => c.artifacts.length === 0)).toBe(true)
    expect(loadKanbanReport(root).warnings).toEqual([])
  })

  it('tolerates corrupt workflow.json: defaults + warning, no throw (edge case)', () => {
    writeEasyCodex({ 'workflow.json': '{ not json' })

    const report = loadKanbanReport(root)

    expect(report.model.currentPhase).toBe('clarify')
    expect(report.warnings).toHaveLength(1)
    expect(report.warnings[0]).toContain('workflow.json')
    // loadKanban keeps the same tolerant behaviour behind the simple signature
    expect(loadKanban(root).columns).toHaveLength(7)
  })

  it('tolerates corrupt memos.json: renders as no approvals + warning (edge case)', () => {
    writeEasyCodex({
      'workflow.json': JSON.stringify({ currentPhase: 'design' }),
      'memos.json': ']]]',
    })

    const report = loadKanbanReport(root)

    expect(report.model.currentPhase).toBe('design')
    expect(report.model.columns.every((c) => c.status !== 'approved')).toBe(true)
    expect(report.warnings.some((w) => w.includes('memos.json'))).toBe(true)
  })

  it('treats non-object JSON payloads as missing state without warnings', () => {
    writeEasyCodex({
      'workflow.json': 'null',
      'memos.json': '{"nope": true}',
    })

    const report = loadKanbanReport(root)

    expect(report.model.currentPhase).toBe('clarify')
    expect(report.model.columns.every((c) => c.status !== 'approved')).toBe(true)
    expect(report.warnings).toEqual([])
  })

  it('also accepts a bare memos array (hand-edited tolerance)', () => {
    writeEasyCodex({
      'workflow.json': JSON.stringify({ currentPhase: 'spec' }),
      'memos.json': JSON.stringify([
        { phase: 'clarify', commit: 'abcdef1234567890', approvedAt: '2026-01-01T09:00:00Z' },
      ]),
    })

    const model = loadKanban(root)

    expect(model.columns[0]).toMatchObject({ status: 'approved', commit: 'abcdef1234567890' })
    expect(model.columns[1]?.status).toBe('awaiting')
  })
})

describe('listArtifactFiles', () => {
  it('lists nested files under specs/, tickets/ and acceptance/ as sorted repo-relative paths', () => {
    write('specs/a/prd.md', 'prd')
    write('specs/a/deep/spec.md', 'spec')
    write('tickets/a/01-scaffold.md', 'ticket')
    write('acceptance/a/report.md', 'report')

    expect(listArtifactFiles(root)).toEqual([
      'acceptance/a/report.md',
      'specs/a/deep/spec.md',
      'specs/a/prd.md',
      'tickets/a/01-scaffold.md',
    ])
  })

  it('skips missing artifact dirs silently', () => {
    expect(listArtifactFiles(root)).toEqual([])

    write('specs/a/spec.md', 'spec')
    expect(listArtifactFiles(root)).toEqual(['specs/a/spec.md'])
  })

  it('skips hidden files and directories', () => {
    write('specs/visible.md', 'visible')
    write('specs/.hidden.md', 'hidden')
    write('specs/.hidden-dir/secret.md', 'secret')
    write('tickets/.gitkeep', '')

    expect(listArtifactFiles(root)).toEqual(['specs/visible.md'])
  })

  it('does not follow symlinked directories out of the artifact dirs', () => {
    const outside = mkdtempSync(join(tmpdir(), 'easy-codex-web03-outside-'))
    try {
      writeFileSync(join(outside, 'secret.txt'), 'top secret')
      mkdirSync(join(root, 'specs'), { recursive: true })
      symlinkSync(outside, join(root, 'specs/esc'), 'dir')

      expect(listArtifactFiles(root)).toEqual([])
    } finally {
      rmSync(outside, { recursive: true, force: true })
    }
  })
})

describe('resolveArtifactPath', () => {
  it('resolves paths under specs/, tickets/ and acceptance/ (happy path)', () => {
    expect(resolveArtifactPath(root, 'specs/web-kanban/spec.md')).toBe(
      join(root, 'specs/web-kanban/spec.md'),
    )
    expect(resolveArtifactPath(root, 'tickets/web-kanban/03-kanban-ui.md')).toBe(
      join(root, 'tickets/web-kanban/03-kanban-ui.md'),
    )
    expect(resolveArtifactPath(root, 'acceptance/web-kanban.md')).toBe(
      join(root, 'acceptance/web-kanban.md'),
    )
  })

  it('rejects ../ escape out of the repo root with a 403-style error', () => {
    expect(() => resolveArtifactPath(root, '../src/index.ts')).toThrow(ArtifactError)
    try {
      resolveArtifactPath(root, '../src/index.ts')
      expect.unreachable('should have thrown')
    } catch (err) {
      expect((err as ArtifactError).status).toBe(403)
    }
  })

  it('rejects in-repo traversal that lands outside the artifact dirs (403)', () => {
    try {
      resolveArtifactPath(root, 'specs/../../package.json')
      expect.unreachable('should have thrown')
    } catch (err) {
      expect((err as ArtifactError).status).toBe(403)
    }
  })

  it('rejects absolute paths outside the repo artifact dirs (403)', () => {
    try {
      resolveArtifactPath(root, '/etc/hostname')
      expect.unreachable('should have thrown')
    } catch (err) {
      expect((err as ArtifactError).status).toBe(403)
    }
  })

  it('rejects paths that never enter an artifact dir (403)', () => {
    for (const bad of ['src/index.ts', '.easy-codex/workflow.json', 'README.md', '']) {
      try {
        resolveArtifactPath(root, bad)
        expect.unreachable(`should have thrown for ${bad}`)
      } catch (err) {
        expect((err as ArtifactError).status).toBe(403)
      }
    }
  })

  it('rejects escaping into .easy-codex via a allowed-prefix traversal (403)', () => {
    try {
      resolveArtifactPath(root, 'specs/../.easy-codex/memos.json')
      expect.unreachable('should have thrown')
    } catch (err) {
      expect((err as ArtifactError).status).toBe(403)
    }
  })

  it('rejects a directory symlink that escapes the artifact dirs (403)', () => {
    const outside = mkdtempSync(join(tmpdir(), 'easy-codex-web03-secret-'))
    try {
      writeFileSync(join(outside, 'secret.txt'), 'top secret')
      mkdirSync(join(root, 'specs'), { recursive: true })
      symlinkSync(outside, join(root, 'specs/esc'), 'dir')

      try {
        resolveArtifactPath(root, 'specs/esc/secret.txt')
        expect.unreachable('should have thrown')
      } catch (err) {
        expect((err as ArtifactError).status).toBe(403)
      }
      try {
        readArtifact(root, 'specs/esc/secret.txt')
        expect.unreachable('should have thrown')
      } catch (err) {
        expect((err as ArtifactError).status).toBe(403)
      }
    } finally {
      rmSync(outside, { recursive: true, force: true })
    }
  })

  it('rejects a file symlink pointing outside the artifact dirs (403)', () => {
    mkdirSync(join(root, 'specs'), { recursive: true })
    symlinkSync('/etc/hostname', join(root, 'specs/link.md'))

    try {
      resolveArtifactPath(root, 'specs/link.md')
      expect.unreachable('should have thrown')
    } catch (err) {
      expect((err as ArtifactError).status).toBe(403)
    }
  })

  it('allows a symlink that stays inside the artifact dirs (readable)', () => {
    write('specs/demo/spec.md', 'real spec')
    symlinkSync(join(root, 'specs/demo/spec.md'), join(root, 'specs/alias.md'))

    expect(resolveArtifactPath(root, 'specs/alias.md')).toBe(join(root, 'specs/alias.md'))
    expect(readArtifact(root, 'specs/alias.md').content).toBe('real spec')
  })
})

describe('readArtifact', () => {
  it('returns the utf8 content of an artifact file (happy path)', () => {
    write('specs/web-kanban/spec.md', '# Spec — Web Kanban\n\n内容 content')

    const result = readArtifact(root, 'specs/web-kanban/spec.md')

    expect(result.path).toBe('specs/web-kanban/spec.md')
    expect(result.content).toBe('# Spec — Web Kanban\n\n内容 content')
  })

  it('throws a 404-style error for a missing artifact file', () => {
    mkdirSync(join(root, 'specs'), { recursive: true })
    try {
      readArtifact(root, 'specs/does-not-exist.md')
      expect.unreachable('should have thrown')
    } catch (err) {
      expect((err as ArtifactError).status).toBe(404)
    }
  })

  it('throws 403 (not 404) when the request escapes the artifact dirs', () => {
    try {
      readArtifact(root, '../outside.md')
      expect.unreachable('should have thrown')
    } catch (err) {
      expect((err as ArtifactError).status).toBe(403)
    }
  })
})

describe('findRepoRoot', () => {
  it('walks up from a nested cwd to the dir holding .easy-codex/.git markers', () => {
    write('.easy-codex/workflow.json', '{}')
    mkdirSync(join(root, 'web', 'src'), { recursive: true })

    expect(findRepoRoot(join(root, 'web', 'src'))).toBe(root)
  })

  it('returns the start dir when no marker is found', () => {
    expect(findRepoRoot(root)).toBe(root)
  })
})
