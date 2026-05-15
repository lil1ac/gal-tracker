import { useEffect, useMemo, useState } from 'react'
import {
  buildBangumiCommentsPageUrl,
  fetchBangumiPublicComments,
  getBangumiCommentPageState,
  type BangumiCommentTarget,
  type BangumiPublicComment,
} from '../services/bangumiComments'

interface BangumiCommentsPanelProps {
  target: BangumiCommentTarget
}

const COMMENT_PAGE_SIZE = 12

const commentFilters = [
  { label: '全部', type: undefined },
  { label: '想玩', type: 1 },
  { label: '玩过', type: 2 },
  { label: '在玩', type: 3 },
  { label: '搁置', type: 4 },
  { label: '抛弃', type: 5 },
] as const

function BangumiCommentItem({ comment }: { comment: BangumiPublicComment }) {
  return (
    <article className="bangumi-comment-item">
      <div className="bangumi-comment-meta">
        {comment.authorUrl ? (
          <a href={comment.authorUrl} target="_blank" rel="noopener noreferrer">{comment.author}</a>
        ) : (
          <strong>{comment.author}</strong>
        )}
        {comment.status && <span>{comment.status}</span>}
        {comment.rating && <span>{comment.rating} 分</span>}
        {comment.time && <span>{comment.time}</span>}
      </div>
      <p>{comment.body}</p>
    </article>
  )
}

export function BangumiCommentsPanel({ target }: BangumiCommentsPanelProps) {
  const [comments, setComments] = useState<BangumiPublicComment[]>([])
  const [total, setTotal] = useState(0)
  const [sourceUrl, setSourceUrl] = useState(() => buildBangumiCommentsPageUrl(target))
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [offset, setOffset] = useState(0)
  const [activeType, setActiveType] = useState<number | undefined>(undefined)

  const pageState = useMemo(
    () => getBangumiCommentPageState(total, COMMENT_PAGE_SIZE, offset),
    [total, offset]
  )

  useEffect(() => {
    setOffset(0)
    setActiveType(undefined)
  }, [target.kind, target.id])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError('')
    setComments([])
    setSourceUrl(buildBangumiCommentsPageUrl(target))

    fetchBangumiPublicComments(target, {
      limit: COMMENT_PAGE_SIZE,
      offset,
      type: activeType,
    })
      .then(result => {
        if (cancelled) return
        setComments(result.comments)
        setTotal(result.total)
        setSourceUrl(result.sourceUrl)
      })
      .catch(err => {
        if (!cancelled) setError(err instanceof Error ? err.message : '加载 Bangumi 吐槽失败')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [target.kind, target.id, offset, activeType])

  const handleFilter = (type: number | undefined) => {
    setActiveType(type)
    setOffset(0)
  }

  return (
    <section className="bangumi-section bangumi-comments-panel">
      <div className="bangumi-section-head">
        <div>
          <h3>Bangumi 吐槽</h3>
          <span>
            {total > 0
              ? `第 ${pageState.page} / ${pageState.totalPages} 页，显示 ${pageState.from}-${pageState.to} / ${total} 条`
              : `来自 ${target.title}`}
          </span>
        </div>
        <a href={sourceUrl} target="_blank" rel="noopener noreferrer" className="btn btn-secondary btn-sm">
          在 Bangumi 打开
        </a>
      </div>

      <div className="bangumi-comment-toolbar">
        <div className="segmented-control">
          {commentFilters.map(filter => (
            <button
              key={filter.label}
              type="button"
              onClick={() => handleFilter(filter.type)}
              className={activeType === filter.type ? 'is-active' : ''}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="bangumi-comment-skeleton-list">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="bangumi-comment-skeleton" />
          ))}
        </div>
      ) : error ? (
        <div className="bangumi-comments-empty">
          <p>{error}</p>
          <a href={sourceUrl} target="_blank" rel="noopener noreferrer">在 Bangumi 打开</a>
        </div>
      ) : comments.length === 0 ? (
        <p className="bangumi-comments-empty">当前筛选下暂无可显示的公开吐槽。</p>
      ) : (
        <>
          <div className="bangumi-comment-list">
            {comments.map(comment => <BangumiCommentItem key={comment.id} comment={comment} />)}
          </div>
          <div className="bangumi-comment-pagination">
            <button
              type="button"
              onClick={() => setOffset(Math.max(0, offset - COMMENT_PAGE_SIZE))}
              disabled={!pageState.hasPrev || loading}
              className="btn btn-secondary btn-sm"
            >
              上一页
            </button>
            <span>{pageState.page} / {pageState.totalPages}</span>
            <button
              type="button"
              onClick={() => setOffset(offset + COMMENT_PAGE_SIZE)}
              disabled={!pageState.hasNext || loading}
              className="btn btn-secondary btn-sm"
            >
              下一页
            </button>
          </div>
        </>
      )}
    </section>
  )
}
