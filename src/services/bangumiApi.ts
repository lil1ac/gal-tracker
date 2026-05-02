import { BangumiSubject } from '../types'

const BASE_URL = 'https://api.bgm.tv/v0'
const API_KEY = localStorage.getItem('bgm_api_key') || ''

export function setApiKey(key: string) {
  localStorage.setItem('bgm_api_key', key)
}

export async function searchGames(keyword: string): Promise<BangumiSubject[]> {
  const headers: HeadersInit = {}
  if (API_KEY) {
    headers['Authorization'] = `Bearer ${API_KEY}`
  }
  const response = await fetch(`${BASE_URL}/search/subjects?keyword=${encodeURIComponent(keyword)}&type=4&limit=20`, { headers })
  if (!response.ok) throw new Error('Search failed')
  const data = await response.json()
  return data.map((item: any) => ({
    id: item.id,
    name: item.name,
    name_cn: item.name_cn || null,
    cover: item.images?.large || '',
    air_date: item.date || null,
    platform: item.platforms || [],
  }))
}

export async function getGameDetails(id: number): Promise<BangumiSubject> {
  const headers: HeadersInit = {}
  if (API_KEY) {
    headers['Authorization'] = `Bearer ${API_KEY}`
  }
  const response = await fetch(`${BASE_URL}/subjects/${id}`, { headers })
  if (!response.ok) throw new Error('Failed to get details')
  const data = await response.json()
  return {
    id: data.id,
    name: data.name,
    name_cn: data.name_cn || null,
    cover: data.images?.large || '',
    air_date: data.date || null,
    platform: data.platforms || [],
  }
}