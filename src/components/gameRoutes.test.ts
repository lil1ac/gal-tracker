import assert from 'node:assert/strict'
import {
  createCharacterRoute,
  createCustomRoute,
  normalizeTagInput,
  normalizeRoute,
  toggleRouteCompletion,
} from './gameRoutes.js'
import type { BangumiRelatedCharacter, Route } from '../types/index.js'

const legacyRoute: Route = { id: 'old', name: '真结局', choices: [], completed_at: null }
assert.deepEqual(normalizeRoute(legacyRoute), {
  id: 'old',
  name: '真结局',
  choices: [],
  completed_at: null,
  target_kind: 'custom',
  target_name: '真结局',
})

const character: BangumiRelatedCharacter = {
  id: 42,
  name: '古河渚',
  relation: '主角',
  actors: [],
  images: { grid: 'nagisa.jpg' },
}
const characterRoute = createCharacterRoute(character, 1000)
assert.equal(characterRoute.id, 'route_1000_42')
assert.equal(characterRoute.name, '古河渚')
assert.equal(characterRoute.target_kind, 'character')
assert.equal(characterRoute.target_id, 42)
assert.equal(characterRoute.target_name, '古河渚')
assert.equal(characterRoute.completed_at, null)

const customRoute = createCustomRoute('TE', 2000)
assert.equal(customRoute.id, 'route_2000_custom')
assert.equal(customRoute.name, 'TE')
assert.equal(customRoute.target_kind, 'custom')
assert.equal(customRoute.target_name, 'TE')

const completed = toggleRouteCompletion(characterRoute, 3000)
assert.equal(completed.completed_at, 3000)
assert.equal(completed.target_kind, 'character')
assert.equal(completed.target_id, 42)

const reopened = toggleRouteCompletion(completed, 4000)
assert.equal(reopened.completed_at, null)
assert.equal(reopened.target_kind, 'character')

assert.deepEqual(
  normalizeTagInput(' Galgame, galgame, GALGAME, 泣きゲー, , 剧情 '),
  ['Galgame', '泣きゲー', '剧情']
)
