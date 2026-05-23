import assert from 'node:assert/strict'
import { getGameDetailTabs, getTabForGameAction } from './gameDetailTabs.js'

const tabs = getGameDetailTabs({
  routes: [{ id: 'r1', name: 'A线', choices: [], completed_at: null }],
  linked_resources: [
    { id: 'res1', type: 'link', url: 'https://example.com', description: '攻略' },
    { id: 'res2', type: 'screenshot', url: 'D:/shot.png', description: null },
  ],
})

assert.deepEqual(
  tabs.map(tab => tab.key),
  ['detail', 'community', 'records', 'processes'],
  '游戏详情页顶层应包含作品详情、Bangumi 社区、我的记录、进程'
)

assert.equal(tabs[0].label, '作品详情')
assert.equal(tabs[1].label, 'Bangumi 社区')
assert.equal(tabs[2].label, '我的记录')

for (const action of ['rating', 'review', 'tags', 'completed_at', 'routes'] as const) {
  assert.equal(getTabForGameAction(action), 'records', `${action} 快捷动作应打开我的记录`)
}
