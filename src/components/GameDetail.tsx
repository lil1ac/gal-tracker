import { useCallback, useEffect, useMemo, useState } from 'react'
import { Game, GameProcess, Resource, Route } from '../types'
import { useGameStore } from '../store/gameStore'
import { ProcessConfig } from './ProcessConfig'
import { BangumiPanel } from './BangumiPanel'
import { query } from '../services/database'
import { canLaunchProcess, isGameLaunchAvailable, launchGameProcess } from '../services/launchService'
import { formatDuration, GameActionKey, getGameActionItems } from '../services/libraryStats'

interface GameDetailProps {
  game: Game
  onBack: () => void
  processElapsed: number
  isProcessRunning: boolean
  focusTarget?: GameActionKey | null
}

type DetailTab = 'info' | 'sessions' | 'routes' | 'resources' | 'processes' | 'bangumi'

const STATUS_OPTIONS = [
  { key: 'wish' as const, label: '想玩' },
  { key: 'playing' as const, label: '在玩' },
  { key: 'completed' as const, label: '已完成' },
  { key: 'paused' as const, label: '搁置' },
]

const endReasonLabels: Record<string, string> = {
  process_exit: '进程退出',
  user_stop: '手动记录',
  app_close: '应用关闭',
  too_short: '过短忽略',
  error: '异常',
  app_crash: '异常恢复',
}

function formatElapsed(seconds: number) {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  return `${m}:${String(s).padStart(2, '0')}`
}

function toDatetimeLocal(timestamp: number) {
  const date = new Date(timestamp)
  const offset = date.getTimezoneOffset() * 60000
  return new Date(date.getTime() - offset).toISOString().slice(0, 16)
}

function toDateInput(timestamp: number | null) {
  if (!timestamp) return ''
  const date = new Date(timestamp)
  const offset = date.getTimezoneOffset() * 60000
  return new Date(date.getTime() - offset).toISOString().slice(0, 10)
}

function parseLocalDate(value: string) {
  if (!value) return null
  const timestamp = new Date(`${value}T12:00:00`).getTime()
  return Number.isFinite(timestamp) ? timestamp : null
}

function formatDate(timestamp: number | null) {
  if (!timestamp) return '未设置'
  return new Date(timestamp).toLocaleDateString('zh-CN')
}

function formatDateTime(timestamp: number | null) {
  if (!timestamp) return '-'
  return new Date(timestamp).toLocaleString('zh-CN')
}

function TabBar({ tabs, activeTab, onSelect }: { tabs: { key: DetailTab; label: string }[]; activeTab: DetailTab; onSelect: (key: DetailTab) => void }) {
  return (
    <div className="flex gap-1 overflow-x-auto px-5">
      {tabs.map(t => (
        <button
          type="button"
          key={t.key}
          onClick={() => onSelect(t.key)}
          className={`relative whitespace-nowrap px-4 py-3 text-sm font-medium transition-colors ${
            activeTab === t.key ? 'text-[var(--accent)]' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
          }`}
        >
          {t.label}
          {activeTab === t.key && <span className="absolute bottom-0 left-3 right-3 h-0.5 rounded-full bg-[var(--accent)]" />}
        </button>
      ))}
    </div>
  )
}

