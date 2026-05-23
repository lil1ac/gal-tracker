import assert from 'node:assert/strict'
import {
  bangumiCollectionTypeToGameStatus,
  buildCollectionDiffPreview,
  buildCollectionPayload,
  gameStatusToBangumiCollectionType,
  getBangumiSyncTargets,
  mergeCollectionIntoGame,
  sanitizeCollectionPayload,
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
  tags: ['Key', '泣きゲー'],
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
    tags: ['Key', '泣きゲー'],
  })
}

{
  const payload = buildCollectionPayload({
    ...baseGame,
    rating: 8.7,
    review: '   ',
    tags: [' Key ', '', 'Key', 'ADV'],
  }, true)
  assert.deepEqual(payload, {
    type: 3,
    rate: 9,
    tags: ['Key', 'ADV'],
    private: true,
  })
}

{
  assert.deepEqual(sanitizeCollectionPayload({
    type: 8,
    rate: 12,
    comment: '',
    tags: ['  ', 'ADV', 'ADV', '剧本'],
    private: false,
  }), {
    tags: ['ADV', '剧本'],
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

{
  const preview = buildCollectionDiffPreview([
    baseGame,
    { ...baseGame, id: '456', name: 'Remote Same', status: 'completed', rating: 9, tags: [] },
    { ...baseGame, id: '789', name: 'Conflict', status: 'playing', rating: 6, tags: [] },
  ], [
    { subject_id: 456, type: 2, rate: 9, comment: '', tags: [] },
    { subject_id: 789, type: 2, rate: 8, comment: '', tags: [] },
    { subject_id: 999, type: 1, rate: 0, comment: '', tags: [] },
  ])

  assert.deepEqual(preview.localOnly.map(item => item.id), ['123'])
  assert.deepEqual(preview.remoteOnly.map(item => item.subjectId), [999])
  assert.deepEqual(preview.conflicts.map(item => item.subjectId), [789])
  assert.deepEqual(preview.same.map(item => item.subjectId), [456])
}
