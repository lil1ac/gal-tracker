import { useEffect, useMemo, useState } from 'react'
import type { BangumiRelatedCharacter, Game, Resource } from '../types'
import { getBangumiImage } from '../services/bangumiDisplay'
import { formatDuration, type GameActionKey } from '../services/libraryStats'
import { normalizeRoute } from './gameRoutes'

export const STATUS_OPTIONS = [
  { key: 'wish' as const, label: '想玩' },
  { key: 'playing' as const, label: '在玩' },
  { key: 'completed' as const, label: '已完成' },
  { key: 'paused' as const, label: '搁置' },
]

export const endReasonLabels: Record<string, string> = {
  process_exit: '进程退出',
  user_stop: '手动记录',
  app_close: '应用关闭',
  too_short: '过短忽略',
  error: '异常',
  app_crash: '异常恢复',
}

export type RouteInputMode = 'character' | 'custom'

export function toDateInput(timestamp: number | null) {
  if (!timestamp) return ''
  const date = new Date(timestamp)
  const offset = date.getTimezoneOffset() * 60000
  return new Date(date.getTime() - offset).toISOString().slice(0, 10)
}

export function parseLocalDate(value: string) {
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

function lastSessionLabel(sessions: { started_at: number }[]) {
  if (sessions.length === 0) return '无记录'
  return formatDateTime(sessions[0].started_at)
}

interface RecordsPanelProps {
  game: Game
  sessions: { id: string; game_id: string; started_at: number; ended_at: number | null; duration_seconds: number | null; process_name: string; end_reason: string | null }[]
  characters: BangumiRelatedCharacter[]
  totalSessionSeconds: number
  completedRoutes: number
  reviewDraft: string
  tagDraft: string
  completedAtDraft: string
  manualStartedAt: string
  manualMinutes: string
  highlight: GameActionKey | null
  onRating: (rating: number) => void
  onReviewDraft: (value: string) => void
  onSaveReview: (value: string) => void
  onTagDraft: (value: string) => void
  onSaveTags: (value: string) => void
  onCompletedDate: (value: string) => void
  onClearCompletedDate: () => void
  onManualStartedAt: (value: string) => void
  onManualMinutes: (value: string) => void
  onAddManualSession: () => void
  onDeleteSession: (id: string) => void
  onAddRoute: (mode: RouteInputMode, customName: string, characterId: string) => void
  onToggleRoute: (routeId: string) => void
  onSetRouteDate: (routeId: string, date: number | null) => void
  onDeleteRoute: (routeId: string) => void
  onAddResource: (resource: Pick<Resource, 'type' | 'url' | 'description'>) => void
  onDeleteResource: (id: string) => void
}

export function RecordsPanel({
  game,
  sessions,
  characters,
  totalSessionSeconds,
  completedRoutes,
  reviewDraft,
  tagDraft,
  completedAtDraft,
  manualStartedAt,
  manualMinutes,
  highlight,
  onRating,
  onReviewDraft,
  onSaveReview,
  onTagDraft,
  onSaveTags,
  onCompletedDate,
  onClearCompletedDate,
  onManualStartedAt,
  onManualMinutes,
  onAddManualSession,
  onDeleteSession,
  onAddRoute,
  onToggleRoute,
  onSetRouteDate,
  onDeleteRoute,
  onAddResource,
  onDeleteResource,
}: RecordsPanelProps) {
  const [routeMode, setRouteMode] = useState<RouteInputMode>('character')
  const [selectedCharacterId, setSelectedCharacterId] = useState('')
  const [customRouteName, setCustomRouteName] = useState('')
  const [resourceType, setResourceType] = useState<'link' | 'screenshot'>('link')
  const [resourceUrl, setResourceUrl] = useState('')
  const [resourceDesc, setResourceDesc] = useState('')

  useEffect(() => {
    if (!selectedCharacterId && characters.length > 0) {
      setSelectedCharacterId(String(characters[0].id))
    }
  }, [characters, selectedCharacterId])

  const characterImageById = useMemo(() => {
    const map = new Map<number, string>()
    characters.forEach(character => map.set(character.id, getBangumiImage(character.images)))
    return map
  }, [characters])

  const handleAddRoute = () => {
    onAddRoute(routeMode, customRouteName, selectedCharacterId)
    if (routeMode === 'custom') setCustomRouteName('')
  }

  const handleAddResource = () => {
    onAddResource({ type: resourceType, url: resourceUrl, description: resourceDesc.trim() || null })
    setResourceUrl('')
    setResourceDesc('')
  }

  return (
    <div className="records-workbench">
      <section className="records-stat-grid">
        <div className="stat-tile">
          <span>本地状态</span>
          <strong>{STATUS_OPTIONS.find(item => item.key === game.status)?.label}</strong>
        </div>
        <div className="stat-tile">
          <span>个人评分</span>
          <strong>{game.rating ? `${game.rating}/10` : '未评分'}</strong>
        </div>
        <div className="stat-tile">
          <span>累计时长</span>
          <strong>{formatDuration(totalSessionSeconds)}</strong>
        </div>
        <div className="stat-tile">
          <span>最近游玩</span>
          <strong>{lastSessionLabel(sessions)}</strong>
        </div>
        <div className="stat-tile">
          <span>通关日期</span>
          <strong>{formatDate(game.completed_at)}</strong>
        </div>
        <div className="stat-tile">
          <span>路线进度</span>
          <strong>{game.routes.length ? `${completedRoutes}/${game.routes.length}` : '未记录'}</strong>
        </div>
      </section>

      <section id="detail-review" className={`records-section records-review-grid ${highlight === 'review' || highlight === 'rating' || highlight === 'tags' ? 'detail-section-focus' : ''}`}>
        <div className="records-section-head records-review-head">
          <h3>评价</h3>
          <span>评分、短评和标签集中维护</span>
        </div>
        <div className="records-rating">
          <strong>{game.rating || '-'}</strong>
          <span>/10</span>
          <div className="mt-3 flex gap-0.5">
            {Array.from({ length: 10 }, (_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => onRating(i + 1)}
                className={`star-button ${i < (game.rating || 0) ? 'is-active' : ''}`}
                aria-label={`${i + 1} 分`}
              >
                ★
              </button>
            ))}
          </div>
        </div>
        <div className="min-w-0">
          <textarea
            value={reviewDraft}
            onChange={event => onReviewDraft(event.target.value)}
            onBlur={event => onSaveReview(event.target.value)}
            rows={5}
            placeholder="请输入游戏评价..."
            className="field resize-none"
          />
          <div className="mt-3">
            {game.tags.length > 0 && (
              <div className="mb-2 flex flex-wrap gap-1.5">
                {game.tags.map((tag, index) => <span key={`${tag}-${index}`} className="record-tag">{tag}</span>)}
              </div>
            )}
            <input
              type="text"
              value={tagDraft}
              onChange={event => onTagDraft(event.target.value)}
              onBlur={event => onSaveTags(event.target.value)}
              placeholder="剧情向, 泣系, 悬疑..."
              className="field"
            />
          </div>
        </div>
      </section>

      <section id="detail-completed_at" className={`records-section ${highlight === 'completed_at' ? 'detail-section-focus' : ''}`}>
        <div className="records-section-head">
          <h3>通关日期</h3>
          <button type="button" onClick={onClearCompletedDate} className="btn btn-secondary btn-sm">清空</button>
        </div>
        <input
          type="date"
          value={completedAtDraft}
          onChange={event => onCompletedDate(event.target.value)}
          className="field max-w-xs"
          aria-label="通关日期"
        />
      </section>

      <section className="records-section">
        <div className="records-section-head">
          <h3>游玩记录</h3>
          <span>{sessions.length} 条记录</span>
        </div>
        <div className="records-manual-row">
          <input type="datetime-local" value={manualStartedAt} onChange={event => onManualStartedAt(event.target.value)} className="field" aria-label="开始时间" />
          <input type="number" min="1" value={manualMinutes} onChange={event => onManualMinutes(event.target.value)} placeholder="分钟" className="field" />
          <button type="button" onClick={onAddManualSession} className="btn btn-primary">补录</button>
        </div>
        {sessions.length === 0 ? (
          <p className="records-empty">暂无游玩记录。可以先补一条大致时间。</p>
        ) : (
          <div className="session-timeline">
            {sessions.map(session => {
              const runningDuration = !session.ended_at ? Math.max(0, Math.floor((Date.now() - session.started_at) / 1000)) : 0
              const duration = session.duration_seconds ?? runningDuration
              return (
                <div key={session.id} className="session-row">
                  <span className={`session-dot${session.ended_at ? '' : ' is-running'}`} />
                  <div className="min-w-0">
                    <strong>{formatDateTime(session.started_at)}</strong>
                    <p>{session.process_name === 'manual' ? '手动补录' : session.process_name} · {endReasonLabels[session.end_reason || ''] || (session.ended_at ? '已结束' : '运行中')}</p>
                  </div>
                  <span className="session-duration">{formatDuration(duration)}</span>
                  <button type="button" onClick={() => onDeleteSession(session.id)} className="btn btn-danger btn-sm">删除</button>
                </div>
              )
            })}
          </div>
        )}
      </section>

      <section id="detail-routes" className={`records-section ${highlight === 'routes' ? 'detail-section-focus' : ''}`}>
        <div className="records-section-head">
          <h3>路线</h3>
          <span>角色路线和自定义结局都可记录</span>
        </div>
        <div className="route-composer">
          <div className="segmented-control">
            <button type="button" className={routeMode === 'character' ? 'is-active' : ''} onClick={() => setRouteMode('character')}>角色</button>
            <button type="button" className={routeMode === 'custom' ? 'is-active' : ''} onClick={() => setRouteMode('custom')}>自定义</button>
          </div>
          {routeMode === 'character' ? (
            <select aria-label="选择角色路线" value={selectedCharacterId} onChange={event => setSelectedCharacterId(event.target.value)} className="field" disabled={characters.length === 0}>
              {characters.length === 0 ? <option value="">暂无 Bangumi 角色</option> : characters.map(character => <option key={character.id} value={character.id}>{character.name}</option>)}
            </select>
          ) : (
            <input value={customRouteName} onChange={event => setCustomRouteName(event.target.value)} placeholder="真结局、TE、隐藏线、共通线..." className="field" />
          )}
          <button type="button" onClick={handleAddRoute} className="btn btn-primary">添加路线</button>
        </div>
        {game.routes.length === 0 ? (
          <p className="records-empty">暂无路线记录。</p>
        ) : (
          <div className="route-board">
            {game.routes.map(route => {
              const normalized = normalizeRoute(route)
              const routeImage = normalized.target_id ? characterImageById.get(normalized.target_id) : ''
              return (
                <div key={route.id} className={`route-card${route.completed_at ? ' is-done' : ''}`}>
                  {routeImage ? <img src={routeImage} alt="" loading="lazy" /> : <span>{normalized.target_name.slice(0, 1)}</span>}
                  <div className="min-w-0">
                    <strong>{normalized.target_name}</strong>
                    <p>{normalized.target_kind === 'character' ? '角色路线' : '自定义路线'}</p>
                  </div>
                  <input
                    type="date"
                    value={toDateInput(route.completed_at)}
                    onChange={event => onSetRouteDate(route.id, parseLocalDate(event.target.value))}
                    className="field route-date-input"
                    aria-label="完成日期"
                  />
                  <button type="button" onClick={() => onToggleRoute(route.id)} className="btn btn-secondary btn-sm">{route.completed_at ? '重开' : '完成'}</button>
                  <button type="button" onClick={() => onDeleteRoute(route.id)} className="btn btn-danger btn-sm">删除</button>
                </div>
              )
            })}
          </div>
        )}
      </section>

      <section className="records-section">
        <div className="records-section-head">
          <h3>资源</h3>
          <span>{game.linked_resources.length} 个条目</span>
        </div>
        <div className="resource-composer">
          <select value={resourceType} onChange={event => setResourceType(event.target.value as 'link' | 'screenshot')} className="field" aria-label="资源类型">
            <option value="link">链接</option>
            <option value="screenshot">截图</option>
          </select>
          <input value={resourceUrl} onChange={event => setResourceUrl(event.target.value)} placeholder={resourceType === 'link' ? '攻略链接 URL' : '截图路径'} className="field" />
          <input value={resourceDesc} onChange={event => setResourceDesc(event.target.value)} placeholder="标题或描述" className="field" />
          <button type="button" onClick={handleAddResource} className="btn btn-primary">添加资源</button>
        </div>
        {game.linked_resources.length === 0 ? (
          <p className="records-empty">暂无关联资源。</p>
        ) : (
          <div className="resource-list">
            {game.linked_resources.map(resource => (
              <div key={resource.id} className="resource-row">
                <span>{resource.type === 'link' ? '链接' : '截图'}</span>
                <div className="min-w-0">
                  <strong>{resource.description || resource.url}</strong>
                  <p>{resource.url}</p>
                </div>
                <a href={resource.url} target="_blank" rel="noopener noreferrer" className="btn btn-secondary btn-sm">打开</a>
                <button type="button" onClick={() => onDeleteResource(resource.id)} className="btn btn-danger btn-sm">删除</button>
              </div>
            ))}
          </div>
        )}
      </section>

    </div>
  )
}
