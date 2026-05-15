import { getBangumiAccessToken } from './bangumiMeta.js'

export type BangumiCommentTargetKind = 'subject'

export interface BangumiCommentTarget {
  kind: BangumiCommentTargetKind
  id: number
  title: string
}

export interface BangumiPrivateCommentOptions {
  limit?: number
  offset?: number
  type?: number
}

export interface BangumiSubjectInterestComment {
  id: number
  user?: {
    id?: number
    username?: string
    nickname?: string
    avatar?: Record<string, string>
  }
  type: number
  rate: number
  comment: string
  updatedAt: number
  reactions?: unknown[]
}

export interface BangumiPrivateCommentsResponse {
  data: BangumiSubjectInterestComment[]
  total: number
}

export interface BangumiPublicComment {
  id: string
  author: string
  authorUrl: string
  status: string
  rating: string
  time: string
  body: string
}

export interface BangumiPublicCommentsPage {
  comments: BangumiPublicComment[]
  total: number
  sourceUrl: string
}

const PRIVATE_API_BASE_URL = 'https://next.bgm.tv/p1'
const PUBLIC_WEB_BASE_URL = 'https://bgm.tv'

const COLLECTION_STATUS_LABELS: Record<number, string> = {
  1: '想玩',
  2: '玩过',
  3: '在玩',
  4: '搁置',
  5: '抛弃',
}

function isTauriEnv(): boolean {
  return !!(typeof window !== 'undefined' && (window as Window & { __TAURI_INTERNALS__?: unknown }).__TAURI_INTERNALS__)
}

function clampLimit(limit: number | undefined): number {
  if (!limit || !Number.isFinite(limit)) return 24
  return Math.min(100, Math.max(1, Math.floor(limit)))
}

function normalizeOffset(offset: number | undefined): number {
  if (!offset || !Number.isFinite(offset)) return 0
  return Math.max(0, Math.floor(offset))
}

export function buildBangumiPrivateCommentsUrl(
  target: Pick<BangumiCommentTarget, 'kind' | 'id'>,
  options: BangumiPrivateCommentOptions = {}
): string {
  if (target.kind !== 'subject') throw new Error('仅支持条目吐槽')
  const params = new URLSearchParams()
  if (options.type) params.set('type', String(Math.floor(options.type)))
  params.set('limit', String(clampLimit(options.limit)))
  params.set('offset', String(normalizeOffset(options.offset)))
  return `${PRIVATE_API_BASE_URL}/subjects/${target.id}/comments?${params.toString()}`
}

export function buildBangumiCommentsPageUrl(target: Pick<BangumiCommentTarget, 'kind' | 'id'>): string {
  if (target.kind !== 'subject') throw new Error('仅支持条目吐槽')
  return `${PUBLIC_WEB_BASE_URL}/subject/${target.id}/comments`
}

function formatTimestamp(seconds: number): string {
  if (!seconds || !Number.isFinite(seconds)) return ''
  const date = new Date(seconds * 1000)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hour = String(date.getHours()).padStart(2, '0')
  const minute = String(date.getMinutes()).padStart(2, '0')
  return `${year}-${month}-${day} ${hour}:${minute}`
}

function mapAuthor(comment: BangumiSubjectInterestComment): string {
  const user = comment.user || {}
  return user.nickname || user.username || (user.id ? `用户 ${user.id}` : 'Bangumi 用户')
}

function mapAuthorUrl(comment: BangumiSubjectInterestComment): string {
  const username = comment.user?.username
  return username ? `${PUBLIC_WEB_BASE_URL}/user/${encodeURIComponent(username)}` : ''
}

export function mapBangumiSubjectComments(response: BangumiPrivateCommentsResponse): BangumiPublicCommentsPage {
  return {
    total: Number(response.total || 0),
    sourceUrl: '',
    comments: (response.data || [])
      .map(comment => ({
        id: String(comment.id),
        author: mapAuthor(comment),
        authorUrl: mapAuthorUrl(comment),
        status: COLLECTION_STATUS_LABELS[comment.type] || '',
        rating: comment.rate > 0 ? String(comment.rate) : '',
        time: formatTimestamp(comment.updatedAt),
        body: (comment.comment || '').trim(),
      }))
      .filter(comment => comment.body.length > 0),
  }
}

export function formatBangumiCommentError(status: number): string {
  if (status === 401) return 'Bangumi 吐槽接口需要登录或有效令牌'
  if (status === 403) return 'Bangumi 吐槽接口拒绝访问'
  if (status >= 500) return `Bangumi 吐槽接口暂时不可用：${status}`
  return `Bangumi 吐槽接口请求失败：${status}`
}

async function requestBangumiPrivateJson<T>(url: string): Promise<T> {
  const token = getBangumiAccessToken()
  if (isTauriEnv()) {
    const { invoke } = await import('@tauri-apps/api/core')
    const text = await invoke<string>('fetch_bangumi_private_json', { url, token })
    return JSON.parse(text) as T
  }

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    'User-Agent': 'Lil1ac/GAL-Tracker/0.1.0 (https://github.com/Lil1ac/gal-tracker)',
  }
  if (token) headers.Authorization = `Bearer ${token}`
  const response = await fetch(url, { headers })
  if (!response.ok) throw new Error(formatBangumiCommentError(response.status))
  return response.json() as Promise<T>
}

export async function fetchBangumiPublicComments(
  target: BangumiCommentTarget,
  options: BangumiPrivateCommentOptions = {}
): Promise<BangumiPublicCommentsPage> {
  const url = buildBangumiPrivateCommentsUrl(target, options)
  const response = await requestBangumiPrivateJson<BangumiPrivateCommentsResponse>(url)
  return {
    ...mapBangumiSubjectComments(response),
    sourceUrl: buildBangumiCommentsPageUrl(target),
  }
}
