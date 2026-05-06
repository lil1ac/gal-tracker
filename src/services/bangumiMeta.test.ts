import assert from 'node:assert/strict'
import {
  buildSubjectSearchUrl,
  buildSubjectSearchBody,
  mapBangumiSubject,
  mapBangumiSubjectMeta,
  pickPrimaryTitle,
} from './bangumiMeta.js'

const rawSubject = {
  id: 123,
  name: 'Summer Pockets',
  name_cn: '夏日口袋',
  summary: 'A summer story.',
  date: '2018-06-29',
  platform: 'PC',
  images: {
    large: 'https://example.com/large.jpg',
    common: 'https://example.com/common.jpg',
  },
  rating: {
    score: 8.1,
    total: 1234,
    count: { '1': 1, '8': 500 },
  },
  rank: 88,
  collection: {
    wish: 100,
    doing: 20,
    collect: 300,
    on_hold: 10,
    dropped: 5,
  },
  tags: [
    { name: 'galgame', count: 99 },
    { name: 'Key', count: 88 },
  ],
  meta_tags: ['恋爱', '泣きゲー'],
}

{
  const meta = mapBangumiSubjectMeta(rawSubject)
  assert.equal(meta.subject_id, 123)
  assert.equal(meta.title_cn, '夏日口袋')
  assert.equal(meta.cover_url, 'https://example.com/large.jpg')
  assert.equal(meta.score, 8.1)
  assert.equal(meta.rank, 88)
  assert.equal(meta.collection.collect, 300)
  assert.deepEqual(meta.tags.map(tag => tag.name), ['galgame', 'Key'])
  assert.deepEqual(meta.meta_tags, ['恋爱', '泣きゲー'])
}

{
  const subject = mapBangumiSubject({
    id: 456,
    name: 'Ever17',
    name_cn: '时空轮回',
    date: '2002-08-29',
    platform: ['PC'],
    images: {},
    rating: { rank: 5, score: 9.1 },
  })
  assert.equal(subject.rank, 5)
  assert.equal(subject.score, 9.1)
}

{
  const body = buildSubjectSearchBody({
    keyword: 'key',
    sort: 'score',
    minScore: 7.5,
    minRank: 1,
    maxRank: 500,
    year: 2018,
    tags: ['galgame', 'ADV'],
    nsfw: true,
  })
  const filter = body.filter as Record<string, any>
  assert.equal(body.keyword, 'key')
  assert.equal(body.sort, 'score')
  assert.equal('limit' in body, false)
  assert.equal('offset' in body, false)
  assert.equal(filter.type[0], 4)
  assert.deepEqual(filter.rating, ['>=7.5'])
  assert.deepEqual(filter.rank, ['>=1', '<=500'])
  assert.deepEqual(filter.air_date, ['>=2018-01-01', '<=2018-12-31'])
  assert.deepEqual(filter.tag, ['galgame', 'ADV'])
  assert.equal(filter.nsfw, true)
}

{
  const body = buildSubjectSearchBody({
    keyword: '',
    sort: 'heat',
    tags: [' galgame ', '', '视觉小说'],
  })
  const filter = body.filter as Record<string, any>
  assert.equal(body.keyword, '')
  assert.deepEqual(filter.tag, ['galgame', '视觉小说'])
}

{
  assert.equal(
    buildSubjectSearchUrl({ limit: 500, offset: -20 }),
    'https://api.bgm.tv/v0/search/subjects?limit=50&offset=0'
  )
  assert.equal(
    buildSubjectSearchUrl({ limit: 12, offset: 24 }),
    'https://api.bgm.tv/v0/search/subjects?limit=12&offset=24'
  )
}

{
  assert.equal(pickPrimaryTitle({ title: 'A', title_cn: '甲' }), '甲')
  assert.equal(pickPrimaryTitle({ title: 'A', title_cn: '' }), 'A')
}
