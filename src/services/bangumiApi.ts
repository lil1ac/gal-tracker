import { BangumiSubject } from '../types'
import {
  getSubjectMeta,
  searchBangumiSubjects,
  setBangumiAccessToken,
} from './bangumiMeta'

export function setApiKey(key: string) {
  setBangumiAccessToken(key)
}

export async function searchGames(keyword: string): Promise<BangumiSubject[]> {
  return searchBangumiSubjects({ keyword, limit: 20 })
}

export async function getGameDetails(id: number): Promise<BangumiSubject> {
  const data = await getSubjectMeta(id)
  return {
    id: data.subject_id,
    name: data.title,
    name_cn: data.title_cn,
    cover: data.cover_url,
    air_date: data.air_date,
    platform: data.platform,
    score: data.score,
    rank: data.rank,
  }
}
