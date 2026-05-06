import type { BangumiRelatedSubject, BangumiSubject, BangumiSubjectMeta, Game } from '../types'

interface GameSeed {
  id: number
  name: string
  name_cn: string | null
  cover_url: string
  air_date: string | null
  platform: string[]
  tags?: string[]
}

function createGame(seed: GameSeed): Game {
  const now = Date.now()
  return {
    id: String(seed.id),
    name: seed.name,
    name_cn: seed.name_cn,
    cover_url: seed.cover_url,
    air_date: seed.air_date,
    platform: seed.platform,
    status: 'wish',
    rating: null,
    review: null,
    routes: [],
    tags: seed.tags || [],
    linked_resources: [],
    current_running: false,
    auto_status_prompted: false,
    auto_status_update_enabled: false,
    completed_at: null,
    created_at: now,
    updated_at: now,
  }
}

export function createGameFromBangumiSubject(subject: BangumiSubject): Game {
  return createGame({
    id: subject.id,
    name: subject.name,
    name_cn: subject.name_cn,
    cover_url: subject.cover,
    air_date: subject.air_date,
    platform: subject.platform,
  })
}

export function createGameFromBangumiMeta(meta: BangumiSubjectMeta): Game {
  return createGame({
    id: meta.subject_id,
    name: meta.title,
    name_cn: meta.title_cn,
    cover_url: meta.cover_url,
    air_date: meta.air_date,
    platform: meta.platform,
    tags: [...meta.meta_tags, ...meta.tags.slice(0, 8).map(tag => tag.name)],
  })
}

export function createGameFromBangumiRelation(subject: BangumiRelatedSubject): Game {
  return createGame({
    id: subject.id,
    name: subject.name,
    name_cn: subject.name_cn,
    cover_url: subject.cover_url,
    air_date: null,
    platform: [],
  })
}
