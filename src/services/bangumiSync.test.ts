import assert from 'node:assert/strict'
import {
  bangumiCollectionTypeToGameStatus,
  buildCollectionPayload,
  gameStatusToBangumiCollectionType,
  getBangumiSyncTargets,
  mergeCollectionIntoGame,
} from './bangumiSync.js'
import type { Game } from '../types/index.js'

const baseGame: Game = {
  id: '123',
  name: 'Summer Pockets',
  name_cn: '夏日口袋',
  cover_url: '',
  air_date: null,
  platform: [],
  status: 'playing',
  rating: 8,
  review: 'local note',
  routes: [],
  tags: ['Key', '泣き'],
  linked_resources: [],
  current_running: false,
  auto_status_prompted: false,
  auto_status_update_enabled: false,
  completed_at: null,
  created_at: 1,
  updated_at: 1,
}

{
  const targets = getBangumiSyncTargets([
    baseGame,
    { ...baseGame, id: 'local_custom_id', name: 'Local Only' },
    { ...baseGame, id: '456', name: 'Numeric Subject' },
  ])

  assert.deepEqual(targets.syncable.map(item => item.subjectId), [123, 456])
  assert.deepEqual(targets.skipped.map(game => game.id), ['local_custom_id'])
}

{
  assert.equal(gameStatusToBangumiCollectionType('wish'), 1)
  assert.equal(gameStatusToBangumiCollectionType('completed'), 2)
  assert.equal(gameStatusToBangumiCollectionType('playing'), 3)
  assert.equal(gameStatusToBangumiCollectionType('paused'), 4)
  assert.equal(bangumiCollectionTypeToGameStatus(5), 'paused')
}

{
  const payload = buildCollectionPayload(baseGame, false)
  assert.deepEqual(payload, {
    type: 3,
    rate: 8,
    comment: 'local note',
    tags: ['Key', '泣き'],
    private: false,
  })
}

{
  const merged = mergeCollectionIntoGame(baseGame, {
    type: 2,
    rate: 9,
    comment: 'remote comment',
    tags: ['已同步'],
  })
  assert.equal(merged.status, 'completed')
  assert.equal(merged.rating, 9)
  assert.equal(merged.review, 'remote comment')
  assert.deepEqual(merged.tags, ['已同步'])
  assert.equal(typeof merged.updated_at, 'number')
}
