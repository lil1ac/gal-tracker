import assert from 'node:assert/strict'
import {
  buildBangumiEntityUrl,
  buildBangumiEntitySubjectCardKey,
  mapBangumiCharacterDetail,
  mapBangumiEntityCharacter,
  mapBangumiEntitySubject,
  mergeBangumiEntitySubjectCover,
  mapBangumiPersonDetail,
} from './bangumiEntity.js'

{
  assert.equal(buildBangumiEntityUrl('character', 123), 'https://bgm.tv/character/123')
  assert.equal(buildBangumiEntityUrl('person', 456), 'https://bgm.tv/person/456')
  assert.equal(buildBangumiEntityUrl('subject', 789), 'https://bgm.tv/subject/789')
}

{
  const subject = mapBangumiEntitySubject({
    id: 51730,
    type: 4,
    name: 'Same Game',
    relation: '出演',
  })

  assert.equal(buildBangumiEntitySubjectCardKey(subject, 0), '51730-出演-0')
  assert.equal(buildBangumiEntitySubjectCardKey(subject, 1), '51730-出演-1')
}

{
  const detail = mapBangumiCharacterDetail({
    id: 101,
    name: '古河渚',
    summary: '角色简介',
    images: { grid: 'grid.jpg', large: 'large.jpg' },
    collects: 300,
    comment: 22,
    infobox: [
      { key: '生日', value: '12月24日' },
      { key: '身高', value: [{ v: '155cm' }] },
    ],
  })

  assert.equal(detail.id, 101)
  assert.equal(detail.name, '古河渚')
  assert.equal(detail.summary, '角色简介')
  assert.equal(detail.image, 'large.jpg')
  assert.equal(detail.collects, 300)
  assert.equal(detail.comments, 22)
  assert.deepEqual(detail.info, [
    { key: '生日', value: '12月24日' },
    { key: '身高', value: '155cm' },
  ])
}

{
  const detail = mapBangumiPersonDetail({
    id: 202,
    name: '麻枝准',
    summary: '人物简介',
    images: { common: 'common.jpg' },
    career: ['artist', 'producer'],
    collects: 999,
    comment: 31,
    infobox: [{ key: '别名', value: { v: 'だーまえ' } }],
  })

  assert.equal(detail.id, 202)
  assert.equal(detail.name, '麻枝准')
  assert.equal(detail.image, 'common.jpg')
  assert.deepEqual(detail.career, ['artist', 'producer'])
  assert.deepEqual(detail.info, [{ key: '别名', value: 'だーまえ' }])
}

{
  assert.deepEqual(
    mapBangumiEntitySubject({
      id: 13,
      type: 4,
      name: 'CLANNAD',
      name_cn: '',
      staff: '剧本',
      relation: '外传',
      images: { small: 'small.jpg' },
      rating: { score: 8.9 },
      rank: 12,
      date: '2004-04-28',
    }),
    {
      id: 13,
      name: 'CLANNAD',
      name_cn: null,
      relation: '剧本',
      type: 4,
      cover_url: 'small.jpg',
      score: 8.9,
      rank: 12,
      air_date: '2004-04-28',
    }
  )
}

{
  assert.equal(
    mapBangumiEntitySubject({
      subject: {
        id: 14,
        type: 4,
        name: 'Wrapped Game',
        name_cn: '',
        rating: { score: 7.6 },
      },
      images: { grid: 'fallback-grid.jpg' },
      relation: '出演',
    }).cover_url,
    'fallback-grid.jpg'
  )
}

{
  const subject = mapBangumiEntitySubject({
    id: 15,
    type: 4,
    name: 'Missing Cover',
    images: {},
  })
  assert.equal(subject.cover_url, '')
  assert.equal(mergeBangumiEntitySubjectCover(subject, { images: { large: 'detail-large.jpg' } }).cover_url, 'detail-large.jpg')
}

{
  const character = mapBangumiEntityCharacter({
    id: 303,
    name: '岡崎朋也',
    relation: '主角',
    images: { grid: 'tomoya.jpg' },
    subjects: [{ id: 13, name: 'CLANNAD' }],
  })

  assert.equal(character.id, 303)
  assert.equal(character.image, 'tomoya.jpg')
  assert.equal(character.subjectNames[0], 'CLANNAD')
}
