import type {
  BangumiCollectionItem,
  BangumiEpisode,
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

export async function getMyBangumiUser(): Promise<{ username: string; nickname?: string }> {
  return requestJson<{ username: string; nickname?: string }>(`${BASE_URL}/me`)
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

export async function patchMyCollection(subjectId: number, payload: Record<string, unknown>): Promise<void> {
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
    if (!create.ok) throw new Error(`Bangumi collection create failed: ${create.status}`)
    return
  }
  if (!response.ok) throw new Error(`Bangumi collection update failed: ${response.status}`)
}
