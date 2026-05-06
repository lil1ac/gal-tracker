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

export function getTagNames(meta: BangumiSubjectMeta, limit = 16): string[] {
  return [...new Set([...meta.meta_tags, ...meta.tags.map(tag => tag.name)])]
    .filter(Boolean)
    .slice(0, limit)
}

export function getFeaturedStaff(persons: BangumiRelatedPerson[], limit = 12): BangumiRelatedPerson[] {
  return persons
    .filter(person => person.relation || person.career.length > 0)
    .slice(0, limit)
}

export function getFeaturedCharacters(characters: BangumiRelatedCharacter[], limit = 12): FeaturedCharacter[] {
  return characters.slice(0, limit).map(character => ({
    ...character,
    image: getBangumiImage(character.images),
    actorNames: character.actors.map(actor => actor.name).filter(Boolean),
  }))
}
