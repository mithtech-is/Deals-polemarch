import React, { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { defineRouteConfig } from "@medusajs/admin-sdk"
import {
  Button,
  Checkbox,
  Container,
  DropdownMenu,
  Heading,
  Input,
  Text,
  toast,
} from "@medusajs/ui"

type CalculaRow = Record<string, any>

type Row = {
  id: string
  title: string
  handle: string
  status: string
  thumbnail: string
  isin: string
  /** First INR variant price as a display string ("" if no variant/price). */
  variantPrice: string
  /** Stable id of the variant whose price we edit. */
  variantId: string | null
  /** Original raw amount in paisa (so we know whether the user actually edited it). */
  variantPriceAmount: number | null
  calcula: Record<string, string>
}

const CALCULA_FIELDS: Array<{ key: string; label: string }> = [
  { key: "sector", label: "Sector" },
  { key: "market_cap", label: "Market Cap" },
  { key: "industry", label: "Industry" },
  { key: "pe_ratio", label: "P/E Ratio" },
  { key: "share_type", label: "Share Type" },
  { key: "pb_ratio", label: "P/B Ratio" },
  { key: "lot_size", label: "Lot Size" },
  { key: "debt_to_equity", label: "Debt to Equity" },
  { key: "fifty_two_week_high", label: "52W High" },
  { key: "roe_value", label: "ROE (%)" },
  { key: "fifty_two_week_low", label: "52W Low" },
  { key: "book_value", label: "Book Value" },
  { key: "depository", label: "Depository" },
  { key: "face_value", label: "Face Value" },
  { key: "pan_number", label: "PAN" },
  { key: "total_shares", label: "Total Shares" },
  { key: "founded", label: "Founded" },
  { key: "cin", label: "CIN" },
  { key: "headquarters", label: "HQ" },
  { key: "rta", label: "RTA" },
  { key: "valuation", label: "Valuation" },
]

const CORE_COLS: Array<{ key: keyof Row; label: string; width: number }> = [
  { key: "title", label: "Title", width: 220 },
  { key: "handle", label: "Handle", width: 160 },
  { key: "status", label: "Status", width: 110 },
  { key: "isin", label: "ISIN", width: 140 },
  { key: "variantPrice", label: "Price (INR)", width: 130 },
]

type DirtyEntry = {
  core: Record<string, any>
  calcula: Record<string, any>
  /** Set when variantPrice changed. We track it separately so save knows which
   * variant id to PATCH and how to also push the new price to Calcula. */
  priceUpdate?: { variantId: string; newAmount: number }
}

const COLUMN_PREF_KEY = "bulk-editor:visible-columns"
const ALL_CALCULA_KEYS = CALCULA_FIELDS.map((f) => f.key)

const loadColumnPrefs = (): { core: Record<string, boolean>; calcula: Record<string, boolean> } => {
  if (typeof window === "undefined") {
    return {
      core: Object.fromEntries(CORE_COLS.map((c) => [c.key as string, true])),
      calcula: Object.fromEntries(ALL_CALCULA_KEYS.map((k) => [k, true])),
    }
  }
  try {
    const raw = localStorage.getItem(COLUMN_PREF_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      // Ensure every known column has a boolean (so newly added columns default to visible)
      const core: Record<string, boolean> = {}
      for (const c of CORE_COLS) core[c.key as string] = parsed?.core?.[c.key as string] ?? true
      const calcula: Record<string, boolean> = {}
      for (const k of ALL_CALCULA_KEYS) calcula[k] = parsed?.calcula?.[k] ?? true
      return { core, calcula }
    }
  } catch {}
  return {
    core: Object.fromEntries(CORE_COLS.map((c) => [c.key as string, true])),
    calcula: Object.fromEntries(ALL_CALCULA_KEYS.map((k) => [k, true])),
  }
}

const BulkEditorPage = () => {
  const [rows, setRows] = useState<Row[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState("")
  const [visibleCols, setVisibleCols] = useState(loadColumnPrefs)
  const dirty = useRef<Map<string, DirtyEntry>>(new Map())

  // Persist column visibility on change
  useEffect(() => {
    if (typeof window === "undefined") return
    try {
      localStorage.setItem(COLUMN_PREF_KEY, JSON.stringify(visibleCols))
    } catch {}
  }, [visibleCols])

  const visibleCoreCols = useMemo(
    () => CORE_COLS.filter((c) => visibleCols.core[c.key as string] !== false),
    [visibleCols.core]
  )
  const visibleCalculaFields = useMemo(
    () => CALCULA_FIELDS.filter((f) => visibleCols.calcula[f.key] !== false),
    [visibleCols.calcula]
  )
  const totalVisibleCount = visibleCoreCols.length + visibleCalculaFields.length

  const toggleCoreCol = (key: string) => {
    // Title is always required as the row identifier
    if (key === "title") return
    setVisibleCols((prev) => ({
      ...prev,
      core: { ...prev.core, [key]: !prev.core[key] },
    }))
  }
  const toggleCalculaCol = (key: string) => {
    setVisibleCols((prev) => ({
      ...prev,
      calcula: { ...prev.calcula, [key]: !prev.calcula[key] },
    }))
  }
  const showAllCols = () => {
    setVisibleCols({
      core: Object.fromEntries(CORE_COLS.map((c) => [c.key as string, true])),
      calcula: Object.fromEntries(ALL_CALCULA_KEYS.map((k) => [k, true])),
    })
  }
  const hideAllOptionalCols = () => {
    setVisibleCols({
      core: { title: true, handle: false, status: false, isin: false, variantPrice: true },
      calcula: Object.fromEntries(ALL_CALCULA_KEYS.map((k) => [k, false])),
    })
  }

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(
        `/admin/products?limit=100&fields=id,title,handle,status,thumbnail,metadata,*variants,*variants.prices`,
        { credentials: "include" }
      )
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      const products: any[] = data.products || []

      // Fetch calcula for each product with an ISIN (parallel)
      const calculaByIsin = new Map<string, CalculaRow>()
      await Promise.all(
        products
          .map((p) => (p.metadata?.isin || "").trim())
          .filter(Boolean)
          .map(async (isin) => {
            try {
              const r = await fetch(`/admin/calcula/${encodeURIComponent(isin)}`, {
                credentials: "include",
              })
              if (r.ok) calculaByIsin.set(isin, await r.json())
            } catch {}
          })
      )

      const mapped: Row[] = products.map((p) => {
        const isin = (p.metadata?.isin || "").trim()
        const c = (isin && calculaByIsin.get(isin)) || {}
        const calcula: Record<string, string> = {}
        for (const f of CALCULA_FIELDS) calcula[f.key] = c[f.key] ?? ""

        // Pick the first variant + its INR price.
        // Medusa v2 stores prices in MAJOR units (₹7.45 is stored as 7.45).
        const firstVariant = p.variants?.[0]
        const inrPrice = firstVariant?.prices?.find(
          (pr: any) => pr.currency_code?.toLowerCase() === "inr"
        )
        const amount = typeof inrPrice?.amount === "number" ? inrPrice.amount : null
        const display = amount !== null ? Number(amount).toFixed(2) : ""

        return {
          id: p.id,
          title: p.title || "",
          handle: p.handle || "",
          status: p.status || "",
          thumbnail: p.thumbnail || "",
          isin,
          variantPrice: display,
          variantId: firstVariant?.id ?? null,
          variantPriceAmount: amount,
          calcula,
        }
      })
      setRows(mapped)
      dirty.current.clear()
    } catch (err: any) {
      toast.error("Error", { description: err?.message || "Failed to load products" })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return rows
    return rows.filter(
      (r) =>
        r.title.toLowerCase().includes(q) ||
        r.handle.toLowerCase().includes(q) ||
        r.isin.toLowerCase().includes(q)
    )
  }, [rows, search])

  const markDirty = (id: string, section: "core" | "calcula", key: string, value: any) => {
    const cur = dirty.current.get(id) || { core: {}, calcula: {} }
    cur[section][key] = value
    dirty.current.set(id, cur)
  }

  const editCore = (id: string, key: keyof Row, value: any) => {
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, [key]: value } : r)))
    if (key === "variantPrice") {
      // Special-case: stash the parsed amount + variantId so save() knows to
      // PATCH the variant + push to Calcula. Don't put variantPrice into
      // dirty.core because there's no top-level product field for it.
      const row = rows.find((r) => r.id === id)
      if (!row || !row.variantId) {
        toast.error("Cannot edit price", {
          description: "This product has no variant to attach a price to.",
        })
        return
      }
      const parsed = parseFloat(value)
      if (!Number.isFinite(parsed) || parsed < 0) return
      const cur = dirty.current.get(id) || { core: {}, calcula: {} }
      // Medusa v2 expects the price in major units — store as-is.
      cur.priceUpdate = {
        variantId: row.variantId,
        newAmount: parsed,
      }
      dirty.current.set(id, cur)
      return
    }
    markDirty(id, "core", key as string, value)
  }

  const editCalcula = (id: string, key: string, value: string) => {
    setRows((rs) =>
      rs.map((r) => (r.id === id ? { ...r, calcula: { ...r.calcula, [key]: value } } : r))
    )
    markDirty(id, "calcula", key, value)
  }

  const save = async () => {
    if (dirty.current.size === 0) {
      toast.info("Nothing to save")
      return
    }
    setSaving(true)
    try {
      const bulkCalcula: Array<Record<string, any>> = []
      const productPatches: Array<Promise<Response>> = []
      const pricePushes: Array<Promise<Response>> = []

      for (const [id, diff] of dirty.current.entries()) {
        const row = rows.find((r) => r.id === id)
        if (!row) continue

        // ── Core product PATCH (title/handle/status/isin) ──────────
        const coreKeys = Object.keys(diff.core)
        if (coreKeys.length > 0) {
          const body: any = {}
          for (const k of coreKeys) {
            if (k === "isin") {
              body.metadata = { ...((row as any).metadataRaw || {}), isin: diff.core.isin }
            } else {
              body[k] = diff.core[k]
            }
          }
          productPatches.push(
            fetch(`/admin/products/${id}`, {
              method: "POST",
              credentials: "include",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(body),
            })
          )
        }

        // ── Variant price PATCH ────────────────────────────────────
        if (diff.priceUpdate) {
          const { variantId, newAmount } = diff.priceUpdate
          // Use the standard product update with variants[].prices
          productPatches.push(
            fetch(`/admin/products/${id}`, {
              method: "POST",
              credentials: "include",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                variants: [
                  {
                    id: variantId,
                    prices: [{ currency_code: "inr", amount: newAmount }],
                  },
                ],
              }),
            })
          )

          // Mirror to Calcula immediately. The product.updated subscriber will
          // also fire on the PATCH above, so this is technically redundant —
          // but doing it inline gives the user a deterministic toast and
          // avoids waiting for the event loop.
          if (row.isin) {
            pricePushes.push(
              fetch(
                `/admin/calcula/by-isin/${encodeURIComponent(row.isin)}/price`,
                {
                  method: "POST",
                  credentials: "include",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ price: newAmount }),
                }
              )
            )
          }
        }

        // ── Calcula static-fields bulk row ─────────────────────────
        const calculaKeys = Object.keys(diff.calcula)
        if (calculaKeys.length > 0 && row.isin) {
          const payload: Record<string, any> = { isin: row.isin }
          for (const k of calculaKeys) payload[k] = diff.calcula[k]
          bulkCalcula.push(payload)
        }
      }

      const productResults = await Promise.all(productPatches)
      const productFailed = productResults.filter((r) => !r.ok).length

      const priceResults = await Promise.all(pricePushes)
      const priceFailed = priceResults.filter((r) => !r.ok).length

      let calculaOk = 0
      if (bulkCalcula.length > 0) {
        const r = await fetch(`/admin/calcula/bulk`, {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ rows: bulkCalcula }),
        })
        if (r.ok) {
          const j = await r.json()
          calculaOk = j.ok || 0
        }
      }

      if (productFailed > 0 || priceFailed > 0) {
        toast.error("Partial save", {
          description: `${productFailed} product update(s), ${priceFailed} price push(es) failed`,
        })
      } else {
        toast.success("Saved", {
          description: `${productResults.length} product update(s), ${priceResults.length} price push(es), ${calculaOk} calcula row(s).`,
        })
      }
      dirty.current.clear()
      await load()
    } catch (err: any) {
      toast.error("Error", { description: err?.message || "Save failed" })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Container className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <Heading level="h1">Bulk Editor</Heading>
          <Text size="small" className="text-ui-fg-subtle">
            Bulk-edit existing products. Price edits propagate to Calcula automatically.
          </Text>
        </div>
        <div className="flex items-center gap-x-2">
          <Input
            placeholder="Search title / handle / ISIN"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: 260 }}
          />
          <DropdownMenu>
            <DropdownMenu.Trigger asChild>
              <Button variant="secondary">Columns ({totalVisibleCount})</Button>
            </DropdownMenu.Trigger>
            <DropdownMenu.Content
              className="max-h-[480px] overflow-y-auto"
              align="end"
              sideOffset={6}
            >
              <DropdownMenu.Label>Core</DropdownMenu.Label>
              {CORE_COLS.map((c) => {
                const checked = visibleCols.core[c.key as string] !== false
                const isLocked = c.key === "title"
                return (
                  <DropdownMenu.Item
                    key={c.key as string}
                    onSelect={(e) => {
                      e.preventDefault()
                      if (!isLocked) toggleCoreCol(c.key as string)
                    }}
                    className="flex items-center gap-x-2"
                  >
                    <Checkbox checked={checked} disabled={isLocked} />
                    <span>
                      {c.label}
                      {isLocked && (
                        <span className="ml-1 text-ui-fg-subtle text-xs">(required)</span>
                      )}
                    </span>
                  </DropdownMenu.Item>
                )
              })}
              <DropdownMenu.Separator />
              <DropdownMenu.Label>Calcula fields</DropdownMenu.Label>
              {CALCULA_FIELDS.map((f) => {
                const checked = visibleCols.calcula[f.key] !== false
                return (
                  <DropdownMenu.Item
                    key={f.key}
                    onSelect={(e) => {
                      e.preventDefault()
                      toggleCalculaCol(f.key)
                    }}
                    className="flex items-center gap-x-2"
                  >
                    <Checkbox checked={checked} />
                    <span>{f.label}</span>
                  </DropdownMenu.Item>
                )
              })}
              <DropdownMenu.Separator />
              <DropdownMenu.Item
                onSelect={(e) => {
                  e.preventDefault()
                  showAllCols()
                }}
              >
                Show all
              </DropdownMenu.Item>
              <DropdownMenu.Item
                onSelect={(e) => {
                  e.preventDefault()
                  hideAllOptionalCols()
                }}
              >
                Show only Title + Price
              </DropdownMenu.Item>
            </DropdownMenu.Content>
          </DropdownMenu>
          <Button onClick={save} disabled={saving || loading}>
            {saving ? "Saving…" : "Save"}
          </Button>
        </div>
      </div>

      <div
        className="border border-ui-border-base rounded-lg"
        style={{
          overflowX: "auto",
          maxHeight: "calc(100vh - 220px)",
          overflowY: "auto",
        }}
      >
        <table
          style={{
            borderCollapse: "separate",
            borderSpacing: 0,
            fontSize: 13,
            width: "max-content",
          }}
        >
          <thead>
            <tr>
              {visibleCoreCols.map((c) => (
                <th
                  key={c.key as string}
                  className="bg-ui-bg-subtle text-ui-fg-base border-b border-ui-border-base"
                  style={thStyle(c.width)}
                >
                  {c.label}
                </th>
              ))}
              {visibleCalculaFields.map((f) => (
                <th
                  key={f.key}
                  className="bg-ui-bg-subtle text-ui-fg-base border-b border-ui-border-base"
                  style={thStyle(130)}
                >
                  {f.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={totalVisibleCount} style={{ padding: 16 }}>
                  Loading…
                </td>
              </tr>
            )}
            {!loading &&
              filtered.map((row) => (
                <tr key={row.id}>
                  {visibleCoreCols.map((c) => {
                    if (c.key === "status") {
                      return (
                        <td
                          key={c.key as string}
                          className="border-b border-ui-border-base"
                          style={tdStyle(c.width)}
                        >
                          <select
                            value={row.status}
                            onChange={(e) => editCore(row.id, "status", e.target.value)}
                            style={selectStyle}
                          >
                            <option value="draft">draft</option>
                            <option value="proposed">proposed</option>
                            <option value="published">published</option>
                            <option value="rejected">rejected</option>
                          </select>
                        </td>
                      )
                    }
                    if (c.key === "variantPrice") {
                      return (
                        <td
                          key={c.key as string}
                          className="border-b border-ui-border-base"
                          style={tdStyle(c.width)}
                        >
                          <CellInput
                            value={row.variantPrice}
                            onChange={(v) => editCore(row.id, "variantPrice", v)}
                            disabled={!row.variantId}
                            placeholder={row.variantId ? "0.00" : "no variant"}
                          />
                        </td>
                      )
                    }
                    return (
                      <td
                        key={c.key as string}
                        className="border-b border-ui-border-base"
                        style={tdStyle(c.width)}
                      >
                        <CellInput
                          value={(row as any)[c.key] || ""}
                          onChange={(v) => editCore(row.id, c.key, v)}
                        />
                      </td>
                    )
                  })}
                  {visibleCalculaFields.map((f) => (
                    <td
                      key={f.key}
                      className="border-b border-ui-border-base"
                      style={tdStyle(130)}
                    >
                      <CellInput
                        value={row.calcula[f.key] || ""}
                        onChange={(v) => editCalcula(row.id, f.key, v)}
                      />
                    </td>
                  ))}
                </tr>
              ))}
            {!loading && filtered.length === 0 && (
              <tr>
                <td colSpan={totalVisibleCount} style={{ padding: 16 }}>
                  No rows.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </Container>
  )
}

const thStyle = (w: number): React.CSSProperties => ({
  position: "sticky",
  top: 0,
  textAlign: "left",
  padding: "8px 10px",
  fontWeight: 600,
  minWidth: w,
  whiteSpace: "nowrap",
  zIndex: 1,
})

const tdStyle = (w: number): React.CSSProperties => ({
  padding: 0,
  minWidth: w,
  verticalAlign: "middle",
})

const selectStyle: React.CSSProperties = {
  width: "100%",
  border: "none",
  padding: "8px 10px",
  background: "transparent",
  outline: "none",
  fontSize: 13,
}

const CellInput = ({
  value,
  onChange,
  disabled,
  placeholder,
}: {
  value: string
  onChange: (v: string) => void
  disabled?: boolean
  placeholder?: string
}) => {
  const [local, setLocal] = useState(value)
  useEffect(() => setLocal(value), [value])
  return (
    <input
      value={local}
      disabled={disabled}
      placeholder={placeholder}
      onChange={(e) => setLocal(e.target.value)}
      onBlur={() => {
        if (local !== value) onChange(local)
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter") (e.target as HTMLInputElement).blur()
      }}
      style={{
        width: "100%",
        border: "none",
        padding: "8px 10px",
        background: "transparent",
        outline: "none",
        fontSize: 13,
        color: disabled ? "#94a3b8" : undefined,
      }}
    />
  )
}

export const config = defineRouteConfig({
  label: "Bulk Editor",
})

export default BulkEditorPage
