import type { BangumiSnapshot } from '../types'
import type { BangumiEntityTarget } from './BangumiEntityDetailPanel'

export type BrowseRoute =
  | { kind: 'subject'; snapshot: BangumiSnapshot }
  | { kind: 'entity'; target: BangumiEntityTarget }

export function getActiveBrowseRoute(stack: BrowseRoute[]): BrowseRoute | null {
  return stack.length === 0 ? null : stack[stack.length - 1]
}

export function browseOpenSubject(stack: BrowseRoute[], snapshot: BangumiSnapshot): BrowseRoute[] {
  return [...stack, { kind: 'subject', snapshot }]
}

export function browseOpenEntity(stack: BrowseRoute[], target: BangumiEntityTarget): BrowseRoute[] {
  return [...stack, { kind: 'entity', target }]
}

export function browseBack(stack: BrowseRoute[]): BrowseRoute[] {
  return stack.slice(0, -1)
}

export function browseClose(_stack: BrowseRoute[]): BrowseRoute[] {
  return []
}
