import { BangumiSubject } from '../types'

const BASE_URL = 'https://api.bgm.tv/v0'

let apiKey = localStorage.getItem('bgm_api_key') || ''

export function setApiKey(key: string) {
  apiKey = key
}

function getHeaders(): HeadersInit {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    'User-Agent': 'GAL-Tracker/1.0 (https://github.com/Lil1ac/gal-tracker)',
  }
  if (apiKey) {
    headers['Authorization'] = `Bearer ${apiKey}`
  }
  return headers
}

export async function searchGames(keyword: string): Promise<BangumiSubject[]> {
  const response = await fetch(`${BASE_URL}/search/subjects`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({
      keyword,
      type: 4,
      limit: 20,
    }),
  })
  if (!response.ok) throw new Error(`Search failed: ${response.status}`)
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
  const response = await fetch(`${BASE_URL}/subjects/${id}`, {
    headers: getHeaders(),
  })
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