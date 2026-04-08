import type { CollectionConfig } from 'payload'
import { revalidateConsumers } from '../hooks/revalidate'
import { validateIsinField } from '../lib/verifyIsin'

export const CompanyOverviews: CollectionConfig = {
  slug: 'company-overviews',
  labels: { singular: 'Company Overview', plural: 'Company Overviews' },
  admin: {
    useAsTitle: 'isin',
    defaultColumns: ['isin', 'oneLiner', 'lastReviewedAt'],
  },
  access: { read: () => true },
  versions: { drafts: { autosave: true } },
  hooks: {
    afterChange: [revalidateConsumers],
  },
  fields: [
    {
      name: 'isin',
      type: 'text',
      required: true,
      unique: true,
      index: true,
      validate: validateIsinField,
    },
    { name: 'heroImage', type: 'upload', relationTo: 'media' },
    { name: 'oneLiner', type: 'text', maxLength: 200 },
    {
      name: 'body',
      type: 'richText',
      admin: { description: 'What the company does, sector, outlook.' },
    },
    { name: 'lastReviewedAt', type: 'date' },
  ],
}
