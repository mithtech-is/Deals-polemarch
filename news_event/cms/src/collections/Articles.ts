import type { CollectionConfig } from 'payload'
import { revalidateConsumers } from '../hooks/revalidate'
import { slugify } from '../lib/slugify'

export const Articles: CollectionConfig = {
  slug: 'articles',
  labels: { singular: 'Article', plural: 'Articles' },
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'tag', 'isin', 'publishedAt', 'source'],
  },
  // Dev-open access. Lock down (scraper API key + editor roles) before production.
  access: {
    read: () => true,
    create: () => true,
    update: () => true,
    delete: () => true,
  },
  hooks: {
    beforeChange: [
      async ({ data, operation }) => {
        if (operation === 'create' && data?.title && !data.slug) {
          const datePart = data.publishedAt
            ? new Date(data.publishedAt).toISOString().slice(0, 10)
            : new Date().toISOString().slice(0, 10)
          data.slug = `${slugify(String(data.title))}-${datePart}`
        }
        return data
      },
    ],
    afterChange: [revalidateConsumers],
  },
  fields: [
    { name: 'title', type: 'text', required: true },
    { name: 'slug', type: 'text', unique: true, index: true },
    { name: 'originalUrl', type: 'text' },
    { name: 'source', type: 'text' },
    {
      name: 'publishedAt',
      type: 'date',
      required: true,
      index: true,
      admin: { date: { pickerAppearance: 'dayAndTime' } },
    },
    { name: 'isin', type: 'text', index: true },
    {
      name: 'tag',
      type: 'select',
      required: true,
      defaultValue: 'N',
      options: [
        { label: 'C — Corporate Event', value: 'C' },
        { label: 'N — News', value: 'N' },
        { label: 'R — Regulatory', value: 'R' },
      ],
    },
    { name: 'subCategory', type: 'text' },
    {
      name: 'brief',
      type: 'textarea',
      maxLength: 280,
      admin: { description: 'Short summary for chart tooltips and cards (≤280 chars).' },
    },
    {
      name: 'excerpt',
      type: 'textarea',
      maxLength: 600,
      admin: { description: 'Teaser shown on storefront/calcula cards (≤600 chars).' },
    },
    {
      name: 'body',
      type: 'richText',
      admin: { description: 'LLM-rewritten full article. Rendered on the Astro news app.' },
    },
    { name: 'originalSnippet', type: 'textarea', admin: { description: 'Raw scraper text (audit).' } },
    { name: 'rumorFlag', type: 'checkbox', defaultValue: false },
    {
      name: 'sourceHash',
      type: 'text',
      unique: true,
      index: true,
      admin: { description: 'Idempotency key (URL hash). Duplicate POSTs are rejected.' },
    },
    { name: 'heroImage', type: 'upload', relationTo: 'media' },
  ],
}
