// One-shot importer: reads news_event/config/companies.yml and upserts into Payload.
// Run with:
//   cd news_event/cms && pnpm payload run src/seed/importCompanies.ts
//
// Safe to re-run — upserts by ISIN. Existing aliases are merged case-insensitively.

import { getPayload } from 'payload'
import fs from 'fs'
import path from 'path'
import yaml from 'js-yaml'
import { fileURLToPath } from 'url'
import config from '../payload.config'

type YmlCompany = {
  isin: string
  name: string
  slug?: string
  aliases?: string[]
  keywords?: string
  sector?: string
}

type YmlFile = { companies: YmlCompany[] }

const run = async () => {
  const filename = fileURLToPath(import.meta.url)
  const dirname = path.dirname(filename)
  const ymlPath = path.resolve(dirname, '../../../config/companies.yml')

  if (!fs.existsSync(ymlPath)) {
    console.error(`companies.yml not found at ${ymlPath}`)
    process.exit(1)
  }

  const raw = fs.readFileSync(ymlPath, 'utf8')
  const parsed = yaml.load(raw) as YmlFile
  if (!parsed?.companies?.length) {
    console.error('No companies found in YAML')
    process.exit(1)
  }

  const payload = await getPayload({ config })
  let created = 0
  let updated = 0

  for (const c of parsed.companies) {
    const isin = c.isin?.trim().toUpperCase()
    if (!isin || !c.name) {
      console.warn(`Skipping row without isin/name: ${JSON.stringify(c)}`)
      continue
    }

    const aliases = (c.aliases ?? []).map((a) => ({ alias: a }))

    const existing = await payload.find({
      collection: 'companies',
      where: { isin: { equals: isin } },
      limit: 1,
      depth: 0,
    })

    const data = {
      isin,
      name: c.name,
      slug: c.slug,
      aliases,
      keywords: c.keywords,
      sector: c.sector,
      isActive: true,
    }

    if (existing.totalDocs === 0) {
      await payload.create({ collection: 'companies', data })
      created++
      console.log(`✓ Created ${isin} — ${c.name}`)
    } else {
      const doc = existing.docs[0]
      // Merge aliases case-insensitively with what's already in Payload.
      const existingAliases = ((doc as { aliases?: { alias: string }[] }).aliases ?? []).map(
        (a) => a.alias.toLowerCase(),
      )
      const incoming = (c.aliases ?? []).map((a) => a.toLowerCase())
      const merged = Array.from(new Set([...existingAliases, ...incoming])).map((alias) => ({
        alias,
      }))

      await payload.update({
        collection: 'companies',
        id: (doc as { id: string }).id,
        data: { ...data, aliases: merged },
      })
      updated++
      console.log(`↻ Updated ${isin} — ${c.name}`)
    }
  }

  console.log(`\nDone. Created: ${created}, Updated: ${updated}`)
  process.exit(0)
}

run().catch((err) => {
  console.error(err)
  process.exit(1)
})
