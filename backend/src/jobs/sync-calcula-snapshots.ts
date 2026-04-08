import { MedusaContainer } from "@medusajs/framework/types"
import { syncLatestPriceToMedusaVariant } from "../modules/calcula/variant-price-sync"

/**
 * Reconciliation job: every 60s, asks Calcula which companies have drifted
 * since our last sync cursor and pulls the stale snapshots. This catches
 * anything the real-time webhook missed (delivery failures, bulk imports,
 * Medusa downtime, etc.).
 *
 * Jobs receive the full MedusaContainer, so we can run the route-scope
 * variant sync directly from here — no need to go through a route.
 */
export default async function syncCalculaSnapshots(container: MedusaContainer) {
  try {
    const calculaModule = container.resolve("calcula") as any
    // Drive the drift one ISIN at a time from the route-scope container so
    // each new price propagates to the Medusa variant. syncDrift() already
    // does bounded concurrency on the snapshot pulls via handleVersionEnvelope;
    // here we want to capture the returned latestPrice for each so we can
    // propagate it. Reuse the module's list of drifted envelopes instead of
    // calling syncDrift directly.
    const result = await calculaModule.syncDrift()

    if (result.updated > 0) {
      console.log(
        `[sync-calcula-snapshots] reconciled ${result.updated}/${result.checked} ISIN(s)`
      )
      // Propagate the latest cached price into the Medusa product variant
      // for each ISIN whose price snapshot was refreshed. Runs at the job
      // container scope (which IS the full Medusa container) so the
      // updateProductVariantsWorkflow inside syncLatestPriceToMedusaVariant
      // can resolve its dependencies.
      const priceIsins: string[] = Array.isArray(result.priceUpdatedIsins)
        ? result.priceUpdatedIsins
        : []
      for (const isin of priceIsins) {
        try {
          const row = await calculaModule.getRawRow(isin, "prices")
          if (!row?.price_snapshot) continue
          const snap = JSON.parse(row.price_snapshot)
          const arr = snap?.prices
          if (!Array.isArray(arr) || arr.length === 0) continue
          const last = arr[arr.length - 1]
          if (!Array.isArray(last) || last.length < 2) continue
          const latest = Number(last[1])
          if (!Number.isFinite(latest)) continue
          await syncLatestPriceToMedusaVariant(container as any, isin, latest)
        } catch (err) {
          console.error(`[sync-calcula-snapshots] variant sync ${isin} failed:`, err)
        }
      }
    } else if (result.checked > 0) {
      console.log(
        `[sync-calcula-snapshots] ${result.checked} drifted ISIN(s) already up to date`
      )
    }
  } catch (err: any) {
    console.error("[sync-calcula-snapshots] failed:", err?.message || err)
  }
}

export const config = {
  name: "sync-calcula-snapshots",
  // Run once per minute. Calcula's in-memory snapshot cache absorbs the churn.
  schedule: "* * * * *",
}
