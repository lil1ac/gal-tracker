import assert from 'node:assert/strict'
import {
  getBangumiCollectionTotal,
  getBangumiImage,
  getFeaturedCharacters,
  getFeaturedStaff,
  getTagNames,
} from './bangumiDisplay.js'
import type { BangumiRelatedCharacter, BangumiRelatedPerson, BangumiSubjectMeta } from '../types/index.js'

const meta: BangumiSubjectMeta = {
  subject_id: 1,
  title: 'Title',
  title_cn: null,
  summary: '',
  cover_url: '',
  air_date: null,
  platform: [],
  score: null,
  rank: null,
  rating: { score: null, total: 0, count: {} },
  collection: { wish: 2, doing: 3, collect: 5, on_hold: 7, dropped: 11 },
  tags: [
    { name: 'galgame', count: 10 },
    { name: '恋爱', count: 8 },
  ],
  meta_tags: ['恋爱', 'ADV'],
  url: 'https://bgm.tv/subject/1',
  synced_at: 1,
}

{
  assert.equal(getBangumiCollectionTotal(meta.collection), 28)
  assert.deepEqual(getTagNames(meta, 6), ['恋爱', 'ADV', 'galgame'])
}

{
  assert.equal(getBangumiImage({ large: 'large.jpg', grid: 'grid.jpg' }), 'large.jpg')
  assert.equal(getBangumiImage({ common: 'common.jpg', small: 'small.jpg' }), 'common.jpg')
  assert.equal(getBangumiImage(undefined), '')
}

{
  const staff: BangumiRelatedPerson[] = [
    { id: 1, name: '无职位', relation: '', career: [] },
    { id: 2, name: '脚本', relation: '剧本', career: [] },
    { id: 3, name: '音乐', relation: '', career: ['music'] },
  ]
  assert.deepEqual(getFeaturedStaff(staff, 1).map(person => person.name), ['脚本'])
}

{
  const characters: BangumiRelatedCharacter[] = [
    { id: 1, name: '主角', relation: '主角', actors: [], images: { grid: 'hero.jpg' } },
    { id: 2, name: '配角', relation: '配角', actors: [] },
  ]
  const featured = getFeaturedCharacters(characters, 4)
  assert.equal(featured[0].name, '主角')
  assert.equal(featured[0].image, 'hero.jpg')
  assert.equal(featured[1].image, '')
}
