import type {
  BangumiCollectionItem,
  BangumiEpisode,
  BangumiEntityKind,
  BangumiRelatedCharacter,
  BangumiRelatedPerson,
  BangumiRelatedSubject,
  BangumiSubject,
  BangumiSubjectMeta,
} from '../types'

const BASE_URL = 'https://api.bgm.tv/v0'

type SearchSort = 'match' | 'heat' | 'rank' | 'score'

export interface SubjectSearchOptions {
  keyword: string
  sort?: SearchSort
  limit?: number
  offset?: number
  year?: number | null
  minScore?: number | null
  minRank?: number | null
  maxRank?: number | null
  tags?: string[]
  nsfw?: boolean
}

export interface BangumiEntitySearchItem {
  id: number
  name: string
  summary: string
  image: string
  kind: Extract<BangumiEntityKind, 'character' | 'person'>
}

interface RequestOptions {
  token?: string
}

let accessToken = ''

export function setBangumiAccessToken(token: string) {
  accessToken = token.trim()
}

export function getBangumiAccessToken(): string {
  return accessToken
}

function getHeaders(options: RequestOptions = {}): HeadersInit {
  const token = options.token ?? accessToken
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    'User-Agent': 'Lil1ac/GAL-Tracker/0.1.0 (https://github.com/Lil1ac/gal-tracker)',
  }
  if (token) headers.Authorization = `Bearer ${token}`
  return headers
}

async function requestJson<T>(url: string, init: RequestInit = {}, options: RequestOptions = {}): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: {
      ...getHeaders(options),
      ...(init.headers || {}),
    },
  })
  if (!response.ok) {
    throw new Error(`Bangumi request failed: ${response.status}`)
  }
  return response.json() as Promise<T>
}

export async function requestBangumiJson<T>(url: string, init: RequestInit = {}, options: RequestOptions = {}): Promise<T> {
  return requestJson<T>(url, init, options)
}

function stringifyErrorDetail(detail: unknown): string {
  if (!detail) return ''
  if (typeof detail === 'string') return detail
  if (Array.isArray(detail)) {
    return detail
      .map(item => {
        if (typeof item === 'string') return item
        if (item && typeof item === 'object') {
          const record = item as Record<string, unknown>
          const field = typeof record.field === 'string' ? record.field : ''
          const message = typeof record.message === 'string'
            ? record.message
            : (typeof record.description === 'string' ? record.description : '')
          return field && message ? `${field}: ${message}` : message || field
        }
        return ''
      })
      .filter(Boolean)
      .join('；')
  }
  if (typeof detail === 'object') {
    const record = detail as Record<string, unknown>
    return Object.entries(record)
      .map(([key, value]) => `${key}: ${typeof value === 'string' ? value : JSON.stringify(value)}`)
      .join('；')
  }
  return ''
}

export async function formatBangumiApiError(response: Response, fallback: string): Promise<string> {
  const text = await response.text().catch(() => '')
  const statusPart = `${response.status}${response.statusText ? ` ${response.statusText}` : ''}`
  if (!text.trim()) return `${fallback}: ${statusPart}`

  try {
    const data = JSON.parse(text) as Record<string, unknown>
    const title = typeof data.title === 'string'
      ? data.title
      : (typeof data.error === 'string' ? data.error : '')
    const description = typeof data.description === 'string'
      ? data.description
      : (typeof data.message === 'string' ? data.message : '')
    const details = stringifyErrorDetail(data.details ?? data.detail ?? data.errors)
    const body = [title, description].filter(Boolean).join(' - ')
    const suffix = [body, details].filter(Boolean).join('；')
    return suffix ? `${fallback}: ${statusPart} ${suffix}` : `${fallback}: ${statusPart}`
  } catch {
    return `${fallback}: ${statusPart} ${text.trim()}`
  }
}

function asArray<T>(value: T[] | undefined | null): T[] {
  return Array.isArray(value) ? value : []
}

