import type { CollectionConfig } from 'payload'

// Payload-side editor/service accounts.
// Scrapers authenticate as a service user with `enableAPIKey: true`.
export const PlatformUsers: CollectionConfig = {
  slug: 'platform-users',
  auth: {
    useAPIKey: true,
    tokenExpiration: 7 * 24 * 60 * 60, // 7 days
  },
  admin: {
    useAsTitle: 'email',
    defaultColumns: ['email', 'name', 'role'],
  },
  fields: [
    { name: 'name', type: 'text' },
    {
      name: 'role',
      type: 'select',
      defaultValue: 'editor',
      options: [
        { label: 'Admin', value: 'admin' },
        { label: 'Editor', value: 'editor' },
        { label: 'Service (scrapers)', value: 'service' },
      ],
    },
  ],
}
