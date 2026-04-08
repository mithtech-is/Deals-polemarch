import type { CollectionConfig } from 'payload'
import { slugify } from '../lib/slugify'

// Local registry of companies the news pipeline tracks.
// Source of truth for ISIN → name + aliases. Scrapers read this via the Payload REST API.
// Alias matching is case-insensitive — all aliases are normalized to lowercase before save.
export const Companies: CollectionConfig = {
  slug: 'companies',
  labels: { singular: 'Company', plural: 'Companies' },
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['isin', 'name', 'slug', 'aliases'],
    description:
      'ISIN → company mapping used by the scrapers. Add aliases (any casing) — matching is case-insensitive.',
  },
  // Dev-open access. Lock down before any non-local deployment.
  access: {
    read: () => true,
    create: () => true,
    update: () => true,
    delete: () => true,
  },
  hooks: {
    beforeChange: [
      async ({ data, operation }) => {
        // Uppercase the ISIN so "ine0dj201029" and "INE0DJ201029" are the same record.
        if (data?.isin) data.isin = String(data.isin).trim().toUpperCase()

        // Auto-generate slug if missing.
        if (operation === 'create' && data?.name && !data.slug) {
          data.slug = slugify(String(data.name))
        }

        // Normalize aliases: dedupe case-insensitively, trim, drop empties.
        // Storage is lowercase to make Python-side matching trivial (both sides lowercase).
        if (Array.isArray(data?.aliases)) {
          const seen = new Set<string>()
          data.aliases = data.aliases
            .map((row: { alias?: string }) => (row?.alias ?? '').trim().toLowerCase())
            .filter((a: string) => {
              if (!a || seen.has(a)) return false
              seen.add(a)
              return true
            })
            .map((alias: string) => ({ alias }))
        }

        return data
      },
    ],
  },
  fields: [
    {
      name: 'isin',
      type: 'text',
      required: true,
      unique: true,
      index: true,
      admin: { description: 'ISIN — stored uppercase.' },
    },
    { name: 'name', type: 'text', required: true, admin: { description: 'Canonical display name.' } },
    {
      name: 'slug',
      type: 'text',
      unique: true,
      index: true,
      admin: { description: 'URL slug. Auto-generated from name on create if left blank.' },
    },
    {
      name: 'aliases',
      type: 'array',
      admin: {
        description:
          'Alternative names / brands the scraper should match (e.g. Pharmeasy, Thyrocare). Case is ignored.',
      },
      fields: [{ name: 'alias', type: 'text', required: true }],
    },
    {
      name: 'keywords',
      type: 'text',
      admin: {
        description:
          'Google News search query, e.g. \'"Pharmeasy IPO" OR "API Holdings"\'. Used by the news scraper.',
      },
    },
    {
      name: 'sector',
      type: 'text',
      admin: { description: 'Optional — e.g. Pharma, Fintech.' },
    },
    { name: 'isActive', type: 'checkbox', defaultValue: true },
  ],
}
