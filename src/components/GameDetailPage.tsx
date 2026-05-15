import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import type { BangumiSnapshot, Game, GameProcess, Resource, Route } from '../types'
import { useGameStore } from '../store/gameStore'
import {
  getBangumiCollectionTotal,
  getFeaturedCharacters,
  getFeaturedStaff,
  getTagsWithCount,
} from '../services/bangumiDisplay'
import { createGameFromBangumiMeta } from '../services/bangumiGame'
import { fetchBangumiSnapshot } from '../services/bangumiLibrary'
import { patchMyCollection } from '../services/bangumiMeta'
import { buildCollectionPayload } from '../services/bangumiSync'
import { query } from '../services/database'
import { canLaunchProcess, isGameLaunchAvailable, launchGameProcess } from '../services/launchService'
import { formatDuration, type GameActionKey, getGameActionItems } from '../services/libraryStats'
import { type DetailTab, getGameDetailTabs, getTabForGameAction } from './gameDetailTabs'
import { createCharacterRoute, createCustomRoute, toggleRouteCompletion } from './gameRoutes'
import { RecordsPanel, STATUS_OPTIONS, type RouteInputMode, parseLocalDate, toDateInput } from './RecordsPanel'
import { ProcessConfig } from './ProcessConfig'
import { BangumiEntityDetailPanel, type BangumiEntityTarget } from './BangumiEntityDetailPanel'
import { BangumiCommentsPanel } from './BangumiCommentsPanel'
import { usePageHeaderOverride } from './PageHeaderContext'

interface GameDetailPageProps {
  game: Game | null
  snapshot: BangumiSnapshot | null
  onBack: () => void
  onOpenSubject?: (subjectId: number) => void
  onOpenEntity?: (target: BangumiEntityTarget) => void
  processElapsed?: number
  isProcessRunning?: boolean
  focusTarget?: GameActionKey | null
}

const collectionLabels = [
  ['wish', '想玩'],
  ['doing', '在玩'],
  ['collect', '完成'],
  ['on_hold', '搁置'],
  ['dropped', '抛弃'],
] as const

