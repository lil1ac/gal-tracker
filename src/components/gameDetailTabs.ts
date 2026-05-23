import type { Game } from '../types'
import type { GameActionKey } from '../services/libraryStats'

export type DetailTab = 'detail' | 'community' | 'records' | 'processes'

export interface DetailTabItem {
  key: DetailTab
  label: string
}

export function getGameDetailTabs(_game: Pick<Game, 'routes' | 'linked_resources'>): DetailTabItem[] {
  return [
    { key: 'detail', label: '作品详情' },
    { key: 'community', label: 'Bangumi 社区' },
    { key: 'records', label: '我的记录' },
    { key: 'processes', label: '进程' },
  ]
}

export function getTabForGameAction(_key: GameActionKey): DetailTab {
  return 'records'
}
