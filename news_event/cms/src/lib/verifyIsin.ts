// Validates an ISIN against the local Payload `companies` collection.
// Case-insensitive: user input is uppercased before lookup, stored values are uppercase.
// Fail-open: if Payload is unavailable at validation time (rare — same process),
// we let the save through so authoring is never blocked by infra glitches.

import type { FieldValidateFn } from 'payload/shared'

export const validateIsinField: FieldValidateFn<unknown, unknown, { isin?: unknown }> = async (
  value,
  { req },
) => {
  if (typeof value !== 'string' || !value.trim()) return 'ISIN is required'
  const isin = value.trim().toUpperCase()

  try {
    const res = await req.payload.find({
      collection: 'companies',
      where: { isin: { equals: isin } },
      limit: 1,
      depth: 0,
    })
    if (res.totalDocs === 0) {
      return `ISIN ${isin} not found in Companies. Add it under the Companies collection first.`
    }
    return true
  } catch (err) {
    // Never hard-fail authoring on a lookup error — the unique constraint on the companies
    // collection still protects data integrity.
    req.payload.logger?.warn?.(`verifyIsin lookup failed: ${(err as Error).message}`)
    return true
  }
}
