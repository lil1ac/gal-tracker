import assert from 'node:assert/strict'
import { buildAppTopbarModel } from './appTopbar.js'
import type { PageHeaderState } from './PageHeaderContext.js'

const back = () => {}

{
  const header: PageHeaderState = { title: '详情页', onBack: back }
  const model = buildAppTopbarModel({
    activeView: 'browse',
    pageHeader: header,
    selectedGame: null,
    showSettings: false,
  })

  assert.equal(model.title, '详情页')
  assert.equal(model.showBack, true)
  assert.equal(model.showAddGame, false)
  assert.equal(model.onBack, back)
}

{
  const model = buildAppTopbarModel({
    activeView: 'library',
    pageHeader: null,
    selectedGame: null,
    showSettings: false,
  })

  assert.equal(model.title, '库')
  assert.equal(model.showBack, false)
  assert.equal(model.showAddGame, true)
}

{
  const model = buildAppTopbarModel({
    activeView: 'library',
    pageHeader: null,
    selectedGame: { name: 'Game A', name_cn: '游戏 A' },
    showSettings: false,
  })

  assert.equal(model.title, '游戏 A')
  assert.equal(model.showBack, true)
  assert.equal(model.showAddGame, false)
}
