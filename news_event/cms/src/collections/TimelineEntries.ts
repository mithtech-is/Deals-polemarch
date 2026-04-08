import type { CollectionConfig } from 'payload'
import { revalidateConsumers } from '../hooks/revalidate'
import { validateIsinField } from '../lib/verifyIsin'

export const TimelineEntries: CollectionConfig = {
  slug: 'timeline-entries',
  labels: { singular: 'Timeline Entry', plural: 'Timeline Entries' },
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'isin', 'tag', 'occurredAt'],
  },
  // Dev-open access. Lock down before production.
  access: {
    read: () => true,
    create: () => true,
    update: () => true,
    delete: () => true,
  },
  hooks: {
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
    {
      name: 'occurredAt',
      type: 'date',
      required: true,
      index: true,
      admin: { date: { pickerAppearance: 'dayAndTime' } },
    },
    {
      name: 'tag',
      type: 'select',
      required: true,
      options: [
        { label: 'C — Corporate Event', value: 'C' },
        { label: 'N — News', value: 'N' },
        { label: 'R — Regulatory', value: 'R' },
      ],
    },
    { name: 'subCategory', type: 'text' },
    { name: 'title', type: 'text', required: true },
    { name: 'brief', type: 'textarea', maxLength: 280 },
    { name: 'description', type: 'richText' },
    { name: 'linkedArticle', type: 'relationship', relationTo: 'articles' },
    { name: 'isPublished', type: 'checkbox', defaultValue: true },
  ],
}
