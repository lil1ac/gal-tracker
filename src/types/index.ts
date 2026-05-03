export type GameStatus = 'wish' | 'playing' | 'completed' | 'paused'

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
