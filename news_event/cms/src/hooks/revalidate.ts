import type { CollectionAfterChangeHook } from 'payload'

// After any content doc is saved, notify consumers (storefront, calcula frontend)
// and trigger an Astro rebuild on the local news app.
// Failures are swallowed — a downstream outage must never block a save.
export const revalidateConsumers: CollectionAfterChangeHook = async ({
  doc,
  collection,
}) => {
  const tag = doc?.isin ? `isin:${doc.isin}` : `collection:${collection.slug}`

  const calls: Promise<unknown>[] = []

  if (process.env.STOREFRONT_URL && process.env.STOREFRONT_REVALIDATE_SECRET) {
    calls.push(
      fetch(`${process.env.STOREFRONT_URL}/api/revalidate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.STOREFRONT_REVALIDATE_SECRET}`,
        },
        body: JSON.stringify({ tag }),
      }).catch(() => null),
    )
  }

  if (process.env.CALCULA_FRONTEND_URL && process.env.CALCULA_REVALIDATE_SECRET) {
    calls.push(
      fetch(`${process.env.CALCULA_FRONTEND_URL}/api/revalidate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.CALCULA_REVALIDATE_SECRET}`,
        },
        body: JSON.stringify({ tag }),
      }).catch(() => null),
    )
  }

  if (process.env.ASTRO_REBUILD_WEBHOOK_URL) {
    calls.push(
      fetch(process.env.ASTRO_REBUILD_WEBHOOK_URL, { method: 'POST' }).catch(() => null),
    )
  }

  await Promise.all(calls)
  return doc
}
