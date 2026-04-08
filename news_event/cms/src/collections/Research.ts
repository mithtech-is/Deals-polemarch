import type { CollectionConfig } from 'payload'
import { revalidateConsumers } from '../hooks/revalidate'
import { slugify } from '../lib/slugify'
import { validateIsinField } from '../lib/verifyIsin'

export const Research: CollectionConfig = {
  slug: 'research',
  labels: { singular: 'Research', plural: 'Research' },
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'isin', 'publishedAt', 'author'],
  },
  access: { read: () => true },
  versions: { drafts: { autosave: true } },
  hooks: {
    beforeChange: [
      async ({ data, operation }) => {
        if (operation === 'create' && data?.title && !data.slug) {
          data.slug = slugify(String(data.title))
        }
        return data
      },
    ],
    afterChange: [revalidateConsumers],
  },
  fields: [
    {
      name: 'isin',
      type: 'text',
      required: true,
      index: true,
      validate: validateIsinField,
    },
    { name: 'title', type: 'text', required: true },
    { name: 'slug', type: 'text', unique: true, index: true },
    { name: 'author', type: 'relationship', relationTo: 'platform-users' },
    { name: 'publishedAt', type: 'date', admin: { date: { pickerAppearance: 'dayAndTime' } } },
    { name: 'heroImage', type: 'upload', relationTo: 'media' },
    { name: 'tldr', type: 'textarea', maxLength: 500 },
    { name: 'body', type: 'richText' },
    { name: 'seoTitle', type: 'text' },
    { name: 'seoDescription', type: 'textarea' },
  ],
}
