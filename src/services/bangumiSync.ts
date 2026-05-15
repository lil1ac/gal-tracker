import type { BangumiCollectionItem, Game, GameStatus } from '../types'

export interface BangumiSyncTarget {
  game: Game
  subjectId: number
}

const bangumiToLocalStatus: Record<number, GameStatus> = {
  1: 'wish',
  2: 'completed',
  3: 'playing',
  4: 'paused',
  5: 'paused',
}

export function gameStatusToBangumiCollectionType(status: GameStatus): number {
  if (status === 'wish') return 1
  if (status === 'completed') return 2
  if (status === 'playing') return 3
  return 4
}

export function bangumiCollectionTypeToGameStatus(type: number): GameStatus {
  return bangumiToLocalStatus[type] || 'wish'
}

export function buildCollectionPayload(game: Game, isPrivate: boolean) {
  const payload: {
    type: number
    rate?: number
    comment?: string
    tags?: string[]
    private: boolean
  } = {
    type: gameStatusToBangumiCollectionType(game.status),
    private: isPrivate,
  }
  if (game.rating !== null) payload.rate = game.rating
  if (game.review?.trim()) payload.comment = game.review.trim()
  if (game.tags.length > 0) payload.tags = game.tags
  return payload
}

export function getCollectionSubjectId(collection: BangumiCollectionItem): number | null {
  if (typeof collection.subject_id === 'number') return collection.subject_id
  const subject = collection.subject
  const id = subject && typeof subject.id === 'number' ? subject.id : null
  return id
}

export function collectionToGame(collection: BangumiCollectionItem): Game | null {
  const subject = collection.subject as any
  const subjectId = getCollectionSubjectId(collection)
  if (!subject || !subjectId) return null
  const now = Date.now()
  return {
    id: String(subjectId),
    name: subject.name || '',
    name_cn: subject.name_cn || null,
    cover_url: subject.images?.large || subject.images?.common || '',
    air_date: subject.date || null,
    platform: Array.isArray(subject.platforms) ? subject.platforms : [],
    status: bangumiCollectionTypeToGameStatus(collection.type),
    rating: collection.rate || null,
    review: collection.comment || null,
    routes: [],
    tags: collection.tags || [],
    linked_resources: [],
    current_running: false,
    auto_status_prompted: false,
    auto_status_update_enabled: false,
    completed_at: collection.type === 2 ? now : null,
    created_at: now,
    updated_at: now,
  }
}

export function mergeCollectionIntoGame(game: Game, collection: Pick<BangumiCollectionItem, 'type' | 'rate' | 'comment' | 'tags'>): Game {
  return {
    ...game,
    status: bangumiCollectionTypeToGameStatus(collection.type),
    rating: collection.rate || null,
    review: collection.comment || null,
    tags: collection.tags || [],
    completed_at: collection.type === 2 && !game.completed_at ? Date.now() : game.completed_at,
    updated_at: Date.now(),
  }
}

export function getBangumiSyncTargets(games: Game[]): { syncable: BangumiSyncTarget[]; skipped: Game[] } {
  const syncable: BangumiSyncTarget[] = []
  const skipped: Game[] = []

  for (const game of games) {
    const subjectId = Number(game.id)
    if (Number.isFinite(subjectId) && subjectId > 0) {
      syncable.push({ game, subjectId })
    } else {
      skipped.push(game)
    }
  }

  return { syncable, skipped }
}
