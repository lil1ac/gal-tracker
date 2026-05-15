import assert from 'node:assert/strict'
import {
  browseBack,
  browseClose,
  browseOpenEntity,
  browseOpenSubject,
  getActiveBrowseRoute,
  type BrowseRoute,
} from './browseNavigation.js'
import type { BangumiSnapshot } from '../types/index.js'

function snapshot(subjectId: number, title: string): BangumiSnapshot {
  return {
    game_id: String(subjectId),
    meta: {
      subject_id: subjectId,
      title,
      title_cn: null,
      summary: '',
      cover_url: '',
      air_date: null,
      platform: [],
      score: null,
      rank: null,
      rating: { score: null, total: 0, count: {} },
      collection: { wish: 0, doing: 0, collect: 0, on_hold: 0, dropped: 0 },
      tags: [],
      meta_tags: [],
      url: `https://bgm.tv/subject/${subjectId}`,
      synced_at: 1,
    },
    persons: [],
    characters: [],
    relations: [],
    episodes: [],
    collection: null,
    synced_at: 1,
  }
}

{
  let stack: BrowseRoute[] = []

  stack = browseOpenSubject(stack, snapshot(1, 'Game A'))
  assert.equal(getActiveBrowseRoute(stack)?.kind, 'subject')

  stack = browseOpenEntity(stack, { kind: 'character', id: 10, title: 'Hero' })
  assert.deepEqual(getActiveBrowseRoute(stack), { kind: 'entity', target: { kind: 'character', id: 10, title: 'Hero' } })

  stack = browseOpenSubject(stack, snapshot(2, 'Related Game'))
  assert.equal(getActiveBrowseRoute(stack)?.kind, 'subject')
  assert.equal(stack.length, 3)

  stack = browseBack(stack)
  assert.deepEqual(getActiveBrowseRoute(stack), { kind: 'entity', target: { kind: 'character', id: 10, title: 'Hero' } })

  stack = browseBack(stack)
  assert.equal(getActiveBrowseRoute(stack)?.kind, 'subject')

  stack = browseBack(stack)
  assert.deepEqual(stack, [])
  assert.equal(getActiveBrowseRoute(stack), null)
}

{
  const stack = browseOpenEntity(browseOpenSubject([], snapshot(3, 'Game B')), { kind: 'person', id: 20, title: 'Staff' })
  assert.deepEqual(browseClose(stack), [])
}
