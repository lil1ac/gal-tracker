import type {
  BangumiCharacterDetail,
  BangumiCharacterPageData,
  BangumiEntityCharacter,
  BangumiEntityKind,
  BangumiEntitySubject,
  BangumiInfoItem,
  BangumiPersonDetail,
  BangumiPersonPageData,
  BangumiRelatedPerson,
} from '../types'
import { pickBangumiImage, requestBangumiJson } from './bangumiMeta.js'

const BASE_URL = 'https://api.bgm.tv/v0'

export function buildBangumiEntityUrl(kind: BangumiEntityKind, id: number): string {
  return `https://bgm.tv/${kind}/${id}`
}

function asArray<T>(value: T[] | undefined | null): T[] {
  return Array.isArray(value) ? value : []
}

function asStringArray(value: unknown): string[] {
  if (Array.isArray(value)) return value.filter((item): item is string => typeof item === 'string')
  if (typeof value === 'string' && value.trim()) return [value.trim()]
  return []
}

function stringifyInfoValue(value: unknown): string {
  if (typeof value === 'string' || typeof value === 'number') return String(value)
  if (Array.isArray(value)) {
    return value
      .map(item => {
        if (typeof item === 'string' || typeof item === 'number') return String(item)
        if (item && typeof item === 'object' && 'v' in item) return String((item as { v: unknown }).v || '')
        return ''
      })
      .filter(Boolean)
      .join(' / ')
  }
  if (value && typeof value === 'object' && 'v' in value) return String((value as { v: unknown }).v || '')
  return ''
}

function mapInfobox(raw: any): BangumiInfoItem[] {
  return asArray<any>(raw?.infobox)
    .map(item => ({
      key: String(item.key || ''),
      value: stringifyInfoValue(item.value),
    }))
    .filter(item => item.key && item.value)
}

export function mapBangumiCharacterDetail(raw: any): BangumiCharacterDetail {
  const id = Number(raw.id)
  return {
    id,
    name: raw.name || '',
    summary: raw.summary || '',
    image: pickBangumiImage(raw.images),
    collects: Number(raw.collects || 0),
    comments: Number(raw.comment || raw.comments || 0),
    info: mapInfobox(raw),
    url: buildBangumiEntityUrl('character', id),
  }
}

export function mapBangumiPersonDetail(raw: any): BangumiPersonDetail {
  const id = Number(raw.id)
  return {
    id,
    name: raw.name || '',
    summary: raw.summary || '',
    image: pickBangumiImage(raw.images),
    career: asStringArray(raw.career),
    collects: Number(raw.collects || 0),
    comments: Number(raw.comment || raw.comments || 0),
    info: mapInfobox(raw),
    url: buildBangumiEntityUrl('person', id),
  }
}

export function mapBangumiEntitySubject(raw: any): BangumiEntitySubject {
  const subject = raw.subject || raw
  const rating = subject.rating || raw.rating || {}
  const images = subject.images || raw.images
  return {
    id: Number(subject.id),
    name: subject.name || '',
    name_cn: subject.name_cn || null,
    relation: raw.staff || raw.relation || raw.type || '',
    type: Number(subject.type || 0),
    cover_url: pickBangumiImage(images),
    score: typeof rating.score === 'number' ? rating.score : null,
    rank: typeof subject.rank === 'number' ? subject.rank : (typeof rating.rank === 'number' ? rating.rank : null),
    air_date: subject.date || subject.air_date || null,
  }
}

export function mergeBangumiEntitySubjectCover(subject: BangumiEntitySubject, rawDetail: any): BangumiEntitySubject {
  if (subject.cover_url) return subject
  const cover = pickBangumiImage(rawDetail?.images)
  return cover ? { ...subject, cover_url: cover } : subject
}

async function enrichVisibleSubjectCovers(subjects: BangumiEntitySubject[]): Promise<BangumiEntitySubject[]> {
  const visibleSubjects = subjects.slice(0, 12)
  const enrichedVisibleSubjects = await Promise.all(
    visibleSubjects.map(async subject => {
      if (subject.cover_url) return subject
      try {
        const rawDetail = await requestBangumiJson<any>(`${BASE_URL}/subjects/${subject.id}`)
        return mergeBangumiEntitySubjectCover(subject, rawDetail)
      } catch {
        return subject
      }
    })
  )

  return subjects.map((subject, index) => enrichedVisibleSubjects[index] || subject)
}

export function mapBangumiEntityPerson(raw: any): BangumiRelatedPerson {
  return {
    id: Number(raw.id),
    name: raw.name || '',
    relation: raw.relation || raw.staff || '',
    career: asStringArray(raw.career),
    images: raw.images,
  }
}

export function mapBangumiEntityCharacter(raw: any): BangumiEntityCharacter {
  return {
    id: Number(raw.id),
    name: raw.name || '',
    relation: raw.relation || raw.role_name || '',
    image: pickBangumiImage(raw.images),
    subjectNames: asArray<any>(raw.subjects).map(subject => subject.name_cn || subject.name || '').filter(Boolean),
    url: buildBangumiEntityUrl('character', Number(raw.id)),
  }
}

export async function getBangumiCharacterPage(characterId: number): Promise<BangumiCharacterPageData> {
  const [detail, subjects, persons] = await Promise.all([
    requestBangumiJson<any>(`${BASE_URL}/characters/${characterId}`).then(mapBangumiCharacterDetail),
    requestBangumiJson<any[]>(`${BASE_URL}/characters/${characterId}/subjects`).then(items =>
      asArray(items).map(mapBangumiEntitySubject).filter(item => item.id && item.type === 4)
    ),
    requestBangumiJson<any[]>(`${BASE_URL}/characters/${characterId}/persons`).then(items =>
      asArray(items).map(mapBangumiEntityPerson).filter(item => item.id)
    ),
  ])
  return { kind: 'character', detail, subjects: await enrichVisibleSubjectCovers(subjects), persons }
}

export async function getBangumiPersonPage(personId: number): Promise<BangumiPersonPageData> {
  const [detail, subjects, characters] = await Promise.all([
    requestBangumiJson<any>(`${BASE_URL}/persons/${personId}`).then(mapBangumiPersonDetail),
    requestBangumiJson<any[]>(`${BASE_URL}/persons/${personId}/subjects`).then(items =>
      asArray(items).map(mapBangumiEntitySubject).filter(item => item.id && item.type === 4)
    ),
    requestBangumiJson<any[]>(`${BASE_URL}/persons/${personId}/characters`).then(items =>
      asArray(items).map(mapBangumiEntityCharacter).filter(item => item.id)
    ),
  ])
  return { kind: 'person', detail, subjects: await enrichVisibleSubjectCovers(subjects), characters }
}
