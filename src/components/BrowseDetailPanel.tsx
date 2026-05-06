import { useEffect, useMemo, useState } from 'react'
import {
  getBangumiCollectionTotal,
  getFeaturedCharacters,
  getFeaturedStaff,
  getTagNames,
} from '../services/bangumiDisplay'
import { fetchBangumiSnapshot } from '../services/bangumiLibrary'
import { createGameFromBangumiMeta } from '../services/bangumiGame'
import { useGameStore } from '../store/gameStore'
import type { BangumiSnapshot } from '../types'
import { BangumiEntityDetailPanel, type BangumiEntityTarget } from './BangumiEntityDetailPanel'

interface BrowseDetailPanelProps {
  snapshot: BangumiSnapshot
  isInLibrary: boolean
  onClose: () => void
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

export function BrowseDetailPanel({ snapshot, isInLibrary, onClose }: BrowseDetailPanelProps) {
  const [activeSnapshot, setActiveSnapshot] = useState(snapshot)
  const [snapshotHistory, setSnapshotHistory] = useState<BangumiSnapshot[]>([])
  const [entityTarget, setEntityTarget] = useState<BangumiEntityTarget | null>(null)
  const [subjectLoading, setSubjectLoading] = useState(false)
  const meta = activeSnapshot.meta
  const { addGame, games } = useGameStore()
  const [adding, setAdding] = useState(false)
  const [added, setAdded] = useState(isInLibrary)
  const [error, setError] = useState('')

  useEffect(() => {
    setActiveSnapshot(snapshot)
    setSnapshotHistory([])
    setEntityTarget(null)
    setAdded(isInLibrary)
  }, [snapshot])

  useEffect(() => {
    if (!meta) return
    setAdded(games.some(game => game.id === String(meta.subject_id)))
  }, [games, meta])

  const collectionTotal = meta ? getBangumiCollectionTotal(meta.collection) : 0
  const tags = useMemo(() => meta ? getTagNames(meta, 18) : [], [meta])
  const characters = useMemo(() => getFeaturedCharacters(activeSnapshot.characters, 10), [activeSnapshot.characters])
  const staff = useMemo(() => getFeaturedStaff(activeSnapshot.persons, 10), [activeSnapshot.persons])
  const relations = activeSnapshot.relations.slice(0, 6)
  const episodes = activeSnapshot.episodes.slice(0, 18)

  if (!meta) return null

  const handleAdd = async () => {
    if (added || adding) return
    setAdding(true)
    setError('')
    try {
      await addGame(createGameFromBangumiMeta(meta))
      setAdded(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : '添加失败')
    } finally {
      setAdding(false)
    }
  }

  const handleOpenSubject = async (subjectId: number) => {
    setSubjectLoading(true)
    setError('')
    try {
      const next = await fetchBangumiSnapshot(subjectId)
      setSnapshotHistory(prev => [...prev, activeSnapshot])
      setActiveSnapshot(next)
      setEntityTarget(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载关联作品失败')
    } finally {
      setSubjectLoading(false)
    }
  }

  const handleBackSubject = () => {
    const previous = snapshotHistory[snapshotHistory.length - 1]
    if (!previous) return
    setActiveSnapshot(previous)
    setSnapshotHistory(prev => prev.slice(0, -1))
  }

  return (
    <div className="browse-detail-overlay" onClick={onClose}>
      <div className="browse-detail-card browse-detail-card-rich" onClick={e => e.stopPropagation()}>
        <div className="browse-detail-header flex items-center gap-3 px-5 py-3">
          <button type="button" onClick={onClose} className="btn btn-secondary btn-sm">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            返回
          </button>
          {snapshotHistory.length > 0 && (
            <button type="button" onClick={handleBackSubject} className="btn btn-secondary btn-sm">上一个条目</button>
          )}
          <h2 className="min-w-0 flex-1 truncate text-sm font-semibold">{meta.title_cn || meta.title}</h2>
          <a href={meta.url} target="_blank" rel="noopener noreferrer" className="btn btn-secondary btn-sm">Bangumi</a>
        </div>

        <div className="browse-detail-body">
          <section className="bangumi-hero-panel">
            <div className="bangumi-cover-frame">
              {meta.cover_url ? (
                <img src={meta.cover_url} alt={meta.title_cn || meta.title} />
              ) : (
                <span>无封面</span>
              )}
            </div>

            <div className="bangumi-hero-main">
              <div className="bangumi-title-block">
                <h1>{meta.title_cn || meta.title}</h1>
                {meta.title_cn && <p>{meta.title}</p>}
              </div>

              <div className="bangumi-fact-row">
                {meta.air_date && <span>{meta.air_date}</span>}
                {meta.platform.length > 0 && <span>{meta.platform.join(' / ')}</span>}
                {meta.rank && <span>Rank #{meta.rank}</span>}
              </div>

              <div className="bangumi-stat-grid">
                <div className="bangumi-stat is-score"><span>评分</span><strong>{formatScore(meta.score)}</strong></div>
                <div className="bangumi-stat"><span>评分人数</span><strong>{meta.rating.total.toLocaleString()}</strong></div>
                <div className="bangumi-stat"><span>收藏总数</span><strong>{collectionTotal.toLocaleString()}</strong></div>
                <div className="bangumi-stat"><span>角色</span><strong>{activeSnapshot.characters.length}</strong></div>
              </div>

              {tags.length > 0 && (
                <div className="bangumi-tag-list">
                  {tags.map(tag => <span key={tag}>{tag}</span>)}
                </div>
              )}

              {error && <p className="text-sm text-red-500">{error}</p>}

              <div className="bangumi-action-row">
                {added ? (
                  <span className="bangumi-added">
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    已在库中
                  </span>
                ) : (
                  <button type="button" onClick={handleAdd} disabled={adding} className="btn btn-primary">
                    {adding ? '添加中...' : '添加到我的库'}
                  </button>
                )}
              </div>
            </div>
          </section>

          <section className="bangumi-section">
            <div className="bangumi-section-head">
              <h3>收藏分布</h3>
            </div>
            <div className="bangumi-collection-strip">
              {collectionLabels.map(([key, label]) => (
                <div key={key}>
                  <span>{label}</span>
                  <strong>{meta.collection[key].toLocaleString()}</strong>
                </div>
              ))}
            </div>
          </section>

          {meta.summary && (
            <section className="bangumi-section">
              <div className="bangumi-section-head">
                <h3>简介</h3>
              </div>
              <p className="bangumi-summary">{meta.summary}</p>
            </section>
          )}

          <div className="bangumi-two-column">
            <section className="bangumi-section">
              <div className="bangumi-section-head">
                <h3>角色</h3>
                <span>{activeSnapshot.characters.length} 个条目</span>
              </div>
              {characters.length === 0 ? (
                <p className="bangumi-empty">暂无角色数据</p>
              ) : (
                <div className="bangumi-character-grid">
                  {characters.map(character => (
                    <button
                      key={character.id}
                      type="button"
                      onClick={() => setEntityTarget({ kind: 'character', id: character.id, title: character.name })}
                      className="bangumi-character-card is-clickable"
                    >
                      {character.image ? <img src={character.image} alt="" /> : <div className="bangumi-avatar-empty">{character.name.slice(0, 1)}</div>}
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
                <span>{activeSnapshot.persons.length} 个条目</span>
              </div>
              {staff.length === 0 ? (
                <p className="bangumi-empty">暂无制作人员数据</p>
              ) : (
                <div className="bangumi-staff-list">
                  {staff.map(person => (
                    <button
                      key={`${person.id}-${person.relation}`}
                      type="button"
                      onClick={() => setEntityTarget({ kind: 'person', id: person.id, title: person.name })}
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
              <span>{activeSnapshot.relations.length} 个游戏条目</span>
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
                    disabled={subjectLoading}
                    className="bangumi-relation-card"
                  >
                    {subject.cover_url ? <img src={subject.cover_url} alt="" /> : <div className="bangumi-relation-empty">无封面</div>}
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
        </div>
        {subjectLoading && (
          <div className="browse-detail-loading">
            <div className="flex items-center gap-3 px-6 py-4 rounded-lg bg-[var(--bg-secondary)] shadow-lg">
              <div className="w-5 h-5 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
              <span className="text-sm text-[var(--text-secondary)]">加载关联作品...</span>
            </div>
          </div>
        )}
        {entityTarget && (
          <BangumiEntityDetailPanel
            target={entityTarget}
            onClose={() => setEntityTarget(null)}
            onOpenSubject={handleOpenSubject}
            onOpenPerson={(id, title) => setEntityTarget({ kind: 'person', id, title })}
            onOpenCharacter={(id, title) => setEntityTarget({ kind: 'character', id, title })}
          />
        )}
      </div>
    </div>
  )
}
