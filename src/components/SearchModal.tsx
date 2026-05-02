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
  const { addGame } = useGameStore()

  const handleSearch = async () => {
    if (!query.trim()) return
    setLoading(true)
    try {
      const data = await searchGames(query)
      setResults(data)
    } catch (e) {
      console.error(e)
    }
    setLoading(false)
  }

  const handleAddGame = (subject: BangumiSubject) => {
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
      created_at: Date.now(),
      updated_at: Date.now(),
    }
    addGame(game)
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center" onClick={onClose}>
      <div
        className="bg-[var(--bg-secondary)] rounded-xl w-[540px] max-h-[75vh] flex flex-col shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 border-b border-[var(--border)] flex gap-2">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="搜索游戏..."
            className="flex-1 px-3 py-2 rounded-md border border-[var(--border)] bg-[var(--bg-primary)] text-sm focus:border-[var(--accent)] focus:outline-none transition-colors"
            autoFocus
          />
          <button
            type="button"
            onClick={handleSearch}
            className="px-4 py-2 bg-[var(--accent)] text-white rounded-md text-sm font-medium hover:bg-[var(--accent-hover)] transition-colors"
          >
            搜索
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-2 rounded-md border border-[var(--border)] text-sm hover:bg-[var(--bg-primary)] transition-colors"
          >
            关闭
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          {loading && (
            <div className="text-center py-12 text-sm text-[var(--text-secondary)]">搜索中...</div>
          )}
          {!loading && results.length === 0 && query && (
            <div className="text-center py-12 text-sm text-[var(--text-secondary)]">无结果</div>
          )}
          {!loading && results.length === 0 && !query && (
            <div className="text-center py-12 text-sm text-[var(--text-secondary)]">输入关键词搜索游戏</div>
          )}
          {results.map((subject) => (
            <div
              key={subject.id}
              onClick={() => handleAddGame(subject)}
              className="flex gap-3 p-3 rounded-lg hover:bg-[var(--bg-primary)] cursor-pointer transition-colors group"
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
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