function asStringArray(value: unknown): string[] {
  if (Array.isArray(value)) return value.filter((item): item is string => typeof item === 'string')
  if (typeof value === 'string' && value.trim()) return [value.trim()]
  return []
}

function pickCover(images: any): string {
  return images?.large || images?.common || images?.medium || images?.grid || images?.small || ''
}

export function pickBangumiImage(images: any): string {
  return pickCover(images)
}

function normalizePlatform(value: unknown): string[] {
  if (Array.isArray(value)) return value.filter((item): item is string => typeof item === 'string')
  if (typeof value === 'string' && value.trim()) return [value.trim()]
  return []
}

function normalizeRank(raw: any): number | null {
  if (typeof raw.rank === 'number') return raw.rank
  if (typeof raw.rating?.rank === 'number') return raw.rating.rank
  return null
}

function clampLimit(limit: number | undefined): number {
  if (!limit || !Number.isFinite(limit)) return 20
  return Math.min(50, Math.max(1, Math.floor(limit)))
}

function normalizeOffset(offset: number | undefined): number {
  if (!offset || !Number.isFinite(offset)) return 0
  return Math.max(0, Math.floor(offset))
}

export function pickPrimaryTitle(subject: { title?: string; title_cn?: string | null; name?: string; name_cn?: string | null }): string {
  return subject.title_cn || subject.name_cn || subject.title || subject.name || ''
}

export function mapBangumiSubjectMeta(raw: any): BangumiSubjectMeta {
  const rating = raw.rating || {}
  const collection = raw.collection || {}
  return {
    subject_id: Number(raw.id),
    title: raw.name || '',
    title_cn: raw.name_cn || null,
    summary: raw.summary || '',
    cover_url: pickCover(raw.images),
    air_date: raw.date || raw.air_date || null,
    platform: normalizePlatform(raw.platforms || raw.platform),
    score: typeof rating.score === 'number' ? rating.score : null,
    rank: normalizeRank(raw),
    rating: {
      score: typeof rating.score === 'number' ? rating.score : null,
      total: Number(rating.total || 0),
      count: rating.count || {},
    },
    collection: {
      wish: Number(collection.wish || 0),
      doing: Number(collection.doing || 0),
      collect: Number(collection.collect || 0),
      on_hold: Number(collection.on_hold || 0),
      dropped: Number(collection.dropped || 0),
    },
    tags: asArray(raw.tags).map((tag: any) => ({
      name: String(tag.name || ''),
      count: Number(tag.count || 0),
    })).filter(tag => tag.name),
    meta_tags: asStringArray(raw.meta_tags),
    url: `https://bgm.tv/subject/${raw.id}`,
    synced_at: Date.now(),
  }
}

export function mapBangumiSubject(raw: any): BangumiSubject {
  const rating = raw.rating || {}
  return {
    id: Number(raw.id),
    name: raw.name || '',
    name_cn: raw.name_cn || null,
    cover: pickCover(raw.images),
    air_date: raw.date || raw.air_date || null,
    platform: normalizePlatform(raw.platforms || raw.platform),
    score: typeof rating.score === 'number' ? rating.score : null,
    rank: normalizeRank(raw),
  }
}

export function buildSubjectSearchBody(options: SubjectSearchOptions) {
  const filter: Record<string, unknown> = { type: [4] }
  const tags = (options.tags || []).map(tag => tag.trim()).filter(Boolean)
  if (tags.length > 0) filter.tag = tags
  if (options.year) filter.air_date = [`>=${options.year}-01-01`, `<=${options.year}-12-31`]
  if (options.minScore) filter.rating = [`>=${options.minScore}`]
  const rank: string[] = []
  if (options.minRank) rank.push(`>=${options.minRank}`)
  if (options.maxRank) rank.push(`<=${options.maxRank}`)
  if (rank.length > 0) filter.rank = rank
  if (typeof options.nsfw === 'boolean') filter.nsfw = options.nsfw
  return {
    keyword: options.keyword.trim(),
    sort: options.sort || 'match',
    filter,
  }
}

