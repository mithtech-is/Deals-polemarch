import type { CollectionConfig } from 'payload'
import { revalidateConsumers } from '../hooks/revalidate'
import { validateIsinField } from '../lib/verifyIsin'

export const ProsCons: CollectionConfig = {
  slug: 'pros-cons',
  labels: { singular: 'Pro/Con', plural: 'Pros & Cons' },
  admin: {
    useAsTitle: 'isin',
    defaultColumns: ['isin', 'type', 'draftStatus', 'order'],
  },
  access: { read: () => true },
  versions: { drafts: { autosave: false } },
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
      name: 'type',
      type: 'select',
      required: true,
      options: [
        { label: 'Pro', value: 'pro' },
        { label: 'Con', value: 'con' },
      ],
    },
    { name: 'text', type: 'richText' },
    { name: 'order', type: 'number', defaultValue: 0 },
    {
      name: 'draftStatus',
      type: 'select',
      required: true,
      defaultValue: 'llm_draft',
      options: [
        { label: 'LLM draft', value: 'llm_draft' },
        { label: 'In review', value: 'in_review' },
        { label: 'Published', value: 'published' },
      ],
    },
    {
      name: 'sourceNotes',
      type: 'textarea',
      admin: { description: 'Context the LLM used to draft this (for editor reference).' },
    },
  ],
}
