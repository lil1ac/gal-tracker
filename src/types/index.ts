export type GameStatus = 'wish' | 'playing' | 'completed' | 'paused'

export interface PlaySession {
  id: string
  start_time: number
  end_time: number | null
  duration_minutes: number
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
  sessions: PlaySession[]
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