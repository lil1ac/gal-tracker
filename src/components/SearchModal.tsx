import { useState } from 'react'
import { searchBangumiSubjects } from '../services/bangumiMeta'
import { BangumiSubject } from '../types'
import { useGameStore } from '../store/gameStore'
import { createGameFromBangumiSubject } from '../services/bangumiGame'

interface SearchModalProps {
  onClose: () => void
}

function ScoreBadge({ score, rank }: { score: number | null; rank: number | null }) {
  return (
    <div className="flex items-center gap-2 text-xs">
      {score !== null && (
        <span className="inline-flex items-center gap-0.5 font-medium text-amber-600 dark:text-amber-400">
          <svg className="w-3 h-3" viewBox="0 0 20 20" fill="currentColor">
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
          {score.toFixed(1)}
        </span>
      )}
      {rank !== null && (
        <span className="text-[var(--text-secondary)] tabular-nums">#{rank}</span>
      )}
    </div>
  )
}

export function SearchModal({ onClose }: SearchModalProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<BangumiSubject[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [addingId, setAddingId] = useState<string | null>(null)
  const [sort, setSort] = useState<'match' | 'heat' | 'rank' | 'score'>('match')
  const [year, setYear] = useState('')
  const [minScore, setMinScore] = useState('')
  const [maxRank, setMaxRank] = useState('')
  const [selectedTags, setSelectedTags] = useState<string[]>(['galgame'])
  const [includeNsfw, setIncludeNsfw] = useState(false)
  const [showFilters, setShowFilters] = useState(false)
  const { addGame, games } = useGameStore()

  const handleSearch = async () => {
    if (!query.trim()) return
    setLoading(true)
    setError('')
    try {
      const data = await searchBangumiSubjects({
        keyword: query,
        sort,
        year: year ? Number(year) : null,
        minScore: minScore ? Number(minScore) : null,
        maxRank: maxRank ? Number(maxRank) : null,
        tags: selectedTags.length > 0 ? selectedTags : undefined,
        nsfw: includeNsfw,
        limit: 20,
      })
      setResults(data)
    } catch (e) {
      console.error(e)
      setError('搜索失败，请稍后重试或检查 Bangumi Access Token')
    } finally {
      setLoading(false)
    }
  }

  const handleAddGame = async (subject: BangumiSubject) => {
    if (games.some(game => game.id === String(subject.id))) return
    setAddingId(String(subject.id))
    setError('')
    try {
      await addGame(createGameFromBangumiSubject(subject))
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : '添加失败')
      setAddingId(null)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="panel w-[720px] max-h-[85vh] flex flex-col shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="shrink-0 p-4 border-b border-[var(--border)] space-y-3">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-secondary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                placeholder="搜索 Bangumi 游戏条目..."
                className="field pl-9"
                autoFocus
              />
            </div>
            <button type="button" onClick={handleSearch} className="btn btn-primary">
              搜索
            </button>
            <button type="button" onClick={onClose} className="btn btn-secondary">
              关闭
            </button>
          </div>

          <button
            type="button"
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-1 text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
          >
            <svg className={`w-3 h-3 transition-transform ${showFilters ? 'rotate-90' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            高级筛选
          </button>

          {showFilters && (
            <div className="space-y-2.5 text-xs">
              <div className="grid gap-2 sm:grid-cols-5">
                <select title="排序" value={sort} onChange={e => setSort(e.target.value as typeof sort)} className="field py-1.5">
                  <option value="match">相关度</option>
                  <option value="heat">热度</option>
                  <option value="score">评分</option>
                  <option value="rank">排名</option>
                </select>
                <select title="年份" value={year} onChange={e => setYear(e.target.value)} className="field py-1.5">
                  <option value="">全部年份</option>
                  {Array.from({ length: 47 }, (_, i) => 2026 - i).map(y => (
                    <option key={y} value={String(y)}>{y}</option>
                  ))}
                </select>
                <select title="评分下限" value={minScore} onChange={e => setMinScore(e.target.value)} className="field py-1.5">
                  <option value="">评分下限</option>
                  <option value="6">≥ 6.0</option>
                  <option value="6.5">≥ 6.5</option>
                  <option value="7">≥ 7.0</option>
                  <option value="7.5">≥ 7.5</option>
                  <option value="8">≥ 8.0</option>
                  <option value="8.5">≥ 8.5</option>
                  <option value="9">≥ 9.0</option>
                </select>
                <select title="排名上限" value={maxRank} onChange={e => setMaxRank(e.target.value)} className="field py-1.5">
                  <option value="">排名上限</option>
                  <option value="100">Top 100</option>
                  <option value="500">Top 500</option>
                  <option value="1000">Top 1000</option>
                  <option value="2000">Top 2000</option>
                  <option value="5000">Top 5000</option>
                </select>
                <label className="flex items-center gap-1.5 whitespace-nowrap text-[var(--text-secondary)] cursor-pointer">
                  <input type="checkbox" checked={includeNsfw} onChange={e => setIncludeNsfw(e.target.checked)} className="rounded" />
                  NSFW
                </label>
              </div>
              <div>
                <div className="flex flex-wrap gap-1.5">
                  {['galgame', '视觉小说', '恋爱', '校园', '泣きゲー', '悬疑', '科幻', '战斗', '日常', '催泪', '哲学', '电波', '郁系', '推理', '同人'].map(tag => {
                    const active = selectedTags.includes(tag)
                    return (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => setSelectedTags(active ? selectedTags.filter(t => t !== tag) : [...selectedTags, tag])}
                        className={`rounded-full px-2.5 py-0.5 border text-xs transition-colors ${
                          active
                            ? 'border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]'
                            : 'border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--accent)] hover:text-[var(--text-primary)]'
                        }`}
                      >
                        {tag}
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Results */}
        <div className="flex-1 overflow-y-auto">
          {loading && (
            <div className="flex items-center justify-center gap-3 py-16 text-sm text-[var(--text-secondary)]">
              <div className="w-4 h-4 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
              搜索中...
            </div>
          )}
          {!loading && error && (
            <div className="py-16 text-center text-sm text-red-500">{error}</div>
          )}
          {!loading && !error && results.length === 0 && !query && (
            <div className="py-16 text-center">
              <svg className="mx-auto w-10 h-10 text-[var(--border)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <p className="mt-3 text-sm text-[var(--text-secondary)]">输入关键词搜索 Bangumi 游戏条目</p>
              <p className="mt-1 text-xs text-[var(--text-secondary)]">默认已限定 Galgame 标签，可按需修改</p>
            </div>
          )}
          {!loading && !error && results.length === 0 && query && (
            <div className="py-16 text-center text-sm text-[var(--text-secondary)]">没有找到结果，试试调整关键词或筛选条件</div>
          )}

          {results.map((subject) => {
            const id = String(subject.id)
            const exists = games.some(game => game.id === id)
            const adding = addingId === id
            return (
              <div
                key={subject.id}
                onClick={() => { if (!exists) handleAddGame(subject) }}
                className={`flex items-center gap-4 px-4 py-3 transition-colors ${
                  exists
                    ? 'opacity-50 cursor-default'
                    : 'cursor-pointer hover:bg-[var(--surface-subtle)]'
                }`}
              >
                <img
                  src={subject.cover}
                  alt=""
                  className="w-12 h-16 object-cover rounded shrink-0 bg-[var(--surface-subtle)]"
                  loading="lazy"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-medium truncate">{subject.name_cn || subject.name}</h3>
                    {exists && <span className="shrink-0 text-[10px] px-1.5 py-0.5 rounded bg-[var(--accent-soft)] text-[var(--accent)] font-medium">已入库</span>}
                  </div>
                  {subject.name_cn && (
                    <p className="text-xs text-[var(--text-secondary)] truncate">{subject.name}</p>
                  )}
                  <div className="mt-1 flex items-center gap-3">
                    <ScoreBadge score={subject.score} rank={subject.rank} />
                    <span className="text-xs text-[var(--text-secondary)] truncate">
                      {[subject.air_date, subject.platform?.[0]].filter(Boolean).join(' · ')}
                    </span>
                  </div>
                </div>
                {!exists && (
                  adding ? (
                    <div className="w-4 h-4 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin shrink-0" />
                  ) : (
                    <svg className="w-4 h-4 shrink-0 text-[var(--border)] group-hover:text-[var(--accent)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                  )
                )}
              </div>
            )
          })}
        </div>

        {results.length > 0 && (
          <div className="shrink-0 border-t border-[var(--border)] px-4 py-2 text-xs text-[var(--text-secondary)]">
            {results.length} 个结果，点击即可添加
          </div>
        )}
      </div>
    </div>
  )
}
