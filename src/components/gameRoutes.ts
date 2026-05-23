import type { BangumiRelatedCharacter, Route } from '../types'

export type RouteTargetKind = 'custom' | 'character'

export interface NormalizedRoute extends Route {
  target_kind: RouteTargetKind
  target_name: string
}

export function normalizeRoute(route: Route): NormalizedRoute {
  const targetKind = route.target_kind || 'custom'
  const targetName = route.target_name || route.name
  return {
    ...route,
    target_kind: targetKind,
    target_name: targetName,
  }
}

export function createCharacterRoute(character: Pick<BangumiRelatedCharacter, 'id' | 'name'>, now = Date.now()): Route {
  return {
    id: `route_${now}_${character.id}`,
    name: character.name,
    choices: [],
    completed_at: null,
    target_kind: 'character',
    target_id: character.id,
    target_name: character.name,
  }
}

export function createCustomRoute(name: string, now = Date.now()): Route {
  const routeName = name.trim()
  return {
    id: `route_${now}_custom`,
    name: routeName,
    choices: [],
    completed_at: null,
    target_kind: 'custom',
    target_name: routeName,
  }
}

export function toggleRouteCompletion(route: Route, now = Date.now()): Route {
  return {
    ...route,
    completed_at: route.completed_at ? null : now,
  }
}

export function normalizeTagInput(value: string): string[] {
  const seen = new Set<string>()
  return value
    .split(',')
    .map(tag => tag.trim())
    .filter(tag => {
      if (!tag) return false
      const key = tag.toLocaleLowerCase()
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
}
