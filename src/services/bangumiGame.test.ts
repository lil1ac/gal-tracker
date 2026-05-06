import assert from 'node:assert/strict'
import { createGameFromBangumiMeta, createGameFromBangumiSubject } from './bangumiGame.js'
import type { BangumiSubjectMeta } from '../types/index.js'

{
  const game = createGameFromBangumiSubject({
    id: 123,
    name: 'Summer Pockets',
    name_cn: '夏日口袋',
    cover: 'https://example.com/cover.jpg',
    air_date: '2018-06-29',
    platform: ['PC'],
    score: 8.1,
    rank: 88,
  })

  assert.equal(game.id, '123')
  assert.equal(game.name_cn, '夏日口袋')
  assert.equal(game.cover_url, 'https://example.com/cover.jpg')
  assert.equal(game.status, 'wish')
  assert.deepEqual(game.platform, ['PC'])
  assert.deepEqual(game.routes, [])
}

{
  const meta: BangumiSubjectMeta = {
    subject_id: 456,
    title: 'CLANNAD',
    title_cn: '团子大家族',
    summary: '',
    cover_url: 'https://example.com/clannad.jpg',
    air_date: '2004-04-28',
    platform: ['PC'],
    score: 8.7,
    rank: 12,
    rating: { score: 8.7, total: 1000, count: {} },
    collection: { wish: 1, doing: 2, collect: 3, on_hold: 4, dropped: 5 },
    tags: [{ name: 'galgame', count: 10 }],
    meta_tags: ['恋爱'],
    url: 'https://bgm.tv/subject/456',
    synced_at: 1,
  }

  const game = createGameFromBangumiMeta(meta)
  assert.equal(game.id, '456')
  assert.equal(game.name, 'CLANNAD')
  assert.deepEqual(game.tags, ['恋爱', 'galgame'])
}
