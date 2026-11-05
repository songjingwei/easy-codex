import { createFileRoute, useRouter } from '@tanstack/react-router'
import { useCallback, useEffect, useState } from 'react'
import { approvePhase, getKanban, readArtifactFn } from '../lib/fns'
import type { KanbanModel } from '../lib/kanban'
import '../styles.css'

// Loader data is a discriminated union so the component can render a banner
// instead of crashing when the server function reports (or the transport
// throws) an unexpected error.
type LoaderData =
  | { ok: true; model: KanbanModel; warnings: string[] }
  | { ok: false; error: string }

export const Route = createFileRoute('/')({
  loader: async (): Promise<LoaderData> => {
    try {
      return await getKanban()
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : String(err) }
    }
  },
  component: Home,
})

interface OpenArtifact {
  path: string
  content: string
}

function Home() {
  const data = Route.useLoaderData()
  const router = useRouter()
  const [artifact, setArtifact] = useState<OpenArtifact | null>(null)
  const [artifactError, setArtifactError] = useState<string | null>(null)
  const [artifactLoading, setArtifactLoading] = useState(false)
  const [approving, setApproving] = useState(false)
  const [approveError, setApproveError] = useState<string | null>(null)

  // 2s polling via router.invalidate() → loader re-runs → getKanban re-reads
  // disk. Paused while the tab is hidden; interval + listener removed on unmount.
  useEffect(() => {
    const id = setInterval(() => {
      if (!document.hidden) void router.invalidate()
    }, 2000)
    const onVisibility = () => {
      // Refresh immediately when the tab becomes visible again.
      if (!document.hidden) void router.invalidate()
    }
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      clearInterval(id)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [router])

  const openArtifact = useCallback(async (path: string) => {
    setArtifact(null)
    setArtifactError(null)
    setArtifactLoading(true)
    try {
      const result = await readArtifactFn({ data: { path } })
      if (result.ok) {
        setArtifact({ path: result.path, content: result.content })
      } else {
        setArtifactError(`读取失败 (${result.status}): ${result.error}`)
      }
    } catch (err) {
      setArtifactError(err instanceof Error ? err.message : String(err))
    } finally {
      setArtifactLoading(false)
    }
  }, [])

  const closeArtifact = useCallback(() => {
    setArtifact(null)
    setArtifactError(null)
  }, [])

  // Current-phase approval (spec BR-4): confirm → POST approvePhase →
  // immediately invalidate (the 2s poll also picks it up) or surface the
  // error verbatim in a banner. Never fails silently.
  const approve = useCallback(
    async (phase: string) => {
      if (!window.confirm(`批准 ${phase}？将生成 approved:${phase} 提交并推进到下一阶段`)) return
      setApproving(true)
      setApproveError(null)
      try {
        const result = await approvePhase({ data: { phase } })
        if (result.ok) {
          await router.invalidate()
        } else {
          setApproveError(result.error)
        }
      } catch (err) {
        setApproveError(err instanceof Error ? err.message : String(err))
      } finally {
        setApproving(false)
      }
    },
    [router],
  )

  // Esc closes the artifact viewer.
  useEffect(() => {
    if (!artifact && !artifactError) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeArtifact()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [artifact, artifactError, closeArtifact])

  return (
    <main>
      <h1>easy-codex — Web Kanban</h1>
      <p className="subtitle">Seven-phase flow: clarify → spec → design → tickets → implement → accept → retro</p>

      {!data.ok && (
        <div className="banner error" role="alert">
          看板数据加载失败：{data.error}
        </div>
      )}
      {data.ok && data.warnings.length > 0 && (
        <div className="banner warning" role="alert">
          状态文件异常（已按默认状态渲染）：{data.warnings.join('；')}
        </div>
      )}
      {approveError && (
        <div className="banner error" role="alert">
          批准失败：{approveError}
        </div>
      )}

      {data.ok && (
        <div className="board">
          {data.model.columns.map((col) => {
            const isCurrent = col.phase === data.model.currentPhase
            return (
              <section key={col.phase} className={isCurrent ? 'column current' : 'column'}>
                <header className="column-head">
                  <h2>{col.phase}</h2>
                  {isCurrent && <span className="badge">当前阶段</span>}
                </header>
                <div className="status">
                  {col.status === 'approved' ? (
                    <>
                      <code className="sha">{col.commit ? col.commit.slice(0, 7) : '已批准'}</code>
                      {col.approvedAt && (
                        <time className="approved-at" dateTime={col.approvedAt}>
                          {col.approvedAt}
                        </time>
                      )}
                    </>
                  ) : (
                    <span className="unapproved">未批准</span>
                  )}
                </div>
                {isCurrent && col.status !== 'approved' && (
                  <button
                    type="button"
                    className="approve-btn"
                    disabled={approving}
                    onClick={() => void approve(col.phase)}
                  >
                    {approving ? '批准中…' : '批准'}
                  </button>
                )}
                <ul className="artifacts">
                  {col.artifacts.length === 0 ? (
                    <li className="empty">无产物</li>
                  ) : (
                    col.artifacts.map((path) => (
                      <li key={path}>
                        <button type="button" className="artifact-link" onClick={() => void openArtifact(path)}>
                          {path}
                        </button>
                      </li>
                    ))
                  )}
                </ul>
              </section>
            )
          })}
        </div>
      )}

      {artifactLoading && (
        <div className="modal-backdrop" onClick={closeArtifact}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <p className="modal-loading">加载中…</p>
          </div>
        </div>
      )}

      {artifactError && (
        <div className="modal-backdrop" onClick={closeArtifact}>
          <div className="modal" role="alertdialog" aria-label="artifact error">
            <div className="modal-head">
              <span>{artifactError}</span>
              <button type="button" className="close" onClick={closeArtifact}>
                ✕
              </button>
            </div>
          </div>
        </div>
      )}

      {artifact && (
        <div className="modal-backdrop" onClick={closeArtifact}>
          <div className="modal" role="dialog" aria-label={artifact.path} onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <span className="modal-path">{artifact.path}</span>
              <button type="button" className="close" onClick={closeArtifact} aria-label="close">
                ✕
              </button>
            </div>
            <pre className="modal-content">{artifact.content}</pre>
          </div>
        </div>
      )}
    </main>
  )
}
