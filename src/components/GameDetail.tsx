import { useState } from 'react'
import { Game } from '../types'
import { useGameStore } from '../store/gameStore'

interface GameDetailProps {
  game: Game
  onClose: () => void
}

export function GameDetail({ game, onClose }: GameDetailProps) {
  const { updateGame } = useGameStore()
  const [editing, setEditing] = useState(false)
  const [rating, setRating] = useState(game.rating || 5)
  const [review, setReview] = useState(game.review || '')
  const [tags, setTags] = useState(game.tags.join(', '))
  const [playMinutes, setPlayMinutes] = useState(0)

  const handleSave = () => {
    updateGame(game.id, {
      rating,
      review,
      tags: tags.split(',').map((t) => t.trim()).filter(Boolean),
      sessions: playMinutes > 0 ? [...game.sessions, {
        id: String(Date.now()),
        start_time: Date.now() - playMinutes * 60 * 1000,
        end_time: Date.now(),
        duration_minutes: playMinutes,
      }] : game.sessions,
    })
    setEditing(false)
  }

  const totalMinutes = game.sessions.reduce((sum, s) => sum + s.duration_minutes, 0)
  const hours = Math.floor(totalMinutes / 60)

  return (
    <div className="w-96 border-l border-[var(--border)] bg-[var(--bg-primary)] overflow-y-auto">
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

        <div className="mt-4">
          <p className="text-sm text-[var(--text-secondary)]">游玩时长: {hours > 0 ? `${hours}小时` : '暂无记录'}</p>
        </div>

        {editing ? (
          <div className="mt-4 flex flex-col gap-3">
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
            <div>
              <label className="text-sm">本次游玩 (分钟)</label>
              <input
                type="number"
                value={playMinutes}
                onChange={(e) => setPlayMinutes(Number(e.target.value))}
                className="w-full p-2 rounded border border-[var(--border)] bg-[var(--bg-secondary)]"
              />
            </div>
            <button onClick={handleSave} className="py-2 bg-[var(--accent)] text-white rounded">
              保存
            </button>
          </div>
        ) : (
          <button
            onClick={() => setEditing(true)}
            className="mt-4 w-full py-2 bg-[var(--bg-secondary)] rounded"
          >
            编辑
          </button>
        )}

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
      </div>
    </div>
  )
}