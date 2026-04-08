import type { CollectionConfig } from 'payload'

export const Media: CollectionConfig = {
  slug: 'media',
  access: { read: () => true },
  upload: {
    staticDir: 'media',
    imageSizes: [
      { name: 'thumb', width: 320, height: 240, position: 'centre' },
      { name: 'card', width: 800, height: 450, position: 'centre' },
      { name: 'hero', width: 1600, height: 900, position: 'centre' },
    ],
    mimeTypes: ['image/*'],
  },
  fields: [
    { name: 'alt', type: 'text' },
  ],
}
