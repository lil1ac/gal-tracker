import { useEffect, useMemo, useState } from 'react'
import {
  getBangumiCollectionTotal,
  getFeaturedCharacters,
  getFeaturedStaff,
  getTagNames,
} from '../services/bangumiDisplay'
import type { BangumiRelatedSubject, BangumiSnapshot, Game } from '../types'
import { createGameFromBangumiRelation } from '../services/bangumiGame'
import { buildCollectionPayload } from '../services/bangumiSync'
import { patchMyCollection } from '../services/bangumiMeta'
import { fetchBangumiSnapshot, refreshBangumiSnapshot } from '../services/bangumiLibrary'
import { loadBangumiSnapshot } from '../services/database'
import { useGameStore } from '../store/gameStore'
import { BangumiEntityDetailPanel, type BangumiEntityTarget } from './BangumiEntityDetailPanel'
import { BrowseDetailPanel } from './BrowseDetailPanel'

interface BangumiPanelProps {
  game: Game
}

function formatDateTime(timestamp: number | null) {
  if (!timestamp) return '未同步'
  return new Date(timestamp).toLocaleString('zh-CN')
}

function formatScore(score: number | null) {
  return score === null ? '-' : score.toFixed(1)
}

export function BangumiPanel({ game }: BangumiPanelProps) {
  const { games, addGame, updateGame } = useGameStore()
  const [snapshot, setSnapshot] = useState<BangumiSnapshot | null>(null)
  const [entityTarget, setEntityTarget] = useState<BangumiEntityTarget | null>(null)
  const [relatedSnapshot, setRelatedSnapshot] = useState<BangumiSnapshot | null>(null)
  const [busy, setBusy] = useState('')
  const [message, setMessage] = useState('')
  const meta = snapshot?.meta || null

  useEffect(() => {
    setMessage('')
    setBusy('load')
    loadBangumiSnapshot(game.id)
      .then(setSnapshot)
      .finally(() => setBusy(''))
  }, [game.id])

  const staff = useMemo(() => getFeaturedStaff(snapshot?.persons || [], 12), [snapshot?.persons])
  const characters = useMemo(() => getFeaturedCharacters(snapshot?.characters || [], 12), [snapshot?.characters])
  const tags = useMemo(() => meta ? getTagNames(meta, 18) : [], [meta])
  const collectionTotal = meta ? getBangumiCollectionTotal(meta.collection) : 0

  const handleRefresh = async () => {
    setBusy('refresh')
    setMessage('')
    try {
      const next = await refreshBangumiSnapshot(game.id)
      setSnapshot(next)
      setMessage('Bangumi 资料已刷新')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '刷新失败')
    } finally {
      setBusy('')
    }
  }

  const handleApplyMeta = async () => {
    if (!meta) return
    setBusy('apply')
    setMessage('')
    try {
      await updateGame(game.id, {
        name: meta.title || game.name,
        name_cn: meta.title_cn || game.name_cn,
        cover_url: meta.cover_url || game.cover_url,
        air_date: meta.air_date || game.air_date,
        platform: meta.platform.length > 0 ? meta.platform : game.platform,
      })
      setMessage('本地基础资料已更新')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '更新失败')
    } finally {
      setBusy('')
    }
  }

  const handlePushCollection = async () => {
    setBusy('push')
    setMessage('')
    try {
      await patchMyCollection(Number(game.id), buildCollectionPayload(game, false))
      setMessage('已同步到 Bangumi 收藏')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '同步失败，请检查 Access Token')
    } finally {
      setBusy('')
    }
  }

  const handleAddRelation = async (subject: BangumiRelatedSubject) => {
    if (games.some(item => item.id === String(subject.id))) return
    setBusy(`add-${subject.id}`)
    setMessage('')
    try {
      await addGame(createGameFromBangumiRelation(subject))
      setMessage(`已加入：${subject.name_cn || subject.name}`)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '加入失败')
    } finally {
      setBusy('')
    }
  }

  const handleOpenSubject = async (subjectId: number) => {
    setBusy(`open-${subjectId}`)
    setMessage('')
    try {
      setRelatedSnapshot(await fetchBangumiSnapshot(subjectId))
      setEntityTarget(null)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '加载关联作品失败')
    } finally {
      setBusy('')
    }
  }

  if (!meta) {
    return (
      <section className="bangumi-library-panel">
        <div className="bangumi-toolbar">
          <div>
            <h2>Bangumi 资料</h2>
            <p>上次同步：{formatDateTime(snapshot?.synced_at || null)}</p>
          </div>
          <button type="button" onClick={handleRefresh} disabled={!!busy} className="btn btn-primary btn-sm">
            {busy === 'refresh' ? '刷新中...' : '刷新资料'}
          </button>
        </div>
        {message && <p className="bangumi-message">{message}</p>}
        <p className="empty-state mt-4">还没有缓存的 Bangumi 资料，点击刷新资料获取评分、简介、角色、制作人员和关联作品。</p>
        {entityTarget && (
          <BangumiEntityDetailPanel
            target={entityTarget}
            onClose={() => setEntityTarget(null)}
            onOpenSubject={handleOpenSubject}
            onOpenPerson={(id, title) => setEntityTarget({ kind: 'person', id, title })}
            onOpenCharacter={(id, title) => setEntityTarget({ kind: 'character', id, title })}
          />
        )}
        {relatedSnapshot?.meta && (
          <BrowseDetailPanel
            snapshot={relatedSnapshot}
            isInLibrary={games.some(item => item.id === String(relatedSnapshot.meta?.subject_id))}
            onClose={() => setRelatedSnapshot(null)}
          />
        )}
      </section>
    )
  }

  return (
    <section className="bangumi-library-panel">
      <div className="bangumi-toolbar">
        <div>
          <h2>Bangumi 资料</h2>
          <p>上次同步：{formatDateTime(snapshot?.synced_at || null)}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={handleRefresh} disabled={!!busy} className="btn btn-primary btn-sm">
            {busy === 'refresh' ? '刷新中...' : '刷新资料'}
          </button>
          <button type="button" onClick={handleApplyMeta} disabled={!!busy} className="btn btn-secondary btn-sm">
            应用到本地
          </button>
          <button type="button" onClick={handlePushCollection} disabled={!!busy} className="btn btn-secondary btn-sm">
            同步收藏
          </button>
        </div>
      </div>

      {message && <p className="bangumi-message">{message}</p>}

      <div className="mt-4 space-y-4">
        <section className="bangumi-hero-panel is-library">
          <div className="bangumi-cover-frame">
            {meta.cover_url ? <img src={meta.cover_url} alt={meta.title_cn || meta.title} /> : <span>无封面</span>}
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
              <div className="bangumi-stat"><span>玩过</span><strong>{meta.collection.collect.toLocaleString()}</strong></div>
            </div>
            {tags.length > 0 && (
              <div className="bangumi-tag-list">
                {tags.map(tag => <span key={tag}>{tag}</span>)}
              </div>
            )}
            <a href={meta.url} target="_blank" rel="noopener noreferrer" className="btn btn-secondary btn-sm w-fit">打开 Bangumi 条目</a>
          </div>
        </section>

        {meta.summary && (
          <section className="bangumi-section">
            <div className="bangumi-section-head"><h3>简介</h3></div>
            <p className="bangumi-summary">{meta.summary}</p>
          </section>
        )}

        <div className="bangumi-two-column">
          <section className="bangumi-section">
            <div className="bangumi-section-head">
              <h3>角色</h3>
              <span>{snapshot?.characters.length || 0} 个条目</span>
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
              <span>{snapshot?.persons.length || 0} 个条目</span>
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
            <span>{snapshot?.relations.length || 0} 个游戏条目</span>
          </div>
          {(snapshot?.relations || []).length === 0 ? (
            <p className="bangumi-empty">暂无游戏关联条目</p>
          ) : (
            <div className="bangumi-relation-grid">
              {(snapshot?.relations || []).slice(0, 8).map(subject => {
                const exists = games.some(item => item.id === String(subject.id))
                return (
                  <div key={subject.id} className="bangumi-relation-card">
                    {subject.cover_url ? <img src={subject.cover_url} alt="" /> : <div className="bangumi-relation-empty">无封面</div>}
                    <div className="min-w-0">
                      <strong>{subject.name_cn || subject.name}</strong>
                      <span>{subject.relation || '关联作品'}</span>
                    </div>
                    <div className="bangumi-relation-actions">
                      <button
                        type="button"
                        disabled={exists || busy === `add-${subject.id}`}
                        onClick={() => handleAddRelation(subject)}
                        className="btn btn-secondary btn-sm"
                      >
                        {exists ? '已在库中' : '加入'}
                      </button>
                      <button
                        type="button"
                        disabled={busy === `open-${subject.id}`}
                        onClick={() => handleOpenSubject(subject.id)}
                        className="btn btn-secondary btn-sm"
                      >
                        详情
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </section>

        {(snapshot?.episodes || []).length > 0 && (
          <section className="bangumi-section">
            <div className="bangumi-section-head">
              <h3>章节/路线参考</h3>
              <span>显示前 {Math.min(snapshot?.episodes.length || 0, 24)} 条</span>
            </div>
            <div className="bangumi-episode-list">
              {(snapshot?.episodes || []).slice(0, 24).map(episode => (
                <span key={episode.id}>{episode.name_cn || episode.name || `#${episode.sort}`}</span>
              ))}
            </div>
          </section>
        )}
      </div>
      {entityTarget && (
        <BangumiEntityDetailPanel
          target={entityTarget}
          onClose={() => setEntityTarget(null)}
          onOpenSubject={handleOpenSubject}
          onOpenPerson={(id, title) => setEntityTarget({ kind: 'person', id, title })}
          onOpenCharacter={(id, title) => setEntityTarget({ kind: 'character', id, title })}
        />
      )}
      {relatedSnapshot?.meta && (
        <BrowseDetailPanel
          snapshot={relatedSnapshot}
          isInLibrary={games.some(item => item.id === String(relatedSnapshot.meta?.subject_id))}
          onClose={() => setRelatedSnapshot(null)}
        />
      )}
    </section>
  )
}