export function GameDetail({ game, onBack, processElapsed, isProcessRunning, focusTarget }: GameDetailProps) {
  const { updateGame, deleteGame, sessions, addManualSession, deleteSession } = useGameStore()
  const [activeTab, setActiveTab] = useState<DetailTab>('info')
  const [newRouteName, setNewRouteName] = useState('')
  const [newResourceUrl, setNewResourceUrl] = useState('')
  const [newResourceType, setNewResourceType] = useState<'link' | 'screenshot'>('link')
  const [newResourceDesc, setNewResourceDesc] = useState('')
  const [manualStartedAt, setManualStartedAt] = useState(toDatetimeLocal(Date.now()))
  const [manualMinutes, setManualMinutes] = useState('60')
  const [tagDraft, setTagDraft] = useState(game.tags.join(', '))
  const [reviewDraft, setReviewDraft] = useState(game.review || '')
  const [completedAtDraft, setCompletedAtDraft] = useState(toDateInput(game.completed_at))
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [highlight, setHighlight] = useState<GameActionKey | null>(null)
  const [launchProcess, setLaunchProcess] = useState<GameProcess | null>(null)
  const [launchBusy, setLaunchBusy] = useState(false)
  const [launchMessage, setLaunchMessage] = useState('')

  const loadLaunchProcess = useCallback(async () => {
    const rows = await query<GameProcess>(
      `SELECT * FROM game_processes
       WHERE game_id = ? AND enabled = 1 AND exe_path IS NOT NULL
       ORDER BY updated_at DESC
       LIMIT 1`,
      [game.id]
    )
    setLaunchProcess(rows[0] ?? null)
  }, [game.id])

  useEffect(() => {
    setTagDraft(game.tags.join(', '))
    setReviewDraft(game.review || '')
    setCompletedAtDraft(toDateInput(game.completed_at))
  }, [game.id, game.tags, game.review, game.completed_at])

  useEffect(() => { loadLaunchProcess() }, [loadLaunchProcess])

  useEffect(() => {
    if (!focusTarget) return
    jumpToAction(focusTarget)
  }, [focusTarget, game.id])

  useEffect(() => {
    if (!highlight) return
    const timer = window.setTimeout(() => setHighlight(null), 1800)
    return () => window.clearTimeout(timer)
  }, [highlight])

  const gameSessions = sessions.filter(session => session.game_id === game.id)
  const totalSessionSeconds = gameSessions.reduce((sum, session) => {
    if (session.duration_seconds) return sum + session.duration_seconds
    if (!session.ended_at) return sum + Math.max(0, Math.floor((Date.now() - session.started_at) / 1000))
    return sum
  }, 0)
  const completedRoutes = game.routes.filter(r => r.completed_at).length
  const actionItems = useMemo(() => getGameActionItems(game), [game])

  const handleRating = (rating: number) => updateGame(game.id, { rating })
  const handleReview = (review: string) => updateGame(game.id, { review })
  const handleTags = (tags: string) => updateGame(game.id, { tags: tags.split(',').map(t => t.trim()).filter(Boolean) })
  const handleCompletedDate = (value: string) => {
    setCompletedAtDraft(value)
    updateGame(game.id, { completed_at: parseLocalDate(value) })
  }
  const clearCompletedDate = () => {
    setCompletedAtDraft('')
    updateGame(game.id, { completed_at: null })
  }
  const handleStatus = (status: typeof game.status) => {
    updateGame(game.id, {
      status,
      completed_at: status === 'completed' && !game.completed_at ? Date.now() : game.completed_at,
    })
  }

  const jumpToAction = (key: GameActionKey) => {
    setHighlight(key)
    if (key === 'routes') {
      setActiveTab('routes')
    } else {
      setActiveTab('info')
    }
    window.setTimeout(() => {
      document.getElementById(`detail-${key}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }, 40)
  }

  const handleAddRoute = () => {
    if (!newRouteName.trim()) return
    const route: Route = { id: String(Date.now()), name: newRouteName.trim(), choices: [], completed_at: null }
    updateGame(game.id, { routes: [...game.routes, route] })
    setNewRouteName('')
  }

  const handleToggleRoute = (routeId: string) => {
    updateGame(game.id, {
      routes: game.routes.map(r => r.id === routeId ? { ...r, completed_at: r.completed_at ? null : Date.now() } : r)
    })
  }

  const handleDeleteRoute = (routeId: string) => {
    updateGame(game.id, { routes: game.routes.filter(r => r.id !== routeId) })
  }

  const handleAddResource = () => {
    if (!newResourceUrl.trim()) return
    const res: Resource = { id: String(Date.now()), type: newResourceType, url: newResourceUrl.trim(), description: newResourceDesc.trim() || null }
    updateGame(game.id, { linked_resources: [...game.linked_resources, res] })
    setNewResourceUrl('')
    setNewResourceDesc('')
  }

  const handleDeleteResource = (resId: string) => {
    updateGame(game.id, { linked_resources: game.linked_resources.filter(r => r.id !== resId) })
  }

  const handleDeleteGame = () => {
    if (confirmDelete === 'game') { deleteGame(game.id); onBack() }
    else setConfirmDelete('game')
  }

  const handleAddManualSession = async () => {
    const startedAt = new Date(manualStartedAt).getTime()
    const minutes = Number(manualMinutes)
    if (!Number.isFinite(startedAt) || !Number.isFinite(minutes) || minutes <= 0) return
    await addManualSession(game.id, startedAt, Math.round(minutes * 60))
    setManualStartedAt(toDatetimeLocal(Date.now()))
    setManualMinutes('60')
  }

  const handleLaunchGame = async () => {
    if (!canLaunchProcess(launchProcess)) {
      setLaunchMessage('请先在进程监控里绑定带路径的 exe')
      return
    }
    setLaunchBusy(true)
    setLaunchMessage('')
    try {
      await launchGameProcess(launchProcess)
      setLaunchMessage('已发送启动命令')
    } catch (error) {
      setLaunchMessage(error instanceof Error ? error.message : '启动失败')
    } finally {
      setLaunchBusy(false)
    }
  }

  const tabs: { key: DetailTab; label: string }[] = [
    { key: 'info', label: '信息' },
    { key: 'sessions', label: '记录' },
    { key: 'routes', label: `路线${game.routes.length ? ` ${completedRoutes}/${game.routes.length}` : ''}` },
    { key: 'resources', label: `资源${game.linked_resources.length ? ` ${game.linked_resources.length}` : ''}` },
    { key: 'processes', label: '进程' },
    { key: 'bangumi', label: 'Bangumi' },
  ]

  return (
    <div className="flex-1 min-w-0 overflow-y-auto bg-[var(--bg-primary)]">
      {/* Header */}
      <header className="sticky top-0 z-20 border-b border-[var(--border)] bg-[var(--bg-secondary)]/95 backdrop-blur">
        <div className="flex h-14 items-center gap-3 px-5">
          <button type="button" onClick={onBack} className="btn btn-secondary btn-sm">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            返回
          </button>
          <div className="min-w-0">
            <h1 className="truncate text-sm font-semibold">{game.name_cn || game.name}</h1>
            {game.name_cn && <p className="truncate text-xs text-[var(--text-secondary)]">{game.name}</p>}
          </div>
        </div>
      </header>

      {/* Hero */}
      <div className="mx-auto max-w-4xl px-5 pt-5">
        <section className="detail-hero overflow-hidden rounded-2xl border">
          <div className="flex flex-col sm:flex-row gap-6 p-6">
            <div className="shrink-0 mx-auto sm:mx-0 w-32">
              <div className="detail-cover-frame w-32">
                {game.cover_url ? (
                  <img src={game.cover_url} alt={game.name} />
                ) : (
                  <div className="flex h-full items-center justify-center text-xs text-[var(--text-secondary)]">无封面</div>
                )}
              </div>
            </div>

            <div className="min-w-0 flex-1 flex flex-col justify-between">
              <div>
                <div className="flex flex-wrap gap-1.5">
                  {STATUS_OPTIONS.map(s => (
                    <button
                      type="button"
                      key={s.key}
                      onClick={() => handleStatus(s.key)}
                      className={`status-pill${game.status === s.key ? ' is-active' : ''}`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>

                <div className="mt-5 grid gap-2.5 grid-cols-2 sm:grid-cols-4">
                  <div className="stat-tile">
                    <span>评分</span>
                    <strong>{game.rating ? `${game.rating}/10` : '未评分'}</strong>
                  </div>
                  <div className="stat-tile">
                    <span>累计时长</span>
                    <strong>{formatDuration(totalSessionSeconds)}</strong>
                  </div>
                  <div className="stat-tile">
                    <span>通关时间</span>
                    <strong>{formatDate(game.completed_at)}</strong>
                  </div>
                  <div className="stat-tile">
                    <span>路线</span>
                    <strong>{game.routes.length ? `${completedRoutes}/${game.routes.length}` : '未记录'}</strong>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1 text-xs text-[var(--text-secondary)]">
                  {game.platform.length > 0 && <span>平台：{game.platform.join(' / ')}</span>}
                  {game.air_date && <span>发售日：{game.air_date}</span>}
                  <span>更新：{formatDate(game.updated_at)}</span>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleLaunchGame}
                  disabled={!canLaunchProcess(launchProcess) || !isGameLaunchAvailable() || launchBusy}
                  className="btn btn-primary"
                  title={!canLaunchProcess(launchProcess) ? '请先在进程监控里绑定带路径的 exe' : isGameLaunchAvailable() ? '启动游戏' : '启动游戏仅在桌面版可用'}
                >
                  <svg className="h-4 w-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {launchBusy ? '启动中...' : '启动游戏'}
                </button>
                {isProcessRunning && (
                  <div className="inline-flex items-center gap-2 rounded-full border border-emerald-300 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950 px-3 py-1.5 text-xs">
                    <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-emerald-700 dark:text-emerald-300">本次</span>
                    <span className="font-bold tabular-nums">{formatElapsed(processElapsed)}</span>
                  </div>
                )}
                {launchMessage && (
                  <span className="inline-flex items-center rounded-md bg-[var(--surface-subtle)] px-3 py-1.5 text-xs text-[var(--text-secondary)]">{launchMessage}</span>
                )}
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* Tab bar */}
      <div className="sticky top-[56px] z-10 border-b border-[var(--border)] bg-[var(--bg-primary)]/95 backdrop-blur">
        <div className="mx-auto max-w-4xl">
          <TabBar tabs={tabs} activeTab={activeTab} onSelect={setActiveTab} />
        </div>
      </div>

      {/* Tab content */}
      <div className="mx-auto max-w-4xl px-5 py-5">
        {activeTab === 'info' && (
          <div className="space-y-5">
            {actionItems.length > 0 && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-800 dark:bg-amber-950">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-semibold text-amber-700 dark:text-amber-300">整理建议</span>
                  {actionItems.map(item => (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => jumpToAction(item.key)}
                      className={`rounded-md border px-2 py-1 text-xs font-medium transition-all ${
                        item.tone === 'important'
                          ? 'border-amber-400 bg-amber-100 text-amber-800 dark:border-amber-600 dark:bg-amber-900 dark:text-amber-200'
                          : 'border-amber-200 bg-white text-amber-700 hover:border-amber-400 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-300'
                      }`}
                    >
                      {item.label} →
                    </button>
                  ))}
                </div>
              </div>
            )}

            <section id="detail-rating" className={`panel p-4 ${highlight === 'rating' ? 'detail-section-focus' : ''}`}>
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-sm font-semibold">评分</h2>
                <span className="text-sm font-semibold text-[var(--accent)]">{game.rating || '-'}/10</span>
              </div>
              <div className="mt-3 flex flex-wrap gap-1">
                {Array.from({ length: 10 }, (_, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => handleRating(i + 1)}
                    className={`star-button ${i < (game.rating || 0) ? 'is-active' : ''}`}
                    aria-label={`${i + 1} 分`}
                  >
                    ★
                  </button>
                ))}
              </div>
            </section>

            <section id="detail-review" className={`panel p-4 ${highlight === 'review' ? 'detail-section-focus' : ''}`}>
              <h2 className="text-sm font-semibold">评价与感想</h2>
              <textarea
                value={reviewDraft}
                onChange={e => setReviewDraft(e.target.value)}
                onBlur={e => handleReview(e.target.value)}
                rows={4}
                placeholder="可以只写一句：打完后的印象、推荐路线、雷点或值得回味的地方。"
                className="field mt-3 resize-none"
              />
            </section>

            <section id="detail-tags" className={`panel p-4 ${highlight === 'tags' ? 'detail-section-focus' : ''}`}>
              <h2 className="text-sm font-semibold">标签</h2>
              {game.tags.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {game.tags.map(tag => (
                    <span key={tag} className="rounded-full bg-[var(--accent-soft)] px-2 py-0.5 text-xs font-medium text-[var(--accent)]">{tag}</span>
                  ))}
                </div>
              )}
              <input
                type="text"
                value={tagDraft}
                onChange={e => setTagDraft(e.target.value)}
                onBlur={e => handleTags(e.target.value)}
                placeholder="剧情向, 泣系, 悬疑..."
                className="field mt-3"
              />
            </section>

            <section id="detail-completed_at" className={`panel p-4 ${highlight === 'completed_at' ? 'detail-section-focus' : ''}`}>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-sm font-semibold">通关时间</h2>
                  <p className="mt-1 text-xs text-[var(--text-secondary)]">适合补老游戏，只记得大概日期也可以填。</p>
                </div>
                <button type="button" onClick={clearCompletedDate} className="btn btn-secondary btn-sm">清空</button>
              </div>
              <input
                type="date"
                value={completedAtDraft}
                onChange={e => handleCompletedDate(e.target.value)}
                className="field mt-3 max-w-xs"
                aria-label="通关日期"
                title="通关日期"
              />
            </section>

            <section className="panel p-4">
              {confirmDelete === 'game' ? (
                <div className="space-y-3">
                  <p className="text-sm text-red-600 dark:text-red-400">确认删除游戏？此操作不可撤销。</p>
                  <div className="flex gap-2">
                    <button type="button" onClick={handleDeleteGame} className="btn btn-danger">删除</button>
                    <button type="button" onClick={() => setConfirmDelete(null)} className="btn btn-secondary">取消</button>
                  </div>
                </div>
              ) : (
                <button type="button" onClick={handleDeleteGame} className="btn btn-danger text-sm">删除游戏</button>
              )}
            </section>
          </div>
        )}

        {activeTab === 'sessions' && (
          <div className="space-y-4">
            <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)] p-4">
              <div className="flex items-center gap-2 mb-3">
                <svg className="h-4 w-4 text-[var(--text-secondary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-xs font-medium text-[var(--text-secondary)]">手动补录</span>
              </div>
              <div className="grid gap-3 sm:grid-cols-[1fr_100px_auto]">
                <input type="datetime-local" value={manualStartedAt} onChange={e => setManualStartedAt(e.target.value)} className="field" aria-label="开始时间" title="开始时间" />
                <input type="number" min="1" value={manualMinutes} onChange={e => setManualMinutes(e.target.value)} placeholder="分钟" className="field" />
                <button type="button" onClick={handleAddManualSession} className="btn btn-primary">补录</button>
              </div>
            </div>
            {gameSessions.length === 0 ? (
              <p className="empty-state">暂无游玩记录。记不清也没关系，通关时间可以单独补。</p>
            ) : (
              <div className="space-y-2">
                {gameSessions.map(session => {
                  const runningDuration = !session.ended_at ? Math.max(0, Math.floor((Date.now() - session.started_at) / 1000)) : 0
                  const duration = session.duration_seconds ?? runningDuration
                  const isRunning = !session.ended_at
                  return (
                    <div key={session.id} className="flex items-center gap-4 rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)] p-4 transition-all duration-200 hover:border-[color-mix(in_srgb,var(--accent)_25%,var(--border))]">
                      <div className={`shrink-0 h-9 w-9 rounded-full flex items-center justify-center ${isRunning ? 'bg-emerald-100 dark:bg-emerald-900' : 'bg-[var(--surface-subtle)]'}`}>
                        {isRunning ? (
                          <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
                        ) : (
                          <svg className="h-4 w-4 text-[var(--text-secondary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium">{formatDateTime(session.started_at)}</div>
                        <div className="mt-0.5 truncate text-xs text-[var(--text-secondary)]">
                          {session.process_name === 'manual' ? '手动补录' : session.process_name}
                          {' · '}
                          {endReasonLabels[session.end_reason || ''] || (session.ended_at ? '已结束' : '运行中')}
                        </div>
                      </div>
                      <div className="shrink-0 text-sm font-semibold tabular-nums text-[var(--accent)]">{formatDuration(duration)}</div>
                      <button type="button" onClick={() => deleteSession(session.id)} className="btn btn-danger btn-sm">删除</button>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {activeTab === 'routes' && (
          <div id="detail-routes" className={highlight === 'routes' ? 'detail-section-focus rounded-xl p-2' : ''}>
            <div className="mb-4 flex gap-2">
              <input type="text" value={newRouteName} onChange={e => setNewRouteName(e.target.value)} placeholder="路线名称" className="field" onKeyDown={e => e.key === 'Enter' && handleAddRoute()} />
              <button type="button" onClick={handleAddRoute} className="btn btn-primary">添加</button>
            </div>
            {game.routes.length === 0 ? (
              <p className="empty-state">暂无路线记录</p>
            ) : (
              <div className="space-y-2">
                {game.routes.map(route => (
                  <div key={route.id} onClick={() => handleToggleRoute(route.id)} className={`route-row ${route.completed_at ? 'is-done' : ''}`}>
                    <div className={`route-dot${route.completed_at ? ' is-done' : ''}`}>
                      {route.completed_at && (
                        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className={route.completed_at ? 'line-through text-[var(--text-secondary)]' : 'font-medium'}>{route.name}</div>
                      <div className="text-xs text-[var(--text-secondary)]">{route.completed_at ? formatDate(route.completed_at) : '点击标记完成'}</div>
                    </div>
                    <button type="button" onClick={e => { e.stopPropagation(); handleDeleteRoute(route.id) }} className="btn btn-danger btn-sm">删除</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'resources' && (
          <div className="space-y-4">
            <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)] p-4">
              <div className="grid gap-2 sm:grid-cols-[120px_1fr]">
                <select title="资源类型" value={newResourceType} onChange={e => setNewResourceType(e.target.value as 'link' | 'screenshot')} className="field">
                  <option value="link">链接</option>
                  <option value="screenshot">截图</option>
                </select>
                <input type="text" value={newResourceUrl} onChange={e => setNewResourceUrl(e.target.value)} placeholder={newResourceType === 'link' ? '攻略链接 URL' : '截图路径'} className="field" />
                <input type="text" value={newResourceDesc} onChange={e => setNewResourceDesc(e.target.value)} placeholder="描述 (可选)" className="field sm:col-span-2" />
                <button type="button" onClick={handleAddResource} className="btn btn-primary sm:col-span-2">添加资源</button>
              </div>
            </div>
            {game.linked_resources.length === 0 ? (
              <p className="empty-state">暂无关联资源</p>
            ) : (
              <div className="space-y-2">
                {game.linked_resources.map(res => (
                  <div key={res.id} className="flex items-center justify-between gap-3 rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)] p-4 transition-all duration-200 hover:border-[color-mix(in_srgb,var(--accent)_25%,var(--border))]">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="shrink-0 h-8 w-8 rounded-lg bg-[var(--surface-subtle)] flex items-center justify-center">
                        {res.type === 'link' ? (
                          <svg className="h-4 w-4 text-[var(--text-secondary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                          </svg>
                        ) : (
                          <svg className="h-4 w-4 text-[var(--text-secondary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="truncate text-sm font-medium">{res.description || res.url}</div>
                        <div className="mt-0.5 text-xs text-[var(--text-secondary)]">{res.type === 'link' ? '链接' : '截图'}</div>
                      </div>
                    </div>
                    <a href={res.url} target="_blank" rel="noopener noreferrer" className="btn btn-secondary btn-sm">打开</a>
                    <button type="button" onClick={() => handleDeleteResource(res.id)} className="btn btn-danger btn-sm">删除</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'processes' && <ProcessConfig game={game} onProcessesChanged={loadLaunchProcess} />}

        {activeTab === 'bangumi' && <BangumiPanel game={game} />}
      </div>
    </div>
  )
}