function formatScore(score: number | null) {
  return score === null ? '-' : score.toFixed(1)
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

function TabBar({ tabs, activeTab, onSelect }: { tabs: { key: DetailTab; label: string }[]; activeTab: DetailTab; onSelect: (key: DetailTab) => void }) {
  return (
    <div className="detail-tabs">
      {tabs.map(tab => (
        <button
          type="button"
          key={tab.key}
          onClick={() => onSelect(tab.key)}
          className={`detail-tab${activeTab === tab.key ? ' is-active' : ''}`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  )
}

function RatingDistribution({ rating }: { rating: NonNullable<BangumiSnapshot['meta']>['rating'] }) {
  const entries: { label: string; count: number }[] = []
  for (let score = 1; score <= 10; score += 1) {
    entries.push({ label: `${score}`, count: Number(rating.count[String(score)] || 0) })
  }
  const maxCount = Math.max(...entries.map(e => e.count), 1)
  return (
    <div className="rating-distribution">
      <div className="rating-distribution-head">
        <span>评分分布</span>
        <span>共 {rating.total.toLocaleString()} 人</span>
      </div>
      <div className="rating-distribution-bars">
        {entries.map(entry => {
          const pct = Math.max(3, Math.round((entry.count / maxCount) * 100))
          return (
            <div key={entry.label} className="rating-bar-row">
              <span className="rating-bar-label">{entry.label}</span>
              <div className="rating-bar-track">
                <div className="rating-bar-fill" style={{ width: `${pct}%` } as CSSProperties} />
              </div>
              <span className="rating-bar-count">{entry.count}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export function GameDetailPage({
  game: gameProp,
  snapshot: snapshotProp,
  onBack,
  onOpenSubject: externalOpenSubject,
  onOpenEntity: externalOpenEntity,
  processElapsed = 0,
  isProcessRunning = false,
  focusTarget,
}: GameDetailPageProps) {
  const { games, addGame, updateGame, deleteGame, sessions, addManualSession, deleteSession } = useGameStore()

  // Determine if we have a game in the library
  const meta = snapshotProp?.meta ?? null
  const storedGame = games.find(g => g.id === String(meta?.subject_id)) || null
  const activeGame = gameProp || storedGame
  const isInLibrary = activeGame !== null

  // Bangumi data
  const [bangumiSnapshot, setBangumiSnapshot] = useState<BangumiSnapshot | null>(snapshotProp)
  const [bangumiBusy, setBangumiBusy] = useState('')
  const [bangumiMessage, setBangumiMessage] = useState('')

  // Internal navigation (when external callbacks not provided)
  const [entityTarget, setEntityTarget] = useState<BangumiEntityTarget | null>(null)
  const [relatedSnapshot, setRelatedSnapshot] = useState<BangumiSnapshot | null>(null)
  const openSeq = useRef(0)

  // Tab state
  const [activeTab, setActiveTab] = useState<DetailTab>('detail')

  // Records form state
  const [reviewDraft, setReviewDraft] = useState('')
  const [tagDraft, setTagDraft] = useState('')
  const [completedAtDraft, setCompletedAtDraft] = useState('')
  const [manualStartedAt, setManualStartedAt] = useState(toDatetimeLocal(Date.now()))
  const [manualMinutes, setManualMinutes] = useState('60')

  // Launch/process
  const [launchProcess, setLaunchProcess] = useState<GameProcess | null>(null)
  const [launchBusy, setLaunchBusy] = useState(false)
  const [launchMessage, setLaunchMessage] = useState('')

  // Add-to-library
  const [adding, setAdding] = useState(false)
  const [addedGameId, setAddedGameId] = useState<string | null>(null)
  const [quickCompleteDate, setQuickCompleteDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [addError, setAddError] = useState('')
  const [syncPrivate, setSyncPrivate] = useState(false)
  const [syncMessage, setSyncMessage] = useState('')

  // Delete
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)

  // Focus/highlight
  const [highlight, setHighlight] = useState<GameActionKey | null>(null)

  // Sync snapshot from props
  useEffect(() => {
    if (snapshotProp) setBangumiSnapshot(snapshotProp)
  }, [snapshotProp])

  // Fetch snapshot in library mode (when not provided from browse)
  const loadBangumi = useCallback(async (reason: 'load' | 'refresh' = 'load') => {
    if (!activeGame) return
    const subjectId = Number(activeGame.id)
    if (!Number.isFinite(subjectId)) {
      setBangumiMessage('Bangumi 条目 ID 无效')
      return
    }
    setBangumiBusy(reason)
    setBangumiMessage('')
    if (reason === 'load') setBangumiSnapshot(null)
    try {
      const snap = await fetchBangumiSnapshot(subjectId, activeGame.id)
      setBangumiSnapshot(snap)
      if (reason === 'refresh') setBangumiMessage('Bangumi 资料已刷新')
    } catch (error) {
      setBangumiMessage(error instanceof Error ? error.message : '加载 Bangumi 资料失败')
    } finally {
      setBangumiBusy('')
    }
  }, [activeGame?.id])

  // Fetch on mount when no snapshot provided
  const didLoadBangumi = useRef(false)
  useEffect(() => {
    if (!snapshotProp && activeGame && !didLoadBangumi.current) {
      didLoadBangumi.current = true
      loadBangumi('load')
    }
  }, [snapshotProp, activeGame?.id, loadBangumi])

  // Reset didLoadBangumi when game changes
  useEffect(() => {
    didLoadBangumi.current = false
  }, [activeGame?.id])

  // Load launch process
  const loadLaunchProcess = useCallback(async () => {
    if (!activeGame) return
    const rows = await query<GameProcess>(
      `SELECT * FROM game_processes
       WHERE game_id = ? AND enabled = 1 AND exe_path IS NOT NULL
       ORDER BY updated_at DESC
       LIMIT 1`,
      [activeGame.id]
    )
    setLaunchProcess(rows[0] ?? null)
  }, [activeGame?.id])

  useEffect(() => { if (isInLibrary) loadLaunchProcess() }, [loadLaunchProcess, isInLibrary])

  // Sync form drafts when game changes
  useEffect(() => {
    if (!activeGame) return
    setReviewDraft(activeGame.review || '')
    setTagDraft(activeGame.tags.join(', '))
    setCompletedAtDraft(toDateInput(activeGame.completed_at))
    setAddedGameId(null)
    setAddError('')
  }, [activeGame?.id])

  // Focus target
  useEffect(() => {
    if (!focusTarget || !activeGame) return
    jumpToAction(focusTarget)
  }, [focusTarget, activeGame?.id])

  // Highlight auto-clear
  useEffect(() => {
    if (!highlight) return
    const timer = window.setTimeout(() => setHighlight(null), 1800)
    return () => window.clearTimeout(timer)
  }, [highlight])

  // Register header override for library-mode entity/related navigation
  const pageHeaderState = useMemo((): Parameters<typeof usePageHeaderOverride>[0] => {
    if (entityTarget) {
      return { title: entityTarget.title, onBack: () => setEntityTarget(null) }
    }
    if (relatedSnapshot?.meta) {
      const title = relatedSnapshot.meta.title_cn || relatedSnapshot.meta.title || '相关游戏'
      return { title, onBack: () => setRelatedSnapshot(null) }
    }
    return null
  }, [entityTarget, relatedSnapshot])
  usePageHeaderOverride(pageHeaderState, [pageHeaderState])

  // Derived
  const currentMeta = bangumiSnapshot?.meta ?? meta
  const gameSessions = useMemo(() =>
    activeGame ? sessions.filter(s => s.game_id === activeGame.id) : [],
  [sessions, activeGame])
  const totalSessionSeconds = useMemo(() => {
    return gameSessions.reduce((sum, session) => {
      if (session.duration_seconds) return sum + session.duration_seconds
      if (!session.ended_at) return sum + Math.max(0, Math.floor((Date.now() - session.started_at) / 1000))
      return sum
    }, 0)
  }, [gameSessions])
  const completedRoutes = activeGame ? activeGame.routes.filter(route => route.completed_at).length : 0
  const actionItems = useMemo(() => activeGame ? getGameActionItems(activeGame) : [], [activeGame])
  const tabs = useMemo(() => activeGame ? getGameDetailTabs(activeGame) : [], [activeGame])
  const canLaunch = useMemo(() => launchProcess ? canLaunchProcess(launchProcess) && isGameLaunchAvailable() : false, [launchProcess])

  // Bangumi display data
  const collectionTotal = currentMeta ? getBangumiCollectionTotal(currentMeta.collection) : 0
  const tagsWithCount = useMemo(() => currentMeta ? getTagsWithCount(currentMeta, 18) : [], [currentMeta])
  const characters = useMemo(() => {
    const chars = bangumiSnapshot?.characters || snapshotProp?.characters || []
    return getFeaturedCharacters(chars, 10)
  }, [bangumiSnapshot?.characters, snapshotProp?.characters])
  const staff = useMemo(() => {
    const persons = bangumiSnapshot?.persons || snapshotProp?.persons || []
    return getFeaturedStaff(persons, 10)
  }, [bangumiSnapshot?.persons, snapshotProp?.persons])
  const relations = (bangumiSnapshot?.relations || snapshotProp?.relations || []).slice(0, 6)
  const episodes = (bangumiSnapshot?.episodes || snapshotProp?.episodes || []).slice(0, 18)
  const allCharacters = bangumiSnapshot?.characters || snapshotProp?.characters || []

  // Handlers
  const jumpToAction = (key: GameActionKey) => {
    setHighlight(key)
    setActiveTab(getTabForGameAction(key))
    window.setTimeout(() => {
      document.getElementById(`detail-${key}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }, 40)
  }

  const handleStatus = (status: Game['status']) => {
    if (!activeGame) return
    updateGame(activeGame.id, {
      status,
      completed_at: status === 'completed' && !activeGame.completed_at ? Date.now() : activeGame.completed_at,
    })
  }

  const handleLaunchGame = async () => {
    if (!launchProcess || !canLaunchProcess(launchProcess)) {
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

  const handleCompletedDate = (value: string) => {
    if (!activeGame) return
    setCompletedAtDraft(value)
    updateGame(activeGame.id, { completed_at: parseLocalDate(value) })
  }

  const handleAddManualSession = async () => {
    if (!activeGame) return
    const startedAt = new Date(manualStartedAt).getTime()
    const minutes = Number(manualMinutes)
    if (!Number.isFinite(startedAt) || !Number.isFinite(minutes) || minutes <= 0) return
    await addManualSession(activeGame.id, startedAt, Math.round(minutes * 60))
    setManualStartedAt(toDatetimeLocal(Date.now()))
    setManualMinutes('60')
  }

  const handleAddRoute = (mode: RouteInputMode, customName: string, characterId: string) => {
    if (!activeGame) return
    let route: Route | null = null
    if (mode === 'character') {
      const character = allCharacters.find(item => item.id === Number(characterId))
      if (character) route = createCharacterRoute(character)
    } else if (customName.trim()) {
      route = createCustomRoute(customName)
    }
    if (!route) return
    updateGame(activeGame.id, { routes: [...activeGame.routes, route] })
  }

  const handleSetRouteDate = (routeId: string, date: number | null) => {
    if (!activeGame) return
    updateGame(activeGame.id, {
      routes: activeGame.routes.map(route => route.id === routeId ? { ...route, completed_at: date } : route),
    })
  }

  const handleToggleRoute = (routeId: string) => {
    if (!activeGame) return
    updateGame(activeGame.id, {
      routes: activeGame.routes.map(route => route.id === routeId ? toggleRouteCompletion(route) : route),
    })
  }

  const handleAddResource = (resource: Pick<Resource, 'type' | 'url' | 'description'>) => {
    if (!activeGame || !resource.url.trim()) return
    updateGame(activeGame.id, {
      linked_resources: [
        ...activeGame.linked_resources,
        { id: String(Date.now()), type: resource.type, url: resource.url.trim(), description: resource.description },
      ],
    })
  }

  const handleDeleteGame = () => {
    if (confirmDelete === 'game' && activeGame) {
      deleteGame(activeGame.id)
      onBack()
    } else {
      setConfirmDelete('game')
    }
  }

  // Add to library
  const handleAdd = async () => {
    if (adding || !currentMeta) return
    setAdding(true)
    setAddError('')
    try {
      const newGame = createGameFromBangumiMeta(currentMeta)
      await addGame(newGame)
      setAddedGameId(newGame.id)
    } catch (err) {
      setAddError(err instanceof Error ? err.message : '添加失败')
    } finally {
      setAdding(false)
    }
  }

  const handleSetStatus = async (status: Game['status']) => {
    if (!addedGameId) return
    const date = quickCompleteDate ? new Date(`${quickCompleteDate}T12:00:00`).getTime() : Date.now()
    try {
      await updateGame(addedGameId, { status, completed_at: status === 'completed' ? date : null })
    } catch { /* silently ignore */ }
  }

  const handleSyncBangumiCollection = async () => {
    if (!activeGame) return
    const subjectId = Number(activeGame.id)
    if (!Number.isFinite(subjectId)) {
      setSyncMessage('Bangumi 条目 ID 无效，无法同步收藏')
      return
    }
    setBangumiBusy('collection-sync')
    setSyncMessage('')
    try {
      await patchMyCollection(subjectId, buildCollectionPayload(activeGame, syncPrivate))
      setSyncMessage('已同步到 Bangumi 收藏')
    } catch (error) {
      setSyncMessage(error instanceof Error ? error.message : '同步到 Bangumi 失败，请检查 Access Token')
    } finally {
      setBangumiBusy('')
    }
  }

  // Entity / related navigation
  const handleOpenSubject = async (subjectId: number) => {
    if (externalOpenSubject) {
      externalOpenSubject(subjectId)
      return
    }
    const requestId = openSeq.current + 1
    openSeq.current = requestId
    setBangumiBusy(`open-${subjectId}`)
    try {
      const snap = await fetchBangumiSnapshot(subjectId)
      if (requestId !== openSeq.current) return
      setRelatedSnapshot(snap)
      setEntityTarget(null)
    } catch {
      if (requestId !== openSeq.current) return
    } finally {
      if (requestId === openSeq.current) setBangumiBusy('')
    }
  }

  const handleOpenEntity = (target: BangumiEntityTarget) => {
    if (externalOpenEntity) {
      externalOpenEntity(target)
      return
    }
    setEntityTarget(target)
  }

  // Show related subject as nested detail
  if (relatedSnapshot?.meta) {
    return (
      <GameDetailPage
        game={games.find(g => g.id === String(relatedSnapshot.meta!.subject_id)) || null}
        snapshot={relatedSnapshot}
        onBack={() => setRelatedSnapshot(null)}
        onOpenSubject={externalOpenSubject}
        onOpenEntity={externalOpenEntity}
        processElapsed={processElapsed}
        isProcessRunning={isProcessRunning}
      />
    )
  }

  // Entity detail overlay
  if (entityTarget) {
    return (
      <BangumiEntityDetailPanel
        target={entityTarget}
        onBack={() => setEntityTarget(null)}
        onOpenSubject={handleOpenSubject}
        onOpenPerson={(id, title) => setEntityTarget({ kind: 'person', id, title })}
        onOpenCharacter={(id, title) => setEntityTarget({ kind: 'character', id, title })}
      />
    )
  }

  if (!currentMeta && !activeGame) return null

  return (
    <div className="detail-workbench">
      <div className="bangumi-entity-body">

        {/* Hero section */}
        <section className="bangumi-hero-panel mb-5">
          <div className="detail-cover-frame">
            {(currentMeta?.cover_url || activeGame?.cover_url) ? (
              <img src={currentMeta?.cover_url || activeGame?.cover_url} alt={currentMeta?.title_cn || activeGame?.name_cn || ''} loading="lazy" />
            ) : (
              <span>无封面</span>
            )}
          </div>

          <div className="bangumi-hero-main">
            <div className="bangumi-title-block">
              <h1>{currentMeta?.title_cn || currentMeta?.title || activeGame?.name_cn || activeGame?.name || ''}</h1>
              {(currentMeta?.title_cn || activeGame?.name_cn) && (
                <p>{currentMeta?.title || activeGame?.name || ''}</p>
              )}
            </div>

            {((currentMeta?.air_date || activeGame?.air_date) || ((currentMeta?.platform || activeGame?.platform)?.length ?? 0) > 0 || currentMeta?.rank) && (
              <div className="bangumi-fact-row">
                {(currentMeta?.air_date || activeGame?.air_date) && <span>{currentMeta?.air_date || activeGame?.air_date}</span>}
                {((currentMeta?.platform || activeGame?.platform)?.length ?? 0) > 0 && <span>{(currentMeta?.platform || activeGame?.platform || []).join(' / ')}</span>}
                {currentMeta?.rank && <span>Rank #{currentMeta.rank}</span>}
              </div>
            )}

            <div className="flex flex-wrap items-center gap-2 mt-3">
              {currentMeta && (
                <a href={currentMeta.url} target="_blank" rel="noopener noreferrer" className="btn btn-secondary btn-sm">Bangumi</a>
              )}
              {isInLibrary && activeGame && (
                confirmDelete === 'game' ? (
                  <span className="detail-delete-confirm">
                    确认删除？
                    <button type="button" onClick={handleDeleteGame} className="btn btn-danger btn-sm">确认</button>
                    <button type="button" onClick={() => setConfirmDelete(null)} className="btn btn-secondary btn-sm">取消</button>
                  </span>
                ) : (
                  <button type="button" onClick={() => setConfirmDelete('game')} className="btn btn-danger btn-sm">删除游戏</button>
                )
              )}
            </div>

            <div className="bangumi-stat-grid">
              {isInLibrary && activeGame ? (
                <>
                  <div className="bangumi-stat is-score">
                    <span>个人评分</span>
                    <strong>{activeGame.rating ? `${activeGame.rating}/10` : '-'}</strong>
                  </div>
                  <div className="bangumi-stat">
                    <span>累计时长</span>
                    <strong>{formatDuration(totalSessionSeconds)}</strong>
                  </div>
                  <div className="bangumi-stat">
                    <span>游玩次数</span>
                    <strong>{gameSessions.length} 次</strong>
                  </div>
                  <div className="bangumi-stat">
                    <span>路线进度</span>
                    <strong>{activeGame.routes.length > 0 ? `${completedRoutes}/${activeGame.routes.length}` : '-'}</strong>
                  </div>
                </>
              ) : currentMeta ? (
                <>
                  <div className="bangumi-stat is-score"><span>评分</span><strong>{formatScore(currentMeta.score)}</strong></div>
                  <div className="bangumi-stat"><span>评分人数</span><strong>{currentMeta.rating.total.toLocaleString()}</strong></div>
                  <div className="bangumi-stat"><span>收藏总数</span><strong>{collectionTotal.toLocaleString()}</strong></div>
                  <div className="bangumi-stat"><span>角色</span><strong>{allCharacters.length}</strong></div>
                </>
              ) : null}
            </div>

            {tagsWithCount.length > 0 && (
              <div className="bangumi-tag-list mt-3">
                {tagsWithCount.map(tag => (
                  <span key={tag.name}>{tag.name}{tag.count > 0 ? ` ${tag.count}` : ''}</span>
                ))}
              </div>
            )}

            {addError && <p className="text-sm text-red-500 mt-2">{addError}</p>}

            {/* Status/action row */}
            {isInLibrary && activeGame ? (
              <div className="flex flex-wrap items-center gap-2 mt-3">
                {STATUS_OPTIONS.map(option => (
                  <button
                    key={option.key}
                    type="button"
                    onClick={() => handleStatus(option.key)}
                    className={`status-pill${activeGame.status === option.key ? ' is-active' : ''}`}
                  >
                    {option.label}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={handleLaunchGame}
                  disabled={!canLaunch || launchBusy}
                  className="btn btn-primary"
                >
                  {launchBusy ? '启动中...' : '启动游戏'}
                </button>
              </div>
            ) : currentMeta ? (
              <div className="bangumi-action-row mt-3">
                {storedGame ? (
                  <span className="bangumi-added">
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    已在库中
                  </span>
                ) : addedGameId ? (
                  <div className="flex flex-col gap-2">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <button type="button" onClick={() => handleSetStatus('wish')} className="status-pill">想玩</button>
                      <button type="button" onClick={() => handleSetStatus('playing')} className="status-pill">在玩</button>
                      <button type="button" onClick={() => handleSetStatus('completed')} className="status-pill">已完成</button>
                      <button type="button" onClick={() => handleSetStatus('paused')} className="status-pill">搁置</button>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="date"
                        value={quickCompleteDate}
                        onChange={e => setQuickCompleteDate(e.target.value)}
                        className="quick-complete-date"
                        aria-label="通关日期"
                      />
                      <span className="text-xs text-[var(--text-secondary)]">选择完成后自动记录通关时间</span>
                    </div>
                  </div>
                ) : (
                  <button type="button" onClick={handleAdd} disabled={adding} className="btn btn-primary">
                    {adding ? '添加中...' : '添加到我的库'}
                  </button>
                )}
              </div>
            ) : null}

            {isInLibrary && isProcessRunning && (
              <div className="detail-running-chip mt-3">
                <span />
                <strong>{formatElapsed(processElapsed)}</strong>
              </div>
            )}
            {launchMessage && <p className="detail-rail-message mt-2">{launchMessage}</p>}
            {bangumiMessage && <p className="bangumi-message mt-2">{bangumiMessage}</p>}
          </div>
        </section>

        {/* Distribution - always visible when meta available */}
        {currentMeta && (
          <section className="bangumi-section">
            <div className="bangumi-section-head">
              <h3>分布</h3>
            </div>
            <div className="bangumi-collection-strip mb-4">
              {collectionLabels.map(([key, label]) => (
                <span key={key} className={`collection-chip${key === 'collect' ? ' is-collect' : ''}`}>
                  <span>{label}</span>
                  <strong>{currentMeta.collection[key].toLocaleString()}</strong>
                </span>
              ))}
            </div>
            <RatingDistribution rating={currentMeta.rating} />
          </section>
        )}

        {/* Tab bar - only when in library */}
        {isInLibrary && activeGame && (
          <>
            <TabBar tabs={tabs} activeTab={activeTab} onSelect={setActiveTab} />
            {actionItems.length > 0 && activeTab === 'records' && (
              <div className="detail-action-strip">
                <span>整理建议</span>
                {actionItems.map(item => (
                  <button key={item.key} type="button" onClick={() => jumpToAction(item.key)}>
                    {item.label}
                  </button>
                ))}
              </div>
            )}
          </>
        )}

        {/* Tab content / direct content */}
        {!isInLibrary ? (
          // Browse mode: show detail content directly
          <>
            {currentMeta?.summary && (
              <section className="bangumi-section">
                <div className="bangumi-section-head">
                  <h3>简介</h3>
                </div>
                <p className="bangumi-summary">{currentMeta.summary}</p>
              </section>
            )}

            <div className="bangumi-two-column">
              <section className="bangumi-section">
                <div className="bangumi-section-head">
                  <h3>角色</h3>
                  <span>{allCharacters.length} 个条目</span>
                </div>
                {characters.length === 0 ? (
                  <p className="bangumi-empty">暂无角色数据</p>
                ) : (
                  <div className="bangumi-character-grid">
                    {characters.map(character => (
                      <button
                        key={character.id}
                        type="button"
                        onClick={() => handleOpenEntity({ kind: 'character', id: character.id, title: character.name })}
                        className="bangumi-character-card is-clickable"
                      >
                        {character.image ? <img src={character.image} alt="" loading="lazy" /> : <div className="bangumi-avatar-empty">{character.name.slice(0, 1)}</div>}
                        <div className="min-w-0">
                          <strong>{character.name}</strong>
                          <span>{character.relation || '角色'}</span>
                          {character.actorNames.length > 0 && <small>{character.actorNames.slice(0, 2).join(' / ')}</small>}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </section>

              <section className="bangumi-section">
                <div className="bangumi-section-head">
                  <h3>制作人员</h3>
                  <span>{(bangumiSnapshot?.persons || snapshotProp?.persons || []).length} 个条目</span>
                </div>
                {staff.length === 0 ? (
                  <p className="bangumi-empty">暂无制作人员数据</p>
                ) : (
                  <div className="bangumi-staff-list">
                    {staff.map(person => (
                      <button
                        key={`${person.id}-${person.relation}`}
                        type="button"
                        onClick={() => handleOpenEntity({ kind: 'person', id: person.id, title: person.name })}
                        className="bangumi-staff-row is-clickable"
                      >
                        <span>{person.name}</span>
                        <strong>{person.relation || person.career.join(', ')}</strong>
                      </button>
                    ))}
                  </div>
                )}
              </section>
            </div>

            <section className="bangumi-section">
              <div className="bangumi-section-head">
                <h3>关联作品</h3>
                <span>{(bangumiSnapshot?.relations || snapshotProp?.relations || []).length} 个游戏条目</span>
              </div>
              {relations.length === 0 ? (
                <p className="bangumi-empty">暂无游戏关联条目</p>
              ) : (
                <div className="bangumi-relation-grid">
                  {relations.map(subject => (
                    <button
                      key={subject.id}
                      type="button"
                      onClick={() => handleOpenSubject(subject.id)}
                      className="bangumi-relation-card"
                    >
                      {subject.cover_url ? <img src={subject.cover_url} alt="" loading="lazy" /> : <div className="bangumi-relation-empty">无封面</div>}
                      <div className="min-w-0">
                        <strong>{subject.name_cn || subject.name}</strong>
                        <span>{subject.relation || '关联作品'}</span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </section>

            {episodes.length > 0 && (
              <section className="bangumi-section">
                <div className="bangumi-section-head">
                  <h3>章节/路线参考</h3>
                  <span>显示前 {episodes.length} 条</span>
                </div>
                <div className="bangumi-episode-list">
                  {episodes.map(episode => (
                    <span key={episode.id}>{episode.name_cn || episode.name || `#${episode.sort}`}</span>
                  ))}
                </div>
              </section>
            )}
          </>
        ) : activeGame ? (
          // Library mode: tab-switched content
          <>
            {activeTab === 'detail' && currentMeta && (
              <>
                {currentMeta.summary && (
                  <section className="bangumi-section">
                    <div className="bangumi-section-head">
                      <h3>简介</h3>
                    </div>
                    <p className="bangumi-summary">{currentMeta.summary}</p>
                  </section>
                )}

                <div className="bangumi-two-column">
                  <section className="bangumi-section">
                    <div className="bangumi-section-head">
                      <h3>角色</h3>
                      <span>{allCharacters.length} 个条目</span>
                    </div>
                    {characters.length === 0 ? (
                      <p className="bangumi-empty">暂无角色数据</p>
                    ) : (
                      <div className="bangumi-character-grid">
                        {characters.map(character => (
                          <button
                            key={character.id}
                            type="button"
                            onClick={() => handleOpenEntity({ kind: 'character', id: character.id, title: character.name })}
                            className="bangumi-character-card is-clickable"
                          >
                            {character.image ? <img src={character.image} alt="" loading="lazy" /> : <div className="bangumi-avatar-empty">{character.name.slice(0, 1)}</div>}
                            <div className="min-w-0">
                              <strong>{character.name}</strong>
                              <span>{character.relation || '角色'}</span>
                              {character.actorNames.length > 0 && <small>{character.actorNames.slice(0, 2).join(' / ')}</small>}
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </section>

                  <section className="bangumi-section">
                    <div className="bangumi-section-head">
                      <h3>制作人员</h3>
                      <span>{(bangumiSnapshot?.persons || snapshotProp?.persons || []).length} 个条目</span>
                    </div>
                    {staff.length === 0 ? (
                      <p className="bangumi-empty">暂无制作人员数据</p>
                    ) : (
                      <div className="bangumi-staff-list">
                        {staff.map(person => (
                          <button
                            key={`${person.id}-${person.relation}`}
                            type="button"
                            onClick={() => handleOpenEntity({ kind: 'person', id: person.id, title: person.name })}
                            className="bangumi-staff-row is-clickable"
                          >
                            <span>{person.name}</span>
                            <strong>{person.relation || person.career.join(', ')}</strong>
                          </button>
                        ))}
                      </div>
                    )}
                  </section>
                </div>

                <section className="bangumi-section">
                  <div className="bangumi-section-head">
                    <h3>关联作品</h3>
                    <span>{(bangumiSnapshot?.relations || snapshotProp?.relations || []).length} 个游戏条目</span>
                  </div>
                  {relations.length === 0 ? (
                    <p className="bangumi-empty">暂无游戏关联条目</p>
                  ) : (
                    <div className="bangumi-relation-grid">
                      {relations.map(subject => (
                        <button
                          key={subject.id}
                          type="button"
                          onClick={() => handleOpenSubject(subject.id)}
                          className="bangumi-relation-card"
                        >
                          {subject.cover_url ? <img src={subject.cover_url} alt="" loading="lazy" /> : <div className="bangumi-relation-empty">无封面</div>}
                          <div className="min-w-0">
                            <strong>{subject.name_cn || subject.name}</strong>
                            <span>{subject.relation || '关联作品'}</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </section>

                {episodes.length > 0 && (
                  <section className="bangumi-section">
                    <div className="bangumi-section-head">
                      <h3>章节/路线参考</h3>
                      <span>显示前 {episodes.length} 条</span>
                    </div>
                    <div className="bangumi-episode-list">
                      {episodes.map(episode => (
                        <span key={episode.id}>{episode.name_cn || episode.name || `#${episode.sort}`}</span>
                      ))}
                    </div>
                  </section>
                )}
              </>
            )}

            {activeTab === 'records' && activeGame && (
              <RecordsPanel
                game={activeGame}
                sessions={gameSessions}
                characters={allCharacters}
                totalSessionSeconds={totalSessionSeconds}
                completedRoutes={completedRoutes}
                reviewDraft={reviewDraft}
                tagDraft={tagDraft}
                completedAtDraft={completedAtDraft}
                manualStartedAt={manualStartedAt}
                manualMinutes={manualMinutes}
                highlight={highlight}
                onRating={rating => updateGame(activeGame.id, { rating })}
                onReviewDraft={setReviewDraft}
                onSaveReview={review => updateGame(activeGame.id, { review })}
                onTagDraft={setTagDraft}
                onSaveTags={tags => updateGame(activeGame.id, { tags: tags.split(',').map(t => t.trim()).filter(Boolean) })}
                onCompletedDate={handleCompletedDate}
                onClearCompletedDate={() => {
                  setCompletedAtDraft('')
                  updateGame(activeGame.id, { completed_at: null })
                }}
                onManualStartedAt={setManualStartedAt}
                onManualMinutes={setManualMinutes}
                onAddManualSession={handleAddManualSession}
                onDeleteSession={deleteSession}
                onAddRoute={handleAddRoute}
                onToggleRoute={handleToggleRoute}
                onSetRouteDate={handleSetRouteDate}
                onDeleteRoute={routeId => updateGame(activeGame.id, { routes: activeGame.routes.filter(r => r.id !== routeId) })}
                onAddResource={handleAddResource}
                onDeleteResource={resourceId => updateGame(activeGame.id, { linked_resources: activeGame.linked_resources.filter(r => r.id !== resourceId) })}
              />
            )}

            {activeTab === 'processes' && activeGame && (
              <ProcessConfig game={activeGame} onProcessesChanged={loadLaunchProcess} />
            )}
          </>
        ) : null}

        {currentMeta && (
          <BangumiCommentsPanel
            target={{
              kind: 'subject',
              id: currentMeta.subject_id,
              title: currentMeta.title_cn || currentMeta.title || '游戏详情',
            }}
          />
        )}

        {isInLibrary && (
          <section className="bangumi-section mt-6">
            <div className="bangumi-section-head">
              <div>
                <h3>Bangumi 同步</h3>
                <span>刷新条目资料，或把本地状态、评分、短评和标签同步到 Bangumi 收藏。</span>
              </div>
            </div>
            <div className="bangumi-sync-actions">
              <button type="button" onClick={() => loadBangumi('refresh')} disabled={!!bangumiBusy} className="btn btn-primary btn-sm">
                {bangumiBusy === 'refresh' ? '刷新中...' : '刷新 Bangumi 资料'}
              </button>
              <button
                type="button"
                onClick={async () => {
                  if (!currentMeta || !activeGame) return
                  setBangumiBusy('apply')
                  try {
                    await updateGame(activeGame.id, {
                      name: currentMeta.title || activeGame.name,
                      name_cn: currentMeta.title_cn || activeGame.name_cn,
                      cover_url: currentMeta.cover_url || activeGame.cover_url,
                      air_date: currentMeta.air_date || activeGame.air_date,
                      platform: currentMeta.platform.length > 0 ? currentMeta.platform : activeGame.platform,
                    })
                  } catch (error) {
                    setSyncMessage(error instanceof Error ? error.message : '应用 Bangumi 资料到本地失败')
                  } finally {
                    setBangumiBusy('')
                  }
                }}
                disabled={!!bangumiBusy}
                className="btn btn-secondary btn-sm"
              >
                应用到本地
              </button>
              <label className="bangumi-sync-private">
                <input
                  type="checkbox"
                  checked={syncPrivate}
                  onChange={event => setSyncPrivate(event.target.checked)}
                />
                私密收藏
              </label>
              <button
                type="button"
                onClick={handleSyncBangumiCollection}
                disabled={!!bangumiBusy || !activeGame}
                className="btn btn-secondary btn-sm"
              >
                {bangumiBusy === 'collection-sync' ? '同步中...' : '同步到 Bangumi 收藏'}
              </button>
            </div>
            {syncMessage && <p className="bangumi-message mt-2">{syncMessage}</p>}
          </section>
        )}

        {/* Bangumi refresh toolbar for library mode */}
        {false && isInLibrary && (
          <section className="bangumi-section mt-6">
            <div className="bangumi-section-head">
              <h3>Bangumi 资料刷新</h3>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button type="button" onClick={() => loadBangumi('refresh')} disabled={!!bangumiBusy} className="btn btn-primary btn-sm">
                {bangumiBusy === 'refresh' ? '刷新中...' : '刷新 Bangumi 资料'}
              </button>
              <button
                type="button"
                onClick={async () => {
                  if (!currentMeta || !activeGame) return
                  setBangumiBusy('apply')
                  try {
                    await updateGame(activeGame.id, {
                      name: currentMeta.title || activeGame.name,
                      name_cn: currentMeta.title_cn || activeGame.name_cn,
                      cover_url: currentMeta.cover_url || activeGame.cover_url,
                      air_date: currentMeta.air_date || activeGame.air_date,
                      platform: currentMeta.platform.length > 0 ? currentMeta.platform : activeGame.platform,
                    })
                  } catch { /* ignore */ }
                  finally { setBangumiBusy('') }
                }}
                disabled={!!bangumiBusy}
                className="btn btn-secondary btn-sm"
              >
                应用到本地
              </button>
            </div>
          </section>
        )}
      </div>
    </div>
  )
}
