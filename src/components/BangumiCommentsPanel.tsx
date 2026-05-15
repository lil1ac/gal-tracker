import { useEffect, useState } from 'react'
import {
  buildBangumiCommentsPageUrl,
  fetchBangumiPublicComments,
  type BangumiCommentTarget,
  type BangumiPublicComment,
} from '../services/bangumiComments'

interface BangumiCommentsPanelProps {
  target: BangumiCommentTarget
}

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

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError('')
    setComments([])
    setTotal(0)
    setSourceUrl(buildBangumiCommentsPageUrl(target))

    fetchBangumiPublicComments(target)
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
  }, [target.kind, target.id])

  return (
    <section className="bangumi-section bangumi-comments-panel">
      <div className="bangumi-section-head">
        <div>
          <h3>Bangumi 吐槽</h3>
          <span>{comments.length > 0 ? `显示 ${comments.length} / ${total} 条吐槽` : `来自 ${target.title}`}</span>
        </div>
        <a href={sourceUrl} target="_blank" rel="noopener noreferrer" className="btn btn-secondary btn-sm">
          在 Bangumi 打开
        </a>
      </div>

      {loading ? (
        <p className="bangumi-comments-empty">正在加载 Bangumi 吐槽...</p>
      ) : error ? (
        <div className="bangumi-comments-empty">
          <p>{error}</p>
          <a href={sourceUrl} target="_blank" rel="noopener noreferrer">在 Bangumi 打开</a>
        </div>
      ) : comments.length === 0 ? (
        <p className="bangumi-comments-empty">Bangumi 暂无可显示的公开吐槽。</p>
      ) : (
        <div className="bangumi-comment-list">
          {comments.map(comment => <BangumiCommentItem key={comment.id} comment={comment} />)}
        </div>
      )}
    </section>
  )
}
