import { useState } from 'react'
import { Game, PlaySession, Route, Resource } from '../types'
import { useGameStore } from '../store/gameStore'

interface GameDetailProps {
  game: Game
  onClose: () => void
}

export function GameDetail({ game, onClose }: GameDetailProps) {
  const { updateGame } = useGameStore()
  const [editing, setEditing] = useState(false)
  const [activeTab, setActiveTab] = useState<'info' | 'sessions' | 'routes' | 'resources'>('info')
  const [rating, setRating] = useState(game.rating || 5)
  const [review, setReview] = useState(game.review || '')
  const [tags, setTags] = useState(game.tags.join(', '))
  const [newRouteName, setNewRouteName] = useState('')
  const [newResourceUrl, setNewResourceUrl] = useState('')
  const [newResourceType, setNewResourceType] = useState<'link' | 'screenshot'>('link')
  const [newResourceDesc, setNewResourceDesc] = useState('')

  const handleSaveInfo = () => {
    updateGame(game.id, {
      rating,
      review,
      tags: tags.split(',').map((t) => t.trim()).filter(Boolean),
    })
    setEditing(false)
  }

  const handleAddSession = (minutes: number) => {
    const newSession: PlaySession = {
      id: String(Date.now()),
      start_time: Date.now() - minutes * 60 * 1000,
      end_time: Date.now(),
      duration_minutes: minutes,
    }
    updateGame(game.id, { sessions: [...game.sessions, newSession] })
  }

  const handleDeleteSession = (sessionId: string) => {
    updateGame(game.id, { sessions: game.sessions.filter(s => s.id !== sessionId) })
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
    updateGame(game.id, { linked_resources: game.linked_resources.filter(r => r.id !== resourceId) })
  }

  const totalMinutes = game.sessions.reduce((sum, s) => sum + s.duration_minutes, 0)
  const hours = Math.floor(totalMinutes / 60)
  const mins = totalMinutes % 60

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString('zh-CN', {
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit'
    })
  }

  return (
    <div className="w-[28rem] border-l border-[var(--border)] bg-[var(--bg-primary)] overflow-y-auto">
      <div className="p-4 flex justify-between items-center border-b border-[var(--border)]">
        <h2 className="font-bold text-lg">游戏详情</h2>
        <button onClick={onClose} className="text-2xl">&times;</button>
      </div>

      <div className="aspect-[3/4] bg-gray-200">
        {game.cover_url && <img src={game.cover_url} alt={game.name} className="w-full h-full object-cover" />}
      </div>

      <div className="p-4">
        <h3 className="font-bold">{game.name_cn || game.name}</h3>
        <p className="text-sm text-[var(--text-secondary)]">{game.name}</p>

        <div className="mt-4 flex gap-2 flex-wrap">
          {(['wish', 'playing', 'completed', 'paused'] as const).map((status) => (
            <button
              key={status}
              onClick={() => updateGame(game.id, { status })}
              className={`px-2 py-1 rounded text-sm ${
                game.status === status ? 'bg-[var(--accent)] text-white' : 'bg-[var(--bg-secondary)]'
              }`}
            >
              {status === 'wish' ? '想玩' : status === 'playing' ? '在玩' : status === 'completed' ? '已完成' : '搁置'}
            </button>
          ))}
        </div>

        <div className="mt-4 text-sm text-[var(--text-secondary)]">
          总游玩时长: {hours > 0 ? `${hours}小时` : ''}{mins > 0 ? `${mins}分钟` : '' || '暂无记录'}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-[var(--border)]">
        {(['info', 'sessions', 'routes', 'resources'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-2 text-sm ${
              activeTab === tab
                ? 'border-b-2 border-[var(--accent)] text-[var(--accent)]'
                : 'text-[var(--text-secondary)]'
            }`}
          >
            {tab === 'info' ? '信息' : tab === 'sessions' ? '游玩' : tab === 'routes' ? '路线' : '资源'}
          </button>
        ))}
      </div>

      <div className="p-4">
        {activeTab === 'info' && (
          <>
            {editing ? (
              <div className="flex flex-col gap-3">
                <div>
                  <label className="text-sm">评分: {rating}</label>
                  <input
                    type="range"
                    min="1"
                    max="10"
                    value={rating}
                    onChange={(e) => setRating(Number(e.target.value))}
                    className="w-full"
                  />
                </div>
                <div>
                  <label className="text-sm">感想</label>
                  <textarea
                    value={review}
                    onChange={(e) => setReview(e.target.value)}
                    className="w-full h-24 p-2 rounded border border-[var(--border)] bg-[var(--bg-secondary)]"
                    placeholder="写点感想..."
                  />
                </div>
                <div>
                  <label className="text-sm">标签 (逗号分隔)</label>
                  <input
                    type="text"
                    value={tags}
                    onChange={(e) => setTags(e.target.value)}
                    className="w-full p-2 rounded border border-[var(--border)] bg-[var(--bg-secondary)]"
                    placeholder="神作, 恋爱, 治愈"
                  />
                </div>
                <button onClick={handleSaveInfo} className="py-2 bg-[var(--accent)] text-white rounded">
                  保存
                </button>
              </div>
            ) : (
              <>
                <button
                  onClick={() => setEditing(true)}
                  className="w-full py-2 bg-[var(--bg-secondary)] rounded"
                >
                  编辑信息
                </button>
                {game.rating && (
                  <div className="mt-4">
                    <p className="text-sm text-[var(--text-secondary)]">评分: ★ {game.rating}</p>
                  </div>
                )}
                {game.review && (
                  <div className="mt-2">
                    <p className="text-sm whitespace-pre-wrap">{game.review}</p>
                  </div>
                )}
                {game.tags.length > 0 && (
                  <div className="mt-2 flex gap-1 flex-wrap">
                    {game.tags.map((tag) => (
                      <span key={tag} className="px-2 py-1 bg-[var(--accent)] text-white text-xs rounded">
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </>
            )}
          </>
        )}

        {activeTab === 'sessions' && (
          <>
            <div className="mb-4 flex gap-2">
              <input
                type="number"
                id="session-minutes"
                title="游玩分钟数"
                placeholder="分钟"
                className="flex-1 p-2 rounded border border-[var(--border)] bg-[var(--bg-secondary)]"
                min="1"
              />
              <button
                onClick={() => {
                  const input = document.getElementById('session-minutes') as HTMLInputElement
                  const mins = Number(input.value)
                  if (mins > 0) {
                    handleAddSession(mins)
                    input.value = ''
                  }
                }}
                className="px-4 py-2 bg-[var(--accent)] text-white rounded"
              >
                添加
              </button>
            </div>
            <div className="space-y-2">
              {game.sessions.length === 0 && (
                <p className="text-sm text-[var(--text-secondary)] text-center py-4">暂无游玩记录</p>
              )}
              {game.sessions.map((session) => (
                <div key={session.id} className="flex justify-between items-center p-2 bg-[var(--bg-secondary)] rounded">
                  <div className="text-sm">
                    <div>{formatDate(session.start_time)}</div>
                    <div className="text-[var(--text-secondary)]">{session.duration_minutes}分钟</div>
                  </div>
                  <button
                    onClick={() => handleDeleteSession(session.id)}
                    className="text-red-500 text-sm"
                  >
                    删除
                  </button>
                </div>
              ))}
            </div>
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
                className="flex-1 p-2 rounded border border-[var(--border)] bg-[var(--bg-secondary)]"
                onKeyDown={(e) => e.key === 'Enter' && handleAddRoute()}
              />
              <button
                onClick={handleAddRoute}
                className="px-4 py-2 bg-[var(--accent)] text-white rounded"
              >
                添加
              </button>
            </div>
            <div className="space-y-2">
              {game.routes.length === 0 && (
                <p className="text-sm text-[var(--text-secondary)] text-center py-4">暂无路线记录</p>
              )}
              {game.routes.map((route) => (
                <div
                  key={route.id}
                  onClick={() => handleToggleRouteComplete(route.id)}
                  className={`p-3 rounded cursor-pointer ${
                    route.completed_at ? 'bg-green-100 dark:bg-green-900' : 'bg-[var(--bg-secondary)]'
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <span className={route.completed_at ? 'line-through' : ''}>{route.name}</span>
                    {route.completed_at && <span className="text-green-500 text-sm">已完成</span>}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {activeTab === 'resources' && (
          <>
            <div className="mb-4 space-y-2">
              <select
                title="资源类型"
                value={newResourceType}
                onChange={(e) => setNewResourceType(e.target.value as 'link' | 'screenshot')}
                className="w-full p-2 rounded border border-[var(--border)] bg-[var(--bg-secondary)]"
              >
                <option value="link">链接</option>
                <option value="screenshot">截图</option>
              </select>
              <input
                type="text"
                value={newResourceUrl}
                onChange={(e) => setNewResourceUrl(e.target.value)}
                placeholder={newResourceType === 'link' ? '攻略链接' : '截图路径'}
                className="w-full p-2 rounded border border-[var(--border)] bg-[var(--bg-secondary)]"
              />
              <input
                type="text"
                value={newResourceDesc}
                onChange={(e) => setNewResourceDesc(e.target.value)}
                placeholder="描述 (可选)"
                className="w-full p-2 rounded border border-[var(--border)] bg-[var(--bg-secondary)]"
              />
              <button
                onClick={handleAddResource}
                className="w-full py-2 bg-[var(--accent)] text-white rounded"
              >
                添加
              </button>
            </div>
            <div className="space-y-2">
              {game.linked_resources.length === 0 && (
                <p className="text-sm text-[var(--text-secondary)] text-center py-4">暂无关联资源</p>
              )}
              {game.linked_resources.map((resource) => (
                <div key={resource.id} className="flex justify-between items-center p-2 bg-[var(--bg-secondary)] rounded">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm truncate">{resource.description || resource.url}</div>
                    <div className="text-xs text-[var(--text-secondary)]">
                      {resource.type === 'link' ? '链接' : '截图'}
                    </div>
                  </div>
                  <div className="flex gap-2 ml-2">
                    <a
                      href={resource.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-500 text-sm"
                    >
                      打开
                    </a>
                    <button
                      onClick={() => handleDeleteResource(resource.id)}
                      className="text-red-500 text-sm"
                    >
                      删除
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}