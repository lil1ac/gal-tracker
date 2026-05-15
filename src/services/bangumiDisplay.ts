import type {
  BangumiCollectionStats,
  BangumiRelatedCharacter,
  BangumiRelatedPerson,
  BangumiSubjectMeta,
} from '../types'

export interface FeaturedCharacter extends BangumiRelatedCharacter {
  image: string
  actorNames: string[]
}

export function getBangumiCollectionTotal(collection: BangumiCollectionStats): number {
  return collection.wish + collection.doing + collection.collect + collection.on_hold + collection.dropped
}

export function getBangumiImage(images?: Record<string, string>): string {
  return images?.large || images?.common || images?.medium || images?.grid || images?.small || ''
}

export interface TagWithCount {
  name: string
  count: number
}

export function getTagNames(meta: BangumiSubjectMeta, limit = 16): string[] {
  return [...new Set([...meta.meta_tags, ...meta.tags.map(tag => tag.name)])]
    .filter(Boolean)
    .slice(0, limit)
}

export function getTagsWithCount(meta: BangumiSubjectMeta, limit = 18): TagWithCount[] {
  const tagCounts = meta.tags.map(tag => ({ name: tag.name, count: tag.count }))
  const metaOnly = meta.meta_tags
    .filter(name => !tagCounts.some(tc => tc.name === name))
    .map(name => ({ name, count: 0 }))
  return [...tagCounts, ...metaOnly].filter(t => t.name).slice(0, limit)
}

export function getFeaturedStaff(persons: BangumiRelatedPerson[], limit = 12): BangumiRelatedPerson[] {
  const seen = new Set<number>()
  return persons
    .filter(person => {
      if (seen.has(person.id)) return false
      seen.add(person.id)
      return person.relation || person.career.length > 0
    })
    .slice(0, limit)
}

export function getFeaturedCharacters(characters: BangumiRelatedCharacter[], limit = 12): FeaturedCharacter[] {
  return characters.slice(0, limit).map(character => ({
    ...character,
    image: getBangumiImage(character.images),
    actorNames: character.actors.map(actor => actor.name).filter(Boolean),
  }))
}
