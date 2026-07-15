export type CustomMovieLink = {
  name: string
  baseUrl: string
  slug: boolean
  property: 'title' | 'tmdbId' | 'imdbId'
}

const properties = ['title', 'tmdbId', 'imdbId'] as const

export const isValidCustomMovieLink = (
  value: unknown,
): value is CustomMovieLink => {
  if (!value || typeof value !== 'object') return false
  const link = value as Partial<CustomMovieLink>
  if (!link.name?.trim() || !link.baseUrl?.trim()) return false
  if (typeof link.slug !== 'boolean') return false
  if (!properties.includes(link.property as CustomMovieLink['property'])) {
    return false
  }

  try {
    const url = new URL(link.baseUrl)
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}
