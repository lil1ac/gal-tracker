import { useEffect, useMemo, useState } from 'react'
import type { BangumiEntityKind, BangumiEntityPageData, BangumiEntitySubject } from '../types'
import { buildBangumiEntitySubjectCardKey, getBangumiCharacterPage, getBangumiPersonPage } from '../services/bangumiEntity'
import { setBangumiEntityCollect } from '../services/bangumiMeta'

interface BangumiEntityTarget {
  kind: Extract<BangumiEntityKind, 'character' | 'person'>
  id: number
  title: string
}

interface BangumiEntityDetailPanelProps {
  target: BangumiEntityTarget
  onBack: () => void
  onOpenSubject?: (subjectId: number) => void
  onOpenPerson?: (personId: number, title: string) => void
  onOpenCharacter?: (characterId: number, title: string) => void
}

const SUBJECT_PAGE_SIZE = 12
const ENTITY_PAGE_SIZE = 12

function subjectTitle(subject: BangumiEntitySubject) {
  return subject.name_cn || subject.name
}

function pageItems<T>(items: T[], page: number, pageSize: number): T[] {
  return items.slice(page * pageSize, page * pageSize + pageSize)
}

function totalPages(total: number, pageSize: number): number {
  return Math.max(1, Math.ceil(total / pageSize))
}

