import type { ViewId } from '../types/index.js'
import { VIEW_TITLES } from '../types/index.js'
import type { PageHeaderState } from './PageHeaderContext'

type TopbarGameTitle = {
  name: string
  name_cn: string | null
}

export interface AppTopbarInput {
  activeView: ViewId
  pageHeader: PageHeaderState | null
  selectedGame: TopbarGameTitle | null
  showSettings: boolean
  onSettingsBack?: () => void
  onSelectedGameBack?: () => void
}

export interface AppTopbarModel {
  title: string
  showBack: boolean
  showAddGame: boolean
  onBack?: () => void
}

export function buildAppTopbarModel({
  activeView,
  pageHeader,
  selectedGame,
  showSettings,
  onSettingsBack,
  onSelectedGameBack,
}: AppTopbarInput): AppTopbarModel {
  if (pageHeader) {
    return {
      title: pageHeader.title,
      showBack: true,
      showAddGame: false,
      onBack: pageHeader.onBack,
    }
  }

  if (showSettings) {
    return {
      title: '设置',
      showBack: true,
      showAddGame: false,
      onBack: onSettingsBack,
    }
  }

  if (selectedGame) {
    return {
      title: selectedGame.name_cn || selectedGame.name,
      showBack: true,
      showAddGame: false,
      onBack: onSelectedGameBack,
    }
  }

  return {
    title: VIEW_TITLES[activeView],
    showBack: false,
    showAddGame: true,
  }
}
