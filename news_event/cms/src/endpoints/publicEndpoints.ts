import type { Endpoint, PayloadRequest, Where } from 'payload'
import { toExcerpt } from '../lib/excerpt'
import { lexicalToHtml } from '../lib/lexicalToHtml'

// Collections that can be requested via the public excerpt/rendered API.
const PUBLIC_COLLECTIONS = new Set([
  'articles',
  'blog-posts',
  'research',
  'pros-cons',
  'company-overviews',
  'timeline-entries',
])

const jsonResponse = (body: unknown, init?: ResponseInit) =>
  new Response(JSON.stringify(body), {
    status: init?.status ?? 200,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'public, max-age=60, stale-while-revalidate=300',
      ...(init?.headers ?? {}),
    },
  })

const htmlResponse = (body: string, init?: ResponseInit) =>
  new Response(body, {
    status: init?.status ?? 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'public, max-age=60, stale-while-revalidate=3600',
      ...(init?.headers ?? {}),
    },
  })

const errorResponse = (status: number, message: string) =>
  jsonResponse({ error: message }, { status })

const getParam = (req: PayloadRequest, name: string): string | null => {
  const url = req.url ? new URL(req.url, 'http://local') : null
  return url?.searchParams.get(name) ?? null
}

const positiveInt = (raw: string | null, fallback: number, max: number) => {
  const n = raw ? parseInt(raw, 10) : NaN
  if (!Number.isFinite(n) || n <= 0) return fallback
  return Math.min(n, max)
}

// GET /api/public/:collection/excerpts?isin=...&tag=...&limit=...&offset=...
const excerptsEndpoint: Endpoint = {
  path: '/public/:collection/excerpts',
  method: 'get',
  handler: async (req) => {
    const collection = (req.routeParams?.collection as string) ?? ''
    if (!PUBLIC_COLLECTIONS.has(collection)) {
      return errorResponse(404, `Collection ${collection} is not public`)
    }

    const isin = getParam(req, 'isin')
    const tag = getParam(req, 'tag')
    const limit = positiveInt(getParam(req, 'limit'), 20, 100)
    const offset = positiveInt(getParam(req, 'offset'), 1, 1_000_000) // Payload uses page, not offset
    const page = offset

    const where: Where = { and: [] }
    if (isin) (where.and as Where[]).push({ isin: { equals: isin.toUpperCase() } })
    if (tag) (where.and as Where[]).push({ tag: { equals: tag } })

    const result = await req.payload.find({
      collection: collection as Parameters<typeof req.payload.find>[0]['collection'],
      where,
      limit,
      page,
      depth: 1,
      sort:
        collection === 'timeline-entries'
          ? '-occurredAt'
          : collection === 'company-overviews'
          ? '-lastReviewedAt'
          : '-publishedAt',
    })

    return jsonResponse({
      items: result.docs.map((d) => toExcerpt(collection, d as Record<string, unknown>)),
      total: result.totalDocs,
      page: result.page ?? 1,
      totalPages: result.totalPages ?? 1,
    })
  },
}

// GET /api/public/:collection/:slug/rendered
const renderedEndpoint: Endpoint = {
  path: '/public/:collection/:slug/rendered',
  method: 'get',
  handler: async (req) => {
    const collection = (req.routeParams?.collection as string) ?? ''
    const slug = (req.routeParams?.slug as string) ?? ''
    if (!PUBLIC_COLLECTIONS.has(collection)) {
      return errorResponse(404, `Collection ${collection} is not public`)
    }
    if (!slug) return errorResponse(400, 'slug is required')

    const result = await req.payload.find({
      collection: collection as Parameters<typeof req.payload.find>[0]['collection'],
      where: { slug: { equals: slug } },
      limit: 1,
      depth: 1,
    })

    const doc = result.docs[0] as Record<string, unknown> | undefined
    if (!doc) return errorResponse(404, 'Not found')

    const body = doc.body ?? doc.description ?? doc.text ?? null
    const html = lexicalToHtml(body)
    return htmlResponse(html)
  },
}

// GET /api/public/chart-overlay?isin=...&from=...&to=...
// Returns combined Articles + TimelineEntries for the given ISIN,
// shaped for ECharts markPoints on the storefront price chart.
const chartOverlayEndpoint: Endpoint = {
  path: '/public/chart-overlay',
  method: 'get',
  handler: async (req) => {
    const isin = getParam(req, 'isin')
    if (!isin) return errorResponse(400, 'isin is required')
    const from = getParam(req, 'from')
    const to = getParam(req, 'to')

    const dateRange = (field: string): Where => {
      const clauses: Where[] = []
      if (from) clauses.push({ [field]: { greater_than_equal: from } })
      if (to) clauses.push({ [field]: { less_than_equal: to } })
      return clauses.length ? { and: clauses } : {}
    }

    const [articles, timeline] = await Promise.all([
      req.payload.find({
        collection: 'articles',
        where: {
          and: [{ isin: { equals: isin.toUpperCase() } }, dateRange('publishedAt')],
        },
        limit: 500,
        depth: 0,
        sort: '-publishedAt',
      }),
      req.payload.find({
        collection: 'timeline-entries',
        where: {
          and: [
            { isin: { equals: isin.toUpperCase() } },
            { isPublished: { equals: true } },
            dateRange('occurredAt'),
          ],
        },
        limit: 500,
        depth: 0,
        sort: '-occurredAt',
      }),
    ])

    const items = [
      ...articles.docs.map((d) => {
        const doc = d as Record<string, unknown>
        return {
          source: 'article' as const,
          id: doc.id,
          occurredAt: doc.publishedAt,
          tag: doc.tag ?? 'N',
          title: doc.title,
          brief: doc.brief,
          slug: doc.slug,
          canonicalUrl: `${process.env.ASTRO_SITE_URL ?? ''}/news/${doc.slug}`,
        }
      }),
      ...timeline.docs.map((d) => {
        const doc = d as Record<string, unknown>
        return {
          source: 'timeline' as const,
          id: doc.id,
          occurredAt: doc.occurredAt,
          tag: doc.tag,
          title: doc.title,
          brief: doc.brief,
          slug: null,
          canonicalUrl: null,
        }
      }),
    ]

    return jsonResponse({ isin: isin.toUpperCase(), items })
  },
}

export const publicEndpoints: Endpoint[] = [
  excerptsEndpoint,
  renderedEndpoint,
  chartOverlayEndpoint,
]