export function buildSubjectSearchUrl(options: Pick<SubjectSearchOptions, 'limit' | 'offset'>): string {
  const params = new URLSearchParams({
    limit: String(clampLimit(options.limit)),
    offset: String(normalizeOffset(options.offset)),
  })
  return `${BASE_URL}/search/subjects?${params.toString()}`
}

export async function searchBangumiSubjects(options: SubjectSearchOptions): Promise<BangumiSubject[]> {
  const result = await requestJson<any>(buildSubjectSearchUrl(options), {
    method: 'POST',
    body: JSON.stringify(buildSubjectSearchBody(options)),
  })
  const items = Array.isArray(result) ? result : (result.data || [])
  return items.map(mapBangumiSubject)
}

export async function searchBangumiSubjectsWithTotal(options: SubjectSearchOptions): Promise<{ items: BangumiSubject[]; total: number }> {
  const result = await requestJson<any>(buildSubjectSearchUrl(options), {
    method: 'POST',
    body: JSON.stringify(buildSubjectSearchBody(options)),
  })
  const items = Array.isArray(result) ? result : (result.data || [])
  return {
    items: items.map(mapBangumiSubject),
    total: typeof result.total === 'number' ? result.total : (Array.isArray(result) ? items.length : 0),
  }
}

function mapBangumiEntitySearchItem(raw: any, kind: Extract<BangumiEntityKind, 'character' | 'person'>): BangumiEntitySearchItem {
  return {
    id: Number(raw.id),
    name: raw.name || '',
    summary: raw.summary || raw.infobox?.[0]?.value || '',
    image: pickCover(raw.images),
    kind,
  }
}

export async function searchBangumiCharacters(keyword: string, limit = 24, offset = 0): Promise<{ items: BangumiEntitySearchItem[]; total: number }> {
  const params = new URLSearchParams({
    limit: String(clampLimit(limit)),
    offset: String(normalizeOffset(offset)),
  })
  const result = await requestJson<any>(`${BASE_URL}/search/characters?${params.toString()}`, {
    method: 'POST',
    body: JSON.stringify({ keyword: keyword.trim() }),
  })
  const items = Array.isArray(result) ? result : (result.data || [])
  return {
    items: items.map((item: any) => mapBangumiEntitySearchItem(item, 'character')).filter((item: BangumiEntitySearchItem) => item.id),
    total: typeof result.total === 'number' ? result.total : items.length,
  }
}

export async function searchBangumiPersons(keyword: string, limit = 24, offset = 0): Promise<{ items: BangumiEntitySearchItem[]; total: number }> {
  const params = new URLSearchParams({
    limit: String(clampLimit(limit)),
    offset: String(normalizeOffset(offset)),
  })
  const result = await requestJson<any>(`${BASE_URL}/search/persons?${params.toString()}`, {
    method: 'POST',
    body: JSON.stringify({ keyword: keyword.trim() }),
  })
  const items = Array.isArray(result) ? result : (result.data || [])
  return {
    items: items.map((item: any) => mapBangumiEntitySearchItem(item, 'person')).filter((item: BangumiEntitySearchItem) => item.id),
    total: typeof result.total === 'number' ? result.total : items.length,
  }
}

export async function getSubjectMeta(subjectId: number): Promise<BangumiSubjectMeta> {
  const data = await requestJson<any>(`${BASE_URL}/subjects/${subjectId}`)
  return mapBangumiSubjectMeta(data)
}

