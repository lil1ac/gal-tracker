import type { BangumiSnapshot } from '../types'
import {
  getSubjectCharacters,
  getSubjectEpisodes,
  getSubjectMeta,
  getSubjectPersons,
  getSubjectRelations,
} from './bangumiMeta'
import { loadBangumiSnapshot, saveBangumiSnapshot } from './database'

async function keepPrevious<T>(promise: Promise<T>, fallback: T): Promise<T> {
  try {
    return await promise
  } catch {
    return fallback
  }
}

export async function refreshBangumiSnapshot(gameId: string): Promise<BangumiSnapshot> {
  const subjectId = Number(gameId)
  if (!Number.isFinite(subjectId)) throw new Error('Bangumi 条目 ID 无效')
  const previous = await loadBangumiSnapshot(gameId)
  const snapshot = await fetchBangumiSnapshot(subjectId, gameId, previous || undefined)
  await saveBangumiSnapshot(snapshot)
  return snapshot
}

export async function fetchBangumiSnapshot(
  subjectId: number,
  gameId = String(subjectId),
  previous?: Pick<BangumiSnapshot, 'persons' | 'characters' | 'relations' | 'episodes' | 'collection'>
): Promise<BangumiSnapshot> {
  if (!Number.isFinite(subjectId)) throw new Error('Bangumi 条目 ID 无效')
  const [meta, persons, characters, relations, episodes] = await Promise.all([
    getSubjectMeta(subjectId),
    keepPrevious(getSubjectPersons(subjectId), previous?.persons || []),
    keepPrevious(getSubjectCharacters(subjectId), previous?.characters || []),
    keepPrevious(getSubjectRelations(subjectId), previous?.relations || []),
    keepPrevious(getSubjectEpisodes(subjectId), previous?.episodes || []),
  ])
  return {
    game_id: gameId,
    meta,
    persons,
    characters,
    relations,
    episodes,
    collection: previous?.collection || null,
    synced_at: Date.now(),
  }
}
