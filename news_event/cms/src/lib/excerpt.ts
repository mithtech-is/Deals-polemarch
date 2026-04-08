// Shared excerpt shape used by the public API.
// Calcula + Medusa storefront depend on this; keep it stable across collections.

export type ExcerptDTO = {
  id: string | number
  collection: string
  slug: string | null
  title: string | null
  brief: string | null
  excerpt: string | null
  tag: 'C' | 'N' | 'R' | null
  subCategory: string | null
  publishedAt: string | null
  heroImageUrl: string | null
  isin: string | null
  canonicalUrl: string | null // deep link to Astro page
  renderedHtmlUrl: string | null // CMS endpoint that returns rendered HTML
}

type AnyDoc = Record<string, unknown>

const str = (v: unknown): string | null => (typeof v === 'string' && v.length ? v : null)

// Astro slug conventions.
const astroPathFor = (collectionSlug: string, slug: string | null, isin: string | null) => {
  const base = process.env.ASTRO_SITE_URL || ''
  if (!slug && !isin) return null
  switch (collectionSlug) {
    case 'articles':
      return slug ? `${base}/news/${slug}` : null
    case 'blog-posts':
      return slug ? `${base}/blog/${slug}` : null
    case 'research':
      return slug ? `${base}/research/${slug}` : null
    case 'company-overviews':
      return isin ? `${base}/company/${isin.toLowerCase()}/overview` : null
    case 'timeline-entries':
      return isin ? `${base}/company/${isin.toLowerCase()}/timeline` : null
    case 'pros-cons':
      return isin ? `${base}/company/${isin.toLowerCase()}/pros-cons` : null
    default:
      return null
  }
}

const renderedHtmlUrlFor = (collectionSlug: string, slug: string | null) => {
  if (!slug) return null
  const base = process.env.CMS_PUBLIC_URL || ''
  return `${base}/api/public/${collectionSlug}/${slug}/rendered`
}

export const toExcerpt = (collectionSlug: string, doc: AnyDoc): ExcerptDTO => {
  const slug = str(doc.slug)
  const isin = str(doc.isin)
  const heroImage = doc.heroImage as AnyDoc | string | number | null | undefined
  let heroImageUrl: string | null = null
  if (heroImage && typeof heroImage === 'object') {
    const maybeUrl = (heroImage as AnyDoc).url
    heroImageUrl = typeof maybeUrl === 'string' ? maybeUrl : null
  }
  return {
    id: (doc.id as string | number) ?? '',
    collection: collectionSlug,
    slug,
    title: str(doc.title) ?? str(doc.oneLiner) ?? str(doc.name),
    brief: str(doc.brief) ?? str(doc.tldr) ?? str(doc.oneLiner),
    excerpt: str(doc.excerpt) ?? str(doc.tldr),
    tag: (str(doc.tag) as 'C' | 'N' | 'R' | null) ?? null,
    subCategory: str(doc.subCategory),
    publishedAt:
      str(doc.publishedAt) ?? str(doc.occurredAt) ?? str(doc.lastReviewedAt) ?? null,
    heroImageUrl,
    isin,
    canonicalUrl: astroPathFor(collectionSlug, slug, isin),
    renderedHtmlUrl: renderedHtmlUrlFor(collectionSlug, slug),
  }
}
