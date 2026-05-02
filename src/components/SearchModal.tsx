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
      sessions: [],
      created_at: Date.now(),
      updated_at: Date.now(),
    }
    addGame(game)
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-[var(--bg-primary)] rounded-lg w-[600px] max-h-[80vh] flex flex-col">
        <div className="p-4 border-b border-[var(--border)] flex gap-2">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="搜索游戏..."
            className="flex-1 px-3 py-2 rounded border border-[var(--border)] bg-[var(--bg-secondary)]"
          />
          <button onClick={handleSearch} className="px-4 py-2 bg-[var(--accent)] text-white rounded">
            搜索
          </button>
          <button onClick={onClose} className="px-4 py-2 rounded">关闭</button>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          {loading && <div className="text-center py-8">搜索中...</div>}
          {results.map((subject) => (
            <div
              key={subject.id}
              onClick={() => handleAddGame(subject)}
              className="flex gap-3 p-3 hover:bg-[var(--bg-secondary)] rounded cursor-pointer"
            >
              <img src={subject.cover} alt="" className="w-16 h-20 object-cover rounded" />
              <div>
                <h3 className="font-medium">{subject.name_cn || subject.name}</h3>
                <p className="text-sm text-[var(--text-secondary)]">{subject.name}</p>
                <p className="text-xs text-[var(--text-secondary)] mt-1">{subject.air_date || ''}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}