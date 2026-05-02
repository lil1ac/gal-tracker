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
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="glass rounded-lg w-[600px] max-h-[80vh] flex flex-col neon-glow">
        <div className="p-4 border-b border-[var(--border)] flex gap-2">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="搜索游戏..."
            className="flex-1 px-4 py-2 rounded glass text-[var(--text-primary)] border border-[var(--border)] focus:border-[var(--accent)] focus:outline-none transition-all duration-300"
            style={{ background: 'var(--bg-secondary)' }}
            onFocus={(e) => {
              e.target.style.borderColor = 'var(--accent)'
              e.target.style.boxShadow = 'var(--glow-accent)'
            }}
            onBlur={(e) => {
              e.target.style.borderColor = 'var(--border)'
              e.target.style.boxShadow = 'none'
            }}
          />
          <button onClick={handleSearch} className="neon-button px-4 py-2 rounded font-bold text-[#0a0a0f] transition-all" style={{ background: 'var(--accent)', boxShadow: 'var(--glow-accent)' }}>
            搜索
          </button>
          <button onClick={onClose} className="neon-button px-4 py-2 rounded transition-all">关闭</button>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          {loading && <div className="text-center py-8">搜索中...</div>}
          {results.map((subject) => (
            <div
              key={subject.id}
              onClick={() => handleAddGame(subject)}
              className="flex gap-3 p-3 glass hover:bg-[var(--bg-secondary)] rounded cursor-pointer"
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