export function BangumiEntityDetailPanel({
  target,
  onBack,
  onOpenSubject,
  onOpenPerson,
  onOpenCharacter,
}: BangumiEntityDetailPanelProps) {
  const [data, setData] = useState<BangumiEntityPageData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [subjectPage, setSubjectPage] = useState(0)
  const [relatedPage, setRelatedPage] = useState(0)
  const [gameOnly, setGameOnly] = useState(true)
  const [collected, setCollected] = useState(false)
  const [collectBusy, setCollectBusy] = useState(false)
  const [collectMessage, setCollectMessage] = useState('')

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError('')
    setData(null)
    setSubjectPage(0)
    setRelatedPage(0)
    setCollectMessage('')
    const request = target.kind === 'character'
      ? getBangumiCharacterPage(target.id)
      : getBangumiPersonPage(target.id)

    request
      .then(next => {
        if (!cancelled) setData(next)
      })
      .catch(err => {
        if (!cancelled) setError(err instanceof Error ? err.message : '加载失败')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [target.kind, target.id])

  const detail = data?.detail
  const subjectSource = useMemo(() => {
    const subjects = data?.subjects || []
    return gameOnly ? subjects.filter(subject => subject.type === 4) : subjects
  }, [data, gameOnly])
  const subjects = useMemo(() => pageItems(subjectSource, subjectPage, SUBJECT_PAGE_SIZE), [subjectSource, subjectPage])
  const subjectTotalPages = totalPages(subjectSource.length, SUBJECT_PAGE_SIZE)

  const relatedTotal = data?.kind === 'character' ? data.persons.length : (data?.kind === 'person' ? data.characters.length : 0)
  const relatedTotalPages = totalPages(relatedTotal, ENTITY_PAGE_SIZE)

  const handleCollect = async () => {
    setCollectBusy(true)
    setCollectMessage('')
    try {
      await setBangumiEntityCollect(target.kind, target.id, !collected)
      setCollected(!collected)
      setCollectMessage(!collected ? '已收藏到 Bangumi' : '已取消收藏')
    } catch (err) {
      setCollectMessage(err instanceof Error ? err.message : 'Bangumi 收藏操作失败')
    } finally {
      setCollectBusy(false)
    }
  }

  return (
    <div className="bangumi-entity-page">
      <div className="bangumi-entity-panel">
        {loading && (
          <div className="bangumi-entity-loading">
            <span className="h-5 w-5 rounded-full border-2 border-[var(--accent)] border-t-transparent animate-spin" />
            <span>加载 Bangumi 资料...</span>
          </div>
        )}

        {error && !loading && (
          <div className="bangumi-entity-error">
            <p>{error}</p>
            <button type="button" onClick={onBack} className="btn btn-secondary btn-sm">返回</button>
          </div>
        )}

        {data && detail && !loading && (
          <div className="bangumi-entity-body">
            <section className="bangumi-entity-hero">
              <div className="bangumi-entity-image">
                {detail.image ? <img src={detail.image} alt={detail.name} loading="lazy" /> : <span>{detail.name.slice(0, 1)}</span>}
              </div>
              <div className="bangumi-entity-main">
                <div>
                  <h1>{detail.name}</h1>
                  <p>{data.kind === 'character' ? '角色' : '制作人员'}</p>
                  <div className="bangumi-action-row mt-2">
                    <a href={detail.url} target="_blank" rel="noopener noreferrer" className="btn btn-secondary btn-sm inline-flex">Bangumi</a>
                    <button type="button" onClick={handleCollect} disabled={collectBusy} className="btn btn-primary btn-sm">
                      {collectBusy ? '处理中...' : collected ? '取消收藏' : '收藏'}
                    </button>
                  </div>
                  {collectMessage && <p className="bangumi-message mt-2">{collectMessage}</p>}
                </div>
                <div className="bangumi-fact-row">
                  <span>收藏 {detail.collects.toLocaleString()}</span>
                  <span>讨论 {detail.comments.toLocaleString()}</span>
                  {data.kind === 'person' && data.detail.career.map(item => <span key={item}>{item}</span>)}
                </div>
                {detail.info.length > 0 && (
                  <div className="bangumi-entity-info-grid">
                    {detail.info.slice(0, 8).map(item => (
                      <div key={`${item.key}-${item.value}`}>
                        <span>{item.key}</span>
                        <strong>{item.value}</strong>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </section>

            {detail.summary && (
              <section className="bangumi-section">
                <div className="bangumi-section-head"><h3>简介</h3></div>
                <p className="bangumi-summary">{detail.summary}</p>
              </section>
            )}

            <section className="bangumi-section">
              <div className="bangumi-section-head">
                <div>
                  <h3>关联作品</h3>
                  <span>{subjectSource.length} 个条目</span>
                </div>
                <label className="bangumi-sync-private">
                  <input type="checkbox" checked={gameOnly} onChange={event => { setGameOnly(event.target.checked); setSubjectPage(0) }} />
                  只看游戏
                </label>
              </div>
              {subjects.length === 0 ? (
                <p className="bangumi-empty">暂无关联作品</p>
              ) : (
                <>
                  <div className="bangumi-relation-grid">
                    {subjects.map((subject, index) => (
                      <button
                        key={buildBangumiEntitySubjectCardKey(subject, index)}
                        type="button"
                        onClick={() => onOpenSubject?.(subject.id)}
                        className="bangumi-relation-card"
                      >
                        {subject.cover_url ? <img src={subject.cover_url} alt="" loading="lazy" /> : <div className="bangumi-relation-empty">无封面</div>}
                        <div className="min-w-0">
                          <strong>{subjectTitle(subject)}</strong>
                          <span>{subject.relation || '关联作品'}{subject.score ? ` · ${subject.score.toFixed(1)}` : ''}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                  <div className="bangumi-comment-pagination">
                    <button type="button" className="btn btn-secondary btn-sm" disabled={subjectPage === 0} onClick={() => setSubjectPage(page => Math.max(0, page - 1))}>上一页</button>
                    <span>{subjectPage + 1} / {subjectTotalPages}</span>
                    <button type="button" className="btn btn-secondary btn-sm" disabled={subjectPage + 1 >= subjectTotalPages} onClick={() => setSubjectPage(page => Math.min(subjectTotalPages - 1, page + 1))}>下一页</button>
                  </div>
                </>
              )}
            </section>

            {data.kind === 'character' && (
              <section className="bangumi-section">
                <div className="bangumi-section-head">
                  <h3>关联人物</h3>
                  <span>{data.persons.length} 个条目</span>
                </div>
                {data.persons.length === 0 ? (
                  <p className="bangumi-empty">暂无关联人物</p>
                ) : (
                  <>
                    <div className="bangumi-staff-list">
                      {pageItems(data.persons, relatedPage, ENTITY_PAGE_SIZE).map((person, index) => (
                        <button
                          key={`${person.id}-${person.relation}-${index}`}
                          type="button"
                          onClick={() => onOpenPerson?.(person.id, person.name)}
                          className="bangumi-staff-row is-clickable"
                        >
                          <span>{person.name}</span>
                          <strong>{person.relation || person.career.join(', ') || '关联人物'}</strong>
                        </button>
                      ))}
                    </div>
                    <div className="bangumi-comment-pagination">
                      <button type="button" className="btn btn-secondary btn-sm" disabled={relatedPage === 0} onClick={() => setRelatedPage(page => Math.max(0, page - 1))}>上一页</button>
                      <span>{relatedPage + 1} / {relatedTotalPages}</span>
                      <button type="button" className="btn btn-secondary btn-sm" disabled={relatedPage + 1 >= relatedTotalPages} onClick={() => setRelatedPage(page => Math.min(relatedTotalPages - 1, page + 1))}>下一页</button>
                    </div>
                  </>
                )}
              </section>
            )}

            {data.kind === 'person' && (
              <section className="bangumi-section">
                <div className="bangumi-section-head">
                  <h3>关联角色</h3>
                  <span>{data.characters.length} 个条目</span>
                </div>
                {data.characters.length === 0 ? (
                  <p className="bangumi-empty">暂无关联角色</p>
                ) : (
                  <>
                    <div className="bangumi-character-grid">
                      {pageItems(data.characters, relatedPage, ENTITY_PAGE_SIZE).map((character, index) => (
                        <button
                          key={`${character.id}-${index}`}
                          type="button"
                          onClick={() => onOpenCharacter?.(character.id, character.name)}
                          className="bangumi-character-card is-clickable"
                        >
                          {character.image ? <img src={character.image} alt="" loading="lazy" /> : <div className="bangumi-avatar-empty">{character.name.slice(0, 1)}</div>}
                          <div className="min-w-0">
                            <strong>{character.name}</strong>
                            <span>{character.relation || '角色'}</span>
                            {character.subjectNames.length > 0 && <small>{character.subjectNames.slice(0, 2).join(' / ')}</small>}
                          </div>
                        </button>
                      ))}
                    </div>
                    <div className="bangumi-comment-pagination">
                      <button type="button" className="btn btn-secondary btn-sm" disabled={relatedPage === 0} onClick={() => setRelatedPage(page => Math.max(0, page - 1))}>上一页</button>
                      <span>{relatedPage + 1} / {relatedTotalPages}</span>
                      <button type="button" className="btn btn-secondary btn-sm" disabled={relatedPage + 1 >= relatedTotalPages} onClick={() => setRelatedPage(page => Math.min(relatedTotalPages - 1, page + 1))}>下一页</button>
                    </div>
                  </>
                )}
              </section>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export type { BangumiEntityTarget }
