export type GameStatus = 'wish' | 'playing' | 'completed' | 'paused'

export type ViewId = 'dashboard' | 'library' | 'browse' | 'memory'

export const VIEW_TITLES: Record<ViewId, string> = {
  dashboard: '总览',
  library: '库',
  browse: '浏览',
  memory: '回忆',
}

export type EndReason = 'process_exit' | 'user_stop' | 'app_close' | 'too_short' | 'error' | 'app_crash'

export type MatchType = 'process_name' | 'exe_path' | 'name_and_path'

export interface PlaySession {
  id: string
  game_id: string
  process_name: string
  exe_path: string | null
  started_at: number        // timestamp ms
  ended_at: number | null   // timestamp ms, null = 进行中
  duration_seconds: number | null
  end_reason: EndReason | null
}

export interface GameProcess {
  id: string
  game_id: string
  process_name: string      // 如 "CLANNAD.exe"
  exe_path: string | null
  match_type: MatchType
  enabled: boolean
  created_at: number
  updated_at: number
}

export interface Route {
  id: string
  name: string
  choices: string[]
  completed_at: number | null
  target_kind?: 'custom' | 'character'
  target_id?: number
  target_name?: string
}

export interface Resource {
  id: string
  type: 'link' | 'screenshot'
  url: string
  description: string | null
}

export interface Game {
  id: string
  name: string
  name_cn: string | null
  cover_url: string
  air_date: string | null
  platform: string[]
  status: GameStatus
  rating: number | null
  review: string | null
  routes: Route[]
  tags: string[]
  linked_resources: Resource[]
  current_running: boolean
  auto_status_prompted: boolean
  auto_status_update_enabled: boolean
  completed_at: number | null
  created_at: number
  updated_at: number
}

export interface BangumiSubject {
  id: number
  name: string
  name_cn: string | null
  cover: string
  air_date: string | null
  platform: string[]
  score: number | null
  rank: number | null
}

export interface BangumiRating {
  score: number | null
  total: number
  count: Record<string, number>
}

export interface BangumiCollectionStats {
  wish: number
  doing: number
  collect: number
  on_hold: number
  dropped: number
}

export interface BangumiTag {
  name: string
  count: number
}

export interface BangumiSubjectMeta {
  subject_id: number
  title: string
  title_cn: string | null
  summary: string
  cover_url: string
  air_date: string | null
  platform: string[]
  score: number | null
  rank: number | null
  rating: BangumiRating
  collection: BangumiCollectionStats
  tags: BangumiTag[]
  meta_tags: string[]
  url: string
  synced_at: number
}

export interface BangumiRelatedSubject {
  id: number
  name: string
  name_cn: string | null
  relation: string
  type: number
  cover_url: string
}

export interface BangumiRelatedPerson {
  id: number
  name: string
  relation: string
  career: string[]
  images?: Record<string, string>
}

export interface BangumiRelatedCharacter {
  id: number
  name: string
  relation: string
  actors: BangumiRelatedPerson[]
  images?: Record<string, string>
}

export type BangumiEntityKind = 'character' | 'person' | 'subject'

export interface BangumiInfoItem {
  key: string
  value: string
}

export interface BangumiCharacterDetail {
  id: number
  name: string
  summary: string
  image: string
  collects: number
  comments: number
  info: BangumiInfoItem[]
  url: string
}

export interface BangumiPersonDetail {
  id: number
  name: string
  summary: string
  image: string
  career: string[]
  collects: number
  comments: number
  info: BangumiInfoItem[]
  url: string
}

export interface BangumiEntitySubject extends BangumiRelatedSubject {
  score: number | null
  rank: number | null
  air_date: string | null
}

export interface BangumiEntityCharacter {
  id: number
  name: string
  relation: string
  image: string
  subjectNames: string[]
  url: string
}

export interface BangumiCharacterPageData {
  kind: 'character'
  detail: BangumiCharacterDetail
  subjects: BangumiEntitySubject[]
  persons: BangumiRelatedPerson[]
}

export interface BangumiPersonPageData {
  kind: 'person'
  detail: BangumiPersonDetail
  subjects: BangumiEntitySubject[]
  characters: BangumiEntityCharacter[]
}

export type BangumiEntityPageData = BangumiCharacterPageData | BangumiPersonPageData

export interface BangumiEpisode {
  id: number
  name: string
  name_cn: string | null
  type: number
  sort: number
}

export interface BangumiCollectionItem {
  subject_id?: number
  subject?: Record<string, unknown>
  type: number
  rate: number
  comment: string
  tags: string[]
  private?: boolean
  updated_at?: string
}

export interface BangumiSnapshot {
  game_id: string
  meta: BangumiSubjectMeta | null
  persons: BangumiRelatedPerson[]
  characters: BangumiRelatedCharacter[]
  relations: BangumiRelatedSubject[]
  episodes: BangumiEpisode[]
  collection: BangumiCollectionItem | null
  synced_at: number
}

export type BrowseCategory = 'top_ranked' | 'popular' | 'latest'

export type BrowseSearchKind = 'subject' | 'character' | 'person'

export interface BrowseFilterState {
  category: BrowseCategory
  searchKind: BrowseSearchKind
  keyword: string
  sort: 'match' | 'heat' | 'rank' | 'score'
  year: string
  minScore: string
  minRank: string
  maxRank: string
  tags: string[]
  nsfw: boolean
}

// 运行中的进程信息
export interface RunningProcess {
  pid: number
  name: string           // "CLANNAD.exe"
  exe_path: string | null
}

export interface BackupData {
  version: number
  exported_at: number
  games: Game[]
  play_sessions: PlaySession[]
  game_processes: GameProcess[]
  settings: Record<string, string>
}

export interface ImportResult {
  games: Game[]
  play_sessions: PlaySession[]
  game_processes: GameProcess[]
}
