import { sqliteAdapter } from '@payloadcms/db-sqlite'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import path from 'path'
import { buildConfig } from 'payload'
import { fileURLToPath } from 'url'

import { Articles } from './collections/Articles'
import { BlogPosts } from './collections/BlogPosts'
import { Companies } from './collections/Companies'
import { CompanyOverviews } from './collections/CompanyOverviews'
import { Media } from './collections/Media'
import { PlatformUsers } from './collections/PlatformUsers'
import { ProsCons } from './collections/ProsCons'
import { Research } from './collections/Research'
import { TimelineEntries } from './collections/TimelineEntries'
import { publicEndpoints } from './endpoints/publicEndpoints'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

const allowedOrigins = [
  process.env.CALCULA_FRONTEND_URL,
  process.env.STOREFRONT_URL,
  process.env.ASTRO_SITE_URL,
  process.env.CMS_PUBLIC_URL,
].filter(Boolean) as string[]

export default buildConfig({
  admin: {
    user: PlatformUsers.slug,
    importMap: { baseDir: path.resolve(dirname) },
  },
  collections: [
    PlatformUsers,
    Media,
    Companies,
    Articles,
    BlogPosts,
    Research,
    ProsCons,
    CompanyOverviews,
    TimelineEntries,
  ],
  endpoints: publicEndpoints,
  editor: lexicalEditor(),
  secret: process.env.PAYLOAD_SECRET || 'dev-secret-change-me',
  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },
  db: sqliteAdapter({
    client: {
      url: process.env.DATABASE_URI || 'file:./cms.db',
    },
  }),
  cors: allowedOrigins.length ? allowedOrigins : '*',
  csrf: allowedOrigins,
  serverURL: process.env.CMS_PUBLIC_URL,
})
