import { useState, useEffect, useRef } from 'react'
import { Game, Route, Resource } from '../types'
import { useGameStore } from '../store/gameStore'
import { ProcessConfig } from './ProcessConfig'

interface GameDetailProps {
  game: Game
  onClose: () => void
}

export function GameDetail({ game, onClose }: GameDetailProps) {
  const { updateGame, deleteGame } = useGameStore()
  const [editing, setEditing] = useState(false)
  const [activeTab, setActiveTab] = useState<'info' | 'sessions' | 'routes' | 'resources' | 'processes'>('info')
  const [rating, setRating] = useState(game.rating || 5)
  const [review, setReview] = useState(game.review || '')
  const [tags, setTags] = useState(game.tags.join(', '))
  const [newRouteName, setNewRouteName] = useState('')
  const [newResourceUrl, setNewResourceUrl] = useState('')
  const [newResourceType, setNewResourceType] = useState<'link' | 'screenshot'>('link')
  const [newResourceDesc, setNewResourceDesc] = useState('')
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [elapsedSeconds, setElapsedSeconds] = useState(0)

  const sessionStartRef = useRef<number>(Date.now())

  useEffect(() => {
    sessionStartRef.current = Date.now()
    setElapsedSeconds(0)

    if (game.status !== 'playing') return

    const interval = setInterval(() => {
      setElapsedSeconds(Math.floor((Date.now() - sessionStartRef.current) / 1000))
    }, 1000)
    return () => clearInterval(interval)
  }, [game.id, game.status])

  const formatElapsed = (seconds: number) => {
    const h = Math.floor(seconds / 3600)
    const m = Math.floor((seconds % 3600) / 60)
    const s = seconds % 60
    if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  const handleSaveInfo = () => {
    updateGame(game.id, {
      rating,
      review,
      tags: tags.split(',').map((t) => t.trim()).filter(Boolean),
    })
    setEditing(false)
  }

  const handleAddRoute = () => {
    if (!newRouteName.trim()) return
    const newRoute: Route = {
      id: String(Date.now()),
      name: newRouteName.trim(),
      choices: [],
      completed_at: null,
    }
    updateGame(game.id, { routes: [...game.routes, newRoute] })
    setNewRouteName('')
  }

  const handleToggleRouteComplete = (routeId: string) => {
    const routes = game.routes.map(r => {
      if (r.id === routeId) {
        return { ...r, completed_at: r.completed_at ? null : Date.now() }
      }
      return r
    })
    updateGame(game.id, { routes })
  }

  const handleDeleteRoute = (routeId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (confirmDelete === routeId) {
      updateGame(game.id, { routes: game.routes.filter(r => r.id !== routeId) })
      setConfirmDelete(null)
    } else {
      setConfirmDelete(routeId)
    }
  }

  const handleAddResource = () => {
    if (!newResourceUrl.trim()) return
    const newResource: Resource = {
      id: String(Date.now()),
      type: newResourceType,
      url: newResourceUrl.trim(),
      description: newResourceDesc.trim() || null,
    }
    updateGame(game.id, { linked_resources: [...game.linked_resources, newResource] })
    setNewResourceUrl('')
    setNewResourceDesc('')
  }

  const handleDeleteResource = (resourceId: string) => {
    if (confirmDelete === resourceId) {
      updateGame(game.id, { linked_resources: game.linked_resources.filter(r => r.id !== resourceId) })
      setConfirmDelete(null)
    } else {
      setConfirmDelete(resourceId)
    }
  }

  const handleDeleteGame = () => {
    if (confirmDelete === 'game') {
      deleteGame(game.id)
      onClose()
    } else {
      setConfirmDelete('game')
    }
  }

  const totalMinutes = Math.floor((Date.now() - sessionStartRef.current) / 60000)
  const hours = Math.floor(totalMinutes / 60)
  const mins = totalMinutes % 60
  const completedRoutes = game.routes.filter(r => r.completed_at).length
  const routeProgress = game.routes.length > 0 ? `${completedRoutes}/${game.routes.length}` : ''

  const tabItems = [
    { key: 'info' as const, label: '信息' },
    { key: 'sessions' as const, label: '游玩' },
    { key: 'routes' as const, label: routeProgress ? `路线 (${routeProgress})` : '路线' },
    { key: 'resources' as const, label: game.linked_resources.length ? `资源 (${game.linked_resources.length})` : '资源' },
    { key: 'processes' as const, label: '进程' },
  ]

  return (
    <div className="w-[28rem] bg-[var(--bg-secondary)] border-l border-[var(--border)] overflow-y-auto flex flex-col shrink-0">
      {/* Header */}
      <div className="p-4 flex justify-between items-center border-b border-[var(--border)]">
        <h2 className="font-semibold">游戏详情</h2>
        <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded hover:bg-[var(--bg-primary)] transition-colors text-lg leading-none">&times;</button>
      </div>

      {/* Cover */}
      <div className="aspect-[3/4] bg-[var(--bg-primary)]">
        {game.cover_url ? (
          <img src={game.cover_url} alt={game.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-[var(--text-secondary)]">无封面</div>
        )}
      </div>

      {/* Info */}
      <div className="p-4 border-b border-[var(--border)]">
        <h3 className="font-semibold text-lg">{game.name_cn || game.name}</h3>
        {game.name_cn && <p className="text-sm text-[var(--text-secondary)]">{game.name}</p>}

        {game.platform && game.platform.length > 0 && (
          <p className="text-xs text-[var(--text-secondary)] mt-1">平台: {game.platform.join(', ')}</p>
        )}
        {game.air_date && (
          <p className="text-xs text-[var(--text-secondary)]">发售日: {game.air_date}</p>
        )}

        {/* Status buttons */}
        <div className="mt-3 flex gap-1.5">
          {(['wish', 'playing', 'completed', 'paused'] as const).map((status) => (
            <button
              key={status}
              onClick={() => updateGame(game.id, { status })}
              className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                game.status === status
                  ? 'bg-[var(--accent)] text-white'
                  : 'bg-[var(--bg-primary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              {status === 'wish' ? '想玩' : status === 'playing' ? '在玩' : status === 'completed' ? '已完成' : '搁置'}
            </button>
          ))}
        </div>

        {/* Timer */}
        <div className="mt-3 p-3 rounded-lg bg-[var(--bg-primary)] text-center">
          <div className="text-xs text-[var(--text-secondary)]">本次游玩</div>
          <div className="text-xl font-semibold text-[var(--accent)] tabular-nums">
            {game.status === 'playing' ? formatElapsed(elapsedSeconds) : '--:--'}
          </div>
        </div>

        <div className="mt-2 flex gap-4 text-xs text-[var(--text-secondary)]">
          <span>总时长: {hours > 0 ? `${hours}小时${mins > 0 ? `${mins}分钟` : ''}` : mins > 0 ? `${mins}分钟` : '暂无'}</span>
          {routeProgress && <span>路线: {routeProgress}</span>}
          <span>评分: {game.rating ? `★ ${game.rating}` : '-'}</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-[var(--border)]">
        {tabItems.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex-1 py-2.5 text-xs font-medium transition-colors relative ${
              activeTab === tab.key
                ? 'text-[var(--accent)]'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            {tab.label}
            {activeTab === tab.key && (
              <div className="absolute bottom-0 left-1/4 right-1/4 h-0.5 bg-[var(--accent)] rounded-full" />
            )}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="p-4 flex-1">
        {activeTab === 'info' && (
          <>
            {editing ? (
              <div className="flex flex-col gap-3">
                <div>
                  <label className="text-sm flex justify-between">
                    <span>评分</span>
                    <span className="font-semibold">{rating}</span>
                  </label>
                  <input
                    type="range"
                    min="1"
                    max="10"
                    value={rating}
                    onChange={(e) => setRating(Number(e.target.value))}
                    className="w-full accent-[var(--accent)]"
                  />
                </div>
                <div>
                  <label className="text-sm text-[var(--text-secondary)]">感想</label>
                  <textarea
                    value={review}
                    onChange={(e) => setReview(e.target.value)}
                    className="w-full h-24 p-2 rounded-md border border-[var(--border)] bg-[var(--bg-primary)] text-sm resize-none focus:border-[var(--accent)] focus:outline-none"
                    placeholder="写点感想..."
                  />
                </div>
                <div>
                  <label className="text-sm text-[var(--text-secondary)]">标签 (逗号分隔)</label>
                  <input
                    type="text"
                    value={tags}
                    onChange={(e) => setTags(e.target.value)}
                    className="w-full p-2 rounded-md border border-[var(--border)] bg-[var(--bg-primary)] text-sm focus:border-[var(--accent)] focus:outline-none"
                    placeholder="神作, 恋爱, 治愈"
                  />
                </div>
                <div className="flex gap-2">
                  <button type="button" onClick={handleSaveInfo} className="flex-1 py-2 bg-[var(--accent)] text-white rounded-md text-sm font-medium hover:bg-[var(--accent-hover)] transition-colors">
                    保存
                  </button>
                  <button type="button" onClick={() => setEditing(false)} className="flex-1 py-2 bg-[var(--bg-primary)] rounded-md text-sm hover:bg-[var(--border)] transition-colors">
                    取消
                  </button>
                </div>
              </div>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => setEditing(true)}
                  className="w-full py-2 rounded-md border border-[var(--border)] text-sm hover:bg-[var(--bg-primary)] transition-colors"
                >
                  编辑信息
                </button>
                {game.rating && (
                  <div className="mt-4">
                    <p className="text-sm text-[var(--text-secondary)]">
                      评分: <span className="font-semibold text-[var(--text-primary)]">★ {game.rating}/10</span>
                    </p>
                  </div>
                )}
                {game.review && (
                  <div className="mt-2">
                    <p className="text-sm whitespace-pre-wrap">{game.review}</p>
                  </div>
                )}
                {game.tags.length > 0 && (
                  <div className="mt-3 flex gap-1.5 flex-wrap">
                    {game.tags.map((tag) => (
                      <span key={tag} className="px-2 py-0.5 bg-[var(--accent-soft)] text-[var(--accent)] text-xs rounded-full font-medium">
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </>
            )}

            <div className="mt-6 pt-4 border-t border-[var(--border)]">
              {confirmDelete === 'game' ? (
                <div className="flex items-center gap-2">
                  <span className="flex-1 text-sm text-red-600">确认删除游戏？此操作不可撤销</span>
                  <button type="button" onClick={handleDeleteGame} className="px-3 py-1 bg-red-600 text-white rounded text-sm">删除</button>
                  <button type="button" onClick={() => setConfirmDelete(null)} className="px-3 py-1 border border-[var(--border)] rounded text-sm">取消</button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={handleDeleteGame}
                  className="w-full py-2 text-red-600 border border-red-300 rounded-md text-sm hover:bg-red-50 dark:hover:bg-red-950 transition-colors"
                >
                  删除游戏
                </button>
              )}
            </div>
          </>
        )}

        {activeTab === 'sessions' && (
          <>
            <div className="mb-4 p-4 rounded-lg bg-[var(--bg-primary)] text-center">
              <div className="text-sm text-[var(--text-secondary)]">本次游玩</div>
              <div className="text-2xl font-bold text-[var(--accent)] tabular-nums">
                {game.status === 'playing' ? formatElapsed(elapsedSeconds) : '--:--'}
              </div>
            </div>
            <p className="text-sm text-[var(--text-secondary)] text-center py-4">游玩记录在 SQLite 数据库中管理</p>
          </>
        )}

        {activeTab === 'routes' && (
          <>
            <div className="mb-4 flex gap-2">
              <input
                type="text"
                value={newRouteName}
                onChange={(e) => setNewRouteName(e.target.value)}
                placeholder="路线名称"
                className="flex-1 p-2 rounded-md border border-[var(--border)] bg-[var(--bg-primary)] text-sm focus:border-[var(--accent)] focus:outline-none"
                onKeyDown={(e) => e.key === 'Enter' && handleAddRoute()}
              />
              <button
                type="button"
                onClick={handleAddRoute}
                className="px-4 py-2 bg-[var(--accent)] text-white rounded-md text-sm font-medium hover:bg-[var(--accent-hover)] transition-colors"
              >
                添加
              </button>
            </div>
            <div className="space-y-1.5">
              {game.routes.length === 0 && (
                <p className="text-sm text-[var(--text-secondary)] text-center py-8">暂无路线记录</p>
              )}
              {game.routes.map((route) => (
                <div
                  key={route.id}
                  onClick={() => handleToggleRouteComplete(route.id)}
                  className={`p-3 rounded-md cursor-pointer transition-colors ${
                    route.completed_at
                      ? 'bg-emerald-50 dark:bg-emerald-950'
                      : 'bg-[var(--bg-primary)] hover:bg-[var(--border)]'
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <span className={route.completed_at ? 'line-through text-[var(--text-secondary)]' : ''}>
                        {route.name}
                      </span>
                      {route.completed_at && (
                        <span className="text-emerald-600 dark:text-emerald-400 text-xs font-medium">✓ 已完成</span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={(e) => handleDeleteRoute(route.id, e)}
                      className={`px-2 py-0.5 rounded text-xs transition-colors ${
                        confirmDelete === route.id
                          ? 'bg-red-600 text-white'
                          : 'text-red-500 hover:bg-red-50 dark:hover:bg-red-950'
                      }`}
                    >
                      {confirmDelete === route.id ? '确认' : '删除'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
            {game.routes.length > 0 && (
              <div className="mt-4 text-center text-xs text-[var(--text-secondary)]">
                完成进度: {completedRoutes}/{game.routes.length}
                <div className="w-full h-1.5 bg-[var(--bg-primary)] rounded-full mt-1.5 overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                    style={{ width: `${(completedRoutes / game.routes.length) * 100}%` }}
                  />
                </div>
              </div>
            )}
          </>
        )}

        {activeTab === 'resources' && (
          <>
            <div className="mb-4 space-y-2">
              <select
                title="资源类型"
                value={newResourceType}
                onChange={(e) => setNewResourceType(e.target.value as 'link' | 'screenshot')}
                className="w-full p-2 rounded-md border border-[var(--border)] bg-[var(--bg-primary)] text-sm"
              >
                <option value="link">链接</option>
                <option value="screenshot">截图</option>
              </select>
              <input
                type="text"
                value={newResourceUrl}
                onChange={(e) => setNewResourceUrl(e.target.value)}
                placeholder={newResourceType === 'link' ? '攻略链接 URL' : '截图路径'}
                className="w-full p-2 rounded-md border border-[var(--border)] bg-[var(--bg-primary)] text-sm focus:border-[var(--accent)] focus:outline-none"
              />
              <input
                type="text"
                value={newResourceDesc}
                onChange={(e) => setNewResourceDesc(e.target.value)}
                placeholder="描述 (可选)"
                className="w-full p-2 rounded-md border border-[var(--border)] bg-[var(--bg-primary)] text-sm focus:border-[var(--accent)] focus:outline-none"
              />
              <button
                type="button"
                onClick={handleAddResource}
                className="w-full py-2 bg-[var(--accent)] text-white rounded-md text-sm font-medium hover:bg-[var(--accent-hover)] transition-colors"
              >
                添加
              </button>
            </div>
            <div className="space-y-1.5">
              {game.linked_resources.length === 0 && (
                <p className="text-sm text-[var(--text-secondary)] text-center py-8">暂无关联资源</p>
              )}
              {game.linked_resources.map((resource) => (
                <div key={resource.id} className="flex justify-between items-center p-3 rounded-md bg-[var(--bg-primary)]">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm truncate">{resource.description || resource.url}</div>
                    <div className="text-xs text-[var(--text-secondary)]">
                      {resource.type === 'link' ? '🔗 链接' : '🖼️ 截图'}
                    </div>
                  </div>
                  <div className="flex gap-2 ml-2 shrink-0">
                    <a
                      href={resource.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1 bg-sky-500 text-white rounded text-xs hover:bg-sky-600 transition-colors"
                    >
                      打开
                    </a>
                    <button
                      type="button"
                      onClick={() => handleDeleteResource(resource.id)}
                      className={`px-3 py-1 rounded text-xs transition-colors ${
                        confirmDelete === resource.id
                          ? 'bg-red-600 text-white'
                          : 'text-red-500 hover:bg-red-50 dark:hover:bg-red-950'
                      }`}
                    >
                      {confirmDelete === resource.id ? '确认' : '删除'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
        {activeTab === 'processes' && (
          <ProcessConfig game={game} />
        )}
      </div>
    </div>
  )
}
