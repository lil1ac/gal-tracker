import { useState } from 'react'
import { searchGames } from '../services/bangumiApi'
import { BangumiSubject } from '../types'
import { useGameStore } from '../store/gameStore'

interface SearchModalProps {
  onClose: () => void
}

export function SearchModal({ onClose }: SearchModalProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<BangumiSubject[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [addingId, setAddingId] = useState<string | null>(null)
  const { addGame, games } = useGameStore()

  const handleSearch = async () => {
    if (!query.trim()) return
    setLoading(true)
    setError('')
    try {
      const data = await searchGames(query)
      setResults(data)
    } catch (e) {
      console.error(e)
      setError('搜索失败，请稍后重试或检查 API Key')
    }
    setLoading(false)
  }

  const handleAddGame = async (subject: BangumiSubject) => {
    if (games.some(game => game.id === String(subject.id))) return
    setAddingId(String(subject.id))
    setError('')
    const game = {
      id: String(subject.id),
      name: subject.name,
      name_cn: subject.name_cn,
      cover_url: subject.cover,
      air_date: subject.air_date,
      platform: subject.platform,
      status: 'wish' as const,
      rating: null,
      review: null,
      routes: [],
      tags: [],
      linked_resources: [],
      current_running: false,
      auto_status_prompted: false,
      auto_status_update_enabled: false,
      completed_at: null,
      created_at: Date.now(),
      updated_at: Date.now(),
    }
    try {
      await addGame(game)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : '添加失败')
      setAddingId(null)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center" onClick={onClose}>
      <div
        className="panel w-[540px] max-h-[75vh] flex flex-col shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 border-b border-[var(--border)] flex gap-2">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="搜索游戏..."
            className="field flex-1"
            autoFocus
          />
          <button
            type="button"
            onClick={handleSearch}
            className="btn btn-primary"
          >
            搜索
          </button>
          <button
            type="button"
            onClick={onClose}
            className="btn btn-secondary"
          >
            关闭
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          {loading && (
            <div className="text-center py-12 text-sm text-[var(--text-secondary)]">搜索中...</div>
          )}
          {!loading && error && (
            <div className="text-center py-12 text-sm text-red-500">{error}</div>
          )}
          {!loading && !error && results.length === 0 && query && (
            <div className="text-center py-12 text-sm text-[var(--text-secondary)]">无结果</div>
          )}
          {!loading && !error && results.length === 0 && !query && (
            <div className="text-center py-12 text-sm text-[var(--text-secondary)]">输入关键词搜索游戏</div>
          )}
          {results.map((subject) => {
            const id = String(subject.id)
            const exists = games.some(game => game.id === id)
            const adding = addingId === id
            return (
            <div
              key={subject.id}
              onClick={() => handleAddGame(subject)}
              className={`flex gap-3 p-3 rounded-md transition-colors group ${
                exists ? 'opacity-60 cursor-not-allowed' : 'hover:bg-[var(--surface-subtle)] cursor-pointer'
              }`}
            >
              <img
                src={subject.cover}
                alt=""
                className="w-14 h-[4.5rem] object-cover rounded-md shrink-0"
              />
              <div className="min-w-0">
                <h3 className="text-sm font-medium truncate group-hover:text-[var(--accent)] transition-colors">
                  {subject.name_cn || subject.name}
                </h3>
                {subject.name_cn && (
                  <p className="text-xs text-[var(--text-secondary)] truncate">{subject.name}</p>
                )}
                <p className="text-xs text-[var(--text-secondary)] mt-1">
                  {[subject.air_date, subject.platform?.join(', ')].filter(Boolean).join(' · ')}
                </p>
                {exists && <p className="text-xs text-[var(--accent)] mt-1">已在库中</p>}
                {adding && <p className="text-xs text-[var(--accent)] mt-1">正在添加...</p>}
              </div>
            </div>
          )})}
        </div>
      </div>
    </div>
  )
}
