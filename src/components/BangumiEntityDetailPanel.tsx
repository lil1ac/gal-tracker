import { useEffect, useMemo, useState } from 'react'
import type { BangumiEntityKind, BangumiEntityPageData, BangumiEntitySubject } from '../types'
import { getBangumiCharacterPage, getBangumiPersonPage } from '../services/bangumiEntity'

interface BangumiEntityTarget {
  kind: Extract<BangumiEntityKind, 'character' | 'person'>
  id: number
  title: string
}

interface BangumiEntityDetailPanelProps {
  target: BangumiEntityTarget
  onClose: () => void
  onOpenSubject?: (subjectId: number) => void
  onOpenPerson?: (personId: number, title: string) => void
  onOpenCharacter?: (characterId: number, title: string) => void
}

function subjectTitle(subject: BangumiEntitySubject) {
  return subject.name_cn || subject.name
}

export function BangumiEntityDetailPanel({
  target,
  onClose,
  onOpenSubject,
  onOpenPerson,
  onOpenCharacter,
}: BangumiEntityDetailPanelProps) {
  const [data, setData] = useState<BangumiEntityPageData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError('')
    setData(null)
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
  const title = detail?.name || target.title
  const subjects = useMemo(() => data?.subjects.slice(0, 12) || [], [data])

  return (
    <div className="bangumi-entity-overlay" onClick={onClose}>
      <div className="bangumi-entity-panel" onClick={event => event.stopPropagation()}>
        <div className="bangumi-entity-header">
          <button type="button" onClick={onClose} className="btn btn-secondary btn-sm">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            返回
          </button>
          <h2>{title}</h2>
          {detail && <a href={detail.url} target="_blank" rel="noopener noreferrer" className="btn btn-secondary btn-sm">Bangumi</a>}
        </div>

        {loading && (
          <div className="bangumi-entity-loading">
            <span className="h-5 w-5 rounded-full border-2 border-[var(--accent)] border-t-transparent animate-spin" />
            <span>加载 Bangumi 资料...</span>
          </div>
        )}

        {error && !loading && (
          <div className="bangumi-entity-error">
            <p>{error}</p>
            <button type="button" onClick={onClose} className="btn btn-secondary btn-sm">关闭</button>
          </div>
        )}

        {data && detail && !loading && (
          <div className="bangumi-entity-body">
            <section className="bangumi-entity-hero">
              <div className="bangumi-entity-image">
                {detail.image ? <img src={detail.image} alt={detail.name} /> : <span>{detail.name.slice(0, 1)}</span>}
              </div>
              <div className="bangumi-entity-main">
                <div>
                  <h1>{detail.name}</h1>
                  <p>{data.kind === 'character' ? '角色' : '制作人员'}</p>
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
                <h3>关联游戏</h3>
                <span>{data.subjects.length} 个条目</span>
              </div>
              {subjects.length === 0 ? (
                <p className="bangumi-empty">暂无关联游戏</p>
              ) : (
                <div className="bangumi-relation-grid">
                  {subjects.map(subject => (
                    <button
                      key={subject.id}
                      type="button"
                      onClick={() => onOpenSubject?.(subject.id)}
                      className="bangumi-relation-card"
                    >
                      {subject.cover_url ? <img src={subject.cover_url} alt="" /> : <div className="bangumi-relation-empty">无封面</div>}
                      <div className="min-w-0">
                        <strong>{subjectTitle(subject)}</strong>
                        <span>{subject.relation || '关联游戏'}{subject.score ? ` · ${subject.score.toFixed(1)}` : ''}</span>
                      </div>
                    </button>
                  ))}
                </div>
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
                  <div className="bangumi-staff-list">
                    {data.persons.slice(0, 12).map(person => (
                      <button
                        key={`${person.id}-${person.relation}`}
                        type="button"
                        onClick={() => onOpenPerson?.(person.id, person.name)}
                        className="bangumi-staff-row is-clickable"
                      >
                        <span>{person.name}</span>
                        <strong>{person.relation || person.career.join(', ') || '关联人物'}</strong>
                      </button>
                    ))}
                  </div>
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
                  <div className="bangumi-character-grid">
                    {data.characters.slice(0, 12).map(character => (
                      <button
                        key={character.id}
                        type="button"
                        onClick={() => onOpenCharacter?.(character.id, character.name)}
                        className="bangumi-character-card is-clickable"
                      >
                        {character.image ? <img src={character.image} alt="" /> : <div className="bangumi-avatar-empty">{character.name.slice(0, 1)}</div>}
                        <div className="min-w-0">
                          <strong>{character.name}</strong>
                          <span>{character.relation || '角色'}</span>
                          {character.subjectNames.length > 0 && <small>{character.subjectNames.slice(0, 2).join(' / ')}</small>}
                        </div>
                      </button>
                    ))}
                  </div>
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