export async function getSubjectRelations(subjectId: number): Promise<BangumiRelatedSubject[]> {
  const data = await requestJson<any[]>(`${BASE_URL}/subjects/${subjectId}/subjects`)
  return asArray(data).map((item: any) => {
    const subject = item.subject || item
    return {
      id: Number(subject.id),
      name: subject.name || '',
      name_cn: subject.name_cn || null,
      relation: item.relation || item.type || '',
      type: Number(subject.type || 0),
      cover_url: pickCover(subject.images),
    }
  }).filter(item => item.id && item.type === 4)
}

export async function getSubjectPersons(subjectId: number): Promise<BangumiRelatedPerson[]> {
  const data = await requestJson<any[]>(`${BASE_URL}/subjects/${subjectId}/persons`)
  return asArray(data).map((item: any) => ({
    id: Number(item.id),
    name: item.name || '',
    relation: item.relation || item.staff || '',
    career: asStringArray(item.career),
    images: item.images,
  })).filter(item => item.id)
}

export async function getSubjectCharacters(subjectId: number): Promise<BangumiRelatedCharacter[]> {
  const data = await requestJson<any[]>(`${BASE_URL}/subjects/${subjectId}/characters`)
  return asArray(data).map((item: any) => ({
    id: Number(item.id),
    name: item.name || '',
    relation: item.relation || item.role_name || '',
    actors: asArray(item.actors).map((actor: any) => ({
      id: Number(actor.id),
      name: actor.name || '',
      relation: actor.relation || '',
      career: asStringArray(actor.career),
      images: actor.images,
    })),
    images: item.images,
  })).filter(item => item.id)
}

export async function getSubjectEpisodes(subjectId: number): Promise<BangumiEpisode[]> {
  const result = await requestJson<any>(`${BASE_URL}/episodes?subject_id=${subjectId}&limit=100`)
  const items = Array.isArray(result) ? result : (result.data || [])
  return items.map((item: any) => ({
    id: Number(item.id),
    name: item.name || '',
    name_cn: item.name_cn || null,
    type: Number(item.type || 0),
    sort: Number(item.sort || 0),
  }))
}

export async function getMyBangumiUser(): Promise<{ id?: number; username: string; nickname?: string; avatar?: Record<string, string> }> {
  return requestJson<{ id?: number; username: string; nickname?: string; avatar?: Record<string, string> }>(`${BASE_URL}/me`)
}

export async function setBangumiEntityCollect(kind: Extract<BangumiEntityKind, 'character' | 'person'>, id: number, collected: boolean): Promise<void> {
  const path = kind === 'character' ? 'characters' : 'persons'
  const response = await fetch(`${BASE_URL}/${path}/${id}/collect`, {
    method: collected ? 'POST' : 'DELETE',
    headers: getHeaders(),
  })
  if (!response.ok) {
    throw new Error(await formatBangumiApiError(response, collected ? 'Bangumi collect failed' : 'Bangumi uncollect failed'))
  }
}

export async function getUserGameCollections(username: string): Promise<BangumiCollectionItem[]> {
  const limit = 50
  let offset = 0
  const all: BangumiCollectionItem[] = []
  while (true) {
    const page = await requestJson<any>(
      `${BASE_URL}/users/${encodeURIComponent(username)}/collections?subject_type=4&limit=${limit}&offset=${offset}`
    )
    const data = page.data || []
    all.push(...data)
    if (!page.total || all.length >= page.total || data.length === 0) break
    offset += limit
  }
  return all
}

export async function patchMyCollection(subjectId: number, payload: object): Promise<void> {
  const response = await fetch(`${BASE_URL}/users/-/collections/${subjectId}`, {
    method: 'PATCH',
    headers: getHeaders(),
    body: JSON.stringify(payload),
  })
  if (response.status === 404) {
    const create = await fetch(`${BASE_URL}/users/-/collections/${subjectId}`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(payload),
    })
    if (!create.ok) throw new Error(await formatBangumiApiError(create, 'Bangumi collection create failed'))
    return
  }
  if (!response.ok) throw new Error(await formatBangumiApiError(response, 'Bangumi collection update failed'))
}
