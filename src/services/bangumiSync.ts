import type { BangumiCollectionItem, Game, GameStatus } from '../types'

export interface BangumiSyncTarget {
  game: Game
  subjectId: number
}

export interface BangumiCollectionPayload {
  type?: number
  rate?: number
  comment?: string
  tags?: string[]
  private?: true
}

export interface BangumiCollectionDiffItem {
  subjectId: number
  title: string
  local?: {
    status: GameStatus
    rating: number | null
  }
  remote?: {
    status: GameStatus
    rating: number | null
  }
}

export interface BangumiCollectionDiffPreview {
  localOnly: Game[]
  remoteOnly: BangumiCollectionDiffItem[]
  conflicts: BangumiCollectionDiffItem[]
  same: BangumiCollectionDiffItem[]
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

export function sanitizeCollectionPayload(payload: Record<string, unknown>): BangumiCollectionPayload {
  const sanitized: BangumiCollectionPayload = {}

  const type = typeof payload.type === 'number' ? Math.floor(payload.type) : null
  if (type !== null && type >= 1 && type <= 4) sanitized.type = type

  const rate = typeof payload.rate === 'number' ? Math.round(payload.rate) : null
  if (rate !== null && rate >= 1 && rate <= 10) sanitized.rate = rate

  const comment = typeof payload.comment === 'string' ? payload.comment.trim() : ''
  if (comment) sanitized.comment = comment

  if (Array.isArray(payload.tags)) {
    const seen = new Set<string>()
    const tags = payload.tags
      .filter((tag): tag is string => typeof tag === 'string')
      .map(tag => tag.trim())
      .filter(tag => {
        if (!tag || seen.has(tag)) return false
        seen.add(tag)
        return true
      })
    if (tags.length > 0) sanitized.tags = tags
  }

  if (payload.private === true) sanitized.private = true

  return sanitized
}

export function buildCollectionPayload(game: Game, isPrivate: boolean): BangumiCollectionPayload {
  return sanitizeCollectionPayload({
    type: gameStatusToBangumiCollectionType(game.status),
    rate: game.rating,
    comment: game.review ?? '',
    tags: game.tags,
    private: isPrivate,
  })
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

export function buildCollectionDiffPreview(games: Game[], collections: BangumiCollectionItem[]): BangumiCollectionDiffPreview {
  const localBySubject = new Map<number, Game>()
  for (const game of games) {
    const subjectId = Number(game.id)
    if (Number.isFinite(subjectId) && subjectId > 0) localBySubject.set(subjectId, game)
  }

  const remoteBySubject = new Map<number, BangumiCollectionItem>()
  for (const collection of collections) {
    const subjectId = getCollectionSubjectId(collection)
    if (subjectId) remoteBySubject.set(subjectId, collection)
  }

  const preview: BangumiCollectionDiffPreview = {
    localOnly: [],
    remoteOnly: [],
    conflicts: [],
    same: [],
  }

  for (const [subjectId, game] of localBySubject) {
    const remote = remoteBySubject.get(subjectId)
    if (!remote) {
      preview.localOnly.push(game)
      continue
    }

    const localStatus = game.status
    const localRating = game.rating
    const remoteStatus = bangumiCollectionTypeToGameStatus(remote.type)
    const remoteRating = remote.rate || null
    const item: BangumiCollectionDiffItem = {
      subjectId,
      title: game.name_cn || game.name,
      local: { status: localStatus, rating: localRating },
      remote: { status: remoteStatus, rating: remoteRating },
    }

    if (localStatus !== remoteStatus || localRating !== remoteRating) {
      preview.conflicts.push(item)
    } else {
      preview.same.push(item)
    }
  }

  for (const [subjectId, collection] of remoteBySubject) {
    if (localBySubject.has(subjectId)) continue
    const subject = collection.subject as any
    preview.remoteOnly.push({
      subjectId,
      title: subject?.name_cn || subject?.name || `Bangumi #${subjectId}`,
      remote: {
        status: bangumiCollectionTypeToGameStatus(collection.type),
        rating: collection.rate || null,
      },
    })
  }

  return preview
}
